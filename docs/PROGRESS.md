# FastViewer 开发进度

## 全览（批次索引 —— 状态唯一真相源）

| 批次 | 状态 | 子需求 | 备注 |
|---|---|---|---|
| 1 | ✅ | M4.1✅ M4.3✅ M4.2✅ | prd §M4 · 含整改 R1-R3 · 已归档 |
| 2 | ✅ | M1.1✅ M1.2✅ M1.4✅ M1.3✅ M1.5✅ | prd §M1 · 已归档 |
| 3 | ✅ | M2.1✅ M2.2✅ M2.3✅ M2.4✅ | prd §M2 · 已归档 · M2.1 验收改为左右分屏 |
| 4 | ✅ | M3.1✅ M3.2✅ M3.3✅ | prd §M3 · 已归档 |
| 5 | ✅ | M5.1✅ M5.2✅ | prd §M5 · 已归档 |
| 6 | ✅ | M1.1✅ M1.2✅ M1.6✅ M1.4✅ M1.5✅ | prd §M1 需求变更 · 已归档 |
| 7 | ✅ | M4.1✅ M1.5✅ M1.2✅ M1.3✅ M2.1✅ M2.3✅ M2.4✅ | prd §M1/§M2/§M4 布局与交互变更 · 已归档 |
| 8 | ✅ | M1.2✅ M2.1✅ M2.3✅ M2.4✅ | prd §M1/§M2 · 文件名浮层与控件重排 · 已归档 |
| 9 | ✅ | M1.2✅ M1.4✅ M4.2✅ M5.1✅ | prd §M1/§M4/§M5 · 快速访问/联动滚动/圆角主题 · 已归档 |
| 10 | ✅ | M1.2✅ M1.4✅ M4.2✅ | prd §M1/§M4 · 自绘下拉/暖色皮肤/自定义快速访问/文件夹图标/5px 高亮 · 已归档 |
| 11 | ✅ | M1.5✅ M5.3✅ | prd §M1/§M5 · 文件参数定位 + 安装包与文件关联 · 已归档 |
| 12 | ✅ | M5.4✅ | prd §M5 · 设置面板文件关联 · 已归档 |

## 批次 1 ✅（已归档）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M4 / spec §M4.1-M4.3 + 整改 R1-R3 |
| 依赖序 | R1 → R2 → R3 → M4.1 → M4.3 → M4.2 |
| R1 ✅ | spec 需求树补 M4.3→M1.1、M4.3→M3.1 |
| RED | —（文档整改，无测试红灯） |
| GREEN | `grep -n "M4.3 --> M1.1\|M4.3 --> M3.1" docs/spec.md` → `300: M4.3 --> M1.1` / `301: M4.3 --> M3.1` |
| 回写 | — |
| 待定 | — |
| R2 ✅ | spec §3.1 构建期 Node 24.22.1 → 24.15.0（本轮 `node -v` 实测） |
| RED | — |
| GREEN | `grep -n "构建期 Node 24.15.0" docs/spec.md` → `133:| @types/node | **26.6.5** | 构建期 Node 24.15.0（本机实测） |` |
| 回写 | — |
| 待定 | — |
| R3 ✅ | M4.1 全屏验收断言移交 M2.4；M4.2 查看器过渡断言移交 M2.1 |
| RED | — |
| GREEN | `grep -n "按 F 进入全屏后 CDP 断言\|transition-duration 为 160 ms" docs/spec.md` → 命中 M2.4:519（F 断言）与 M2.1:477（160 ms）；M4.1:321 与 M4.2 验收已无对应断言 |
| 回写 | — |
| 待定 | — |
| M4.1 ✅ | 自绘标题栏与窗口控制（含脚手架：package.json / tsconfig / scripts/build.ts / scripts/start.ts / electron-builder.yml / vitest 配置） |
| RED | `npx vitest run tests/window-state.test.ts` → `FAIL tests/window-state.test.ts` `Error: Cannot find module '../src/shared/window-state'` (2026-11-06) |
| GREEN | `npx vitest run tests/window-state.test.ts` → `tests/window-state.test.ts (8 tests) 5ms / Test Files 1 passed (1) / Tests 8 passed (8)`；`npx tsc --noEmit` 无输出；`npm run build` → main 5.3kb / preload 521b / shell 1.0kb；启动实测（FV_DEBUG_PORT=9341）CDP `{bar:true,h:46,region:"drag",api:["window","onWindowState","onTitle"],title:"FastViewer"}`；`inner 1152x688 / outer 1168x696`（仅 8px 原生边框、无系统标题栏）；拖拽 100px → `movedBy=99,0`；点最大化 → 主进程日志 `window maximize {"maximized":true,"fullscreen":false}` + `body.class=maximized` + 按钮 title=还原；再点 → `window unmaximize`；双击拖拽区 → `IsZoomed=True`；截图 `.acr/shots/m4.1-shell.png` (2026-11-06) |
| 回写 | 影响分析：窗口层被 M1/M2/M3/M5 依赖；回归可重跑 `tests/window-state.test.ts` + `npm run dev` |
| 待定 | — |
| M4.3 ✅ | 进程隔离与本地服务安全（HTTP 骨架 + token/cookie + Host/Origin + CSP/导航锁） |
| RED | `npx vitest run tests/server-auth.test.ts` → `FAIL tests/server-auth.test.ts` `Error: Cannot find module '../src/main/server'` (2026-11-06) |
| GREEN | `npx vitest run tests/server-auth.test.ts` → `tests/server-auth.test.ts (9 tests) 55ms / Tests 9 passed (9)`；`npx tsc --noEmit` 无输出；`npm run build` → preload/shell 594b、preload/guest 275b、shell 1.5kb、web/assets/app.js 132b；启动实测（FV_DEBUG=1 FV_DEBUG_PORT=9341）CDP 目标 `webview | FastViewer | http://127.0.0.1:<port>/?t=<token>` + `page | file:///.../dist/shell/index.html`；guest 内 `{require:"undefined",process:"undefined",host:"object",ready:"true"}`；`window.open('https://example.com')` → `"null"` 且目标数仍为 2；`location.href='https://example.com'` 后 URL 仍为本机地址；实测鉴权 `no-cookie 403 / host-evil 403 / origin-cross 403 / origin-self 200 / cookie-ok 404 / wrong-token 403`（脚本 `.acr/probe/authcheck.mjs`）；截图 `.acr/shots/m4.3-shell.png` (2026-11-06) |
| 回写 | 影响分析：鉴权中间件是 M1.1 `/api/dir` 与 M3.1 `/api/file` 的前置，二者接入时直接复用 `checkRequest`；guest `fvHost` 当前只暴露 `getPathForFile`（webUtils 需 sandbox:no），其余成员随 M1.5 / M2.4 / M5.1 各自落地 |
| 待定 | — |
| M4.2 ✅ | 视觉规范与动效（tokens / 动效 / 无浏览器痕迹） |
| RED | —（纯样式/安全开关，无单元测试；验收为运行时断言） |
| GREEN | `src/shared/tokens.css` 复制到 shell 与 web；CDP 实测壳页令牌 `{--fv-bg:#0b0b0f, --fv-panel:#15151b, --fv-overlay:#1d1d25, --fv-text:#e6e6ea, --fv-muted:#a9a9b3, --fv-accent:#4c8bf5, --r-sm:8px, --r-md:12px, --t-hover:120ms, --t-pop:140ms, --t-viewer:160ms}`，guest 页六色同值；`Emulation.setEmulatedMedia(prefers-reduced-motion:reduce)` 后 `--t-hover/--t-pop/--t-viewer` 均为 `0ms`；F12 / Ctrl+Shift+I 后窗口仍是 `FastViewer [1168x696]`、`devtools opened` 日志 0 条（同一探针已证明 F12 到达页面：`window.__keys=["NumLock","F12","NumLock"]`）；右键窗口中心 `popupMenus=0`；截图 `.acr/shots/m4.2-shell.png` (2026-11-06) |
| 回写 | 影响分析：tokens 是后续图墙/查看器样式的唯一颜色来源，改色只动 `src/shared/tokens.css`；类名前缀统一 `fv-` |
| 待定 | #1 应用图标 → 用户 → M4.2 实现前（不阻塞非图标验收） |

