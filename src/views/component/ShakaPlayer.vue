<template>
  <div class="video-container">
    <!-- 视频播放器 -->
    <video
      id="videoElement"
      ref="videoRef"
      controls
      autoplay
      muted
      playsinline
      @click="handleVideoClick"
      @pause="handlePause"
      @play="handlePlay"
    />

    <!-- 状态指示器：加载中 / 错误提示 / 播放统计 -->
    <div class="status-indicator">
      <!-- 加载中提示（优先级最高） -->
      <span v-if="isLoading" class="loading"
        >加载中... ({{ loadingCountdown }}s)</span
      >

      <!-- 路径错误提示（加载失败后显示） -->
      <span v-else-if="showError" class="error">❌ 视频路径错误，无法加载</span>

      <!-- 正常播放统计（无加载/错误时显示） -->
      <span v-else-if="showStats" class="stats">
        播放位置: {{ currentTime.toFixed(2) }}s | 最新帧:
        {{ latestFrameTime.toFixed(2) }}s
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, onUnmounted } from "vue";
import flvjs from "flv.js";
// 父组件传递的视频流地址
const props = defineProps({
  src: {
    type: String,
    required: true,
    description: "FLV视频流地址",
  },
});

// -------------------------- 新增：状态管理（加载/错误） --------------------------
const isLoading = ref(true); // 是否处于加载中
const showError = ref(false); // 是否显示路径错误
const loadingCountdown = ref(3); // 加载倒计时（秒）
let countdownTimer: NodeJS.Timeout | null = null; // 倒计时定时器（需销毁防止内存泄漏）
let errorTimer: NodeJS.Timeout | null = null; // 错误延迟提示定时器

// 原有状态（保持不变）
const videoRef = ref<HTMLVideoElement | null>(null);
const flvPlayer = ref<any>(null);
const isPaused = ref(false);
const showStats = ref(true);
const currentTime = ref(0);
const latestFrameTime = ref(0);
const lastFrameTimestamp = ref(0);
const frameQueue = ref<number[]>([]);
const latestStreamTime = ref(0);

// 播放器默认配置（保持不变）
const playerConfig = {
  controls: true,
  autoplay: true,
  muted: true,
  lowLatencyMode: true,
  enableStashBuffer: false,
  liveBufferLen: 0.2,
  autoCleanupSourceBuffer: true,
  maxBufferLength: 0.5,
  hasAudio: false,
  hasVideo: true,
};

// -------------------------- 新增：清除定时器（防止内存泄漏） --------------------------
let reconnectAttempts = 0; // 重连尝试次数
let reconnectTimer: NodeJS.Timeout | null = null; // 重连定时器
const MAX_RECONNECT_ATTEMPTS = 3; // 最大重连次数
const RECONNECT_DELAY = 5000; // 重连延迟（毫秒）

const clearAllTimers = () => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (errorTimer) clearTimeout(errorTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  countdownTimer = null;
  errorTimer = null;
  reconnectTimer = null;
};

// -------------------------- 新增：初始化加载倒计时 --------------------------
const initLoadingCountdown = (delay: number) => {
  loadingCountdown.value = delay; // 初始倒计时时间（如3秒）
  // 每秒减少倒计时，直到为0
  countdownTimer = setInterval(() => {
    if (loadingCountdown.value > 0) {
      loadingCountdown.value -= 1;
    } else {
      clearInterval(countdownTimer!);
    }
  }, 1000);
};

// -------------------------- 新增：处理播放器错误（核心：路径错误判断） --------------------------
const handlePlayerError = (err: any) => {
  console.error("FLV播放器错误:", err);

  // 关键：检测视频元素本身是否进入错误状态
  const videoElement = videoRef.value;
  if (videoElement && videoElement.error) {
    console.error("视频元素错误状态:", videoElement.error.code, videoElement.error.message);
    // 视频元素已损坏，必须销毁并重建
    handleFatalError("视频流中断");
    return;
  }

  // 筛选"路径错误/连接失败"相关的错误类型
  const isPathError = [
    "NETWORK_ERROR",
    "MEDIA_ERROR",
    "LOAD_ERROR",
  ].includes(err?.type || err?.code || "");

  if (isPathError) {
    handleFatalError("网络连接失败");
  }
};

