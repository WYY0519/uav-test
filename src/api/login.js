import service from "@/utils/request";

// // 登录
// export const login = (data) => {
//   return service({
//     url: "/api/login",
//     method: "post",
//     data,
//   });
// };

//退出
export const logout = () => {
  return service({
    url: "/api/admin/logout",
    method: "post",
  });
};
