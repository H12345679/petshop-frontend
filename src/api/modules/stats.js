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

/** 历史日度聚合统计数据 */
export function dailyStats(days = 30) {
  return get("/stats/daily", { days });
}

/** 操作日志实时提取分析统计 */
export function logOps(days = 7) {
  return get("/stats/log-ops", { days });
}

/** 店铺商品总销量排行 TopN */
export function shopRanking(limit = 10) {
  return get("/stats/shop-ranking", { limit });
}
