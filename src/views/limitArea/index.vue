<template>
  <div class="demo-container">
    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 地图容器 -->
      <div class="map-container">
        <div ref="mapContainer" class="map-wrapper"></div>
        <!-- 左侧控制面板，浮动在地图上层 -->
        <div class="floating-panel left-panel" v-show="!isPanelCollapsed">
          <el-card
            class="control-card"
            style="background-color: #00285a80; height: 100%"
          >
            <div style="height: 100%">
              <el-card
                style="
                  background-color: #2e3649db;
                  color: #fff;
                  margin-bottom: 12px;
                "
              >
                <template #header>
                  <div class="panel-header" style="color: #fff">
                    <div style="opacity: 0"></div>
                    <span style="margin-left: 20px">区域列表</span>
                  </div>
                </template>
                <el-button
                  type="primary"
                  style="width: 100%"
                  @click="regionalManagementDialog"
                  :disabled="activeRouteId !== null || editingZoneId !== null"
                  >绘制限制区域</el-button
                >
              </el-card>

              <!-- 引入航线列表组件 -->
              <RouteList
                v-if="isNoFlyZoneManagerMounted"
                ref="routeListRef"
                :map="map"
                :no-fly-zone-manager-ref="noFlyZoneManagerRef"
                @route-view="handleRouteView"
                @route-retract="handleRouteRetract"
                @route-edit="handleRouteEdit"
                @route-edit-complete="handleRouteEditComplete"
                @route-delete="handleRouteDelete"
              />
            </div>
          </el-card>
        </div>
      </div>

      <!-- 面板收起/展开按钮 -->
      <div
        style="
          position: absolute;
          top: 35px;
          left: 35px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        "
      >
        <div
          style="
            background: #fff;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
          "
          @click="togglePanel"
        >
          <el-icon :style="{ color: '#409eff !important' }">
            <Fold v-if="!isPanelCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
      </div>

      <!-- 自定义悬浮提示框 -->
      <div
        class="image-tooltip"
        v-show="showImgTooltip"
        style="
          position: absolute;
          min-width: 50px;
          background: rgb(255, 255, 255);
          border-radius: 12px;
          padding: 6px;
          top: 57px;
          right: 10px;
          z-index: 1000;
          text-align: center;
        "
      >
        <div style="font-size: 14px">{{ tooltipTile }}</div>
      </div>
      <!-- 3种地图图层下拉选择 -->
      <div style="position: absolute; top: 20px; right: 20px; z-index: 9999">
        <el-select
          v-model="mapLayerType"
          @change="onMapLayerChange"
          style="width: 130px"
          size="default"
        >
          <el-option label="标准地图" value="normal" />
          <el-option label="卫星地图" value="satellite" />
          <el-option label="卫星混合" value="satelliteMix" />
        </el-select>
      </div>
      <!-- 引入禁飞区管理组件 -->
      <NoFlyZoneManager
        ref="noFlyZoneManagerRef"
        :map="map"
        :visible="noFlyZoneToolbar"
        @update:visible="noFlyZoneToolbar = $event"
        @zone-saved="handleZoneSaved"
      />
    </div>
  </div>
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
import { ElMessage } from "element-plus";
import { Fold, Expand } from "@element-plus/icons-vue";
import RouteList from "./components/RouteList.vue";
import NoFlyZoneManager from "./components/NoFlyZoneManager.vue";

// 状态变量
const mapContainer = ref(null);
// const loading = ref(true);

// 地图相关
let map = null;

// 面板控制
const isPanelCollapsed = ref(false);

// 禁飞区相关
const noFlyZoneManagerRef = ref(null);
const isNoFlyZoneManagerMounted = ref(false);
const noFlyZoneToolbar = ref(false); // 修复：let改为const，符合ref规范

// 航线列表组件引用
const routeListRef = ref(null);
const activeRouteId = ref(null);
const currentZoneShape = ref(null);
const editingZoneId = ref(null);
const isZoneEditing = ref(false);
// 🔥 新增：地图图层切换
const mapLayerType = ref("satelliteMix"); // 默认卫星混合
// 面板控制
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
  ElMessage.success(isPanelCollapsed.value ? "面板已收起" : "面板已展开");
};

// 地图初始化
const initMap = () => {
  if (!window.AMap) {
    ElMessage.error("高德地图API未加载，请检查网络连接");
    // loading.value = false;
    return;
  }

  try {
    // 使用 WebGL 渲染模式，提升性能
    map = new AMap.Map(mapContainer.value, {
      zoom: 15,
      center: [113.65644, 34.78723],
      viewMode: "3D",
      renderMode: "webgl",
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
    });

    map.on("complete", () => {
      // loading.value = false;
      ElMessage.success("地图加载成功");
    });

    map.on("zoomend", handleMapZoom);

    // 尝试获取当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.setCenter([lng, lat]);
          map.setZoom(15);
        },
        (err) => {
          console.warn("定位失败:", err);
          ElMessage.warning("请授予位置权限，否则无法获取当前位置");
        },
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    // loading.value = false;
    ElMessage.error("地图初始化失败，请检查配置");
  }
};

const handleMapZoom = () => {
  // 高德地图不需要 checkResize
};

