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
          {{ locationInfo.formatted_address }}
          <!-- <p class="info-item">
            <span class="label">经度（lng）：</span>
            <span class="value">{{ position.lng }}</span>
          </p>
          <p class="info-item">
            <span class="label">纬度（lat）：</span>
            <span class="value">{{ position.lat }}</span>
          </p> -->
        </div>
      </div>

      <!-- <div class="section">
        <h4 class="section-title">天气预报</h4>
        <div class="info-group grid-3">
          <p class="info-item">
            <span class="label">天气状态：</span>
            <span class="value">中雨</span>
          </p>
          <p class="info-item">
            <span class="label">预测飞行风速：</span>
            <span class="value">7.1 m/s</span>
          </p>
          <p class="info-item">
            <span class="label">短时雨量：</span>
            <span class="value tag">中雨</span>
          </p>
          <p class="info-item">
            <span class="label">温度：</span>
            <span class="value">29 ℃</span>
          </p>
          <p class="info-item">
            <span class="label">相对湿度：</span>
            <span class="value">87%</span>
          </p>
          <p class="info-item">
            <span class="label">电离层活跃度：</span>
            <span class="value">平静</span>
          </p>
        </div>
      </div> -->
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
          <!-- <el-icon v-show="item.label === '天气状况'"><Sunny /></el-icon> -->
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { watch, ref } from "vue";
import { wgs84togcj02 } from "@/utils/coordTransform";
import { Sunny } from "@element-plus/icons-vue";
const latitudelongitude = ref();
const cityCode = ref("");
const gdKey = ref("2731752e51881bb9d549b1793728d0f5");
const locationInfo = ref({});
const weatherInfomation = ref({});
const weatherFieldEnum = ref([
  { key: "city", label: "城市/区域", isTag: false }, // 古城区
  { key: "weather", label: "天气状况", isTag: true }, // 晴（用tag样式）
  { key: "temperature", label: "温度", isTag: false }, // 10℃
  { key: "humidity", label: "相对湿度", isTag: false }, // 33%
  { key: "winddirection", label: "风向", isTag: false }, // 西
  { key: "windpower", label: "风力", isTag: false }, // 5级
  // 可选扩展：如需展示更多字段，直接在枚举里加即可
  // { key: "adcode", label: "行政区划代码", isTag: false },
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
    default: () => ({ lng: "", lat: "" }),
  },
});

// 2. 定义向父组件发送的事件（更新 visible 值）
const emit = defineEmits(["update:visible"]);

// 3. 处理对话框关闭事件，向父组件发送更新信号
const handleClose = (newVisible) => {
  // 关键：子组件不修改 Prop，只通知父组件修改
  emit("update:visible", newVisible);
};
const getWeatherValue = (key) => {
  const value = weatherInfomation.value[key] || "暂无数据";
  // 为不同字段补充单位
  switch (key) {
    case "temperature":
      return `${value} ℃`;
    case "humidity":
      return `${value}%`;
    case "windpower":
      return `${value} 级`;
    default:
      return value;
  }
};
//地理/逆地理编码
const geocoding = async () => {
  let lng = Number(latitudelongitude.value.lng);
  let lat = Number(latitudelongitude.value.lat);
  const [gcjLng, gcjLat] = wgs84togcj02(lng, lat);
  const url = `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${gcjLng.toFixed(
    6
  )},${gcjLat.toFixed(6)}&key=${gdKey.value}&radius=1&extensions=base`;
  // 发起接口请求
  const response = await fetch(url);
  const res = await response.json();
  if (res.status === "1") {
    locationInfo.value = res.regeocode;
    cityCode.value = res.regeocode.addressComponent.adcode;
    queryWeatherInfo();
  }
  console.log(res, "地理编码");
};
//获取天气
const queryWeatherInfo = async () => {
  const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${gdKey.value}&city=${cityCode.value}&output=JSON`;
  const response = await fetch(url);
  const res = await response.json();
  if (res.status === "1") {
    weatherInfomation.value = res.lives[0];
  }
  console.log(cityCode.value, res, "获取天气");
};
//监听经纬度
watch(
  props.position,
  (newVal) => {
    latitudelongitude.value = props.position;
    console.log(newVal, "newVal");
    geocoding();
  },
  { immediate: true }
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
}

.info-item {
  font-size: 14px;
  line-height: 24px;
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
  /* 可选：如果想调整发布时间的宽度范围，用max-width/min-width */
  /* max-width: 400px; */
  /* 可选：让文字靠左对齐，和其他项一致 */
  display: inline-block;
}
</style>
