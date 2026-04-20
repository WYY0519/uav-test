import service from '@/utils/request';
// import { pa } from 'element-plus/es/locale';

//删除组织成员
export const deleteOrganization = (organizationId, userId) => {
  return service({
    url: `/api/organization/${organizationId}/members/${userId}`,
    method: 'DELETE',
  });
};

//修改组织成员
export const updateOrganization = (organizationld, data) => {
  return service({
    // url: `/api/organization/update-role${organizationld}`,
    url: `/api/organization/update-role/${organizationld}`,
    method: 'PUT',
    data: data,
  });
};

//查询组织成员列表
export const getOrganizationMembers = (organizationId, projectId) => {
  return service({
    url: `/api/organization/manage/${organizationId}/${projectId}`,
    method: 'GET',
  });
};

//修改组织
export const updateOrganizationDetail = (organizationId, data) => {
  return service({
    url: `/api/organization/manage/update/${organizationId}`,
    method: 'PUT',
    data: data,
  });
};

//查询组织详情及套餐信息
export const getOrganizationDetail = (organizationId) => {
  return service({
    url: `/api/organization/detail/${organizationId}`,
    method: 'GET',
  });
};

//分页查询用户组织列表（支持按角色过滤）
export const getOrganizationLists = (params) => {
  return service({
    url: '/api/organization/list',
    method: 'GET',
    params: params,
  });
};

//获取用户所属组织列表
export const getUserOrganizationList = (params) => {
  return service({
    url: '/api/organization/basic/list',
    method: 'GET',
    params,
  });
};
//创建组织
export const createOrganization = (data) => {
  return service({
    url: '/api/organization/manage/create',
    method: 'POST',
    data,
  });
};

//查询用户是否加入组织
export const checkMembership = () => {
  return service({
    url: '/api/organization/check-membership',
    method: 'GET',
  });
};

// //退出组织
// export const exitOrganization = (orgId) => {
//   return service({
//     url: `/api/organization/${orgId}/exit`,
//     method: "POST",
//   });
// };

// 组织管理员添加组织成员
export const addOrganizationMember = (organizationId, data) => {
  return service({
    url: `/api/organization/manage/${organizationId}/addmembers`,
    method: 'POST',
    data,
  });
};

// 组织管理员删除组织成员
export const deleteOrganizationMember = (organizationId, userId) => {
  return service({
    url: `/api/organization/manage/${organizationId}/deletemembers/${userId}`,
    method: 'DELETE',
  });
};

//用户加入组织
export const joinOrganization = (data) => {
  return service({
    url: '/api/organization/join',
    method: 'POST',
    data,
  });
};

//查询组织无人机列表
export const getOrganizationUavs = (organizationId) => {
  return service({
    url: `/api/organization/manage/devices/${organizationId}`,
    method: 'GET',
  });
};

//删除组织
export const deleteOrganizationId = (organizationId) => {
  return service({
    url: `/api/organization/manage/delete/${organizationId}`,
    method: 'DELETE',
  });
};

// export const organizaNameListBy = (params) => {
//   return service({
//     url: "/api/organization/basic/list",
//     method: "GET",
//     params, // 这会作为查询参数传递 ?deviceNumber=xxx
//   });
// };
///
//获取所有没有被禁用的用户
export const organizListuser = () => {
  return service({
    url: '/api/organization/manage/listuser',
    method: 'GET',
  });
};

//查询组织下面的设备
export const organizationListdevices = (organizationId) => {
  return service({
    url: `/api/organization/manage/${organizationId}/listdevices`,
    method: 'GET',
  });
};
//确认添加设备
export const organizationManage = (organizationId, data) => {
  return service({
    url: `api/organization/manage/${organizationId}/adddevices`,
    method: 'POST',
    data,
  });
};

// 组织管理员删除组织成员
export const deleteManageDevices = (organizationId, deviceId) => {
  return service({
    url: `/api/organization/manage/${organizationId}/devices/${deviceId}`,
    method: 'DELETE',
  });
};
