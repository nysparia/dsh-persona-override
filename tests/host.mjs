/**
 * Host-half suite: drives the real HTTP handler through a fake ctx, with a real
 * in-memory domain that validates with the real zod, and the real
 * prompt-section path.
 *
 * Run with `npm test`. No test framework: the assertions are a few lines and a
 * dependency would have to be installed in every profile that loads the plugin.
 */
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const mod = await import(join(here, "..", "lib", "index.js"));

// zod is a peer, so it is not installed here — but `lib/index.js` imports it by
// bare name, which resolves from the plugin directory. Link the copy this
// machine already has into `node_modules/` (gitignored) so the import works.
import { existsSync, mkdirSync, symlinkSync } from "node:fs";

function ensureZod() {
	const local = join(here, "..", "node_modules", "zod");
	if (existsSync(local)) return;
	const candidates = [
		`${process.env.DSH_HOME ?? `${process.env.HOME}/.dsh`}/profiles/web/node_modules/zod`,
		`${process.env.HOME}/sources/deepseek-harness/node_modules/zod`,
	];
	const found = candidates.find((path) => existsSync(path));
	if (found === undefined) {
		throw new Error("zod not found: install it, or point DSH_HOME at a profile that has it");
	}
	mkdirSync(join(here, "..", "node_modules"), { recursive: true });
	symlinkSync(found, local, "dir");
	console.log(`  [setup] linked zod from ${found}`);
}
ensureZod();

let failures = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a === e) console.log(`  ok   ${label}`);
	else {
		failures += 1;
		console.log(`  FAIL ${label}\n       expected ${e}\n       actual   ${a}`);
	}
}

/** An in-memory stand-in for the storage-domain handle, validating like the real one. */
function makeDomain() {
	const records = new Map();
	let globalValue;
	let spec;
	const table = {
		get: (key) => records.get(key),
		entries: () => records.entries(),
		keys: () => records.keys(),
		get size() { return records.size; },
		put: async (key, value) => {
			// The real domain validates every write against the record schema.
			records.set(key, spec.tables.personas.valueSchema.parse(value));
		},
		delete: async (key) => records.delete(key),
	};
	return {
		get name() { return "persona_override"; },
		global: {
			get: () => (globalValue === undefined ? spec.global.initial : globalValue),
			set: async (value) => {
				globalValue = spec.global.schema.parse(value);
			},
		},
		table: () => table,
		close: async () => {},
		__setSpec: (s) => { spec = s; },
		__records: records,
		// The stored global, not the reported one. `snapshot()` repairs a dangling
		// `activeId` on read, so a test that only looks at the API response cannot
		// tell a write path that keeps the invariant from one that violates it and
		// is papered over. Assertions about what was *written* read this.
		__global: () => globalValue,
	};
}

/**
 * One fake ctx.
 * @param options.open - replaces `storageDomain.open`, so a test can make the
 * domain fail to open. The default returns the in-memory domain.
 */
function makeCtx(options = {}) {
	const registered = new Map();
	const agents = [];
	const created = [];
	const disposed = [];
	const sessionDisposed = [];
	const domain = makeDomain();
	const ctx = {
		logger: { warn: (m) => console.log(`  [warn] ${m}`) },
		effect: (fn) => fn(),
		on: (event, handler) => {
			if (event === "agent/created") created.push(handler);
			if (event === "agent/disposed") disposed.push(handler);
			if (event === "session/disposed") sessionDisposed.push(handler);
			return () => {};
		},
		agents: { list: () => agents },
		storageDomain: {
			open: options.open ?? (async (spec) => {
				domain.__setSpec(spec);
				return domain;
			}),
		},
		webServer: { register: (route) => { ctx.route = route; return () => {}; } },
		// Cordis's optional-service form: run the callback with a scope that has
		// the service, or skip it entirely when the service is absent.
		inject: (deps, fn) => {
			if (deps.includes("webServer")) fn({ webServer: ctx.webServer, effect: (f) => f() });
		},
	};
	return { ctx, registered, agents, created, disposed, sessionDisposed, domain };
}

const { ctx, registered, agents, created, disposed, sessionDisposed, domain } = makeCtx();
await mod.apply(ctx);
await new Promise((r) => setTimeout(r, 100));

