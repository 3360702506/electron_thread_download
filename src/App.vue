<script setup>
import Downloader from './components/Downloader.vue'
import { ref, onMounted, watch } from 'vue';

// 历史记录数据
const downloadHistory = ref([]);
const isLoadingHistory = ref(false);

// 当前活动标签
const activeTab = ref('download');

// 线程选项
const threadOptions = ref(['1', '2', '4', '8']);
const selectedThreadIndex = ref(2); // 默认选择4
const showThreadDropdown = ref(false);

// 通知设置
const notifyOnComplete = ref(true);
const minimizeToTray = ref(false);

// 输入URL和路径引用，用于重新下载
const downloadUrl = ref('');
const savePath = ref('');
const threadCount = ref(parseInt(threadOptions.value[selectedThreadIndex.value], 10));

// 标题栏功能
function minimizeWindow() {
  if (window.electronAPI && window.electronAPI.minimizeWindow) {
    window.electronAPI.minimizeWindow();
  }
}

function maximizeWindow() {
  if (window.electronAPI && window.electronAPI.maximizeWindow) {
    window.electronAPI.maximizeWindow();
  }
}

function closeWindow() {
  if (window.electronAPI && window.electronAPI.closeWindow) {
    window.electronAPI.closeWindow();
  }
}

// 最小化到托盘
function minimizeToTrayFunc() {
  if (window.electronAPI && window.electronAPI.minimizeToTray) {
    window.electronAPI.minimizeToTray();
  }
}

// 切换标签
function switchTab(tab) {
  if (tab !== activeTab.value) {
    activeTab.value = tab;
    
    // 如果切换到历史标签，刷新历史记录
    if (tab === 'history') {
      loadDownloadHistory();
    }
    
    // 如果切换回下载标签，确保之前的下载状态可见
    if (tab === 'download' && downloadUrl.value) {
      // 保持现有状态，不做特殊处理
      // Vue的keep-alive会自动保留组件状态
    }
  }
}

// 创建按钮涟漪效果
function createRipple(event) {
  const button = event.currentTarget;
  
  // 已有涟漪元素则先移除
  const ripples = button.getElementsByClassName('ripple');
  for (let i = 0; i < ripples.length; i++) {
    button.removeChild(ripples[i]);
  }
  
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add('ripple');
  
  button.appendChild(circle);
  
  // 动画结束后移除元素
  setTimeout(() => {
    if (circle && circle.parentNode) {
      circle.parentNode.removeChild(circle);
    }
  }, 600);
}

// 切换线程下拉框
function toggleThreadDropdown() {
  showThreadDropdown.value = !showThreadDropdown.value;
}

// 选择线程选项
function selectThreadOption(index) {
  selectedThreadIndex.value = index;
  showThreadDropdown.value = false;
  // 保存选择的线程数
  if (window.electronAPI && window.electronAPI.saveSettings) {
    window.electronAPI.saveSettings({
      defaultThreadCount: parseInt(threadOptions.value[index], 10)
    });
  }
}

// 切换通知设置
function toggleNotification() {
  notifyOnComplete.value = !notifyOnComplete.value;
  // 保存设置
  if (window.electronAPI && window.electronAPI.saveSettings) {
    window.electronAPI.saveSettings({
      notifyOnComplete: notifyOnComplete.value
    });
  }
}

// 切换最小化到托盘设置
function toggleMinimizeToTray() {
  minimizeToTray.value = !minimizeToTray.value;
  // 保存设置
  if (window.electronAPI && window.electronAPI.setMinimizeToTray) {
    window.electronAPI.setMinimizeToTray(minimizeToTray.value);
  }
}

// 加载下载历史
async function loadDownloadHistory() {
  if (window.electronAPI) {
    try {
      isLoadingHistory.value = true;
      const history = await window.electronAPI.getDownloadHistory();
      downloadHistory.value = history;
    } catch (err) {
      console.error('加载下载历史失败:', err);
    } finally {
      isLoadingHistory.value = false;
    }
  }
}

