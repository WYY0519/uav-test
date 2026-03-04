<template>
  <div class="project-list">
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="org-badge">
              <div class="org-info">
                <h3 class="org-name">所属组织：{{ orgName }}</h3>
              </div>
            </div>
            <div class="title-area">
              <span class="title">项目列表</span>
              <el-tag type="success" effect="plain" class="count-tag">
                共 {{ total }} 个项目
              </el-tag>
            </div>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchQuery"
              placeholder="搜索项目名称"
              class="search-input"
              clearable
              @clear="handleSearchClear"
            >
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
            <el-button
              type="primary"
              :icon="Search"
              @click="handleProjectSearch"
              class="action-button"
            >
              搜索
            </el-button>
            <div style="display: flex">
              <el-button type="primary" @click="refreshList" :loading="loading">
                <el-icon> <Refresh /> </el-icon>刷新
              </el-button>
              <el-button type="success" @click="handleAdd">
                <el-icon> <Plus /> </el-icon>新增项目
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 项目列表 -->
      <el-table
        :data="filteredList"
        border
        stripe
        v-loading="loading"
        class="project-table"
        empty-text="暂无项目数据"
        @row-click="handleRowClick"
        @current-change="handleCurrentRowChange"
        highlight-current-row
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedProjectId"
              :label="row.projectId"
              @change="() => handleProjectSelect(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="项目名称"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="project-name-cell">
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="项目描述"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="projectId"
          label="项目ID"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column
          prop="createdAt"
          label="创建时间"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="centerLatitude"
          label="经纬度"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{
              row.centerLatitude
                ? row.centerLatitude + "," + row.centerLongitude
                : ""
            }}
          </template>
        </el-table-column>

        <el-table-column
          prop="creatorName"
          label="创建人"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.creatorName }}
          </template>
        </el-table-column>
        <el-table-column prop="isArchived" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isArchived ? 'info' : 'success'" effect="dark">
              {{ row.isArchived ? "已归档" : "进行中" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="180"
          style="color: red"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="编辑" placement="top">
                <el-button type="primary" link @click.stop="handleEdit(row)">
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="成员管理" placement="top">
                <el-button type="warning" link @click.stop="handleMembers(row)">
                  <el-icon>
                    <User />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="无人机管理" placement="top">
                <el-button type="success" link @click.stop="handleTasks(row)">
                  <el-icon>
                    <List />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看详情" placement="top">
                <el-button type="info" link @click.stop="handleDetail(row)">
                  <el-icon>
                    <InfoFilled />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" link @click.stop="handleDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
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
    </el-card>

    <!-- 项目详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="500px"
      :destroy-on-close="true"
    >
      <div v-if="currentProject" class="project-detail">
        <div class="detail-header">
          <div class="project-avatar">
            {{ currentProject.name?.charAt(0) || "P" }}
          </div>
          <div class="project-info">
            <h3>{{ currentProject.name }}</h3>
            <div class="project-meta">
              <el-tag
                :type="currentProject.isArchived ? 'info' : 'success'"
                effect="plain"
              >
                {{ currentProject.isArchived ? "已归档" : "进行中" }}
              </el-tag>
            </div>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="项目ID">
                {{ currentProject.projectId }}
              </el-descriptions-item>
              <el-descriptions-item label="项目描述">
                {{ currentProject.description || "暂无描述" }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(currentProject.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ currentProject.creatorName }}
              </el-descriptions-item>
              <el-descriptions-item label="归档状态">
                {{ currentProject.isArchived ? "已归档" : "未归档" }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="设备信息" name="devices">
            <div v-if="uavList.length > 0">
              <el-table
                :data="uavList"
                border
                stripe
                v-loading="loading"
                highlight-current-row
                :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
              >
                <el-table-column
                  prop="name"
                  label="无人机名称"
                  min-width="120"
                />
                <el-table-column
                  prop="deviceNumber"
                  label="无人机编号"
                  min-width="220"
                />
                <el-table-column prop="ip" label="无人机IP" min-width="120" />
                <el-table-column
                  prop="dataPort"
                  label="数据端口"
                  min-width="60"
                />
                <el-table-column
                  prop="controlPort"
                  label="控制端口"
                  min-width="60"
                />
                <el-table-column
                  prop="picturePort"
                  label="图传端口"
                  min-width="60"
                />
                <el-table-column
                  prop="videoIp"
                  label="视频流地址"
                  min-width="280"
                />
                <el-table-column label="操作" width="120" fixed="right">
                  <template #default="{ row }">
                    <el-button type="danger" link @click="handleUavDelete(row)"
                      >删除</el-button
                    >
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无设备数据" />
          </el-tab-pane>

          <el-tab-pane label="任务信息" name="tasks">
            <div v-if="projectTasks.length > 0">
              <el-table :data="projectTasks" border stripe>
                <el-table-column prop="taskName" label="任务名称" />
                <el-table-column prop="status" label="状态">
                  <template #default="{ row }">
                    <el-tag :type="getTaskStatusType(row.status)">
                      {{ getTaskStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="viewTaskDetail(row)"
                    >
                      查看详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无任务数据" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>

  <!-- 编辑项目对话框 -->
  <ProjectEditDialog
    v-model="editDialogVisible"
    :project-data="currentEditProject"
    :title="editDialogTitle"
    :loading="editLoading"
    @confirm="handleEditConfirm"
    @cancel="handleEditCancel"
  />
  <!-- 成员管理对话框 -->
  <ProjectMemberManagement
    v-model:visible="memberDrawerVisible"
    :project-id="selectedProjectId"
    :title="projectTitle"
    :project-name="projectName"
    :org-id="orgId"
    @close="handleMemberDialogClose"
  />
  <!-- 无人机管理对话框 -->
  <UavManagement
    v-model:visible="uavDialogVisible"
    :project-id="selectedProjectId"
    :project-name="projectName"
    @close="handleUavDialogClose"
  />
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useOrganizationStore } from "@/store/modules/organization";
import {
  getProjectList, //查询当前组织下的所有项目
  deleteProject, //删除项目
  editProject, //修改项目
  getProjectDevicesList, //查询项目下所有设备信息
  listUsefulDevice, //显示公司账户下当前可用的设备
  deleteManageProject, //
  getpProjectMembers, //组织成员列表
} from "@/api/project";

import { ElMessageBox, ElMessage } from "element-plus";

import {
  Search,
  Plus,
  Edit,
  Delete,
  InfoFilled,
  Refresh,
  List,
  User,
} from "@element-plus/icons-vue";

import { useProjectStore } from "@/store/modules/project";
import ProjectEditDialog from "./components/ProjectEditDialog.vue"; // 导入编辑组件
import ProjectMemberManagement from "./components/ProjectMemberManagement.vue";
import UavManagement from "./components/UavManagement.vue";
const projectStore = useProjectStore();
const router = useRouter(); //
const orgStore = useOrganizationStore(); //获取
const orgName = ref(orgStore.currentOrgName || "未知组织"); //组织名称
const orgId = ref(orgStore.currentOrgId); //组织ID
const projectName = ref(""); //项目名称
// 基础数据
const projectList = ref([]); //列表
const loading = ref(false); //加载
const searchQuery = ref(""); //搜索
const currentPage = ref(1); //当前页
const pageSize = ref(5); //每页条数
const total = ref(0); //总条数
const drawerVisible = ref(false); //抽屉
const drawerTitle = ref(""); //抽屉标题
const currentProject = ref(null); //当前项目
const activeTab = ref("info"); //当前标签
const projectTasks = ref([]); //项目任务
const editDialogVisible = ref(false); //编辑对话框
const currentEditProject = ref(null);
const editDialogTitle = ref("编辑项目");
const editLoading = ref(false); //编辑加载
const selectedProjectId = ref(""); // 当前选中的项目ID
// 添加成员管理相关的响应式变量
const memberDrawerVisible = ref(false);
const projectTitle = ref("成员管理");
const filteredList = ref([]);
const userlist = ref([]);

// 无人机管理
const uavDialogVisible = ref(false);
const uavList = ref([]); //无人机列表
const addMemberList = ref(); //添加成员列表

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${formatDate(dateString)} ${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// 处理搜索清除
const handleSearchClear = () => {
  searchQuery.value = "";
};

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  refreshProjectList();
};

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  refreshProjectList();
};

// 统一处理项目选择
const handleProjectSelect = (row) => {
  selectedProjectId.value = row.projectId;
  projectName.value = row.name;
  // 存储到全局状态
  projectStore.setSelectedProject(row);
  // 更新路由参数，让父组件能获取到项目信息
  router
    .push({
      query: {
        ...router.currentRoute.value.query,
        projectId: row.projectId,
        projectName: row.name,
      },
    })
    .catch(() => {});
  Userorginlist();
};

// 处理行点击
const handleRowClick = (row) => {
  selectedProjectId.value = row.projectId;
  projectName.value = row.name;
  // 存储到全局状态
  projectStore.setSelectedProject(row);
  // 更新路由参数
  router
    .push({
      query: {
        ...router.currentRoute.value.query,
        projectId: row.projectId,
        projectName: row.name,
      },
    })
    .catch(() => {});
};
//想要在项目点击这个之后在组织页面拿到点击的项目
const handleCurrentRowChange = (currentRow) => {
  if (currentRow) {
    selectedProjectId.value = currentRow.projectId;
    projectName.value = currentRow.name;
    projectStore.setSelectedProject(currentRow);
    // 更新路由参数
    router
      .push({
        query: {
          ...router.currentRoute.value.query,
          projectId: currentRow.projectId,
          projectName: currentRow.name,
        },
      })
      .catch(() => {});
  }
};

// 处理添加项目
const handleAdd = () => {
  router.push("/project/create");
};
// 搜索项目列表
const handleProjectSearch = async () => {
  await refreshProjectList();
};
// 刷新项目列表
const refreshList = () => {
  selectedProjectId.value = "";
  searchQuery.value = "";
  refreshProjectList();
};
//项目列表
const refreshProjectList = async () => {
  loading.value = true;
  const organizationId = orgId.value;
  let data = {
    keyword: searchQuery.value,
    pageSize: pageSize.value,
    pageNum: currentPage.value,
  };
  try {
    //有组织id的时候在调用项目的接口
    if (organizationId) {
      const res = await getProjectList(organizationId, data);
      if (res && res.code == 200 && res.data) {
        projectList.value = res.data;
        filteredList.value = res.data.list;

        total.value = res.data.total;
      } else {
        ElMessage.warning("获取项目列表失败");
      }
    }
  } catch (error) {
    console.error("获取项目列表出错:", error);
    router.push("/organization/list");
    ElMessage.error("获取项目列表出错");
  } finally {
    loading.value = false;
  }
};
// 处理编辑
const handleEdit = (row) => {
  currentEditProject.value = { ...row };
  editDialogVisible.value = true;
};
// 处理详情
const handleDetail = (row) => {
  currentProject.value = row;
  drawerTitle.value = `${row.name} 详情`;
  drawerVisible.value = true;
};
// 任务状态相关
const getTaskStatusType = (status) => {
  console.log(status, "status");

  const statusMap = {
    pending: "info",
    running: "success",
    completed: "primary",
    failed: "danger",
  };
  return statusMap[status] || "";
};
const getTaskStatusText = (status) => {
  console.log(status, "status");

  const statusMap = {
    pending: "待执行",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
  };
  return statusMap[status] || "未知";
};
// 查看任务详情
const viewTaskDetail = (task) => {
  ElMessage.info(`查看任务详情: ${task.taskName}`);
};
// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除项目 【${row.name}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      const projectId = row.projectId;
      const res = await deleteProject(projectId);
      ElMessage.success(`已删除项目: ${row.name}`);
      // 删除项目,刷新项目列表
      refreshProjectList();
    } catch (error) {
      console.error("删除项目失败:", error);
      ElMessage.error("删除项目失败，请重试");
    }
  });
};
// 新增编辑确认处理方法
const handleEditConfirm = async (formData) => {
  try {
    editLoading.value = true;
    const data = {
      name: formData.name,
      description: formData.description,
      centerLatitude: formData.centerLatitude,
      centerLongitude: formData.centerLongitude,
      isArchived: formData.isArchived,
    };
    const res = await editProject(formData.projectId, data);
    if (res.code === 200) {
      ElMessage.success("修改项目成功");
      editDialogVisible.value = false;
      refreshProjectList();
    } else {
      ElMessage.error(res.message || "修改项目失败");
    }
  } catch (error) {
    console.error("修改项目失败:", error);
    ElMessage.error("修改项目失败，请重试");
  } finally {
    editLoading.value = false;
  }
};
// 新增编辑取消处理方法
const handleEditCancel = () => {
  editDialogVisible.value = false;
  currentEditProject.value = null;
};
// 新增：处理成员对话框关闭
const handleMemberDialogClose = () => {
  memberDrawerVisible.value = false;
  projectName.value = "";
};

