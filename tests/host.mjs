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
	};
}

function makeCtx() {
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
			open: async (spec) => {
				domain.__setSpec(spec);
				return domain;
			},
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

async function call(method, payload) {
	const req = Readable.from([Buffer.from(JSON.stringify(payload ?? {}))]);
	req.method = "POST";
	req.url = `/persona-override/api/${method}`;
	req.headers = { host: "127.0.0.1:3080", "content-type": "application/json" };
	let status = 0;
	let text = "";
	await ctx.route.handler(req, { writeHead: (c) => { status = c; }, end: (c) => { text = c ?? ""; } });
	return { status, body: JSON.parse(text) };
}
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

console.log("\n11. malformed requests");
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

console.log("\n12. a disposed session drops its override");
{
	const before = (await ok("get")).config.sessions;
	await ok("setSession", { sessionId: "gone", personaId: (await ok("get")).config.activeId });
	check("override recorded", Object.hasOwn((await ok("get")).config.sessions, "gone"), true);
	for (const handler of sessionDisposed) handler({ id: "gone" });
	await new Promise((r) => setTimeout(r, 50));
	check("override dropped", Object.hasOwn((await ok("get")).config.sessions, "gone"), false);
	check("other overrides untouched", Object.keys((await ok("get")).config.sessions), Object.keys(before));
}

console.log("\n13. disposal restores the preset");
{
	const agent = agents.find((a) => a.session.id === "A");
	for (const handler of disposed) handler({ agent });
	check("A's section is gone", registered.has("A"), false);
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
