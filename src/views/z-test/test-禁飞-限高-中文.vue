<template>
  <div class="map-wrapper">
    <div id="map" class="map-container"></div>

    <!-- 控制工具栏 -->
    <div class="control-toolbar" v-show="false">
      <h3>无人机区域管理系统</h3>

      <!-- 禁飞区操作 -->
      <div class="section-title">禁飞区</div>
      <button @click="startDrawNoFlyPolygon" class="btn primary">
        <i class="icon-polygon"></i> 绘制多边形禁飞区
      </button>
      <button @click="startDrawNoFlyCircle" class="btn primary">
        <i class="icon-circle"></i> 绘制圆形禁飞区
      </button>

      <!-- 限高区操作 -->
      <div class="section-title">限高区</div>
      <button @click="startDrawHeightLimitPolygon" class="btn warning">
        <i class="icon-polygon"></i> 绘制多边形限高区
      </button>
      <button @click="startDrawHeightLimitCircle" class="btn warning">
        <i class="icon-circle"></i> 绘制圆形限高区
      </button>
      <div class="height-input" v-if="isDrawingHeightLimit">
        <label>限高值(米):</label>
        <input
          type="number"
          v-model.number="currentHeightLimit"
          min="1"
          max="1000"
          placeholder="输入限高值"
        />
      </div>

      <!-- 航线操作 -->
      <div class="section-title">航线规划</div>
      <button @click="startDrawRoute" class="btn success">
        <i class="icon-route"></i> 规划航线
      </button>
      <div class="height-input" v-if="isDrawingRoute">
        <label>航线高度(米):</label>
        <input
          type="number"
          v-model.number="currentRouteHeight"
          min="1"
          max="1000"
          placeholder="输入航线高度"
        />
      </div>

      <!-- 通用操作 -->
      <button @click="toggleEditMode" class="btn secondary">
        <i v-if="!isEditing" class="icon-edit"></i>
        <i v-if="isEditing" class="icon-save"></i>
        {{ isEditing ? "保存编辑" : "编辑区域" }}
      </button>

      <!-- 数据操作按钮 -->
      <button @click="exportZones" class="btn secondary">
        <i class="icon-export"></i> 导出数据
      </button>
      <button @click="importZones" class="btn secondary">
        <i class="icon-import"></i> 导入数据
      </button>
      <button @click="clearAllZones" class="btn danger">
        <i class="icon-trash"></i> 清除所有区域
      </button>

      <div class="legend">
        <div class="legend-item">
          <div class="legend-color red"></div>
          <span>禁飞区域</span>
        </div>
        <div class="legend-item">
          <div class="legend-color yellow"></div>
          <span>限高区域</span>
        </div>
        <div class="legend-item">
          <div class="legend-color blue"></div>
          <span>航线</span>
        </div>
        <div class="legend-item">
          <div class="legend-color green"></div>
          <span>航线检查点</span>
        </div>
      </div>

      <div class="route-info" v-if="routeDistance">
        <h4>航线信息</h4>
        <p>总距离: {{ routeDistance.toFixed(2) }} 公里</p>
        <p>检查点: {{ checkpointCount }} 个</p>
        <p>航线高度: {{ currentRouteHeight }} 米</p>
        <p v-if="hasNoFlyViolation" style="color: #e74c3c">
          警告: 航线穿过禁飞区!
        </p>
        <p v-if="hasHeightViolation" style="color: #f39c12">
          警告: 航线高度超过限高区!
        </p>
        <p
          v-if="!hasNoFlyViolation && !hasHeightViolation"
          style="color: #2ecc71"
        >
          航线安全: 符合空域规定
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// 天地图密钥
const TIAN_DI_TU_KEY = import.meta.env.VITE_APP_TIANDITU_KEY || "69a5cdb2a588f9138791d3ec5136addc";
let map = null;
let drawControl = null;
let noFlyZonesLayer = null;
let heightLimitZonesLayer = null;
let routeLayer = null;
let checkpointsLayer = null;

// 状态管理
const isEditing = ref(false);
const isDrawingHeightLimit = ref(false);
const isDrawingRoute = ref(false);
const currentHeightLimit = ref(120); // 默认限高120米
const currentRouteHeight = ref(100); // 默认航线高度100米
const routeDistance = ref(0);
const checkpointCount = ref(0);
const hasNoFlyViolation = ref(false); // 禁飞区冲突
const hasHeightViolation = ref(false); // 限高冲突

