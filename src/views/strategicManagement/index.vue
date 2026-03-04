<template>
  <div class="role-management">
    <el-card class="role-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">策略管理</span>
            <el-tag type="success" effect="plain" class="count-tag">
              共 {{ roleList.length }} 个策略
            </el-tag>
            <el-input
              v-model="strategyName"
              style="width: 240px"
              placeholder="请输入要搜索的策略名称"
              clearable
            />
            <el-button type="primary" @click="strategySearch">
              <el-icon> <Search /> </el-icon>搜索
            </el-button>
          </div>
          <div class="header-right">
            <el-button type="success" @click="openAddDialog">
              <el-icon> <Plus /> </el-icon>新增策略
            </el-button>
          </div>
        </div>
      </template>
      <el-row :gutter="20" style="margin: 0px; height: 100%">
        <!-- 策略列表 -->
        <el-col :span="5" style="padding: 0px; height: calc(100% - 20px)">
          <div class="role-list">
            <el-scrollbar>
              <div
                v-for="role in roleList"
                :key="role.id"
                class="role-item"
                :class="{ active: currentRole?.id === role.id }"
                @click="handleSelectRole(role)"
              >
                <div class="role-info">
                  <el-tag :type="role.type" effect="plain">{{
                    role.name
                  }}</el-tag>
                </div>
                <div class="role-actions">
                  <el-button-group>
                    <el-tooltip content="删除策略" placement="top">
                      <el-button
                        type="danger"
                        link
                        @click.stop="handleDeleteRole(role)"
                      >
                        <el-icon>
                          <Delete />
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                  </el-button-group>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </el-col>
        <!-- 配置（表单区域） -->
        <el-col :span="19" style="padding: 0px; height: 100%">
          <div class="permission-config" v-if="currentRole">
            <h3 class="config-title">
              {{ currentRole.name }} - 配置
              <el-button
                type="primary"
                size="small"
                @click="handleSavePermissions"
              >
                保存修改
              </el-button>
            </h3>
            <StrategyForm :role-form="roleForm" ref="strategyFormRef" />
          </div>
          <el-empty v-else description="请选择策略" />
        </el-col>
      </el-row>
    </el-card>
    <!-- 引入新增策略弹窗组件 -->
    <AddStrategyDialog
      v-model="addDialogVisible"
      @close="handleDialogClose"
      @success="handleAddSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Delete, Search } from "@element-plus/icons-vue";
import {
  dronePolicyList,
  dronePolicyCompanyId,
  dronePolicyCompanyDelete,
} from "@/api/dronePolicy.js";
// 导入新增策略弹窗组件
import AddStrategyDialog from "./component/AddStrategy.vue";
import StrategyForm from "./component/StrategyForm.vue";
// 状态变量
const currentRole = ref(null);
const addDialogVisible = ref(false); // 新增弹窗显示状态
const strategyFormRef = ref(null);
const strategyName = ref("");
// 策略列表数据
const roleList = ref([]);
// 表单数据
const roleForm = ref({
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
});

// 获取所有策略
const getAllPolicies = async () => {
  try {
    let res = await dronePolicyList({ name: strategyName.value });
    if (res.code === 200) {
      roleList.value = res.data;
    }
  } catch (error) {
    console.error("获取所有策略:", error);
    ElMessage.error("获取所有策略失败");
  }
};

// 选择策略
const handleSelectRole = (role) => {
  currentRole.value = role;
  // 深拷贝确保响应式
  roleForm.value = JSON.parse(JSON.stringify(role));
};

// 打开新增策略弹窗
const openAddDialog = () => {
  addDialogVisible.value = true; // 切换为true，显示弹窗
  console.log(addDialogVisible.value, "addDialogVisible.value");
  // 确保在DOM更新后重置表单
  nextTick(() => {
    if (strategyFormRef.value) {
      strategyFormRef.value.resetForm();
    }
  });
};
const handleDialogClose = () => {
  // 可以在这里添加额外的关闭逻辑
  addDialogVisible.value = false;
};

