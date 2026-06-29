import { get, postJson, put, del } from "../axios.js";

/**
 * 用户信息 & 收货地址 & 会员等级接口
 * 对应后端 B 模块：UserController / AddressController / MembershipController
 */

// ==================== 用户信息 ====================

/** 获取当前登录用户：GET /api/users/me */
export function getUserInfo() {
  return get("/users/me");
}

/** 别名：getMe 等价于 getUserInfo */
export const getMe = getUserInfo;

/** 修改当前用户信息：PUT /api/users/me */
export function updateUserInfo(data) {
  return put("/users/me", data);
}

/** 修改密码：PUT /api/users/me/password */
export function changePassword(data) {
  return put("/users/me/password", data);
}

// ==================== 收货地址 ====================

/** 地址列表：GET /api/addresses */
export function getAddresses() {
  return get("/addresses");
}

/** 新增地址：POST /api/addresses */
export function addAddress(data) {
  return postJson("/addresses", data);
}

/** 修改地址：PUT /api/addresses/{id} */
export function updateAddress(id, data) {
  return put(`/addresses/${id}`, data);
}

/** 删除地址：DELETE /api/addresses/{id} */
export function deleteAddress(id) {
  return del(`/addresses/${id}`);
}

/** 设为默认地址：PUT /api/addresses/{id}/default */
export function setDefaultAddress(id) {
  return put(`/addresses/${id}/default`);
}

// ==================== 会员等级 ====================

/** 会员等级列表：GET /api/membership/levels */
export function getMembershipLevels() {
  return get("/membership/levels");
}

/** 会员升级：POST /api/membership/upgrade */
export function upgradeMembership() {
  return postJson("/membership/upgrade");
}

// ==================== 订单 ====================

/** 我的订单列表：GET /api/orders/my */
export function getMyOrders(params) {
  return get("/orders/my", params);
}

// ==================== 收藏 ====================

/** 我的收藏列表：GET /api/favorites */
export function getFavorites(params) {
  return get("/favorites", params);
}

/** 添加收藏：POST /api/favorites/{productId} */
export function addFavorite(productId) {
  return postJson(`/favorites/${productId}`);
}

/** 取消收藏：DELETE /api/favorites/{productId} */
export function removeFavorite(productId) {
  return del(`/favorites/${productId}`);
}

/** 判断是否已收藏：GET /api/favorites/{productId}/check */
export function checkFavorite(productId) {
  return get(`/favorites/${productId}/check`);
}

// ==================== 优惠券 ====================

/** 我的优惠券：GET /api/users/me/coupons */
export function getMyCoupons(params) {
  return get("/users/me/coupons", params);
}

/** 领券中心列表：GET /api/coupons */
export function getCouponList() {
  return get("/coupons");
}

/** 领用优惠券：POST /api/coupons/{id}/receive */
export function receiveCoupon(id) {
  return postJson(`/coupons/${id}/receive`);
}

// ==================== 消息 ====================

/** 我的消息列表：GET /api/messages/my */
export function getMyMessages(params) {
  return get("/messages/my", params);
}

/** 标记单条已读：PUT /api/messages/my/{id}/read */
export function readMessage(id) {
  return put(`/messages/my/${id}/read`);
}

/** 一键全部已读：PUT /api/messages/my/read-all */
export function readAllMessages() {
  return put("/messages/my/read-all");
}

/** 充值：POST /api/users/recharge */
export function recharge(amount) {
  return postJson("/users/recharge", { amount });
}
