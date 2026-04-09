<template>
  <el-dialog
    v-model="internalVisible"
    :title="currentLogFile"
    width="80%"
    destroy-on-close
    @close="handleClose"
    :modal="true"
    :append-to-body="true"
    :close-on-click-modal="true"
  >
    <div class="dialog-content">
      <div class="content-wrapper">
        <div class="map-section">
          <div class="drone-monitor">
            <div class="map-container" ref="mapContainer">
              <div class="map-type-selector">
                <el-select
                  v-model="mapType"
                  @change="handleMapTypeChange"
                  :disabled="!mapLoaded"
                >
                  <el-option label="标准地图" value="standard" />
                  <el-option label="卫星地图" value="satellite" />
                  <el-option label="卫星混合" value="hybrid" />
                </el-select>
              </div>

              <!-- 飞行控制面板（可拖动进度条） -->
              <div
                v-if="mapLoaded && routeData.length > 0"
                class="flight-control-panel"
              >
                <div class="progress-slider">
                  <span class="progress-text">
                    {{ currentPointIndex + 1 }} / {{ totalPoints }}
                  </span>
                  <el-slider
                    v-model="currentPointIndex"
                    :max="totalPoints - 1"
                    :step="1"
                    @change="handleSliderChange"
                    class="slider"
                  />
                </div>

                <div class="flight-buttons">
                  <el-button
                    type="primary"
                    size="small"
                    @click="
                      isPlaying ? pauseFlightPlayback() : startFlightPlayback()
                    "
                  >
                    <el-icon
                      ><VideoPause v-if="isPlaying" /><VideoPlay v-else
                    /></el-icon>
                    {{ isPlaying ? "暂停" : "播放" }}
                  </el-button>

                  <el-button
                    type="danger"
                    size="small"
                    @click="stopFlightPlayback"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>

                <div class="speed-control">
                  <span class="speed-label">速度:</span>
                  <el-radio-group
                    v-model="playbackSpeed"
                    size="small"
                    @change="setPlaybackSpeed"
                  >
                    <el-radio-button :label="0.5">0.5x</el-radio-button>
                    <el-radio-button :label="1">1x</el-radio-button>
                    <el-radio-button :label="2">2x</el-radio-button>
                    <el-radio-button :label="4">4x</el-radio-button>
                  </el-radio-group>
                </div>
              </div>

              <!-- 飞行信息面板 -->
              <div
                v-if="mapLoaded && routeData.length > 0"
                class="flight-info-panel"
              >
                <div class="flight-info-header">
                  <span class="info-title">飞行数据</span>
                  <el-tag size="small" :type="isPlaying ? 'success' : 'info'">
                    {{ isPlaying ? "飞行中" : "已暂停" }}
                  </el-tag>
                </div>
                <div class="flight-info-content">
                  <div class="info-row">
                    <div class="info-item">
                      <span class="info-label">飞行航向</span>
                      <span class="info-value">
                        {{ currentFlightInfo.heading }}°
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">飞行模式</span>
                      <span class="info-value mode">
                        {{ currentFlightInfo.flightMode }}
                      </span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="info-label">油门量</span>
                      <span class="info-value">
                        {{ currentFlightInfo.throttle }}%
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">卫星数</span>
                      <span class="info-value">
                        <el-icon><Location /></el-icon>
                        {{ currentFlightInfo.satellites }}
                      </span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="info-label">电压</span>
                      <span class="info-value voltage">
                        {{ currentFlightInfo.voltage }}V
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">飞行高度</span>
                      <span class="info-value altitude">
                        {{ currentFlightInfo.altitude }}m
                      </span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="info-label">飞行速度</span>
                      <span class="info-value speed">
                        {{ currentFlightInfo.speed }}m/s
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">飞行时间</span>
                      <span class="info-value">
                        {{ currentFlightInfo.flightTime }}
                      </span>
                    </div>
                  </div>
                  <div class="info-row full">
                    <div class="info-item">
                      <span class="info-label">经纬度</span>
                      <span class="info-value coords">
                        {{ currentFlightInfo.coordinates }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!mapLoaded" class="map-loading">
              <el-icon :size="32"><Loading /></el-icon>
              <p>地图加载中...</p>
            </div>
            <div v-if="mapError" class="map-error">
              <el-icon :size="32"><Warning /></el-icon>
              <p>{{ mapError }}</p>
              <el-button type="primary" @click="retryInitMap">
                重新加载
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from "vue";
import { getLogContent } from "@/api/log";
import { ElMessage } from "element-plus";
import {
  Loading,
  Warning,
  Location,
  VideoPause,
  VideoPlay,
  RefreshLeft,
} from "@element-plus/icons-vue";

// 导入飞机图片
import planeIcon from "@/assets/航空飞机.png";

let map = null;
let droneMarker = null;
let routeMarkers = [];
let routePolyline = null;
let flightAnimation = null;

const props = defineProps({
  visible: { type: Boolean, default: false },
  logFilename: { type: String, required: true },
});

const emit = defineEmits(["update:visible", "close"]);
const internalVisible = ref(false);
const currentLogFile = ref("");
const mapContainer = ref(null);
const routeData = ref([]);
const mapLoaded = ref(false);
const mapError = ref("");
const mapType = ref("hybrid");

const isPlaying = ref(false);
const playbackSpeed = ref(1);
const currentPointIndex = ref(0);
const totalPoints = ref(0);

const currentFlightInfo = ref({
  heading: 0,
  flightMode: "--",
  throttle: 0,
  satellites: 0,
  voltage: 0,
  altitude: 0,
  speed: 0,
  flightTime: "00:00",
  coordinates: "--",
});

let standardLayer, satelliteLayer, roadNetLayer;

// WGS84转火星坐标
const wgs84ToGcj02 = (lng, lat) => {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  const magic = Math.sin(radLat);
  const magic2 = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic2);
  const dLat2 =
    (dLat * 180.0) / (((a * (1 - ee)) / (magic2 * sqrtMagic)) * Math.PI);
  const dLng2 = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lng: lng + dLng2, lat: lat + dLat2 };
};

