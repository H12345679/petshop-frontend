import { get, post, postJson, put, del } from "../axios.js";

/**
 * 分页搜索商品
 * GET /api/products
 * @param {Object} params - { current, size, categoryId, name, type, sort, minPrice, maxPrice }
 */
export function searchProducts(params) {
  return get("/products", params);
}

/**
 * 获取商品分类树
 * GET /api/categories
 */
export function getCategories() {
  return get("/categories");
}

/**
 * 获取商品详情
 * GET /api/products/{id}
 */
export function getProductDetail(id) {
  return get(`/products/${id}`);
}

/**
 * 加入购物车 (占位/实际)
 * POST /api/cart
 */
export function addToCart(data) {
  return postJson("/cart", data);
}

/**
 * 添加收藏
 * POST /api/favorites/{productId}
 */
export function addFavorite(productId) {
  return post(`/favorites/${productId}`);
}

/**
 * 取消收藏
 * DELETE /api/favorites/{productId}
 */
export function removeFavorite(productId) {
  return del(`/favorites/${productId}`);
}

/**
 * 检查是否已收藏
 * GET /api/favorites/{productId}/check
 */
export function checkFavorite(productId) {
  return get(`/favorites/${productId}/check`);
}

/**
 * 创建商品
 * POST /api/products
 */
export function createProduct(data) {
  return postJson("/products", data);
}

/**
 * 修改商品
 * PUT /api/products/{id}
 */
export function updateProduct(id, data) {
  return put(`/products/${id}`, data);
}

/**
 * 删除商品
 * DELETE /api/products/{id}
 */
export function deleteProduct(id) {
  return del(`/products/${id}`);
}

/**
 * 上传图片
 * POST /api/files/image
 */
export function uploadImage(file) {
  const { upload } = require("../axios.js");
  const formData = new FormData();
  formData.append("file", file);
  return upload("/files/image", formData);
}

/**
 * 获取商品评价
 * GET /api/products/{productId}/reviews
 */
export function getProductReviews(productId, params) {
  return get(`/products/${productId}/reviews`, params);
}