// 删除下载记录
async function deleteDownloadRecord(id) {
  if (window.electronAPI && window.electronAPI.deleteDownloadRecord) {
    try {
      const success = await window.electronAPI.deleteDownloadRecord(id);
      if (success) {
        // 更新本地列表
        downloadHistory.value = downloadHistory.value.filter(record => record.id !== id);
      }
    } catch (err) {
      console.error('删除下载记录失败:', err);
    }
  }
}

// 清空所有历史记录
async function clearAllHistory() {
  if (window.electronAPI && window.electronAPI.clearDownloadHistory) {
    try {
      const success = await window.electronAPI.clearDownloadHistory();
      if (success) {
        downloadHistory.value = [];
      }
    } catch (err) {
      console.error('清空下载历史失败:', err);
    }
  }
}

// 打开文件位置
function openFileLocation(filePath) {
  if (window.electronAPI && window.electronAPI.openFileLocation) {
    window.electronAPI.openFileLocation(filePath);
  }
}

// 重新下载文件
function redownloadFile(record) {
  // 设置URL和路径
  downloadUrl.value = record.url;
  savePath.value = record.filePath || '';
  threadCount.value = parseInt(threadOptions.value[selectedThreadIndex.value], 10);
  
  // 切换到下载标签
  switchTab('download');
}

// 加载设置
async function loadSettings() {
  if (window.electronAPI && window.electronAPI.getSettings) {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings) {
        if (settings.notifyOnComplete !== undefined) {
          notifyOnComplete.value = settings.notifyOnComplete;
        }
        if (settings.minimizeToTray !== undefined) {
          minimizeToTray.value = settings.minimizeToTray;
        }
        // 加载默认线程数
        if (settings.defaultThreadCount !== undefined) {
          const savedThreadCount = settings.defaultThreadCount.toString();
          const index = threadOptions.value.indexOf(savedThreadCount);
          if (index !== -1) {
            selectedThreadIndex.value = index;
          } else {
            // 如果保存的线程数不在选项中，则尝试添加到选项或使用默认值
            // 这里简单处理，如果不在列表中，则使用列表中的第一个作为默认值
            selectedThreadIndex.value = 0; 
            console.warn(`保存的线程数 ${savedThreadCount} 不在预设选项中，已重置为默认值。`);
          }
        } else {
            // 如果设置中没有这个值，确保 selectedThreadIndex 指向一个有效值
            // 通常在初始化时已经设置了，这里是额外的保护
            if (selectedThreadIndex.value < 0 || selectedThreadIndex.value >= threadOptions.value.length) {
                selectedThreadIndex.value = threadOptions.value.indexOf('4') !== -1 ? threadOptions.value.indexOf('4') : 0;
            }
        }
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  }
}

// 组件挂载时加载历史记录和设置
onMounted(async () => {
  loadDownloadHistory();
  loadSettings();

  // 点击外部关闭下拉框
  document.addEventListener('click', (e) => {
    if (e.target && !e.target.closest('.custom-select')) {
      showThreadDropdown.value = false;
    }
  });

  // 从 package.json 获取版本号
  if (window.electronAPI && window.electronAPI.getAppVersion) {
    const version = await window.electronAPI.getAppVersion();
    if (version) {
      appInfo.version = version;
    }
  }
});

// 关于页面信息
const appInfo = {
  author: 'Wu',
  version: '1.0.0', // 将由 onMounted 更新
  contact: 'QQ: 3031688968',
  description: '这是一款基于Electron和Vue 3开发的多线程下载工具，可以通过多个线程同时下载文件，提高下载速度，支持断点续传和下载历史管理。'
};
</script>

