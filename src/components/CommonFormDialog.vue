<template>
  <el-dialog
    :title="formDialogTitle"
    :model-value="modelValue"
    @update:model-value="handleVisibleChange"
    :width="dialogWidth"
    :destroy-on-close="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-width="labelWidth"
      class="form-container"
    >
      <el-form-item
        v-for="item in formItems"
        :key="`form-item-${item.prop}`"
        :label="item.label"
        :prop="item.prop"
        :required="item.required || false"
        :hidden="item.hidden || false"
        :label-width="item.labelWidth || props.labelWidth"
      >
        <!-- 输入框：v-model 绑定 formData，实时同步 -->
        <template v-if="item.type === 'input'">
          <el-input
            v-model="formData[item.prop]"
            :placeholder="item.placeholder || `请输入${item.label}`"
            :disabled="
              typeof item.disabled === 'boolean'
                ? item.disabled
                : typeof item.disabled === 'function'
                  ? item.disabled(formData)
                  : item.disabled?.value || (isEdit && item.prop === 'phone')
            "
            :maxlength="item.maxlength"
            :show-word-limit="!!item.maxlength"
            clearable
            style="width: 100%"
            @blur="item.validateOnBlur && handleFieldBlur(item)"
          />
        </template>

        <template v-if="item.type === 'input-number'">
          <el-input-number
            v-model="formData[item.prop]"
            :placeholder="item.placeholder || `请输入${item.label}`"
            :min="item.min"
            :max="item.max"
            :disabled="
              typeof item.disabled === 'boolean'
                ? item.disabled
                : item.disabled?.value
            "
            :controls-position="item.controlsPosition || 'right'"
            style="width: 100%"
          />
        </template>

        <template v-if="item.type === 'select'">
          <el-select
            v-model="formData[item.prop]"
            :placeholder="item.placeholder || `请选择${item.label}`"
            :disabled="
              typeof item.disabled === 'boolean'
                ? item.disabled
                : item.disabled?.value || (isEdit && item.prop === 'userType')
            "
            :clearable="item.clearable ?? true"
            :filterable="item.filterable || false"
            style="width: 100%"
          >
            <el-option
              v-if="!item.options || item.options.length === 0"
              label="暂无可选数据"
              value=""
              disabled
            />
            <el-option
              v-for="opt in item.options || []"
              :key="`select-opt-${item.prop}-${opt.value || opt.id}`"
              :label="opt.label"
              :value="opt.value || opt.id"
            />
          </el-select>
        </template>

        <template v-if="item.type === 'textarea'">
          <el-input
            v-model="formData[item.prop]"
            type="textarea"
            :placeholder="item.placeholder || `请输入${item.label}`"
            :rows="item.rows || 4"
            :maxlength="item.maxlength"
            :show-word-limit="!!item.maxlength"
            @blur="item.validateOnBlur && handleFieldBlur(item)"
          />
        </template>

        <slot
          :name="`form-${item.prop}`"
          :formData="formData"
          :formItem="item"
        ></slot>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";

// 🔥 核心改造：把 initialData 改成 v-model 双向绑定
const props = defineProps({
  formDialogTitle: { type: String, required: true, default: "表单弹窗" },
  modelValue: { type: Boolean, default: false },
  // 🔥 用 modelValue 绑定表单数据，替代原来的 initialData
  formModelValue: { type: Object, required: true },
  formItems: { type: Array, required: true, default: () => [] },
  rules: { type: Object, default: () => ({}) },
  dialogWidth: { type: String, default: "500px" },
  labelWidth: { type: String, default: "100px" },
  destroyOnClose: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  validateBeforeSubmit: { type: Boolean, default: true },
});

const emit = defineEmits([
  "submit",
  "cancel",
  "update:modelValue",
  "close",
  // 🔥 新增：同步表单数据回父组件
  "update:formModelValue",
]);

