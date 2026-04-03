import service from "@/utils/request";

//管理员添加用户
export const liveStreamShare = (data) => {
  return service({
    url: "/api/liveStream/share",
    method: "POST",
    data,
  });
};
