<template>
  <el-dialog
    :title="title"
    v-model="dialogVisible"
    width="500px"
    destroy-on-close
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="deviceFormData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="设备名称" prop="name">
        <el-input v-model="deviceFormData.name" placeholder="请输入设备名称" />
      </el-form-item>

      <el-form-item label="设备编号" prop="deviceNumber">
        <el-input
          v-model="deviceFormData.deviceNumber"
          :disabled="isEditMode"
          placeholder="请输入设备编号"
        />
      </el-form-item>

      <el-form-item label="设备IP地址" prop="ip">
        <el-input v-model="deviceFormData.ip" placeholder="请输入设备IP地址" />
      </el-form-item>

      <el-form-item label="数据端口" prop="dataPort">
        <el-input
          v-model="deviceFormData.dataPort"
          placeholder="请输入数据端口"
        />
      </el-form-item>

      <el-form-item label="控制端口" prop="controlPort">
        <el-input
          v-model="deviceFormData.controlPort"
          placeholder="请输入控制端口"
        />
      </el-form-item>

      <el-form-item label="图传端口" prop="picturePort">
        <el-input
          v-model="deviceFormData.picturePort"
          placeholder="请输入图传端口"
        />
      </el-form-item>

      <el-form-item label="视频流地址" prop="videoIp">
        <el-input
          disabled="true"
          v-model="deviceFormData.videoIp"
          placeholder="请输入视频流地址"
        />
      </el-form-item>
      <el-button type="primary" @click="videoStreamURL"
        >申请视频流地址
      </el-button>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  createDevice,
  updateCompanyDevice,
  getVideoStreamAddress,
} from "@/api/device";

// 定义组件接收的props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  deviceData: {
    type: Object,
    default: () => ({}),
  },
});

// 定义组件抛出的事件
const emits = defineEmits(["update:visible", "success"]);

const formRef = ref(null);
const dialogVisible = ref(props.visible);
const deviceFormData = ref({
  name: "",
  deviceNumber: "",
  ip: "",
  dataPort: "",
  controlPort: "",
  picturePort: "",
  videoIp: "",
});
// 自定义校验函数：校验视频流地址格式
const validateVideoIp = (rule, value, callback) => {
  if (!value) {
    return callback(); // 空值由required规则处理
  }

  // 正则说明：
  // 1. 禁止空格：通过 [^\s] 排除所有空格（包括空格、制表符等）
  // 2. 禁止中文：通过 [^\u4e00-\u9fa5] 排除中文字符
  // 3. 合并限制：用 [^\s\u4e00-\u9fa5] 同时禁止空格和中文
  // const reg =
  //   /^(?:rtsp:\/\/121\.41\.60\.99:7896\/[^\s\u4e00-\u9fa5]+\/[^\s\u4e00-\u9fa5]+)|(?:rtmp:\/\/121\.41\.60\.99:1935\/[^\s\u4e00-\u9fa5]+\/[^\s\u4e00-\u9fa5]+)|(?:(rtsp|rtmp):\/\/sk\.yunenjoy\.cn:\d{5}\/[^\s\u4e00-\u9fa5]+)$/;

  // 正则说明：
  // 1. ^(rtsp|rtmp): 必须以 rtsp: 或 rtmp: 开头
  // 2. [^\s]*$: 后续内容不能包含任何空格（包括空格、制表符等）
  const reg = /^(rtsp:\/\/|rtmp:\/\/|http:\/\/)[^\s]*$/;
  if (!reg.test(value)) {
    return callback(
      // new Error("视频流地址格式错误（不能包含空格和中文，且需符合指定格式）")
      new Error(
        "视频流地址格式错误（必须以rtsp或rtmp或http://开头，且不能包含空格）",
      ),
    );
  }
  callback(); // 校验通过
};
// 表单验证规则（复用原规则）
const rules = {
  name: [
    { required: true, message: "请输入设备名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在 1 到 10 个字符", trigger: "blur" },
  ],
  deviceNumber: [
    { required: true, message: "请输入设备编号", trigger: "blur" },
    { min: 22, max: 22, message: "长度在22个字符", trigger: "blur" },
  ],
  ip: [
    { required: true, message: "请输入设备IP地址", trigger: "blur" },
    { min: 1, max: 15, message: "长度在 1 到 15 个字符", trigger: "blur" },
  ],
  dataPort: [
    { required: true, message: "请输入设数据端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度在5个字符", trigger: "blur" },
  ],
  controlPort: [
    { required: true, message: "请输入控制端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度在5个字符", trigger: "blur" },
  ],
  picturePort: [
    { required: true, message: "请输入图传端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度在5个字符", trigger: "blur" },
  ],
  videoIp: [
    { required: true, message: "请输入视频流地址", trigger: "blur" },
    // { min: 1, max: 40, message: "长度在40个字符", trigger: "blur" },
    { validator: validateVideoIp, trigger: "blur" },
  ],
};

// 计算标题
const title = computed(() => {
  return props.isEditMode ? "编辑设备" : "添加设备";
});

// 监听visible变化
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    console.log(dialogVisible.value, "dialogVisible.value");

    // 如果是编辑模式且有设备数据，填充表单
    if (newVal && props.isEditMode && props.deviceData.id) {
      deviceFormData.value = {
        ...props.deviceData,
        // 确保禁用状态与API一致
        disable: props.deviceData.disable === 0 ? true : false,
      };
    } else if (newVal && !props.isEditMode) {
      // 重置表单
      deviceFormData.value = {
        name: "",
        deviceNumber: "",
        ip: "",
        dataPort: "",
        controlPort: "",
        picturePort: "",
        videoIp: "",
      };
    }
  },
);

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false;
  emits("update:visible", false);
};
// 关闭弹窗时，通知父组件更新 visible 为 false
const handleClose = () => {
  emits("update:visible", false);
};
const videoStreamURL = async () => {
  try {
    let res = await getVideoStreamAddress();
    if (res.code === 200) {
      deviceFormData.value.videoIp = res.data;
    }
  } catch (err) {
    ElMessage.error("视频流获取失败");
  }
};
// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res;
        const formDataObj = {
          name: deviceFormData.value.name,
          deviceNumber: deviceFormData.value.deviceNumber,
          ip: deviceFormData.value.ip,
          dataPort: deviceFormData.value.dataPort,
          controlPort: deviceFormData.value.controlPort,
          picturePort: deviceFormData.value.picturePort,
          videoIp: deviceFormData.value.videoIp,
        };

        if (props.isEditMode && deviceFormData.value.id) {
          // 编辑模式
          res = await updateCompanyDevice(formDataObj, deviceFormData.value.id);
        } else {
          // 添加模式
          res = await createDevice(formDataObj);
        }
        if (res.code === 200) {
          ElMessage.success(props.isEditMode ? "编辑设备成功" : "添加设备成功");
          dialogVisible.value = false;
          emits("update:visible", false);
          emits("success");
        } else {
          ElMessage.error(res.message || "操作失败");
        }
      } catch (error) {
        console.error("操作失败:", error);
        ElMessage.error("操作失败");
      }
    }
  });
};

// 组件卸载时重置表单
onMounted(() => {
  if (props.visible && props.isEditMode && props.deviceData.id) {
    deviceFormData.value = {
      ...props.deviceData,
      disable: props.deviceData.disable === 0 ? true : false,
    };
  }
});
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
