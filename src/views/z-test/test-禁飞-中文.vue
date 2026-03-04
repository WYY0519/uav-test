<template>
  <div class="map-wrapper">
    <!-- 加载状态提示 -->
    <div v-if="!isLeafletLoaded" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>地图资源加载中...</p>
        <p v-if="loadError" class="error-message">加载失败: {{ loadError }}</p>
      </div>
    </div>

    <div id="map" class="map-container"></div>

    <!-- 控制工具栏 -->
    <div class="control-toolbar">
      <h3>禁飞区管理</h3>
      <button
        @click="startDrawPolygon"
        class="btn primary"
        :disabled="!isMapReady"
      >
        <i class="icon-polygon"></i> 绘制多边形禁飞区
      </button>
      <button
        @click="startDrawCircle"
        class="btn primary"
        :disabled="!isMapReady"
      >
        <i class="icon-circle"></i> 绘制圆形禁飞区
      </button>
      <button
        @click="toggleEditMode"
        class="btn secondary"
        :disabled="!isMapReady"
      >
        <i v-if="!isEditing" class="icon-edit"></i>
        <i v-if="isEditing" class="icon-save"></i>
        {{ isEditing ? "保存编辑" : "编辑禁飞区" }}
      </button>
      <button @click="clearAllZones" class="btn danger" :disabled="!isMapReady">
        <i class="icon-trash"></i> 清除所有禁飞区
      </button>
      <button
        @click="exportZones"
        class="btn secondary"
        :disabled="!isMapReady"
      >
        <i class="icon-export"></i> 导出数据
      </button>
      <button
        @click="importZones"
        class="btn secondary"
        :disabled="!isMapReady"
      >
        <i class="icon-import"></i> 导入数据
      </button>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color red"></div>
          <span>禁飞区域</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";

// 状态管理
const isLeafletLoaded = ref(false);
const isMapReady = ref(false);
const isEditing = ref(false);
const loadError = ref("");
const noFlyZones = ref([]);
const map = ref(null);
const drawControl = ref(null);
const noFlyZonesLayer = ref(null);

// 天地图密钥 - 请替换为你自己的有效密钥
const TIAN_DI_TU_KEY = "69a5cdb2a588f9138791d3ec5136addc";

// 手动加载Leaflet库
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.type = "text/javascript";
    script.onload = resolve;
    script.onerror = () => reject(new Error(`无法加载脚本: ${url}`));
    document.head.appendChild(script);
  });
}

// 确保Leaflet库加载完成
async function ensureLeafletLoaded() {
  try {
    // 检查Leaflet核心是否已加载
    if (typeof window.L === "undefined") {
      loadError.value = "正在加载地图核心库...";
      await loadScript("https://unpkg.com/leaflet@1.7.1/dist/leaflet.js");
    }

    // 检查Leaflet.draw是否已加载
    if (typeof window.L.Draw === "undefined") {
      loadError.value = "正在加载地图绘图库...";
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"
      );
    }

    // 验证加载结果
    if (
      typeof window.L !== "undefined" &&
      typeof window.L.Draw !== "undefined"
    ) {
      isLeafletLoaded.value = true;
      loadError.value = "";
      return true;
    } else {
      throw new Error("地图库加载不完整");
    }
  } catch (error) {
    loadError.value = error.message;
    console.error("Leaflet加载失败:", error);
    return false;
  }
}

