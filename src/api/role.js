import service from "@/utils/request";

//根据角色名称分页获取角色列表
export const roleList = (params) => {
  return service({
    url: "/api/role/list",
    method: "GET",
    params: params,
  });
};
// //添加角色
export const roleCreate = (data) => {
  return service({
    url: `/api/role/create`,
    method: "post",
    data,
  });
};
//修改角色
export const roleUpdate = (id, data) => {
  return service({
    url: `/api/role/update/${id}`,
    method: "post",
    data,
  });
};
//删除角色
export const roleDelete = (id) => {
  return service({
    url: `/api/role/delete/${id}`,
    method: "delete",
  });
};
// 获取角色相关菜单
export const rolelistMenu = (roleId) => {
  return service({
    url: `/api/role/listMenu/${roleId}`,
    method: "GET",
  });
};
///
//树形结构返回所有菜单列表
export const roleTreeList = (params) => {
  return service({
    url: `/api/role/treeList`,
    method: "GET",
    params,
  });
};
//给角色分配菜单
export const roleAllocMenu = (params) => {
  return service({
    url: `/api/role/allocMenu`,
    method: "POST",
    params,
  });
};
//查询所有后台资源分类
export const listAllResourceCategory = () => {
  return service({
    url: `/api/role/listAllResourceCategory`,
    method: "GET",
  });
};
//查询所有资源
export const listAllResource = () => {
  return service({
    url: `/api/role/listAllResource`,
    method: "GET",
  });
};
//获取角色相关资源
export const listResource = (roleId) => {
  return service({
    url: `/api/role/listResource/${roleId}`,
    method: "GET",
  });
};
//  给角色分配资源
export const allocResource = (params) => {
  return service({
    url: `/api/role/allocResource`,
    method: "POST",
    params,
  });
};
// 获取所有角色
export const listAllSelectable = (params) => {
  return service({
    url: `/api/role/selectable`,
    method: "GET",
    params,
  });
};