// 区域数据存储
const zones = ref([]); // 统一存储禁飞区和限高区

// 生成唯一ID
const generateId = () => {
  return "zone-" + Math.random().toString(36).substr(2, 9);
};

// 获取区域样式
const getZoneStyle = (zoneType) => {
  if (zoneType === "noFly") {
    return {
      color: "#e74c3c",
      weight: 2,
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    };
  } else {
    return {
      color: "#f39c12",
      weight: 2,
      fillColor: "#f39c12",
      fillOpacity: 0.3,
    };
  }
};

onMounted(() => {
  // 1. 初始化地图实例
  map = L.map("map", {
    center: [39.9042, 116.4074],
    zoom: 13,
    maxZoom: 18,
    minZoom: 1,
  });

  // 2. 先加载天地图图层（地图必须先有基础图层才能正常显示）
  const baseLayer = L.tileLayer(
    `//t0.tianditu.gov.cn/img_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=${TIAN_DI_TU_KEY}`,
    {
      attribution: "© 天地图",
      tileSize: 256,
      crossOrigin: "",
    }
  ).addTo(map);

  const labelLayer = L.tileLayer(
    `//t0.tianditu.gov.cn/cia_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=${TIAN_DI_TU_KEY}`,
    {
      attribution: "© 天地图",
      tileSize: 256,
      crossOrigin: "",
    }
  ).addTo(map);

  // 3. 初始化子图层（不添加到地图，仅作为容器）
  noFlyZonesLayer = L.featureGroup(); // 不直接 addTo(map)
  heightLimitZonesLayer = L.featureGroup(); // 不直接 addTo(map)

  // 4. 关键：创建可编辑图层组，直接包含所有子图层的图层
  const allZonesLayer = L.featureGroup().addTo(map);

  // 5. 加载数据时，将图层同时添加到子图层组和可编辑图层组
  loadZonesFromStorage(allZonesLayer); // 传入 allZonesLayer

  // 6. 初始化绘图控件
  initDrawControl(allZonesLayer);
  initDrawEvents(allZonesLayer); // 传入编辑组，用于新绘制图层的关联

  // 监听编辑事件
  map.on(L.Draw.Event.EDITED, (e) => {
    if (e.layers && e.layers.length > 0) {
      e.layers.eachLayer((layer) => {
        if (layer._zoneId && layer._zoneType) {
          const type = layer instanceof L.Polygon ? "polygon" : "circle";
          const realLayer = getRealShapeLayer(layer, type);
          const area = calculateArea(realLayer, type);

          // 更新区域数据
          updateZoneInCollection(
            layer._zoneId,
            realLayer,
            type,
            area,
            layer._zoneType
          );
        }
      });
    }
  });

  // 监听删除事件
  map.on(L.Draw.Event.DELETED, (e) => {
    if (e.layers && e.layers.length > 0) {
      e.layers.eachLayer((layer) => {
        if (layer._zoneId) {
          deleteZone(layer._zoneId);
        }
      });
    }
  });
});

