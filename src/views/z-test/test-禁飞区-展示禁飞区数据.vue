<template>
  <div class="map-wrapper">
    <!-- 地图容器 -->
    <div id="map" class="map-container"></div>

    <!-- 控制工具栏 -->
    <div class="control-toolbar">
      <h3>天地图禁飞区管理系统</h3>

      <!-- 绘制操作 -->
      <button @click="startDrawPolygon" class="btn primary">
        <i class="icon-polygon"></i> 绘制多边形禁飞区
      </button>
      <button @click="startDrawCircle" class="btn primary">
        <i class="icon-circle"></i> 绘制圆形禁飞区
      </button>

      <!-- 编辑/数据操作 -->
      <button @click="toggleEditMode" class="btn secondary">
        <i v-if="!isEditing" class="icon-edit"></i>
        <i v-if="isEditing" class="icon-save"></i>
        {{ isEditing ? "保存编辑" : "编辑禁飞区" }}
      </button>
      <button @click="exportZones" class="btn secondary">
        <i class="icon-export"></i> 导出数据
      </button>
      <button @click="clearAllZones" class="btn danger">
        <i class="icon-trash"></i> 清除所有禁飞区
      </button>

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color red"></div>
          <span>预设禁飞区</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
// 1. 确保已安装依赖：npm install leaflet leaflet-draw
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// 天地图密钥（建议替换为自己申请的密钥，避免失效）
const TIAN_DI_TU_KEY = "69a5cdb2a588f9138791d3ec5136addc";

// 2. 地图核心对象初始化（避免null）
let map = null;
let drawControl = null;
let noFlyZonesLayer = null; // 禁飞区专属图层

// 3. 状态管理
const isEditing = ref(false);
const noFlyZones = ref([]); // 存储禁飞区数据（含预设）

// 生成唯一ID
const generateId = () => `zone-${Math.random().toString(36).slice(2, 11)}`;

// 4. 页面挂载时初始化（严格顺序：地图→瓦片→图层→数据）
onMounted(() => {
  try {
    // 1. 初始化地图
    map = L.map("map", {
      center: [39.9042, 116.4074], // 北京为初始中心
      zoom: 12,
      maxZoom: 18,
      minZoom: 5,
    });

    // 2. 加载地图瓦片（用高德瓦片确保能显示，避免天地图密钥问题）
    L.tileLayer(
      "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      { subdomains: ["1", "2", "3", "4"] }
    ).addTo(map);

    // 3. 初始化禁飞区图层组（必须添加到地图）
    noFlyZonesLayer = L.featureGroup().addTo(map); // 关键：.addTo(map) 确保图层可见

    // 4. 加载预设禁飞区
    loadPresetNoFlyZones();

    console.log("初始化完成，禁飞区数量：", noFlyZones.value.length);
  } catch (error) {
    console.error("地图初始化失败:", error);
  }
});

// 5. 加载预设禁飞区（北京天安门+上海外滩）
const loadPresetNoFlyZones = () => {
  const presetZones = [
    // 北京天安门：圆形（格式正确）
    {
      id: generateId(),
      type: "circle",
      name: "北京天安门禁飞区",
      coordinates: {
        center: { lat: 39.9042, lng: 116.4074 }, // 中心点坐标
        radius: 1000, // 1公里半径
      },
      area: 3.14,
      style: {
        color: "#409eff", // 边框颜色（原配置正确）
        weight: 5, // 边框宽度（原配置正确，5px 加粗）
        fillColor: "#33b882", // 填充颜色（原配置正确）
        fillOpacity: 0.7, // 填充透明度（原配置正确）
      },
    },
    // 上海外滩：多边形（嵌套数组格式，关键修复）
    // 上海外滩（优化坐标与样式）
    {
      id: generateId(),
      type: "polygon",
      name: "上海外滩禁飞区",
      // 优化坐标：更精确的外滩边界 + 强制闭合
      coordinates: [
        [
          [31.2304, 121.4801], // 东北角
          [31.2304, 121.487], // 东南角
          [31.224, 121.487], // 西南角
          [31.225, 121.486], // 西南角
          [31.225, 121.4801], // 西北角
          [31.2304, 121.4801], // 闭合点，确保图形完整
        ],
      ],
      area: 0.45,
      // 新增：样式配置（红色加粗，高对比度）
      style: {
        color: "#409eff", // 红色边框
        weight: 5, // 加粗边框（5px）
        fillColor: "#33b882",
        fillOpacity: 0.7, // 高透明度，避免被瓦片遮挡
      },
    },
  ];

  // 保存数据并绘制
  noFlyZones.value = presetZones;
  drawNoFlyZonesToMap(); // 调用绘制函数
};

