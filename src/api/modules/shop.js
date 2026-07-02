import { get, post, put, del } from "../axios.js";

/**
 * 鍟嗗簵鍒嗛〉鏌ヨ
 * GET /api/shops
 * @param {Object} params - { current, size, name, status }
 */
export function searchShops(params) {
  return get("/shops", params);
}

/**
 * 鑾峰彇鍟嗗簵璇︽儏
 * GET /api/shops/{id}
 */
export function getShopDetail(id) {
  return get(`/shops/${id}`);
}

/**
 * 鍒涘缓鍟嗗簵
 * POST /api/shops
 */
export function createShop(data) {
  return post("/shops", data);
}

/**
 * 淇敼鍟嗗簵
 * PUT /api/shops/{id}
 */
export function updateShop(id, data) {
  return put(`/shops/${id}`, data);
}

/**
 * 鍒犻櫎鍟嗗簵
 * DELETE /api/shops/{id}
 */
export function deleteShop(id) {
  return del(`/shops/${id}`);
}


// ==================== 关注店铺 ====================

/** 我的关注店铺列表：GET /api/shop-favorites */
export function getShopFavorites(params) {
  return get('/shop-favorites', params);
}

/** 关注店铺：POST /api/shop-favorites/{shopId} */
export function addShopFavorite(shopId) {
  return post(/shop-favorites/);
}

/** 取消关注店铺：DELETE /api/shop-favorites/{shopId} */
export function removeShopFavorite(shopId) {
  return del(/shop-favorites/);
}

/** 判断是否已关注：GET /api/shop-favorites/{shopId}/check */
export function checkShopFavorite(shopId) {
  return get(/shop-favorites//check);
}

