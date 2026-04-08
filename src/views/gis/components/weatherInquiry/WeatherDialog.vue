<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleClose"
    title="天气信息"
    width="500px"
    center
    destroy-on-close
  >
    <div class="dialog-content">
      <!-- 经纬度模块 -->
      <div class="section">
        <h4 class="section-title">点击位置</h4>
        <div class="info-group">
          <!-- 加兜底，避免接口失败时显示空白 -->
          {{ locationInfo.formatted_address || "暂无位置信息" }}
        </div>
      </div>

      <!-- 天气预报模块 -->
      <div class="info-group grid-3">
        <p
          class="info-item"
          v-for="(item, index) in weatherFieldEnum"
          :key="index"
          :style="item.key === 'reporttime' ? { gridColumn: '1 / -1' } : {}"
        >
          <span class="label">{{ item.label }}：</span>
          <span :class="['value', item.isTag ? 'tag' : '']">
            {{ getWeatherValue(item.key) }}
          </span>
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { watch, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
// 无需导入 wgs84togcj02，直接用父组件传递的 gcj 坐标
// import { wgs84togcj02 } from "@/utils/coordTransform";
import { Sunny } from "@element-plus/icons-vue";

// 响应式数据
const latitudelongitude = ref({ lng: "", lat: "", gcjLng: "", gcjLat: "" });
const cityCode = ref("");
const gdKey = ref(import.meta.env.VITE_AMAP_REST_KEY || "2731752e51881bb9d549b1793728d0f5");
const locationInfo = ref({ formatted_address: "" }); // 初始化兜底
const weatherInfomation = ref({});

// 天气字段枚举
const weatherFieldEnum = ref([
  { key: "city", label: "城市/区域", isTag: false },
  { key: "weather", label: "天气状况", isTag: true },
  { key: "temperature", label: "温度", isTag: false },
  { key: "humidity", label: "相对湿度", isTag: false },
  { key: "winddirection", label: "风向", isTag: false },
  { key: "windpower", label: "风力", isTag: false },
  { key: "reporttime", label: "发布时间", isTag: false },
]);

// 1. 接收父组件传递的 Prop
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Object,
    default: () => ({
      lng: "", // WGS84 经度
      lat: "", // WGS84 纬度
      gcjLng: "", // GCJ02 经度（高德原生）
      gcjLat: "", // GCJ02 纬度（高德原生）
    }),
  },
});

// 2. 定义向父组件发送的事件
const emit = defineEmits(["update:visible"]);

// 3. 处理对话框关闭事件
const handleClose = (newVisible) => {
  emit("update:visible", newVisible);
  // 关闭时清空数据，避免下次打开残留
  if (!newVisible) {
    locationInfo.value = { formatted_address: "" };
    weatherInfomation.value = {};
    cityCode.value = "";
  }
};

// 4. 获取天气值（加完善兜底）
const getWeatherValue = (key) => {
  const value = weatherInfomation.value[key] || "暂无数据";
  switch (key) {
    case "temperature":
      return `${value || "暂无数据"} ℃`;
    case "humidity":
      return `${value || "暂无数据"}%`;
    case "windpower":
      return `${value || "暂无数据"} 级`;
    default:
      return value || "暂无数据";
  }
};

// 5. 逆地理编码（获取地址和城市编码）
const geocoding = async () => {
  // 优先使用父组件传递的 GCJ02 坐标（高德原生，无需转换）
  const gcjLng = latitudelongitude.value.gcjLng || latitudelongitude.value.lng;
  const gcjLat = latitudelongitude.value.gcjLat || latitudelongitude.value.lat;

  // 空值校验
  if (!gcjLng || !gcjLat || isNaN(Number(gcjLng)) || isNaN(Number(gcjLat))) {
    ElMessage.warning("坐标无效，无法获取位置信息");
    locationInfo.value.formatted_address = "坐标无效";
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${gcjLng},${gcjLat}&key=${gdKey.value}&radius=1&extensions=base`;
    const response = await fetch(url);
    const res = await response.json();

    if (res.status === "1") {
      locationInfo.value = res.regeocode;
      cityCode.value = res.regeocode.addressComponent.adcode;
      // 地址获取成功后，调用天气接口
      await queryWeatherInfo();
    } else {
      ElMessage.error(`逆地理编码失败：${res.info || "未知错误"}`);
      locationInfo.value.formatted_address = "获取位置失败";
    }
  } catch (error) {
    console.error("逆地理编码接口报错：", error);
    ElMessage.error("获取位置信息失败，请检查网络");
    locationInfo.value.formatted_address = "获取位置失败";
  }
};

// 6. 获取天气信息
const queryWeatherInfo = async () => {
  if (!cityCode.value) {
    ElMessage.warning("城市编码为空，无法查询天气");
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${gdKey.value}&city=${cityCode.value}&output=JSON`;
    const response = await fetch(url);
    const res = await response.json();

    if (res.status === "1" && res.lives && res.lives.length > 0) {
      weatherInfomation.value = res.lives[0];
    } else {
      ElMessage.error(`天气查询失败：${res.info || "暂无该城市天气数据"}`);
    }
  } catch (error) {
    console.error("天气接口报错：", error);
    ElMessage.error("获取天气信息失败，请检查网络");
  }
};

// 7. 监听弹窗显示状态和坐标变化（核心修复）
watch(
  () => [props.visible, props.position],
  ([newVisible, newPosition]) => {
    // 只有弹窗打开且坐标有效时，才执行查询
    if (newVisible && newPosition) {
      latitudelongitude.value = { ...newPosition };
      // 延迟执行，避免DOM未加载完成
      setTimeout(() => {
        geocoding();
      }, 100);
    }
  },
  { deep: true }, // 深度监听对象变化
);
</script>

<style scoped>
.dialog-content {
  padding: 8px 0;
}

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
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.info-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
  display: grid;
  gap: 8px 0;
}

.info-item {
  font-size: 14px;
  line-height: 24px;
  margin: 0;
}
.label {
  color: #606266;
  margin-right: 4px;
}
.value {
  color: #1f2d3d;
  font-weight: 500;
}
.tag {
  background: #fde2e2;
  color: #f56c6c;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
}
.reporttime {
  color: #1f2d3d;
  font-weight: 500;
}
</style>
