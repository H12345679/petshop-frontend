import { get, postJson } from "../axios";

/** 
 * 获取历史会话列表：GET /api/ai/chat/sessions 
 */
export function getAiSessions() {
  return get("/ai/chat/sessions");
}

/** 
 * 获取具体会话的历史消息：GET /api/ai/chat/history 
 * params: { sessionId }
 */
export function getAiHistory(params) {
  return get("/ai/chat/history", params);
}
