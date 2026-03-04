<template>
  <div class="layout">
    <!-- 左侧侧边栏 -->
    <div class="sidebar" :class="{ collapsed: isCollapse }">
      <el-menu
        class="el-menu-vertical"
        :default-active="getActiveMenuPath()"
        router
        :collapse="isCollapse"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#409EFF"
      >
        <div class="logo-container">
          <img src="@/assets/wrj.png" alt="Logo" class="logo" />
          <span v-if="!isCollapse" class="title">无人机管理系统</span>
        </div>
        <el-menu-item
          class="menu-item"
          index="/home"
          @click="handleMenuClick('/home')"
        >
          <el-icon><House /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/device"
          @click="handleMenuClick('/device')"
        >
          <el-icon><Setting /></el-icon>
          <template #title>设备</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/route"
          @click="handleMenuClick('/route')"
        >
          <el-icon><MapLocation /></el-icon>
          <template #title>航线</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/log"
          @click="handleMenuClick('/log')"
        >
          <el-icon><Document /></el-icon>
          <template #title>日志</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/task"
          @click="handleMenuClick('/task')"
        >
          <el-icon><List /></el-icon>
          <template #title>任务</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/factory"
          @click="handleMenuClick('/factory')"
        >
          <el-icon><Management /></el-icon>
          <template #title>工厂</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/order"
          @click="handleMenuClick('/order')"
        >
          <el-icon><DocumentChecked /></el-icon>
          <template #title>订单</template>
        </el-menu-item>
        <el-menu-item
          class="menu-item"
          index="/user"
          @click="handleMenuClick('/user')"
        >
          <el-icon><User /></el-icon>
          <template #title>用户</template>
        </el-menu-item>
        <div class="collapse-btn" @click="toggleCollapse">
          <el-icon v-if="isCollapse">
            <Expand />
          </el-icon>
          <el-icon v-else>
            <Fold />
          </el-icon>
        </div>
      </el-menu>
    </div>
    <!-- 右侧主内容 -->
    <div class="main-content">
      <!-- 顶部导航栏 -->
      <div class="top-navbar">
        <div class="nav-left">
          <div class="time-info">
            <el-icon><Clock /></el-icon>
            <span>2026-01-01 12:00:00</span>
          </div>
          <div class="platform-title">无人机管理平台</div>
          <div class="nav-controls">
            <el-button :icon="ArrowLeft" circle @click="prevPage" />
            <el-button :icon="ArrowRight" circle @click="nextPage" />
          </div>
        </div>

        <div class="nav-right">
          <div class="weather-info">
            <el-icon><MostlyCloudy /></el-icon>
            <span>20~28℃ 晴转多云 优</span>
          </div>
          <el-space>
            <el-badge :value="5" class="notification-badge">
              <el-button :icon="Bell" circle />
            </el-badge>
            <el-dropdown trigger="click">
              <div class="user-info">
                <el-avatar :size="32" :icon="UserFilled" class="user-avatar" />
                <span class="username">admin</span>
                <el-icon class="el-icon--right">
                  <CaretBottom />
                </el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item divided @click="logoutOrLogin">
                    <el-icon> <SwitchButton /> </el-icon>退出登录
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="changePassword">
                    <el-icon> <Compass /> </el-icon>修改密码
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-space>
        </div>
      </div>
      <!-- 主要内容区域 -->
      <div class="page-content">
        <div class="map-container">
          <!-- <img src="@/assets/beijing-map.png" alt="Map" class="map-bg" /> -->
          <!-- 左侧统计卡片 -->
          <div class="stats-panel left-panel">
            <div class="panel-title">
              <el-icon><Monitor /></el-icon>
              <span>无人机监控</span>
            </div>
            <div class="stat-card primary">
              <div class="stat-icon">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">无人机在线总数量</div>
                <div class="stat-value">26<span>架</span></div>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat-card secondary">
                <div class="stat-icon">
                  <el-icon><VideoCamera /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">执行中数量</div>
                  <div class="stat-value">3<span>架</span></div>
                </div>
              </div>
              <div class="stat-card secondary">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">待执行数量</div>
                  <div class="stat-value">8<span>架</span></div>
                </div>
              </div>
            </div>
            <div class="panel-title">
              <el-icon><House /></el-icon>
              <span>机场监控</span>
            </div>
            <div class="stat-card tertiary">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">机场在线总数量</div>
                <div class="stat-value">33<span>架</span></div>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat-card secondary">
                <div class="stat-icon">
                  <el-icon><VideoCamera /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">执行中数量</div>
                  <div class="stat-value">2<span>架</span></div>
                </div>
              </div>
              <div class="stat-card secondary">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">待执行数量</div>
                  <div class="stat-value">25<span>架</span></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 右侧信息面板 -->
          <div class="stats-panel right-panel">
            <div class="panel-title">
              <el-icon><Setting /></el-icon>
              <span>设备管理</span>
            </div>
            <div class="device-list">
              <div class="device-item">
                <div class="device-info">
                  <div class="device-label">设备地点:</div>
                  <div class="device-value">一号位置</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备名称:</div>
                  <div class="device-value">一号设备</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备编号:</div>
                  <div class="device-value">1234567890</div>
                </div>
                <div class="device-actions">
                  <el-button :icon="Connection" circle class="action-btn" />
                  <el-badge :value="4" class="action-badge">
                    <el-button
                      :icon="Warning"
                      circle
                      class="action-btn warning"
                    />
                  </el-badge>
                </div>
              </div>
              <div class="device-item">
                <div class="device-info">
                  <div class="device-label">设备地点:</div>
                  <div class="device-value">一号位置</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备名称:</div>
                  <div class="device-value">一号设备</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备编号:</div>
                  <div class="device-value">1234567890</div>
                </div>
                <div class="device-actions">
                  <el-button
                    :icon="SwitchButton"
                    circle
                    class="action-btn offline"
                  />
                </div>
              </div>
              <div class="device-item">
                <div class="device-info">
                  <div class="device-label">设备地点:</div>
                  <div class="device-value">一号位置</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备名称:</div>
                  <div class="device-value">一号设备</div>
                </div>
                <div class="device-info">
                  <div class="device-label">设备编号:</div>
                  <div class="device-value">1234567890</div>
                </div>
                <div class="device-actions">
                  <el-button :icon="Refresh" circle class="action-btn" />
                </div>
              </div>
            </div>
            <div class="panel-title">
              <el-icon><User /></el-icon>
              <span>飞手管理</span>
            </div>
            <div class="pilot-stats">
              <div class="pilot-stat-item">
                <div class="pilot-stat-icon blue">
                  <el-icon><Monitor /></el-icon>
                </div>
                <div class="pilot-stat-content">
                  <div class="pilot-stat-label">飞手总人数</div>
                  <div class="pilot-stat-value">23<span>人</span></div>
                </div>
              </div>
              <div class="pilot-stat-item">
                <div class="pilot-stat-icon green">
                  <el-icon><VideoCamera /></el-icon>
                </div>
                <div class="pilot-stat-content">
                  <div class="pilot-stat-label">在线飞手人数</div>
                  <div class="pilot-stat-value">5<span>人</span></div>
                </div>
              </div>
            </div>
            <div class="panel-title">
              <el-icon><DataLine /></el-icon>
              <span>历史数据统计</span>
            </div>
            <div class="history-stats">
              <div class="history-grid">
                <div class="history-item">
                  <div class="history-label">飞行总里程</div>
                  <div class="history-value">4367(KM)</div>
                </div>
                <div class="history-item">
                  <div class="history-label">飞行总时长</div>
                  <div class="history-value">4343(H)</div>
                </div>
                <div class="history-item">
                  <div class="history-label">飞行总架次</div>
                  <div class="history-value">5378(次)</div>
                </div>
                <div class="history-item">
                  <div class="history-label">航线总数量</div>
                  <div class="history-value">534(个)</div>
                </div>
              </div>
              <div class="history-icon">
                <el-icon><Box /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <el-dialog
    title="修改密码"
    v-model="changePasswordVisible"
    width="500px"
    destroy-on-close
  >
    <el-form
      ref="passwordFormRef"
      :model="passwordForm"
      :rules="passwordRules"
      label-width="100px"
    >
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input
          v-model="passwordForm.oldPassword"
          placeholder="请输入旧密码"
          maxlength="10"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="passwordForm.newPassword"
          placeholder="请输入新密码"
          maxlength="10"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="changePasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPsaawordForm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, provide } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import {
  User,
  List,
  Monitor,
  Avatar,
  UserFilled,
  Expand,
  Fold,
  Plus,
  SwitchButton,
  Compass,
  Position,
  MapLocation,
  FullScreen,
  CaretBottom,
  Operation,
  Money,
  SetUp,
  VideoCamera,
  Notification,
  Management,
  MostlyCloudy,
  Clock,
  House,
  Setting,
  Document,
  DocumentChecked,
  ArrowLeft,
  ArrowRight,
  Bell,
  Connection,
  Warning,
  Refresh,
  DataLine,
  Box,
} from "@element-plus/icons-vue";
import { logout } from "@/api/login";
import { adminInfo, updatePassword } from "@/api/admin";

