# 多线程下载器

一款基于Electron和Vue 3开发的多线程下载工具，可以通过多个线程同时下载文件，提高下载速度，支持断点续传和下载历史管理。

## 技术栈

- **前端**: Vue 3
- **后端**: Electron + Node.js
- **多线程**: Node.js Worker Threads
- **构建工具**: Vite + Electron Builder

## 功能特点

- 多线程并行下载，显著提升下载速度
- 文件断点续传，意外中断可继续下载
- 下载历史记录管理
- 可自定义线程数量
- 系统托盘支持
- 下载完成通知
- 美观的Fluent UI界面

## 安装与使用

### 下载安装包

从[Releases](https://github.com/3360702506/electron_thread_download/releases)页面下载最新版本的安装包：

- Windows用户: 下载 `多线程下载器 Setup 1.0.0.exe`（安装版）或 `多线程下载器 1.0.0.exe`（便携版）
- Mac用户: 下载 `多线程下载器-1.0.0.dmg`
- Linux用户: 下载 `多线程下载器-1.0.0.AppImage` 或 `.deb` 包

### 开发环境

1. 克隆仓库
   ```bash
   git clone https://github.com/3360702506/electron_thread_download.git
   cd electron_thread_download
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 开发模式启动
   ```bash
   npm run dev:all
   ```

4. 构建应用
   ```bash
   # Windows
   npm run build:win
   
   # Mac
   npm run build:mac
   
   # Linux
   npm run build:linux
   
   # 所有平台
   npm run build:all
   ```

## 使用方法

1. 输入下载链接
2. 选择保存路径
3. 调整线程数（默认为4）
4. 点击"开始下载"按钮
5. 查看下载进度
6. 下载完成后可在"下载历史"中查看记录

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 作者

- Wu (QQ: 3031688968)

## 贡献

欢迎提交问题和功能请求！如果您想为项目做出贡献，请先讨论您想要的更改。
