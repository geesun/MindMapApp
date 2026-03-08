# MindMap

一个基于 Tauri 2 + Vue 3 + TypeScript 的桌面思维导图应用。

## 功能

- Markdown 导入（将层级文本转换为思维导图）
- 新建/打开/保存 `.mindmap.md` 文件
- 节点编辑（增删改、拖拽、快捷键）
- 三种布局：`radial`、`tree-lr`、`tree-tb`
- 节点样式与连线样式可配置
- 导出图片（PNG / SVG）
- 中英文界面切换
- 深浅主题切换

## 技术栈

- 前端：Vue 3 + TypeScript + Pinia
- 桌面端：Tauri 2
- 绘制引擎：LeaferJS

## 本地开发

### 1) 环境要求

- Node.js 18+
- Rust（stable）
- 平台依赖按 Tauri 官方文档安装

Rust 安装示例：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2) 安装依赖

```bash
npm install
```

### 3) 启动开发模式

```bash
npm run tauri dev
```

### 4) 类型检查

```bash
npx tsc --noEmit
```

## 构建发布

### macOS: 生成 DMG

在 macOS 上执行：

```bash
npx tauri build --target aarch64-apple-darwin
```

产物路径：

- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/MindMap_0.1.0_aarch64.dmg`

如果你是 Intel Mac，可改为：

```bash
npx tauri build --target x86_64-apple-darwin
```

### Ubuntu: 生成 DEB

项目已提供脚本：`scripts/build-deb.sh`

在 Ubuntu 上执行：

```bash
./scripts/build-deb.sh
```

该脚本会：

1. 检查 `node` / `npm` / `cargo` / `rustup`
2. 安装 Rust target: `x86_64-unknown-linux-gnu`
3. 安装 npm 依赖
4. 调用 `npx tauri build --target x86_64-unknown-linux-gnu --bundles deb`

DEB 产物路径：

- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb`

## 图标

主图标源文件：`src-tauri/icons/icon.svg`

从 SVG 重新生成各平台图标：

```bash
npx tauri icon src-tauri/icons/icon.svg -o src-tauri/icons
```

## 项目结构

```text
MindMap/
├── src/                     # Vue 前端源码
├── src-tauri/               # Tauri / Rust 端
│   ├── icons/               # 应用图标
│   ├── src/                 # Rust 代码
│   └── tauri.conf.json      # Tauri 配置
├── scripts/
│   └── build-deb.sh         # Ubuntu 上构建 DEB 的脚本
└── README.md
```

## License

MIT