const transformLat = (x, y) => {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
};

const transformLng = (x, y) => {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
};

// 初始化地图
const initMap = async () => {
  if (map) {
    map.destroy();
    map = null;
  }
  mapLoaded.value = false;
  mapError.value = "";

  await new Promise((resolve) => {
    const check = () => (window.AMap ? resolve() : setTimeout(check, 50));
    check();
  });

  await nextTick();
  await nextTick();

  if (!mapContainer.value) return;

  map = new AMap.Map(mapContainer.value, {
    zoom: 5,
    center: [113.65644, 34.78723],
    resizeEnable: true,
    viewMode: "2D",
  });

  standardLayer = new AMap.TileLayer();
  satelliteLayer = new AMap.TileLayer.Satellite();
  roadNetLayer = new AMap.TileLayer.RoadNet();

  await new Promise((resolve) => {
    map.on("complete", resolve);
    setTimeout(resolve, 2000);
  });

  mapLoaded.value = true;
  handleMapTypeChange(mapType.value);
  await loadLogContent();
};

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      currentLogFile.value = props.logFilename;
      internalVisible.value = true;

      await nextTick();
      await nextTick();
      await new Promise((r) => setTimeout(r, 300));

      await initMap();
      map?.resize();
    } else {
      internalVisible.value = false;
    }
  },
  { deep: true, immediate: true },
);

// 加载日志并解析航线
const loadLogContent = async () => {
  try {
    const res = await getLogContent(props.logFilename);
    if (res?.code !== 200) return;

    let arr = [];
    if (Array.isArray(res.data)) {
      arr = res.data;
    } else if (typeof res.data === "string") {
      try {
        arr = JSON.parse(res.data);
      } catch {}
    }

    const points = [];
    arr.forEach((item) => {
      try {
        const record = typeof item === "string" ? JSON.parse(item) : item;
        const gps = record?.status?.global_position_int;
        const ts = record?.timestamp;
        if (!gps) return;

        let lon = Number(gps.lon);
        let lat = Number(gps.lat);
        if (!isFinite(lon) || !isFinite(lat) || lon === 0 || lat === 0) return;

        if (Math.abs(lon) > 180) lon /= 1e7;
        if (Math.abs(lat) > 90) lat /= 1e7;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return;

        const gcj = wgs84ToGcj02(lon, lat);
        points.push({
          longitude: gcj.lng,
          latitude: gcj.lat,
          timestamp: new Date(ts).getTime(),
          rawData: record,
        });
      } catch {}
    });

    routeData.value = points;
    if (points.length) {
      markRouteOnMap(points);
      updateFlightInfo(points[0]);
    } else {
      ElMessage.warning("未解析到有效航线数据");
    }
  } catch (e) {
    console.error(e);
    ElMessage.error("日志加载失败");
  }
};

