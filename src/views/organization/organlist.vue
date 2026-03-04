<template>
  <div class="organ-list">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <el-card class="nav-card" shadow="hover">
        <div class="nav-container">
          <div class="nav-left">
            <div
              class="nav-item"
              :class="{ active: activeNav === 'org' }"
              @click="handleNavClick('org')"
            >
              <el-icon><Operation /></el-icon>
              <span>组织管理</span>
            </div>
            <div
              class="nav-item"
              :class="{ active: activeNav === 'project' }"
              @click="handleNavClick('project')"
            >
              <el-icon><Files /></el-icon>
              <span>项目管理</span>
            </div>
            <div
              class="nav-item"
              :class="{ active: activeNav === 'task' }"
              @click="handleNavClick('task')"
            >
              <el-icon><Postcard /></el-icon>
              <span>任务管理</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 组织列表表格 -->
    <OrganizationTable
      v-if="activeNav === 'org'"
      :organization-id="currentOrganizationId"
      @org-click="handleOrgClick"
    />

    <!-- 项目列表表格 -->
    <ProjectTable
      v-if="activeNav === 'project'"
      :organization-id="currentOrganizationId"
      :organization-name="currentOrganizationName"
      @project-click="handleProjectClick"
    />

    <!-- 任务列表表格 -->
    <TaskTable
      v-if="activeNav === 'task'"
      :project-id="currentProjectId"
      :project-name="currentProjectName"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Operation, Files, Postcard } from "@element-plus/icons-vue";
import OrganizationTable from "./components/OrganizationTable.vue";
import ProjectTable from "./components/ProjectTable.vue";
import TaskTable from "./components/TaskTable.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getProjectList } from "@/api/project";

// 状态变量
const activeNav = ref("org");
const currentOrganizationId = ref(null);
const currentOrganizationName = ref("");
const currentProjectId = ref(null);
const currentProjectName = ref("");
const router = useRouter(); //
const route = useRoute();

// 项目列表数据（用于查找刚创建的项目）
const projectListData = ref([]);

// 点击组织名称跳转到项目管理
const handleOrgClick = (row) => {
  currentOrganizationId.value = row.organizationId;
  currentOrganizationName.value = row.name;
  activeNav.value = "project";
};

// 点击项目名称跳转到任务管理
const handleProjectClick = (row) => {
  currentProjectId.value = row.projectId;
  currentProjectName.value = row.name;
  activeNav.value = "task";
};

// 导航处理
const handleNavClick = (nav) => {
  console.log(nav, "navnavnav");
  console.log(activeNav.value);
  if (activeNav.value === "org" && nav === "project") {
    //当前是组织管理 ==》项目管理
    ElMessage.info("点击组织名称进入项目");
  } else if (activeNav.value === "org" && nav === "task") {
    //当前是组织管理 ==》》任务管理
    ElMessage.info("点击项目名称进入项目");
  } else if (activeNav.value === "project" && nav === "task") {
    //当前是项目管理 ==》任务管理
    ElMessage.info("点击项目名称进入项目");
  } else if (activeNav.value === "project" && nav === "org") {
    //当前是项目管理 ==>组织管理
    activeNav.value = "org";
  } else if (activeNav.value === "task" && nav === "project") {
    //当前是任务管理 ==>项目管理
    activeNav.value = "project";
  } else if (activeNav.value === "task" && nav === "org") {
    //当前是任务管理 ==>组织管理
    activeNav.value = "org";
  }
};

// 查找刚创建的项目并进入
const findAndEnterCreatedProject = async (projectName, orgId) => {
  try {
    const res = await getProjectList(orgId, {
      pageNum: 1,
      pageSize: 10,
    });
    if (res && res.code === 200 && res.data) {
      projectListData.value = res.data.list || [];
      const createdProject = projectListData.value.find(p => p.name === projectName);
      if (createdProject) {
        console.log("找到刚创建的项目:", createdProject);
        currentProjectId.value = createdProject.projectId;
        currentProjectName.value = createdProject.name;
        activeNav.value = "task";
      }
    }
  } catch (error) {
    console.error("查询项目列表失败:", error);
  }
};

// 组件挂载时检查是否有从项目创建页面跳转过来的参数
onMounted(() => {
  const query = route.query;
  console.log("Query参数:", query);

  // 情况1：如果只有 orgId 和 orgName，说明是从项目创建页面跳转过来的
  if (query.orgId && query.orgName && !query.projectId) {
    currentOrganizationId.value = query.orgId;
    currentOrganizationName.value = query.orgName;
    activeNav.value = "project";

    // 监听路由变化，等到项目列表加载完成后查找刚创建的项目
    watch(() => route.query, (newQuery) => {
      console.log("路由参数变化:", newQuery);
      if (newQuery.createdProjectName) {
        nextTick(async () => {
          await findAndEnterCreatedProject(newQuery.createdProjectName, query.orgId);
        });
      }
    }, { immediate: true });
  }
  // 情况2：如果有 projectId 和 projectName，说明是从其他地方跳转过来的
  else if (query.projectId && query.projectName) {
    currentOrganizationId.value = query.orgId || null;
    currentOrganizationName.value = query.orgName || "";
    currentProjectId.value = query.projectId;
    currentProjectName.value = query.projectName;
    activeNav.value = "task";
  }
});
</script>

<style scoped>
.nav-header {
  margin-bottom: 20px;
}

.nav-card {
  border-radius: 8px;
  background: #fff;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 20px;
}

.nav-left {
  display: flex;
  gap: 40px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;
  color: #606266;
  font-size: 14px;
}

.nav-item:hover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.nav-item.active {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  font-weight: 500;
}

.nav-item .el-icon {
  font-size: 18px;
}

.search-input {
  width: 240px;
}
</style>