## 批次 2 ✅（已归档）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1 / spec §M1.1-M1.5 |
| 依赖序 | M1.1 → M1.2 → M1.4 → M1.3 → M1.5 |
| M1.1 ✅ | 目录索引与分页接口 |
| RED | `npx vitest run tests/dir-index.test.ts` → Failed Suites 1: Cannot find module '../src/main/dir-index' imported from tests/dir-index.test.ts，Tests no tests；`tests/dir-api.test.ts` 6 failed（/api/dir 落 404、缺 entries）。2026-11-06 |
| GREEN | `npx vitest run tests/dir-index.test.ts tests/dir-api.test.ts` → Test Files 2 passed (2) / Tests 24 passed (24)；全量 `npx vitest run` → 4 passed / 41 passed；`npx tsc --noEmit` → TYPECHECK_OK。`node scripts/bench-dir.mjs .acr/fixtures/10k 20` → `cold p50=25.9ms p95=33.2ms max=36.7ms` / `cached p50=4.79ms p95=7.91ms` / PASS。活体 curl（应用端口 12944）：带 cookie `/api/dir?path=E%3A%5Cwork&sort=name&order=asc&offset=0&limit=50` → `{"path":"E:\\work","parent":"E:\\","total":8,"offset":0,"limit":50,"entries":8,"dirsFirst":true}`；不带 cookie → 403。2026-11-06 |
| 回写 | 新增 `scripts/mkfixture.mjs`、`scripts/bench-dir.mjs`（bench 用 esbuild 打临时 ESM，规避 tsx CJS 无扩展名解析）。影响：M1.2-M1.5 均消费 `DirIndex`/`GET /api/dir`；`tests/server-auth.test.ts` 的“/api 未实现”断言随之改为 200。 |
| 待定 | — |
| M1.2 ✅ | 图墙虚拟化与无限滚动 |
| RED | `npx vitest run tests/grid-math.test.ts` → FAIL: Cannot find module '../src/web/grid-math'，Tests no tests。2026-11-06 |
| GREEN | `npx vitest run tests/grid-math.test.ts` → 11 passed；全量 `npx vitest run` → 5 files / 52 passed；`npx tsc --noEmit` → TYPECHECK_OK。E2E（2000 项夹具，CDP）：滚动到底 `loaded=2000 total=2000 tiles=45 imgs=45 errors=0 lazy=false`（`.fv-tile < 300`）；快速拖动 6 次后 `cols=5 tiles=40 unique=40 bad=0`，可见区 7536–9032 覆盖视口 8000–8642 无整行空白；截图 `.acr/shots/m1.2-wall-top.png` / `m1.2-wall-scroll.png` / `m1.2-wall-bottom.png`。2026-11-06 |
| 回写 | ① `GET /api/file` 基本 200 流式提前到本项（图墙缩略图需要；仅 image/video 扩展、无 Range），Range/206/416/ETag 仍由 M3.1 实现并测。② Grid.mount 增加可选 `onLoadMore`（无限滚动触发）；条目容器 `?dir=` 启动参数仅作测试/调试入口，M1.5 接入 lastFolder 后保留。③ 修复滚动锚定导致的回弹：`.fv-wall { overflow-anchor: none }`。影响：M1.3/M1.4/M1.5 复用 Grid.setTileSize / 目录点击 / publishState。 |
| 待定 | — |
| M1.4 ✅ | 面包屑与目录导航 |
| RED | `npx vitest run tests/breadcrumb.test.ts` → Failed Suites 1: Cannot find module '../src/web/breadcrumb'，Tests no tests。2026-11-06 |
| GREEN | `npx vitest run tests/breadcrumb.test.ts` → 8 passed；全量 → 6 files / 60 passed；`npx tsc --noEmit` → TYPECHECK_OK。E2E（CDP）：`E:\work\ai\FastViewer` → crumbs `["E:","work","ai","FastViewer"]`、首块 `返回上级`、随后 `_research/dist/docs...`；点 `ai` → `path=E:\work\ai`；点 `E:` → `path=E:\`、`hasUp=false`；深层夹具 7 段 → `["E:","…",".acr","fixtures","2k"]`，点省略号菜单 `["work","ai","FastViewer"]`，点 `ai` 跳转成功；截图 `.acr/shots/m1.4-breadcrumb.png`。2026-11-06 |
| 回写 | 内容页新增顶部面包屑条；“返回上级”为 `kind:'dir'` 伪条目（size/mtime=0，始终排第一）；折叠用 `collapseBreadcrumb` 纯函数 + 省略号下拉。影响：M1.5 打开文件夹后直接复用 openDir/renderCrumbs。 |
| 待定 | — |
| M1.3 ✅ | 图块大小调节 |
| RED | 反向验证（实现已存在）：`mv src/main/config.ts src/main/config.ts.bak && npx vitest run tests/config.test.ts` → `FAIL tests/config.test.ts` `Error: Cannot find module '../src/main/config'`，`Tests no tests`，随后恢复文件。2026-11-06 |
| GREEN | `npx vitest run tests/config.test.ts` → 10 passed；全量 `npx vitest run` → 7 files / 70 passed；`npx tsc --noEmit` 无输出；`npm run build` → web/assets/app.js 17.0kb。E2E（CDP，2000 项夹具，最大化 wallW=1430）：默认 `tile=180 slider=180 cols=7`；`Input.dispatchMouseEvent` Ctrl+wheel 一格 → `tile=196 cols=6`、`visualViewport.scale=1`（未触发页面缩放）；配置文件 mtime 距滚轮 180 ms、`tileSize 212→228`（`within300:true`）；连续放大 → `tile=320 largerDisabled=true cols=4`，连续缩小 → `tile=96 smallerDisabled=true cols=13`；工具条 `+` 96→112、`−` 112→96，滑杆设 260 → `tile=260 cols=5`；锚点 `img-00012.svg` 视口偏移 -36px → -36px（scrollTop 3744→3952）；重启后 `tile=292 slider=292 cols=3`；截图 `.acr/shots/m1.3-toolbar.png`。2026-11-06 |
| 回写 | ① spec §M1.3 的滑杆 `step=16` 与默认 180/验收 180→196 冲突（浏览器按 min+16k 吸附，180 被钳成 176，滑杆与 −/+ 不一致）；实测后滑杆改 `step=4`，使 96/180/320 与全部 ±16 结果均可表示，滚轮与按钮仍固定 ±16。待 progress 收尾同步 spec §M1.3。② `src/shared/config.ts` + `src/main/config.ts` + `fv:get-config`/`fv:patch-config` 从 M5.1 提前到本项（M1.3 需要尺寸持久化；M5.1 后续补 lastFolder/window/设置面板）。③ 底部新增 48px 工具条（−/滑杆/+/数值），footer 上移 48px 并在工具条隐藏时回落。影响：M1.5 打开文件夹后工具条随 openDir 显示；M5.1 直接复用 ConfigStore。 |
| 待定 | — |
| M1.5 ✅ | 打开与切换文件夹 |
| RED | `npx vitest run tests/open-target.test.ts` → `FAIL tests/open-target.test.ts` `Error: Cannot find module '../src/main/open-target'`，`Tests no tests`。2026-11-06 |
| GREEN | `npx vitest run tests/open-target.test.ts` → 12 passed；全量 `npx vitest run` → 8 files / 82 passed；`npx tsc --noEmit` 无输出；`npm run build` → main 31.2kb / guest preload 894b / web app.js 20.6kb。E2E（CDP + 原生窗口探针）：无 lastFolder 启动 → `C:\Users\bsawang\Pictures`，标题 `Pictures`、`lastFolder` 写入；工具条/欢迎页按钮 → 原生 `#32770` 目录对话框，取消后路径与欢迎态均不变；`Input.dispatchDragEvent` 拖入 `.acr\fixtures` → 路径切换 + 标题 `fixtures` + lastFolder 更新，拖入 `img-00001.svg` → 打开父目录 `2k`；重启 → 自动打开 lastFolder `2k`；lastFolder 改为 `E:\no-such-fv-dir` 重启 → 欢迎态 + 错误文案“上次打开的文件夹已不可用，请重新选择” + 大按钮可见 + 工具条隐藏 + 标题“未选择文件夹”；冷启动 `electron . "...\2k"` → 直接打开 2k（stale lastFolder 被 CLI 覆盖，日志 `cli folder` + `open-path relay`）；运行中第二实例带路径 → 聚焦原窗口并切换；`E:\` 标题 `E:`、无“返回上级”。截图 `.acr/shots/m1.5-welcome.png`。2026-11-06 |
| 回写 | ① 新增 `src/shared/path-title.ts`（根目录取盘符、忽略尾分隔符）与 `src/main/open-target.ts`（argv 解析/目录/文件/缺失）。② HostApi 在 spec 接口之外新增 `getDefaultFolder()`、`getStartupFolder()`：前者提供默认 Pictures，后者让 CLI 路径优先于 lastFolder（首版仅靠 `fv:open-path` 事件时，boot 的 lastFolder 回退会覆盖 CLI 目标；已用启动优先级 + did-finish-load 补发解决）。③ 标题：`fv:set-folder-title` → `win.setTitle` + `shell:title`，壳页标题栏同步。④ 拖入文件打开父目录；定位到该文件与“非媒体文件忽略”留待 M2.1 查看器落地后实现。⑤ 启动优先级：`?dir=`（调试）→ CLI → lastFolder → Pictures。影响：M5.1 复用 lastFolder 恢复；M2.1 需接文件拖入定位。 |
| 待定 | — |
| F2 | spec 验收 ↔ 证据 ↔ 测试三方对齐：M1.1 dir-index 16 + dir-api 8；M1.2 grid-math 11 + 2000 项 E2E；M1.3 config 10 + E2E（180→196/96/320/300ms/重启/锚点）；M1.4 breadcrumb 8 + E2E（根/折叠/跳转）；M1.5 open-target 12 + E2E（对话框/拖放/lastFolder/CLI/第二实例）。全量 82 passed。2026-11-06 |
| F3 | 代码结构 ↔ spec 详细设计：DirIndex/Grid/Breadcrumb/Config/OpenTarget 与 §M1 一致；偏差仅 M1.3 滑杆 step=4、M1.5 启动 API 增补、文件拖入定位延后到 M2.1，均已回填 spec §M1.3/M1.5/§3.3/§7 与 prd §4。2026-11-06 |

## 批次 3 ✅（已归档）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M2 / spec §M2.1-M2.4 |
| 依赖序 | M2.1 → M2.2 → M2.3 → M2.4 |
| M2.1 ✅ | 查看器布局与详情浮窗（左右分屏 + 可拖动分隔条 + 详情浮窗） |
| RED | `npx vitest run tests/split.test.ts tests/media-seq.test.ts` → `Failed Suites 2`：`Cannot find module '../src/shared/split'`、`Cannot find module '../src/web/media-seq'`，`Tests no tests`；`tests/config.test.ts` → `AssertionError: expected undefined to be 0.8`，`1 failed | 10 passed`（2026-11-06） |
| GREEN | `npx vitest run` → `Test Files 12 passed (12) / Tests 110 passed (110)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 30.4kb`。E2E（CDP，2k 夹具）：点图片 → viewer 打开、图墙 `518/1152 = 45%`、viewer 628、`wall.scrollTop=1164` 保留；分隔条拖到 x=900 → wall 826 / viewer 320（查看器最小宽反推），松手后配置 `splitRatio=0.7170…`；重启再打开 → wall 826 / ratio 0.717；双击分隔条 → 0.45 且配置 `0.45`；拖到最左 → wall 240（图墙最小宽）；详情显示 `320 × 200` / `366 B` / `2026/11/6 21:32:47`，× 隐藏、`I` 再显示，`detailOpen:false` 重启后默认隐藏；Esc → viewer 关闭、图墙 1152 全宽；`getComputedStyle(wall).transitionDuration="0.16s"`、viewer 同值。截图 `.acr/shots/m2.1-split.png`（2026-11-06） |
| 回写 | 新增 `src/shared/split.ts`（`clampSplitRatio`/`splitWidths`）、`src/web/media-seq.ts`（媒体序列 + 循环索引）、`src/web/viewer.ts`；`AppConfig/ConfigPatch` 增加 `splitRatio`，`ConfigStore.patch` 补上该字段（E2E 发现漏合并导致不落盘）；内容区改为 `图墙 | 6px 分隔条 | 查看器`，详情浮窗 300px 覆盖查看器右侧；键盘 Esc/I/←/→。影响：M2.2 复用 viewer 渲染位与 generation；M2.3 在 stage 上加缩放/平移；M2.4 复用 next/prev 与 Esc 优先级；M3 复用查看器容器。 |
| 待定 | — |
| M2.2 ✅ | 图片加载、预载与错误态 |
| RED | `npx vitest run tests/image-cache.test.ts` → `Failed Suites 1`：`Cannot find module '../src/web/image-cache'`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run` → `Test Files 13 passed (13) / Tests 117 passed (117)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 34.5kb`。E2E（CDP，45 图目录 + 损坏 jpg 夹具）：首图 `src` 赋值与可见均 `29 ms`（<300 ms）；打开 `img-10` 时离屏 `new Image()` 依次为 `img-10/img-11/img-09`（±1 预载）；连续 10 次切换 → `20/45 · img-20.svg`，`src` 与计数同步、loading/error 隐藏；点击瞬间 `loadingHidden:false` 且 `.fv-spinner` 存在；损坏 jpg → `无法显示该文件`，`重试`/`下一项` 经 `elementFromPoint` 命中自身，点“下一项” → `4/4 · c.svg` 可见、错误隐藏；详情打开时错误文案/按钮不被遮挡，详情 300px 与底部 ‹/计数/› 均可见（`.fv-viewer:has(detail)` 遮罩右缩 300px、详情 `bottom:40px`）。截图 `.acr/shots/m2.2-error-fixed.png`（2026-11-06） |
| 回写 | 新增 `src/web/image-cache.ts`（离屏 `Image` + `decode()`、10 s 超时、LRU 8、`LoadGeneration`）与查看器渲染流程：离屏解码成功 → 赋给固定 `<img>` 并 `onload` 显示；404/解码失败/超时/0 字节统一走错误面板。spec §M2.2 详细设计的 `ImageLoader` / `Map<url, HTMLImageElement>` 落为 `ImageCache` / `Map<url,{image,lastUsed}>`，由 progress 收尾同步。布局修正：详情浮窗 `bottom:40px`（不遮底栏）、`box-sizing:border-box`（实际宽 300px），加载/错误遮罩在详情打开时 `right:300px`。影响：M2.3 复用 stage 内 `<img>`/错误态做缩放平移；M2.4 复用 next/prev 与面板按钮；M3.1 复用加载/错误态样式。 |
| 待定 | — |
| M2.3 ✅ | 自由缩放与平移 |
| RED | `npx vitest run tests/zoom.test.ts` → `Failed Suites 1`：`Error: Cannot find module '../src/web/zoom' imported from tests/zoom.test.ts`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run` → `Test Files 14 passed (14) / Tests 134 passed (134)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 42.1kb`。E2E（CDP，1600×1200 big.svg，stage 627×470）：fit `translate(0.166667px,0) scale(0.391667)`；一次滚轮 `deltaY=-100` → `scale 0.430833`（原值 ×1.1），光标像素 `(446.383,556.595) → (446.383,556.596)`，偏差 ≈0.001 px；双击 fit ↔ 1:1（`0.391667` ↔ `1`，`translate(-271.383,-338.596)`）；拖动 `(700,300)→(600,250)` → tx/ty 各 −100/−50，松手清除 `--grabbing`；连续 40 次放大 → `scale 16`，连续 75 次缩小 → `scale 0.05`；guest 视口 900×600（stage 488×428）→ 重算 `scale 0.305 / translate(0,31)`（= min(1,488/1600,428/1200)），恢复 1152×642 → `scale 0.391667 / translate(0.166667,0)`。截图 `.acr/shots/m2.3-zoom.png`（2026-11-06） |
| 回写 | 新增 `src/web/zoom.ts`（`fitScale`/`fitState`/`zoomState`/`actualState`/`panState`/`clampPan` + `Zoom` 类）；`#viewer-image` 改为 stage 内绝对定位左上角、`transform-origin:0 0`，transform 由 JS 写入；stage 绑定 `wheel`（非 passive）、`dblclick`、pointer 平移（4 px 阈值）与 `ResizeObserver`（仅 fit 模式重排）。平移 clamp 口径：图像小于视口时保持“覆盖视口中心点”，否则小图按锚点放大后会被强制居中而违背锚点验收；`actual()` 实现为 `actual(anchor?)` 以支持双击锚点。影响：M2.4 复用 stage 缩放状态与 4 px 单击/拖拽判定；M3 视频不参与缩放（`imageActive` 仅图片），视频保持网格居中。 |
| 待定 | — |
| M2.4 ✅ | 全屏浮层与键盘导航 |
| RED | `npx vitest run tests/keymap.test.ts` → `Failed Suites 1`：`Error: Cannot find module '../src/web/keymap' imported from tests/keymap.test.ts`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run` → `Test Files 15 passed (15) / Tests 142 passed (142)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 46.7kb`。E2E（CDP，FV_DEBUG_PORT=9341）：单击 big.svg → `fullscreen:"true"`、计数 `1/2 · big.svg · 68%`、`hotPrev:"flex"`、壳页 `#bar.offsetParent === null`；←/→ 首尾循环 `1 → 2 → 1`；Esc 退出全屏 → `fullscreen:"false"`、`viewerHidden:false`、壳页 `#bar` 可见（1152×688），再 Esc → `viewerHidden:true`；按 `F` 重新进入全屏；全屏内单击切换 chrome 显隐，2.6 s 无鼠标移动后自动隐藏、mousemove 恢复；拖拽 `(700,300)→(600,250)` 松手不进全屏；双击 big.svg → `scale 1` 且未进全屏；数字 `0` → fit `scale 0.391667`，`+` → `0.430833`；截图 `.acr/shots/m2.4-fullscreen.png`（2026-11-06） |
| 回写 | 新增 `src/web/keymap.ts`（`resolveKeyAction`：Esc 全屏优先于关闭、F、I、←/→、`+`/`-`/`0`/`1`）；`Viewer` 增 `setFullscreen/isFullscreen`、48 px 热区、2.5 s chrome 自动隐藏、250 ms 单击延迟（双击不误触全屏）、4 px 位移阈值；`HostApi` 增 `setFullscreen/onFullscreenChange`，主进程 `fv:set-fullscreen` → `setFullScreen`，`onStateChange` 把 `fv:fullscreen` 回推 guest。spec §M2.4 数据流中“壳页隐藏 `#bar`”实际由壳页 `body.fullscreen` CSS 完成，与主进程状态回推同源。影响：M3 视频复用同一全屏状态与热区（视频不参与缩放）；M5.2 无需改全屏入口。 |
| 待定 | — |
| F2 | spec 验收 ↔ 证据 ↔ 测试三方对齐：M2.1 split 4 + media-seq 5 + E2E（45%/钳制/记忆/双击重置/详情/I/Esc/160 ms）；M2.2 image-cache 7 + E2E（29 ms/±1 预载/快速切换/损坏错误态/重试/遮挡）；M2.3 zoom 17 + E2E（锚点 0.001 px/fit↔1:1/平移/0.05–16/resize）；M2.4 keymap 8 + E2E（单击全屏/热区/循环/Esc 两级/F/chrome/拖拽不误触/双击仅缩放/`#bar.offsetParent===null`）。全量 15 files / 142 passed。2026-11-06 |
| F3 | 代码结构 ↔ spec 详细设计：`Viewer`/`ImageCache`/`Zoom`/`resolveKeyAction`/`setFullscreen` 与 §M2.1-M2.4 一致；偏差为 `ImageLoader`→`ImageCache`、平移 clamp 口径细化、详情 `bottom:40px`、全屏走窗口级 `setFullScreen`，均已回填 spec §M2.1-M2.4/§7 与 prd §4。2026-11-06 |