const isCollapse = ref(false);
provide("collapseContext", { isCollapse });

const router = useRouter();
const route = useRoute();
const isLoggedIn = ref(true);
const isShow = ref(route.path === "/home");
const activeMenu = ref(route.path);
const currentPages = ref("");
const parentMenu = ref("");
const changePasswordVisible = ref(false);
const texthome = ref("");
const passwordFormRef = ref(null);
const meunList = ref([]);
const passwordForm = ref({ oldPassword: "", newPassword: "" });
const passwordRules = {
  oldPassword: [
    { required: true, message: "请输入旧密码", trigger: "blur" },
    { min: 8, max: 10, message: "长度在 8 到 10 个字符", trigger: "blur" },
  ],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 8, max: 10, message: "长度在 8 到 10 个字符", trigger: "blur" },
  ],
};

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

const checkLoginStatus = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    router.push("/login");
  }
};

const logoutOrLogin = () => {
  if (isLoggedIn.value) {
    logouts();
  } else {
    localStorage.clear();
    sessionStorage.clear();
    router.push("/login");
    location.reload();
  }
};

const logouts = async () => {
  await logout();
  handleLogout();
};

const changePassword = () => {
  changePasswordVisible.value = true;
};

const submitPsaawordForm = () => {
  passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      const data = { ...passwordForm.value };
      const res = await updatePassword(data);
      if (res.code === 200) {
        ElMessage.success("密码修改成功");
        changePasswordVisible.value = false;
        passwordForm.value = { oldPassword: "", newPassword: "" };
      }
    }
  });
};

