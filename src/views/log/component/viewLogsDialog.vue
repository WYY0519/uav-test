<template>
  <!-- 使用v-if强制重新渲染弹窗 -->
  <el-dialog
    v-if="visible"
    v-model="internalVisible"
    :title="currentLogFile"
    width="80%"
    style="height: 70%"
    destroy-on-close
    @close="handleClose"
    :modal="true"
    :append-to-body="true"
  >
    <div class="dialog-content">
      <!-- 内容区域分为两部分：左侧日志内容，右侧地图 -->
      <div class="content-wrapper">
        <!-- 地图部分 -->
        <div class="map-section">
          <div class="drone-monitor">
            <!-- 地图底层 -->
            <div class="map-container" ref="mapContainer"></div>
            <!-- 图例说明 -->
            <div class="legend">
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

// 地图相关变量
let map = null;
let droneMarker = null;
let trackPolyline = null; // 航线轨迹线
let routeMarkers = []; // 存储航线标记
let routePolyline = null; // 航线线
let mapLoaded = false; // 地图加载状态标记

// 接收父组件参数
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
    required: true,
  },
  logFilename: {
    type: String,
    required: true,
  },
  fileLoading: {
    type: Boolean,
    default: false,
  },
});

// 事件发射
const emit = defineEmits(["update:visible", "close"]);

// 子组件内部状态
const internalVisible = ref(false);
const currentLogFile = ref("日志航线展示");
const logContent = ref([]);
const searchKeyword = ref("");
const mapContainer = ref(null);
const routeData = ref([]); // 存储航线数据

// 监听父组件visible变化
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      currentLogFile.value = props.logFilename;
      await nextTick();
      internalVisible.value = true;
      await nextTick();
      if (mapContainer.value) {
        initMap();
        await loadLogContent();
      } else {
        ElMessage.error("地图容器初始化失败");
      }
    } else {
      internalVisible.value = false;
    }
  },
  { immediate: true },
);

// 监听内部状态变化
watch(
  () => internalVisible.value,
  (newVal) => {
    if (!newVal) {
      emit("update:visible", false);
      emit("close");
      clearAllMarkers(); // 关闭时清除标记
    }
  },
);

// 初始化地图
const initMap = () => {
  mapLoaded = false;
  if (!window.T) {
    ElMessage.error("天地图API未加载，请检查引入");
    return;
  }
  try {
    clearAllMarkers();
    if (!mapContainer.value) return;

    map = new T.Map(mapContainer.value);
    map.addEventListener("load", () => {
      mapLoaded = true;
      ElMessage.success("地图加载成功");

      // 默认定位到郑州
      const defaultLng = 113.65644;
      const defaultLat = 34.78723;
      map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 10);

      // 创建无人机标记
      createDroneMarker(defaultLng, defaultLat);

      // 创建轨迹线
      trackPolyline = new T.Polyline([], {
        color: "#2C64A7",
        weight: 4,
        opacity: 0.8,
        lineStyle: "solid",
      });
      map.addOverLay(trackPolyline);
    });

    map.addControl(new T.Control.MapType());
    map.setMapType(window.TMAP_HYBRID_MAP);
    map.addControl(new T.Control.Scale());

    // 尝试获取当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.centerAndZoom(new T.LngLat(lng, lat), 15);
        },
        (err) => {
          console.warn("定位失败:", err);
        },
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
  }
};

// 创建无人机标记
const createDroneMarker = (lng, lat) => {
  if (droneMarker) map.removeOverLay(droneMarker);

  droneMarker = new T.Marker(new T.LngLat(lng, lat), {
    icon: new T.Icon({
      iconUrl: "/src/assets/mti-无人机.png",
      iconSize: new T.Point(32, 32),
      iconAnchor: new T.Point(16, 16),
    }),
  });
  map.addOverLay(droneMarker);
};

