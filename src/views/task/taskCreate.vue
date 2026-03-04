<template>
  <div class="project-create">
    <!-- 当没有检测到组织ID时显示提示卡片 -->
    <el-card v-if="!orgId" class="warning-card" shadow="hover">
      <div class="warning-content">
        <el-icon class="warning-icon">
          <Warning />
        </el-icon>
        <div class="warning-message">
          <h3>未选择组织</h3>
          <p>您需要先选择一个组织才能创建任务。</p>
        </div>
        <el-button type="primary" @click="goToOrgList">前往选择组织</el-button>
      </div>
    </el-card>

    <!-- 有组织ID时显示创建任务表单 -->
    <el-card v-else class="form-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">创建任务</span>
            <el-tag type="info" effect="plain" v-if="orgName">
              所属项目： {{ orgName }}
            </el-tag>
            <h2>任务id{{ orgId }}</h2>
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        class="create-form"
      >
        <!-- 基本信息部分 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>

          <el-form-item label="任务名称" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="请输入任务名称"
              maxlength="10"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="任务描述" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              rows="2"
              placeholder="请输入任务描述"
              maxlength="20"
              show-word-limit
            />
          </el-form-item>

          <!-- <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="中心纬度" prop="centerLat">
                <el-input
                  v-model="formData.centerLatitude"
                  placeholder="请输入中心纬度"
                >
                  <template #append>°N</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="中心经度" prop="centerLng">
                <el-input
                  v-model="formData.centerLongitude"
                  placeholder="请输入中心经度"
                >
                  <template #append>°E</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="邀请码" prop="inviteCode">
            <el-input
              v-model="formData.inviteCode"
              placeholder="请输入邀请码"
              required
            >
              <template #prefix>
                <el-icon>
                  <Key />
                </el-icon>
              </template>
            </el-input>
          </el-form-item> -->
        </div>
        <div class="form-actions">
          <el-button @click="handleCancel" plain>取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            创建任务
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Key, Warning } from "@element-plus/icons-vue";
import {
  getUserOrganizationList, //
} from "@/api/organization";
import { missionCreate } from "@/api/mission"; // 导入创建任务
import { useProjectStore } from "@/store/modules/project";

const router = useRouter();
const formRef = ref(null);
const submitting = ref(false);
const orgLoading = ref(false);
const organizationList = ref([]);
const projectStore = useProjectStore();
const orgName = computed(() => projectStore.selectedProject?.name); //任务名称
const orgId = computed(() => projectStore.selectedProject?.projectId); //任务名称

// 表单数据
const formData = reactive({
  name: "",
  description: "",
  centerLatitude: "",
  centerLongitude: "",
  inviteCode: "",
  isMultiAircraftSafety: false,
  isRecordingAirport: false,
  isRecordingAircraft: false,
  isSharingLive: false,
  isSharingPhoto: false,
  isDeviceDirectTransfer: false,
  cloudServiceId: "",
});

// 表单验证规则
const formRules = reactive({
  name: [
    { required: true, message: "请输入任务名称", trigger: "blur" },
    { min: 2, max: 10, message: "长度在 2 到 10 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入任务描述", trigger: "blur" },
    { max: 20, message: "描述不能超过20个字符", trigger: "blur" },
  ],
  centerLatitude: [
    { required: true, message: "请输入中心纬度", trigger: "blur" },
    {
      pattern: /^-?([0-8]?[0-9](\.\d+)?|90(\.0+)?)$/,
      message: "纬度范围为 -90 到 90 度",
      trigger: "blur",
    },
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback();
        } else {
          const num = parseFloat(value);
          if (isNaN(num)) {
            callback(new Error("请输入有效的数字"));
          } else if (num < -90 || num > 90) {
            callback(new Error("纬度范围为 -90 到 90 度"));
          } else {
            callback();
          }
        }
      },
      trigger: "blur",
    },
  ],
  centerLongitude: [
    { required: true, message: "请输入中心经度", trigger: "blur" },
    {
      pattern: /^-?((1[0-7][0-9](\.\d+)?)|([0-9]?[0-9](\.\d+)?)|180(\.0+)?)$/,
      message: "经度范围为 -180 到 180 度",
      trigger: "blur",
    },
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback();
        } else {
          const num = parseFloat(value);
          if (isNaN(num)) {
            callback(new Error("请输入有效的数字"));
          } else if (num < -180 || num > 180) {
            callback(new Error("经度范围为 -180 到 180 度"));
          } else {
            callback();
          }
        }
      },
      trigger: "blur",
    },
  ],
  inviteCode: [
    { required: true, message: "请输入邀请码", trigger: "blur" },
    { min: 6, max: 6, message: "长度在 6个字符", trigger: "blur" },
  ],
  cloudServiceId: [
    { required: false, message: "请选择云服务", trigger: "change" },
  ],
});

