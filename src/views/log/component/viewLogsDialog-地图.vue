<template>
  <!-- 使用v-if强制重新渲染弹窗 -->
  <el-dialog
    v-if="visible"
    v-model="internalVisible"
    :title="currentLogFile"
    width="90%"
    destroy-on-close
    @close="handleClose"
    :modal="true"
    :append-to-body="true"
  >
    <div class="dialog-content">
      <!-- 内容区域分为两部分：左侧日志内容，右侧地图 -->
      <div class="content-wrapper">
        <!-- 日志内容部分 -->
        <!-- <div class="log-content-container">
          <div class="log-toolbar">
            <el-input
              v-model="searchKeyword"
              placeholder="输入关键词过滤"
              clearable
              style="width: 200px"
            />
            <el-input-number
              v-model="showLines"
              :min="10"
              :max="1000"
              controls-position="right"
              label="显示行数"
            />
          </div>
          <pre class="log-content">{{ filteredLogContent }}</pre>
        </div> -->

        <!-- 地图部分 -->
        <div class="map-section">
          <div class="drone-monitor">
            <!-- 地图底层 -->
            <div class="map-container" ref="mapContainer"></div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { getLogContent } from "@/api/log";
import { ElMessage } from "element-plus";

// 地图相关变量
let droneMarker = null;
let trackPolyline = null;
let map = null;

// 接收父组件参数
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
    required: true,
  },
  logFilename: {
    type: String,
    required: true,
  },
  fileLoading: {
    type: Boolean,
    default: false,
  },
});

// 事件发射
const emit = defineEmits(["update:visible", "close"]);

// 子组件内部状态
const internalVisible = ref(false);
const currentLogFile = ref("");
const logContent = ref([]);
const searchKeyword = ref("");
const showLines = ref(100);
const mapContainer = ref(null);

// 关键修复：监听父组件visible变化
watch(
  () => props.visible,
  async (newVal) => {
    console.log("子组件: 接收visible变化", newVal);

    if (newVal) {
      // 确保文件名已更新
      currentLogFile.value = props.logFilename;
      await nextTick();
      internalVisible.value = true;
      console.log("子组件: 设置internalVisible为true");
      // 等待弹窗渲染完成后初始化地图
      await nextTick();
      initMap();
      // 加载日志内容
      await loadLogContent();
    } else {
      internalVisible.value = false;
    }
  },
  { immediate: true }
);

// 监听内部状态变化，同步到父组件
watch(
  () => internalVisible.value,
  (newVal) => {
    if (!newVal) {
      emit("update:visible", false);
      emit("close");
    }
  }
);

