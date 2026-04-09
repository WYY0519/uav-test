<template>
  <div class="drone-monitor">
    <!-- 地图底层 -->
    <div class="map-container" ref="mapContainer"></div>
    <!-- 禁飞区操作工具栏 -->
    <div class="control-toolbar">
      <h3>禁飞区管理</h3>
      <button @click="startDrawNoFlyPolygon" class="btn primary">
        <i class="icon-polygon"></i> 绘制多边形禁飞区
      </button>
      <button @click="startDrawNoFlyCircle" class="btn primary">
        <i class="icon-circle"></i> 绘制圆形禁飞区
      </button>
      <div style="display: flex">
        <button
          @click="confirmDraw"
          style="margin-right: 8px"
          class="btn secondary"
        >
          <i class="icon-confirm"></i> 确认绘制
        </button>
        <button @click="cancelDraw" class="btn secondary">
          <i class="icon-cancel"></i> 取消绘制
        </button>
      </div>
      <div style="display: flex">
        <!-- 编辑模式按钮 -->
        <button
          @click="enterEditMode"
          style="margin-right: 8px"
          class="btn secondary"
          :disabled="isEditing || isDrawing2.value"
        >
          <i class="icon-edit"></i> 编辑禁飞区
        </button>

        <!-- 完成编辑按钮 -->
        <button
          @click="finishEditMode"
          class="btn secondary"
          :disabled="!isEditing || isDrawing2.value"
        >
          <i class="icon-save"></i> 完成编辑
        </button>
      </div>
      <div style="display: flex">
        <button
          @click="toggleEditMode"
          style="margin-right: 8px"
          class="btn secondary"
        >
          <i class="icon-delete"></i> 删除禁飞区
        </button>

        <button @click="clearAllNoFlyZones" class="btn secondary">
          <i class="icon-clear-all"></i> 清除所有
        </button>
      </div>

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
import { ref, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";

// 天地图密钥
const TIANDITU_KEY = import.meta.env.VITE_APP_TIANDITU_KEY || "69a5cdb2a588f9138791d3ec5136addc";

// 基础变量
let droneMarker = null;
let trackPolyline = null;
let map = null;
const mapContainer = ref(null);

// 禁飞区相关变量
let noFlyZonesLayer = null; // 禁飞区图层容器
const noFlyZones = ref([]); // 禁飞区数据
const isDrawing2 = ref(false); // 绘制状态
let currentDrawType = null; // 当前绘制类型（polygon/circle）
let tempShape = null; // 临时绘制的图形
let drawPoints = []; // 绘制点集合
let tempMarkers = []; // 用于存放绘制过程中的顶点标记
let infoWindow = null; // 信息窗口（用于显示禁飞区详情）
// 编辑相关状态
const isEditing = ref(false); // 是否处于编辑模式
let activeShape = null; // 当前正在编辑的图形
let editMarkers = []; // 编辑模式下的控制点标记

// 外部提供的禁飞区数据
const externalNoFlyZones = [
  {
    zoneId: 4,
    shape: "polygon",
    description: "上海外滩禁飞区",
    area: 0.45,
    name: "上海外滩禁飞区",
    coordinates:
      "[[[31.2304, 121.4801], [31.2304, 121.487], [31.224, 121.487], [31.225, 121.486], [31.225, 121.4801], [31.2304, 121.4801]]]",
    createTime: "2025-10-25 12:14:23",
    borderColor: "#409eff",
    borderWeight: 5,
    fillColor: "#33b882",
    fillOpacity: 0.7,
  },
  {
    zoneId: 5,
    shape: "polygon",
    description: "上海外滩禁飞区",
    area: 0.45,
    name: "上海外滩禁飞区",
    coordinates:
      "[[[31.2304, 121.4801], [31.2304, 121.487], [31.224, 121.487], [31.225, 121.486], [31.225, 121.4801], [31.2304, 121.4801]]]",
    createTime: "2025-10-25 12:14:23",
    borderColor: "#409eff",
    borderWeight: 5,
    fillColor: "#33b882",
    fillOpacity: 0.7,
  },
  {
    zoneId: 6,
    shape: "polygon",
    description: "禁飞区的测试",
    area: 0.45,
    name: "禁飞区的测试",
    coordinates:
      "[[[31.2304, 121.4801], [31.2304, 121.487], [31.224, 121.487], [31.225, 121.486], [31.225, 121.4801], [31.2304, 121.4801]]]",
    createTime: "2025-10-25 12:14:23",
    borderColor: "#409eff",
    borderWeight: 5,
    fillColor: "#33b882",
    fillOpacity: 0.7,
  },
  {
    zoneId: 7,
    shape: "polygon",
    description: "禁飞区的测试",
    area: 0.45,
    name: "禁飞区的测试",
    coordinates:
      "[[[31.2304, 121.4801], [31.2304, 121.487], [31.224, 121.487], [31.225, 121.486], [31.225, 121.4801], [31.2304, 121.4801]]]",
    createTime: "2025-10-30 12:14:23",
    borderColor: "#409eff",
    borderWeight: 5,
    fillColor: "#33b882",
    fillOpacity: 0.7,
  },
];

// 初始化地图
const initMap = () => {
  if (!window.T) {
    ElMessage.error("天地图API未加载");
    return;
  }
  try {
    // 确保地图容器已挂载
    if (!mapContainer.value) {
      ElMessage.error("地图容器未找到");
      return;
    }
    // map = new T.Map(mapContainer.value);
    map = new T.Map(mapContainer.value, {
      key: TIANDITU_KEY,
      zoom: 15,
      center: new T.LngLat(121.4836, 31.2304),
    });
    map.addEventListener("load", async () => {
      ElMessage.success("地图加载成功");
      // 等待地图完全渲染
      await nextTick();
      initNoFlyZones(); // 初始化禁飞区
      initInfoWindow(); // 初始化信息窗口
    });
    // 加载带密钥的瓦片图层（示例：矢量底图+注记）
    // const vecLayer = new T.TileLayer("vec_w", {
    //   key: "69a5cdb2a588f9138791d3ec5136addc", // 图层级也需传入密钥
    // });
    // map.addLayer(vecLayer);

    // const cvaLayer = new T.TileLayer("cva_w", {
    //   key: "69a5cdb2a588f9138791d3ec5136addc",
    // });
    // map.addLayer(cvaLayer);

    // 初始化地图时，指定瓦片服务域名
    const vecLayer = new T.TileLayer("vec_w", {
      key: TIANDITU_KEY,
      url: "https://t0.tianditu.gov.cn/vec_w/wmts", // 固定使用t0域名
    });
    map.addLayer(vecLayer);

    const cvaLayer = new T.TileLayer("cva_w", {
      key: TIANDITU_KEY,
      url: "https://t0.tianditu.gov.cn/cva_w/wmts",
    });
    map.addLayer(cvaLayer);
    map.addControl(new T.Control.MapType());
    map.setMapType(TMAP_HYBRID_MAP);
    map.addControl(new T.Control.Scale());

    // 默认定位到上海外滩
    const defaultLng = 121.4836;
    const defaultLat = 31.2304;
    map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 15);

    // 无人机标记
    droneMarker = new T.Marker(new T.LngLat(defaultLng, defaultLat), {
      icon: new T.Icon({
        iconUrl: "/src/assets/mti-无人机.png",
        iconSize: new T.Point(32, 32),
        iconAnchor: new T.Point(16, 16),
      }),
    });
    map.addOverLay(droneMarker);

    // 轨迹线
    trackPolyline = new T.Polyline([], {
      color: "#2C64A7",
      weight: 4,
      opacity: 0.8,
      lineStyle: "solid",
    });
    map.addOverLay(trackPolyline);

    // 定位逻辑
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.centerAndZoom(new T.LngLat(lng, lat), 15);
        },
        (err) => {
          console.warn("定位失败:", err);
        }
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
  }
};