const handleLogout = () => {
  localStorage.removeItem("authToken");
  isLoggedIn.value = false;
  ElMessage.warning("登录已过期，请重新登录！");
  localStorage.clear();
  sessionStorage.clear();
  router.push("/login");
};

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const userMenu = async () => {
  try {
    const res = await adminInfo();
    const data = res.data.menus.filter((menu) => menu.name !== "/gis/ceshi");
    const level0Menus = data.filter((menu) => menu.parentId === 0);
    const subMenus = data.filter((menu) => menu.parentId !== 0);
    const priorityIds = [16];
    level0Menus.sort((a, b) => {
      const indexA = priorityIds.indexOf(a.id);
      const indexB = priorityIds.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return new Date(a.createTime) - new Date(b.createTime);
    });
    const sortedData = [...level0Menus, ...subMenus];
    const menuMap = new Map();
    sortedData.forEach((menu) =>
      menuMap.set(menu.id, { ...menu, children: [] }),
    );
    const result = [];
    sortedData.forEach((menu) => {
      const currentMenu = menuMap.get(menu.id);
      if (menu.parentId === 0) {
        result.push(currentMenu);
      } else {
        const parentMenu = menuMap.get(menu.parentId);
        if (parentMenu) parentMenu.children.push(currentMenu);
      }
    });
    meunList.value = result;
  } catch (error) {
    console.error("获取组织成员失败:", error);
  }
};

const handleMenuClick = (path) => {
  isShow.value = path === "/home";
  if (path === "/organization/list") {
    router.push("/organization/list/project");
  }
};

const getActiveMenuPath = () => {
  const currentPath = route.path;
  if (currentPath.startsWith("/organization/list/")) {
    return "/organization/list";
  }
  return currentPath;
};

const prevPage = () => {
  ElMessage.info("上一页功能");
};

const nextPage = () => {
  ElMessage.info("下一页功能");
};