// 6. 将禁飞区数据绘制到地图
const drawNoFlyZonesToMap = () => {
  if (!map || !noFlyZonesLayer) {
    console.error("地图或图层未初始化");
    return;
  }

  // 清空现有图层
  noFlyZonesLayer.clearLayers();

  noFlyZones.value.forEach((zone) => {
    let zoneLayer;

    // 圆形禁飞区（北京）
    if (zone.type === "circle") {
      console.log("圆形禁飞区 style 配置：", zone.style);
      const { center, radius } = zone.coordinates;
      // 确保坐标是数组格式 [lat, lng]
      zoneLayer = L.circle(
        [center.lat, center.lng], // 第一个参数：中心点（正确）
        {
          radius: radius, // 第二个参数：本应单独传半径，却和样式混在一起
          color: zone.style?.color || "#e74c3c", // 样式参数放错位置
          fillColor: zone.style?.fillColor || "#e74c3c",
        }
      );
    }

    // 多边形禁飞区（上海）
    if (zone.type === "polygon") {
      zoneLayer = L.polygon(
        zone.coordinates,
        zone.style || {
          color: "#e74c3c",
          weight: 3,
          fillColor: "#e74c3c",
          fillOpacity: 0.5,
        }
      );
    }

    // 添加到图层组（无需 redraw）
    if (zoneLayer) {
      zoneLayer.bindPopup(
        `<b>${zone.name}</b><br>面积: ${zone.area.toFixed(2)} 平方公里`
      );
      noFlyZonesLayer.addLayer(zoneLayer); // 自动刷新，无需手动 redraw
    }
  });

  // 调整地图视野，确保能看到所有禁飞区
  if (noFlyZones.value.length > 0) {
    // 手动定义包含北京和上海的边界（北纬30°-40°，东经116°-122°）
    const globalBounds = L.latLngBounds(
      [30.0, 116.0], // 西南角
      [40.0, 122.0] // 东北角
    );
    map.fitBounds(globalBounds, { padding: [200, 200] }); // 加大边距，确保两地可见
    console.log("地图视野已强制覆盖北京和上海区域");
  }
  noFlyZonesLayer.bringToFront();
  console.log("禁飞区图层已置顶");
};

// 7. 初始化绘图控件（支持绘制和编辑）
const initDrawControl = () => {
  if (!map || !noFlyZonesLayer) return;

  // 中文本地化配置（避免英文提示）
  L.drawLocal.draw.toolbar.buttons.polygon = "绘制多边形禁飞区";
  L.drawLocal.draw.toolbar.buttons.circle = "绘制圆形禁飞区";
  L.drawLocal.draw.handlers.polygon.tooltip.start = "点击开始绘制，双击结束";
  L.drawLocal.draw.handlers.circle.tooltip.start = "点击并拖动绘制圆形";
  L.drawLocal.edit.toolbar.buttons.edit = "编辑禁飞区";
  L.drawLocal.edit.toolbar.buttons.remove = "删除禁飞区";

  // 创建绘图控件
  drawControl = new L.Control.Draw({
    position: "topleft",
    draw: {
      polygon: {
        allowIntersection: false, // 禁止多边形交叉
        shapeOptions: {
          color: "#e74c3c",
          fillColor: "#e74c3c",
          fillOpacity: 0.3,
        },
      },
      circle: {
        shapeOptions: {
          color: "#e74c3c",
          fillColor: "#e74c3c",
          fillOpacity: 0.3,
        },
      },
      // 隐藏不需要的工具
      marker: false,
      polyline: false,
      rectangle: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: noFlyZonesLayer, // 编辑目标：禁飞区图层
      remove: true, // 允许删除
    },
  }).addTo(map);
};

