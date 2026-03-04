<template>
  <div class="map-wrapper">
    <div id="map" class="map-container"></div>

    <!-- 控制工具栏 -->
    <div class="control-toolbar">
      <h3>禁飞区管理系统</h3>
      <button @click="startDrawPolygon" class="btn primary">
        <i class="icon-polygon"></i> 绘制多边形禁飞区
      </button>
      <button @click="startDrawCircle" class="btn primary">
        <i class="icon-circle"></i> 绘制圆形禁飞区
      </button>
      <button @click="startDrawRoute" class="btn success">
        <i class="icon-route"></i> 规划航线
      </button>
      <button @click="toggleEditMode" class="btn secondary">
        <i v-if="!isEditing" class="icon-edit"></i>
        <i v-if="isEditing" class="icon-save"></i>
        {{ isEditing ? "保存编辑" : "编辑禁飞区" }}
      </button>

      <!-- 数据操作按钮 -->
      <button @click="exportZones" class="btn secondary">
        <i class="icon-export"></i> 导出数据
      </button>
      <button @click="importZones" class="btn secondary">
        <i class="icon-import"></i> 导入数据
      </button>
      <button @click="clearAllZones" class="btn danger">
        <i class="icon-trash"></i> 清除所有禁飞区
      </button>

      <div class="legend">
        <div class="legend-item">
          <div class="legend-color red"></div>
          <span>禁飞区域</span>
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
        <p>总距离: {{ routeDistance }} 公里</p>
        <p>检查点: {{ checkpointCount }} 个</p>
        <p v-if="hasViolation" style="color: #e74c3c">警告: 航线穿过禁飞区!</p>
        <p v-else style="color: #2ecc71">航线安全: 未穿过禁飞区</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

// 天地图密钥
const TIAN_DI_TU_KEY = "69a5cdb2a588f9138791d3ec5136addc";
let map = null;
let drawControl = null;
let noFlyZonesLayer = null;
let routeLayer = null;
let checkpointsLayer = null;
const isEditing = ref(false);
const routeDistance = ref(0);
const checkpointCount = ref(0);
const hasViolation = ref(false);
// 禁飞区数据存储
const noFlyZones = ref([]);

// 生成唯一ID
const generateId = () => {
  return "zone-" + Math.random().toString(36).substr(2, 9);
};

