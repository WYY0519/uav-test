<template>
  <div class="control-toolbar" v-show="toolbarVisible">
    <h3>
      区域管理 <el-icon @click="regionClose"><Close /></el-icon>
    </h3>
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
import NoFlyZoneTooltip from "./components/NoFlyZoneTooltip.vue";
import { Close } from "@element-plus/icons-vue";

const props = defineProps({
  map: { type: Object, required: true },
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "zone-saved"]);

const toolbarVisible = ref(false);
const noFlyZoneOverlays = ref([]);
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
const formData = ref({ name: "", description: "" });
const tempDrawData = ref(null);
const isInitialized = ref(false);
const tempLine = ref(null);
const firstMarkerPixel = ref({ x: 0, y: 0 });
const isHoveringFirstPoint = ref(false);
const isPolygonClosed = ref(false);
const regionName = ref("禁飞区");
const selectedRegion = ref("jf");
const isDraggingRadius = ref(false);
const dragEndPoint = ref(null);

const formRules = ref({
  name: [
    { required: true, message: "请输入区域名称", trigger: "blur" },
    { max: 50, message: "名称长度不能超过50个字符", trigger: "blur" },
  ],
  description: [
    { max: 200, message: "描述长度不能超过200个字符", trigger: "blur" },
  ],
});

const regionColors = {
  jf: { borderColor: "#e74c3c", fillColor: "#e74c3c", name: "禁飞区" },
  jg: { borderColor: "#ffa500", fillColor: "#ffa500", name: "警告区" },
};
const currentColor = computed(() => regionColors[selectedRegion.value]);

const closePolygon = () => {
  if (!props.map || isPolygonClosed.value) return;
  const tip = document.querySelector(".draw-tooltip");
  tip && document.body.removeChild(tip);

  if (tempLine.value) {
    props.map.remove(tempLine.value);
    tempLine.value = null;
  }
  if (tempShape.value) props.map.remove(tempShape.value);

  const first = drawPoints.value[0];
  const closed = [...drawPoints.value, first];
  tempShape.value = new AMap.Polygon({
    path: closed,
    strokeColor: currentColor.value.borderColor,
    strokeWeight: 2,
    fillColor: currentColor.value.fillColor,
    fillOpacity: 0.3,
  });
  tempShape.value._isTempDrawingShape = true;
  props.map.add(tempShape.value);

  isPolygonClosed.value = true;
  props.map.off("mousemove", handlePolygonMouseMove);
  ElMessage.success("多边形已闭合");
};

const initialize = async () => {
  if (!props.map) return;
  try {
    initNoFlyZones();
    isInitialized.value = true;
  } catch (error) {
    console.error("禁飞区管理器初始化失败:", error);
  }
};

watch(
  () => props.map,
  (newMap) => {
    if (newMap && !isInitialized.value) nextTick(() => initialize());
  },
  { immediate: true },
);

watch(
  () => props.visible,
  (newVal) => {
    toolbarVisible.value = newVal;
  },
);

onMounted(() => {});
onBeforeUnmount(() => cleanup());

const initNoFlyZones = () => {
  if (!props.map) return;
  try {
    clearNoFlyZoneOverlays();
  } catch (error) {
    console.error("初始化禁飞区图层失败:", error);
  }
};

const clearNoFlyZoneOverlays = () => {
  if (!props.map) return;
  noFlyZoneOverlays.value.forEach((overlay) => {
    if (overlay) props.map.remove(overlay);
  });
  noFlyZoneOverlays.value = [];
};

