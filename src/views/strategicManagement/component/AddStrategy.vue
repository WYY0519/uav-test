<template>
  <el-dialog
    title="新增策略"
    v-model="visible"
    width="500px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="dialog-form-container">
      <!-- 引入复用的表单组件 -->
      <StrategyForm
        :role-form="formData"
        ref="strategyFormRef"
        :show-created-at="false"
      />
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click.native="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from "vue";
import { ElMessage } from "element-plus";
import { dronePolicyCreat } from "@/api/dronePolicy.js";
// 引入复用的表单组件
import StrategyForm from "./StrategyForm.vue";

// 表单数据（与StrategyForm组件的props对应）
const formData = ref({
  name: "",
  description: "",
  createdAt: "", // 新增时可留空，创建后由接口返回
  residenceTime: "",
  action: "",
  velocity: "",
  headingAngle: {
    mode: "",
    lat: 0,
    lon: 0,
    angle: 0,
  },
  heightStrategy: "",
  priority: "",
  sort: "", // 对应原弹窗的category字段
  routeLossBehavior: "", // 对应原弹窗的lostBehavior字段
});

// 表单组件引用
const strategyFormRef = ref(null);

// 弹窗显示状态相关
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "success", "close"]);
const visible = ref(props.modelValue);
// 关闭弹窗
const handleClose = () => {
  // 重置表单
  if (strategyFormRef.value) {
    strategyFormRef.value.resetForm();
  }
  // 清空表单数据
  formData.value = {
    name: "",
    description: "",
    residenceTime: "",
    policyJson: {
      action: "",
      velocity: "",
      headingAngle: {
        mode: "",
        lat: 0,
        lon: 0,
        angle: 0,
      },
      heightStrategy: "",
      priority: "",
      sort: "",
      routeLossBehavior: "",
    },
  };
  // 通知父组件关闭
  visible.value = false;
  emit("update:handleClose", false);
  emit("close");
};

// 提交表单（复用表单的验证方法）
const handleSubmit = async () => {
  if (!strategyFormRef.value) {
    ElMessage.error("表单初始化失败");
    return;
  }

  try {
    // 调用子组件的验证方法
    const isValid = await strategyFormRef.value.validateForm();
    if (isValid) {
      // 构造提交数据（注意字段映射）
      let data = {
        routeData: {
          type: "policydata",
          action: formData.value.action,
          route_loss_behavior: formData.value.routeLossBehavior,
          height_strategy: formData.value.heightStrategy,
          velocity: Number(formData.value.velocity),
          heading_angle: formData.value.headingAngle,
          sort: formData.value.sort,
          priority: formData.value.priority,
          residence_time: Number(formData.value.residenceTime),
        },
      };
      console.log(data, "data====");

      const submitData = {
        name: formData.value.name,
        description: formData.value.description,
        type: "primary",
        policyJson: JSON.stringify(data),
      };
      console.log(submitData, "11111");

      // 调用新增接口
      const res = await dronePolicyCreat(submitData);
      if (res.code === 200) {
        ElMessage.success("新增策略成功");
        emit("success"); // 通知父组件刷新列表
        // 使用nextTick确保状态更新后再关闭
        nextTick(() => {
          handleClose();
        });
      } else {
        ElMessage.error(res.message || "新增策略失败");
      }
    }
  } catch (error) {
    // 表单验证失败，子组件会自动提示错误
    console.log("表单验证失败:", error);
  }
};
// 状态同步（监听v-model变化）
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal;
  },
  { immediate: true }
);

watch(
  () => visible.value,
  (newVal) => {
    emit("update:modelValue", newVal);
  }
);
// 监听表单数据变化并更新formData
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // 打开弹窗时重置表单数据
      formData.value = {
        name: "",
        description: "",
        residenceTime: "",
        action: "",
        velocity: "",
        headingAngle: {
          mode: "",
          lat: 0,
          lon: 0,
          angle: 0,
        },
        heightStrategy: "",
        priority: "",
        sort: "",
        routeLossBehavior: "",
      };
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.dialog-form-container {
  max-height: 450px;
  /* 根据表单内容调整最大高度 */
  overflow-y: auto;
  padding: 10px;
}

/* 保持滚动条样式一致 */
.dialog-form-container::-webkit-scrollbar {
  width: 6px;
}

.dialog-form-container::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}
</style>
