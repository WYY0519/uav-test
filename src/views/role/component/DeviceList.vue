<template>
  <el-card class="device-table-card">
    <template #header>
      <div class="card-header">
        <div
          class="header-left"
          style="
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: space-between;
          "
        >
          <div>
            <span class="title">无人机列表</span>
            <el-tag type="success" effect="plain" class="count-tag">
              共 {{ total }} 条数据
            </el-tag>
          </div>
          <el-button type="danger" @click="handleBatchDelete">
            <el-icon> <Delete /> </el-icon>批量删除
          </el-button>
        </div>
      </div>
    </template>
    <!-- 核心：tableRef + row-key + selection-change -->
    <el-table
      ref="tableRef"
      :data="filteredDeviceList"
      border
      stripe
      style="width: 100%"
      v-loading="loading"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      :row-key="(row) => row.id"
      empty-text="暂无数据"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <!-- 多选列（替换原单选） -->
      <el-table-column type="selection" width="55" align="center" />

      <!-- 设备id列 -->
      <el-table-column prop="id" label="设备ID" min-width="80" align="center" />

      <!-- 设备名称列 -->
      <el-table-column
        prop="name"
        label="设备名称"
        min-width="120"
        align="center"
      />

      <!-- 设备编号列 -->
      <el-table-column
        prop="deviceNumber"
        label="设备编号"
        min-width="280"
        align="center"
      />

      <!-- IP列 -->
      <el-table-column prop="ip" label="IP" min-width="120" align="center" />

      <!-- 数据端口列 -->
      <el-table-column
        prop="dataPort"
        label="数据端口"
        min-width="120"
        align="center"
      />

      <!-- 控制端口列 -->
      <el-table-column
        prop="controlPort"
        label="控制端口"
        min-width="120"
        align="center"
      />

      <!-- 图片端口列 -->
      <el-table-column
        prop="picturePort"
        label="图片端口"
        min-width="120"
        align="center"
      />

      <!-- 视频ip列 -->
      <el-table-column
        prop="videoIp"
        label="视频IP"
        min-width="280"
        align="center"
      />

      <!-- 设备状态列 -->
      <el-table-column label="设备状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.onlineTagType">
            {{ row.onlineStatus }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 启用状态 -->
      <el-table-column label="启用状态">
        <template #default="{ row }">
          <el-switch
            v-model="row.disable"
            @change="() => handleDisableSwitchChange(row)"
          />
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
        style="margin-left: 10px"
      >
        <template #default="{ row }">
          <el-button-group>
            <el-tooltip content="编辑设备" placement="top">
              <el-button
                type="primary"
                :icon="Edit"
                link
                @click="() => handleEdit(row)"
              />
            </el-tooltip>
            <el-tooltip content="删除设备" placement="top">
              <el-button
                type="danger"
                :icon="Delete"
                link
                @click="() => handleDelete(row)"
              />
            </el-tooltip>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[5, 10, 20, 30, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref } from "vue";
import { Edit, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

// 定义Props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  filteredDeviceList: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 5,
  },
});

// 定义事件
const emit = defineEmits([
  "edit",
  "delete",
  "disable-switch-change",
  "row-click",
  "selection-change",
  "size-change",
  "current-change",
  "batch-delete", // 新增：批量删除事件
]);

// 表格实例（核心：操作选中状态）
const tableRef = ref(null);
// 保存当前选中的所有行
const selectedRows = ref([]);

// 核心方法：仅清空除targetRowId外的其他行勾选
const clearOtherSelection = (targetRowId) => {
  if (!tableRef.value || !props.filteredDeviceList.length) return;
  // 遍历所有行，仅取消「非目标行」的勾选
  props.filteredDeviceList.forEach((row) => {
    if (row.id !== targetRowId) {
      tableRef.value.toggleRowSelection(row, false); // 取消勾选
    }
    // 目标行（删除行）的勾选状态保留
  });

  // 同步更新选中行数据（仅保留目标行）
  selectedRows.value = selectedRows.value.filter(
    (row) => row.id === targetRowId,
  );
};
// 新增：勾选指定行（清空其他行）
const selectTargetRow = (targetRowId) => {
  if (!tableRef.value || !props.filteredDeviceList.length) return;

  // 1. 先清空所有勾选
  tableRef.value.clearSelection();
  // 2. 找到目标行并勾选
  const targetRow = props.filteredDeviceList.find(
    (row) => row.id === targetRowId,
  );
  if (targetRow) {
    tableRef.value.toggleRowSelection(targetRow, true);
    // 同步更新选中行数据
    selectedRows.value = [targetRow];
  }
};

// 清空所有选中状态（备用方法）
const clearSelection = () => {
  if (tableRef.value) {
    tableRef.value.clearSelection();
    selectedRows.value = [];
  }
};

// 暴露方法给父组件
defineExpose({
  clearOtherSelection,
  clearSelection,
  selectTargetRow,
});

// 事件处理函数
const handleRowClick = (row) => {
  emit("row-click", row);
};
//  handleBatchDelete 方法
const handleBatchDelete = async () => {
  // 替换为自身的 selectedRows，判断是否选中数据
  if (selectedRows.value.length === 0) {
    ElMessage.warning("请选择要删除的设备");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 【${selectedRows.value.length}】 台设备吗？`,
      "批量删除",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );
    // 触发自定义事件，将选中的行数据传给父组件处理删除逻辑
    emit("batch-delete", selectedRows.value);
  } catch (error) {
    if (error !== "cancel") {
      console.error("批量删除取消/失败:", error);
    }
  }
};

// 多选状态变化（保存选中行）
const handleSelectionChange = (val) => {
  selectedRows.value = val;
  emit("selection-change", val);
};

const handleDisableSwitchChange = (row) => {
  emit("disable-switch-change", row);
};

const handleEdit = (row) => {
  emit("edit", row);
};

const handleDelete = (row) => {
  emit("delete", row);
};

const handleSizeChange = (val) => {
  emit("size-change", val);
};

const handleCurrentChange = (val) => {
  emit("current-change", val);
};
</script>

<style scoped>
.device-table-card {
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 10px 0;
}

.el-table {
  margin-top: 0;
}

.el-table :deep(.cell) {
  padding: 8px;
  text-align: center !important;
}

/* 多选框样式优化 */
:deep(.el-table .el-table-column--selection .cell) {
  display: flex;
  justify-content: center;
}

:deep(.el-button-group) {
  display: flex;
  gap: 8px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .device-table-card {
    overflow-x: auto;
  }

  .el-table {
    min-width: 600px;
  }
}
</style>
