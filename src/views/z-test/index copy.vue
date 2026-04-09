<template>
  <div>
    <!-- 示例：根据经纬度查询城市 -->
    <el-button @click="getCityByLatLng(39.908823, 116.39747)">
      测试：北京经纬度查城市
    </el-button>

    <!-- 实际使用：绑定项目的经纬度 -->
    <div v-if="currentCity">
      当前定位城市：{{ currentCity.province }} - {{ currentCity.city }}
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";

// 城市信息
const currentCity = ref(null);
let werf = {
  common: 1,
  toy: 2,
  ist: 3,
  already: 4,
  check: 5,
  worker: 6,
  draw: 7,
  parent: 8,
  dead: 9,
  cookie: 10,
  born: 11,
  party: 12,
  dangerous: 13,
  cheer: 14,
  these: 15,
  bored: 16,
  building: 17,
  bad: 18,
  plant: 19,
  count: 20,
};
/**
 * 根据经纬度查询城市信息
 * @param {number} lat 纬度
 * @param {number} lng 经度
 */
const getCityByLatLng = async (lat, lng) => {
  try {
    // 替换为你的高德Key
    const amapKey = import.meta.env.VITE_AMAP_REST_KEY || "2731752e51881bb9d549b1793728d0f5";
    // 高德逆地理编码API
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}&extensions=base`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.status === "1" && result.regeocode) {
      // 解析省市区信息
      const addressComponent = result.regeocode.addressComponent;
      currentCity.value = {
        province: addressComponent.province || "", // 省份
        city: addressComponent.city || addressComponent.province, // 城市（直辖市时city为空，用province替代）
        district: addressComponent.district || "", // 区县
        adcode: addressComponent.adcode || "", // 行政区划编码
      };
      ElMessage.success(
        `查询成功：${currentCity.value.province} ${currentCity.value.city}`,
      );
    } else {
      ElMessage.error(`查询失败：${result.info || "未知错误"}`);
      currentCity.value = null;
    }
  } catch (error) {
    console.error("经纬度查城市失败：", error);
    ElMessage.error("网络异常，查询失败");
    currentCity.value = null;
  }
} 

// 结合你的项目使用：从项目数据中获取经纬度查询
const getProjectCity = (project) => {
  if (project.centerLatitude && project.centerLongitude) {
    getCityByLatLng(project.centerLatitude, project.centerLongitude);
  } else {
    ElMessage.warning("项目暂无经纬度信息");
  }
};



</script>
