<template>
  <CommonTable
    width="100%"
    title="组织列表"
    :table-data="tableData"
    :columns="columns"
    :total="total"
    :loading="loading"
    row-key="organizationId"
    :show-selection="true"
    :action-width="200"
    @row-click="handleRowClick"
    @selection-change="handleSelectionChange"
  >
    <template #header-actions>
      <el-input
        v-model="searchQuery"
        placeholder="搜索组织名称"
        class="search-input"
        clearable
        @clear="handleSearchClear"
        @input="handleInputSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <!-- <el-button type="primary" :icon="Search" @click="handleSearch">
        搜索
      </el-button> -->
      <el-button type="primary" @click="refreshList" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </template>

    <template #name="{ row }">
      <el-link type="primary" @click="handleOrgClick(row)">
        {{ row.name }}
      </el-link>
    </template>

    <template #action="{ row }">
      <el-tooltip content="编辑" placement="top">
        <el-button type="primary" link @click="handleEdit(row)">
          <el-icon><Edit /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="成员管理" placement="top">
        <el-button type="success" link @click="handleMembers(row)">
          <el-icon><User /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="详情" placement="top">
        <el-button type="info" link @click="handleDetail(row)">
          <el-icon><InfoFilled /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="设备管理" placement="top">
        <el-button type="warning" link @click="handleUavList(row)">
          <el-icon><Suitcase /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="删除" placement="top">
        <el-button type="danger" link @click="handleDelete(row)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
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

  <!-- 编辑组织弹窗 -->
  <CommonFormDialog
    v-model="editDialogVisible"
    form-dialog-title="编辑组织"
    :form-items="editFormItems"
    :rules="editFormRules"
    :initial-data="editFormInitialData"
    :is-edit="true"
    dialog-width="500px"
    label-width="100px"
    @submit="handleEditSubmit"
    @cancel="editDialogVisible = false"
    @close="editDialogVisible = false"
  />

  <!-- 成员管理弹窗 -->
  <el-dialog
    v-model="membersDialogVisible"
    width="50%"
    @close="membersDialogVisible = false"
  >
    <template #header>
      <div class="members-dialog-header">
        <span>组织成员管理</span>
      </div>
    </template>
    <div class="members-table-container">
      <CommonTable
        :title="`${currentOrganization?.name || ''} - 成员列表`"
        :table-data="membersTableData"
        :columns="membersColumns"
        :total="membersTableData.length"
        :loading="membersLoading"
        :show-selection="false"
        row-key="userId"
        :action-width="120"
      >
        <template #header-actions>
          <el-button type="success" @click="handleAddMember">
            <el-icon><Plus /></el-icon>
            添加成员
          </el-button>
        </template>
        <template #role="{ row }">
          <el-tag v-if="row.role === 'admin'" type="danger">管理员</el-tag>
          <el-tag v-else type="success">成员</el-tag>
        </template>
        <template #action="{ row }">
          <el-tooltip content="移除成员" placement="top">
            <el-button type="danger" link @click="handleDeleteMember(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
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
        title="可添加的用户列表"
        :table-data="addMemberTableData"
        :columns="addMemberColumns"
        :total="addMemberTableData.length"
        :loading="addMemberLoading"
        :show-selection="true"
        row-key="userId"
        :action-width="0"
        :show-action="false"
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

  <!-- 设备管理弹窗 -->
  <el-dialog
    v-model="devicesDialogVisible"
    width="50%"
    @close="devicesDialogVisible = false"
  >
    <template #header>
      <div class="members-dialog-header">
        <span>组织无人机列表</span>
      </div>
    </template>
    <div class="devices-table-container">
      <CommonTable
        :title="`${currentOrganization?.name || ''} - 设备列表`"
        :table-data="devicesTableDataWithIndex"
        :columns="devicesColumns"
        :total="devicesTableData.length"
        :loading="devicesLoading"
        :show-selection="false"
        row-key="deviceNumber"
        :action-width="0"
        :show-action="false"
      >
        <template #header-actions>
          <el-button type="success" @click="handleAddDevice">
            <el-icon><Plus /></el-icon>
            添加设备
          </el-button>
        </template>
      </CommonTable>
    </div>
  </el-dialog>

  <!-- 添加设备弹窗 -->
  <el-dialog
    v-model="addDeviceDialogVisible"
    title="添加设备"
    width="50%"
    @close="addDeviceDialogVisible = false"
  >
    <div class="add-device-dialog-content">
      <CommonTable
        title="可添加的设备列表"
        :table-data="addDeviceTableData"
        :columns="addDeviceColumns"
        :total="addDeviceTableData.length"
        :loading="addDeviceLoading"
        :show-selection="true"
        row-key="deviceNumber"
        :action-width="0"
        :show-action="false"
        @selection-change="handleAddDeviceSelectionChange"
      />
    </div>
    <template #footer>
      <el-button @click="addDeviceDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddDeviceSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>

  <!-- 组织详情抽屉 -->
  <el-drawer
    v-model="detailDialogVisible"
    title="组织管理 - 详情"
    direction="rtl"
    size="500px"
    @close="detailDialogVisible = false"
  >
    <div v-if="currentOrganization" class="org-detail">
      <div class="detail-header">
        <div class="org-avatar">
          {{ currentOrganization.name?.charAt(0) || "O" }}
        </div>
        <div class="org-info">
          <h3>{{ currentOrganization.name }}</h3>
          <p>{{ currentOrganization.organizationId }}</p>
        </div>
      </div>

      <el-descriptions :column="2" border class="detail-descriptions">
        <el-descriptions-item label="组织名称">
          {{ currentOrganization.name || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="组织ID">
          {{ currentOrganization.organizationId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="云服务信息">
          {{ currentOrganization.cloudServiceInfo || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(currentOrganization.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ currentOrganization.createdBy || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="组织描述" :span="2">
          {{ currentOrganization.description || "-" }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="drawer-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit(currentOrganization)"
          >编辑组织</el-button
        >
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Search,
  Refresh,
  Edit,
  User,
  InfoFilled,
  Suitcase,
  Delete,
  Plus,
} from "@element-plus/icons-vue";
import {
  getUserOrganizationList,
  deleteOrganizationId,
  updateOrganizationDetail,
  getOrganizationMembers,
  addOrganizationMember,
  deleteOrganizationMember,
  organizListuser,
  getOrganizationUavs,
  organizationListdevices,
  organizationManage,
} from "@/api/organization";
import { ElMessage, ElMessageBox } from "element-plus";
import CommonTable from "@/components/CommonTable.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";

const router = useRouter();

const props = defineProps({
  organizationId: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(["org-click"]);

// 状态变量
const loading = ref(false);
const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const tableData = ref([]);

// 编辑弹窗状态
const editDialogVisible = ref(false);
const editFormInitialData = ref({});

// 成员管理弹窗状态
const membersDialogVisible = ref(false);
const currentOrganization = ref(null);
const membersLoading = ref(false);
const membersTableData = ref([]);

// 添加成员弹窗状态
const addMemberDialogVisible = ref(false);
const addMemberLoading = ref(false);
const addMemberTableData = ref([]);
const addMemberSelectedUsers = ref([]);

// 设备管理弹窗状态
const devicesDialogVisible = ref(false);
const devicesLoading = ref(false);
const devicesTableData = ref([]);

// 添加设备弹窗状态
const addDeviceDialogVisible = ref(false);
const addDeviceLoading = ref(false);
const addDeviceTableData = ref([]);
const addDeviceSelectedDevices = ref([]);

// 添加成员表格列配置
const addMemberColumns = [
  {
    prop: "username",
    label: "用户名",
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
    prop: "email",
    label: "邮箱",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 设备列表列配置
const devicesColumns = [
  {
    prop: "index",
    label: "序号",
    width: "60",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "id",
    label: "设备ID",
    width: "80",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "name",
    label: "设备名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "ip",
    label: "IP地址",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 为设备数据添加序号
const devicesTableDataWithIndex = computed(() => {
  return devicesTableData.value.map((item, index) => ({
    ...item,
    index: index + 1,
  }));
});

// 可添加设备列表列配置
const addDeviceColumns = [
  {
    prop: "id",
    label: "设备ID",
    width: "100",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "name",
    label: "设备名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "ip",
    label: "IP地址",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 表单验证规则
const editFormRules = {
  name: [
    { required: true, message: "请输入组织名称", trigger: "blur" },
    { min: 1, max: 20, message: "组织名称长度为1-20个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入组织描述", trigger: "blur" },
    { max: 200, message: "组织描述最多200个字符", trigger: "blur" },
  ],
};

// 表单项配置
const editFormItems = [
  {
    prop: "name",
    label: "组织名称",
    type: "input",
    required: true,
    maxlength: 20,
    showWordLimit: true,
    placeholder: "请输入组织名称（1-20个字符）",
  },
  {
    prop: "description",
    label: "组织描述",
    type: "textarea",
    required: true,
    maxlength: 200,
    showWordLimit: true,
    placeholder: "请输入组织描述（最多200个字符）",
    rows: 4,
  },
  {
    prop: "organizationId",
    label: "组织ID",
    type: "input",
    required: false,
    disabled: true,
  },
  {
    prop: "createdAt",
    label: "创建时间",
    type: "input",
    required: false,
    disabled: true,
  },
];

// 表格列配置
const columns = [
  {
    prop: "name",
    label: "组织名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
    slotName: "name",
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
    label: "组织描述",
    width: "250",
    showOverflowTooltip: true,
  },

  {
    prop: "cloudServiceInfo",
    label: "云服务信息",
    width: "150",
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

// 成员列表列配置
const membersColumns = [
  {
    prop: "username",
    label: "用户名",
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
    slotName: "role",
    showOverflowTooltip: true,
  },
  {
    prop: "projects",
    label: "项目名",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 格式化日期
const formatDate = (date) => {
  if (!date) return "暂无数据";
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleString();
  } catch (error) {
    return date;
  }
};

// 获取组织列表
const getOrganizationList = async () => {
  loading.value = true;
  try {
    const res = await getUserOrganizationList({
      keyword: searchQuery.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });

    if (res && res.code === 200 && res.data) {
      tableData.value = res.data.list || [];
      total.value = res.data.total || 0;
    }
  } catch (error) {
    console.error("获取组织列表失败:", error);
    ElMessage.error("获取组织列表失败，请重试");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = async () => {
  currentPage.value = 1;
  await getOrganizationList();
};
// 防抖函数：延迟500ms执行，避免输入过程中频繁请求接口
const debounce = (fn, delay = 500) => {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// 防抖后的搜索函数（搜索时重置页码到第一页）
const debouncedSearch = debounce(async () => {
  currentPage.value = 1;
  await getOrganizationList();
}, 500);

// 输入框输入事件触发搜索
const handleInputSearch = () => {
  debouncedSearch();
};
const handleSearchClear = () => {
  searchQuery.value = "";
  // 改用防抖搜索，和输入逻辑保持一致
  debouncedSearch();
  // 原 refreshList() 可以删掉，避免重复请求
};

// 刷新列表
const refreshList = async () => {
  searchQuery.value = "";
  currentPage.value = 1;
  await getOrganizationList();
};

// 分页
const handleSizeChange = async (val) => {
  pageSize.value = val;
  await getOrganizationList();
};

const handleCurrentChange = async (val) => {
  currentPage.value = val;
  await getOrganizationList();
};

// 表格操作
const handleRowClick = (row) => {
  console.log("点击行:", row);
};

const handleSelectionChange = (selection) => {
  console.log("选中的行:", selection);
};

// 编辑组织
const handleEdit = (row) => {
  editFormInitialData.value = {
    organizationId: row.organizationId,
    createdAt: row.createdAt || "",
    name: row.name || "",
    description: row.description || "",
  };
  editDialogVisible.value = true;
};

// 提交编辑
const handleEditSubmit = async (formData) => {
  try {
    const res = await updateOrganizationDetail(formData.organizationId, {
      name: formData.name,
      describe: formData.description,
    });

    if (res && res.code === 200) {
      ElMessage.success("更新成功");
      editDialogVisible.value = false;
      getOrganizationList();
    } else {
      ElMessage.error(res?.message || "更新失败");
    }
  } catch (error) {
    console.error("更新组织失败:", error);
    ElMessage.error("更新组织失败，请重试");
  }
};

// 成员管理
const handleMembers = async (row) => {
  currentOrganization.value = row;
  membersDialogVisible.value = true;
  await getMembersList();
};

// 获取成员列表
const getMembersList = async () => {
  if (!currentOrganization.value) return;

  membersLoading.value = true;
  try {
    const res = await getOrganizationMembers(
      currentOrganization.value.organizationId,
      "",
    );
    if (res && res.code === 200 && res.data) {
      membersTableData.value = res.data.list || res.data || [];
    }
  } catch (error) {
    console.error("获取成员列表失败:", error);
    ElMessage.error("获取成员列表失败，请重试");
  } finally {
    membersLoading.value = false;
  }
};

// 获取所有用户列表
const getAllUsers = async () => {
  addMemberLoading.value = true;
  try {
    const res = await organizListuser();
    if (res && res.code === 200 && res.data) {
      addMemberTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取用户列表失败:", error);
    ElMessage.error("获取用户列表失败，请重试");
  } finally {
    addMemberLoading.value = false;
  }
};

// 打开添加成员弹窗
const handleAddMember = () => {
  addMemberSelectedUsers.value = [];
  addMemberTableData.value = [];
  addMemberDialogVisible.value = true;
  getAllUsers();
};

// 选择用户变化
const handleAddMemberSelectionChange = (selection) => {
  addMemberSelectedUsers.value = selection;
};

// 获取组织设备列表
const getDevicesList = async () => {
  if (!currentOrganization.value) return;

  devicesLoading.value = true;
  try {
    const res = await getOrganizationUavs(
      currentOrganization.value.organizationId,
    );
    if (res && res.code === 200 && res.data) {
      devicesTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取设备列表失败:", error);
    ElMessage.error("获取设备列表失败，请重试");
  } finally {
    devicesLoading.value = false;
  }
};

// 获取可添加设备列表
const getAvailableDevices = async () => {
  addDeviceLoading.value = true;
  try {
    const res = await organizationListdevices(
      currentOrganization.value.organizationId,
    );
    if (res && res.code === 200 && res.data) {
      addDeviceTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取可添加设备列表失败:", error);
    ElMessage.error("获取可添加设备列表失败，请重试");
  } finally {
    addDeviceLoading.value = false;
  }
};

// 打开添加设备弹窗
const handleAddDevice = () => {
  addDeviceSelectedDevices.value = [];
  addDeviceTableData.value = [];
  addDeviceDialogVisible.value = true;
  getAvailableDevices();
};

// 选择设备变化
const handleAddDeviceSelectionChange = (selection) => {
  addDeviceSelectedDevices.value = selection;
};

// 提交添加设备
const handleAddDeviceSubmit = async () => {
  if (addDeviceSelectedDevices.value.length === 0) {
    ElMessage.warning("请至少选择一个设备");
    return;
  }

  try {
    const deviceArray = addDeviceSelectedDevices.value.map(
      (device) => device.deviceNumber,
    );
    const res = await organizationManage(
      currentOrganization.value.organizationId,
      deviceArray,
    );
    if (res && res.code === 200) {
      ElMessage.success(
        `成功添加 ${addDeviceSelectedDevices.value.length} 个设备`,
      );
      addDeviceDialogVisible.value = false;
      getDevicesList();
    } else {
      ElMessage.error(res?.message || "添加设备失败");
    }
  } catch (error) {
    console.error("添加设备失败:", error);
    ElMessage.error("添加设备失败，请重试");
  }
};

// 提交添加成员
const handleAddMemberSubmit = async () => {
  if (addMemberSelectedUsers.value.length === 0) {
    ElMessage.warning("请至少选择一个用户");
    return;
  }

  try {
    const phoneArray = addMemberSelectedUsers.value.map((user) => user.phone);
    const res = await addOrganizationMember(
      currentOrganization.value.organizationId,
      phoneArray,
    );
    if (res && res.code === 200) {
      ElMessage.success(
        `成功添加 ${addMemberSelectedUsers.value.length} 个成员`,
      );
      addMemberDialogVisible.value = false;
      getMembersList();
    } else {
      ElMessage.error(res?.message || "添加成员失败");
    }
  } catch (error) {
    console.error("添加成员失败:", error);
    ElMessage.error("添加成员失败，请重试");
  }
};

// 删除成员
const handleDeleteMember = async (member) => {
  ElMessageBox.confirm(
    `确定要移除成员 【${member.username || member.name}】 吗？`,
    "警告",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        const res = await deleteOrganizationMember(
          currentOrganization.value.organizationId,
          member.userId || member.id || member._id,
        );
        if (res && res.code === 200) {
          ElMessage.success("移除成功");
          getMembersList();
        } else {
          ElMessage.error(res?.message || "移除失败");
        }
      } catch (error) {
        console.error("移除成员失败:", error);
        ElMessage.error("移除成员失败，请重试");
      }
    })
    .catch(() => {});
};

// 详情弹窗状态
const detailDialogVisible = ref(false);

// 组织详情
const handleDetail = (row) => {
  currentOrganization.value = row;
  detailDialogVisible.value = true;
};

// 设备列表
const handleUavList = async (row) => {
  currentOrganization.value = row;
  devicesDialogVisible.value = true;
  await getDevicesList();
};

const handleDelete = async (row) => {
  ElMessageBox.confirm(
    `确定要删除组织 【${row.name}】 吗？删除后无法恢复！`,
    "警告",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        const res = await deleteOrganizationId(row.organizationId);
        if (res && res.code === 200) {
          ElMessage.success("删除成功");
          getOrganizationList();
        } else {
          ElMessage.error(res?.message || "删除失败");
        }
      } catch (error) {
        console.error("删除组织失败:", error);
        ElMessage.error("删除组织失败，请重试");
      }
    })
    .catch(() => {});
};

// 点击组织名称跳转到项目管理
const handleOrgClick = (row) => {
  console.log(row, "asdfgbv");

  emit("org-click", row);
};

// 监听 organizationId 变化
watch(
  () => props.organizationId,
  () => {
    getOrganizationList();
  },
  { immediate: true },
);
</script>

<style scoped>
.search-input {
  width: 240px;
}

.members-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.members-table-container,
.add-member-table-container,
.devices-table-container {
  max-height: 500px;
  overflow-y: auto;
}

.add-device-dialog-content {
  max-height: 500px;
  overflow-y: auto;
}

/* 美化滚动条 */
.members-table-container::-webkit-scrollbar,
.add-member-table-container::-webkit-scrollbar,
.devices-table-container::-webkit-scrollbar,
.add-device-dialog-content::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.members-table-container::-webkit-scrollbar-thumb,
.add-member-table-container::-webkit-scrollbar-thumb,
.devices-table-container::-webkit-scrollbar-thumb,
.add-device-dialog-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 2px;
}

.members-table-container::-webkit-scrollbar-thumb:hover,
.add-member-table-container::-webkit-scrollbar-thumb:hover,
.devices-table-container::-webkit-scrollbar-thumb:hover,
.add-device-dialog-content::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.members-table-container::-webkit-scrollbar-track,
.add-member-table-container::-webkit-scrollbar-track,
.devices-table-container::-webkit-scrollbar-track,
.add-device-dialog-content::-webkit-scrollbar-track {
  background-color: transparent;
}

.detail-projects-container,
.detail-devices-container {
  max-height: 300px;
  overflow-y: auto;
}

.detail-projects-container::-webkit-scrollbar,
.detail-devices-container::-webkit-scrollbar {
  width: 4px;
}

.detail-projects-container::-webkit-scrollbar-thumb,
.detail-devices-container::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 2px;
}

.detail-projects-container::-webkit-scrollbar-thumb:hover,
.detail-devices-container::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.detail-projects-container::-webkit-scrollbar-track,
.detail-devices-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.org-detail {
  padding: 20px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0 20px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 20px;
}

.org-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.org-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.org-info p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.detail-descriptions {
  margin-bottom: 20px;
}

.drawer-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
