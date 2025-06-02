<template>
  <div class="downloader-container">
    <h2 class="section-title">新建下载</h2>
    
    <div class="form-container">
      <!-- 下载链接 -->
      <div class="form-group">
        <label>下载链接</label>
        <div class="input-with-button">
          <input
            type="text"
            v-model="url"
            placeholder="请输入HTTP/HTTPS链接"
            class="text-field full-width"
          />
          <button class="action-btn" @click="pasteUrl">粘贴</button>
        </div>
      </div>
      
      <!-- 保存路径 -->
      <div class="form-group">
        <label>保存位置</label>
        <div class="input-with-button">
          <input
            type="text"
            :value="savePath"
            placeholder="选择文件保存位置"
            readonly
            class="text-field full-width"
          />
          <button class="action-btn" @click="selectSavePath">浏览...</button>
        </div>
      </div>
      
      <!-- 线程数量 -->
      <div class="form-group">
        <label>线程数量: {{ threadCount }}</label>
        <div class="slider-container">
          <input
            type="range"
            v-model="threadCount"
            min="1"
            max="10"
            step="1"
            class="slider-input"
          />
          <div class="slider-labels">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="form-actions">
        <button 
          class="action-btn primary-btn" 
          @click="startDownload" 
          :disabled="isDownloading || !isFormValid"
        >
          开始下载
        </button>
        <button 
          class="action-btn" 
          @click="cancelDownload" 
          :disabled="!isDownloading"
        >
          取消
        </button>
      </div>
    </div>
    
    <!-- 下载进度 -->
    <div v-if="isDownloading || downloadComplete" class="progress-container">
      <div class="progress-header">
        <h3>下载进度</h3>
        <span class="progress-percent" v-if="!isPreparing">{{ Math.floor(totalProgress) }}%</span>
        <span class="progress-status" v-else>准备中...</span>
      </div>
      
      <div v-if="isPreparing" class="preparing-indicator">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>正在分析下载内容，请稍候...</p>
      </div>
      
      <div v-else class="progress-bar-container">
        <div class="progress-bar" :style="{ width: totalProgress + '%' }"></div>
      </div>
      
      <div v-if="downloadComplete" class="complete-message">
        <div class="status-badge success">下载完成</div>
        <span>文件已保存至: {{ savePath }}</span>
        <button class="action-btn" @click="openFileLocation">查看文件</button>
      </div>
      
      <div v-if="isDownloading && !isPreparing" class="threads-container">
        <div class="threads-header">
          <h4>线程状态</h4>
          <span class="threads-count">{{ Object.keys(threadProgress).length }}个线程</span>
        </div>
        
        <div class="threads-grid">
          <div
            v-for="(progress, index) in threadProgress" 
            :key="index" 
            class="thread-item"
          >
            <div class="thread-header">
              <span>线程 {{ index + 1 }}</span>
              <span>{{ Math.floor(progress) }}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.downloader-container {
  width: 100%;
}

.section-title {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
}

.form-container {
  background-color: #fafafa;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
  color: var(--primary-color);
}

.input-with-button {
  display: flex;
  align-items: center;
}

.full-width {
  width: 100%;
  margin-right: 8px;
}

.text-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-right: 8px;
  font-size: 14px;
  outline: none;
  transition: border 0.2s ease;
}

.text-field:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.action-btn {
  background-color: var(--hover-color);
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  margin-right: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--primary-color);
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--active-color);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn {
  background-color: var(--primary-color);
  color: white;
}

.primary-btn:hover {
  background-color: var(--secondary-color);
}

.slider-container {
  padding: 0 4px;
}

.slider-input {
  width: 100%;
  -webkit-appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 4px;
  outline: none;
  margin: 10px 0;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 20px;
  gap: 8px;
}

.progress-container {
  background-color: #fafafa;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
}

.progress-percent {
  font-weight: 600;
  color: var(--primary-color);
}

.progress-bar-container {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.complete-message {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.complete-message span {
  margin-left: 8px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #dff6dd;
  color: #107c10;
}

.threads-container {
  margin-top: 20px;
}

.threads-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.threads-header h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
}

.threads-count {
  font-size: 12px;
  color: #666;
}

.threads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.thread-item {
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.thread-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 8px;
}

.error-message {
  display: flex;
  align-items: flex-start;
  background-color: #fde7e9;
  border: 1px solid #f1707b;
  border-radius: var(--radius-md);
  padding: 12px;
  margin-top: 16px;
  box-shadow: var(--shadow-sm);
}

.error-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #d13438;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
}

.error-message p {
  margin: 0;
  font-size: 14px;
  color: #d13438;
}

.preparing-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 12px;
}

.loading-dots {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--primary-color);
  animation: blink 1.4s infinite both;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% {
    transform: scale(0.5);
  }
  40% {
    transform: scale(1);
  }
}
</style>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

// 接收通知设置，以及可能的下载URL和路径
const props = defineProps({
  notifyOnComplete: {
    type: Boolean,
    default: true
  },
  initialUrl: {
    type: String,
    default: ''
  },
  initialSavePath: {
    type: String,
    default: ''
  },
  initialThreadCount: {
    type: Number,
    default: 4
  }
});

