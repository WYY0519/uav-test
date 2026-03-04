 
/**
 * 角度转弧度
 * @param {number} degrees - 角度值
 * @returns {number} 弧度值
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 计算两个经纬度点之间的距离（米）
 * @param {number} lat1 - 第一个点纬度
 * @param {number} lng1 - 第一个点经度
 * @param {number} lat2 - 第二个点纬度
 * @param {number} lng2 - 第二个点经度
 * @returns {number} 两点间距离（米，保留3位小数）
 */
export function getDistanceBetweenTwoPoints(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 1000) / 1000;
}

/**
 * 计算航线所有航点的总距离
 * @param {Array} points - 航点数组（包含lat/lng字段）
 * @returns {object} { total: 总距离（米） }
 */
export function calculateTotalDistance(points) {
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const distance = getDistanceBetweenTwoPoints(
      p1.lat,
      p1.lng,
      p2.lat,
      p2.lng,
    );
    totalDistance += distance;
  }

  return {
    total: Math.round(totalDistance * 1000) / 1000,
  };
}

/**
 * 转换接口返回的航线数据格式
 * @param {object} item - 原始航线数据
 * @returns {object} 格式化后的航线数据
 */
export function convertItem(item) {
  const pointsObj = JSON.parse(item.pointsJson);

  const convertedPoints = pointsObj?.routeData?.points.map((point) => ({
    lat: point.lat,
    lng: point.lon,
    alt: point.alt,
    action: point.action,
    headingAngle: {
      mode: point.heading_angle?.mode || "",
      angle: point.heading_angle?.angle || "",
      lon: point.heading_angle?.lon || "",
      lat: point.heading_angle?.lat || "",
    },
    heightStrategy: point.height_strategy,
    residenceTime: point.residence_time,
    routeLossBehavior: point.route_loss_behavior,
    velocity: point.velocity,
    priority: point.priority,
    sort: point.sort,
  }));

  return {
    name: item.name,
    description: item.description,
    id: item.id,
    points: convertedPoints,
    policyId: item.policyId,
    routeArea: item.routeArea,
    createTime: item.createTime,
  };
}

/**
 * 转换航点数据为接口要求的JSON格式
 * @param {Array} points - 航点数组（包含lat/lng/alt字段）
 * @returns {string} 格式化后的JSON字符串
 */
export function convertPoints(points) {
  const convertedPoints = points.map((point) => ({
    lat: point.lat,
    lon: point.lng,
    alt: point.alt,
  }));

  const homePos =
    points.length > 0
      ? {
          lat: points[0].lat,
          lon: points[0].lng,
          alt: 0,
        }
      : { lat: 0, lon: 0, alt: 0 };

  const result = {
    routeData: {
      type: "mission",
      points: convertedPoints,
      home_pos: homePos,
    },
  };

  return JSON.stringify(result);
}