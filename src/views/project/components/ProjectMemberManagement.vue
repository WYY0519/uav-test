<template>
  <el-dialog v-model="dialogVisible" :title="title" width="800px">
    <div class="member-management">
      <div class="member-header">
        <h3 class="project-title">所属项目：{{ projectName }}</h3>
        <el-button type="success" @click="handleAddMemberClick">
          <el-icon><Plus /></el-icon>添加成员
        </el-button>
      </div>

      <!-- 成员列表 -->
      <el-table
        :data="memberList"
        border
        stripe
        class="member-table"
        v-loading="loading"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="username" label="成员名称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag v-for="role in row.role" :key="role" class="role-tag">
              {{ role }}
            </el-tag>
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
                  <el-icon><Delete /></el-icon>
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
      title="添加项目成员"
      width="500px"
      :append-to-body="true"
    >
      <div class="add-member-dialog">
        <div v-if="availableMembers.length > 0" class="member-selection">
          <el-table
            :data="availableMembers"
            border
            stripe
            v-loading="loading"
            highlight-current-row
          >
            <el-table-column width="55">
              <template #default="{ row }">
                <el-radio
                  v-model="selectedMemberId"
                  :label="row.userId"
                  @change="() => handleMemberSelect(row)"
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
        <el-empty v-else description="暂无可用成员" />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addMemberDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleAddMemberConfirm"
            :disabled="!selectedMemberId"
            :loading="addingMember"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { Plus, Delete } from "@element-plus/icons-vue";
import {
  getProjectMemberList,
  addProjectMember,
  deleteProjectMember,
  getpProjectMembers,
} from "@/api/project";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  projectId: {
    type: String,
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:visible", "close"]);

// 响应式数据
const dialogVisible = ref(false);
const loading = ref(false);
const addingMember = ref(false);
const addMemberDialogVisible = ref(false);
const memberList = ref([]);
const availableMembers = ref([]);
const selectedMemberId = ref("");
const selectedMemberPhone = ref("");

// 监听父组件传递的visible变化
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      loadMemberList();
      loadAvailableMembers();
    }
  }
);

// 监听内部dialogVisible变化，同步到父组件
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    emit("update:visible", false);
    emit("close");
    resetSelection();
  }
});

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// 加载项目成员列表
const loadMemberList = async () => {
  try {
    loading.value = true;
    const res = await getProjectMemberList(props.projectId);
    if (res.code === 200) {
      memberList.value = res.data || [];
    } else {
      ElMessage.warning("获取成员列表失败");
    }
  } catch (error) {
    console.error("加载成员列表失败:", error);
    ElMessage.error("加载成员列表失败");
  } finally {
    loading.value = false;
  }
};

// 加载可用成员列表
const loadAvailableMembers = async () => {
  try {
    const res = await getpProjectMembers(props.orgId, props.projectId);
    if (res.code === 200) {
      availableMembers.value = res.data || [];
    }
  } catch (error) {
    console.error("加载可用成员失败:", error);
    availableMembers.value = [];
  }
};

// 处理添加成员按钮点击
const handleAddMemberClick = () => {
  addMemberDialogVisible.value = true;
  resetSelection();
};

// 处理成员选择
const handleMemberSelect = (row) => {
  selectedMemberId.value = row.userId;
  selectedMemberPhone.value = row.phone;
};

// 处理添加成员确认
const handleAddMemberConfirm = async () => {
  try {
    addingMember.value = true;
    const res = await addProjectMember(props.projectId, {
      phone: selectedMemberPhone.value,
    });

    if (res.code === 200) {
      ElMessage.success("添加项目成员成功");
      addMemberDialogVisible.value = false;
      loadMemberList(); // 重新加载成员列表
      loadAvailableMembers(); // 重新加载可用成员列表
    } else {
      ElMessage.error(res.message || "添加成员失败");
    }
  } catch (error) {
    console.error("添加成员失败:", error);
    ElMessage.error("添加成员失败");
  } finally {
    addingMember.value = false;
  }
};

// 处理删除成员
const handleRemoveMember = (row) => {
  ElMessageBox.confirm(`确定要删除成员 【${row.username}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      const res = await deleteProjectMember(props.projectId, row.userId);
      if (res.code === 200) {
        ElMessage.success("成员已移除");
        loadMemberList(); // 重新加载成员列表
        loadAvailableMembers(); // 重新加载可用成员列表
      }
    } catch (error) {
      console.error("删除成员失败:", error);
      ElMessage.error("删除成员失败");
    }
  });
};

// 重置选择状态
const resetSelection = () => {
  selectedMemberId.value = "";
  selectedMemberPhone.value = "";
};
</script>

<style scoped>
.member-management {
  /* padding: 10px 0; */
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
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.member-table {
  margin-bottom: 20px;
}

.role-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.add-member-dialog {
  max-height: 400px;
  overflow-y: auto;
}

.member-selection {
  padding: 10px 0;
}

.dialog-footer {
  padding-top: 20px;
  text-align: right;
}

:deep(.el-dialog__body) {
  padding: 10px;
}
</style>