// 地图图层切换
const onMapLayerChange = (val) => {
  if (!map) return;

  let layers = [];
  let label = "";

  switch (val) {
    case "normal":
      layers = [new AMap.TileLayer()];
      label = "标准地图";
      break;
    case "satellite":
      layers = [new AMap.TileLayer.Satellite()];
      label = "卫星地图";
      break;
    case "satelliteMix":
      layers = [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()];
      label = "卫星混合";
      break;
  }

  map.setLayers(layers);
  ElMessage.success("已切换 → " + label);
};
// ========== 核心修复1：定义updateZoneDataOnEdit（原updateZoneData重命名+提前定义） ==========
// 更新编辑时的区域数据（提前定义，确保所有调用处可访问，修复未定义报错）
const updateZoneDataOnEdit = (id, updates) => {
  console.log("更新区域数据:", id, updates);
  // 调用子组件RouteList的updateZoneData方法更新本地数据
  if (routeListRef.value) {
    routeListRef.value.updateZoneData(id, updates);
  }
  // 圆形仅做半径兜底，避免无效值
  if (updates.shape === "circle" && (!updates.radius || updates.radius < 1)) {
    updates.radius =
      updates.area > 0 ? Math.sqrt((updates.area * 1000000) / Math.PI) : 100;
  }
};
// ========== 修复1结束 ==========

// 处理查看路线/禁飞区
const handleRouteView = (route) => {
  console.log("查看路线/禁飞区:", route);
  // 🔥 新增：查看时自动关闭区域管理工具栏
  if (noFlyZoneToolbar.value) {
    noFlyZoneToolbar.value = false;
  }

  // 判断数据类型：禁飞区有 shape 字段
  if (route.shape) {
    // 这是禁飞区数据
    viewNoFlyZone(route);
  } else {
    ElMessage.warning("无法识别的数据类型");
  }
};

// 处理编辑禁飞区
const handleRouteEdit = (zoneData) => {
  // 🔥 新增：编辑时自动关闭区域管理工具栏
  if (noFlyZoneToolbar.value) {
    noFlyZoneToolbar.value = false;
  }
  console.log("编辑禁飞区:", zoneData);
  editNoFlyZone(zoneData);
};

// 处理编辑完成
const handleRouteEditComplete = (zoneId) => {
  console.log("编辑完成:", zoneId);
  completeEdit(zoneId); // 传参给completeEdit
};

// 处理删除禁飞区
const handleRouteDelete = (zoneData) => {
  console.log("删除禁飞区:", zoneData);
  // 如果有正在查看或编辑的禁飞区被删除，需要清除
  if (activeRouteId.value === zoneData.id) {
    retractRoute();
  }
  if (editingZoneId.value === zoneData.id) {
    completeEdit(zoneData.id);
  }
};

// 查看禁飞区函数
const viewNoFlyZone = (zoneData) => {
  console.log("显示禁飞区:", zoneData);

  if (!map) {
    ElMessage.error("地图未初始化");
    return;
  }

  try {
    // 清除之前的所有覆盖物
    clearAllOverlays();

    // 解析并显示禁飞区
    const parsedZoneData = parseZoneDataForDisplay(zoneData);

    // 如果解析返回null（坐标数据无效），直接返回
    if (!parsedZoneData) {
      return;
    }

    const shape = createZoneShape(parsedZoneData);

    if (shape) {
      // 添加到地图
      map.add(shape);

      // 保存引用，便于后续操作
      currentZoneShape.value = shape;

      // 跳转到禁飞区位置
      if (parsedZoneData.type === "circle") {
        // 圆形禁飞区：定位到圆心并设置合适缩放
        const center = parsedZoneData.coordinates[0];
        jumpToCircleZone(center, parsedZoneData.radius);
      } else {
        // 多边形禁飞区：定位到多边形范围
        jumpToPolygonZone(parsedZoneData.coordinates);
      }

      activeRouteId.value = zoneData.id;
      ElMessage.success(
        `已显示${parsedZoneData.type === "circle" ? "圆形" : "多边形"}禁飞区: ${parsedZoneData.name}`,
      );
    } else {
      ElMessage.error("无法创建禁飞区形状");
    }
  } catch (error) {
    console.error("显示禁飞区失败:", error);
    ElMessage.error("显示禁飞区失败");
  }
};

// 编辑禁飞区函数
const editNoFlyZone = (zoneData) => {
  console.log("编辑禁飞区:", zoneData);

  if (!map) {
    ElMessage.error("地图未初始化");
    return;
  }

  try {
    // 清除之前的所有覆盖物
    clearAllOverlays();

    // 解析并显示禁飞区（编辑模式）
    const parsedZoneData = parseZoneDataForDisplay(zoneData);

    // 设置编辑模式
    isZoneEditing.value = true;
    editingZoneId.value = zoneData.id;

    // 创建可编辑的禁飞区形状
    createEditableZoneShape(parsedZoneData);

    // 跳转到禁飞区位置
    if (parsedZoneData.type === "circle") {
      jumpToCircleZone(parsedZoneData.coordinates[0], parsedZoneData.radius);
    } else {
      jumpToPolygonZone(parsedZoneData.coordinates);
    }

    activeRouteId.value = zoneData.id;
    ElMessage.success("进入编辑模式，可以拖拽顶点修改形状");
  } catch (error) {
    console.error("编辑禁飞区失败:", error);
    ElMessage.error("进入编辑模式失败");
  }
};

// ========== 核心修复2：重构completeEdit（移除routeInfo/emit/未定义接口，修复未定义报错） ==========
// 完成编辑（主组件专属，仅负责清除状态+刷新子组件，不操作子组件私有变量）
const completeEdit = (zoneId) => {
  if (!zoneId && !editingZoneId.value) return;
  const targetId = zoneId || editingZoneId.value;
  console.log("完成编辑禁飞区:", targetId);

  // 1. 清除编辑状态
  isZoneEditing.value = false;
  editingZoneId.value = null;
  activeRouteId.value = null;

  // 2. 清除编辑相关覆盖物（圆心/半径点/多边形顶点）
  if (currentZoneShape.value && currentZoneShape.value.markers) {
    currentZoneShape.value.markers.forEach((marker) => {
      map.remove(marker);
    });
  }
  clearAllOverlays();

  // 3. 调用子组件刷新列表，获取最新数据（子组件自己处理后端提交）
  if (routeListRef.value) {
    routeListRef.value.routeList();
  }

  // 4. 提示成功
  // ElMessage.success("编辑完成，列表已刷新");
};
// ========== 修复2结束 ==========

