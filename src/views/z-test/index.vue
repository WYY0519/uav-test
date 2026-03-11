<template>
  <div class="drone-route-page">
    <!-- 左侧操作栏 -->
    <div class="sidebar">
      <!-- 路线操作区 -->
      <div class="section route-operation">
        <h3>路线操作</h3>
        <el-select
          v-model="searchLocation"
          placeholder="请输入要搜索的位置"
          clearable
          style="width: 100%; margin-bottom: 12px"
        />
        <div class="action-buttons">
          <el-button type="primary" @click="handleDrawRoute">绘制</el-button>
          <el-button @click="handleCompleteRoute">完成</el-button>
          <el-button @click="handleCancelRoute">取消</el-button>
        </div>
        <el-button
          type="success"
          style="width: 100%; margin-top: 12px"
          @click="saveRoute"
        >
          保存路线
        </el-button>
      </div>

      <!-- 航线搜索区 -->
      <div class="section route-search">
        <el-input
          v-model="searchRoute"
          placeholder="请输入要搜索的航线"
          clearable
          style="margin-bottom: 12px"
        />
      </div>

      <!-- 航线列表区 -->
      <div class="section route-list">
        <div
          v-for="item in routeList"
          :key="item.id"
          class="route-item"
          :class="{ active: activeRouteId === item.id }"
          @click="selectRoute(item)"
        >
          <div class="route-name">{{ item.name }}</div>
          <div class="route-info">地址: {{ item.address }}</div>
          <div class="route-info">创建时间: {{ item.createTime }}</div>
          <div class="route-info">{{ item.distance }} 米</div>
          <div class="route-actions">
            <span @click.stop="viewRoute(item)">查看</span>
            <span @click.stop="editRoute(item)">编辑</span>
            <span @click.stop="deleteRoute(item)">删除</span>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <el-select v-model="pageSize" @change="handlePageSizeChange">
            <el-option label="5条/页" :value="5" />
            <el-option label="10条/页" :value="10" />
          </el-select>
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            @current-change="handlePageChange"
            layout="prev, pager, next"
            small
          />
        </div>
      </div>
    </div>

    <!-- 右侧地图容器 -->
    <div class="map-wrapper">
      <div ref="mapContainer" class="map-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";

// 地图相关实例
const mapContainer = ref(null);
let map = null;
let polyline = null; // 绘制的航线
let markers = []; // 航线上的标记点

// 搜索与状态
const searchLocation = ref("");
const searchRoute = ref("");
const activeRouteId = ref(null);

// 分页与列表数据
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(19);
const routeList = ref([
  {
    id: 1,
    name: "测试三个点",
    address: "广东省广州市番禺区",
    createTime: "2026-03-05 11:03:58",
    distance: 0,
    path: [
      [113.32, 23.12],
      [113.33, 23.13],
      [113.34, 23.12],
    ],
  },
  {
    id: 2,
    name: "测试仿真",
    address: "广东省广州市番禺区",
    createTime: "2026-03-05 10:44:44",
    distance: 0,
    path: [
      [113.32, 23.12],
      [113.33, 23.13],
    ],
  },
  {
    id: 3,
    name: "11 额 1",
    address: "河南省郑州市中原区",
    createTime: "2026-02-27 14:56:23",
    distance: 0,
    path: [
      [113.62, 34.75],
      [113.63, 34.76],
    ],
  },
  // 可根据需要扩展更多数据
]);

// 初始化地图
const initAmap = () => {
  if (!window.AMap) {
    console.error("高德地图API未加载");
    return;
  }

  map = new window.AMap.Map(mapContainer.value, {
    center: [113.535807, 34.81732], // 郑州坐标
    zoom: 14,
    resizeEnable: true,
  });

  // 添加地图控件（比例尺、定位等）
  map.addControl(new window.AMap.Scale());
  map.addControl(
    new window.AMap.ToolBar({ position: { top: "10px", right: "10px" } }),
  );
};