// 新增策略成功回调
const handleAddSuccess = () => {
  getAllPolicies(); // 重新加载策略列表
  addDialogVisible.value = false;
};
const strategySearch = () => {
  console.log("搜索", strategyName.value);
  getAllPolicies();
};
// 删除策略
const handleDeleteRole = async (role) => {
  ElMessageBox.confirm(`确定要删除策略"${role.name}"吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    let res = await dronePolicyCompanyDelete(role.id);
    console.log(res, "====");
    if (res.code === 200) {
      ElMessage.success("删除成功");
      if (currentRole.value?.id === role.id) {
        currentRole.value = null; // 重置当前选中的策略
        roleForm.value = {}; // 清空表单数据（可选，增强效果）
      }
      getAllPolicies();
    }
  });
};

// 保存策略修改
const handleSavePermissions = async () => {
  if (!strategyFormRef.value) {
    ElMessage.error("表单初始化失败");
    return;
  }
  try {
    const isValid = await strategyFormRef.value.validateForm();
    if (isValid) {
      // 验证通过，执行保存逻辑
      const formData = roleForm.value;
      let data = {
        routeData: {
          type: "policydata",
          action: formData.action,
          route_loss_behavior: formData.routeLossBehavior,
          height_strategy: formData.heightStrategy,
          velocity: Number(formData.velocity),
          heading_angle: formData.headingAngle,
          sort: formData.sort,
          priority: formData.priority,
          residence_time: Number(formData.residenceTime),
        },
      };
      const submitData = {
        name: formData.name,
        description: formData.description,
        type: "primary",
        policyJson: JSON.stringify(data),
      };
      console.log(submitData);
      try {
        const res = await dronePolicyCompanyId(
          currentRole.value.id,
          submitData
        );
        if (res.code === 200) {
          ElMessage.success("修改成功");
          currentRole.value = { ...currentRole.value, ...formData };
          getAllPolicies();
        } else {
          ElMessage.error(res.message || "修改失败");
        }
      } catch (error) {
        console.error("保存失败:", error);
      }
    }
  } catch (error) {
    // 表单验证失败时提示
    ElMessage.error("表单填写有误，请检查后重试");
    console.log("表单验证失败:", error);
  }
};
// 页面加载时获取数据
onMounted(() => {
  getAllPolicies();
});
watch(strategyName, (newvalue) => {
  if (!newvalue) {
    getAllPolicies();
  }
  console.log(newvalue, "newvalue");
});
</script>

<style scoped>
.role-management {
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
}

.role-card {
  border-radius: 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  width: 65px;
}

.count-tag {
  padding: 4px 8px;
}

.role-list {
  border-right: 1px solid #ebeef5;
  height: 100%;
  overflow-y: auto; /* 垂直滚动 */
}
/* 滚动条美化 */
.role-list::-webkit-scrollbar {
  width: 6px;
}

.role-list::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.role-list::-webkit-scrollbar-track {
  background-color: #f5f5f5;
}
.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 1px solid #ebeef5;
}

.role-item:hover {
  background-color: #f5f7fa;
}

.role-item.active {
  background-color: #ecf5ff;
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow: hidden;
}

.permission-config {
  /* padding: 20px 0px; */
  height: calc(100% - 0px);
  box-sizing: border-box;
}

.config-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  padding: 11px 20px;
}

.form-scroll-container {
  max-height: calc(100% - 70px);
  overflow-y: auto;
  padding-right: 10px;
  width: 60%;
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
:deep(.el-card__body) {
  padding: 0;
  height: calc(100% - 69px);
}
/* 响应式设计 */
@media (max-width: 768px) {
  .el-row {
    /* flex-direction: column; */
  }

  .el-col {
    width: 100% !important;
  }

  .role-list {
    border-right: none;
    border-bottom: 1px solid #ebeef5;
    margin-bottom: 20px;
  }

  .permission-config {
    padding: 0;
  }
}
</style>
