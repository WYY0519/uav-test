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
    <div style="display: flex">
      <button
        @click="enterEditMode"
        style="margin-right: 8px"
        class="btn secondary"
        :disabled="isEditing || isDrawing"
      >
        <i class="edit"></i> 编辑{{ regionName }}
      </button>
      <button
        @click="finishEditMode"
        class="btn secondary"
        :disabled="!isEditing || isDrawing"
      >
        <i class="save"></i> 完成编辑
      </button>
    </div>
    <div style="display: flex" v-if="isEditing">
      <button
        @click="cancelEditMode"
        style="margin-right: 8px"
        class="btn secondary"
      >
        <i class="cancel"></i> 取消编辑
      </button>
    </div>
    <button
      @click="toggleEditMode"
      style="margin-right: 8px"
      class="btn secondary"
      :class="{ 'delete-mode-active': isDeleteModeActive }"
    >
      <i class="delete"></i>
      {{ isDeleteModeActive ? "退出删除" : "删除" }}{{ regionName }}
    </button>
    <button @click="clearAllNoFlyZones" class="btn secondary">
      <i class="clear-all"></i> 清除所有{{ regionName }}
    </button>
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
          maxlength="50"
        />
      </el-form-item>
      <el-form-item label="区域描述" prop="description">
        <el-input
          v-model="formData.description"
          :placeholder="`请输入${regionName}描述（可选）`"
          type="textarea"
          :rows="3"
          maxlength="200"
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
  inject,
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  noflyzoneList,
  noflyzoneAdd,
  noflyzoneUpdate,
  noflyzoneDelete,
  limitAreaList,
} from "@/api/noflyzone.js";
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

const emit = defineEmits([
  "update:visible",
  "zone-added",
  "zone-updated",
  "zone-deleted",
  "zones-cleared",
  "zone-click", // 🔥 新增：禁飞区/禁高区被点击时触发，用于绘制航线时的检测
]);

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
const editMarkers = ref([]);
const isDraggingRadius = ref(false);
const dragEndPoint = ref(null);
const showTooltip = ref(false);
const tooltipData = ref({});
const dialogVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 }); // 重命名
const formRef = ref(null);
const formData = ref({
  name: "",
  description: "",
});
const warningZones = ref([]); // 必须先定义
const tempDrawData = ref(null);
// 添加一个标志表示是否已初始化
const isInitialized = ref(false);
const tempLine = ref(null); // 临时预览线段
const isHoveringFirstPoint = ref(false); // 是否悬停在第一个顶点上
const isPolygonClosed = ref(false); // 多边形是否已闭合
const regionName = ref("禁飞区");
const selectedRegion = ref("jf");
const isDeleteModeActive = ref(false);
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

const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    // 新增：检查点是否在边上（浮点精度容错）
    if (isPointOnSegment(point, polygon[i], polygon[j])) {
      return true;
    }

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

const isPointInCircle = (point, circle) => {
  if (!circle.coordinates || circle.coordinates.length === 0) return false;
  const center = circle.coordinates[0];
  const radius = circle.radius || 0;
  if (radius <= 0) return false;
  // 计算两点间的球面距离（米），这里改用更精准的球面距离计算，而非平面距离
  const distance = calculateDistance(point, center);
  // 扩大容错范围的反向逻辑：只要距离≤半径+极小值，就判定在圆内（包括边界）
  return distance <= radius + 1e-3; // 从1e-5调整为1e-3，提升边界判定的灵敏度
};

// 禁飞区检查函数
const isPointInNoFlyZone = (point) => {
  if (!noFlyZones.value || noFlyZones.value.length === 0) {
    return false;
  }

  for (let i = 0; i < noFlyZones.value.length; i++) {
    const zone = noFlyZones.value[i];
    // 只检查禁飞区（regionType === 'jf'）
    if (!zone || !zone.coordinates || zone.regionType !== "jf") {
      continue;
    }

    let isInZone = false;
    if (zone.type === "polygon") {
      if (zone.coordinates && zone.coordinates.length >= 3) {
        isInZone = isPointInPolygon(point, zone.coordinates);
      }
    } else if (zone.type === "circle") {
      if (zone.coordinates && zone.coordinates.length > 0 && zone.radius > 0) {
        isInZone = isPointInCircle(point, zone);
      }
    }

    if (isInZone) {
      return true;
    }
  }

  return false;
};

// 辅助函数：判断两个线段是否相交（跨立实验+快速排斥）
const isSegmentsIntersect = (p1, p2, p3, p4) => {
  const ccw = (A, B, C) =>
    (B.lng - A.lng) * (C.lat - A.lat) - (B.lat - A.lat) * (C.lng - A.lng);

  // 快速排斥实验
  const rect1 = {
    minLng: Math.min(p1.lng, p2.lng),
    maxLng: Math.max(p1.lng, p2.lng),
    minLat: Math.min(p1.lat, p2.lat),
    maxLat: Math.max(p1.lat, p2.lat),
  };
  const rect2 = {
    minLng: Math.min(p3.lng, p4.lng),
    maxLng: Math.max(p3.lng, p4.lng),
    minLat: Math.min(p3.lat, p4.lat),
    maxLat: Math.max(p3.lat, p4.lat),
  };
  if (
    rect1.maxLng < rect2.minLng ||
    rect1.minLng > rect2.maxLng ||
    rect1.maxLat < rect2.minLat ||
    rect1.minLat > rect2.maxLat
  ) {
    return false;
  }

  // 跨立实验
  const ccw1 = ccw(p1, p2, p3);
  const ccw2 = ccw(p1, p2, p4);
  const ccw3 = ccw(p3, p4, p1);
  const ccw4 = ccw(p3, p4, p2);

  return (
    (ccw1 * ccw2 < 0 && ccw3 * ccw4 < 0) ||
    (ccw1 === 0 && isPointOnSegment(p3, p1, p2)) || // p3在p1p2上
    (ccw2 === 0 && isPointOnSegment(p4, p1, p2)) || // p4在p1p2上
    (ccw3 === 0 && isPointOnSegment(p1, p3, p4)) || // p1在p3p4上
    (ccw4 === 0 && isPointOnSegment(p2, p3, p4))
  ); // p2在p3p4上
};

// 辅助函数：判断点是否在线段上
const isPointOnSegment = (p, a, b) => {
  if (Math.min(a.lng, b.lng) > p.lng || Math.max(a.lng, b.lng) < p.lng)
    return false;
  if (Math.min(a.lat, b.lat) > p.lat || Math.max(a.lat, b.lat) < p.lat)
    return false;
  const cross =
    (p.lng - a.lng) * (b.lat - a.lat) - (p.lat - a.lat) * (b.lng - a.lng);
  return Math.abs(cross) < 1e-10; // 浮点精度容错
};

