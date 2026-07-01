import { get } from "../axios.js";

/** 获取系统配置相关的接口 */

/** 获取高德地图动态密钥配置 */
export function getMapConfig() {
  return get("/map/config");
}