// 重点修复：完善Leaflet Draw的本地化中文配置
function setupDrawLocalization() {
  if (!isLeafletLoaded.value) return;

  const L = window.L;

  // 绘图工具栏按钮文本
  L.drawLocal.draw.toolbar = {
    buttons: {
      polygon: "绘制多边形禁飞区",
      circle: "绘制圆形禁飞区",
      marker: "添加标记",
      polyline: "绘制线条",
      rectangle: "绘制矩形",
      circlemarker: "绘制圆形标记",
    },
    actions: {
      title: "取消绘制",
      text: "取消",
    },
    finish: {
      title: "完成绘制",
      text: "完成",
    },
    undo: {
      title: "删除最后一个点",
      text: "删除最后一个点",
    },
  };

  // 多边形绘图提示
  L.drawLocal.draw.handlers.polygon = {
    tooltip: {
      start: "点击地图开始绘制多边形",
      cont: "继续点击添加多边形顶点",
      end: "点击第一个点闭合多边形",
    },
    error: {
      duplicate: "不能在同一点添加两次",
      intersect: "多边形不能交叉",
    },
  };

  // 圆形绘图提示
  L.drawLocal.draw.handlers.circle = {
    tooltip: {
      start: "点击并拖动绘制圆形",
      radius: "半径: {radius} 米",
    },
  };

  // 编辑工具栏
  L.drawLocal.edit = {
    toolbar: {
      buttons: {
        edit: "编辑禁飞区",
        editDisabled: "没有禁飞区可编辑",
        remove: "删除禁飞区",
        removeDisabled: "没有禁飞区可删除",
      },
      actions: {
        save: {
          title: "保存编辑",
          text: "保存",
        },
        cancel: {
          title: "取消编辑，恢复原始状态",
          text: "取消",
        },
        clearAll: {
          title: "清除所有选择",
          text: "清除所有",
        },
      },
    },
    handlers: {
      edit: {
        tooltip: {
          text: "拖动顶点或图形进行编辑",
          subtext: "点击取消放弃更改",
        },
      },
      remove: {
        tooltip: {
          text: "点击图形删除",
        },
      },
    },
  };
}

// 初始化地图
async function initMap() {
  if (!isLeafletLoaded.value) return;

  try {
    const L = window.L;
    await nextTick();

    // 创建地图实例
    map.value = L.map("map", {
      center: [39.9042, 116.4074],
      zoom: 13,
      maxZoom: 18,
      minZoom: 1,
    });

    // 加载天地图图层
    const baseLayer = L.tileLayer(
      `//t0.tianditu.gov.cn/img_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=${TIAN_DI_TU_KEY}`,
      {
        attribution: "© 天地图",
        tileSize: 256,
        crossOrigin: "anonymous",
      }
    ).addTo(map.value);

    const labelLayer = L.tileLayer(
      `//t0.tianditu.gov.cn/cia_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=${TIAN_DI_TU_KEY}`,
      {
        attribution: "© 天地图",
        tileSize: 256,
        crossOrigin: "anonymous",
      }
    ).addTo(map.value);

    // 初始化禁飞区图层
    noFlyZonesLayer.value = L.featureGroup().addTo(map.value);

    // 初始化绘图控件
    initDrawControl();

    // 监听绘图事件
    initDrawEvents();

    // 加载本地存储的数据
    loadZonesFromStorage();

    // 标记地图已准备就绪
    isMapReady.value = true;
  } catch (error) {
    loadError.value = `地图初始化失败: ${error.message}`;
    console.error("地图初始化错误:", error);
  }
}

// 初始化绘图控件
function initDrawControl() {
  if (!map.value || !noFlyZonesLayer.value) return;

  const L = window.L;
  drawControl.value = new L.Control.Draw({
    position: "topleft",
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: false,
        shapeOptions: {
          color: "#e74c3c",
          weight: 2,
          fillColor: "#e74c3c",
          fillOpacity: 0.3,
        },
      },
      circle: {
        shapeOptions: {
          color: "#e74c3c",
          weight: 2,
          fillColor: "#e74c3c",
          fillOpacity: 0.3,
        },
      },
      marker: false,
      polyline: false,
      rectangle: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: noFlyZonesLayer.value,
      remove: true,
    },
  });

  map.value.addControl(drawControl.value);
}

