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
        <el-table-column prop="id" label="航线ID" width="100" />
        <el-table-column prop="name" label="航线名称" min-width="100" />
        <el-table-column prop="pointsJson" label="航线信息" min-width="200">
          <template #default="{ row }">
            <div
              class="tooltip-container"
              @click="handleRouteInfoClick(row?.pointsJson)"
            >
              {{ JSON.parse(row?.pointsJson).routeData?.type }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="航线描述" min-width="180">
          <template #default="{ row }">
            {{ row.description }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row?.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
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
        <!-- {{ dialogInfo.routeData }} -->
        <el-descriptions :column="1" :size="size" border>
          <el-descriptions-item label="经度">
            {{ JSON.parse(dialogInfo).routeData.home_pos.lon }}
          </el-descriptions-item>
          <el-descriptions-item label="纬度">
            {{
              JSON.parse(dialogInfo).routeData.home_pos.lat
            }}</el-descriptions-item
          >
          <el-descriptions-item label="纬度点">
            {{
              JSON.parse(dialogInfo)
                .routeData.points.map((item) => item.lon)
                .join(", ")
            }}
          </el-descriptions-item>
          <el-descriptions-item label="纬度点">
            {{
              JSON.parse(dialogInfo)
                .routeData.points.map((item) => item.lat)
                .join(", ")
            }}
          </el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </el-card>

    <!-- 航线详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentRoute?.name || '航线详情'"
      width="80%"
    >
      <div v-if="currentRoute" class="route-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="航线ID">
            {{ currentRoute.id }}
          </el-descriptions-item>
          <el-descriptions-item label="航线名称">
            {{ currentRoute.name }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(currentRoute.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="设备ID">
            {{ currentRoute.deviceId }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRoute.status)">
              {{ getStatusText(currentRoute.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="航点数">
            {{ currentRoute.pointCount }}
          </el-descriptions-item>
        </el-descriptions>
        <!-- 航点列表 -->
        <div class="route-points">
          <h3>航点列表</h3>
          <el-table
            :data="currentRoute.points"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="index" label="序号" width="80" />
            <el-table-column prop="latitude" label="纬度" width="120" />
            <el-table-column prop="longitude" label="经度" width="120" />
            <el-table-column prop="altitude" label="高度(m)" width="100" />
            <el-table-column prop="speed" label="速度(m/s)" width="100" />
            <el-table-column prop="action" label="动作" />
          </el-table>
        </div>
      </div>
    </el-dialog>
    <!-- 编辑航线 -->
    <el-dialog
      v-model="editVisible"
      title="编辑路线"
      width="35%"
      type="warning"
      style="max-height: 80%; overflow-y: auto"
    >
      <el-form
        ref="saveRouteFormRef"
        :model="saveRouteForm"
        :rules="saveRouteRules"
        label-width="90px"
      >
        <el-form-item label="路线名称:" prop="name">
          <el-input v-model="saveRouteForm.name" placeholder="请输入路线名称" />
        </el-form-item>
        <el-form-item label="路线描述:" prop="description">
          <el-input
            v-model="saveRouteForm.description"
            :rows="2"
            type="textarea"
            maxlength="20"
            show-word-limit
            placeholder="请输入路线描述"
          />
        </el-form-item>
        <!-- 数据行 -->
        <div
          class="save-route"
          v-for="(item, index) in saveRouteForm.points"
          :key="index"
          style="display: flex; align-items: center; margin-bottom: 10px"
        >
          <el-form-item
            label="高度:"
            :prop="`points[${index}].alt`"
            :rules="[
              { required: true, message: '请输入高度', trigger: 'blur' },
            ]"
          >
            <el-input v-model="item.alt" placeholder="高度" />
          </el-form-item>
          <el-form-item
            label="经度:"
            :prop="`points.[${index}].lng`"
            :rules="[
              { required: true, message: '请输入经度', trigger: 'blur' },
            ]"
          >
            <el-input v-model="item.lng" placeholder="经度" />
          </el-form-item>
          <el-form-item
            label="纬度:"
            :prop="`points.[${index}].lat`"
            :rules="[
              { required: true, message: '请输入纬度', trigger: 'blur' },
            ]"
          >
            <el-input v-model="item.lat" placeholder="纬度" />
          </el-form-item>

          <!-- 操作按钮 -->
          <div
            style="
              display: flex;
              gap: 10px;
              margin-left: 10px;
              margin-bottom: 16px;
            "
          >
            <span
              class="operation-btn add-btn"
              @click="handleAddRow(index, item)"
              title="添加行"
              >+</span
            >
            <span
              class="operation-btn delete-btn"
              @click="handleDeleteRow(index, item)"
              title="删除行"
              :disabled="saveRouteForm.points.length <= 1"
              >-</span
            >
          </div>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSaveRoute">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Refresh,
  Edit,
  Delete,
  Download,
  Search,
} from "@element-plus/icons-vue";
import { updateMission } from "../../api/route.js";
import { getRouteList } from "@/api/route";

const loading = ref(false);
const searchQuery = ref("");
// 分页相关
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);

// 弹窗相关
const dialogVisible = ref(false);
const currentRoute = ref(null);

// 选中逻辑
const selectedRouteId = ref("");
const dialogRouteVisible = ref(false);
const dialogInfo = ref({});
const filteredRoutes = ref([]);
const listRouteEditId = ref("");
const editVisible = ref(false);
const saveRouteFormRef = ref(null);
const saveRouteForm = ref({
  name: "",
  description: "",
  points: [],
});
// 表单验证规则
const saveRouteRules = {
  name: [
    { required: true, message: "请输入路线名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在 1 到 10 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入路线描述", trigger: "blur" },
    { min: 1, max: 20, message: "长度在 1 到 20 个字符", trigger: "blur" },
  ],
  points: [
    {
      type: "array",
      required: true,
      message: "至少需要2个航点",
      trigger: "blur",
      min: 2, // 确保至少2个航点
    },
  ],
};
let newArr = ref([]);
const editDevice = (route) => {
  console.log(route, "待编辑的原始路线数据");
  try {
    // 1. 解析pointsJson（后端返回的JSON字符串）
    const parsedData = JSON.parse(route.pointsJson);
    // 2. 提取routeData中的points数组（原始航点数据）
    const originalPoints = parsedData?.routeData?.points || [];
    // 3. 转换数据结构：将lon改为lng（匹配表单的v-model="item.lng"）
    const convertedPoints = originalPoints.map((point) => ({
      lat: point.lat, // 纬度保持不变
      lng: point.lon, // 关键：将后端的lon转换为表单需要的lng
      alt: point.alt, // 高度保持不变
    }));

    // 4. 赋值给表单（确保points是正确的数组）
    saveRouteForm.value = {
      name: route.name,
      description: route.description,
      points:
        convertedPoints.length > 0
          ? convertedPoints
          : [{ lat: "", lng: "", alt: "" }], // 至少保留一行
    };

    editVisible.value = true;
    listRouteEditId.value = route.id;
  } catch (error) {
    console.error("解析航线数据失败：", error);
    ElMessage.error("编辑失败，航线数据格式错误");
  }
};
// 添加行处理方法
const handleAddRow = (index, item) => {
  console.log("当前行数据:", item);
  console.log("当前索引:", index);

  // 在当前行后面插入新行，复制当前行数据作为基础
  // const newPoint = { ...item };
  // 创建空白数据对象（不复制当前行数据）
  const newPoint = {
    alt: "", // 空白高度
    lng: "", // 空白经度
    lat: "", // 空白纬度
  };
  saveRouteForm.value.points.splice(index + 1, 0, newPoint);
  ElMessage.info(`在第${index + 1}行后添加了新行`);
};

// 删除行处理方法
const handleDeleteRow = (index, item) => {
  console.log("要删除的行数据:", item);
  console.log("要删除的索引:", index);

  // 至少保留一行
  if (saveRouteForm.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }

  saveRouteForm.value.points.splice(index, 1);
  ElMessage.info(`已删除第${index + 1}行`);
};
function convertPoints(points) {
  // 1. 转换 points 数组（lng → lon）
  const convertedPoints = points.map((point) => ({
    lat: point.lat,
    lon: point.lng, // 重命名 lng 为 lon
    alt: point.alt,
  }));

  // 2. 设置 home_pos（使用第一个点）
  const homePos =
    points.length > 0
      ? {
          lat: points[0].lat,
          lon: points[0].lng,
          alt: 0, // home_pos 的 alt 固定为 0
        }
      : { lat: 0, lon: 0, alt: 0 };

  // 3. 构建完整对象并序列化为 JSON 字符串
  const result = {
    routeData: {
      type: "mission",
      points: convertedPoints,
      home_pos: homePos,
    },
  };

  return JSON.stringify(result);
}
// 确认编辑路线
const confirmSaveRoute = async () => {
  saveRouteFormRef.value.validate(async (valid) => {
    console.log(valid);
    if (valid) {
      newArr.value = {
        name: saveRouteForm.value.name,
        description: saveRouteForm.value.description,
        points: saveRouteForm.value.points,
      };
      const pointsJson = convertPoints(newArr.value.points);
      let params = {
        id: listRouteEditId.value,
        description: saveRouteForm.value.description,
        name: saveRouteForm.value.name,
        pointsJson: pointsJson,
      };
      console.log("params", params);

      let res = await updateMission(params);
      if (res.code === 200) {
        editVisible.value = false;
        ElMessage.success("编辑成功");
        //航线列表
        await fetchRoutes();
      }
    }
  });
};
// 补充：定义 JSON 转 KML 的函数（关键修复）
const jsonToKml = (data) => {
  // 解析航线数据（确保输入是正确的对象）
  const routeData = data.routeData || data;

  // 构建 KML 结构
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <!-- 起点标记 -->
    <Placemark>
      <name>起点 (Home Position)</name>
      <description>海拔: ${routeData.home_pos?.alt || 0}米</description>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
          ${routeData.home_pos?.lon},${routeData.home_pos?.lat},${
    routeData.home_pos?.alt || 0
  }
        </coordinates>
      </Point>
    </Placemark>

    <!-- 航线路径 -->
    <Placemark>
      <name>航线路径</name>
      <description>共${routeData.points?.length || 0}个航点</description>
      <LineString>
        <extrude>1</extrude> <!-- 垂直拉伸至地面 -->
        <tessellate>1</tessellate> <!-- 优化曲线显示 -->
        <altitudeMode>absolute</altitudeMode> <!-- 高度为绝对海拔 -->
        <coordinates>
          ${routeData.points
            ?.map(
              (point) => `${point.lon},${point.lat},${point.alt || 0}` // KML坐标格式：经度,纬度,高度
            )
            .join("\n")}
        </coordinates>
      </LineString>
    </Placemark>

    <!-- 航点标记 -->
    ${routeData.points
      ?.map(
        (point, index) => `
      <Placemark>
        <name>航点 ${index + 1}</name>
        <description>
          经度: ${point.lon}<br>
          纬度: ${point.lat}<br>
          海拔: ${point.alt || 0}米
        </description>
        <Point>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${point.lon},${point.lat},${point.alt || 0}</coordinates>
        </Point>
      </Placemark>
    `
      )
      .join("")}
  </Document>
</kml>`;
};
// 修复下载KML的函数
const handleDownloadkml = async (row) => {
  try {
    // 1. 解析row中的航线数据（row.pointsJson是JSON字符串）
    if (!row?.pointsJson) {
      ElMessage.warning("航线数据为空，无法下载");
      return;
    }
    const routeData = JSON.parse(row.pointsJson); // 解析JSON字符串
    console.log("解析后的航线数据:", routeData);

    // 2. 转换为KML格式
    const kmlContent = jsonToKml(routeData); // 调用上面定义的转换函数
    console.log(kmlContent, "kmlContent");

    // 3. 创建文件并下载
    const blob = new Blob([kmlContent], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.name || "航线"}_${row.id}.kml`; // 文件名：航线名称_ID.kml
    document.body.appendChild(link);
    link.click(); // 触发下载

    // 4. 清理资源
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

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    active: "success",
    inactive: "info",
    executing: "warning",
    completed: "success",
    failed: "danger",
  };
  return statusMap[status] || "info";
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    active: "可用",
    inactive: "未激活",
    executing: "执行中",
    completed: "已完成",
    failed: "失败",
  };
  return statusMap[status] || "未知";
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
  ElMessageBox.confirm(`确定要删除航线 ${row.pointsJson} 吗？`, "警告", {
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
  console.log("handleRouteInfoClick", dialogInfo.value);

  dialogRouteVisible.value = true;
  console.log(row);

  let jsonObject = row || JSON.parse(row);
  dialogInfo.value = jsonObject;
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
  margin-bottom: 20px;
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
