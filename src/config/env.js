/**
 * 高德地图 JS API 配置
 * 获取方式：https://console.amap.com/ → 应用管理 → 我的应用 → Web端(JS API)
 */
export const AMAP_CONFIG = {
  /** Web端开发者 Key (已转移到后端动态下发) */
  key: "",
  /** 安全密钥 (已转移到后端动态下发) */
  securityJsCode: "",
};

/** 默认中心：杭州（与数据库默认门店一致） */
export const DEFAULT_LNG = 120.15;
export const DEFAULT_LAT = 30.28;

/** 默认搜索城市 */
export const DEFAULT_CITY = "杭州";