// 初始化信息窗口（适配天地图4.0：用close()替代hide()）
const initInfoWindow = () => {
  try {
    // 天地图4.0不需要addOverLay，直接创建
    infoWindow = new T.InfoWindow({
      offset: new T.Point(0, -30),
      autoPan: false,
      content: "",
    });
    // 4.0版本默认关闭，无需主动hide()，增加方法存在性校验
    if (infoWindow.close && typeof infoWindow.close === "function") {
      infoWindow.close();
    }
  } catch (e) {
    console.error("信息窗口初始化失败:", e);
    infoWindow = null;
  }
};

// 初始化禁飞区图层
const initNoFlyZones = () => {
  noFlyZonesLayer = new T.LayerGroup();
  map.addLayer(noFlyZonesLayer);

  // 加载外部数据并合并
  loadExternalNoFlyZones();
  // 加载本地存储的禁飞区
  loadNoFlyZonesFromStorage();
};

// 加载外部禁飞区数据（修复坐标解析和空值判断）
const loadExternalNoFlyZones = () => {
  externalNoFlyZones.forEach((externalZone) => {
    let coordinates = [];
    try {
      coordinates = JSON.parse(externalZone.coordinates);
      // 验证坐标格式
      if (
        !Array.isArray(coordinates) ||
        !Array.isArray(coordinates[0]) ||
        coordinates[0].length < 3
      ) {
        console.error(`禁飞区${externalZone.zoneId}坐标格式错误`, coordinates);
        return;
      }
    } catch (e) {
      console.error(`解析禁飞区${externalZone.zoneId}坐标失败:`, e);
      return;
    }

    // 转换坐标：[lat, lng] → T.LngLat(lng, lat)，增加空值判断
    const points = coordinates[0].map((coord) => {
      if (
        !Array.isArray(coord) ||
        coord.length < 2 ||
        isNaN(coord[0]) ||
        isNaN(coord[1])
      ) {
        console.warn(`无效坐标:`, coord);
        return new T.LngLat(121.4801, 31.2304); // 默认坐标
      }
      const lat = coord[0];
      const lng = coord[1];
      return new T.LngLat(lng, lat);
    });

    // 创建多边形
    const shape = new T.Polygon([points], {
      color: externalZone.borderColor || "#e74c3c",
      weight: externalZone.borderWeight || 2,
      fillColor: externalZone.fillColor || "#e74c3c",
      fillOpacity: externalZone.fillOpacity || 0.3,
    });

    // 绑定数据
    shape._zoneId = `nofly-${externalZone.zoneId}`;
    shape._zoneData = {
      id: `nofly-${externalZone.zoneId}`,
      type: externalZone.shape,
      name: externalZone.name,
      description: externalZone.description,
      area: externalZone.area,
      createTime: externalZone.createTime,
      borderColor: externalZone.borderColor,
      borderWeight: externalZone.borderWeight,
      fillColor: externalZone.fillColor,
      fillOpacity: externalZone.fillOpacity,
      coordinates: coordinates[0].map((coord) => ({
        lat: Array.isArray(coord) && !isNaN(coord[0]) ? coord[0] : 31.2304,
        lng: Array.isArray(coord) && !isNaN(coord[1]) ? coord[1] : 121.4801,
      })),
    };
    shape._deleteEventBound = false;
    shape._hoverEventBound = false;

    // 添加到图层和地图
    noFlyZonesLayer.addLayer(shape);
    map.addOverLay(shape);

    // 绑定悬浮事件
    bindHoverEvents(shape, shape._zoneData);

    // 避免重复添加
    const isDuplicate = noFlyZones.value.some((z) => z.id === shape._zoneId);
    if (!isDuplicate) {
      noFlyZones.value.push(shape._zoneData);
    }
  });

  // 保存到本地存储
  localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
  ElMessage.success(`成功加载 ${externalNoFlyZones.length} 个外部禁飞区数据`);
};