// 辅助函数：计算点（圆心）到球面线段的最短距离（米）
const calculateShortestDistanceFromPointToSegment = (
  point,
  segStart,
  segEnd,
) => {
  // 步骤1：计算三个距离：点到起点、点到终点、起点到终点
  const d1 = calculateDistance(point, segStart);
  const d2 = calculateDistance(point, segEnd);
  const dSeg = calculateDistance(segStart, segEnd);

  // 如果线段长度为0，直接返回点到起点的距离
  if (dSeg < 1e-6) return d1;

  // 步骤2：计算点在segStart-segEnd线段上的投影比例（使用球面余弦定理）
  // 转换为弧度
  const radPointLat = (point.lat * Math.PI) / 180;
  const radPointLng = (point.lng * Math.PI) / 180;
  const radStartLat = (segStart.lat * Math.PI) / 180;
  const radStartLng = (segStart.lng * Math.PI) / 180;
  const radEndLat = (segEnd.lat * Math.PI) / 180;
  const radEndLng = (segEnd.lng * Math.PI) / 180;

  // 计算向量的点积（球面近似）
  const vecStartX =
    Math.cos(radPointLat) * Math.cos(radPointLng) -
    Math.cos(radStartLat) * Math.cos(radStartLng);
  const vecStartY =
    Math.cos(radPointLat) * Math.sin(radPointLng) -
    Math.cos(radStartLat) * Math.sin(radStartLng);
  const vecStartZ = Math.sin(radPointLat) - Math.sin(radStartLat);

  const vecSegX =
    Math.cos(radEndLat) * Math.cos(radEndLng) -
    Math.cos(radStartLat) * Math.cos(radStartLng);
  const vecSegY =
    Math.cos(radEndLat) * Math.sin(radEndLng) -
    Math.cos(radStartLat) * Math.sin(radStartLng);
  const vecSegZ = Math.sin(radEndLat) - Math.sin(radStartLat);

  const dotProduct =
    vecStartX * vecSegX + vecStartY * vecSegY + vecStartZ * vecSegZ;
  const segLengthSq = vecSegX * vecSegX + vecSegY * vecSegY + vecSegZ * vecSegZ;

  // 投影比例t（0≤t≤1表示投影点在线段上）
  let t = dotProduct / segLengthSq;
  t = Math.max(0, Math.min(1, t));

  // 步骤3：计算最短距离
  if (t === 0) {
    return d1; // 投影点在起点
  } else if (t === 1) {
    return d2; // 投影点在终点
  } else {
    // 投影点在线段中间，使用余弦定理计算最短距离
    // d² = d1² + (t*dSeg)² - 2*d1*t*dSeg*cos(theta)
    // 简化：使用球面距离的近似值
    return Math.sqrt(
      d1 * d1 +
        t * dSeg * (t * dSeg) -
        2 * d1 * t * dSeg * Math.cos(dSeg / 6371000),
    );
  }
};
// 优化航线穿越检查：结合采样点+线段相交检测（强化圆形禁飞区逻辑）
const isRouteCrossingNoFlyZone = (points) => {
  if (!points || points.length < 2) return false;

  // 只筛选禁飞区（regionType === 'jf'）
  const noFlyZonesOnly = noFlyZones.value.filter(
    (zone) => zone.regionType === "jf",
  );
  if (noFlyZonesOnly.length === 0) return false;

  // 1. 检查每个航点是否在禁飞区内（包括边上）
  for (const point of points) {
    for (const zone of noFlyZonesOnly) {
      if (!zone || !zone.coordinates) continue;

      let isInZone = false;
      if (zone.type === "polygon" && zone.coordinates.length >= 3) {
        isInZone = isPointInPolygon(point, zone.coordinates);
      } else if (
        zone.type === "circle" &&
        zone.coordinates.length > 0 &&
        zone.radius > 0
      ) {
        isInZone = isPointInCircle(point, zone);
      }

      if (isInZone) {
        console.log(
          `航点 (${point.lng}, ${point.lat}) 在禁飞区 ${zone.name} 内`,
        );
        return true;
      }
    }
  }

  // 2. 检查每段航线是否穿越禁飞区
  for (let i = 0; i < points.length - 1; i++) {
    const startPoint = points[i];
    const endPoint = points[i + 1];

    for (const zone of noFlyZonesOnly) {
      if (!zone || !zone.coordinates) continue;

      // 多边形禁飞区：检查线段与多边形边相交
      if (zone.type === "polygon" && zone.coordinates.length >= 3) {
        const polygon = zone.coordinates;
        const polyLen = polygon.length;
        for (let j = 0; j < polyLen; j++) {
          const polyPoint1 = polygon[j];
          const polyPoint2 = polygon[(j + 1) % polyLen];
          if (
            isSegmentsIntersect(startPoint, endPoint, polyPoint1, polyPoint2)
          ) {
            console.log(`航线段 ${i}->${i + 1} 与禁飞区 ${zone.name} 边相交`);
            return true;
          }
        }
      }

      // 圆形禁飞区：优化后的相交检测逻辑（球面距离+线段投影）
      if (
        zone.type === "circle" &&
        zone.coordinates.length > 0 &&
        zone.radius > 0
      ) {
        const center = zone.coordinates[0];
        const radius = zone.radius;

        // 步骤1：检查端点是否在圆内
        const startInCircle = isPointInCircle(startPoint, zone);
        const endInCircle = isPointInCircle(endPoint, zone);
        if (startInCircle || endInCircle) {
          console.log(
            `航线段 ${i}->${i + 1} 的端点在圆形禁飞区 ${zone.name} 内`,
          );
          return true;
        }

        // 步骤2：计算圆心到线段的最短距离，判断是否穿越圆
        const shortestDistance = calculateShortestDistanceFromPointToSegment(
          center,
          startPoint,
          endPoint,
        );
        if (shortestDistance <= radius + 1e-3) {
          console.log(`航线段 ${i}->${i + 1} 穿越圆形禁飞区 ${zone.name}`);
          return true;
        }
      }
    }
  }

  return false;
};

// 3. 添加专门检查警告区的函数
const isRouteCrossingWarningZone = (points) => {
  if (!points || points.length < 2) return false;

  // 只筛选警告区（regionType === 'jg'）
  const warningZonesOnly = noFlyZones.value.filter(
    (zone) => zone.regionType === "jg",
  );
  if (warningZonesOnly.length === 0) return false;

  // 1. 检查每个航点是否在警告区内（允许，只做提示）
  let hasPointsInWarningZone = false;
  for (const point of points) {
    for (const zone of warningZonesOnly) {
      if (!zone || !zone.coordinates) continue;

      let isInZone = false;
      if (zone.type === "polygon" && zone.coordinates.length >= 3) {
        isInZone = isPointInPolygon(point, zone.coordinates);
      } else if (
        zone.type === "circle" &&
        zone.coordinates.length > 0 &&
        zone.radius > 0
      ) {
        isInZone = isPointInCircle(point, zone);
      }

      if (isInZone) {
        hasPointsInWarningZone = true;
        console.log(
          `航点 (${point.lng}, ${point.lat}) 在警告区 ${zone.name} 内`,
        );
      }
    }
  }

  // 2. 检查每段航线是否穿越警告区（允许，只做提示）
  let hasSegmentsCrossingWarningZone = false;
  for (let i = 0; i < points.length - 1; i++) {
    const startPoint = points[i];
    const endPoint = points[i + 1];

    for (const zone of warningZonesOnly) {
      if (!zone || !zone.coordinates) continue;

      // 多边形警告区
      if (zone.type === "polygon" && zone.coordinates.length >= 3) {
        const polygon = zone.coordinates;
        const polyLen = polygon.length;
        for (let j = 0; j < polyLen; j++) {
          const polyPoint1 = polygon[j];
          const polyPoint2 = polygon[(j + 1) % polyLen];
          if (
            isSegmentsIntersect(startPoint, endPoint, polyPoint1, polyPoint2)
          ) {
            hasSegmentsCrossingWarningZone = true;
            console.log(`航线段 ${i}->${i + 1} 与警告区 ${zone.name} 边相交`);
          }
        }
      }

      // 圆形警告区
      if (
        zone.type === "circle" &&
        zone.coordinates.length > 0 &&
        zone.radius > 0
      ) {
        const center = zone.coordinates[0];
        const radius = zone.radius;

        const dx = endPoint.lng - startPoint.lng;
        const dy = endPoint.lat - startPoint.lat;
        const a = dx * dx + dy * dy;
        const b =
          2 *
          (dx * (startPoint.lng - center.lng) +
            dy * (startPoint.lat - center.lat));
        const c =
          (startPoint.lng - center.lng) ** 2 +
          (startPoint.lat - center.lat) ** 2 -
          radius * radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant >= 0) {
          const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
          const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
          if ((t1 > 0 && t1 < 1) || (t2 > 0 && t2 < 1)) {
            hasSegmentsCrossingWarningZone = true;
            console.log(`航线段 ${i}->${i + 1} 与圆形警告区 ${zone.name} 相交`);
          }
        }
      }
    }
  }

  return hasPointsInWarningZone || hasSegmentsCrossingWarningZone;
};
// 添加一个重新初始化的方法，供父组件调用
const reinitialize = () => {
  if (props.map) {
    initialize();
  }
};

// 在 NoFlyZoneManager.vue 中添加刷新函数
const refreshNoFlyZones = async () => {
  try {
    // 清除现有覆盖物
    if (noFlyZonesLayer.value) {
      noFlyZonesLayer.value.clearLayers();
    }

    // 从地图中移除所有禁飞区覆盖物
    if (props.map) {
      const overlays = props.map.getAllOverlays();
      overlays.forEach((overlay) => {
        if (overlay._isNoFlyZone) {
          props.map.remove(overlay);
        }
      });
    }

    // 重新加载
    await noFlyZonesList();
    ElMessage.success("禁飞区已刷新");
  } catch (error) {
    console.error("刷新禁飞区失败:", error);
    ElMessage.error("刷新失败");
  }
};
// 🔥 新增：判断点是否在警告区（禁高区）
const isPointInWarningZone = (point) => {
  if (!noFlyZones.value || noFlyZones.value.length === 0) return false;

  for (let i = 0; i < noFlyZones.value.length; i++) {
    const zone = noFlyZones.value[i];
    if (!zone || zone.regionType !== "jg") continue; // 只检查警告区

    let inside = false;
    if (zone.type === "polygon") {
      inside = isPointInPolygon(point, zone.coordinates);
    } else if (zone.type === "circle") {
      inside = isPointInCircle(point, zone);
    }
    if (inside) return true;
  }
  return false;
};
// 现在再定义 exposeMethods，这时所有函数都已经声明了
const exposeMethods = {
  isPointInNoFlyZone,
  isRouteCrossingNoFlyZone,
  isRouteCrossingWarningZone,
  isPointInWarningZone, // 👈 加上这个
  getNoFlyZones: () => noFlyZones.value,
  reinitialize,
  refreshNoFlyZones,
  isZonesLoaded: () => zonesLoaded.value, // 新增：暴露加载状态
};

defineExpose(exposeMethods);