// 跳转到圆形禁飞区
const jumpToCircleZone = (center, radius) => {
  if (!center || !radius) return;

  // 计算合适的缩放级别
  const zoomLevel = calculateZoomLevelByRadius(radius);

  // 平滑移动和缩放
  map.panTo([center.lng, center.lat]);

  // 延迟设置缩放，确保移动完成
  setTimeout(() => {
    map.setZoom(zoomLevel);
  }, 300);

  console.log(
    `跳转到圆形禁飞区: 中心(${center.lng}, ${center.lat}), 半径${radius}米, 缩放级别${zoomLevel}`,
  );
};

// 根据半径计算合适的缩放级别
const calculateZoomLevelByRadius = (radius) => {
  if (radius < 50) return 18; // 50米内: 非常近
  if (radius < 100) return 17; // 100米内: 近距离
  if (radius < 200) return 16; // 200米内
  if (radius < 500) return 15; // 500米内
  if (radius < 1000) return 14; // 1公里内
  if (radius < 2000) return 13; // 2公里内
  if (radius < 5000) return 12; // 5公里内
  if (radius < 10000) return 11; // 10公里内
  if (radius < 20000) return 10; // 20公里内
  if (radius < 50000) return 9; // 50公里内
  return 8; // 更大范围
};

// 跳转到多边形禁飞区
// 跳转到多边形禁飞区
const jumpToPolygonZone = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return;

  // 计算多边形的边界
  const lngs = coordinates.map((p) => p.lng);
  const lats = coordinates.map((p) => p.lat);
  const southWest = [Math.min(...lngs), Math.min(...lats)];
  const northEast = [Math.max(...lngs), Math.max(...lats)];
  const bounds = new AMap.Bounds(southWest, northEast);

  // 计算多边形中心
  const centerLng = (southWest[0] + northEast[0]) / 2;
  const centerLat = (southWest[1] + northEast[1]) / 2;

  // 先移动到中心
  map.panTo([centerLng, centerLat]);

  // 延迟设置合适视图范围
  setTimeout(() => {
    // 使用 setBounds 替代 setFitView，避免 getBounds 错误
    map.setBounds(bounds, false, [50, 50, 50, 50]);
  }, 400);
};

