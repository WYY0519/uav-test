<template>
  <el-dialog
    v-model="isVisible"
    title="编辑路线"
    width="35%"
    :key="dialogKey"
    :append-to-body="true"
    type="warning"
    style="max-height: 80%; overflow-y: auto"
    @close="handleClose"
  >
    <el-form
      ref="saveRouteFormRef"
      :model="formData"
      :rules="rules"
      label-width="90px"
    >
      <el-form-item label="路线名称:" prop="name">
        <el-input v-model="formData.name" placeholder="请输入路线名称" />
      </el-form-item>
      <el-form-item label="路线描述:" prop="description">
        <el-input
          v-model="formData.description"
          :rows="2"
          type="textarea"
          maxlength="20"
          show-word-limit
          placeholder="请输入路线描述"
        />
      </el-form-item>
      <el-form-item label="航点策略:" prop="waypointStrategy">
        <el-select
          v-model="formData.waypointStrategy"
          placeholder="请选择航点策略"
          disabled
          @change="handleSelectStrategyChange"
        >
          <el-option
            v-for="item in waypointOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <!-- 数据行 -->
      <div
        class="save-route"
        v-for="(item, index) in formData.points"
        :key="index"
        style="display: flex; align-items: center; margin-bottom: 10px"
      >
        <el-form-item
          label="高度:"
          :prop="`points[${index}].alt`"
          :rules="[{ required: true, message: '请输入高度', trigger: 'blur' }]"
        >
          <el-input v-model="item.alt" placeholder="高度" />
        </el-form-item>
        <el-form-item
          label="经度:"
          :prop="`points.[${index}].lng`"
          :rules="[{ required: true, message: '请输入经度', trigger: 'blur' }]"
        >
          <el-input v-model="item.lng" placeholder="经度" />
        </el-form-item>
        <el-form-item
          label="纬度:"
          :prop="`points.[${index}].lat`"
          :rules="[{ required: true, message: '请输入纬度', trigger: 'blur' }]"
        >
          <el-input v-model="item.lat" placeholder="纬度" />
        </el-form-item>

        <!-- 操作按钮 -->
        <div
          style="
            display: flex;
            gap: 10px;
            margin-left: 10px;
            margin-bottom: 16px;
          "
        >
          <span
            class="operation-btn add-btn"
            @click="handleAddRow(index)"
            title="添加行"
            >+</span
          >
          <span
            class="operation-btn delete-btn"
            @click="handleDeleteRow(index)"
            title="删除行"
            :disabled="formData.points.length <= 2"
            >-</span
          >
        </div>
      </div>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { dronePolicyList } from "@/api/dronePolicy.js";

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  route: {
    type: Object,
    default: () => ({}),
  },
});

// 定义事件
const emit = defineEmits(["update:visible", "save"]);

// 表单数据
const formData = ref({
  name: "",
  description: "",
  points: [],
  waypointStrategy: "",
});

// 表单引用
const saveRouteFormRef = ref(null);
const isVisible = ref(props.visible);
const dialogKey = ref(props.key); // 子组件key与父组件同步
const selectedItemStrategy = ref({});
const waypointOptions = ref([]);
let policyIdDialog = ref("");

// 表单验证规则
const rules = {
  name: [
    { required: true, message: "请输入路线名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在 1 到 10 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入路线描述", trigger: "blur" },
    { min: 1, max: 20, message: "长度在 1 到 20 个字符", trigger: "blur" },
  ],
};

