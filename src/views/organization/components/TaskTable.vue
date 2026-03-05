<template>
  <CommonTable
    title="任务列表"
    :table-data="tableData"
    :columns="columns"
    :total="total"
    :loading="loading"
    row-key="taskId"
    :show-selection="false"
    :action-width="300"
  >
    <template #org-header>
      <div class="org-header-wrapper">所属项目：{{ projectName }}</div>
    </template>
    <template #header-actions>
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务名称"
        class="search-input"
        clearable
        @clear="handleSearchClear"
        @input="handleInputSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="refreshList" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-button type="success" :icon="Plus" @click="handleAddTask">
        新增任务
      </el-button>
    </template>
    <template #isArchived="{ row }">
      <el-tag :type="row.isArchived ? 'info' : 'success'" effect="dark">
        {{ row.isArchived ? "已归档" : "进行中" }}
      </el-tag>
    </template>

    <template #action="{ row }">
      <el-tooltip content="编辑" placement="top">
        <el-button type="primary" link @click="handleEdit(row)">
          <el-icon><Edit /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="成员管理" placement="top">
        <el-button type="warning" link @click="handleMembers(row)">
          <el-icon><User /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="无人机管理" placement="top">
        <el-button type="success" link @click="handleUavManage(row)">
          <el-icon><List /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="航线管理" placement="top">
        <el-button type="info" link @click="handleRouteManage(row)">
          <el-icon><DataLine /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="删除" placement="top">
        <el-button type="danger" link @click="handleDelete(row)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
    </template>

    <template #status="{ row }">
      <el-tag :type="getStatusType(row.status)" effect="dark">
        {{ getStatusText(row.status) }}
      </el-tag>
    </template>

    <template #createdAt="{ row }">
      {{ formatDate(row.createdAt) }}
    </template>

    <template #pagination>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </template>
  </CommonTable>

  <!-- 编辑任务弹窗 -->
  <CommonFormDialog
    ref="editFormDialogRef"
    :form-dialog-title="editDialogTitle"
    :model-value="editDialogVisible"
    @update:model-value="editDialogVisible = $event"
    :form-items="editFormItems"
    :initial-data="editFormData"
    :form-rules="editFormRules"
    :validate-before-submit="true"
    @submit="handleEditSubmit"
  />

  <!-- 成员管理弹窗 -->
  <el-dialog
    v-model="membersDialogVisible"
    title="成员管理"
    width="50%"
    @close="membersDialogVisible = false"
  >
    <div class="members-table-container">
      <CommonTable
        ref="membersTableComponent"
        :title="`所属任务-${currentMission?.name || ''}`"
        :table-data="membersTableData"
        :columns="memberColumns"
        :total="membersTableData.length"
        :loading="membersLoading"
        :show-selection="false"
        :show-action="true"
        :action-width="100"
        :row-key="(row) => row.userId"
      >
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDeleteMember(row)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
        <template #header-actions>
          <el-button type="success" :icon="Plus" @click="handleAddMember">
            添加成员
          </el-button>
        </template>
      </CommonTable>
    </div>
  </el-dialog>

  <!-- 添加成员弹窗 -->
  <el-dialog
    v-model="addMemberDialogVisible"
    title="添加成员"
    width="50%"
    @close="addMemberDialogVisible = false"
  >
    <div class="add-member-table-container">
      <CommonTable
        ref="addMemberTableComponent"
        title="可添加的成员列表"
        :table-data="addMemberTableData"
        :columns="availableMemberColumns"
        :total="addMemberTableData.length"
        :loading="addMemberLoading"
        :show-selection="true"
        :show-action="false"
        :row-key="(row) => row.userId"
        :reserve-selection="false"
        @selection-change="handleAddMemberSelectionChange"
      />
    </div>
    <template #footer>
      <el-button @click="addMemberDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddMemberSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>

  <!-- 无人机管理弹窗 -->
  <el-dialog
    v-model="uavManageDialogVisible"
    title="无人机管理"
    width="50%"
    @close="uavManageDialogVisible = false"
  >
    <div class="uav-table-container">
      <CommonTable
        ref="uavTableComponent"
        :title="`所属任务-${currentMission?.name || ''}`"
        :table-data="uavTableData"
        :columns="uavColumns"
        :total="uavTableData.length"
        :loading="uavLoading"
        :show-selection="false"
        :show-action="true"
        :action-width="150"
        :row-key="(row) => row.id"
      >
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDeleteUav(row)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
        <template #header-actions>
          <el-button type="success" :icon="Plus" @click="handleAddUav">
            添加无人机
          </el-button>
        </template>
      </CommonTable>
    </div>
  </el-dialog>

  <!-- 添加无人机弹窗 -->
  <el-dialog
    v-model="addUavDialogVisible"
    title="添加无人机"
    width="50%"
    @close="addUavDialogVisible = false"
  >
    <div class="add-uav-table-container">
      <CommonTable
        ref="addUavTableComponent"
        title="可添加的设备列表"
        :table-data="addUavTableData"
        :columns="addUavColumns"
        :total="addUavTableData.length"
        :loading="addUavLoading"
        :show-selection="true"
        :show-action="false"
        :row-key="(row) => row.id"
        :reserve-selection="false"
        @selection-change="handleAddUavSelectionChange"
      />
    </div>
    <template #footer>
      <el-button @click="addUavDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddUavSubmit"> 确定 </el-button>
    </template>
  </el-dialog>

  <!-- 航线管理弹窗 -->
  <el-dialog
    v-model="routeManageDialogVisible"
    title="航线管理"
    width="50%"
    @close="routeManageDialogVisible = false"
  >
    <div class="route-table-container">
      <CommonTable
        ref="routeTableComponent"
        :title="`所属任务-${currentMission?.name || ''}`"
        :table-data="routeTableData"
        :columns="routeColumns"
        :total="routeTableData.length"
        :loading="routeLoading"
        :show-selection="false"
        :show-action="true"
        :action-width="100"
        :row-key="(row) => row.missionDataId"
      >
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDeleteRoute(row)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
        <template #header-actions>
          <el-button type="success" :icon="Plus" @click="handleAddRoute">
            添加航线
          </el-button>
        </template>
      </CommonTable>
    </div>
  </el-dialog>

  <!-- 添加航线弹窗 -->
  <el-dialog
    v-model="addRouteDialogVisible"
    title="添加航线"
    width="50%"
    @close="addRouteDialogVisible = false"
  >
    <div class="add-route-table-container">
      <CommonTable
        ref="addRouteTableComponent"
        title="可添加的航线列表"
        :table-data="addRouteTableData"
        :columns="availableRouteColumns"
        :total="addRouteTableData.length"
        :loading="addRouteLoading"
        :show-selection="true"
        :show-action="false"
        :row-key="(row) => row.id"
        :reserve-selection="false"
        @selection-change="handleAddRouteSelectionChange"
      />
    </div>
    <template #footer>
      <el-button @click="addRouteDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddRouteSubmit"> 确定 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import {
  Search,
  Refresh,
  Edit,
  Delete,
  User,
  List,
  DataLine,
  Plus,
} from "@element-plus/icons-vue";
import {
  missionList,
  missionCreate,
  missionDelete,
  missionUpdate,
  missioAssignedUsers,
  missioAvailableUsers,
  missioAssignUser,
  missionRemoveUser,
  missioAssignedDevices,
  missioAvailableDevices,
  missioDevices,
  missionRemoveDevice,
  missioRoutes,
  missioAvailableRoutes,
  missioAssignRoute,
  missionRemoveRoute,
} from "@/api/mission";
import { ElMessage, ElMessageBox } from "element-plus";
import CommonTable from "@/components/CommonTable.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";
import service from "@/utils/request";

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: null,
  },
  projectName: {
    type: [String],
    default: null,
  },
});
console.log(props, "props");

