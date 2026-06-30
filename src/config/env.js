/**
 * 高德地图 JS API 配置
 * 获取方式：https://console.amap.com/ → 应用管理 → 我的应用 → Web端(JS API)
 */
export const AMAP_CONFIG = {
  /** Web端开发者 Key */
  key: "f2bb704018d6fb8aafa3d1bcb880b62d",
  /** 安全密钥（开发环境明文，生产环境需代理转发） */
  securityJsCode: "77b5607769c0e45c2ad22c6b454220ca",
};

/** 默认中心：杭州（与数据库默认门店一致） */
export const DEFAULT_LNG = 120.15;
export const DEFAULT_LAT = 30.28;

/** 默认搜索城市 */
export const DEFAULT_CITY = "杭州";
