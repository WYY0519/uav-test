<template>
  <CommonTable
    title="项目列表"
    :table-data="tableData"
    :columns="columns"
    :total="total"
    :loading="loading"
    :row-key="(row) => row.projectId"
    :show-selection="true"
    :action-width="200"
    @row-click="handleRowClick"
    @selection-change="handleSelectionChange"
  >
    <template #org-header>
      <div class="org-header-wrapper">所属组织：{{ orgName }}</div>
    </template>
    <template #header-actions>
      <el-input
        v-model="searchQuery"
        placeholder="搜索项目名称"
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
      <el-button type="success" @click="handleAddProject">
        <el-icon><Plus /></el-icon>
        新增项目
      </el-button>
    </template>

    <template #name="{ row }">
      <el-link type="primary" @click="handleProjectClick(row)">
        {{ row.name }}
      </el-link>
    </template>

    <template #isArchived="{ row }">
      <el-tag :type="row.isArchived ? 'info' : 'success'" effect="dark">
        {{ row.isArchived ? "已归档" : "进行中" }}
      </el-tag>
    </template>

    <template #coordinates="{ row }">
      <span v-if="row.centerLatitude && row.centerLongitude">
        {{ row.centerLatitude }}, {{ row.centerLongitude }}
      </span>
      <span v-else class="text-muted">-</span>
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
      <el-tooltip content="详情" placement="top">
        <el-button type="info" link @click="handleView(row)">
          <el-icon><InfoFilled /></el-icon>
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

  <!-- 编辑项目弹窗 -->
  <CommonFormDialog
    v-model="editDialogVisible"
    :form-dialog-title="editDialogTitle"
    :form-items="editFormItems"
    :rules="editFormRules"
    :initial-data="editFormData"
    :is-edit="true"
    dialog-width="500px"
    @submit="handleEditSubmit"
    @cancel="editDialogVisible = false"
  />

  <!-- 成员管理弹窗 -->
  <el-dialog
    v-model="membersDialogVisible"
    width="50%"
    @close="membersDialogVisible = false"
  >
    <template #header>
      <div class="members-dialog-header">
        <span>{{ currentProject?.name || "" }} - 成员管理</span>
      </div>
    </template>
    <div class="members-table-container">
      <CommonTable
        title="成员列表"
        :table-data="membersTableData"
        :columns="membersColumns"
        :total="membersTableData.length"
        :loading="membersLoading"
        :show-selection="false"
        :show-action="true"
        :action-width="150"
        :row-key="(row) => row.userId"
      >
        <template #header-actions>
          <el-button type="success" @click="handleAddMember">
            <el-icon><User /></el-icon>
            添加成员
          </el-button>
        </template>
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDeleteMember(row)">
            <el-icon><Delete /></el-icon>
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
        :columns="addMemberColumns"
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
    width="50%"
    @close="uavManageDialogVisible = false"
  >
    <template #header>
      <div class="members-dialog-header">
        <span>{{ currentProject?.name || "" }} - 无人机管理</span>
      </div>
    </template>
    <div class="uav-table-container">
      <CommonTable
        title="无人机列表"
        :table-data="uavTableData"
        :columns="uavColumns"
        :total="uavTableData.length"
        :loading="uavLoading"
        :show-selection="false"
        :show-action="true"
        :action-width="80"
        :row-key="(row) => row.id"
      >
        <template #header-actions>
          <el-button type="success" @click="handleAddUav">
            <el-icon><Plus /></el-icon>
            添加无人机
          </el-button>
        </template>
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDeleteUav(row)">
            <el-icon><Delete /></el-icon>
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

  <!-- 项目详情抽屉 -->
  <el-drawer
    v-model="detailDrawerVisible"
    title="项目详情"
    direction="rtl"
    size="500px"
    @close="detailDrawerVisible = false"
  >
    <div v-if="currentProjectDetail" class="project-detail">
      <div class="detail-header">
        <div class="project-avatar">
          {{ currentProjectDetail.name?.charAt(0) || "P" }}
        </div>
        <div class="project-info">
          <h3>{{ currentProjectDetail.name }}</h3>
          <p>{{ currentProjectDetail.projectId }}</p>
        </div>
      </div>
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border class="detail-descriptions">
            <el-descriptions-item label="项目名称">
              {{ currentProjectDetail.name || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="项目ID">
              {{ currentProjectDetail.projectId || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="所属组织">
              {{ orgName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(currentProjectDetail.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ currentProjectDetail.createdBy || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="经度">
              {{ currentProjectDetail.centerLongitude || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="纬度">
              {{ currentProjectDetail.centerLatitude || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="项目描述" :span="2">
              {{ currentProjectDetail.description || "-" }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <!-- 设备信息标签页 -->
        <el-tab-pane label="设备信息" name="device">
          <div class="tab-header-info">
            <span>共 {{ uavTableData.length }} 台设备</span>
          </div>
          <div class="detail-list-container detail-uavs-container">
            <el-table
              :data="uavTableData"
              style="width: 100%"
              max-height="400"
              size="small"
            >
              <el-table-column
                type="index"
                label="序号"
                width="60"
                align="center"
              />
              <el-table-column
                prop="name"
                label="设备名称"
                show-overflow-tooltip
              />
              <el-table-column
                prop="deviceNumber"
                label="设备编号"
                width="150"
                align="center"
              />
              <el-table-column
                prop="ip"
                label="IP地址"
                width="120"
                align="center"
              />
              <el-table-column
                prop="dataPort"
                label="数据端口"
                width="100"
                align="center"
              />
              <el-table-column
                prop="controlPort"
                label="控制端口"
                width="100"
                align="center"
              />
              <el-table-column
                label="操作"
                width="80"
                align="center"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    link
                    @click="handleDeleteUavInDetail(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty
              v-if="uavTableData.length === 0"
              description="暂无设备"
              :image-size="80"
            />
          </div>
        </el-tab-pane>

        <!-- 成员信息标签页 -->
        <el-tab-pane label="成员信息" name="member">
          <div class="tab-header-info">
            <span>共 {{ membersTableData.length }} 名成员</span>
          </div>
          <div class="detail-list-container detail-members-container">
            <el-table
              :data="membersTableData"
              style="width: 100%"
              max-height="400"
              size="small"
            >
              <el-table-column
                type="index"
                label="序号"
                width="60"
                align="center"
              />
              <el-table-column
                prop="username"
                label="成员名称"
                show-overflow-tooltip
              />
              <el-table-column
                prop="phone"
                label="手机号"
                width="120"
                align="center"
              />
              <el-table-column
                prop="role"
                label="角色"
                width="100"
                align="center"
              />
              <el-table-column
                prop="joinedAt"
                label="加入时间"
                width="180"
                align="center"
              >
                <template #default="{ row }">
                  {{ formatDate(row.joinedAt) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty
              v-if="membersTableData.length === 0"
              description="暂无成员"
              :image-size="80"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="drawer-footer">
        <el-button @click="detailDrawerVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit(currentProjectDetail)"
          >编辑项目</el-button
        >
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Search,
  Refresh,
  Edit,
  User,
  Delete,
  List,
  InfoFilled,
  Plus,
} from "@element-plus/icons-vue";
import {
  getProjectList,
  createProject,
  editProject,
  deleteProject,
  getProjectMemberList,
  deleteProjectMember,
  addProjectMember,
  getpProjectMembers,
  getProjectDevicesList,
  listUsefulDevice,
  deleteManageProject,
} from "@/api/project";
// import {
//   getProjectDevicesList,
//   listUsefulDevice,
//   addManageProject,
//   deleteManageProject,
// } from "@/api/project";
import service from "@/utils/request";
import { ElMessage, ElMessageBox } from "element-plus";
import CommonTable from "@/components/CommonTable.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";
import { useOrganizationStore } from "@/store/modules/organization";
const props = defineProps({
  organizationId: {
    type: [String, Number],
    default: null,
  },
  organizationName: {
    type: [String],
    default: null,
  },
});
console.log(props, "propsprops");
const orgName = ref(props.organizationName);
const emit = defineEmits(["project-click", "uav-manage", "view-detail"]);
const router = useRouter(); //
const route = router.currentRoute;
const orgStore = useOrganizationStore();

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
const editDialogTitle = ref("编辑项目");
const editFormData = ref({});
const currentEditRow = ref(null);
const isAddProject = ref(false);

// 成员管理弹窗状态
const membersDialogVisible = ref(false);
const membersLoading = ref(false);
const membersTableData = ref([]);
const currentProject = ref(null);

// 添加成员弹窗状态
const addMemberDialogVisible = ref(false);
const addMemberLoading = ref(false);
const addMemberTableData = ref([]);
// 修改：从单个对象改为数组，支持多选
const addMemberSelectedUser = ref([]);
const addMemberTableComponent = ref(null);

// 无人机管理弹窗状态
const uavManageDialogVisible = ref(false);
const uavLoading = ref(false);
const uavTableData = ref([]);

// 添加无人机弹窗状态
const addUavDialogVisible = ref(false);
const addUavLoading = ref(false);
const addUavTableData = ref([]);
// 修改：从单个对象改为数组，支持多选
const addUavSelectedDevice = ref([]);
const addUavTableComponent = ref(null);

// 详情抽屉状态
const detailDrawerVisible = ref(false);
const currentProjectDetail = ref(null);
const activeTab = ref("basic");

// 表格列配置
const columns = [
  {
    prop: "name",
    label: "项目名称",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
    slotName: "name",
  },
  {
    prop: "creatorName",
    label: "创建人",
    width: "120",
    align: "center",
    showOverflowTooltip: true,
  },
  {
    prop: "description",
    label: "项目描述",
    width: "250",
    showOverflowTooltip: true,
  },

  {
    prop: "coordinates",
    label: "经纬度",
    width: "150",
    align: "center",
    showOverflowTooltip: true,
    slotName: "coordinates",
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
  },
];

// 成员列表列配置
const membersColumns = [
  {
    prop: "username",
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
  {
    prop: "joinedAt",
    label: "加入时间",
    width: "200",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 可添加成员列表列配置
const addMemberColumns = [
  {
    prop: "username",
    label: "用户名称",
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
    label: "角色名称",
    width: "120",
    align: "center",
    showOverflowTooltip: true,
  },
];

// 无人机列表列配置
const uavColumns = [
  {
    prop: "index",
    label: "序号",
    width: "60",
    align: "center",
    showOverflowTooltip: true,
  },
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
    prop: "videoIp",
    label: "视频流地址",
    width: "200",
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

// 编辑表单配置
const editFormItems = [
  {
    prop: "name",
    label: "项目名称",
    type: "input",
    required: true,
    maxlength: 20,
    placeholder: "请输入项目名称",
  },
  {
    prop: "description",
    label: "项目描述",
    type: "textarea",
    required: true,
    maxlength: 200,
    rows: 4,
    placeholder: "请输入项目描述",
  },
  {
    prop: "centerLongitude",
    label: "经度",
    type: "input",
    required: false,
    placeholder: "请输入经度",
  },
  {
    prop: "centerLatitude",
    label: "纬度",
    type: "input",
    required: false,
    placeholder: "请输入纬度",
  },
];

// 编辑表单校验规则
const editFormRules = {
  name: [
    { required: true, message: "请输入项目名称", trigger: "blur" },
    { max: 20, message: "项目名称最多20个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入项目描述", trigger: "blur" },
    { max: 200, message: "项目描述最多200个字符", trigger: "blur" },
  ],
  centerLongitude: [{ required: false }],
  centerLatitude: [{ required: false }],
};

// 获取项目列表
const getProjectListData = async () => {
  if (!props.organizationId) {
    return;
  }

  loading.value = true;
  try {
    const res = await getProjectList(props.organizationId, {
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value,
    });

    if (res && res.code === 200 && res.data) {
      tableData.value = res.data.list || [];
      total.value = res.data.total || 0;
    }
  } catch (error) {
    console.error("获取项目列表失败:", error);
    ElMessage.error("获取项目列表失败，请重试");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = async () => {
  currentPage.value = 1;
  await getProjectListData();
};
// 防抖函数（和组织列表保持一致）
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
  await getProjectListData();
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
// 刷新列表
const refreshList = async () => {
  currentPage.value = 1;
  await getProjectListData();
};
// 处理添加项目
const handleAddProject = () => {
  currentEditRow.value = null;
  editFormData.value = {
    projectId: null,
    name: "",
    description: "",
    centerLongitude: "",
    centerLatitude: "",
  };
  editDialogTitle.value = "新增项目";
  isAddProject.value = true;
  editDialogVisible.value = true;
};
// 分页
const handleSizeChange = async (val) => {
  pageSize.value = val;
  await getProjectListData();
};

const handleCurrentChange = async (val) => {
  currentPage.value = val;
  await getProjectListData();
};

// 表格操作
const handleRowClick = (row) => {
  console.log("点击项目行:", row);
};

const handleSelectionChange = (selection) => {
  console.log("选中的项目行:", selection);
};

const handleView = async (row) => {
  currentProjectDetail.value = row;
  currentProject.value = row;
  activeTab.value = "basic"; // 重置到基本信息标签页
  detailDrawerVisible.value = true;

  // 获取项目成员列表
  await getMembersList();

  // 获取项目无人机列表
  await getUavList();
};

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

const handleEdit = (row) => {
  console.log("编辑项目:", row);
  currentEditRow.value = row;
  editFormData.value = {
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    centerLongitude: row.centerLongitude || "",
    centerLatitude: row.centerLatitude || "",
  };
  editDialogTitle.value = "编辑项目";
  isAddProject.value = false;
  editDialogVisible.value = true;
};

const handleMembers = (row) => {
  console.log("项目成员管理:", row);
  currentProject.value = row;
  membersDialogVisible.value = true;
  getMembersList();
};

// 获取项目成员列表
const getMembersList = async () => {
  if (!currentProject.value) return;

  membersLoading.value = true;
  try {
    const res = await getProjectMemberList(currentProject.value.projectId);
    if (res && res.code === 200 && res.data) {
      membersTableData.value = res.data || [];
    }
  } catch (error) {
    console.error("获取项目成员列表失败:", error);
    ElMessage.error("获取项目成员列表失败，请重试");
  } finally {
    membersLoading.value = false;
  }
};

// 删除项目成员
const handleDeleteMember = (row) => {
  ElMessageBox.confirm(`确定要删除成员 【${row.username}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        const res = await deleteProjectMember(
          currentProject.value.projectId,
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
  // 修改：清空数组，而非单个值
  addMemberSelectedUser.value = [];
  addMemberTableData.value = [];
  addMemberDialogVisible.value = true;
  getAvailableMembers();
};

// 获取可添加成员列表
const getAvailableMembers = async () => {
  addMemberLoading.value = true;
  try {
    const res = await getpProjectMembers(
      props.organizationId,
      currentProject.value.projectId,
    );
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

// 修改：成员选择变化 - 支持多选，直接赋值选中的数组
const handleAddMemberSelectionChange = (selection) => {
  addMemberSelectedUser.value = selection;
};

// 提交添加成员 - 适配多选
const handleAddMemberSubmit = async () => {
  if (addMemberSelectedUser.value.length === 0) {
    ElMessage.warning("请选择至少一个成员");
    return;
  }

  try {
    // 批量添加逻辑，根据后端接口调整
    // 如果后端支持批量，这里可以循环或传数组；如果只支持单个，循环调用
    let successCount = 0;
    for (const user of addMemberSelectedUser.value) {
      const res = await service({
        url: `/api/project/manage/${currentProject.value.projectId}/addmembers`,
        method: "POST",
        params: {
          phone: user.phone,
        },
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

const handleUavManage = (row) => {
  console.log("无人机管理:", row);
  currentProject.value = row;
  uavManageDialogVisible.value = true;
  getUavList();
};

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除项目 【${row.name}】 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        loading.value = true;
        const res = await deleteProject(row.projectId);
        if (res && res.code === 200) {
          ElMessage.success("删除成功");
          await getProjectListData();
        } else {
          ElMessage.error(res?.message || "删除失败");
        }
      } catch (error) {
        console.error("删除项目失败:", error);
        ElMessage.error("删除项目失败，请重试");
      } finally {
        loading.value = false;
      }
    })
    .catch(() => {});
};
const handleDeleteUav = async (row) => {
  ElMessageBox.confirm(`确定要删除无人机 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      loading.value = true;
      const res = await deleteManageProject(
        currentProject.value.projectId,
        row.id,
      );
      if (res.code === 200) {
        ElMessage.success("无人机已删除");
        // 关键修改：调用 getUavList 而非直接调用接口
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

// 在详情抽屉中删除设备
const handleDeleteUavInDetail = async (row) => {
  ElMessageBox.confirm(`确定要删除设备 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      const res = await deleteManageProject(
        currentProjectDetail.value.projectId,
        row.id,
      );
      if (res.code === 200) {
        ElMessage.success("设备已删除");
        await getUavList();
      } else {
        ElMessage.error(res.message || "删除设备失败");
      }
    } catch (error) {
      console.error("删除设备失败:", error);
      ElMessage.error("删除设备失败");
    }
  });
};
const handleProjectClick = (row) => {
  emit("project-click", row);
};

// 编辑表单提交
const handleEditSubmit = async (formData) => {
  try {
    let res;
    if (isAddProject.value) {
      // 新增项目
      res = await createProject(props.organizationId, {
        name: formData.name,
        description: formData.description,
        centerLongitude: formData.centerLongitude,
        centerLatitude: formData.centerLatitude,
      });
    } else {
      // 编辑项目
      res = await editProject(formData.projectId, {
        name: formData.name,
        description: formData.description,
        centerLongitude: formData.centerLongitude,
        centerLatitude: formData.centerLatitude,
      });
    }

    if (res && res.code === 200) {
      ElMessage.success(isAddProject.value ? "新增项目成功" : "编辑项目成功");
      editDialogVisible.value = false;
      await getProjectListData();
    } else {
      ElMessage.error(res?.message || "操作失败");
    }
  } catch (error) {
    console.error("操作失败:", error);
    ElMessage.error(
      isAddProject.value ? "新增项目失败" : "编辑项目失败，请重试",
    );
  }
};

// 获取无人机列表
const getUavList = async () => {
  if (!currentProject.value) return;

  uavLoading.value = true;
  try {
    const res = await getProjectDevicesList(currentProject.value.projectId);
    if (res && res.code === 200 && res.data) {
      uavTableData.value = (res.data || []).map((item, index) => ({
        ...item,
        index: index + 1, // 序号从1开始，0是数组下标
      }));
    }
    console.log("1", uavTableData.value);
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败，请重试");
  } finally {
    uavLoading.value = false;
  }
};

// 查看无人机详情
const handleViewUav = (row) => {
  console.log("查看无人机详情:", row);
  ElMessage.info("查看无人机详情功能开发中");
};

// 添加无人机
const handleAddUav = () => {
  // 修改：清空数组，而非单个值
  addUavSelectedDevice.value = [];
  addUavTableData.value = [];
  addUavDialogVisible.value = true;
  getAvailableDevices();
};

// 编辑无人机
const handleEditUav = (row) => {
  console.log("编辑无人机:", row);
  ElMessage.info("编辑无人机功能开发中");
};

// 删除无人机
// const handleDeleteUav = (row) => {
//   ElMessageBox.confirm(`确定要删除无人机 【${row.name}】 吗？`, "警告", {
//     confirmButtonText: "确定",
//     cancelButtonText: "取消",
//     type: "warning",
//   })
//     .then(() => {
//       ElMessage.success("删除成功");
//       getUavList();
//     })
//     .catch(() => {});
// };

// 获取可用设备列表
const getAvailableDevices = async () => {
  addUavLoading.value = true;
  try {
    const res = await listUsefulDevice();
    if (res && res.code === 200 && res.data) {
      addUavTableData.value = res.data || [];
      console.log(addUavTableData.value, "addUavTableData.value");
    }
  } catch (error) {
    console.error("获取可用设备列表失败:", error);
    ElMessage.error("获取可用设备列表失败，请重试");
  } finally {
    addUavLoading.value = false;
  }
};

// 修改：无人机选择变化 - 支持多选，直接赋值选中的数组
const handleAddUavSelectionChange = (selection) => {
  addUavSelectedDevice.value = selection;
};

// 提交添加无人机 - 适配多选
const handleAddUavSubmit = async () => {
  if (addUavSelectedDevice.value.length === 0) {
    ElMessage.warning("请选择至少一个设备");
    return;
  }

  try {
    // 这里根据后端接口调整批量添加逻辑
    // 示例：循环添加，也可以改成批量提交（如果后端支持）
    let successCount = 0;
    const deviceIds = addUavSelectedDevice.value.map(
      (device) => device.deviceNumber,
    );
    for (const device of addUavSelectedDevice.value) {
      // 替换为实际的添加无人机接口
      const res = await service({
        url: `/api/project/manage/${currentProject.value.projectId}/addDevices`,
        method: "POST",
        data: deviceIds,
      });
      if (res && res.code === 200) {
        successCount++;
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功添加 ${successCount} 个无人机设备`);
      addUavDialogVisible.value = false;
      await getUavList();
    } else {
      ElMessage.error("添加无人机失败");
    }
  } catch (error) {
    console.error("添加无人机失败:", error);
    ElMessage.error("添加无人机失败，请重试");
  }
};

// 监听 organizationId 变化
watch(
  () => props.organizationId,
  () => {
    if (props.organizationId) {
      getProjectListData();
    }
  },
  { immediate: true },
);

// 监听项目列表加载，如果是从创建页面跳转过来的，自动进入刚创建的项目
watch(
  () => tableData.value,
  (newData) => {
    if (newData && newData.length > 0) {
      // 检查是否是从创建页面跳转过来的（通过路由判断）
      const route = router.currentRoute.value;
      const createdProjectName = route.query?.createdProjectName;

      if (createdProjectName) {
        const createdProject = newData.find(
          (p) => p.name === createdProjectName,
        );
        if (createdProject) {
          console.log("自动进入刚创建的项目:", createdProject);
          // 自动触发项目点击事件，进入任务管理
          emit("project-click", createdProject);
          // 清除标记，避免重复触发
          router.replace({
            path: route.path,
            query: { ...route.query, createdProjectName: undefined },
          });
        }
      }
    }
  },
);
</script>

<style scoped>
.members-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.members-table-container,
.add-member-table-container,
.uav-table-container {
  max-height: 500px;
  overflow-y: auto;
}

.add-uav-table-container {
  max-height: 500px;
  overflow-y: auto;
}

/* 美化滚动条 */
.members-table-container::-webkit-scrollbar,
.add-member-table-container::-webkit-scrollbar,
.uav-table-container::-webkit-scrollbar,
.add-uav-table-container::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.members-table-container::-webkit-scrollbar-thumb,
.add-member-table-container::-webkit-scrollbar-thumb,
.uav-table-container::-webkit-scrollbar-thumb,
.add-uav-table-container::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 2px;
}

.members-table-container::-webkit-scrollbar-thumb:hover,
.add-member-table-container::-webkit-scrollbar-thumb:hover,
.uav-table-container::-webkit-scrollbar-thumb:hover,
.add-uav-table-container::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.members-table-container::-webkit-scrollbar-track,
.add-member-table-container::-webkit-scrollbar-track,
.uav-table-container::-webkit-scrollbar-track,
.add-uav-table-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.project-detail {
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

.project-avatar {
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

.project-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.project-info p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.detail-descriptions {
  margin-bottom: 20px;
}

.detail-tabs {
  margin-top: 20px;
}

.tab-header-info {
  margin-bottom: 10px;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

.detail-list-container {
  margin-bottom: 10px;
}

.detail-members-container,
.detail-uavs-container {
  max-height: 300px;
  overflow-y: auto;
}

.detail-members-container::-webkit-scrollbar,
.detail-uavs-container::-webkit-scrollbar {
  width: 4px;
}

.detail-members-container::-webkit-scrollbar-thumb,
.detail-uavs-container::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 2px;
}

.detail-members-container::-webkit-scrollbar-thumb:hover,
.detail-uavs-container::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

.detail-members-container::-webkit-scrollbar-track,
.detail-uavs-container::-webkit-scrollbar-track {
  background-color: transparent;
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
