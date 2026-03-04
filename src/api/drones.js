import request from "@/utils/request";
import service from "@/utils/request";

// 获取所有无人机状态
export const allStatus = () => {
  return request({
    url: "/api/drones/all/status",
    method: "get",
  });
};
// 通过id获取无人机状态
export const droneIdStatus = (droneId) => {
  return request({
    url: `api/drones/${droneId}/status`,
    method: "get",
  });
};
//无人机解锁
export const droneArm = (params) => {
  return request({
    url: `/api/drones/arm`,
    method: "post",
    params,
  });
};
//无人机加锁
export const droneDisarm = (params) => {
  return request({
    url: `/api/drones/disarm`,
    method: "post",
    params,
  });
};
//无人机起飞
export const droneTakeoff = (params) => {
  return request({
    url: `/api/drones/takeoff`,
    method: "post",
    params,
  });
};
//无人机降落
export const droneLand = (params) => {
  return request({
    url: `/api/drones/land`,
    method: "post",
    params,
  });
};
//无人机返航
export const droneRtl = (params) => {
  return request({
    url: `/api/drones/rtl`,
    method: "post",
    params,
  });
};
//无人机模式设置
export const droneMode = (params) => {
  return request({
    url: `/api/drones/mode`,
    method: "post",
    params,
  });
};
//无人机杆设置
export const droneJoystick = (droneId, data) => {
  return request({
    url: `/api/drones/${droneId}/joystick`,
    method: "post",
    data,
  });
};
// 返航点设置
export const setHomePosition = (data) => {
  return request({
    url: `/api/drones/setHomePosition`,
    method: "post",
    data,
  });
};
// export const doMission = (formData, droneId, missionId) => {
//   return service({
//     url: "api/drones/doMission",
//     method: "POST",
//     params: { droneId, missionId },
//     data: formData,
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   })
//     .then((response) => {
//       console.log("doMission 接口返回原始响应:", response);
//       return response;
//     })
//     .catch((error) => {
//       console.error("doMission 接口调用失败:", error);
//       throw error;
//     });
// };
// api/drones.js 中的 doMission 方法修复
export const doMission = (data) => {
  return service({
    url: "api/drones/doMission",
    method: "POST",
    data: data,
    headers: {
      "Content-Type": "application/json", // 根据后端实际需求调整，通常JSON即可
    },
  })
    .then((response) => {
      console.log("doMission 接口返回原始响应:", response);
      return response;
    })
    .catch((error) => {
      console.error("doMission 接口调用失败:", error);
      // 统一错误处理，返回标准化错误
      return {
        code: 500,
        message: error.message || "接口调用失败",
        data: null,
      };
    });
};
export const monitorUploadRouteFile = (formData) => {
  return service({
    url: "/api/monitor/uploadRouteFile", // 接口路径（无需硬编码IP+端口，service已配baseURL）
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data", // 表单上传必须的头
    },
    // 无需手动加token：service的请求拦截器会自动添加
  });
};

//一键执行
export const oneClickExecute = (data) => {
  return request({
    url: `api/drones/oneClickExecute`,
    method: "post",
    data,
  });
};
// 上传航线KML文件
export const uploadRouteFile = (formData) => {
  return service({
    url: "api/drones/mission", // 接口路径（无需硬编码IP+端口，service已配baseURL）
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data", // 表单上传必须的头
    },
    // 无需手动加token：service的请求拦截器会自动添加
  });
};
