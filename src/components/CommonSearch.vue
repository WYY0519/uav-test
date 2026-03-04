<template>
  <div class="search-container">
    <el-form :inline="true" :model="formData" class="search-form">
      <!-- 动态渲染搜索项：input/select -->
      <el-form-item
        v-for="item in searchItems"
        :key="item.prop"
        :label="item.label"
        :class="{ 'form-item': true, [item.className]: item.className }"
      >
        <!-- 输入框（默认） -->
        <el-input
          v-if="!item.type || item.type === 'input'"
          width="20%"
          v-model="formData[item.prop]"
          :placeholder="item.placeholder || `请输入${item.label}`"
          :maxlength="item.maxlength"
          clearable
          @clear="handleClear"
        />

        <!-- 下拉选择框 -->
        <el-select
          v-else-if="item.type === 'select'"
          v-model="formData[item.prop]"
          :placeholder="item.placeholder || `请选择${item.label}`"
          clearable
          @clear="handleClear"
          style="width: 100%"
        >
          <el-option
            v-for="option in item.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <!-- 操作按钮 -->
      <div class="button-group">
        <el-button type="primary" @click="handleSearch" :icon="Search">
          搜索
        </el-button>
        <el-button type="default" @click="handleReset" :icon="Refresh">
          重置
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs } from "vue";
import { Search, Refresh } from "@element-plus/icons-vue";

// 接收父组件参数
const props = defineProps({
  // 搜索项配置：新增type/options字段支持select
  searchItems: {
    type: Array,
    required: true,
    default: () => [],
  },
  // 初始表单数据
  initialData: {
    type: Object,
    default: () => ({}),
  },
});

// 表单数据
const formData = reactive({ ...props.initialData });

// 向父组件传递事件
const emit = defineEmits(["search", "reset"]);

// 搜索
const handleSearch = () => {
  emit("search", { ...formData });
};

// 重置
const handleReset = () => {
  // 重置为初始值
  Object.keys(formData).forEach((key) => {
    formData[key] = props.initialData[key] || "";
  });
  emit("reset");
};

// 单个输入框/下拉框清除时触发搜索
const handleClear = () => {
  handleSearch();
};
</script>

<style scoped>
.search-container {
  background: #fff;
  border-radius: 8px;
  padding: 18px 18px 0 18px;
  margin-bottom: 18px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.form-item {
  flex: 1;
  min-width: 150px;
  max-width: 25%;
  margin-right: 10px;
  margin-bottom: 18px;
}

.button-group {
  display: flex;
  margin-left: auto;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 18px;
}

@media (max-width: 768px) {
  .button-group {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }

  .form-item {
    width: 25%;
    max-width: none;
  }
}
</style>
