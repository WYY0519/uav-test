<template>
  <div class="user-list">
    <!-- 搜索组件 -->
    <CommonSearch
      :search-items="searchItems"
      :initial-data="searchForm"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 表格组件 -->
    <CommonTable
      title="权限列表"
      :table-data="filteredUserList"
      :columns="columns"
      :total="total"
      :loading="tableLoading"
      :show-selection="false"
      :show-action="true"
      action-width="200"
      @row-click="handleRowClick"
    >
      <template #header-actions>
        <el-button v-if="isSubLevel" @click="handleBack">
          <el-icon> <ArrowLeft /> </el-icon>返回
        </el-button>
        <el-button
          type="success"
          :disabled="!superAdmin && !secondAdmin"
          @click="handleAdd"
        >
          <el-icon> <Plus /> </el-icon>添加角色
        </el-button>
      </template>

      <!-- 单选列 -->
      <template #default="{ row }">
        <el-radio
          v-model="selectedUserId"
          :label="row.id"
          @change="() => handleRadioChange(row)"
        >
          <span></span>
        </el-radio>
      </template>

      <!-- 角色列 -->
      <template #name="{ row }">
        <el-button
          type="primary"
          link
          :disabled="
            row.parentId === null ||
            (isSubLevel && currentPage === 1 && filteredUserList.length > 0 && row.id === filteredUserList[0].id)
          "
          @click="handleNameClick(row)"
        >
          {{ row.name }}
        </el-button>
      </template>

      <!-- 父级ID列 -->
      <template #parentId="{ row }">
        {{ row.parentId || "-" }}
      </template>

      <!-- 创建时间列 -->
      <template #createTime="{ row }">
        {{ formatDate(row.createTime) }}
      </template>

      <!-- 操作列 -->
      <template #action="{ row }">
        <el-button-group>
          <el-tooltip content="分配菜单" placement="top">
            <el-button
              type="info"
              link
              :disabled="
                row.parentId === null ||
                (!superAdmin && !secondAdmin) ||
                (isSubLevel && row.id === userRoleId)
              "
              @click="assignmentsMenu(row)"
            >
              <el-icon>
                <Menu />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="分配资源" placement="top">
            <el-button
              type="warning"
              link
              :disabled="
                row.parentId === null ||
                (!superAdmin && !secondAdmin) ||
                (isSubLevel && row.id === userRoleId)
              "
              @click="allocateResources(row)"
            >
              <el-icon>
                <Document />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="编辑权限" placement="top">
            <el-button
              type="primary"
              link
              :disabled="
                row.parentId === null ||
                (!superAdmin && !secondAdmin) ||
                (isSubLevel && row.id === userRoleId)
              "
              @click="handleEdit(row)"
            >
              <el-icon>
                <Edit />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除权限" placement="top">
            <el-button
              type="danger"
              link
              :disabled="
                row.parentId === null ||
                (!superAdmin && !secondAdmin) ||
                (isSubLevel && row.id === userRoleId)
              "
              @click="handleDelete(row)"
            >
              <el-icon>
                <Delete />
              </el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </template>

      <!-- 分页 -->
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

    <!-- 编辑权限对话框 -->
    <CommonFormDialog
      v-model="dialogVisible"
      :form-dialog-title="dialogTitle"
      :form-items="formItems"
      :rules="userRules"
      :initial-data="userForm"
      @submit="submitForm"
      @cancel="handleDialogCancel"
    />

    <!-- 分配菜单对话框 -->
    <AssignMenuDialog
      v-model="menuVisible"
      :role-id="selectedUserId"
      :get-role-menu-list="rolelistMenu"
      :get-menu-tree-list="roleTreeList"
      :allocate-menu="roleAllocMenu"
      @success="userlistdata"
    />

    <!-- 分配资源抽屉 -->
    <AssignResourceDrawer
      v-model="allocateResourcesDrawer"
      :role-id="selectedUserId"
      :get-all-resource-categories="listAllResourceCategory"
      :get-all-resources="listAllResource"
      :get-role-resources="listResource"
      :allocate-resource="allocResource"
      @success="userlistdata"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  Edit,
  Delete,
  Menu,
  Document,
  ArrowLeft,
} from "@element-plus/icons-vue";
import CommonSearch from "@/components/CommonSearch.vue";
import CommonTable from "@/components/CommonTable.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";
import AssignMenuDialog from "./component/AssignMenuDialog.vue";
import AssignResourceDrawer from "./component/AssignResourceDrawer.vue";
import {
  roleList,
  roleCreate,
  roleUpdate,
  roleDelete,
  rolelistMenu,
  roleAllocMenu,
  listAllResourceCategory,
  listAllResource,
  listResource,
  roleTreeList,
  allocResource,
} from "@/api/role";

