import service from '@/utils/request';
// 根据设备编号查询设备信息
export const deviceDetails = (params) => {
  return service({
    url: '/api/monitor/device-details',
    method: 'GET',
    params,
  });
};
//发送无人机指令
export const deviceSendCommand = (data) => {
  return service({
    url: '/api/monitor/send-command', ///monitor/send-command
    method: 'POST',
    data,
  });
};

//发送无人机指令
// export const deviceSendCommand = (data) => {
//    return service({
//     url: "/api/monitor/send-command",///monitor/send-command
//     method: "POST",
//     data,
//   });
// }
//通道1和通道2
export const monitorSendMoveCommand = (data) => {
  return service({
    url: `/api/monitor/send-move-command`,
    method: 'post',
    data,
  });
};
