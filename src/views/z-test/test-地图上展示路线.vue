<!-- 无人机监控组件内部 -->
<template>
  <div class="drone-monitor">
    <!-- 地图底层 -->
    <div class="map-container" ref="mapContainer"></div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
let droneMarker = null;
let trackPolyline = null;
// 状态变量
const mapContainer = ref(null);
let map = null;
const initMap = () => {
  if (!window.T) {
    ElMessage.error("天地图API未加载");
    return;
  }
  try {
    // 创建地图实例
    map = new T.Map(mapContainer.value);
    // 地图加载完成事件
    map.addEventListener("load", () => {
      ElMessage.success("地图加载成功");
    });
    // 添加控件
    map.addControl(new T.Control.MapType());
    //切换到卫星和路网的混合视图：
    map.setMapType(TMAP_HYBRID_MAP);
    map.addControl(new T.Control.Scale());
    // 默认北京天安门
    const defaultLng = 113.65644;
    const defaultLat = 34.78723;
    map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 15);
    // 创建无人机标记
    droneMarker = new T.Marker(new T.LngLat(defaultLng, defaultLat), {
      icon: new T.Icon({
        iconUrl: "/src/assets/mti-无人机.png",
        iconSize: new T.Point(32, 32),
        iconAnchor: new T.Point(16, 16),
      }),
    });
    map.addOverLay(droneMarker);

    // 创建轨迹线
    trackPolyline = new T.Polyline([], {
      color: "#2C64A7",
      weight: 4,
      opacity: 0.8,
      lineStyle: "solid",
    });
    map.addOverLay(trackPolyline);
    // 创建轨迹线
    createTrackPolyline();
    // 尝试获取当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.centerAndZoom(new T.LngLat(lng, lat), 15);
          // ElMessage.success("已定位到当前位置");
        },
        (err) => {
          console.warn("定位失败:", err);
          // ElMessage.warning("定位失败，已使用默认位置");
        }
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
  }
};

// 创建轨迹线
const createTrackPolyline = () => {
  if (trackPolyline) map.removeOverLay(trackPolyline);
  trackPolyline = new T.Polyline([], {
    color: "#2C64A7",
    weight: 4,
    opacity: 0.8,
    lineStyle: "solid",
  });
  map.addOverLay(trackPolyline);
};
// 生命周期钩子
onMounted(() => {
  initMap();
  uploadFile();
});
const uploadFile = async () => {
  let sdaasfa = [
    {
      lat: 39.94357,
      lon: 116.50452,
    },
    {
      lat: 39.92014,
      lon: 116.49061,
    },
    {
      lat: 39.92159,
      lon: 116.52134,
    },
  ];
  markRouteOnMap(sdaasfa);
  console.log(response, "===222==");
};
// 在地图上标注航线点
const markRouteOnMap = (routeData) => {
  if (!map) {
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
      const { lat, lon } = point;

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
let routeMarkers = [];
let routeLabels = [];
let routePolyline = null;
const clearRouteMarkers = () => {
  if (map) {
    // 清除标记
    routeMarkers.forEach((marker) => {
      try {
        map.removeOverLay(marker);
      } catch (error) {
        /* 忽略错误 */
      }
    });
    routeMarkers = [];

    // 清除标签
    routeLabels.forEach((label) => {
      try {
        map.removeControl(label);
      } catch (error) {
        /* 忽略错误 */
      }
    });
    routeLabels = [];

    // 清除航线
    if (routePolyline) {
      try {
        map.removeOverLay(routePolyline);
      } catch (error) {
        /* 忽略错误 */
      }
      routePolyline = null;
    }
  }
};
// 绘制航线（增加天地图兼容性处理）
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
    // 创建新航线（天地图不支持arrowheads属性，移除该属性）
    routePolyline = new T.Polyline(routePoints, {
      color: "#409EFF",
      weight: 4,
      opacity: 0.8,
      lineStyle: "solid",
      // 移除arrowheads属性，天地图不支持
    });

    map.addOverLay(routePolyline);
  } catch (lineErr) {
    console.error("绘制航线失败：", lineErr);
    ElMessage.warning("绘制航线失败");
  }
};

// 优化：调整地图视图以显示完整航线（天地图兼容版）
const fitMapToRoute = (routePoints) => {
  if (!map || routePoints.length === 0) return;

  try {
    if (routePoints.length === 1) {
      // 只有一个点时，直接定位到该点
      map.panTo(routePoints[0]); // 使用panTo替代setCenter
      map.setZoom(15); // 设置合适的缩放级别
      return;
    }

    // 计算所有点的经纬度范围（优化版）
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

    // 计算中心点
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerPoint = new T.LngLat(centerLng, centerLat);

    // 计算经纬度跨度
    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;

    // 计算合适的缩放级别（优化算法）
    let zoomLevel = calculateOptimalZoom(lngSpan, latSpan);

    // 添加边距调整
    const marginFactor = 1.2; // 边距系数，可调整
    const adjustedLngSpan = lngSpan * marginFactor;
    const adjustedLatSpan = latSpan * marginFactor;

    // 重新计算考虑边距的缩放级别
    zoomLevel = calculateOptimalZoom(adjustedLngSpan, adjustedLatSpan);

    // 设置地图中心点和缩放级别
    map.panTo(centerPoint); // 使用panTo替代setCenter
    map.setZoom(zoomLevel);

    console.log(
      `地图视野调整完成，中心点: (${centerLng}, ${centerLat}), 缩放级别: ${zoomLevel}`
    );
  } catch (viewErr) {
    console.error("调整地图视图失败：", viewErr);
    ElMessage.warning("无法自动调整地图视野，请手动缩放查看航线");
  }
};
// 优化：计算最优缩放级别（独立函数）
const calculateOptimalZoom = (lngSpan, latSpan) => {
  // 经纬度跨度到实际距离的转换（简化计算，1度约等于111公里）
  const lngDistance = lngSpan * 111;
  const latDistance = latSpan * 111;

  // 计算地图需要显示的最大距离
  const maxDistance = Math.max(lngDistance, latDistance);

  // 根据距离计算缩放级别（天地图缩放级别范围：1-18）
  let zoomLevel = 18; // 最大缩放级别

  if (maxDistance > 1000) {
    zoomLevel = 10;
  } else if (maxDistance > 100) {
    zoomLevel = 13;
  } else if (maxDistance > 10) {
    zoomLevel = 16;
  } else {
    zoomLevel = 18;
  }

  // 确保缩放级别在有效范围内
  return Math.max(1, Math.min(18, zoomLevel));
};
</script>
<style scoped>
.drone-monitor {
  width: 100%;
  height: 100vh;
  /* 使用视口高度确保全屏显示 */
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  scroll-margin-top: 20px; /* 滚动到顶部后保留20px距离 */
  /* 确保padding和border不影响整体尺寸 */
}

/* 地图容器 */
.map-container {
  width: 100%;
  height: 100%;
  background: #eaf4ff;
  z-index: 0;
}
/* 标记点样式（深度选择器确保生效） */
:deep(.tdt-div-icon .route-marker) {
  width: 40px;
  height: 40px;
  border-radius: 50% !important;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  font-size: 16px;
  transition: transform 0.3s ease;
}

:deep(.tdt-div-icon .start) {
  background-color: #f56c6c !important;
  /* 起点红色 */
}

:deep(.tdt-div-icon .end) {
  background-color: #67c23a !important;
  /* 终点绿色 */
}

:deep(.tdt-div-icon .middle) {
  background-color: #409eff !important;
  /* 中间点蓝色 */
}
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
</style>
