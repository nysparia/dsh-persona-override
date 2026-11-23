# Changelog

## 0.3.0 — 2026-11-23

Conform to the plugin practices in the shipped `dsh-doc` skill.

- **The Client half no longer requires `@deepseek-ai/dsh-client-ui-primitives`.**
  `references/practices.md` forbids loading a Harness Client package as a
  module: those packages change without notice, and a throwing component blanks
  the whole slot entry. Button, Input and Modal are now local controls that
  copy the primitives' markup, CSS and behavior — variants, disabled states,
  focus ring, portal, Escape, focus entry and return, and the Tab trap — under
  the plugin's own `pOv_` prefix. `react-dom` is a platform module, so the
  portal still works.
- **Persistence moved to `ctx.storageDomain`.** The hand-rolled
  `$DSH_HOME/persona-override/config.json` is gone. The plugin declares a
  `persona_override` domain (one `personas` table plus a selection global) and
  opens it through the mounted storage form, so records are schema-validated at
  the durable boundary and writes are serialized by the domain layer. The
  `storageDomain` service is declared in `inject`, so the plugin stays inactive
  in profiles without it.
- **Theme tokens restricted to the ones `cordis_inspect` `Theme` lists.**
  `--dsw-alias-border-selected`, `--dsw-alias-border-l3`,
  `--dsw-alias-state-business-primary` and `--dsw-alias-bg-layer-1` as a
  foreground are replaced with `--dsw-alias-brand-primary`,
  `--dsw-alias-border-l2` and `--dsw-alias-bg-layer-2`.
- The 0.1.x JSON config is not migrated: the old file is left untouched and the
  new domain starts empty. Re-add personas from Settings.

## 0.2.1 — 2026-11-23

Fix: a profile reload left existing conversations without the persona.

- The backfill that syncs agents which already exist ran synchronously, while
  the config read is async. On a reload the backfill resolved every session
  against the empty default, so pre-existing agents got no section and the
  persona silently did not apply until a new conversation started.
- The backfill now waits for the config read, and skips if the plugin was
  disposed in the meantime.

## 0.2.1 — 2026-11-23

Fix: a profile reload left existing conversations without the persona.

- The backfill that syncs agents which already exist ran synchronously, while
  the config read is async. On a reload the backfill resolved every session
  against the empty default, so pre-existing agents got no section and the
  persona silently did not apply until a new conversation started.
- The backfill now waits for the config read, and skips if the plugin was
  disposed in the meantime.

## 0.2.0 — 2026-11-23

Named persona library.

- A persona is now `{ id, name, text }`; the library holds up to 50, one of which is
  **active** for every conversation.
- Settings → Persona is a list: create, rename, edit, delete, and pick the active entry.
- The session-header chip is a picker over the same library instead of a free-text box.
- A session entry is a reference to a library persona, not a copy: editing a persona
  reaches every session that points at it, and deleting one unpins its sessions.
- `personaId: null` on a session opts that conversation out of the library.
- 0.1.x configs migrate on load: `defaultPersona` becomes a library entry, and inline
  per-session text is promoted to its own entry. Nothing is dropped.
- New API methods `setActive`, `createPersona`, `updatePersona`, `deletePersona`;
  `saveDefault` is gone.

## 0.1.0 — 2026-11-23

First release.

- Replaces the deployment persona through `agent/created`, registering into the
  agent's own scope so it wins over the preset's `persona` row.
- Machine-wide default persona, plus a per-conversation override.
- Settings section for the default; a session-header chip for the conversation.
- Beats a `complete: true` persona, which a `system-prompt/assemble` rewrite cannot.
- Keeps `{{model}}` interpolation.
- Requires dsh 0.2.3 or newer to take effect; stays inert with one warning on older versions.