/**
 * A POST against one ctx's route.
 *
 * A factory rather than one shared function: the suite needs a second,
 * independent ctx (one whose domain fails to open), and its requests must not
 * go through the healthy ctx's route.
 */
function makeCall(target) {
	return async function call(method, payload) {
		const req = Readable.from([Buffer.from(JSON.stringify(payload ?? {}))]);
		req.method = "POST";
		req.url = `/persona-override/api/${method}`;
		req.headers = { host: "127.0.0.1:3080", "content-type": "application/json" };
		let status = 0;
		let text = "";
		await target.route.handler(req, { writeHead: (c) => { status = c; }, end: (c) => { text = c ?? ""; } });
		return { status, body: JSON.parse(text) };
	};
}
const call = makeCall(ctx);
const ok = async (method, payload) => {
	const r = await call(method, payload);
	if (r.body.ok !== true) throw new Error(`${method} failed: ${JSON.stringify(r.body)}`);
	return r.body.value;
};

/** Bring one session's agent up and read the text its section renders. */
async function textFor(sessionId) {
	const agent = {
		session: { id: sessionId },
		ctx: {
			inject: (deps, fn) => {
				fn({ systemPrompt: { getSectionOrder: () => 900, section: (s) => registered.set(sessionId, s) } });
				return { dispose: async () => registered.delete(sessionId) };
			},
		},
	};
	agents.push(agent);
	for (const handler of created) await handler({ agent });
	const section = registered.get(sessionId);
	return section === undefined ? undefined : section.text();
}

console.log("\n1. empty library");
{
	const v = await ok("get");
	check("personas empty", v.config.personas, []);
	check("activeId null", v.config.activeId, null);
	check("sessions empty", v.config.sessions, {});
	check("A has no section", await textFor("A"), undefined);
}

console.log("\n2. create personas");
let socratic;
let terse;
{
	const v = await ok("createPersona", { name: "苏格拉底导师", text: "You are a Socratic tutor." });
	socratic = v.config.personas[0];
	check("one persona", v.config.personas.length, 1);
	check("first becomes active", v.config.activeId, socratic.id);
	check("A now overridden", await textFor("A"), "You are a Socratic tutor.");

	const v2 = await ok("createPersona", { name: "Terse", text: "Answer in one sentence." });
	terse = v2.config.personas[1];
	check("two personas", v2.config.personas.length, 2);
	check("active unchanged", v2.config.activeId, socratic.id);
}

console.log("\n3. switch the active persona");
{
	await ok("setActive", { personaId: terse.id });
	check("A follows the switch", await textFor("A"), "Answer in one sentence.");
	await ok("setActive", { personaId: null });
	check("A falls back to the preset", await textFor("A"), undefined);
	await ok("setActive", { personaId: socratic.id });
}

console.log("\n4. edit a library entry");
{
	await ok("updatePersona", { id: socratic.id, text: "You are a Socratic tutor. Never give the answer." });
	check("A sees the edit", await textFor("A"), "You are a Socratic tutor. Never give the answer.");
	const v = await ok("updatePersona", { id: socratic.id, name: "Socratic" });
	check("name updated", v.config.personas.find((p) => p.id === socratic.id).name, "Socratic");
	check("text untouched", v.config.personas.find((p) => p.id === socratic.id).text, "You are a Socratic tutor. Never give the answer.");
}

console.log("\n5. per-session pinning");
{
	await ok("setSession", { sessionId: "A", personaId: terse.id });
	check("A pinned to terse", await textFor("A"), "Answer in one sentence.");
	check("B follows the default", await textFor("B"), "You are a Socratic tutor. Never give the answer.");
	await ok("setSession", { sessionId: "B", personaId: null });
	check("B opted out", await textFor("B"), undefined);
	await ok("clearSession", { sessionId: "B" });
	check("B follows again", await textFor("B"), "You are a Socratic tutor. Never give the answer.");
}

