<template>
  <!-- 区域操作工具栏 toolbarVisible  -->
  <div class="control-toolbar" v-show="toolbarVisible">
    <h3>区域管理</h3>
    <button
      @click="startDrawNoFlyPolygon"
      :class="{
        btn: true,
        primary: selectedRegion === 'jf',
        warningArea: selectedRegion === 'jg',
      }"
    >
      <i class="icon-polygon"></i> 绘制多边形区域
    </button>
    <button
      @click="startDrawNoFlyCircle"
      :class="{
        btn: true,
        primary: selectedRegion === 'jf',
        warningArea: selectedRegion === 'jg',
      }"
    >
      <i class="circle"></i> 绘制圆形区域
    </button>
    <div style="display: flex">
      <button
        @click="confirmDraw"
        style="margin-right: 8px"
        class="btn secondary"
      >
        <i class="confirm"></i> 确认绘制
      </button>
      <button @click="cancelDraw" :disabled="isEditing" class="btn secondary">
        <i class="cancel"></i> 取消绘制
      </button>
    </div>
    <div class="legend">
      <div class="legend-item" @click="regionSelection('jf')">
        <div class="legend-color red"></div>
        <span>禁飞区域</span>
      </div>
      <div class="legend-item" @click="regionSelection('jg')">
        <div class="legend-color orange"></div>
        <span>警告区域</span>
      </div>
    </div>
  </div>

  <!-- 禁飞区信息输入弹窗  -->
  <el-dialog
    v-model="dialogVisible"
    :title="`完善${regionName}信息`"
    width="400px"
    :before-close="handleDialogClose"
  >
    <el-form
      :model="formData"
      :rules="formRules"
      ref="formRef"
      label-width="80px"
    >
      <el-form-item label="区域名称" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="`请输入${regionName}名称`"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="区域描述" prop="description">
        <el-input
          v-model="formData.description"
          :placeholder="`请输入${regionName}描述（可选）`"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitForm">确认</el-button>
    </template>
  </el-dialog>
  <!-- 使用独立的禁飞区悬浮详情组件 -->
  <NoFlyZoneTooltip
    :visible="showTooltip"
    :position="tooltipPosition"
    :data="tooltipData"
  />
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { noflyzoneList, noflyzoneAdd } from "@/api/noflyzone.js";
import NoFlyZoneTooltip from "./components/NoFlyZoneTooltip.vue"; //禁飞区悬浮详情组件

