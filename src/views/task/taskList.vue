<template>
  <div class="project-list">
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="org-badge">
              <div class="org-info">
                <h3 class="org-name">所属任务：{{ missionName }}</h3>
              </div>
            </div>
            <div class="title-area">
              <span class="title">任务列表</span>
              <el-tag type="success" effect="plain" class="count-tag">
                共 {{ total }} 个任务
              </el-tag>
            </div>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchQuery"
              placeholder="搜索任务名称"
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
                <el-icon> <Plus /> </el-icon>新增任务
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 任务列表 -->
      <el-table
        :data="filteredList"
        border
        stripe
        v-loading="loading"
        class="project-table"
        empty-text="暂无任务数据"
        @row-click="handleRowClick"
        @current-change="handleCurrentRowChange"
        highlight-current-row
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedMissionId"
              :label="row.missionId"
              @change="() => handleMissionSelect(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column
          prop="missionId"
          label="任务ID"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column
          prop="name"
          label="任务名称"
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
          label="任务描述"
          min-width="180"
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
              <el-tooltip content="航线管理" placement="top">
                <el-button
                  type="info"
                  link
                  @click.stop="handleRouteManage(row)"
                >
                  <el-icon>
                    <DataLine />
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
  </div>

  <!-- 编辑任务对话框 -->
  <el-dialog
    v-model="editDialogVisible"
    title="编辑任务"
    width="500px"
    :show-close="true"
  >
    <div class="edit-project-content">
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit" :loading="editLoading">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
  <!-- 成员管理对话框 -->
  <el-dialog v-model="memberDrawerVisible" title="成员管理" width="800px">
    <div class="member-management">
      <div class="member-header">
        <h3 class="project-title">所属任务：{{ projectName }}</h3>
        <el-button type="success" @click="addMemberDialog">
          <el-icon> <Plus /> </el-icon>添加成员
        </el-button>
      </div>
      <!-- 成员列表 -->
      <el-table
        :data="projectMembers"
        border
        stripe
        class="member-table"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="userName" label="成员名称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <!-- <el-tag :type="row.role" v-for="item in row.role" :key="item">
              {{ item }}
            </el-tag> -->
          </template>
        </el-table-column>
        <el-table-column prop="joinedAt" label="加入时间" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.joinedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" link @click="handleRemoveMember(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="addMemberDialogVisible"
      title="添加任务成员"
      width="500px"
    >
      <div class="member-table">
        <el-table
          :data="addMemberList"
          border
          stripe
          v-loading="loading"
          highlight-current-row
        >
          <el-table-column width="55">
            <template #default="{ row }">
              <el-radio
                v-model="addMemberId"
                :label="row.userId"
                :checkbox="isUavCheckboxChecked"
                @change="handleMemberSelect(row)"
              >
                <span></span>
              </el-radio>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户名称" />
          <el-table-column prop="phone" label="手机号" />
          <el-table-column prop="rolename" label="角色名称" />
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addMemberDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddMember">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
  <!-- 无人机管理 -->
  <el-dialog v-model="uavDialogVisible" title="无人机管理" width="800px">
    <div class="uav-management">
      <div class="uav-header">
        <h3 class="project-title">所属任务：{{ projectName }}</h3>
        <el-button type="success" @click="openAddUavDialog">
          <el-icon> <Plus /> </el-icon>添加无人机
        </el-button>
      </div>
      <el-table
        :data="uavList"
        border
        stripe
        v-loading="loading"
        highlight-current-row
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="name" width="120px" label="无人机名称" />
        <el-table-column
          prop="deviceNumber"
          label="无人机编号"
          width="220px"
          show-overflow-tooltip
        />
        <el-table-column prop="ip" width="120px" label="无人机IP" />
        <el-table-column prop="dataPort" width="100px" label="数据端口" />
        <el-table-column prop="controlPort" width="100px" label="控制端口" />
        <el-table-column prop="picturePort" width="100px" label="图传端口" />
        <el-table-column
          prop="videoIp"
          label="视频流地址"
          width="300"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" link @click="handleUavDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
  <!-- 航线管理 -->
  <el-dialog v-model="routeDialogVisible" title="航线管理" width="800px">
    <div class="uav-management">
      <div class="uav-header">
        <h3 class="project-title">所属任务：{{ projectName }}</h3>
        <el-button type="success" @click="openAddRouteDialog">
          <el-icon> <Plus /> </el-icon>添加航线
        </el-button>
      </div>
      <el-table
        :data="routeList"
        border
        stripe
        v-loading="loading"
        highlight-current-row
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="routeId" width="80px" label="航线ID" />

        <el-table-column prop="routeName" width="120px" label="航线名称" />
        <el-table-column
          prop="description"
          label="航线描述"
          width="220px"
          show-overflow-tooltip
        />
        <el-table-column prop="addedAt" width="220px" label="添加时间">
          <template #default="{ row }">
            {{ row.addedAt.replace("T", " ") }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" link @click="handleRouteDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
  <!-- 新增无人机对话框 -->
  <el-dialog
    v-model="addUavDialogVisible"
    title="新增无人机"
    width="600px"
    destroy-on-close
    style="overflow-y: auto"
  >
    <div class="uav-form">
      <el-table
        :data="availableUavList"
        border
        stripe
        v-loading="loading"
        highlight-current-row
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-checkbox
              v-model="row.show"
              :label="row.userId"
              :checkbox="isUavCheckboxChecked"
              @change="handleUavSelect(row)"
            >
              <span></span>
            </el-checkbox>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="设备名称" />
        <el-table-column prop="deviceNumber" label="设备编号" />
      </el-table>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="addUavDialogCancel">取消</el-button>
        <el-button type="primary" @click="handleUavAdd" :loading="submitLoading"
          >确定</el-button
        >
      </div>
    </template>
  </el-dialog>
  <!-- 新增航线话框 -->
  <el-dialog
    v-model="addRouteDialogVisible"
    title="新增航线"
    width="600px"
    destroy-on-close
    style="overflow-y: auto"
  >
    <div class="uav-form">
      <el-table
        :data="availableRouteList"
        border
        stripe
        v-loading="loading"
        highlight-current-row
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-checkbox
              v-model="row.show"
              :label="row.userId"
              :checkbox="isRouteCheckboxChecked"
              @change="handleRouteSelect(row)"
            >
              <span></span>
            </el-checkbox>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="航线id" />
        <el-table-column prop="name" label="航线名称" />
      </el-table>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="addUavDialogCancel2">取消</el-button>
        <el-button
          type="primary"
          @click="handleUavAdd2"
          :loading="submitLoading"
          >确定</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox, ElMessage } from "element-plus";
import {
  Search,
  Plus,
  Edit,
  Delete,
  DataLine,
  Refresh,
  List,
  User,
} from "@element-plus/icons-vue";

import { useProjectStore } from "@/store/modules/project";
import {
  missionList,
  missionDelete,
  missioAvailableDevices,
  missioAvailableUsers,
  missionUpdate,
  missioDevices,
  missioAssignedDevices,
  missionRemoveDevice,
  missioAssignedUsers,
  missionRemoveUser,
  missioAssignUser,
  missioAvailableRoutes,
  missioAssignRoute,
  missioRoutes,
  missionRemoveRoute,
} from "@/api/mission";

const projectStore = useProjectStore();
const router = useRouter();
const missionName = ref(projectStore.selectedProject?.name || "未知组织"); //组织名称
const missionId = ref(projectStore.selectedProject?.projectId); //组织ID
console.log(missionName);
const projectName = ref(""); //任务名称

// 基础数据
const missionListTable = ref([]); //列表
const loading = ref(false); //加载
const searchQuery = ref(""); //搜索
const currentPage = ref(1); //当前页
const pageSize = ref(5); //每页条数
const total = ref(0); //总条数
const editDialogVisible = ref(false); //编辑对话框
const unusedSelectedUavId = ref(false);
const unusedSelectedRouteId = ref(false);
const isUavCheckboxChecked = ref(false);
const isRouteCheckboxChecked = ref(false);
const editFormRef = ref(null);
const editForm = ref({
  name: "",
  description: "",
  isArchived: false,
}); //任务表单
const editRules = ref({
  name: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  description: [{ required: true, message: "请输入任务描述", trigger: "blur" }],
}); //表单验证规则
const editLoading = ref(false); //编辑加载
const selectedMissionId = ref(""); // 当前选中的任务ID
// 添加成员管理相关的响应式变量
const memberDrawerVisible = ref(false);
const projectMembers = ref([]);
const addMemberDialogVisible = ref(false); //添加成员对话框
const addMemberPhone = ref("");
const addMemberId = ref("");
const filteredList = ref([]);
const userlist = ref([]);

// 无人机管理
const uavDialogVisible = ref(false);
const routeDialogVisible = ref(false);
const addUavDialogVisible = ref(false);
const addRouteDialogVisible = ref(false);
const uavList = ref([]); //无人机列表
const routeList = ref([]); //无人机列表
const availableUavList = ref(); //添加无人机列表
const availableRouteList = ref(); //添加无人机列表
const addMemberList = ref(); //添加成员列表

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${formatDate(dateString)} ${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// 处理搜索清除
const handleSearchClear = () => {
  searchQuery.value = "";
};

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  refreshMissionList();
};

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  refreshMissionList();
};