onMounted(() => {
  // 初始化地图
  map = L.map("map", {
    center: [39.9042, 116.4074],
    zoom: 13,
    maxZoom: 18,
    minZoom: 1,
  });

  // 从本地存储加载数据
  loadZonesFromStorage();

  // 加载天地图
  const baseLayer = L.tileLayer(
    `//t0.tianditu.gov.cn/img_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=${TIAN_DI_TU_KEY}`,
    {
      attribution: "© 天地图",
      tileSize: 256,
      crossOrigin: "", // 解决跨域问题
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

  // 初始化禁飞区图层
  noFlyZonesLayer = L.featureGroup().addTo(map);

  // 初始化航线图层
  routeLayer = L.featureGroup().addTo(map);

  // 初始化检查点图层
  checkpointsLayer = L.featureGroup().addTo(map);

  // 初始化绘图控件
  initDrawControl();

  // 监听绘图事件
  initDrawEvents();

  // 监听编辑事件（更新已保存的禁飞区）
  map.on(L.Draw.Event.EDITED, (e) => {
    if (e.layers && e.layers.length > 0) {
      e.layers.eachLayer((layer) => {
        if (layer._zoneId) {
          const type = layer instanceof L.Polygon ? "polygon" : "circle";
          const realLayer = getRealShapeLayer(layer, type);
          const area = calculateArea(realLayer, type);

          // 更新禁飞区数据
          updateZoneInCollection(layer._zoneId, realLayer, type, area);
        }
      });
    }
  });

  // 监听删除事件（从列表和存储中移除）
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
const initDrawControl = () => {
  if (!map || !noFlyZonesLayer) return;

  // 设置Leaflet Draw的本地化中文
  if (L.drawLocal) {
    // 绘图工具栏按钮文本
    console.log(L.drawLocal, "====>");

    // L.drawLocal.draw.toolbar.actions.text = "保存";
    // L.drawLocal.draw.toolbar.finish.text = "完成";
    // L.drawLocal.draw.toolbar.undo.text = "删除最后一个点";
    // L.drawLocal.draw.toolbar.buttons.polygon = "绘制多边形";
    // L.drawLocal.draw.toolbar.buttons.circle = "绘制圆形";

    // L.drawLocal.draw.handlers.polygon.tooltip.start = "点击开始绘制多边形";
    // L.drawLocal.draw.handlers.polygon.tooltip.cont = "继续点击添加顶点";
    // L.drawLocal.draw.handlers.polygon.tooltip.end = "点击第一个点完成绘制";

    // L.drawLocal.draw.handlers.circle.tooltip.start = "点击并拖动绘制圆形";

    // L.drawLocal.edit.toolbar.buttons.edit = "编辑图层";
    // L.drawLocal.edit.toolbar.buttons.editDisabled = "没有图层可编辑";
    // L.drawLocal.edit.toolbar.buttons.remove = "删除图层";
    // L.drawLocal.edit.toolbar.buttons.removeDisabled = "没有图层可删除";
    // L.drawLocal.edit.toolbar.actions.save.text = "保存";
    // L.drawLocal.edit.toolbar.actions.cancel.text = "取消";
    // L.drawLocal.edit.toolbar.actions.clearAll.text = "清除所有";

    // L.drawLocal.edit.handlers.edit.tooltip.text = "拖动可移动，点击顶点可编辑";
    // L.drawLocal.edit.handlers.edit.tooltip.subtext = "按Delete键删除";
    // L.drawLocal.edit.handlers.remove.tooltip.text = "点击图层删除";

    // 全部
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

    L.drawLocal.draw.handlers.circlemarker.tooltip.start =
      "点击地图放置圆形标记";

    L.drawLocal.draw.handlers.marker.tooltip.start = "点击地图放置标记";

    L.drawLocal.draw.handlers.polygon.tooltip.start = "点击开始绘制多边形";
    L.drawLocal.draw.handlers.polygon.tooltip.cont = "继续点击添加顶点";
    L.drawLocal.draw.handlers.polygon.tooltip.end = "点击第一个点完成绘制";

    L.drawLocal.draw.handlers.polyline.error =
      "<strong>错误：</strong>图形边缘不能交叉！";
    L.drawLocal.draw.handlers.polyline.tooltip.start = "点击开始绘制折线";
    L.drawLocal.draw.handlers.polyline.tooltip.cont = "点击继续绘制折线";
    L.drawLocal.draw.handlers.polyline.tooltip.end = "点击最后一个点完成折线";

    L.drawLocal.draw.handlers.rectangle.tooltip.start = "点击并拖动绘制矩形";

    L.drawLocal.draw.handlers.simpleshape.tooltip.end = "释放鼠标完成绘制";

    L.drawLocal.edit.toolbar.buttons.edit = "编辑图层";
    L.drawLocal.edit.toolbar.buttons.editDisabled = "没有图层可编辑";
    L.drawLocal.edit.toolbar.buttons.remove = "删除图层";
    L.drawLocal.edit.toolbar.buttons.removeDisabled = "没有图层可删除";
    L.drawLocal.edit.toolbar.actions.save.text = "保存";
    L.drawLocal.edit.toolbar.actions.cancel.text = "取消";
    L.drawLocal.edit.toolbar.actions.clearAll.text = "清除所有";

    L.drawLocal.edit.handlers.edit.tooltip.text = "拖动可移动，点击顶点可编辑";
    L.drawLocal.edit.handlers.edit.tooltip.subtext = "按 Delete 键删除";
    L.drawLocal.edit.handlers.remove.tooltip.text = "点击图层删除";
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
      featureGroup: noFlyZonesLayer,
      remove: true,
    },
  });

  map.addControl(drawControl);

  // 延迟设置按钮的title属性，确保DOM已加载
  setTimeout(() => {
    const toolbarButtons = document.querySelectorAll(".leaflet-draw-toolbar a");
    toolbarButtons.forEach((button) => {
      if (button.classList.contains("leaflet-draw-draw-polygon")) {
        button.title = "绘制多边形禁飞区";
      } else if (button.classList.contains("leaflet-draw-draw-circle")) {
        button.title = "绘制圆形禁飞区";
      } else if (button.classList.contains("leaflet-draw-edit-edit")) {
        button.title = "编辑禁飞区";
      } else if (button.classList.contains("leaflet-draw-edit-remove")) {
        button.title = "删除禁飞区";
      }
    });
  }, 300);
};

// 初始化绘图事件监听
const initDrawEvents = () => {
  if (!map || !noFlyZonesLayer) return;

  // 监听绘制完成事件
  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    const type = e.layerType;

    // 提取真正的图形图层
    const realLayer = getRealShapeLayer(layer, type);

    // 计算面积
    let areaText = getAreaText(realLayer, type);

    // 提取面积数值
    const areaMatch = areaText.match(/[\d.]+/);
    const area = areaMatch ? parseFloat(areaMatch[0]) : 0;

    realLayer.bindPopup(`<b>禁飞区</b><br>${areaText}`);
    noFlyZonesLayer.addLayer(realLayer);
    map.fitBounds(realLayer.getBounds(), { padding: [50, 50] });

    // 保存到数据集合
    saveZoneToCollection(realLayer, type, area);
  });
};

