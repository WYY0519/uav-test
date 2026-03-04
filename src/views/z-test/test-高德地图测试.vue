<template>
  <!-- 地图容器：绑定ref用于获取DOM元素 -->
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

// 1. 定义地图容器ref、地图/标记/信息窗实例（用于后续清理）
const mapContainer = ref(null); // 绑定模板中的地图容器
let map = null; // 高德地图实例
let marker = null; // 标记点实例
let infoWindow = null; // 信息窗实例

// 2. 写死的定位参数（可自行修改经纬度/地址）
const fixedPosition = {
  lat: 34.81732, // 纬度（注意：该经纬度对应郑州，需和地址匹配）
  lng: 113.535807, // 经度
  address: "河南省郑州市郑东新区商务外环路", // 修正：匹配经纬度的真实地址
};

// 3. 初始化高德地图逻辑
const initAmap = () => {
  // 校验高德API是否加载完成 
  if (!window.AMap) {
    console.error("高德地图API未加载，请检查API Key或引入链接");
    return;
  }

  // 初始化地图实例
  map = new window.AMap.Map(mapContainer.value, {
    center: [fixedPosition.lng, fixedPosition.lat], // 高德坐标系：经度在前，纬度在后
    zoom: 16, // 缩放级别（1-18）
    resizeEnable: true, // 自适应容器大小
  });

  // 添加定位标记点（蓝色定位图标）
  marker = new window.AMap.Marker({
    position: [fixedPosition.lng, fixedPosition.lat],
    title: "当前定位",
    map: map,
    icon: new window.AMap.Icon({
      size: new window.AMap.Size(30, 30),
      image: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png",
      imageSize: new window.AMap.Size(30, 30),
    }),
  });

  // 添加点击标记的信息弹窗
  infoWindow = new window.AMap.InfoWindow({
    content: `<div style="padding: 10px;">当前定位：${fixedPosition.address}</div>`,
  });
  marker.on("click", () => {
    infoWindow.open(map, marker.getPosition());
  });

  // 强制聚焦到标记点
  map.setCenter([fixedPosition.lng, fixedPosition.lat]);
};

// 4. 生命周期：DOM挂载后初始化地图
onMounted(() => {
  // 确保DOM完全挂载后执行（防抖处理，兼容异步加载）
  setTimeout(initAmap, 100);
});

// 5. 生命周期：组件卸载前清理地图实例（防止内存泄漏）
onUnmounted(() => {
  if (map) {
    map.destroy(); // 销毁地图实例
  }
  marker = null;
  infoWindow = null;
});
</script>

<style scoped>
/* 地图容器样式 */
.map-container {
  width: 100%;
  height: 500px; /* 可根据需求调整高度 */
}
</style>
