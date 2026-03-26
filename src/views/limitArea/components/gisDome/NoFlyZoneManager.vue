<template>
  <!-- 区域操作工具栏 toolbarVisible11  -->
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
const noFlyZoneOverlays = ref([]); // 管理所有禁飞区覆盖物
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
const firstMarkerPixel = ref({ x: 0, y: 0 }); // 存储第一个Marker的实际像素位置
const isHoveringFirstPoint = ref(false);
const isPolygonClosed = ref(false);
const regionName = ref("禁飞区");
const selectedRegion = ref("jf");
const isDraggingRadius = ref(false);
const dragEndPoint = ref(null);

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

// 初始化禁飞区图层（高德地图适配）
const initNoFlyZones = () => {
  if (!props.map) {
    console.warn("地图实例未初始化，无法创建禁飞区图层");
    return;
  }

  try {
    // 清理已存在的禁飞区覆盖物
    clearNoFlyZoneOverlays();
    console.log("禁飞区图层初始化成功");
  } catch (error) {
    console.error("初始化禁飞区图层失败:", error);
    ElMessage.error("禁飞区图层初始化失败");
  }
};

// 清理所有禁飞区覆盖物
const clearNoFlyZoneOverlays = () => {
  if (!props.map) return; // 新增：非空检查
  noFlyZoneOverlays.value.forEach((overlay) => {
    if (overlay && props.map.remove) {
      props.map.remove(overlay);
    }
  });
  noFlyZoneOverlays.value = [];
};

