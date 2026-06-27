import service from '@/utils/request';

//分享视频
export const liveStreamShare = (data) => {
  return service({
    url: '/api/liveStream/share',
    method: 'POST',
    data,
  });
};
//视频
export const liveStreamGetLiveStream = (droneId) => {
  return service({
    url: '/api/liveStream/getLiveStream',
    method: 'get',
    params: { droneId },
  });
};
