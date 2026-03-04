<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="500px"
    :show-close="true"
    :before-close="handleClose"
  >
    <div class="edit-project-content">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="经纬度">
          <el-row :gutter="10">
            <el-col :span="12">
              <el-input
                v-model="formData.centerLatitude"
                placeholder="请输入经度"
              />
            </el-col>
            <el-col :span="12">
              <el-input
                v-model="formData.centerLongitude"
                placeholder="请输入纬度"
              />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="归档状态" v-if="showArchiveOption">
          <el-switch
            v-model="formData.isArchived"
            :active-value="true"
            :inactive-value="false"
            active-text="已归档"
            inactive-text="进行中"
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="loading"
          :disabled="!formData.name || !formData.description"
        >
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  projectData: {
    type: Object,
    default: () => ({}),
  },
  title: {
    type: String,
    default: "编辑项目",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  showArchiveOption: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const formRef = ref();
const formData = ref({
  name: "",
  description: "",
  centerLatitude: "",
  centerLongitude: "",
  isArchived: false,
  projectId: "",
});

const rules = ref({
  name: [
    { required: true, message: "请输入项目名称", trigger: "blur" },
    { min: 1, max: 50, message: "长度在 1 到 50 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入项目描述", trigger: "blur" },
    { min: 1, max: 200, message: "长度在 1 到 200 个字符", trigger: "blur" },
  ],
});

const visible = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});

// 监听项目数据变化，填充表单
watch(
  () => props.projectData,
  (newVal) => {
    if (newVal) {
      formData.value = {
        name: newVal.name || "",
        description: newVal.description || "",
        centerLatitude: newVal.centerLatitude || "",
        centerLongitude: newVal.centerLongitude || "",
        isArchived: newVal.isArchived || false,
        projectId: newVal.projectId || "",
      };
    }
  },
  { immediate: true, deep: true }
);

const handleConfirm = async () => {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (valid) {
      emit("confirm", { ...formData.value });
    }
  } catch (error) {
    ElMessage.error("表单验证失败");
  }
};

const handleCancel = () => {
  emit("cancel");
  visible.value = false;
};

const handleClose = (done) => {
  emit("cancel");
  done();
};

// 暴露方法给父组件
defineExpose({
  resetForm: () => {
    if (formRef.value) {
      formRef.value.resetFields();
    }
  },
});
</script>

<style scoped>
.edit-project-content {
  padding: 10px 20px 0;
}

.dialog-footer {
  padding: 0px 20px 0px;
  text-align: right;
}

.dialog-footer .el-button {
  padding: 9px 20px;
  margin-left: 12px;
}
</style>