// 初始化绘图事件
function initDrawEvents() {
  if (!map.value || !noFlyZonesLayer.value) return;

  const L = window.L;
  // 监听绘制完成事件
  map.value.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    const type = e.layerType;

    const realLayer = getRealShapeLayer(layer, type);
    let areaText = getAreaText(realLayer, type);
    const areaMatch = areaText.match(/[\d.]+/);
    const area = areaMatch ? parseFloat(areaMatch[0]) : 0;

    realLayer.bindPopup(`<b>禁飞区</b><br>${areaText}`);
    noFlyZonesLayer.value.addLayer(realLayer);
    map.value.fitBounds(realLayer.getBounds(), { padding: [50, 50] });
    saveZoneToCollection(realLayer, type, area);
  });

  // 监听编辑事件
  map.value.on(L.Draw.Event.EDITED, (e) => {
    if (e.layers && e.layers.length > 0) {
      e.layers.eachLayer((layer) => {
        if (layer._zoneId) {
          const type = layer instanceof L.Polygon ? "polygon" : "circle";
          const realLayer = getRealShapeLayer(layer, type);
          const area = calculateArea(realLayer, type);
          updateZoneInCollection(layer._zoneId, realLayer, type, area);
        }
      });
    }
  });

  // 监听删除事件
  map.value.on(L.Draw.Event.DELETED, (e) => {
    if (e.layers && e.layers.length > 0) {
      e.layers.eachLayer((layer) => {
        if (layer._zoneId) {
          deleteZone(layer._zoneId);
        }
      });
    }
  });
}

// 其他函数保持不变（与之前版本相同）
function generateId() {
  return "zone-" + Math.random().toString(36).substr(2, 9);
}

function saveZoneToCollection(layer, type, area) {
  const id = generateId();
  let coordinates;

  if (type === "polygon") {
    coordinates = layer.getLatLngs();
  } else if (type === "circle") {
    coordinates = {
      center: layer.getLatLng(),
      radius: layer.getRadius(),
    };
  }

  noFlyZones.value.push({
    id,
    type,
    coordinates,
    area,
    createdAt: new Date().toISOString(),
  });

  saveZonesToStorage();
  layer._zoneId = id;
}

function saveZonesToStorage() {
  try {
    localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
  } catch (error) {
    console.error("保存禁飞区数据失败:", error);
  }
}

function loadZonesFromStorage() {
  try {
    const storedZones = localStorage.getItem("noFlyZones");
    if (storedZones) {
      noFlyZones.value = JSON.parse(storedZones);
      drawZonesFromStorage();
    }
  } catch (error) {
    console.error("加载禁飞区数据失败:", error);
  }
}

function drawZonesFromStorage() {
  if (!map.value || !noFlyZonesLayer.value) return;

  const L = window.L;
  noFlyZones.value.forEach((zone) => {
    let layer;

    if (zone.type === "polygon") {
      layer = L.polygon(zone.coordinates, {
        color: "#e74c3c",
        weight: 2,
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      });
    } else {
      const center = zone.coordinates.center;
      layer = L.circle(center, {
        radius: zone.coordinates.radius,
        color: "#e74c3c",
        weight: 2,
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      });
    }

    layer.bindPopup(
      `<b>禁飞区</b><br>类型: ${
        zone.type === "polygon" ? "多边形" : "圆形"
      }<br>面积: ${zone.area.toFixed(2)} 平方公里`
    );
    noFlyZonesLayer.value.addLayer(layer);
    layer._zoneId = zone.id;
  });

  if (noFlyZones.value.length > 0) {
    map.value.fitBounds(noFlyZonesLayer.value.getBounds(), {
      padding: [50, 50],
    });
  }
}