const projectName = ref(props.projectName);
// 状态变量
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const tableData = ref([]);

// 搜索关键词
const searchQuery = ref("");

// 编辑弹窗状态
const editDialogVisible = ref(false);
const editDialogTitle = ref("编辑任务");
const editFormData = ref({});
const currentEditRow = ref(null);
const isAddTask = ref(false);

// 成员管理弹窗状态
const membersDialogVisible = ref(false);
const currentMission = ref(null);
const membersTableData = ref([]);
const membersLoading = ref(false);

// 添加成员弹窗状态
const addMemberDialogVisible = ref(false);
const addMemberTableData = ref([]);
const addMemberLoading = ref(false);
const addMemberSelectedUser = ref([]);

// 无人机管理弹窗状态
const uavManageDialogVisible = ref(false);
const uavTableData = ref([]);
const uavLoading = ref(false);

// 添加无人机弹窗状态
const addUavDialogVisible = ref(false);
const addUavTableData = ref([]);
const addUavLoading = ref(false);
const addUavSelectedDevice = ref([]);

// 航线管理弹窗状态
const routeManageDialogVisible = ref(false);
const routeTableData = ref([]);
const routeLoading = ref(false);

// 添加航线弹窗状态
const addRouteDialogVisible = ref(false);
const addRouteTableData = ref([]);
const addRouteLoading = ref(false);
const addRouteSelectedRoute = ref([]);

