<template>
  <div class="drone-monitor">
    <!-- 地图容器：加了底图占位，彻底杜绝白屏视觉 -->
    <div class="map-container" ref="mapContainer"></div>

    <!-- loading 仅初始化显示 -->
    <Transition name="loading-fade">
      <div v-if="isMapLoading" class="map-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">
            <span class="loading-main">地图加载中</span>
            <span class="loading-sub">正在加载瓦片数据...</span>
          </div>
        </div>
      </div>
    </Transition>
    <!-- 👇 把切换框粘贴在这里 👇 -->
    <div class="map-layer-switcher">
      <el-select
        v-model="mapLayerType"
        @change="onMapLayerChange"
        size="default"
        style="width: 130px"
      >
        <el-option label="标准地图" value="normal" />
        <el-option label="卫星地图" value="satellite" />
        <el-option label="卫星混合" value="satelliteMix" />
      </el-select>
    </div>

    <!-- 搜索框 -->
    <div class="search-container">
      <el-select
        v-model="queryLocation"
        placeholder="请输入地址（如：郑州/北京）"
        clearable
        filterable
        allow-create
        @change="handleSelectChange"
        @input="handleInput"
        :filter-method="() => true"
        class="search-select"
      >
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>

    <!-- 天气弹窗（保留你的原有组件） -->
    <WeatherDialog
      :visible="dialogVisible"
      :position="clickPosition"
      @update:visible="dialogVisible = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { debounce } from "lodash";
// 替换为你自己的坐标转换工具路径
import {
  gcj02towgs84,
  validateLatLng,
  wgs84togcj02,
} from "@/utils/coordTransform";
// 替换为你自己的弹窗组件路径
import WeatherDialog from "../components/weatherInquiry/WeatherDialog.vue";

// 全局变量
let droneMarker = null;
let trackPolyline = null;
const mapContainer = ref(null);
let map = null;

// 默认中心点（南京）- 注意：这里要用GCJ02坐标！
const DEFAULT_NJ_LNG = 118.796875;
const DEFAULT_NJ_LAT = 32.060253;

// 响应式数据
const queryLocation = ref("");
const options = ref([]);
const drawnPoints = ref([]);
const dialogVisible = ref(false);
const clickPosition = ref({
  lng: "", // 最终对外展示/使用的WGS84坐标
  lat: "",
  gcjLng: "", // 保留高德原始GCJ02坐标（用于地图定位）
  gcjLat: "",
});
const isMapLoading = ref(false);
let loadingTimer = null;
const mapLayerType = ref("satelliteMix"); // 默认卫星混合
// ===================== 搜索逻辑 =====================
const handleInput = (param) => {
  let inputValue;
  if (param instanceof InputEvent) {
    inputValue = param.target.value.trim();
  } else {
    inputValue = String(param).trim();
  }
  queryLocation.value = inputValue;

  // 校验是否是经纬度
  if (validateLatLng(inputValue)) {
    options.value = [];
    return;
  }
  debouncedSearch(inputValue);
};

// 防抖搜索（500ms）
const debouncedSearch = debounce((keyword) => {
  if (keyword && keyword.length >= 1) {
    searchLocation(keyword);
  } else {
    options.value = [];
  }
}, 500);

