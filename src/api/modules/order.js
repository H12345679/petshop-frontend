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

/** 批量支付 POST /api/orders/batch-pay body { orderIds, payType } */
export function batchPayOrder(orderIds, payType) {
  return postJson("/orders/batch-pay", { orderIds, payType });
}

/** 获取单笔订单详情（含 orderItems） GET /api/orders/{id} */
export function getOrderById(id) {
  return get(`/orders/${id}`);
}

/** 取消订单 PUT /api/orders/{id}/cancel body { cancelReason, orderItemId? } */
export function cancelOrder(id, reason, orderItemId) {
  const body = { cancelReason: reason };
  if (orderItemId) body.orderItemId = orderItemId;
  return put(`/orders/${id}/cancel`, body);
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

/** 商家发货 PUT /api/orders/{id}/ship body { courierCompany, trackingNumber } */
export function shipOrder(id, courierCompany, trackingNumber) {
  return put(`/orders/${id}/ship`, { courierCompany, trackingNumber });
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

/** 用户填写退货快递单号 PUT /api/refunds/{id}/return-shipping（退单状态3→4） */
export function submitReturnShipping(id, data) {
  return put(`/refunds/${id}/return-shipping`, data);
}

/** 商家确认收到退货并打款 PUT /api/refunds/{id}/confirm-return（退单状态4→1） */
export function confirmReturnRefund(id, data) {
  return put(`/refunds/${id}/confirm-return`, data || {});
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

/** 恢复已删除评价 PUT /api/reviews/{id}/restore */
export function restoreReview(id) {
  return put(`/reviews/${id}/restore`);
}

/** 删除订单 DELETE /api/orders/{id} */
export function deleteOrder(id) {
  return del(`/orders/${id}`);
}
