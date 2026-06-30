import { get, postJson, put, del } from "../axios.js";

/**
 * 优惠券接口（对应后端 CouponController）。
 */

/** 领券中心列表 GET /api/coupons */
export function couponList() {
  return get("/coupons");
}

/** 领用优惠券 POST /api/coupons/{id}/receive */
export function receiveCoupon(id) {
  return postJson(`/coupons/${id}/receive`);
}

/** 我的优惠券 GET /api/users/me/coupons?status= */
export function myCoupons(status) {
  return get("/users/me/coupons", { status });
}

// ==================== 后台管理 ====================

/** 管理端优惠券列表 GET /api/coupons/manage?current=&size=&name= */
export function manageCoupons(params) {
  return get("/coupons/manage", params);
}

/** 创建优惠券 POST /api/coupons */
export function createCoupon(data) {
  return postJson("/coupons", data);
}

/** 更新优惠券 PUT /api/coupons/{id} */
export function updateCoupon(id, data) {
  return put(`/coupons/${id}`, data);
}

/** 删除优惠券 DELETE /api/coupons/{id} */
export function deleteCoupon(id) {
  return del(`/coupons/${id}`);
}
