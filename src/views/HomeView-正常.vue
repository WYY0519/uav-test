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
          index="/gis/weatherInquiry"
          @click="handleMenuClick('/gis/weatherInquiry')"
        >
          <el-icon><MostlyCloudy /></el-icon>
          <template #title>气象查询</template>
        </el-menu-item>
        <!-- 替换原有的el-sub-menu循环部分 -->
        <template v-for="item in meunList" :key="item.id">
          <!-- 有子菜单的情况 - 使用el-sub-menu -->
          <el-sub-menu
            class="menu-item"
            v-if="item.children && item.children.length > 0"
            :index="item.id"
          >
            <template #title>
              <el-icon>
                <component :is="getIconComponent(item.icon)" />
              </el-icon>
              <span>{{ item.title }}</span>
            </template>
            <!-- 子菜单项 -->
            <el-menu-item
              v-for="itemChildren in item.children"
              :key="itemChildren?.id"
              :index="itemChildren?.name"
              @click="handleMenuClick(itemChildren.name)"
            >
              <el-icon>
                <component :is="getIconComponent(itemChildren.icon)" />
              </el-icon>
              <span>{{ itemChildren.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <!-- 无子菜单的一级菜单 - 直接使用el-menu-item -->
          <el-menu-item
            class="menu-item"
            v-else
            :index="item.name"
            @click="handleMenuClick(item.name)"
          >
            <el-icon>
              <component :is="getIconComponent(item.icon)" />
            </el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
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
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/home' }">{{
              texthome
            }}</el-breadcrumb-item>
            <el-breadcrumb-item v-if="parentMenu">{{
              parentMenu
            }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPages }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="nav-right">
          <el-space>
            <el-tooltip content="全屏" placement="bottom">
              <el-button :icon="FullScreen" circle @click="toggleFullScreen" />
            </el-tooltip>

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
        <router-view
          v-slot="{ Component }"
          v-if="!isShow"
          :key="$route.fullPath"
        >
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
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
import { Document } from "@element-plus/icons-vue";
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
} from "@element-plus/icons-vue";
import { logout } from "@/api/login";
import {
  adminInfo, //获取当前用户信息
  updatePassword, //修改密码
} from "@/api/admin";
// 添加新的响应式变量
const isCollapse = ref(false); //是否折叠
// 向子组件提供方法和状态
provide("collapseContext", {
  isCollapse,
});
const router = useRouter(); //请求
const route = useRoute(); //路由
const isLoggedIn = ref(true); //是否登录
const isShow = ref(route.path === "/home"); // 根据当前路径初始化
const activeMenu = ref(route.path); // 使用当前路由路径初始化
const currentPages = ref(""); //当前页面
const parentMenu = ref(""); //父级菜单
const changePasswordVisible = ref(false); //修改密码的对话框
const texthome = ref(""); //首页文本
const passwordFormRef = ref(null);
const meunList = ref([]);
const passwordForm = ref({
  oldPassword: "",
  newPassword: "",
});
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
// 菜单映射表
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
  "/organization/list/project": { parent: "我的组织", text: "项目列表" }, // 嵌套子路由
  "/organization/list/task": { parent: "我的组织", text: "任务列表" }, // 嵌套子路由
  "/organization/list/device": { parent: "我的组织", text: "设备列表" }, // 嵌套子路由
  "/organization/create": { parent: "我的组织", text: "创建组织" },
  "/project/list": { parent: " 项目管理", text: "项目列表" },
  "/project/create": { parent: " 项目管理", text: "创建项目" },
  "/project/object": { parent: " 项目管理", text: "项目设备管理" },
  "/log/list": { parent: " 日志管理", text: "日志列表" },
  "/route": { text: "航线列表" },
  "/gis/weatherInquiry": { text: "气象查询" }, //后面再修改，飞行任务 -- 气象查询
  "/strategicManagement": { parent: " 策略管理", text: "策略管理" },
};
// 图标名称与组件对象的映射表
const iconComponentMap = {
  Operation: Operation,
  List: List,
  Plus: Plus,
  Position: Position,
  MapLocation: MapLocation,
  SetUp: SetUp,
  User: User,
  Avatar: Avatar,
  VideoCamera: VideoCamera,
  Monitor: Monitor,
  Document: Document,
  Notification: Notification,
  Management: Management,
  Money: Money,
};
// 切换菜单展开/收起
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};
// 获取图标组件
const getIconComponent = (iconName) => {
  return iconComponentMap[iconName] || null;
};