// 解析禁飞区数据用于显示
// 主组件 index.vue - 解析禁飞区数据用于显示（完整替换，新增多边形解析）
const parseZoneDataForDisplay = (zoneData) => {
  console.log("========== 开始解析禁飞区数据 ==========");
  console.log("原始数据:", JSON.stringify(zoneData, null, 2));

  const result = {
    id: zoneData.id,
    name: zoneData.name || "未命名禁飞区",
    type: zoneData.shape || "polygon",
    coordinates: [],
    borderColor: zoneData.borderColor || "#e74c3c",
    borderWeight: zoneData.borderWeight || 2,
    fillColor: zoneData.fillColor || "#e74c3c",
    fillOpacity: zoneData.fillOpacity || 0.3,
    area: zoneData.area || 0,
    radius: 0,
  };

  // 如果 coordinates 是字符串，先解析为数组
  let coordinatesToParse = zoneData.coordinates;
  if (typeof zoneData.coordinates === "string") {
    try {
      console.log("检测到字符串格式的 coordinates，正在解析...");
      coordinatesToParse = JSON.parse(zoneData.coordinates);
      console.log("解析后的 coordinates:", coordinatesToParse);
    } catch (e) {
      console.error("JSON 解析失败:", e);
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
        // val0 可能是纬度
        if (Math.abs(val1) <= 180) {
          // val1 在经度范围内
          lat = val0;
          lng = val1;
        } else {
          // val1 超出经度范围，交换尝试
          lat = val1;
          lng = val0;
        }
      } else if (Math.abs(val1) <= 90) {
        // val1 可能是纬度
        lat = val1;
        lng = val0;
      } else {
        // 都超出范围，默认按 [lng, lat] 处理
        lng = val0;
        lat = val1;
      }

      // 最终校验
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lng, lat };
      }
      console.warn("坐标值超出有效范围:", { lat, lng });
      return null;
    }
    return null;
  };

  // 根据形状提取有效点
  let validPoints = [];

  // 处理三层数组：[[[lat,lng], [lat,lng], ...]]
  if (
    coordinatesToParse &&
    Array.isArray(coordinatesToParse) &&
    coordinatesToParse.length > 0 &&
    Array.isArray(coordinatesToParse[0])
  ) {
    // 检查第二层是否为点数组（即每个元素是数组或对象）
    const firstChild = coordinatesToParse[0];
    if (Array.isArray(firstChild) && firstChild.length > 0) {
      // 可能是 [[lat,lng], [lat,lng], ...] 或 [[[lat,lng], ...]]
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
    } else if (typeof firstChild === "object" && firstChild.lng !== undefined) {
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
  if (result.type === "circle") {
    // 圆形取第一个有效点作为圆心
    result.coordinates = validPoints.length > 0 ? [validPoints[0]] : [];
    if (result.coordinates.length === 0) {
      console.error("圆形禁飞区解析失败：无有效圆心坐标");
      return null;
    }
    // 半径处理
    if (zoneData.radius && !isNaN(zoneData.radius) && zoneData.radius > 0) {
      result.radius = Number(zoneData.radius);
    } else if (result.area > 0) {
      result.radius = Math.sqrt((result.area * 1000000) / Math.PI);
    } else {
      result.radius = 100; // 默认100米
    }
    console.log(
      "圆形禁飞区解析完成：圆心",
      result.coordinates[0],
      "半径",
      result.radius,
      "米",
    );
  } else {
    // 多边形：至少需要3个有效点
    if (validPoints.length >= 3) {
      result.coordinates = validPoints;
    } else {
      console.error(
        `多边形禁飞区 ${zoneData.id} 解析失败，有效点数不足3个:`,
        validPoints.length,
      );
      ElMessage.error(
        `【${result.name}】多边形坐标点数不足（${validPoints.length}个），至少需要3个有效点`,
      );
      return null;
    }
  }

  return result;
};

// 创建禁飞区形状
// 创建禁飞区形状（修改多边形部分，新增点数校验）
const createZoneShape = (zoneData) => {
  console.log("创建禁飞区形状:", zoneData);

  try {
    if (
      zoneData.type === "circle" &&
      zoneData.radius > 0 &&
      zoneData.coordinates[0]
    ) {
      // 圆形逻辑
      const center = zoneData.coordinates[0];
      const circle = new AMap.Circle({
        center: [center.lng, center.lat],
        radius: zoneData.radius,
        strokeColor: zoneData.borderColor,
        strokeWeight: zoneData.borderWeight,
        fillColor: zoneData.fillColor,
        fillOpacity: zoneData.fillOpacity,
      });
      circle._isNoFlyZone = true;
      circle._zoneId = zoneData.id;
      circle._zoneData = zoneData;
      return circle;
    } else if (zoneData.coordinates && zoneData.coordinates.length >= 3) {
      // 多边形：新增点数≥3校验（核心！）
      const path = zoneData.coordinates.map((point) => [point.lng, point.lat]);
      const polygon = new AMap.Polygon({
        path: path,
        strokeColor: zoneData.borderColor,
        strokeWeight: zoneData.borderWeight,
        fillColor: zoneData.fillColor,
        fillOpacity: zoneData.fillOpacity,
      });
      polygon._isNoFlyZone = true;
      polygon._zoneId = zoneData.id;
      polygon._zoneData = zoneData;
      return polygon;
    } else {
      console.error(
        "创建形状失败：圆形缺少圆心/半径，或多边形点数不足（需≥3个）",
        zoneData,
      );
      ElMessage.warning(
        `【${zoneData.name}】多边形需至少3个有效坐标点，当前仅${zoneData.coordinates.length}个`,
      );
      return null;
    }
  } catch (error) {
    console.error("创建禁飞区形状失败:", error);
    ElMessage.error("创建禁飞区形状失败，请检查坐标数据");
    return null;
  }
};

// 创建可编辑的禁飞区形状
const createEditableZoneShape = (zoneData) => {
  console.log("创建可编辑的禁飞区形状:", zoneData);

  try {
    if (
      zoneData.type === "circle" &&
      zoneData.radius > 0 &&
      zoneData.coordinates[0]
    ) {
      // 圆形禁飞区 - 创建可编辑的圆形
      createEditableCircle(zoneData);
    } else if (zoneData.coordinates && zoneData.coordinates.length > 0) {
      // 多边形禁飞区 - 创建可编辑的多边形
      createEditablePolygon(zoneData);
    } else {
      console.error("缺少创建形状所需的数据");
      return null;
    }
  } catch (error) {
    console.error("创建可编辑禁飞区形状失败:", error);
    return null;
  }
};
// 计算两点之间的角度（弧度）
const calculateAngle = (point1, point2) => {
  const dx = point2.lng - point1.lng;
  const dy = point2.lat - point1.lat;
  return Math.atan2(dy, dx);
};
// 根据圆心、半径和角度计算圆上的点
const calculatePointOnCircle = (center, radius, angle) => {
  const earthRadius = 6371000; // 地球半径，单位米
  const latRad = (center.lat * Math.PI) / 180;

  // 将半径转换为经纬度偏移量
  const deltaLat = ((radius * Math.sin(angle)) / earthRadius) * (180 / Math.PI);
  const deltaLng =
    ((radius * Math.cos(angle)) / (earthRadius * Math.cos(latRad))) *
    (180 / Math.PI);

  return [center.lng + deltaLng, center.lat + deltaLat];
};
// 创建可编辑的圆形
// 创建可编辑的圆形
const createEditableCircle = (zoneData) => {
  const center = zoneData.coordinates[0]; // { lng, lat }
  const initialRadius = zoneData.radius; // 当前半径（米）

  console.log(`[编辑圆形] 初始化 - 圆心:`, center, `初始半径:`, initialRadius);

  // 🔴 核心修复：用局部变量存储拖拽状态，替代this
  const dragState = {
    dragStartPos: null,
    radiusMarkerStartPos: null,
    centerPos: null,
    isDragging: false, // 新增：标记是否正在拖拽
  };

  // 🔴 修复：使用ref确保变量响应式更新
  const currentRadius = ref(initialRadius);

  // 1. 创建圆形（编辑样式）
  const circle = new AMap.Circle({
    center: new AMap.LngLat(center.lng, center.lat),
    radius: currentRadius.value,
    strokeColor: "#ff9800",
    strokeWeight: zoneData.borderWeight + 1,
    fillColor: zoneData.fillColor,
    fillOpacity: zoneData.fillOpacity,
  });
  circle._isNoFlyZone = true;
  circle._zoneId = zoneData.id;
  circle._zoneData = zoneData;
  circle._isEditable = true;

  // 2. 创建圆心Marker（可拖拽）
  const centerMarker = new AMap.Marker({
    position: new AMap.LngLat(center.lng, center.lat),
    icon: createEditIcon("#ff9800"),
    draggable: true,
    anchor: "center",
    zIndex: 10000,
  });

  // 3. 计算并创建半径控制点（始终在圆边缘）
  const calculateRadiusPointOnCircle = (center, radius, angle = 0) => {
    const earthRadius = 6371000; // 地球半径（米）
    const latRad = (center.lat * Math.PI) / 180;
    const lngRad = (center.lng * Math.PI) / 180;
    const angularDist = radius / earthRadius;

    // 计算圆上点经纬度（angle=0 为正东方向）
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angularDist) +
        Math.cos(latRad) * Math.sin(angularDist) * Math.cos(angle),
    );
    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * Math.sin(newLatRad),
      );

    const result = {
      lng: (newLngRad * 180) / Math.PI,
      lat: (newLatRad * 180) / Math.PI,
    };

    console.log(`[计算半径点] 半径:${radius} → 坐标:`, result);
    return result;
  };

  // 初始半径点（正东方向，在圆边缘）
  const initialRadiusPoint = calculateRadiusPointOnCircle(
    center,
    initialRadius,
  );
  const radiusMarker = new AMap.Marker({
    position: new AMap.LngLat(initialRadiusPoint.lng, initialRadiusPoint.lat),
    icon: createEditIcon("#ff9800"),
    draggable: true,
    anchor: "center",
    zIndex: 10000,
  });

  // --- 圆心拖拽逻辑 ---
  centerMarker.on("dragstart", (e) => {
    console.log(`[圆心拖拽开始] 起始位置:`, e.lnglat);
    dragState.dragStartPos = e.lnglat;
    dragState.radiusMarkerStartPos = radiusMarker.getPosition();
  });

  centerMarker.on("drag", (e) => {
    const newCenter = e.lnglat;
    // 更新圆心
    circle.setCenter(newCenter);
    centerMarker.setPosition(newCenter);

    // 同步更新半径点位置（保持相对偏移）
    if (dragState.dragStartPos && dragState.radiusMarkerStartPos) {
      const offsetLng = newCenter.lng - dragState.dragStartPos.lng;
      const offsetLat = newCenter.lat - dragState.dragStartPos.lat;
      const newRadiusPos = [
        dragState.radiusMarkerStartPos.lng + offsetLng,
        dragState.radiusMarkerStartPos.lat + offsetLat,
      ];
      radiusMarker.setPosition(newRadiusPos);
      console.log(
        `[圆心拖拽中] 新圆心:`,
        newCenter,
        `半径点偏移:`,
        offsetLng,
        offsetLat,
      );
    }
  });

  centerMarker.on("dragend", (e) => {
    const newCenter = e.lnglat;
    // 最终更新圆心
    circle.setCenter(newCenter);
    centerMarker.setPosition(newCenter);

    // 重新计算半径点（确保在圆边缘）
    const newRadiusPoint = calculateRadiusPointOnCircle(
      { lng: newCenter.lng, lat: newCenter.lat },
      currentRadius.value,
    );
    radiusMarker.setPosition([newRadiusPoint.lng, newRadiusPoint.lat]);

    console.log(
      `[圆心拖拽结束] 最终圆心:`,
      newCenter,
      `重置半径点:`,
      newRadiusPoint,
    );

    // 更新数据
    updateZoneDataOnEdit(zoneData.id, {
      coordinates: [[[newCenter.lng, newCenter.lat]]],
      radius: currentRadius.value,
      area: (Math.PI * currentRadius.value * currentRadius.value) / 1000000,
    });

    // 清空状态
    dragState.dragStartPos = null;
    dragState.radiusMarkerStartPos = null;
  });

  // --- 半径点拖拽逻辑 ---
  radiusMarker.on("dragstart", () => {
    console.log(`[半径拖拽开始] 当前半径:`, currentRadius.value);
    dragState.centerPos = centerMarker.getPosition();
    dragState.isDragging = true;
  });

  radiusMarker.on("drag", (e) => {
    if (!dragState.isDragging) return;

    const newRadiusPoint = e.lnglat;
    const centerPos = dragState.centerPos || centerMarker.getPosition();

    // 🔴 核心修复1：实时计算并更新半径，移除不必要的限制
    const newRadius = AMap.GeometryUtil.distance(centerPos, newRadiusPoint);
    console.log(
      `[半径拖拽中] 新半径:`,
      newRadius,
      `当前半径:`,
      currentRadius.value,
    );

    // 仅限制最小值，不阻止缩小操作
    if (newRadius >= 10) {
      currentRadius.value = newRadius;
      // 🔴 核心修复2：立即更新圆形半径
      circle.setRadius(currentRadius.value);
      console.log(`[半径拖拽中] 更新半径为:`, currentRadius.value);
    } else {
      console.log(`[半径拖拽中] 半径过小(${newRadius}米)，暂不更新`);
    }
  });

  radiusMarker.on("dragend", (e) => {
    dragState.isDragging = false;
    const newRadiusPoint = e.lnglat;
    const centerPos = centerMarker.getPosition();
    const finalRadius = AMap.GeometryUtil.distance(centerPos, newRadiusPoint);

    console.log(`[半径拖拽结束] 最终计算半径:`, finalRadius);

    if (finalRadius >= 10) {
      // 🔴 确保最终半径更新
      currentRadius.value = finalRadius;
      circle.setRadius(currentRadius.value);

      // 确保半径点仍在圆边缘（修正拖拽偏差）
      const correctedRadiusPoint = calculateRadiusPointOnCircle(
        { lng: centerPos.lng, lat: centerPos.lat },
        currentRadius.value,
      );
      radiusMarker.setPosition([
        correctedRadiusPoint.lng,
        correctedRadiusPoint.lat,
      ]);

      console.log(
        `[半径拖拽结束] 最终半径:`,
        currentRadius.value,
        `修正半径点:`,
        correctedRadiusPoint,
      );

      // 更新数据
      updateZoneDataOnEdit(zoneData.id, {
        radius: currentRadius.value,
        area: (Math.PI * currentRadius.value * currentRadius.value) / 1000000,
      });
    } else {
      // 半径过小，恢复原位置
      const originalRadiusPoint = calculateRadiusPointOnCircle(
        { lng: centerPos.lng, lat: centerPos.lat },
        currentRadius.value,
      );
      radiusMarker.setPosition([
        originalRadiusPoint.lng,
        originalRadiusPoint.lat,
      ]);
      console.log(
        `[半径拖拽结束] 半径过小(${finalRadius}米)，恢复原半径:`,
        currentRadius.value,
      );
      ElMessage.warning(
        `半径不能小于10米，已恢复原半径${currentRadius.value.toFixed(2)}米`,
      );
    }

    // 清空状态
    dragState.centerPos = null;
  });

  // 5. 添加到地图
  map.add(circle);
  map.add(centerMarker);
  map.add(radiusMarker);

  // 保存引用
  currentZoneShape.value = {
    shape: circle,
    markers: [centerMarker, radiusMarker],
    type: "circle",
    zoneId: zoneData.id,
    currentRadius: currentRadius, // 保存ref引用而非原始值
  };

  console.log(
    `[编辑圆形] 创建完成 - 圆心Marker:`,
    centerMarker,
    `半径Marker:`,
    radiusMarker,
  );

  return circle;
};

