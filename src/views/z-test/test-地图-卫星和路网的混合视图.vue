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
onMounted(() => {
  initMap();
});
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
</style>