// 调用地址搜索接口（核心修复：严格校验location类型）
const searchLocation = async (keyword) => {
  const safeKeyword = String(keyword).trim();
  if (!safeKeyword) {
    options.value = [];
    return;
  }
  if (validateLatLng(safeKeyword)) {
    options.value = [];
    return;
  }

  try {
    // 固定定位参考点（郑州）- GCJ02坐标
    const position = { latitude: 34.74769, longitude: 113.65337 };
    const url = `https://digital-elevation.djigate.com/amap-proxy/e9faf6/v3/assistant/inputtips?keywords=${safeKeyword}&location=${position.longitude},${position.latitude}&language=zh-CN`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.tips || data.tips.length === 0) {
      ElMessage.info("未找到匹配地点");
      options.value = [];
      return;
    }

    // 严格过滤：仅保留 location 是字符串且包含逗号的项
    const validTips = data.tips.filter((item) => {
      return (
        item.location &&
        typeof item.location === "string" &&
        item.location.includes(",")
      );
    });

    if (validTips.length === 0) {
      ElMessage.warning("未找到有效的地点坐标");
      options.value = [];
      return;
    }

    // 转换坐标并构建选项（加try-catch兜底）
    options.value = validTips
      .map((item) => {
        try {
          // 1. 接口返回的是GCJ02坐标，先解析
          const [gcjLng, gcjLat] = item.location.split(",").map(Number);
          // 校验经纬度是否为有效数字
          if (isNaN(gcjLng) || isNaN(gcjLat)) {
            throw new Error("经纬度不是有效数字");
          }
          // 2. 转换为WGS84（供外部使用）
          const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);
          return {
            value: item.id || item.name, // 兜底：无id时用name作为value
            label: item.name,
            location: `${wgsLng},${wgsLat}`, // WGS84坐标（对外）
            gcjLocation: `${gcjLng},${gcjLat}`, // 保留GCJ02坐标（地图用）
            originalLocation: item.location,
          };
        } catch (error) {
          console.warn("单个地址解析失败：", item.name, error);
          return null;
        }
      })
      .filter(Boolean); // 过滤掉解析失败的null项

    // 最终兜底
    if (options.value.length === 0) {
      ElMessage.warning("未找到可解析的地址坐标");
    }
  } catch (error) {
    console.error("搜索接口报错：", error);
    ElMessage.error("地址搜索失败，请重试");
    options.value = []; // 报错时清空选项
  }
};

// ===================== 核心：跨城无白屏跳转 =====================
const smoothMoveToLocation = (gcjLng, gcjLat) => {
  if (!map) return;

  // 优化：直接平移+缩放，避免先缩小导致的白屏
  // 1. 同时设置中心点和缩放级别，使用平滑动画
  map.setZoomAndCenter(15, [gcjLng, gcjLat], 1500);

  // 显示提示信息
  ElMessage.info("正在跳转到目标位置...");
};

// ===================== 选择地址后跳转 =====================
const handleSelectChange = (value) => {
  // 处理经纬度输入
  const latLng = validateLatLng(value);
  if (latLng) {
    const { lng: wgsLng, lat: wgsLat } = latLng;
    // 关键：如果用户输入的是WGS84经纬度，要转换为GCJ02给地图用
    const [gcjLng, gcjLat] = wgs84togcj02(wgsLng, wgsLat);

    drawnPoints.value.push({
      lng: wgsLng,
      lat: wgsLat,
      gcjLng,
      gcjLat,
      isFromApi: true,
    });

    drawSelectedMarker(gcjLng, gcjLat, `经纬度：${wgsLng},${wgsLat}`);
    smoothMoveToLocation(gcjLng, gcjLat);

    // 移动标记点（用GCJ02坐标）
    if (droneMarker) {
      droneMarker.setPosition([gcjLng, gcjLat]);
    }

    // 对外展示WGS84坐标，保留GCJ02坐标
    clickPosition.value = {
      lng: wgsLng.toFixed(6),
      lat: wgsLat.toFixed(6),
      gcjLng: gcjLng.toFixed(6),
      gcjLat: gcjLat.toFixed(6),
    };
    dialogVisible.value = true;
    return;
  }

  // 处理地址选择
  if (!value || !options.value.length) return;
  const selectedItem = options.value.find((item) => item.value === value);
  if (!selectedItem) {
    ElMessage.warning("未找到该地点的坐标信息");
    return;
  }

  // 解析WGS84坐标（对外展示）和GCJ02坐标（地图操作）
  const [wgsLng, wgsLat] = selectedItem.location?.split(",").map(Number) || [];
  const [gcjLng, gcjLat] =
    selectedItem.gcjLocation?.split(",").map(Number) || [];

  if (
    !wgsLng ||
    !wgsLat ||
    !gcjLng ||
    !gcjLat ||
    isNaN(gcjLng) ||
    isNaN(gcjLat)
  ) {
    ElMessage.error("坐标格式错误");
    return;
  }

  drawnPoints.value.push({
    lng: wgsLng,
    lat: wgsLat,
    gcjLng,
    gcjLat,
    isFromApi: true,
  });

  drawSelectedMarker(gcjLng, gcjLat, selectedItem.label);
  smoothMoveToLocation(gcjLng, gcjLat);

  // 移动标记点（用GCJ02坐标）
  if (droneMarker) {
    droneMarker.setPosition([gcjLng, gcjLat]);
  }

  // 对外展示WGS84坐标，保留GCJ02坐标
  clickPosition.value = {
    lng: wgsLng.toFixed(6),
    lat: wgsLat.toFixed(6),
    gcjLng: gcjLng.toFixed(6),
    gcjLat: gcjLat.toFixed(6),
  };
};

