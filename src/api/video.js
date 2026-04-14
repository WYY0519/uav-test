import service from "@/utils/request";

//开始录制
export const videoStartRecording = (data) => {
  return service({
    url: "/api/video/startRecording",
    method: "POST",
    data,
  });
};

//停止录制
export const videoStopRecording = (data) => {
  return service({
    url: "/api/video/stopRecording",
    method: "POST",
    data,
  });
};
//获取视频列表
export const videoList = () => {
  return service({
    url: "/api/video/list",
    method: "GET",
  });
};

//获取视频列表
export const videoPlayUrl = (id) => {
  return service({
    url: `/api/video/playUrl/${id}`,
    method: "GET",
  });
};
