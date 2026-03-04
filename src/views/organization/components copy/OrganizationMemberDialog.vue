<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    @close="handleDialogClose"
  >
    <!-- 成员管理头部 -->
    <div class="member-header">
      <div class="header-left">
        <h4>{{ organizationName }} - 成员列表</h4>
        <el-tag type="info" effect="plain">
          共 {{ memberList.length }} 名成员
        </el-tag>
      </div>
      <el-button type="success" @click="openAddMemberDialog">
        <el-icon> <Plus /> </el-icon>添加成员
      </el-button>
    </div>

    <!-- 成员列表表格 -->
    <el-table
      :data="memberList"
      style="width: 100%"
      border
      v-loading="loading"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <el-table-column prop="username" label="用户名" align="center" />
      <el-table-column prop="phone" label="手机号" align="center" />
      <el-table-column prop="rolename" label="角色名" align="center" />
      <el-table-column prop="projects" label="项目名" align="center" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-tooltip content="移除成员" placement="top">
              <el-button
                type="danger"
                link
                @click="handleRemoveMember(row)"
                :disabled="row.role === 'owner'"
              >
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="addMemberDialogVisible"
      title="添加成员"
      width="600px"
      destroy-on-close
      @close="handleAddMemberClose"
    >
      <div class="add-member-content">
        <el-table
          :data="userList"
          border
          stripe
          v-loading="addMemberLoading"
          highlight-current-row
        >
          <el-table-column width="55">
            <template #default="{ row }">
              <el-checkbox v-model="row.userId" @change="handleUserSelect(row)">
                <span></span>
              </el-checkbox>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户名称" />
          <el-table-column prop="email" label="用户邮箱" />
          <el-table-column prop="phone" label="用户手机号" />
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addMemberDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmAddMembers"
            :loading="addingMembers"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Delete } from "@element-plus/icons-vue";
import {
  getOrganizationMembers,
  addOrganizationMember,
  deleteOrganizationMember,
  organizListuser,
} from "@/api/organization";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  organizationId: {
    type: String,
    default: "",
  },
  organizationName: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:visible", "close", "refresh"]);

// 对话框状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

// 对话框标题
const dialogTitle = computed(() => {
  return "组织成员管理";
});

// 成员列表相关
const loading = ref(false);
const memberList = ref([]);

// 添加成员相关
const addMemberDialogVisible = ref(false);
const userList = ref([]);
const addMemberLoading = ref(false);
const addingMembers = ref(false);
const selectedUsers = ref(new Set());

// 监听组织ID变化，加载成员列表
watch(
  () => props.organizationId,
  (newOrgId) => {
    if (newOrgId) {
      loadMembers();
    }
  },
  { immediate: true }
);

// 加载成员列表
const loadMembers = async () => {
  if (!props.organizationId) return;

  loading.value = true;
  try {
    const res = await getOrganizationMembers(props.organizationId, "");
    if (res.code === 200) {
      memberList.value = res.data || [];
    } else {
      ElMessage.error(res.message || "获取成员列表失败");
    }
  } catch (error) {
    console.error("获取成员列表失败:", error);
    ElMessage.error("获取成员列表失败");
  } finally {
    loading.value = false;
  }
};

// 移除成员
const handleRemoveMember = async (member) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除成员 【${member.username}】 吗？`,
      "警告",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    const res = await deleteOrganizationMember(
      props.organizationId,
      member.userId
    );
    if (res.code === 200) {
      ElMessage.success("成员移除成功");
      await loadMembers();
      emit("refresh");
    } else {
      ElMessage.error(res.message || "移除成员失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("移除成员失败:", error);
      ElMessage.error("移除成员失败");
    }
  }
};

// 打开添加成员对话框
const openAddMemberDialog = async () => {
  addMemberDialogVisible.value = true;
  addMemberLoading.value = true;
  selectedUsers.value.clear();

  try {
    const res = await organizListuser();
    if (res.code === 200) {
      userList.value = res.data.map((user) => ({
        ...user,
        selected: false,
      }));
    } else {
      ElMessage.error(res.message || "获取用户列表失败");
    }
  } catch (error) {
    console.error("获取用户列表失败:", error);
    ElMessage.error("获取用户列表失败");
  } finally {
    addMemberLoading.value = false;
  }
};

// 处理用户选择
const handleUserSelect = (row) => {
  console.log(row, "q2wergfb");

  row.selected = !row.selected;
  if (row.selected) {
    selectedUsers.value.add(row.phone);
  } else {
    selectedUsers.value.delete(row.phone);
  }
};

// 确认添加成员
const confirmAddMembers = async () => {
  if (selectedUsers.value.size === 0) {
    ElMessage.warning("请至少选择一个用户");
    return;
  }

  addingMembers.value = true;
  try {
    const userPhones = Array.from(selectedUsers.value);
    const res = await addOrganizationMember(props.organizationId, userPhones);

    if (res.code === 200) {
      ElMessage.success("添加成员成功");
      addMemberDialogVisible.value = false;
      selectedUsers.value.clear();
      await loadMembers();
      emit("refresh");
    } else {
      ElMessage.error(res.message || "添加成员失败");
    }
  } catch (error) {
    console.error("添加成员失败:", error);
    ElMessage.error("添加成员失败");
  } finally {
    addingMembers.value = false;
  }
};

// 处理添加成员对话框关闭
const handleAddMemberClose = () => {
  selectedUsers.value.clear();
  userList.value.forEach((user) => {
    user.selected = false;
  });
};

// 处理主对话框关闭
const handleDialogClose = () => {
  emit("close");
};

// 暴露方法给父组件
defineExpose({
  refreshMembers: loadMembers,
});
</script>

<style scoped>
.member-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.member-header .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.add-member-content {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-table) {
  margin-top: 0;
}

:deep(.el-table__header-wrapper) {
  font-weight: 600;
}
</style>
