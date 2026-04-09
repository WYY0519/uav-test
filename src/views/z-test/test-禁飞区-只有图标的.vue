<template>
  <div class="map-wrapper">
    <div id="map" class="map-container"></div>
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

// 状态管理
const isEditing = ref(false);
const isDrawingHeightLimit = ref(false);
const isDrawingRoute = ref(false);
const currentHeightLimit = ref(120); // 默认限高120米

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

onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
  drawControl = null;
  noFlyZonesLayer = null;
  heightLimitZonesLayer = null;
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
</style>
