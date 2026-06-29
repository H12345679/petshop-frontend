import { get } from "../axios.js";

/**
 * 地图 LBS 模块 API
 */

/**
 * 获取附近商店（地图模式）
 * GET /api/map/shops?longitude=113.9&latitude=22.5&radius=5&limit=50
 * @param {Object} params - { longitude, latitude, radius, limit }
 * @returns {Promise} - { code: 200, data: Array<MapShopResponse> }
 */
export function searchNearbyShops(params) {
  return get("/map/shops", params);
}

/**
 * 获取单个商店坐标信息（地图弹窗用）
 * GET /api/map/shops/{id}
 * @param {number} id - 商店 ID
 * @returns {Promise}
 */
export function getShopLocation(id) {
  return get(`/map/shops/${id}`);
}

/**
 * 计算两点距离与预估时长
 * GET /api/map/distance?fromLongitude=&fromLatitude=&toLongitude=&toLatitude=
 * @param {Object} params
 * @returns {Promise}
 */
export function calcDistance(params) {
  return get("/map/distance", params);
}