// 加载日志内容
const loadLogContent = async () => {
  try {
    console.log("加载日志内容", props.logFilename);
    const res = await getLogContent(props.logFilename);
    if (res && res.code === 200) {
      logContent.value = res.data;
      // 1. 处理日志数据（结构化解析）
      const convertedData = processJsonStringArray(res.data);
      // 2. 提取有效坐标
      const coordinates = extractCoordinates(convertedData);

      if (coordinates.length > 0) {
        routeData.value = coordinates;
        // 3. 确保地图加载完成后再绘制航线
        if (mapLoaded) {
          markRouteOnMap(routeData.value);
        } else {
          // 监听地图加载完成事件（避免地图未初始化导致失败）
          map?.addEventListener("load", () => {
            markRouteOnMap(routeData.value);
          });
        }
      } else {
        ElMessage.info("未提取到有效坐标数据（日志可能无定位信息）");
      }
    } else {
      ElMessage.error(res?.message || "获取日志内容失败");
      internalVisible.value = false;
    }
  } catch (error) {
    console.error("加载日志失败", error);
    ElMessage.error(`获取日志内容失败: ${error.message}`);
    internalVisible.value = false;
  }
};

// 解析日志提取坐标（重构后：直接访问结构化数据）
const extractCoordinates = (logData) => {
  const result = [];
  if (!Array.isArray(logData)) return result;

  logData.forEach((item, index) => {
    try {
      // 直接访问结构化数据的 status.global_position_int
      const status = item?.status;
      if (!status) return;

      const globalPositionInt = status.global_position_int;
      if (!globalPositionInt) return;

      // 提取经纬度（转换为数字类型，过滤无效值）
      let lon = Number(globalPositionInt.lon);
      let lat = Number(globalPositionInt.lat);
      const alt = globalPositionInt.relative_alt
        ? Number(globalPositionInt.relative_alt) / 1000 // 转换为米
        : 0;

      // 过滤条件：排除未定位（0值）、非法范围、NaN数据
      if (
        isNaN(lon) ||
        isNaN(lat) ||
        Math.abs(lon) < 0.000001 || // 排除接近0的无效坐标
        Math.abs(lat) < 0.000001 ||
        lon < -180 ||
        lon > 180 || // 经度范围：-180~180
        lat < -90 ||
        lat > 90 // 纬度范围：-90~90
      ) {
        console.warn(`第${index + 1}条日志坐标无效：lon=${lon}, lat=${lat}`);
        return;
      }

      // 存储有效坐标（包含高度，便于后续扩展）
      result.push({
        longitude: lon,
        latitude: lat,
        altitude: alt,
      });
    } catch (error) {
      console.error(`第${index + 1}条日志解析坐标失败:`, error);
    }
  });

  console.log("提取到的有效航点数：", result.length);
  return result;
};

// 转换成数组
const convertToArrayList = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => convertToArrayList(item));
  } else if (typeof data === "object" && data !== null) {
    return Object.entries(data).map(([key, value]) => [
      key,
      convertToArrayList(value),
    ]);
  } else {
    return data;
  }
};

// 在地图上标注航线点
const markRouteOnMap = (routeData) => {
  if (!map || !mapLoaded) {
    ElMessage.warning("地图未加载完成，无法标注航线");
    return;
  }

  try {
    clearRouteMarkers();

    if (!Array.isArray(routeData) || routeData.length === 0) {
      ElMessage.warning("航线数据为空或格式不正确");
      return;
    }

    const routePoints = [];
    routeData.forEach((point, index) => {
      const { latitude: lat, longitude: lon } = point;

      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`忽略无效坐标: 纬度=${lat}, 经度=${lon}`);
        return;
      }

      const lngLat = new T.LngLat(lon, lat);
      routePoints.push(lngLat);

      let markerLabel, markerClass;
      if (index === 0) {
        markerLabel = "S";
        markerClass = "route-start";
      } else if (index === routeData.length - 1) {
        markerLabel = "E";
        markerClass = "route-end";
      } else {
        markerLabel = (index + 1).toString();
        markerClass = "route-point";
      }

      const markerHtml = `
        <div class="route-marker ${markerClass}">
          ${markerLabel}
        </div>
      `;

      const marker = new T.Marker(lngLat, {
        icon: new T.DivIcon({
          html: markerHtml,
          iconSize: new T.Point(40, 40),
          iconAnchor: new T.Point(20, 20),
        }),
      });

      map.addOverLay(marker);
      routeMarkers.push(marker);
    });

    drawRouteLine(routePoints);
    fitMapToRoute(routePoints);

    ElMessage.success("航线标注成功");
  } catch (error) {
    console.error("标注航线失败:", error);
    ElMessage.error("标注航线失败");
  }
};

