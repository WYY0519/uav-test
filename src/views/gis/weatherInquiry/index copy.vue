<template>
  <div class="drone-monitor">
    <!-- 地图底层容器：承载天地图实例 -->
    <div class="map-container" ref="mapContainer"></div>

    <!-- 搜索框容器：悬浮在地图左上角 -->
    <div class="search-container">
      <el-select
        v-model="queryLocation"
        placeholder="请输入要搜索的位置"
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
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { debounce } from "lodash";
// 引入坐标转换工具
import { gcj02towgs84 } from "@/utils/coordTransform";
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
  // 触发防抖搜索方法
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

//搜索框选择事件
const handleSelectChange = (value) => {
  // 空值/无选项时直接返回
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
    map.centerAndZoom(new T.LngLat(lng, lat), 15);
  }

  // 移动无人机标记到选中位置（增加非空判断，避免标记未初始化报错）
  if (droneMarker) {
    droneMarker.setLngLat(new T.LngLat(lng, lat));
  }
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
    // 检查并调整地图尺寸（解决缩放后地图显示异常）
    map.checkResize();
    // 获取并打印当前缩放级别
    const currentZoom = map.getZoom();
    console.log("地图当前缩放级别：", currentZoom);
  }
};

//处理地图拖拽结束事件
const handleMapMove = () => {
  if (map) {
    map.checkResize();
  }
};

// 初始化天地图
const initMap = () => {
  // 检查天地图全局对象是否存在
  if (!window.T) {
    ElMessage.error("天地图API未加载");
    return;
  }

  try {
    // 创建地图实例（绑定到DOM容器）
    map = new T.Map(mapContainer.value);
    // 地图加载完成事件：提示用户并调整尺寸
    map.addEventListener("load", () => {
      ElMessage.success("地图加载成功");
      map.checkResize();
    });
    // 添加地图类型控件（切换普通/卫星地图）
    map.addControl(new T.Control.MapType());
    // 设置地图类型为混合地图（卫星+路网）
    map.setMapType(TMAP_HYBRID_MAP);
    // 添加比例尺控件
    map.addControl(new T.Control.Scale());
    // 设置地图默认中心和缩放级别
    map.centerAndZoom(new T.LngLat(DEFAULT_NJ_LNG, DEFAULT_NJ_LAT), 15);

    // 【可选】无人机标记初始化（当前注释，如需启用请取消注释）
    // droneMarker = new T.Marker(new T.LngLat(DEFAULT_NJ_LNG, DEFAULT_NJ_LAT), {
    //   icon: new T.Icon({
    //     iconUrl: "/src/assets/mti-无人机.png",
    //     iconSize: new T.Point(32, 32),
    //     iconAnchor: new T.Point(16, 16),
    //   }),
    // });
    // map.addOverLay(droneMarker);

    // 创建轨迹线实例（初始化空轨迹）
    trackPolyline = new T.Polyline([], {
      color: "#2C64A7", // 轨迹线颜色
      weight: 4, // 线宽
      opacity: 0.8, // 透明度
      lineStyle: "solid", // 线型（实线）
    });
    // 将轨迹线添加到地图
    map.addOverLay(trackPolyline);

    // 绑定地图交互事件
    map.addEventListener("click", handleMapClick); // 点击事件
    map.addEventListener("zoomend", handleMapZoom); // 缩放结束事件
    map.addEventListener("moveend", handleMapMove); // 拖拽结束事件

    // 延迟调整地图尺寸（解决初始化时地图显示不全问题）
    setTimeout(() => {
      if (map) {
        map.checkResize();
        map.centerAndZoom(new T.LngLat(DEFAULT_NJ_LNG, DEFAULT_NJ_LAT), 15);
      }
    }, 200);
  } catch (error) {
    // 捕获地图初始化异常并提示用户
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
  }
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
/* 标签样式（如“中雨”）：红色背景，圆角 */
.tag {
  background: #fde2e2;
  color: #f56c6c;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
}
</style>