// 统一处理任务选择
const handleMissionSelect = (row) => {
  selectedMissionId.value = row.missionId;
  projectName.value = row.name;
  console.log("选中任务:", row);
};

// 处理行点击
const handleRowClick = (row) => {
  selectedMissionId.value = row.missionId;
  projectName.value = row.name;
  console.log("选中任务:", row);
};
//想要在任务点击这个之后在组织页面拿到点击的任务
// 处理当前行变化
const handleCurrentRowChange = (currentRow) => {
  if (currentRow) {
    selectedMissionId.value = currentRow.missionId;
    projectName.value = currentRow.name;
  }
};

// 处理添加任务
const handleAdd = () => {
  console.log(router.currentRoute.value.query);
  router.push({
    path: "/task/create",
    query: router.currentRoute.value.query,
  });
};
// 搜索任务列表
const handleProjectSearch = async () => {
  console.log("搜索按钮");
  await refreshMissionList();
};
// 刷新任务列表
const refreshList = () => {
  selectedMissionId.value = "";
  searchQuery.value = "";
  refreshMissionList();
  console.log(selectedMissionId.value, "selectedMissionId");
};
//任务列表
const refreshMissionList = async () => {
  loading.value = true;
  const organizationId = missionId.value;
  let data = {
    keyword: searchQuery.value,
    pageSize: pageSize.value,
    pageNum: currentPage.value,
  };
  try {
    //有组织id的时候在调用任务的接口
    if (organizationId) {
      const res = await missionList(organizationId, data);
      if (res && res.code == 200 && res.data) {
        missionListTable.value = res.data;
        filteredList.value = res.data.list;

        total.value = res.data.total;
      } else {
        ElMessage.warning("获取任务列表失败");
      }
    }
  } catch (error) {
    console.error("获取任务列表出错:", error);
    // router.push("/organization/list"); 暂时注释 测试
    ElMessage.error("获取任务列表出错");
  } finally {
    loading.value = false;
  }
};