// 获取用户所属组织列表
const getOrganizationList = async () => {
  orgLoading.value = true;
  try {
    const res = await getUserOrganizationList();
    if (res && res.code === 200 && res.data) {
      organizationList.value = res.data;
    } else {
      ElMessage.warning("获取组织列表失败");
    }
  } catch (error) {
    console.error("获取组织列表异常:", error);
    ElMessage.error("获取组织列表失败");
  } finally {
    orgLoading.value = false;
  }
};

// 取消创建
const handleCancel = () => {
  router.back();
};

// 检查组织ID是否存在
const checkOrgId = () => {
  if (!orgId.value) {
    ElMessage.warning("请先选择一个组织再创建任务");
    return false;
  }
  return true;
};

// 跳转到组织列表页面
const goToOrgList = () => {
  router.push("/organization/list");
};

// 提交表单
// const handleSubmit = async () => {
//   if (!checkOrgId()) return;
//   if (!formRef.value) return;

//   try {
//     // 表单验证
//     await formRef.value.validate();
//     submitting.value = true;
//     const data = {
//       name: formData.name, // 任务名称
//       description: formData.description, // 任务描述
//     };

//     // 调用API创建任务
//     const res = await missionCreate(orgId.value, data);
//     console.log("创建任务结果:", res);
//     if (res && res.code === 200) {
//       ElMessage.success("任务创建成功");
//       console.log(orgId, "organizationList");
//       router.push({
//         path: "/organization/list/task",
//         query: {
//           orgId: orgId.value,
//           orgName: orgName.value,
//         },
//       });
//     } else {
//       ElMessage.error("任务创建失败");
//     }
//   } catch (error) {
//     console.error("表单验证失败:", error);
//   } finally {
//     submitting.value = false;
//   }
// };
// 提交表单
const handleSubmit = async () => {
  if (!checkOrgId()) return;
  if (!formRef.value) return;

  try {
    // 表单验证
    await formRef.value.validate();
    submitting.value = true;
    const data = {
      name: formData.name, // 任务名称
      description: formData.description, // 任务描述
    };

    // 调用API创建任务
    const res = await missionCreate(orgId.value, data);
    console.log("创建任务结果:", res);
    if (res && res.code === 200) {
      ElMessage.success("任务创建成功");
      console.log(orgId, "organizationList");

      // 确保传递完整的组织信息
      router.push({
        path: "/organization/list/task",
        query: router.currentRoute.value.query,
      });
    } else {
      ElMessage.error("任务创建失败");
    }
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    submitting.value = false;
  }
};
onMounted(() => {
  // 检查是否有组织ID
  if (!orgId.value) {
    ElMessage.warning("未检测到组织ID，请先选择一个组织");
  } else {
    getOrganizationList();
  }
});
</script>

<style scoped>
.project-create {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.form-card {
  border-radius: 8px;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.form-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.create-form {
  padding: 10px 20px;
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #ebeef5;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #409eff;
  margin: 0 0 20px 0;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
}

.custom-switch {
  --el-switch-on-color: #13ce66;
  --el-switch-off-color: #ff4949;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.el-select .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .project-create {
    padding: 12px;
  }

  .create-form {
    padding: 10px;
  }

  :deep(.el-form-item__label) {
    float: none;
    display: block;
    text-align: left;
    margin-bottom: 8px;
  }

  .el-form-item {
    margin-bottom: 20px;
  }
}

/* 添加警告卡片样式 */
.warning-card {
  max-width: 600px;
  margin: 100px auto;
  border-radius: 8px;
  border-left: 4px solid #e6a23c;
}

.warning-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.warning-icon {
  font-size: 48px;
  color: #e6a23c;
  margin-right: 20px;
}

.warning-message {
  flex: 1;
}

.warning-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.warning-message p {
  margin: 0;
  color: #606266;
}
</style>
