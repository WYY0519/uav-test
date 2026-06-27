import service from '@/utils/request';

//头像红点
export const todoSummary = () => {
  return service({
    url: '/api/todo/summary',
    method: 'GET',
  });
};

//| 列表 
export const todoList = (params) => {
  return service({
    url: '/api/todo/list',
    method: 'GET',
    params,
  });
};