const addZoneToMap = (zone) => {
  if (!props.map) return;
  let coordinates,
    zoneCoordinates = [],
    radius = 0;

  try {
    const parsedCoords = JSON.parse(zone.coordinates);
    if (zone.shape === "circle") {
      const centerLat = parsedCoords[0][0][0];
      const centerLng = parsedCoords[0][0][1];
      coordinates = [centerLng, centerLat];
      zoneCoordinates = [{ lng: centerLng, lat: centerLat }];
      const areaSquareKm = zone.area || 0;
      radius = Math.sqrt((areaSquareKm * 1000000) / Math.PI);
    } else {
      coordinates = parsedCoords[0].map((point) => [point[1], point[0]]);
      zoneCoordinates = parsedCoords[0].map((point) => ({
        lng: point[1],
        lat: point[0],
      }));
    }
  } catch (e) {
    console.error("坐标解析失败", e);
    return;
  }

  const isWarningZone = zone.fillColor === "#ffa500";
  const borderColor =
    zone.borderColor || (isWarningZone ? "#ffa500" : "#e74c3c");
  const fillColor = zone.fillColor || (isWarningZone ? "#ffa500" : "#e74c3c");

  let shape;
  if (zone.shape === "circle" && radius > 0) {
    shape = new AMap.Circle({
      center: new AMap.LngLat(...coordinates),
      radius: radius,
      strokeColor: borderColor,
      strokeWeight: 2,
      fillColor: fillColor,
      fillOpacity: 0.3,
    });
  } else {
    shape = new AMap.Polygon({
      path: coordinates,
      strokeColor: borderColor,
      strokeWeight: 2,
      fillColor: fillColor,
      fillOpacity: 0.3,
    });
  }

  const zoneData = {
    id: zone.zoneId,
    name: zone.name || `${isWarningZone ? "警告区" : "禁飞区"}${zone.zoneId}`,
    type: zone.shape || "polygon",
    coordinates: zoneCoordinates,
    borderColor,
    fillColor,
    radius,
    area: zone.area || 0,
    regionType: isWarningZone ? "jg" : "jf",
  };

  bindTooltipEvents(shape, zoneData);
  shape._zoneId = zone.zoneId;
  props.map.add(shape);
  noFlyZoneOverlays.value.push(shape);
  noFlyZones.value.push(zoneData);
};

const handlePolygonMouseMove = (e) => {
  try {
    if (tempLine.value && props.map) {
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
  } catch (err) {}

  if (
    !props.map ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    drawPoints.value.length === 0 ||
    isPolygonClosed.value
  )
    return;

  const lng = e.lnglat.getLng();
  const lat = e.lnglat.getLat();
  const currentPoint = [lng, lat];
  const lastPoint = drawPoints.value[drawPoints.value.length - 1];

  tempLine.value = new AMap.Polyline({
    path: [lastPoint, currentPoint],
    strokeColor: "#00c48c",
    strokeWeight: 2,
    strokeDasharray: [5, 5],
    zIndex: 9999,
  });
  tempLine.value._isTempPreviewLine = true;
  props.map.add(tempLine.value);
};

const regionClose = () => {
  toolbarVisible.value = !toolbarVisible.value;
};

const startDrawNoFlyPolygon = () => {
  if (!props.map) {
    ElMessage.warning("地图未初始化");
    return;
  }
  resetDrawState();
  isDrawing.value = true;
  currentDrawType.value = "polygon";
  isPolygonClosed.value = false;
  ElMessage.info("点击地图添加顶点，点击【第一个蓝色圆点】闭合");

  props.map.off("click", handlePolygonDrawClick);
  props.map.off("mousemove", handlePolygonMouseMove);
  props.map.on("click", handlePolygonDrawClick);
  props.map.on("mousemove", handlePolygonMouseMove);
};

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
  drawPoints.value.push(clickPoint);

  const firstFlag = drawPoints.value.length === 1;
  const color = firstFlag ? "#3498db" : currentColor.value.borderColor;

  const marker = new AMap.Marker({
    position: clickPoint,
    icon: new AMap.Icon({
      size: new AMap.Size(24, 24),
      image: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`)}`,
      imageSize: new AMap.Size(24, 24),
    }),
    anchor: "center",
    zIndex: firstFlag ? 10000 : 9999,
    clickable: true,
    cursor: firstFlag ? "pointer" : "default",
  });

  if (firstFlag) {
    marker.on("click", () => {
      if (drawPoints.value.length >= 3 && !isPolygonClosed.value)
        closePolygon();
    });
  }

  props.map.add(marker);
  tempMarkers.value.push({ marker, isFirstPoint: firstFlag });

  if (firstFlag) {
    setTimeout(() => {
      try {
        const markerPx = marker.getPosition();
        const mapPx = props.map.lngLatToContainer(markerPx);
        firstMarkerPixel.value = { x: mapPx.x, y: mapPx.y };
      } catch (err) {}
    }, 100);
  }

  if (tempShape.value) props.map.remove(tempShape.value);
  if (drawPoints.value.length >= 2) {
    tempShape.value = new AMap.Polygon({
      path: drawPoints.value,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
    });
    tempShape.value._isTempDrawingShape = true;
    props.map.add(tempShape.value);
  }
};