console.log("\n6. rejections");
{
	const r1 = await call("setActive", { personaId: "nope" });
	check("unknown persona -> 404", [r1.status, r1.body.error.code], [404, "not-found"]);
	const r2 = await call("setSession", { sessionId: "" });
	check("missing sessionId -> 400", [r2.status, r2.body.error.code], [400, "bad-request"]);
	const r3 = await call("deletePersona", { id: "nope" });
	check("delete unknown -> 404", [r3.status, r3.body.error.code], [404, "not-found"]);
	const r4 = await call("nonsense", {});
	check("unknown method -> 404", r4.status, 404);
}

console.log("\n7. delete cascades");
{
	await ok("deletePersona", { id: terse.id });
	check("terse gone", (await ok("get")).config.personas.map((p) => p.id), [socratic.id]);
	check("A unpinned, follows default", (await ok("get")).config.sessions["A"], undefined);
	check("A still overridden by the default", await textFor("A"), "You are a Socratic tutor. Never give the answer.");
	await ok("deletePersona", { id: socratic.id });
	check("active cleared with its persona", (await ok("get")).config.activeId, null);
	check("A falls back to the preset", await textFor("A"), undefined);
}

console.log("\n8. the domain is the only store");
{
	check("records live in the domain table", domain.__records.size, 0);
	await ok("createPersona", { name: "Persisted", text: "Stored in the domain." });
	check("one record written", domain.__records.size, 1);
	const stored = [...domain.__records.values()][0];
	check("record shape", Object.keys(stored).sort(), ["id", "name", "text"]);
	check("global holds the selection", typeof domain.global.get().activeId, "string");
}

console.log("\n9. caps");
{
	for (let i = 0; i < 49; i += 1) await ok("createPersona", { name: `p${i}`, text: "x" });
	const over = await call("createPersona", { name: "p50", text: "x" });
	check("51st persona rejected", [over.body.ok, over.body.error.code], [false, "too-many-personas"]);
}

console.log("\n10. body validation");
{
	// Section 9 filled the library to its cap, so make room: the cap is checked
	// before the body, and these cases are about the body.
	const all = (await ok("get")).config.personas;
	for (const persona of all.slice(1)) await ok("deletePersona", { id: persona.id });
	check("library emptied to one", (await ok("get")).config.personas.length, 1);

	const empty = await call("createPersona", { name: "e", text: "" });
	check("empty text -> 400", [empty.status, empty.body.error.code], [400, "bad-request"]);
	const blank = await call("createPersona", { name: "b", text: "  \n\t " });
	check("whitespace text -> 400", [blank.status, blank.body.error.code], [400, "bad-request"]);
	const missing = await call("createPersona", { name: "m" });
	check("missing text -> 400", [missing.status, missing.body.error.code], [400, "bad-request"]);

	const first = (await ok("get")).config.personas[0];
	const long = await call("updatePersona", { id: first.id, text: "y".repeat(20001) });
	check("20001 chars -> 400", [long.status, long.body.error.code], [400, "text-too-long"]);
	const exact = await ok("updatePersona", { id: first.id, text: "y".repeat(20000) });
	check("exactly 20000 accepted", exact.config.personas.find((p) => p.id === first.id).text.length, 20000);

	// A cap counted in UTF-16 units would split this pair and store a lone
	// surrogate; counted in code points it fits exactly.
	const emoji = "a".repeat(19999) + "\u{1F600}";
	const pair = await ok("updatePersona", { id: first.id, text: emoji });
	const stored = pair.config.personas.find((p) => p.id === first.id).text;
	check("emoji at the boundary survives whole", stored.endsWith("\u{1F600}"), true);
	check("no lone surrogate stored", /[\uD800-\uDFFF]/.test(stored.replace(/[\u{10000}-\u{10FFFF}]/gu, "")), false);

	const emptyUpdate = await call("updatePersona", { id: first.id, text: "" });
	check("clearing the text -> 400", [emptyUpdate.status, emptyUpdate.body.error.code], [400, "bad-request"]);
	// Counted in code points, like the cap: the emoji is one character, two units.
	check("text survived the rejected clear", [...(await ok("get")).config.personas.find((p) => p.id === first.id).text].length, 20000);
}

