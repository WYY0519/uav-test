import service from "@/utils/request";

//管理员查看所有用户信息
export const adminUserList = (params) => {
  return service({
    url: "/api/admin/list",
    method: "GET",
    params,
  });
};

//管理员删除用户
export const adminDeleteUser = (userId) => {
  return service({
    url: `/api/user/delete/${userId}`,
    method: "DELETE",
  });
};

//管理员添加用户
export const adminAddUser = (data) => {
  return service({
    url: "/api/user/adduser",
    method: "POST",
    data,
  });
};

//修改用户信息
export const admiadminUpdaten = (id, data) => {
  return service({
    url: `/api/user/updateWithRole/${id}`,
    method: "POST",
    data,
  });
};

//修改帐号状态
export const updateStatus = (id, params) => {
  return service({
    url: `/api/user/updateStatus/${id}`,
    method: "POST",
    params,
  });
};
//获取当前用户信息
export const adminInfo = () => {
  return service({
    url: `/api/admin/info`,
    method: "GET",
  });
};
//修改密码
export const updatePassword = (data) => {
  return service({
    url: "/api/admin/updatePassword",
    method: "POST",
    data,
  });
};
