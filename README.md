# Electron多线程下载器

基于Electron、Vue 3和Fluent UI Web Components开发的多线程下载器，支持将一个文件分成多个部分并行下载，提高下载速度。

## 功能特点

- 支持多线程并行下载单个文件
- 可自定义线程数量（1-10）
- 实时显示总体下载进度和每个线程的进度
- 美观的Fluent UI界面
- 支持选择文件保存位置

## 技术栈

- Electron: 跨平台桌面应用开发框架
- Vue 3: 前端框架
- Fluent UI Web Components: UI组件库
- Worker Threads: Node.js多线程API

## 开发环境设置

1. 克隆仓库
```bash
git clone https://github.com/yourusername/electron-multi-thread-downloader.git
cd electron-multi-thread-downloader
```

2. 安装依赖
```bash
npm install
```

3. 开发模式运行
```bash
# 同时启动Vite开发服务器和Electron
npm run dev:all

# 或者分别启动
npm run dev:vite
npm run dev:electron
```

4. 构建应用
```bash
npm run build
npm run start
```

## 使用方法

1. 输入要下载的文件URL
2. 点击"选择保存位置"按钮选择文件保存路径
3. 调整线程数量（默认为4）
4. 点击"开始下载"按钮开始下载
5. 查看下载进度

## 注意事项

- 并非所有服务器都支持范围请求（Range requests），对于不支持的服务器，多线程下载可能无法正常工作
- 线程数量不是越多越好，建议根据网络情况和CPU性能调整为合适的数量

## 许可证

MIT