// -------------------------- 新增：致命错误处理（统一入口） --------------------------
const handleFatalError = (message: string) => {
  clearAllTimers();

  // 延迟显示错误提示，给重连一个机会
  errorTimer = setTimeout(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.warn(`检测到错误，${RECONNECT_DELAY / 1000}秒后尝试重新连接 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      reconnectTimer = setTimeout(() => {
        isLoading.value = true;
        showError.value = false;
        initFlvPlayer();
      }, RECONNECT_DELAY);
    } else {
      console.error(`已达到最大重连次数 (${MAX_RECONNECT_ATTEMPTS})，停止重连`);
      isLoading.value = false;
      showError.value = true;
    }
  }, 2000);
};

// 视频元素错误监听器引用（防止重复绑定）
let videoErrorHandler: (() => void) | null = null;
let videoEndedHandler: (() => void) | null = null;
let timeUpdateHandler: (() => void) | null = null;

const initFlvPlayer = () => {
  // 重置状态：每次初始化前清除错误和加载状态
  isLoading.value = true;
  showError.value = false;
  reconnectAttempts = 0;
  clearAllTimers();
  destroyFlvPlayer();

  if (!flvjs.isSupported()) {
    isLoading.value = false;
    showError.value = true;
    console.error("浏览器不支持FLV播放，请使用Chrome/Firefox");
    return;
  }

  const videoElement = videoRef.value;
  if (!videoElement) return;

  // 关键修复：重置视频元素的错误状态
  videoElement.removeAttribute("src");
  videoElement.load();

  // 初始化加载倒计时（3秒）
  initLoadingCountdown(3);

  // 移除旧的错误监听器（防止重复绑定）
  if (videoErrorHandler) {
    videoElement.removeEventListener("error", videoErrorHandler);
    videoErrorHandler = null;
  }
  if (videoEndedHandler) {
    videoElement.removeEventListener("ended", videoEndedHandler);
    videoEndedHandler = null;
  }
  if (timeUpdateHandler) {
    videoElement.removeEventListener("timeupdate", timeUpdateHandler);
    timeUpdateHandler = null;
  }

  // 关键：监听视频元素的 error 事件（捕获 appendBuffer 失败等底层错误）
  videoErrorHandler = () => {
    const err = videoElement.error;
    if (err) {
      console.error("视频元素错误 code:", err.code, "message:", err.message);
      // code 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
      if (err.code >= 2) {
        handleFatalError("视频解码失败");
      }
    }
  };
  videoElement.addEventListener("error", videoErrorHandler);

  // 监听 ended 事件（MediaSource onSourceEnded 场景）
  videoEndedHandler = () => {
    console.warn("视频流已结束 (ended)，尝试重连");
    handleFatalError("视频流中断");
  };
  videoElement.addEventListener("ended", videoEndedHandler);

  // 创建FLV播放器
  flvPlayer.value = flvjs.createPlayer(
    {
      type: "flv",
      url: props.src,
      isLive: true,
      hasAudio: playerConfig.hasAudio,
      hasVideo: playerConfig.hasVideo,
      lowLatencyMode: playerConfig.lowLatencyMode,
      frameTimestampCallback: (timestamp: number) => {
        lastFrameTimestamp.value = timestamp;
        latestFrameTime.value = Date.now() - timestamp;
        latestStreamTime.value = timestamp / 1000;
        manageFrameQueue(timestamp);
      },
    },
    {
      enableStashBuffer: playerConfig.enableStashBuffer,
      liveBufferLen: playerConfig.liveBufferLen,
      autoCleanupSourceBuffer: playerConfig.autoCleanupSourceBuffer,
      maxBufferLength: playerConfig.maxBufferLength,
    }
  );

  // 监听播放器错误事件
  flvPlayer.value.on("error", handlePlayerError);

  // 挂载视频元素、加载播放
  flvPlayer.value.attachMediaElement(videoElement);
  flvPlayer.value.load();
  flvPlayer.value
    .play()
    .then(() => {
      isLoading.value = false;
      showError.value = false;
      clearAllTimers();
    })
    .catch((err) => {
      console.warn("自动播放失败，请点击播放", err);
      isLoading.value = false;
    });

  // 监听时间更新
  timeUpdateHandler = () => {
    if (videoElement) currentTime.value = videoElement.currentTime;
  };
  videoElement.addEventListener("timeupdate", timeUpdateHandler);
};

// -------------------------- 原有函数（保持不变） --------------------------
const manageFrameQueue = (timestamp: number) => {
  frameQueue.value.push(timestamp);
  if (frameQueue.value.length > 10) frameQueue.value.shift();
};

const handlePause = () => {
  isPaused.value = true;
  console.log("视频已暂停，当前位置:", currentTime.value);
};

const handlePlay = () => {
  isPaused.value = false;
  console.log("视频恢复播放，尝试定位到最新帧");
  setTimeout(() => {
    seekToLatestFrame();
  }, 50);
};

const seekToLatestFrame = () => {
  const video = videoRef.value;
  if (!video || !flvPlayer.value) return;

  try {
    if (video.buffered.length > 0) {
      const latestBufferedTime = video.buffered.end(video.buffered.length - 1);
      if (latestBufferedTime > currentTime.value) {
        video.currentTime = latestBufferedTime;
        console.log("已定位到最新缓冲位置:", latestBufferedTime);
        return;
      }
    }
    if (lastFrameTimestamp.value > 0) {
      const latestStreamPos = latestStreamTime.value;
      video.currentTime = Math.max(0, latestStreamPos - 0.5);
      console.log("已定位到最新流位置:", video.currentTime);
    }
  } catch (error) {
    console.error("定位最新帧失败:", error);
  }
};

const handleVideoClick = () => {
  const video = videoRef.value;
  if (video) {
    if (video.paused || video.ended) {
      video.play().catch((err) => {
        console.warn("播放失败，请检查网络", err);
      });
    } else {
      video.pause();
    }
  }
};

const destroyFlvPlayer = () => {
  if (flvPlayer.value) {
    try {
      // 移除播放器错误监听
      flvPlayer.value.off("error", handlePlayerError);
      flvPlayer.value.pause();
      flvPlayer.value.unload();
      flvPlayer.value.detachMediaElement();
      flvPlayer.value.destroy();
    } catch (error) {
      console.warn("销毁播放器时出现错误:", error);
    } finally {
      flvPlayer.value = null;
    }
  }
  // 清除视频元素的事件监听
  const videoElement = videoRef.value;
  if (videoElement) {
    if (videoErrorHandler) {
      videoElement.removeEventListener("error", videoErrorHandler);
      videoErrorHandler = null;
    }
    if (videoEndedHandler) {
      videoElement.removeEventListener("ended", videoEndedHandler);
      videoEndedHandler = null;
    }
    if (timeUpdateHandler) {
      videoElement.removeEventListener("timeupdate", timeUpdateHandler);
      timeUpdateHandler = null;
    }
  }
};

// -------------------------- 原有：监听路径变化（保持不变） --------------------------
watch(
  () => props.src,
  (newUrl, oldUrl) => {
    if (newUrl && newUrl !== oldUrl) {
      console.log("视频流地址变化，重新加载播放器", newUrl);
      initFlvPlayer();
    }
  }
);

// -------------------------- 生命周期 --------------------------
let globalErrorHandler: ((event: ErrorEvent) => void) | null = null;

onMounted(() => {
  // 添加全局错误处理器，捕获 flv.js 内部错误
  globalErrorHandler = (event: ErrorEvent) => {
    if (event.message && event.message.includes('flushStashedSamples')) {
      console.warn("捕获到 flv.js 内部错误:", event.message);
      event.preventDefault();
      if (flvPlayer.value) {
        destroyFlvPlayer();
        setTimeout(() => initFlvPlayer(), 1000);
      }
    }
  };
  
  window.addEventListener('error', globalErrorHandler);
  initFlvPlayer();
});

// 组件卸载时清除所有资源（防止内存泄漏）
onBeforeUnmount(() => {
  if (globalErrorHandler) {
    window.removeEventListener('error', globalErrorHandler);
    globalErrorHandler = null;
  }
  clearAllTimers();
  destroyFlvPlayer();
});
</script>

<style scoped>
.video-container {
  position: relative;
}

video {
  background: #000;
  width: 100%;
  max-width: 1200px;
}

.status-indicator {
  position: absolute;
  bottom: 20px;
  left: 10px;
  font-size: 12px;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 10;
}

/* 加载中样式：青色文字 */
.status-indicator .loading {
  color: #40e0d0;
}

/* 错误提示样式：红色文字 + 加粗 */
.status-indicator .error {
  color: #ff4444;
  font-weight: bold;
}

/* 播放统计样式：默认白色 */
.status-indicator .stats {
  color: #ffffff;
}
</style>
