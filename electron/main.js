const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { download } = require('electron-dl');
const { Worker } = require('worker_threads');

let mainWindow;
let tray = null; // 系统托盘对象
const isDev = process.env.NODE_ENV === 'development';

// 设置自定义用户数据目录，避免默认位置的权限问题
const userDataPath = path.join(app.getPath('documents'), 'ElectronDownloader');
app.setPath('userData', userDataPath);

// 禁用硬件加速可以解决一些图形相关的问题
// app.disableHardwareAcceleration();

// 关闭HTTP缓存可以避免一些缓存相关的错误
app.commandLine.appendSwitch('disable-http-cache');

// 添加日志函数
function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logError(message, error) {
  console.error(`[ERROR] ${message}`, error || '');
}

// 确保目录存在
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logInfo(`创建目录: ${dirPath}`);
    }
  } catch (err) {
    logError(`创建目录失败: ${dirPath}`, err);
  }
}

// 用于存储设置的文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
// 用于存储下载历史的文件路径
const historyPath = path.join(app.getPath('userData'), 'download-history.json');

// 默认设置
const defaultSettings = {
  notifyOnComplete: true,
  minimizeToTray: false,
  defaultThreadCount: 4 // 新增默认线程数
};

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('加载设置失败:', err);
  }
  
  // 如果无法加载，返回默认设置
  return defaultSettings;
}

// 保存设置
function saveSettings(settings) {
  try {
    // 合并现有设置与新设置，确保不会丢失其他未更改的设置
    const currentSettings = loadSettings();
    const newSettings = { ...currentSettings, ...settings };
    const data = JSON.stringify(newSettings);
    fs.writeFileSync(settingsPath, data, 'utf8');
    logInfo(`设置已保存: ${JSON.stringify(newSettings)}`); // 增加日志
    return true;
  } catch (err) {
    console.error('保存设置失败:', err);
    return false;
  }
}

// 加载下载历史
function loadDownloadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('加载下载历史失败:', err);
  }
  
  // 如果无法加载，返回空数组
  return [];
}

// 保存下载历史
function saveDownloadHistory(history) {
  try {
    const data = JSON.stringify(history);
    fs.writeFileSync(historyPath, data, 'utf8');
    return true;
  } catch (err) {
    console.error('保存下载历史失败:', err);
    return false;
  }
}

// 添加下载记录
function addDownloadRecord(record) {
  try {
    const history = loadDownloadHistory();
    // 生成唯一ID
    record.id = Date.now();
    // 添加日期字段
    record.date = new Date().toISOString().split('T')[0];
    // 添加到历史记录
    history.unshift(record);
    // 保存历史记录
    return saveDownloadHistory(history);
  } catch (err) {
    console.error('添加下载记录失败:', err);
    return false;
  }
}

// 确保assets目录存在
function ensureAssetsDir() {
  const assetsDir = path.join(app.getAppPath(), 'electron', 'assets');
  ensureDir(assetsDir);
  return assetsDir;
}

// 获取合适的图标路径
function getIconPath() {
  try {
    // 开发环境和生产环境路径有所不同
    let iconPath;
    
    if (isDev) {
      // 开发环境，使用相对路径
      iconPath = path.join(__dirname, 'assets', 'logo.png');
    } else {
      // 生产环境，使用绝对路径
      iconPath = path.join(app.getAppPath(), 'electron', 'assets', 'logo.png');
    }
    
    // 确保图标文件存在
    if (!fs.existsSync(iconPath)) {
      logError(`图标文件不存在: ${iconPath}`);
      // 返回null，应用将使用默认图标
      return null;
    }
    
    return iconPath;
  } catch (err) {
    logError("获取图标路径出错", err);
    return null;
  }
}

// 清理临时文件和缓存
function cleanupTempFiles() {
  try {
    // 可以在这里添加清理临时文件的逻辑
    logInfo("清理临时文件");
    
    // 清理缓存目录的示例
    const cachePath = app.getPath('userData');
    const cacheFiles = ['Cache', 'Code Cache', 'GPUCache'];
    
    cacheFiles.forEach(cacheDir => {
      const dirPath = path.join(cachePath, cacheDir);
      if (fs.existsSync(dirPath)) {
        logInfo(`尝试清理缓存目录: ${dirPath}`);
        try {
          // 这里可以添加删除文件的逻辑，但要小心处理
          // 简单起见，我们不实际删除文件，只记录日志
        } catch (err) {
          logError(`清理缓存目录失败: ${dirPath}`, err);
        }
      }
    });
  } catch (err) {
    logError("清理临时文件出错", err);
  }
}

// 创建系统托盘
function createTray() {
  const iconPath = getIconPath();
  
  if (!iconPath) {
    console.warn('创建系统托盘失败: 图标文件不存在');
    return;
  }
  
  tray = new Tray(iconPath);
  tray.setToolTip('多线程下载器');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow.show() },
    { label: '最小化到托盘', click: () => mainWindow.hide() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });
}