// 初始化函数
const initialize = async () => {
  if (!props.map) {
    console.warn("地图实例未传入，等待初始化...");
    return;
  }

  try {
    initNoFlyZones();
    await noFlyZonesList();
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
      // 延迟初始化，确保地图完全加载
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

// 初始化
onMounted(() => {
  // 检查地图实例是否已传入
  console.log(props, "props.map");
  initNoFlyZones();
  noFlyZonesList();
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

    noFlyZonesLayer.value = new AMap.LayerGroup();
    props.map.add(noFlyZonesLayer.value);
  } catch (error) {
    console.error("初始化禁飞区图层失败:", error);
    ElMessage.error("禁飞区图层初始化失败");
  }
};
// 新增：禁飞区数据加载状态
const zonesLoaded = ref(false);
// 获取禁飞区列表 添加加载状态标记
const noFlyZonesList = async () => {
  if (!props.map || !noFlyZonesLayer.value) {
    console.warn("地图或禁飞区图层未初始化，无法加载禁飞区列表");
    return;
  }
  try {
    const data = {
      days: "",
      keyword: "",
      pageNum: "1",
      pageSize: "150",
      id: "",
    };
    const data2 = {
      name: "",
      address: "",
      pageNum: 1,
      pageSize: 150,
    };
    // const res = await noflyzoneList(data);
    const res = await limitAreaList(data2);
    if (res.code === 200) {
      noFlyZones.value = [];
      if (noFlyZonesLayer.value) noFlyZonesLayer.value.clearLayers();

      res.data.list.forEach((zone) => {
        addZoneToMap(zone);
      });
      emit("zones-loaded", noFlyZones.value);
      // 新增：标记数据加载完成
      zonesLoaded.value = true;

      console.log("禁飞区加载完成，总数:", noFlyZones.value.length);
      // 禁飞区已加载到地图，保持当前地图视野不变
    }
  } catch (error) {
    console.error("禁飞区列表请求失败:", error);
    ElMessage.error("加载禁飞区失败");
    zonesLoaded.value = false;
  }
};

// 调整地图视野以包含所有禁飞区
const fitMapToZones = () => {
  if (!props.map || noFlyZones.value.length === 0) return;

  // 🔥 收集所有有效坐标
  const validCoords = [];

  noFlyZones.value.forEach((zone) => {
    if (zone.coordinates && zone.coordinates.length > 0) {
      if (zone.type === "circle") {
        // 圆形：添加中心点
        const center = zone.coordinates[0];
        if (center && !isNaN(center.lng) && !isNaN(center.lat)) {
          validCoords.push([center.lng, center.lat]);
        }
      } else {
        // 多边形：添加所有顶点
        zone.coordinates.forEach((coord) => {
          if (coord && !isNaN(coord.lng) && !isNaN(coord.lat)) {
            validCoords.push([coord.lng, coord.lat]);
          }
        });
      }
    }
  });

  // 🔥 设置地图视野
  if (validCoords.length > 0) {
    try {
      // 使用 setFitView 替代 setBounds，更安全
      props.map.setFitView();
      console.log(
        "地图视野已调整以包含所有禁飞区，包含",
        validCoords.length,
        "个坐标点",
      );
    } catch (e) {
      console.error("设置地图视野失败:", e);
      // 备用方案：设置第一个有效坐标为中心
      props.map.setCenter(validCoords[0]);
      props.map.setZoom(10);
    }
  } else {
    console.warn("没有有效的禁飞区坐标点，无法调整视野");
  }
};

// 添加禁飞区到地图
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
    // 检查 coordinates 是否存在
    if (!zone.coordinates) {
      console.error("禁飞区坐标数据为空:", zone);
      return;
    }

    // 🔥 使用与 limitArea/index.vue 相同的解析逻辑
    let coordinatesToParse = zone.coordinates;

    // 如果 coordinates 是字符串，先解析为数组
    if (typeof zone.coordinates === "string") {
      try {
        console.log("检测到字符串格式的 coordinates，正在解析...");
        coordinatesToParse = JSON.parse(zone.coordinates);
        console.log("解析后的 coordinates:", coordinatesToParse);
      } catch (e) {
        console.log("JSON 解析失败，尝试字符串格式:", zone.coordinates);
        // 处理字符串格式: "lng,lat;lng,lat;..."
        if (zone.shape === "circle") {
          const parts = zone.coordinates.split(",");
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const radiusFromCoords =
              parts.length >= 3 ? parseFloat(parts[2]) : 0;

            coordinates = [lng, lat];
            zoneCoordinates = [{ lng, lat }];

            if (radiusFromCoords > 0) {
              radius = radiusFromCoords;
            } else if (zone.area > 0) {
              radius = Math.sqrt((zone.area * 1000000) / Math.PI);
            }
            console.log("字符串格式圆形解析成功:", { lng, lat, radius });
          }
        } else {
          const points = zone.coordinates.split(";");
          const pointArray = points.map((pointStr) => {
            const [lng, lat] = pointStr.split(",").map(Number);
            return [lng, lat];
          });
          coordinates = pointArray;
          zoneCoordinates = pointArray.map(([lng, lat]) => ({ lng, lat }));
          console.log("字符串格式多边形解析成功:", {
            pointCount: pointArray.length,
          });
        }
        // 跳过下面的解析
        coordinatesToParse = null;
      }
    }

    // 解析点集的辅助函数：将任意格式的点转换为 {lng, lat}
    const parsePoint = (point) => {
      if (!point) return null;
      // 如果是对象且包含 lng/lat
      if (
        typeof point === "object" &&
        point.lng !== undefined &&
        point.lat !== undefined
      ) {
        const lng = Number(point.lng);
        const lat = Number(point.lat);
        if (
          !isNaN(lng) &&
          !isNaN(lat) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          return { lng, lat };
        }
        return null;
      }
      // 如果是数组 [val0, val1]
      if (Array.isArray(point) && point.length >= 2) {
        const val0 = Number(point[0]);
        const val1 = Number(point[1]);
        if (isNaN(val0) || isNaN(val1)) return null;

        let lat, lng;
        // 判断哪个是纬度（纬度范围 -90~90）
        if (Math.abs(val0) <= 90) {
          if (Math.abs(val1) <= 180) {
            lat = val0;
            lng = val1;
          } else {
            lat = val1;
            lng = val0;
          }
        } else if (Math.abs(val1) <= 90) {
          lat = val1;
          lng = val0;
        } else {
          lng = val0;
          lat = val1;
        }

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lng, lat };
        }
        return null;
      }
      return null;
    };

    // 只有在 coordinatesToParse 不为 null 时才继续解析
    if (coordinatesToParse) {
      let validPoints = [];

      // 处理三层数组：[[[lat,lng], [lat,lng], ...]]
      if (
        Array.isArray(coordinatesToParse) &&
        coordinatesToParse.length > 0 &&
        Array.isArray(coordinatesToParse[0])
      ) {
        const firstChild = coordinatesToParse[0];
        if (Array.isArray(firstChild) && firstChild.length > 0) {
          if (Array.isArray(firstChild[0])) {
            // 三层结构：[[[lat,lng], ...]]
            for (const ring of coordinatesToParse) {
              for (const point of ring) {
                const parsed = parsePoint(point);
                if (parsed) validPoints.push(parsed);
              }
            }
          } else {
            // 两层结构：[[lat,lng], [lat,lng], ...]
            for (const point of coordinatesToParse) {
              const parsed = parsePoint(point);
              if (parsed) validPoints.push(parsed);
            }
          }
        } else if (
          typeof firstChild === "object" &&
          firstChild.lng !== undefined
        ) {
          // 对象数组 [{lng, lat}, ...]
          for (const point of coordinatesToParse) {
            const parsed = parsePoint(point);
            if (parsed) validPoints.push(parsed);
          }
        }
      }
      // 处理对象数组（已解析的坐标数组）
      else if (
        Array.isArray(coordinatesToParse) &&
        coordinatesToParse.length > 0 &&
        typeof coordinatesToParse[0] === "object"
      ) {
        for (const point of coordinatesToParse) {
          const parsed = parsePoint(point);
          if (parsed) validPoints.push(parsed);
        }
      }

      // 根据形状确定坐标
      if (zone.shape === "circle") {
        zoneCoordinates = validPoints.length > 0 ? [validPoints[0]] : [];
        if (zoneCoordinates.length === 0) {
          console.error("圆形禁飞区解析失败：无有效圆心坐标");
          return;
        }
        coordinates = [zoneCoordinates[0].lng, zoneCoordinates[0].lat];
        if (zone.radius && !isNaN(zone.radius) && zone.radius > 0) {
          radius = Number(zone.radius);
        } else if (zone.area > 0) {
          radius = Math.sqrt((zone.area * 1000000) / Math.PI);
        } else {
          radius = 100;
        }
        console.log(
          "圆形禁飞区解析完成：圆心",
          zoneCoordinates[0],
          "半径",
          radius,
          "米",
        );
      } else {
        // 多边形：至少需要3个有效点
        if (validPoints.length >= 3) {
          zoneCoordinates = validPoints;
          coordinates = validPoints.map((p) => [p.lng, p.lat]);
          console.log("多边形禁飞区解析完成：", validPoints.length, "个顶点");
        } else {
          console.error(
            `多边形禁飞区 ${zone.id} 解析失败，有效点数不足3个:`,
            validPoints.length,
          );
          return;
        }
      }
    }
  } catch (e) {
    console.error("坐标解析失败", e, zone);
    return;
  }

  // 🔥 新增：验证坐标是否有效（过滤掉包含NaN的坐标）
  const validZoneCoordinates = zoneCoordinates.filter((coord) => {
    const isValid = coord && !isNaN(coord.lng) && !isNaN(coord.lat);
    if (!isValid) {
      console.warn("过滤掉无效坐标:", coord);
    }
    return isValid;
  });

  if (validZoneCoordinates.length === 0) {
    console.error("禁飞区没有有效坐标，跳过创建:", zone.name);
    return;
  }

  // 🔥 更新 zoneCoordinates 为过滤后的有效坐标
  zoneCoordinates = validZoneCoordinates;

  // 如果是多边形，也过滤 coordinates 数组
  if (zone.shape !== "circle" && Array.isArray(coordinates)) {
    coordinates = coordinates.filter((coord) => {
      return Array.isArray(coord) && !isNaN(coord[0]) && !isNaN(coord[1]);
    });
    if (coordinates.length === 0) {
      console.error("多边形禁飞区没有有效坐标，跳过创建:", zone.name);
      return;
    }
  }

  // 根据区域颜色设置样式
  const isWarningZone = zone.fillColor === "#ffa500";
  const borderColor =
    zone.borderColor || (isWarningZone ? "#ffa500" : "#e74c3c");
  const fillColor = zone.fillColor || (isWarningZone ? "#ffa500" : "#e74c3c");

  console.log("准备创建禁飞区形状:", {
    shape: zone.shape,
    coordinates,
    radius,
    zoneName: zone.name,
    validCoordCount: zoneCoordinates.length,
  });

  // 创建形状 - 使用与 limitArea/index.vue 相同的创建方式
  let shape;
  const zIndex = 300; // 🔥 修改：设置更高的层级（300），确保禁飞区显示在航线（200）之上
  if (zone.shape === "circle" && radius > 0 && zoneCoordinates.length > 0) {
    const center = zoneCoordinates[0];
    shape = new AMap.Circle({
      center: [center.lng, center.lat],
      radius: radius,
      strokeColor: borderColor,
      strokeWeight: zone.borderWeight || 3,
      strokeOpacity: 1,
      fillColor: fillColor,
      fillOpacity: 0.6, // 🔥 修改：提高透明度到0.6，使禁飞区更明显可见
      zIndex: zIndex,
    });
    console.log("创建圆形禁飞区成功:", {
      center: [center.lng, center.lat],
      radius,
      zIndex,
    });
  } else if (zoneCoordinates.length >= 3) {
    // 多边形：至少需要3个点
    const path = zoneCoordinates.map((p) => [p.lng, p.lat]);
    shape = new AMap.Polygon({
      path: path,
      strokeColor: borderColor,
      strokeWeight: zone.borderWeight || 3,
      strokeOpacity: 1,
      fillColor: fillColor,
      fillOpacity: 0.6, // 🔥 修改：提高透明度到0.6，使禁飞区更明显可见
      zIndex: zIndex,
    });
    console.log("创建多边形禁飞区成功:", { path: path, zIndex });
  } else {
    console.error("创建禁飞区失败：坐标点不足", {
      shape: zone.shape,
      coordCount: zoneCoordinates.length,
    });
    return;
  }

  // 【关键修改】补充 updateTime、limitAddress、companyId 三个字段
  const zoneData = {
    id: zone.id,
    name: zone.name || `${isWarningZone ? "警告区" : "禁飞区"}${zone.id}`,
    type: zone.shape || "polygon",
    createTime: zone.createTime || new Date().toISOString(),
    description: zone.description || "无",
    coordinates: zoneCoordinates,
    borderColor: borderColor,
    borderWeight: zone.borderWeight || 2,
    fillColor: fillColor,
    fillOpacity: 0.6, // 🔥 修改：统一设置为0.6，与创建时保持一致
    radius: radius,
    area: zone.area || 0,
    regionType: isWarningZone ? "jg" : "jf", // 添加区域类型标识
    updateTime: zone.updateTime, // 新增：从后端原始数据提取
    limitAddress: zone.limitAddress, // 新增：从后端原始数据提取
    companyId: zone.companyId, // 新增：从后端原始数据提取
  };

  bindTooltipEvents(shape, zoneData);
  shape._id = zone.id;
  shape._originalData = zoneData;
  shape._isNoFlyZone = true; // 添加标记，便于识别

  console.log("添加禁飞区到地图:", zone.name);
  // 高德地图的 LayerGroup 不支持 addLayer 方法，直接添加到地图
  // noFlyZonesLayer.value.addLayer(shape);  // 这个方法不存在
  props.map.add(shape);
  noFlyZones.value.push(zoneData);
  console.log("禁飞区总数:", noFlyZones.value.length);

  // 验证是否添加成功
  const allOverlays = props.map.getAllOverlays();
  console.log("地图当前覆盖物总数:", allOverlays.length);
};
// 新增鼠标移动事件处理函数，实时绘制预览线段
const handlePolygonMouseMove = (e) => {
  if (!e || !e.lnglat || !props.map) return; // 🔥 加判断
  if (
    !props.map ||
    !noFlyZonesLayer.value ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    drawPoints.value.length === 0 ||
    isPolygonClosed.value
  ) {
    if (tempLine.value) {
      noFlyZonesLayer.value.removeLayer(tempLine.value);
      tempLine.value = null;
    }
    isHoveringFirstPoint.value = false;
    return;
  }

  const currentMousePoint = e.lnglat;
  const lastPoint = drawPoints.value[drawPoints.value.length - 1];

  // ... 其余代码不变
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
  isPolygonClosed.value = false; // 初始化闭合状态为false
  ElMessage.info("点击地图添加多边形顶点，点击第一个顶点完成闭合");
  props.map.on("click", handlePolygonDrawClick);
  // 添加鼠标移动事件监听，用于实时绘制预览线段
  props.map.on("mousemove", handlePolygonMouseMove);
};

