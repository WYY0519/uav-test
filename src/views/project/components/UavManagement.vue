<template>
  <el-dialog v-model="dialogVisible" :title="title" width="800px">
    <div class="uav-management">
      <div class="uav-header">
        <h3 class="project-title">所属项目：{{ projectName }}</h3>
        <el-button type="success" @click="handleAddUavClick">
          <el-icon><Plus /></el-icon>添加无人机
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
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加无人机对话框 -->
    <el-dialog
      v-model="addUavDialogVisible"
      title="新增无人机"
      width="600px"
      :append-to-body="true"
      destroy-on-close
    >
      <div class="add-uav-dialog">
        <el-table
          :data="availableUavList"
          border
          stripe
          v-loading="loading"
          highlight-current-row
        >
          <el-table-column width="55">
            <template #default="{ row }">
              <el-checkbox v-model="row.id" @change="handleUavSelection(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="设备名称" />
          <el-table-column prop="deviceNumber" label="设备编号" />
        </el-table>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addUavDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleAddUavConfirm"
            :loading="addingUav"
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
  getProjectDevicesList,
  listUsefulDevice,
  addManageProject,
  deleteManageProject,
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
});

const emit = defineEmits(["update:visible", "close"]);

// 响应式数据
const dialogVisible = ref(false);
const loading = ref(false);
const addingUav = ref(false);
const addUavDialogVisible = ref(false);
const uavList = ref([]);
const availableUavList = ref([]);

// 标题
const title = "无人机管理";

// 监听父组件传递的visible变化
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      loadUavList();
    }
  }
);

// 监听内部dialogVisible变化，同步到父组件
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    emit("update:visible", false);
    emit("close");
    resetData();
  }
});

// 加载无人机列表
const loadUavList = async () => {
  try {
    loading.value = true;
    const res = await getProjectDevicesList(props.projectId);
    if (res.code === 200) {
      uavList.value = res.data || [];
    } else {
      ElMessage.warning("获取无人机列表失败");
    }
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败");
  } finally {
    loading.value = false;
  }
};

// 加载可用无人机列表
const loadAvailableUavList = async () => {
  try {
    loading.value = true;
    const res = await listUsefulDevice();
    if (res.code === 200) {
      availableUavList.value = (res.data || []).map((item) => ({
        ...item,
        selected: false,
      }));
    } else {
      ElMessage.error(res.message || "获取设备列表失败");
      availableUavList.value = [];
    }
  } catch (error) {
    console.error("获取设备列表失败:", error);
    ElMessage.error("获取设备列表失败");
    availableUavList.value = [];
  } finally {
    loading.value = false;
  }
};

// 处理添加无人机按钮点击
const handleAddUavClick = async () => {
  try {
    await loadAvailableUavList();
    addUavDialogVisible.value = true;
  } catch (error) {
    console.error("加载可用设备失败:", error);
  }
};

// 处理无人机选择
const handleUavSelection = (row) => {
  row.selected = !row.selected;
};

// 处理添加无人机确认
const handleAddUavConfirm = async () => {
  try {
    addingUav.value = true;

    const selectedDeviceNumbers = availableUavList.value
      .filter((item) => item.selected)
      .map((item) => item.deviceNumber);

    if (selectedDeviceNumbers.length === 0) {
      ElMessage.warning("请至少选择一台无人机");
      return;
    }

    const res = await addManageProject(props.projectId, selectedDeviceNumbers);
    if (res.code === 200) {
      ElMessage.success("添加无人机成功");
      addUavDialogVisible.value = false;
      loadUavList(); // 重新加载无人机列表
    } else {
      ElMessage.error(res.message || "添加无人机失败");
    }
  } catch (error) {
    console.error("添加无人机失败:", error);
    ElMessage.error("添加无人机失败");
  } finally {
    addingUav.value = false;
  }
};

// 处理删除无人机
const handleUavDelete = (row) => {
  ElMessageBox.confirm(`确定要删除无人机 【${row.name}】 吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  }).then(async () => {
    try {
      const res = await deleteManageProject(props.projectId, row.id);
      if (res.code === 200) {
        ElMessage.success("无人机已删除");
        loadUavList(); // 重新加载无人机列表
      } else {
        ElMessage.error(res.message || "删除无人机失败");
      }
    } catch (error) {
      console.error("删除无人机失败:", error);
      ElMessage.error("删除无人机失败");
    }
  });
};

// 重置数据
const resetData = () => {
  availableUavList.value = [];
  addUavDialogVisible.value = false;
};
</script>

<style scoped>
.uav-management {
  /* padding: 10px 0; */
}

.uav-header {
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

.add-uav-dialog {
  max-height: 400px;
  overflow-y: auto;
}

.dialog-footer {
  padding-top: 20px;
  text-align: right;
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}

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
</style>