// 表格列配置
const columns = [
  {
    prop: "name",
    label: "任务名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "createdBy",
    label: "创建人",
    width: "120",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "description",
    label: "任务描述",
    width: "250",
    showOverflowTooltip: true,
  },

  {
    prop: "isArchived",
    label: "状态",
    width: "100",
    align: "center",
    showOverflowTooltip: true,
    slotName: "isArchived",
  },
  {
    prop: "createdAt",
    label: "创建时间",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
    slotName: "createdAt",
  },
];

// 成员列表列配置
const memberColumns = [
  {
    prop: "userName",
    label: "成员名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "phone",
    label: "手机号",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "role",
    label: "角色",
    width: "120",
    align: "center",
    showOverflowTooltip: true,
  },
  // {
  //   prop: "createdAt",
  //   label: "加入时间",
  //   width: "200",
  //   align: "center",
  //   showOverflowTooltip: true,
  // },
];

// 可添加成员列表列配置
const availableMemberColumns = [
  {
    prop: "username",
    label: "用户名",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "realName",
    label: "真实姓名",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "phone",
    label: "手机号",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 无人机列表列配置
const uavColumns = [
  {
    prop: "name",
    label: "无人机名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "deviceNumber",
    label: "无人机编号",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "ip",
    label: "无人机IP",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "dataPort",
    label: "数据端口",
    width: "100",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "controlPort",
    label: "控制端口",
    width: "100",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "picturePort",
    label: "图传端口",
    width: "100",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 可添加设备列表列配置
const addUavColumns = [
  {
    prop: "name",
    label: "设备名称",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 航线列表列配置
const routeColumns = [
  {
    prop: "routeId",
    label: "航线ID",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "routeName",
    label: "航线名称",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "description",
    label: "航线描述",
    width: "250",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "createdAt",
    label: "创建时间",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 可添加航线列表列配置
const availableRouteColumns = [
  {
    prop: "id",
    label: "航线ID",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "name",
    label: "航线名称",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 编辑表单配置
const editFormItems = [
  {
    prop: "name",
    label: "任务名称",
    type: "input",
    required: true,
    maxlength: 20,
    placeholder: "请输入任务名称",
  },
  {
    prop: "description",
    label: "任务描述",
    type: "textarea",
    required: true,
    maxlength: 200,
    rows: 4,
    placeholder: "请输入任务描述",
  },
];

// 编辑表单校验规则
const editFormRules = {
  name: [
    { required: true, message: "请输入任务名称", trigger: "blur" },
    { max: 20, message: "任务名称最多20个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入任务描述", trigger: "blur" },
    { max: 200, message: "任务描述最多200个字符", trigger: "blur" },
  ],
};

// 状态转换函数
const getStatusText = (status) => {
  const statusMap = {
    pending: "待执行",
    running: "执行中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return statusMap[status] || status;
};

// 状态类型转换函数
const getStatusType = (status) => {
  const typeMap = {
    pending: "info",
    running: "primary",
    completed: "success",
    cancelled: "danger",
  };
  return typeMap[status] || "info";
};

// 格式化日期函数
const formatDate = (date) => {
  if (!date) return "暂无数据";
  try {
    // 替换 T 为空格
    const formattedDate = date.replace("T", " ");
    return formattedDate;
  } catch (error) {
    return date;
  }
};

// 获取任务列表
const getTaskListData = async () => {
  if (!props.projectId) {
    return;
  }

  loading.value = true;
  try {
    const res = await missionList(props.projectId, {
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value,
    });

    if (res && res.code === 200 && res.data) {
      tableData.value = res.data.list || [];
      total.value = res.data.total || 0;
    }
  } catch (error) {
    console.error("获取任务列表失败:", error);
    ElMessage.error("获取任务列表失败，请重试");
  } finally {
    loading.value = false;
  }
};

// 防抖函数
const debounce = (fn, delay = 500) => {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// 防抖后的搜索函数
const debouncedSearch = debounce(async () => {
  currentPage.value = 1;
  await getTaskListData();
}, 500);

// 输入框输入触发搜索
const handleInputSearch = () => {
  debouncedSearch();
};

// 清空输入框触发搜索
const handleSearchClear = () => {
  searchQuery.value = "";
  debouncedSearch();
};

// 搜索
const handleSearch = async () => {
  currentPage.value = 1;
  await getTaskListData();
};

// 刷新列表
const refreshList = async () => {
  currentPage.value = 1;
  await getTaskListData();
};

// 分页
const handleSizeChange = async (val) => {
  pageSize.value = val;
  await getTaskListData();
};

const handleCurrentChange = async (val) => {
  currentPage.value = val;
  await getTaskListData();
};

// 表格操作
const handleEdit = (row) => {
  console.log("编辑任务:", row);
  currentEditRow.value = row;
  editFormData.value = {
    missionId: row.missionId,
    name: row.name,
    description: row.description,
  };
  editDialogTitle.value = "编辑任务";
  isAddTask.value = false;
  editDialogVisible.value = true;
};

// 新增任务
const handleAddTask = () => {
  console.log("新增任务");
  currentEditRow.value = null;
  editFormData.value = {
    missionId: null,
    name: "",
    description: "",
  };
  editDialogTitle.value = "新增任务";
  isAddTask.value = true;
  editDialogVisible.value = true;
};

// 编辑表单提交
const handleEditSubmit = async (formData) => {
  try {
    let res;
    if (isAddTask.value) {
      // 新增任务
      res = await missionCreate(props.projectId, {
        name: formData.name,
        description: formData.description,
      });
    } else {
      // 编辑任务
      res = await missionUpdate(formData.missionId, {
        name: formData.name,
        description: formData.description,
      });
    }

    if (res && res.code === 200) {
      ElMessage.success(isAddTask.value ? "新增任务成功" : "编辑任务成功");
      editDialogVisible.value = false;
      await getTaskListData();
    } else {
      ElMessage.error(res?.message || "操作失败");
    }
  } catch (error) {
    console.error("操作失败:", error);
    ElMessage.error(isAddTask.value ? "新增任务失败" : "编辑任务失败，请重试");
  }
};

// 成员管理
const handleMembers = (row) => {
  console.log("任务成员管理:", row);
  currentMission.value = row;
  membersDialogVisible.value = true;
  getMembersList();
};

// 获取任务成员列表
const getMembersList = async () => {
  if (!currentMission.value) return;

  membersLoading.value = true;
  try {
    const res = await missioAssignedUsers(currentMission.value.missionId);
    if (res && res.code === 200 && res.data) {
      membersTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取任务成员列表失败:", error);
    ElMessage.error("获取任务成员列表失败，请重试");
  } finally {
    membersLoading.value = false;
  }
};

// 删除任务成员
const handleDeleteMember = (row) => {
  ElMessageBox.confirm(`确定要删除成员 【${row.username}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        const res = await missionRemoveUser(
          currentMission.value.missionId,
          row.userId,
        );
        if (res && res.code === 200) {
          ElMessage.success("删除成功");
          await getMembersList();
        } else {
          ElMessage.error(res?.message || "删除失败");
        }
      } catch (error) {
        console.error("删除成员失败:", error);
        ElMessage.error("删除成员失败，请重试");
      }
    })
    .catch(() => {});
};

// 打开添加成员弹窗
const handleAddMember = () => {
  addMemberSelectedUser.value = [];
  addMemberTableData.value = [];
  addMemberDialogVisible.value = true;
  getAvailableMembers();
};

// 获取可添加成员列表
const getAvailableMembers = async () => {
  addMemberLoading.value = true;
  try {
    const res = await missioAvailableUsers(props.projectId);
    if (res && res.code === 200 && res.data) {
      addMemberTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取可添加成员列表失败:", error);
    ElMessage.error("获取可添加成员列表失败，请重试");
  } finally {
    addMemberLoading.value = false;
  }
};

// 成员选择变化
const handleAddMemberSelectionChange = (selection) => {
  addMemberSelectedUser.value = selection;
};

// 提交添加成员
const handleAddMemberSubmit = async () => {
  if (addMemberSelectedUser.value.length === 0) {
    ElMessage.warning("请选择至少一个成员");
    return;
  }

  try {
    let successCount = 0;
    for (const user of addMemberSelectedUser.value) {
      const res = await missioAssignUser(currentMission.value.missionId, {
        userId: user.userId,
      });
      if (res && res.code === 200) {
        successCount++;
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功添加 ${successCount} 个成员`);
      addMemberDialogVisible.value = false;
      await getMembersList();
    } else {
      ElMessage.error("添加成员失败");
    }
  } catch (error) {
    console.error("添加成员失败:", error);
    ElMessage.error("添加成员失败，请重试");
  }
};

// 无人机管理
const handleUavManage = (row) => {
  console.log("无人机管理:", row);
  currentMission.value = row;
  uavManageDialogVisible.value = true;
  getUavList();
};

// 获取无人机列表
const getUavList = async () => {
  if (!currentMission.value) return;

  uavLoading.value = true;
  try {
    const res = await missioAssignedDevices(currentMission.value.missionId);
    if (res && res.code === 200 && res.data) {
      uavTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败，请重试");
  } finally {
    uavLoading.value = false;
  }
};

// 删除无人机
const handleDeleteUav = async (row) => {
  ElMessageBox.confirm(`确定要删除无人机 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      loading.value = true;
      const res = await missionRemoveDevice(
        currentMission.value.missionId,
        row.id,
      );
      if (res.code === 200) {
        ElMessage.success("无人机已删除");
        await getUavList();
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

// 打开添加无人机弹窗
const handleAddUav = () => {
  addUavSelectedDevice.value = [];
  addUavTableData.value = [];
  addUavDialogVisible.value = true;
  getAvailableDevices();
};

// 获取可用设备列表
const getAvailableDevices = async () => {
  addUavLoading.value = true;
  try {
    let data = {
      missionId: currentMission.value.missionId,
    };
    const res = await missioAvailableDevices(props.projectId, data);
    if (res && res.code === 200 && res.data) {
      addUavTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取可用设备列表失败:", error);
    ElMessage.error("获取可用设备列表失败，请重试");
  } finally {
    addUavLoading.value = false;
  }
};

// 无人机选择变化
const handleAddUavSelectionChange = (selection) => {
  addUavSelectedDevice.value = selection;
};

// 提交添加无人机
const handleAddUavSubmit = async () => {
  if (addUavSelectedDevice.value.length === 0) {
    ElMessage.warning("请选择至少一个设备");
    return;
  }

  try {
    let successCount = 0;
    for (const device of addUavSelectedDevice.value) {
      const res = await missioDevices(currentMission.value.missionId, {
        deviceId: device.id,
      });
      if (res && res.code === 200) {
        successCount++;
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功添加 ${successCount} 个设备`);
      addUavDialogVisible.value = false;
      await getUavList();
    } else {
      ElMessage.error("添加设备失败");
    }
  } catch (error) {
    console.error("添加设备失败:", error);
    ElMessage.error("添加设备失败，请重试");
  }
};

// 航线管理
const handleRouteManage = (row) => {
  console.log("航线管理:", row);
  currentMission.value = row;
  routeManageDialogVisible.value = true;
  getRouteList();
};

// 获取航线列表
const getRouteList = async () => {
  if (!currentMission.value) return;

  routeLoading.value = true;
  try {
    const res = await missioRoutes(currentMission.value.missionId);
    if (res && res.code === 200 && res.data) {
      routeTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取航线列表失败:", error);
    ElMessage.error("获取航线列表失败，请重试");
  } finally {
    routeLoading.value = false;
  }
};

// 删除航线
const handleDeleteRoute = async (row) => {
  ElMessageBox.confirm(`确定要删除航线 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      loading.value = true;
      const res = await missionRemoveRoute(
        currentMission.value.missionId,
        row.missionDataId,
      );
      if (res.code === 200) {
        ElMessage.success("航线已删除");
        await getRouteList();
      } else {
        ElMessage.error(res.message || "删除航线失败");
      }
    } catch (error) {
      console.error("删除航线失败:", error);
      ElMessage.error("删除航线失败");
    } finally {
      loading.value = false;
    }
  });
};

// 打开添加航线弹窗
const handleAddRoute = () => {
  addRouteSelectedRoute.value = [];
  addRouteTableData.value = [];
  addRouteDialogVisible.value = true;
  getAvailableRoutes();
};

// 获取可用航线列表
const getAvailableRoutes = async () => {
  addRouteLoading.value = true;
  try {
    loading.value = true;
    let data = {
      missionId: currentMission.value.missionId,
    };
    const res = await missioAvailableRoutes(data);
    // const res = await missioAvailableRoutes();
    if (res && res.code === 200 && res.data) {
      addRouteTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取可用航线列表失败:", error);
    ElMessage.error("获取可用航线列表失败，请重试");
  } finally {
    addRouteLoading.value = false;
  }
};

// 航线选择变化
const handleAddRouteSelectionChange = (selection) => {
  addRouteSelectedRoute.value = selection;
};

// 提交添加航线
const handleAddRouteSubmit = async () => {
  if (addRouteSelectedRoute.value.length === 0) {
    ElMessage.warning("请选择至少一个航线");
    return;
  }

  try {
    let successCount = 0;
    for (const route of addRouteSelectedRoute.value) {
      const res = await missioAssignRoute(currentMission.value.missionId, {
        missionDataIds: route.id,
      });
      if (res && res.code === 200) {
        successCount++;
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功添加 ${successCount} 个航线`);
      addRouteDialogVisible.value = false;
      await getRouteList();
    } else {
      ElMessage.error("添加航线失败");
    }
  } catch (error) {
    console.error("添加航线失败:", error);
    ElMessage.error("添加航线失败，请重试");
  }
};

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除任务 【${row.name}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await missionDelete(row.missionId);
        ElMessage.success("删除成功");
        getTaskListData();
      } catch (error) {
        console.error("删除任务失败:", error);
        ElMessage.error("删除任务失败，请重试");
      }
    })
    .catch(() => {});
};

// 监听 projectId 变化
watch(
  () => props.projectId,
  () => {
    if (props.projectId) {
      getTaskListData();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
/* 所有弹窗表格容器添加滚动条 */
.members-table-container,
.add-member-table-container,
.uav-table-container,
.add-uav-table-container,
.route-table-container,
.add-route-table-container {
  max-height: 500px;
  overflow-y: auto;
}

/* 美化滚动条 */
.members-table-container::-webkit-scrollbar,
.add-member-table-container::-webkit-scrollbar,
.uav-table-container::-webkit-scrollbar,
.add-uav-table-container::-webkit-scrollbar,
.route-table-container::-webkit-scrollbar,
.add-route-table-container::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.members-table-container::-webkit-scrollbar-thumb,
.add-member-table-container::-webkit-scrollbar-thumb,
.uav-table-container::-webkit-scrollbar-thumb,
.add-uav-table-container::-webkit-scrollbar-thumb,
.route-table-container::-webkit-scrollbar-thumb,
.add-route-table-container::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 2px;
}

.members-table-container::-webkit-scrollbar-thumb:hover,
.add-member-table-container::-webkit-scrollbar-thumb:hover,
.uav-table-container::-webkit-scrollbar-thumb:hover,
.add-uav-table-container::-webkit-scrollbar-thumb:hover,
.route-table-container::-webkit-scrollbar-thumb:hover,
.add-route-table-container::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.members-table-container::-webkit-scrollbar-track,
.add-member-table-container::-webkit-scrollbar-track,
.uav-table-container::-webkit-scrollbar-track,
.add-uav-table-container::-webkit-scrollbar-track,
.route-table-container::-webkit-scrollbar-track,
.add-route-table-container::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
