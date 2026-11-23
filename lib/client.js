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
			".pOv_card{box-sizing:border-box;flex-direction:column;gap:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex}",
			".pOv_cardTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px}",
			".pOv_cardDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_textarea{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;line-height:20px;resize:vertical}",
			".pOv_textarea:focus{outline:none;border-color:var(--dsw-accent-strong)}",
			".pOv_footer{box-sizing:border-box;align-items:center;gap:10px;min-height:28px;display:flex;flex-wrap:wrap}",
			".pOv_saved{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}",
			".pOv_loading{color:var(--dsw-alias-label-tertiary);padding:12px 0;font-size:13px;line-height:18px}",
			".pOv_toggleRow{box-sizing:border-box;cursor:pointer;align-items:center;gap:10px;padding:4px 0;display:flex}",
			".pOv_toggleRow input{cursor:pointer;accent-color:var(--dsw-accent-strong);width:14px;height:14px;flex:none}",
			".pOv_toggleText{flex-direction:column;min-width:0;display:flex}",
			".pOv_toggleLabel{color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px}",
			".pOv_toggleDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px}",
			".pOv_path{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:16px;word-break:break-all}",
			".pOv_count{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}",
			".pOv_state{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}",
			".pOv_chip{cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;align-items:center;gap:5px;padding:2px 9px;font-family:inherit;font-size:11px;line-height:17px;display:inline-flex}",
			".pOv_chip:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}",
			".pOv_chipOn{border-color:var(--dsw-accent-strong);color:var(--dsw-accent-strong)}",
			".pOv_dot{background:currentColor;border-radius:50%;width:5px;height:5px;flex:none}",
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
			toggleRow: "pOv_toggleRow",
			toggleText: "pOv_toggleText",
			toggleLabel: "pOv_toggleLabel",
			toggleDesc: "pOv_toggleDesc",
			path: "pOv_path",
			count: "pOv_count",
			state: "pOv_state",
			chip: "pOv_chip",
			chipOn: "pOv_chip pOv_chipOn",
			dot: "pOv_dot",
		};
		//#endregion

		//#region locale
		const zh = {
			nav: "人设",
			loading: "加载中…",
			loadFailed: "加载失败",
			title: "默认人设",
			desc: "替换当前预设声明的 deployment persona，对所有会话生效。单个会话可在标题栏单独覆盖。",
			placeholder: "例如：你是一位苏格拉底式的导师。不要直接给出答案，一次只问一个问题，让学习者自己得出结论。",
			enabled: "启用默认人设",
			enabledDesc: "开启后，下面这段文字会替换掉预设自带的人设。",
			save: "保存",
			saved: "已保存",
			path: "配置文件",
			chars: "字",
			// per-session
			sessionNav: "本会话人设",
			sessionTitle: "本会话人设",
			sessionDesc: "只覆盖当前这个会话。留空并关闭则跟随默认人设。",
			sessionPlaceholder: "只对这个会话生效的人设正文…",
			sessionEnabled: "为本会话单独设置",
			sessionEnabledDesc: "开启后，本会话使用下面的文字，不再跟随默认人设。",
			sessionInherit: "跟随默认",
			sessionOverride: "已覆盖",
			sessionClear: "恢复跟随默认",
			sessionSaved: "已保存",
			sessionNoSession: "没有打开的会话",
			errorForbidden: "无权访问此功能",
			errorTimeout: "请求超时，请重试",
			errorInternal: "服务内部错误，请稍后重试",
			errorTooMany: "会话覆盖数量已达上限",
		};
		const en = {
			nav: "Persona",
			loading: "Loading…",
			loadFailed: "Failed to load",
			title: "Default persona",
			desc: "Replaces the deployment persona the active preset declares, for every session. A single conversation can override it from the header.",
			placeholder: "e.g. You are a Socratic tutor. Never hand over the answer; ask one question at a time and let the learner reach it.",
			enabled: "Enable the default persona",
			enabledDesc: "When on, the text below replaces the preset's own persona.",
			save: "Save",
			saved: "Saved",
			path: "Config file",
			chars: "chars",
			sessionNav: "This conversation",
			sessionTitle: "This conversation's persona",
			sessionDesc: "Overrides only the current conversation. Empty and off follows the default.",
			sessionPlaceholder: "Persona text for this conversation only…",
			sessionEnabled: "Set one for this conversation",
			sessionEnabledDesc: "When on, this conversation uses the text below instead of the default.",
			sessionInherit: "Following default",
			sessionOverride: "Overridden",
			sessionClear: "Follow the default again",
			sessionSaved: "Saved",
			sessionNoSession: "No conversation is open",
			errorForbidden: "Access to this feature is forbidden",
			errorTimeout: "Request timed out — please try again",
			errorInternal: "Internal error — please try again later",
			errorTooMany: "Too many conversation overrides",
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
		};
		function errorMessage(t, reason) {
			const code = reason && reason.code;
			if (typeof code === "string" && Object.hasOwn(ERROR_KEYS, code)) return t(ERROR_KEYS[code]);
			return reason instanceof Error ? reason.message : String(reason);
		}

		/** Shared textarea + counter + save row, used by both surfaces. */
		function Editor({ t, value, onChange, onSave, saving, saved, error, rows }) {
			return react.createElement(react.Fragment, null,
				react.createElement("textarea", {
					className: pcss.textarea,
					rows: rows ?? 10,
					value,
					placeholder: t("placeholder"),
					onChange: (event) => onChange(event.target.value),
				}),
				react.createElement("div", { className: pcss.count }, `${value.length} ${t("chars")}`),
				react.createElement("div", { className: pcss.footer },
					react.createElement(primitives.Button, { variant: "outline", disabled: saving, onClick: onSave }, t("save")),
					saved ? react.createElement("span", { className: pcss.saved }, t("saved")) : null,
					error !== null ? react.createElement("span", { className: pcss.error }, error) : null));
		}

		/**
		 * Settings section: the machine-wide default persona.
		 */
		function PersonaOverrideSection({ t }) {
			const [config, setConfig] = react.useState(null);
			const [path, setPath] = react.useState("");
			const [draft, setDraft] = react.useState("");
			const [enabled, setEnabled] = react.useState(false);
			const [loadError, setLoadError] = react.useState(null);
			const [saveError, setSaveError] = react.useState(null);
			const [saving, setSaving] = react.useState(false);
			const [savedFlash, setSavedFlash] = react.useState(false);

			react.useEffect(() => {
				let cancelled = false;
				api("get")
					.then((value) => {
						if (cancelled) return;
						setConfig(value.config);
						setPath(value.path);
						setDraft(value.config.defaultPersona);
						setEnabled(value.config.enabled);
					})
					.catch((reason) => {
						if (!cancelled) setLoadError(reason);
					});
				return () => {
					cancelled = true;
				};
			}, []);

			const save = react.useCallback(async () => {
				setSaving(true);
				setSaveError(null);
				try {
					const value = await api("saveDefault", { enabled, persona: draft });
					setConfig(value.config);
					setDraft(value.config.defaultPersona);
					setEnabled(value.config.enabled);
					setSavedFlash(true);
					window.setTimeout(() => setSavedFlash(false), 1600);
				} catch (reason) {
					setSaveError(reason);
				} finally {
					setSaving(false);
				}
			}, [enabled, draft]);

			if (loadError !== null) {
				return react.createElement("div", { className: pcss.root },
					react.createElement("div", { className: pcss.error }, `${t("loadFailed")}: ${errorMessage(t, loadError)}`));
			}
			if (config === null) {
				return react.createElement("div", { className: pcss.root },
					react.createElement("div", { className: pcss.loading }, t("loading")));
			}

			const overridden = Object.keys(config.sessions ?? {}).filter((id) => config.sessions[id]?.enabled).length;

			return react.createElement("div", { className: pcss.root },
				react.createElement("div", { className: pcss.card },
					react.createElement("div", { className: pcss.cardTitle }, t("title")),
					react.createElement("div", { className: pcss.cardDesc }, t("desc")),
					react.createElement("label", { className: pcss.toggleRow },
						react.createElement("input", {
							type: "checkbox",
							checked: enabled,
							onChange: (event) => setEnabled(event.target.checked),
						}),
						react.createElement("span", { className: pcss.toggleText },
							react.createElement("span", { className: pcss.toggleLabel }, t("enabled")),
							react.createElement("span", { className: pcss.toggleDesc }, t("enabledDesc")))),
					react.createElement(Editor, {
						t, value: draft, onChange: setDraft, onSave: save,
						saving, saved: savedFlash,
						error: saveError !== null ? errorMessage(t, saveError) : null,
					}),
					overridden > 0
						? react.createElement("div", { className: pcss.state }, `${t("sessionOverride")}: ${overridden}`)
						: null,
					react.createElement("div", { className: pcss.path }, `${t("path")}: ${path}`)));
		}

		/**
		 * Header chip: shows whether this conversation overrides the default, and
		 * opens the per-conversation editor.
		 */
		function PersonaOverrideChip({ sessionId, t }) {
			const [open, setOpen] = react.useState(false);
			const [config, setConfig] = react.useState(null);
			const [draft, setDraft] = react.useState("");
			const [enabled, setEnabled] = react.useState(false);
			const [saving, setSaving] = react.useState(false);
			const [savedFlash, setSavedFlash] = react.useState(false);
			const [error, setError] = react.useState(null);

			const reload = react.useCallback(async () => {
				try {
					const value = await api("get");
					setConfig(value.config);
					const entry = value.config.sessions?.[sessionId];
					setDraft(entry?.persona ?? "");
					setEnabled(entry?.enabled === true);
				} catch (reason) {
					setError(reason);
				}
			}, [sessionId]);

			react.useEffect(() => {
				void reload();
			}, [reload]);

			const save = react.useCallback(async () => {
				setSaving(true);
				setError(null);
				try {
					const value = await api("setSession", { sessionId, enabled, persona: draft });
					setConfig(value.config);
					setSavedFlash(true);
					window.setTimeout(() => setSavedFlash(false), 1600);
				} catch (reason) {
					setError(reason);
				} finally {
					setSaving(false);
				}
			}, [sessionId, enabled, draft]);

			const clear = react.useCallback(async () => {
				setSaving(true);
				setError(null);
				try {
					const value = await api("clearSession", { sessionId });
					setConfig(value.config);
					setDraft("");
					setEnabled(false);
					setSavedFlash(true);
					window.setTimeout(() => setSavedFlash(false), 1600);
				} catch (reason) {
					setError(reason);
				} finally {
					setSaving(false);
				}
			}, [sessionId]);

			const entry = config?.sessions?.[sessionId];
			const active = entry?.enabled === true;
			const label = active ? t("sessionOverride") : t("sessionInherit");

			return react.createElement(react.Fragment, null,
				react.createElement("button", {
					type: "button",
					className: active ? pcss.chipOn : pcss.chip,
					title: t("sessionNav"),
					onClick: () => setOpen(true),
				},
					react.createElement("span", { className: pcss.dot }),
					react.createElement("span", null, label)),
				react.createElement(primitives.Modal, {
					open,
					onClose: () => setOpen(false),
					title: t("sessionTitle"),
					description: t("sessionDesc"),
					closeLabel: t("sessionClear"),
					footer: react.createElement(react.Fragment, null,
						react.createElement(primitives.Button, {
							variant: "outline",
							disabled: saving || entry === undefined,
							onClick: clear,
						}, t("sessionClear")),
						react.createElement(primitives.Button, {
							variant: "outline",
							disabled: saving,
							onClick: save,
						}, t("save"))),
				},
					react.createElement("label", { className: pcss.toggleRow },
						react.createElement("input", {
							type: "checkbox",
							checked: enabled,
							onChange: (event) => setEnabled(event.target.checked),
						}),
						react.createElement("span", { className: pcss.toggleText },
							react.createElement("span", { className: pcss.toggleLabel }, t("sessionEnabled")),
							react.createElement("span", { className: pcss.toggleDesc }, t("sessionEnabledDesc")))),
					react.createElement("textarea", {
						className: pcss.textarea,
						rows: 10,
						value: draft,
						placeholder: t("sessionPlaceholder"),
						onChange: (event) => setDraft(event.target.value),
					}),
					react.createElement("div", { className: pcss.count }, `${draft.length} ${t("chars")}`),
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
