import { get, post, put, del } from "../axios.js";

/**
 * 商店分页查询
 * GET /api/shops
 * @param {Object} params - { current, size, name, status }
 */
export function searchShops(params) {
  return get("/shops", params);
}

/**
 * 获取商店详情
 * GET /api/shops/{id}
 */
export function getShopDetail(id) {
  return get(`/shops/${id}`);
}

/**
 * 创建商店
 * POST /api/shops
 */
export function createShop(data) {
  return post("/shops", data);
}

/**
 * 修改商店
 * PUT /api/shops/{id}
 */
export function updateShop(id, data) {
  return put(`/shops/${id}`, data);
}

/**
 * 删除商店
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
  return post(`/shop-favorites/${shopId}`);
}

/** 取消关注店铺：DELETE /api/shop-favorites/{shopId} */
export function removeShopFavorite(shopId) {
  return del(`/shop-favorites/${shopId}`);
}

/** 判断是否已关注：GET /api/shop-favorites/{shopId}/check */
export function checkShopFavorite(shopId) {
  return get(`/shop-favorites/${shopId}/check`);
}
