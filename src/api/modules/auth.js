import { postJson } from "../axios.js";

/**
 * 用户认证相关接口（对应后端 B 模块 AuthController）。
 */

/** 登录：POST /api/auth/login  body { username, password } -> data { token, user } */
export function login(data) {
  return postJson("/auth/login", data);
}

/** 注册：POST /api/auth/register  body { username, password, nickname?, phone?, email? } */
export function register(data) {
  return postJson("/auth/register", data);
}