const startDrawNoFlyCircle = () => {
  resetDrawState();
  if (!props.map) {
    ElMessage.warning("地图未初始化");
    return;
  }
  isDrawing.value = true;
  currentDrawType.value = "circle";

  // 锁定地图，拖动不漂移
  props.map.setStatus({ dragEnable: false, keyboardEnable: false });

  ElMessage.info("点击确定圆心，拖动调整半径");
  props.map.off("click", handleCircleDrawClick);
  props.map.on("click", handleCircleDrawClick);
};

const handleCircleDrawClick = (e) => {
  if (!isDrawing.value || currentDrawType.value !== "circle" || !props.map)
    return;

  const point = [e.lnglat.getLng(), e.lnglat.getLat()];
  if (drawPoints.value.length === 0) {
    drawPoints.value.push(point);

    const centerMarker = new AMap.Marker({
      position: point,
      icon: new AMap.Icon({
        size: new AMap.Size(16, 16),
        image: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${currentColor.value.fillColor}" stroke="#fff" stroke-width="1"/></svg>`)}`,
        imageSize: new AMap.Size(16, 16),
      }),
      anchor: "center",
      clickable: false,
      zIndex: 9999,
    });

    props.map.add(centerMarker);
    tempMarkers.value.push(centerMarker);

    props.map.on("mousemove", handleCircleDragMove);
    props.map.on("mouseup", handleCircleDragEnd);
  }
};

const handleCircleDragMove = (e) => {
  if (!isDrawing.value || drawPoints.value.length === 0 || !props.map) return;

  // 不删圆、不重建圆，直接改半径（高德最稳定方式）
  const center = drawPoints.value[0];
  const r = Math.max(
    AMap.GeometryUtil.distance(new AMap.LngLat(...center), e.lnglat),
    10,
  );

  // 还没创建圆就先创建
  if (!tempShape.value) {
    tempShape.value = new AMap.Circle({
      center: new AMap.LngLat(...center),
      radius: r,
      strokeColor: currentColor.value.borderColor,
      strokeWeight: 2,
      fillColor: currentColor.value.fillColor,
      fillOpacity: 0.3,
      zIndex: 10,
    });
    tempShape.value._isTempDrawingShape = true;
    props.map.add(tempShape.value);
  } else {
    // 只改半径，不重建 → 高德不会吞事件
    tempShape.value.setRadius(r);
  }
};

const handleCircleDragEnd = (e) => {
  // 解锁地图
  if (props.map)
    props.map.setStatus({ dragEnable: true, keyboardEnable: true });

  if (!props.map || !tempShape.value || !isDrawing.value) return;
  props.map.off("mousemove", handleCircleDragMove);
  props.map.off("mouseup", handleCircleDragEnd);
  if (drawPoints.value.length < 1) return;

  const center = drawPoints.value[0];
  const finalRadius = Math.max(
    AMap.GeometryUtil.distance(new AMap.LngLat(...center), e.lnglat),
    10,
  );
  tempShape.value.setRadius(finalRadius);
  drawPoints.value[1] = [e.lnglat.getLng(), e.lnglat.getLat()];
  ElMessage.success(`半径：${finalRadius.toFixed(0)}米`);
};

const resetDrawState = () => {
  // 解锁地图
  if (props.map)
    props.map.setStatus({ dragEnable: true, keyboardEnable: true });

  isDrawing.value = false;
  isDraggingRadius.value = false;
  currentDrawType.value = null;
  dragEndPoint.value = null;
  isHoveringFirstPoint.value = false;
  isPolygonClosed.value = false;

  const existingTooltip = document.querySelector(".draw-tooltip");
  if (existingTooltip) document.body.removeChild(existingTooltip);

  try {
    if (tempLine.value && props.map) {
      props.map.remove(tempLine.value);
      tempLine.value = null;
    }
    if (props.map) {
      const allPolylines = props.map.getAllOverlays("polyline");
      allPolylines.forEach((polyline) => {
        if (polyline._isTempPreviewLine) props.map.remove(polyline);
      });
    }
  } catch (err) {}

  try {
    if (tempShape.value && props.map) {
      props.map.remove(tempShape.value);
      tempShape.value = null;
    }
    if (props.map) {
      const allCircles = props.map.getAllOverlays("circle");
      allCircles.forEach((circle) => {
        if (circle._isTempDrawingShape) props.map.remove(circle);
      });
      const allPolygons = props.map.getAllOverlays("polygon");
      allPolygons.forEach((polygon) => {
        if (polygon._isTempDrawingShape) props.map.remove(polygon);
      });
    }
  } catch (err) {}

  try {
    if (props.map) {
      tempMarkers.value.forEach((item) => {
        const marker = item.marker || item;
        if (marker) props.map.remove(marker);
      });
    }
    tempMarkers.value = [];
    drawPoints.value = [];
    firstMarkerPixel.value = { x: 0, y: 0 };
  } catch (err) {}

  if (props.map) {
    props.map.off("click", handlePolygonDrawClick);
    props.map.off("mousemove", handlePolygonMouseMove);
    props.map.off("click", handleCircleDrawClick);
    props.map.off("mousemove", handleCircleDragMove);
    props.map.off("mouseup", handleCircleDragEnd);
  }
};

