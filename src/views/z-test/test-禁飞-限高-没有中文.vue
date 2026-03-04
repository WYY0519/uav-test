<template>
  <div class="map-wrapper">
    <div id="map" class="map-container"></div>

    <!-- 控制工具栏 -->
    <div class="control-toolbar">
      <h3>区域管理</h3>

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
      <button @click="startDrawHeightLimitPolygon" class="btn primary-alt">
        <i class="icon-polygon"></i> 绘制多边形限高区
      </button>
      <button @click="startDrawHeightLimitCircle" class="btn primary-alt">
        <i class="icon-circle"></i> 绘制圆形限高区
      </button>
      <div class="height-input" v-if="isDrawingHeightLimit">
        <label>限高(米):</label>
        <input
          type="number"
          v-model.number="currentHeightLimit"
          min="1"
          max="1000"
          placeholder="输入限高值"
        />
      </div>

      <!-- 通用操作 -->
      <button @click="toggleEditMode" class="btn secondary">
        <i v-if="!isEditing" class="icon-edit"></i>
        <i v-if="isEditing" class="icon-save"></i>
        {{ isEditing ? "保存编辑" : "编辑区域" }}
      </button>
      <button @click="clearAllZones" class="btn danger">
        <i class="icon-trash"></i> 清除所有区域
      </button>
      <button @click="exportZones" class="btn secondary">
        <i class="icon-export"></i> 导出数据
      </button>
      <button @click="importZones" class="btn secondary">
        <i class="icon-import"></i> 导入数据
      </button>

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color red"></div>
          <span>禁飞区域</span>
        </div>
        <div class="legend-item">
          <div class="legend-color blue"></div>
          <span>限高区域</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// 修复type和工具函数
if (!window.type) {
  window.type = {};
}
if (!L.Util.formatNum) {
  L.Util.formatNum = (num: number, digits: number) => {
    const pow = Math.pow(10, digits || 5);
    return Math.round(num * pow) / pow;
  };
}

// 天地图密钥
const TIAN_DI_TU_KEY = "69a5cdb2a588f9138791d3ec5136addc";
let map: L.Map | null = null;
let drawControl: any = null;
let noFlyZonesLayer: L.FeatureGroup<any> | null = null;
let heightLimitZonesLayer: L.FeatureGroup<any> | null = null;
const isEditing = ref(false);
const isDrawingHeightLimit = ref(false);
const currentHeightLimit = ref(120); // 默认限高120米

// 区域数据结构定义
interface ZoneBase {
  id: string; // 唯一标识
  type: "polygon" | "circle"; // 区域类型
  coordinates: any; // 坐标数据
  area: number; // 面积（平方公里）
  createdAt: string; // 创建时间（ISO格式）
  updatedAt?: string; // 更新时间（ISO格式）
}

interface NoFlyZone extends ZoneBase {
  zoneType: "noFly"; // 区域类别：禁飞区
}

interface HeightLimitZone extends ZoneBase {
  zoneType: "heightLimit"; // 区域类别：限高区
  height: number; // 限高值（米）
}

type Zone = NoFlyZone | HeightLimitZone;

// 区域数据存储
const zones = ref<Zone[]>([]);

// 生成唯一ID
const generateId = () => {
  return "zone-" + Math.random().toString(36).substr(2, 9);
};

// 获取区域样式
const getZoneStyle = (zoneType: string) => {
  return zoneType === "noFly"
    ? {
        color: "#e74c3c", // 红色 - 禁飞区
        weight: 2,
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      }
    : {
        color: "#3498db", // 蓝色 - 限高区
        weight: 2,
        fillColor: "#3498db",
        fillOpacity: 0.3,
      };
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

  // 加载天地图图层
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

  // 初始化图层
  noFlyZonesLayer = L.featureGroup().addTo(map);
  heightLimitZonesLayer = L.featureGroup().addTo(map);

  // 合并图层用于编辑
  const allZonesLayer = L.featureGroup([
    noFlyZonesLayer,
    heightLimitZonesLayer,
  ]).addTo(map);

  // 初始化绘图控件
  initDrawControl(allZonesLayer);

  // 监听绘图事件
  initDrawEvents();

  // 监听编辑事件
  if (map) {
    // 监听编辑事件（更新已保存的区域）
    map.on(L.Draw.Event.EDITED, (e: any) => {
      if (e.layers && e.layers.length > 0) {
        e.layers.eachLayer((layer: any) => {
          if (layer._zoneId && layer._zoneType) {
            const type = layer instanceof L.Polygon ? "polygon" : "circle";
            const realLayer = getRealShapeLayer(layer, type);
            const area = calculateArea(realLayer, type);

            // 更新区域数据
            updateZoneInCollection(layer._zoneId, realLayer, type, area);
          }
        });
      }
    });

    // 监听删除事件
    map.on(L.Draw.Event.DELETED, (e: any) => {
      if (e.layers && e.layers.length > 0) {
        e.layers.eachLayer((layer: any) => {
          if (layer._zoneId) {
            deleteZone(layer._zoneId);
          }
        });
      }
    });
  }
});