// 添加禁飞区到地图（高德地图适配）
const addZoneToMap = (zone) => {
  if (!props.map) {
    console.warn("地图或禁飞区图层未初始化，无法添加禁飞区");
    return;
  }

  let coordinates,
    zoneCoordinates = [],
    radius = 0;

  try {
    const parsedCoords = JSON.parse(zone.coordinates);
    if (zone.shape === "circle") {
      // 高德地图：经纬度顺序是 [lng, lat]
      const centerLat = parsedCoords[0][0][0];
      const centerLng = parsedCoords[0][0][1];
      coordinates = [centerLng, centerLat]; // 高德坐标格式 [lng, lat]
      zoneCoordinates = [{ lng: centerLng, lat: centerLat }];
      const areaSquareKm = zone.area || 0;
      if (areaSquareKm > 0) {
        const areaSquareM = areaSquareKm * 1000000;
        radius = Math.sqrt(areaSquareM / Math.PI);
      }
    } else {
      // 转换为高德地图坐标格式 [lng, lat]
      coordinates = parsedCoords[0].map((point) => {
        const lng = point[1];
        const lat = point[0];
        zoneCoordinates.push({ lng, lat });
        return [lng, lat]; // 高德坐标格式
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

  // 创建形状（高德地图适配）
  let shape;
  if (zone.shape === "circle" && radius > 0) {
    // 高德地图圆形
    shape = new AMap.Circle({
      center: new AMap.LngLat(...coordinates),
      radius: radius, // 半径（米）
      strokeColor: borderColor,
      strokeWeight: zone.borderWeight || 2,
      fillColor: fillColor,
      fillOpacity: zone.fillOpacity || 0.3,
      strokeOpacity: 1,
    });
  } else {
    // 高德地图多边形
    shape = new AMap.Polygon({
      path: coordinates,
      strokeColor: borderColor,
      strokeWeight: zone.borderWeight || 2,
      fillColor: fillColor,
      fillOpacity: zone.fillOpacity || 0.3,
      strokeOpacity: 1,
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
    regionType: isWarningZone ? "jg" : "jf",
  };

  bindTooltipEvents(shape, zoneData);
  shape._zoneId = zone.zoneId;
  shape._originalData = zoneData;
  shape._isNoFlyZone = true;

  // 高德地图添加覆盖物
  props.map.add(shape);
  noFlyZoneOverlays.value.push(shape);
  noFlyZones.value.push(zoneData);
};

// 鼠标移动事件处理（高德地图适配）
const handlePolygonMouseMove = (e) => {
  // 先清掉上一条线
  try {
    if (tempLine.value && props.map) {
      // 新增：非空检查
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
    if (props.map) {
      // 新增：非空检查
      const allOverlays = props.map.getAllOverlays("polyline");
      allOverlays.forEach((overlay) => {
        if (overlay._isTempPreviewLine) props.map.remove(overlay);
      });
    }
  } catch (err) {}

  if (
    !props.map ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    drawPoints.value.length === 0 ||
    isPolygonClosed.value
  ) {
    isHoveringFirstPoint.value = false;
    const tip = document.querySelector(".draw-tooltip");
    tip && document.body.removeChild(tip);
    return;
  }

  const lng = e.lnglat.getLng();
  const lat = e.lnglat.getLat();
  const currentPoint = [lng, lat];
  const lastPoint = drawPoints.value[drawPoints.value.length - 1];

  // ########### 核心修复：兼容高德2.0事件对象，修复clientX报错 ###########
  let isHover = false;
  if (drawPoints.value.length >= 3 && firstMarkerPixel.value.x > 0) {
    try {
      // 方案1：优先用经纬度转像素（稳定，无clientX依赖）
      const currentPx = props.map.lngLatToContainer(new AMap.LngLat(lng, lat));
      // 计算像素距离（基于Marker存储的像素位置）
      const pxDist = Math.hypot(
        firstMarkerPixel.value.x - currentPx.x,
        firstMarkerPixel.value.y - currentPx.y,
      );
      isHover = pxDist < 150; // 扩大到150像素容错（配合图标增大）
    } catch (err) {
      // 方案2：兜底用鼠标事件（兼容不同版本）
      const mapRect = props.map.getContainer().getBoundingClientRect();
      // 兼容originalEvent不存在的情况
      const mouseEvent = e.originalEvent || e;
      const mouseX = mouseEvent.clientX - mapRect.left;
      const mouseY = mouseEvent.clientY - mapRect.top;
      const pxDist = Math.hypot(
        firstMarkerPixel.value.x - mouseX,
        firstMarkerPixel.value.y - mouseY,
      );
      isHover = pxDist < 150; // 扩大到150像素
    }
  }
  isHoveringFirstPoint.value = isHover;

  // 橙色加粗线条
  const lineColor = isHover ? "#ff9500" : currentColor.value.borderColor;
  const lineWeight = isHover ? 3 : 2;

  tempLine.value = new AMap.Polyline({
    path: [lastPoint, currentPoint],
    strokeColor: lineColor,
    strokeWeight: lineWeight,
    strokeDasharray: [5, 5],
    strokeOpacity: 1,
    zIndex: 9999,
  });
  tempLine.value._isTempPreviewLine = true;
  props.map.add(tempLine.value);

  // 提示框
  const tip = document.querySelector(".draw-tooltip");
  if (isHover) {
    if (!tip) {
      const div = document.createElement("div");
      div.className = "draw-tooltip";
      div.textContent = "点击闭合多边形";
      div.style.cssText = `
        position:absolute;background:#ff9500;color:white;padding:4px 8px;
        border-radius:4px;font-size:12px;z-index:1001;font-weight:bold;
      `;
      document.body.appendChild(div);
    }
    const t = document.querySelector(".draw-tooltip");
    if (t && firstMarkerPixel.value.x > 0) {
      t.style.left = firstMarkerPixel.value.x + 10 + "px";
      t.style.top = firstMarkerPixel.value.y - 25 + "px";
    }
  } else {
    tip && document.body.removeChild(tip);
  }
};
// 开始绘制多边形（高德地图适配）
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

  // 高德地图事件绑定（先解绑再绑定，避免重复）
  props.map.off("click", handlePolygonDrawClick);
  props.map.off("mousemove", handlePolygonMouseMove);
  props.map.on("click", handlePolygonDrawClick);
  props.map.on("mousemove", handlePolygonMouseMove);
};

// 多边形绘制点击处理（高德地图适配）
const handlePolygonDrawClick = (e) => {
  if (
    !props.map ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    isPolygonClosed.value
  )
    return;

  const lng = e.lnglat.getLng();
  const lat = e.lnglat.getLat();
  const clickPoint = [lng, lat];

  // ########### 核心修复：直接判断是否点击了第一个蓝色Marker ###########
  let isClickOnFirstMarker = false;
  if (
    drawPoints.value.length >= 3 &&
    isClickOnFirstMarker // 只保留这一项
  ) {
    // 清理临时元素
    const tip = document.querySelector(".draw-tooltip");
    tip && document.body.removeChild(tip);
    if (tempLine.value && props.map) {
      // 新增：非空检查
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
    if (tempShape.value && props.map) {
      // 新增：非空检查
      props.map.remove(tempShape.value);
    }

    // 闭合多边形
    const first = drawPoints.value[0];
    const closed = [...drawPoints.value, first];
    tempShape.value = new AMap.Polygon({
      path: closed,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
    });
    props.map.add(tempShape.value);

    isPolygonClosed.value = true;
    isHoveringFirstPoint.value = false;
    props.map.off("mousemove", handlePolygonMouseMove);
    ElMessage.success("多边形已闭合");
    return;
  }

  // ########### 核心修复：扩大像素判定范围，避免坐标偏移影响 ###########
  let isClickOnFirstPoint = false;
  if (drawPoints.value.length >= 3 && firstMarkerPixel.value.x > 0) {
    try {
      const clickPx = props.map.lngLatToContainer(new AMap.LngLat(lng, lat));
      const pxDist = Math.hypot(
        firstMarkerPixel.value.x - clickPx.x,
        firstMarkerPixel.value.y - clickPx.y,
      );
      // 扩大到200像素，确保视觉上的蓝色圆点区域都能触发
      isClickOnFirstPoint = pxDist < 200;
    } catch (err) {
      isClickOnFirstPoint = false;
    }
  }

  // 闭合判定：满足任一条件即可（点击Marker / 像素范围 / 悬停状态）
  if (
    drawPoints.value.length >= 3 &&
    (isHoveringFirstPoint.value || isClickOnFirstPoint || isClickOnFirstMarker)
  ) {
    // 清理临时元素
    const tip = document.querySelector(".draw-tooltip");
    tip && document.body.removeChild(tip);
    if (tempLine.value && props.map) {
      // 新增：非空检查
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
    if (tempShape.value && props.map) {
      // 新增：非空检查
      props.map.remove(tempShape.value);
    }

    // 闭合多边形
    const first = drawPoints.value[0];
    const closed = [...drawPoints.value, first];
    tempShape.value = new AMap.Polygon({
      path: closed,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
    });
    // 标记为临时绘制对象，便于取消时清除
    tempShape.value._isTempDrawingShape = true;
    props.map.add(tempShape.value);

    isPolygonClosed.value = true;
    isHoveringFirstPoint.value = false;
    // 移除绘制相关事件监听
    props.map.off("mousemove", handlePolygonMouseMove);
    ElMessage.success("多边形已闭合");
    return;
  }

  // 正常添加顶点
  drawPoints.value.push(clickPoint);

  const firstFlag = drawPoints.value.length === 1;
  const color = firstFlag ? "#3498db" : currentColor.value.borderColor;

  // 创建Marker（保持24x24大小，确保可点击区域足够大）
  const marker = new AMap.Marker({
    position: clickPoint,
    icon: new AMap.Icon({
      size: new AMap.Size(24, 24),
      image: `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`,
      )}`,
      imageSize: new AMap.Size(24, 24),
    }),
    anchor: "center",
    zIndex: firstFlag ? 10000 : 9999,
    clickable: true, // 确保Marker可点击
    cursor: firstFlag ? "pointer" : "default",
  });
  props.map.add(marker);
  tempMarkers.value.push({ marker, isFirstPoint: firstFlag });

  // 存储第一个Marker的像素位置
  if (firstFlag) {
    setTimeout(() => {
      try {
        const markerPx = marker.getPosition();
        const mapPx = props.map.lngLatToContainer(markerPx);
        firstMarkerPixel.value = {
          x: mapPx.x,
          y: mapPx.y,
        };
      } catch (err) {
        console.warn("获取Marker像素位置失败:", err);
      }
    }, 100);
  }

  // 刷新预览多边形
  if (tempShape.value && props.map) {
    // 新增：非空检查
    props.map.remove(tempShape.value);
  }
  if (drawPoints.value.length >= 2) {
    tempShape.value = new AMap.Polygon({
      path: drawPoints.value,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
    });
    // 标记为临时绘制对象，便于取消时清除
    tempShape.value._isTempDrawingShape = true;
    props.map.add(tempShape.value);
  }
};

// 开始绘制圆形（高德地图适配）
const startDrawNoFlyCircle = () => {
  resetDrawState();
  if (!props.map) {
    // 新增：非空检查
    ElMessage.warning("地图未初始化，无法绘制");
    return;
  }
  isDrawing.value = true;
  currentDrawType.value = "circle";
  ElMessage.info("点击确定圆心，拖动可自由放大缩小半径");

  // 先解绑，避免残留
  props.map.off("click", handleCircleDrawClick);
  props.map.off("mousemove", handleCircleDragMove);
  props.map.off("mouseup", handleCircleDragEnd);

  props.map.on("click", handleCircleDrawClick);
};

// 点击地图放置圆心
const handleCircleDrawClick = (e) => {
  if (!isDrawing.value || currentDrawType.value !== "circle" || !props.map)
    return; // 新增：非空检查

  const point = [e.lnglat.getLng(), e.lnglat.getLat()];

  if (drawPoints.value.length === 0) {
    drawPoints.value.push(point); // 圆心

    const centerMarker = new AMap.Marker({
      position: point,
      icon: new AMap.Icon({
        size: new AMap.Size(10, 10),
        image: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="${currentColor.value.fillColor}"/></svg>`,
        )}`,
        imageSize: new AMap.Size(10, 10),
      }),
      anchor: "center",
    });
    props.map.add(centerMarker);
    tempMarkers.value.push(centerMarker);

    // 绑定拖动事件（确保只绑定一次）
    props.map.on("mousemove", handleCircleDragMove);
    props.map.on("mouseup", handleCircleDragEnd);

    ElMessage.info("拖动鼠标调整半径，松开完成");
  }
};

// 拖拽移动时实时更新圆形（只保留一个临时圆形）
const handleCircleDragMove = (e) => {
  if (drawPoints.value.length === 0 || !props.map) return; // 新增：非空检查

  const center = drawPoints.value[0];
  const currLng = e.lnglat.getLng();
  const currLat = e.lnglat.getLat();

  // 计算实时半径（米）
  const r = AMap.GeometryUtil.distance(
    new AMap.LngLat(center[0], center[1]),
    new AMap.LngLat(currLng, currLat),
  );

  // 允许缩小，最小限制为10米
  const radius = Math.max(r, 10);

  // 移除旧的临时圆形（如果存在）
  if (tempShape.value) {
    props.map.remove(tempShape.value);
    tempShape.value = null;
  }

  // 创建新的临时圆形
  tempShape.value = new AMap.Circle({
    center: new AMap.LngLat(center[0], center[1]),
    radius: radius,
    strokeColor: currentColor.value.borderColor,
    strokeWeight: 2,
    fillColor: currentColor.value.fillColor,
    fillOpacity: 0.3,
  });
  // 标记为临时绘制对象，便于取消时清除
  tempShape.value._isTempDrawingShape = true;
  props.map.add(tempShape.value);

  // 保存当前鼠标位置供结束使用
  window._dragTempPos = [currLng, currLat];
};

// 拖拽结束，生成最终圆形
const handleCircleDragEnd = (e) => {
  if (!props.map) return; // 新增：非空检查

  // 先移除事件监听，避免后续误触
  props.map.off("mousemove", handleCircleDragMove);
  props.map.off("mouseup", handleCircleDragEnd);

  if (drawPoints.value.length === 0) {
    // 清理临时变量
    delete window._dragTempPos;
    return;
  }

  const center = drawPoints.value[0];
  // 获取最终鼠标位置（优先使用事件参数，其次使用临时变量）
  let finalPos = null;
  if (e && e.lnglat) {
    finalPos = [e.lnglat.getLng(), e.lnglat.getLat()];
  } else if (window._dragTempPos) {
    finalPos = window._dragTempPos;
  }

  if (!finalPos) {
    // 如果没有有效终点，清理临时圆形，重置状态
    if (tempShape.value) {
      props.map.remove(tempShape.value);
      tempShape.value = null;
    }
    delete window._dragTempPos;
    return;
  }

  // 计算最终半径
  const finalRadius = AMap.GeometryUtil.distance(
    new AMap.LngLat(center[0], center[1]),
    new AMap.LngLat(finalPos[0], finalPos[1]),
  );

  if (finalRadius < 10) {
    ElMessage.warning("圆形半径不能小于10米，请重新调整");
    // 重新绑定事件，以便继续调整
    props.map.on("mousemove", handleCircleDragMove);
    props.map.on("mouseup", handleCircleDragEnd);
    delete window._dragTempPos;
    return;
  }

  // 不删除临时圆形，直接更新属性，避免消失
  if (tempShape.value) {
    tempShape.value.setCenter(new AMap.LngLat(center[0], center[1]));
    tempShape.value.setRadius(finalRadius);
    delete tempShape.value._isTempDrawingCircle;
  } else {
    // 创建最终圆形
    const finalCircle = new AMap.Circle({
      center: new AMap.LngLat(center[0], center[1]),
      radius: finalRadius,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
    });
    // 标记为临时绘制对象，便于取消时清除
    finalCircle._isTempDrawingShape = true;
    props.map.add(finalCircle);
    tempShape.value = finalCircle;
  }

  // 保存半径控制点（供确认绘制使用）
  drawPoints.value[1] = finalPos;

  ElMessage.info(`圆形半径${finalRadius.toFixed(2)}米，点击“确认绘制”提交`);
  delete window._dragTempPos;
};

// 重置绘制状态（核心修复：所有地图操作前都加非空检查）
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

  // 清理临时线
  try {
    if (tempLine.value && props.map) {
      // 核心修复：非空检查
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
    if (props.map) {
      // 核心修复：非空检查
      const allPolylines = props.map.getAllOverlays("polyline");
      allPolylines.forEach((polyline) => {
        if (polyline._isTempPreviewLine) {
          props.map.remove(polyline);
        }
      });
    }
  } catch (err) {
    console.warn("重置状态时清理临时线异常：", err);
  }

  // 清理临时形状（包括圆形和多边形）
  try {
    if (tempShape.value && props.map) {
      // 核心修复：非空检查
      props.map.remove(tempShape.value);
      tempShape.value = null;
    }
    // 清理所有标记为临时绘制的形状（兜底）
    if (props.map) {
      // 核心修复：非空检查
      const allCircles = props.map.getAllOverlays("circle");
      allCircles.forEach((circle) => {
        if (circle._isTempDrawingCircle || circle._isTempDrawingShape) {
          props.map.remove(circle);
        }
      });
      const allPolygons = props.map.getAllOverlays("polygon");
      allPolygons.forEach((polygon) => {
        if (polygon._isTempDrawingShape) {
          props.map.remove(polygon);
        }
      });
    }
  } catch (err) {
    console.warn("重置状态时清理临时形状异常：", err);
  }

  // 清理顶点标记
  if (props.map) {
    // 核心修复：非空检查
    tempMarkers.value.forEach((item) => {
      const marker = item.marker || item;
      if (marker) props.map.remove(marker);
    });
  }
  tempMarkers.value = [];
  drawPoints.value = [];

  // 移除所有事件监听（核心修复：先检查map是否存在）
  if (props.map && props.map.off) {
    // 核心修复：非空检查
    props.map.off("click", handlePolygonDrawClick);
    props.map.off("click", handleCircleDrawClick);
    props.map.off("mousemove", handlePolygonMouseMove);
    props.map.off("mousemove", handleCircleDragMove);
    props.map.off("mouseup", handleCircleDragEnd);
  }

  // 清理临时变量
  delete window._dragTempPos;
};

// 确认绘制
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
    // 转换为后端需要的格式 [lat, lng]
    const coordinates = drawPoints.value.map((point) => [point[1], point[0]]);
    apiCoordinates = JSON.stringify([[...coordinates]]);
    zoneCoordinates = drawPoints.value.map((point) => ({
      lng: point[0],
      lat: point[1],
    }));
  } else if (currentDrawType.value === "circle") {
    const center = drawPoints.value[0];
    radius = calculateDistance(
      { lng: center[0], lat: center[1] },
      { lng: drawPoints.value[1][0], lat: drawPoints.value[1][1] },
    );
    // 转换为后端需要的格式 [lat, lng]
    apiCoordinates = JSON.stringify([[[center[1], center[0]]]]);
    zoneCoordinates = [{ lng: center[0], lat: center[1] }];
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

// 提交表单
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

// 关闭弹窗处理
const handleDialogClose = () => {
  if (formRef.value) {
    // 新增：非空检查
    formRef.value.resetFields();
  }
  tempDrawData.value = null;
};

// 取消绘制
const cancelDraw = () => {
  resetDrawState();
  ElMessage.info("已取消绘制");
};

// 计算两点间距离（米）
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

// 计算多边形面积（平方公里）
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

// 计算圆形面积（平方公里）
const calculateCircleArea = (radius) => {
  if (radius <= 0) return 0;
  const squareMeters = Math.PI * radius * radius;
  return Number((squareMeters / 1000000).toFixed(6));
};

// 绑定tooltip事件（高德地图适配）
const bindTooltipEvents = (shape, zoneData) => {
  // 高德地图点击事件
  shape.on("click", (e) => {
    if (!zoneData) return;

    // 更新位置
    tooltipPosition.value = {
      x: e.pixel.x,
      y: zoneData.type === "polygon" ? e.pixel.y : e.pixel.y - 20,
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

  // 高德地图鼠标移出事件
  shape.on("mouseout", () => {
    showTooltip.value = false;
  });
};

// 清理资源
const cleanup = () => {
  clearNoFlyZoneOverlays();
  resetDrawState();
};

// 区域选择
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