// 修改 handlePolygonDrawClick 函数，处理闭合逻辑
const handlePolygonDrawClick = (e) => {
  if (
    !props.map ||
    !noFlyZonesLayer.value ||
    !isDrawing.value ||
    currentDrawType.value !== "polygon" ||
    isPolygonClosed.value // 已闭合则不再响应点击
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
    tempShape.value = new AMap.Polygon(closedPoints, {
      strokeColor: currentColorValue.borderColor,
      strokeWeight: 2,
      fillColor: currentColorValue.fillColor,
      fillOpacity: 0.3,
    });
    noFlyZonesLayer.value.addLayer(tempShape.value);

    // 标记为已闭合
    isPolygonClosed.value = true;
    ElMessage.success("多边形已闭合，点击确认完成绘制");
    isHoveringFirstPoint.value = false;

    // 移除鼠标移动监听，避免闭合后仍显示虚线
    props.map.off("mousemove", handlePolygonMouseMove);
    return;
  }

  // 情况2：添加新顶点（区分第一个顶点和其他顶点颜色）
  const point = e.lnglat;
  drawPoints.value.push(point);

  // 顶点图标颜色区分：第一个顶点蓝色，其他顶点红色
  const isFirstPoint = drawPoints.value.length === 1;
  const currentColorValue = currentColor.value;
  const iconColor = isFirstPoint ? "#3498db" : currentColorValue.borderColor;
  const markerIcon = new AMap.Icon({
    image: `data:image/svg+xml;base64,${btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${iconColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`,
    )}`,
    size: new AMap.Size(12, 12),
    imageOffset: new AMap.Pixel(-6, -6),
  });

  const marker = new AMap.Marker({
    position: point,
    icon: markerIcon,
  });
  noFlyZonesLayer.value.addLayer(marker);
  tempMarkers.value.push({ marker, isFirstPoint }); // 记录是否为第一个顶点

  // 更新多边形（至少2个顶点时）
  if (tempShape.value) {
    noFlyZonesLayer.value.removeLayer(tempShape.value);
  }
  if (drawPoints.value.length >= 2) {
    const currentColorValue = currentColor.value;
    tempShape.value = new AMap.Polygon(drawPoints.value, {
      strokeColor: currentColorValue.borderColor,
      strokeWeight: 2,
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
  props.map.on("click", handleCircleDrawClick);
};

const handleCircleDrawClick = (e) => {
  if (!isDrawing.value || currentDrawType.value !== "circle") return;

  const point = e.lnglat;
  if (drawPoints.value.length === 0) {
    drawPoints.value.push(point);
    const currentRegionColors = currentColor.value; // 使用 currentColor 计算属性
    const centerMarker = new AMap.Marker({
      position: point,
      icon: new AMap.Icon({
        image: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${currentRegionColors.fillColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`,
        )}`,
        size: new AMap.Size(10, 10),
        imageOffset: new AMap.Pixel(-5, -5),
      }),
    });
    noFlyZonesLayer.value.addLayer(centerMarker);
    tempMarkers.value.push(centerMarker);
    isDraggingRadius.value = true;
    props.map.on("mousemove", handleCircleDragMove);
    props.map.on("mouseup", handleCircleDragEnd);
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

  tempShape.value = new AMap.Circle(center, radius, {
    strokeColor: currentRegionColors.borderColor,
    strokeWeight: 2,
    fillColor: currentRegionColors.fillColor,
    fillOpacity: 0.3,
  });
  noFlyZonesLayer.value.addLayer(tempShape.value);
};

const handleCircleDragEnd = () => {
  if (!isDraggingRadius.value || !dragEndPoint.value) return;

  props.map.off("mousemove", handleCircleDragMove);
  props.map.off("mouseup", handleCircleDragEnd);
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
          await noFlyZonesList();
          emit("zone-added", {
            type: currentDrawType.value,
            data: tempDrawData.value,
          });
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
  isPolygonClosed.value = false; // 重置闭合状态

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

  // 移除所有事件监听（增加判空保护）
  if (props.map) {
    props.map.off("click", handlePolygonDrawClick);
    props.map.off("click", handleCircleDrawClick);
    props.map.off("mousemove", handleCircleDragMove);
    props.map.off("mouseup", handleCircleDragEnd);
    props.map.off("mousemove", handlePolygonMouseMove);
  }
};

const cancelDraw = () => {
  resetDrawState();
  clearEditMarkers();
  ElMessage.info("已取消绘制");
};

// 清除所有标记点（包括绘制中的临时标记和编辑标记）
const clearAllMarkers = () => {
  // 清除绘制中的临时标记 overlay._isPermanent
  tempMarkers.value.forEach((marker) => {
    if (noFlyZonesLayer.value) {
      noFlyZonesLayer.value.removeLayer(marker);
    }
    props.map.remove(marker);
  });
  tempMarkers.value = [];

  // 清除所有地图上的标记点
  const allOverlays = props.map.getAllOverlays();
  allOverlays.forEach((overlay) => {
    if (overlay instanceof AMap.Marker) {
      // 排除可能需要保留的其他标记
      if (!overlay._isPermanent) {
        props.map.remove(overlay);
      }
    }
  });
};
const enterEditMode = async () => {
  if (isDrawing.value) {
    ElMessage.warning("请先完成当前绘制");
    return;
  }

  // 只获取当前选中类型的禁飞区
  const currentTypeZones = noFlyZones.value.filter(
    (zone) => zone.regionType === selectedRegion.value,
  );

  if (currentTypeZones.length === 0) {
    ElMessage.warning(`暂无${regionName.value}可编辑`);
    return;
  }

  // 先清除所有现有标记点
  clearAllMarkers();
  clearEditMarkers();

  isEditing.value = true;

  ElMessage.info(
    `进入${regionName.value}编辑模式：拖动顶点编辑多边形，拖动中心点和边缘点编辑圆形`,
  );

  // 只获取当前选中类型的禁飞区形状
  const allShapes = props.map
    .getAllOverlays()
    .filter((overlay) => overlay._id)
    .filter((shape) => {
      // 只处理多边形和圆形
      const isValidShape =
        shape instanceof AMap.Polygon || shape instanceof AMap.Circle;
      if (!isValidShape) return false;

      // 只处理当前选中类型的区域
      const zoneData =
        shape._zoneData || noFlyZones.value.find((z) => z.id === shape._id);
      return zoneData && zoneData.regionType === selectedRegion.value;
    });

  if (allShapes.length === 0) {
    ElMessage.warning(`未找到可编辑的${regionName.value}`);
    isEditing.value = false;
    return;
  }

  // 从地图上移除原始形状和所有标记点
  allShapes.forEach((shape) => {
    const zoneData =
      shape._zoneData || noFlyZones.value.find((z) => z.id === shape._id);
    if (zoneData) {
      // 保存原始形状数据
      shape._originalZoneData = { ...zoneData };

      // 移除所有相关的标记点
      removeRelatedMarkers(shape._id);

      // 完全移除原始形状
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(shape);
      }
      props.map.remove(shape);

      // 记录原始坐标
      if (shape instanceof AMap.Polygon) {
        const points = shape.getPath() || [];
        shape._originalPoints = points.map((p) => ({ lng: p.lng, lat: p.lat }));
      } else if (shape instanceof AMap.Circle) {
        shape._originalCenter = shape.getCenter();
        shape._originalRadius = shape.getRadius();
      }

      // 创建编辑形状（替换原始形状）
      createEditShape(shape);
    }
  });
};

// 根据禁飞区ID移除相关标记点
const removeRelatedMarkers = (id) => {
  const allOverlays = props.map.getAllOverlays();
  allOverlays.forEach((overlay) => {
    if (overlay instanceof AMap.Marker && overlay._id === id) {
      props.map.remove(overlay);
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(overlay);
      }
    }
  });
};

// 创建编辑形状（替换原始形状）
// 创建编辑形状（替换原始形状）
const createEditShape = (originalShape) => {
  const zoneData = originalShape._originalZoneData;
  if (!zoneData) return;

  let editShape = null;
  let points = [];

  if (originalShape instanceof AMap.Polygon) {
    // 使用保存的原始点
    points = originalShape._originalPoints || [];
    const latLngs = points.map((p) => [p.lng, p.lat]);

    // 使用原始形状的颜色
    editShape = new AMap.Polygon(latLngs, {
      strokeColor: zoneData.borderColor || "#e74c3c",
      strokeWeight: 3,
      fillColor: zoneData.fillColor || "#e74c3c",
      fillOpacity: 0.4,
      strokeStyle: "dashed",
    });

    // 添加顶点标记 - 传递正确的颜色参数
    points.forEach((point, index) => {
      const marker = addPolygonVertexMarker(
        point,
        index,
        editShape,
        originalShape,
        // 移除颜色参数
      );
      editMarkers.value.push({
        marker,
        editShape,
        originalShape,
        index,
        type: "polygon_vertex",
        id: originalShape._id,
      });
    });
  } else if (originalShape instanceof AMap.Circle) {
    const center = originalShape._originalCenter || originalShape.getCenter();
    const radius = originalShape._originalRadius || originalShape.getRadius();

    // 使用原始形状的颜色
    editShape = new AMap.Circle(center, radius, {
      strokeColor: zoneData.borderColor || "#e74c3c",
      strokeWeight: 3,
      fillColor: zoneData.fillColor || "#e74c3c",
      fillOpacity: 0.4,
      strokeStyle: "dashed",
    });
    // 添加圆形控制标记
    const centerMarker = addCircleCenterMarker(
      center,
      editShape,
      originalShape,
      zoneData.fillColor || "#e74c3c",
    );
    const radiusMarker = addCircleRadiusMarker(
      center,
      radius,
      editShape,
      originalShape,
      zoneData.borderColor || "#e74c3c",
    );
    editMarkers.value.push({
      marker: centerMarker,
      editShape,
      originalShape,
      type: "circle_center",
      id: originalShape._id,
    });
    editMarkers.value.push({
      marker: radiusMarker,
      editShape,
      originalShape,
      type: "circle_radius",
      id: originalShape._id,
    });
  }

  if (editShape) {
    // 保存必要的数据（已包含 updateTime/limitAddress/companyId）
    editShape._id = originalShape._id;
    editShape._zoneData = { ...zoneData }; // 【确保深拷贝，保留所有字段】
    editShape._isEditShape = true;
    editShape._originalShape = originalShape; // 保存对原始形状的引用
    editShape._isModified = false;

    // 先移除可能存在的同名编辑形状
    const existingOverlays = props.map.getAllOverlays();
    existingOverlays.forEach((overlay) => {
      if (overlay._isEditShape && overlay._id === editShape._id) {
        props.map.remove(overlay);
        if (noFlyZonesLayer.value) {
          noFlyZonesLayer.value.removeLayer(overlay);
        }
      }
    });

    // 添加到地图，后添加的会显示在上面
    if (noFlyZonesLayer.value) {
      noFlyZonesLayer.value.addLayer(editShape);
    }
    props.map.add(editShape);

    // 保存对编辑形状的引用
    originalShape._editShape = editShape;
  }
};

// 添加圆形中心点标记
const addCircleCenterMarker = (center, editShape, originalShape) => {
  // 从原始形状或编辑形状获取区域数据
  const zoneData =
    originalShape._originalZoneData ||
    originalShape._zoneData ||
    editShape._zoneData;
  const markerColor = zoneData?.fillColor === "#ffa500" ? "#2c3c54" : "#2c3c54"; // 中心点可以用固定色，或 zoneData?.borderColor

  // 创建SVG图标，颜色动态设置
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${markerColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`;

  const marker = new AMap.Marker({
    position: center,
    icon: new AMap.Icon({
      image: `data:image/svg+xml;base64,${btoa(svgString)}`,
      size: new AMap.Size(16, 16),
      imageOffset: new AMap.Pixel(-8, -8),
    }),
    draggable: true,
  });

  // 绑定禁飞区ID（关键：用ID强关联）
  marker._isEditMarker = true;
  marker._id = originalShape._id;
  marker._editShape = editShape; // 直接绑定编辑形状
  marker.on("dragstart", () => {
    marker._isDragging = true;

    // 【彻底清理】找到当前禁飞区的所有半径标记
    const radiusMarkerItems = editMarkers.value.filter(
      (item) => item.id === marker._id && item.type === "circle_radius",
    );

    radiusMarkerItems.forEach((item) => {
      // 从地图移除标记
      if (props.map) {
        props.map.remove(item.marker);
      }
      // 从图层组移除标记（如果存在）
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(item.marker);
      }
      // 销毁标记实例（可选，确保无残留）
      item.marker = null;
    });

    // 从编辑标记数组中删除所有半径标记
    editMarkers.value = editMarkers.value.filter(
      (item) => !(item.id === marker._id && item.type === "circle_radius"),
    );
  });
  marker.on("dragging", (e) => {
    if (!marker._isDragging) return;

    const newCenter = e.lnglat;
    const currentRadius = marker._editShape.getRadius();

    // 仅更新圆形中心位置，不处理任何标记
    marker._editShape.setCenter(newCenter);
    marker.setPosition(newCenter);

    marker._editShape._isModified = true;
  });
  marker.on("dragend", (e) => {
    marker._isDragging = false;
    const newCenter = e.lnglat;
    const currentRadius = marker._editShape.getRadius();

    // 更新圆形最终位置
    marker._editShape.setCenter(newCenter);
    marker.setPosition(newCenter);

    // 【重新创建】在新位置添加半径标记（确保无重复）
    const newRadiusPoint = getRadiusPoint(newCenter, currentRadius);

    // 再次检查并清理可能的残留标记（双重保险）
    editMarkers.value = editMarkers.value.filter(
      (item) => !(item.id === marker._id && item.type === "circle_radius"),
    );

    // 创建新的半径标记
    const newRadiusMarker = addCircleRadiusMarker(
      newCenter,
      currentRadius,
      marker._editShape,
      originalShape, // 注意：这里需要确保 originalShape 能正确传递
    );

    // 将新标记存入数组
    editMarkers.value.push({
      marker: newRadiusMarker,
      editShape: marker._editShape,
      originalShape,
      type: "circle_radius",
      id: marker._id, // 使用 marker 上的 _id 确保一致性
    });

    marker._editShape._isModified = true;
    ElMessage.success(
      `圆形中心已移动到: ${newCenter.lng.toFixed(6)}, ${newCenter.lat.toFixed(
        6,
      )}`,
    );
  });
  props.map.add(marker);
  return marker;
};

