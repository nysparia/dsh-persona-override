/**
 * dsh-persona-override — host half.
 *
 * Replaces the deployment persona per agent from a named persona library,
 * without declaring an agent preset.
 *
 * Why `agent/created` and not a prompt section of our own:
 * `dsh-system-prompt` registers `deployment:persona-prefix` globally, and every
 * shipped preset mounts a `persona` row that shadows it inside that preset's
 * scope. Registering a section at plugin load either collides (0.2.2) or loses
 * to the preset's scope. Registering through `agent.ctx` on `agent/created`
 * lands in the same scope as the preset's row, and 0.2.3 resolves same-scope
 * duplicates by latest registration — so ours wins. This is the same pattern
 * `dsh-file-reference-local` uses for its own prompt section.
 *
 * It also beats a `complete: true` persona, which the `system-prompt/assemble`
 * waterfall cannot: a complete section is restored as the sole prompt section
 * after the waterfall runs.
 *
 * Persistence goes through `ctx.storageDomain`, the Harness data form for
 * durable, schema-validated host state — not a hand-rolled JSON file. The
 * domain is `persona_override`, one table `personas` plus a global holding the
 * active id:
 *
 *   personas: { [id]: { id, name, text } }
 *   global:   { activeId: string | null, sessions: { [sessionId]: { personaId } } }
 *
 * A session entry is a reference, not a copy: editing a library persona changes
 * every session that points at it, which is what a shared library means. An
 * absent session entry follows `activeId`; a present one decides, and
 * `personaId: null` is how one conversation opts out of the library entirely.
 *
 * The client talks to the plugin through its own fenced HTTP routes
 * (/persona-override/api/*).
 */
import { randomUUID } from "node:crypto";

const name = "dsh-persona-override";
// `webServer` is deliberately NOT in `inject`: it only carries the Settings
// UI's HTTP routes, so a profile without a browser surface (headless, ACP, SDK)
// must still get the persona override instead of parking the whole plugin in
// PENDING. The routes are registered through `ctx.inject` when it is present.
const inject = ["systemPrompt", "agents", "storageDomain"];

/** The section this plugin replaces. */
const PERSONA_SECTION = "deployment:persona-prefix";

/** Per-field length cap, enforced at every write entry point. */
const PERSONA_MAX_LENGTH = 20000;
/** Cap on a persona's display name. */
const NAME_MAX_LENGTH = 60;
/** Cap on library size, so the domain cannot grow without bound. */
const MAX_PERSONAS = 50;
/** Cap on stored per-session overrides. */
const MAX_SESSIONS = 200;

const DOMAIN_NAME = "persona_override";
const TABLE = "personas";

const EMPTY_GLOBAL = { activeId: null, sessions: {} };

// -- browser-trust fence (self-contained copy of the shared /api fence) -------
function header(headers, name) {
	const value = headers[name];
	return typeof value === "string" ? value : void 0;
}
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return;
	}
}
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Decide whether one plugin request may reach the plugin routes (loopback-only). */
function isTrustedApiRequest(request) {
	const host = header(request.headers, "host");
	if (host === void 0) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === void 0) return false;
	if (!isLoopbackHostname(hostUrl.hostname)) return false;
	if (header(request.headers, "sec-fetch-site") === "cross-site") return false;
	const origin = header(request.headers, "origin");
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}

/** A request the caller can fix, answered with 400 rather than 500. */
function fail(code, message) {
	return Object.assign(new Error(message), { code });
}

function cleanName(value) {
	return typeof value === "string" ? value.trim().slice(0, NAME_MAX_LENGTH) : "";
}
function cleanText(value) {
	return typeof value === "string" ? value.slice(0, PERSONA_MAX_LENGTH) : "";
}