// 绑定禁飞区悬浮事件（修复信息窗口显示/隐藏方法）
const bindHoverEvents = (shape, zoneData) => {
  if (shape._hoverEventBound || !infoWindow) return;

  // 鼠标进入
  shape.addEventListener("mouseover", (e) => {
    if (isEditing.value || isDrawing2.value) return;
    if (!e || !e.lnglat) return;

    // 构建信息窗口内容
    const areaText = zoneData.area ? `${zoneData.area} 平方公里` : "未知";
    const content = `
      <div style="padding: 8px 12px; min-width: 180px; font-size: 13px; line-height: 1.5;">
        <div style="font-size: 15px; font-weight: 600; color: ${
          zoneData.borderColor || "#e74c3c"
        }; margin-bottom: 6px;">
          ${zoneData.name || "未命名禁飞区"}
        </div>
        <div style="margin-bottom: 3px;"><span style="color: #666;">ID：</span>${
          zoneData.id
        }</div>
        <div style="margin-bottom: 3px;"><span style="color: #666;">描述：</span>${
          zoneData.description || "无"
        }</div>
        <div style="margin-bottom: 3px;"><span style="color: #666;">面积：</span>${areaText}</div>
        <div style="margin-bottom: 3px;"><span style="color: #666;">创建时间：</span>${
          zoneData.createTime || "无"
        }</div>
        <div><span style="color: #666;">形状：</span>${
          zoneData.type === "polygon" ? "多边形" : "圆形"
        }</div>
      </div>
    `;

    try {
      infoWindow.setContent(content);
      infoWindow.setPosition(e.lnglat);
      // 4.0版本用show()显示
      if (infoWindow.show && typeof infoWindow.show === "function") {
        infoWindow.show();
      }
    } catch (e) {
      console.error("信息窗口显示失败:", e);
    }

    if (mapContainer.value) {
      mapContainer.value.style.cursor = "pointer";
    }
  });

  // 鼠标离开
  shape.addEventListener("mouseout", () => {
    if (infoWindow) {
      try {
        // 用close()替代hide()
        if (infoWindow.close && typeof infoWindow.close === "function") {
          infoWindow.close();
        }
      } catch (e) {
        console.error("信息窗口隐藏失败:", e);
      }
    }
    if (mapContainer.value) {
      mapContainer.value.style.cursor = "default";
    }
  });

  shape._hoverEventBound = true;
};

// 开始绘制多边形禁飞区
const startDrawNoFlyPolygon = () => {
  resetDrawState();
  isDrawing2.value = true;
  currentDrawType = "polygon";
  ElMessage.info("点击地图添加多边形顶点，点击确认完成绘制");
  map.addEventListener("click", handlePolygonDrawClick);
};