// 状态变量
const tableLoading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref("添加角色");
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const selectedUserId = ref("");
const adminupId = ref("");
const menuVisible = ref(false);
const allocateResourcesDrawer = ref(false);
const isSubLevel = ref(false); // 是否在子角色列表
const parentRoleId = ref(""); // 记录父级角色ID
const currentRoleId = ref(""); // 接口返回的roleId
const userRoleId = ref(""); // 当前用户所在的角色ID(从外层列表获取)
const roleStack = ref([]); // 角色层级栈，用于逐级返回
const superAdmin = ref(false); // 是否是超级管理员
const secondAdmin = ref(false); // 是否是二级管理员
const userForm = ref({
  name: "",
  sort: "",
  description: "",
});
const filteredUserList = ref([]);

// 搜索表单配置
const searchForm = ref({
  keyword: "",
});
const searchItems = [
  {
    prop: "keyword",
    label: "角色名称",
    placeholder: "请输入角色名称",
  },
];

// 表格列配置
const columns = [
  {
    slotName: "default",
    label: "",
    width: "55",
  },
  {
    slotName: "name",
    label: "角色名称",
    minWidth: "120",
    showOverflowTooltip: true,
  },
  {
    prop: "description",
    label: "备注",
    minWidth: "180",
    showOverflowTooltip: true,
  },
  {
    prop: "sort",
    label: "排序值",
    minWidth: "120",
  },
  {
    slotName: "createTime",
    label: "创建时间",
    width: "180",
  },
];

// 表单项配置
const formItems = [
  {
    prop: "name",
    label: "角色名称",
    type: "input",
    placeholder: "请输入角色名称",
    required: true,
    maxlength: 20,
  },
  {
    prop: "sort",
    label: "排序",
    type: "input-number",
    placeholder: "请输入排序值",
    required: true,
    min: 0,
    max: 9999,
  },
  {
    prop: "description",
    label: "备注",
    type: "textarea",
    placeholder: "请输入备注",
    maxlength: 200,
    required: true,
    rows: 4,
  },
];

// 表单验证规则
const userRules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  sort: [
    { required: true, message: "请输入排序值", trigger: "blur" },
    { type: "number", message: "请输入数字", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入备注", trigger: "blur" },
    { message: "请输入备注", trigger: "blur" },
  ],
};

// 搜索
const handleSearch = async (data) => {
  searchForm.value = { ...data };
  const parentId = isSubLevel.value ? parentRoleId.value : "";
  await userlistdata(1, pageSize.value, parentId);
};

// 重置
const handleReset = async () => {
  searchForm.value = {
    keyword: "",
  };
  const parentId = isSubLevel.value ? parentRoleId.value : "";
  await userlistdata(1, pageSize.value, parentId);
};

// 添加角色
const handleAdd = () => {
  dialogTitle.value = "添加权限";
  userForm.value = {
    name: "",
    sort: "",
    description: "",
  };
  dialogVisible.value = true;
};

// 编辑权限
const handleEdit = (row) => {
  dialogTitle.value = "编辑权限";
  userForm.value = { ...row };
  adminupId.value = row.id;
  dialogVisible.value = true;
};

// 点击角色名称，查询子角色列表
const handleNameClick = (row) => {
  selectedUserId.value = row.id;
  // 将当前角色压入栈中
  roleStack.value.push({
    id: row.id,
    name: row.name,
  });
  parentRoleId.value = row.id;
  isSubLevel.value = true;
  userlistdata(1, pageSize.value, row.id);
};

// 返回上一级
const handleBack = () => {
  if (roleStack.value.length > 0) {
    // 弹出当前层级
    roleStack.value.pop();

    // 如果栈不为空，返回到上一层，否则返回到最顶层
    if (roleStack.value.length > 0) {
      const parentRole = roleStack.value[roleStack.value.length - 1];
      parentRoleId.value = parentRole.id;
      isSubLevel.value = true;
      currentPage.value = 1;
      userlistdata(1, pageSize.value, parentRole.id);
    } else {
      // 返回到最顶层
      isSubLevel.value = false;
      parentRoleId.value = "";
      currentPage.value = 1;
      userlistdata(1, pageSize.value, "");
    }
  } else {
    // 栈为空，返回到最顶层
    isSubLevel.value = false;
    parentRoleId.value = "";
    currentPage.value = 1;
    userlistdata(1, pageSize.value, "");
  }
};

