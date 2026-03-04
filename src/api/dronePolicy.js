import service from "@/utils/request";

//获取所有策略
export const dronePolicyList= (params) => {
  return service({
    url: "/api/dronePolicy/list",
    method: "get",
    params
  });
};


//策略创建
export const dronePolicyCreat= (data) => {
  return service({
    url: "/api/dronePolicy/creat",
    method: "post",
    data
  });
};
//根据id更新无人机策略
export const dronePolicyCompanyId= (Id,data) => {
  return service({
    url: `/api/dronePolicy/${Id}`,
    method: "put",
    data
  });
};
//根据id删除策略
export const dronePolicyCompanyDelete= (Id) => {
  return service({
    url: `/api/dronePolicy/${Id}`,
    method: "delete",
  });
};
