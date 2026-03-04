import service from "@/utils/request";
//查询当前组织下的所有项目
export const getProjectList = (organizationId,params) => {
  return service({
    url: `/api/project/basic/${organizationId}/list-by-organization`,
    method: "GET",
    params
  });
};

//创建项目
export const createProject = (organizationId, data) => {
  return service({
    url: `/api/project/manage/${organizationId}/create`,
    method: "POST",
    data,
  });
};

// 查看项目成员列表
export const getProjectMemberList = (projectId) => {
  return service({
    url: `/api/project/manage/${projectId}/list-members`,
    method: "GET",
  });
};
// 修改项目成员
export const updateProjectMember = (projectId, data) => {
  return service({
    url: `/api/project/${projectId}/updateRole`,
    method: "PUT",
    data,
  });
};
// 删除项目成员
export const deleteProjectMember = (projectId, userId) => {
  return service({
    url: `/api/project/manage/${projectId}/members/${userId}`,
    method: "DELETE",
  });
};


//添加项目成员
export const addProjectMember = (projectId, params) => {
  return service({
    url: `/api/project/manage/${projectId}/addmembers`,
    method: "POST",
    params,
  });
};


//编辑项目
export const editProject = (projectId, data) => {
  return service({
    url: `/api/project/manage/${projectId}/update`,
    method: "PUT",
    data,
  });
};



//删除项目
export const deleteProject = (projectId) => {
  return service({
    url: `/api/project/manage/${projectId}/delete`,
    method: "DELETE",
  });
};

// 查询项目下所有设备信息
export const getProjectDevicesList = (projectId) => {
  return service({
    url: `/api/project/manage/project-devices/${projectId}`,
    method: "GET",
  });
};
//显示公司账户下当前可用的设备
export const listUsefulDevice = () => {
  return service({
    url: "/api/project/manage/listUsefulDevice",
    method: "GET",
  });
};
//为项目添加设备
export const addManageProject = (projectId, data) => {
  return service({
    url: `/api/project/manage/${projectId}/addDevices`,
    method: "POST",
    data,
  });
};
//为项目删除设备
export const deleteManageProject = (projectId,deviceId) => {
  return service({
    url: `/api/project/manage/${projectId}/delete/${deviceId}`,
    method: "DELETE",
  });
};
//查询组织成员列表
export const getpProjectMembers = (organizationId, projectId) => {
  return service({
    url: `/api/project/manage/${organizationId}/${projectId}`,
    method: "get",
  });
};