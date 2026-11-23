# Changelog

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