console.log("\n11. name validation");
{
	const first = (await ok("get")).config.personas[0];
	const nameOf = (v) => v.config.personas.find((p) => p.id === first.id).name;

	// A cap counted in UTF-16 units would cut this pair at 60 and store a lone
	// surrogate; counted in code points, 59 + 1 fits exactly.
	const boundary = "a".repeat(59) + "\u{1F600}";
	const exact = nameOf(await ok("updatePersona", { id: first.id, name: boundary }));
	check("emoji at the boundary survives whole", exact.endsWith("\u{1F600}"), true);
	check("name is 60 code points", [...exact].length, 60);
	check("no lone surrogate stored", /[\uD800-\uDFFF]/.test(exact.replace(/[\u{10000}-\u{10FFFF}]/gu, "")), false);

	// Over the cap the name is truncated, not rejected — and the cut lands on a
	// code-point boundary, so the pair stays whole instead of becoming 0xD83D.
	const over = nameOf(await ok("updatePersona", { id: first.id, name: `${boundary}b` }));
	check("over-long name truncated to 60", [...over].length, 60);
	check("truncation kept the pair whole", over, boundary);

	// An empty name is a supported state: the client's displayName falls back to
	// the body's first line, so it must round-trip as "" rather than fail.
	check("whitespace-only name stored as empty", nameOf(await ok("updatePersona", { id: first.id, name: "   " })), "");
	check("non-string name stored as empty", nameOf(await ok("updatePersona", { id: first.id, name: 42 })), "");
}

console.log("\n12. malformed requests");
{
	const bad = await call("get", undefined);
	check("valid empty body accepted", bad.status, 200);

	const req = Readable.from([Buffer.from("not json")]);
	req.method = "POST";
	req.url = "/persona-override/api/get";
	req.headers = { host: "127.0.0.1:3080" };
	let status = 0;
	let text = "";
	await ctx.route.handler(req, { writeHead: (c) => { status = c; }, end: (c) => { text = c ?? ""; } });
	check("invalid JSON -> 400", [status, JSON.parse(text).error.code], [400, "bad-request"]);

	const big = Readable.from([Buffer.alloc(1 << 20, 0x78), Buffer.alloc(16, 0x78)]);
	big.method = "POST";
	big.url = "/persona-override/api/get";
	big.headers = { host: "127.0.0.1:3080" };
	status = 0;
	text = "";
	await ctx.route.handler(big, { writeHead: (c) => { status = c; }, end: (c) => { text = c ?? ""; } });
	check("over-sized body -> 413", [status, JSON.parse(text).error.code], [413, "body-too-large"]);
}

console.log("\n13. a disposed session drops its override");
{
	const before = (await ok("get")).config.sessions;
	await ok("setSession", { sessionId: "gone", personaId: (await ok("get")).config.activeId });
	check("override recorded", Object.hasOwn((await ok("get")).config.sessions, "gone"), true);
	for (const handler of sessionDisposed) handler({ id: "gone" });
	await new Promise((r) => setTimeout(r, 50));
	check("override dropped", Object.hasOwn((await ok("get")).config.sessions, "gone"), false);
	check("other overrides untouched", Object.keys((await ok("get")).config.sessions), Object.keys(before));
}

console.log("\n14. concurrent mutations do not lose a write");
{
	// Two mutations that each read the selection and write it back. Without a
	// serialized read-modify-write, the later write is built from the selection
	// the earlier one has not published yet, so one field disappears.
	const before = (await ok("get")).config;
	const other = (await ok("createPersona", { name: "Concurrent", text: "Second entry." }))
		.config.personas.find((p) => p.id !== before.activeId);
	const [pinned, switched] = await Promise.all([
		ok("setSession", { sessionId: "race", personaId: before.activeId }),
		ok("setActive", { personaId: other.id }),
	]);
	check("both calls report success", [pinned.config !== undefined, switched.config !== undefined], [true, true]);
	const after = (await ok("get")).config;
	check("the pin survived the concurrent switch", after.sessions.race, { personaId: before.activeId });
	check("the switch survived the concurrent pin", after.activeId, other.id);

	// Leave the library as the next section expects it.
	await ok("clearSession", { sessionId: "race" });
	await ok("deletePersona", { id: other.id });
}