<template>
  <div class="app-container">
    <!-- 自定义标题栏 -->
    <div class="title-bar">
      <div class="title-bar-left">
        <div class="app-icon-small">⚡</div>
        <span class="title-bar-text">多线程下载器</span>
      </div>
      <div class="title-bar-controls">
        <button class="title-bar-button minimize" @click="minimizeWindow" title="最小化"></button>
        <button class="title-bar-button tray" @click="minimizeToTrayFunc" title="最小化到托盘"></button>
        <button class="title-bar-button maximize" @click="maximizeWindow" title="最大化"></button>
        <button class="title-bar-button close" @click="closeWindow" title="关闭"></button>
      </div>
    </div>
    
    <!-- 主体内容区 -->
    <div class="app-body">
      <!-- 侧边导航 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="app-icon">⚡</div>
          <span class="app-title">多线程下载器</span>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-menu">
            <div 
              class="nav-item" 
              :class="{ 'active': activeTab === 'download' }" 
              @click="switchTab('download')"
              @mousedown="createRipple"
            >
              <div class="nav-icon">↓</div>
              <span>新建下载</span>
            </div>
            <div 
              class="nav-item" 
              :class="{ 'active': activeTab === 'history' }" 
              @click="switchTab('history')"
              @mousedown="createRipple"
            >
              <div class="nav-icon">✓</div>
              <span>下载历史</span>
            </div>
            <div 
              class="nav-item" 
              :class="{ 'active': activeTab === 'settings' }" 
              @click="switchTab('settings')"
              @mousedown="createRipple"
            >
              <div class="nav-icon">⚙️</div>
              <span>设置</span>
            </div>
            <div
              class="nav-item"
              :class="{ 'active': activeTab === 'about' }"
              @click="switchTab('about')"
              @mousedown="createRipple"
            >
              <div class="nav-icon">ℹ️</div>
              <span>关于</span>
            </div>
          </div>
        </nav>
      </aside>
      
      <!-- 主内容区 -->
      <main class="main-content">
        <transition name="fade-transform" mode="out-in">
          <Downloader 
            v-if="activeTab === 'download'" 
            :initialUrl="downloadUrl" 
            :initialSavePath="savePath" 
            :initialThreadCount="parseInt(threadOptions[selectedThreadIndex], 10)"
          />
        </transition>
        <transition name="fade-transform" mode="out-in">
          <section v-if="activeTab === 'history'" class="content-section history-section">
            <div class="history-container">
              <div class="section-header">
                <h2 class="section-title">下载历史</h2>
                <button class="action-btn delete-btn" @mousedown="createRipple" @click="clearAllHistory">
                  清空历史
                </button>
              </div>
              
              <div v-if="isLoadingHistory" class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载历史记录中...</p>
              </div>
              
              <div v-else-if="downloadHistory.length === 0" class="empty-history">
                <div class="empty-icon">📋</div>
                <p>暂无下载历史记录</p>
              </div>
              
              <div v-else class="history-table-container">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th width="18%">文件名</th>
                      <th width="8%">大小</th>
                      <th width="24%">URL</th>
                      <th width="24%">保存路径</th>
                      <th width="8%">状态</th>
                      <th width="8%">日期</th>
                      <th width="10%">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="isLoadingHistory">
                      <td colspan="7" class="loading-placeholder">正在加载历史记录...</td>
                    </tr>
                    <tr v-else-if="downloadHistory.length === 0">
                      <td colspan="7" class="no-history-placeholder">暂无下载记录</td>
                    </tr>
                    <tr v-for="item in downloadHistory" :key="item.id">
                      <td class="cell-filename" :title="item.filename">{{ item.filename }}</td>
                      <td>{{ item.size }}</td>
                      <td class="cell-url" :title="item.url">{{ item.url }}</td>
                      <td class="cell-path" :title="item.filePath">{{ item.filePath }}</td>
                      <td>
                        <fluent-badge :appearance="item.status === '已完成' ? 'filled' : 'ghost'">
                          {{ item.status }}
                        </fluent-badge>
                      </td>
                      <td>{{ item.date }}</td>
                      <td class="cell-actions">
                        <fluent-button appearance="stealth" @click="openFileLocation(item.filePath)" title="打开文件位置">
                          <div class="button-icon">📂</div>
                        </fluent-button>
                        <fluent-button appearance="stealth" @click="redownloadFile(item)" title="重新下载">
                          <div class="button-icon">🔄</div>
                        </fluent-button>
                        <fluent-button appearance="stealth" @click="deleteDownloadRecord(item.id)" title="删除记录">
                          <div class="button-icon">🗑️</div>
                        </fluent-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </transition>
        <transition name="fade-transform" mode="out-in">
          <section v-if="activeTab === 'settings'" class="content-section settings-section">
            <div class="settings-container">
              <h2 class="section-title">设置</h2>
              <div class="settings-group">
                <h3 class="settings-title">通用设置</h3>
                <div class="setting-item">
                  <label for="notify-complete">下载完成后通知</label>
                  <fluent-switch id="notify-complete" :checked="notifyOnComplete" @change="toggleNotification"></fluent-switch>
                </div>
                <div class="setting-item">
                  <label for="minimize-tray">最小化到系统托盘</label>
                  <fluent-switch id="minimize-tray" :checked="minimizeToTray" @change="toggleMinimizeToTray"></fluent-switch>
                </div>
                <!-- 其他设置 -->
              </div>
              
              <div class="settings-group">
                <h3 class="settings-title">下载设置</h3>
                <div class="setting-item">
                  <label for="thread-count-select">默认下载线程数</label>
                  <div class="custom-select" @click="toggleThreadDropdown">
                    <div class="selected-option">
                      {{ threadOptions[selectedThreadIndex] }} 线程
                      <span class="dropdown-arrow" :class="{ 'up': showThreadDropdown }">▼</span>
                    </div>
                    <transition name="fade-dropdown">
                      <div v-if="showThreadDropdown" class="options-container">
                        <div 
                          v-for="(option, index) in threadOptions" 
                          :key="index" 
                          class="option-item"
                          :class="{ 'selected': index === selectedThreadIndex }"
                          @click.stop="selectThreadOption(index)"
                        >
                          {{ option }} 线程
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
                <!-- 更多下载设置 -->
              </div>
            </div>
          </section>
        </transition>
        <transition name="fade-transform" mode="out-in">
          <section v-if="activeTab === 'about'" class="content-section about-section">
            <fluent-card class="content-card">
              <h2 class="section-title">
                <div class="title-icon">ℹ️</div>
                关于 多线程下载器
              </h2>
              <div class="about-info">
                <div class="info-item">
                  <span class="info-label">作者:</span>
                  <span class="info-value">{{ appInfo.author }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">版本:</span>
                  <span class="info-value">{{ appInfo.version }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">联系方式:</span>
                  <span class="info-value">{{ appInfo.contact }}</span>
                </div>
              </div>
              <p class="about-description">
                {{ appInfo.description }}
              </p>
            </fluent-card>
          </section>
        </transition>
      </main>
    </div>
    
    <!-- 状态栏 -->
    <footer class="status-bar">
      <div class="status-item">就绪</div>
      <div class="status-item">线程: {{ threadOptions[selectedThreadIndex] }}</div>
      <div class="status-item">版本: 1.0.0</div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #0078d4;
  --secondary-color: #106ebe;
  --background-color: #f5f5f5;
  --sidebar-color: #ffffff;
  --border-color: #e0e0e0;
  --text-color: #323130;
  --text-secondary: #605e5c;
  --hover-color: rgba(0, 120, 212, 0.1);
  --active-color: rgba(0, 120, 212, 0.2);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14);
  --shadow-md: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
  --radius-sm: 4px;
  --radius-md: 8px;
  --title-bar-height: 32px;
  --title-bar-color: #f0f0f0;
  --status-bar-color: #f0f0f0;
  --title-bar-text: #333333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--text-color);
  background-color: var(--background-color);
  overflow: hidden;
  height: 100vh;
  margin: 0;
  font-size: 14px;
}

