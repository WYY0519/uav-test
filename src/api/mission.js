import service from "@/utils/request";
// 根据设备编号查询设备信息
export const missionList = (projectId, params) => {
  return service({
    url: `/mission/list/${projectId}`,
    method: "GET",
    params,
  });
};
//创建任务
export const missionCreate = (projectId, data) => {
  return service({
    url: `/mission/create/${projectId}`,
    method: "POST",
    data,
  });
};
//编辑任务
export const missionUpdate = (missionId, data) => {
  return service({
    url: `/mission/update/${missionId}`,
    method: "PUT",
    data,
  });
};
//删除任务
export const missionDelete = (missionId) => {
  return service({
    url: `/mission/delete/${missionId}`,
    method: "DELETE",
  });
};

//查询项目下可用的设备列表
export const missioAvailableDevices = (projectId, params) => {
  return service({
    url: `mission/available-devices/${projectId}`,
    method: "GET",
    params,
  });
};
//获取任务下已分配的设备列表
export const missioAssignedDevices = (missionId) => {
  return service({
    url: `/mission/assigned-devices/${missionId}`,
    method: "GET",
  });
};
//为任务分配设备
export const missioDevices = (missionId, params) => {
  return service({
    url: `/mission/assign/device/${missionId}`,
    method: "POST",
    params,
  });
};
// 从任务中移除设备
export const missionRemoveDevice = (missionId, deviceId) => {
  return service({
    url: `/mission/remove/device/${missionId}/${deviceId} `,
    method: "DELETE",
  });
};
//查询项目下可用的用户列表
export const missioAvailableUsers = (projectId, params) => {
  return service({
    url: `/mission/available-users/${projectId}`,
    method: "GET",
    params,
  });
};

//  获取任务下已分配的用户列表
export const missioAssignedUsers = (missionId) => {
  return service({
    url: `/mission/assigned-users/${missionId}`,
    method: "GET",
  });
};

//从任务中移除人员
export const missionRemoveUser = (missionId, userId) => {
  return service({
    url: `/mission/remove/user/${missionId}/${userId} `,
    method: "DELETE",
  });
};

//为任务分配设备
export const missioAssignUser = (missionId, params) => {
  return service({
    url: `/mission/assign/user/${missionId}`,
    method: "POST",
    params,
  });
};

//查询公司下可用的航线列表
export const missioAvailableRoutes = (params) => {
  return service({
    url: `/mission/available-routes`,
    method: "GET",
    params,
  });
};
//为任务添加航线
export const missioAssignRoute = (missionId, params) => {
  return service({
    url: `/mission/assign/route/${missionId}`,
    method: "POST",
    params,
  });
};

// 获取任务下已分配的航线列表
export const missioRoutes = (missionId) => {
  return service({
    url: `/mission/routes/${missionId}`,
    method: "GET",
  });
};
// 从任务中移除航线
export const missionRemoveRoute = (missionId, missionDataId) => {
  return service({
    url: `/mission/remove/route/${missionId}/${missionDataId} `,
    method: "DELETE",
  });
};

//
// 分页查询所有任务列表;
export const missionAllList = (params) => {
  return service({
    url: `/mission/list`,
    method: "GET",
    params,
  });
};