## 批次 4 ✅（已归档）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M3 / spec §M3.1-M3.3 |
| 依赖序 | M3.1 → M3.2 → M3.3 |
| M3.1 ✅ | 视频文件服务与 Range |
| RED | `npx vitest run tests/range.test.ts` → `Failed Suites 1`：`Error: Cannot find module '../src/main/range' imported from tests/range.test.ts`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run tests/range.test.ts` → `Test Files 1 passed (1) / Tests 29 passed (29)`；全量 `npx vitest run` → `Test Files 16 passed (16) / Tests 171 passed (171)`；`npx tsc --noEmit` 无输出；`npm run build` 通过。活体 curl（127.0.0.1:2293，sample.mp4 4096 B）：无 Range → `200` + `accept-ranges: bytes` + `etag: "4096-1793976333928"` + `last-modified` + `content-length: 4096`；`Range: bytes=0-1023` → `206` + `content-range: bytes 0-1023/4096` + `content-length: 1024`；`Range: bytes=4096-` → `416` + `content-range: bytes */4096`；`Range: bytes=-8` → 8 字节；无 cookie → `403`。CDP（clip.webm，6 s VP9）：`video.play()` → `paused:false`，`seekable.length=1`、`seekable.end(0)=5.907 > 4`；`currentTime=5` 后 `seeked` → `currentTime 5.000468`、`duration 5.907`、`error:null`（2026-11-06） |
| 回写 | 新增 `src/main/range.ts`（`parseRange` 纯函数：单区间 `a-b`/`a-`/`-n`、越界钳制、多区间/畸形/空文件 416）；`GET/HEAD /api/file` 接入 Range：206 + `Content-Range`、416 + `Content-Range: bytes */<size>`、200 增加 `Accept-Ranges`/`ETag`/`Last-Modified`，流 `error` → `res.destroy()`、客户端中断销毁读流；`m4v` MIME 对齐 spec 为 `video/x-m4v`。影响：M3.2 播放器 seek 直接依赖 206；图墙缩略图不受影响（无 Range 时仍 200）。 |
| 待定 | — |
| M3.2 ✅ | 播放控制条与键盘 |
| RED | `npx vitest run tests/format-time.test.ts tests/keymap.test.ts` → `Test Files 2 failed (2)`：format-time 套件 `Cannot find module '../src/web/video-controls'`，keymap `Tests 4 failed | 8 passed (12)`（Space/Shift+←→/↑↓/M 均返回 `none`）（2026-11-06） |
| GREEN | `npx vitest run tests/format-time.test.ts tests/keymap.test.ts` → `Tests 20 passed (20)`；全量 `npx vitest run` → `Test Files 17 passed (17) / Tests 183 passed (183)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 56.8kb`。E2E（CDP，clip.mp4 6.94 s / 320×180）：真实点击播放按钮 → `paused:false`、按钮“暂停”、`0:01 / 0:06`；Space → `paused:true`，再 Space → `false`；拖动进度条（8% → 59.08%）：拖动中 `currentTime 0.692 → 0.97`（继续播放未跳转）、`seeks:0`、时间预览 `0:02 → 0:04`、`played` 宽随预览 33.54% → 59.08%；松手瞬间 `currentTime 4.1`（|4.1−4|=0.1 < 0.3）、`paused:false`、`seeks:1`、`0:04 / 0:06`，400 ms 后 `4.515` 继续播放；点击音量滑杆 30% → `volume 0.25`、滑杆 25；焦点移开后 `Shift+→` 从 0 → `currentTime 5`、`0:05 / 0:06`；`↑` → `volume 0.4`；`M` → `muted:true`、按钮“取消静音”；播放至结束 → 重播浮层可见，点击重播 → `currentTime 1.7`、`paused:false`。截图 `.acr/shots/m3.2-controls.png`（2026-11-06） |
| 回写 | 新增 `src/web/video-controls.ts`（`formatTime` + `VideoController`：播放/暂停、三层进度轨、拖动仅预览松手 seek、音量/静音、ended 重播、rAF 刷新、`durationchange` 兜底 duration 为 Infinity 的容器）；`keymap.ts` 增加 `video`/`shift` 上下文与 Space/Shift+←→/↑↓/M 动作；`app.ts` 分发新动作（按钮聚焦时 Space 交还原生 click）；`index.html` 移除原生 `controls`、加自定义控制条与重播浮层；详情打开时控制条 `right:300px`（否则静音/音量被详情面板遮挡，CDP 命中测试 `elementFromPoint → viewer-detail` 发现）。视频切换仍走 `destroy()`：`pause()` + 移除 src + `load()`。影响：M3.3 复用控制条与错误面板显隐；M2 图片路径不受影响。 |
| 待定 | — |
| M3.3 ✅ | 视频边界与错误态 |
| RED | `npx vitest run tests/media-error.test.ts` → `Test Files 1 failed (1)`：`Error: Cannot find module '../src/web/media-error' imported from tests/media-error.test.ts`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run tests/media-error.test.ts` → `Test Files 1 passed (1) / Tests 5 passed (5)`；全量 `npx vitest run` → `Test Files 18 passed (18) / Tests 188 passed (188)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 58.7kb`。E2E（CDP，m3-errors 夹具 01-broken.mkv / 02-empty.mp4 / 03-clip.mp4）：打开随机字节 `.mkv` → `viewer-error` 可见，`name:"01-broken.mkv"`、`text:"该视频格式无法播放"`、详情尺寸 `"—"`、重试/下一项按钮存在；按 `→` 切到 0 字节 `.mp4` → 同一面板且文件名变 `02-empty.mp4`；错误态下按 `I` 详情可开合；点重试 → 面板仍为“该视频格式无法播放”；错误后按 `→` 可切到 `03-clip.mp4`（`errorHidden:true`、`videoHidden:false`、`duration 6.939933`）；在 clip 播放中（`paused:false`）连发 3 次 `→` 后 → `document.querySelectorAll('video').length=1`、`!paused` 数量 `0`（≤1）、无第二条视频/音频元素。截图 `.acr/shots/m3.3-error.png`（2026-11-06） |
| 回写 | 新增 `src/web/media-error.ts`（`mapMediaError`：code 1–4 文案表，其余 → “视频无法播放”）；`viewer.ts` 增加 `clearVideoHandlers`/`showVideoError`，`renderVideo` 绑定 `error` → 面板、`canplay`/`playing` 清 15 s stall 计时器、超时 → “视频加载超时，文件可能无法访问”，`renderImage`/`close` 清理视频处理器并 `destroy()`；错误面板拆分 `#viewer-error-name`（文件名）与 `#viewer-error-text`（原因），出错时尺寸显示 `—`。generation 守卫保证旧媒体迟到事件不污染当前项。影响：M5.2 无需改动错误面板；M2 图片错误沿用同一面板。 |
| 待定 | — |
| F2 | spec 验收 ↔ 证据 ↔ 测试三方对齐：M3.1 range 29 + 活体 curl（200/206/416/HEAD/403）；M3.2 format-time 8 + keymap 12 + E2E（播放/暂停/Space/拖动预览松手 seek/音量/Shift+→/↑/M/重播）；M3.3 media-error 5 + E2E（mkv/0 字节/重试/错误后 →/连按切换单实例）。全量 18 files / 188 passed。2026-11-06 |
| F3 | 代码结构 ↔ spec 详细设计：`parseRange`/`VideoController`/`formatTime`/`mapMediaError`/`resolveKeyAction` 与 §M3.1-M3.3 一致；偏差为 M3.3 增加 15 s stall 超时文案与错误面板文件名拆分，均已回填 spec §M3.3/§7。2026-11-06 |