// 🔥 核心：formData 直接绑定父组件的 formModelValue，双向同步
const formData = reactive({ ...props.formModelValue });
const formRef = ref(null);
const fieldValidatePass = ref({});
const validateLoading = ref({});
const submitLoading = ref(false);

// 🔥 实时同步子组件输入 → 父组件
watch(
  formData,
  (newVal) => {
    emit("update:formModelValue", { ...newVal });
  },
  { deep: true },
);

// 🔥 父组件数据变化 → 同步到子组件
watch(
  () => props.formModelValue,
  (newVal) => {
    Object.assign(formData, { ...newVal });
  },
  { deep: true, immediate: true },
);

// 🔥 弹窗打开时，只做校验清空，不重置数据
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        formRef.value?.clearValidate();
      });
    }
  },
  { immediate: true },
);

// 失焦校验（保持原有逻辑，修复参数）
const handleFieldBlur = async (formItem) => {
  const { prop, validateApi, validateMsg } = formItem;
  try {
    await formRef.value.validateField(prop);
  } catch (error) {
    fieldValidatePass.value[prop] = false;
    return;
  }

  if (!formData[prop] && formData[prop] !== 0) {
    fieldValidatePass.value[prop] = true;
    return;
  }

  const validateParams = {
    [prop]: formData[prop],
    id: props.isEdit ? formData.id || "" : -1,
  };

  validateLoading.value[prop] = true;
  try {
    const res = await validateApi(validateParams);
    fieldValidatePass.value[prop] = res.code === 200;
    if (res.code !== 200) {
      ElMessage.warning(validateMsg || res.message || "该字段已存在");
    }
  } catch (error) {
    console.error(`【${formItem.label}】校验接口调用失败：`, error);
    fieldValidatePass.value[prop] = false;
  } finally {
    validateLoading.value[prop] = false;
  }
};

// 批量校验失焦字段
const validateAllFieldApi = async () => {
  const needValidateItems = props.formItems.filter(
    (item) => item.validateOnBlur,
  );
  if (needValidateItems.length === 0) return true;

  let allPass = true;
  for (const item of needValidateItems) {
    if (!fieldValidatePass.value[item.prop]) {
      await handleFieldBlur(item);
      if (!fieldValidatePass.value[item.prop]) {
        allPass = false;
      }
    }
  }
  return allPass;
};

// 提交表单
const handleSubmit = async () => {
  if (!props.validateBeforeSubmit) {
    emit("submit", { ...formData });
    return;
  }

  try {
    submitLoading.value = true;
    await formRef.value.validate();
    const isAllApiPass = await validateAllFieldApi();
    if (!isAllApiPass) {
      ElMessage.warning("部分字段校验失败，请修正后再提交");
      submitLoading.value = false;
      return;
    }
    emit("submit", { ...formData });
  } catch (error) {
    ElMessage.warning("请完善表单必填项并修正格式错误");
    console.error("表单前端规则校验失败：", error);
    submitLoading.value = false;
  }
};

// 弹窗控制
const handleVisibleChange = (value) => {
  emit("update:modelValue", value);
};

const handleCancel = () => {
  emit("cancel");
  emit("update:modelValue", false);
};

const handleClose = () => {
  emit("close");
  emit("update:modelValue", false);
};

// 暴露方法给父组件（修复方法名，和父组件调用一致）
defineExpose({
  validate: () => formRef.value?.validate(),
  clearValidate: (field) => formRef.value?.clearValidate(field),
  clearForm: () => {
    Object.keys(formData).forEach((key) => delete formData[key]);
    formRef.value?.clearValidate();
  },
});
</script>

<style scoped>
.form-container {
  margin-top: 10px;
  padding-right: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 0;
}

:deep(.el-input.is-disabled .el-input__inner) {
  background-color: #f5f7fa;
  color: #606266;
  cursor: not-allowed;
}

:deep(.el-option[disabled]) {
  color: #909399;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 90% !important;
  }
}
</style>
