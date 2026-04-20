import service from '@/utils/request';
//发送无人机指令
export const sendDroneCommand = (data) => {
  return service({
    url: '/api/device/manage/send-command-connect', //send-command-connect
    method: 'POST',
    data,
  });
};
//设备信息循环获取
export const sendDroneCommandGet = (data) => {
  return service({
    url: '/api/device/manage/send-command-get', //manage/send-command-get
    method: 'POST',
    data,
  });
};

//发送无人机指令
export const sendMoveCommand = (data) => {
  return service({
    url: '/api/monitor/send-move-command',
    method: 'POST',
    data,
  }).catch((error) => {
    console.error('Error in sendDroneCommand:', error);
    throw error; // 确保错误被抛出，以便上层捕获
  });
};

//查询项目下所有设备信息
export const getDroneList = (projectId) => {
  return service({
    url: `/api/device/project-devices/${projectId}`,
    method: 'GET',
  });
};

//删除设备
export const deleteDevice = (deviceId) => {
  return service({
    url: `/api/device/delete/${deviceId}`,
    method: 'DELETE',
  });
};

//为项目添加设备
export const addDeviceToProject = (projectId, data) => {
  return service({
    url: `/api/device/${projectId}/addDevices`,
    method: 'POST',
    data,
  });
};

//显示公司账户设备
export const getCompanyDevices = (params) => {
  return service({
    url: '/api/device/basic/company_devices',
    method: 'GET',
    params,
  });
};

//启动视频流
export const startVideoStream = (params) => {
  return service({
    url: '/api/video/start',
    method: 'GET',
    params,
  });
};

//根据设备编号查询设备信息
export const getDeviceDetails = (params) => {
  return service({
    url: '/api/device/device-details',
    method: 'GET',
    params, // 这会作为查询参数传递 ?deviceNumber=xxx
  });
};

//下载设备模板
export const downloadDeviceTemplate = () => {
  return service({
    url: '/api/device/downloadDeviceTemplate',
    method: 'GET',
  });
};

//添加设备
export const createDevice = (params) => {
  return service({
    url: '/api/device/manage/company_devices/createDevice',
    method: 'POST',
    params,
  });
};
//编辑设备
export const updateCompanyDevice = (params, id) => {
  return service({
    url: `/api/device/manage/updateCompanyDevice/${id}`,
    method: 'PUT',
    params,
  });
};
//批量导入
export const addDeviceToExcel = (params) => {
  return service({
    url: `/api/device/addDeviceToExcel`,
    method: 'POST',
    params,
  });
};
//删除设备
export const deleteCompanyDevice = (id) => {
  return service({
    url: `/api/device/manage/deleteCompanyDevice/${id}`,
    method: 'DELETE',
  });
};

//软删除设备 0-解禁 1-禁用
export const updateDisable = (id, params) => {
  return service({
    url: `/api/device/manage/updateDisable/${id}`,
    method: 'PUT',
    params,
  });
};
//申请视频流地址
export const getVideoStreamAddress = () => {
  return service({
    url: `api/device/manage/getVideoStreamAddress`,
    method: 'GET',
  });
};

// 导出无人机模板
export const deviceManageDownloadDeviceTemplate = () => {
  return service({
    url: `/api/device/manage/downloadDeviceTemplate`,
    method: 'GET',
    responseType: 'blob',
    transformResponse: [(data) => data],
    skipCodeCheck: true, // 自定义标识：跳过响应拦截器的code校验
  });
};
// 导入用户模板
export const deviceManageaddDeviceToExcel = (formData) => {
  return service({
    url: '/api/device/manage/addDeviceToExcel', // 接口路径（无需硬编码IP+端口，service已配baseURL）
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // 表单上传必须的头
    },
    // 无需手动加token：service的请求拦截器会自动添加
  });
};
//
export const deviceDeleteCompanyDeviceByIds = (ids) => {
  return service({
    url: `/api/device/manage/deleteCompanyDeviceByIds`,
    method: 'DELETE',
    data: ids,
  });
};

// 拆除设备
export const dronesCommMode = (droneId) => {
  return service({
    url: `/api/drones/${droneId}/commMode`,
    method: 'GET',
  });
};
