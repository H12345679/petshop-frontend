import axios from "axios";
import qs from "qs";
import { getStore, removestore } from "../libs/storage.js";

// 统一 axios 实例：baseURL=/api（dev 下由 vue.config.js 代理到后端 8088）
const instance = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// 请求拦截：登录后自动带上 Authorization: Bearer <token>（后端 JwtInterceptor 认这个头）
instance.interceptors.request.use(config => {
  const token = getStore("token");
  if (token) {
    config.headers["Authorization"] = "Bearer " + token;
  }
  return config;
});

// 响应拦截：后端统一返回 { code, message, data }
instance.interceptors.response.use(
  res => {
    const result = res.data;
    // 成功：把 { code, message, data } 直接交给业务层
    if (result && result.code === 200) {
      return result;
    }
    // 未登录 / 过期：清本地登录态并跳登录页
    if (result && result.code === 401) {
      removestore("token");
      removestore("userInfo");
      if (location.pathname !== "/login") location.href = "/login";
      return Promise.reject(new Error(result.message || "未登录或登录已过期"));
    }
    // 其它（400 参数错 / 403 无权限 / 404 / 500）：把后端 message 抛出去
    return Promise.reject(new Error((result && result.message) || "请求失败"));
  },
  err => {
    if (err.response && err.response.status === 401) {
      removestore("token");
      removestore("userInfo");
      if (location.pathname !== "/login") location.href = "/login";
      return new Promise(() => {});
    }
    return Promise.reject(err);
  }
);

/** GET 查询（params 拼到 query string） */
export function get(url, params) {
  return instance.get(url, { params });
}

/** POST JSON（后端 @RequestBody 用这个） */
export function postJson(url, data) {
  return instance.post(url, data);
}

/** POST form-urlencoded（后端 @RequestParam 用这个） */
export function post(url, data) {
  return instance.post(url, qs.stringify(data, { allowDots: true }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/** PUT JSON */
export function put(url, data) {
  return instance.put(url, data);
}

/** DELETE（带 body） */
export function del(url, data) {
  return instance.delete(url, { data });
}

export default instance;
