<template>
    <div class="video-container">
        <video id="videoElement" ref="videoRef" controls autoplay muted playsinline @click="handleVideoClick"
            @pause="handlePause" @play="handlePlay" />
        <div class="status-indicator">
            <span v-if="showStats" class="stats">
                播放位置: {{ currentTime.toFixed(2) }}s | 最新帧: {{ latestFrameTime.toFixed(2) }}s
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import flvjs from 'flv.js';

// 状态管理
const videoRef = ref<HTMLVideoElement | null>(null);
const flvPlayer = ref<any>(null);
const videoUrl = ref('ws://121.41.60.99:8082/live/test.live.flv');
const isPaused = ref(false);
const showStats = ref(true);
const currentTime = ref(0);
const latestFrameTime = ref(0);
const lastFrameTimestamp = ref(0);
const frameQueue = ref<number[]>([]); // 帧时间戳队列
const latestStreamTime = ref(0); // 最新流时间

// 初始化播放器
const initFlvPlayer = () => {
    if (!flvjs.isSupported()) {
        console.error('浏览器不支持FLV播放，请使用Chrome/Firefox');
        return;
    }

    const videoElement = videoRef.value;
    if (!videoElement) return;

    destroyFlvPlayer();

    // 核心配置：启用帧时间戳回调
    flvPlayer.value = flvjs.createPlayer(
        {
            type: 'flv',
            url: videoUrl.value,
            isLive: true,
            hasAudio: false,
            hasVideo: true,
            lowLatencyMode: true,

            // 获取最新帧时间戳
            frameTimestampCallback: (timestamp: number) => {
                lastFrameTimestamp.value = timestamp;
                latestFrameTime.value = Date.now() - timestamp;
                latestStreamTime.value = timestamp / 1000;
                manageFrameQueue(timestamp);
            }
        },
        {
            // 低延迟配置
            enableStashBuffer: false,
            liveBufferLen: 0.2,
            autoCleanupSourceBuffer: true,
            maxBufferLength: 0.5
        }
    );

    flvPlayer.value.attachMediaElement(videoElement);
    flvPlayer.value.load();
    flvPlayer.value.play().catch(err => {
        console.warn('自动播放失败，请点击播放', err);
    });

    // 监听时间更新
    videoElement.addEventListener('timeupdate', () => {
        if (videoElement) currentTime.value = videoElement.currentTime;
    });
};

// 管理帧时间戳队列
const manageFrameQueue = (timestamp: number) => {
    frameQueue.value.push(timestamp);
    if (frameQueue.value.length > 10) frameQueue.value.shift();
};

// 处理暂停事件
const handlePause = () => {
    isPaused.value = true;
    console.log('视频已暂停，当前位置:', currentTime.value);
};

// 处理播放事件 - 关键：自动追帧到最新位置
const handlePlay = () => {
    isPaused.value = false;
    console.log('视频恢复播放，尝试定位到最新帧');

    // 延迟50ms让播放器准备好
    setTimeout(() => {
        seekToLatestFrame();
    }, 50);
};

// 定位到最新帧
const seekToLatestFrame = () => {
    const video = videoRef.value;
    if (!video || !flvPlayer.value) return;

    try {
        // 方法1：直接跳到最新缓冲位置
        if (video.buffered.length > 0) {
            const latestBufferedTime = video.buffered.end(video.buffered.length - 1);
            if (latestBufferedTime > currentTime.value) {
                video.currentTime = latestBufferedTime;
                console.log('已定位到最新缓冲位置:', latestBufferedTime);
                return;
            }
        }

        // 方法2：根据帧时间戳计算最新位置（需要流元数据支持）
        if (lastFrameTimestamp.value > 0) {
            // 这里需要流的时间基准，假设流从0开始
            const latestStreamPos = latestStreamTime.value;
            video.currentTime = Math.max(0, latestStreamPos - 0.5); // 提前0.5秒避免缓冲不足
            console.log('已定位到最新流位置:', video.currentTime);
        }
    } catch (error) {
        console.error('定位最新帧失败:', error);
    }
};

// 点击播放处理
const handleVideoClick = () => {
    const video = videoRef.value;
    if (video) {
        if (video.paused || video.ended) {
            video.play().catch(err => {
                console.warn('播放失败，请检查网络', err);
            });
        } else {
            video.pause();
        }
    }
};

// 销毁播放器
const destroyFlvPlayer = () => {
    if (flvPlayer.value) {
        flvPlayer.value.pause();
        flvPlayer.value.unload();
        flvPlayer.value.detachMediaElement();
        flvPlayer.value.destroy();
        flvPlayer.value = null;
    }
};

// 生命周期钩子
onMounted(() => {
    initFlvPlayer();
});

onBeforeUnmount(() => {
    destroyFlvPlayer();
});
</script>

<style scoped>
.video-container {
    position: relative;
}

.status-indicator {
    position: absolute;
    bottom: 20px;
    left: 10px;
    font-size: 12px;
    color: white;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 4px 8px;
    border-radius: 4px;
    z-index: 10;
}
</style>