/** The domain declaration: one table of personas, one global of selection state. */
function domainSpec(zod) {
	return {
		name: DOMAIN_NAME,
		version: 1,
		tables: {
			[TABLE]: {
				valueSchema: zod.object({
					id: zod.string(),
					name: zod.string(),
					text: zod.string(),
				}),
			},
		},
		global: {
			schema: zod.object({
				activeId: zod.string().nullable(),
				sessions: zod.record(zod.string(), zod.object({ personaId: zod.string().nullable() })),
			}),
			initial: EMPTY_GLOBAL,
		},
	};
}

function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload),
		"cache-control": "no-store",
	});
	res.end(payload);
}
function writeOk(res, value) {
	writeJson(res, 200, { ok: true, value });
}
function writeError(res, error, logger) {
	logger?.warn?.(`dsh-persona-override: ${String(error)}`);
	writeJson(res, 500, { ok: false, error: { code: "internal", message: "internal error" } });
}

/** Read one request body as JSON, bounded so a hostile client cannot exhaust memory. */
async function readJsonBody(request, limit = 1 << 20) {
	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > limit) throw new Error("request body too large");
		chunks.push(chunk);
	}
	if (chunks.length === 0) return {};
	const text = Buffer.concat(chunks).toString("utf8");
	return text.trim() === "" ? {} : JSON.parse(text);
}