// 初始化地图
const initMap = () => {
  if (!window.T) {
    ElMessage.error("天地图API未加载");
    return;
  }

  try {
    // 创建地图实例
    map = new T.Map(mapContainer.value);

    // 地图加载完成事件
    map.addEventListener("load", () => {
      console.log("地图加载成功");
    });

    // 添加控件
    map.addControl(new T.Control.MapType());
    // 切换到卫星和路网的混合视图
    map.setMapType(window.TMAP_HYBRID_MAP);
    map.addControl(new T.Control.Scale());

    // 默认位置（郑州）
    const defaultLng = 113.65644;
    const defaultLat = 34.78723;
    map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 15);

    // 清除现有标记和轨迹
    if (droneMarker) {
      map.removeOverLay(droneMarker);
    }
    if (trackPolyline) {
      map.removeOverLay(trackPolyline);
    }

    // 创建无人机标记
    droneMarker = new T.Marker(new T.LngLat(defaultLng, defaultLat), {
      icon: new T.Icon({
        iconUrl: "/src/assets/mti-无人机.png",
        iconSize: new T.Point(32, 32),
        iconAnchor: new T.Point(16, 16),
      }),
    });
    map.addOverLay(droneMarker);

    // 创建轨迹线
    trackPolyline = new T.Polyline([], {
      color: "#2C64A7",
      weight: 4,
      opacity: 0.8,
      lineStyle: "solid",
    });
    map.addOverLay(trackPolyline);

    // 尝试获取当前位置
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

// 加载日志内容
const loadLogContent = async () => {
  try {
    console.log("子组件: 加载日志内容", props.logFilename);
    const res = await getLogContent(props.logFilename);
    if (res && res.code === 200) {
      logContent.value = res.data;
      // 这里可以添加解析日志内容并在地图上显示轨迹的逻辑
      // parseLogAndUpdateMap(res.data);
    } else {
      ElMessage.error(res?.message || "获取日志内容失败");
      internalVisible.value = false;
    }
  } catch (error) {
    console.error("子组件: 加载日志失败", error);
    ElMessage.error(`获取日志内容失败: ${error.message}`);
    internalVisible.value = false;
  }
};

// 过滤日志内容
const filteredLogContent = computed(() => {
  let content = logContent.value;
  if (searchKeyword.value) {
    content = content.filter((line) => line.includes(searchKeyword.value));
  }
  return content.slice(-showLines.value).join("\n");
});

// 处理弹窗关闭
const handleClose = () => {
  console.log("子组件: 处理关闭事件");
  internalVisible.value = false;
  logContent.value = [];
  searchKeyword.value = "";
};

// 当组件挂载时确保地图容器正确初始化
onMounted(() => {
  nextTick(() => {
    if (internalVisible.value && mapContainer.value) {
      initMap();
    }
  });
});
// 转换成数组
const convertToArrayList = (data) => {
  if (Array.isArray(data)) {
    // 处理数组：递归转换每个元素
    return data.map((item) => convertToArrayList(item));
  } else if (typeof data === "object" && data !== null) {
    // 处理对象：转换为键值对数组 [key, value]
    return Object.entries(data).map(([key, value]) => [
      key,
      convertToArrayList(value),
    ]);
  } else {
    // 基础类型直接返回
    return data;
  }
};
//处理JSON字符串数组
const processJsonStringArray = (jsonArray) => {
  const result = [];

  for (const jsonStr of jsonArray) {
    try {
      // 解析JSON字符串为对象
      const parsedObj = JSON.parse(jsonStr);
      // 转换对象为键值对数组
      const arrayFormat = convertToArrayList(parsedObj);
      result.push(arrayFormat);
    } catch (error) {
      console.error("解析JSON失败:", error, "字符串:", jsonStr);
      result.push({ error: "JSON解析失败" });
    }
  }

  return result;
};
//提取坐标
const extractCoordinates = (data) => {
  const result = [];

  // 辅助函数：根据键名查找对应值
  function findValueByKey(arr, key) {
    for (const [k, v] of arr) {
      if (k === key) return v;
    }
    return null;
  }

  // 遍历每个数据点
  for (const item of data) {
    // 查找status字段
    const status = findValueByKey(item, "status");
    if (!status) continue;

    // 查找global_position_int字段
    const globalPositionInt = findValueByKey(status, "global_position_int");
    if (!globalPositionInt) continue;

    // 提取经纬度
    const lon = findValueByKey(globalPositionInt, "lon");
    const lat = findValueByKey(globalPositionInt, "lat");

    // 确保经纬度存在
    if (lon !== null && lat !== null) {
      result.push({
        longitude: Number(lon),
        latitude: Number(lat),
      });
    }
  }

  return result;
};

watch(
  () => logContent.value,
  async (newVal) => {
    // 执行转换
    const convertedData = processJsonStringArray(newVal);
    // 输出结果（格式化显示）
    console.log(JSON.stringify(convertedData, null, 2));
    const coordinates = extractCoordinates(convertedData);
    console.log("提取的经纬度数据：", coordinates);
  }
);
</script>

<style scoped>
.dialog-content {
  padding: 10px 0;
}

.content-wrapper {
  display: flex;
  gap: 10px;
  height: 70vh;
}

.log-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log-toolbar {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

.log-content {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: auto;
  font-family: monospace;
  white-space: pre-wrap;
}

.map-section {
  flex: 1;
  height: 100%;
  min-width: 300px;
}

.drone-monitor {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 地图容器 */
.map-container {
  width: 100%;
  height: 100%;
  background: #eaf4ff;
  z-index: 0;
  border-radius: 4px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    height: auto;
    max-height: 80vh;
  }

  .log-content-container,
  .map-section {
    height: 40vh;
  }
}
</style>
