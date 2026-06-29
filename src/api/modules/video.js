import { get } from "../axios.js";

/** 获取视频列表：GET /api/videos */
export function getVideoList(params) {
  return get("/videos", params);
}

/** 获取视频详情：GET /api/videos/{id} */
export function getVideoDetail(id) {
  return get(`/videos/${id}`);
}

/** 创建视频：POST /api/videos */
export function createVideo(data) {
  const { postJson } = require("../axios.js");
  return postJson("/videos", data);
}

/** 更新视频：PUT /api/videos/{id} */
export function updateVideo(id, data) {
  const { put } = require("../axios.js");
  return put(`/videos/${id}`, data);
}

/** 删除视频：DELETE /api/videos/{id} */
export function deleteVideo(id) {
  const { del } = require("../axios.js");
  return del(`/videos/${id}`);
}

/** 上传视频文件：POST /api/files/video */
export function uploadVideoFile(file) {
  const { upload } = require("../axios.js");
  const formData = new FormData();
  formData.append("file", file);
  return upload("/files/video", formData);
}
