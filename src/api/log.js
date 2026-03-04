import service from "@/utils/request";
// 获取日志列表
// export const getLogList = (params) => {
//   return service({
//     url: "/api/logs/logList",
//     method: "GET",
//     params,
//   });
// };

export const getLogList = (params) => {
  return service({
    // url: "/api/flightLogs/logList",
    url: "/api/flightLogs/query/batch",
    method: "GET",
    params,
  });
};

// 获取日志文件内容
// 读取特定日志文件内容
// export const getLogContent = (filename, lines, keyword) => {
//   return service({
//     url: `/api/logs/logDetails/${filename}`,
//     method: "GET",
//     params: {
//       lines,
//       keyword,
//     },
//   });
// };
// 获取日志文件内容
export const getLogContent = (filename, params) => {
  return service({
    url: `/api/flightLogs/logDetails/${filename}`,
    method: "get",
    params,
  });
};

// 读取特定日志文件内容
// export const getLogDetails = (filename, params) => {
//   return service({
//     url: `/api/logs/logDetails/${filename}`,
//     method: "GET",
//     params: { lines: 100, ...params }, // 默认获取最后100行
//   });
// };

// 下载日志文件
export const downloadLogFile = (filename) => {
  return service({
    url: `/api/flightlogs/download/${filename}`,
    method: "get",
    responseType: "blob",
  });
};
// c查询日志
export const getLogs = (params) => {
  return service({
    url: `/api/flightLogs/getLogs`,
    method: "get",
    params,
  });
};

// 批量删除接口函数
export const flightLogsDeleteBatchsByIds = (fileNames) => {
  return service({
    url: `/api/flightLogs/deleteBatchsByFileNames`,
    method: "DELETE",
    data: fileNames,
  });
};
//
export const flightLogsDownload = (filename) => {
  return service({
    url: `/api/flightLogs/download/${filename}`,
    method: "GET",
    responseType: "blob",
    transformResponse: [(data) => data],
    skipCodeCheck: true, // 自定义标识：跳过响应拦截器的code校验
  });
};