// 清除航线标记
const clearRouteMarkers = () => {
  if (map) {
    // 清除标记
    routeMarkers.forEach((marker) => {
      try {
        map.removeOverLay(marker);
      } catch (error) {}
    });
    routeMarkers = [];

    // 清除航线
    if (routePolyline) {
      try {
        map.removeOverLay(routePolyline);
      } catch (error) {}
    }
    routePolyline = null;
  }
};

// 清除所有标记
const clearAllMarkers = () => {
  clearRouteMarkers();
  if (map && droneMarker) {
    map.removeOverLay(droneMarker);
    droneMarker = null;
  }
  if (map && trackPolyline) {
    map.removeOverLay(trackPolyline);
    trackPolyline = null;
  }
};

// 绘制航线
const drawRouteLine = (routePoints) => {
  if (!map || routePoints.length < 2) return;

  // 清除旧航线
  if (routePolyline) {
    try {
      map.removeOverLay(routePolyline);
    } catch (error) {
      console.warn("清除旧航线失败：", error);
    }
  }

  try {
    // 创建新航线
    routePolyline = new T.Polyline(routePoints, {
      color: "#409EFF",
      weight: 5, // 增加线宽，使航线更明显
      opacity: 0.9, // 增加透明度
      lineStyle: "solid",
    });

    map.addOverLay(routePolyline);
  } catch (error) {
    console.error("绘制航线失败：", error);
    ElMessage.warning("绘制航线失败");
  }
};

