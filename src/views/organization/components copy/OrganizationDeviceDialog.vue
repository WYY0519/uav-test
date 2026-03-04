<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    @close="handleDialogClose"
  >
    <!-- 设备管理头部 -->
    <div class="device-header">
      <div class="header-left">
        <h3>{{ organizationName }} - 设备列表</h3>
        <el-tag type="info" effect="plain" class="device-count">
          共 {{ deviceList?.length }} 台设备
        </el-tag>
      </div>
      <el-button
        type="success"
        :icon="Plus"
        @click="openAddDeviceDialog"
        class="action-button"
      >
        添加设备
      </el-button>
    </div>

    <!-- 设备列表表格 -->
    <el-table
      :data="deviceList"
      stripe
      border
      v-loading="loading"
      style="width: 100%"
      empty-text="暂无无人机设备"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column
        prop="id"
        label="设备ID"
        width="80"
        show-overflow-tooltip
      />
      <el-table-column
        prop="name"
        label="设备名称"
        width="120"
        show-overflow-tooltip
      />
      <el-table-column
        prop="deviceNumber"
        label="设备型号"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="location"
        label="位置"
        width="100"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <div class="location-cell">
            <el-icon>
              <Location />
            </el-icon>
            <span>{{ row.location || "暂无位置信息" }}</span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加设备对话框 -->
    <el-dialog
      v-model="addDeviceDialogVisible"
      title="添加设备"
      width="600px"
      destroy-on-close
      @close="handleAddDeviceClose"
    >
      <div class="add-device-content">
        <el-table
          :data="availableDeviceList"
          border
          stripe
          v-loading="addDeviceLoading"
          highlight-current-row
        >
          <el-table-column width="55">
            <template #default="{ row }">
              <el-checkbox v-model="row.id" @change="handleDeviceSelect(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="设备名称" />
          <el-table-column prop="deviceNumber" label="设备编号" />
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addDeviceDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmAddDevices"
            :loading="addingDevices"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { Plus, Location } from "@element-plus/icons-vue";
import {
  getOrganizationUavs,
  organizationListdevices,
  organizationManage,
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
  return "组织无人机列表";
});

// 设备列表相关
const loading = ref(false);
const deviceList = ref([]);

// 添加设备相关
const addDeviceDialogVisible = ref(false);
const availableDeviceList = ref([]);
const addDeviceLoading = ref(false);
const addingDevices = ref(false);
const selectedDevices = ref(new Set());

// 监听组织ID变化，加载设备列表
watch(
  () => props.organizationId,
  (newOrgId) => {
    if (newOrgId) {
      loadDevices();
    }
  },
  { immediate: true }
);

// 加载设备列表
const loadDevices = async () => {
  if (!props.organizationId) return;

  loading.value = true;
  try {
    const res = await getOrganizationUavs(props.organizationId);
    if (res.code === 200) {
      deviceList.value = res.data || [];
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

// 打开添加设备对话框
const openAddDeviceDialog = async () => {
  addDeviceDialogVisible.value = true;
  addDeviceLoading.value = true;
  selectedDevices.value.clear();

  try {
    const res = await organizationListdevices(props.organizationId);
    console.log("获取可用设备列表返回:", res);

    if (res.code === 200) {
      // 检查数据结构，确保是数组
      let deviceData = [];
      if (Array.isArray(res.data)) {
        deviceData = res.data;
      } else if (res.data && Array.isArray(res.data.list)) {
        deviceData = res.data.list;
      } else if (res.data && Array.isArray(res.data.data)) {
        deviceData = res.data.data;
      }

      // 过滤掉已经在组织中的设备
      const existingDeviceIds = new Set(
        deviceList.value.map((device) => device.id)
      );
      deviceData = deviceData.filter(
        (device) => !existingDeviceIds.has(device.id)
      );

      availableDeviceList.value = deviceData.map((device) => ({
        ...device,
        selected: false,
      }));

      console.log("处理后的可用设备列表:", availableDeviceList.value);

      if (availableDeviceList.value.length === 0) {
        ElMessage.info("没有可添加的设备");
      }
    } else {
      ElMessage.error(res.message || "获取可用设备列表失败");
    }
  } catch (error) {
    console.error("获取可用设备列表失败:", error);
    ElMessage.error("获取可用设备列表失败");
  } finally {
    addDeviceLoading.value = false;
  }
};

// 处理设备选择
const handleDeviceSelect = (row) => {
  row.selected = !row.selected;
  if (row.selected) {
    selectedDevices.value.add(row.id);
  } else {
    selectedDevices.value.delete(row.id);
  }
};

// 确认添加设备 - 修复API调用
const confirmAddDevices = async () => {
  if (selectedDevices.value.size === 0) {
    ElMessage.warning("请至少选择一个设备");
    return;
  }

  addingDevices.value = true;
  try {
    const deviceIds = Array.from(selectedDevices.value);

    console.log("准备添加的设备ID:", deviceIds);
    console.log("组织ID:", props.organizationId);

    // 根据原主页面中的调用方式，organizationManage应该接收一个对象参数
    // 原代码中的调用方式是：await organizationManage(data);
    // 所以我们需要传递一个包含组织ID和设备ID的对象
    const data = {
      organizationId: props.organizationId,
      deviceIds: deviceIds,
    };

    console.log("调用organizationManage参数:", data);
    const res = await organizationManage(data);

    if (res.code === 200) {
      ElMessage.success("添加设备成功");
      addDeviceDialogVisible.value = false;
      selectedDevices.value.clear();
      await loadDevices(); // 重新加载设备列表
      emit("refresh"); // 通知父组件刷新
    } else {
      ElMessage.error(res.message || "添加设备失败");
    }
  } catch (error) {
    console.error("添加设备失败:", error);
    ElMessage.error("添加设备失败");
  } finally {
    addingDevices.value = false;
  }
};

// 处理添加设备对话框关闭
const handleAddDeviceClose = () => {
  selectedDevices.value.clear();
  if (availableDeviceList.value) {
    availableDeviceList.value.forEach((device) => {
      device.selected = false;
    });
  }
};

// 处理主对话框关闭
const handleDialogClose = () => {
  emit("close");
};

// 暴露方法给父组件
defineExpose({
  refreshDevices: loadDevices,
});
</script>

<style scoped>
.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.device-header .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.device-count {
  padding: 4px 8px;
}

.add-device-content {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 4px;
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

:deep(.el-checkbox) {
  margin-right: 0;
}

:deep(.el-checkbox__label) {
  display: none;
}
</style>