function createWindow() {
  try {
    logInfo("创建应用窗口");
    
    mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      minWidth: 800,
      minHeight: 500,
      frame: false, // 无边框窗口
      backgroundColor: '#f9f9f9',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: getIconPath() // 设置应用图标
    });

    // 加载应用
    const startUrl = isDev 
      ? 'http://localhost:5173/' 
      : `file://${path.join(__dirname, '../dist/index.html')}`;
    logInfo(`加载应用URL: ${startUrl}`);
    
    mainWindow.loadURL(startUrl).catch(err => {
      logError("加载应用URL失败", err);
    });
    
    // 开发环境下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
    // 监听窗口最大化状态变化
    mainWindow.on('maximize', () => {
      mainWindow.webContents.send('window-maximize-change', true);
    });

    mainWindow.on('unmaximize', () => {
      mainWindow.webContents.send('window-maximize-change', false);
    });
    
    // 监听窗口关闭事件
    mainWindow.on('close', (event) => {
      // 加载设置决定是否最小化到托盘
      const settings = loadSettings();
      logInfo(`窗口关闭事件触发，最小化到托盘设置: ${settings.minimizeToTray}`); // 增加日志
      
      // 如果设置为最小化到托盘而不是退出
      if (settings.minimizeToTray) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
    });
    
    logInfo("应用窗口创建成功");
  } catch (err) {
    logError("创建窗口时出错", err);
  }
}

app.whenReady().then(() => {
  try {
    logInfo("应用准备就绪");
    
    // 清理临时文件，可能有助于解决缓存错误
    cleanupTempFiles();
    
    // 确保只有一个实例在运行
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      logInfo('另一个实例已经在运行，退出当前实例');
      app.quit();
      return;
    }
    
    ensureAssetsDir();
    createWindow();
    createTray();
  } catch (err) {
    logError('应用启动错误:', err);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 设置应用为单实例应用，并监听第二个实例的启动
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // 当运行第二个实例时，将会聚焦到第一个实例的窗口
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.show();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理托盘相关的IPC消息
ipcMain.handle('minimize-to-tray', () => {
  mainWindow.hide();
});

ipcMain.handle('set-minimize-to-tray', (event, value) => {
  const settings = loadSettings();
  settings.minimizeToTray = value;
  logInfo(`设置最小化到托盘: ${value}`); // 增加日志
  return saveSettings(settings);
});

// 处理窗口控制
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    mainWindow.webContents.send('window-maximize-change', false);
  } else {
    mainWindow.maximize();
    mainWindow.webContents.send('window-maximize-change', true);
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});

// 设置任务栏进度条
ipcMain.handle('set-progress-bar', (event, progress) => {
  if (mainWindow) {
    mainWindow.setProgressBar(progress);
  }
  return true;
});

// 显示通知
ipcMain.handle('show-notification', (event, options) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: options.title || '下载器',
      body: options.body || '',
      silent: options.silent === undefined ? false : options.silent,
      icon: options.icon || path.join(__dirname, 'assets', 'icon.png'),
      // 允许用户点击打开
      hasReply: false
    });
    
    // 点击通知时打开文件所在位置
    if (options.filePath) {
      notification.on('click', () => {
        // 使用系统的文件管理器打开文件所在目录并选中文件
        const dirPath = path.dirname(options.filePath);
        shell.showItemInFolder(options.filePath);
      });
    }
    
    notification.show();
    return true;
  }
  return false;
});

// 获取设置
ipcMain.handle('get-settings', () => {
  return loadSettings();
});

// 保存设置
ipcMain.handle('save-settings', (event, settings) => {
  logInfo(`接收到保存设置请求: ${JSON.stringify(settings)}`); // 增加日志
  return saveSettings(settings); // 直接调用已优化的saveSettings
});

