<template>
  <div class="create-organization">
    <el-card class="form-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title">创建组织</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="userRules"
        label-width="100px"
        class="create-form"
      >
        <el-form-item label="组织名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入组织名称"
            maxlength="10"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="组织描述" prop="describe">
          <el-input
            v-model="formData.describe"
            placeholder="请输入组织描述"
            maxlength="20"
            show-word-limit
            type="textarea"
          />
        </el-form-item>
        <!-- 头像
        <el-form-item label="头像" prop="logoUrl">
          <el-upload
            v-model:file-list="formData.logoUrl"
            action="https://jsonplaceholder.typicode.com/posts/"
            list-type="picture-card"
          >
            <el-icon>
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item> -->

        <!-- 组织ID -->
        <!-- <el-form-item label="组织ID" prop="orgId">
          <el-input v-model="formData.orgId" placeholder="请输入组织ID" />
        </el-form-item> -->

        <!-- 时间 -->
        <!-- <el-form-item label="时间" prop="createdAt">
          <el-date-picker
            v-model="formData.createdAt"
            type="datetime"
            placeholder="请选择时间"
          />
        </el-form-item> -->

        <!-- 云服务信息 -->
        <!-- <el-form-item label="云服务信息" prop="cloudServiceInfo">
          <el-input
            v-model="formData.cloudServiceInfo"
            placeholder="请输入云服务信息"
          />
        </el-form-item> -->

        <div class="form-actions">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="createOrganizations">
            确定创建
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import {
  createOrganization, // 创建组织
} from "@/api/organization.js";

// 获取路由实例
const router = useRouter();
const formRef = ref(null); // 表单

// 表单数据
const formData = ref({
  name: "",
  logoUrl: "",
  orgId: "",
  createdAt: "",
  cloudServiceInfo: "",
  menuId: "",
  describe: "",
});
// 表单验证规则
const userRules = {
  name: [
    { required: true, message: "请输入设备名称", trigger: "blur" },
    { min: 3, max: 10, message: "长度在 3 到 10 个字符", trigger: "blur" },
  ],
  describe: [
    { required: true, message: "请输入组织描述", trigger: "blur" },
    { min: 1, max: 20, message: "长度在 1 到 20 个字符", trigger: "blur" },
  ],
};
// 取消创建
const handleCancel = () => {
  router.back();
};

// 创建组织
const createOrganizations = async () => {
  formRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }
    const data = {
      name: formData.value.name, // 组织名称
      describe: formData.value.describe, // 组织描述
    };
    const res = await createOrganization(data);
    if (res.code === 200) {
      ElMessage.success("创建成功");
      // 跳转到组织列表;
      router.push("/organization/list");
      formData.value.name = "";
      formData.value.describe = "";
    }
  });
};

onMounted(() => {});
</script>

<style scoped>
.create-organization {
  /* padding: 20px; */
  max-width: 600px;
  margin: 0 auto;
}

.form-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.create-form {
  padding: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .create-organization {
    padding: 12px;
  }

  .create-form {
    padding: 12px;
  }
}
</style>
