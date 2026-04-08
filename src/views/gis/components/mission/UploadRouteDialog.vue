<template>
  <el-dialog
    class="uploadRoute"
    title="上传航线"
    v-model="dialogVisible"
    width="600px"
    max-height="600px"
    destroy-on-close
    :append-to-body="true"
    style="z-index: 9999 !important"
    @close="handleClose"
  >
    <!-- 表格区域 -->
    <el-table
      :data="routes"
      border
      stripe
      v-loading="loading"
      @row-click="handleRowClick"
      style="width: 100%; height: 400px"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <el-table-column width="55">
        <template #default="{ row }">
          <el-radio
            v-model="selectedRouteId"
            :label="row?.id"
            @change="() => handleRadioChange(row)"
          >
            <span></span>
          </el-radio>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="航线名称" min-width="100" align="center" />
      <el-table-column prop="createTime" label="航线描述" min-width="180" align="center">
        <template #default="{ row }">
          {{ row.description }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from "vue";
import { ElMessage } from "element-plus";
import { getRouteList } from "@/api/route";

// 定义Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  // 是否显示加载状态
  loading: {
    type: Boolean,
    default: false,
  },
});

// 定义Emits
const emit = defineEmits([
  "update:modelValue",
  "confirm",
  "cancel",
  "route-selected",
]);

// 响应式数据
const dialogVisible = ref(false);
const routes = ref([]);
const selectedRouteId = ref("");

// 监听外部visible变化
watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      fetchRoutes();
    }
  }
);

// 监听内部dialogVisible变化
watch(dialogVisible, (newVal) => {
  emit("update:modelValue", newVal);
  if (!newVal) {
    resetForm();
  }
});

// 获取航线列表
const fetchRoutes = async () => {
  try {
    const res = await getRouteList({
      pageNum: 1,
      pageSize: 20,
    });

    if (res.code === 200) {
      routes.value = res.data.list;
    } else {
      ElMessage.error(res.message || "获取航线列表失败");
    }
  } catch (error) {
    console.error("获取航线列表失败:", error);
    ElMessage.error("获取航线列表失败: " + error.message);
  }
};

// 处理行点击
const handleRowClick = (row) => {
  selectedRouteId.value = row.id;
  emit("route-selected", row);
};

// 处理单选按钮变化
const handleRadioChange = (row) => {
  selectedRouteId.value = row.id;
  emit("route-selected", row);
};

// 处理确定按钮
const handleConfirm = () => {
  if (!selectedRouteId.value) {
    ElMessage.warning("请选择一条航线");
    return;
  }

  emit("confirm", selectedRouteId.value);
  resetForm();
};

// 处理取消按钮
const handleCancel = () => {
  emit("cancel");
  resetForm();
  dialogVisible.value = false;
};

// 处理弹窗关闭
const handleClose = () => {
  emit("cancel");
  resetForm();
};

// 重置表单
const resetForm = () => {
  selectedRouteId.value = "";
};
</script>

<style scoped>
.uploadRoute {
  max-height: 600px;
}

:deep(.el-dialog__body) {
  height: calc(100% - 56px);
}
</style>
