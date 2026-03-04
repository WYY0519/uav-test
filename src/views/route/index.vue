<template>
  <div class="route-container">
    <!-- 航线列表 -->
    <el-card shadow="never" class="route-card">
      <template #header>
        <div class="card-header">
          <span>航线列表</span>
          <div class="header-controls">
            <el-input
              v-model="searchQuery"
              placeholder="搜索航线名称"
              clearable
              @clear="handleRouteClea"
              style="width: 200px; margin-right: 10px"
            />
            <el-button type="primary" @click="routeSearch" :loading="loading">
              <el-icon> <Search /> </el-icon>搜索
            </el-button>
            <el-button type="primary" @click="refreshRoutes" :loading="loading">
              <el-icon> <Refresh /> </el-icon>刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredRoutes"
        border
        stripe
        v-loading="loading"
        @row-click="handleRowClick"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedRouteId"
              :label="row?.id"
              @change="() => handleRadioChange(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="航线ID" width="80" />
        <el-table-column prop="name" label="航线名称" min-width="150" />
        <el-table-column prop="pointsJson" label="航线信息" min-width="100">
          <template #default="{ row }">
            <div
              class="tooltip-container"
              @click="handleRouteInfoClick(row?.pointsJson)"
            >
              {{ JSON.parse(row?.pointsJson).routeData?.type }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="createTime"
          label="航线描述"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.description }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="100">
          <template #default="{ row }">
            {{ formatDateTime(row?.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="编辑" placement="top">
                <el-button type="info" link @click="editDevice(row)">
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="下载kml航线" placement="top">
                <el-button type="success" link @click="handleDownloadkml(row)">
                  <el-icon>
                    <Download />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除航线" placement="top">
                <el-button type="danger" link @click="handleDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
      <!-- 点击航信信息弹出航信具体信息 -->
      <el-dialog
        width="450px"
        v-model="dialogRouteVisible"
        title="航线信息详情"
      >
        <el-descriptions
          :column="1"
          :size="size"
          border
          style="margin-bottom: 15px"
        >
          <el-descriptions-item label="起点信息">
            经度: {{ routeData.home_pos?.lon || 0 }}, 纬度:
            {{ routeData.home_pos?.lat || 0 }}, 海拔:
            {{ routeData.home_pos?.alt || 0 }}米
          </el-descriptions-item>
          <el-descriptions-item label="航点总数">
            {{ routeData.points?.length || 0 }}个
          </el-descriptions-item>
        </el-descriptions>

        <!-- 航点详情（按序号分行） -->
        <el-descriptions :column="1" :size="size" border>
          <template v-for="(point, index) in routeData.points" :key="index">
            <el-descriptions-item :label="`航点${index + 1}`">
              <div class="point-info">
                <span
                  >经纬度:
                  <span style="color: #9c9b9b"
                    >{{ point.lon }}, {{ point.lat }}, 海拔:
                    {{ point.alt }}米</span
                  >
                  |
                </span>
                <span
                  >动作:
                  <span style="color: #9c9b9b"
                    >{{ getActionText(point.action) }} |</span
                  >
                </span>
                <span
                  >停留:
                  <span style="color: #9c9b9b"
                    >{{ point.residence_time }}秒 |</span
                  >
                </span>
                <span
                  >速度:
                  <span style="color: #9c9b9b">{{ point.velocity }}m/s |</span>
                </span>
                <span
                  >高度策略:
                  <span style="color: #9c9b9b"
                    >{{ getHeightStrategyText(point.height_strategy) }} |</span
                  >
                </span>
                <span
                  >航向:
                  <span style="color: #9c9b9b"
                    >{{ getHeadingModeText(point.heading_angle?.mode) }} |
                  </span>
                </span>
                <span
                  >分类:
                  <span style="color: #9c9b9b"
                    >{{ getCategoryText(point.sort) }} |
                  </span>
                </span>
                <span
                  >优先级:
                  <span style="color: #9c9b9b"
                    >{{ getPriorityText(point.priority) }} |</span
                  >
                </span>
                <span
                  >丢失行为:
                  <span style="color: #9c9b9b">{{
                    getLossBehaviorText(point.route_loss_behavior)
                  }}</span>
                </span>
              </div>
            </el-descriptions-item>
          </template>
        </el-descriptions>
      </el-dialog>
    </el-card>
    <!-- 编辑航线 -->
    <RouteEdit
      v-model:visible="editVisible"
      :route="editingRoute"
      @save="handleSaveRoute"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Refresh,
  Edit,
  Delete,
  Download,
  Search,
} from "@element-plus/icons-vue";
import { updateMission } from "../../api/route.js";
import {
  getRouteList,
  downloadGetKmlContent,
  deleteRoute as deleteRouteApi,
} from "@/api/route";
import RouteEdit from "./component/RouteEdit.vue";
const loading = ref(false);
const searchQuery = ref("");
// 分页相关
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
// 选中逻辑
const selectedRouteId = ref("");
const dialogRouteVisible = ref(false);
const filteredRoutes = ref([]);
const editVisible = ref(false);
const editingRoute = ref({});
const saveRouteForm = ref({
  name: "",
  description: "",
  points: [],
});
const routeData = ref({
  home_pos: {},
  points: [],
});
// 中文翻译映射（与之前保持一致）
const actionMap = {
  hover: "悬停",
  yaw: "偏航",
  "turn over": "翻转",
  pitch: "俯仰",
};

const headingModeMap = {
  "towards the goal": "朝着目标不变",
  "at an angle to the target point": "与目标点成一定角度",
  "towards a certain point": "朝某一点不变",
};

const heightStrategyMap = {
  "Rise first": "先升高再向目标点",
  "First to the target point": "先向目标点再升高",
  "Rise at a uniform rate": "匀速升高",
};

const categoryMap = {
  "Regular tasks": "常规任务",
  urgent: "紧急任务",
  Inspection: "巡检任务",
  reconnoiter: "侦察任务",
  other: "其他任务",
};

const priorityMap = {
  highest: "最高",
  high: "高",
  middle: "中",
  low: "低",
  lowest: "最低",
};

const lossBehaviorMap = {
  continue: "继续执行航线",
  return: "返航",
  landing: "降落",
  hover: "悬停",
};

// 翻译辅助函数
const getActionText = (key) => actionMap[key] || key;
const getHeadingModeText = (key) => headingModeMap[key] || key;
const getHeightStrategyText = (key) => heightStrategyMap[key] || key;
const getCategoryText = (key) => categoryMap[key] || key;
const getPriorityText = (key) => priorityMap[key] || key;
const getLossBehaviorText = (key) => lossBehaviorMap[key] || key;
const editDevice = (route) => {
  editingRoute.value = { ...route };
  editVisible.value = true;
  console.log("编辑航线:", route); // 用于调试
  console.log("编辑航线2:", JSON.parse(route.pointsJson)); // 用于调试
};
// 保存编辑的航线
const handleSaveRoute = async (formData) => {
  try {
    const res = await updateMission(formData);
    if (res.code === 200) {
      editVisible.value = false;
      ElMessage.success("编辑成功");
      await fetchRoutes();
    }
  } catch (error) {
    console.error("保存航线失败:", error);
    ElMessage.error("保存失败: " + error.message);
  }
};

// 补充：定义 JSON 转 KML 的函数（关键修复）
const jsonToKml = (data) => {
  console.log(data, "data");
  // 解析航线数据（确保输入是正确的对象）
  const routeData = data.routeData || data;
  // 提取关键数据
  const homePos = routeData.home_pos || { lat: 0, lon: 0, alt: 0 };
  const points = routeData.points || [];
  // 定义中文化映射（用于转换英文值为中文标签）
  const translationMap = {
    // 动作类型
    hover: "悬停",
    yaw: "偏航",
    "turn over": "翻转",
    pitch: "俯仰",

    // 航向模式
    "towards the goal": "朝着目标不变",
    "at an angle to the target point": "与目标点成一定角度",
    "towards a certain point": "朝某一点不变",

    // 高度策略
    "Rise first": "先升高再向目标点",
    "First to the target point": "先向目标点再升高",
    "Rise at a uniform rate": "匀速升高",

    // 任务优先级
    highest: "最高",
    high: "高",
    middle: "中",
    low: "低",
    lowest: "最低",

    // 任务分类
    "Regular tasks": "常规任务",
    urgent: "紧急任务",
    Inspection: "巡检任务",
    reconnoiter: "侦察任务",
    other: "其他任务",

    // 航线丢失行为
    continue: "继续执行航线",
    return: "返航",
    landing: "降落",
    hover: "悬停",
  };

  // 辅助函数：将英文值转换为中文标签
  const translate = (key) => translationMap[key] || key;

  // 构建KML结构
  return `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <!-- 样式定义 -->
        <Style id="waypointStyle">
          <IconStyle>
            <Icon>
              <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
            </Icon>
          </IconStyle>
          <LineStyle>
            <color>ff0000ff</color> <!-- 红色线条（ARGB） -->
            <width>3</width>
          </LineStyle>
        </Style>

        <!-- 起点标记 -->
        <Placemark>
          <name>起点 (Home Position)</name>
          <description>
            <b>基本信息</b><br>
            经度: ${homePos.lon}<br>
            纬度: ${homePos.lat}<br>
            海拔: ${homePos.alt || 0}米<br>
          </description>
          <Point>
            <altitudeMode>absolute</altitudeMode>
            <coordinates>${homePos.lon},${homePos.lat},${
              homePos.alt || 0
            }</coordinates>
          </Point>
        </Placemark>

        <!-- 航线路径 -->
        <Placemark>
          <name>航线路径</name>
          <description>
            <b>航线概览</b><br>
            航点数量: ${points.length}个<br>
            起点坐标: ${points[0]?.lon}, ${points[0]?.lat}<br>
            终点坐标: ${points[points.length - 1]?.lon}, ${
              points[points.length - 1]?.lat
            }
          </description>
        </Placemark>
        <!-- 航点标记（完整展示所有字段-中文化） -->
        ${points
          .map(
            (point, index) => `
          <Placemark>
            <name>航点 ${index + 1}</name>
            <description>
              经度: ${point.lon}<br>
              纬度: ${point.lat}<br>
              海拔: ${point.alt || 0}米<br>
              动作类型: ${translate(point.action)}<br>
              停留时间: ${point.residence_time || 0}秒<br>
              飞行速度: ${point.velocity || 0} m/s<br>
              航向模式: ${translate(point.heading_angle?.mode || "无")}<br>
              高度策略: ${translate(point.height_strategy || "无")}<br>
              任务分类: ${translate(point.sort || "未分类")}<br>
              任务优先级: ${translate(point.priority || "普通")}<br>
              航线丢失行为: ${translate(point.route_loss_behavior || "未定义")}
            </description>
            <styleUrl>#waypointStyle</styleUrl>
            <Point>
              <altitudeMode>absolute</altitudeMode>
              <coordinates>${point.lon},${point.lat},${
                point.alt || 0
              }</coordinates>
            </Point>
          </Placemark>
        `,
          )
          .join("")}
      </Document>
    </kml>`;
};
// 修复下载KML的函数
const handleDownloadkml = async (row) => {
  try {
    if (!row?.id) {
      ElMessage.warning("航线ID不存在，无法下载");
      return;
    }

    // 调用后端接口下载KML文件
    const response = await downloadGetKmlContent(row.id);

    // 创建Blob并下载
    const blob = new Blob([response], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.name || "航线"}_${row.id}.kml`; // 文件名：航线名称_ID.kml
    document.body.appendChild(link);
    link.click(); // 触发下载

    // 清理资源
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // 释放URL对象
    }, 100);

    ElMessage.success("KML文件下载成功");
  } catch (error) {
    console.error("下载KML失败:", error);
    ElMessage.error("下载失败：" + error.message);
  }
};
// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return "未知时间";
  const date = new Date(dateTimeStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

// 获取航线列表
const fetchRoutes = async () => {
  try {
    loading.value = true;
    const res = await getRouteList({
      keyword: searchQuery.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    console.log("123");
    console.log(res.data); // 后端返回的数据
    if (res.code === 200) {
      filteredRoutes.value = res.data.list;
      total.value = res.data.total;
    } else {
      ElMessage.error(res.message || "获取航线列表失败");
    }
  } catch (error) {
    console.error("获取航线列表失败:", error);
    ElMessage.error("获取航线列表失败: " + error.message);
  } finally {
    loading.value = false;
  }
};

// 删除航线
const handleDelete = (row) => {
  console.log(row, "删除航线");
  ElMessageBox.confirm(`确定要删除航线 ${row.name} 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    const res = await deleteRouteApi(row.id);
    console.log("123");
    console.log(res, "删除航线");
    if (res.code == 200) {
      ElMessage.success("删除成功");
      refreshRoutes();
    } else {
      ElMessage.error("删除失败");
    }
  });
};
// 刷新航线列表
const refreshRoutes = () => {
  searchQuery.value = "";
  fetchRoutes();
};
const handleRouteClea = () => {
  fetchRoutes();
};
//搜索
const routeSearch = async () => {
  fetchRoutes();
};

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchRoutes();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchRoutes();
};