## 批次 5 ✅（已归档）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M5 / spec §M5.1-M5.2 |
| 依赖序 | M5.1 → M5.2 |
| M5.1 ✅ | 配置存储与会话恢复 |
| RED | `npx vitest run tests/window-placement.test.ts tests/config.test.ts` → `Test Files 1 failed | 1 passed (2)`：`Cannot find module '../src/shared/window-placement' imported from tests/window-placement.test.ts`，`Tests 14 passed (14)`（2026-11-06） |
| GREEN | `npx vitest run` → `Test Files 19 passed (19) / Tests 198 passed (198)`；`npx tsc --noEmit` 无输出；`npm run build` → `dist/web/assets/app.js 60.4kb`。E2E（user-data-dir `.acr/userdata-m3`，m3-errors 夹具，Win32 探针 + CDP）：图块 180→196 后 300 ms 内配置文件 `tileSize:196`；点击“大小”+“↓”后 400 ms 内 `sort:{key:"size",order:"desc"}`，图墙顺序 `01-broken.mkv(65536) → 03-clip.mp4(22709) → 02-empty.mp4(0)`；拖动分隔条 → `splitRatio:0.528455…`，重启后打开查看器 `ratio 0.5285`、wall 520 / content 984；`MoveWindow(300,200,1000,700)` → 配置 `{x:308,y:200,width:984,height:692}`（Win32 边框 8 px），重启后 `GetWindowRect = 300,200,1000,700`；点最大化 → `maximized:true` 且保留正常 bounds，重启后 `IsZoomed=True`、壳页 `maximized` 类 + 按钮“还原”；把配置窗口改为 `x:3000` 后启动 → 窗口回退到主屏居中 `136,86,1168,696`；`tileSize:9999 → 320`、`splitRatio:2 → 0.8`（wall 826，查看器 320 下限）；坏 JSON `{ broken` → 正常启动 `ready:true`、`path:""`（此电脑盘符列表）、`tileSize:180`；重启恢复目录 `m3-errors`、tileSize 196、排序“大小 ↓”。（2026-11-06） |
| 回写 | 新增 `src/shared/window-placement.ts`（`placeWindow`：多显示器求交、可见面积 <30% 回退、宽高下限 720×480、保留 maximized）；`src/main/window.ts` 启动按配置恢复 bounds + 最大化，`move/resize/maximize/unmaximize` 500 ms 防抖落盘、`close`/`before-quit` flush；`src/main/index.ts` 在创建窗口前读配置并把 `window` 补丁交给 `ConfigStore.patch`；`ConfigStore` 写盘失败改为注入式 WARN（内存态继续）。**补齐 M1.2 承诺但此前缺失的排序入口**：底部工具条“名称/时间/大小”+ 正倒序按钮，`fetchPage` 使用配置排序（盘符列表按名称），变更即 `patchConfig({sort})` 并保留查看器重新拉取；启动时从配置恢复。spec M5.1 的“300 ms 防抖写”落为 UI 层防抖（tile 150 ms / split 250 ms / window 500 ms）+ `ConfigStore` 立即原子写，已在 spec §M5.1/§7 记录。影响：M5.2 复用 `ConfigStore` 与排序状态；M1.2 图墙排序行为补齐。 |
| 待定 | — |
| M5.2 ✅ | 设置与关于面板 |
| RED | `npx vitest run tests/reset.test.ts` → `Test Files 1 failed (1) / Tests no tests`：`Error: Cannot find module '../src/shared/reset' imported from tests/reset.test.ts`；`npx vitest run tests/about.test.ts` → `Cannot find module '../src/shared/about' imported from tests/about.test.ts`（2026-11-06） |
| GREEN | `npx vitest run tests/about.test.ts tests/reset.test.ts` → `Test Files 2 passed (2) / Tests 3 passed (3)`；全量 `npm test` → `Test Files 21 passed (21) / Tests 201 passed (201)`；`npm run typecheck` 无输出；`npm run build` → `dist/web/assets/app.js 60.9kb`。E2E（user-data-dir `.acr/userdata-m3`，CDP + Win32 探针）：点齿轮 → 面板 `版本 0.1.0 / Electron 44.0.0 / Chromium 152.0.7977.54`，配置路径 `E:\work\ai\FastViewer\.acr\userdata-m3`；`fvShell.revealConfig()` → `""`（Explorer 打开 userData，无 toast）；Esc 与点遮罩均关闭面板。预置 `tileSize:300 / splitRatio:0.8 / detailOpen:false / sort:mtime↓` 并打开查看器（详情隐藏、ratio 0.8000）→ 点“恢复默认布局” → toast“已恢复默认布局”，guest `tile:180`、`ratio:0.4500`、详情可见，当前目录仍为 `m3-errors`、排序仍 `mtime↓`，配置 `tileSize:180/detailOpen:true/splitRatio:0.45`，窗口 `136,86,1168,696`（主屏工作区 1440×860 的 1152×688 居中 + 8 px 边框）。再置 `tileSize:320` 并 `MoveWindow(300,200,900,600)` → 点“清理全部偏好” → toast“已清理全部偏好”，guest `path:""`（盘符 C/D/E/H）、`tile:180`、排序“名称 ↑”、查看器关闭，配置 `lastFolder:null/sort:{name,asc}`，窗口回正中；重启 → `path:""`、盘符列表、`tile:180`、名称 ↑、窗口 `136,86,1168,696`。截图 `.acr/shots/m5.2-settings.png`（2026-11-06） |
| 回写 | 新增 `src/shared/reset.ts`（`resetLayoutPatch` = tileSize 180/detailOpen true/splitRatio 0.45，`resetPrefsPatch` = 全字段含 lastFolder null，`resetPatch(kind)`）、`src/shared/about.ts`（`buildAboutInfo` 字段映射）；`ShellApi` 增 `about/revealConfig/resetLayout/resetPrefs`，`HostApi` 增 `onConfigReset`；主进程 `shell:about`（`app.getVersion()` + `process.versions`）、`shell:reveal-config`（`shell.openPath(userData)`）、重置处理器（patch → 取消全屏/最大化 → `initialBounds` 回中 → `fv:config-reset`）；壳页齿轮 + 设置遮罩面板（版本/路径/三操作/toast，Esc 与遮罩关闭）；内容页收到重置后重读配置应用 tile/split/detail，prefs 额外 `openDir('')`。**偏差回填**：`resetLayout` 的 `window` 重置由主进程回中触发常规位置落盘完成（reset 补丁本身不含 window），已补注 spec §M5.2 并记入 §7。影响：无新增依赖；M5.1 的窗口持久化与 `placeWindow` 不变。 |
| 待定 | — |
| F2 | spec 验收 ↔ 证据 ↔ 测试三方对齐：M5.1 window-placement 8 + config 14 + E2E（落盘/重启还原/最大化/离屏/钳制/坏 JSON）；M5.2 about 1 + reset 2 + E2E（版本三行、配置目录、Esc/遮罩、布局重置的 tile/detail/split/居中/目录与排序不动、偏好清理与重启进盘符列表）。全量 21 files / 201 passed。2026-11-06 |
| F3 | 代码结构 ↔ spec 详细设计：`buildAboutInfo`、`resetLayoutPatch`/`resetPrefsPatch`、`ShellApi.about/revealConfig/resetLayout/resetPrefs`、主进程 `shell:*` 处理器、壳页面板、guest `applyReset` 与 §M5.2 一致；偏差为 resetLayout 补丁不含 window（回中由主进程完成并落盘），已回填 spec §M5.2/§7。2026-11-06 |