// 处理下载请求
ipcMain.handle('start-download', async (event, { url, filePath, threadCount }) => {
  try {
    // 先发送准备消息，让UI知道下载即将开始
    mainWindow.webContents.send('download-preparing', { url, filePath });
    
    // 获取文件大小
    console.log(`正在获取文件信息: ${url}`);
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // 检查响应状态
    if (!response.ok) {
      return { 
        success: false, 
        error: `服务器返回错误，状态码: ${response.status}` 
      };
    }
    
    // 获取文件大小
    const fileSize = parseInt(response.headers.get('content-length') || '0');
    
    if (fileSize === 0) {
      return { success: false, error: '无法获取文件大小，请确保URL有效' };
    }

    // 创建文件
    try {
      console.log(`创建文件: ${filePath}`);
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      // 创建空文件，预分配文件大小可能会更好
      const fd = fs.openSync(filePath, 'w');
      // 预分配文件大小，防止文件写入碎片化
      if (process.platform === 'win32') {
        // Windows下特殊处理
        fs.writeSync(fd, Buffer.alloc(1), 0, 1, fileSize - 1);
      } else {
        // Linux/Mac下可以使用ftruncate
        fs.ftruncateSync(fd, fileSize);
      }
      fs.closeSync(fd);
    } catch (err) {
      console.error(`创建文件失败: ${err.message}`);
      return { success: false, error: `创建文件失败: ${err.message}` };
    }
    
    // 清理任何之前可能存在的临时文件
    try {
      for (let i = 0; i < threadCount; i++) {
        const tempFile = `${filePath}.part${i}`;
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } catch (err) {
      console.error(`清理临时文件失败: ${err.message}`);
      // 继续执行，不中断下载
    }
    
    // 计算每个线程下载的部分
    const chunkSize = Math.floor(fileSize / threadCount);
    const workers = [];
    const progressData = {};
    
    console.log(`开始多线程下载，线程数: ${threadCount}, 文件大小: ${fileSize}字节`);
    
    // 创建多个工作线程进行下载
    for (let i = 0; i < threadCount; i++) {
      const startByte = i * chunkSize;
      const endByte = i === threadCount - 1 ? fileSize - 1 : (i + 1) * chunkSize - 1;
      
      console.log(`启动线程 ${i}，下载范围: ${startByte}-${endByte}`);
      
      const worker = new Worker(path.join(__dirname, 'download-worker.js'), {
        workerData: { url, filePath, startByte, endByte, workerId: i }
      });
      
      worker.on('message', (message) => {
        // 处理工作线程启动消息
        if (message.type === 'start') {
          console.log(`线程 ${message.workerId} 已启动`);
        }
        
        // 更新进度
        if (message.type === 'progress') {
          progressData[i] = message.progress;
          
          // 计算总进度
          const totalProgress = Object.values(progressData).reduce((sum, p) => sum + p, 0) / threadCount;
          
          // 更新任务栏进度条
          if (mainWindow) {
            mainWindow.setProgressBar(totalProgress / 100);
          }
          
          // 发送进度给渲染进程
          mainWindow.webContents.send('download-progress', { 
            progress: totalProgress,
            workerId: i,
            workerProgress: message.progress
          });
        }
        
        // 如果是完成消息
        if (message.type === 'complete') {
          console.log(`线程 ${i} 已完成`);
          worker.terminate();
        }
        
        // 如果是错误消息
        if (message.type === 'error') {
          console.error(`线程 ${i} 错误:`, message.error);
          mainWindow.webContents.send('download-error', { workerId: i, error: message.error });
        }
      });
      
      worker.on('error', (error) => {
        console.error(`线程 ${i} 错误:`, error);
        mainWindow.webContents.send('download-error', { workerId: i, error: error.message });
      });
      
      worker.on('exit', (code) => {
        console.log(`线程 ${i} 退出，退出码: ${code}`);
        
        // 从workers数组中移除已完成的worker
        const index = workers.indexOf(worker);
        if (index > -1) {
          workers.splice(index, 1);
        }
        
        // 检查是否所有工作线程都已完成
        if (workers.length === 0) {
          console.log('所有线程已完成，下载完成');
          
          // 重置任务栏进度条
          if (mainWindow) {
            mainWindow.setProgressBar(-1);
          }
          
          // 获取文件名用于通知
          const filename = path.basename(filePath);
          
          // 添加到下载历史
          const fileStats = fs.statSync(filePath);
          const fileSizeBytes = fileStats.size;
          
          // 将文件大小格式化为人类可读的格式
          let fileSize;
          if (fileSizeBytes < 1024) {
            fileSize = `${fileSizeBytes} B`;
          } else if (fileSizeBytes < 1024 * 1024) {
            fileSize = `${(fileSizeBytes / 1024).toFixed(1)} KB`;
          } else if (fileSizeBytes < 1024 * 1024 * 1024) {
            fileSize = `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
          } else {
            fileSize = `${(fileSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
          }
          
          // 创建下载记录
          const downloadRecord = {
            filename,
            url,
            filePath,
            size: fileSize,
            status: '已完成'
          };
          
          // 添加到历史记录
          addDownloadRecord(downloadRecord);
          
          // 发送下载完成事件
          mainWindow.webContents.send('download-complete', { filePath });
          
          // 显示系统通知
          const settings = loadSettings();
          if (settings.notifyOnComplete && Notification.isSupported()) {
            const notification = new Notification({
              title: '下载完成',
              body: `文件 ${filename} 已下载完成`,
              silent: false,
              icon: path.join(__dirname, 'assets', 'icon.png'),
              hasReply: false
            });
            
            // 点击通知时打开文件所在目录并选中文件
            notification.on('click', () => {
              shell.showItemInFolder(filePath);
            });
            
            notification.show();
          }
        }
      });
      
      workers.push(worker);
    }
    
    return { success: true, threadCount, fileSize };
  } catch (error) {
    console.error('下载错误:', error);
    return { success: false, error: error.message };
  }
});

// 处理选择保存路径
ipcMain.handle('select-save-path', async (event, url) => {
  try {
    // 默认文件名
    let suggestedFilename = 'download.bin';
    
    // 首先只从URL路径中提取基本文件名，这个操作很快
    if (url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const filenameFromUrl = pathParts[pathParts.length - 1];
        
        if (filenameFromUrl && filenameFromUrl.trim() !== '') {
          suggestedFilename = decodeURIComponent(filenameFromUrl);
        }
      } catch (err) {
        console.error('从URL提取文件名失败:', err);
      }
    }

    // 打开文件夹选择对话框
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存目录',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: '选择文件夹'
    });
    
    // 如果用户选择了目录
    if (!result.canceled && result.filePaths.length > 0) {
      const directoryPath = result.filePaths[0];
      const fullPath = path.join(directoryPath, suggestedFilename);
      
      // 如果有URL，在返回路径后异步获取更准确的文件名
      // 这样不会阻塞UI
      if (url) {
        fetchAccurateFilename(url, directoryPath, suggestedFilename)
          .then(accurateFilePath => {
            if (accurateFilePath && accurateFilePath !== fullPath) {
              // 通知渲染进程文件名已更新
              mainWindow.webContents.send('save-path-updated', { 
                oldPath: fullPath, 
                newPath: accurateFilePath 
              });
            }
          })
          .catch(err => {
            console.error('获取准确文件名失败:', err);
          });
      }
      
      return fullPath;
    }
    
    return '';
  } catch (error) {
    console.error('选择保存路径失败:', error);
    return '';
  }
});