// 调整地图视图以显示完整航线（优化版）
const fitMapToRoute = (routePoints) => {
  if (!map || routePoints.length === 0) return;

  try {
    if (routePoints.length === 1) {
      map.panTo(routePoints[0]);
      map.setZoom(16); // 单个点时使用较大的缩放级别
      return;
    }

    // 计算边界
    let minLng = routePoints[0].getLng();
    let maxLng = routePoints[0].getLng();
    let minLat = routePoints[0].getLat();
    let maxLat = routePoints[0].getLat();

    routePoints.forEach((point) => {
      const lng = point.getLng();
      const lat = point.getLat();
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    // 计算中心点和缩放级别
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerPoint = new T.LngLat(centerLng, centerLat);
    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;
    const zoomLevel = calculateOptimalZoom(lngSpan, latSpan);

    // 设置地图视野
    map.panTo(centerPoint);
    map.setZoom(zoomLevel);
    if (routePoints.length > 5 && maxDistance < 0.5) {
      zoomLevel = Math.max(zoomLevel, 18); // 强制使用最大缩放
    }
    console.log(
      `地图视野调整完成，中心点: (${centerLng.toFixed(6)}, ${centerLat.toFixed(
        6,
      )}), 缩放级别: ${zoomLevel}`,
    );
  } catch (error) {
    console.error("调整地图视图失败：", error);
    ElMessage.warning("无法自动调整地图视野，请手动缩放查看航线");
  }
};

// 计算最优缩放级别（修正后）
const calculateOptimalZoom = (lngSpan, latSpan) => {
  const lngDistance = lngSpan * 111;
  const latDistance = latSpan * 111;
  const maxDistance = Math.max(lngDistance, latDistance);
  let zoomLevel = 18; // 天地图最大支持18级

  // 重新划分区间以匹配天地图级别
  if (maxDistance > 1000) {
    zoomLevel = 9;
  } else if (maxDistance > 800) {
    zoomLevel = 10;
  } else if (maxDistance > 500) {
    zoomLevel = 11;
  } else if (maxDistance > 300) {
    zoomLevel = 12;
  } else if (maxDistance > 200) {
    zoomLevel = 13;
  } else if (maxDistance > 100) {
    zoomLevel = 14;
  } else if (maxDistance > 50) {
    zoomLevel = 15;
  } else if (maxDistance > 30) {
    zoomLevel = 16;
  } else if (maxDistance > 10) {
    zoomLevel = 17;
  } else {
    zoomLevel = 18; // 近距离使用最大级别
  }

  // 确保在天地图支持的范围内
  return Math.max(2, Math.min(18, zoomLevel));
};
// 处理弹窗关闭
const handleClose = () => {
  internalVisible.value = false;
  clearAllMarkers();
  logContent.value = [];
  searchKeyword.value = "";
};
// 扩展版：如果数组元素是 JSON 对象字符串（如 "[{\"time\":\"123\"},...]"）
const processJsonStringArray = (data) => {
  if (!data) return [];

  // 先解析外层数组
  const rawArray = Array.isArray(data)
    ? data
    : (() => {
        try {
          return JSON.parse(data.trim());
        } catch (e) {
          return [data];
        }
      })();

  // 再解析数组内的每个 JSON 对象字符串
  return rawArray.map((item) => {
    if (typeof item === "string") {
      try {
        return JSON.parse(item.trim());
      } catch (e) {
        return item; // 单个元素解析失败，返回原始值
      }
    }
    return item;
  });
};
watch(
  () => logContent.value,
  async (newVal) => {
    console.log(newVal, "newValnewVal");
    // 执行转换
    const convertedData = processJsonStringArray(newVal);
    // 输出结果（格式化显示）
    console.log(JSON.stringify(convertedData, null, 2));
    const coordinates = extractCoordinates(convertedData);
    console.log("提取的经纬度数据：", coordinates);
  },
);
// 组件卸载时清理
onUnmounted(() => {
  clearAllMarkers();
  map = null;
});
</script>

<style scoped>
.dialog-content {
  padding: 10px 0;
}

.content-wrapper {
  display: flex;
  gap: 10px;
  height: 80vh;
}

.map-section {
  flex: 1;
  position: relative;
}

.drone-monitor {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 70%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.legend {
  position: absolute;
  top: 15px;
  right: 15px;
  background: white;
  padding: 12px 15px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #333;
}

.legend-icon {
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  border-radius: 50%;
}

.legend-icon.start {
  background-color: #e74c3c;
  border: 2px solid white;
}

.legend-icon.middle {
  background-color: #3498db;
  border: 2px solid white;
}

.legend-icon.end {
  background-color: #27ae60;
  border: 2px solid white;
}

.legend-icon.route {
  background: none;
  border: 3px solid #409eff;
  width: 22px;
  height: 6px;
  border-radius: 3px;
  margin-top: 6px;
}

/* 标记点样式 */
:deep .route-marker {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  box-sizing: border-box;
  border: 2px solid white;
  font-size: 16px;
  transition: transform 0.3s ease;
}

:deep .route-start {
  background-color: #e74c3c; /* 红色起点 */
}

:deep .route-end {
  background-color: #27ae60; /* 绿色终点 */
}

:deep .route-point {
  background-color: #3498db; /* 蓝色中间点 */
}

:deep(.tdt-div-icon) {
  background: none;
  border: none;
}

.route-marker:hover {
  transform: scale(1.1);
}

@media (max-width: 1000px) {
  .content-wrapper {
    flex-direction: column;
    height: auto;
  }

  .map-section {
    height: 400px;
  }
}
</style>
