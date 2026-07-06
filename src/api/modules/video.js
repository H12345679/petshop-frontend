import { get } from "../axios.js";

/** 获取视频列表：GET /api/videos */
export function getVideoList(params) {
  return get("/videos", params);
}

export function getManageVideoList(params) {
  return get("/videos/manage", params);
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

/** 上传视频文件：前端直传七牛云 */
export async function uploadVideoFile(file) {
  const { get } = require("../axios.js");
  const axios = require("axios");
  
  // 1. 获取七牛云直传凭证
  const res = await get("/files/upload-ticket", { dir: "videos", filename: file.name });
  if (!res || !res.data) throw new Error("无法获取上传凭证");
  const { token, key, url } = res.data;

  // 2. 组装表单数据直传七牛
  const formData = new FormData();
  formData.append("token", token);
  formData.append("key", key);
  formData.append("file", file);

  // 注意：直接调用原始 axios，避免触发后端 API 的 baseURL 和拦截器
  await axios.post("https://upload.qiniup.com", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  // 3. 模拟旧版后端响应格式返回，无缝兼容 Vue 组件
  return { code: 200, message: "success", data: { url } };
}