const props = defineProps({
  map: {
    type: Object,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:visible", "zone-saved"]);

// 响应式状态
const toolbarVisible = ref(false);
const noFlyZonesLayer = ref(null);
const noFlyZones = ref([]);
const isDrawing = ref(false);
const currentDrawType = ref(null);
const tempShape = ref(null);
const drawPoints = ref([]);
const tempMarkers = ref([]);
const isEditing = ref(false);
const showTooltip = ref(false);
const tooltipData = ref({});
const dialogVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const formRef = ref(null);
const formData = ref({
  name: "",
  description: "",
});
const tempDrawData = ref(null);
const isInitialized = ref(false);
const tempLine = ref(null);
const isHoveringFirstPoint = ref(false);
const isPolygonClosed = ref(false);
const regionName = ref("禁飞区");
const selectedRegion = ref("jf");
const isDraggingRadius = ref(false); // 添加缺失的变量
const dragEndPoint = ref(null); // 添加缺失的变量

// 表单验证规则
const formRules = ref({
  name: [
    { required: true, message: "请输入区域名称", trigger: "blur" },
    { max: 50, message: "名称长度不能超过50个字符", trigger: "blur" },
  ],
  description: [
    { max: 200, message: "描述长度不能超过200个字符", trigger: "blur" },
  ],
});

// 颜色配置
const regionColors = {
  jf: {
    borderColor: "#e74c3c",
    fillColor: "#e74c3c",
    name: "禁飞区",
  },
  jg: {
    borderColor: "#ffa500",
    fillColor: "#ffa500",
    name: "警告区",
  },
};

// 计算当前区域颜色
const currentColor = computed(() => {
  return regionColors[selectedRegion.value];
});

// 初始化
const initialize = async () => {
  if (!props.map) {
    console.warn("地图实例未传入，等待初始化...");
    return;
  }

  try {
    initNoFlyZones();
    isInitialized.value = true;
  } catch (error) {
    console.error("禁飞区管理器初始化失败:", error);
  }
};

// 监听地图实例的变化
watch(
  () => props.map,
  (newMap) => {
    if (newMap && !isInitialized.value) {
      nextTick(() => {
        initialize();
      });
    }
  },
  { immediate: true },
);

// 监听父组件传来的 visible 属性
watch(
  () => props.visible,
  (newVal) => {
    toolbarVisible.value = newVal;
  },
);

onMounted(() => {
  console.log(props, "props.map");
});

onBeforeUnmount(() => {
  cleanup();
});

// 初始化禁飞区图层
const initNoFlyZones = () => {
  if (!props.map) {
    console.warn("地图实例未初始化，无法创建禁飞区图层");
    return;
  }

  try {
    // 如果已经存在图层，先移除
    if (noFlyZonesLayer.value) {
      noFlyZonesLayer.value.clearLayers();
    }

    noFlyZonesLayer.value = new T.LayerGroup();
    props.map.addLayer(noFlyZonesLayer.value);
  } catch (error) {
    console.error("初始化禁飞区图层失败:", error);
    ElMessage.error("禁飞区图层初始化失败");
  }
};

// 添加禁飞区到地图
const addZoneToMap = (zone) => {
  if (!props.map || !noFlyZonesLayer.value) {
    console.warn("地图或禁飞区图层未初始化，无法添加禁飞区");
    return;
  }

  let coordinates,
    zoneCoordinates = [],
    radius = 0;

  try {
    const parsedCoords = JSON.parse(zone.coordinates);
    if (zone.shape === "circle") {
      const centerLat = parsedCoords[0][0][0];
      const centerLng = parsedCoords[0][0][1];
      coordinates = new T.LngLat(centerLng, centerLat);
      zoneCoordinates = [{ lng: centerLng, lat: centerLat }];
      const areaSquareKm = zone.area || 0;
      if (areaSquareKm > 0) {
        const areaSquareM = areaSquareKm * 1000000;
        radius = Math.sqrt(areaSquareM / Math.PI);
      }
    } else {
      coordinates = parsedCoords[0].map((point) => {
        const lng = point[1];
        const lat = point[0];
        zoneCoordinates.push({ lng, lat });
        return new T.LngLat(lng, lat);
      });
    }
  } catch (e) {
    console.error("坐标解析失败", e);
    return;
  }

  // 根据区域颜色设置样式
  const isWarningZone = zone.fillColor === "#ffa500";
  const borderColor =
    zone.borderColor || (isWarningZone ? "#ffa500" : "#e74c3c");
  const fillColor = zone.fillColor || (isWarningZone ? "#ffa500" : "#e74c3c");

  // 创建形状
  let shape;
  if (zone.shape === "circle" && radius > 0) {
    shape = new T.Circle(coordinates, radius, {
      color: borderColor,
      weight: zone.borderWeight || 2,
      fillColor: fillColor,
      fillOpacity: zone.fillOpacity || 0.3,
    });
  } else {
    shape = new T.Polygon([coordinates], {
      color: borderColor,
      weight: zone.borderWeight || 2,
      fillColor: fillColor,
      fillOpacity: zone.fillOpacity || 0.3,
    });
  }

  const zoneData = {
    id: zone.zoneId,
    name: zone.name || `${isWarningZone ? "警告区" : "禁飞区"}${zone.zoneId}`,
    type: zone.shape || "polygon",
    createTime: zone.createTime || new Date().toISOString(),
    description: zone.description || "无",
    coordinates: zoneCoordinates,
    borderColor: borderColor,
    borderWeight: zone.borderWeight || 2,
    fillColor: fillColor,
    fillOpacity: zone.fillOpacity || 0.3,
    radius: radius,
    area: zone.area || 0,
    regionType: isWarningZone ? "jg" : "jf", // 添加区域类型标识
  };

  bindTooltipEvents(shape, zoneData);
  shape._zoneId = zone.zoneId;
  shape._originalData = zoneData;
  shape._isNoFlyZone = true;

  noFlyZonesLayer.value.addLayer(shape);
  props.map.addOverLay(shape);
  noFlyZones.value.push(zoneData);
};

// 新增鼠标移动事件处理函数，实时绘制预览线段
const handlePolygonMouseMove = (e) => {
  if (
    !props.map ||
    !noFlyZonesLayer.value ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    drawPoints.value.length === 0 ||
    isPolygonClosed.value
  ) {
    // 如果没有顶点，移除临时线段
    if (tempLine.value) {
      noFlyZonesLayer.value.removeLayer(tempLine.value);
      tempLine.value = null;
    }
    isHoveringFirstPoint.value = false;
    return;
  }

  const currentMousePoint = e.lnglat;
  const lastPoint = drawPoints.value[drawPoints.value.length - 1];

  // 移除之前的临时线段
  if (tempLine.value) {
    noFlyZonesLayer.value.removeLayer(tempLine.value);
  }

  // 检查是否悬停在第一个顶点上（用于闭合提示）
  if (drawPoints.value.length >= 3) {
    const firstPoint = drawPoints.value[0];
    const distance = calculateDistance(currentMousePoint, firstPoint);
    isHoveringFirstPoint.value = distance < 15; // 15米内判定为悬停
  } else {
    isHoveringFirstPoint.value = false;
  }

  // 创建新的临时线段（从最后一个顶点到鼠标当前位置）
  // 使用当前区域颜色
  const currentColorValue = currentColor.value;
  tempLine.value = new T.Polyline([lastPoint, currentMousePoint], {
    color: isHoveringFirstPoint.value
      ? "#2ecc71"
      : currentColorValue.borderColor,
    weight: 2,
    dashArray: "5,5",
    opacity: 0.8,
  });
  noFlyZonesLayer.value.addLayer(tempLine.value);
  // 如果悬停在第一个顶点上，显示闭合提示
  if (isHoveringFirstPoint.value && !document.querySelector(".draw-tooltip")) {
    const tooltip = document.createElement("div");
    tooltip.className = "draw-tooltip";
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(46, 204, 113, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1001;
    `;
    tooltip.textContent = "点击闭合多边形";
    document.body.appendChild(tooltip);

    // 定位提示框到第一个顶点附近
    const firstPoint = drawPoints.value[0];
    const containerPoint = props.map.lngLatToContainer(firstPoint);
    tooltip.style.left = `${containerPoint.x + 10}px`;
    tooltip.style.top = `${containerPoint.y - 20}px`;
  } else if (!isHoveringFirstPoint.value) {
    const existingTooltip = document.querySelector(".draw-tooltip");
    if (existingTooltip) {
      document.body.removeChild(existingTooltip);
    }
  }
};

// 绘制功能
const startDrawNoFlyPolygon = () => {
  if (!props.map) {
    ElMessage.warning("地图未初始化，无法绘制");
    return;
  }
  resetDrawState();
  isDrawing.value = true;
  currentDrawType.value = "polygon";
  isPolygonClosed.value = false;
  ElMessage.info("点击地图添加多边形顶点，点击第一个顶点完成闭合");
  props.map.addEventListener("click", handlePolygonDrawClick);
  props.map.addEventListener("mousemove", handlePolygonMouseMove);
};

// 修改 handlePolygonDrawClick 函数，处理闭合逻辑
const handlePolygonDrawClick = (e) => {
  if (
    !props.map ||
    !noFlyZonesLayer.value ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    isPolygonClosed.value
  ) {
    return;
  }

  const clickPoint = e.lnglat;

  // 情况1：已经有3个及以上顶点，且点击了第一个顶点（闭合）
  if (drawPoints.value.length >= 3 && isHoveringFirstPoint.value) {
    // 移除闭合提示和临时线段
    const existingTooltip = document.querySelector(".draw-tooltip");
    if (existingTooltip) {
      document.body.removeChild(existingTooltip);
    }
    if (tempLine.value) {
      noFlyZonesLayer.value.removeLayer(tempLine.value);
      tempLine.value = null;
    }

    // 完成闭合，使用第一个顶点作为最后一个点
    const firstPoint = drawPoints.value[0];

    // 更新多边形，添加闭合边
    if (tempShape.value) {
      noFlyZonesLayer.value.removeLayer(tempShape.value);
    }

    // 确保多边形顶点闭合
    const closedPoints = [...drawPoints.value, firstPoint];
    const currentColorValue = currentColor.value;
    tempShape.value = new T.Polygon([closedPoints], {
      color: currentColorValue.borderColor,
      weight: 2,
      fillColor: currentColorValue.fillColor,
      fillOpacity: 0.3,
    });
    noFlyZonesLayer.value.addLayer(tempShape.value);

    // 标记为已闭合
    isPolygonClosed.value = true;
    ElMessage.success("多边形已闭合，点击确认完成绘制");
    isHoveringFirstPoint.value = false;

    // 移除鼠标移动监听，避免闭合后仍显示虚线
    props.map.removeEventListener("mousemove", handlePolygonMouseMove);
    return;
  }

  // 情况2：添加新顶点（区分第一个顶点和其他顶点颜色）
  const point = e.lnglat;
  drawPoints.value.push(point);

  // 顶点图标颜色区分：第一个顶点蓝色，其他顶点红色
  const isFirstPoint = drawPoints.value.length === 1;
  const currentColorValue = currentColor.value;
  const iconColor = isFirstPoint ? "#3498db" : currentColorValue.borderColor;
  const markerIcon = new T.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${iconColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`,
    )}`,
    iconSize: new T.Point(12, 12),
    iconAnchor: new T.Point(6, 6),
  });

  const marker = new T.Marker(point, { icon: markerIcon });
  noFlyZonesLayer.value.addLayer(marker);
  tempMarkers.value.push({ marker, isFirstPoint });

  // 更新多边形（至少2个顶点时）
  if (tempShape.value) {
    noFlyZonesLayer.value.removeLayer(tempShape.value);
  }
  if (drawPoints.value.length >= 2) {
    const currentColorValue = currentColor.value;
    tempShape.value = new T.Polygon([drawPoints.value], {
      color: currentColorValue.borderColor,
      weight: 2,
      fillColor: currentColorValue.fillColor,
      fillOpacity: 0.3,
    });
    noFlyZonesLayer.value.addLayer(tempShape.value);

    // 绘制提示
    if (drawPoints.value.length === 2) {
      ElMessage.info("继续添加顶点，最后点击第一个顶点（蓝色）完成闭合");
    }
  } else {
    ElMessage.info("第一个顶点（蓝色）已添加，点击地图添加下一个顶点");
  }
};

const startDrawNoFlyCircle = () => {
  resetDrawState();
  isDrawing.value = true;
  currentDrawType.value = "circle";
  ElMessage.info("点击地图确定圆心，拖动鼠标绘制半径，松开鼠标完成");
  props.map.addEventListener("click", handleCircleDrawClick);
};

const handleCircleDrawClick = (e) => {
  if (!isDrawing.value || currentDrawType.value !== "circle") return;

  const point = e.lnglat;
  if (drawPoints.value.length === 0) {
    drawPoints.value.push(point);
    const currentRegionColors = currentColor.value;
    const centerMarker = new T.Marker(point, {
      icon: new T.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${currentRegionColors.fillColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`,
        )}`,
        iconSize: new T.Point(10, 10),
        iconAnchor: new T.Point(5, 5),
      }),
    });
    noFlyZonesLayer.value.addLayer(centerMarker);
    tempMarkers.value.push(centerMarker);
    isDraggingRadius.value = true;
    props.map.addEventListener("mousemove", handleCircleDragMove);
    props.map.addEventListener("mouseup", handleCircleDragEnd);
    ElMessage.info("拖动鼠标调整半径，松开鼠标完成绘制");
  }
};

const handleCircleDragMove = (e) => {
  if (!isDraggingRadius.value || drawPoints.value.length === 0) return;
  const center = drawPoints.value[0];
  const currentPoint = e.lnglat;
  dragEndPoint.value = currentPoint;
  const radius = calculateDistance(center, currentPoint);

  if (tempShape.value) noFlyZonesLayer.value.removeLayer(tempShape.value);

  // 获取当前颜色配置
  const currentRegionColors = currentColor.value;

  tempShape.value = new T.Circle(center, radius, {
    color: currentRegionColors.borderColor,
    weight: 2,
    fillColor: currentRegionColors.fillColor,
    fillOpacity: 0.3,
  });
  noFlyZonesLayer.value.addLayer(tempShape.value);
};

const handleCircleDragEnd = () => {
  if (!isDraggingRadius.value || !dragEndPoint.value) return;

  props.map.removeEventListener("mousemove", handleCircleDragMove);
  props.map.removeEventListener("mouseup", handleCircleDragEnd);
  isDraggingRadius.value = false;

  const center = drawPoints.value[0];
  const currentPoint = dragEndPoint.value;
  const radius = calculateDistance(center, currentPoint);

  if (radius < 10) {
    ElMessage.warning("圆形半径不能小于10米，请重新绘制");
    resetDrawState();
    dragEndPoint.value = null;
    return;
  }

  drawPoints.value.push(currentPoint);
  ElMessage.info("拖动完成，点击确认绘制按钮提交");
  dragEndPoint.value = null;
};

const confirmDraw = () => {
  if (!tempShape.value) {
    ElMessage.warning("请先绘制图形");
    return;
  }
  if (currentDrawType.value === "polygon" && drawPoints.value.length < 3) {
    ElMessage.warning("多边形至少需要3个顶点");
    return;
  }
  if (currentDrawType.value === "circle" && drawPoints.value.length < 2) {
    ElMessage.warning("圆形需要确定圆心和半径");
    return;
  }

  let apiCoordinates = "";
  let zoneCoordinates = [];
  let radius = 0;

  if (currentDrawType.value === "polygon") {
    const coordinates = drawPoints.value.map((point) => [point.lat, point.lng]);
    apiCoordinates = JSON.stringify([[...coordinates]]);
    zoneCoordinates = drawPoints.value.map((point) => ({
      lng: point.lng,
      lat: point.lat,
    }));
  } else if (currentDrawType.value === "circle") {
    const center = drawPoints.value[0];
    radius = calculateDistance(center, drawPoints.value[1]);
    apiCoordinates = JSON.stringify([[[center.lat, center.lng]]]);
    zoneCoordinates = [{ lng: center.lng, lat: center.lat }];
  }

  let area = 0;
  if (currentDrawType.value === "polygon") {
    area = calculatePolygonArea(zoneCoordinates);
  } else if (currentDrawType.value === "circle") {
    area = calculateCircleArea(radius);
  }

  tempDrawData.value = {
    apiCoordinates,
    zoneCoordinates,
    radius,
    area,
  };

  formData.value = { name: "", description: "" };
  dialogVisible.value = true;
};

const submitForm = async () => {
  formRef.value.validate(async (valid) => {
    if (valid && tempDrawData.value) {
      try {
        const currentColorValue = currentColor.value;
        const apiParams = {
          area: tempDrawData.value.area.toFixed(6),
          borderColor: currentColorValue.borderColor,
          borderWeight: 2,
          coordinates: tempDrawData.value.apiCoordinates,
          createTime: new Date().toISOString().replace("T", " ").slice(0, 19),
          description: formData.value.description || "无",
          fillColor: currentColorValue.fillColor,
          fillOpacity: 0.3,
          name: formData.value.name,
          shape: currentDrawType.value,
        };

        const res = await noflyzoneAdd(apiParams);
        if (res.code === 200) {
          ElMessage.success(`${regionName.value}创建成功`);
          emit("zone-saved");
        } else {
          ElMessage.error(`禁飞区创建失败：${res.message || "未知错误"}`);
        }
      } catch (error) {
        console.error("禁飞区接口调用失败：", error);
        ElMessage.error(`${regionName.value}创建失败，请检查网络或接口配置`);
      }

      dialogVisible.value = false;
      resetDrawState();
    }
  });
};

const handleDialogClose = () => {
  formRef.value.resetFields();
  tempDrawData.value = null;
};

// 修改 resetDrawState 函数，添加临时线段清理
const resetDrawState = () => {
  isDrawing.value = false;
  isDraggingRadius.value = false;
  currentDrawType.value = null;
  dragEndPoint.value = null;
  isHoveringFirstPoint.value = false;
  isPolygonClosed.value = false;

  // 移除闭合提示
  const existingTooltip = document.querySelector(".draw-tooltip");
  if (existingTooltip) {
    document.body.removeChild(existingTooltip);
  }

  // 清理临时线段
  if (tempLine.value) {
    noFlyZonesLayer.value.removeLayer(tempLine.value);
    tempLine.value = null;
  }

  if (tempShape.value) {
    noFlyZonesLayer.value.removeLayer(tempShape.value);
    tempShape.value = null;
  }
  // 清理顶点标记
  tempMarkers.value.forEach(({ marker }) => {
    if (marker) noFlyZonesLayer.value.removeLayer(marker);
  });
  tempMarkers.value = [];
  drawPoints.value = [];

  // 移除所有事件监听
  props.map.removeEventListener("click", handlePolygonDrawClick);
  props.map.removeEventListener("click", handleCircleDrawClick);
  props.map.removeEventListener("mousemove", handleCircleDragMove);
  props.map.removeEventListener("mouseup", handleCircleDragEnd);
  props.map.removeEventListener("mousemove", handlePolygonMouseMove);
};

const cancelDraw = () => {
  resetDrawState();
  ElMessage.info("已取消绘制");
};

// 工具函数
const calculateDistance = (p1, p2) => {
  const R = 6371000; // 地球半径（米）
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
  return R * c; // 米
};

const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  const earthRadius = 6378137;

  const radPoints = coordinates.map((point) => ({
    lng: (point.lng * Math.PI) / 180,
    lat: (point.lat * Math.PI) / 180,
  }));

  for (let i = 0; i < radPoints.length; i++) {
    const j = (i + 1) % radPoints.length;
    const xi = radPoints[i].lng * earthRadius * Math.cos(radPoints[i].lat);
    const yi = radPoints[i].lat * earthRadius;
    const xj = radPoints[j].lng * earthRadius * Math.cos(radPoints[j].lat);
    const yj = radPoints[j].lat * earthRadius;
    area += xi * yj - xj * yi;
  }

  const squareMeters = Math.abs(area / 2);
  return Number((squareMeters / 1000000).toFixed(6));
};

const calculateCircleArea = (radius) => {
  if (radius <= 0) return 0;
  const squareMeters = Math.PI * radius * radius;
  return Number((squareMeters / 1000000).toFixed(6));
};

const bindTooltipEvents = (shape, zoneData) => {
  shape.addEventListener("click", (e) => {
    if (!zoneData) return;

    // 更新位置
    tooltipPosition.value = {
      x: e.containerPoint.x,
      y:
        zoneData.type === "polygon"
          ? e.containerPoint.y
          : e.containerPoint.y - 20,
    };

    // 计算面积
    let area = 0;
    if (
      zoneData.type === "polygon" &&
      zoneData.coordinates &&
      zoneData.coordinates.length >= 3
    ) {
      area = calculatePolygonArea(zoneData.coordinates);
    } else if (zoneData.type === "circle" && zoneData.radius > 0) {
      area = calculateCircleArea(zoneData.radius);
    }

    // 更新数据
    tooltipData.value = { ...zoneData, area };
    showTooltip.value = true;
  });

  shape.addEventListener("mouseout", () => {
    showTooltip.value = false;
  });
};

const cleanup = () => {
  if (noFlyZonesLayer.value) {
    noFlyZonesLayer.value.clearLayers();
  }
  resetDrawState();
};

//区域选择
const regionSelection = (value) => {
  selectedRegion.value = value;
  regionName.value = regionColors[value].name;
  ElMessage.info(`当前选择：${regionName.value}`);
};
</script>

<style scoped>
.control-toolbar {
  position: absolute;
  top: 92px;
  right: 10px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.primary {
  background-color: #e74c3c;
  color: white;
}
.warningArea {
  background-color: #ffa500;
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

.circle::before {
  content: "●";
  margin-right: 5px;
  font-size: 16px;
}

.confirm::before {
  content: "✔";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.cancel::before {
  content: "✖";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

/* 图例样式 */
.legend {
  margin-top: 15px;
  margin-bottom: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.legend-item:hover {
  background-color: #e9ecef;
}

.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 2px;
  cursor: pointer;
}

.red {
  background-color: rgba(231, 76, 60, 0.6);
}
.orange {
  background-color: rgba(255, 165, 0, 0.6);
}

.tooltip-content .label {
  color: #666;
  margin-right: 6px;
  display: inline-block;
  width: 50px;
}

.no-fly-tooltip {
  max-width: 300px;
  word-wrap: break-word;
}

.draw-tooltip {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
