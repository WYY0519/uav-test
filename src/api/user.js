import service from "@/utils/request";

//身份验证
export const userlogin = () => {
  return service({
    url: "/api/user/vertifyExist",
    method: "get",
  });
};

// 发送手机验证码
export const sendPhoneCode = (phone) => {
  return service({
    url: "/api/user/sendSms",
    method: "post",
    data: { phone }, // 手机号
  });
};

//账号登录
export const accountLogin = (data) => {
  return service({
    url: "/api/user/UsernameLogin",
    method: "post",
    data,
  });
};

// 手机号登录
export const phoneLogin = (data) => {
  return service({
    url: "/api/user/smsLogin",
    method: "post",
    data,
  });
};

//公司注册
export const companyRegister = (data) => {
  return service({
    url: "/api/user/CompanyRegister",
    method: "post",
    data,
  });
};

//个体注册
export const individualRegister = (data) => {
  return service({
    url: "/api/user/PersonalRegister",
    method: "post",
    data,
  });
};
//
//获取当前用户
export const getCurrentUser = () => {
  return service({
    url: "/api/user/getCurrentUser ",
    method: "get",
  });
};