// 选中逻辑
const handleRowClick = (row) => {
  selectedRouteId.value = row.id;
};

const handleRadioChange = (row) => {
  selectedRouteId.value = row.id;
};
const handleRouteInfoClick = (row) => {
  console.log(row);

  try {
    // 直接使用传入的routeData
    let aaa = JSON.parse(row);
    routeData.value = aaa.routeData;
    console.log(routeData.value, "=========");

    dialogRouteVisible.value = true;
  } catch (error) {
    console.error("解析航线信息失败", error);
  }
};

// 初始化
onMounted(() => {
  fetchRoutes();
});
</script>

<style scoped>
.route-container {
  /* padding: 20px; */
  width: 100%;
  box-sizing: border-box;
}

.route-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-controls {
  display: flex;
  align-items: center;
}

.tooltip-container {
  cursor: pointer;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.route-details {
  padding: 20px;
  width: 100%;
}

.route-points {
  margin-top: 20px;
  width: 100%;
}

.route-points h3 {
  margin-bottom: 16px;
  color: #303133;
}

:deep(.el-descriptions) {
  margin-bottom: 20px;
  width: 100%;
}

:deep(.el-descriptions__label) {
  width: 100px;
  justify-content: flex-end;
}

:deep(.el-radio) {
  margin-right: 0;
  display: flex;
  justify-content: center;
}

:deep(.el-radio__label) {
  display: none;
}

/* 确保表格占满容器宽度 */
:deep(.el-table) {
  width: 100% !important;
}

/* 调整表格列宽，使内容自适应 */
:deep(.el-table__body-wrapper),
:deep(.el-table__header-wrapper) {
  width: 100% !important;
}

/* 让最后一列自动填充剩余空间 */
:deep(.el-table__body) tr td:last-child,
:deep(.el-table__header) tr th:last-child {
  width: auto;
}

:deep(.save-route .el-form-item__label) {
  width: 60px !important;
}

:deep(.save-route .el-form-item__content) {
  margin-right: 12px !important;
}

:deep(.el-dialog) {
  max-height: 80%;
  min-width: 25%;
  overflow: auto;
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
</style>
