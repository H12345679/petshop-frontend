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

/** 发送邮箱验证码：POST /api/auth/email/send-code  body { email } */
export function sendEmailCode(email) {
  return postJson("/auth/email/send-code", { email });
}

/** 邮箱验证码登录：POST /api/auth/email/login  body { email, code } */
export function emailLogin(email, code) {
  return postJson("/auth/email/login", { email, code });
}
