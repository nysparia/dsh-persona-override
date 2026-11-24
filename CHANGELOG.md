# Changelog

## 0.4.1 — 2026-11-24

Six defects found by probing the API directly, two of which lost data silently.

- **Fixed: an empty persona body was accepted and stored.** `resolveFor` treats
  an empty body as "no persona", so a library entry with empty text looked
  active in Settings and in the header chip while the host quietly kept the
  preset persona. Both `createPersona` and `updatePersona` now reject an empty
  or whitespace-only body with 400 instead of storing a persona that does
  nothing.
- **Fixed: an over-long body was truncated instead of refused.** The cap was
  applied with `slice`, so a 25,000-character paste was saved as the first
  20,000 characters — a persona the user did not write, with no warning. The
  host now rejects it with `text-too-long`, and the editor shows
  `n / 20000 chars`, turns the counter red past the cap, and disables Save.
- **Fixed: truncation could split a surrogate pair.** The cap counted UTF-16
  units, so cutting at the boundary stored a lone surrogate — not valid text,
  and it renders as a replacement character. The cap now counts code points,
  and the client counts the same way so the two cannot disagree.
- **Fixed: the header chip did not update after a rename.** The settings
  section and the chip each held their own copy of the library, so renaming a
  persona left the chip showing the old name until a page reload. Both now read
  one shared snapshot through `useSyncExternalStore`.
- **Fixed: a malformed request body answered 500.** Invalid JSON and an
  over-sized body were reported as `internal error`, which the client shows as
  "Internal error — please try again later" for what is a fixable request. They
  now answer 400 `bad-request` and 413 `body-too-large`.
- **Fixed: a deleted conversation kept its override forever.** The entry
  referenced a session id that no longer existed, so it could never apply
  again, but it still counted against the 200-session cap. `session/disposed`
  now drops it.
- **Fixed: a failed selection write left memory ahead of disk.** `selection`
  was assigned before `await domain.global.set(...)`, so a failed write left
  the running prompt on a choice a restart would revert. The durable write now
  comes first.

## 0.4.0 — 2026-11-24

The conversation header now shows the persona in force, plus display metadata.

- **The header chip names the persona the conversation actually runs**, not the
  mechanism that selected it. "Which persona am I talking to" is the question a
  reader has; "following the default" answers a different one. The picker opens
  on a summary of the current persona and where it came from.
- **Fixed: an explicit opt-out showed the default persona.** The chip derived
  the effective persona as `pinned ?? active`, so turning the persona off for
  one conversation fell back to the library default and displayed a persona the
  host was not applying. An explicit entry now decides, including "off".
- **Fixed: the picker's modal crashed the slot.** `createPortal` was called
  without its container, so opening the picker threw React error #200 and
  blanked `conversation.session.header.actions`.
- **Fixed: the "follow the default" option repeated the persona name** already
  shown in the summary above it.
- Added `locale/en.json` and `locale/zh.json` with `meta.title` and
  `meta.description`, and an `icon.svg`, so the Plugins page shows a name, a
  description and artwork instead of the package name and default tile.

## 0.3.1 — 2026-11-23

Two load failures found by booting the plugin in a fresh profile.

- **`@deepseek-ai/schemastery` is no longer imported.** The plugin declared an
  empty `Config` schema and never read a config value, but the import made the
  whole plugin fail to load wherever the peer was not installed — a local
  directory install does not resolve peers, so the entry died with
  `ERR_MODULE_NOT_FOUND` before `apply` ran. The empty `Config` is gone.
- **`webServer` is no longer a required injection.** It only carries the
  Settings UI's HTTP routes, so a profile without a browser surface (headless,
  ACP, SDK) parked the entire plugin in PENDING and the persona never applied.
  The routes now register through `ctx.inject(["webServer"], ...)`; the prompt
  path is unconditional.

Verified end to end in an isolated profile: a new session's `system/message`
carries the persona text as its own section, replacing the preset's
`You are a coding agent...`.

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
