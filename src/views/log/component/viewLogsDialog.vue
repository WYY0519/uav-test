<template>
  <el-dialog
    v-if="visible"
    v-model="internalVisible"
    :title="currentLogFile"
    width="60%"
    destroy-on-close
    @close="handleClose"
    :modal="true"
    :append-to-body="true"
  >
    <div class="dialog-content">
      <div class="content-wrapper">
        <div class="map-section">
          <div class="drone-monitor">
            <!-- 地图容器固定高度，防止白屏 -->
            <div class="map-container" ref="mapContainer"></div>

            <!-- 加载中提示 -->
            <div v-if="!mapLoaded" class="map-loading">地图加载中...</div>
            <!-- 地图类型切换下拉框 -->
            <div class="map-type-selector">
              <el-select
                v-model="mapType"
                @change="handleMapTypeChange"
                size="default"
              >
                <el-option label="标准地图" value="standard" />
                <el-option label="卫星地图" value="satellite" />
                <el-option label="卫星混合" value="hybrid" />
              </el-select>
            </div>
            <!-- 图例 -->
            <!-- <div class="legend">
              <div class="legend-item">
                <span class="legend-icon start"></span> 起点(S)
              </div>
              <div class="legend-item">
                <span class="legend-icon middle"></span> 中间点(序号)
              </div>
              <div class="legend-item">
                <span class="legend-icon end"></span> 终点(E)
              </div>
              <div class="legend-item">
                <span class="legend-icon route"></span> 航线
              </div>
            </div> -->
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted, onMounted } from "vue";
import { getLogContent } from "@/api/log";
import { ElMessage } from "element-plus";

// 地图变量
let map = null;
let droneMarker = null;
let trackPolyline = null;
let routeMarkers = [];
let routePolyline = null;

const props = defineProps({
  visible: { type: Boolean, default: false, required: true },
  logFilename: { type: String, required: true },
  fileLoading: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "close"]);

const internalVisible = ref(false);
const currentLogFile = ref("日志航线展示");
const logContent = ref([]);
const mapContainer = ref(null);
const routeData = ref([]);
const mapLoaded = ref(false);
// 地图类型：standard / satellite / hybrid
const mapType = ref("hybrid");

// 保存图层实例，方便切换
let standardLayer = null;
let satelliteLayer = null;
let roadNetLayer = null;
// 页面挂载就预加载地图，打开弹窗瞬间显示
onMounted(() => {
  nextTick(() => {
    // if (window.AMap) initMap();
  });
});

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      currentLogFile.value = props.logFilename;
      internalVisible.value = true;

      await nextTick();
      if (!map) {
        await (window.__amapReady || Promise.resolve());
        initMap();
      }

      await nextTick();
      loadLogContent();
    } else {
      internalVisible.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => internalVisible.value,
  (newVal) => {
    if (!newVal) {
      emit("update:visible", false);
      emit("close");
    }
  },
);
// 修改 initMap，预创建所有图层
const initMap = () => {
  if (map) return;
  if (!window.AMap) {
    ElMessage.error("高德地图JSAPI未加载");
    return;
  }

  try {
    clearAllMarkers();

    map = new AMap.Map(mapContainer.value, {
      zoom: 12,
      center: [113.65644, 34.78723],
      viewMode: "2D",
      resizeEnable: true,
      animateEnable: false,
      rotateEnable: false,
      pitchEnable: false,
      terrain: true,
    });

    // 预创建所有图层
    standardLayer = new AMap.TileLayer();
    satelliteLayer = new AMap.TileLayer.Satellite();
    roadNetLayer = new AMap.TileLayer.RoadNet();

    // 默认加载混合图层
    map.add([satelliteLayer, roadNetLayer]);

    map.on("complete", () => {
      mapLoaded.value = true;
      createDroneMarker(113.65644, 34.78723);
      ElMessage.success("地图加载完成");
    });
  } catch (err) {
    console.error("地图初始化失败", err);
    ElMessage.error("地图初始化失败1");
  }
};

// 地图类型切换逻辑
const handleMapTypeChange = (type) => {
  if (!map) return;

  // 先移除所有图层
  map.remove([standardLayer, satelliteLayer, roadNetLayer]);

  switch (type) {
    case "standard":
      map.add(standardLayer);
      break;
    case "satellite":
      map.add(satelliteLayer);
      break;
    case "hybrid":
      map.add([satelliteLayer, roadNetLayer]);
      break;
  }
};
// 创建无人机图标
const createDroneMarker = (lng, lat) => {
  if (droneMarker) map.remove(droneMarker);
  droneMarker = new AMap.Marker({
    position: [lng, lat],
    icon: new AMap.Icon({
      image: "/src/assets/mti-无人机.png",
      size: new AMap.Size(32, 32),
      imageSize: new AMap.Size(32, 32),
    }),
    anchor: "center",
  });
  map.add(droneMarker);
};