console.log("\n15. a concurrent delete cannot leave a dangling active id");
{
	// A delete and a switch aimed at the same persona. Whichever order the chain
	// runs them in, the result must not be an `activeId` naming a record that is
	// gone: `resolveFor` ignores such an id, so every conversation would run the
	// preset while Settings shows a radio checked on a row that is not in the
	// list. Before the existence check moved inside the chain, the switch passed
	// its check, queued behind the delete, and wrote exactly that id.
	const doomed = (await ok("createPersona", { name: "Doomed", text: "About to go." }))
		.config.personas.find((p) => p.name === "Doomed");
	await ok("setActive", { personaId: doomed.id });
	const [removed, switched] = await Promise.all([
		call("deletePersona", { id: doomed.id }),
		call("setActive", { personaId: doomed.id }),
	]);
	// Both orders are legitimate: the switch may win the queue and then be
	// cleared by the delete, or lose it and answer 404. What is not legitimate
	// is a 200 that leaves the id behind.
	check("the delete succeeded", removed.status, 200);
	check("the switch either won or was refused", [200, 404].includes(switched.status), true);
	const after = (await ok("get")).config;
	check("no dangling activeId", after.activeId === null || after.personas.some((p) => p.id === after.activeId), true);
	check("the deleted persona is gone", after.personas.some((p) => p.id === doomed.id), false);
	// The API response cannot prove this on its own: `snapshot()` repairs a
	// dangling id on read, so a write path that left one behind would still
	// report `null` here. Assert the stored value, which is what a restart reads.
	const stored = domain.__global();
	check(
		"the stored activeId is not dangling either",
		stored.activeId === null || [...domain.__records.keys()].includes(stored.activeId),
		true,
	);

	// The rejection now happens inside the mutation chain, so this pins the
	// other half of the contract: a `fail("not-found")` thrown from a transform
	// still reaches the route's `STATUS_BY_CODE` lookup and answers 404, not a
	// 500 from a rejected promise the handler did not expect.
	const late = await call("setActive", { personaId: doomed.id });
	check("switching to a deleted persona -> 404", [late.status, late.body.error.code], [404, "not-found"]);
	// And the chain is still usable after a transform threw.
	check("the chain survived the rejection", (await ok("get")).config.activeId, after.activeId);
}

console.log("\n16. the library cap holds under concurrent creates");
{
	// The cap is a property of the table, so it has to be checked against the
	// table at the moment of the write. Read before queueing, two creates both
	// see 49 and both put, and the library ends at 51 — one over a cap the
	// client also enforces, so the next create is refused for no visible reason.
	const start = (await ok("get")).config.personas.length;
	for (let i = start; i < 49; i += 1) await ok("createPersona", { name: `fill${i}`, text: "x" });
	check("filled to 49", (await ok("get")).config.personas.length, 49);

	const [first, second] = await Promise.all([
		call("createPersona", { name: "race-a", text: "x" }),
		call("createPersona", { name: "race-b", text: "x" }),
	]);
	check("exactly one create succeeded", [first.status, second.status].sort(), [200, 400]);
	// Read the loser defensively: when both succeed there is no 400 to inspect,
	// and a throw here would hide the count assertion below it.
	const loser = [first, second].find((r) => r.status === 400);
	check("the loser reports the cap", loser?.body.error.code, "too-many-personas");
	check("the library stops at the cap", (await ok("get")).config.personas.length, 50);

	// Leave the library as the next section expects it: one persona.
	const all = (await ok("get")).config.personas;
	for (const persona of all.slice(1)) await ok("deletePersona", { id: persona.id });
	check("library back to one", (await ok("get")).config.personas.length, 1);
}

console.log("\n17. disposal restores the preset");
{
	const agent = agents.find((a) => a.session.id === "A");
	for (const handler of disposed) handler({ agent });
	check("A's section is gone", registered.has("A"), false);
}