// 删除权限
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除权限 ${row.name} 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    const res = await roleDelete(row.id);
    if (res.code == 200) {
      ElMessage.success("删除成功");
      // 保留当前分页和 parentId 状态
      const parentId = isSubLevel.value ? parentRoleId.value : "";
      await userlistdata(currentPage.value, pageSize.value, parentId);
    } else {
      ElMessage.error("删除失败");
    }
  });
};

// 分配菜单
const assignmentsMenu = (row) => {
  selectedUserId.value = row.id;
  menuVisible.value = true;
};

// 分配资源
const allocateResources = (row) => {
  selectedUserId.value = row.id;
  allocateResourcesDrawer.value = true;
};

// 获取角色列表数据
const userlistdata = async (
  page = currentPage.value,
  size = pageSize.value,
  parentId = "",
) => {
  try {
    tableLoading.value = true;
    const data = {
      keyword: searchForm.value.keyword,
      pageNum: page,
      pageSize: size,
      parentId: parentId,
    };
    const res = await roleList(data);
    if (res.code === 200) {
      filteredUserList.value = res.data.page.list;
      total.value = res.data.page.total;
      // 保存接口返回的 roleId
      if (res.data.roleId !== undefined) {
        // 只在外层列表(没有parentId)时,保存用户所在的角色ID
        if (parentId === "") {
          userRoleId.value = res.data.roleId;
        }
        currentRoleId.value = res.data.roleId;
      }
      // 保存管理员权限状态
      superAdmin.value = res.data.superAdmin || false;
      secondAdmin.value = res.data.secondAdmin || false;
    }
    setTimeout(() => {
      tableLoading.value = false;
    }, 500);
  } catch (error) {
    console.error("获取角色列表失败", error);
    ElMessage.error("获取数据失败");
  }
};

// 添加/修改角色
const submitForm = async (formData) => {
  if (dialogTitle.value === "添加权限") {
    const data = {
      description: formData.description,
      name: formData.name,
      sort: formData.sort,
    };
    // 添加 parentId：如果在子角色列表中，使用 parentRoleId，否则使用 currentRoleId
    if (isSubLevel.value && parentRoleId.value) {
      data.parentId = parentRoleId.value;
    } else if (currentRoleId.value) {
      data.parentId = currentRoleId.value;
    }
    const res = await roleCreate(data);
    if (res.code === 200) {
      ElMessage.success("添加成功");
      dialogVisible.value = false;
      // 保留当前分页和 parentId 状态
      const parentId = isSubLevel.value ? parentRoleId.value : "";
      await userlistdata(currentPage.value, pageSize.value, parentId);
    } else {
      ElMessage.error("添加失败");
    }
  } else if (dialogTitle.value === "编辑权限") {
    const roleID = formData.id;
    const data = {
      description: formData.description,
      name: formData.name,
      sort: formData.sort,
    };
    const res = await roleUpdate(roleID, data);
    if (res.code === 200) {
      ElMessage.success("修改成功");
      dialogVisible.value = false;
      // 保留当前分页和 parentId 状态
      const parentId = isSubLevel.value ? parentRoleId.value : "";
      await userlistdata(currentPage.value, pageSize.value, parentId);
    } else {
      ElMessage.error("修改失败");
    }
  }
};

// 对话框取消
const handleDialogCancel = () => {
  userForm.value = {
    name: "",
    sort: "",
    description: "",
  };
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

// 修改分页处理方法
const handleSizeChange = (val) => {
  pageSize.value = val;
  const parentId = isSubLevel.value ? parentRoleId.value : "";
  userlistdata(currentPage.value, val, parentId);
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  const parentId = isSubLevel.value ? parentRoleId.value : "";
  userlistdata(val, pageSize.value, parentId);
};

// 处理行点击
const handleRowClick = (row) => {
  selectedUserId.value = row.id;
};

// 处理单选框变化
const handleRadioChange = (row) => {
  selectedUserId.value = row.id;
};

// 生命周期钩子
onMounted(() => {
  userlistdata();
});
</script>

<style scoped>
.user-list {
  padding: 0;
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

/* 数字输入框文本左对齐 */
:deep(.el-input-number) {
  text-align: left;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left !important;
}
</style>
