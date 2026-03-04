import request from "@/utils/request";
import service from "@/utils/request";

// 获取航线列表
export const getRouteList = (params) => {
  return request({
    url: "/api/route/basic/getRoute",
    method: "get",
    params,
  });
};
export const executeRouteApi = (data) => {
  // data: { routeId, pointsJson }
  return axios.post("/api/route/getRoute", data);
};

// 删除航线
export const deleteRoute = (id) => {
  return request({
    url: `/api/route/manage/delete/${id}`,
    method: "delete",
  });
};
// 下载航线文件的接口
export const downloadGetKmlContent = (id) => {
  return service({
    url: `/api/route/manage/getKmlContent/${id}`,
    method: "GET",
    responseType: "blob",
    transformResponse: [(data) => data],
    skipCodeCheck: true, // 自定义标识：跳过响应拦截器的code校验
  });
};

export const executeRoute = (data) => {
  return request({
    url: `/api/device/sendMissionCommand`,
    method: "post",
    data,
  });
};

export const saveRoute = (data) => {
  return request({
    url: "/api/route/addRoute",
    method: "post",
    data,
  });
};

//根据ID搜索航线
export const listById = (params) => {
  return request({
    url: "/api/route/listById",
    method: "GET",
    params,
  });
};
//保存航线
export const addRoute = (data) => {
  return request({
    url: "/api/route/add/addRoute",
    method: "post",
    data,
  });
};
//删除航线 /route/manage/delete/{id}
export const deleteManageRoute = (id) => {
  return request({
    url: `/api/route/manage/delete/${id}`,
    method: "delete",
  });
};
//编辑航线

export const updateDescription = (params) => {
  return request({
    url: "/api/route/basic/updateDescription",
    method: "post",
    params,
  });
};
//新编辑航线
export const updateMission = (data) => {
  return request({
    url: "/api/route/basic/updateMission",
    method: "post",
    data,
  });
};

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
//航点编辑
export const updatePoint = (data) => {
  return request({
    url: `/api/route/manage/updatePoint`,
    method: "post",
    data,
  });
};