// 添加圆形半径点标记
const addCircleRadiusMarker = (center, radius, editShape, originalShape) => {
  const radiusPoint = getRadiusPoint(center, radius);

  // 从原始形状或编辑形状获取区域数据
  const zoneData =
    originalShape._originalZoneData ||
    originalShape._zoneData ||
    editShape._zoneData;
  const markerColor =
    zoneData?.borderColor === "#ffa500" ? "#ffa500" : "#e74c3c";

  // 创建SVG图标，颜色动态设置
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${markerColor}" d="M8 2C4.69 1.99 2 8.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`;

  const marker = new AMap.Marker({
    position: radiusPoint,
    icon: new AMap.Icon({
      image: `data:image/svg+xml;base64,${btoa(svgString)}`,
      size: new AMap.Size(14, 14),
      imageOffset: new AMap.Pixel(-7, -7),
    }),
    draggable: true,
    zIndex: 1000, // 固定高层级
  });

  // 给半径标记也绑定禁飞区ID（与圆心标记一致）
  marker._isEditMarker = true;
  marker._id = originalShape._id;
  marker._editShape = editShape;

  marker.on("dragstart", () => {
    marker._isDragging = true;
  });

  marker.on("dragging", (e) => {
    if (marker._isDragging) {
      const newRadiusPoint = e.lnglat;
      const center = editShape.getCenter();
      const newRadius = calculateDistance(center, newRadiusPoint);

      // 实时更新半径（保持最小半径限制）
      if (newRadius >= 10) {
        editShape.setRadius(newRadius);
        marker.setPosition(newRadiusPoint);
        editShape._isModified = true;
      }
    }
  });

  marker.on("dragend", (e) => {
    marker._isDragging = false;
    const newRadiusPoint = e.lnglat;
    const center = editShape.getCenter();
    const newRadius = calculateDistance(center, newRadiusPoint);

    if (newRadius < 10) {
      ElMessage.warning("圆形半径不能小于10米");
      // 恢复原来的半径点位置
      const originalRadiusPoint = getRadiusPoint(center, editShape.getRadius());
      marker.setPosition(originalRadiusPoint);
      return;
    }

    editShape.setRadius(newRadius);
    marker.setPosition(newRadiusPoint);
    editShape._isModified = true;

    ElMessage.success(
      `圆形半径已调整为: ${(newRadius / 1000).toFixed(2)} 公里`,
    );
  });

  props.map.add(marker);
  return marker;
};

// 添加多边形顶点标记
const addPolygonVertexMarker = (point, index, editShape, originalShape) => {
  // 直接从原始形状或编辑形状获取区域数据
  const zoneData =
    originalShape._originalZoneData ||
    originalShape._zoneData ||
    editShape._zoneData;

  // 根据区域类型决定标记颜色
  const markerColor =
    zoneData?.borderColor === "#ffa500" ? "#ffa500" : "#e74c3c";

  // 创建SVG图标，颜色动态设置
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${markerColor}" d="M8 2C4.69 1.99 2 4.69 2 8c0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.31-2.69-6-6-6z"/></svg>`;

  const marker = new AMap.Marker({
    position: [point.lng, point.lat],
    icon: new AMap.Icon({
      image: `data:image/svg+xml;base64,${btoa(svgString)}`,
      size: new AMap.Size(14, 14),
      imageOffset: new AMap.Pixel(-7, -7),
    }),
    draggable: true,
  });

  // 添加标识，便于清理
  marker._isEditMarker = true;
  marker._id = originalShape._id;

  marker.on("dragging", (e) => {
    const newPoint = e.lnglat;
    const currentPoints = editShape.getPath() || [];
    currentPoints[index] = newPoint;
    editShape.setPath(currentPoints);
    marker.setPosition(newPoint);

    // 标记为已修改
    editShape._isModified = true;
  });

  props.map.add(marker);
  return marker;
};

