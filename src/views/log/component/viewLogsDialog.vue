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
            </div>

            <div v-if="!mapLoaded" class="map-loading">
              <el-icon :size="32"><Loading /></el-icon>
              <p>地图加载中...</p>
            </div>
            <div v-if="mapError" class="map-error">
              <el-icon :size="32"><Warning /></el-icon>
              <p>{{ mapError }}</p>
              <el-button type="primary" @click="retryInitMap"
                >重新加载</el-button
              >
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
import { Loading, Warning } from "@element-plus/icons-vue";

let map = null;
let droneMarker = null;
let routeMarkers = [];
let routePolyline = null;

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
  // mapContainer.value.style.height = "600px";

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

// 父组件打开弹窗时执行（最关键）
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      currentLogFile.value = props.logFilename;
      internalVisible.value = true;

      // 等待 Dialog 100% 渲染 + 动画结束
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

const loadLogContent = async () => {
  try {
    const res = await getLogContent(props.logFilename);
    console.log("[航线回放] 接口响应:", res);
    if (res?.code !== 200) {
      console.warn("[航线回放] 接口返回非200:", res?.code, res?.message);
      return;
    }

    let arr = [];
    if (Array.isArray(res.data)) {
      arr = res.data;
    } else if (typeof res.data === "string") {
      try {
        arr = JSON.parse(res.data);
      } catch {
        arr = [];
      }
    }

    console.log("[航线回放] 数据总条数:", arr.length);
    if (arr.length > 0) {
      console.log(
        "[航线回放] 第一条数据示例:",
        JSON.stringify(arr[0]).slice(0, 500),
      );
    }

    const points = [];

    arr.forEach((item, idx) => {
      try {
        // res.data 每条是 JSON 字符串，需要先 parse
        const record = typeof item === "string" ? JSON.parse(item) : item;

        const gps = record?.status?.global_position_int;
        if (!gps) return;

        let lon = Number(gps.lon);
        let lat = Number(gps.lat);

        if (!isFinite(lon) || !isFinite(lat)) return;
        if (lon === 0 || lat === 0) return;

        // 兼容：若值超范围说明是 1e7 单位（旧数据），自动转换
        if (Math.abs(lon) > 180) lon /= 1e7;
        if (Math.abs(lat) > 90) lat /= 1e7;

        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return;

        const gcj = wgs84ToGcj02(lon, lat);
        points.push({ longitude: gcj.lng, latitude: gcj.lat });
      } catch (e) {
        if (idx === 0) console.warn("[航线回放] 第0条解析出错:", e, item);
      }
    });

    console.log("[航线回放] 有效坐标点数:", points.length);
    if (points.length > 0) {
      console.log("[航线回放] 第一个坐标:", points[0]);
    }

    routeData.value = points;
    if (points.length) {
      markRouteOnMap(points);
    } else {
      console.warn("[航线回放] 没有解析到有效坐标点，请检查数据结构");
    }
  } catch (e) {
    console.error("[航线回放] 加载日志内容异常:", e);
  }
};

// 绘制航线
const markRouteOnMap = (data) => {
  if (!map) return;
  clearRouteMarkers();

  const path = data.map((p) => new AMap.LngLat(p.longitude, p.latitude));

  // 起点标记（绿色 S）
  const startMarker = new AMap.Marker({
    position: path[0],
    content: `<div class="route-marker route-marker-start">S</div>`,
    offset: new AMap.Pixel(-15, -15),
    zIndex: 110,
  });
  // 终点标记（红色 E）
  const endMarker = new AMap.Marker({
    position: path[path.length - 1],
    content: `<div class="route-marker route-marker-end">E</div>`,
    offset: new AMap.Pixel(-15, -15),
    zIndex: 110,
  });
  map.add([startMarker, endMarker]);
  routeMarkers.push(startMarker, endMarker);

  // 中间采样点（最多显示10个）
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

  setTimeout(() => autoFitToRoute(), 500);
};

// ✅ 核心：自动缩放到航线（永远生效）
const autoFitToRoute = () => {
  if (!map) return;
  map.resize();
  // 用 setFitView 自动适配所有覆盖物（Polyline + Marker）到可视区域
  map.setFitView(null, true, [60, 60, 60, 60], 17);
};

const handleMapTypeChange = (type) => {
  if (!map) return;
  map.remove([standardLayer, satelliteLayer, roadNetLayer]);
  if (type === "standard") map.add(standardLayer);
  else if (type === "satellite") map.add(satelliteLayer);
  else map.add([satelliteLayer, roadNetLayer]);
};

const clearRouteMarkers = () => {
  routeMarkers.forEach((m) => map?.remove(m));
  routeMarkers = [];
  if (routePolyline) map?.remove(routePolyline);
  routePolyline = null;
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
}
.map-section {
  height: 100%;
}
.map-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #f5f5f5;
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
  z-index: 99;
}
.drone-monitor{
  height: 100%;
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
</style>
