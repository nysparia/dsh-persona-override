# 开发记录：dsh-persona-override

这份文件记录这个插件从 0.1.0 到 0.4.0 的经过、踩过的坑，以及还没做的事。
面向的是下一个接手的人（包括未来的我），不是用户。用户文档在 `README.md`。

---

## 一、这个插件解决什么

DSH 没有「人设」这个设置项。人设是 **agent preset 的一个子行**：

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: You are a coding agent powered by the {{model}} model.
```

四个内置 preset（`standard`、`ptc`、`minimal`、`cordis`）都挂了这一行，而
`PresetDefinition` 没有继承机制——`plugins` 必须是完整列表。所以想改人设，正常做法是
声明一整个 preset，也就是改 profile。

这个插件绕开了那条路：在 `agent/created` 时通过 `agent.ctx` 注册同名 section，
落在和 preset 的 `persona` 行**同一个 scope**，0.2.3 对同 scope 重复注册按「后注册者胜」
解析，于是我们的覆盖掉它。

---

## 二、版本演进

| 版本 | 提交 | 做了什么 |
|---|---|---|
| 0.1.0 | `08f7272` | 单人设 + 每会话覆盖。自建 JSON 存储。 |
| 0.2.0 | `92efc1e` | 改成命名人设库（用户要求「同一个人设库，随时挑一个用」）。 |
| 0.2.1 | `86810e2` | 修 backfill 竞态。 |
| 0.3.0 | `ce02e1f` | 按官方文档改掉三处违规：去掉 primitives 依赖、改用 storageDomain、换掉不存在的 token。 |
| 0.3.1 | `244b491` | 修两个加载失败：schemastery 导入、webServer 硬依赖。 |
| 0.4.0 | `ef193e4` | 会话标题栏显示当前人设；补 locale 元数据和图标。 |

---

## 三、踩过的坑（按发现顺序）

### 1. `--dsw-accent-strong` 这个 token 根本不存在

0.1.0 就写进去了，一直没报错——CSS 变量不存在时浏览器静默忽略，只是样式不生效。
0.3.0 才发现。教训：**CSS 变量名写错不会报错**，必须对着 `cordis_inspect` 的
`Theme.listTokens` 或 `design-platform.css` 逐个核对。

### 2. backfill 在配置落地之前就跑完了

`apply()` 里的 backfill 是同步执行的，而配置读取是异步的。重载插件时，backfill
在配置读进来之前就遍历了所有已存在的 agent，每个都按空配置解析，结果**一个 section
都没注册**。新会话正常，老会话静默失效。

修法：backfill 等 `loaded` 再执行。

这个 bug 只在**重载**时出现，首次启动反而正常（因为首次启动时还没有 agent）。
所以「装完能用」不等于「重载后能用」。

### 3. `@deepseek-ai/schemastery` 让插件在干净 profile 里加载失败

插件声明了一个空 `Config` schema，却从不读任何配置值。但这个 import 让插件在
peer 未安装时整个加载失败——**本地目录安装不解析 peer**，`apply` 还没跑就
`ERR_MODULE_NOT_FOUND`。

主 profile 里恰好装了 schemastery，所以看不出来。换一个干净 profile 立刻暴露。

修法：删掉空 `Config`，插件不需要配置。

### 4. `webServer` 是硬依赖，headless profile 里整个插件卡在 PENDING

`webServer` 只用来承载设置页的 HTTP 路由。但它在 `inject` 数组里，于是
headless / ACP / SDK 这类没有浏览器表面的 profile 里，插件永远等不到这个服务，
人设也就永远不生效。

修法：从 `inject` 移除，改用 `ctx.inject(["webServer"], ...)` 可选注册路由。
提示词路径无条件执行。

**这两个 bug（3 和 4）都只有换一个干净 profile 才能发现。** 主 profile 恰好
装了 schemastery、恰好有 webServer，两个条件都满足，所以一切正常。

### 5. `createPortal` 漏了第二个参数

```js
// 错
reactDom.createPortal(element)
// 对
reactDom.createPortal(element, document.body)
```

React 报 `Minified React error #200`，整个 `conversation.session.header.actions`
slot 变空白。点开人设选择器就崩。

`verification.md` 明确要求「console shows no slot entry crash」，我一开始没查
console，直接截图，看到 chip 消失还以为是别的原因。

### 6. 显式「关闭」回退到了默认人设

chip 用 `pinnedPersona ?? activePersona` 推导当前生效的人设。但显式关闭时
`pinnedPersona` 是 `undefined`，于是回退到 `activePersona`，显示了一个
**宿主实际没有应用**的人设名。

修法：显式条目优先，包括「关闭」。

这个 bug 的教训是：**UI 的推导逻辑必须和宿主的解析逻辑一一对应**。宿主的
`resolveFor` 是「显式条目决定一切，包括 off」，UI 却写成了 `??` 回退。

### 7. 官方文档禁止的是「加载 Harness Client 包」，不是 React

`practices.md:33`：

> Do not `require('@deepseek-ai/dsh-client-ui-primitives')` or load any other
> Harness Client package as a module

我一度以为连 React 也不能用。核实后：`react` 和 `react-dom` 都在
`packages/client/web/src/platform.ts` 的 `PLATFORM_MODULES` 里，是官方支持的
平台模块。官方模板 `templates/decoration/client.js` 第一行就是
`const React = require('react')`。