async function apply(ctx) {
	// The domain layer validates records with zod; the profile already carries
	// it, and the storage form is the only consumer that needs it.
	const zod = await import("zod");

	let domain;
	let personas;
	let selection = { ...EMPTY_GLOBAL, sessions: {} };
	let loadedResolve;
	const loaded = new Promise((resolve) => {
		loadedResolve = resolve;
	});

	const loadDomain = async () => {
		try {
			domain = await ctx.storageDomain.open(domainSpec(zod.default ?? zod));
			personas = domain.table(TABLE);
			const stored = domain.global.get();
			selection = {
				activeId: typeof stored?.activeId === "string" ? stored.activeId : null,
				sessions: stored?.sessions !== null && typeof stored?.sessions === "object" && !Array.isArray(stored.sessions)
					? stored.sessions
					: {},
			};
		} catch (error) {
			// Name the failure loudly: a domain that never opens leaves every
			// conversation on the preset persona with no other symptom.
			ctx.logger.warn(`dsh-persona-override: failed to open the persona domain: ${error?.stack ?? String(error)}`);
		} finally {
			loadedResolve();
		}
	};
	void loadDomain();

	ctx.effect(() => () => {
		if (domain !== undefined) void domain.close().catch(() => {});
	}, "dsh-persona-override: domain lifetime");

	const personaById = (id) => {
		if (personas === undefined || typeof id !== "string") return undefined;
		return personas.get(id);
	};

	/**
	 * Resolve the persona text for one session.
	 * @returns the replacement text, or `undefined` to leave the preset's own
	 * persona in place (no selection, an explicit opt-out, or empty text).
	 */
	const resolveFor = (sessionId) => {
		const perSession = selection.sessions[sessionId];
		if (perSession !== undefined) {
			// An explicit per-session entry always decides, including "off".
			if (perSession.personaId === null) return undefined;
			const persona = personaById(perSession.personaId);
			if (persona === undefined) return undefined;
			const text = persona.text.trim();
			return text === "" ? undefined : text;
		}
		if (selection.activeId === null) return undefined;
		const persona = personaById(selection.activeId);
		if (persona === undefined) return undefined;
		const text = persona.text.trim();
		return text === "" ? undefined : text;
	};

	// -- per-agent section lifecycle -------------------------------------------
	/** Live override per agent: the fiber that owns its section. */
	const fibers = new Map();
	/** Serializes sync work per agent so two config changes cannot race. */
	const chains = new Map();
	/** Set once the runtime rejects same-scope stacking, so the warning is not repeated. */
	let warnedUnsupported = false;

	const syncAgent = (agent) => {
		const previous = chains.get(agent) ?? Promise.resolve();
		const next = previous.then(async () => {
			const sessionId = agent.session?.id;
			if (typeof sessionId !== "string") return;
			const text = resolveFor(sessionId);
			const existing = fibers.get(agent);

			if (text === undefined) {
				if (existing === undefined) return;
				fibers.delete(agent);
				await existing.dispose();
				return;
			}
			if (existing !== undefined) return; // the live text() already reads the new value

			// Hold the last resolved text so a transient miss during a config
			// swap cannot blank the prompt and expose the preset persona.
			let last = text;
			const fiber = agent.ctx.inject(["systemPrompt"], (scope) => {
				scope.systemPrompt.section({
					name: PERSONA_SECTION,
					order: scope.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
					text: () => {
						const next = resolveFor(sessionId);
						if (next !== undefined) last = next;
						return last;
					},
				});
			});
			fibers.set(agent, fiber);
			await fiber;
		}).catch((error) => {
			const message = String(error?.message ?? error);
			// The one failure worth naming: before dsh 0.2.3 a second registration
			// of the same section name in one scope throws instead of stacking, so
			// this plugin cannot override a preset's persona at all. Say so once,
			// rather than logging the same stack for every agent.
			if (message.includes("already registered") && !warnedUnsupported) {
				warnedUnsupported = true;
				ctx.logger.warn(
					"dsh-persona-override: this dsh version rejects a second registration of "
					+ `"${PERSONA_SECTION}" in one scope, so persona overrides cannot apply. `
					+ "dsh 0.2.3 or newer is required; the plugin stays loaded but inert.",
				);
				return;
			}
			ctx.logger.warn(`dsh-persona-override: sync failed: ${message}`);
		}).finally(() => {
			if (chains.get(agent) === next) chains.delete(agent);
		});
		chains.set(agent, next);
		return next;
	};

	const syncAll = () => {
		for (const agent of ctx.agents.list()) void syncAgent(agent);
	};

	ctx.effect(() => ctx.on("agent/created", async ({ agent }) => {
		await syncAgent(agent);
	}), "dsh-persona-override: agent/created");

	ctx.effect(() => ctx.on("agent/disposed", ({ agent }) => {
		const fiber = fibers.get(agent);
		fibers.delete(agent);
		chains.delete(agent);
		if (fiber !== undefined) void fiber.dispose().catch(() => {});
	}), "dsh-persona-override: agent/disposed");

	// Agents that already exist when this plugin loads (a profile reload).
	// The domain open is async, so this must wait for it: syncing before the
	// records land resolves every session against the empty default and leaves
	// pre-existing agents with no section at all.
	ctx.effect(() => {
		let disposed = false;
		void loaded.then(() => {
			if (!disposed) syncAll();
		});
		return () => {
			disposed = true;
			for (const fiber of fibers.values()) void fiber.dispose().catch(() => {});
			fibers.clear();
			chains.clear();
		};
	}, "dsh-persona-override: backfill");

	// -- HTTP routes -----------------------------------------------------------
	/** Persist the selection global, then re-sync every live agent. */
	const commitSelection = async (next) => {
		selection = next;
		await domain.global.set(next);
		syncAll();
		return { config: snapshot(), path: `domain:${DOMAIN_NAME}` };
	};

	/** The client-facing view: personas as a list, plus the selection. */
	const snapshot = () => ({
		personas: personas === undefined ? [] : [...personas.entries()].map(([, persona]) => persona),
		activeId: selection.activeId,
		sessions: selection.sessions,
	});

	const api = {
		async get() {
			await loaded;
			return { config: snapshot(), path: `domain:${DOMAIN_NAME}` };
		},
		/** Choose which library entry every session uses; null clears it. */
		async setActive(payload) {
			await loaded;
			const id = payload?.personaId ?? null;
			if (id !== null && personaById(id) === undefined) throw fail("not-found", "unknown persona");
			return commitSelection({ ...selection, activeId: id });
		},
		async createPersona(payload) {
			await loaded;
			if (personas.size >= MAX_PERSONAS) throw fail("too-many-personas", "too many personas");
			const persona = { id: randomUUID(), name: cleanName(payload?.name), text: cleanText(payload?.text) };
			await personas.put(persona.id, persona);
			// The first persona in an empty library becomes the active one, so
			// creating it is enough to start using it.
			const activeId = selection.activeId === null && personas.size === 1 ? persona.id : selection.activeId;
			return commitSelection({ ...selection, activeId });
		},
		async updatePersona(payload) {
			await loaded;
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			const current = personaById(id);
			if (current === undefined) throw fail("not-found", "unknown persona");
			await personas.put(id, {
				id,
				name: payload?.name === undefined ? current.name : cleanName(payload.name),
				text: payload?.text === undefined ? current.text : cleanText(payload.text),
			});
			syncAll();
			return { config: snapshot(), path: `domain:${DOMAIN_NAME}` };
		},
		async deletePersona(payload) {
			await loaded;
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			if (personaById(id) === undefined) throw fail("not-found", "unknown persona");
			await personas.delete(id);
			const activeId = selection.activeId === id ? null : selection.activeId;
			// Sessions that pointed at the deleted entry go back to following the
			// default rather than silently pinning "off".
			const sessions = {};
			for (const [sessionId, entry] of Object.entries(selection.sessions)) {
				if (entry.personaId === id) continue;
				sessions[sessionId] = entry;
			}
			return commitSelection({ activeId, sessions });
		},
		/** Pin one conversation to a library entry; personaId null opts it out. */
		async setSession(payload) {
			await loaded;
			const sessionId = payload?.sessionId;
			if (typeof sessionId !== "string" || sessionId === "") {
				throw fail("bad-request", "sessionId is required");
			}
			const personaId = payload?.personaId ?? null;
			if (personaId !== null && personaById(personaId) === undefined) {
				throw fail("not-found", "unknown persona");
			}
			const sessions = { ...selection.sessions };
			if (Object.keys(sessions).length >= MAX_SESSIONS && sessions[sessionId] === undefined) {
				throw fail("too-many-sessions", "too many session overrides");
			}
			sessions[sessionId] = { personaId };
			return commitSelection({ ...selection, sessions });
		},
		async clearSession(payload) {
			await loaded;
			const sessionId = payload?.sessionId;
			if (typeof sessionId !== "string" || sessionId === "") {
				throw fail("bad-request", "sessionId is required");
			}
			const sessions = { ...selection.sessions };
			delete sessions[sessionId];
			return commitSelection({ ...selection, sessions });
		},
	};

	const STATUS_BY_CODE = {
		"bad-request": 400,
		"too-many-sessions": 400,
		"too-many-personas": 400,
		"not-found": 404,
	};

	// No browser surface means no UI, not no persona: register the routes only
	// when the service is there, and keep the prompt path unconditional.
	ctx.inject(["webServer"], (scope) => {
		scope.effect(() => scope.webServer.register({
			kind: "prefix",
			path: "/persona-override/api",
			handler: async (req, res) => {
			if (!isTrustedApiRequest(req)) {
				writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
				return;
			}
			if (req.method !== "POST") {
				writeJson(res, 405, { ok: false, error: { code: "method-error", message: "method not allowed" } });
				return;
			}
			const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
			const method = pathname.startsWith("/persona-override/api/")
				? pathname.slice("/persona-override/api/".length)
				: void 0;
			if (method === void 0 || method === "" || method.includes("/")) {
				writeJson(res, 404, { ok: false, error: { code: "not-found", message: "unknown persona-override API method" } });
				return;
			}
			const handler = api[method];
			if (handler === void 0) {
				writeJson(res, 404, { ok: false, error: { code: "not-found", message: `unknown persona-override API method "${method}"` } });
				return;
			}
			try {
				writeOk(res, await handler(await readJsonBody(req)));
			} catch (error) {
				const status = STATUS_BY_CODE[error?.code];
				if (status !== void 0) {
					writeJson(res, status, { ok: false, error: { code: error.code, message: error.message } });
					return;
				}
				writeError(res, error, ctx.logger);
			}
			},
		}), "dsh-persona-override: /persona-override/api routes");
	});
}

export { apply, inject, name };