// 检查登录状态
const checkLoginStatus = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    router.push("/login");
  }
};
// 登录/注销逻辑
const logoutOrLogin = () => {
  if (isLoggedIn.value == true) {
    logouts();
  } else {
    localStorage.clear(); // 清除所有localStorage数据
    sessionStorage.clear(); // 清除所有sessionStorage数据
    router.push("/login");
    location.reload();
  }
};
//退出
const logouts = async () => {
  await logout();
  handleLogout();
};

//修改密码
const changePassword = async () => {
  console.log("changePassword");
  changePasswordVisible.value = true;
};
//修改密码
const submitPsaawordForm = () => {
  passwordFormRef.value.validate((valid) => {
    if (valid) {
      let data = {
        oldPassword: passwordForm.value.oldPassword,
        newPassword: passwordForm.value.newPassword,
      };
      let res = updatePassword(data);
      if (res.code === 200) {
        ElMessage({
          message: "密码修改成功",
          type: "success",
        });
        changePasswordVisible.value = false;
        passwordForm.value = {
          oldPassword: "",
          newPassword: "",
        };
      } else {
        passwordForm.value = {
          oldPassword: "",
          newPassword: "",
        };
      }
    }
  });
};
// 处理登出
const handleLogout = () => {
  localStorage.removeItem("authToken");
  isLoggedIn.value = false;
  ElMessage.warning("登录已过期，请重新登录！");
  localStorage.clear(); // 清除所有localStorage数据
  sessionStorage.clear(); // 清除所有sessionStorage数据
  router.push("/login");
};

// 全屏切换
const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
//菜单
const userMenu = async () => {
  try {
    let res = await adminInfo();
    console.log(res.data.menus, "原始菜单数据");

    let data = res.data.menus;
    // 过滤掉 name 为 "/gis/ceshi" 的菜单
    const filteredData = data.filter((menu) => menu.name !== "/gis/ceshi");

    // 关键排序逻辑：优先处理一级菜单（parentId=0）的顺序
    // 1. 分离一级菜单和子菜单
    const level0Menus = filteredData.filter((menu) => menu.parentId === 0);
    const subMenus = filteredData.filter((menu) => menu.parentId !== 0);

    // 2. 对一级菜单排序：id=16 大屏 排第1，id=17 策略管理排第2，其余按原顺序
    const priorityIds = [16]; // 优先显示的菜单ID顺序
    level0Menus.sort((a, b) => {
      const indexA = priorityIds.indexOf(a.id);
      const indexB = priorityIds.indexOf(b.id);

      // 都在优先列表中，按列表顺序排列
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // 只有a在优先列表中，a排在前面
      if (indexA !== -1) {
        return -1;
      }
      // 只有b在优先列表中，b排在前面
      if (indexB !== -1) {
        return 1;
      }
      // 都不在优先列表中，按原顺序排列（通过createTime确保稳定排序）
      return new Date(a.createTime) - new Date(b.createTime);
    });

    // 3. 合并排序后的一级菜单和子菜单
    const sortedData = [...level0Menus, ...subMenus];

    // 4. 构建菜单树（保持原有逻辑）
    const menuMap = new Map();
    sortedData.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    const result = [];
    sortedData.forEach((menu) => {
      const currentMenu = menuMap.get(menu.id);
      if (menu.parentId === 0) {
        result.push(currentMenu);
      } else {
        const parentMenu = menuMap.get(menu.parentId);
        if (parentMenu) {
          parentMenu.children.push(currentMenu);
        }
      }
    });

    meunList.value = result;
    console.log("排序后并构建的菜单树：", result);
  } catch (error) {
    console.error("获取组织成员失败:", error);
  }
};
const handleMenuClick = (path) => {
  console.log(activeMenu.value);
  isShow.value = path === "/home";
  // 当点击 /organization/list 时，默认跳转到其第一个嵌套子路由（project）
  if (path === "/organization/list") {
    router.push("/organization/list/project");
  }
};
// 获取激活菜单的父路径，忽略嵌套子路由和查询参数
const getActiveMenuPath = () => {
  const currentPath = route.path; // 只取路径部分，忽略查询参数（?后面的内容）
  // 匹配 /organization/list 的嵌套子路由（project、task、device）
  if (currentPath.startsWith("/organization/list/")) {
    return "/organization/list"; // 强制激活父菜单
  }
  // 非嵌套路由，直接返回当前路径（保持原有逻辑）
  return currentPath;
};
// 监听路由变化，更新activeMenu
watch(
  () => route.path,
  (newPath) => {
    // 优先使用父路由路径更新activeMenu
    const activePath = getActiveMenuPath();
    activeMenu.value = activePath;

    // 面包屑逻辑：兼容嵌套路由的菜单信息
    // 先匹配完整路径，匹配不到则匹配父路径
    let menuInfo = menuMap[newPath] || menuMap[activePath];
    if (menuInfo) {
      parentMenu.value = menuInfo.parent || "";
      currentPages.value = menuInfo.text;
    }
  },
  { immediate: true },
);
// 挂载
onMounted(async () => {
  // 初始化页面显示状态
  isShow.value = route.path === "/home";
  // 检查登录状态
  await checkLoginStatus();
  userMenu();
});
// 卸载
onUnmounted(() => {});
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