// 处理编辑
const handleEdit = (row) => {
  editDialogVisible.value = true;
  console.log(row, "row");
  editForm.value = {
    name: row.name,
    description: row.description,
    missionId: row.missionId,
  };
};

// 处理删除
const handleDelete = (row) => {
  console.log(row, "====");

  ElMessageBox.confirm(`确定要删除任务 【${row.name}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      const missionId = row.missionId;
      const res = await missionDelete(missionId);
      console.log(res, "res删除任务");
      ElMessage.success(`已删除任务: ${row.name}`);
      // 删除任务,刷新任务列表
      refreshMissionList();
    } catch (error) {
      console.error("删除任务失败:", error);
      ElMessage.error("删除任务失败，请重试");
    }
  });
};

// 修改任务
const confirmEdit = async () => {
  editFormRef.value.validate(async (valid) => {
    let missionId = editForm.value.missionId;
    console.log(editForm.value, "missionId");

    if (!valid) return;
    try {
      const data = {
        name: editForm.value.name,
        description: editForm.value.description,
      };
      const res = await missionUpdate(missionId, data);
      if (res.code === 200) {
        ElMessage.success("修改任务成功");
        editDialogVisible.value = false;
        refreshMissionList();
      }
    } catch (error) {
      console.error("修改任务失败:", error);
      ElMessage.error("修改任务失败，请重试");
    }
  });
};

//成员管理抽屉
const addMemberDialog = async () => {
  addMemberDialogVisible.value = true;
  await fetchAvailableMemberList();
};

// 处理删除成员
const handleRemoveMember = (row) => {
  const currentProjectId = selectedMissionId.value;

  if (!currentProjectId) {
    ElMessage.error("未选择任务");
    return;
  }

  ElMessageBox.confirm(`确定要移除成员 ${row.userName} 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      const res = await missionRemoveUser(currentProjectId, row.userId);

      if (res.code === 200) {
        ElMessage.success("成员已移除");

        // 直接重新获取成员列表，不调用 handleMembers
        await refreshMemberList(currentProjectId);
      } else {
        ElMessage.error(res.message || "移除成员失败");
      }
    } catch (error) {
      console.error("删除成员出错:", error);
      ElMessage.error("移除成员时发生错误");
    }
  });
};

