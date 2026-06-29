import { get, postJson, put, del } from "../axios.js";

/**
 * 购物车接口（对应后端 CartController）。
 */

/** 购物车列表 GET /api/cart -> CartItem[] */
export function cartList() {
  return get("/cart");
}

/** 加入购物车 POST /api/cart body { productId, skuId, quantity } */
export function addToCart(data) {
  return postJson("/cart", data);
}

/** 更新数量 PUT /api/cart/{id} body { quantity } */
export function updateCartQty(id, quantity) {
  return put(`/cart/${id}`, { quantity });
}

/** 删除购物车项 DELETE /api/cart/{id} */
export function deleteCart(id) {
  return del(`/cart/${id}`);
}

/** 切换勾选状态 PUT /api/cart/{id}/select body { selected } */
export function toggleCartSelect(id, selected) {
  return put(`/cart/${id}/select`, { selected });
}