watch(
  () => route.path,
  (newPath) => {
    const activePath = getActiveMenuPath();
    activeMenu.value = activePath;
    const menuMap = {
      "/home": { text: "首页" },
      "/largeScreen": { text: "大屏" },
      "/role": { parent: "无人机管理", text: "无人机列表" },
      "/device/monitor": { parent: "无人机管理", text: "无人机监控" },
      "/user/list": { parent: "用户管理", text: "用户列表" },
      "/user/roles": { parent: "用户管理", text: "角色管理" },
      "/gis/view": { parent: "飞行任务", text: "地图" },
      "/gis/list": { parent: "飞行任务", text: "任务列表" },
      "/gis/demo": { parent: "飞行任务", text: "航线" },
      "/gis/uavMonitor": { parent: "飞行任务", text: "无人机监控" },
      "/gis/mission": { parent: "飞行任务", text: "任务管理" },
      "/gis/limitArea": { parent: "飞行任务", text: "禁飞区" },
      "/organization/list": { parent: "我的组织", text: "组织列表" },
      "/organization/list/project": { parent: "我的组织", text: "项目列表" },
      "/organization/list/task": { parent: "我的组织", text: "任务列表" },
      "/organization/list/device": { parent: "我的组织", text: "设备列表" },
      "/organization/create": { parent: "我的组织", text: "创建组织" },
      "/project/list": { parent: " 项目管理", text: "项目列表" },
      "/project/create": { parent: " 项目管理", text: "创建项目" },
      "/project/object": { parent: " 项目管理", text: "项目设备管理" },
      "/log/list": { parent: " 日志管理", text: "日志列表" },
      "/route": { text: "航线列表" },
      "/gis/weatherInquiry": { text: "气象查询" },
      "/strategicManagement": { parent: " 策略管理", text: "策略管理" },
    };
    const menuInfo = menuMap[newPath] || menuMap[activePath];
    if (menuInfo) {
      parentMenu.value = menuInfo.parent || "";
      currentPages.value = menuInfo.text;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  isShow.value = route.path === "/home";
  await checkLoginStatus();
  userMenu();
});

onUnmounted(() => {});
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background-color: #000;
  overflow: hidden;
}