const confirmDraw = () => {
  if (!tempShape.value) {
    ElMessage.warning("请先绘制图形");
    return;
  }
  if (currentDrawType.value === "polygon" && drawPoints.value.length < 3) {
    ElMessage.warning("多边形至少3个顶点");
    return;
  }
  if (currentDrawType.value === "circle" && drawPoints.value.length < 2) {
    ElMessage.warning("请确定半径");
    return;
  }

  let apiCoordinates = "",
    zoneCoordinates = [],
    radius = 0;
  if (currentDrawType.value === "polygon") {
    const coords = drawPoints.value.map((p) => [p[1], p[0]]);
    apiCoordinates = JSON.stringify([coords]);
    zoneCoordinates = drawPoints.value.map((p) => ({ lng: p[0], lat: p[1] }));
  } else {
    const center = drawPoints.value[0];
    radius = AMap.GeometryUtil.distance(
      new AMap.LngLat(...center),
      new AMap.LngLat(...drawPoints.value[1]),
    );
    apiCoordinates = JSON.stringify([[[center[1], center[0]]]]);
    zoneCoordinates = [{ lng: center[0], lat: center[1] }];
  }

  const area =
    currentDrawType.value === "polygon"
      ? calculatePolygonArea(zoneCoordinates)
      : calculateCircleArea(radius);

  tempDrawData.value = { apiCoordinates, zoneCoordinates, radius, area };
  formData.value = { name: "", description: "" };
  dialogVisible.value = true;
};

const submitForm = async () => {
  formRef.value.validate(async (valid) => {
    if (!valid || !tempDrawData.value) return;
    try {
      const c = currentColor.value;
      const res = await noflyzoneAdd({
        area: tempDrawData.value.area.toFixed(6),
        borderColor: c.borderColor,
        coordinates: tempDrawData.value.apiCoordinates,
        fillColor: c.fillColor,
        name: formData.value.name,
        description: formData.value.description || "无",
        shape: currentDrawType.value,
        fillOpacity: 0.3,
        borderWeight: 2,
        createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      if (res.code === 200) {
        ElMessage.success("创建成功");
        emit("zone-saved");
      } else ElMessage.error("创建失败");
    } catch (e) {
      console.error(e);
      ElMessage.error("接口异常");
    }
    dialogVisible.value = false;
    resetDrawState();
  });
};

const handleDialogClose = () => {
  formRef.value?.resetFields();
  tempDrawData.value = null;
};

const cancelDraw = () => {
  resetDrawState();
  ElMessage.info("已取消");
};

const calculateDistance = (p1, p2) =>
  AMap.GeometryUtil.distance(
    new AMap.LngLat(p1.lng, p1.lat),
    new AMap.LngLat(p2.lng, p2.lat),
  );
const calculatePolygonArea = (coords) =>
  Math.abs(AMap.GeometryUtil.ringArea(coords.map((p) => [p.lng, p.lat]))) /
  1000000;
const calculateCircleArea = (r) => (Math.PI * r * r) / 1000000;

const bindTooltipEvents = (shape, data) => {
  shape.on("click", (e) => {
    tooltipPosition.value = { x: e.pixel.x, y: e.pixel.y };
    tooltipData.value = data;
    showTooltip.value = true;
  });
  shape.on("mouseout", () => (showTooltip.value = false));
};

const cleanup = () => {
  clearNoFlyZoneOverlays();
  resetDrawState();
};

const regionSelection = (val) => {
  selectedRegion.value = val;
  regionName.value = regionColors[val].name;
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
  font-size: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}
.btn {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.primary {
  background: #e74c3c;
  color: white;
}
.warningArea {
  background: #ffa500;
  color: white;
}
.secondary {
  background: #f5f5f5;
  color: #333;
}
.legend {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  cursor: pointer;
}
.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 8px;
}
.red {
  background: rgba(231, 76, 60, 0.6);
}
.orange {
  background: rgba(255, 165, 0, 0.6);
}
</style>
