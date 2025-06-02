const { ipcRenderer, contextBridge } = require('electron');

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // 系统托盘相关
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  setMinimizeToTray: (value) => ipcRenderer.invoke('set-minimize-to-tray', value),
  
  // 监听窗口最大化状态变化
  onWindowMaximizeChange: (callback) => {
    const handler = (event, maximized) => callback(maximized);
    ipcRenderer.on('window-maximize-change', handler);
    return () => ipcRenderer.removeListener('window-maximize-change', handler);
  },
  
  // 开始下载
  startDownload: (params) => ipcRenderer.invoke('start-download', params),
  
  // 选择保存路径
  selectSavePath: (url) => ipcRenderer.invoke('select-save-path', url),
  
  // 获取下载历史
  getDownloadHistory: () => ipcRenderer.invoke('get-download-history'),
  
  // 添加下载记录
  addDownloadRecord: (record) => ipcRenderer.invoke('add-download-record', record),
  
  // 删除下载记录
  deleteDownloadRecord: (id) => ipcRenderer.invoke('delete-download-record', id),
  
  // 清空下载历史
  clearDownloadHistory: () => ipcRenderer.invoke('clear-download-history'),
  
  // 监听下载进度
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  
  // 监听下载准备状态
  onDownloadPreparing: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-preparing', handler);
    return () => ipcRenderer.removeListener('download-preparing', handler);
  },
  
  // 监听保存路径更新
  onSavePathUpdated: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('save-path-updated', handler);
    return () => ipcRenderer.removeListener('save-path-updated', handler);
  },
  
  // 监听下载错误
  onDownloadError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-error', handler);
    return () => ipcRenderer.removeListener('download-error', handler);
  },
  
  // 监听下载完成
  onDownloadComplete: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-complete', handler);
    return () => ipcRenderer.removeListener('download-complete', handler);
  },
  
  // 设置任务栏进度条
  setProgressBar: (progress) => ipcRenderer.invoke('set-progress-bar', progress),
  
  // 显示通知
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // 打开文件位置
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  
  // 获取/保存设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