// 清除所有覆盖物
const clearAllOverlays = () => {
  if (!map) return;

  // 清理动画
  if (currentZoneShape.value && currentZoneShape.value.pulseInterval) {
    clearInterval(currentZoneShape.value.pulseInterval);
  }

  // 清除所有覆盖物
  map.clearMap();

  // 清除引用
  currentZoneShape.value = null;
  activeRouteId.value = null;
  editingZoneId.value = null;
  isZoneEditing.value = false;

  console.log("覆盖物清除完成");
};

// 创建可编辑的多边形
// 创建可编辑的多边形（新增前置点数校验，完整替换此函数）
const createEditablePolygon = (zoneData) => {
  // 前置校验：点数≥3才创建
  if (!zoneData.coordinates || zoneData.coordinates.length < 3) {
    console.error(
      "创建可编辑多边形失败：点数不足（需≥3个）",
      zoneData.coordinates,
    );
    ElMessage.warning(
      `【${zoneData.name}】无法进入编辑模式，多边形需至少3个有效坐标点`,
    );
    return null;
  }

  const path = zoneData.coordinates.map((point) => [point.lng, point.lat]);

  // 创建多边形（原逻辑不变）
  let polygon = new AMap.Polygon({
    path: path,
    strokeColor: "#ff9800", // 编辑模式下使用橙色
    strokeWeight: zoneData.borderWeight + 1,
    fillColor: zoneData.fillColor,
    fillOpacity: zoneData.fillOpacity,
  });

  polygon._isNoFlyZone = true;
  polygon._zoneId = zoneData.id;
  polygon._zoneData = zoneData;
  polygon._isEditable = true;

  // 添加顶点标记点（可拖拽，修复anchor居中对齐）
  const vertexMarkers = zoneData.coordinates.map((point, index) => {
    const marker = new AMap.Marker({
      position: [point.lng, point.lat],
      icon: createEditIcon("#ff9800"),
      draggable: true,
      anchor: "center", // 修复：确保标记居中对齐顶点
    });
    marker.on("dragend", (e) => {
      const newPoint = e.lnglat;
      marker.setPosition([newPoint.lng, newPoint.lat]);
      const newPoints = [...zoneData.coordinates];
      newPoints[index] = { lng: newPoint.lng, lat: newPoint.lat };
      updatePolygonPath(polygon, newPoints, zoneData);
      zoneData.coordinates[index] = { lng: newPoint.lng, lat: newPoint.lat };
      const newArea = calculatePolygonArea(newPoints);
      // 转换为三层数组格式 [[[lat, lng], [lat, lng], ...]]
      const newCoordinates = [newPoints.map((p) => [p.lng, p.lat])];
      updateZoneDataOnEdit(zoneData.id, {
        coordinates: newCoordinates,
        area: newArea,
      });
    });
    map.add(marker);
    return marker;
  });

  // 添加到地图
  map.add(polygon);

  // 保存引用
  currentZoneShape.value = {
    shape: polygon,
    markers: vertexMarkers,
    type: "polygon",
    zoneId: zoneData.id,
    points: zoneData.coordinates,
  };

  console.log(
    `可编辑多边形创建成功：${zoneData.coordinates.length}个顶点，已添加拖拽标记`,
  );
  return polygon;
};
// 更新多边形路径的兼容性函数
const updatePolygonPath = (polygon, points, zoneData) => {
  try {
    // 尝试使用 setPath 方法
    if (typeof polygon.setPath === "function") {
      polygon.setPath(points.map((p) => [p.lng, p.lat]));
      return;
    }

    // 如果以上方法都不可用，重新创建多边形
    console.warn("未找到多边形更新方法，重新创建多边形");

    // 从地图移除旧的多边形
    if (polygon && map) {
      try {
        map.remove(polygon);
      } catch (e) {
        console.error("移除多边形失败:", e);
      }
    }

    // 创建新的多边形
    const newPolygon = new AMap.Polygon({
      path: points.map((p) => [p.lng, p.lat]),
      strokeColor: "#ff9800",
      strokeWeight: zoneData.borderWeight + 1,
      fillColor: zoneData.fillColor,
      fillOpacity: zoneData.fillOpacity,
    });

    // 设置属性
    newPolygon._isNoFlyZone = true;
    newPolygon._zoneId = zoneData.id;
    newPolygon._zoneData = zoneData;
    newPolygon._isEditable = true;

    // 添加到地图
    map.add(newPolygon);

    // 更新引用
    if (currentZoneShape.value && currentZoneShape.value.shape === polygon) {
      currentZoneShape.value.shape = newPolygon;
    }
  } catch (error) {
    console.error("更新多边形路径失败:", error);
    ElMessage.error("更新多边形失败，请重试");
  }
};
// 创建编辑图标
const createEditIcon = (color = "#ff9800") => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
      <circle cx="8" cy="8" r="6" fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="8" cy="8" r="3" fill="#fff"/>
    </svg>
  `;
  return new AMap.Icon({
    size: new AMap.Size(16, 16),
    image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    imageSize: new AMap.Size(16, 16),
  });
};

// 计算多边形面积（平方公里）
const calculatePolygonArea = (points) => {
  if (points.length < 3) return 0;

  let area = 0;
  const R = 6371000; // 地球半径，单位米

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = (points[i].lng * Math.PI) / 180;
    const yi = (points[i].lat * Math.PI) / 180;
    const xj = (points[j].lng * Math.PI) / 180;
    const yj = (points[j].lat * Math.PI) / 180;

    area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }

  area = Math.abs((area * R * R) / 2);
  return area / 1000000; // 转换为平方公里
};

// 收起航线/禁飞区
const handleRouteRetract = () => {
  retractRoute();
};

const retractRoute = () => {
  console.log("收起航线/禁飞区");
  activeRouteId.value = null;
  editingZoneId.value = null;
  isZoneEditing.value = false;
  clearAllOverlays();
  ElMessage.success("已收起");
};

// 鼠标悬浮提示
const showImgTooltip = ref(false);
const tooltipTile = ref("");

// 禁飞区功能
const regionalManagementDialog = () => {
  noFlyZoneToolbar.value = !noFlyZoneToolbar.value;
};

// 处理禁飞区保存事件
const handleZoneSaved = () => {
  // 刷新禁飞区列表
  if (routeListRef.value) {
    routeListRef.value.routeList();
  }
};

// 监听 NoFlyZoneManager 挂载完成
watch(noFlyZoneManagerRef, (newVal) => {
  if (newVal) {
    isNoFlyZoneManagerMounted.value = true;
    console.log("NoFlyZoneManager 已挂载");
  }
});

// 初始化
onMounted(async () => {
  initMap();

  // 去掉父级继承的padding
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.add("current-page-no-padding");
  }
});

onBeforeUnmount(() => {
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.remove("current-page-no-padding");
  }

  if (map) {
    map.off("zoomend", handleMapZoom);
  }

  try {
    if (map) {
      map.clearMap();
    }

    if (map) {
      map = null;
    }

    // loading.value = false;
  } catch (error) {
    console.error("清理资源失败:", error);
  }

  map = null;
});
</script>

<style scoped>
/* 新增样式 - 优化定位逻辑 */
.panel-header {
  position: relative;
}

/* 响应式调整 - 确保不同屏幕下的位置一致性 */
@media (max-width: 1200px) {
  .floating-panel {
    width: 320px;
  }
}

@media (max-width: 1000px) {
  .floating-panel {
    width: 300px;
  }
}

@media (max-width: 800px) {
  .floating-panel {
    width: 280px;
  }
}

.demo-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
  position: relative;
}

.header {
  padding: 16px 24px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  color: #303133;
  font-weight: 600;
}

.main-content {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
}

/* 浮动面板样式 */
.floating-panel {
  position: absolute;
  z-index: 1000;
  width: 360px;
  height: 100%;
}

/* 航线列表滚动容器 */
.route-list-container {
  height: calc(100% - 128px);
  overflow-y: auto;
  padding-right: 6px;
}

/* 美化滚动条样式 */
.route-list-container::-webkit-scrollbar {
  width: 6px;
}

.route-list-container::-webkit-scrollbar-track {
  background: rgba(80, 80, 80, 0.1);
  border-radius: 3px;
}

.route-list-container::-webkit-scrollbar-thumb {
  background: rgba(88, 130, 179, 0.5);
  border-radius: 3px;
}

.route-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(88, 130, 179, 0.8);
}

.el-pagination {
  justify-content: left !important;
  overflow-x: scroll;
  margin-top: 10px;
  background: #2e3649db;
  padding: 12px 8px 8px !important;
  border-radius: 12px 12px 0 0;
}

/* 美化滚动条样式 */
.el-pagination::-webkit-scrollbar {
  width: 4px;
  height: 6px;
}

.el-pagination::-webkit-scrollbar-track {
  background: rgba(80, 80, 80, 0.1);
  border-radius: 3px;
}

.el-pagination::-webkit-scrollbar-thumb {
  background: rgba(88, 130, 179, 0.5);
  border-radius: 3px;
}

.el-pagination::-webkit-scrollbar-thumb:hover {
  background: rgba(88, 130, 179, 0.8);
}

:deep(.el-pagination__classifier) {
  color: #fff;
}

:deep(.el-pagination .el-select__wrapper),
:deep(.el-pagination .btn-prev),
:deep(.el-pager li),
:deep(.el-pagination button),
:deep(.el-input__wrapper) {
  background: none;
}

:deep(.el-pager li.is-active, .el-pager li:hover) {
  color: #409eff;
}

:deep(.el-pagination > .is-first),
:deep(.el-pagination > .is-last),
:deep(.el-pagination .el-select__placeholder),
:deep(.el-pagination > .el-icon svg),
:deep(.el-pager li),
:deep(.el-pagination .el-input__inner),
:deep(.el-pagination button) {
  color: #fff;
}

.pagination .control-btn {
  height: 32px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 4px;
  transition: all 0.3s ease;
  margin: 0;
  background: #2c3d45;
  color: #fff;
}

.control-btn.emergency {
  margin-top: 12px;
  grid-column: span 2;
  height: 32px;
  background: #2c3d45;
  width: 100%;
  color: #fff;
}

.control-card {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.routeOperation {
  background-color: #2e3649db;
  color: #fff;
  margin-bottom: 12px;
  padding: 16px 8px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.routeOperation-box {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  width: 100%;
}

.tooltip-container {
  position: relative;
  display: inline-block;
}

.truncated-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  cursor: pointer;
}

.tooltip-text {
  position: absolute;
  top: 100%;
  left: 0;
  background: #333;
  color: #fff;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: normal;
  width: 200px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s;
  z-index: 10;
  text-align: center;
}

.tooltip-container:hover .tooltip-text {
  opacity: 1;
  visibility: visible;
}

.routeOperation-box-view {
  color: #7db164;
  cursor: pointer;
  margin-right: 6px;
}
.routeOperation-box-foldUp {
  color: rgb(255 255 255 / 34%);
  cursor: pointer;
  margin-right: 6px;
}

.routeInformation {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(88 130 179) rgba(80, 80, 80, 0.4);
  margin-top: 16px;
}

.routeInformation-list {
  display: flex;
  justify-content: space-between;
  background-color: #50505066;
  padding: 12px;
  margin-top: 16px;
}

.routeInformation-list:first-child {
  margin-top: 0;
}

.routeInformation-list-edit {
  color: #1677ff;
  cursor: pointer;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  height: 55px;
}

.control-group {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* 按钮容器使用弹性布局 */
.button-group-container {
  display: flex;
  width: 100%;
  gap: 4px;
}

/* 按钮自适应样式 */
.button-group-container :deep(.el-button) {
  flex: 1;
  min-width: 60px;
  padding: clamp(4px, 2vw, 8px);
  font-size: clamp(12px, 1.5vw, 14px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 图标与文字间距优化 */
.button-group-container :deep(.el-button .el-icon) {
  margin-right: 2px;
  font-size: clamp(12px, 1.5vw, 14px);
}

.control-group:last-child {
  border-bottom: none;
}

.group-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clear-button {
  width: 100%;
  margin-top: 8px;
}

.save-button {
  margin-top: 12px;
  width: 100%;
}

/* 滚动条样式 */
.floating-panel::-webkit-scrollbar {
  width: 6px;
}

.floating-panel::-webkit-scrollbar-track {
  background: transparent;
}

.floating-panel::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

.floating-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.5);
}

:deep(.el-card) {
  border: none;
}

:deep(.el-button-group) {
  gap: 8px;
  display: flex;
  flex-wrap: wrap;
}

:deep(.route-search .el-input__wrapper) {
  background-color: #2e3649db;
}

:deep(.route-search .el-input__inner) {
  color: #fff;
}

.el-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}

.el-radio-group {
  display: flex;
  gap: 20px;
}

:deep(.el-form-item__label) {
  justify-content: start;
}

:deep(.tdt-div-icon) {
  border: none;
  background: none;
  width: 26px !important;
  height: 26px !important;
  margin-left: -13px !important;
  margin-top: -13px !important;
}

:deep(.save-route .el-form-item__label) {
  width: 60px !important;
}

:deep(.save-route .el-form-item__content) {
  margin-right: 12px !important;
}

.operation-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.add-btn {
  background-color: #409eff;
  color: white;
}

.add-btn:hover {
  background-color: #66b1ff;
}

.delete-btn {
  background-color: #f56c6c;
  color: white;
}

.delete-btn:hover {
  background-color: #f78989;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 在子组件的样式中添加 */
.map-container,
.map-wrapper {
  width: 100% !important;
  overflow: hidden !important;
}

:deep(.el-card__header) {
  padding: 0px 20px;
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

.danger {
  background-color: #ff5252;
  color: white;
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

.no-fly-tooltip .tooltip-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.no-fly-tooltip .tooltip-title {
  font-weight: 600;
  color: #e74c3c;
  font-size: 15px;
}
.no-fly-tooltip .tooltip-content {
  font-size: 13px;
  line-height: 1.8;
  color: #333;
}
.no-fly-tooltip .label {
  color: #666;
  margin-right: 6px;
  display: inline-block;
  width: 50px;
}
/* 防止浮层超出视口 */
.no-fly-tooltip {
  max-width: 300px;
  word-wrap: break-word;
}

/* 超小屏幕下的极限适配 */
@media screen and (max-width: 800px) {
  .tooltip-container {
    width: 65%;
  }

  /* 隐藏原文字 */
  .routeOperation-box-view,
  .routeOperation-box-foldUp {
    font-size: 0;
    display: inline-block;
    width: 20px;
    text-align: center;
  }

  /* 分别设置简化文字 */
  .routeOperation-box-view::after {
    content: "查";
    font-size: 16px;
  }
  .routeOperation-box-foldUp::after {
    content: "收";
    font-size: 16px;
  }
}
:deep(.el-card__body) {
  height: calc(100% - 40px);
}

/* 添加编辑模式的样式 */
.editing-zone {
  animation: pulse-border 2s infinite;
  cursor: move;
}

@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
    border-width: 3px;
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 152, 0, 0);
    border-width: 2px;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
    border-width: 3px;
  }
}

/* 编辑图标的样式 */
.edit-marker {
  cursor: move;
  z-index: 1000;
}

.edit-marker:hover {
  transform: scale(1.2);
  transition: transform 0.2s;
}
</style>