// 初始化绘图控件
const initDrawControl = (allZonesLayer) => {
  // 严格校验图层组有效性
  if (!map || !allZonesLayer || !(allZonesLayer instanceof L.FeatureGroup)) {
    console.error("无效的图层组，无法初始化绘图控件");
    return;
  }

  // 确保图层组已添加到地图
  if (!map.hasLayer(allZonesLayer)) {
    map.addLayer(allZonesLayer);
  }

  // 设置Leaflet Draw的本地化中文
  if (L.drawLocal) {
    L.drawLocal.draw.toolbar.actions.text = "保存";
    L.drawLocal.draw.toolbar.finish.text = "完成";
    L.drawLocal.draw.toolbar.undo.text = "删除最后一个点";
    L.drawLocal.draw.toolbar.buttons.polyline = "绘制折线";
    L.drawLocal.draw.toolbar.buttons.polygon = "绘制多边形";
    L.drawLocal.draw.toolbar.buttons.rectangle = "绘制矩形";
    L.drawLocal.draw.toolbar.buttons.circle = "绘制圆形";
    L.drawLocal.draw.toolbar.buttons.marker = "绘制标记";
    L.drawLocal.draw.toolbar.buttons.circlemarker = "绘制圆形标记";

    L.drawLocal.draw.handlers.circle.tooltip.start = "点击并拖动绘制圆形";
    L.drawLocal.draw.handlers.circle.radius = "半径";

    L.drawLocal.draw.handlers.polygon.tooltip.start = "点击开始绘制多边形";
    L.drawLocal.draw.handlers.polygon.tooltip.cont = "继续点击添加顶点";
    L.drawLocal.draw.handlers.polygon.tooltip.end = "点击第一个点完成绘制";

    L.drawLocal.draw.handlers.polyline.tooltip.start = "点击开始绘制折线";
    L.drawLocal.draw.handlers.polyline.tooltip.cont = "点击继续绘制折线";
    L.drawLocal.draw.handlers.polyline.tooltip.end = "点击最后一个点完成折线";

    L.drawLocal.edit.toolbar.buttons.edit = "编辑图层";
    L.drawLocal.edit.toolbar.buttons.remove = "删除图层";
    L.drawLocal.edit.toolbar.actions.save.text = "保存";
    L.drawLocal.edit.toolbar.actions.clearAll.text = "全部清除";
    L.drawLocal.edit.toolbar.actions.cancel.text = "取消";
    L.drawLocal.edit.handlers.remove.tooltip.text = "单击删除";
    L.drawLocal.edit.handlers.edit.tooltip.subtext = "单击“取消”撤消更改。";
    L.drawLocal.edit.handlers.edit.tooltip.text =
      "拖动控制柄或标记以编辑特征。";
    console.log(L.drawLocal, "编辑");
  }

  drawControl = new L.Control.Draw({
    position: "topleft",
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: false,
        shapeOptions: {
          color: "#e74c3c",
          weight: 2,
          fillOpacity: 0.3,
        },
      },
      circle: {
        shapeOptions: {
          color: "#e74c3c",
          weight: 2,
          fillOpacity: 0.3,
        },
      },
      marker: false,
      polyline: false,
      rectangle: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: allZonesLayer, // 必须指定可编辑图层组
      remove: true, // 允许删除
      edit: {
        // 改为对象格式，配置编辑时的样式
        selectedPathOptions: {
          // 编辑状态下的样式（必填）
          color: "#3498db", // 选中时的边框颜色
          weight: 3, // 选中时的边框宽度
          dashArray: "5, 5", // 选中时的虚线样式
        },
      },
    },
  });

  map.addControl(drawControl);
  // 确认工具栏已创建（调试用）
  console.log("绘图控件初始化完成", drawControl);
  console.log("编辑工具栏", drawControl._toolbars?.edit);
  // 设置按钮提示
  setTimeout(() => {
    const toolbarButtons = document.querySelectorAll(".leaflet-draw-toolbar a");
    toolbarButtons.forEach((button) => {
      if (button.classList.contains("leaflet-draw-draw-polygon")) {
        button.title = "绘制多边形";
      } else if (button.classList.contains("leaflet-draw-draw-circle")) {
        button.title = "绘制圆形";
      } else if (button.classList.contains("leaflet-draw-edit-edit")) {
        button.title = "编辑区域";
      } else if (button.classList.contains("leaflet-draw-edit-remove")) {
        button.title = "删除区域";
      }
    });
  }, 300);
};