.sidebar {
  width: 64px;
  transition: all 0.3s ease;
  background: linear-gradient(180deg, #001529 0%, #000a1a 100%);
  z-index: 1000;
  position: relative;
  overflow-x: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-container {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  background: rgba(0, 128, 255, 0.1);
  overflow: hidden;
  border-bottom: 1px solid rgba(0, 128, 255, 0.3);
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  transition: all 0.3s;
}

.title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0.95;
  letter-spacing: 1px;
  transition: all 0.3s;
}

:deep(.el-menu) {
  border-right: none;
  background: transparent !important;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  margin: 4px 0;
  border-radius: 4px;
  margin: 4px 8px;
  color: #a6adb4 !important;
  transition: all 0.3s;
}

:deep(.el-menu-item .el-icon),
:deep(.el-sub-menu__title .el-icon) {
  font-size: 20px;
  margin-right: 0;
  color: #a6adb4;
  transition: all 0.3s;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(0, 128, 255, 0.2) !important;
  color: #ffffff !important;
}

:deep(.el-menu-item:hover .el-icon),
:deep(.el-sub-menu__title:hover .el-icon) {
  color: #ffffff;
}

:deep(.el-menu-item.is-active) {
  background: rgba(0, 128, 255, 0.3) !important;
  border: 1px solid rgba(0, 128, 255, 0.5);
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(0, 128, 255, 0.3);
}

:deep(.el-menu-item.is-active .el-icon) {
  color: #ffffff !important;
}

.collapse-btn {
  position: fixed;
  bottom: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 128, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 12px;
}

.collapse-btn:hover {
  background: rgba(0, 128, 255, 0.2);
}

.collapse-btn .el-icon {
  font-size: 20px;
  color: #ffffff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #000;
}

.top-navbar {
  height: 64px;
  padding: 0 24px;
  background: linear-gradient(90deg, #001529 0%, #003366 50%, #001529 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #0080ff;
  box-shadow: 0 2px 10px rgba(0, 128, 255, 0.3);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
}

.time-info .el-icon {
  color: #0080ff;
}

.platform-title {
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(0, 128, 255, 0.5);
  letter-spacing: 2px;
}

.nav-controls {
  display: flex;
  gap: 8px;
}

.nav-controls .el-button {
  background: rgba(0, 128, 255, 0.1);
  border: 1px solid rgba(0, 128, 255, 0.3);
  color: #ffffff;
}

.nav-controls .el-button:hover {
  background: rgba(0, 128, 255, 0.2);
  border-color: rgba(0, 128, 255, 0.5);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
}

.weather-info .el-icon {
  color: #0080ff;
}

.notification-badge {
  margin-right: 16px;
}

.notification-badge .el-button {
  background: rgba(0, 128, 255, 0.1);
  border: 1px solid rgba(0, 128, 255, 0.3);
  color: #ffffff;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 24px;
  transition: all 0.3s;
  background: rgba(0, 128, 255, 0.1);
  border: 1px solid rgba(0, 128, 255, 0.3);
}

.user-info:hover {
  background: rgba(0, 128, 255, 0.2);
  border-color: rgba(0, 128, 255, 0.5);
}

.user-avatar {
  background: linear-gradient(135deg, #0080ff 0%, #004080 100%);
  border: 2px solid #ffffff;
  box-shadow: 0 0 10px rgba(0, 128, 255, 0.5);
}

.username {
  margin: 0 8px;
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
}

.page-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
}

.stats-panel {
  position: absolute;
  top: 20px;
  width: 320px;
  background: rgba(0, 21, 41, 0.85);
  border: 1px solid rgba(0, 128, 255, 0.3);
  border-radius: 8px;
  padding: 16px;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 20px rgba(0, 128, 255, 0.2);
}

.left-panel {
  left: 20px;
}

.right-panel {
  right: 20px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 128, 255, 0.3);
}

.panel-title .el-icon {
  color: #0080ff;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid transparent;
}

.stat-card.primary {
  background: linear-gradient(135deg, #0080ff 0%, #004080 100%);
  border-color: rgba(0, 128, 255, 0.5);
}

.stat-card.tertiary {
  background: linear-gradient(135deg, #8000ff 0%, #400080 100%);
  border-color: rgba(128, 0, 255, 0.5);
}

.stat-card.secondary {
  background: rgba(0, 200, 150, 0.2);
  border-color: rgba(0, 200, 150, 0.5);
  flex: 1;
}

.stat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-icon .el-icon {
  font-size: 24px;
  color: #ffffff;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
}

.stat-value span {
  font-size: 14px;
  margin-left: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.device-list {
  margin-bottom: 24px;
}

.device-item {
  background: rgba(0, 128, 255, 0.1);
  border: 1px solid rgba(0, 128, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.device-label {
  color: rgba(255, 255, 255, 0.6);
}

.device-value {
  color: #ffffff;
  font-weight: 500;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  background: rgba(0, 128, 255, 0.2);
  border: 1px solid rgba(0, 128, 255, 0.4);
  color: #ffffff;
}

.action-btn.warning {
  background: rgba(255, 100, 0, 0.2);
  border-color: rgba(255, 100, 0, 0.4);
}

.action-btn.offline {
  background: rgba(100, 100, 100, 0.2);
  border-color: rgba(100, 100, 100, 0.4);
}

.action-badge {
  margin-right: 0;
}

.pilot-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.pilot-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 21, 41, 0.6);
  border: 1px solid rgba(0, 128, 255, 0.3);
  border-radius: 50px;
}

.pilot-stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid;
}

.pilot-stat-icon.blue {
  background: rgba(0, 128, 255, 0.2);
  border-color: rgba(0, 128, 255, 0.5);
}

.pilot-stat-icon.green {
  background: rgba(0, 200, 150, 0.2);
  border-color: rgba(0, 200, 150, 0.5);
}

.pilot-stat-icon .el-icon {
  color: #ffffff;
  font-size: 18px;
}

.pilot-stat-content {
  flex: 1;
}

.pilot-stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2px;
}

.pilot-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
}

.pilot-stat-value span {
  font-size: 12px;
  margin-left: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.history-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 128, 255, 0.1);
  border: 1px solid rgba(0, 128, 255, 0.3);
  border-radius: 8px;
  padding: 16px;
}

.history-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.history-value {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.history-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0080ff 0%, #004080 100%);
  border-radius: 8px;
  border: 1px solid rgba(0, 128, 255, 0.5);
}

.history-icon .el-icon {
  font-size: 32px;
  color: #ffffff;
}

@media screen and (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100vh;
    transform: translateX(-100%);
  }

  .sidebar.collapsed {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .stats-panel {
    width: 280px;
  }

  .left-panel {
    left: 10px;
  }

  .right-panel {
    right: 10px;
  }
}
</style>
