/**
 * 坐标转换工具：WGS-84、GCJ-02、BD-09 相互转换
 * 优化点：
 * 1. 修复GCJ02转WGS84的精度问题（增加迭代校正）
 * 2. 优化边界判断逻辑
 * 3. 补充类型校验和异常处理
 * 4. 统一变量命名规范
 */

// 定义必要的数学常量（加密算法核心）
const PI = Math.PI;
const AXIS = 6378245.0; // 1975年IAG(国际大地测量协会)推荐椭球体长半轴
const OFFSET = 0.00669342162296594323; // 偏心率平方 (e^2)

/**
 * 判断坐标点是否在中国境内（优化边界值，更精准）
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {boolean} true-在国外，false-在国内
 */
function isOutOfChina(lng, lat) {
  // 增加空值校验
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    return true;
  }
  // 优化中国地理边界范围（更精准）
  return !(lng >= 73.66 && lng <= 135.05 && lat >= 3.86 && lat <= 53.55);
}

/**
 * 转换经度（WGS-84 -> GCJ-02 加密算法部分）
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {number} 转换后的经度偏移量
 */
function transformLng(lng, lat) {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * PI) +
      300.0 * Math.sin((lng / 30.0) * PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * 转换纬度（WGS-84 -> GCJ-02 加密算法部分）
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {number} 转换后的纬度偏移量
 */
function transformLat(lng, lat) {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * 核心转换：WGS-84 转 GCJ-02（火星坐标系）
 * 优化点：增加参数校验，提高转换精度
 * @param {number} lng - WGS-84经度
 * @param {number} lat - WGS-84纬度
 * @returns {[number, number]} [GCJ-02经度, GCJ-02纬度]
 */
export function wgs84togcj02(lng, lat) {
  // 严格参数校验
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    console.warn('wgs84togcj02：参数必须是有效的数字经纬度');
    return [lng, lat];
  }

  // 坐标点在中国境外，不进行转换
  if (isOutOfChina(lng, lat)) {
    return [lng, lat];
  }

  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);

  const radlat = (lat / 180.0) * PI;
  let magic = Math.sin(radlat);
  magic = 1 - OFFSET * magic * magic;
  const sqrtmagic = Math.sqrt(magic);

  dlat = (dlat * 180.0) / (((AXIS * (1 - OFFSET)) / (magic * sqrtmagic)) * PI);
  dlng = (dlng * 180.0) / ((AXIS / sqrtmagic) * Math.cos(radlat) * PI);

  const mglat = lat + dlat;
  const mglng = lng + dlng;

  // 保留6位小数（高德地图精度）
  return [
    Number(mglng.toFixed(6)),
    Number(mglat.toFixed(6))
  ];
}

/**
 * GCJ-02 转 WGS-84（核心优化：增加迭代校正，提高精度）
 * @param {number} lng - GCJ-02经度
 * @param {number} lat - GCJ-02纬度
 * @returns {[number, number]} [WGS-84经度, WGS-84纬度]
 */
export function gcj02towgs84(lng, lat) {
  // 严格参数校验
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    console.warn('gcj02towgs84：参数必须是有效的数字经纬度');
    return [lng, lat];
  }

  // 坐标点在中国境外，不进行转换
  if (isOutOfChina(lng, lat)) {
    return [lng, lat];
  }

  // 迭代校正（解决原有算法精度不足问题）
  let initDelta = 0.01;
  let threshold = 0.000001;
  let dLat = initDelta;
  let dLng = initDelta;
  let mLat = lat - dLat;
  let mLng = lng - dLng;
  let pLat = lat + dLat;
  let pLng = lng + dLng;
  let wgsLat, wgsLng;
  let i = 0;

  while (true) {
    wgsLat = (lat + mLat) / 2;
    wgsLng = (lng + mLng) / 2;
    const tmp = wgs84togcj02(wgsLng, wgsLat);
    dLat = tmp[1] - lat;
    dLng = tmp[0] - lng;

    if (Math.abs(dLat) < threshold && Math.abs(dLng) < threshold) {
      break;
    }

    if (dLat > 0) {
      pLat = wgsLat;
    } else {
      mLat = wgsLat;
    }

    if (dLng > 0) {
      pLng = wgsLng;
    } else {
      mLng = wgsLng;
    }

    if (++i > 10000) {
      break;
    }
  }

  // 保留6位小数（高德地图精度）
  return [
    Number(wgsLng.toFixed(6)),
    Number(wgsLat.toFixed(6))
  ];
}

/**
 * 批量转换坐标点（提高性能，增加异常处理）
 * @param {Array} points - 坐标点数组 [[lng, lat], ...]
 * @param {Function} transformFunc - 转换函数
 * @returns {Array} 转换后的坐标点数组
 */
export function transformPoints(points, transformFunc) {
  // 参数校验
  if (!Array.isArray(points) || typeof transformFunc !== 'function') {
    console.warn('transformPoints：参数格式错误');
    return [];
  }

  return points.map((point) => {
    // 单个点校验
    if (!Array.isArray(point) || point.length !== 2) {
      console.warn('transformPoints：坐标点格式错误', point);
      return point;
    }
    const [lng, lat] = point;
    return transformFunc(lng, lat);
  });
}

/**
 * 工具方法：校验经纬度格式是否合法（优化正则和逻辑）
 * @param {string} str - 待校验的字符串
 * @returns {Object|null} 合法返回{lng, lat}，不合法返回null
 */
export const validateLatLng = (str) => {
  // 空值校验
  if (!str || typeof str !== 'string') {
    return null;
  }

  // 优化经纬度正则：支持中英文逗号、前后空格
  const latLngReg = /^\s*[-+]?((180(\.0+)?)|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\s*[,，]\s*[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\s*$/;
  if (!latLngReg.test(str)) {
    return null;
  }

  // 分割经纬度并转换为数字（兼容中英文逗号、空格）
  const [lngStr, latStr] = str.replace(/，/g, ',').split(',').map(s => s.trim());
  const lng = Number(lngStr);
  const lat = Number(latStr);

  // 范围校验（严格边界）
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90 || isNaN(lng) || isNaN(lat)) {
    return null;
  }

  return { lng, lat };
};