// 绘制航线
const drawRouteOnMap = (path) => {
  if (!map) return;

  // 清除旧的航线和标记
  if (polyline) map.remove(polyline);
  if (markers.length) {
    map.remove(markers);
    markers = [];
  }

  // 绘制新航线
  polyline = new window.AMap.Polyline({
    path,
    strokeColor: "#0091ea",
    strokeWeight: 4,
    strokeOpacity: 0.8,
  });
  map.add(polyline);

  // 绘制航点标记
  path.forEach((pos, i) => {
    const m = new window.AMap.Marker({
      position: pos,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(24, 24),
        image: "https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png",
        imageSize: new window.AMap.Size(24, 24),
      }),
      label: { content: `${i + 1}`, offset: new window.AMap.Pixel(12, -24) },
    });
    markers.push(m);
  });
  map.add(markers);

  // 调整视角以包含整个航线
  map.setFitView([polyline, ...markers]);
};

// 路线操作
const handleDrawRoute = () => {
  ElMessage.info("进入绘制模式，请在地图上点击添加航点");
  if (map) {
    map.on("click", (e) => {
      const newPoint = [e.lnglat.lng, e.lnglat.lat];
      if (!activeRouteId.value) {
        ElMessage.warning("请先选择或创建一条航线");
        return;
      }
      const route = routeList.value.find((r) => r.id === activeRouteId.value);
      if (route) {
        route.path.push(newPoint);
        drawRouteOnMap(route.path);
      }
    });
  }
};

const handleCompleteRoute = () => {
  ElMessage.success("航线绘制完成");
  if (map) map.off("click");
};

const handleCancelRoute = () => {
  ElMessage.info("取消绘制");
  if (map) map.off("click");
  if (polyline) {
    map.remove(polyline);
    polyline = null;
  }
  if (markers.length) {
    map.remove(markers);
    markers = [];
  }
};

const saveRoute = () => {
  if (!activeRouteId.value) {
    ElMessage.warning("请先选择一条航线");
    return;
  }
  ElMessage.success("航线已保存");
  // 这里可对接后端接口保存数据
};

// 航线列表操作
const selectRoute = (item) => {
  activeRouteId.value = item.id;
  drawRouteOnMap(item.path);
};

const viewRoute = (item) => {
  selectRoute(item);
  ElMessage.info(`查看航线：${item.name}`);
};

const editRoute = (item) => {
  ElMessage.info(`编辑航线：${item.name}`);
  // 可弹出编辑弹窗
};

const deleteRoute = (item) => {
  ElMessage.warning(`删除航线：${item.name}`);
  // 这里可对接后端接口删除数据
  routeList.value = routeList.value.filter((r) => r.id !== item.id);
  total.value -= 1;
  if (activeRouteId.value === item.id) {
    activeRouteId.value = null;
    handleCancelRoute();
  }
};

// 分页
const handlePageChange = (page) => {
  currentPage.value = page;
  // 这里可根据页码请求后端数据
};

const handlePageSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  // 这里可重新请求数据
};

// 生命周期
onMounted(() => {
  setTimeout(initAmap, 100);
});

onUnmounted(() => {
  if (map) {
    map.destroy();
  }
  polyline = null;
  markers = [];
});
</script>

<style scoped>
.drone-route-page {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: #f5f7fa;
}

/* 左侧操作栏 */
.sidebar {
  width: 320px;
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #334155;
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #f1f5f9;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.route-item {
  padding: 12px;
  margin-bottom: 8px;
  background-color: #273449;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.route-item:hover {
  background-color: #334155;
}

.route-item.active {
  background-color: #0284c7;
}

.route-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.route-info {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.route-actions {
  margin-top: 8px;
  font-size: 12px;
}

.route-actions span {
  color: #38bdf8;
  margin-right: 8px;
  cursor: pointer;
}

.route-actions span:hover {
  color: #0ea5e9;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
}

/* 右侧地图 */
.map-wrapper {
  flex: 1;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}
</style>