// 多边形绘制点击处理
function handlePolygonDrawClick(e) {
  if (!e || !e.lnglat) return;
  const point = e.lnglat;
  drawPoints.push(point);

  // 创建顶点标记
  const marker = new T.Marker(point, {
    icon: new T.Icon({
      iconUrl:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTggMkM0LjY5IDEuOTkgMiA0LjY5IDIgOGMwIDMuMzEgMi42OSA2IDYgNmMzLjMxIDAgNi0yLjY5IDYtNmMwLTMuMzEtMi42OS02LTYtNnoiLz48L3N2Zz4=",
      iconSize: new T.Point(10, 10),
      iconAnchor: new T.Point(5, 5),
    }),
  });
  noFlyZonesLayer.addLayer(marker);
  tempMarkers.push(marker);

  // 移除临时图形
  if (tempShape) noFlyZonesLayer.removeLayer(tempShape);

  // 多边形需要二维数组
  if (drawPoints.length >= 2) {
    tempShape = new T.Polygon([drawPoints], {
      color: "#e74c3c",
      weight: 2,
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    });
    noFlyZonesLayer.addLayer(tempShape);
  }
}

// 开始绘制圆形禁飞区
const startDrawNoFlyCircle = () => {
  resetDrawState();
  isDrawing2.value = true;
  currentDrawType = "circle";
  ElMessage.info("点击地图确定圆心，再次点击确定半径");
  map.addEventListener("click", handleCircleDrawClick);
};

// 圆形绘制点击处理
function handleCircleDrawClick(e) {
  if (!e || !e.lnglat) return;
  const point = e.lnglat;
  drawPoints.push(point);

  // 移除临时图形
  if (tempShape) noFlyZonesLayer.removeLayer(tempShape);

  // 第一个点（圆心）
  if (drawPoints.length === 1) {
    const marker = new T.Marker(point, {
      icon: new T.Icon({
        iconUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTggMkM0LjY5IDEuOTkgMiA0LjY5IDIgOGMwIDMuMzEgMi42OSA2IDYgNmMzLjMxIDAgNi0yLjY5IDYtNmMwLTMuMzEtMi42OS02LTYtNnoiLz48L3N2Zz4=",
        iconSize: new T.Point(10, 10),
        iconAnchor: new T.Point(5, 5),
      }),
    });
    noFlyZonesLayer.addLayer(marker);
    tempMarkers.push(marker);
    ElMessage.info("再次点击确定圆形半径");
  }
  // 第二个点（半径终点）
  else if (drawPoints.length === 2) {
    const marker = new T.Marker(point, {
      icon: new T.Icon({
        iconUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiAxMiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTYgMkMzLjc5IDEuOTkgMiAzLjc5IDIgNmMwIDIuMjEgMS43OSA0IDQgNHMyLjc5LTIuMTkgNC00YzAtMi4yMS0xLjc5LTQtNC00eiIvPjwvc3ZnPg==",
        iconSize: new T.Point(8, 8),
        iconAnchor: new T.Point(4, 4),
      }),
    });
    noFlyZonesLayer.addLayer(marker);
    tempMarkers.push(marker);

    const center = drawPoints[0];
    const radius = calculateDistance(center, drawPoints[1]);
    tempShape = new T.Circle(center, radius, {
      color: "#e74c3c",
      weight: 2,
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    });
    noFlyZonesLayer.addLayer(tempShape);
  }
}

// 确认绘制
const confirmDraw = () => {
  if (!tempShape) {
    ElMessage.warning("请先绘制图形");
    return;
  }

  // 验证图形有效性
  if (currentDrawType === "polygon" && drawPoints.length < 3) {
    ElMessage.warning("多边形至少需要3个顶点");
    return;
  }
  if (currentDrawType === "circle" && drawPoints.length < 2) {
    ElMessage.warning("圆形需要确定圆心和半径");
    return;
  }

  const id = "nofly-" + Date.now();
  tempShape._zoneId = id;
  tempShape._deleteEventBound = false;
  tempShape._hoverEventBound = false;
  noFlyZonesLayer.addLayer(tempShape);
  map.addOverLay(tempShape);

  // 删除临时标记
  tempMarkers.forEach((marker) => {
    noFlyZonesLayer.removeLayer(marker);
    if (map.removeOverLay) {
      map.removeOverLay(marker);
    } else if (map.remove) {
      map.remove(marker);
    }
  });

  // 保存数据
  let zoneData;
  if (currentDrawType === "polygon") {
    zoneData = saveNoFlyZoneDataByDrawPoints(tempShape, id);
  } else {
    zoneData = saveNoFlyZoneData(tempShape, id);
  }

  // 绑定悬浮事件
  bindHoverEvents(tempShape, zoneData);

  // 移除监听
  map.removeEventListener("click", handlePolygonDrawClick);
  map.removeEventListener("click", handleCircleDrawClick);

  // 重置状态
  tempShape = null;
  drawPoints = [];
  tempMarkers = [];
  isDrawing2.value = false;

  ElMessage.success("禁飞区创建成功");
};