// 初始化绘图事件监听
const initDrawEvents = (allZonesLayer) => {
  if (!map || !allZonesLayer) return;

  let currentZoneType = "noFly";

  map.on(L.Draw.Event.CREATED, (e) => {
    const drawLayer = e.layer; // 这是 Leaflet Draw 的包装层（NewClass）
    const type = e.layerType;

    // 提取原生图层
    const nativeLayer = getRealShapeLayer(drawLayer, type);
    if (!nativeLayer) return;

    // 复制包装层的坐标到原生图层（确保数据一致）
    if (type === "polygon") {
      nativeLayer.setLatLngs(drawLayer.getLatLngs());
    } else if (type === "circle") {
      nativeLayer.setLatLng(drawLayer.getLatLng());
      nativeLayer.setRadius(drawLayer.getRadius());
    }

    // 设置样式和弹窗（应用到原生图层）
    nativeLayer.setStyle(getZoneStyle(currentZoneType));
    const areaText = getAreaText(nativeLayer, type);
    const popupContent =
      currentZoneType === "noFly"
        ? `<b>禁飞区</b><br>${areaText}`
        : `<b>限高区</b><br>${areaText}<br>限高: ${currentHeightLimit.value} 米`;
    nativeLayer.bindPopup(popupContent);

    // 关键：移除包装层，添加原生图层到地图和编辑组
    map.removeLayer(drawLayer); // 移除包装层
    if (currentZoneType === "noFly") {
      noFlyZonesLayer.addLayer(nativeLayer);
    } else {
      heightLimitZonesLayer.addLayer(nativeLayer);
    }
    allZonesLayer.addLayer(nativeLayer); // 编辑组只包含原生图层

    // 标记ID和类型（原生图层上）
    nativeLayer._zoneId = generateId();
    nativeLayer._zoneType = currentZoneType;
    if (currentZoneType === "heightLimit") {
      nativeLayer._heightLimit = currentHeightLimit.value;
    }

    // 保存到数据集合（使用原生图层）
    saveZoneToCollection(
      nativeLayer,
      type,
      calculateArea(nativeLayer, type),
      currentZoneType
    );

    // 调试：确认图层类型
    console.log("新添加的原生图层类型:", nativeLayer.constructor.name);

    // 重置状态
    isDrawingHeightLimit.value = false;
  });
  // 设置绘制模式
  window.setDrawMode = (shape, zoneType) => {
    if (!drawControl || !map) return;

    if (isEditing.value) {
      toggleEditMode();
    }

    currentZoneType = zoneType;
    const drawToolbar = drawControl.getDrawToolbar
      ? drawControl.getDrawToolbar()
      : drawControl._toolbars.draw;

    if (drawToolbar && drawToolbar._modes[shape].handler) {
      // 更新绘制样式
      drawToolbar._modes[shape].handler.options.shapeOptions =
        getZoneStyle(zoneType);

      // 重置绘制状态
      drawToolbar._modes[shape].handler.disable();
      setTimeout(() => {
        drawToolbar._modes[shape].handler.enable();
      }, 100);

      // 显示限高输入框
      isDrawingHeightLimit.value = zoneType === "heightLimit";
      isDrawingRoute.value = false;
    }
  };
};

// 绘制禁飞区
const startDrawNoFlyPolygon = () => {
  window.setDrawMode("polygon", "noFly");
};

const startDrawNoFlyCircle = () => {
  window.setDrawMode("circle", "noFly");
};

// 绘制限高区
const startDrawHeightLimitPolygon = () => {
  window.setDrawMode("polygon", "heightLimit");
};

const startDrawHeightLimitCircle = () => {
  window.setDrawMode("circle", "heightLimit");
};

// 开始绘制航线
const startDrawRoute = () => {
  if (!map) return;

  // 清除现有航线和检查点
  routeLayer.clearLayers();
  checkpointsLayer.clearLayers();
  routeDistance.value = 0;
  checkpointCount.value = 0;
  hasNoFlyViolation.value = false;
  hasHeightViolation.value = false;

  // 提示用户开始绘制航线
  alert("请在地图上点击添加检查点，双击结束绘制。");

  // 创建可绘制的折线
  const polyline = L.polyline([], {
    color: "#3498db",
    weight: 4,
    opacity: 0.7,
    dashArray: "10, 10",
  }).addTo(routeLayer);

  let isDrawing = true;
  let points = [];

  // 鼠标点击事件
  const onMapClick = (e) => {
    if (!isDrawing) return;

    const latlng = e.latlng;
    points.push(latlng);
    polyline.setLatLngs(points);

    // 添加检查点
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "checkpoint-marker",
        html: '<div style="background-color: #2ecc70; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 3px #2ecc70;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    }).addTo(checkpointsLayer);

    marker.bindPopup(
      `检查点 ${points.length}<br>位置: ${latlng.lat.toFixed(
        4
      )}, ${latlng.lng.toFixed(4)}<br>高度: ${currentRouteHeight.value}米`
    );

    // 检查冲突
    checkRouteViolation(points);
  };

  // 双击结束绘制
  const onMapDblClick = () => {
    if (points.length < 2) {
      alert("航线至少需要两个检查点");
      return;
    }

    isDrawing = false;
    map.off("click", onMapClick);
    map.off("dblclick", onMapDblClick);

    // 计算航线距离
    calculateRouteDistance(points);

    // 更新检查点数量
    checkpointCount.value = points.length;

    // 检查冲突
    checkRouteViolation(points);

    // 显示结果提示
    let message = `航线规划完成! 总距离: ${routeDistance.value.toFixed(
      2
    )}公里, 检查点: ${points.length}个`;
    if (hasNoFlyViolation.value) message += "\n警告: 航线穿过禁飞区!";
    if (hasHeightViolation.value) message += "\n警告: 航线高度超过限高区!";
    alert(message);
  };

  // 绑定事件
  map.on("click", onMapClick);
  map.on("dblclick", onMapDblClick);
  isDrawingRoute.value = true;
  isDrawingHeightLimit.value = false;
};

