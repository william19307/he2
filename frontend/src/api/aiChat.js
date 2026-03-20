import request from '@/utils/request'

/** 心理老师查看某次 AI 倾诉会话消息（含操作日志） */
export function getAiChatSessionMessages(sessionId) {
  return request.get(`/ai-chat/sessions/${sessionId}/messages`)
}