// 绘制航线
const markRouteOnMap = (data) => {
  if (!map) return;
  clearRouteMarkers();

  const path = data.map((p) => new AMap.LngLat(p.longitude, p.latitude));

  const startMarker = new AMap.Marker({
    position: path[0],
    content: `<div class="route-marker route-marker-start">S</div>`,
    offset: new AMap.Pixel(-15, -15),
    zIndex: 110,
  });
  const endMarker = new AMap.Marker({
    position: path[path.length - 1],
    content: `<div class="route-marker route-marker-end">E</div>`,
    offset: new AMap.Pixel(-15, -15),
    zIndex: 110,
  });
  map.add([startMarker, endMarker]);
  routeMarkers.push(startMarker, endMarker);

  if (data.length > 2) {
    const step = Math.max(1, Math.floor((data.length - 2) / 10));
    for (let i = step; i < data.length - 1; i += step) {
      const marker = new AMap.Marker({
        position: path[i],
        content: `<div class="route-marker">${i + 1}</div>`,
        offset: new AMap.Pixel(-15, -15),
        zIndex: 100,
      });
      map.add(marker);
      routeMarkers.push(marker);
    }
  }

  routePolyline = new AMap.Polyline({
    path,
    strokeColor: "#409EFF",
    strokeWeight: 4,
    strokeOpacity: 0.9,
    lineJoin: "round",
  });
  map.add(routePolyline);

  initDroneMarker(path);
  setTimeout(() => autoFitToRoute(), 500);
};

// 初始化飞机图标
const initDroneMarker = (path) => {
  if (!map || path.length === 0) return;
  if (droneMarker) {
    map.remove(droneMarker);
    droneMarker = null;
  }

  const planeContent = `
    <div class="plane-marker">
      <img src="${planeIcon}" style="width:32px; height:32px; object-fit:contain;" />
    </div>
  `;

  droneMarker = new AMap.Marker({
    position: path[0],
    content: planeContent,
    offset: new AMap.Pixel(-16, -16),
    zIndex: 200,
    angle: 0,
  });
  map.add(droneMarker);

  totalPoints.value = path.length;
  currentPointIndex.value = 0;
};

// 开始播放
const startFlightPlayback = () => {
  if (isPlaying.value || !routeData.value.length) return;
  isPlaying.value = true;
  const points = routeData.value;
  let idx = currentPointIndex.value;

  const animate = () => {
    if (!isPlaying.value || idx >= points.length - 1) {
      isPlaying.value = false;
      if (idx >= points.length - 1) ElMessage.success("回放完成");
      return;
    }

    const delta = Math.max(
      points[idx + 1].timestamp - points[idx].timestamp,
      100,
    );
    const delay = delta / playbackSpeed.value;

    idx++;
    currentPointIndex.value = idx;

    const pos = new AMap.LngLat(points[idx].longitude, points[idx].latitude);
    droneMarker.setPosition(pos);

    // ✅ 真实航向：yaw 0°=正北，图片默认朝上，直接设置即可
    const yaw = points[idx].rawData?.status?.attitude?.yaw || 0;
    droneMarker.setAngle(yaw);

    updateFlightInfo(points[idx]);
    flightAnimation = setTimeout(animate, delay);
  };

  animate();
};

// 暂停
const pauseFlightPlayback = () => {
  isPlaying.value = false;
  clearTimeout(flightAnimation);
  flightAnimation = null;
};

// 重置
const stopFlightPlayback = () => {
  pauseFlightPlayback();
  currentPointIndex.value = 0;
  if (droneMarker && routeData.value.length) {
    const start = routeData.value[0];
    const pos = new AMap.LngLat(start.longitude, start.latitude);
    droneMarker.setPosition(pos);

    const yaw = start.rawData?.status?.attitude?.yaw || 0;
    droneMarker.setAngle(yaw);

    updateFlightInfo(start);
  }
};

// 进度条拖动
const handleSliderChange = (val) => {
  if (!routeData.value.length) return;
  pauseFlightPlayback();

  const point = routeData.value[val];
  const pos = new AMap.LngLat(point.longitude, point.latitude);
  droneMarker.setPosition(pos);

  // 拖动时也同步真实航向
  const yaw = point.rawData?.status?.attitude?.yaw || 0;
  droneMarker.setAngle(yaw);

  updateFlightInfo(point);
};

