<template>
  <div class="drone-monitor">
    <!-- 地图底层容器：承载天地图实例 -->
    <div class="map-container" ref="mapContainer"></div>

    <!-- 加载提示 -->
    <Transition name="loading-fade">
      <div v-if="isMapLoading" class="map-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">
            <span class="loading-main">地图加载中</span>
            <span class="loading-sub">正在加载瓦片数据...</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 搜索框容器：悬浮在地图左上角 -->
    <div class="search-container">
      <el-select
        v-model="queryLocation"
        placeholder="请输入地址"
        clearable
        filterable
        allow-create
        @change="handleSelectChange"
        @input="handleInput"
        :filter-method="() => true"
        class="search-select"
      >
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>
    <!-- 引入独立的天气对话框组件 -->
    <WeatherDialog
      :visible="dialogVisible"
      :position="clickPosition"
      @update:visible="dialogVisible = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { debounce } from "lodash";
// 引入坐标转换工具
import { gcj02towgs84, validateLatLng } from "@/utils/coordTransform";
//引入独立的天气对话框组件
import WeatherDialog from "../components/weatherInquiry/WeatherDialog.vue";

let droneMarker = null;
let trackPolyline = null;
const mapContainer = ref(null);
let map = null;
const DEFAULT_NJ_LNG = 118.796875;
const DEFAULT_NJ_LAT = 32.060253;
const queryLocation = ref("");
const options = ref([]);
const drawnPoints = ref([]);
const dialogVisible = ref(false);
const clickPosition = ref({
  lng: "", // 经度
  lat: "", // 纬度
});
const isMapLoading = ref(false); // 地图加载状态
let loadingTimer = null; // 加载定时器
let tilesLoadedCount = 0; // 记录瓦片加载次数
//搜索框输入事件
const handleInput = (param) => {
  let inputValue;
  if (param instanceof InputEvent) {
    inputValue = param.target.value.trim();
  } else {
    inputValue = String(param).trim();
  }
  // 更新搜索框绑定值
  queryLocation.value = inputValue;

  // 先校验是否是经纬度格式
  const latLng = validateLatLng(inputValue);
  if (latLng) {
    // 是经纬度：清空下拉选项，不调用地址接口
    options.value = [];
    return;
  }
  // 不是经纬度：触发防抖搜索方法
  debouncedSearch(inputValue);
};

//防抖搜索（500ms延迟）
const debouncedSearch = debounce((keyword) => {
  // 关键词非空且长度≥1时调用搜索接口，否则清空下拉选项
  if (keyword && keyword.length >= 1) {
    searchLocation(keyword);
  } else {
    options.value = [];
  }
}, 500);

//调用地址搜索接口
const searchLocation = async (keyword) => {
  // 转字符串并去除首尾空格
  const safeKeyword = String(keyword).trim();
  // 空关键词直接清空选项
  if (!safeKeyword) {
    options.value = [];
    return;
  }
  // 再次校验：防止防抖过程中输入经纬度
  if (validateLatLng(safeKeyword)) {
    options.value = [];
    return;
  }
  try {
    // 固定定位坐标（避免浏览器定位权限问题）
    let position;
    position = { latitude: 34.74769, longitude: 113.65337 };
    // 拼接高德输入提示接口URL
    const url = `https://digital-elevation.djigate.com/amap-proxy/e9faf6/v3/assistant/inputtips?keywords=${safeKeyword}&location=${position.longitude},${position.latitude}&language=zh-CN`;
    // 发起接口请求
    const response = await fetch(url);
    const data = await response.json();

    // 无匹配结果时提示用户并清空选项
    if (!data.tips || data.tips.length === 0) {
      ElMessage.info("未找到匹配地点");
      options.value = [];
      return;
    }

    // 过滤有效地址（必须包含location坐标）
    const validTips = data.tips.filter((item) => {
      return typeof item.location === "string" && item.location.trim() !== "";
    });

    // 无有效坐标时提示用户
    if (validTips.length === 0) {
      ElMessage.warning("未找到有效的地点坐标");
      options.value = [];
      return;
    }

    // 处理接口返回结果：转换坐标格式并构建下拉选项
    options.value = validTips.map((item) => {
      // 解析高德GCJ02坐标
      const [gcjLng, gcjLat] = item?.location?.split(",").map(Number);
      // 转换为天地图使用的WGS84坐标
      const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);

      return {
        value: item.id, // 选项值（地址ID）
        label: item.name, // 选项显示文本（地址名称）
        location: `${wgsLng},${wgsLat}`, // 转换后的WGS84坐标
        originalLocation: item.location, // 原始GCJ02坐标
      };
    });
  } catch (error) {
    // 捕获接口请求异常并打印日志
    console.error("搜索错误:", error);
  }
};