// 8. 绑定绘图相关事件（绘制完成、编辑、删除）
const bindDrawEvents = () => {
  if (!map) return;

  // 绘制完成：添加新禁飞区
  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    const type = e.layerType; // 绘制类型：polygon/circle
    const zoneId = generateId();

    // 计算面积和坐标
    let coordinates, area, name;
    if (type === "circle") {
      const center = layer.getLatLng();
      const radius = layer.getRadius(); // 米
      coordinates = { center: { lat: center.lat, lng: center.lng }, radius };
      area = Math.PI * Math.pow(radius / 1000, 2); // 转为平方公里
      name = "自定义圆形禁飞区";
    }
    if (type === "polygon") {
      coordinates = layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
      area = layer.getArea() / 1000000; // 转为平方公里
      name = "自定义多边形禁飞区";
    }

    // 添加到数据数组
    noFlyZones.value.push({ id: zoneId, type, name, coordinates, area });

    // 绑定弹窗并添加到图层
    layer.bindPopup(`
      <div style="font-size:14px">
        <h4 style="margin:0 0 5px">${name}</h4>
        <p>类型：${type === "circle" ? "圆形" : "多边形"}</p>
        <p>面积：${area.toFixed(2)} 平方公里</p>
      </div>
    `);
    layer._zoneId = zoneId;
    noFlyZonesLayer.addLayer(layer);

    alert(`新禁飞区创建成功！面积：${area.toFixed(2)} 平方公里`);
  });

  // 编辑完成：更新数据
  map.on(L.Draw.Event.EDITED, (e) => {
    e.layers.eachLayer((layer) => {
      const zone = noFlyZones.value.find((z) => z.id === layer._zoneId);
      if (!zone) return;

      // 更新坐标和面积
      if (zone.type === "circle") {
        const center = layer.getLatLng();
        zone.coordinates = {
          center: { lat: center.lat, lng: center.lng },
          radius: layer.getRadius(),
        };
        zone.area = Math.PI * Math.pow(layer.getRadius() / 1000, 2);
      }
      if (zone.type === "polygon") {
        zone.coordinates = layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
        zone.area = layer.getArea() / 1000000;
      }
    });
    alert("禁飞区编辑已保存");
  });

  // 删除完成：移除数据
  map.on(L.Draw.Event.DELETED, (e) => {
    const deletedIds = [];
    e.layers.eachLayer((layer) => deletedIds.push(layer._zoneId));
    noFlyZones.value = noFlyZones.value.filter(
      (z) => !deletedIds.includes(z.id)
    );
    alert(`成功删除 ${deletedIds.length} 个禁飞区`);
  });
};

// 9. 工具栏按钮事件
// 开始绘制多边形
const startDrawPolygon = () => {
  if (isEditing.value) toggleEditMode();
  const drawHandler = drawControl._toolbars.draw._modes.polygon.handler;
  drawHandler.disable();
  setTimeout(() => drawHandler.enable(), 100);
};

// 开始绘制圆形
const startDrawCircle = () => {
  if (isEditing.value) toggleEditMode();
  const drawHandler = drawControl._toolbars.draw._modes.circle.handler;
  drawHandler.disable();
  setTimeout(() => drawHandler.enable(), 100);
};

// 切换编辑模式
const toggleEditMode = () => {
  const editToolbar = drawControl._toolbars.edit;
  if (!isEditing.value) {
    editToolbar.enable(); // 进入编辑模式
  } else {
    editToolbar.disable(); // 退出编辑模式
  }
  isEditing.value = !isEditing.value;
};

// 导出禁飞区数据
const exportZones = () => {
  if (noFlyZones.value.length === 0) {
    alert("没有禁飞区数据可导出");
    return;
  }
  const dataStr = JSON.stringify(noFlyZones.value, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `禁飞区数据_${new Date().toLocaleDateString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 清除所有禁飞区
const clearAllZones = () => {
  if (!confirm("确定要清除所有禁飞区吗？此操作不可恢复！")) return;
  noFlyZones.value = [];
  noFlyZonesLayer.clearLayers();
  alert("所有禁飞区已清除");
};

// 10. 组件卸载：清理地图资源
onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
  drawControl = null;
  noFlyZonesLayer = null;
});
</script>
<style>
/* 地图容器样式（必须有高度） */
.map-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}
.map-container {
  width: 100%;
  height: 100%;
}
</style>