// 多边形数据保存
const saveNoFlyZoneDataByDrawPoints = (shape, id) => {
  const coordinates = drawPoints.map((p) => ({ lng: p.lng, lat: p.lat }));
  const area = (calculatePolygonArea(coordinates) / 1000000).toFixed(2);

  const data = {
    type: "polygon",
    coordinates: coordinates,
    name: `自定义禁飞区_${new Date().getTime().toString().slice(-4)}`,
    description: "手动绘制的禁飞区",
    area: parseFloat(area),
    createTime: new Date().format("yyyy-MM-dd hh:mm:ss"),
    borderColor: "#e74c3c",
    borderWeight: 2,
    fillColor: "#e74c3c",
    fillOpacity: 0.3,
  };
  const zone = { id, ...data };
  noFlyZones.value.push(zone);
  localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
  shape._zoneData = zone;
  return zone;
};

// 取消绘制
const cancelDraw = () => {
  if (!tempShape) {
    ElMessage.warning("请先绘制图形");
    return;
  }
  resetDrawState();
  clearEditMarkers();
  // 关闭信息窗口
  if (infoWindow) {
    try {
      if (infoWindow.close && typeof infoWindow.close === "function") {
        infoWindow.close();
      }
    } catch (e) {}
  }
  ElMessage.info("已取消绘制");
};

// 重置绘制状态
const resetDrawState = () => {
  isDrawing2.value = false;
  currentDrawType = null;

  // 移除临时图形
  if (tempShape) {
    noFlyZonesLayer.removeLayer(tempShape);
    tempShape = null;
  }

  // 移除临时标记
  tempMarkers.forEach((marker) => {
    noFlyZonesLayer.removeLayer(marker);
  });
  tempMarkers = [];

  drawPoints = [];

  // 移除监听
  map.removeEventListener("click", handlePolygonDrawClick);
  map.removeEventListener("click", handleCircleDrawClick);
};

// 保存禁飞区数据到本地
const saveNoFlyZoneData = (shape, id) => {
  let data;
  if (shape instanceof T.Polygon) {
    const lngLats = shape.getLngLats();
    const coordinates = lngLats[0]
      ? lngLats[0].map((p) => ({ lng: p.lng, lat: p.lat }))
      : [];
    const area = (calculatePolygonArea(coordinates) / 1000000).toFixed(2);

    data = {
      type: "polygon",
      coordinates: coordinates,
      name: `自定义禁飞区_${new Date().getTime().toString().slice(-4)}`,
      description: "手动绘制的禁飞区",
      area: parseFloat(area),
      createTime: new Date().format("yyyy-MM-dd hh:mm:ss"),
      borderColor: "#e74c3c",
      borderWeight: 2,
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    };
  } else if (shape instanceof T.Circle) {
    const center = shape.getCenter();
    const radius = shape.getRadius();
    const area = ((Math.PI * radius * radius) / 1000000).toFixed(2);

    data = {
      type: "circle",
      center: { lng: center.lng, lat: center.lat },
      radius: radius,
      coordinates: [{ lng: center.lng, lat: center.lat }],
      name: `自定义圆形禁飞区_${new Date().getTime().toString().slice(-4)}`,
      description: "手动绘制的圆形禁飞区",
      area: parseFloat(area),
      createTime: new Date().format("yyyy-MM-dd hh:mm:ss"),
      borderColor: "#e74c3c",
      borderWeight: 2,
      fillColor: "#e74c3c",
      fillOpacity: 0.3,
    };
  }
  const zone = { id, ...data };
  noFlyZones.value.push(zone);
  localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
  shape._zoneData = zone;
  return zone;
};

// 从本地存储加载禁飞区
const loadNoFlyZonesFromStorage = () => {
  const stored = localStorage.getItem("noFlyZones");
  if (stored) {
    const storedZones = JSON.parse(stored);
    storedZones.forEach((zone) => {
      // 跳过已加载的外部禁飞区
      const isLoaded = noFlyZones.value.some((z) => z.id === zone.id);
      if (isLoaded) return;

      let shape;
      if (zone.type === "polygon") {
        const points = zone.coordinates.map((p) => {
          if (!p || isNaN(p.lng) || isNaN(p.lat)) {
            return new T.LngLat(121.4801, 31.2304);
          }
          return new T.LngLat(p.lng, p.lat);
        });
        shape = new T.Polygon([points], {
          color: zone.borderColor || "#e74c3c",
          weight: zone.borderWeight || 2,
          fillColor: zone.fillColor || "#e74c3c",
          fillOpacity: zone.fillOpacity || 0.3,
        });
      } else {
        // 圆形
        const center = zone.center || { lng: 121.4801, lat: 31.2304 };
        if (isNaN(center.lng) || isNaN(center.lat)) {
          center.lng = 121.4801;
          center.lat = 31.2304;
        }
        shape = new T.Circle(
          new T.LngLat(center.lng, center.lat),
          zone.radius || 1000,
          {
            color: zone.borderColor || "#e74c3c",
            weight: zone.borderWeight || 2,
            fillColor: zone.fillColor || "#e74c3c",
            fillOpacity: zone.fillOpacity || 0.3,
          }
        );
      }
      shape._zoneId = zone.id;
      shape._zoneData = zone;
      shape._deleteEventBound = false;
      shape._hoverEventBound = false;
      noFlyZonesLayer.addLayer(shape);
      map.addOverLay(shape);

      // 绑定悬浮事件
      bindHoverEvents(shape, zone);

      noFlyZones.value.push(zone);
    });
    ElMessage.success(
      `从本地存储加载 ${
        storedZones.length - externalNoFlyZones.length
      } 个禁飞区`
    );
  }
};