// 完成编辑
const finishEditMode = async () => {
  if (!isEditing.value) return;

  // 收集所有被修改的编辑形状
  const modifiedZones = [];
  const uniqueEditShapes = new Set();

  // 先确保所有编辑形状的标记位置正确更新
  editMarkers.value.forEach((item) => {
    if (item.editShape && item.editShape._isModified) {
      // 如果是圆形，确保半径标记位置正确
      if (item.editShape instanceof T.Circle) {
        const radiusMarker = editMarkers.value.find(
          (m) => m.id === item.id && m.type === "circle_radius",
        );
        if (radiusMarker && radiusMarker.marker) {
          const center = item.editShape.getCenter();
          const radius = item.editShape.getRadius();
          const correctRadiusPoint = getRadiusPoint(center, radius);
          radiusMarker.marker.setLngLat(correctRadiusPoint);
        }
      }
    }
  });

  editMarkers.value.forEach((item) => {
    if (item.editShape && item.editShape._isModified) {
      if (uniqueEditShapes.has(item.editShape)) return;
      uniqueEditShapes.add(item.editShape);

      const zoneData = item.editShape._zoneData;
      console.log(zoneData, "======");

      if (!zoneData) return;

      let apiCoordinates = "";
      let radius = 0;
      let area = 0;

      if (item.editShape instanceof AMap.Polygon) {
        const points = item.editShape.getPath() || [];
        const latLngPoints = points.map((p) => [p.lat, p.lng]);
        apiCoordinates = JSON.stringify([latLngPoints]);
        const coordinates = points.map((p) => ({ lng: p.lng, lat: p.lat }));
        area = calculatePolygonArea(coordinates);
      } else if (item.editShape instanceof AMap.Circle) {
        const center = item.editShape.getCenter();
        radius = item.editShape.getRadius();
        apiCoordinates = JSON.stringify([[[center.lat, center.lng]]]);
        area = calculateCircleArea(radius);
      }
      // 【关键修改】给三个字段加默认值，防止undefined
      const updateParams = {
        id: zoneData.id,
        area: area.toFixed(3),
        borderColor: zoneData.borderColor || "#e74c3c",
        borderWeight: zoneData.borderWeight || 2,
        coordinates: apiCoordinates,
        description: zoneData.description || "自定义禁飞区",
        fillColor: zoneData.fillColor || "#e74c3c",
        fillOpacity: zoneData.fillOpacity || 0.3,
        name: zoneData.name || `禁飞区${zoneData.id}`,
        shape: zoneData.type,
        updateTime:
          zoneData.updateTime ||
          new Date().toISOString().replace("T", " ").slice(0, 19), // 默认当前时间
        limitAddress: zoneData.limitAddress || "", // 默认空字符串
        companyId: zoneData.companyId || "", // 默认空字符串（若为数字可设为0，根据后端要求调整）
      };

      modifiedZones.push(updateParams);
    }
  });

  // 后续代码不变...
  if (modifiedZones.length === 0) {
    // 如果没有修改，恢复原始形状
    restoreOriginalShapes();
    cleanupEditMode();
    clearAllMarkers(); // 清理所有标记
    ElMessage.info(`未修改任何${regionName.value}，已退出编辑模式`);
    return;
  }

  try {
    const updatePromises = modifiedZones.map((params) =>
      noflyzoneUpdate(params),
    );
    const results = await Promise.all(updatePromises);

    const allSuccess = results.every((res) => res.code === 200);
    if (allSuccess) {
      ElMessage.success(
        `成功更新 ${modifiedZones.length} 个${regionName.value}`,
      );
      // 重新加载禁飞区列表
      await noFlyZonesList();
      emit("zone-updated", modifiedZones);
    } else {
      ElMessage.error("部分禁飞区更新失败，请重试");
      // 恢复原始形状
      restoreOriginalShapes();
    }
  } catch (error) {
    console.error("禁飞区更新接口调用失败：", error);
    ElMessage.error("禁飞区更新失败，请检查网络或接口配置");
    // 恢复原始形状
    restoreOriginalShapes();
  }

  // 清理编辑状态和所有标记
  cleanupEditMode();
  clearAllMarkers();
};
// 取消编辑（如果有取消按钮）
const cancelEditMode = () => {
  if (isEditing.value) {
    restoreOriginalShapes();
    cleanupEditMode();
    // 额外清理所有标记点
    clearAllMarkers();
    ElMessage.info("已取消编辑");
  }
};