function exportZones() {
  const data = JSON.stringify(noFlyZones.value, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `no-fly-zones-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importZones() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedZones = JSON.parse(event.target.result);
          noFlyZones.value = importedZones;

          if (noFlyZonesLayer.value) {
            noFlyZonesLayer.value.clearLayers();
            drawZonesFromStorage();
          }

          alert("禁飞区数据导入成功");
        } catch (error) {
          console.error("导入数据失败:", error);
          alert("导入数据格式错误");
        }
      };
      reader.readAsText(file);
    }
  };

  input.click();
}

function updateZoneInCollection(id, layer, type, area) {
  const index = noFlyZones.value.findIndex((zone) => zone.id === id);
  if (index !== -1) {
    let coordinates;

    if (type === "polygon") {
      coordinates = layer.getLatLngs();
    } else if (type === "circle") {
      coordinates = {
        center: layer.getLatLng(),
        radius: layer.getRadius(),
      };
    }

    noFlyZones.value[index] = {
      ...noFlyZones.value[index],
      coordinates,
      area,
      updatedAt: new Date().toISOString(),
    };

    saveZonesToStorage();
  }
}

function deleteZone(id) {
  noFlyZones.value = noFlyZones.value.filter((zone) => zone.id !== id);
  saveZonesToStorage();
}

function getRealShapeLayer(layer, type) {
  const L = window.L;
  if (layer instanceof L.LayerGroup && layer.getLayers().length > 0) {
    return layer.getLayers()[0];
  } else if (layer instanceof L.FeatureGroup && layer.getLayers().length > 0) {
    return layer.getLayers()[0];
  } else if (
    (type === "polygon" && layer instanceof L.Polygon) ||
    (type === "circle" && layer instanceof L.Circle)
  ) {
    return layer;
  } else {
    console.warn("未知图层类型，创建默认多边形", layer);
    return L.polygon([], {
      color: "#e74c3c",
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    });
  }
}

function getAreaText(layer, type) {
  try {
    if (type === "polygon") {
      if (!(layer instanceof window.L.Polygon)) {
        console.warn("图层不是L.Polygon实例", layer);
        if (layer.getLatLngs) {
          const latLngs = layer.getLatLngs();
          if (latLngs && latLngs.length > 0) {
            const area = calculatePolygonArea(latLngs[0]) / 1000000;
            return `面积: ${area.toFixed(2)} 平方公里（手动计算）`;
          }
        }
        return "面积: 未知";
      }

      const area = layer.getArea() / 1000000;
      return `面积: ${area.toFixed(2)} 平方公里`;
    } else if (type === "circle") {
      const radius = layer.getRadius() / 1000;
      const area = Math.PI * Math.pow(radius, 2);
      return `半径: ${radius.toFixed(2)} 公里<br>面积: ${area.toFixed(
        2
      )} 平方公里`;
    }
    return "面积: 未知类型";
  } catch (error) {
    console.error("计算面积时出错:", error);
    if (type === "polygon" && layer.getLatLngs) {
      const latLngs = layer.getLatLngs()[0];
      const area = calculatePolygonArea(latLngs) / 1000000;
      return `面积: ${area.toFixed(2)} 平方公里（兜底计算）`;
    }
    return "面积: 计算失败";
  }
}

function calculateArea(layer, type) {
  try {
    if (type === "polygon") {
      if (layer instanceof window.L.Polygon) {
        return layer.getArea() / 1000000;
      } else if (layer.getLatLngs) {
        const latLngs = layer.getLatLngs()[0];
        return calculatePolygonArea(latLngs) / 1000000;
      }
    } else if (type === "circle") {
      const radius = layer.getRadius() / 1000;
      return Math.PI * Math.pow(radius, 2);
    }
    return 0;
  } catch (error) {
    console.error("计算面积时出错:", error);
    return 0;
  }
}

function calculatePolygonArea(latLngs) {
  let area = 0;
  const earthRadius = 6371000;
  const rad = Math.PI / 180;

  for (let i = 0; i < latLngs.length; i++) {
    const j = (i + 1) % latLngs.length;
    const lat1 = latLngs[i].lat * rad;
    const lon1 = latLngs[i].lng * rad;
    const lat2 = latLngs[j].lat * rad;
    const lon2 = latLngs[j].lng * rad;

    area += (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
  }

  return Math.abs(area) * Math.pow(earthRadius, 2);
}

function toggleEditMode() {
  if (!drawControl.value || !map.value) return;

  const editToolbar = drawControl.value.getEditToolbar
    ? drawControl.value.getEditToolbar()
    : drawControl.value._toolbars.edit;

  if (!isEditing.value) {
    if (drawControl.value._toolbars.draw) {
      drawControl.value._toolbars.draw.disable();
    }
    if (editToolbar && editToolbar.enable) {
      editToolbar.enable();
      isEditing.value = true;
    }
  } else {
    if (editToolbar && editToolbar.disable) {
      editToolbar.disable();
      isEditing.value = false;
    }
  }
}

function startDrawPolygon() {
  if (!drawControl.value || !map.value) return;

  if (isEditing.value) {
    toggleEditMode();
  }

  const drawToolbar = drawControl.value.getDrawToolbar
    ? drawControl.value.getDrawToolbar()
    : drawControl.value._toolbars.draw;

  if (drawToolbar && drawToolbar._modes.polygon.handler) {
    drawToolbar._modes.polygon.handler.disable();
    setTimeout(() => {
      drawToolbar._modes.polygon.handler.enable();
    }, 100);
  }
}

function startDrawCircle() {
  if (!drawControl.value || !map.value) return;

  if (isEditing.value) {
    toggleEditMode();
  }

  const drawToolbar = drawControl.value.getDrawToolbar
    ? drawControl.value.getDrawToolbar()
    : drawControl.value._toolbars.draw;

  if (drawToolbar && drawToolbar._modes.circle.handler) {
    drawToolbar._modes.circle.handler.disable();
    setTimeout(() => {
      drawToolbar._modes.circle.handler.enable();
    }, 100);
  }
}

function clearAllZones() {
  if (noFlyZonesLayer.value && confirm("确定要清除所有禁飞区吗？")) {
    if (isEditing.value) {
      toggleEditMode();
    }
    noFlyZonesLayer.value.clearLayers();
    noFlyZones.value = [];
    saveZonesToStorage();
  }
}

onMounted(async () => {
  // 确保Leaflet加载完成
  const loaded = await ensureLeafletLoaded();
  if (!loaded) return;

  // 设置本地化
  setupDrawLocalization();

  // 初始化地图
  await initMap();
});

onUnmounted(() => {
  if (map.value) {
    map.value.off();
    map.value.remove();
  }
  drawControl.value = null;
  noFlyZonesLayer.value = null;
  isMapReady.value = false;
});
</script>

<style scoped>
/* 样式与之前版本相同 */
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 15px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  color: #e74c3c;
  margin-top: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.control-toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 240px;
}

h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.btn {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.primary {
  background-color: #4285f4;
  color: white;
}

.secondary {
  background-color: #f5f5f5;
  color: #333;
}

.danger {
  background-color: #e74c3c;
  color: white;
}

.icon-polygon::before {
  content: "▰";
  margin-right: 5px;
  font-size: 16px;
}

.icon-circle::before {
  content: "○";
  margin-right: 5px;
  font-size: 16px;
}

.icon-edit::before {
  content: "✎";
  margin-right: 5px;
  font-size: 16px;
}

.icon-save::before {
  content: "✓";
  margin-right: 5px;
  font-size: 16px;
}

.icon-trash::before {
  content: "✕";
  margin-right: 5px;
  font-size: 16px;
}

.icon-export::before {
  content: "⤓";
  margin-right: 5px;
  font-size: 16px;
}

.icon-import::before {
  content: "⤒";
  margin-right: 5px;
  font-size: 16px;
}

.legend {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 2px;
}

.red {
  background-color: rgba(231, 76, 60, 0.6);
}

/* 自定义Leaflet样式 */
:deep(.leaflet-draw-toolbar a) {
  background-image: none !important;
  font-family: "Microsoft YaHei", sans-serif;
  font-size: 12px;
  line-height: 26px;
  text-align: center;
  text-indent: 0;
}

:deep(.leaflet-draw-tooltip) {
  font-family: "Microsoft YaHei", sans-serif;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

:deep(.leaflet-draw-tooltip:before) {
  border-right-color: rgba(0, 0, 0, 0.7);
}

:deep(.leaflet-draw-toolbar .leaflet-draw-draw-polygon:after) {
  content: "多边形";
}

:deep(.leaflet-draw-toolbar .leaflet-draw-draw-circle:after) {
  content: "圆形";
}

:deep(.leaflet-draw-toolbar .leaflet-draw-edit-edit:after) {
  content: "编辑";
}

:deep(.leaflet-draw-toolbar .leaflet-draw-edit-remove:after) {
  content: "删除";
}
</style>