// 新增一个专门刷新成员列表的方法
const refreshMemberList = async (missionId) => {
  if (!missionId) missionId = selectedMissionId.value;

  try {
    const res = await missioAssignedUsers(missionId);
    console.log(res, "任务成员列表");

    if (res.code === 200) {
      projectMembers.value = res.data;
      return true;
    } else {
      ElMessage.error(res.message || "获取成员列表失败");
      return false;
    }
  } catch (error) {
    console.error("获取成员列表出错:", error);
    ElMessage.error("获取成员列表失败");
    return false;
  }
};

// 修改 handleMembers 方法
const handleMembers = async (row) => {
  console.log(row, "任务信息");

  // 更新选中的项目
  selectedMissionId.value = row.missionId;
  projectName.value = row.name;

  // 打开抽屉
  memberDrawerVisible.value = true;

  // 刷新成员列表
  await refreshMemberList(row.missionId);
};
//添加任务成员
const handleAddMember = async () => {
  try {
    const res = await missioAssignUser(selectedMissionId.value, {
      role: "11", // 或者根据实际需要设置角色
      userId: addMemberId.value,
    });
    console.log(res, "添加任务成员结果");
    if (res.code === 200) {
      ElMessage.success("添加任务成员成功");
      addMemberDialogVisible.value = false;
      addMemberId.value = "";
      addMemberPhone.value = "";

      // 刷新成员列表
      await refreshMemberList(selectedMissionId.value);
    } else {
      ElMessage.error(res.message || "添加成员失败");
    }
  } catch (error) {
    console.error("添加成员出错:", error);
    ElMessage.error("添加成员失败");
  }
};

// 任务无人机管理
const handleTasks = async (row) => {
  console.log(row, "row任务无人机管理");
  try {
    selectedMissionId.value = row.missionId;
    uavDialogVisible.value = true;
    projectName.value = row.name;
    // 获取任务下所有无人机
    let data = {
      missionId: row.missionId,
    };
    const res = await missioAssignedDevices(selectedMissionId.value);
    console.log(res, "resresres");

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
// 任务航线管理
const handleRouteManage = async (row) => {
  console.log(row, "row任务无人机管理");
  try {
    selectedMissionId.value = row.missionId;
    routeDialogVisible.value = true;
    projectName.value = row.name;
    // 获取任务下所有无人机
    let data = {
      missionId: row.missionId,
    };
    const res = await missioRoutes(selectedMissionId.value);
    console.log(res, "resresres");

    if (res.code === 200) {
      routeList.value = res.data || [];
    } else {
      ElMessage.warning("获取无人机列表失败");
    }
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败");
  }
};
// 新增无人机
const handleUavAdd = async (row) => {
  try {
    const missionId = { missionId: selectedMissionId.value };
    let selectedUavIds = [];
    console.log(missionId, "res");
    availableUavList.value.map((item) => {
      console.log(item, "efrghdgklmd,se");

      if (item?.show) {
        selectedUavIds.push(item?.id);
      }
    });
    console.log(selectedUavIds, "selectedUavIds");

    let data = {
      deviceIds: selectedUavIds.join(","),
    };

    if (selectedUavIds.length > 0) {
      const res = await missioDevices(missionId.missionId, data);
      if (res.code === 200) {
        ElMessage.success("新增成功");
        addUavDialogVisible.value = false;
        handleTasks(missionId); //任务无人机管理
      } else {
        ElMessage.error("新增失败");
      }
    } else {
      addUavDialogVisible.value = false;
    }
  } catch (error) {
    console.log(error);
  }
};
//新增航线
const handleUavAdd2 = async (row) => {
  try {
    const missionId = { missionId: selectedMissionId.value };
    let selectedRouteIds = [];
    console.log(missionId, "res");
    availableRouteList.value.map((item) => {
      console.log(item, "efrghdgklmd,se");

      if (item?.show) {
        selectedRouteIds.push(item?.id);
      }
    });
    console.log(selectedRouteIds, "selectedRouteIds");

    let data = {
      missionDataIds: selectedRouteIds.join(","),
    };

    if (selectedRouteIds.length > 0) {
      const res = await missioAssignRoute(missionId.missionId, data);
      if (res.code === 200) {
        ElMessage.success("新增成功");
        addRouteDialogVisible.value = false;
        handleRouteManage(missionId); //任务无人机管理
      } else {
        ElMessage.error("新增失败");
      }
    } else {
      addRouteDialogVisible.value = false;
    }
  } catch (error) {
    console.log(error);
  }
};
//取消
const addUavDialogCancel = () => {
  addUavDialogVisible.value = false;
  unusedSelectedUavId.value = false;
};
const addUavDialogCancel2 = () => {
  addRouteDialogVisible.value = false;
  unusedSelectedRouteId.value = false;
};
// 删除无人机
const handleUavDelete = async (row) => {
  ElMessageBox.confirm(`确定要移除无人机吗？${row.name}`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    const missionId = { missionId: selectedMissionId.value };
    const res = await missionRemoveDevice(missionId.missionId, row.id);
    if (res.code === 200) {
      ElMessage.success("无人机已删除");
      uavList.value = uavList.value.filter(
        (item) => item.deviceId !== row.deviceId
      );
      console.log(missionId, "missionId");
      handleTasks(missionId);
    }
  });
};
// 删除航线
const handleRouteDelete = async (row) => {
  ElMessageBox.confirm(`确定要移除航线吗？${row.routeName}`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    const missionId = { missionId: selectedMissionId.value };
    const res = await missionRemoveRoute(missionId.missionId, row.routeId);
    if (res.code === 200) {
      ElMessage.success("航线已删除");
      routeList.value = routeList.value.filter(
        (item) => item.deviceId !== row.deviceId
      );
      console.log(missionId, "missionId");
      handleRouteManage(missionId);
    }
  });
};

