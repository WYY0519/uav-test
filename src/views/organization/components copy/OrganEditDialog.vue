<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="500"
    align-center
    @close="handleClose"
  >
    <el-form
      ref="editFormRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="组织名称" prop="name">
        <el-input
          v-model="formData.name"
          clearable
          placeholder="请输入组织名称"
          maxlength="10"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="组织描述" prop="description">
        <el-input
          v-model="formData.description"
          clearable
          placeholder="请输入组织描述"
          maxlength="20"
          show-word-limit
          type="textarea"
          :rows="3"
        />
      </el-form-item>
      <el-form-item label="组织ID" prop="organizationId">
        <el-input v-model="formData.organizationId" disabled />
      </el-form-item>
      <el-form-item label="创建时间" prop="createdAt">
        <el-input v-model="formData.createdAt" disabled />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  organizationData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:visible", "success", "close"]);

// 对话框状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

// 表单引用
const editFormRef = ref();

// 加载状态
const loading = ref(false);

// 表单数据
const formData = reactive({
  name: "",
  description: "",
  organizationId: "",
  createdAt: "",
  createdBy: "",
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: "请输入组织名称", trigger: "blur" },
    {
      min: 1,
      max: 10,
      message: "组织名称长度在 1 到 10 个字符",
      trigger: "blur",
    },
  ],
  description: [
    { required: true, message: "请输入组织描述", trigger: "blur" },
    {
      min: 1,
      max: 20,
      message: "组织描述长度在 1 到 20 个字符",
      trigger: "blur",
    },
  ],
};

// 对话框标题
const dialogTitle = "编辑组织";
// 监听组织数据变化
watch(
  () => props.organizationData,
  (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      Object.keys(formData).forEach((key) => {
        if (key in newData) {
          // 特殊处理字段映射
          if (key === "describe" && newData[key]) {
            formData.description = newData[key];
          } else if (key === "description" || key === "describe") {
            formData.description = newData[key] || "";
          } else {
            formData[key] = newData[key] || "";
          }
        }
      });

      // 确保organizationId和createdAt有值
      if (newData.organizationId) {
        formData.organizationId = newData.organizationId;
      }
      if (newData.createdAt) {
        formData.createdAt = formatDate(newData.createdAt);
      }
    }
  },
  { immediate: true }
);

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

// 处理提交
const handleSubmit = async () => {
  try {
    const valid = await editFormRef.value.validate();
    if (!valid) return;

    loading.value = true;

    // 准备提交数据
    const submitData = {
      name: formData.name,
      describe: formData.description,
      organizationId: formData.organizationId,
    };

    // 触发成功事件
    emit("success", submitData);
  } catch (error) {
    console.error("表单验证失败:", error);
    if (error && error.errors) {
      ElMessage.warning("请检查表单填写是否完整");
    }
  } finally {
    loading.value = false;
  }
};

// 处理关闭
const handleClose = () => {
  // 重置表单
  if (editFormRef.value) {
    editFormRef.value.resetFields();
  }

  // 重置表单数据
  Object.keys(formData).forEach((key) => {
    formData[key] = "";
  });

  emit("close");
};

// 暴露方法给父组件
defineExpose({
  submitForm: handleSubmit,
  resetForm: () => {
    if (editFormRef.value) {
      editFormRef.value.resetFields();
    }
  },
});
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-input) {
  width: 100%;
}
</style>
