<template>
  <el-card class="table-card">
    <template #header>
      <slot name="org-header" />
      <div class="card-header">
        <div class="header-left">
          <span class="title">{{ title }}</span>
          <el-tag type="success" effect="plain" class="count-tag">
            共 {{ total }} 条数据
          </el-tag>
        </div>
        <div class="header-right">
          <slot name="header-actions"></slot>
        </div>
      </div>
    </template>

    <el-table
      ref="tableRef"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      :row-key="rowKey"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <!-- 多选列 -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        width="55"
        align="center"
        :reserve-selection="reserveSelection"
      />

      <!-- 动态列 -->
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align || 'center'"
        :show-overflow-tooltip="col.showOverflowTooltip"
      >
        <template #default="{ row }" v-if="col.slotName">
          <slot :name="col.slotName" :row="row"></slot>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column
        v-if="showAction"
        label="操作"
        :width="actionWidth"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <slot name="action" :row="row"></slot>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页插槽 -->
    <div v-if="$slots.pagination" class="pagination-container">
      <slot name="pagination"></slot>
    </div>
  </el-card>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  tableData: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  showSelection: {
    type: Boolean,
    default: false,
  },
  showAction: {
    type: Boolean,
    default: true,
  },
  actionWidth: {
    type: String,
    default: "150",
  },
  rowKey: {
    type: String,
    default: "id",
  },
  reserveSelection: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["row-click", "selection-change"]);

const tableRef = ref();

const handleRowClick = (row) => {
  emit("row-click", row);
};

const handleSelectionChange = (val) => {
  emit("selection-change", val);
};

// 清空所有选中
const clearSelection = () => {
  if (tableRef.value) {
    tableRef.value.clearSelection();
  }
};

// 切换行选中状态
const toggleRowSelection = (row, selected) => {
  if (tableRef.value) {
    tableRef.value.toggleRowSelection(row, selected);
  }
};

// 暴露方法
defineExpose({
  clearSelection,
  toggleRowSelection,
});
</script>

<style scoped>
:deep(.org-header-wrapper) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.table-card {
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 10px 0;
}

.count-tag {
  margin-left: 8px;
}
:deep(.el-table__header) {
  width: 100% !important;
}
:deep(.el-table__body) {
  width: 100% !important;
}
:deep(.el-tooltip) {
  width: 100% !important;
}
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