// 查询组织成员列表
const fetchAvailableMemberList = async () => {
  let data = {
    missionId: selectedMissionId.value,
  };
  console.log(data, missionId.value);
  let projectId = selectedMissionId.value;
  const res = await missioAvailableUsers(missionId.value, data);
  if (res.code === 200) {
    addMemberList.value = res.data;
  }
  console.log(res.data, "+++++++++成员列表");
  userlist.value = res.data;
};
//添加无人机按钮
const openAddUavDialog = () => {
  addUavDialogVisible.value = true;
  fetchAvailableUavList(); //调用新增无人机列表信息
};
//添加航线按钮

const openAddRouteDialog = () => {
  addRouteDialogVisible.value = true;
  fetchAvailableRouteList(); //调用新增无人机列表信息
};
//新增无人机列表信息
const fetchAvailableUavList = async () => {
  console.log("新增无人机列表信息");
  try {
    loading.value = true;
    let data = {
      missionId: selectedMissionId.value,
    };
    console.log(data, missionId.value);

    const res = await missioAvailableDevices(missionId.value, data);
    if (res.code === 200) {
      availableUavList.value = res.data || [];
    } else {
      ElMessage.error(res.message || "获取设备列表失败");
    }
  } catch (error) {
    console.error("获取设备列表失败:", error);
    ElMessage.error("获取设备列表失败");
  } finally {
    loading.value = false;
  }
};

//新增航线列表信息
const fetchAvailableRouteList = async () => {
  console.log("新增无人机列表信息");
  try {
    loading.value = true;
    let data = {
      missionId: selectedMissionId.value,
    };
    console.log(data, missionId.value);
    const res = await missioAvailableRoutes(data);
    if (res.code === 200) {
      availableRouteList.value = res.data || [];
    } else {
      ElMessage.error(res.message || "获取设备列表失败");
    }
  } catch (error) {
    console.error("获取设备列表失败:", error);
    ElMessage.error("获取设备列表失败");
  } finally {
    loading.value = false;
  }
};
//处理单选框变化--新增无人机对话框
const handleUavSelect = (row) => {
  console.log(row, "=====");
  isUavCheckboxChecked.value = !isUavCheckboxChecked.value;
};
//处理单选框变化--新增航线对话框
const handleRouteSelect = (row) => {
  console.log(row, "=====");
  isRouteCheckboxChecked.value = !isRouteCheckboxChecked.value;
};
//处理单选框变化 -- 添加成员对话框
const handleMemberSelect = (row) => {
  console.log(row, "row添加成员对话框");

  //单选
  addMemberId.value = row.userId;
  addMemberPhone.value = row.phone;
};
watch(searchQuery, (newVal) => {
  // 当抽屉从打开状态变为关闭状态时
  if (!newVal) {
    refreshMissionList();
  }
});
// 生命周期钩子
onMounted(() => {
  if (router.currentRoute.value.path === "/organization/list/task") {
    refreshMissionList();
  }
  if (!missionId.value) {
    if (router.currentRoute.value.path === "/organization/list") {
      ElMessage.warning("未检测到组织ID，请先选择一个任务");
      router.push("/organization/list");
    } else {
      ElMessage.warning("请先选择一个项目");
      router.push("/organization/list/project");
      router.push({
        path: "/organization/list/project",
        query: router.currentRoute.value.query,
      });
    }
  } else {
    refreshMissionList();
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
  display: flex;
  align-items: center;
  gap: 8px;
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

/* 任务详情样式 */
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
