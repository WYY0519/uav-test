<template>
  <div class="video-player-container">
    <video ref="m3u8Video" controls :width="width" :height="height"></video>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  defineProps,
  defineEmits,
} from "vue";
import Hls from "hls.js";

// 定义 props
const props = defineProps({
  videoUrl: {
    type: String,
    required: true,
    validator: (value) => {
      return value.startsWith("http://") || value.startsWith("https://");
    },
  },
  width: {
    type: [Number, String],
    default: 800,
  },
  height: {
    type: [Number, String],
    default: 450,
  },
});

// 定义事件（使用 defineEmits 替代原来的 emit 导入）
const emit = defineEmits(["error"]);

// 视频元素引用
const m3u8Video = ref(null);
// HLS实例
const hls = ref(null);

// 初始化播放器
const initPlayer = () => {
  const video = m3u8Video.value;
  const { videoUrl } = props;

  video.src = "";

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoUrl;
    video.load();
  } else if (Hls.isSupported()) {
    if (hls.value) {
      hls.value.destroy();
    }
    hls.value = new Hls();
    hls.value.loadSource(videoUrl);
    hls.value.attachMedia(video);

    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log("M3U8视频解析成功，可播放");
    });

    hls.value.on(Hls.Events.ERROR, (event, data) => {
      console.error("HLS播放错误:", data);
      // 触发错误事件（使用 defineEmits 定义的 emit） 
      emit("error", new Error(`播放错误: ${data.details}`));
    });
  } else {
    const error = new Error("当前浏览器不支持播放M3U8格式视频");
    emit("error", error);
    alert(error.message);
  }
};

onMounted(() => {
  initPlayer();
});

onBeforeUnmount(() => {
  if (hls.value) {
    hls.value.destroy();
    hls.value = null;
  }
});

watch(
  () => props.videoUrl,
  () => {
    initPlayer();
  }
);
</script>

<style scoped>
.video-player-container {
  /* 组件样式 */
  position: relative;
}
video {
  background: #000;
  width: 100%;
  height: 100%;
}
</style>
