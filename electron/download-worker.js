const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const { url, filePath, startByte, endByte, workerId } = workerData;

// 立即发送启动消息
parentPort.postMessage({ 
  type: 'start', 
  workerId 
});

// 确保目标目录存在
try {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
} catch (err) {
  parentPort.postMessage({ 
    type: 'error', 
    error: `创建目录失败: ${err.message}` 
  });
  process.exit(1);
}

// 计算此工作线程需要下载的字节数
const bytesToDownload = endByte - startByte + 1;
let downloadedBytes = 0;
let lastProgressTime = Date.now();

function sendProgress() {
  const progress = (downloadedBytes / bytesToDownload) * 100;
  parentPort.postMessage({ 
    type: 'progress', 
    progress, 
    workerId,
    downloadedBytes,
    totalBytes: bytesToDownload
  });
  lastProgressTime = Date.now();
}

// 定期发送进度更新（即使没有新数据），防止UI卡住
const progressInterval = setInterval(() => {
  if (Date.now() - lastProgressTime > 1000) { // 如果超过1秒没有更新进度
    sendProgress();
  }
}, 1000);

// 选择合适的协议
const protocol = url.startsWith('https') ? https : http;

const options = {
  headers: {
    Range: `bytes=${startByte}-${endByte}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  timeout: 30000 // 30秒超时
};

// 创建临时文件路径
const tempFilePath = `${filePath}.part${workerId}`;

// 在请求前进行一次清理，防止文件已存在导致问题
try {
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
} catch (err) {
  console.error(`清理旧临时文件失败: ${err.message}`);
}

// 创建请求
const req = protocol.get(url, options, (response) => {
  // 检查HTTP状态码
  if (response.statusCode >= 400) {
    parentPort.postMessage({ 
      type: 'error', 
      error: `服务器返回错误，状态码: ${response.statusCode}` 
    });
    clearInterval(progressInterval);
    process.exit(1);
    return;
  }

  // 如果服务器不支持范围请求，但返回了200（整个文件）
  if (response.statusCode === 200 && workerId > 0) {
    parentPort.postMessage({ 
      type: 'error', 
      error: `服务器不支持范围请求，无法进行多线程下载` 
    });
    clearInterval(progressInterval);
    process.exit(1);
    return;
  }

  // 打开临时文件准备写入
  const fileStream = fs.createWriteStream(tempFilePath);

  // 处理数据块
  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    
    // 每接收到数据块就发送进度更新
    if (downloadedBytes % (1024 * 100) === 0) { // 每100KB更新一次进度
      sendProgress();
    }
  });

  // 处理错误
  fileStream.on('error', (error) => {
    parentPort.postMessage({ 
      type: 'error', 
      error: `文件写入错误: ${error.message}` 
    });
    
    // 清理临时文件
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (err) {
      console.error(`清理临时文件失败: ${err.message}`);
    }
    
    clearInterval(progressInterval);
    process.exit(1);
  });

  // 将响应流导入文件流
  response.pipe(fileStream);

  // 完成下载
  fileStream.on('finish', () => {
    fileStream.close();
    
    // 将临时文件数据写入到主文件的正确位置
    try {
      const fd = fs.openSync(filePath, 'r+');
      const buffer = fs.readFileSync(tempFilePath);
      fs.writeSync(fd, buffer, 0, buffer.length, startByte);
      fs.closeSync(fd);
      
      // 删除临时文件
      fs.unlinkSync(tempFilePath);
      
      sendProgress(); // 发送最终进度
      parentPort.postMessage({ 
        type: 'complete', 
        workerId 
      });
      clearInterval(progressInterval);
      process.exit(0); // 成功退出
    } catch (err) {
      parentPort.postMessage({ 
        type: 'error', 
        error: `合并文件片段失败: ${err.message}` 
      });
      clearInterval(progressInterval);
      process.exit(1);
    }
  });
});

// 处理请求错误
req.on('error', (error) => {
  parentPort.postMessage({ 
    type: 'error', 
    error: `请求错误: ${error.message}` 
  });
  
  // 清理临时文件
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (err) {
    console.error(`清理临时文件失败: ${err.message}`);
  }
  
  clearInterval(progressInterval);
  process.exit(1);
});

// 设置请求超时
req.setTimeout(30000, () => {
  req.abort();
  parentPort.postMessage({ 
    type: 'error', 
    error: '请求超时' 
  });
  clearInterval(progressInterval);
  process.exit(1);
}); 