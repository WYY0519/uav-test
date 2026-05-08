<template>
  <div class="video-container">
    <!-- 视频播放器 -->
    <video id="videoElement" ref="videoRef" controls autoplay muted playsinline @click="handleVideoClick"
      @pause="handlePause" @play="handlePlay" />

    <!-- 状态指示器：加载中 / 错误提示 / 播放统计 -->
    <div class="status-indicator">
      <!-- 加载中提示（优先级最高） -->
      <span v-if="isLoading" class="loading">加载中... ({{ loadingCountdown }}s)</span>

      <!-- 路径错误提示（加载失败后显示） -->
      <span v-else-if="showError" class="error">❌ 播放失败，请检查流地址</span>

      <!-- 正常播放统计（无加载/错误时显示） -->
      <span v-else-if="showStats" class="stats">
        播放位置: {{ currentTime.toFixed(2) }}s | 最新帧:
        {{ latestFrameTime.toFixed(2) }}s
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import flvjs from "flv.js";

// 父组件传递的视频流地址
const props = defineProps({
  src: {
    type: String,
    required: true,
    description: "FLV视频流地址",
  },
});

// -------------------------- 状态管理 --------------------------
const isLoading = ref(true);
const showError = ref(false);
const loadingCountdown = ref(3);
let countdownTimer: NodeJS.Timeout | null = null;
let errorTimer: NodeJS.Timeout | null = null;

// 原有播放状态
const videoRef = ref<HTMLVideoElement | null>(null);
const flvPlayer = ref<any>(null);
const isPaused = ref(false);
const showStats = ref(true);
const currentTime = ref(0);
const latestFrameTime = ref(0);
const lastFrameTimestamp = ref(0);
const frameQueue = ref<number[]>([]);
const latestStreamTime = ref(0);

// 重连配置
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;

// 清空所有定时器
const clearAllTimers = () => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (errorTimer) clearTimeout(errorTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  countdownTimer = null;
  errorTimer = null;
  reconnectTimer = null;
};

// 加载倒计时
const initLoadingCountdown = (delay: number) => {
  loadingCountdown.value = delay;
  countdownTimer = setInterval(() => {
    if (loadingCountdown.value > 0) {
      loadingCountdown.value -= 1;
    } else {
      clearInterval(countdownTimer!);
    }
  }, 1000);
};

// 销毁播放器
const destroyFlvPlayer = () => {
  if (flvPlayer.value) {
    try {
      flvPlayer.value.pause();
      flvPlayer.value.unload();
      flvPlayer.value.detachMediaElement();
      flvPlayer.value.destroy();
    } catch { }
    flvPlayer.value = null;
  }
};

// -------------------------- 核心：兼容ws-flv 可播放配置（完全复刻文件2） --------------------------
const initFlvPlayer = () => {
  destroyFlvPlayer();
  clearAllTimers();
  isLoading.value = true;
  showError.value = false;
  reconnectAttempts = 0;

  if (!flvjs.isSupported()) {
    isLoading.value = false;
    showError.value = true;
    return;
  }

  const videoElement = videoRef.value;
  if (!videoElement) return;

  initLoadingCountdown(3);

  // 关键：使用文件2稳定兼容 ws-flv 的配置
  flvPlayer.value = flvjs.createPlayer(
    {
      type: "flv",
      url: props.src,
      isLive: true,
      hasAudio: false,
      hasVideo: true,
      frameTimestampCallback: (timestamp: number) => {
        lastFrameTimestamp.value = timestamp;
        latestFrameTime.value = Date.now() - timestamp;
        latestStreamTime.value = timestamp / 1000;
        manageFrameQueue(timestamp);
      },
    },
    {
      lazyLoad: false,
      enableStashBuffer: false,
      liveBufferLen: 0.1,
      maxBufferLength: 0.5,
      autoCleanupSourceBuffer: true,
      deferLoadAfterAttachMedia: false,
    }
  );

  // 关键：使用官方标准事件枚举（修复无法播放核心）
  // 播放错误监听
  flvPlayer.value.on(flvjs.ErrorTypes.ERROR, (err: any) => {
    console.error("FLV播放器错误:", err);
    handleReconnect();
  });

  // 流加载完成，关闭加载
  flvPlayer.value.on(flvjs.Events.LOADING_COMPLETE, () => {
    isLoading.value = false;
    showError.value = false;
    clearAllTimers();
  });

  flvPlayer.value.attachMediaElement(videoElement);
  flvPlayer.value.load();

  flvPlayer.value.play().catch(() => {
    isLoading.value = false;
    // 自动播放限制不直接报错，交由用户点击
  });

  // 时间更新监听
  videoElement.addEventListener("timeupdate", () => {
    if (videoElement) currentTime.value = videoElement.currentTime;
  });
};

// 重连逻辑
const handleReconnect = () => {
  clearAllTimers();
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.warn(`连接异常，${RECONNECT_DELAY / 1000}秒后重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    reconnectTimer = setTimeout(() => {
      initFlvPlayer();
    }, RECONNECT_DELAY);
  } else {
    isLoading.value = false;
    showError.value = true;
  }
};

// 原有帧队列、追帧、事件逻辑
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
        return;
      }
    }
    if (lastFrameTimestamp.value > 0) {
      const latestStreamPos = latestStreamTime.value;
      video.currentTime = Math.max(0, latestStreamPos - 0.5);
    }
  } catch (error) {
    console.error("定位最新帧失败:", error);
  }
};

const handleVideoClick = () => {
  const video = videoRef.value;
  if (!video) return;
  video.paused ? video.play() : video.pause();
};

// 监听地址切换
watch(
  () => props.src,
  (newUrl, oldUrl) => {
    if (newUrl && newUrl !== oldUrl) {
      initFlvPlayer();
    }
  }
);

// 生命周期
onMounted(() => {
  initFlvPlayer();
});

onBeforeUnmount(() => {
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

.loading {
  color: #40e0d0;
}

.error {
  color: #ff4444;
  font-weight: bold;
}

.stats {
  color: #ffffff;
}
</style>