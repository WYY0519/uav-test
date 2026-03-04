<template>
  <div class="demo-container">
    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 地图容器 -->
      <div class="map-container">
        <div ref="mapContainer" class="map-wrapper">
          <!-- 加载中遮罩 -->
          <div v-if="loading" class="loading-mask">
            <el-spin size="large">加载中...</el-spin>
          </div>
        </div>
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
import noFlyZone from "../../assets/禁飞区.png";
import RouteList from "./components/gisDome/RouteList.vue";
import NoFlyZoneManager from "./components/gisDome/NoFlyZoneManager.vue";

// 状态变量
const mapContainer = ref(null);
const loading = ref(true);

// 地图相关
let map = null;
let noFlyZonesLayer = null;

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

// 面板控制
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
  ElMessage.success(isPanelCollapsed.value ? "面板已收起" : "面板已展开");
};

// 地图初始化
const initMap = () => {
  if (!window.T) {
    ElMessage.error("天地图API未加载，请检查网络连接");
    loading.value = false;
    return;
  }

  try {
    map = new T.Map(mapContainer.value);
    const TIANDITU_KEY = "0c09d0cbd8da28e0f79cfc1627c23fd4";

    map.addEventListener("load", () => {
      loading.value = false;
      map.checkResize();
      ElMessage.success("地图加载成功");
      map.addEventListener("zoomend", handleMapZoom);
    });

    map.addEventListener("error", (e) => {
      console.error("地图加载错误:", e);
      loading.value = false;
      ElMessage.error("地图加载失败，请刷新页面重试");
    });

    const defaultLng = 113.65644;
    const defaultLat = 34.78723;
    map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 15);

    const layer = new T.TileLayer("img_w", {
      zIndex: 1,
      token: TIANDITU_KEY,
    });
    map.addLayer(layer);

    map.addControl(new T.Control.MapType());
    map.addControl(new T.Control.Scale());
    map.setMapType(TMAP_HYBRID_MAP);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.centerAndZoom(new T.LngLat(lng, lat), 15);
        },
        (err) => {
          console.warn("定位失败:", err);
          ElMessage.warning("请授予位置权限，否则无法获取当前位置");
        },
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    loading.value = false;
    ElMessage.error("地图初始化失败，请检查配置");
  }
};

