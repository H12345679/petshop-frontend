import { get, postJson, put } from "../axios.js";

/**
 * 消息接口（对应后端 MessageController）。
 */

/** 管理员发送消息 POST /api/messages */
export function sendMessage(data) {
  return postJson("/messages", data);
}

/** 我的消息分页列表 GET /api/messages/my?current=&size= */
export function myMessages(params) {
  return get("/messages/my", params);
}

/** 标记单条已读 PUT /api/messages/my/{id}/read */
export function readMessage(id) {
  return put(`/messages/my/${id}/read`);
}

/** 全部已读 PUT /api/messages/my/read-all */
export function readAllMessages() {
  return put("/messages/my/read-all");
}

/** 未读数统计 GET /api/messages/my/unread-count */
export function unreadCount() {
  return get("/messages/my/unread-count");
}

/** 管理端历史消息分页 GET /api/messages/manage?current=&size= */
export function manageMessages(params) {
  return get("/messages/manage", params);
}