console.log("\n18. an agent disposed before its sync ran leaves nothing behind");
{
	// The race the dispose handler cannot see: `syncAgent` queues its work, so
	// an agent created and disposed in one tick reaches the handler before the
	// queued work has installed a fiber. The handler finds nothing, and the
	// queued work then registers a section for an agent that is already gone —
	// a live section and a live fiber that nothing will ever dispose.
	//
	// An active persona is required for the race to be reachable at all: with
	// none, `syncAgent` returns before it ever builds a fiber.
	const persona = (await ok("get")).config.personas[0];
	await ok("setActive", { personaId: persona.id });

	const sessionId = "short-lived";
	let sectionRegistered = false;
	let fiberDisposed = false;
	const agent = {
		session: { id: sessionId },
		ctx: {
			inject: (deps, fn) => {
				fn({ systemPrompt: { getSectionOrder: () => 900, section: () => { sectionRegistered = true; } } });
				return { dispose: async () => { fiberDisposed = true; sectionRegistered = false; } };
			},
		},
	};
	agents.push(agent);
	// Same tick, no await between them: this is the ordering that loses the race.
	for (const handler of created) void handler({ agent });
	for (const handler of disposed) handler({ agent });
	await new Promise((r) => setTimeout(r, 50));
	check("no section left registered", sectionRegistered, false);
	check("the fiber was disposed", fiberDisposed, true);

	// The guard must not outlive its purpose: an agent that is alive still gets
	// its section, and the shared ctx is left as later sections expect it.
	check("a live agent still gets its section", (await textFor("A")) === persona.text, true);
	await ok("setActive", { personaId: null });
}

console.log("\n19. a domain that never opens is reported, not faked as empty");
{
	// A second, independent ctx: this one's storage refuses to open, which is
	// the failure the healthy ctx above can never reach.
	const broken = makeCtx({
		open: async () => {
			throw new Error("disk is unavailable");
		},
	});
	await mod.apply(broken.ctx);
	await new Promise((r) => setTimeout(r, 100));
	const brokenCall = makeCall(broken.ctx);

	// `get` still answers 200 — the request succeeded, the library did not —
	// but it must say so. An empty `personas` alone is the lie being fixed.
	const got = await brokenCall("get");
	check("get still answers 200", got.status, 200);
	check("get reports the library unavailable", got.body.value.config.unavailable, true);
	check("get carries a reason", typeof got.body.value.config.reason, "string");
	check("get does not claim an empty library", got.body.value.config.personas, []);

	// Every mutation must refuse with a code the client can explain, not a
	// TypeError that the route turns into an opaque 500.
	const mutations = [
		["createPersona", { name: "x", text: "y" }],
		["setActive", { personaId: null }],
		["updatePersona", { id: "any", text: "y" }],
		["deletePersona", { id: "any" }],
		["setSession", { sessionId: "A", personaId: null }],
		["clearSession", { sessionId: "A" }],
	];
	for (const [method, payload] of mutations) {
		const r = await brokenCall(method, payload);
		check(`${method} -> 503 unavailable`, [r.status, r.body.error.code], [503, "unavailable"]);
	}

	// The healthy ctx is untouched by the broken one: two ctxs, two domains.
	check("the healthy ctx still reads its library", (await ok("get")).config.unavailable, undefined);
}