// 清理编辑模式
const cleanupEditMode = () => {
  isEditing.value = false;

  // 移除所有编辑标记
  editMarkers.value.forEach((item) => {
    if (item.marker) {
      props.map.remove(item.marker);
    }
    if (item.editShape) {
      props.map.remove(item.editShape);
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(item.editShape);
      }
    }
  });
  editMarkers.value = [];

  // 移除所有编辑形状
  const allOverlays = props.map.getAllOverlays();
  allOverlays.forEach((overlay) => {
    if (overlay._isEditShape) {
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(overlay);
      }
      props.map.remove(overlay);
    }
    // 移除所有编辑标记点
    if (overlay instanceof AMap.Marker && overlay._isEditMarker) {
      props.map.remove(overlay);
    }
  });
};

// 恢复原始形状
const restoreOriginalShapes = () => {
  // 从编辑标记中找到所有原始形状并恢复
  const originalShapes = new Set();
  editMarkers.value.forEach((item) => {
    if (item.originalShape) {
      originalShapes.add(item.originalShape);
    }
  });

  originalShapes.forEach((shape) => {
    if (shape._editShape) {
      // 移除编辑形状
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(shape._editShape);
      }
      props.map.remove(shape._editShape);
      delete shape._editShape;
    }

    // 重新添加原始形状
    if (shape instanceof AMap.Polygon || shape instanceof AMap.Circle) {
      // 先移除可能存在的同名形状
      const existingOverlays = props.map.getAllOverlays();
      existingOverlays.forEach((overlay) => {
        if (overlay._id === shape._id && overlay !== shape) {
          props.map.remove(overlay);
          if (noFlyZonesLayer.value) {
            noFlyZonesLayer.value.removeLayer(overlay);
          }
        }
      });

      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.addLayer(shape);
      }
      props.map.add(shape);
    }
  });
};

// 清除编辑标记
const clearEditMarkers = () => {
  editMarkers.value.forEach((item) => {
    if (item.marker && props.map) {
      props.map.remove(item.marker);
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(item.marker);
      }
    }
    if (item.editShape && props.map) {
      props.map.remove(item.editShape);
      if (noFlyZonesLayer.value) {
        noFlyZonesLayer.value.removeLayer(item.editShape);
      }
    }
  });
  editMarkers.value = [];

  // 清理所有编辑标记（如有直接获取所有覆盖物的操作）
  if (props.map) {
    const allOverlays = props.map.getAllOverlays();
    allOverlays.forEach((overlay) => {
      if (
        overlay instanceof AMap.Marker &&
        (overlay._isEditMarker || !overlay._id)
      ) {
        props.map.remove(overlay);
      }
    });
  }
};

// 恢复所有区域的正常样式和显示状态
const restoreAllZonesStyle = () => {
  const allOverlays = props.map
    .getAllOverlays()
    .filter((overlay) => overlay._id);

  allOverlays.forEach((overlay) => {
    const zoneData =
      overlay._zoneData || noFlyZones.value.find((z) => z.id === overlay._id);

    // 恢复显示
    overlay.show();
    if (zoneData) {
      overlay.setOptions({
        strokeWeight: zoneData.borderWeight || 2,
        strokeOpacity: 1,
        fillOpacity: zoneData.fillOpacity || 0.3,
        zIndex: 0, // 恢复默认层级
      });
    }
  });
};
// 高亮显示当前可删除的区域（重叠场景优化：隐藏非目标类型区域）
const highlightDeletableZones = () => {
  const allOverlays = props.map
    .getAllOverlays()
    .filter((overlay) => overlay._id);

  allOverlays.forEach((overlay) => {
    const zoneData =
      overlay._zoneData || noFlyZones.value.find((z) => z.id === overlay._id);

    if (zoneData && zoneData.regionType === selectedRegion.value) {
      // 高亮当前类型的区域：提升视觉优先级
      overlay.setOptions({
        strokeWeight: 4,
        strokeOpacity: 1,
        fillOpacity: 0.5,
        zIndex: 100, // 提升层级，避免被遮挡
      });
      // 显示目标类型区域
      overlay.show();
    } else {
      // 隐藏非目标类型区域（重叠时直接不显示，避免混淆）
      overlay.hide();
    }
  });
};
// 删除功能（优化重叠场景的事件绑定和穿透处理）
const toggleEditMode = () => {
  if (isDrawing.value || isEditing.value) {
    ElMessage.warning("请先完成当前绘制或编辑");
    return;
  }

  // 只检查当前选中类型的区域
  const currentTypeZones = noFlyZones.value.filter(
    (zone) => zone.regionType === selectedRegion.value,
  );

  if (currentTypeZones.length === 0) {
    ElMessage.warning(`暂无${regionName.value}可删除`);
    return;
  }

  // 切换删除模式状态
  isDeleteModeActive.value = !isDeleteModeActive.value;

  // 获取所有禁飞区覆盖物
  const allOverlays = props.map
    .getAllOverlays()
    .filter((overlay) => overlay._id);

  if (isDeleteModeActive.value) {
    // 高亮显示可删除的区域（隐藏非目标类型）
    highlightDeletableZones();

    // 仅给当前选中类型的区域绑定删除事件，并设置点击穿透
    allOverlays.forEach((overlay) => {
      const zoneData =
        overlay._zoneData || noFlyZones.value.find((z) => z.id === overlay._id);

      if (zoneData && zoneData.regionType === selectedRegion.value) {
        // 绑定删除点击事件
        overlay.on("click", handleNoFlyZoneClick);
        overlay._deleteEventBound = true;
        // 设置非目标区域点击穿透（针对TMap的覆盖物，添加样式标记）
        overlay.setOptions({
          cursor: "pointer", // 允许点击
        });
      } else {
        // 非目标类型区域禁止点击
        overlay.setOptions({
          cursor: "default", // 点击穿透，不响应事件
        });
      }
    });

    ElMessage.info(
      `删除模式：点击${regionName.value}可删除（非目标区域已隐藏）`,
    );
  } else {
    // 恢复所有区域样式、显示状态和点击事件
    restoreAllZonesStyle();

    // 移除删除事件并恢复点击状态
    allOverlays.forEach((overlay) => {
      if (overlay._deleteEventBound) {
        overlay.off("click", handleNoFlyZoneClick);
        overlay._deleteEventBound = false;
      }
      // 恢复默认点击状态
      overlay.setOptions({
        cursor: "pointer",
      });
    });
    ElMessage.info("已退出删除模式");
  }
};
const handleNoFlyZoneClick = function () {
  const overlay = this;
  const id = overlay._id;

  // 找到对应的禁飞区数据
  const zone = noFlyZones.value.find((z) => z.id === id);

  if (!zone) {
    ElMessage.error("找不到对应的禁飞区数据");
    return;
  }

  // 验证区域类型：只允许删除当前选中类型的区域
  if (zone.regionType !== selectedRegion.value) {
    const currentTypeName = regionName.value;
    const clickedTypeName = zone.regionType === "jg" ? "警告区" : "禁飞区";
    ElMessage.warning(
      `当前处于${currentTypeName}删除模式，无法删除${clickedTypeName}`,
    );
    return;
  }

  // 根据区域类型显示正确的名称
  const zoneTypeName = zone.regionType === "jg" ? "警告区" : "禁飞区";
  const zoneDisplayName = zone.name || `${zoneTypeName}${id}`;

  ElMessageBox.confirm(
    `确定删除${zoneTypeName}【${zoneDisplayName}】吗？`,
    "删除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        const res = await noflyzoneDelete(id);
        if (res.code === 200) {
          // 从图层移除
          if (noFlyZonesLayer.value) {
            noFlyZonesLayer.value.removeLayer(overlay);
          }

          // 从地图的覆盖物中移除
          if (props.map) {
            props.map.remove(overlay);
          }

          // 从数据数组中移除
          noFlyZones.value = noFlyZones.value.filter((z) => z.id !== id);

          // 如果是圆形，还需要移除编辑标记
          if (overlay instanceof AMap.Circle) {
            removeCircleEditMarkers(overlay);
          }

          // 移除事件监听器
          if (overlay._deleteEventBound) {
            overlay.off("click", handleNoFlyZoneClick);
            overlay._deleteEventBound = false;
          }

          // 【新增】删除后刷新视觉：重新高亮剩余的可删除区域
          if (isDeleteModeActive.value) {
            highlightDeletableZones();
          }

          // 检查是否还有当前类型的区域
          const remainingZones = noFlyZones.value.filter(
            (zone) => zone.regionType === selectedRegion.value,
          );

          if (remainingZones.length === 0 && isDeleteModeActive.value) {
            // 自动退出删除模式
            isDeleteModeActive.value = false;
            restoreAllZonesStyle();
            ElMessage.info("当前类型的区域已全部删除，自动退出删除模式");
          }
          ElMessage.success(`${zoneTypeName}【${zoneDisplayName}】已成功删除`);
          emit("zone-deleted", id);
        } else {
          ElMessage.error(`删除失败：${res.message || "接口返回异常"}`);
        }
      } catch (error) {
        console.error(`${zoneTypeName}删除接口调用失败：`, error);
        ElMessage.error("删除失败，请重试");
      }
    })
    .catch(() => {
      ElMessage.info(`已取消删除${zoneTypeName}【${zoneDisplayName}】`);
    });
};