//搜索框选择/输入确认事件（兼容地址选择和经纬度输入）
const handleSelectChange = (value) => {
  // 1. 先判断是否是经纬度输入（手动输入的经纬度，value就是经纬度字符串）
  const latLng = validateLatLng(value);
  if (latLng) {
    const { lng, lat } = latLng;
    // 添加航点
    drawnPoints.value.push({ lng, lat, isFromApi: true });
    // 绘制标记
    drawSelectedMarker(lng, lat, `经纬度：${lng},${lat}`);
    // 移动地图
    if (map) {
      isMapLoading.value = true;
      tilesLoadedCount = 0;

      // 使用 panTo 平滑移动地图中心点，避免白屏
      map.panTo([lng, lat], 1000);

      // 监听移动结束事件
      const moveEndHandler = () => {
        // 延迟设置缩放级别，让动画更流畅
        setTimeout(() => {
          map.setZoom(15, false, 500);
        }, 100);
        map.off("moveend", moveEndHandler);
      };

      map.on("moveend", moveEndHandler);

      // 监听瓦片加载完成（可能触发多次）
      const tilesLoadHandler = () => {
        tilesLoadedCount++;
        console.log(`瓦片加载完成 (第${tilesLoadedCount}次)`);

        // 连续2次触发后认为加载完成（确保所有瓦片都加载完）
        if (tilesLoadedCount >= 2) {
          // isMapLoading.value = false;
          map.off("tilesload", tilesLoadHandler);
          if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
          }
        }
      };

      map.on("tilesload", tilesLoadHandler);

      // 设置最长等待时间（10秒），防止一直卡住
      loadingTimer = setTimeout(() => {
        console.log("超时隐藏加载提示");
        isMapLoading.value = false;
        loadingTimer = null;
      }, 10000);
    }
    // 移动无人机标记
    if (droneMarker) {
      droneMarker.setPosition([lng, lat]);
    }
    // 更新对话框坐标并打开
    clickPosition.value.lng = lng.toFixed(6);
    clickPosition.value.lat = lat.toFixed(6);
    dialogVisible.value = true;
    return;
  }

  // 2. 不是经纬度：处理普通地址选择逻辑
  if (!value || !options.value.length) return;
  // 根据选中的ID查找对应的地址项
  const selectedItem = options.value.find((item) => item.value === value);
  // 未找到地址项/无坐标时提示用户
  if (!selectedItem || !selectedItem.location) {
    ElMessage.warning("未找到该地点的坐标信息");
    return;
  }

  // 解析坐标为数字类型
  const [lng, lat] = selectedItem.location.split(",").map(Number);
  // 坐标格式错误时提示用户
  if (!lng || !lat) {
    ElMessage.error("坐标格式错误");
    return;
  }

  // 添加航点到数组（标记为接口获取）
  drawnPoints.value.push({ lng, lat, isFromApi: true });
  // 绘制选中位置的标记（可扩展自定义标记逻辑）
  drawSelectedMarker(lng, lat, selectedItem.label);

  // 移动地图到选中位置（增加map非空判断，避免初始化异常）
  if (map) {
    isMapLoading.value = true;
    tilesLoadedCount = 0;

    // 使用 panTo 平滑移动地图中心点，避免白屏
    map.panTo([lng, lat], 1000);

    // 监听移动结束事件
    const moveEndHandler = () => {
      // 延迟设置缩放级别，让动画更流畅
      setTimeout(() => {
        map.setZoom(15, false, 500);
      }, 100);
      map.off("moveend", moveEndHandler);
    };

    map.on("moveend", moveEndHandler);

    // 监听瓦片加载完成（可能触发多次）
    const tilesLoadHandler = () => {
      tilesLoadedCount++;
      console.log(`瓦片加载完成 (第${tilesLoadedCount}次)`);

      // 连续2次触发后认为加载完成（确保所有瓦片都加载完）
      if (tilesLoadedCount >= 2) {
        // isMapLoading.value = false;
        map.off("tilesload", tilesLoadHandler);
        if (loadingTimer) {
          clearTimeout(loadingTimer);
          loadingTimer = null;
        }
      }
    };

    map.on("tilesload", tilesLoadHandler);

    // 设置最长等待时间（10秒），防止一直卡住
    loadingTimer = setTimeout(() => {
      console.log("超时隐藏加载提示");
      isMapLoading.value = false;
      loadingTimer = null;
    }, 10000);
  }

  // 移动无人机标记到选中位置（增加非空判断，避免标记未初始化报错）
  if (droneMarker) {
    droneMarker.setPosition([lng, lat]);
  }

  // 更新对话框坐标并打开
  clickPosition.value.lng = lng.toFixed(6);
  clickPosition.value.lat = lat.toFixed(6);
  // dialogVisible.value = true;
};