// 检查航线冲突
const checkRouteViolation = (routePoints) => {
  if (!routePoints || routePoints.length < 2) return;

  hasNoFlyViolation.value = false;
  hasHeightViolation.value = false;

  // 检查禁飞区冲突
  noFlyZonesLayer.eachLayer((zone) => {
    if (hasNoFlyViolation.value) return;

    if (isRouteIntersectingZone(routePoints, zone)) {
      hasNoFlyViolation.value = true;
      zone.setStyle({
        color: "#ff0000",
        fillColor: "#ff0000",
        fillOpacity: 0.5,
      });
    } else {
      zone.setStyle(getZoneStyle("noFly"));
    }
  });

  // 检查限高区冲突
  heightLimitZonesLayer.eachLayer((zone) => {
    if (hasHeightViolation.value) return;

    if (
      isRouteIntersectingZone(routePoints, zone) &&
      currentRouteHeight.value > zone._heightLimit
    ) {
      hasHeightViolation.value = true;
      zone.setStyle({
        color: "#ff9800",
        fillColor: "#ff9800",
        fillOpacity: 0.5,
      });
    } else {
      zone.setStyle(getZoneStyle("heightLimit"));
    }
  });

  // 无冲突时恢复所有区域样式
  if (!hasNoFlyViolation.value) {
    noFlyZonesLayer.eachLayer((zone) => {
      zone.setStyle(getZoneStyle("noFly"));
    });
  }

  if (!hasHeightViolation.value) {
    heightLimitZonesLayer.eachLayer((zone) => {
      zone.setStyle(getZoneStyle("heightLimit"));
    });
  }
};

// 检查航线是否与区域相交
const isRouteIntersectingZone = (routePoints, zone) => {
  if (zone instanceof L.Polygon) {
    const zonePoints = zone.getLatLngs()[0];
    const polyBounds = L.latLngBounds(zonePoints);

    // 检查航线线段是否与多边形边界盒相交
    for (let i = 0; i < routePoints.length - 1; i++) {
      const lineBounds = L.latLngBounds([routePoints[i], routePoints[i + 1]]);
      if (lineBounds.intersects(polyBounds)) {
        return true;
      }
    }
  } else if (zone instanceof L.Circle) {
    const center = zone.getLatLng();
    const radius = zone.getRadius();
    const circleBounds = L.latLngBounds(
      [center.lat - radius / 111000, center.lng - radius / 111000],
      [center.lat + radius / 111000, center.lng + radius / 111000]
    );

    // 检查航线线段是否与圆形边界盒相交
    for (let i = 0; i < routePoints.length - 1; i++) {
      const lineBounds = L.latLngBounds([routePoints[i], routePoints[i + 1]]);
      if (lineBounds.intersects(circleBounds)) {
        return true;
      }
    }
  }

  return false;
};

// 计算航线距离
const calculateRouteDistance = (points) => {
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // 使用Haversine公式计算两点间距离(公里)
    const R = 6371;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }

  routeDistance.value = totalDistance;
};