// 设置速度
const setPlaybackSpeed = (speed) => {
  playbackSpeed.value = speed;
  ElMessage.info(`播放速度 ${speed}x`);
};

// 更新飞行信息
const updateFlightInfo = (point) => {
  if (!point || !point.rawData) return;
  const raw = point.rawData;
  const status = raw?.status;

  const globalPosition = status?.global_position_int;
  const attitude = status?.attitude;
  const battery = status?.battery;
  const gps = status?.gps;
  const vfrHud = status?.vfr_hud;
  const heartbeat = status?.heartbeat;

  currentFlightInfo.value = {
    heading: Math.round(attitude?.yaw || 0),
    flightMode: heartbeat?.mode || "未知",
    throttle: Math.round(vfrHud?.throttle || 0),
    satellites: gps?.satellites_visible || 0,
    voltage: Number(battery?.voltage || 0).toFixed(2),
    altitude: Number(globalPosition?.relative_alt || 0).toFixed(2),
    speed: Number(vfrHud?.groundspeed || 0).toFixed(1),
    flightTime: "--:--",
    coordinates: `${Number(point.latitude).toFixed(6)}, ${Number(point.longitude).toFixed(6)}`,
  };
};

// 自适应视野
const autoFitToRoute = () => {
  if (!map) return;
  map.resize();
  map.setFitView(null, true, [60, 60, 60, 60], 17);
};

// 切换图层
const handleMapTypeChange = (type) => {
  if (!map) return;
  map.remove([standardLayer, satelliteLayer, roadNetLayer]);
  if (type === "standard") map.add(standardLayer);
  else if (type === "satellite") map.add(satelliteLayer);
  else map.add([satelliteLayer, roadNetLayer]);
};

// 清理
const clearRouteMarkers = () => {
  routeMarkers.forEach((m) => map?.remove(m));
  routeMarkers = [];
  if (routePolyline) map?.remove(routePolyline);
  routePolyline = null;
  if (droneMarker) map?.remove(droneMarker);
  droneMarker = null;
  clearTimeout(flightAnimation);
  flightAnimation = null;
  isPlaying.value = false;
  currentPointIndex.value = 0;
};

const retryInitMap = () => initMap();

const handleClose = () => {
  internalVisible.value = false;
  emit("update:visible", false);
  emit("close");
};

onUnmounted(() => {
  clearRouteMarkers();
  map?.destroy();
  map = null;
});
</script>

<style scoped>
.dialog-content {
  padding: 10px;
}
.content-wrapper {
  height: 60vh;
  position: relative;
}
.map-section {
  height: 100%;
  position: relative;
}
.map-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #f5f5f5;
  position: relative;
}
.map-loading,
.map-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}
.map-type-selector {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 130px;
  z-index: 999;
}
.drone-monitor {
  height: 100%;
  position: relative;
}

:deep(.route-marker) {
  width: 30px;
  height: 30px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
:deep(.route-marker-start) {
  background: #67c23a;
  font-size: 14px;
}
:deep(.route-marker-end) {
  background: #f56c6c;
  font-size: 14px;
}

.plane-marker {
  transition: transform 0.1s ease;
}

.flight-control-panel {
  position: absolute;
  top: 350px;
  right: 10px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 260px;
  z-index: 999;
}

.progress-slider {
  padding: 15px 15px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.slider {
  margin: 0;
}
.progress-text {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.flight-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 0px 10px;
}
.speed-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0px 10px 10px;
}
.speed-label {
  font-size: 12px;
  color: #606266;
}

.flight-info-panel {
  position: absolute;
  top: 50px;
  right: 10px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  min-width: 260px;
  z-index: 999;
  overflow: hidden;
}
.flight-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
}
.info-title {
  font-weight: bold;
  font-size: 14px;
}
.flight-info-content {
  padding: 12px 15px;
}
.info-row {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}
.info-row:last-child {
  margin-bottom: 0;
}
.info-row.full {
  flex-direction: column;
}
.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-row.full .info-item {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.info-label {
  font-size: 11px;
  color: #909399;
}
.info-value {
  font-size: 13px;
  font-weight: 60;
  color: #303133;
  font-weight: 600;
}
.info-value.mode {
  color: #409eff;
}
.info-value.voltage {
  color: #67c23a;
}
.info-value.altitude {
  color: #e6a23c;
}
.info-value.speed {
  color: #f56c6c;
}
.info-value.coords {
  font-size: 11px;
  font-family: monospace;
  color: #606266;
}
</style>