const handleMapZoom = () => {
  if (map && typeof map.checkResize === "function") {
    setTimeout(() => {
      map.checkResize();
    }, 300);
  }
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
      map.addOverLay(shape);

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
      map.removeOverLay(marker);
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

  const centerLngLat = new T.LngLat(center.lng, center.lat);

  // 计算合适的缩放级别
  const zoomLevel = calculateZoomLevelByRadius(radius);

  // 平滑移动和缩放
  map.panTo(centerLngLat);

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
const jumpToPolygonZone = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return;

  // 计算多边形的边界
  const bounds = new T.LngLatBounds();

  coordinates.forEach((point) => {
    bounds.extend(new T.LngLat(point.lng, point.lat));
  });

  // 计算多边形中心
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const centerLng = (southWest.lng + northEast.lng) / 2;
  const centerLat = (southWest.lat + northEast.lat) / 2;

  // 先移动到中心
  map.panTo(new T.LngLat(centerLng, centerLat));

  // 延迟设置合适视图范围
  setTimeout(() => {
    // 增加padding，让禁飞区不贴边显示
    map.setViewport(bounds, {
      padding: [50, 50], // 左右和上下各增加50像素的边距
    });
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
    coordinates: [], // 最终给地图的格式：[{lng: 经度, lat: 纬度}]
    borderColor: zoneData.borderColor || "#e74c3c",
    borderWeight: zoneData.borderWeight || 2,
    fillColor: zoneData.fillColor || "#e74c3c",
    fillOpacity: zoneData.fillOpacity || 0.3,
    area: zoneData.area || 0,
    radius: 0, // 圆形半径兜底初始化
  };

  // 【新增】如果 coordinates 是字符串，先解析为数组
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

  // 兼容多种格式：[[[lng,lat],[lng,lat]...]] 或 [[[lat,lng],[lat,lng]...]]
  if (
    coordinatesToParse &&
    Array.isArray(coordinatesToParse) &&
    coordinatesToParse.length > 0 &&
    Array.isArray(coordinatesToParse[0]) &&
    coordinatesToParse[0].length > 0
  ) {
    console.log("检测到数组格式，开始解析...");
    const secondLayer = coordinatesToParse[0]; // 第二层：[[lng,lat], [lng,lat], ...]
    console.log("第二层数据:", JSON.stringify(secondLayer));
    const validPoints = [];

    // 遍历第二层，解析每个点
    secondLayer.forEach((point, index) => {
      if (Array.isArray(point) && point.length >= 2) {
        const val0 = Number(point[0]);
        const val1 = Number(point[1]);

        // 判断是 [lat,lng] 还是 [lng,lat] 格式
        // 根据数值范围判断：lat 在 -90~90 之间，lng 在 -180~180 之间
        let lat, lng;
        if (Math.abs(val0) <= 90 && Math.abs(val1) <= 90) {
          // 两个都在 -90~90 之间，可能是 [lat, lng]
          lat = val0;
          lng = val1;
          console.log(
            `解析点${index}: [lat,lng]格式 [${val0}, ${val1}] -> lat=${lat}, lng=${lng}`,
          );
        } else if (Math.abs(val0) <= 180 && Math.abs(val1) <= 90) {
          // 第一个在 -180~180，第二个在 -90~90，是 [lng, lat]
          lng = val0;
          lat = val1;
          console.log(
            `解析点${index}: [lng,lat]格式 [${val0}, ${val1}] -> lat=${lat}, lng=${lng}`,
          );
        } else {
          // 无法确定，默认按 [lng, lat] 处理
          lng = val0;
          lat = val1;
          console.log(
            `解析点${index}: 无法确定格式，按[lng,lat]处理 [${val0}, ${val1}] -> lat=${lat}, lng=${lng}`,
          );
        }

        // 验证经纬度有效性
        if (
          !isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          validPoints.push({ lng: lng, lat: lat }); // 转地图需要的{lng, lat}格式
        } else {
          console.warn(`点${index}坐标无效: lat=${lat}, lng=${lng}`);
        }
      } else {
        console.warn(`点${index}格式错误:`, point);
      }
    });

    // 根据形状过滤有效点数
    if (zoneData.shape === "circle") {
      // 圆形：取第一个有效点作为圆心
      result.coordinates =
        validPoints.length > 0
          ? [validPoints[0]]
          : [{ lng: 113.65644, lat: 34.78723 }];
      console.log("圆形数组解析成功:", result.coordinates);
    } else {
      // 多边形：保留所有有效点（至少3个才有效）
      result.coordinates = validPoints.length >= 3 ? validPoints : [];
      console.log(
        `多边形数组解析: 原始${secondLayer.length}个点，有效${validPoints.length}个点`,
        result.coordinates,
      );
    }
  }
  // 兼容【旧格式】：{lng: 经度, lat: 纬度}对象数组（字符串格式）
  else if (
    typeof zoneData.coordinates === "string" &&
    zoneData.coordinates.includes('"lng"') &&
    zoneData.coordinates.includes('"lat"')
  ) {
    console.log("检测到对象数组格式的字符串坐标，正在解析...");
    try {
      // 解析字符串中的对象数组
      const objectArrayStr = `[${zoneData.coordinates}]`;
      const objectArray = JSON.parse(objectArrayStr);
      console.log("解析后的对象数组:", objectArray);

      if (Array.isArray(objectArray) && objectArray.length > 0) {
        result.coordinates = objectArray
          .filter(
            (point) =>
              point &&
              typeof point === "object" &&
              !isNaN(Number(point.lng)) &&
              !isNaN(Number(point.lat)),
          )
          .map((point) => ({
            lng: Number(point.lng),
            lat: Number(point.lat),
          }));

        console.log(
          `对象数组解析完成: 原始${objectArray.length}个点，有效${result.coordinates.length}个点`,
          result.coordinates,
        );
      }
    } catch (e) {
      console.error("解析对象数组坐标失败:", e);
    }
  }
  // 兼容【旧格式】：{lng: 经度, lat: 纬度}对象数组（已解析为数组）
  else if (
    coordinatesToParse &&
    Array.isArray(coordinatesToParse) &&
    coordinatesToParse.length > 0 &&
    typeof coordinatesToParse[0] === "object" &&
    coordinatesToParse[0].lng &&
    coordinatesToParse[0].lat
  ) {
    console.log("检测到旧格式坐标对象数组（已解析）");
    result.coordinates = coordinatesToParse
      .filter((point) => !isNaN(Number(point.lng)) && !isNaN(Number(point.lat)))
      .map((point) => ({
        lng: Number(point.lng),
        lat: Number(point.lat),
      }));
    console.log("对象数组解析完成:", result.coordinates);
  }
  // 兜底：从rawData解析
  else if (zoneData.rawData && zoneData.rawData.coordinates) {
    console.log("尝试从 rawData 解析坐标...");
    try {
      let rawCoords = zoneData.rawData.coordinates;
      // 如果 rawData.coordinates 也是字符串，先解析
      if (typeof rawCoords === "string") {
        rawCoords = JSON.parse(rawCoords);
      }

      if (Array.isArray(rawCoords[0]) && Array.isArray(rawCoords[0][0])) {
        const validPoints = [];
        rawCoords[0].forEach((point) => {
          if (Array.isArray(point) && point.length >= 2) {
            const lat = Number(point[0]);
            const lng = Number(point[1]);
            if (!isNaN(lat) && !isNaN(lng)) validPoints.push({ lng, lat });
          }
        });
        result.coordinates =
          zoneData.shape === "circle"
            ? validPoints.length > 0
              ? [validPoints[0]]
              : [{ lng: 113.65644, lat: 34.78723 }]
            : validPoints.length >= 3
              ? validPoints
              : [];
      }
    } catch (e) {
      console.error("从rawData解析坐标失败:", e);
    }
  }

  // 最终兜底：解析失败/点数不足时，使用警告提示
  if (result.coordinates.length === 0) {
    console.error(
      `禁飞区${zoneData.id}坐标解析失败/点数不足，无法显示`,
      zoneData.coordinates,
    );
    ElMessage.error(
      `【${zoneData.name || "未命名禁飞区"}】多边形坐标数据无效或点数不足，无法显示`,
    );
    return null; // 返回null，由调用方处理错误
  }

  // 圆形专属：半径兜底（不变）
  if (result.type === "circle") {
    if (zoneData.radius && !isNaN(zoneData.radius) && zoneData.radius > 0) {
      result.radius = Number(zoneData.radius);
    } else if (result.area > 0) {
      const areaSquareM = result.area * 1000000;
      result.radius = Math.sqrt(areaSquareM / Math.PI);
    } else {
      result.radius = 100;
    }
    console.log(
      "圆形禁飞区解析完成：中心",
      result.coordinates[0],
      "半径",
      result.radius,
      "米",
    );
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
      // 圆形逻辑不变，保留原代码
      const center = zoneData.coordinates[0];
      const centerLngLat = new T.LngLat(center.lng, center.lat);
      const circle = new T.Circle(centerLngLat, zoneData.radius, {
        color: zoneData.borderColor,
        weight: zoneData.borderWeight,
        fillColor: zoneData.fillColor,
        fillOpacity: zoneData.fillOpacity,
      });
      circle._isNoFlyZone = true;
      circle._zoneId = zoneData.id;
      circle._zoneData = zoneData;
      return circle;
    } else if (zoneData.coordinates && zoneData.coordinates.length >= 3) {
      // 多边形：新增点数≥3校验（核心！）
      const points = zoneData.coordinates.map(
        (point) => new T.LngLat(point.lng, point.lat),
      );
      const polygon = new T.Polygon([points], {
        color: zoneData.borderColor,
        weight: zoneData.borderWeight,
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

  return new T.LngLat(center.lng + deltaLng, center.lat + deltaLat);
};
// 创建可编辑的圆形
// 首先，更新 createEditableCircle 函数
const createEditableCircle = (zoneData) => {
  const center = zoneData.coordinates[0];
  const centerLngLat = new T.LngLat(center.lng, center.lat);
  const initialRadius = zoneData.radius; // 保存初始半径

  // 创建圆形
  const circle = new T.Circle(centerLngLat, initialRadius, {
    color: "#ff9800", // 编辑模式下使用橙色
    weight: zoneData.borderWeight + 1,
    fillColor: zoneData.fillColor,
    fillOpacity: zoneData.fillOpacity,
  });

  circle._isNoFlyZone = true;
  circle._zoneId = zoneData.id;
  circle._zoneData = zoneData;
  circle._isEditable = true;

  // 添加圆心标记点（可拖拽）
  const centerMarker = new T.Marker(centerLngLat, {
    icon: createEditIcon("#ff9800"),
    draggable: true,
    raiseOnDrag: true,
  });

  // 添加半径控制点（可拖拽）- 使用初始半径
  const radiusPointLngLat = calculateRadiusPoint(centerLngLat, initialRadius);
  const radiusMarker = new T.Marker(radiusPointLngLat, {
    icon: createEditIcon("#ff9800"),
    draggable: true,
    raiseOnDrag: true,
  });

  // 保存初始半径，确保拖动圆心时半径不变
  let currentRadius = initialRadius;

  // 圆心标记点拖拽事件 - 只移动位置，不改变半径
  centerMarker.addEventListener("dragstart", function (e) {
    if (!e || !e.lnglat) return;

    // 保存拖拽开始时的位置
    this._dragStartPos = e.lnglat;
    this._radiusMarkerStartPos = radiusMarker.getLngLat();

    console.log(`圆心拖拽开始: 半径=${currentRadius}米`);
  });

  centerMarker.addEventListener("drag", function (e) {
    if (!e || !e.lnglat) return;

    const currentPos = e.lnglat;

    // 计算偏移量
    const offsetLng =
      currentPos.lng - (this._dragStartPos?.lng || currentPos.lng);
    const offsetLat =
      currentPos.lat - (this._dragStartPos?.lat || currentPos.lat);

    // 更新圆心位置
    try {
      circle.setCenter(currentPos);
    } catch (err) {
      console.error("更新圆心位置失败:", err);
    }

    // 更新半径控制点位置 - 跟随圆心一起移动，保持相同的偏移量
    if (this._radiusMarkerStartPos) {
      try {
        const newRadiusPos = new T.LngLat(
          this._radiusMarkerStartPos.lng + offsetLng,
          this._radiusMarkerStartPos.lat + offsetLat,
        );
        radiusMarker.setLngLat(newRadiusPos);
      } catch (err) {
        console.error("更新半径控制点位置失败:", err);
      }
    }
  });

  centerMarker.addEventListener("dragend", function (e) {
    if (!e || !e.lnglat) return;
    const newCenterPos = e.lnglat;

    try {
      circle.setCenter(newCenterPos);
      centerMarker.setLngLat(newCenterPos);
      // 重新计算半径控制点
      const newRadiusPoint = calculateRadiusPoint(newCenterPos, currentRadius);
      radiusMarker.setLngLat(newRadiusPoint);

      // 调用正确的函数名（updateZoneDataOnEdit）
      updateZoneDataOnEdit(zoneData.id, {
        coordinates: [[[newCenterPos.getLat(), newCenterPos.getLng()]]],
        radius: currentRadius,
        area: (Math.PI * currentRadius * currentRadius) / 1000000,
      });

      console.log(
        `圆心已移动: 三维坐标=[[[${newCenterPos.getLat()},${newCenterPos.getLng()}]]]`,
      );
    } catch (err) {
      console.error("圆心拖拽结束处理失败:", err);
    }
    delete this._dragStartPos;
    delete this._radiusMarkerStartPos;
  });

  // 半径控制点拖拽事件 - 只改变半径，不改变圆心位置
  radiusMarker.addEventListener("dragstart", function (e) {
    // 保存拖拽开始时的圆心位置
    this._centerPos = centerMarker.getLngLat();
    this._initialRadius = currentRadius; // 使用当前的半径
  });

  radiusMarker.addEventListener("drag", function (e) {
    if (!e || !e.lnglat) return;

    const radiusPoint = e.lnglat;
    const centerPoint = this._centerPos || centerMarker.getLngLat();

    // 确保坐标有效
    if (!centerPoint || !radiusPoint) return;

    try {
      // 计算新半径
      const newRadius = calculateDistance(centerPoint, radiusPoint);

      // 确保半径有效
      if (newRadius > 0) {
        // 更新当前半径
        currentRadius = newRadius;

        // 更新圆形半径 - 实时更新边界
        circle.setRadius(newRadius);

        // 计算新面积
        const newArea = (Math.PI * newRadius * newRadius) / 1000000;

        // 在拖拽过程中实时更新数据（避免频繁更新）
        if (!this._lastUpdateTime || Date.now() - this._lastUpdateTime > 100) {
          this._lastUpdateTime = Date.now();

          // 调用正确的函数名
          updateZoneDataOnEdit(zoneData.id, {
            radius: newRadius,
            area: newArea,
          });
        }
      }
    } catch (err) {
      console.error("半径拖拽过程中更新失败:", err);
    }
  });

  radiusMarker.addEventListener("dragend", function (e) {
    if (!e || !e.lnglat) return;

    const radiusPoint = e.lnglat;
    const centerPoint = centerMarker.getLngLat();

    try {
      // 计算最终半径
      const finalRadius = calculateDistance(centerPoint, radiusPoint);

      if (finalRadius > 0) {
        // 更新当前半径
        currentRadius = finalRadius;

        // 更新圆形半径
        circle.setRadius(finalRadius);

        // 计算最终面积
        const finalArea = (Math.PI * finalRadius * finalRadius) / 1000000;

        // 调用正确的函数名
        updateZoneDataOnEdit(zoneData.id, {
          radius: finalRadius,
          area: finalArea,
        });

        console.log(
          `圆形半径已更新: ${finalRadius.toFixed(2)}米, 面积: ${finalArea.toFixed(4)}平方公里`,
        );
      }
    } catch (err) {
      console.error("半径拖拽结束处理失败:", err);
    }

    // 清理临时数据
    delete this._centerPos;
    delete this._initialRadius;
    delete this._lastUpdateTime;
  });

  // 添加到地图
  map.addOverLay(circle);
  map.addOverLay(centerMarker);
  map.addOverLay(radiusMarker);

  // 保存引用
  currentZoneShape.value = {
    shape: circle,
    markers: [centerMarker, radiusMarker],
    type: "circle",
    zoneId: zoneData.id,
    currentRadius: currentRadius, // 保存当前半径
  };

  // 添加初始调试信息
  console.log(
    `圆形编辑模式已启动: 圆心(${centerLngLat.lng}, ${centerLngLat.lat}), 半径${currentRadius}米`,
  );
  console.log(
    `半径控制点位置: (${radiusPointLngLat.lng}, ${radiusPointLngLat.lat})`,
  );

  return circle;
};

// 添加一个高亮可编辑圆形的方法
const highlightEditableCircle = (circle) => {
  // 添加脉动动画效果
  let pulseCount = 0;
  const pulseInterval = setInterval(() => {
    if (pulseCount >= 3) {
      clearInterval(pulseInterval);
      return;
    }

    try {
      // 临时改变边框颜色和宽度
      const originalColor = circle.getOptions().color || "#ff9800";
      const originalWeight = circle.getOptions().weight || 3;

      // 脉动效果
      circle.setStyle({
        color: "#ff0000",
        weight: originalWeight + 2,
      });

      setTimeout(() => {
        circle.setStyle({
          color: originalColor,
          weight: originalWeight,
        });
      }, 300);

      pulseCount++;
    } catch (err) {
      console.error("脉动动画失败:", err);
      clearInterval(pulseInterval);
    }
  }, 600);

  // 保存动画ID以便清理
  if (currentZoneShape.value) {
    currentZoneShape.value.pulseInterval = pulseInterval;
  }
};

// 清除所有覆盖物
const clearAllOverlays = () => {
  if (!map) return;

  // 清理动画
  if (currentZoneShape.value && currentZoneShape.value.pulseInterval) {
    clearInterval(currentZoneShape.value.pulseInterval);
  }

  const overlays = map.getOverlays();
  console.log("清除覆盖物，总数:", overlays.length);

  // 清除所有覆盖物
  overlays.forEach((overlay) => {
    map.removeOverLay(overlay);
  });

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

  const points = zoneData.coordinates.map(
    (point) => new T.LngLat(point.lng, point.lat),
  );

  // 创建多边形（原逻辑不变）
  let polygon = new T.Polygon([points], {
    color: "#ff9800", // 编辑模式下使用橙色
    weight: zoneData.borderWeight + 1,
    fillColor: zoneData.fillColor,
    fillOpacity: zoneData.fillOpacity,
  });

  polygon._isNoFlyZone = true;
  polygon._zoneId = zoneData.id;
  polygon._zoneData = zoneData;
  polygon._isEditable = true;

  // 添加顶点标记点（可拖拽，原逻辑不变）
  const vertexMarkers = points.map((point, index) => {
    const marker = new T.Marker(point, {
      icon: createEditIcon("#ff9800"),
      draggable: true,
      raiseOnDrag: true,
    });
    marker.addEventListener("dragend", (e) => {
      const newPoint = e.lnglat;
      marker.setLngLat(newPoint);
      const newPoints = [...points];
      newPoints[index] = newPoint;
      updatePolygonPath(polygon, newPoints, zoneData);
      points[index] = newPoint;
      const newArea = calculatePolygonArea(newPoints);
      // 转换为三层数组格式 [[[lat, lng], [lat, lng], ...]]
      const newCoordinates = [newPoints.map((p) => [p.lat, p.lng])];
      updateZoneDataOnEdit(zoneData.id, {
        coordinates: newCoordinates,
        area: newArea,
      });
    });
    map.addOverLay(marker);
    return marker;
  });

  // 添加到地图
  map.addOverLay(polygon);

  // 保存引用
  currentZoneShape.value = {
    shape: polygon,
    markers: vertexMarkers,
    type: "polygon",
    zoneId: zoneData.id,
    points: points,
  };

  console.log(`可编辑多边形创建成功：${points.length}个顶点，已添加拖拽标记`);
  return polygon;
};
// 更新多边形路径的兼容性函数
const updatePolygonPath = (polygon, points, zoneData) => {
  try {
    // 尝试使用 setLngLats 方法
    if (typeof polygon.setLngLats === "function") {
      polygon.setLngLats([points]);
      return;
    }

    // 尝试使用 setPath 方法
    if (typeof polygon.setPath === "function") {
      polygon.setPath([points]);
      return;
    }

    // 尝试使用 setPoints 方法
    if (typeof polygon.setPoints === "function") {
      polygon.setPoints(points);
      return;
    }

    // 如果以上方法都不可用，重新创建多边形
    console.warn("未找到多边形更新方法，重新创建多边形");

    // 从地图移除旧的多边形
    if (polygon && map) {
      try {
        map.removeOverLay(polygon);
      } catch (e) {
        console.error("移除多边形失败:", e);
      }
    }

    // 创建新的多边形
    const newPolygon = new T.Polygon([points], {
      color: "#ff9800",
      weight: zoneData.borderWeight + 1,
      fillColor: zoneData.fillColor,
      fillOpacity: zoneData.fillOpacity,
    });

    // 设置属性
    newPolygon._isNoFlyZone = true;
    newPolygon._zoneId = zoneData.id;
    newPolygon._zoneData = zoneData;
    newPolygon._isEditable = true;

    // 添加到地图
    map.addOverLay(newPolygon);

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
  return new T.Icon({
    iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    iconSize: new T.Point(16, 16),
    iconAnchor: new T.Point(8, 8),
  });
};

// 计算半径控制点位置（默认在正东方向）
const calculateRadiusPoint = (center, radius) => {
  try {
    if (!center || radius === undefined || radius === null) {
      console.warn("计算半径点: 缺少中心点或半径");
      // 返回一个默认的点（正东方向，经度增加）
      return new T.LngLat(center.lng + 0.001, center.lat);
    }

    // 如果半径很小，使用简单的偏移
    if (radius < 100) {
      // 小半径：每100米大约0.001度（近似值）
      const offset = radius / 100000; // 简化计算
      return new T.LngLat(center.lng + offset, center.lat);
    }

    // 使用更精确的球面几何计算
    const earthRadius = 6371000; // 地球半径，单位米

    // 将半径转换为弧度
    const angularDistance = radius / earthRadius;

    // 中心点的弧度
    const latRad = (center.lat * Math.PI) / 180;
    const lngRad = (center.lng * Math.PI) / 180;

    // 计算新点的纬度（在正东方向，纬度不变）
    const newLatRad = latRad;

    // 计算新点的经度
    // 在正东方向，纬度不变，经度增加
    const newLngRad = lngRad + angularDistance / Math.cos(latRad);

    // 转换回角度
    const newLat = (newLatRad * 180) / Math.PI;
    const newLng = (newLngRad * 180) / Math.PI;

    const radiusPoint = new T.LngLat(newLng, newLat);

    // 验证结果
    if (
      !radiusPoint.lng ||
      !radiusPoint.lat ||
      isNaN(radiusPoint.lng) ||
      isNaN(radiusPoint.lat)
    ) {
      console.warn("计算出的半径点无效，使用默认值");
      return new T.LngLat(center.lng + 0.001, center.lat);
    }

    return radiusPoint;
  } catch (error) {
    console.error("计算半径点失败:", error);
    // 返回一个默认的偏移点
    return new T.LngLat(center.lng + 0.001, center.lat);
  }
};

// 计算两点之间的距离（米）
const calculateDistance = (point1, point2) => {
  try {
    // 确保输入存在
    if (!point1 || !point2) {
      console.warn("计算距离时传入无效的点");
      return 0;
    }

    // 安全地获取经纬度
    const getLng = (point) => {
      if (!point) return 0;
      if (typeof point.lng === "number") return point.lng;
      if (typeof point.getLng === "function") {
        try {
          return point.getLng();
        } catch {
          return 0;
        }
      }
      if (typeof point.x === "number") return point.x; // 备用属性名
      return 0;
    };

    const getLat = (point) => {
      if (!point) return 0;
      if (typeof point.lat === "number") return point.lat;
      if (typeof point.getLat === "function") {
        try {
          return point.getLat();
        } catch {
          return 0;
        }
      }
      if (typeof point.y === "number") return point.y; // 备用属性名
      return 0;
    };

    const lng1 = getLng(point1);
    const lat1 = getLat(point1);
    const lng2 = getLng(point2);
    const lat2 = getLat(point2);

    // 检查坐标是否有效
    if (lng1 === 0 && lat1 === 0) {
      console.warn("point1 坐标无效:", point1);
      return 0;
    }
    if (lng2 === 0 && lat2 === 0) {
      console.warn("point2 坐标无效:", point2);
      return 0;
    }

    // 使用 Haversine 公式计算球面距离
    const R = 6371000; // 地球半径，单位米

    // 将经纬度转换为弧度
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    // Haversine 公式
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    // 确保距离有效
    if (isNaN(distance) || !isFinite(distance)) {
      console.warn("计算出的距离无效:", { lng1, lat1, lng2, lat2 });
      return 0;
    }

    return distance;
  } catch (error) {
    console.error("计算距离时出错:", error);
    return 0;
  }
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
const handleImgMouseEnter = (value) => {
  if (value === "regionalManagement") {
    tooltipTile.value = "区域管理";
  }
  showImgTooltip.value = true;
};

const handleImgMouseLeave = () => {
  showImgTooltip.value = false;
};

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
    map.removeEventListener("zoomend", handleMapZoom);
  }

  try {
    if (map) {
      const overlays = map.getOverlays();
      overlays.forEach((overlay) => {
        map.removeOverLay(overlay);
      });
    }

    if (map) {
      map.removeEventListener("load");
      map.removeEventListener("error");
    }

    if (map) {
      map = null;
    }

    loading.value = false;
  } catch (error) {
    console.error("清理资源失败:", error);
  }

  if (map) {
    map.removeEventListener("load", () => {});
    map.removeEventListener("error", () => {});
    map = null;
  }
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

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
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