#app {
  width: 100%;
  height: 100vh;
  padding: 0;
}

/* 标题栏样式 */
.title-bar {
  height: var(--title-bar-height);
  background-color: var(--title-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  -webkit-app-region: drag;
  user-select: none;
  color: var(--title-bar-text);
  border-bottom: 1px solid var(--border-color);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.title-bar-left {
  display: flex;
  align-items: center;
}

.app-icon-small {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 12px;
  color: var(--primary-color);
}

.title-bar-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--title-bar-text);
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.title-bar-button {
  width: 36px;
  height: 32px;
  border: none;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
}

.title-bar-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.title-bar-button.close:hover {
  background-color: #e81123;
}

.title-bar-button.minimize::before {
  content: '';
  width: 10px;
  height: 1px;
  background-color: #333;
  position: absolute;
}

.title-bar-button.maximize::before {
  content: '';
  width: 10px;
  height: 10px;
  border: 1px solid #333;
  box-sizing: border-box;
}

.title-bar-button.tray::before {
  content: '▽';
  font-size: 10px;
  color: #333;
}

.title-bar-button.close::before,
.title-bar-button.close::after {
  content: '';
  width: 12px;
  height: 1px;
  background-color: #333;
  position: absolute;
}

.title-bar-button.close::before {
  transform: rotate(45deg);
}

.title-bar-button.close::after {
  transform: rotate(-45deg);
}

.title-bar-button.close:hover::before,
.title-bar-button.close:hover::after {
  background-color: white;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* 主体内容区样式 */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 220px;
  background-color: var(--sidebar-color);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.app-icon {
  width: 32px;
  height: 32px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.nav-item {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 14px;
  border-left: 3px solid transparent;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.nav-item:hover {
  background-color: var(--hover-color);
  color: var(--primary-color);
  transform: translateX(2px);
}

.nav-item.active {
  background-color: var(--active-color);
  color: var(--primary-color);
  font-weight: 500;
  border-left: 3px solid var(--primary-color);
}

.nav-icon {
  width: 24px;
  height: 24px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 14px;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: var(--background-color);
}

.content-card {
  background-color: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  position: relative;
  min-height: 400px;
}

.tab-content {
  padding: 24px;
}

/* 确保transition容器正确定位 */
.content-card > .fade-container {
  position: relative;
}

/* 切换动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all .3s ease-out;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 历史记录样式 */
.section-title {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
}

.history-table-container {
  overflow-x: auto;
  max-width: 100%;
  margin-top: 20px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.history-table th, 
.history-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-table th {
  background-color: var(--neutral-layer-2);
  font-weight: 600;
  color: var(--neutral-foreground-2);
}

.file-info {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: var(--primary-color);
}

.file-url {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.status-badge {
  display: inline-block;
  background-color: #dff6dd;
  color: #107c10;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
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
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-btn:hover {
  background-color: var(--active-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.delete-btn {
  color: #d83b01;
  background-color: rgba(216, 59, 1, 0.1);
}

.delete-btn:hover {
  background-color: rgba(216, 59, 1, 0.2);
}

/* 设置样式 */
.settings-group {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  background-color: #fafafa;
  box-shadow: var(--shadow-sm);
}

.setting-item {
  display: flex;
  margin-bottom: 20px;
  align-items: center;
  padding: 5px 0;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  width: 150px;
  font-weight: 500;
  display: block;
  color: var(--primary-color);
  font-size: 14px;
}

.setting-control {
  flex: 1;
  display: flex;
  align-items: center;
  height: 36px;
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

/* 自定义下拉框样式 */
.custom-select {
  position: relative;
  width: 100%;
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  animation: dropdown-show 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}

@keyframes dropdown-show {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.select-option {
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.select-option:hover {
  background-color: var(--hover-color);
  transform: translateX(2px);
}

.select-option.selected {
  background-color: var(--active-color);
  color: var(--primary-color);
  font-weight: 500;
}

/* 开关组件新样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 22px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 22px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* 状态栏样式 */
.status-bar {
  height: 28px;
  background-color: var(--status-bar-color);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 12px;
  color: var(--text-color);
}

.status-item {
  margin-right: 16px;
}

/* 按钮涟漪效果 */
.action-btn, .nav-item {
  position: relative;
  overflow: hidden;
}

.ripple {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  transform: scale(0);
  animation: ripple 0.6s linear;
  pointer-events: none;
  z-index: 10;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* 按钮悬停状态下的变换 */
.action-btn:hover {
  background-color: var(--active-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 历史记录头部样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 加载动画 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 120, 212, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空历史记录状态 */
.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-secondary);
  background-color: #fafafa;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-color);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-history p {
  font-size: 16px;
}

/* 关于页面样式 */
.about-section {
  padding: 20px;
}

.about-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 1em;
}

.info-label {
  font-weight: 600;
  color: var(--neutral-foreground-2);
  width: 100px;
  margin-right: 10px;
}

.info-value {
  color: var(--neutral-foreground-1);
}

.about-description {
  font-size: 0.95em;
  color: var(--neutral-foreground-2);
  line-height: 1.6;
}

/* 设置页面样式调整 */
.settings-section {
  padding: 20px;
}

.settings-group {
  margin-bottom: 30px;
  background-color: var(--neutral-layer-2);
  padding: 20px;
  border-radius: var(--layer-corner-radius);
  box-shadow: var(--elevation-shadow-card-rest);
}

.settings-title {
  font-size: 1.3em;
  font-weight: 600;
  color: var(--neutral-foreground-1);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--neutral-stroke-divider-rest);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--neutral-stroke-layer-rest);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-size: 1em;
  color: var(--neutral-foreground-2);
}

/* 自定义下拉选择器 */
.custom-select {
  position: relative;
  display: inline-block;
  min-width: 150px;
  cursor: pointer;
  background-color: var(--neutral-fill-input-rest);
  border: 1px solid var(--neutral-stroke-input-rest);
  border-radius: var(--control-corner-radius);
  padding: 8px 12px;
  color: var(--neutral-foreground-rest);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.custom-select:hover {
  border-color: var(--neutral-stroke-input-hover);
  background-color: var(--neutral-fill-input-hover);
}

.selected-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-arrow {
  font-size: 0.8em;
  transition: transform 0.2s ease;
}

.dropdown-arrow.up {
  transform: rotate(180deg);
}

.options-container {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--neutral-layer-floating);
  border: 1px solid var(--neutral-stroke-overlay-rest);
  border-top: none;
  border-radius: 0 0 var(--control-corner-radius) var(--control-corner-radius);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: var(--elevation-shadow-flyout);
}

.option-item {
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.option-item:hover {
  background-color: var(--neutral-fill-stealth-hover);
}

.option-item.selected {
  background-color: var(--accent-fill-stealth-selected);
  color: var(--accent-foreground-rest);
  font-weight: 600;
}

/* 过渡动画 */
.fade-dropdown-enter-active, .fade-dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-dropdown-enter-from, .fade-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* 涟漪效果 */
.nav-item .ripple {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  animation: ripple-animation 0.6s linear;
  transform: scale(0);
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* 整体布局和主题化 */
:root {
  /* Fluent UI Design Tokens (示例，您可以根据需要调整) */
  --accent-fill-rest: #0078d4;
  --accent-fill-hover: #106ebe;
  --accent-fill-active: #005a9e;
  --accent-foreground-rest: #0078d4;
  --accent-foreground-hover: #106ebe;
  --accent-foreground-active: #005a9e;
  --accent-foreground-cut-rest: #ffffff;
  
  --neutral-fill-input-rest: #ffffff;
  --neutral-fill-input-hover: #f0f0f0;
  --neutral-stroke-input-rest: #D1D1D1;
  --neutral-stroke-input-hover: #A1A1A1;

  --neutral-fill-stealth-rest: transparent;
  --neutral-fill-stealth-hover: rgba(0, 0, 0, 0.06);
  --neutral-fill-stealth-active: rgba(0, 0, 0, 0.10);
  --accent-fill-stealth-rest: rgba(0, 120, 212, 0.1);
  --accent-fill-stealth-selected: rgba(0, 120, 212, 0.15);


  --neutral-foreground-rest: #333333;
  --neutral-foreground-1: #242424;
  --neutral-foreground-2: #484848;
  --neutral-foreground-3: #707070;
  --neutral-foreground-disabled: #A1A1A1;

  --neutral-stroke-divider-rest: #E1E1E1;
  --neutral-stroke-layer-rest: #F0F0F0;
  --neutral-stroke-overlay-rest: #C1C1C1;


  --neutral-layer-1: #ffffff;
  --neutral-layer-2: #f8f8f8;
  --neutral-layer-floating: #ffffff;

  --control-corner-radius: 4px;
  --layer-corner-radius: 6px;

  --elevation-shadow-card-rest: 0 1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.05);
  --elevation-shadow-flyout: 0 4px 8px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1);
}

/* 暗黑模式 (如果需要) */
/* @media (prefers-color-scheme: dark) { ... } */


body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  background-color: var(--neutral-layer-1);
  color: var(--neutral-foreground-1);
  overflow: hidden;
  user-select: none;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 自定义标题栏样式 */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  background-color: var(--neutral-layer-2);
  padding: 0 8px;
  border-bottom: 1px solid var(--neutral-stroke-divider-rest);
  -webkit-app-region: drag;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.title-bar-left {
  display: flex;
  align-items: center;
}

.app-icon-small {
  font-size: 1.2em;
  margin-right: 8px;
  color: var(--accent-foreground-rest);
}

.title-bar-text {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--neutral-foreground-1);
}

.title-bar-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.title-bar-button {
  width: 36px;
  height: 32px;
  border: none;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
}

.title-bar-button:hover {
  background-color: var(--neutral-fill-stealth-hover);
}

.title-bar-button:active {
  background-color: var(--neutral-fill-stealth-active);
}

/* 使用伪元素创建按钮图标 */
.title-bar-button::before {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  background-color: var(--neutral-foreground-2);
}

.title-bar-button.minimize::before {
  height: 1px;
  margin-top: 5px;
}

.title-bar-button.tray::before {
  content: '▽';
  font-size: 10px;
  color: #333;
}


.title-bar-button.maximize::before {
  width: 8px;
  height: 8px;
  border: 1px solid var(--neutral-foreground-2);
  background-color: transparent;
}

.title-bar-button.close::before,
.title-bar-button.close::after {
  content: '';
  width: 12px;
  height: 1px;
  background-color: #333;
  position: absolute;
}
.title-bar-button.close:hover {
  background-color: #e81123;
}
.title-bar-button.close:hover::before,
.title-bar-button.close:hover::after {
  background-color: white;
}


.app-body {
  display: flex;
  flex-grow: 1;
  padding-top: 32px;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: var(--neutral-layer-2);
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--neutral-stroke-divider-rest);
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  padding: 0 5px;
}

.app-icon {
  font-size: 2em;
  margin-right: 12px;
  color: var(--accent-foreground-rest);
}

.app-title {
  font-size: 1.2em;
  font-weight: 600;
  color: var(--neutral-foreground-1);
}

.main-content {
  flex-grow: 1;
  padding: 0;
  background-color: var(--neutral-layer-1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content-section {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}


.content-card {
  background-color: var(--neutral-layer-1);
  padding: 25px;
  border-radius: var(--layer-corner-radius);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 1.6em;
  font-weight: 600;
  color: var(--neutral-foreground-1);
  margin-bottom: 25px;
  display: flex;
  align-items: center;
}

.title-icon {
  font-size: 1.2em;
  margin-right: 10px;
  color: var(--accent-foreground-rest);
}

/* 确保fluent组件使用变量 */
fluent-button {
}

fluent-text-field::part(control) {
  border-radius: var(--control-corner-radius);
  border: 1px solid var(--neutral-stroke-input-rest);
}
fluent-text-field::part(control):hover {
  border-color: var(--neutral-stroke-input-hover);
}
fluent-text-field::part(control):focus-within {
 border-color: var(--accent-fill-active);
 box-shadow: 0 0 0 1px var(--accent-fill-active);
}

fluent-slider::part(thumb-container) {
}
fluent-slider::part(track-start) {
}

fluent-progress {
  width: 100%;
}

fluent-badge {
}

fluent-switch::part(thumb), fluent-switch::part(track) {
}
fluent-switch[aria-checked="true"]::part(thumb) {
}
fluent-switch[aria-checked="true"]::part(track) {
}

/* 历史记录表格优化 */
.history-table-container {
  overflow-x: auto;
  max-width: 100%;
  margin-top: 20px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.history-table th, 
.history-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-filename {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-url {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-path {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-actions {
  width: 120px !important;
  white-space: nowrap;
  text-align: center;
  min-width: 120px !important;
}

.cell-actions fluent-button {
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  padding: 2px !important;
  margin: 0 2px !important;
}

.button-icon {
  font-size: 16px;
  line-height: 1;
}

.loading-placeholder, .no-history-placeholder {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: var(--text-secondary);
}
</style>
