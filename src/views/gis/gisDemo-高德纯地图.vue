<template>
  <div class="demo-container">
    <div class="main-content">
      <div class="map-container">
        <div ref="mapContainer" class="map-wrapper"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";

const mapContainer = ref(null);
let map = null;

const initMap = () => {
  if (!window.AMap) {
    ElMessage.error("高德地图API未加载，请检查网络连接");
    return;
  }

  try {
    map = new AMap.Map(mapContainer.value, {
      zoom: 15,
      center: [113.65644, 34.78723],
      viewMode: "3D",
      renderMode: "webgl",
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
    });

    map.on("complete", () => {
      ElMessage.success("地图加载成功");
    });

    map.on("error", (e) => {
      console.error("地图加载错误:", e);
      ElMessage.error("地图加载失败，请刷新页面重试");
    });

    // 添加地图控件
    AMap.plugin(["AMap.ToolBar", "AMap.Scale"], function () {
      map.addControl(new AMap.ToolBar());
      map.addControl(new AMap.Scale());
    });

    // 获取当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.setCenter([lng, lat]);
        },
        (err) => {
          console.warn("定位失败:", err);
          ElMessage.warning("无法获取当前位置");
        }
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败，请检查配置");
  }
};

onMounted(() => {
  (window.__amapReady || Promise.resolve()).then(() => initMap());
});
</script>

<style scoped>
.demo-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
}
</style>