.sidebar {
  width: 240px;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  /* background: linear-gradient(180deg, #001529 0%, #003366 100%); */
  background: #000;
  z-index: 1000;
  position: relative;
  overflow-x: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-container {
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

/* 菜单样式优化 */
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
  font-size: 18px;
  margin-right: 10px;
  color: #a6adb4;
  transition: all 0.3s;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
}

:deep(.el-menu-item:hover .el-icon),
:deep(.el-sub-menu__title:hover .el-icon) {
  color: #ffffff;
}

:deep(.el-menu-item.is-active) {
  background: #002357 !important;
  border: 1px solid #004caa;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

:deep(.el-menu-item.is-active .el-icon) {
  color: #ffffff !important;
}

:deep(.el-sub-menu.is-opened) {
  background: rgba(0, 0, 0, 0.2);
}

:deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background: #353535;
  color: #ffffff !important;
  /* height: 36px !important; */
}

:deep(.el-sub-menu.is-opened > .el-sub-menu__title .el-icon) {
  color: #ffffff;
}

/* 折叠按钮样式 */
.collapse-btn {
  position: fixed;
  bottom: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 16px;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.collapse-btn .el-icon {
  font-size: 20px;
  color: #ffffff;
}

/* 顶部导航栏样式优化 */
.top-navbar {
  height: 64px;
  padding: 0 24px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 面包屑导航样式 */
.nav-left {
  .el-breadcrumb {
    font-size: 14px;

    :deep(.el-breadcrumb__item) {
      .el-breadcrumb__inner {
        color: #606266;
        font-weight: normal;

        &.is-link {
          color: #1890ff;
          font-weight: 500;

          &:hover {
            color: #40a9ff;
          }
        }
      }

      &:last-child {
        .el-breadcrumb__inner {
          color: #303133;
          font-weight: 600;
        }
      }
    }
  }
}

/* 用户信息样式 */
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 24px;
  transition: all 0.3s;
  &:hover {
    background-color: #f5f7fa;
  }
}

.user-avatar {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.username {
  margin: 0 8px;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 响应式调整 */
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
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-content {
  flex: 1;
  overflow: auto;
  --page-content-pad: 24px;
  --page-content-height: calc(100%);
  padding: var(--page-content-pad);
  height: var(--page-content-height);
}

/* 当前页面需要的无padding状态 */
.page-content.current-page-no-padding {
  padding: 0 !important;
  overflow: hidden;
  /* 强制覆盖，优先级更高 */
}

:deep(.el-button-group) {
  display: flex;
  justify-content: center;
  gap: 8px;
}

:deep(.el-button--small) {
  padding: 6px 12px;
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
}
:deep(.el-table .cell) {
  text-align: center;
}
/* 响应式调整 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 16px;
  }
}

/* 添加面包屑样式 */
.nav-left {
  .el-breadcrumb {
    font-size: 14px;

    :deep(.el-breadcrumb__item) {
      .el-breadcrumb__inner {
        color: #606266;

        &.is-link {
          color: #409eff;

          &:hover {
            color: #79bbff;
          }
        }
      }

      &:last-child {
        .el-breadcrumb__inner {
          color: #303133;
          font-weight: 600;
        }
      }
    }
  }
}
</style>
