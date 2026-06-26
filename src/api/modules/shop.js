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