// 进入编辑模式
const enterEditMode = () => {
  if (isDrawing2.value) {
    ElMessage.warning("请先完成当前绘制");
    return;
  }

  if (!map || !noFlyZonesLayer) {
    ElMessage.error("地图或禁飞区图层未初始化");
    return;
  }

  // 关闭信息窗口
  if (infoWindow) {
    try {
      if (infoWindow.close && typeof infoWindow.close === "function") {
        infoWindow.close();
      }
    } catch (e) {}
  }

  // 清除编辑标记
  clearEditMarkers();

  // 获取所有禁飞区
  const allOverlays = map.getOverlays
    ? map.getOverlays()
    : map.getAllOverlays
    ? map.getAllOverlays()
    : [];
  const noFlyLayers = allOverlays.filter((overlay) => overlay._zoneId);

  if (noFlyLayers.length === 0) {
    ElMessage.warning("暂无禁飞区可编辑");
    return;
  }

  isEditing.value = true;
  ElMessage.info("进入编辑模式：拖动红点修改形状，点击完成编辑保存");

  // 为每个图形添加控制点
  noFlyLayers.forEach((shape) => {
    shape._originalData = JSON.parse(JSON.stringify(getShapeData(shape)));
    addEditMarkers(shape);
  });
};

// 添加编辑控制点
const addEditMarkers = (shape) => {
  editMarkers = [];

  if (shape instanceof T.Polygon) {
    const points = shape.getLngLats()[0] || [];
    points.forEach((point, index) => {
      const marker = new T.Marker(point, {
        icon: new T.Icon({
          iconUrl:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTggMkM0LjY5IDEuOTkgMiA0LjY5IDIgOGMwIDMuMzEgMi42OSA2IDYgNmMzLjMxIDAgNi0yLjY5IDYtNmMwLTMuMzEtMi42OS02LTYtNnoiLz48L3N2Zz4=",
          iconSize: new T.Point(12, 12),
          iconAnchor: new T.Point(6, 6),
        }),
        draggable: true,
      });

      // 拖动结束更新形状
      marker.addEventListener("dragend", (e) => {
        if (!e || !e.lnglat) return;
        const newPoint = e.lnglat;
        const points = shape.getLngLats()[0] || [];
        points[index] = newPoint;
        shape.setLngLats([points]);

        // 更新数据
        const zoneIndex = noFlyZones.value.findIndex(
          (z) => z.id === shape._zoneId
        );
        if (zoneIndex !== -1) {
          const newCoordinates = points.map((p) => ({
            lng: p.lng,
            lat: p.lat,
          }));
          const newArea = (
            calculatePolygonArea(newCoordinates) / 1000000
          ).toFixed(2);
          noFlyZones.value[zoneIndex].coordinates = newCoordinates;
          noFlyZones.value[zoneIndex].area = parseFloat(newArea);
          shape._zoneData = noFlyZones.value[zoneIndex];
        }
      });

      map.addOverLay(marker);
      editMarkers.push({ marker, shape, index });
    });
  } else if (shape instanceof T.Circle) {
    const center = shape.getCenter();
    const radius = shape.getRadius();
    const radiusPoint = getRadiusPoint(center, radius);

    // 圆心控制点
    const centerMarker = new T.Marker(center, {
      icon: new T.Icon({
        iconUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTggMkM0LjY5IDEuOTkgMiA0LjY5IDIgOGMwIDMuMzEgMi42OSA2IDYgNmMzLjMxIDAgNi0yLjY5IDYtNmMwLTMuMzEtMi42OS02LTYtNnoiLz48L3N2Zz4=",
        iconSize: new T.Point(12, 12),
        iconAnchor: new T.Point(6, 6),
      }),
      draggable: true,
    });

    // 半径控制点
    const radiusMarker = new T.Marker(radiusPoint, {
      icon: new T.Icon({
        iconUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2U3NGMzYyIgZD0iTTggMkM0LjY5IDEuOTkgMiA0LjY5IDIgOGMwIDMuMzEgMi42OSA2IDYgNmMzLjMxIDAgNi0yLjY5IDYtNmMwLTMuMzEtMi42OS02LTYtNnoiLz48L3N2Zz4=",
        iconSize: new T.Point(12, 12),
        iconAnchor: new T.Point(6, 6),
      }),
      draggable: true,
    });

    // 拖动圆心
    centerMarker.addEventListener("dragend", (e) => {
      if (!e || !e.lnglat) return;
      const newCenter = e.lnglat;
      shape.setCenter(newCenter);
      const currentRadius = shape.getRadius();
      const newRadiusPoint = getRadiusPoint(newCenter, currentRadius);
      radiusMarker.setLngLat(newRadiusPoint);

      // 更新数据
      const zoneIndex = noFlyZones.value.findIndex(
        (z) => z.id === shape._zoneId
      );
      if (zoneIndex !== -1) {
        noFlyZones.value[zoneIndex].center = {
          lng: newCenter.lng,
          lat: newCenter.lat,
        };
        noFlyZones.value[zoneIndex].coordinates = [
          {
            lng: newCenter.lng,
            lat: newCenter.lat,
          },
        ];
        shape._zoneData = noFlyZones.value[zoneIndex];
      }
    });

    // 拖动半径
    radiusMarker.addEventListener("dragend", (e) => {
      if (!e || !e.lnglat) return;
      const newRadiusPoint = e.lnglat;
      const currentCenter = centerMarker.getLngLat();
      const newRadius = calculateDistance(currentCenter, newRadiusPoint);
      shape.setRadius(newRadius);

      // 更新数据
      const zoneIndex = noFlyZones.value.findIndex(
        (z) => z.id === shape._zoneId
      );
      if (zoneIndex !== -1) {
        const newArea = ((Math.PI * newRadius * newRadius) / 1000000).toFixed(
          2
        );
        noFlyZones.value[zoneIndex].radius = newRadius;
        noFlyZones.value[zoneIndex].area = parseFloat(newArea);
        shape._zoneData = noFlyZones.value[zoneIndex];
      }
    });

    map.addOverLay(centerMarker);
    map.addOverLay(radiusMarker);
    editMarkers.push({ marker: centerMarker, shape, type: "center" });
    editMarkers.push({ marker: radiusMarker, shape, type: "radius" });
  }
};

