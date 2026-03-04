import axios from "axios";
import { ElMessage } from "element-plus";
import router from "@/router";

// 创建 axios 实例
const service = axios.create({
  // baseURL: "http://121.41.60.99:9090", //服务器
  // baseURL: "http://192.168.1.29:33333", // 张
  baseURL: "http://192.168.1.29:9090", // 张
  timeout: 15000, // 请求超时时间
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    console.log(config, "config1");
    // 在请求发送之前做一些处理
    const token = localStorage.getItem("authToken");

    if (token) {
      // 让每个请求携带token
      config.headers["Authorization"] = token;
    }
    // 修复：判断 token 不存在（null/空字符串）
    if (!token) {
      // 跳转登录页（加 next(false) 避免重复跳转）
      if (router.currentRoute.value.path !== "/login") {
        router.push("/login");
        2;
      }
      // 必须返回 config，否则请求会中断
      return config;
    }
    return config;
  },
  (error) => {
    // 处理请求错误
    console.error("请求错误：", error);
    return Promise.reject(error);
  },
);

// 错误状态标记 - 用于控制网络错误只提示一次
let networkErrorReported = false;

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    console.log(response, "response2");
    // 核心修复：判断是否是文件下载请求（responseType 为 blob/arraybuffer）
    if (
      response.config.responseType === "blob" ||
      response.config.responseType === "arraybuffer"
    ) {
      // 直接返回原始响应（不解析 JSON）
      return response.data;
    }

    const res = response.data;
    // 成功响应时重置错误标记
    networkErrorReported = false;
    // 根据自定义错误码判断请求是否成功
    if (res.code === 200) {
      // 成功返回数据
      return res;
    } else {
      // 处理业务错误
      switch (res.code) {
        case 401:
          // token 过期或未登录
          ElMessage.error("登录已过期，请重新登录");
          console.log("【登录过期】状态码:", response.status);
          console.log(
            "【登录过期】本地token存在:",
            !!localStorage.getItem("token"),
          );
          console.log("【登录过期】当前路由:", router.currentRoute.value.path);
          localStorage.removeItem("authToken");
          router.push("/login");
          break;
        case 403:
          // 权限不足
          ElMessage.error("权限不足");
          break;
        default:
          // 其他错误
          ElMessage.error(res.message || "操作失败");
          console.log(res.message);
      }
      return Promise.reject(res);
    }
  },
  (error) => {
    // 处理 HTTP 错误
    if (error.response) {
      // 有响应但状态码错误时重置标记
      networkErrorReported = false;
      switch (error.response.status) {
        case 401:
          ElMessage.error("登录已过期，请重新登录");
          localStorage.removeItem("authToken");
          router.push("/login");
          break;
        case 403:
          ElMessage.error("权限不足");
          break;
        case 404:
          ElMessage.error("请求的资源不存在");
          break;
        case 500:
          ElMessage.error("服务器错误");
          break;
        default:
          ElMessage.error("网络错误");
      }
    } else {
      if (!networkErrorReported) {
        ElMessage.error("网络连接失败");
        networkErrorReported = true; // 标记为已提示
      }
    }
    return Promise.reject(error);
  },
);

// 文件下载方法（修复 URL 拼接问题）
export const downloadFile = async (url, filename) => {
  const token = localStorage.getItem("authToken");
  const baseURL = "http://192.168.1.29:9090"; // 和 axios 保持一致

  if (!token) {
    throw new Error("未获取到认证信息，请重新登录");
  }
  try {
    // 修复：拼接完整 URL（处理相对路径）
    const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: token,
        Accept: "application/octet-stream",
      },
      credentials: "include",
    });
    if (!response.ok) {
      // 输出完整 URL 到控制台，方便排查
      console.error("请求的 URL 不存在:", fullUrl);
      throw new Error(
        `${response.status} - 接口不存在或路径错误（URL: ${fullUrl}）`,
      );
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "日志文件";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    throw new Error(error.message || "下载请求失败");
  }
};

// 封装请求方法
export const http = {
  get(url, params) {
    return service.get(url, { params });
  },

  post(url, data) {
    return service.post(url, data);
  },

  put(url, data) {
    return service.put(url, data);
  },

  delete(url, params) {
    return service.delete(url, { params });
  },
};

export default service;