区别：

| 包 | 允许 | 原因 |
|---|---|---|
| `react` / `react-dom` | ✅ | 平台模块，版本由宿主保证 |
| `@deepseek-ai/dsh-client-ui-primitives` | ❌ | 内部包，随时会变，抛错会让 slot 变空白 |
| `@deepseek-ai/dsh-client-ui-slots` | ✅ 仅 `dsh.client.inject` | 只用于排序激活，不能 `require` |

---

## 四、验证方法（有效的那些）

### 换一个干净 profile 是最有效的验证手段

主 profile 装了 20 多个插件，很多问题被掩盖。用 `--from-default-profile` 建一个
只装本插件的 profile，能立刻暴露：

- peer 依赖缺失
- 可选服务缺失
- 加载顺序问题

```bash
DSH_HOME=/tmp/pov-home node lib/bin.js --profile povtest --from-default-profile web --dump-config
DSH_HOME=/tmp/pov-home node lib/bin.js plugin --profile povtest add <插件目录>
DSH_HOME=/tmp/pov-home node lib/bin.js --profile povtest --port 3102 --no-open
```

注意：`pnpm` 的 store 在 `~/.local/share/pnpm/store`，沙箱里需要 `danger-full-access`。

### 验证人设真的生效：解压 session log

插件路由被宿主鉴权挡住（签名 cookie，curl 伪造不了），但 session log 里记录了
实际发出的系统提示词：

```bash
zstd -dc ~/.dsh/sessions/<workspace>/<session>/session.v4.jsonl.zstd \
  | grep -o '"type":"system/message"'
```

找到 `system/message` 事件，看里面是不是人设正文。这是**唯一能证明「真的替换了」
的方法**，比看 UI 可靠。

### 用 agent-browser 截图

```bash
agent-browser open "http://127.0.0.1:3102/?token=<token>"
agent-browser snapshot -i          # 拿 @eN 引用
agent-browser click @eN
agent-browser screenshot /tmp/x.png
agent-browser console              # 查 slot crash
```

token 从启动日志里抓：`grep -oE 'token=[A-Za-z0-9_-]+' /tmp/boot.log`。

**第一次调用需要 `danger-full-access`**（要创建浏览器 socket 目录），之后守护进程
常驻，不需要再批准。

---

## 五、未做事项

### 1. UI/UX 专家评审（0.4.0 的改动没做）

`verification.md` 要求：

> Before delivering a new plugin or a change to its user experience, run one UI/UX
> expert review through a subagent

0.2.0 做过一次（那个 agent 跑了 25 分钟，最后是我催它才返回）。0.4.0 的改动
（chip 语义、摘要块、opt-out 修复）没做。

### 2. 深色主题截图

只验证了浅色。CSS 用的 10 个 token 都在明暗两套主题里有定义，但**没有实际看过
深色下的渲染**。

### 3. 中文界面截图

当前应用语言是 `en`，所有截图都是英文。中文文案（`locale/zh.json` 和
`zh` 字典）没在真实界面里看过。虽然 44/44 键对齐，但排版长度没验证。

### 4. 旧配置文件没删

`~/.dsh/persona-override/config.json`（0.1.x/0.2.x 的旧格式）还在，已失效。
0.3.0 的 changelog 说不迁移，但也没删。可以安全删除。

### 5. `meta.detail` 特性图

`plugin-details.md` 说这是可选的。当前只有 `meta.title` / `meta.description`，
Plugins 页会回退到 README。没做特性图。

### 6. 没有自动化测试文件

测试脚本在 `/tmp/pov-test/`（`domain.mjs`、`race.mjs`、`probe.mjs`），
**没有进仓库**。每次改完都是手工复制插件目录再跑。

应该把 `domain.mjs` 收进仓库的 `tests/`，加个 `npm test`。

### 7. 人设库上限 50 条，没有 UI 提示

写满 50 条后，点「新建人设」会失败并显示「人设数量已达上限」，但**按钮不会提前
禁用**，用户是撞墙才知道的。

---

## 六、如果继续做，建议的顺序

1. **把测试收进仓库**（未做事项 6）——这是唯一能防止回归的东西，成本最低。
2. **深色主题 + 中文界面截图**（2、3）——纯验证，不改代码。
3. **UI/UX 评审**（1）——按文档要求补。
4. **删旧配置文件**（4）——一句话的事，但需要用户确认。
5. 特性图（5）、上限提示（7）——锦上添花。

---

## 七、几条硬性约束（别再踩）

- 插件**不能** `require` 任何 `@deepseek-ai/dsh-client-*` 包。要控件就自己抄
  primitives 的 markup、CSS、行为，类名换成自己的前缀。
- 主题 token 只能用 `cordis_inspect` `Theme.listTokens` 列出的那些。
- 插件配置走 `ctx.storageDomain`，不要自己写 JSON 文件。
- `inject` 里只放**真正必需**的服务。可选服务用 `ctx.inject([...], ...)`。
- 不要声明空的 `Config` schema——它会让插件多一个 peer 依赖。
- `createPortal` 必须传第二个参数。
- UI 的推导逻辑必须和宿主 `resolveFor` 的语义逐条对应。