// 异步获取更准确的文件名
async function fetchAccurateFilename(url, directoryPath, suggestedFilename) {
  try {
    // 如果URL没有明确的文件名或者是目录，尝试发送HEAD请求获取
    if (!suggestedFilename.includes('.') || suggestedFilename.endsWith('/')) {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // 尝试从Content-Disposition获取文件名
      let filename = suggestedFilename;
      const contentDisposition = response.headers.get('content-disposition');
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }
      
      // 如果仍然没有合适的文件名，根据内容类型生成一个
      if (!filename.includes('.')) {
        const contentType = response.headers.get('content-type') || '';
        const ext = contentType.split('/')[1] || 'bin';
        if (ext && ext !== 'html' && ext !== 'plain') {
          filename = `download.${ext}`;
        }
      }
      
      return path.join(directoryPath, filename);
    }
  } catch (err) {
    console.error('获取文件名失败:', err);
  }
  
  // 如果出错或没有获取到更好的文件名，返回原始路径
  return path.join(directoryPath, suggestedFilename);
}

// 获取下载历史记录
ipcMain.handle('get-download-history', async () => {
  return loadDownloadHistory();
});

// 添加下载历史记录
ipcMain.handle('add-download-record', async (event, record) => {
  return addDownloadRecord(record);
});

// 删除下载历史记录
ipcMain.handle('delete-download-record', async (event, id) => {
  try {
    const history = loadDownloadHistory();
    const newHistory = history.filter(record => record.id !== id);
    return saveDownloadHistory(newHistory);
  } catch (err) {
    console.error('删除下载记录失败:', err);
    return false;
  }
});

// 清空下载历史记录
ipcMain.handle('clear-download-history', async () => {
  return saveDownloadHistory([]);
});

// 打开文件位置
ipcMain.handle('open-file-location', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

// 在应用退出前清理
app.on('will-quit', () => {
  logInfo("应用即将退出");
  // 可以在这里添加清理逻辑
});

// 新增: 获取应用版本号
ipcMain.handle('get-app-version', () => {
  try {
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    // 在开发环境中，app.getAppPath() 可能指向项目根目录，而在打包后指向 asar 文件内的 app 目录。
    // 需要兼容两种情况
    let finalPath = packageJsonPath;
    if (isDev) {
        // 开发环境下，package.json 在上一级目录
        finalPath = path.join(__dirname, '..', 'package.json');
    }
    
    if (fs.existsSync(finalPath)) {
      const packageJson = JSON.parse(fs.readFileSync(finalPath, 'utf-8'));
      logInfo(`成功读取应用版本号: ${packageJson.version}`);
      return packageJson.version;
    } else {
      logError(`package.json 文件未找到于: ${finalPath}`);
      return null;
    }
  } catch (error) {
    logError('读取应用版本号失败', error);
    return null;
  }
});

// 在应用启动时添加错误处理
process.on('uncaughtException', (error) => {
  logError('未捕获的异常', error);
});