// 开始绘制航线
const startDrawRoute = () => {
  if (!map) return;

  // 清除现有航线和检查点
  routeLayer.clearLayers();
  checkpointsLayer.clearLayers();
  routeDistance.value = 0;
  checkpointCount.value = 0;
  hasViolation.value = false;

  // 提示用户开始绘制航线
  alert("请在地图上点击绘制航线路径。双击结束绘制。");

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
      )}, ${latlng.lng.toFixed(4)}`
    );

    // 检查是否穿过禁飞区
    checkRouteViolation();
  };

  // 双击结束绘制
  const onMapDblClick = () => {
    if (points.length < 2) {
      alert("航线至少需要两个点");
      return;
    }

    isDrawing = false;
    map.off("click", onMapClick);
    map.off("dblclick", onMapDblClick);

    // 计算航线距离
    calculateRouteDistance(points);

    // 更新检查点数量
    checkpointCount.value = points.length;

    // 检查航线是否合规
    checkRouteViolation();

    if (hasViolation.value) {
      alert("警告: 航线穿过禁飞区! 请调整航线。");
    } else {
      alert("航线规划完成! 总距离: " + routeDistance.value.toFixed(2) + "公里");
    }
  };

  // 绑定事件
  map.on("click", onMapClick);
  map.on("dblclick", onMapDblClick);
};

// 检查航线是否穿过禁飞区
const checkRouteViolation = () => {
  if (!routeLayer || !noFlyZonesLayer) return;

  hasViolation.value = false;

  // 获取航线
  const routes = routeLayer.getLayers();
  if (routes.length === 0) return;

  const route = routes[0];
  const routePoints = route.getLatLngs();

  if (routePoints.length < 2) return;

  // 检查每个禁飞区
  noFlyZonesLayer.eachLayer((zone) => {
    if (hasViolation.value) return; // 如果已经发现违规，不再检查

    // 检查航线是否与禁飞区相交
    if (isRouteIntersectingZone(routePoints, zone)) {
      hasViolation.value = true;

      // 高亮显示违规的禁飞区
      zone.setStyle({
        color: "#ff0000",
        fillColor: "#ff0000",
        fillOpacity: 0.5,
      });

      // 恢复其他禁飞区的样式
      noFlyZonesLayer.eachLayer((otherZone) => {
        if (otherZone !== zone) {
          otherZone.setStyle({
            color: "#e74c3c",
            fillColor: "#e74c3c",
            fillOpacity: 0.3,
          });
        }
      });
    }
  });

  // 如果没有违规，恢复所有禁飞区的样式
  if (!hasViolation.value) {
    noFlyZonesLayer.eachLayer((zone) => {
      zone.setStyle({
        color: "#e74c3c",
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      });
    });
  }
};

// 检查航线是否与禁飞区相交
const isRouteIntersectingZone = (routePoints, zone) => {
  // 简化的相交检测算法
  // 实际应用中应使用更精确的几何计算库

  if (zone instanceof L.Polygon) {
    const zonePoints = zone.getLatLngs()[0]; // 获取多边形顶点

    // 检查航线线段是否与多边形相交
    for (let i = 0; i < routePoints.length - 1; i++) {
      const p1 = routePoints[i];
      const p2 = routePoints[i + 1];

      // 检查线段是否与多边形相交
      if (isLineIntersectingPolygon(p1, p2, zonePoints)) {
        return true;
      }
    }
  } else if (zone instanceof L.Circle) {
    const center = zone.getLatLng();
    const radius = zone.getRadius();

    // 检查航线线段是否与圆形相交
    for (let i = 0; i < routePoints.length - 1; i++) {
      const p1 = routePoints[i];
      const p2 = routePoints[i + 1];

      // 检查线段是否与圆形相交
      if (isLineIntersectingCircle(p1, p2, center, radius)) {
        return true;
      }
    }
  }

  return false;
};

// 简化的线段与多边形相交检测
const isLineIntersectingPolygon = (p1, p2, polygonPoints) => {
  // 实际应用中应使用更精确的算法
  // 这里使用简化的边界盒检测

  const lineBounds = L.latLngBounds([p1, p2]);
  const polyBounds = L.latLngBounds(polygonPoints);

  return lineBounds.intersects(polyBounds);
};

// 简化的线段与圆形相交检测
const isLineIntersectingCircle = (p1, p2, center, radius) => {
  // 计算点到线段的距离
  const distance = pointToLineDistance(
    center.lat,
    center.lng,
    p1.lat,
    p1.lng,
    p2.lat,
    p2.lng
  );

  return distance <= radius / 100000; // 简化计算，实际应使用正确单位转换
};

// 计算点到线段的距离
const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

// 计算航线距离
const calculateRouteDistance = (points) => {
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // 使用Haversine公式计算两点间距离
    const R = 6371; // 地球半径(公里)
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    totalDistance += distance;
  }

  routeDistance.value = totalDistance;
};

// 保存禁飞区到集合和本地存储
const saveZoneToCollection = (layer, type, area) => {
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

  // 添加到列表
  noFlyZones.value.push({
    id,
    type,
    coordinates,
    area,
    createdAt: new Date().toISOString(),
  });

  // 保存到本地存储
  saveZonesToStorage();

  // 在图层上标记ID，便于后续关联
  layer._zoneId = id;
};

// 保存到本地存储
const saveZonesToStorage = () => {
  try {
    localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
  } catch (error) {
    console.error("保存禁飞区数据失败:", error);
  }
};

// 从本地存储加载数据
const loadZonesFromStorage = () => {
  try {
    const storedZones = localStorage.getItem("noFlyZones");
    if (storedZones) {
      noFlyZones.value = JSON.parse(storedZones);

      // 将存储的禁飞区绘制到地图上
      drawZonesFromStorage();
    }
  } catch (error) {
    console.error("加载禁飞区数据失败:", error);
  }
};

// 从存储数据绘制禁飞区到地图
const drawZonesFromStorage = () => {
  if (!map || !noFlyZonesLayer) return;

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
    noFlyZonesLayer.addLayer(layer);
    layer._zoneId = zone.id;
  });

  // 调整地图视图
  if (noFlyZones.value.length > 0) {
    map.fitBounds(noFlyZonesLayer.getBounds(), { padding: [50, 50] });
  }
};

// 导出禁飞区数据
const exportZones = () => {
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
};

// 导入禁飞区数据
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
          noFlyZones.value = importedZones;

          // 清空现有图层并重新绘制
          if (noFlyZonesLayer) {
            noFlyZonesLayer.clearLayers();
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
};

// 更新禁飞区数据
const updateZoneInCollection = (id, layer, type, area) => {
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

    // 保存到本地存储
    saveZonesToStorage();
  }
};

// 删除禁飞区
const deleteZone = (id) => {
  noFlyZones.value = noFlyZones.value.filter((zone) => zone.id !== id);

  // 保存到本地存储
  saveZonesToStorage();
};

// 提取真正的图形图层（解决图层被包装的问题）
const getRealShapeLayer = (layer, type) => {
  // 情况1：如果是LayerGroup，提取第一个子图层（leaflet-draw的包装层）
  if (layer instanceof L.LayerGroup && layer.getLayers().length > 0) {
    return layer.getLayers()[0];
  }
  // 情况2：如果是FeatureGroup，提取第一个要素
  else if (layer instanceof L.FeatureGroup && layer.getLayers().length > 0) {
    return layer.getLayers()[0];
  }
  // 情况3：直接是目标图层
  else if (
    (type === "polygon" && layer instanceof L.Polygon) ||
    (type === "circle" && layer instanceof L.Circle)
  ) {
    return layer;
  }
  // 情况4：兜底创建默认图层（避免崩溃）
  else {
    console.warn("未知图层类型，创建默认多边形", layer);
    return L.polygon([], {
      color: "#e74c3c",
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    });
  }
};

// 计算面积（基于真实图层）
const getAreaText = (layer, type) => {
  try {
    if (type === "polygon") {
      // 确保是多边形实例
      if (!(layer instanceof L.Polygon)) {
        console.warn("图层不是L.Polygon实例", layer);
        // 尝试转换为多边形
        if (layer.getLatLngs) {
          const latLngs = layer.getLatLngs();
          if (latLngs && latLngs.length > 0) {
            const area = calculatePolygonArea(latLngs[0]) / 1000000;
            return `面积: ${area.toFixed(2)} 平方公里（手动计算）`;
          }
        }
        return "面积: 未知";
      }

      // 多边形：直接调用getArea()
      const area = layer.getArea() / 1000000; // 转为平方公里
      return `面积: ${area.toFixed(2)} 平方公里`;
    } else if (type === "circle") {
      // 圆形：通过半径计算
      const radius = layer.getRadius() / 1000; // 转为公里
      const area = Math.PI * Math.pow(radius, 2);
      return `半径: ${radius.toFixed(2)} 公里<br>面积: ${area.toFixed(
        2
      )} 平方公里`;
    }
    return "面积: 未知类型";
  } catch (error) {
    console.error("计算面积时出错:", error);
    // 兜底：手动计算多边形面积（基于经纬度）
    if (type === "polygon" && layer.getLatLngs) {
      const latLngs = layer.getLatLngs()[0]; // 获取顶点数组
      const area = calculatePolygonArea(latLngs) / 1000000; // 转为平方公里
      return `面积: ${area.toFixed(2)} 平方公里（兜底计算）`;
    }
    return "面积: 计算失败";
  }
};

// 计算面积（用于更新操作）
const calculateArea = (layer, type) => {
  try {
    if (type === "polygon") {
      if (layer instanceof L.Polygon) {
        return layer.getArea() / 1000000; // 转为平方公里
      } else if (layer.getLatLngs) {
        const latLngs = layer.getLatLngs()[0];
        return calculatePolygonArea(latLngs) / 1000000;
      }
    } else if (type === "circle") {
      const radius = layer.getRadius() / 1000; // 转为公里
      return Math.PI * Math.pow(radius, 2);
    }
    return 0;
  } catch (error) {
    console.error("计算面积时出错:", error);
    return 0;
  }
};

// 兜底：手动计算多边形面积（基于经纬度的球面多边形算法）
const calculatePolygonArea = (latLngs) => {
  let area = 0;
  const earthRadius = 6371000; // 地球半径（米）
  const rad = Math.PI / 180;

  for (let i = 0; i < latLngs.length; i++) {
    const j = (i + 1) % latLngs.length;
    const lat1 = latLngs[i].lat * rad;
    const lon1 = latLngs[i].lng * rad;
    const lat2 = latLngs[j].lat * rad;
    const lon2 = latLngs[j].lng * rad;

    // 球面多边形面积计算公式（简化版）
    area += (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
  }

  // 计算最终面积（平方米）
  return Math.abs(area) * Math.pow(earthRadius, 2);
};

// 切换编辑模式
const toggleEditMode = () => {
  if (!drawControl || !map) return;

  const editToolbar = drawControl.getEditToolbar
    ? drawControl.getEditToolbar()
    : drawControl._toolbars.edit;

  if (!isEditing.value) {
    if (drawControl._toolbars.draw) {
      drawControl._toolbars.draw.disable();
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
};

// 开始绘制多边形禁飞区
const startDrawPolygon = () => {
  if (!drawControl || !map) return;

  if (isEditing.value) {
    toggleEditMode();
  }

  const drawToolbar = drawControl.getDrawToolbar
    ? drawControl.getDrawToolbar()
    : drawControl._toolbars.draw;

  if (drawToolbar && drawToolbar._modes.polygon.handler) {
    // 重置绘制状态（解决模式切换问题）
    drawToolbar._modes.polygon.handler.disable();
    setTimeout(() => {
      drawToolbar._modes.polygon.handler.enable();
    }, 100);
  }
};

// 开始绘制圆形禁飞区
const startDrawCircle = () => {
  if (!drawControl || !map) return;

  if (isEditing.value) {
    toggleEditMode();
  }

  const drawToolbar = drawControl.getDrawToolbar
    ? drawControl.getDrawToolbar()
    : drawControl._toolbars.draw;

  if (drawToolbar && drawToolbar._modes.circle.handler) {
    drawToolbar._modes.circle.handler.disable();
    setTimeout(() => {
      drawToolbar._modes.circle.handler.enable();
    }, 100);
  }
};

// 清除所有禁飞区
const clearAllZones = () => {
  if (noFlyZonesLayer && "确定要清除所有禁飞区吗？") {
    if (isEditing.value) {
      toggleEditMode();
    }
    noFlyZonesLayer.clearLayers();
    noFlyZones.value = [];
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

.btn:hover {
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

.success {
  background-color: #2ecc71;
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

/* 隐藏默认图标 */
.leaflet-draw-toolbar .leaflet-draw-draw-polygon {
  background-image: none !important;
}

.leaflet-draw-toolbar .leaflet-draw-draw-circle {
  background-image: none !important;
}

.leaflet-draw-toolbar .leaflet-draw-edit-edit {
  background-image: none !important;
}

.leaflet-draw-toolbar .leaflet-draw-edit-remove {
  background-image: none !important;
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

.leaflet-draw-tooltip:before {
  border-right-color: rgba(0, 0, 0, 0.7);
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
}

.route-info p {
  margin: 5px 0;
  color: #666;
}
</style>
