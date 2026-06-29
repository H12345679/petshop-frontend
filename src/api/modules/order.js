import { get, postJson, put, del } from "../axios.js";

/**
 * 订单接口（对应后端 OrderController + RefundController + ReviewController）。
 */

// ==================== 结算 & 下单 ====================

/** 结算预览 POST /api/orders/pre-settle */
export function preSettle(data) {
  return postJson("/orders/pre-settle", data);
}

/** 创建订单 POST /api/orders */
export function createOrder(data) {
  return postJson("/orders", data);
}

/** 支付 PUT /api/orders/{id}/pay body { payType } */
export function payOrder(id, payType) {
  return put(`/orders/${id}/pay`, { payType });
}

/** 取消订单 PUT /api/orders/{id}/cancel body { cancelReason } */
export function cancelOrder(id, reason) {
  return put(`/orders/${id}/cancel`, { cancelReason: reason });
}

/** 确认收货 PUT /api/orders/{id}/receive */
export function receiveOrder(id) {
  return put(`/orders/${id}/receive`);
}

// ==================== 订单查询 ====================

/** 我的订单列表 GET /api/orders/my */
export function myOrders(params) {
  return get("/orders/my", params);
}

/** 后台订单管理 GET /api/orders/manage */
export function manageOrders(params) {
  return get("/orders/manage", params);
}

/** 商家发货 PUT /api/orders/{id}/ship */
export function shipOrder(id) {
  return put(`/orders/${id}/ship`);
}

// ==================== 退单 ====================

/** 申请退单 POST /api/refunds */
export function applyRefund(data) {
  return postJson("/refunds", data);
}

/** 审核退单 PUT /api/refunds/{id}/audit */
export function auditRefund(id, data) {
  return put(`/refunds/${id}/audit`, data);
}

/** 后台退单列表 GET /api/refunds/manage */
export function manageRefunds(params) {
  return get("/refunds/manage", params);
}

// ==================== 评价 ====================

/** 提交评价 POST /api/reviews */
export function submitReview(data) {
  return postJson("/reviews", data);
}

/** 后台评价管理列表 GET /api/reviews/manage */
export function manageReviews(params) {
  return get("/reviews/manage", params);
}

/** 商家回复评价 PUT /api/reviews/{id}/reply */
export function replyReview(id, reply) {
  return put(`/reviews/${id}/reply`, { reply });
}

/** 删除评价 DELETE /api/reviews/{id} */
export function deleteReview(id) {
  return del(`/reviews/${id}`);
}