// 完成编辑
const finishEditMode = () => {
  if (!isEditing.value) return;

  const allOverlays = map.getOverlays
    ? map.getOverlays()
    : map.getAllOverlays
    ? map.getAllOverlays()
    : [];
  const noFlyLayers = allOverlays.filter((overlay) => overlay._zoneId);

  // 更新数据
  noFlyLayers.forEach((shape) => {
    const shapeData = getShapeData(shape);
    const zoneIndex = noFlyZones.value.findIndex((z) => z.id === shape._zoneId);
    if (zoneIndex !== -1) {
      noFlyZones.value[zoneIndex] = {
        ...noFlyZones.value[zoneIndex],
        ...shapeData,
        updateTime: new Date().format("yyyy-MM-dd hh:mm:ss"),
      };
      shape._zoneData = noFlyZones.value[zoneIndex];
    }
  });

  // 保存到本地
  localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));

  // 退出编辑模式
  isEditing.value = false;
  clearEditMarkers();
  ElMessage.success("编辑完成，数据已保存");
};

// 清除编辑控制点
const clearEditMarkers = () => {
  editMarkers.forEach((item) => {
    if (map.removeOverLay) {
      map.removeOverLay(item.marker);
    } else if (map.remove) {
      map.remove(item.marker);
    }
  });
  editMarkers = [];
};

// 获取图形当前数据
const getShapeData = (shape) => {
  if (shape instanceof T.Polygon) {
    const points = shape.getLngLats()[0] || [];
    return {
      type: "polygon",
      coordinates: points.map((p) => ({ lng: p.lng, lat: p.lat })),
    };
  } else if (shape instanceof T.Circle) {
    return {
      type: "circle",
      center: { lng: shape.getCenter().lng, lat: shape.getCenter().lat },
      radius: shape.getRadius(),
    };
  }
  return {};
};

// 计算半径终点坐标
const getRadiusPoint = (center, radius) => {
  const earthRadius = 6371000;
  const lngOffset =
    ((radius / earthRadius) * (180 / Math.PI)) /
    Math.cos((center.lat * Math.PI) / 180);
  return new T.LngLat(center.lng + lngOffset, center.lat);
};

// 删除模式（点击删除禁飞区）
const toggleEditMode = () => {
  if (isDrawing2.value) {
    ElMessage.warning("请先完成当前绘制");
    return;
  }

  if (!map || !noFlyZonesLayer) {
    ElMessage.error("地图或禁飞区图层未初始化");
    return;
  }

  // 关闭信息窗口
  if (infoWindow) {
    try {
      if (infoWindow.close && typeof infoWindow.close === "function") {
        infoWindow.close();
      }
    } catch (e) {}
  }

  // 获取所有禁飞区
  const allOverlays = map.getOverlays
    ? map.getOverlays()
    : map.getAllOverlays
    ? map.getAllOverlays()
    : [];
  const noFlyLayers = allOverlays.filter((overlay) => overlay._zoneId);

  const isEventBound = noFlyLayers.some((overlay) => overlay._deleteEventBound);

  if (!isEventBound) {
    noFlyLayers.forEach((overlay) => {
      overlay.addEventListener("click", handleNoFlyZoneClick);
      overlay._deleteEventBound = true;
    });
    ElMessage.info("删除模式：点击禁飞区可删除");
  } else {
    noFlyLayers.forEach((overlay) => {
      overlay.removeEventListener("click", handleNoFlyZoneClick);
      overlay._deleteEventBound = false;
    });
    ElMessage.info("已退出删除模式");
  }
};

