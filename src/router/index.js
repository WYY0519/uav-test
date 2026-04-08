import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/", //重定向到登录
      redirect: "/login",
    },
    {
      path: "/home", //首页
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      children: [
        {
          path: "/gis/weatherInquiry", //气象查询
          name: "gis-weatherInquiry",
          component: () => import("@/views/gis/weatherInquiry/index.vue"),
        },
        {
          path: "/largeScreen", //大屏展示
          name: "largeScreen",
          component: () => import("@/views/largeScreen/index.vue"),
        },
        {
          path: "/organization/list", //组织列表
          name: "organization-list",
          component: () => import("@/views/organization/organlist.vue"),
          // children: [
          //   {
          //     path: "project", // 注意这里不要加斜杠，是相对路径
          //     name: "project-list",
          //     component: () => import("@/views/project/ProjectList.vue"),
          //   },
          //   {
          //     path: "task", // 注意这里不要加斜杠，是相对路径
          //     name: "task-list",
          //     component: () => import("@/views/task/taskList.vue"),
          //   },
          // ],
        },
        {
          path: "/gis/demo", //航线规划
          name: "gis-demo",
          component: () => import("@/views/gis/gisDemo.vue"),
        },
        {
          path: "/gis/uavMonitor", //无人机
          name: "gis-uavMonitor",
          component: () => import("@/views/gis/uavMonitor.vue"),
        },

        {
          path: "/gis/mission", //任务管理
          name: "gis-mission",
          component: () => import("@/views/gis/mission/index.vue"),
        },
        {
          path: "/gis/limitArea", //禁飞区
          name: "gis-limitArea",
          component: () => import("@/views/limitArea/index.vue"),
        },
        {
          path: "/role", //无人机列表
          name: "role",
          component: () => import("@/views/role/index.vue"),
        },
        {
          path: "/video", //无人机列表
          name: "video",
          component: () => import("@/views/video/index.vue"),
        },
        {
          path: "/user/list", //用户列表
          name: "user-list",
          component: () => import("@/views/user/UserList.vue"),
        },
        {
          path: "/user/roles", //角色管理
          name: "user-roles",
          component: () => import("@/views/user/UserRoles.vue"),
        },
        {
          path: "/log/list", //日志列表
          name: "log-list",
          component: () => import("@/views/log/logList.vue"),
        },
        {
          path: "/route", //航线列表
          name: "route",
          component: () => import("@/views/route/index.vue"),
        },
        {
          path: "/strategicManagement", //策略管理
          name: "strategicManagement",
          component: () => import("@/views/strategicManagement/index.vue"),
        },
        // {
        //   path: "/largeScreen", //大屏展示
        //   name: "largeScreen",
        //   component: () => import("@/views/largeScreen/index.vue"),
        // },

        {
          path: "/organization/create", //创建组织
          name: "organization-create",
          component: () => import("@/views/organization/organcreate.vue"),
        },
        // {
        //   path: "/project/create", //创建项目
        //   name: "project-create",
        //   component: () => import("@/views/project/ProjectCreate.vue"),
        // },
        // {
        //   path: "/task/create", //创建任务
        //   name: "task-create",
        //   component: () => import("@/views/task/taskCreate.vue"),
        // },

        // {
        //   path: "/noFlyZone", //禁飞区
        //   name: "noFlyZone",
        //   component: () => import("@/views/noFlyZone/index.vue"),
        // },
      ],
    },
    {
      path: "/login", //登录
      name: "login",
      component: () => import("@/views/login/index.vue"),
    },

    {
      path: "/test", //测试用的页面
      name: "test",
      component: () => import("@/views/z-test/index.vue"),
    },
  ],
});

export default router;
