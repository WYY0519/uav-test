import service from "@/utils/request";

//分页查询禁飞区列表
export const noflyzoneList = (params) => {
  return service({
    url: "/api/limitArea/list",
    method: "GET",
    params,
  });
};
//添加禁飞区
export const noflyzoneAdd = (data) => {
  return service({
    url: "api/limitArea/manage/add",
    method: "POST",
    data,
  });
};

//修改禁飞区
export const noflyzoneUpdate = (data) => {
  return service({
    // url: "/api/noflyzone/manage/update",
    url: "api/limitArea/manage/update",
    method: "put",
    data,
  });
};
//删除禁飞区
export const noflyzoneDelete = (id) => {
  return service({
    // url: `/api/noflyzone/manage/delete/${zoneId}`,
    url: `api/limitArea/manage/delete/${id}`,
    method: "DELETE",
  });
};

//
export const limitAreaList = (params) => {
  return service({
    url: "api/limitArea/list",
    method: "GET",
    params,
  });
};