## 批次 6 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1 / spec §M1.1-M1.6（修订） |
| 依赖序 | M1.1 → M1.2 → M1.6 → M1.4 → M1.5 |
| M1.1 ✅ | 目录索引与分页接口（盘符根 `parent=''`） |
| RED | `npx vitest run tests/dir-index.test.ts` → `TypeError: parentOfPath is not a function`，`Tests 2 failed | 16 passed (18)`（2026-11-06） |
| GREEN | `npx vitest run tests/dir-index.test.ts tests/dir-api.test.ts` → `Test Files 2 passed (2) / Tests 26 passed (26)`；盘符根 `parent=''`，其余目录返回父路径（2026-11-06） |
| 回写 | 盘符根父级由 `null` 改为 `''`，内容页据此渲染“此电脑”并支持返回盘符列表。影响：M1.4 面包屑、M1.5 启动回退。 |
| 待定 | — |
| M1.2 ✅ | 图墙虚拟化与无限滚动（铺满裁切 + 文件名半透明底衬） |
| RED | `npx vitest run tests/tile-style.test.ts` → `Tests 3 failed (3)`：`.fv-thumb` 无 cover/绝对定位、`.fv-name` 无底衬（2026-11-06） |
| GREEN | `npx vitest run tests/tile-style.test.ts` → `Test Files 1 passed (1) / Tests 3 passed (3)`；缩略图 `position:absolute; object-fit:cover; object-position:center top`，文件名绝对底部 `rgba(0,0,0,.55)`，目录图块保持图标居中（2026-11-06） |
| 回写 | 媒体图块 DOM 未变，仅 CSS 重排；目录/盘符图块名称回到居中流式布局。影响：M1.6 盘符图块复用目录样式；M2.1 分屏后图块按容器宽重排。 |
| 待定 | — |
| M1.6 ✅ | 盘符列表（此电脑） |
| RED | `npx vitest run tests/drives.test.ts` → `Error: Cannot find module '../src/main/drives'`，`Tests no tests`（2026-11-06） |
| GREEN | `npx vitest run tests/drives.test.ts` → `Test Files 1 passed (1) / Tests 7 passed (7)`；全量 `npx vitest run` → `10 passed / 94 passed`；`npx tsc --noEmit` 无输出。E2E（CDP，全新 userData）：启动标题 `此电脑 — FastViewer`、`path=""`、`total=4`、盘符 `本地磁盘 (C:)/(D:)/(E:)/(H:)`、无欢迎页、无“返回上级”；点 E: → `path=E:\`、首块“返回上级”、`total=57`；点首块 → 回盘符列表；`fetch('/api/drives?refresh=1')` → 200 + 4 盘。截图 `.acr/shots/m1.6-drives.png`（2026-11-06） |
| 回写 | 新增 `src/main/drives.ts`（wmic CSV 解析 + 盘符扫描回退 + 5 s 缓存）与 `src/shared/drives.ts`（共享类型）；`GET /api/drives` 接入鉴权；内容页 `openDir('')` 渲染盘符图块。影响：M1.4 面包屑根段、M1.5 启动回退直接复用。 |
| 待定 | — |
| M1.4 ✅ | 面包屑与目录导航（此电脑根 + 盘符根返回列表） |
| RED | `npx vitest run tests/breadcrumb.test.ts` → `Tests 5 failed | 4 passed (9)`：未生成“此电脑”根段（2026-11-06） |
| GREEN | `npx vitest run tests/breadcrumb.test.ts` → `Test Files 1 passed (1) / Tests 9 passed (9)`。E2E（CDP）：盘符列表 crumbs `["此电脑"]`；`E:\` → `["此电脑","E:"]`；`E:\work\ai\FastViewer` → 5 段全显；`E:\work\ai\FastViewer\.acr\fixtures\2k` → `["此电脑","…",".acr","fixtures","2k"]`，点省略号菜单 `["E:","work","ai","FastViewer"]`；点 `E:` 回 `E:\`，点“此电脑”回盘符列表（2026-11-06） |
| 回写 | `parseBreadcrumb('')` 返回 `[{此电脑,''}]`，所有盘符路径前置“此电脑”；折叠逻辑不变（首段 + 末 3 段）。影响：M1.5 启动盘符列表直接复用。 |
| 待定 | — |
| M1.5 ✅ | 打开与切换文件夹（移除欢迎态与选目录对话框） |
| RED | —（行为变更：移除欢迎态/对话框、启动回退改盘符列表；原 open-target 12 项单测仍覆盖 argv 解析，新行为验收为 E2E 断言） |
| GREEN | 重启（lastFolder=`…\.acr\fixtures\2k`）→ 标题 `2k — FastViewer`、自动打开；lastFolder 改为 `E:\no-such-fv-dir` 重启 → 标题 `此电脑 — FastViewer`、crumbs `["此电脑"]`、footer 可见且文案“上次打开的文件夹已不可用，已进入此电脑”；拖入 `.acr\fixtures` → 标题 `fixtures — FastViewer`、crumbs `["此电脑","…","FastViewer",".acr","fixtures"]`、`lastFolder` 更新；拖入 `2k\img-00001.svg` → 打开父目录 `2k`、`lastFolder` 更新；冷启动 `electron . "…\.acr\fixtures"`（lastFolder 为 2k）→ 打开 `fixtures`（CLI 优先）；运行中第二实例带 `…\2k` → 退出码 0、原窗口切到 `2k`；`E:\` → 标题 `E: — FastViewer`、crumbs `["此电脑","E:"]`、首块“返回上级”，点它回盘符列表（2026-11-06） |
| 回写 | 移除 web 欢迎页、工具条“打开文件夹”按钮、`fv:open-folder`/`fv:default-folder` IPC 与 `openFolderDialog`/`getDefaultFolder` API；启动优先级 `?dir=` → CLI → lastFolder → `''`（盘符列表），失败回退盘符列表并提示。影响：M5.1 会话恢复直接读 lastFolder；M5.2 重置回盘符列表。 |
| 待定 | #1 应用图标（用户，M4.2 实现前） |
| F2 | spec 验收 ↔ 证据 ↔ 测试对齐：M1.1 dir-index 18 + dir-api 8；M1.2 tile-style 3 + 活体计算样式（img 180×180 = tile 180×180、`cover`/`50% 0%`、`.fv-name` absolute/bottom 0/全宽/`rgba(0,0,0,.55)`）；M1.6 drives 7 + E2E（盘符/返回上级/标题）；M1.4 breadcrumb 9 + E2E（根/折叠/跳转）；M1.5 E2E（重启恢复/失效回退/拖放/CLI/第二实例/盘符标题）。全量 10 files / 95 passed。2026-11-06 |
| F3 | 代码结构 ↔ spec 详细设计：`parentOfPath`（盘符根 `''`）、`drives.ts`（wmic + 扫描回退 + 5 s 缓存）、`GET /api/drives`、`parseBreadcrumb('')`、`openDir('')` 盘符视图、移除 welcome/dialog IPC、卡片 cover + 底衬与 §M1.1/M1.2/M1.4/M1.5/M1.6 一致；真机盘符 C/D/E/H 与 E2E 一致，无未回填偏差。2026-11-06 |

## 批次 7 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1/§M2/§M4 / spec §M4.1、M1.5、M1.2、M1.3、M2.1、M2.3、M2.4（修订） |
| 依赖序 | M4.1 → M1.5 → M1.2 → M1.3 → M2.1 → M2.3 → M2.4 |
| M4.1 ✅ | 标题栏去路径 + 沉浸态中继 |
| RED | `npx vitest run tests/shell-layout.test.ts` → `Test Files 1 failed (1) / Tests 5 failed (5)`：仍含 `id="title"`、`onTitle`、`setFullscreen`、`body.fullscreen`（2026-11-07） |
| GREEN | `npx vitest run tests/shell-layout.test.ts` → `Test Files 1 passed (1) / Tests 5 passed (5)`；`npm run typecheck` 无输出（2026-11-07） |
| 回写 | `ShellApi.onImmersive` 取代 `onTitle`；`HostApi.setImmersive` 取代 `setFullscreen/onFullscreenChange`；主进程 `fv:set-immersive` → 壳页 `shell:immersive`，webview 销毁时强制广播 false；`fv:set-folder-title` 只 `win.setTitle`；壳页移除 `#title`，`.is-immersive` 隐藏 `#bar` 且 `#stage` 高度 100vh。影响：M2.4 浮层复用该中继；M1.5 标题只落系统窗口。 |
| 待定 | — |
| M1.5 ✅ | 标题映射只走系统窗口标题 |
| RED | —（共享 M4.1 的 RED：壳页 `#title`/`onTitle`/`shell:title` 均被移除；`folderTitle` 逻辑未变，原 12 项测试持续覆盖） |
| GREEN | `npx vitest run tests/open-target.test.ts tests/shell-layout.test.ts` → `Test Files 2 passed (2) / Tests 17 passed (17)`（2026-11-07） |
| 回写 | 标题仍由 `folderTitle` → `fvHost.setFolderTitle` → 主进程 `win.setTitle`（任务栏/Alt-Tab）；壳页标题栏固定为 `FastViewer`，不再接收目录名。影响：M2.1 切换目录不改变标题栏文本。 |
| 待定 | — |
| M1.2 ✅ | 可变行高图墙 + 文件名完整换行 + 控件移到面包屑下 |
| RED | `npx vitest run tests/tile-style.test.ts` → `Tests 1 failed \| 4 passed`：`.fv-name` 误设 `white-space: nowrap` 时断言 `expected ... to contain 'white-space: normal'` 失败（反向验证，2026-11-07）；`tests/text-wrap.test.ts` 首跑 `Failed to resolve import '../src/web/text-wrap'`（2026-11-07） |
| GREEN | `npx vitest run tests/grid-math.test.ts tests/text-wrap.test.ts tests/tile-style.test.ts` → `Test Files 3 passed (3) / Tests 23 passed (23)`；`npm run typecheck` 无输出（2026-11-07）。E2E `.acr/fixtures/m1.2-wrap` @760×700：同行等高（row1 252px/4 行名、row2 204px/1 行名、row3 236px/3 行名）；`.fv-name` 的 `scrollHeight === clientHeight`（3 行 56px、4 行 72px，无截断）；crumbs top 0 < toolbar top 41 < wall top 82，底部无工具条。E2E `2k`（2000 项）：滚到底 `scrollH 141436 / scrollTop 140872`，DOM tile 15–24 个（<300），行距恒 212px、每行 3 个、无重复行；连续跳转 5%/50%/95% 后行距仍 212px、`perRow` 全 3（2026-11-07） |
| 回写 | `grid-math.ts` 改为 `rowHeights/rowTops/rowIndexAt`（行高 = `S + max(1,行数)×16 + 8`）；新增 `src/web/text-wrap.ts`（Canvas `measureText` + `Intl.Segmenter` 词/字素折行）；`grid.ts` 按 `(tileSize,name)` 缓存行数、重置时清 `currentIndex`、`setTileSize` 用 `anchorScrollTop` 保锚点；DOM 改为 `.fv-media`（1:1 cover）+ 静态 `.fv-name`；控件行移到面包屑与图墙之间。**spec M1.2 已写 `Grid.mount(... onCurrentChange?)`，实现暂未提供该回调**（当前由 app.ts 主动 `setCurrent`；M2.1 若需双向联动再补，届时同步 spec）。影响：M1.3 缩放重排、M2.1 选中高亮均复用新 `rowTops`。 |
| 待定 | — |
| M1.3 ✅ | 图块缩放适配可变行高 |
| RED | `npx vitest run tests/grid-math.test.ts` 反向验证（临时去掉 `Math.max(TILE_MIN,…)`、把锚点行写死 `rowTops[0]`）→ `Tests 6 failed`：`expected 50 to be 96`、`expected 56 to be 268` 等（2026-11-07） |
| GREEN | `npx vitest run tests/grid-math.test.ts` → `Test Files 1 passed (1) / Tests 17 passed (17)`；`npm run typecheck` 无输出（2026-11-07）。E2E `.acr/fixtures/m1.2-wrap` @994：180→196 后列数 5→4、行高重算 252/236 → 268/220/252，`.fv-name` `scrollHeight === clientHeight`（长名仍完整）；slider/label/±全部同步，96 时 − 禁用、320 时 + 禁用；拖到 244 → 配置文件写入 181ms（300ms 内）；重启后 `tile=212/slider=212` 恢复。E2E `2k` @994：scrollTop 5000（行 23，offset 108）→ Ctrl+轮一格 → `scrollTop 6508`、锚点 index 115 的 `top 6400`（相对 -108，与旧 offset 等值）、每行 4 个（2026-11-07） |
| 回写 | 无需改代码（`setTileSize` 的 `measureAll` + `anchorScrollTop` 已随 M1.2 落地）；补 `clampTileSize` 与可变行高锚点单测。影响：M2.1 选中高亮不受缩放影响（按索引）。 |
| 待定 | — |
| M2.1 ✅ | 常驻查看器 + 空态 + 浮动详情 + 选中联动 |
| RED | `npx vitest run tests/viewer-layout.test.ts` → `Tests 7 failed \| 1 passed`：仍含 `fv-viewer-bar`/`fv-viewer-foot`/`viewer-close`、查看器带 `hidden`、`viewer.ts` 无 `showEmpty`、`app.ts` 仍有 `closeViewer`（2026-11-07） |
| GREEN | `npx vitest run tests/viewer-layout.test.ts` → `Tests 8 passed (8)`；`npm run typecheck` 无输出；`npm test` → `Test Files 24 passed (24) / Tests 226 passed (226)`（2026-11-07）。E2E `m1.2-wrap`：启动即 `viewerHidden:false`、自动首项 CJK 长名、`detailHidden:false`、`infoHidden:true`、counter `1/8 · 34%`、首个媒体图块 `.is-current`、无 bar/foot、`browserW 447 / contentW 994 / ratio 0.45`、过渡 `0.16s`；点第 4 个图块 → detail `broken-short.jpg` + 高亮同步；浮动 › → `medium-name-b.svg` + 高亮同步；关闭详情 → `detailHidden:true / infoHidden:false`，点信息或按 `I` 复原；Esc 后 `viewer:open`（不再关闭查看器）。空态：打开 `.acr/fixtures`（纯目录）→ 文本“没有可查看的图片或视频”、stage `display:none`、info/hot/counter 全隐藏、`is-current` 0。视频：`m3` → detail `clip.mp4`、尺寸 `320 × 180`、控制条 `display:flex`。分屏：拖拽 `browserW 447→250`（ratio 0.2515），双击回 `0.4500`；松手到配置落盘 `290ms`（250ms 防抖）；重启后 `browserW 648 / contentW 1440`（0.45）保持；`detailOpen=false` 重启后详情隐藏、信息按钮显示（2026-11-07） |
| 回写 | `Viewer` 改为常驻：新增 `showEmpty()`、`onIndexChange`，移除 `close()/setFullscreen()/onClose/onEnterFullscreen`；`openDir` 完成后 `syncViewer()`（`buildMediaSeq(items)` 自动首项，排序刷新按当前路径续选）；`splitOpen` 删除，分屏恒开；键盘 Esc 不再关查看器（浮层逻辑留给 M2.4）。DOM 去除查看器顶/底栏，详情改 300px 半透明模糊浮层 + 右上浮动信息按钮，左右改为常驻半透明浮动箭头，counter 改左下浮动小片。影响：M2.2 预载/错误态沿用心跳；M2.3 浮动缩放按钮与 `Viewer` 共用 stage；M2.4 需在 `Viewer` 之外新增模态层。 |
| 待定 | — |
| M2.3 ✅ | 1:1 与适应窗口浮动按钮 |
| RED | `npx vitest run tests/zoom.test.ts tests/zoom-ui.test.ts` → `Test Files 2 failed (2) / Tests 13 failed \| 11 passed`：`ZoomState` 无 `mode`、`actualCenteredState` 未导出、查看器无 `viewer-zoom`/`zoom-actual`/`zoom-fit`（2026-11-07） |
| GREEN | `npx vitest run tests/zoom.test.ts tests/zoom-ui.test.ts` → `Tests 24 passed (24)`；`npm test` → `Test Files 25 passed (25) / Tests 233 passed (233)`；`npm run typecheck` 无输出。E2E（`m2.3` 夹具，big.svg 1600×1200 / small.svg 320×200，CDP）：初始 fit `scale 0.391875 / ty 85.875 / fitActive true`；滚轮 `deltaY −100` → `scale 0.431062`（×1.1000）、counter `39%→43%`、fit 高亮消失；点 `1:1` → `scale 1 / tx −486.5 / ty −279`（= `(627−1600)/2`、`(642−1200)/2` 居中）、`1:1` 高亮；拖动 80/50 → `tx/ty` 各 +80/+50；点 `适应窗口` → `scale 0.391875` 居中、fit 高亮；双击 stage → `scale 1` 且锚点保持；切到 small.svg → `scale 1` 时 fit 高亮、`1:1` 不高亮，点 `1:1` 后 `1:1` 高亮；窗口 `MoveWindow` 1168×696→900×620 → stage 627→479、fit `scale 0.391875→0.299375`（=479/1600）并保持居中。截图 `.acr/probe/m2.3-zoom.png`（2026-11-07） |
| 回写 | `ZoomState` 增 `mode:'fit'\|'actual'\|'free'`（`clampPan` 透传），`fitState` 记 fit、`zoomState/panState` 记 free、`actualState` 记 actual；新增 `actualCenteredState(image,view)`（1:1 且居中、不受此前平移影响），`Zoom.actual()` 无锚点时走它、有锚点（双击）保留光标像素；`Zoom.isFit()` 改读 `state.mode`。`Viewer` 增 `onZoomChange` 回调与 `updateZoomUi`：图片就绪时显示 `#viewer-zoom`，fit 按 `mode==='fit'` 高亮、1:1 按 `mode!=='fit' && scale===1` 高亮（小图 fitScale=1 时互斥）。DOM 增底部居中半透明浮动 `1:1`/`适应窗口`。影响：M2.4 浮层可直接复用 `ZoomState.mode` 与 `actualCenteredState`；`getState()` 增 `mode` 字段供浮层同步。 |
| 待定 | — |
| M2.4 ✅ | 应用内模态全屏浮层 |
| RED | `npx vitest run tests/viewer-index-zoom.test.ts` → `Test Files 1 failed (1) / Tests 3 failed (3)`：`expect(body).toContain("keep?.mode === 'actual'")`、`TypeError: zoom.restore is not a function`（2026-11-07）。E2E 同时抓到两个真实缺陷：浮层内关闭按钮只关浮层、不恢复壳页 `#bar`（`bar false` / `dataFullscreen:"1"`）；浮层内切换后常驻查看器从 1:1 被重置为 fit（100% → 37%）（2026-11-07） |
| GREEN | `npx vitest run tests/viewer-index-zoom.test.ts tests/zoom.test.ts tests/fullscreen.test.ts` → `Test Files 3 passed (3) / Tests 30 passed (30)`；`npm test` → `Test Files 27 passed (27) / Tests 243 passed (243)`；`npm run typecheck` 无输出（2026-11-07）。E2E（`m2.3` 夹具，big.svg 1600×1200 / small.svg 320×200，CDP + EnumWindows）：常驻查看器先点 `1:1`（`scale 1 / tx −506 / ty −193 / 100%`）；单击图片 → 浮层 `modalHidden:false`、`fsCounter "1/2 · 72%"`、stage `1440×860`、底板 `rgba(8,10,16,0.55)` + `blur(10px)`、`#bar offsetParent === null`、`dataFullscreen "1"`；点浮动关闭 → `modalHidden:true`、`bar true`、`dataFullscreen "0"`、rect 仍 `-8,-8,1456,876`、查看器 `scale 1` 不变；`F` 再次打开；浮层箭头 `big.svg 1/2 → small.svg 2/2 → big.svg 1/2` 首尾循环且查看器同步索引、缩放保持 `1`（100%）；详情关闭留 `i` 按钮、点回打开；浮层 `1:1` → `scale 1` 且居中（fsTx=146.667=(1440−1600)/2、fsTy=0）；静止 2.5 s chrome 隐藏（`cursor:none`）→ pointermove 唤醒；Esc 关闭浮层后查看器仍 `1/2 · 100%`、`bar true`、rect 不变；再按 Esc 无动作；查看器拖拽 80/40 不打开浮层；切到 `m3` 视频后单击 / `F` 均 `modalHidden:true`。截图 `.acr/probe/m2.4-modal.png`（2026-11-07） |
| 回写 | 新增 `src/web/fullscreen.ts`（`FullscreenLayer`：独立 `Zoom`、fit 打开、`chrome` 2.5 s 闲置隐藏、48 px 两侧热区、单击判定 ≤4 px/<500 ms + 250 ms 延迟、拖拽/双击不误触、跳过视频项、`getState()`）；`index.html` 增 `#fs-modal`（关闭/箭头/详情/信息/1:1/适应窗口/counter），`app.css` 增半透明模糊底板与浮动控件；`keymap.ts` 移除 `close-viewer`（Esc 仅在浮层内生效）、`F` 对视频返回 none；`Viewer` 增 `setIndex()`/`onImageClick`/`formatBytes` 导出、`getState().mode`，`setIndex` 以 `keepZoom` 保留原缩放模式（fit/actual/free），`revealImage` 消费后清除并修掉缓存命中时 `onload` 二次触发导致的缩放回落；`Zoom` 增 `restore()`；`app.ts` 接线 `openFullscreen/closeFullscreen`、`publishState` 写 `data-fullscreen`、`FullscreenLayer.onClose` 统一恢复 `setImmersive(false)` 与数据集。影响：M3 视频不进入浮层；M2.1 常驻查看器状态在浮层开关全程保持不变。 |
| 待定 | — |
| F2 | spec 验收 ↔ 证据 ↔ 测试三方对齐：M4.1 shell-layout 5；M1.5 open-target 12；M1.2 grid-math 17 + text-wrap 4 + tile-style 5；M1.3 grid-math 17；M2.1 viewer-layout 8；M2.3 zoom 20 + zoom-ui 4；M2.4 fullscreen 7 + viewer-index-zoom 3 + keymap 12 + E2E（rect/`#bar`/关闭恢复/1:1 保留/循环/详情/闲置/视频排除）。全量 27 files / 243 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`FullscreenLayer`/`Zoom`/`Viewer.setIndex`/`resolveKeyAction`/`setImmersive` 与 §M2.4、§M4.1 一致；偏差为浮层内切换按「缩放模式」保留（fit→fit、1:1→1:1、free 原值）而非字面数值不变，已回填 spec §M2.4 与 prd §4。2026-11-07 |

