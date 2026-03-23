<template>
  <div class="form-scroll-container">
    <el-form
      ref="roleFormRef"
      :model="roleForm"
      :rules="roleRules"
      label-width="120px"
    >
      <!-- 策略名称 -->
      <el-form-item label="策略名称" prop="name">
        <el-input v-model="roleForm.name" placeholder="请输入策略名称" />
      </el-form-item>

      <!-- 策略描述 -->
      <el-form-item label="策略描述" prop="description">
        <el-input
          type="textarea"
          v-model="roleForm.description"
          placeholder="请输入策略详细描述"
          :rows="3"
        />
      </el-form-item>

      <!-- 策略创建时间 - 仅在需要时显示 -->
      <el-form-item v-if="showCreatedAt" label="创建时间" prop="createdAt">
        <el-input
          :model-value="formatDateTime(roleForm.createdAt)"
          placeholder="创建时间"
          disabled
          readonly
        />
      </el-form-item>

      <el-form-item label="停留时间" prop="residenceTime">
        <el-input
          v-model="roleForm.residenceTime"
          placeholder="请输入停留时间"
          type="number"
          :formatter="formatNumber"
          :parser="parseNumber"
        >
          <template #suffix>s</template>
        </el-input>
      </el-form-item>

      <el-form-item label="动作" prop="action">
        <el-select
          v-model="roleForm.action"
          placeholder="请选择动作"
          style="width: 100%"
        >
          <el-option
            v-for="item in headingActionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="速度" prop="velocity">
        <el-input
          v-model="roleForm.velocity"
          placeholder="请输入速度"
          type="number"
          :formatter="formatNumber"
          :parser="parseNumber"
        >
          <template #suffix>m/s</template>
        </el-input>
      </el-form-item>

      <el-form-item label="航向角" prop="headingAngle.mode">
        <el-select
          v-model="props.roleForm.headingAngle.mode"
          placeholder="请选择航向角类型"
          style="width: 100%"
        >
          <el-option
            v-for="item in headingAngleOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <!-- 与目标点成一定角度 -->
        <el-input
          v-show="
            props.roleForm.headingAngle.mode ===
            'at an angle to the target point'
          "
          v-model="props.roleForm.headingAngle.angle"
          style="width: 50%; margin-top: 10px"
          placeholder="请输入与目标点的角度"
          type="number"
          min="0"
          max="360"
        >
          <template #suffix>°</template>
        </el-input>

        <!-- 朝某一点不变 -->
        <div
          v-show="
            props.roleForm.headingAngle.mode === 'towards a certain point'
          "
          class="coordinate-inputs"
        >
          <el-input
            v-model="props.roleForm.headingAngle.lon"
            style="width: 50%; margin-top: 10px"
            placeholder="请输入经度"
            type="number"
            step="0.000001"
            min="0"
          >
            <template #suffix>°</template>
          </el-input>

          <el-input
            v-model="props.roleForm.headingAngle.lat"
            style="width: 50%; margin-top: 10px"
            placeholder="请输入纬度"
            type="number"
            step="0.000001"
            min="0"
          >
            <template #suffix>°</template>
          </el-input>
        </div>
      </el-form-item>

      <el-form-item label="高度策略" prop="heightStrategy">
        <el-select
          v-model="roleForm.heightStrategy"
          placeholder="请选择高度策略类型"
          style="width: 100%"
        >
          <el-option
            v-for="item in heightStrategyOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-select
          v-model="roleForm.priority"
          placeholder="请选择优先级类型"
          style="width: 100%"
        >
          <el-option
            v-for="item in priorityOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="分类" prop="sort">
        <el-select
          v-model="roleForm.sort"
          placeholder="请选择分类类型"
          style="width: 100%"
        >
          <el-option
            v-for="item in categoryOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="航线失联行为" prop="routeLossBehavior">
        <el-select
          v-model="roleForm.routeLossBehavior"
          placeholder="请选择航线失联行为"
          style="width: 100%"
        >
          <el-option
            v-for="item in lossBehaviorOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  roleForm: {
    type: Object,
    required: true,
    default: () => ({
      name: "",
      description: "",
      createdAt: "",
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
      angle: 0,
      longitude: 0,
      latitude: 0,
    }),
  },
  showCreatedAt: {
    type: Boolean,
    default: true,
  },
});
console.log(props.roleForm, "props.roleForm");

// 暴露给父组件的属性和方法
const emit = defineEmits();

// 表单引用
const roleFormRef = ref(null);
// 航向角相关输入值
const angleInput = ref(0);
const coordinateInput = ref({});
// 选项数据
const headingActionOptions = ref([
  { label: "悬停", value: "hover" },
  { label: "偏航", value: "yaw" },
  { label: "翻转", value: "turn over" },
  { label: "俯仰", value: "pitch" },
]);
const headingAngleOptions = ref([
  { label: "朝着目标不变", value: "towards the goal" },
  { label: "偏航", value: "at an angle to the target point" },
  // { label: "朝某一点不变", value: "towards a certain point" },
]);

const heightStrategyOptions = ref([
  // { label: "先升高再向目标点", value: "Rise first" },
  // { label: "先向目标点再升高", value: "First to the target point" },
  { label: "匀速升高", value: "Rise at a uniform rate" },
]);