// 绘制标记（用GCJ02坐标）
const drawSelectedMarker = (gcjLng, gcjLat, label) => {
  console.log(`绘制标记：${label}，GCJ02坐标：${gcjLng},${gcjLat}`);
  // 如需实际绘制marker，可在这里补充代码
  if (!map) return;

  // 示例：创建/更新无人机标记（确保用GCJ02坐标）
  if (!droneMarker) {
    droneMarker = new AMap.Marker({
      position: [gcjLng, gcjLat],
      title: label,
      map: map,
    });
  } else {
    droneMarker.setPosition([gcjLng, gcjLat]);
    droneMarker.setTitle(label);
  }
};

// ===================== 地图事件（核心修复：坐标转换） =====================
const handleMapClick = (e) => {
  // 1. 获取高德地图返回的原始GCJ02坐标
  const gcjLng = e.lnglat.getLng();
  const gcjLat = e.lnglat.getLat();

  // 2. 转换为WGS84坐标（对外展示/业务使用）
  const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);

  // 3. 格式化坐标（保留6位小数）
  const formatWgsLng = wgsLng.toFixed(6);
  const formatWgsLat = wgsLat.toFixed(6);
  const formatGcjLng = gcjLng.toFixed(6);
  const formatGcjLat = gcjLat.toFixed(6);

  // 4. 更新点击位置坐标：对外展示WGS84，保留GCJ02供地图使用
  clickPosition.value = {
    lng: formatWgsLng,
    lat: formatWgsLat,
    gcjLng: formatGcjLng,
    gcjLat: formatGcjLat,
  };

  // 5. 打开天气对话框
  dialogVisible.value = true;

  // 控制台打印调试信息（对比两种坐标）
  console.log("地图点击坐标：");
  console.log("GCJ02（火星坐标）：", formatGcjLng, formatGcjLat);
  console.log("WGS84（地球坐标）：", formatWgsLng, formatWgsLat);

  // 6. 移动无人机标记到点击位置（必须用GCJ02坐标！）
  if (droneMarker) {
    droneMarker.setLngLat(new AMap.LngLat(gcjLng, gcjLat));
  }
};

const handleMapZoom = () => {
  if (map) console.log("当前缩放级别：", map.getZoom());
};

const handleMapMove = () => {};