## 批次 8 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1/§M2 / spec §M1.2、M2.1、M2.3、M2.4（修订） |
| 依赖序 | M1.2 → M2.1 → M2.3 → M2.4 |
| 档位 | 标准档（验收判据变，模块边界不变） |
| M1.2 ✅ | 图块文件名图内浮层 + 固定卡片高度 |
| RED | `npx vitest run tests/grid-math.test.ts tests/tile-style.test.ts` → `Test Files 2 failed (2) / Tests 14 failed \| 8 passed (22)`：`computeMetrics` 仍按行数数组算可变行高（`expected 56 to be 244`）、`.fv-name` 仍 `position: static`（2026-11-07） |
| GREEN | `npx vitest run tests/grid-math.test.ts tests/tile-style.test.ts` → `Test Files 2 passed (2) / Tests 22 passed (22)`；`npm run typecheck` 无输出（2026-11-07）。E2E `m1.2-wrap`（994×712，tile 196）：9 个图块全部 `196×196`；`.fv-name` 均 `position:absolute`、`bottomInside 0`，2/4 行名向上生长至 `topInside 140/124`、`scrollHeight === clientHeight` 无截断；文件带 `rgba(0,0,0,0.55)` 底衬、目录「返回上级」`background none`；截图 `.acr/probe/b8-m1.2-overlay.png`（2026-11-07） |
| 回写 | `computeMetrics(width, tileSize, count)` 改固定行高 `tileSize + 8`；`grid.ts` 删除 Canvas 测量/行数缓存（`measureLines/measureAll/lineCounts`），`setTileSize` 只重排不重测；删除 `src/web/text-wrap.ts` 与 `tests/text-wrap.test.ts`；`.fv-name` 改 `position:absolute; left/right/bottom:0` 覆盖图块底部，高度随行数向上生长、由卡片 `overflow:hidden` 裁切。影响：图墙虚拟化行高恒定，M1.3 缩放锚点计算简化。 |
| 待定 | — |
| M2.1 ✅ | 查看器控件重排（去左右按钮、详情右下） |
| RED | `npx vitest run tests/viewer-layout.test.ts` → `Tests 3 failed \| 5 passed (8)`：仍存在 `#viewer-hot-prev/#viewer-hot-next`、`.fv-viewer-detail` 仍 `top:12px;bottom:12px`、`.fv-viewer-info` 仍 `top:12px`（2026-11-07） |
| GREEN | `npx vitest run tests/viewer-layout.test.ts` → `Test Files 1 passed (1) / Tests 8 passed (8)`；`npm run typecheck` 无输出（2026-11-07）。E2E：`#viewer-hot-prev/#viewer-hot-next` 均不存在；`#viewer-info` rect `right 12 / bottom 12 / 32×32`；点信息后详情 `300×268`、`right 12 / bottom 12`、`top:auto`、`overflow-y:auto`、内容未溢出；截图 `.acr/probe/b8-m2.1-detail.png`（2026-11-07） |
| 回写 | `viewer.ts` 删除 `hotPrev/hotNext` 字段、监听与显隐；`index.html` 删除查看器左右浮动箭头；`.fv-viewer-detail` 改 `right/bottom:12px`、`max-height:calc(100% - 24px)`、`overflow-y:auto`（高度随内容）、`max-width:calc(100% - 24px)`；`.fv-viewer-info` 改 `right/bottom:12px`；删除 `.fv-viewer-hot*` 样式与 `[hidden]` 分支。影响：查看器切换依赖键盘 ←/→ 与滚轮（M2.3）。 |
| 待定 | — |
| M2.3 ✅ | 滚轮切换 + Ctrl+滚轮缩放 |
| RED | `npx vitest run tests/wheel-nav.test.ts` → `Error: Cannot find module '../src/web/wheel-nav' imported from tests/wheel-nav.test.ts`（2026-11-07） |
| GREEN | `npx vitest run tests/wheel-nav.test.ts tests/viewer-layout.test.ts` → `Test Files 2 passed (2) / Tests 12 passed (12)`；`npm run typecheck` 无输出（2026-11-07）。E2E：普通滚轮 `deltaY 60` → counter `1/8→2/8`；`Ctrl+滚轮 deltaY −100` → `4/8 · 100%→110%`（×1.1）；随后普通滚轮 → `5/8 · 110%`（切图不改缩放，`transform scale(1.1)` 保持）；同一手势连发两次 `deltaY 60` 只前进一格（`5/8→6/8`），250 ms 后再滚 → `7/8`；截图 `.acr/probe/b8-m2.3-wheel.png`（2026-11-07） |
| 回写 | 新增 `src/web/wheel-nav.ts`（`WheelNavigator.feed`：累积 `|deltaY| ≥ 50` 触发 ±1，同一手势 200 ms 冷却、冷却期位移丢弃、`reset()`）；`viewer.ts` wheel 分流：`ctrlKey` → 原光标锚点缩放（视频只 `preventDefault` 不缩放），普通滚轮 → `wheelNav.feed` → `setIndex`（保留 `ZoomState`）；`open/showEmpty` 重置累积。影响：M2.4 浮层复用同一 `WheelNavigator` 与 `setIndex` 语义。 |
| 待定 | — |
| M2.4 ✅ | 浮层控件布局与常驻 + 滚轮 |
| RED | `npx vitest run tests/fullscreen.test.ts` → `Tests 5 failed \| 6 passed (11)`：关闭仍 `left:16px`、箭头仍 48px 直角条、详情仍 `left:16px`、仍含 `chrome-hidden/IDLE_MS/wake`、无 `WheelNavigator`（2026-11-07） |
| GREEN | `npx vitest run tests/fullscreen.test.ts` → `Test Files 1 passed (1) / Tests 11 passed (11)`；`npm test` → `Test Files 27 passed (27) / Tests 247 passed (247)`；`npm run typecheck` 无输出（2026-11-07）。E2E：点图打开浮层后 `#bar.offsetParent === null`；关闭按钮 `top 16 / right 16`、counter `left 16`、箭头 `56×56`、`border-radius 50%`、`font-size 34px`、`opacity .85`、左右各 `16px`；详情 `420×179`、`right 16 / bottom 16`；3 s 后控件 opacity 不变、无 `chrome-hidden`；普通滚轮 `1/8→2/8`、连发两次只走一格、250 ms 后可再走；`Ctrl+滚轮 −100` → `4/8 · 100%→110%`；关浮层后 `#bar` 恢复、`modalHidden true`、查看器保持 `4/8 · 100%` 且图墙高亮 `medium-name-b.svg`；截图 `.acr/probe/b8-m2.4-modal.png`（2026-11-07） |
| 回写 | `fullscreen.ts`：删除 `IDLE_MS/chromeVisible/idleTimer/wake/toggleChrome/setChromeVisible` 与单击切换 chrome 的 `clickStart/clickTimer`；pointerup 仅结束平移；`FullscreenState` 去掉 `chromeVisible`；wheel 分流 `Ctrl+滚轮` 缩放 / 普通滚轮 `WheelNavigator.feed → move()`；`open/close` 重置累积。CSS：关闭右上、counter 左上、箭头 56 px 圆形放大常驻、详情与信息按钮右下、删除全部 `chrome-hidden` 规则。影响：浮层不再有闲置隐藏；滚轮与查看器共用同一手势语义。 |
| 待定 | — |
| F2 | 批次 8 四个子需求验收 ↔ 证据 ↔ 测试逐条对齐：M1.2 固定 188 行高 + 浮层名（grid-math 17 / tile-style 5 / E2E 196×196、bottomInside 0）；M2.1 去箭头 + 详情右下（viewer-layout 8 / E2E 300×268、right/bottom 12）；M2.3 滚轮切换与 Ctrl 缩放（wheel-nav 4 / E2E 1/8→2/8、100%→110%、冷却 200 ms）；M2.4 浮层常驻布局与滚轮（fullscreen 11 / E2E 56px 圆形箭头、3 s 不隐藏、滚轮切换、Ctrl 缩放、关闭后查看器保持）。全量 27 files / 247 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`grid-math.computeMetrics(width,tileSize,count)` 固定行高、`text-wrap.ts` 已删除、`.fv-name` 绝对定位贴底；`viewer.ts` 无 `hotPrev/hotNext`、详情 CSS 右下自适应；新增 `wheel-nav.ts`（`WheelNavigator` 阈值 50 / 冷却 200）被查看器与浮层共用；`fullscreen.ts` 无闲置隐藏、`FullscreenState` 三字段、箭头 56 px 圆形。对照 spec §M1.2/M2.1/M2.3/M2.4 无未回填偏差。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 27 passed (27) / Tests 247 passed (247)`；`npm run typecheck` → 无输出；`npm run build` → `Done in 10ms`（2026-11-07）。spec §M1.2（高度恒 `S`、无文本测量）、M1.3、M2.3、M2.4 表述已按实现落回。 |

## 批次 9 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1/§M4/§M5 / spec §M1.2、M1.4、M4.2、M5.1（修订） |
| 依赖序 | M1.2 → M1.4 → M4.2（图标 → 圆角主题）→ M5.1 |
| 档位 | 标准档（验收判据变，模块边界不变） |
| M1.2 ✅ | 当前图块联动滚动 + 3 px 高亮 |
| RED | 反向验证（临时让 `focusScrollTop` 恒返回 null）`npx vitest run tests/grid-math.test.ts` → `AssertionError: expected null to be 188`（2026-11-07）；反向验证（`.is-current` 描边临时改 2 px）`npx vitest run tests/tile-style.test.ts` → `Tests 1 failed \| 4 passed`：`expected 'outline-color: var(--fv-accent); outl…' to contain 'outline-width: 3px'`（2026-11-07） |
| GREEN | `npx vitest run tests/grid-math.test.ts` → `Tests 20 passed (20)`；`npx vitest run tests/tile-style.test.ts` → `Tests 5 passed (5)`（2026-11-07）。E2E `.acr/fixtures/b9-scroll`（40 图）：启动自动首项 `1/40`；键盘 → ×8 → `9/40`、当前行部分可见时 `scrollTop 1504` 不变；再 ×3 → `12/40`、当前行贴顶 `relTop 16`（`scrollTop 2256 = 16 + 12×188 − 16`）；`.is-current` computed `outline-width 3px`、`outline-color rgb(76,139,245)`、`box-shadow … 0 0 18px`；截图 `.acr/probe/b9-scroll.png`、`.acr/probe/b9-window-scroll.png`（2026-11-07） |
| 回写 | 新增 `focusScrollTop(index, scrollTop, viewportH, metrics)`（与视口无交集才返回 `rowTops[row] − GRID_PADDING`，否则 null）；`Grid.setCurrent` 在类名更新后按返回值立即改写 `scrollTop` 并重绘；`.fv-tile.is-current` 描边 1 px → 3 px + 1 px 内圈 + 18 px 外发光。影响：M2.1/M2.3/M2.4 的切图回调共用 `setCurrent`，键盘/滚轮/浮层/点击四条路径自动获得联动。 |
| 待定 | — |
| M1.4 ✅ | 此电脑系统快速访问文件夹 |
| RED | 反向验证（临时让 `listPlaces` 恒返回 `[]`）`npx vitest run tests/places.test.ts` → `Tests 3 failed \| 1 passed`：`expected [] to deeply equal [ 'desktop', 'downloads', …(4) ]`、`expected [] to deeply equal [ 'pictures', 'videos' ]`、`expected [] to have a length of 5 but got +0`（2026-11-07） |
| GREEN | `npx vitest run tests/places.test.ts` → `Tests 4 passed (4)`；`npx vitest run tests/drives.test.ts` → `Tests 4 passed (4)`（API 断言 `{drives, places: []}`）（2026-11-07）。E2E 冷启动此电脑：图墙依次 `桌面 / 下载 / 文档 / 图片 / 音乐 / 视频`，随后盘符 `C: / D: / E: / H:`；面包屑仅“此电脑”；截图 `.acr/probe/b9-root.png`（2026-11-07） |
| 回写 | 新增 `src/shared/places.ts`（`PLACE_IDS` / `PLACE_LABELS` / `PlaceInfo`）与 `src/main/places.ts`（固定顺序、`pathFor` 抛错跳过、`isDir` 过滤不存在项）；`/api/drives` 返回 `{drives, places}`；内容页根视图先渲染 places（不参与排序）再渲染盘符。影响：M1.6 盘符列表验收同步为 `{drives, places}`。 |
| 待定 | — |
| M4.2 ✅（图标） | 界面图标统一 Heroicons outline |
| RED | 反向验证沿用 CSS 断言（见 M1.2 的 3 px 红）；图标替换无独立单测，以 DOM/E2E 断言为准（2026-11-07） |
| GREEN | E2E 内容页：`detail-close / viewer-info / fs-close / fs-prev / fs-next / fs-info / fs-detail-close` 7 个控件 `innerHTML` 均以 `<svg` 开头、`textContent === ''`（字符 ×/‹/›/i 全部移除）；壳页 6 个 `<svg>`，设置齿轮为 Heroicons cog；截图 `.acr/probe/b9-scroll.png`、`.acr/probe/b9-fs.png`（2026-11-07） |
| 回写 | 查看器与浮层控件、壳页设置按钮改用 Heroicons v2 24 px outline 内联 SVG（`stroke: currentColor`、`fill: none`）；文件夹/盘符图标同步为线性风格；CSS 为各图标宿主补 `svg` 尺寸规则（浮层箭头仍用 56 px 圆形底）。影响：图标颜色跟随皮肤强调色/正文色。 |
| 待定 | — |
| M4.2 ✅（圆角与主题） | 12 px 窗体圆角 + 4 套皮肤下拉 |
| RED | 反向验证（`THEME_IDS` 临时去掉 `moss`）`npx vitest run tests/theme.test.ts tests/places.test.ts tests/grid-math.test.ts` → `Test Files 3 failed (3) / Tests 5 failed \| 22 passed (27)`：`expected [ 'midnight', 'obsidian', 'dawn' ] to deeply equal [ Array(4) ]`（2026-11-07） |
| GREEN | `npx vitest run tests/theme.test.ts tests/places.test.ts tests/grid-math.test.ts` → `Tests 27 passed (27)`（2026-11-07）。E2E：壳页下拉 4 项 `深空蓝/曜石黑/墨绿/晨雾`，默认 `midnight`；切 `dawn` → 壳页与内容页 `data-theme` 同为 `dawn`、内容页 `bg rgb(245,246,248) / fg rgb(27,29,35)`；`obsidian` `bg rgb(8,8,10) / accent #7c8cff`；`moss` `bg rgb(10,15,12) / accent #5fbf8f`；配置文件写入 `"theme": "moss"`，重启后壳页下拉与内容页均恢复 `moss`、目录恢复 `b9-scroll`、查看器 `1/40`；圆角 computed：普通态 `#bar` 左上 / `#stage` 左下均 `12px`，最大化后均 `0px`；窗口截图四角透明可见（`.acr/probe/b9-window-root.png`、`b9-window-dawn.png`、`b9-window-scroll.png`、`b9-window-restart.png`）；浮层仍为应用内模态（rect 不变、任务栏可见），关闭后查看器保持 `12/40 · 100%`（`.acr/probe/b9-fs.png`、`b9-window-fs.png`）（2026-11-07） |
| 回写 | 新增 `src/shared/theme.ts`（`THEME_IDS` / `DEFAULT_THEME` / `isThemeName`）；`tokens.css` 4 套主题块（`midnight` 原始色 + `obsidian` / `moss` / `dawn`）并扩展 line/fill/thumb/name-bg/scrim/shadow 令牌；`BrowserWindow` 改 `transparent:true`，壳页 `#bar` 上圆角 + `#stage` 下圆角 `overflow:hidden` 裁切 webview，`maximized/fullscreen/is-immersive` 归 0；`config.theme` 字段 + `sanitizeConfig` 非法值回退 `midnight`；IPC `shell:get-theme` / `shell:set-theme` / `shell:theme` / `fv:theme` 双向广播。影响：spec §5 移除“不做浅色主题”非目标、M4.1 圆角口径、M1.6/M4.2 接口与测试点已同步。 |
| 待定 | #1 应用图标（用户，打包前定；本轮“图标”仅指界面图标） |
| F2 | 批次 9 四个子需求验收 ↔ 证据 ↔ 测试逐条对齐：M1.2 联动滚动与 3 px 高亮（grid-math 20 / tile-style 5 / E2E 9/40→12/40、relTop 16、outline 3px）；M1.4 快速访问（places 4 / drives 4 / E2E 6 项先于盘符）；M4.2 图标（7 控件 SVG、0 字形文本）与圆角主题（theme 3 / config 15 / E2E 4 套切换 + 重启保持 + 12px↔0px）；M5.1 皮肤持久化（config `theme:"moss"` + 重启恢复）。全量 29 files / 258 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`focusScrollTop` 与 `Grid.setCurrent` 联动、`places.ts` 双端职责、`theme.ts` + `tokens.css` 4 套、`shell:set-theme`/`shell:theme`/`fv:theme`、`transparent` + `--r-window` 圆角、Heroicons outline 与 spec §M1.2/M1.4/M4.1/M4.2/M1.6/M5.1 一致；本次回填 M1.6 `{drives, places}` 接口、M1.4/M4.2/M5.1 测试要点、M4.2 IPC/令牌清单、§5 非目标第 6 条。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 29 passed (29) / Tests 258 passed (258)`；`npm run typecheck` → 无输出；`npm run build` → `Done in 12ms`（2026-11-07）。spec §M1.2/M1.4/M4.2/M5.1 与 prd §M1/§M4/§M5 表述已按实现落回。 |

## 批次 10 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1/§M4 / spec §M1.2、M1.4、M1.6、M4.2（修订） |
| 依赖序 | M1.2（图标/高亮）→ M1.4（自定义快速访问）→ M4.2（自绘下拉/暖色主题） |
| 档位 | 标准档（Mx.y 集合不变，验收判据变；模块边界不变） |
| M1.2 ✅ | 文件夹填充图标回退 + 当前图块 5 px 描边 |
| RED | `npx vitest run tests/theme.test.ts tests/shell-theme.test.ts tests/tile-style.test.ts tests/places.test.ts` → `Test Files 4 failed (4) / Tests 14 failed \| 8 passed (22)`：`expected 'width: 42%; … fill: none; stroke: currentColor;' to contain 'fill: currentColor'`、`expected '… outline-width: 3px; …' to contain 'outline-width: 5px'`（2026-11-07） |
| GREEN | `npx vitest run tests/tile-style.test.ts` → `Tests 5 passed (5)`；E2E `.acr/fixtures/10k` 滚到 index 201：`.is-current` = `img-00001.jpg`、computed `outline-width 5px`；文件夹图标 computed `fill rgb(240,163,94)` / `stroke none`；截图 `.acr/probe/b10-window-root.png`、`b10-final-pins.png`（2026-11-07） |
| 回写 | 无（图标与描边属本轮既定修订） |
| 待定 | — |
| M1.4 ✅ | 用户自定义快速访问文件夹 |
| RED | 同批次 RED：`tests/places.test.ts` 导入 `parseQuickAccess` / `mergePlaces` / `listQuickAccessPlaces` 失败（4 files / 14 failed 含新增 7 项）（2026-11-07） |
| GREEN | `npx vitest run tests/places.test.ts` → `Tests 11 passed (11)`（2026-11-07）。E2E 冷启动此电脑：6 标准目录 → 5 个固定项 `ai / models / output / input / resources` → 4 盘符；点 `resources` → 面包屑 `此电脑 › … › ai › aigc-study › resources`；`/api/drives` places 11 项（6 标准 + 5 固定，自定义 id 以 `qa:` 开头）；失效固定项被隐藏；截图 `.acr/probe/b10-window-pins.png`（2026-11-07） |
| 回写 | `src/main/places.ts` 新增 `parseQuickAccess` / `mergePlaces` / `listQuickAccessPlaces`（Shell COM `shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}` + PowerShell `-NoProfile -NonInteractive -EncodedCommand`，4 s 超时、30 s 缓存与 in-flight 复用、失败/超时回空）；`PlaceInfo.id` 放宽为 `string`，自定义项 `qa:<小写路径>`；`PlaceInfo` 仍保留六个标准 id；`/api/drives` 的 `placeLister` 支持异步；`src/main/index.ts` 合并标准目录与固定项。影响：M1.6 接口/数据结构、M1.4 算法与测试要点已同步。 |
| 待定 | — |
| M4.2 ✅ | 自绘主题下拉 + 暖色深色皮肤（5 套） |
| RED | 同批次 RED：`expected [ 'midnight', 'obsidian', 'moss', 'dawn' ] to deeply equal [ Array(5) ]`、`expected '' to contain '--fv-bg: #14100d;'`、`html not to contain '<select'`、`role="listbox"` 缺失（2026-11-07） |
| GREEN | `npx vitest run tests/theme.test.ts tests/shell-theme.test.ts` → `Tests 6 passed (6)`；`npm test` → `Test Files 30 passed (30) / Tests 268 passed (268)`（2026-11-07）。E2E：壳页 `document.querySelectorAll('select').length = 0`、5 个 `role=option`；点击触发按钮 → 菜单展开 `aria-expanded=true`、rect `818,52,142,164`；键盘 ↓×2 → 高亮 `moss`、Enter 选定；Esc 关闭且主题不变；点击外部关闭；五套切换文案与 `data-theme` 一致（`深空蓝/曜石黑/墨绿/琥珀/晨雾`）；琥珀内容页 `bg rgb(20,16,13)`、`--fv-accent #f0a35e`；晨雾 `bg rgb(245,246,248) / fg rgb(27,29,35)`；`theme:"ember"` 落盘，重启后壳页按钮「琥珀」与内容页同为 ember；截图 `.acr/probe/b10-window-menu3.png`、`b10-final-pins.png`（2026-11-07） |
| 回写 | `THEME_IDS` 增 `ember`（第 4 位）、新增 `THEME_LABELS`；`tokens.css` 琥珀块（bg `#14100d` / panel `#1d1815` / overlay `#27201b` / text `#f1e7dd` / muted `#b6a596` / accent `#f0a35e`）；壳页原生 `<select>` 换为 `#theme-trigger` + `#theme-menu[role="listbox"]`（5 选项双色色卡、`aria-expanded` / `aria-selected` / `aria-activedescendant`，↑↓/Home/End/Enter/空格/Esc/Tab、外点关闭），`applyTheme` 同步按钮文案与选中态；壳页 `#bar` 提层 `position:relative; z-index:20` 保证菜单浮于 webview 之上；未知主题仍回退 `midnight`。影响：spec §2.6 theme 枚举、M4.2 验收/令牌/交互/测试要点已同步。 |
| 待定 | #1 应用图标（用户，打包前定；本轮未涉及） |
| F2 | 批次 10 三个子需求验收 ↔ 证据 ↔ 测试逐条对齐：M1.2（tile-style 5 / E2E `outline-width 5px`、`fill rgb(240,163,94)`、`stroke none`）；M1.4（places 11 / E2E 5 固定项位于 6 标准目录之后、盘符之前，点击 `resources` 面包屑正确）；M4.2（theme 3 + shell-theme 3 / E2E 5 套切换 + listbox 键盘 + 外点关闭 + 重启保持 + 琥珀/晨雾色值）。全量 30 files / 268 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`theme.ts`（5 id + labels）、`tokens.css` 5 块、`shell/index.html` 自绘 listbox + `shell/index.ts` 键盘/外点/选中态、`main/places.ts`（PowerShell 枚举 / JSON 解析 / 合并去重 / 30 s 缓存 / 失败回空）、`server.ts` 异步 `placeLister`、`main/index.ts` 合并、`grid.ts` 填充式文件夹 SVG + `app.css` `fill: currentColor`/5 px 描边——与 spec §2.3/§2.6/M1.2/M1.4/M1.6/M4.2 一致，无未回填偏差。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 30 passed (30) / Tests 268 passed (268)`；`npm run typecheck` → 无输出；`npm run build` → `Done in 11ms`（2026-11-07）。prd §M1/§M4 与 spec §2.3/§2.6/M1.2/M1.4/M1.6/M4.2 已按实现落回。 |

## 批次 11 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M1/§M5 / spec §M1.5（修订）、M5.3（新增） |
| 依赖序 | M1.5 → M5.3 |
| 档位 | 标准档（新增 M5.3、M1.5 验收判据变；模块边界不变） |
| M1.5 ✅ | 文件参数定位到父目录并在查看器中选中该文件 |
| RED | `npx vitest run tests/open-request.test.ts` → `Test Files 1 failed (1) / Tests no tests`（临时移走 `src/web/open-request.ts` 反向验证，`Cannot find module '../src/web/open-request'`；2026-11-07） |
| GREEN | `npx vitest run tests/open-request.test.ts` → `Tests 7 passed (7)`；E2E 安装版 `FastViewer.exe "...\Temp\fv-media\b.png"` → `path=...\Temp\fv-media`、`viewer=open`、`#viewer-image naturalWidth=8`、`#viewer-error hidden`、`.fv-tile.is-current` 文本 `b.png`（2026-11-07） |
| 回写 | `src/web/open-request.ts` 新增 `parentOf`（`\` / `/` 取父目录，盘符根补 `\`，无分隔符返回 null）与 `findMediaIndex`（大小写不敏感匹配）；`app.ts` 的 `openRequest(path)` 先 `openDir(path)`，`BAD_PATH` 时退回父目录再 `syncViewer(path)`；`syncViewer` 在 `grid.setCurrent` 后再用 `requestAnimationFrame` 重跑一次（首帧布局为 0 时补高亮/滚动）；`HostApi.getStartupFolder` → `getStartupPath`，主进程 CLI 传原始文件路径。影响：spec §3.3/§3.4/M1.5 已同步。 |
| 待定 | — |
| M5.3 ✅ | 安装包（zip + NSIS）与系统文件关联 |
| RED | —（无单元测试；按 spec 测试要点走安装/注册表/E2E，见 GREEN） |
| GREEN | `npx electron-builder --win --publish never -c.directories.output=<tmp> -c.electronDist=<缓存 electron-v44.0.0-win32-x64.zip>` → `using custom electronDist zip file`，产出 `FastViewer-0.1.0.exe` 102,212,364 B 与 `FastViewer-0.1.0.zip` 140,768,869 B（2026-11-07）。安装 `/S` → `HKCU\Software\Classes\.png` = `FastViewer.Image`、`.mp4` = `FastViewer.Video`、`.svg` = `FastViewer.Image`（无 UserChoice 的扩展直接生效）；`FastViewer.Image\|Video\shell\open\command` = `C:\Users\bsawang\AppData\Local\Programs\fastviewer\FastViewer.exe "%1"`；`.png\OpenWithProgids` 含 `FastViewer.Image`。UserChoice 未被改写：`.png`/`.jpg` 仍 `AppX43hnxtbyyps62jhe9sqpdzxn1790zetc`（照片）、`.mp4` 仍 `PotPlayerMini64.mp4`；对无 UserChoice 的 `.svg` 做 ShellExecute → 系统弹 OpenWith 选择器（新进程 `dllhost`/`OpenWith`），首次需用户确认“始终使用”。卸载 `/S` → `FastViewer.Image`/`FastViewer.Video` 消失、`.png`/`.svg`/`.mp4`/`.mkv` 默认值被删除（`(值未设置)`），安装目录删除；重装后关联恢复（2026-11-07） |
| 回写 | `electron-builder.yml` 增加 `nsis.include: build/installer.nsh`；新增 `build/installer.nsh`（`fvDropExt` 宏：读 `HKCU\Software\Classes\.<ext>` 默认值，等于对应 ProgID 才删除）——修复 electron-builder 卸载后 `.ext` 默认值悬挂在已删除 ProgID 上的问题；spec §3.4 与 M5.3 已同步。 |
| 待定 | #1 应用图标（用户；安装器暂用 Electron 默认图标） |
| F2 | 验收 ↔ 证据 ↔ 测试逐条对齐：M1.5（open-request 7 项 + 安装版 E2E 定位/高亮）；M5.3（registry 键值/命令 + 卸载清理 + 安装版 E2E）。全量 31 files / 275 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`src/web/open-request.ts`、`app.ts` 的 `openRequest`/`syncViewer`、`src/main/index.ts` 的 `cliPath`/`startupPath`、`electron-builder.yml` 的 `win.fileAssociations`/`nsis`、`build/installer.nsh`——与 spec §3.3/§3.4/M1.5/M5.3 一致，无未回填偏差。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 31 passed (31) / Tests 275 passed (275)`；`npm run typecheck` → 无输出；`npm run build` → `Done in 13ms`；产物已复制到 `release/FastViewer-0.1.0.exe`、`release/FastViewer-0.1.0.zip`（2026-11-07）。 |