const url = ref('');
const savePath = ref('');
const threadCount = ref(4);
const isPreparing = ref(false);
const isDownloading = ref(false);
const downloadComplete = ref(false);
const error = ref('');
const totalProgress = ref(0);
const threadProgress = ref({});

// 监听传入的初始值
watch(() => props.initialUrl, (newVal) => {
  if (newVal) {
    url.value = newVal;
  }
}, { immediate: true });

watch(() => props.initialSavePath, (newVal) => {
  if (newVal) {
    savePath.value = newVal;
  }
}, { immediate: true });

watch(() => props.initialThreadCount, (newVal) => {
  if (newVal && !isNaN(newVal)) {
    threadCount.value = newVal;
  }
}, { immediate: true });

// 表单有效性检查
const isFormValid = computed(() => {
  return url.value && savePath.value && threadCount.value > 0;
});

// 粘贴URL
async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      url.value = text;
    }
  } catch (err) {
    console.error('无法读取剪贴板:', err);
  }
}

// 选择保存路径
async function selectSavePath() {
  if (window.electronAPI) {
    try {
      const path = await window.electronAPI.selectSavePath(url.value);
      if (path) {
        savePath.value = path;
      }
    } catch (err) {
      console.error('选择保存路径失败:', err);
      error.value = '选择保存路径失败: ' + err.message;
    }
  }
}

// 开始下载
async function startDownload() {
  if (!isFormValid.value) return;
  
  try {
    error.value = '';
    isPreparing.value = true;
    isDownloading.value = true;
    downloadComplete.value = false;
    totalProgress.value = 0;
    threadProgress.value = {};
    
    // 更新任务栏进度条
    if (window.electronAPI) {
      window.electronAPI.setProgressBar(0.01); // 设置一个初始值，表示开始下载
    }
    
    // 调用主进程开始下载
    const result = await window.electronAPI.startDownload({
      url: url.value,
      filePath: savePath.value,
      threadCount: threadCount.value
    });
    
    // 检查下载是否成功启动
    if (!result.success) {
      throw new Error(result.error || '下载启动失败');
    }
    
  } catch (err) {
    console.error('下载错误:', err);
    error.value = err.message || '下载过程中发生错误';
    isPreparing.value = false;
    isDownloading.value = false;
    
    // 重置任务栏进度条
    if (window.electronAPI) {
      window.electronAPI.setProgressBar(-1);
    }
  }
}

// 取消下载
function cancelDownload() {
  // 当前简单实现，后续可添加取消下载的逻辑
  isDownloading.value = false;
  isPreparing.value = false;
  downloadComplete.value = false;
  
  // 重置任务栏进度条
  if (window.electronAPI) {
    window.electronAPI.setProgressBar(-1);
  }
}

// 保存路径更新处理函数
function handleSavePathUpdated(data) {
  if (data.oldPath === savePath.value) {
    savePath.value = data.newPath;
  }
}

// 下载准备处理函数
function handleDownloadPreparing() {
  isPreparing.value = true;
}

// 下载进度处理函数
function handleDownloadProgress(data) {
  isPreparing.value = false;
  
  // 更新总进度
  totalProgress.value = data.progress;
  
  // 更新线程进度
  if (data.workerId !== undefined && data.workerProgress !== undefined) {
    threadProgress.value = {
      ...threadProgress.value,
      [data.workerId]: data.workerProgress
    };
  }
}

// 下载错误处理函数
function handleDownloadError(data) {
  error.value = `下载错误: ${data.error || '未知错误'}`;
  isDownloading.value = false;
  isPreparing.value = false;
  
  // 重置任务栏进度条
  if (window.electronAPI) {
    window.electronAPI.setProgressBar(-1);
  }
}

// 下载完成处理函数
function handleDownloadComplete(data) {
  isDownloading.value = false;
  isPreparing.value = false;
  downloadComplete.value = true;
  totalProgress.value = 100;
  
  // 通知已经由主进程发送，这里不需要再发送
  // 通知由main.js中直接发送，避免重复
}

// 打开文件位置
function openFileLocation() {
  if (window.electronAPI && savePath.value) {
    // 使用IPC向主进程发送请求打开文件位置
    window.electronAPI.openFileLocation(savePath.value);
  }
}

// 组件挂载时设置事件监听
onMounted(() => {
  setupEventListeners();
});

// 激活时重新设置事件监听
function setupEventListeners() {
  if (window.electronAPI) {
    // 监听下载进度
    window.electronAPI.onDownloadProgress(handleDownloadProgress);
    
    // 监听下载错误
    window.electronAPI.onDownloadError(handleDownloadError);
    
    // 监听下载完成
    window.electronAPI.onDownloadComplete(handleDownloadComplete);
    
    // 监听下载准备状态
    window.electronAPI.onDownloadPreparing(handleDownloadPreparing);
    
    // 监听保存路径更新
    window.electronAPI.onSavePathUpdated(handleSavePathUpdated);
  }
}

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  // 这里应该移除事件监听，但由于preload.js中的监听器
  // 已经提供了移除的方法，这里不需要重复实现
});
</script> 