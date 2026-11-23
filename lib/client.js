window.__ModuleLoader__.load({
	id: "dsh-persona-override",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region css
		const css = [
			".pOv_root{flex-direction:column;gap:14px;display:flex}",
			".pOv_card{box-sizing:border-box;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex}",
			".pOv_cardTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px}",
			".pOv_cardDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_textarea{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;line-height:20px;resize:vertical}",
			".pOv_textarea:focus{outline:none;border-color:var(--dsw-alias-border-selected)}",
			".pOv_footer{box-sizing:border-box;align-items:center;gap:10px;min-height:28px;display:flex;flex-wrap:wrap}",
			".pOv_saved{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}",
			".pOv_loading{color:var(--dsw-alias-label-tertiary);padding:12px 0;font-size:13px;line-height:18px}",
			".pOv_path{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:16px;word-break:break-all}",
			".pOv_count{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}",
			".pOv_state{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}",
			".pOv_list{flex-direction:column;gap:6px;display:flex}",
			".pOv_row{box-sizing:border-box;cursor:pointer;align-items:flex-start;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:9px 11px;display:flex}",
			".pOv_rowDisabled{cursor:default;opacity:.55}",
			".pOv_rowActive{border-color:var(--dsw-alias-border-selected)}",
			".pOv_radio{cursor:pointer;accent-color:var(--dsw-alias-state-business-primary);width:14px;height:14px;flex:none;margin-top:3px}",
			".pOv_rowMain{flex-direction:column;gap:3px;flex:1;min-width:0;display:flex}",
			".pOv_rowHead{align-items:center;gap:8px;display:flex;flex-wrap:wrap}",
			".pOv_rowName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_rowPreview{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_rowActions{align-items:center;gap:4px;flex:none;display:flex}",
			".pOv_badge{color:var(--dsw-alias-state-business-primary);border:1px solid var(--dsw-alias-state-business-primary);border-radius:999px;padding:0 7px;font-size:10px;line-height:16px;flex:none}",
			".pOv_empty{color:var(--dsw-alias-label-tertiary);border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:16px;font-size:12px;line-height:18px;text-align:center}",
			".pOv_field{flex-direction:column;gap:5px;display:flex}",
			".pOv_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}",
			".pOv_editor{flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px;display:flex}",
			".pOv_chip{cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;align-items:center;gap:5px;padding:2px 9px;font-family:inherit;font-size:11px;line-height:17px;display:inline-flex;max-width:220px}",
			".pOv_chip:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}",
			".pOv_chipOn{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}",
			".pOv_chipText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_dot{background:currentColor;border-radius:50%;width:5px;height:5px;flex:none}",
			".pOv_modal{max-height:100%}",
			".pOv_modalBody{flex-direction:column;gap:10px;min-height:0;overflow-y:auto;display:flex}",
		].join("");
		const tagId = "dsh-persona-override/PersonaOverride.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-persona-override";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const pcss = {
			root: "pOv_root",
			card: "pOv_card",
			cardTitle: "pOv_cardTitle",
			cardDesc: "pOv_cardDesc",
			textarea: "pOv_textarea",
			footer: "pOv_footer",
			saved: "pOv_saved",
			error: "pOv_error",
			loading: "pOv_loading",
			path: "pOv_path",
			count: "pOv_count",
			state: "pOv_state",
			list: "pOv_list",
			row: "pOv_row",
			rowActive: "pOv_row pOv_rowActive",
			rowDisabled: "pOv_row pOv_rowDisabled",
			rowActiveDisabled: "pOv_row pOv_rowActive pOv_rowDisabled",
			radio: "pOv_radio",
			rowMain: "pOv_rowMain",
			rowHead: "pOv_rowHead",
			rowName: "pOv_rowName",
			rowPreview: "pOv_rowPreview",
			rowActions: "pOv_rowActions",
			badge: "pOv_badge",
			empty: "pOv_empty",
			field: "pOv_field",
			fieldLabel: "pOv_fieldLabel",
			editor: "pOv_editor",
			chip: "pOv_chip",
			chipOn: "pOv_chip pOv_chipOn",
			chipText: "pOv_chipText",
			dot: "pOv_dot",
			modal: "pOv_modal",
			modalBody: "pOv_modalBody",
		};
		//#endregion

		//#region locale
		const zh = {
			nav: "人设",
			loading: "加载中…",
			loadFailed: "加载失败",
			title: "人设库",
			desc: "维护多个人设，随时切换当前使用的那一个。单个会话可在标题栏单独指定。",
			empty: "还没有人设。新建一个，就能在这里随时切换。",
			newPersona: "新建人设",
			nameLabel: "名称",
			namePlaceholder: "例如：苏格拉底导师",
			textLabel: "人设正文",
			placeholder: "例如：你是一位苏格拉底式的导师。不要直接给出答案，一次只问一个问题，让学习者自己得出结论。",
			save: "保存",
			cancel: "取消",
			done: "完成",
			saved: "已保存",
			edit: "编辑",
			remove: "删除",
			inUse: "使用中",
			unnamed: "未命名",
			removeTitle: "删除人设",
			removeDesc: "指定了它的人设会话会回到跟随默认。人设正文一并删除，无法恢复。",
			emptyText: "人设正文不能为空。",
			none: "不使用（保留预设人设）",
			path: "配置文件",
			chars: "字",
			sessionNav: "本会话人设",
			sessionCount: "已单独指定的会话",
			sessionTitle: "本会话人设",
			sessionDesc: "只覆盖当前这个会话。",
			sessionFollow: "跟随默认",
			sessionOff: "不使用（保留预设人设）",
			sessionSaved: "已保存",
			errorForbidden: "无权访问此功能",
			errorTimeout: "请求超时，请重试",
			errorInternal: "服务内部错误，请稍后重试",
			errorTooMany: "会话覆盖数量已达上限",
			errorTooManyPersonas: "人设数量已达上限",
			errorNotFound: "这个人设已不存在",
		};
		const en = {
			nav: "Persona",
			loading: "Loading…",
			loadFailed: "Failed to load",
			title: "Persona library",
			desc: "Keep several personas and switch which one is in use at any time. A single conversation can pick its own from the header.",
			empty: "No personas yet. Create one and you can switch between them here.",
			newPersona: "New persona",
			nameLabel: "Name",
			namePlaceholder: "e.g. Socratic tutor",
			textLabel: "Persona text",
			placeholder: "e.g. You are a Socratic tutor. Never hand over the answer; ask one question at a time and let the learner reach it.",
			save: "Save",
			cancel: "Cancel",
			done: "Done",
			saved: "Saved",
			edit: "Edit",
			remove: "Delete",
			inUse: "In use",
			unnamed: "Untitled",
			removeTitle: "Delete persona",
			removeDesc: "Conversations pinned to it will follow the default again. Its text is deleted too, and cannot be recovered.",
			emptyText: "A persona needs some text.",
			none: "None (keep the preset persona)",
			path: "Config file",
			chars: "chars",
			sessionNav: "This conversation",
			sessionCount: "Conversations with their own choice",
			sessionTitle: "This conversation's persona",
			sessionDesc: "Overrides only the current conversation.",
			sessionFollow: "Following the default",
			sessionOff: "None (keep the preset persona)",
			sessionSaved: "Saved",
			errorForbidden: "Access to this feature is forbidden",
			errorTimeout: "Request timed out — please try again",
			errorInternal: "Internal error — please try again later",
			errorTooMany: "Too many conversation overrides",
			errorTooManyPersonas: "Too many personas",
			errorNotFound: "That persona no longer exists",
		};
		//#endregion

		const NS = "personaOverride";
		const inject = ["slots", "locale"];
		const API_TIMEOUT_MS = 15000;

		/** One POST against the plugin's fenced JSON API. */
		async function api(method, payload) {
			const controller = new AbortController();
			const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
			try {
				const response = await fetch(`/persona-override/api/${method}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload ?? {}),
					signal: controller.signal,
				});
				let body;
				try {
					body = await response.json();
				} catch {
					throw new Error(`persona-override API ${method} returned a non-JSON response (${response.status})`);
				}
				if (body === null || typeof body !== "object" || body.ok !== true) {
					const failure = new Error((body && body.error && body.error.message) || `persona-override API ${method} failed (${response.status})`);
					if (body && body.error && typeof body.error.code === "string") failure.code = body.error.code;
					throw failure;
				}
				return body.value;
			} catch (reason) {
				if (reason && reason.name === "AbortError") {
					const failure = new Error("persona-override API request timed out");
					failure.code = "timeout";
					throw failure;
				}
				throw reason;
			} finally {
				window.clearTimeout(timer);
			}
		}

		const ERROR_KEYS = {
			forbidden: "errorForbidden",
			timeout: "errorTimeout",
			internal: "errorInternal",
			"too-many-sessions": "errorTooMany",
			"too-many-personas": "errorTooManyPersonas",
			"not-found": "errorNotFound",
		};
		function errorMessage(t, reason) {
			const code = reason && reason.code;
			if (typeof code === "string" && Object.hasOwn(ERROR_KEYS, code)) return t(ERROR_KEYS[code]);
			return reason instanceof Error ? reason.message : String(reason);
		}

		/** The name to show for a persona, falling back to its first line. */
		function displayName(t, persona) {
			if (persona.name !== "") return persona.name;
			const firstLine = persona.text.split("\n").map((line) => line.trim()).find((line) => line !== "");
			if (firstLine === undefined) return t("unnamed");
			return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
		}

		/** A one-line preview of the persona body. */
		function previewOf(persona) {
			const flat = persona.text.replace(/\s+/g, " ").trim();
			return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
		}

		/**
		 * Settings section: the persona library and which entry is in use.
		 */
		function PersonaOverrideSection({ t }) {
			const [config, setConfig] = react.useState(null);
			const [path, setPath] = react.useState("");
			const [loadError, setLoadError] = react.useState(null);
			const [saveError, setSaveError] = react.useState(null);
			// Errors from the toolbar (radio / delete) are kept apart from the
			// editor's, so each is reported beside the control that caused it.
			const [actionError, setActionError] = react.useState(null);
			const [saving, setSaving] = react.useState(false);
			const [savedFlash, setSavedFlash] = react.useState(false);
			// null = not editing; "new" = creating; otherwise the persona id.
			const [editing, setEditing] = react.useState(null);
			const [draftName, setDraftName] = react.useState("");
			const [draftText, setDraftText] = react.useState("");
			// The persona awaiting delete confirmation, or null.
			const [pendingRemove, setPendingRemove] = react.useState(null);

			// One timer for the "saved" flash: a second write restarts it rather
			// than letting the first timer cut the second flash short, and unmount
			// clears it so no state lands on a gone component.
			const flashTimer = react.useRef(0);
			const flash = react.useCallback(() => {
				setSavedFlash(true);
				window.clearTimeout(flashTimer.current);
				flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1600);
			}, []);
			react.useEffect(() => () => window.clearTimeout(flashTimer.current), []);

			react.useEffect(() => {
				let cancelled = false;
				api("get")
					.then((value) => {
						if (cancelled) return;
						setConfig(value.config);
						setPath(value.path);
					})
					.catch((reason) => {
						if (!cancelled) setLoadError(reason);
					});
				return () => {
					cancelled = true;
				};
			}, []);

			/**
			 * Run one write, then adopt the config the host returns.
			 * @param surface - which error slot a failure belongs to.
			 */
			const write = react.useCallback(async (method, payload, surface = "action") => {
				setSaving(true);
				if (surface === "editor") setSaveError(null); else setActionError(null);
				try {
					const value = await api(method, payload);
					setConfig(value.config);
					flash();
					return true;
				} catch (reason) {
					if (surface === "editor") setSaveError(reason); else setActionError(reason);
					return false;
				} finally {
					setSaving(false);
				}
			}, [flash]);

			const startNew = react.useCallback(() => {
				setEditing("new");
				setDraftName("");
				setDraftText("");
				setSaveError(null);
				setActionError(null);
			}, []);

			const startEdit = react.useCallback((persona) => {
				setEditing(persona.id);
				setDraftName(persona.name);
				setDraftText(persona.text);
				setSaveError(null);
				setActionError(null);
			}, []);

			const cancelEdit = react.useCallback(() => {
				setEditing(null);
				setSaveError(null);
			}, []);

			const commitEdit = react.useCallback(async () => {
				if (draftText.trim() === "") {
					setSaveError(Object.assign(new Error(t("emptyText")), { code: "empty-text" }));
					return;
				}
				const ok = editing === "new"
					? await write("createPersona", { name: draftName, text: draftText }, "editor")
					: await write("updatePersona", { id: editing, name: draftName, text: draftText }, "editor");
				if (ok) setEditing(null);
			}, [editing, draftName, draftText, write]);

			const remove = react.useCallback(async (persona) => {
				// Only drop the draft once the delete actually succeeded, so a
				// failure leaves the user's unsaved text where it was.
				const ok = await write("deletePersona", { id: persona.id });
				if (!ok) return;
				if (editing === persona.id) setEditing(null);
				setPendingRemove(null);
			}, [editing, write]);

			if (loadError !== null) {
				return react.createElement("div", { className: pcss.root },
					react.createElement("div", { className: pcss.error }, `${t("loadFailed")}: ${errorMessage(t, loadError)}`));
			}
			if (config === null) {
				return react.createElement("div", { className: pcss.root },
					react.createElement("div", { className: pcss.loading }, t("loading")));
			}

			const personas = config.personas ?? [];
			const activeId = config.activeId ?? null;
			const overridden = Object.keys(config.sessions ?? {}).length;

			const editor = react.createElement("div", { className: pcss.editor },
				react.createElement("div", { className: pcss.field },
					react.createElement("span", { className: pcss.fieldLabel }, t("nameLabel")),
					react.createElement(primitives.Input, {
						value: draftName,
						placeholder: t("namePlaceholder"),
						maxLength: 60,
						onChange: (event) => setDraftName(event.target.value),
					})),
				react.createElement("div", { className: pcss.field },
					react.createElement("span", { className: pcss.fieldLabel }, t("textLabel")),
					react.createElement("textarea", {
						className: pcss.textarea,
						rows: 10,
						value: draftText,
						placeholder: t("placeholder"),
						onChange: (event) => setDraftText(event.target.value),
					})),
				react.createElement("div", { className: pcss.count }, `${draftText.length} ${t("chars")}`),
				react.createElement("div", { className: pcss.footer },
					react.createElement(primitives.Button, { variant: "primary", disabled: saving, onClick: commitEdit }, t("save")),
					react.createElement(primitives.Button, { variant: "ghost", disabled: saving, onClick: cancelEdit }, t("cancel")),
					saveError !== null ? react.createElement("span", { className: pcss.error, role: "alert" }, errorMessage(t, saveError)) : null));

			const rowClass = (isActive) => saving
				? (isActive ? pcss.rowActiveDisabled : pcss.rowDisabled)
				: (isActive ? pcss.rowActive : pcss.row);

			const rows = personas.map((persona) => {
				const isActive = persona.id === activeId;
				// The row is a <label>, so the name and preview select it too; the
				// Edit/Delete buttons stop propagation so they do not also select.
				return react.createElement("label", {
					key: persona.id,
					className: rowClass(isActive),
				},
					react.createElement("input", {
						type: "radio",
						className: pcss.radio,
						name: "persona-override-active",
						checked: isActive,
						disabled: saving,
						onChange: () => void write("setActive", { personaId: persona.id }),
					}),
					react.createElement("div", { className: pcss.rowMain },
						react.createElement("div", { className: pcss.rowHead },
							react.createElement("span", { className: pcss.rowName }, displayName(t, persona)),
							isActive ? react.createElement("span", { className: pcss.badge }, t("inUse")) : null),
						react.createElement("span", { className: pcss.rowPreview }, previewOf(persona))),
					react.createElement("div", { className: pcss.rowActions },
						react.createElement(primitives.Button, {
							variant: "ghost", size: "sm", disabled: saving,
							onClick: (event) => {
								event.preventDefault();
								event.stopPropagation();
								startEdit(persona);
							},
						}, t("edit")),
						react.createElement(primitives.Button, {
							variant: "ghost", size: "sm", disabled: saving,
							onClick: (event) => {
								event.preventDefault();
								event.stopPropagation();
								setPendingRemove(persona);
							},
						}, t("remove"))));
			});

			// "None" belongs to the same radio group as the library rows, so the
			// group reads as one choice: use this persona, or use none at all.
			const noneRow = react.createElement("label", {
				className: rowClass(activeId === null),
			},
				react.createElement("input", {
					type: "radio",
					className: pcss.radio,
					name: "persona-override-active",
					checked: activeId === null,
					disabled: saving,
					onChange: () => void write("setActive", { personaId: null }),
				}),
				react.createElement("div", { className: pcss.rowMain },
					react.createElement("span", { className: pcss.rowName }, t("none"))));

			const confirmRemove = react.createElement(primitives.Modal, {
				open: pendingRemove !== null,
				onClose: () => setPendingRemove(null),
				title: t("removeTitle"),
				description: pendingRemove === null ? "" : displayName(t, pendingRemove),
				tone: "warning",
				closeLabel: t("cancel"),
				className: pcss.modal,
				footer: react.createElement(react.Fragment, null,
					react.createElement(primitives.Button, {
						variant: "outline", disabled: saving,
						onClick: () => setPendingRemove(null),
					}, t("cancel")),
					react.createElement(primitives.Button, {
						variant: "primary", disabled: saving,
						onClick: () => { if (pendingRemove !== null) void remove(pendingRemove); },
					}, t("remove"))),
			},
				react.createElement("div", { className: pcss.cardDesc }, t("removeDesc")));

			return react.createElement("div", { className: pcss.root },
				react.createElement("div", { className: pcss.card },
					react.createElement("div", { className: pcss.cardTitle }, t("title")),
					react.createElement("div", { className: pcss.cardDesc }, t("desc")),
					personas.length === 0
						? react.createElement("div", { className: pcss.empty }, t("empty"))
						: react.createElement("div", { className: pcss.list }, rows),
					personas.length === 0 ? null : noneRow,
					editing !== null
						? editor
						: react.createElement("div", { className: pcss.footer },
							react.createElement(primitives.Button, {
								variant: "primary", disabled: saving, onClick: startNew,
							}, t("newPersona")),
							savedFlash ? react.createElement("span", { className: pcss.saved, role: "status" }, t("saved")) : null,
							actionError !== null
								? react.createElement("span", { className: pcss.error, role: "alert" }, errorMessage(t, actionError))
								: null),
					overridden > 0
						? react.createElement("div", { className: pcss.state }, `${t("sessionCount")}: ${overridden}`)
						: null,
					react.createElement("div", { className: pcss.path }, `${t("path")}: ${path}`)),
				confirmRemove);
		}

		/**
		 * Header chip: shows which persona this conversation uses, and opens the
		 * picker that pins it to one library entry (or opts it out).
		 */
		function PersonaOverrideChip({ sessionId, t }) {
			const [open, setOpen] = react.useState(false);
			const [config, setConfig] = react.useState(null);
			const [saving, setSaving] = react.useState(false);
			const [savedFlash, setSavedFlash] = react.useState(false);
			const [error, setError] = react.useState(null);
			const flashTimer = react.useRef(0);

			react.useEffect(() => () => window.clearTimeout(flashTimer.current), []);

			const reload = react.useCallback(async () => {
				try {
					const value = await api("get");
					setConfig(value.config);
				} catch (reason) {
					setError(reason);
				}
			}, []);

			react.useEffect(() => {
				void reload();
			}, [reload]);

			/**
			 * Pin this conversation to one library entry, or clear the pin so it
			 * follows the active one again. Every choice writes immediately; the
			 * dialog is a picker, not a form, so there is nothing to cancel.
			 */
			const pick = react.useCallback(async (personaId) => {
				setSaving(true);
				setError(null);
				try {
					const value = personaId === undefined
						? await api("clearSession", { sessionId })
						: await api("setSession", { sessionId, personaId });
					setConfig(value.config);
					setSavedFlash(true);
					window.clearTimeout(flashTimer.current);
					flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1600);
				} catch (reason) {
					setError(reason);
				} finally {
					setSaving(false);
				}
			}, [sessionId]);

			const personas = config?.personas ?? [];
			const entry = config?.sessions?.[sessionId];
			const pinned = entry === undefined ? undefined : entry.personaId;
			const pinnedPersona = pinned == null ? undefined : personas.find((persona) => persona.id === pinned);
			const activePersona = config?.activeId == null
				? undefined
				: personas.find((persona) => persona.id === config.activeId);

			const label = entry === undefined
				? t("sessionFollow")
				: pinnedPersona !== undefined
					? displayName(t, pinnedPersona)
					: t("sessionOff");
			// Accent means "this conversation runs a persona of its own". An
			// explicit opt-out is deliberate but is not an override, so it stays
			// in the neutral chip while its label says what it does.
			const active = pinnedPersona !== undefined;

			const option = (key, checked, text, onSelect) => react.createElement("label", {
				key,
				className: checked ? pcss.rowActive : pcss.row,
				style: { cursor: "pointer" },
			},
				react.createElement("input", {
					type: "radio",
					className: pcss.radio,
					name: "persona-override-session",
					checked,
					disabled: saving,
					onChange: onSelect,
				}),
				react.createElement("div", { className: pcss.rowMain },
					react.createElement("span", { className: pcss.rowName }, text)));

			return react.createElement(react.Fragment, null,
				react.createElement("button", {
					type: "button",
					className: active ? pcss.chipOn : pcss.chip,
					title: t("sessionNav"),
					onClick: () => setOpen(true),
				},
					react.createElement("span", { className: pcss.dot }),
					react.createElement("span", { className: pcss.chipText }, label)),
				react.createElement(primitives.Modal, {
					open,
					onClose: () => setOpen(false),
					title: t("sessionTitle"),
					description: t("sessionDesc"),
					closeLabel: t("done"),
					className: pcss.modal,
					contentClassName: pcss.modalBody,
					footer: react.createElement(primitives.Button, {
						variant: "outline",
						onClick: () => setOpen(false),
					}, t("done")),
				},
					react.createElement("div", { className: pcss.list },
						option("follow", entry === undefined, activePersona === undefined
							? t("sessionFollow")
							: `${t("sessionFollow")} · ${displayName(t, activePersona)}`,
						() => void pick(undefined)),
						personas.map((persona) => option(
							persona.id,
							pinned === persona.id,
							displayName(t, persona),
							() => void pick(persona.id))),
						// With no library there is nothing to opt out of: "follow"
						// and "off" would be the same state.
						personas.length === 0
							? null
							: option("off", entry !== undefined && pinned === null, t("sessionOff"),
								() => void pick(null))),
					savedFlash ? react.createElement("div", { className: pcss.saved }, t("sessionSaved")) : null,
					error !== null ? react.createElement("div", { className: pcss.error }, errorMessage(t, error)) : null));
		}

		/** Register the settings section and the per-conversation header chip. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "persona-override: dictionaries");
			const t = ctx.locale.bind(NS);

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "persona-override",
				order: 215,
				label: () => t("nav"),
				locale: NS,
			}, PersonaOverrideSection));

			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "persona-override",
				order: -5,
				locale: NS,
			}, PersonaOverrideChip));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