// 保存区域到集合和本地存储
const saveZoneToCollection = (layer, type, area, zoneType) => {
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

  // 创建区域对象
  const zoneData = {
    id,
    zoneType,
    type,
    coordinates,
    area,
    createdAt: new Date().toISOString(),
  };

  // 限高区添加高度属性
  if (zoneType === "heightLimit") {
    zoneData.height = currentHeightLimit.value;
    layer._heightLimit = currentHeightLimit.value;
  }

  // 添加到列表
  zones.value.push(zoneData);

  // 保存到本地存储
  saveZonesToStorage();

  // 在图层上标记ID和类型
  layer._zoneId = id;
  layer._zoneType = zoneType;
};

// 保存到本地存储
const saveZonesToStorage = () => {
  try {
    localStorage.setItem("droneZones", JSON.stringify(zones.value));
  } catch (error) {
    console.error("保存区域数据失败:", error);
  }
};

// 从本地存储加载数据
const loadZonesFromStorage = (allZonesLayer) => {
  try {
    const storedZones = localStorage.getItem("droneZones");
    if (storedZones) {
      zones.value = JSON.parse(storedZones);
      drawZonesFromStorage(allZonesLayer); // 传入可编辑图层组
    }
  } catch (error) {
    console.error("加载区域数据失败:", error);
  }
};

// 从存储数据绘制区域到地图
const drawZonesFromStorage = (allZonesLayer) => {
  if (!map || !allZonesLayer) return;

  zones.value.forEach((zone) => {
    let nativeLayer;
    // 强制创建原生图层
    if (zone.type === "polygon") {
      // 确保坐标是二维数组（原生 Polygon 要求）
      const latLngs = Array.isArray(zone.coordinates[0])
        ? zone.coordinates.map((lngLat) =>
            lngLat.map((pt) => L.latLng(pt.lat, pt.lng))
          )
        : [zone.coordinates.map((pt) => L.latLng(pt.lat, pt.lng))];
      nativeLayer = L.polygon(latLngs, getZoneStyle(zone.zoneType));
    } else {
      const center = L.latLng(
        zone.coordinates.center.lat,
        zone.coordinates.center.lng
      );
      nativeLayer = L.circle(center, {
        radius: zone.coordinates.radius,
        ...getZoneStyle(zone.zoneType),
      });
    }

    // 绑定弹窗和属性
    nativeLayer.bindPopup(`...`); // 弹窗内容保持不变
    nativeLayer._zoneId = zone.id;
    nativeLayer._zoneType = zone.zoneType;
    if (zone.zoneType === "heightLimit") {
      nativeLayer._heightLimit = zone.height;
    }

    // 添加到图层组（只添加原生图层）
    allZonesLayer.addLayer(nativeLayer);
    if (zone.zoneType === "noFly") {
      noFlyZonesLayer.addLayer(nativeLayer);
    } else {
      heightLimitZonesLayer.addLayer(nativeLayer);
    }

    // 调试：加载的图层类型
    console.log("从存储加载的原生图层类型:", nativeLayer.constructor.name);
  });
};

