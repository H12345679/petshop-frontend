import { get } from "../axios.js";

/** 获取视频列表：GET /api/videos */
export function getVideoList(params) {
  return get("/videos", params);
}
