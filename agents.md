# FastViewer — Agent 指引

自用图片浏览器：Electron 双层壳（壳页 UI + `<webview>` 载本地文件服务页面）。优先级：① 文件夹浏览 ② 界面好看；不做格式扩展、不做编辑，需视频播放。

## 常用命令

- 启动应用: `npm run dev`（= `tsx scripts/build.ts && node scripts/start.ts`）
- 类型检查: `npm run typecheck`
- 测试: `npm test`
- 前端构建: `npm run build`
- 打包: `npm run package`（electron-builder → `release/FastViewer-<version>.zip`）
- 调试: `FV_DEBUG=1 FV_DEBUG_PORT=9333 npm run dev`（不开 FV_DEBUG 时 devtools 关闭）
- 本地服务: 主进程内嵌，`127.0.0.1:0` 随机端口 + 每次启动随机 token（不需要单独起服务）

## 文档地图

- 业务需求: docs/prd.md （acr-brainstorm 产出；模块 Mx · 功能描述 · 非目标 · 状态后缀）
- 技术规格: docs/spec.md （acr-spec 产出；Mx.y · 需求树 · 验收 · 详细设计 · 状态后缀）
- 开发进度: docs/PROGRESS.md （acr-progress 维护；单一真相源）

**三份全在 docs/**。根 README = 用户/部署侧说明; 开发侧一律放 docs/。

调研产物（只读语料，非流程文档）：

- `_research/技术路线调研报告.md` — 路线对比、图像/视频/运行时实测、web2app 内嵌方案
- `_research/webprobe/` — 探针脚本与实测留档（bench 结果、WCO 截图等）

## 流程遵循

本仓遵循 acr (Agent Coding Rules) 流程方法论。项目拦截线摘要见 [.qoder/rules/project_rules.md](.qoder/rules/project_rules.md)，skill 清单见全局。
