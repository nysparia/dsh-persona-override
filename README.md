# dsh-persona-override

Replace the deployment persona from a **named persona library** — pick which one is in
use at any time, and let a single conversation pick its own — without declaring an agent
preset and without editing a profile patch layer.

## The problem it solves

DSH has no "persona" setting. The persona is a **child row of an agent preset**:

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: You are a coding agent powered by the {{model}} model.
```

All four shipped presets (`standard`, `ptc`, `minimal`, `cordis`) mount that row, and
`PresetDefinition` has no inheritance — `plugins` is a required complete list. So changing
the persona normally means declaring a whole preset, which means editing a profile.

## Why the obvious approaches fail

| Approach | Result |
|---|---|
| Set `systemPrompt.personaPrefix` globally | The preset's `persona` row shadows it in the preset's scope |
| Mount `@deepseek-ai/dsh-persona` globally | **0.2.2-rc.1**: throws `already registered`. **0.2.3+**: allowed, but the preset's scoped row still wins |
| Rewrite the section in `system-prompt/assemble` | Works for normal presets, but **loses to `complete: true`** — a complete section is restored as the sole prompt section after the waterfall |
| Write `~/.dsh/AGENTS.md` | Works, but it is a **user-role `<system-reminder>`**, not a system prompt section — lower precedence, and it does not replace the persona |

## What this plugin does

Registers the persona section through `agent.ctx` on `agent/created`:

```js
const fiber = agent.ctx.inject(["systemPrompt"], (scope) => {
  scope.systemPrompt.section({
    name: "deployment:persona-prefix",
    order: scope.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
    text: () => resolveFor(sessionId),
  });
});
```

That lands in the **same scope** as the preset's own `persona` row, and 0.2.3 resolves
same-scope duplicates by latest registration — so ours wins. This is the same pattern
`dsh-file-reference-local` uses for its own prompt section.

Because it is a real section rather than a waterfall rewrite, it also beats `complete: true`,
and `{{model}}` interpolation keeps working.

## The library

A persona is `{ id, name, text }`. The library holds up to 50 of them; one is **active**,
and every conversation without its own choice uses it.

| Level | Where | Scope |
|---|---|---|
| **Library** | Settings → Persona | Every conversation |
| **Per-conversation** | Chip in the session header | That conversation only |

Settings → Persona is one card: the library rows (each with a radio, its name, a one-line
preview, and Edit / Delete), a **None** row in the same radio group, and a New persona
button. Picking a radio switches the active entry immediately. The editor opens inline in
the same card, so creating and editing never leave the page.

The header chip names what the conversation currently uses — the active persona's name, or
"Following the default" — and opens a picker over the same library. Every choice in that
picker writes immediately; it is a picker, not a form, so it closes with **Done** rather
than Save/Cancel.

Resolution order for one session:

1. An explicit per-session entry decides, **including "off"** — that is how you opt one
   conversation out of the library.
2. Otherwise the active library entry applies, if one is selected and its text is non-empty.
3. Otherwise the preset's own persona stays untouched.

A session entry is a **reference, not a copy**: editing a library persona changes every
session that points at it. That is what a shared library means, and it is why deleting a
persona unpins its sessions (they follow the default again) instead of freezing stale text.

The section text is a **function**, so a config change takes effect on the next request — no
re-registration, no restart.

## Verified

Against real npm packages at `0.2.3-alpha.2`, with a preset scope mounting
`prefix: 'PRESET'`:

```
1. no config      A -> "...PRESET"
2. default on     A -> "...GLOBAL SOCRATIC"
3. A overridden   A -> "...A ONLY"
3. A overridden   B -> "...GLOBAL SOCRATIC"     ← B unaffected
4. B opted out    B -> "...PRESET"              ← explicit off wins over the default
5. A cleared      A -> "...GLOBAL SOCRATIC"     ← falls back to the default
```

Other cases:

```
complete:true preset  -> "...SOCRATIC"          ← the waterfall approach fails here
after dispose         -> "MINIMAL COMPLETE"     ← preset restored
{{model}}             -> "...the deepseek-v4 model."   ← interpolation preserved
toggle off            -> "...PRESET"
toggle on             -> "...SOCRATIC"          ← fiber re-created
```

Agents that already exist when the plugin loads are backfilled through `ctx.agents.list()`.

The library itself is covered by a host-half suite that drives the real HTTP handler and the
real JSON file: create / rename / edit / delete, switching the active entry, per-session
pinning and opt-out, delete cascades, the 50-persona and 20000-char caps, and the 0.1.x
migration.

## Storage

`$DSH_HOME/persona-override/config.json`:

```json
{
  "personas": [
    { "id": "…", "name": "苏格拉底导师", "text": "You are a Socratic tutor…" },
    { "id": "…", "name": "Terse", "text": "Answer in one sentence." }
  ],
  "activeId": "…",
  "sessions": {
    "abc123": { "personaId": "…" },
    "def456": { "personaId": null }
  }
}
```

`activeId: null` means no library entry is in use. A session entry with `personaId: null`
opts that conversation out. Written atomically (temp + rename), serialized so concurrent
saves cannot drop each other. Capped at 50 personas and 200 session entries. Nothing is
written outside that directory.

### Upgrading from 0.1.x

0.1.x stored one anonymous `defaultPersona` behind an `enabled` flag, plus inline per-session
text. On load, the old default becomes a library entry (active if it was enabled), and each
session's inline text is promoted to its own entry that the session then points at. Nothing
is dropped, and the file is rewritten in the new shape on the next save.

## HTTP surface

`POST /persona-override/api/{get,setActive,createPersona,updatePersona,deletePersona,setSession,clearSession}`,
loopback-only, with the same browser-trust fence the first-party `/api` routes use: `Host`
must be a loopback literal, `Sec-Fetch-Site: cross-site` is rejected, and a present `Origin`
must match `Host`.

## Lifecycle

`agent/created` is `serial` and awaited before creation resolves, so a throw there fails agent
creation. Every sync is wrapped in `try/catch` and serialized per agent. `agent/disposed`
disposes the fiber, which restores the preset's persona.

## Compatibility

`peerDependencies` are `>=0.1.0-rc.6 <0.3.0-0` on every `@deepseek-ai/dsh-*` package, so
`evaluatePluginCompatibility` passes on both 0.2.2-rc.1 and 0.2.3-alpha.2 without a version
exemption. Zero runtime dependencies; the only imports are `@deepseek-ai/schemastery` and
`node:` builtins.

**Requires dsh 0.2.3 or newer to actually override.** Before 0.2.3, a second registration of
the same section name in one scope throws instead of stacking. On such a version the plugin
stays loaded but inert, and logs one warning naming the requirement.

## Install

```
dsh plugin install /home/nsparia/Documents/deepseek-harness/default-workspace/dsh-persona-override
```

Needs `danger-full-access` approval, because the profile lives under `~/.dsh/`.