// 初始化绘图控件
const initDrawControl = (allZonesLayer: L.FeatureGroup<any>) => {
  if (!map) return;

  // 扩展L.Draw.Polygon
  L.Draw.Polygon.include({
    _createLayer: (latlngs: any[]) => {
      return new L.Polygon(latlngs, this.options.shapeOptions);
    },
  });

  drawControl = new (L.Control.Draw as any)({
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
        layerClass: L.Polygon,
        tooltip: {
          start: "点击开始绘制多边形",
          cont: "继续点击添加顶点",
          end: "点击第一个点完成绘制",
        },
      },
      circle: {
        shapeOptions: {
          color: "#e74c3c",
          weight: 2,
          fillOpacity: 0.3,
        },
        layerClass: L.Circle,
        tooltip: {
          start: "点击并拖动绘制圆形",
          end: "释放鼠标完成绘制",
        },
      },
      marker: false,
      polyline: false,
      rectangle: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: allZonesLayer,
      remove: true,
      tooltip: {
        text: "拖动可移动，点击顶点可编辑",
        subtext: "按Delete键删除",
      },
    },
  });

  map.addControl(drawControl);
};

// 初始化绘图事件监听
const initDrawEvents = () => {
  if (!map || !noFlyZonesLayer || !heightLimitZonesLayer) return;

  // 当前绘制的区域类型（禁飞区/限高区）
  let currentZoneType: "noFly" | "heightLimit" = "noFly";

  map.on(L.Draw.Event.CREATED, (e: any) => {
    const layer = e.layer;
    const type = e.layerType;
    const realLayer = getRealShapeLayer(layer, type);

    // 设置图层样式
    realLayer.setStyle(getZoneStyle(currentZoneType));

    // 计算面积
    let areaText = getAreaText(realLayer, type);
    const area = parseFloat(areaText.split(": ")[1].split(" ")[0]);

    // 绑定弹窗信息
    const popupContent =
      currentZoneType === "noFly"
        ? `<b>禁飞区</b><br>${areaText}`
        : `<b>限高区</b><br>${areaText}<br>限高: ${currentHeightLimit.value} 米`;

    realLayer.bindPopup(popupContent);

    // 添加到对应图层
    if (currentZoneType === "noFly") {
      noFlyZonesLayer.addLayer(realLayer);
    } else {
      heightLimitZonesLayer.addLayer(realLayer);
    }

    map?.fitBounds(realLayer.getBounds(), { padding: [50, 50] });

    // 保存到数据集合
    saveZoneToCollection(realLayer, type, area, currentZoneType);

    // 重置状态
    isDrawingHeightLimit.value = false;
  });

  // 绘制模式切换函数
  const setDrawMode = (
    shape: "polygon" | "circle",
    zoneType: "noFly" | "heightLimit"
  ) => {
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
    }
  };

  // 暴露绘制函数
  (window as any).startDrawNoFlyPolygon = () => setDrawMode("polygon", "noFly");
  (window as any).startDrawNoFlyCircle = () => setDrawMode("circle", "noFly");
  (window as any).startDrawHeightLimitPolygon = () =>
    setDrawMode("polygon", "heightLimit");
  (window as any).startDrawHeightLimitCircle = () =>
    setDrawMode("circle", "heightLimit");
};

// 开始绘制多边形禁飞区
const startDrawNoFlyPolygon = () => {
  (window as any).startDrawNoFlyPolygon();
};

