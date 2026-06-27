import service from '@/utils/request';

//开始录制
export const videoStartRecording = (data) => {
  return service({
    url: '/api/video/startRecording',
    method: 'POST',
    data,
  });
};

//停止录制
export const videoStopRecording = (data) => {
  return service({
    url: '/api/video/stopRecording',
    method: 'POST',
    data,
  });
};
//获取视频列表
export const videoList = (params) => {
  return service({
    url: '/api/video/list',
    method: 'GET',
    params,
  });
};

//获取视频列表
export const videoPlayUrl = (id) => {
  return service({
    url: `/api/video/playUrl/${id}`,
    method: 'GET',
  });
};

// 下载视频
// export const videoDownload = (id) => {
//   return service({
//     url: `/api/video/download/${id}`,
//     method: "GET",
//     responseType: "blob", // 关键：直接接收二进制Blob
//     validateStatus: () => true, // 放行500，不自动抛错
//   });
// };
export const videoDownload = (id) => {
  return service({
    url: `/api/video/download/${id}`,
    method: 'GET',
    responseType: 'blob', // 关键：直接接收二进制Blob
    validateStatus: () => true, // 放行500，不自动抛错
  });
};

// 获取视频下载地址（返回URL字符串）
export const videoDownloadUrl = (id) => {
  return service({
    url: `/api/video/downloadUrl/${id}`,
    method: 'GET',
  });
};