// 添加移除圆形编辑标记的辅助函数
const removeCircleEditMarkers = (circle) => {
  editMarkers.value = editMarkers.value.filter((item) => {
    if (item.shape === circle) {
      if (item.marker) {
        props.map.removeOverLay(item.marker);
      }
      return false; // 从数组中移除
    }
    return true; // 保留其他标记
  });
};

const clearAllNoFlyZones = () => {
  // 只获取当前选中类型的区域
  const currentTypeZones = noFlyZones.value.filter(
    (zone) => zone.regionType === selectedRegion.value,
  );

  if (currentTypeZones.length === 0) {
    ElMessage.warning(`暂无${regionName.value}可清除`);
    return;
  }

  // 获取当前类型所有禁飞区名称
  const zoneNames = currentTypeZones
    .map((zone) => zone.name || `${regionName.value}${zone.id}`)
    .join("、");

  ElMessageBox.confirm(
    `确定要清除所有${regionName.value}吗？\n（包括：${zoneNames}）`,
    "清除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        // 只获取当前选中类型的禁飞区覆盖物
        const allOverlays = props.map.getOverlays().filter((overlay) => {
          if (!overlay._id && !overlay._isNoFlyZone) return false;

          // 获取区域数据
          const zoneData =
            overlay._zoneData ||
            noFlyZones.value.find((z) => z.id === overlay._id);
          return zoneData && zoneData.regionType === selectedRegion.value;
        });

        // 逐个删除
        allOverlays.forEach((overlay) => {
          if (noFlyZonesLayer.value) {
            noFlyZonesLayer.value.removeLayer(overlay);
          }
          if (props.map) {
            props.map.remove(overlay);
          }

          // 更新数据数组
          noFlyZones.value = noFlyZones.value.filter(
            (zone) => zone.id !== overlay._id,
          );
        });

        // 清除所有编辑标记
        editMarkers.value.forEach((item) => {
          if (item.marker) {
            props.map.remove(item.marker);
          }
        });
        editMarkers.value = [];

        ElMessage.success(`所有${regionName.value}已清除`);
        emit("zones-cleared");
      } catch (error) {
        console.error(`清除所有${regionName.value}失败:`, error);
        ElMessage.error("清除失败，请重试");
      }
    })
    .catch(() => {
      ElMessage.info("已取消清除");
    });
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

const getRadiusPoint = (center, radius) => {
  const earthRadius = 6378137; // GCJ02坐标系对应的地球半径
  const latRad = (center.lat * Math.PI) / 180;
  // 米转经度偏移（仅在赤道上1度≈111320米，纬度越高偏移越小）
  const lngOffset =
    (radius / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
  // 返回圆心「正东方向」的半径点（保证在圆形边缘）
  return [center.lng + lngOffset, center.lat];
};
// 🔥 新增：从父组件注入绘制状态和编辑状态
const isDrawingRoute = inject("isDrawingRoute", ref(false));
const isEditingRoute = inject("isEditingRoute", ref(false));

const bindTooltipEvents = (shape, zoneData) => {
  // 🔥 修改：使用 mouseover 显示 tooltip，而不是 click
  // 这样不会拦截地图的点击事件
  shape.on("mouseover", (e) => {
    // 🔥 如果在绘制航线模式或编辑航线模式，不显示 tooltip
    if (isDrawingRoute.value || isEditingRoute.value) {
      return;
    }

    console.log("🔥 mouseover 事件触发", zoneData?.name, "事件对象:", e);
    if (!zoneData) {
      console.log("mouseover 返回：zoneData 不存在");
      return;
    }

    // 🔥 修改：使用 pixel 或 lnglat 来获取位置
    let x, y;
    if (e.pixel) {
      x = e.pixel.x;
      y = e.pixel.y;
    } else if (e.containerPoint) {
      x = e.containerPoint.x;
      y = e.containerPoint.y;
    } else {
      console.log("mouseover 返回：无法获取位置信息");
      return;
    }

    // 更新位置
    tooltipPosition.value = {
      x: x,
      y: zoneData.type === "polygon" ? y : y - 20,
    };

    let area = 0;
    if (zoneData.type === "polygon" && zoneData.coordinates?.length >= 3) {
      area = calculatePolygonArea(zoneData.coordinates);
    } else if (zoneData.type === "circle" && zoneData.radius > 0) {
      area = calculateCircleArea(zoneData.radius);
    }

    tooltipData.value = { ...zoneData, area };
    showTooltip.value = true;
    console.log("tooltip 已显示:", zoneData.name, showTooltip.value);
  });

  shape.on("mouseout", () => {
    console.log("mouseout 事件触发，隐藏 tooltip");
    showTooltip.value = false;
  });

  // 🔥 新增：点击事件传递给父组件，用于绘制航线时检测禁飞区/禁高区
  shape.on("click", (e) => {
    console.log("🔥 禁飞区/禁高区被点击", zoneData?.name, e);
    // 触发 zone-click 事件，让父组件处理航点添加逻辑
    if (e && e.lnglat) {
      emit("zone-click", {
        lnglat: e.lnglat,
        pixel: e.pixel,
        zoneData: zoneData,
        originalEvent: e,
      });
    }
  });
};

const cleanup = () => {
  if (noFlyZonesLayer.value) {
    noFlyZonesLayer.value.clearLayers();
  }
  resetDrawState();
  clearEditMarkers();
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
  top: 160px;
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

.edit::before {
  content: "✎";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.save::before {
  content: "□";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.delete::before {
  content: "✕";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

.clear-all::before {
  content: "⌫";
  margin-right: 5px;
  font-size: 14px;
  color: #333;
}

/* 图例样式 */
.legend {
  margin-top: 15px;
  margin-bottom: 15px; /* 添加底部间距 */
  padding: 10px;
  background: #f8f9fa; /* 添加背景色 */
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  color: #666;
  cursor: pointer; /* 添加手型光标 */
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.legend-item:hover {
  background-color: #e9ecef; /* 悬停效果 */
}

.legend-item.active {
  background-color: #e7f3ff; /* 激活状态 */
  font-weight: bold;
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
/* 原有样式不变，添加以下样式 */
.draw-tooltip {
  animation: fadeIn 0.3s ease;
}
/* 原有样式不变，添加以下样式 */
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

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