// 开始绘制圆形禁飞区
const startDrawNoFlyCircle = () => {
  (window as any).startDrawNoFlyCircle();
};

// 开始绘制多边形限高区
const startDrawHeightLimitPolygon = () => {
  (window as any).startDrawHeightLimitPolygon();
};

// 开始绘制圆形限高区
const startDrawHeightLimitCircle = () => {
  (window as any).startDrawHeightLimitCircle();
};

// 保存区域到集合和本地存储
const saveZoneToCollection = (
  layer: L.Polygon | L.Circle,
  type: string,
  area: number,
  zoneType: "noFly" | "heightLimit"
) => {
  const id = generateId();
  let coordinates: any;

  if (type === "polygon") {
    coordinates = (layer as L.Polygon).getLatLngs();
  } else if (type === "circle") {
    const circle = layer as L.Circle;
    coordinates = {
      center: circle.getLatLng(),
      radius: circle.getRadius(),
    };
  }

  // 创建区域对象
  const baseZone: ZoneBase = {
    id,
    type: type as "polygon" | "circle",
    coordinates,
    area,
    createdAt: new Date().toISOString(),
  };

  let zone: Zone;
  if (zoneType === "noFly") {
    zone = { ...baseZone, zoneType: "noFly" };
  } else {
    zone = {
      ...baseZone,
      zoneType: "heightLimit",
      height: currentHeightLimit.value,
    };
  }

  // 添加到列表
  zones.value.push(zone);

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
const loadZonesFromStorage = () => {
  try {
    const storedZones = localStorage.getItem("droneZones");
    if (storedZones) {
      zones.value = JSON.parse(storedZones);
      drawZonesFromStorage();
    }
  } catch (error) {
    console.error("加载区域数据失败:", error);
  }
};

// 从存储数据绘制区域到地图
const drawZonesFromStorage = () => {
  if (!map || !noFlyZonesLayer || !heightLimitZonesLayer) return;

  zones.value.forEach((zone) => {
    let layer: L.Polygon | L.Circle;

    // 创建图层
    if (zone.type === "polygon") {
      layer = new L.Polygon(zone.coordinates, getZoneStyle(zone.zoneType));
    } else {
      const center = zone.coordinates.center;
      layer = new L.Circle(
        center,
        zone.coordinates.radius,
        getZoneStyle(zone.zoneType)
      );
    }

    // 绑定弹窗
    const popupContent =
      zone.zoneType === "noFly"
        ? `<b>禁飞区</b><br>类型: 多边形<br>面积: ${zone.area.toFixed(
            2
          )} 平方公里`
        : `<b>限高区</b><br>类型: 多边形<br>面积: ${zone.area.toFixed(
            2
          )} 平方公里<br>限高: ${(zone as HeightLimitZone).height} 米`;

    layer.bindPopup(popupContent);

    // 添加到对应图层
    if (zone.zoneType === "noFly") {
      noFlyZonesLayer.addLayer(layer);
    } else {
      heightLimitZonesLayer.addLayer(layer);
    }

    // 标记ID和类型
    layer._zoneId = zone.id;
    layer._zoneType = zone.zoneType;
  });

  // 调整地图视图
  if (zones.value.length > 0) {
    const allLayers = [
      ...noFlyZonesLayer.getLayers(),
      ...heightLimitZonesLayer.getLayers(),
    ];
    const group = L.featureGroup(allLayers);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
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

  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const importedZones = JSON.parse(event.target.result);
          zones.value = importedZones;

          // 清空现有图层并重新绘制
          if (noFlyZonesLayer && heightLimitZonesLayer) {
            noFlyZonesLayer.clearLayers();
            heightLimitZonesLayer.clearLayers();
            drawZonesFromStorage();
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
const updateZoneInCollection = (
  id: string,
  layer: L.Polygon | L.Circle,
  type: string,
  area: number
) => {
  const index = zones.value.findIndex((zone) => zone.id === id);
  if (index !== -1) {
    let coordinates: any;

    if (type === "polygon") {
      coordinates = (layer as L.Polygon).getLatLngs();
    } else if (type === "circle") {
      const circle = layer as L.Circle;
      coordinates = {
        center: circle.getLatLng(),
        radius: circle.getRadius(),
      };
    }

    // 更新区域信息
    zones.value[index] = {
      ...zones.value[index],
      coordinates,
      area,
      updatedAt: new Date().toISOString(),
    };

    // 保存到本地存储
    saveZonesToStorage();
  }
};

// 删除区域
const deleteZone = (id: string) => {
  zones.value = zones.value.filter((zone) => zone.id !== id);
  saveZonesToStorage();
};

// 提取真正的图形图层
const getRealShapeLayer = (layer: any, type: string): L.Polygon | L.Circle => {
  if (layer instanceof L.LayerGroup && layer.getLayers().length > 0) {
    const firstLayer = layer.getLayers()[0];
    return getRealShapeLayer(firstLayer, type);
  } else if (layer instanceof L.FeatureGroup && layer.getLayers().length > 0) {
    const firstLayer = layer.getLayers()[0];
    return getRealShapeLayer(firstLayer, type);
  } else if (
    (type === "polygon" && layer instanceof L.Polygon) ||
    (type === "circle" && layer instanceof L.Circle)
  ) {
    return layer;
  } else {
    console.warn("未知图层类型，创建默认图层", layer);
    if (type === "polygon") {
      return new L.Polygon([], {
        color: "#e74c3c",
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      });
    } else {
      return new L.Circle([0, 0], 100, {
        color: "#e74c3c",
        fillColor: "#e74c3c",
        fillOpacity: 0.3,
      });
    }
  }
};

// 计算面积文本
const getAreaText = (layer: L.Polygon | L.Circle, type: string): string => {
  try {
    if (type === "polygon") {
      const polygon = layer as L.Polygon;
      if (
        polygon instanceof L.Polygon &&
        typeof polygon.getArea === "function"
      ) {
        const area = polygon.getArea() / 1000000;
        return `面积: ${area.toFixed(2)} 平方公里`;
      } else {
        const latLngs = polygon.getLatLngs()[0];
        const area = calculatePolygonArea(latLngs) / 1000000;
        return `面积: ${area.toFixed(2)} 平方公里`;
      }
    } else if (type === "circle") {
      const circle = layer as L.Circle;
      const radius = circle.getRadius() / 1000;
      const area = Math.PI * Math.pow(radius, 2);
      return `半径: ${radius.toFixed(2)} 公里<br>面积: ${area.toFixed(
        2
      )} 平方公里`;
    }
    return "面积: 未知类型";
  } catch (error) {
    console.error("计算面积时出错:", error);
    if (type === "polygon" && (layer as L.Polygon).getLatLngs) {
      const latLngs = (layer as L.Polygon).getLatLngs()[0];
      const area = calculatePolygonArea(latLngs) / 1000000;
      return `面积: ${area.toFixed(2)} 平方公里`;
    }
    return "面积: 计算失败";
  }
};

// 计算多边形面积
const calculatePolygonArea = (latLngs: L.LatLng[]): number => {
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

// 计算面积数值
const calculateArea = (
  realLayer: L.Polygon<any> | L.Circle<any>,
  type: string
): number => {
  try {
    if (type === "polygon") {
      const polygon = realLayer as L.Polygon;
      if (
        polygon instanceof L.Polygon &&
        typeof polygon.getArea === "function"
      ) {
        return polygon.getArea() / 1000000; // 平方公里
      } else {
        const latLngs = polygon.getLatLngs()[0];
        return calculatePolygonArea(latLngs) / 1000000;
      }
    } else if (type === "circle") {
      const circle = realLayer as L.Circle;
      const radius = circle.getRadius() / 1000; // 公里
      return Math.PI * Math.pow(radius, 2); // 平方公里
    }
    return 0;
  } catch (error) {
    console.error("计算面积时出错:", error);
    return 0;
  }
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
  isDrawingHeightLimit.value = false;
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
    noFlyZonesLayer?.clearLayers();
    heightLimitZonesLayer?.clearLayers();
    zones.value = [];
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
  width: 240px;
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

.primary-alt {
  background-color: #3498db;
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
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.height-input label {
  font-size: 13px;
  color: #666;
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

.leaflet-draw-draw-polygon .leaflet-draw-toolbar-button-text {
  display: none;
}
.leaflet-draw-draw-polygon:before {
  content: "多边形";
}
</style>