// 禁飞区点击删除处理
const handleNoFlyZoneClick = function () {
  const overlay = this;
  if (confirm("确定删除该禁飞区吗？")) {
    // 关闭信息窗口
    if (infoWindow) {
      try {
        if (infoWindow.close && typeof infoWindow.close === "function") {
          infoWindow.close();
        }
      } catch (e) {}
    }

    // 移除图形
    noFlyZonesLayer.removeLayer(overlay);
    if (map.removeOverLay) {
      map.removeOverLay(overlay);
    } else if (map.remove) {
      map.remove(overlay);
    }
    // 删除数据
    noFlyZones.value = noFlyZones.value.filter((z) => z.id !== overlay._zoneId);
    localStorage.setItem("noFlyZones", JSON.stringify(noFlyZones.value));
    overlay._deleteEventBound = false;
    ElMessage.success("禁飞区已删除");
  }
};

// 清除所有禁飞区
const clearAllNoFlyZones = () => {
  if (confirm("确定要清除所有禁飞区吗？")) {
    // 关闭信息窗口
    if (infoWindow) {
      try {
        if (infoWindow.close && typeof infoWindow.close === "function") {
          infoWindow.close();
        }
      } catch (e) {}
    }

    noFlyZonesLayer.clearLayers();
    noFlyZones.value = [];
    localStorage.removeItem("noFlyZones");
    ElMessage.success("所有禁飞区已清除");
  }
};

// 辅助函数：计算两点距离（米）
const calculateDistance = (p1, p2) => {
  if (
    !p1 ||
    !p2 ||
    isNaN(p1.lat) ||
    isNaN(p1.lng) ||
    isNaN(p2.lat) ||
    isNaN(p2.lng)
  ) {
    return 1000;
  }
  const R = 6371000;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 辅助函数：计算多边形面积（平方米）
const calculatePolygonArea = (coordinates) => {
  const earthRadius = 6371000;
  let area = 0;
  const pointsCount = coordinates.length;

  if (pointsCount < 3) return 0;

  for (let i = 0; i < pointsCount; i++) {
    const j = (i + 1) % pointsCount;
    const p1 = coordinates[i];
    const p2 = coordinates[j];

    if (
      !p1 ||
      !p2 ||
      isNaN(p1.lat) ||
      isNaN(p1.lng) ||
      isNaN(p2.lat) ||
      isNaN(p2.lng)
    ) {
      continue;
    }

    const lat1 = (p1.lat * Math.PI) / 180;
    const lon1 = (p1.lng * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lon2 = (p2.lng * Math.PI) / 180;

    const dLon = lon2 - lon1;
    const term =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const angle = Math.acos(Math.min(Math.max(term, -1), 1));

    area += angle;
  }

  area = Math.abs(area - Math.PI * 2) * earthRadius * earthRadius;
  return area;
};

// 日期格式化工具
Date.prototype.format = function (fmt) {
  let o = {
    "M+": this.getMonth() + 1,
    "d+": this.getDate(),
    "h+": this.getHours(),
    "m+": this.getMinutes(),
    "s+": this.getSeconds(),
    "q+": Math.floor((this.getMonth() + 3) / 3),
    S: this.getMilliseconds(),
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  for (let k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
};

// 地图初始化（确保DOM挂载完成）
onMounted(() => {
  nextTick(() => {
    initMap();
  });
});
</script>
<style scoped>
.drone-monitor {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #eaf4ff;
  z-index: 0;
  transition: cursor 0.2s;
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
  width: 220px;
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
  padding: 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
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

.secondary {
  background-color: #f5f5f5;
  color: #333;
}

/* 图标样式 */
.icon-polygon::before {
  content: "▰";
  margin-right: 5px;
  font-size: 16px;
}

.icon-circle::before {
  content: "●";
  margin-right: 5px;
  font-size: 16px;
}

.icon-confirm::before {
  content: "✔";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.icon-cancel::before {
  content: "✖";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.icon-edit::before {
  content: "✎";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.icon-save::before {
  content: "□";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.icon-delete::before {
  content: "✕";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.icon-clear-all::before {
  content: "⌫";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

/* 图例样式 */
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

/* 信息窗口样式 */
.tinfowindow {
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
  border: none !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.tinfowindow-content {
  padding: 0 !important;
}

.tinfowindow-arrow {
  border-top-color: white !important;
}
</style>
