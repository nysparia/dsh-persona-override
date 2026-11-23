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
 * Persistence is host-owned plain JSON under the DSH home:
 *   {DSH_HOME}/persona-override/config.json
 *
 *   {
 *     "personas": [{ "id": "…", "name": "苏格拉底导师", "text": "…" }],
 *     "activeId": "…",                              // the library entry in use
 *     "sessions": { "abc123": { "personaId": "…" } } // personaId null = off
 *   }
 *
 * A session entry is a reference, not a copy: editing a library persona changes
 * every session that points at it, which is what a shared library means. An
 * absent session entry follows `activeId`; a present one decides, and
 * `personaId: null` is how one conversation opts out of the library entirely.
 *
 * The client talks to the plugin through its own fenced HTTP routes
 * (/persona-override/api/*).
 */
import z from "@deepseek-ai/schemastery";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const name = "dsh-persona-override";
const inject = ["webServer", "systemPrompt", "agents"];

/** Empty configuration schema: this plugin owns its own JSON persistence. */
const Config = z.object({});

/** The section this plugin replaces. */
const PERSONA_SECTION = "deployment:persona-prefix";

/** Per-field length cap, enforced at every write entry point. */
const PERSONA_MAX_LENGTH = 20000;
/** Cap on a persona's display name. */
const NAME_MAX_LENGTH = 60;
/** Cap on library size, so the file cannot grow without bound. */
const MAX_PERSONAS = 50;
/** Cap on stored per-session overrides. */
const MAX_SESSIONS = 200;

const CONFIG_DEFAULTS = {
	personas: [],
	activeId: null,
	sessions: {},
};

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

function dshHome() {
	const fromEnv = process.env.DSH_HOME;
	return fromEnv !== void 0 && fromEnv.trim().length > 0 ? resolve(fromEnv) : join(homedir(), ".dsh");
}
function baseDir() {
	return join(dshHome(), "persona-override");
}
function configPath() {
	return join(baseDir(), "config.json");
}

async function readJson(path, fallback) {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch {
		return fallback;
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

/** Coerce one stored persona into the exact shape, or drop it. */
function normalizePersona(entry) {
	if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return;
	if (typeof entry.id !== "string" || entry.id === "") return;
	return { id: entry.id, name: cleanName(entry.name), text: cleanText(entry.text) };
}

/** Coerce one stored object into the exact config shape, migrating 0.1.x. */
function normalizeConfig(source) {
	if (source === null || typeof source !== "object" || Array.isArray(source)) {
		return { ...CONFIG_DEFAULTS, personas: [], sessions: {} };
	}

	const personas = [];
	const known = new Set();
	if (Array.isArray(source.personas)) {
		for (const entry of source.personas) {
			if (personas.length >= MAX_PERSONAS) break;
			const persona = normalizePersona(entry);
			if (persona === undefined || known.has(persona.id)) continue;
			known.add(persona.id);
			personas.push(persona);
		}
	}

	let activeId = typeof source.activeId === "string" && known.has(source.activeId)
		? source.activeId
		: null;

	// 0.1.x stored one anonymous `defaultPersona` behind an `enabled` flag.
	if (personas.length === 0 && typeof source.defaultPersona === "string" && source.defaultPersona.trim() !== "") {
		const migrated = { id: randomUUID(), name: "", text: cleanText(source.defaultPersona) };
		personas.push(migrated);
		known.add(migrated.id);
		if (source.enabled === true) activeId = migrated.id;
	}

	const sessions = {};
	const raw = source.sessions;
	if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
		for (const [sessionId, entry] of Object.entries(raw)) {
			if (Object.keys(sessions).length >= MAX_SESSIONS) break;
			if (typeof sessionId !== "string" || sessionId === "") continue;
			if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;

			let personaId = null;
			if (typeof entry.personaId === "string" && known.has(entry.personaId)) {
				personaId = entry.personaId;
			} else if (entry.enabled !== false && typeof entry.persona === "string" && entry.persona.trim() !== "") {
				// 0.1.x kept inline text per session. Promote it to a library entry
				// so the text survives the upgrade instead of being dropped.
				if (personas.length < MAX_PERSONAS) {
					const inline = { id: randomUUID(), name: "", text: cleanText(entry.persona) };
					personas.push(inline);
					known.add(inline.id);
					personaId = inline.id;
				}
			}
			sessions[sessionId] = { personaId };
		}
	}

	return { personas, activeId, sessions };
}

/** Write one JSON file atomically (temp + rename) so a crash cannot truncate it. */
async function writeJsonAtomic(path, value) {
	await mkdir(dirname(path), { recursive: true });
	const temp = `${path}.${process.pid}.tmp`;
	await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
	await rename(temp, path);
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

function apply(ctx) {
	let cachedConfig = { ...CONFIG_DEFAULTS, personas: [], sessions: {} };
	let loadedResolve;
	const loaded = new Promise((resolve) => {
		loadedResolve = resolve;
	});
	const getConfig = () => cachedConfig;

	const loadConfig = async () => {
		try {
			cachedConfig = normalizeConfig(await readJson(configPath(), null));
		} catch (error) {
			ctx.logger.warn(`dsh-persona-override: failed to load config: ${String(error)}`);
		} finally {
			loadedResolve();
		}
	};
	void loadConfig();

	// Config writes are serialized so concurrent updates cannot drop each other.
	let writeQueue = Promise.resolve();
	const enqueueWrite = (operation) => {
		const next = writeQueue.then(operation, operation);
		writeQueue = next.catch(() => {});
		return next;
	};

	const personaById = (id) => cachedConfig.personas.find((persona) => persona.id === id);

	/**
	 * Resolve the persona text for one session.
	 * @returns the replacement text, or `undefined` to leave the preset's own
	 * persona in place (no selection, an explicit opt-out, or empty text).
	 */
	const resolveFor = (sessionId) => {
		const perSession = cachedConfig.sessions[sessionId];
		if (perSession !== undefined) {
			// An explicit per-session entry always decides, including "off".
			if (perSession.personaId === null) return undefined;
			const persona = personaById(perSession.personaId);
			if (persona === undefined) return undefined;
			const text = persona.text.trim();
			return text === "" ? undefined : text;
		}
		if (cachedConfig.activeId === null) return undefined;
		const persona = personaById(cachedConfig.activeId);
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
	ctx.effect(() => {
		syncAll();
		return () => {
			for (const fiber of fibers.values()) void fiber.dispose().catch(() => {});
			fibers.clear();
			chains.clear();
		};
	}, "dsh-persona-override: backfill");

	// -- HTTP routes -----------------------------------------------------------
	const commit = async (next) => {
		await enqueueWrite(() => writeJsonAtomic(configPath(), next));
		cachedConfig = next;
		syncAll();
		return { config: next, path: configPath() };
	};

	const api = {
		async get() {
			await loaded;
			return { config: getConfig(), path: configPath() };
		},
		/** Choose which library entry every session uses; null clears it. */
		async setActive(payload) {
			await loaded;
			const id = payload?.personaId ?? null;
			if (id !== null && personaById(id) === undefined) throw fail("not-found", "unknown persona");
			return commit(normalizeConfig({ ...getConfig(), activeId: id }));
		},
		async createPersona(payload) {
			await loaded;
			const config = getConfig();
			if (config.personas.length >= MAX_PERSONAS) throw fail("too-many-personas", "too many personas");
			const persona = { id: randomUUID(), name: cleanName(payload?.name), text: cleanText(payload?.text) };
			const personas = [...config.personas, persona];
			// The first persona in an empty library becomes the active one, so
			// creating it is enough to start using it.
			const activeId = config.activeId === null && personas.length === 1 ? persona.id : config.activeId;
			return commit(normalizeConfig({ ...config, personas, activeId }));
		},
		async updatePersona(payload) {
			await loaded;
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			const config = getConfig();
			if (personaById(id) === undefined) throw fail("not-found", "unknown persona");
			const personas = config.personas.map((persona) => persona.id === id
				? {
					id,
					name: payload?.name === undefined ? persona.name : cleanName(payload.name),
					text: payload?.text === undefined ? persona.text : cleanText(payload.text),
				}
				: persona);
			return commit(normalizeConfig({ ...config, personas }));
		},
		async deletePersona(payload) {
			await loaded;
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			const config = getConfig();
			if (personaById(id) === undefined) throw fail("not-found", "unknown persona");
			const personas = config.personas.filter((persona) => persona.id !== id);
			const activeId = config.activeId === id ? null : config.activeId;
			// Sessions that pointed at the deleted entry go back to following the
			// default rather than silently pinning "off".
			const sessions = {};
			for (const [sessionId, entry] of Object.entries(config.sessions)) {
				if (entry.personaId === id) continue;
				sessions[sessionId] = entry;
			}
			return commit(normalizeConfig({ ...config, personas, activeId, sessions }));
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
			const sessions = { ...getConfig().sessions };
			if (Object.keys(sessions).length >= MAX_SESSIONS && sessions[sessionId] === undefined) {
				throw fail("too-many-sessions", "too many session overrides");
			}
			sessions[sessionId] = { personaId };
			return commit(normalizeConfig({ ...getConfig(), sessions }));
		},
		async clearSession(payload) {
			await loaded;
			const sessionId = payload?.sessionId;
			if (typeof sessionId !== "string" || sessionId === "") {
				throw fail("bad-request", "sessionId is required");
			}
			const sessions = { ...getConfig().sessions };
			delete sessions[sessionId];
			return commit(normalizeConfig({ ...getConfig(), sessions }));
		},
	};

	const STATUS_BY_CODE = {
		"bad-request": 400,
		"too-many-sessions": 400,
		"too-many-personas": 400,
		"not-found": 404,
	};

	ctx.effect(() => ctx.webServer.register({
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
}

export { Config, apply, inject, name };