//绘制选中位置的标记
const drawSelectedMarker = (lng, lat, label) => {
  // 控制台打印调试信息（可替换为实际标记绘制逻辑）
  console.log(`绘制标记：${label}，经纬度：${lng},${lat}`);
};

// 处理地图点击事件
const handleMapClick = (e) => {
  // 1. 获取点击位置的原始经纬度
  const clickLng = e.lnglat.getLng(); // 经度
  const clickLat = e.lnglat.getLat(); // 纬度

  // 2. 格式化经纬度（保留6位小数，提升可读性）
  const formatLng = clickLng.toFixed(6);
  const formatLat = clickLat.toFixed(6);

  // 3. 更新点击位置坐标，用于对话框展示
  clickPosition.value.lng = formatLng;
  clickPosition.value.lat = formatLat;

  // 4. 打开天气对话框
  dialogVisible.value = true;

  // 控制台打印调试信息
  console.log("地图点击位置经纬度：");
  console.log("经度（lng）：", formatLng);
  console.log("纬度（lat）：", formatLat);

  // 5. 移动无人机标记到点击位置（增加非空判断）
  if (droneMarker) {
    droneMarker.setLngLat(new T.LngLat(clickLng, clickLat));
  }
};

//处理地图缩放事件（放大/缩小）
const handleMapZoom = () => {
  // 地图实例存在时执行操作
  if (map) {
    // 获取并打印当前缩放级别
    const currentZoom = map.getZoom();
    console.log("地图当前缩放级别：", currentZoom);
  }
};

//处理地图拖拽结束事件
const handleMapMove = () => {
  if (map) {
    // 高德地图不需要 checkResize
  }
};