const priorityOptions = ref([
  { label: "最高", value: "highest" },
  { label: "高", value: "high" },
  { label: "中", value: "middle" },
  { label: "低", value: "low" },
  { label: "最低", value: "lowest" },
]);

const categoryOptions = ref([
  { label: "常规任务", value: "Regular tasks" },
  { label: "紧急任务", value: "urgent" },
  { label: "巡检任务", value: "Inspection" },
  { label: "侦察任务", value: "reconnoiter" },
  { label: "其他任务", value: "other" },
]);

const lossBehaviorOptions = ref([
  { label: "继续执行航线", value: "continue" },
  { label: "返航", value: "return" },
  { label: "降落", value: "landing" },
  { label: "悬停", value: "hover" },
]);

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: "请输入策略名称", trigger: "blur" },
    { min: 2, max: 20, message: "长度在 2 到 20 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入策略描述", trigger: "blur" },
    { max: 200, message: "描述长度不能超过200个字符", trigger: "blur" },
  ],
  residenceTime: [
    { required: true, message: "请输入停留时间", trigger: "blur" },
  ],
  action: [{ required: true, message: "请输入动作", trigger: "blur" }],
  velocity: [{ required: true, message: "请输入速度", trigger: "blur" }],
  "headingAngle.mode": [
    { required: true, message: "请选择航向角类型", trigger: "change" },
  ],
  heightStrategy: [
    { required: true, message: "请选择高度策略类型", trigger: "change" },
  ],
  priority: [
    { required: true, message: "请选择优先级类型", trigger: "change" },
  ],
  sort: [{ required: true, message: "请选择分类类型", trigger: "change" }],
  routeLossBehavior: [
    { required: true, message: "请选择航线失联行为", trigger: "change" },
  ],
};

// 时间格式化函数
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "-");
};

// 格式化显示：彻底移除所有非数字字符
const formatNumber = (val) => {
  if (!val) return "";
  // 仅保留数字（包括整数和小数）
  return val.toString().replace(/[^\d.]/g, "");
};

// 解析值：确保提交时为数字类型
const parseNumber = (val) => {
  if (!val) return null;
  // 移除所有非数字字符后转为数字
  const numStr = val.toString().replace(/[^\d.]/g, "");
  return numStr ? Number(numStr) : null;
};

// 暴露表单验证方法给父组件
const validateForm = async () => {
  if (!roleFormRef.value) return false;
  return await roleFormRef.value.validate();
};

// 暴露重置表单方法给父组件
const resetForm = () => {
  if (roleFormRef.value) {
    roleFormRef.value.resetFields();
  }
};

defineExpose({
  validateForm,
  resetForm,
});
// 监听航向角变化（通过 props.roleForm 访问）
watch(
  () => props.roleForm?.headingAngle, // 添加可选链避免初始化报错
  (newVal) => {
    if (!newVal) return; // 初始化阶段直接返回

    if (newVal !== "at an angle to the target point") {
      angleInput.value = 0;
    }
    if (newVal !== "towards a certain point") {
      coordinateInput.value = { longitude: 0, latitude: 0 };
    }
  },
  { immediate: true }, // 立即执行一次，处理初始值
);
// 监听输入变化并同步到父组件
watch(
  [angleInput, coordinateInput],
  () => {
    if (!props.roleForm) return; // 确保 roleForm 已加载

    emit("update:roleForm", {
      ...props.roleForm,
      angle: angleInput.value,
      longitude: coordinateInput.value.longitude,
      latitude: coordinateInput.value.latitude,
    });
  },
  { deep: true },
);
watch(
  () => props.roleForm, // 添加可选链避免初始化报错
  (newVal) => {
    console.log(typeof newVal.policyJson, "newVal");
    console.log(newVal, "newVal");
    if (typeof newVal?.policyJson === "string") {
      console.log(newVal, "111");
      let data = JSON.parse(newVal.policyJson);
      let newData = data.routeData;
      console.log(newData);
      props.roleForm.action = newData.action;
      props.roleForm.headingAngle = newData.heading_angle;
      props.roleForm.headingAngle.lat = newData.heading_angle.lat;
      props.roleForm.headingAngle.lon = newData.heading_angle.lon;
      props.roleForm.headingAngle.angle = newData.heading_angle.angle;
      props.roleForm.heightStrategy = newData.height_strategy;
      props.roleForm.priority = newData.priority;
      props.roleForm.residenceTime = newData.residence_time;
      props.roleForm.routeLossBehavior = newData.route_loss_behavior;
      props.roleForm.sort = newData.sort;
      props.roleForm.velocity = newData.velocity;
      console.log(props.roleForm, "props.roleForm");
    } else {
      console.log("qqqq");

      return;
    }
  },
  { immediate: true }, // 立即执行一次，处理初始值
);
</script>

<style scoped>
.form-scroll-container {
  max-height: calc(100% - 40px);
  overflow-y: auto;
  padding-right: 10px;
}

/* 滚动条美化 */
.form-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.form-scroll-container::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.form-scroll-container::-webkit-scrollbar-track {
  background-color: #f5f5f5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-form {
    width: 100% !important;
  }
}
</style>
