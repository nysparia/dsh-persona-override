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

/**
 * Normalize a persona's display name.
 *
 * Truncating rather than rejecting is deliberate, and it is the opposite of
 * `cleanText` below for a reason: what justifies rejecting an over-long body is
 * that the loss is invisible — the persona still looks saved and the model
 * quietly behaves differently. A name is a label, not instructions. It is
 * rendered back in the same list the user just saved from, so a shortened one
 * is visible immediately and costs a re-type, not a wrong answer. Rejecting
 * would also answer 400 to a field the client already caps at 60, i.e. an error
 * the editor cannot produce and has no message for.
 *
 * The cap counts code points, not UTF-16 units: slicing at a code-unit boundary
 * can split a surrogate pair and store a lone surrogate, which is not valid
 * text and renders as a replacement character. A grapheme cluster can still be
 * split — a ZWJ sequence, or a base letter plus a combining mark — but that
 * leaves valid text, and code points are the unit the rest of this file counts.
 *
 * An empty or whitespace-only name stays empty on purpose: the client's
 * `displayName` falls back to the first line of the body, so "" is a supported
 * state, and rejecting it here would turn that fallback into an error the
 * editor has no way to prevent.
 */
function cleanName(value) {
	if (typeof value !== "string") return "";
	const trimmed = value.trim();
	const points = [...trimmed];
	return points.length > NAME_MAX_LENGTH ? points.slice(0, NAME_MAX_LENGTH).join("") : trimmed;
}
/**
 * Validate and normalize a persona body.
 *
 * Rejecting rather than truncating is deliberate: a silently shortened persona
 * is a persona the user did not write, and the loss is invisible until the
 * model behaves oddly. The same applies to a body that is empty or only
 * whitespace — `resolveFor` treats it as "no persona", so storing it would
 * leave a library entry that looks active and does nothing.
 *
 * The length cap counts code points, not UTF-16 units: slicing at a code-unit
 * boundary can split a surrogate pair and store a lone surrogate, which is not
 * valid text and renders as a replacement character.
 */
function cleanText(value) {
	if (typeof value !== "string") throw fail("bad-request", "text is required");
	if (value.trim() === "") throw fail("bad-request", "text must not be empty");
	const length = [...value].length;
	if (length > PERSONA_MAX_LENGTH) {
		throw fail("text-too-long", `text exceeds ${PERSONA_MAX_LENGTH} characters`);
	}
	return value;
}

/**
 * Load the schema library the domain declaration is built from.
 *
 * The domain layer validates records with zod; the profile already carries it,
 * and the storage form is the only consumer that needs it.
 *
 * The import is caught here rather than left to reject out of `apply`. `zod` is
 * a peer, and a local-directory install does not resolve peers, so a profile can
 * legitimately lack it — and an `apply` that rejects fails the plugin's whole
 * activation: no persona override, no settings section, no chip. The only thing
 * actually missing is the library's storage schema, so it is recorded as the
 * load failure and the plugin activates degraded instead.
 *
 * The message names the package because `loadFailure.reason` is what the client
 * shows, truncated to 200 characters, and `ERR_MODULE_NOT_FOUND` is not
 * something a user can act on. The original error rides along as `cause` for
 * the log, which is where the resolution detail belongs.
 */
async function loadZod() {
	try {
		return await import("zod");
	} catch (error) {
		throw Object.assign(
			new Error("the persona library needs the zod package, which this profile does not provide"),
			{ cause: error },
		);
	}
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
		if (size > limit) throw fail("body-too-large", "request body too large");
		chunks.push(chunk);
	}
	if (chunks.length === 0) return {};
	const text = Buffer.concat(chunks).toString("utf8");
	return text.trim() === "" ? {} : JSON.parse(text);
}

