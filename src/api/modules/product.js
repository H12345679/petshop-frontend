import { get } from "../axios.js";

/**
 * 分页搜索商品
 * GET /api/products
 * @param {Object} params - { current, size, categoryId, name, type, sort, minPrice, maxPrice }
 */
export function searchProducts(params) {
  return get("/products", params);
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
  // eslint-disable-next-line
  const { post } = require("../axios.js");
  return post("/cart", data);
}

/**
 * 收藏商品 (占位/实际)
 * POST /api/favorites/{productId}
 */
export function toggleFavorite(productId) {
  // eslint-disable-next-line
  const { post } = require("../axios.js");
  return post(`/favorites/${productId}`);
}

/**
 * 创建商品
 * POST /api/products
 */
export function createProduct(data) {
  // eslint-disable-next-line
  const { post } = require("../axios.js");
  return post("/products", data);
}

/**
 * 修改商品
 * PUT /api/products/{id}
 */
export function updateProduct(id, data) {
  // eslint-disable-next-line
  const { put } = require("../axios.js");
  return put(`/products/${id}`, data);
}

/**
 * 删除商品
 * DELETE /api/products/{id}
 */
export function deleteProduct(id) {
  // eslint-disable-next-line
  const { del } = require("../axios.js");
  return del(`/products/${id}`);
}

/**
 * 上传图片
 * POST /api/files/image
 */
export function uploadImage(file) {
  // eslint-disable-next-line
  const { post } = require("../axios.js");
  const formData = new FormData();
  formData.append("file", file);
  return post("/files/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}