## 批次 12 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M5 / spec §M5.4（新增） |
| 依赖序 | M5.4 |
| 档位 | 标准档（新增 M5.4；模块边界不变） |
| M5.4 ✅ | 设置面板文件关联：18 类型分组勾选、系统默认归属、开发模式只读 |
| RED | 反向验证（临时从 `parseRegValue` 正则移除 `SZ`）`npx vitest run tests/associations.test.ts` → `Test Files 1 failed (1) / Tests 4 failed \| 7 passed (11)`：`expected false to be true`（沙箱登记状态读回失败，2026-11-07） |
| GREEN | `npx vitest run tests/associations.test.ts tests/shell-associations.test.ts` → `Test Files 2 passed (2) / Tests 16 passed (16)`；`npm test` → `Test Files 33 passed (33) / Tests 291 passed (291)`（2026-11-07）。dev E2E：面板 18 芯片、只读提示与汇总 `已登记 18 / 18 个类型 · 其中 9 个是系统默认`；打包版 `.jfif` 取消 → `reg query HKCU\Software\Classes\.jfif /ve` 返回 `(值未设置)`、`OpenWithProgids\FastViewer.Image` 移除；重勾 → 默认值恢复 `FastViewer.Image`、`shell\open\command` 指向当前 exe；视频组全不选/全选生效；连续 5 次 `associations()` 读取均 18/18；验证后注册表按备份还原（2026-11-07） |
| 回写 | 新增 `src/shared/associations.ts`（分组目录 / 类型定义 / 扩展名规范化）、`src/main/associations.ts`（`parseRegValue` + `createAssociations`：并发 8 读注册表、开关写 Classes 候选注册、`UserChoice` 只读、`SHChangeNotify` best-effort、执行器与根路径可注入）；`src/main/index.ts` 注册 `shell:associations` / `shell:set-associations` / `shell:open-default-apps`；`src/shared/api.ts` + `src/preload/shell.ts` 暴露 `associations / setAssociations / openDefaultApps`；壳页 `index.html` 面板区、`index.ts` 渲染与分组切换、`style.css` 芯片样式；测试 `tests/associations.test.ts`、`tests/shell-associations.test.ts`。影响：spec §M5.4 接口改为 `createAssociations()` 只暴露 `read/set`（`openDefaultApps` 由主进程 IPC 直接 `shell.openExternal`），§5 非目标第 5 条补 M5.4 只切换候选注册的口径。 |
| 待定 | — |
| F2 | M5.4 验收 ↔ 证据 ↔ 测试逐条对齐：分组 18 扩展（catalog 完整性 1 项 + HTML 结构断言）；注册状态与命令序列（沙箱/假执行器 7 项）；`UserChoice` 归属映射 self/other/none；只读与非法参数拒绝；打包版 `.jfif`/视频组实机读写 + 注册表还原。全量 33 files / 291 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`shared/associations.ts` 单点目录与 `electron-builder.yml` 的 `fileAssociations` 一致；`main/associations.ts` 的读并发、开关规则、ProgID 不删除、通知 best-effort 与 spec §M5.4 算法一致；壳页渲染/汇总/只读分支与验收措辞一致；§M5.4 接口表述已按实现回填。无未回填偏差。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 33 passed (33) / Tests 291 passed (291)`；`npm run typecheck` → 无输出；`npm run build` → `Done in 12ms`（2026-11-07）。spec §M5.4 状态改 ✅、§7 追加实现调整行；prd §4 追加实现行。 |

## 批次 13 ✅（已归档 · 需求变更）

| 标签 | 内容 |
|---|---|
| 覆盖 | prd §M5 / spec §3.4、M5.3（修订）、M5.4（修订） |
| 依赖序 | M5.3 → M5.4 |
| 档位 | 标准档（M5.3/M5.4 验收判据细化，18 种格式独立 ProgID 与图标；模块边界不变） |
| 需求 | 用户确认图标方案 C：40×40 文件页外形 + 折角高光 + 底部大写扩展名，位图 `#7F56D9` / 矢量图 `#12B76A` / 视频 `#F04438`；并要求安装软件时一并设置各文件类型的系统图标 |
| RED | —（资源生成类改动，未单列失败测试；新增断言在实现后随 GREEN 一起通过） |
| GREEN | `npm run icons` → 18 组 `<ext>.svg` + `<ext>.ico`（16/20/24/32/40/48/64/96/128/256；16–128 走 32-bit BMP、256 走 PNG 条目）；`npx vitest run tests/associations.test.ts tests/shell-associations.test.ts` → `Test Files 2 passed (2) / Tests 21 passed (21)`；`npm test` → `Test Files 33 passed (33) / Tests 294 passed (294)`；`npm run typecheck` → 无输出；`npm run build` → 通过；`npx electron-builder --win --publish never` → 产出 `release/FastViewer-0.1.0.exe` 102,430,694 B 与 `release/FastViewer-0.1.0.zip`（2026-11-07）。32 px / 128 px ICO 经 System.Drawing 解码核对形状、配色与文字方向正确 |
| 回写 | 新增 `scripts/file-icons.ts`（模板渲染 + 自写 ICO 容器：BMP/PNG 条目、AND 掩码、预乘 alpha 还原）与 `npm run icons`；`src/shared/associations.ts` 增加 `ASSOCIATION_CATEGORIES`、`associationCategory`、`associationProgId`（`FastViewer.<ext>`）、`associationIconFileName`，分组定义去掉组级 `progId`；`src/main/associations.ts` 改按扩展名写 ProgID/扩展默认值/OpenWithProgids，新增 `iconsDir` 注入，`DefaultIcon` 指向 `<iconsDir>\<ext>.ico`（缺失回退 `"<exe>",0`）；`src/main/index.ts` 传 `process.resourcesPath`（打包）/`build/file-icons`（开发）；`electron-builder.yml` 18 条 `fileAssociations` 各带 `icon: build/file-icons/<ext>.ico`；`build/installer.nsh` 卸载比对改为 `FastViewer.<ext>`；`scripts/build.ts` 复制 SVG 到 `dist/shell/assets/file-icons/`；壳页芯片前置 16 px 图标（`src/shell/index.ts`、`style.css`）；测试补分类映射、安装版图标路径、图标资源与安装包 ProgID 一致性。影响：spec §3.4 与 M5.3/M5.4 已按独立 ProgID + 分格式图标回填。 |
| 待定 | —（`UserChoice` 仍不可程序化改写：仅当 FastViewer 为默认程序时 Explorer 显示新图标） |
| F2 | 验收 ↔ 证据 ↔ 测试逐条对齐：M5.3（安装包 18 条独立 ProgID + `icon` 释放到 `resources\<ext>.ico` + `DefaultIcon` 路径；`npm run icons` 产物齐全）；M5.4（面板芯片图标路径、`DefaultIcon` 写入断言、图标资源/清单/卸载脚本一致性 3 项）。全量 33 files / 294 passed。2026-11-07 |
| F3 | 代码结构 ↔ spec 详细设计：`scripts/file-icons.ts`、`shared/associations.ts`（分类色/ProgID/文件名）、`main/associations.ts`（`iconsDir` + `iconRef`）、`electron-builder.yml`、`installer.nsh`、`shell` 芯片渲染与 `build.ts` 资源复制——与 spec §3.4/M5.3/M5.4 一致，无未回填偏差。2026-11-07 |
| 收尾复验 | `npm test` → `Test Files 33 passed (33) / Tests 294 passed (294)`；`npm run typecheck` → 无输出；`npm run build` → 通过；`electron-builder --win` 双产物重建完成（2026-11-07）。 |