// 初始化地图实例的实际函数
const initMapInstance = () => {
  try {
    // 显示加载状态
    isMapLoading.value = true;
    tilesLoadedCount = 0;

    // 创建地图实例（使用 WebGL 渲染实现丝滑跳转）
    map = new AMap.Map(mapContainer.value, {
      zoom: 15,
      center: [DEFAULT_NJ_LNG, DEFAULT_NJ_LAT],
      viewMode: "3D", // 启用 3D 视图
      renderMode: "webgl", // 关键参数：使用 WebGL 渲染，性能大幅提升
      showLabel: true,
      pitch: 0,
      rotateEnable: false,
      pitchEnable: false,
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
    });

    console.log("使用 WebGL 渲染模式地图");

    // 创建轨迹线实例（初始化空轨迹，暂不添加到地图）
    trackPolyline = new AMap.Polyline({
      path: null,
      strokeColor: "#2C64A7",
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });
    // 暂不添加到地图，等有数据后再添加
    // map.add(trackPolyline);

    // 绑定地图交互事件
    map.on("click", handleMapClick);
    map.on("zoomend", handleMapZoom);
    map.on("moveend", handleMapMove);

    // 监听瓦片加载完成（可能触发多次）
    const tilesLoadHandler = () => {
      tilesLoadedCount++;
      console.log(`瓦片加载完成 (第${tilesLoadedCount}次)`);

      // WebGL 版本加载更快，等待1次即可
      if (tilesLoadedCount >= 1) {
        isMapLoading.value = false;
        map.off("tilesload", tilesLoadHandler);
        if (loadingTimer) {
          clearTimeout(loadingTimer);
          loadingTimer = null;
        }
      }
    };

    map.on("tilesload", tilesLoadHandler);

    // 设置最长等待时间（5秒），防止一直卡住
    loadingTimer = setTimeout(() => {
      console.log("超时隐藏加载提示");
      isMapLoading.value = false;
      loadingTimer = null;
    }, 5000);

    // 地图加载完成后提示
    map.on("complete", () => {
      console.log("地图加载完成");
      ElMessage.success("地图加载成功");
      isMapLoading.value = false;
    });
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
    isMapLoading.value = false;
  }
};

// 初始化高德地图
const initMap = () => {
  // 检查高德地图全局对象是否存在
  if (!window.AMap) {
    ElMessage.error("高德地图API未加载");
    return;
  }

  // 直接初始化地图
  initMapInstance();
};

// 组件挂载完成后执行
onMounted(() => {
  // 初始化地图
  initMap();
  // 调整页面容器样式（移除padding，让地图占满全屏）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.add("current-page-no-padding");
  }
});

// 组件卸载前执行
onBeforeUnmount(() => {
  // 清理定时器
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  // 恢复页面容器样式（移除no-padding类，恢复padding）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.remove("current-page-no-padding");
  }
});
</script>

<style scoped>
/* 主容器样式：全屏显示，相对定位（为子元素绝对定位提供参考） */
.drone-monitor {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 地图容器样式：绝对定位，占满整个主容器 */
.map-container {
  width: 100%;
  height: 100%;
  background: #eaf4ff;
  z-index: 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 搜索框容器样式：悬浮在左上角，层级高于地图 */
.search-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  width: 300px;
}

/* 搜索框样式：半透明白色背景，轻微阴影提升层次感 */
.search-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 对话框内容样式：内边距调整 */
.dialog-content {
  padding: 8px 0;
}

/* 对话框模块分区样式：底部边框分隔，间距调整 */
.section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
/* 模块标题样式：加粗，调整字号和颜色 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

/* 信息组排版：弹性布局，自动换行，间距调整 */
.info-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
/* 2列网格布局 */
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  display: grid;
}
/* 3列网格布局 */
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
  display: grid;
}

/* 信息项样式：基础字号和行高 */
.info-item {
  font-size: 14px;
  line-height: 24px;
}
/* 标签文本样式：灰色，右侧间距 */
.label {
  color: #606266;
  margin-right: 4px;
}
/* 值文本样式：深色，加粗 */
.value {
  color: #1f2d3d;
  font-weight: 500;
}
/* 数据源标注样式：小号字体，浅灰色 */
.source {
  font-size: 12px;
  color: #909399;
  margin-left: 6px;
}
/* 标签样式（如"中雨"）：红色背景，圆角 */
.tag {
  background: #fde2e2;
  color: #f56c6c;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
}

/* 地图加载提示样式 */
.map-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 28px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e6ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: loading-spin 0.8s linear infinite;
}

.loading-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loading-main {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.loading-sub {
  font-size: 12px;
  color: #909399;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.loading-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, -45%);
}

.loading-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -55%);
}
</style>