// ===================== 初始化地图（核心：2D模式） =====================
const initMapInstance = () => {
  try {
    isMapLoading.value = true;

    // 初始化地图：强制2D模式，杜绝WebGL白屏
    // 注意：地图的center必须用GCJ02坐标！
    map = new AMap.Map(mapContainer.value, {
      zoom: 15, // 默认缩放级别
      center: [DEFAULT_NJ_LNG, DEFAULT_NJ_LAT], // 南京GCJ02坐标
      viewMode: "2D", // 2D视图（关键）
      renderMode: "2d", // 2D渲染（关键，消除白屏）
      showLabel: true, // 显示标注
      pitch: 0, // 俯仰角0
      rotateEnable: false, // 禁止旋转
      pitchEnable: false, // 禁止俯仰
      // 图层：卫星图+路网（可改为普通图层）
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
      resizeEnable: true, // 自适应容器大小
      animateEnable: true, // 启用动画
      dragEnable: true, // 允许拖拽
      zoomEnable: true, // 允许缩放
      scrollWheel: true, // 允许滚轮缩放
    });

    // 初始化轨迹线（保留你的原有逻辑）
    trackPolyline = new AMap.Polyline({
      path: null,
      strokeColor: "#2C64A7",
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });

    // 绑定地图事件
    map.on("click", handleMapClick);
    map.on("zoomend", handleMapZoom);
    map.on("moveend", handleMapMove);

    // 瓦片加载完成关闭loading
    map.on("tilesload", () => {
      isMapLoading.value = false;
    });

    // 超时兜底关闭loading
    loadingTimer = setTimeout(() => {
      isMapLoading.value = false;
    }, 3000);

    // 地图初始化完成提示
    map.on("complete", () => {
      console.log("地图初始化完成");
      ElMessage.success("地图加载成功");
      isMapLoading.value = false;
    });
  } catch (error) {
    console.error("地图初始化报错：", error);
    ElMessage.error("地图加载失败，请刷新页面");
    isMapLoading.value = false;
  }
};

// 初始化地图入口
const initMap = () => {
  if (!window.AMap) {
    ElMessage.error("高德地图API加载失败，请检查配置");
    return;
  }
  initMapInstance();
};
// 切换地图图层
const onMapLayerChange = (val) => {
  if (!map) return;

  let layers = [];
  let label = "";

  switch (val) {
    case "normal":
      layers = [new AMap.TileLayer()];
      label = "标准地图";
      break;
    case "satellite":
      layers = [new AMap.TileLayer.Satellite()];
      label = "卫星地图";
      break;
    case "satelliteMix":
      layers = [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()];
      label = "卫星混合";
      break;
  }

  map.setLayers(layers);
  ElMessage.success("已切换 → " + label);
};
// ===================== 生命周期 =====================
onMounted(() => {
  // 初始化地图
  initMap();
  // 调整容器样式（保留你的原有逻辑）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) pageContent.classList.add("current-page-no-padding");
});

onBeforeUnmount(() => {
  // 清理定时器
  if (loadingTimer) clearTimeout(loadingTimer);
  // 恢复样式（保留你的原有逻辑）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) pageContent.classList.remove("current-page-no-padding");
});
</script>

<style scoped>
/* 主容器 */
.drone-monitor {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

/* 地图容器：加底图占位，彻底杜绝白屏 */
.map-container {
  width: 100%;
  height: 100%;
  /* 中国地图底图占位（可替换为自己的CDN地址） */
  background: url("https://img.alicdn.com/imgextra/i2/O1CN017z5H9g1c5s8z8Q759_!!6000000003555-2-tps-1920-1080.jpg")
    center/cover no-repeat;
  background-color: #e8e8e8; /* 兜底背景色 */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

/* 搜索框样式 */
.search-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  width: 300px;
}
/* 地图图层切换悬浮框 */
.map-layer-switcher {
  position: fixed !important;
  top: 84px !important;
  right: 20px !important;
  z-index: 9999999 !important;
  background: #fff !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
}
.search-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* Loading样式 */
.map-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 28px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e6ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: loading-spin 0.8s linear infinite;
}

.loading-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loading-main {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.loading-sub {
  font-size: 12px;
  color: #909399;
}

/* 加载动画 */
@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.loading-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, -45%);
}

.loading-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -55%);
}
</style>