// ==============================================
// 加载日志 & 绘制航线（不阻塞UI）
// ==============================================
const loadLogContent = async () => {
  try {
    const res = await getLogContent(props.logFilename);
    if (res?.code !== 200) {
      ElMessage.error("获取日志失败");
      return;
    }
    const converted = processJsonStringArray(res.data);
    const points = extractCoordinates(converted);
    routeData.value = points;

    if (points.length === 0) {
      ElMessage.info("无有效坐标");
      return;
    }

    // 等待地图就绪再绘制
    if (mapLoaded.value) {
      markRouteOnMap(points);
    } else {
      map?.on("complete", () => markRouteOnMap(points));
    }
  } catch (err) {
    console.error(err);
    ElMessage.error("日志加载异常");
  }
};

// 解析经纬度
const extractCoordinates = (logData) => {
  const res = [];
  if (!Array.isArray(logData)) return res;

  logData.forEach((item) => {
    try {
      const gps = item?.status?.global_position_int;
      if (!gps) return;

      let lon = Number(gps.lon);
      let lat = Number(gps.lat);

      // MAVLink 整数格式（>= 1e7 量级）需除以 1e7，浮点格式直接使用
      if (Math.abs(lon) >= 1e7) lon = lon / 10000000;
      if (Math.abs(lat) >= 1e7) lat = lat / 10000000;

      if (isNaN(lon) || isNaN(lat) || Math.abs(lon) < 0.0001) return;
      res.push({ longitude: lon, latitude: lat });
    } catch {}
  });
  return res;
};

// 绘制航线点
const markRouteOnMap = (data) => {
  if (!map) return;
  clearRouteMarkers();

  const path = [];
  data.forEach((p, i) => {
    const pos = new AMap.LngLat(p.longitude, p.latitude);
    path.push(pos);

    let cls = "route-point";
    let txt = i + 1;
    if (i === 0) {
      cls = "route-start";
      txt = "S";
    } else if (i === data.length - 1) {
      cls = "route-end";
      txt = "E";
    }

    const marker = new AMap.Marker({
      position: pos,
      content: `<div class="route-marker ${cls}">${txt}</div>`,
      offset: new AMap.Pixel(-20, -20),
    });
    map.add(marker);
    routeMarkers.push(marker);
  });

  drawRouteLine(path);
  fitMapToRoute(path);
};

// 绘制航线
const drawRouteLine = (path) => {
  if (path.length < 2) return;
  routePolyline = new AMap.Polyline({
    path,
    strokeColor: "#409EFF",
    strokeWeight: 5,
    strokeOpacity: 0.9,
  });
  map.add(routePolyline);
};

// 自适应视野
const fitMapToRoute = (path) => {
  if (path.length === 1) {
    map.panTo(path[0]);
    map.setZoom(16);
    return;
  }
  const bounds = new AMap.Bounds(path);
  map.setBounds(bounds);
};

// 清理
const clearRouteMarkers = () => {
  routeMarkers.forEach((m) => map?.remove(m));
  routeMarkers = [];
  if (routePolyline) map?.remove(routePolyline);
  routePolyline = null;
};

const clearAllMarkers = () => {
  clearRouteMarkers();
  if (droneMarker) map?.remove(droneMarker);
  droneMarker = null;
};

const handleClose = () => {
  internalVisible.value = false;
};

const processJsonStringArray = (data) => {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : JSON.parse(data || "[]");
  return arr.map((i) => (typeof i === "string" ? JSON.parse(i) : i));
};

onUnmounted(() => {
  clearAllMarkers();
  if (map) map.destroy();
  map = null;
});
</script>

<style scoped>
.dialog-content {
  padding: 10px 0;
}
.content-wrapper {
  display: flex;
  height: 70vh;
}
.map-section {
  flex: 1;
  position: relative;
}
.drone-monitor {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 固定高度，彻底解决白屏 */
.map-container {
  width: 100%;
  height: 100% !important;
  min-height: 500px;
  border-radius: 8px;
  background: #f5f5f5;
}

.map-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #666;
  z-index: 100;
}

.legend {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.legend-item {
  display: flex;
  align-items: center;
}
.legend-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 6px;
  border: 2px solid #fff;
}
.legend-icon.start {
  background: #e74c3c;
}
.legend-icon.middle {
  background: #3498db;
}
.legend-icon.end {
  background: #27ae60;
}
.legend-icon.route {
  width: 20px;
  height: 4px;
  border-radius: 2px;
  background: none;
  border: 3px solid #409eff;
}

:deep(.route-marker) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  border: 2px solid #fff;
  font-size: 14px;
}
:deep(.route-start) {
  background: #e74c3c;
}
:deep(.route-end) {
  background: #27ae60;
}
:deep(.route-point) {
  background: #3498db;
}
.map-type-selector {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 999;
}

:deep(.el-select) {
  width: 160px;
}
</style>