// 成员管理
const handleMembers = async (row) => {
  selectedProjectId.value = row.projectId;
  projectName.value = row.name;
  memberDrawerVisible.value = true;
};

// 项目无人机管理
const handleTasks = async (row) => {
  try {
    selectedProjectId.value = row.projectId;
    uavDialogVisible.value = true;
    projectName.value = row.name;
    // 获取项目下所有无人机
    const res = await getProjectDevicesList(row.projectId);
    if (res.code === 200) {
      uavList.value = res.data || [];
    } else {
      ElMessage.warning("获取无人机列表失败");
    }
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败");
  }
};
const loadDetailUavList = async () => {
  if (!currentProject.value) return;

  try {
    loading.value = true;
    const res = await getProjectDevicesList(currentProject.value.projectId);
    if (res.code === 200) {
      uavList.value = res.data || [];
    } else {
      ElMessage.warning("获取设备信息失败");
      uavList.value = [];
    }
  } catch (error) {
    console.error("获取设备信息失败:", error);
    ElMessage.error("获取设备信息失败");
    uavList.value = [];
  } finally {
    loading.value = false;
  }
};

// 删除无人机
const handleUavDelete = async (row) => {
  ElMessageBox.confirm(`确定要删除无人机 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      loading.value = true;
      // 这里需要调用删除无人机的API
      const res = await deleteManageProject(
        currentProject.value.projectId,
        row.id,
      );
      if (res.code === 200) {
        ElMessage.success("无人机已删除");
        // 只刷新详情页的设备列表，不打开无人机管理弹窗
        await loadDetailUavList();
      } else {
        ElMessage.error(res.message || "删除无人机失败");
      }
    } catch (error) {
      console.error("删除无人机失败:", error);
      ElMessage.error("删除无人机失败");
    } finally {
      loading.value = false;
    }
  });
};

// 查询组织成员列表
const Userorginlist = async () => {
  const organizationId = orgId.value;
  let projectId = selectedProjectId.value;
  const res = await getpProjectMembers(organizationId, projectId);
  if (res.code === 200) {
    addMemberList.value = res.data;
  }
  userlist.value = res.data;
};
watch(activeTab, async (newValue) => {
  if (newValue === "devices" && currentProject.value) {
    await loadDetailUavList();
  }
});
watch(drawerVisible, (newVal) => {
  // 当抽屉从打开状态变为关闭状态时
  if (!newVal) {
    activeTab.value = "info"; // 重置为"基本信息"标签
  }
});
//
watch(searchQuery, (newVal) => {
  // 当抽屉从打开状态变为关闭状态时
  if (!newVal) {
    refreshProjectList();
  }
});
// 生命周期钩子
onMounted(() => {
  if (router.currentRoute.value.path === "/organization/list/project") {
    refreshProjectList();
  }
  console.log(router.currentRoute.value.path, "router.currentRoute.value.path");
  if (!orgId.value) {
    // ElMessage.warning("未检测到组织ID，请先选择一个组织");
    router.push("/organization/list");
  } else {
    refreshProjectList();
  }
});
</script>

<style scoped>
.list-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.list-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.org-badge {
  display: flex;
  align-items: center;
  gap: 12px;
}

.org-info {
  display: flex;
  flex-direction: column;
}

.org-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.org-type {
  font-size: 12px;
  color: #909399;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.count-tag {
  padding: 4px 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 240px;
}

.filter-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 4px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.status-label {
  margin-left: 16px;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tag {
  cursor: pointer;
  padding: 6px 12px;
  transition: all 0.3s;
}

.filter-tag:hover {
  opacity: 0.8;
}

.project-table {
  margin-top: 16px;
  border-radius: 4px;
  overflow: hidden;
}

.project-name-cell {
  /* display: flex;
  align-items: center;
  gap: 8px; */
}

.project-avatar {
  background-color: var(--el-color-primary);
  color: white;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 项目详情样式 */
.project-detail {
  padding: 0 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.project-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-right: 16px;
}

.project-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.project-meta {
  display: flex;
  gap: 8px;
}

.detail-tabs {
  margin-bottom: 24px;
}

.drawer-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #ebeef5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }

  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-label {
    margin-bottom: 8px;
  }

  .status-label {
    margin-left: 0;
    margin-top: 12px;
  }
}

/* 添加单选框样式 */
:deep(.el-radio) {
  margin-right: 0;
  display: flex;
  justify-content: center;
}

:deep(.el-radio__label) {
  display: none;
}

/* 成员管理样式 */
.member-management {
  /* padding: 0 20px; */
}

.member-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 0 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.project-title {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.member-table {
  margin-bottom: 20px;
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}

.dialog-footer {
  padding-top: 20px;
  text-align: right;
}

/* 无人机管理对话框样式 */
.uav-management {
  /* padding: 20px; */
}

.uav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.project-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 无人机列表表格样式 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table__header) {
  background-color: var(--el-bg-color-page);
}

:deep(.el-table__row) {
  transition: all 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: var(--el-bg-color-page);
}

/* 状态标签样式 */
:deep(.el-tag) {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
}

:deep(.el-tag .el-icon) {
  margin-right: 4px;
  font-size: 14px;
}

/* 新增无人机对话框样式 */
.uav-form {
  padding: 20px;
}

:deep(.el-form-item) {
  margin: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input) {
  width: 100%;
}
/* 对话框底部按钮样式 */
.dialog-footer {
  /* padding-top: 20px; */
  text-align: right;
  border-top: 1px solid var(--el-border-color-light);
}

.dialog-footer .el-button {
  padding: 9px 20px;
  margin-left: 12px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .uav-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .uav-management {
    padding: 12px;
  }

  :deep(.el-dialog) {
    width: 90% !important;
    margin: 5vh auto !important;
  }
}
</style>