// 获取所有策略（确保value为数字类型）
const getAllPolicies = async () => {
  try {
    const res = await dronePolicyList();
    if (res.code === 200) {
      waypointOptions.value = res.data.map((item) => ({
        ...item,
        value: Number(item.id), // 转为数字类型，与1精确匹配
        label: item.name,
      }));
      // 加载完成后，强制同步选中状态
      nextTick(() => {
        selectDefaultStrategy();
      });
    }
  } catch (error) {
    console.error("获取所有策略:", error);
    ElMessage.error("获取所有策略失败");
  }
};
// 策略选择变化处理（保持同步）
const handleSelectStrategyChange = (value) => {
  selectedItemStrategy.value = waypointOptions.value.find(
    (item) => item.value === value
  );
  policyIdDialog.value = selectedItemStrategy.value?.value || "";
  console.log("当前选中策略ID:", value);
};
// 新增默认选中逻辑
const selectDefaultStrategy = () => {
  // 如果已有选中值，但未显示label，强制重新匹配
  if (formData.value.waypointStrategy && waypointOptions.value.length > 0) {
    const matched = waypointOptions.value.find(
      (item) => item.value === formData.value.waypointStrategy
    );
    if (matched) {
      // 触发一次change事件，强制刷新显示
      handleSelectStrategyChange(formData.value.waypointStrategy);
    }
  }
};
// 监听策略选项变化，确保默认选中
watch(
  waypointOptions,
  (newVal) => {
    if (newVal.length > 0) {
      selectDefaultStrategy();
    }
  },
  { deep: true }
);
// 添加行
const handleAddRow = (index) => {
  const newPoint = {
    alt: "",
    lng: "",
    lat: "",
  };
  formData.value.points.splice(index + 1, 0, newPoint);
  ElMessage.info(`在第${index + 1}行后添加了新行`);
};

// 删除行
const handleDeleteRow = (index) => {
  if (formData.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }
  formData.value.points.splice(index, 1);
  ElMessage.info(`已删除第${index + 1}行`);
};

// 关闭弹窗
const handleClose = () => {
  emit("update:visible", false);
};

// 确认保存
const handleConfirm = () => {
  saveRouteFormRef.value.validate(async (valid) => {
    if (valid) {
      // 验证航点数量
      if (formData.value.points.length < 2) {
        ElMessage.warning("至少需要2个航点");
        return;
      }

      // 转换数据格式
      const pointsJson = convertPoints(formData.value.points);

      // 提交数据
      emit("save", {
        id: props.route.id,
        name: formData.value.name,
        description: formData.value.description,
        policyId: formData.value.waypointStrategy,
        pointsJson: pointsJson,
      });
    }
  });
};

// 转换点数据格式
const convertPoints = (points) => {
  // 转换 points 数组（lng → lon）
  const convertedPoints = points.map((point) => ({
    lat: point.lat,
    lon: point.lng,
    alt: point.alt,
  }));

  // 设置 home_pos（使用第一个点）
  const homePos =
    points.length > 0
      ? {
          lat: points[0].lat,
          lon: points[0].lng,
          alt: 0,
        }
      : { lat: 0, lon: 0, alt: 0 };

  return JSON.stringify({
    routeData: {
      type: "mission",
      points: convertedPoints,
      home_pos: homePos,
    },
  });
};
// 简化状态同步逻辑（关键修复）
watch(
  () => props.visible,
  async (newVal) => {
    console.log("[子组件] 接收visible:", newVal);
    // 直接同步状态，不添加额外逻辑干扰
    isVisible.value = newVal;
    getAllPolicies();
  },
  { immediate: true } // 初始化时立即执行
);
// 监听route变化，更新表单数据
watch(
  () => props.route,
  (newVal) => {
    if (newVal && newVal.id) {
      try {
        // 解析pointsJson
        const parsedData = JSON.parse(newVal.pointsJson);
        const originalPoints = parsedData?.routeData?.points || [];

        // 转换数据结构
        formData.value = {
          name: newVal.name,
          description: newVal.description,
          waypointStrategy: Number(newVal.policyId),
          points: originalPoints.map((point) => ({
            lat: point.lat,
            lng: point.lon,
            alt: point.alt,
          })) || [{ lat: "", lng: "", alt: "" }],
        };
      } catch (error) {
        console.error("解析航线数据失败：", error);
        ElMessage.error("加载失败，航线数据格式错误");
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped>
:deep(.save-route .el-form-item__label) {
  width: 60px !important;
}

:deep(.save-route .el-form-item__content) {
  margin-right: 12px !important;
}

.operation-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.add-btn {
  background-color: #409eff;
  color: white;
}

.add-btn:hover {
  background-color: #66b1ff;
}

.delete-btn {
  background-color: #f56c6c;
  color: white;
}

.delete-btn:hover {
  background-color: #f78989;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
