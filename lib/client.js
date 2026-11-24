window.__ModuleLoader__.load({
	id: "dsh-persona-override",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let reactDom = require("react-dom");

		//#region css
		// Only --dsw-alias-* theme tokens, all listed by cordis_inspect Theme.
		// Controls are local copies of the host primitives' markup and behavior,
		// per the plugin practices: a Harness Client package is never required.
		const css = [
			".pOv_root{flex-direction:column;gap:14px;display:flex}",
			".pOv_card{box-sizing:border-box;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex}",
			".pOv_cardTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px}",
			".pOv_cardDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_textarea{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;line-height:20px;resize:vertical}",
			".pOv_textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}",
			".pOv_footer{box-sizing:border-box;align-items:center;gap:10px;min-height:28px;display:flex;flex-wrap:wrap}",
			".pOv_saved{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".pOv_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}",
			".pOv_loading{color:var(--dsw-alias-label-tertiary);padding:12px 0;font-size:13px;line-height:18px}",
			".pOv_path{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:16px;word-break:break-all}",
			".pOv_count{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}",
			".pOv_state{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}",
			".pOv_list{flex-direction:column;gap:6px;display:flex}",
			".pOv_row{box-sizing:border-box;cursor:pointer;align-items:flex-start;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:9px 11px;display:flex}",
			".pOv_rowActive{border-color:var(--dsw-alias-brand-primary)}",
			".pOv_rowDisabled{cursor:default;opacity:.55}",
			".pOv_radio{cursor:pointer;accent-color:var(--dsw-alias-brand-primary);width:14px;height:14px;flex:none;margin-top:3px}",
			".pOv_rowMain{flex-direction:column;gap:3px;flex:1;min-width:0;display:flex}",
			".pOv_rowHead{align-items:center;gap:8px;display:flex;flex-wrap:wrap}",
			".pOv_rowName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_rowPreview{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_rowActions{align-items:center;gap:4px;flex:none;display:flex}",
			".pOv_badge{color:var(--dsw-alias-brand-primary);border:1px solid var(--dsw-alias-brand-primary);border-radius:999px;padding:0 7px;font-size:10px;line-height:16px;flex:none}",
			".pOv_empty{color:var(--dsw-alias-label-tertiary);border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:16px;font-size:12px;line-height:18px;text-align:center}",
			".pOv_field{flex-direction:column;gap:5px;display:flex}",
			".pOv_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}",
			".pOv_editor{flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px;display:flex}",
			".pOv_chip{cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;align-items:center;gap:5px;padding:2px 9px;font-family:inherit;font-size:11px;line-height:17px;display:inline-flex;max-width:220px}",
			".pOv_chip:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
			".pOv_chipOn{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}",
			".pOv_chipText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_dot{background:currentColor;border-radius:50%;width:5px;height:5px;flex:none}",
			".pOv_summary{box-sizing:border-box;flex-direction:column;gap:4px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex}",
			".pOv_summaryHead{align-items:center;justify-content:space-between;gap:8px;display:flex}",
			".pOv_summaryLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:.04em}",
			".pOv_summarySource{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;flex:none}",
			".pOv_summaryName{color:var(--dsw-alias-label-primary);font-size:14px;line-height:20px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".pOv_summaryNone{color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:20px;font-style:italic}",
			".pOv_summaryPreview{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// -- local Button (copy of the host primitive's markup and states) --
			".pOv_btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);background:transparent;padding:0 14px;height:36px}",
			".pOv_btn:disabled{cursor:not-allowed;opacity:.4}",
			".pOv_btnSm{height:28px;font-size:12px;line-height:18px;padding:0 10px;border-radius:6px}",
			".pOv_btnPrimary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}",
			".pOv_btnGhost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}",
			".pOv_btnOutline{border:.5px solid transparent;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2)}",
			".pOv_btnOutline:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}",
			// -- local Input --
			".pOv_inputWrap{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);box-sizing:border-box;width:100%}",
			".pOv_inputWrap:focus-within{border-color:var(--dsw-alias-brand-primary)}",
			".pOv_input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}",
			".pOv_input::placeholder{color:var(--dsw-alias-label-tertiary)}",
			// -- local Modal (copy of the host primitive's structure and behavior) --
			".pOv_modalRoot{pointer-events:auto;position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}",
			".pOv_modalMask{position:absolute;inset:0;background:var(--dsw-alias-bg-overlay);opacity:.6}",
			".pOv_modalDialog{box-sizing:border-box;position:relative;z-index:1;display:flex;flex-direction:column;gap:20px;width:min(380px,100%);max-height:100%;padding:0 0 24px;overflow:hidden;border:0;border-radius:12px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 12px 32px rgba(0,0,0,.24)}",
			".pOv_modalDialog:focus{outline:none}",
			".pOv_modalContent{display:flex;flex-direction:column;width:100%;min-height:0;overflow-y:auto}",
			".pOv_modalHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:22px 24px 12px}",
			".pOv_modalTitle{margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}",
			".pOv_modalClose{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;border-radius:6px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}",
			".pOv_modalClose:hover{background:var(--dsw-alias-bg-layer-1)}",
			".pOv_modalDesc{margin:0;padding:0 24px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}",
			".pOv_modalBody{display:flex;flex-direction:column;min-width:0;margin-top:20px;padding:0 24px}",
			".pOv_modalHeader+.pOv_modalBody{margin-top:8px}",
			".pOv_modalFooter{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 24px}",
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
			summary: "pOv_summary",
			summaryHead: "pOv_summaryHead",
			summaryLabel: "pOv_summaryLabel",
			summarySource: "pOv_summarySource",
			summaryName: "pOv_summaryName",
			summaryNone: "pOv_summaryNone",
			summaryPreview: "pOv_summaryPreview",
			btnPrimary: "pOv_btn pOv_btnPrimary",
			btnGhost: "pOv_btn pOv_btnGhost",
			btnOutline: "pOv_btn pOv_btnOutline",
			btnSmGhost: "pOv_btn pOv_btnSm pOv_btnGhost",
			btnSmOutline: "pOv_btn pOv_btnSm pOv_btnOutline",
			inputWrap: "pOv_inputWrap",
			input: "pOv_input",
			modalRoot: "pOv_modalRoot",
			modalMask: "pOv_modalMask",
			modalDialog: "pOv_modalDialog",
			modalContent: "pOv_modalContent",
			modalHeader: "pOv_modalHeader",
			modalTitle: "pOv_modalTitle",
			modalClose: "pOv_modalClose",
			modalDesc: "pOv_modalDesc",
			modalBody: "pOv_modalBody",
			modalFooter: "pOv_modalFooter",
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
			close: "关闭",
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
			sessionNone: "未使用人设",
			currentLabel: "当前人设",
			sourceDefault: "来自默认",
			sourcePinned: "本会话指定",
			sourceOff: "已关闭",
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
			close: "Close",
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
			sessionNone: "No persona",
			currentLabel: "Current persona",
			sourceDefault: "From the default",
			sourcePinned: "Set for this conversation",
			sourceOff: "Turned off",
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

		//#region local controls
		/** Local Button: the host primitive's variants, without importing it. */
		function Button({ variant = "ghost", size = "md", disabled, onClick, children }) {
			const cls = size === "sm"
				? (variant === "outline" ? pcss.btnSmOutline : pcss.btnSmGhost)
				: (variant === "primary" ? pcss.btnPrimary : variant === "outline" ? pcss.btnOutline : pcss.btnGhost);
			return react.createElement("button", {
				type: "button",
				className: cls,
				disabled: disabled === true,
				onClick,
			}, children);
		}

		/** Local Input: the host primitive's wrapper and focus ring. */
		function Input({ value, placeholder, maxLength, onChange }) {
			return react.createElement("span", { className: pcss.inputWrap },
				react.createElement("input", {
					className: pcss.input,
					value,
					placeholder,
					maxLength,
					onChange,
				}));
		}

		const FOCUSABLE = "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex=\"0\"]";

		/**
		 * Local Modal: the host primitive's structure, portal, Escape handling,
		 * focus entry and return, and Tab trap. Portaled to document.body so the
		 * header's clipped cluster cannot cut it off.
		 */
		function Modal({ open, onClose, title, description, closeLabel, footer, children }) {
			const dialog = react.useRef(null);
			const closeRef = react.useRef(onClose);
			const restoreRef = react.useRef(undefined);
			closeRef.current = onClose;

			react.useLayoutEffect(() => {
				if (!open) {
					const target = restoreRef.current;
					restoreRef.current = undefined;
					const element = dialog.current;
					if (element !== null && element.contains(element.ownerDocument.activeElement)
						&& target !== undefined && target.isConnected) {
						target.focus({ preventScroll: true });
					}
					return;
				}
				const element = dialog.current;
				if (element === null) return;
				const document = element.ownerDocument;
				const previous = document.activeElement;
				const initial = element.querySelector("[data-modal-autofocus]")
					?? element.querySelector(FOCUSABLE) ?? element;
				if (!element.contains(document.activeElement)) initial.focus({ preventScroll: true });

				const keydown = (event) => {
					if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
					if (event.key === "Escape" && !event.shiftKey) {
						event.preventDefault();
						if (!event.repeat) closeRef.current();
						return;
					}
					if (event.key !== "Tab") return;
					const items = [...element.querySelectorAll(FOCUSABLE)]
						.filter((item) => !item.closest("[inert], [hidden]"));
					const first = items[0] ?? element;
					const last = items.at(-1) ?? element;
					const atEdge = event.shiftKey ? document.activeElement === first : document.activeElement === last;
					if (document.activeElement === element || !element.contains(document.activeElement) || atEdge) {
						event.preventDefault();
						(event.shiftKey ? last : first).focus();
					}
				};
				document.addEventListener("keydown", keydown);
				return () => {
					document.removeEventListener("keydown", keydown);
					if (previous instanceof HTMLElement && previous.isConnected) {
						restoreRef.current = previous;
					}
				};
			}, [open]);

			if (!open) return null;

			return reactDom.createPortal(react.createElement("div", { className: pcss.modalRoot, role: "presentation" },
				react.createElement("div", {
					className: pcss.modalMask,
					"aria-hidden": "true",
					onClick: onClose,
				}),
				react.createElement("div", {
					ref: dialog,
					tabIndex: -1,
					className: pcss.modalDialog,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": title,
				},
					react.createElement("div", { className: pcss.modalContent },
						react.createElement("div", { className: pcss.modalHeader },
							react.createElement("h2", { className: pcss.modalTitle }, title),
							react.createElement("button", {
								type: "button",
								className: pcss.modalClose,
								"aria-label": closeLabel,
								onClick: onClose,
							}, react.createElement("svg", {
								width: 14, height: 14, viewBox: "0 0 16 16", fill: "none",
								stroke: "currentColor", strokeWidth: 1, "aria-hidden": "true",
							},
								react.createElement("path", { d: "M2.5 2.5L13.5 13.5" }),
								react.createElement("path", { d: "M13.5 2.5L2.5 13.5" })))),
						description !== undefined && description !== ""
							? react.createElement("p", { className: pcss.modalDesc }, description)
							: null,
						children !== undefined
							? react.createElement("div", { className: pcss.modalBody }, children)
							: null),
					footer !== undefined
						? react.createElement("div", { className: pcss.modalFooter }, footer)
						: null)), document.body);
		}
		//#endregion

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
			}, [editing, draftName, draftText, write, t]);

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
					react.createElement(Input, {
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
					react.createElement(Button, { variant: "primary", disabled: saving, onClick: commitEdit }, t("save")),
					react.createElement(Button, { variant: "ghost", disabled: saving, onClick: cancelEdit }, t("cancel")),
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
						react.createElement(Button, {
							variant: "ghost", size: "sm", disabled: saving,
							onClick: (event) => {
								event.preventDefault();
								event.stopPropagation();
								startEdit(persona);
							},
						}, t("edit")),
						react.createElement(Button, {
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

			const confirmRemove = react.createElement(Modal, {
				open: pendingRemove !== null,
				onClose: () => setPendingRemove(null),
				title: t("removeTitle"),
				description: pendingRemove === null ? "" : displayName(t, pendingRemove),
				closeLabel: t("close"),
				footer: react.createElement(react.Fragment, null,
					react.createElement(Button, {
						variant: "outline", disabled: saving,
						onClick: () => setPendingRemove(null),
					}, t("cancel")),
					react.createElement(Button, {
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
							react.createElement(Button, {
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

			// The chip names the persona this conversation actually runs, not the
			// mechanism that selected it: "which persona am I talking to" is the
			// question a reader has, and "following the default" answers a
			// different one. The source is a second, quieter line in the picker.
			// An explicit per-session entry decides, including "off": falling back
			// to the active persona here would show a persona the host is not
			// applying. Only an absent entry follows the default.
			const effective = entry === undefined
				? activePersona
				: pinnedPersona;
			const label = effective !== undefined
				? displayName(t, effective)
				: t("sessionNone");
			// Accent means a persona is in force. An explicit opt-out is
			// deliberate but runs nothing, so it stays neutral.
			const active = effective !== undefined;
			const source = entry === undefined
				? t("sourceDefault")
				: pinnedPersona !== undefined
					? t("sourcePinned")
					: t("sourceOff");

			const option = (key, checked, text, onSelect) => react.createElement("label", {
				key,
				className: checked ? pcss.rowActive : pcss.row,
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

			// The picker opens on a summary of what is in force, so the reader can
			// confirm the current persona before changing it.
			const summary = react.createElement("div", { className: pcss.summary },
				react.createElement("div", { className: pcss.summaryHead },
					react.createElement("span", { className: pcss.summaryLabel }, t("currentLabel")),
					react.createElement("span", { className: pcss.summarySource }, source)),
				react.createElement("div", { className: effective === undefined ? pcss.summaryNone : pcss.summaryName },
					effective === undefined ? t("sessionNone") : displayName(t, effective)),
				effective === undefined
					? null
					: react.createElement("div", { className: pcss.summaryPreview }, previewOf(effective)));

			return react.createElement(react.Fragment, null,
				react.createElement("button", {
					type: "button",
					className: active ? pcss.chipOn : pcss.chip,
					title: `${t("sessionNav")} · ${label}`,
					onClick: () => setOpen(true),
				},
					react.createElement("span", { className: pcss.dot }),
					react.createElement("span", { className: pcss.chipText }, label)),
				react.createElement(Modal, {
					open,
					onClose: () => setOpen(false),
					title: t("sessionTitle"),
					description: t("sessionDesc"),
					closeLabel: t("done"),
					footer: react.createElement(Button, {
						variant: "outline",
						onClick: () => setOpen(false),
					}, t("done")),
				},
					summary,
					react.createElement("div", { className: pcss.list },
						option("follow", entry === undefined, t("sessionFollow"),
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
					savedFlash ? react.createElement("div", { className: pcss.saved, role: "status" }, t("sessionSaved")) : null,
					error !== null ? react.createElement("div", { className: pcss.error, role: "alert" }, errorMessage(t, error)) : null));
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
