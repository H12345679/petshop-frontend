import { get } from "../axios.js";

/**
 * 数据看板统计接口（对应后端 StatsController）。
 */

/** KPI 概览 */
export function kpi() {
  return get("/stats/kpi");
}

/** 销量&订单趋势 */
export function salesTrend(days = 7) {
  return get("/stats/sales", { days });
}

/** 订单状态分布 */
export function orderStatus() {
  return get("/stats/order-status");
}

/** 热销商品 TopN */
export function productSales(limit = 10) {
  return get("/stats/product-sales", { limit });
}

/** 会员等级分布 */
export function memberLevel() {
  return get("/stats/member-level");
}