console.log("\n20. a profile without zod activates degraded instead of failing");
{
	// The suite itself needs zod, so this case cannot be reached in-process: the
	// link `ensureZod` makes is what the plugin resolves against. It is reached
	// the way the bug was reported instead — a copy of `lib/` and `package.json`
	// in a directory with no `node_modules`, where a peer dependency is simply
	// not there. That is the real condition, not a simulation of it.
	const dir = mkdtempSync(join(tmpdir(), "persona-no-zod-"));
	try {
		cpSync(join(here, "..", "lib"), join(dir, "lib"), { recursive: true });
		cpSync(join(here, "..", "package.json"), join(dir, "package.json"));
		writeFileSync(join(dir, "probe.mjs"), `
import { Readable } from "node:stream";

// The guard against a vacuous pass: if zod resolves here, this directory does
// not reproduce the reported condition and the assertions below would prove
// nothing. Say so instead of reporting a green run.
try {
	await import("zod");
	console.log(JSON.stringify({ reproduced: false }));
	process.exit(0);
} catch {}

const mod = await import("./lib/index.js");
const created = [];
const ctx = {
	logger: { warn: () => {} },
	effect: (fn) => fn(),
	on: (event, handler) => {
		if (event === "agent/created") created.push(handler);
		return () => {};
	},
	agents: { list: () => [] },
	storageDomain: { open: async () => { throw new Error("the domain must not open without zod"); } },
	webServer: { register: (route) => { ctx.route = route; return () => {}; } },
	inject: (deps, fn) => { if (deps.includes("webServer")) fn({ webServer: ctx.webServer, effect: (f) => f() }); },
};

const result = { reproduced: true, exports: Object.keys(mod).sort(), mutations: {} };
try {
	await mod.apply(ctx);
	result.applied = true;
} catch (error) {
	result.applied = false;
	result.applyError = String(error?.code ?? error?.message ?? error);
}
await new Promise((r) => setTimeout(r, 100));
result.routeRegistered = ctx.route !== undefined;

if (result.routeRegistered) {
	const call = async (method, payload) => {
		const req = Readable.from([Buffer.from(JSON.stringify(payload ?? {}))]);
		req.method = "POST";
		req.url = "/persona-override/api/" + method;
		req.headers = { host: "127.0.0.1:3080" };
		let status = 0;
		let text = "";
		await ctx.route.handler(req, { writeHead: (c) => { status = c; }, end: (c) => { text = c ?? ""; } });
		return { status, body: JSON.parse(text) };
	};
	const got = await call("get");
	result.getStatus = got.status;
	result.unavailable = got.body.value.config.unavailable;
	result.reason = got.body.value.config.reason;
	result.personas = got.body.value.config.personas;
	for (const [method, payload] of [
		["createPersona", { name: "x", text: "y" }],
		["setActive", { personaId: null }],
		["setSession", { sessionId: "A", personaId: null }],
	]) {
		const r = await call(method, payload);
		result.mutations[method] = [r.status, r.body.error?.code];
	}
}

// With no domain there is no persona to apply, so the prompt path must stay
// silent rather than register a section that resolves to nothing.
let sectionRegistered = false;
const agent = {
	session: { id: "A" },
	ctx: {
		inject: (deps, fn) => {
			fn({ systemPrompt: { getSectionOrder: () => 900, section: () => { sectionRegistered = true; } } });
			return { dispose: async () => {} };
		},
	},
};
for (const handler of created) await handler({ agent });
result.sectionRegistered = sectionRegistered;

console.log(JSON.stringify(result));
`);
		const run = spawnSync(process.execPath, [join(dir, "probe.mjs")], { cwd: dir, encoding: "utf8" });
		const line = run.stdout.trim().split("\n").filter(Boolean).pop();
		let probe;
		try {
			probe = JSON.parse(line);
		} catch {
			probe = undefined;
		}
		if (probe === undefined) {
			failures += 1;
			console.log(`  FAIL the probe produced no result\n       stdout ${JSON.stringify(run.stdout)}\n       stderr ${JSON.stringify(run.stderr)}`);
		} else if (probe.reproduced !== true) {
			// Not a pass: the directory resolved zod, so nothing below was tested.
			failures += 1;
			console.log("  FAIL zod resolved in the probe directory, so the missing-peer case was not reproduced");
		} else {
			check("the module still loads", probe.exports, ["apply", "inject", "name"]);
			check("apply resolves without zod", probe.applied, true);
			check("the routes are still registered", probe.routeRegistered, true);
			check("get still answers 200", probe.getStatus, 200);
			check("get reports the library unavailable", probe.unavailable, true);
			check("get does not claim an empty library", probe.personas, []);
			// The reason is what the client shows, so it has to name the package
			// the user can install rather than a raw ERR_MODULE_NOT_FOUND.
			check("the reason names the missing package", /zod/.test(probe.reason ?? ""), true);
			check("the reason is not a raw module error", /ERR_MODULE_NOT_FOUND/.test(probe.reason ?? ""), false);
			check("createPersona -> 503", probe.mutations.createPersona, [503, "unavailable"]);
			check("setActive -> 503", probe.mutations.setActive, [503, "unavailable"]);
			check("setSession -> 503", probe.mutations.setSession, [503, "unavailable"]);
			check("no prompt section is registered", probe.sectionRegistered, false);
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