// 导出区域数据
const exportZones = () => {
  const data = JSON.stringify(zones.value, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `drone-zones-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 导入区域数据
const importZones = () => {
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
          zones.value = importedZones;

          // 清空现有图层
          noFlyZonesLayer.clearLayers();
          heightLimitZonesLayer.clearLayers();
          // 关键：获取当前编辑组并重新绘制
          const allZonesLayer = drawControl?.options.edit.featureGroup;
          if (allZonesLayer) {
            allZonesLayer.clearLayers(); // 清空编辑组
            drawZonesFromStorage(allZonesLayer); // 重新添加到编辑组
          }

          alert("区域数据导入成功");
        } catch (error) {
          console.error("导入数据失败:", error);
          alert("导入数据格式错误");
        }
      };
      reader.readAsText(file);
    }
  };

  input.click();
};

// 更新区域数据
const updateZoneInCollection = (id, layer, type, area, zoneType) => {
  const index = zones.value.findIndex((zone) => zone.id === id);
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

    const updatedData = {
      ...zones.value[index],
      coordinates,
      area,
      updatedAt: new Date().toISOString(),
    };

    // 如果是限高区，保留高度信息
    if (zoneType === "heightLimit") {
      updatedData.height = zones.value[index].height;
    }

    zones.value[index] = updatedData;
    saveZonesToStorage();
  }
};

// 删除区域
const deleteZone = (id) => {
  zones.value = zones.value.filter((zone) => zone.id !== id);
  saveZonesToStorage();
};

const getRealShapeLayer = (layer, type) => {
  // 关键：从 Leaflet Draw 的包装层中提取原生图层
  const extractNativeLayer = (l) => {
    // 如果是包装层，提取内部原生图层
    if (l._shape) {
      return l._shape; // _shape 存储原生 Polygon/Circle
    }
    // 如果是图层组，递归提取
    if (l instanceof L.LayerGroup || l instanceof L.FeatureGroup) {
      const layers = l.getLayers();
      return layers.length > 0 ? extractNativeLayer(layers[0]) : null;
    }
    // 原生图层直接返回
    if (l instanceof L.Polygon || l instanceof L.Circle) {
      return l;
    }
    return null;
  };

  const nativeLayer = extractNativeLayer(layer);
  if (!nativeLayer) {
    console.error("无法提取原生图层，创建默认图层");
    return type === "polygon"
      ? L.polygon([], getZoneStyle("noFly"))
      : L.circle([0, 0], { radius: 0, ...getZoneStyle("noFly") });
  }

  return nativeLayer;
};
// 计算面积文本
const getAreaText = (layer, type) => {
  try {
    // 再次确认图层类型（双重保险）
    const isPolygon = type === "polygon" && layer instanceof L.Polygon;
    const isCircle = type === "circle" && layer instanceof L.Circle;

    if (isPolygon) {
      // 多边形：优先用 getArea，否则手动计算
      const area = layer.getArea
        ? layer.getArea() / 1000000
        : calculatePolygonArea(layer.getLatLngs()[0]) / 1000000;
      return `面积: ${area.toFixed(2)} 平方公里`;
    } else if (isCircle) {
      // 圆形：优先用 getRadius，否则默认 0
      const radius = layer.getRadius ? layer.getRadius() / 1000 : 0;
      const area = Math.PI * Math.pow(radius, 2);
      return `半径: ${radius.toFixed(2)} 公里<br>面积: ${area.toFixed(
        2
      )} 平方公里`;
    } else {
      return `面积: 不支持的类型（${layer.constructor.name}）`;
    }
  } catch (error) {
    console.error("计算面积时出错:", error);
    return "面积: 计算失败";
  }
};
// const getAreaText = (layer, type) => {
//   try {
//     if (type === "polygon") {
//       if (!(layer instanceof L.Polygon)) {
//         console.warn("图层不是L.Polygon实例", layer);
//         if (layer.getLatLngs) {
//           const latLngs = layer.getLatLngs();
//           if (latLngs && latLngs.length > 0) {
//             const area = calculatePolygonArea(latLngs[0]) / 1000000;
//             return `面积: ${area.toFixed(2)} 平方公里`;
//           }
//         }
//         return "面积: 未知";
//       }

//       const area = layer.getArea() / 1000000;
//       return `面积: ${area.toFixed(2)} 平方公里`;
//     } else if (type === "circle") {
//       const radius = layer.getRadius() / 1000;
//       const area = Math.PI * Math.pow(radius, 2);
//       return `半径: ${radius.toFixed(2)} 公里<br>面积: ${area.toFixed(
//         2
//       )} 平方公里`;
//     }
//     return "面积: 未知类型";
//   } catch (error) {
//     console.error("计算面积时出错:", error);
//     if (type === "polygon" && layer.getLatLngs) {
//       const latLngs = layer.getLatLngs()[0];
//       const area = calculatePolygonArea(latLngs) / 1000000;
//       return `面积: ${area.toFixed(2)} 平方公里`;
//     }
//     return "面积: 计算失败";
//   }
// };

// 计算面积数值
const calculateArea = (layer, type) => {
  try {
    if (type === "polygon") {
      if (layer instanceof L.Polygon) {
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
};

// 计算多边形面积
const calculatePolygonArea = (latLngs) => {
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
};

// 切换编辑模式
const toggleEditMode = () => {
  if (!drawControl || !map) {
    console.error("绘图控件或地图未初始化");
    return;
  }

  // 获取编辑工具栏和可编辑图层
  const editToolbar = drawControl._toolbars?.edit;
  const drawToolbar = drawControl._toolbars?.draw; // 绘图工具栏
  const editableLayers = drawControl.options.edit.featureGroup.getLayers();

  // 调试信息
  console.log("可编辑图层数量:", editableLayers.length);
  editableLayers.forEach((layer, i) => {
    console.log(`图层${i}类型:`, layer.constructor.name);
  });

  if (!editToolbar) {
    console.error("编辑工具栏不存在");
    return;
  }

  // 执行编辑模式切换
  if (!isEditing.value) {
    // 禁用绘图工具栏（兼容写法）
    if (drawToolbar) {
      if (drawToolbar.disable) {
        drawToolbar.disable(); // 通用禁用方法
      } else {
        // 强制关闭所有绘图模式
        Object.values(drawToolbar._modes).forEach((mode) => {
          if (mode.handler && mode.handler.disable) {
            mode.handler.disable();
          }
        });
      }
    }

    // 启用编辑工具栏（使用内部方法兼容）
    if (editToolbar.enable) {
      editToolbar.enable();
    } else if (editToolbar._enableEdit) {
      editToolbar._enableEdit();
    }
    isEditing.value = true;
  } else {
    // 禁用编辑工具栏
    if (editToolbar.disable) {
      editToolbar.disable();
    } else if (editToolbar._disableEdit) {
      editToolbar._disableEdit();
    }

    // 启用绘图工具栏（兼容写法）
    if (drawToolbar && drawToolbar.enable) {
      drawToolbar.enable();
    }
    isEditing.value = false;
  }
};

// 清除所有区域
const clearAllZones = () => {
  if (
    (noFlyZonesLayer || heightLimitZonesLayer) &&
    confirm("确定要清除所有区域吗？")
  ) {
    if (isEditing.value) {
      toggleEditMode();
    }
    noFlyZonesLayer.clearLayers();
    heightLimitZonesLayer.clearLayers();
    routeLayer.clearLayers();
    checkpointsLayer.clearLayers();
    zones.value = [];
    routeDistance.value = 0;
    checkpointCount.value = 0;
    saveZonesToStorage();
  }
};

onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
  drawControl = null;
  noFlyZonesLayer = null;
  heightLimitZonesLayer = null;
  routeLayer = null;
  checkpointsLayer = null;
});
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  width: 100%;
  height: 100%;
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
  width: 280px;
  max-height: 80vh;
  overflow-y: auto;
}

.control-toolbar::-webkit-scrollbar {
  width: 6px;
}

.control-toolbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.control-toolbar::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.section-title {
  font-size: 13px;
  color: #666;
  margin: 12px 0 5px;
  padding-left: 3px;
  font-weight: 500;
}

.btn {
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.primary {
  background-color: #e74c3c;
  color: white;
}

.warning {
  background-color: #f39c12;
  color: white;
}

.success {
  background-color: #2ecc71;
  color: white;
}

.secondary {
  background-color: #f5f5f5;
  color: #333;
}

.danger {
  background-color: #ff5252;
  color: white;
}

.height-input {
  margin: 8px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.height-input label {
  font-size: 13px;
  color: #666;
  width: 70px;
}

.height-input input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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

.icon-route::before {
  content: "➤";
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

.yellow {
  background-color: rgba(243, 156, 18, 0.6);
}

.blue {
  background-color: rgba(52, 152, 219, 0.6);
}

.green {
  background-color: rgba(46, 204, 113, 0.6);
}

/* 自定义Leaflet Draw工具栏样式 */
.leaflet-draw-toolbar a {
  background-image: none !important;
  font-family: "Microsoft YaHei", sans-serif;
  font-size: 12px;
  line-height: 26px;
  text-align: center;
  text-indent: 0;
}

/* 自定义按钮文本 */
.leaflet-draw-toolbar .leaflet-draw-draw-polygon:after {
  content: "多边形";
}

.leaflet-draw-toolbar .leaflet-draw-draw-circle:after {
  content: "圆形";
}

.leaflet-draw-toolbar .leaflet-draw-edit-edit:after {
  content: "编辑";
}

.leaflet-draw-toolbar .leaflet-draw-edit-remove:after {
  content: "删除";
}

/* 自定义提示框样式 */
.leaflet-draw-tooltip {
  font-family: "Microsoft YaHei", sans-serif;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.route-info {
  margin-top: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
}

.route-info h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
}

.route-info p {
  margin: 5px 0;
  color: #666;
}
</style>