async function apply(ctx) {
	let domain;
	let personas;
	let selection = { ...EMPTY_GLOBAL, sessions: {} };
	// Why the failure is kept and not only logged: a domain that never opened
	// leaves `personas` undefined, and every read then looks exactly like an
	// empty library. The client cannot tell "you have no personas" from "your
	// personas could not be read", so it shows the empty-library message and
	// invites a create that would answer 500. Recording the failure lets `get`
	// say which state it is in, and lets every write refuse with a code the
	// client can explain instead of a TypeError.
	let loadFailure = null;
	let loadedResolve;
	const loaded = new Promise((resolve) => {
		loadedResolve = resolve;
	});

	const loadDomain = async () => {
		try {
			// Loaded here, inside the failure path, and not before it: a missing
			// schema library is the same kind of failure as a storage domain that
			// will not open — the library is unreachable — so it belongs in the
			// same catch instead of rejecting out of `apply` and taking the whole
			// plugin's activation with it.
			const zod = await loadZod();
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
			loadFailure = error;
			// The wrapper's message names the missing package, which is what the
			// client shows; the cause carries the resolution detail, which is what
			// a maintainer needs to see in the log.
			const detail = error?.cause?.stack ?? error?.stack ?? String(error);
			ctx.logger.warn(`dsh-persona-override: failed to open the persona domain: ${detail}`);
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
	 * Refuse a write when the domain never opened.
	 *
	 * Without this every mutating method reaches `personas.put` or
	 * `domain.global.set` on `undefined` and throws a TypeError, which the route
	 * answers as 500 "internal error" — a message that tells the user nothing
	 * and suggests the plugin is broken rather than its storage. A dedicated
	 * code maps to 503 and says the library is unreachable, which is both true
	 * and actionable.
	 */
	const requireDomain = () => {
		if (loadFailure === null) return;
		throw fail("unavailable", "the persona library could not be opened; reload the plugin to retry");
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
	/**
	 * Agents whose `agent/disposed` has already run.
	 *
	 * `syncAgent` queues its work, so an agent created and disposed in the same
	 * tick reaches the dispose handler before the queued work has installed a
	 * fiber. The handler then finds nothing to dispose, and the queued work goes
	 * on to register a section for an agent that no longer exists — a live
	 * prompt section and a live fiber for the lifetime of the plugin. Recording
	 * the disposal lets the queued work see it and clean up after itself.
	 *
	 * A WeakSet because the only fact kept is "this agent is gone": it is
	 * meaningless once the agent is collected, and must not pin it.
	 */
	const disposedAgents = new WeakSet();
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
			// Checked here, at the install point, and not before queueing: the
			// disposal can land while this chain is running, after the handler
			// already looked for a fiber and found none. Nothing awaits between
			// the `inject` above and this check, so a disposal cannot slip in
			// behind it and leave the fiber unowned.
			if (disposedAgents.has(agent)) {
				await fiber.dispose();
				return;
			}
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
		// Recorded before the lookup: a sync still queued for this agent has not
		// installed its fiber yet, so the lookup below finds nothing and the
		// queued work has to learn about the disposal some other way.
		disposedAgents.add(agent);
		const fiber = fibers.get(agent);
		fibers.delete(agent);
		chains.delete(agent);
		if (fiber !== undefined) void fiber.dispose().catch(() => {});
	}), "dsh-persona-override: agent/disposed");

	// A deleted conversation must not keep its override. The entry is a
	// reference to a session id that no longer exists, so it can never apply
	// again — but it still counts against MAX_SESSIONS, and enough deleted
	// conversations would eventually refuse a new override with "too many".
	ctx.effect(() => ctx.on("session/disposed", (session) => {
		const sessionId = session?.id;
		if (typeof sessionId !== "string" || selection.sessions[sessionId] === undefined) return;
		// Queued like any other mutation: a disposal that lands between a
		// `setSession`'s read and its write would otherwise be undone by it.
		void mutateSelection((current) => {
			const sessions = { ...current.sessions };
			delete sessions[sessionId];
			return { ...current, sessions };
		}).catch((error) => {
			ctx.logger.warn(`dsh-persona-override: failed to drop the override of a disposed session: ${String(error)}`);
		});
	}), "dsh-persona-override: session/disposed");

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
	/**
	 * Serialize every read-modify-write of the selection, then persist it and
	 * re-sync every live agent.
	 *
	 * `domain.global` offers only `get()` and `set()`, so two concurrent
	 * mutations both read the same `selection`, each builds its own `next`, and
	 * the second write drops whatever the first one changed. Queueing the whole
	 * read-modify-write on one chain makes each mutation see the previous one's
	 * result instead of a stale copy.
	 *
	 * The transform may be async: `createPersona` and `deletePersona` have to
	 * write the table before they decide the selection, and that ordering must
	 * happen inside the chain — outside it, two concurrent calls both decide
	 * against the pre-write table.
	 *
	 * The durable write comes first: assigning `selection` before awaiting it
	 * leaves memory ahead of disk when the write fails, so the prompt would run
	 * a choice that a restart silently reverts.
	 */
	let selectionChain = Promise.resolve();
	const mutateSelection = (transform) => {
		const run = selectionChain.then(async () => {
			const next = await transform(selection);
			await domain.global.set(next);
			selection = next;
			syncAll();
			return { config: snapshot() };
		});
		// Keep the chain alive when this mutation rejects, so one failure does not
		// poison every later write.
		selectionChain = run.catch(() => {});
		return run;
	};

	/** The client-facing view: personas as a list, plus the selection. */
	const snapshot = () => {
		// A stored `activeId` that names no record is reported as "none" rather
		// than passed through. The write paths keep that from happening, but the
		// invariant can already be violated in data this version did not write —
		// an older build's lost update, or a hand-edited domain file — and the
		// client renders the raw id as a radio checked on a row that is not in
		// the list, i.e. a selection the user cannot see or clear. Repairing it
		// on read rather than on load keeps the stored value untouched: this is a
		// display decision, and `resolveFor` already treats the id as "no
		// persona", so the view and the prompt agree either way.
		const activeId = selection.activeId !== null && personaById(selection.activeId) === undefined
			? null
			: selection.activeId;
		const view = {
			personas: personas === undefined ? [] : [...personas.entries()].map(([, persona]) => persona),
			activeId,
			sessions: selection.sessions,
		};
		// Only present when the domain never opened. An absent field means the
		// library was read, so a client that ignores this still sees the old
		// shape, and one that reads it can tell an empty library from an
		// unreadable one — the two states are otherwise identical on the wire.
		if (loadFailure !== null) {
			view.unavailable = true;
			view.reason = String(loadFailure?.message ?? loadFailure).slice(0, 200);
		}
		return view;
	};

	const api = {
		async get() {
			await loaded;
			// Still 200 when the domain failed: the request itself succeeded, and
			// what is missing is the library, which `config.unavailable` states.
			// A non-2xx here would send the client down its "failed to load" path
			// and lose the distinction between an empty library and a broken one.
			return { config: snapshot() };
		},
		/** Choose which library entry every session uses; null clears it. */
		async setActive(payload) {
			await loaded;
			requireDomain();
			const id = payload?.personaId ?? null;
			// The existence check belongs inside the chain, against the state this
			// write is built from. Outside it, a `deletePersona` that lands between
			// the check and the queued write leaves `activeId` naming a record that
			// no longer exists: `resolveFor` ignores it, so every conversation runs
			// the preset while Settings shows a radio checked on a row that is gone.
			return mutateSelection((current) => {
				if (id !== null && personaById(id) === undefined) throw fail("not-found", "unknown persona");
				return { ...current, activeId: id };
			});
		},
		async createPersona(payload) {
			await loaded;
			requireDomain();
			return mutateSelection(async (current) => {
				// The cap is checked here, against the table this write is about to
				// grow. Read before queueing, two concurrent creates both see 49 and
				// both put, so the library ends at 51 — one over a cap the client
				// also enforces, which then refuses the next create for no visible
				// reason. The body is validated after the cap, as before, so a
				// request that is both over the cap and malformed still reports the
				// cap; both are 400 and neither is worth reordering.
				if (personas.size >= MAX_PERSONAS) throw fail("too-many-personas", "too many personas");
				const persona = { id: randomUUID(), name: cleanName(payload?.name), text: cleanText(payload?.text) };
				await personas.put(persona.id, persona);
				// The first persona in an empty library becomes the active one, so
				// creating it is enough to start using it. `size` is read after the
				// put and inside the chain: two concurrent creates must not both see
				// an empty library and both claim to be the first.
				const activeId = current.activeId === null && personas.size === 1 ? persona.id : current.activeId;
				return { ...current, activeId };
			});
		},
		async updatePersona(payload) {
			await loaded;
			requireDomain();
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			// In the chain, unlike the other writes here, because this is a
			// read-modify-write of a table record and the chain is the only thing
			// that orders it against `deletePersona`'s delete. Outside it, two
			// concurrent edits both read the same record and the later `put`
			// restores the field the earlier one changed; and an edit that lands
			// after a delete resurrects the record, leaving a row nothing points
			// at. The transform hands the selection back untouched — an edit
			// changes no selection — so the chain's `global.set` rewrites the value
			// it already holds, which is idempotent and cheaper than a second chain
			// that would not exclude the delete.
			return mutateSelection(async (current) => {
				const existing = personaById(id);
				if (existing === undefined) throw fail("not-found", "unknown persona");
				await personas.put(id, {
					id,
					name: payload?.name === undefined ? existing.name : cleanName(payload.name),
					text: payload?.text === undefined ? existing.text : cleanText(payload.text),
				});
				return current;
			});
		},
		async deletePersona(payload) {
			await loaded;
			requireDomain();
			const id = payload?.id;
			if (typeof id !== "string" || id === "") throw fail("bad-request", "id is required");
			return mutateSelection(async (current) => {
				// Checked here, not before queueing: the record has to exist at the
				// moment of the delete, and a check made before the queue can be
				// answered by a delete that already ran.
				if (personaById(id) === undefined) throw fail("not-found", "unknown persona");
				await personas.delete(id);
				const activeId = current.activeId === id ? null : current.activeId;
				// Sessions that pointed at the deleted entry go back to following the
				// default rather than silently pinning "off".
				const sessions = {};
				for (const [sessionId, entry] of Object.entries(current.sessions)) {
					if (entry.personaId === id) continue;
					sessions[sessionId] = entry;
				}
				return { activeId, sessions };
			});
		},
		/** Pin one conversation to a library entry; personaId null opts it out. */
		async setSession(payload) {
			await loaded;
			requireDomain();
			const sessionId = payload?.sessionId;
			if (typeof sessionId !== "string" || sessionId === "") {
				throw fail("bad-request", "sessionId is required");
			}
			const personaId = payload?.personaId ?? null;
			return mutateSelection((current) => {
				// The persona check sits beside the cap for the same reason: both
				// have to hold against the state this write is built from. A check
				// made before queueing can pass and then be answered by a delete
				// that ran first, pinning the session to a record that is gone.
				if (personaId !== null && personaById(personaId) === undefined) {
					throw fail("not-found", "unknown persona");
				}
				const sessions = { ...current.sessions };
				// The cap is checked against the map this mutation will write, not
				// the one it read before queueing: two concurrent pins must not both
				// pass a check that only one of them can still satisfy.
				if (Object.keys(sessions).length >= MAX_SESSIONS && sessions[sessionId] === undefined) {
					throw fail("too-many-sessions", "too many session overrides");
				}
				sessions[sessionId] = { personaId };
				return { ...current, sessions };
			});
		},
		async clearSession(payload) {
			await loaded;
			requireDomain();
			const sessionId = payload?.sessionId;
			if (typeof sessionId !== "string" || sessionId === "") {
				throw fail("bad-request", "sessionId is required");
			}
			return mutateSelection((current) => {
				const sessions = { ...current.sessions };
				delete sessions[sessionId];
				return { ...current, sessions };
			});
		},
	};

	const STATUS_BY_CODE = {
		"bad-request": 400,
		"too-many-sessions": 400,
		"too-many-personas": 400,
		"text-too-long": 400,
		"body-too-large": 413,
		"not-found": 404,
		// The library is unreachable, not the request wrong: 503 says "try
		// again later", which is the only useful advice here.
		unavailable: 503,
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
				// A malformed body is the caller's mistake, not an internal fault:
				// answering 500 hides the real cause and makes the client show
				// "internal error" for what is a fixable request.
				if (error instanceof SyntaxError) {
					writeJson(res, 400, { ok: false, error: { code: "bad-request", message: "request body is not valid JSON" } });
					return;
				}
				writeError(res, error, ctx.logger);
			}
			},
		}), "dsh-persona-override: /persona-override/api routes");
	});
}

export { apply, inject, name };
