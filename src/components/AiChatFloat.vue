<template>
  <div class="ai-chat-float-wrapper">
    <!-- 悬浮按钮 -->
    <div
      class="float-btn"
      v-show="!visible"
      @click="visible = true"
      title="智能养宠助手">
      <div class="icon">🐾</div>
    </div>

    <!-- 弹窗 -->
    <transition name="fade-up">
      <div class="chat-window" v-show="visible">
        <div class="chat-header">
          <div class="title">🐾 智能养宠助手</div>
          <div class="header-actions">
            <span class="action-btn" @click="goToFullPage" title="独立聊天页">⤢</span>
            <span class="action-btn" @click="visible = false" title="隐藏">－</span>
          </div>
        </div>

        <div class="chat-body" ref="chatBody">
          <!-- 历史消息列表 -->
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="msg-row"
            :class="{ 'is-user': msg.role === 'user' }">
            <div class="avatar" v-if="msg.role === 'ai'">AI</div>
            <div class="bubble">
              <div v-html="formatText(msg.content)" @click="handleChatClick"></div>
            </div>
          </div>

          <!-- 流式输出中的消息（打字机效果） -->
          <div class="msg-row" v-if="currentAiMessage">
            <div class="avatar">AI</div>
            <div class="bubble">
              <div v-html="formatText(currentAiMessage)" @click="handleChatClick"></div>
            </div>
          </div>

          <!-- 等待第一个字节时显示"正在输入..." -->
          <div class="msg-row" v-if="loading && !currentAiMessage">
            <div class="avatar">AI</div>
            <div class="bubble typing">正在输入...</div>
          </div>
        </div>

        <div class="chat-footer">
          <el-input
            v-model="inputVal"
            placeholder="发消息..."
            @keyup.enter.native="handleSend"
            class="chat-input"
            size="small"
          >
            <template slot="append">
              <el-button type="primary" @click="handleSend" :loading="loading" size="small">发送</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { getAiHistory } from "@/api/modules/ai.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AiChatFloat",
  data() {
    return {
      visible: false,
      inputVal: "",
      messages: [
        { role: 'ai', content: '您好，有养宠问题尽管问我~' }
      ],
      sessionId: "",
      loading: false,
      currentAiMessage: ""
    };
  },
  created() {
    this.initSession();
  },
  methods: {
    initSession() {
      let sid = localStorage.getItem("ai_current_session");
      if (!sid) {
        sid = 'session_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        localStorage.setItem("ai_current_session", sid);
      }
      this.sessionId = sid;
      this.loadHistory();
    },
    async loadHistory() {
      try {
        const res = await getAiHistory({ sessionId: this.sessionId });
        if (res.data && res.data.length > 0) {
          this.messages = [];
          res.data.forEach(item => {
            if (item.question) this.messages.push({ role: 'user', content: item.question });
            if (item.answer) this.messages.push({ role: 'ai', content: item.answer });
          });
          this.scrollToBottom();
        }
      } catch (e) {
        // 未登录或网络异常时忽略
      }
    },
    formatText(text) {
      if (!text) return "";
      let html = text
        // 0. 防御 XSS：转义 < 和 >
        .replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, '<a data-link="$2" class="ai-product-link" style="color:#5b8def;cursor:pointer;text-decoration:underline;">$1</a>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a data-link="$2" class="ai-product-link" style="color:#5b8def;cursor:pointer;text-decoration:underline;">$1</a>')
        .replace(/(【[^】]+】)\s*[（(]\s*(\/product\/\d+)\s*[）)]/g, '<a data-link="$2" class="ai-product-link" style="color:#5b8def;cursor:pointer;text-decoration:underline;">$1</a>')
        .replace(/\*\*([^*<>]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      return html;
    },
    handleChatClick(e) {
      const target = e.target;
      if (target.classList.contains('ai-product-link')) {
        const link = target.getAttribute('data-link');
        if (link) {
          this.visible = false;
          this.$router.push(link);
        }
      }
    },
    async handleSend() {
      const text = this.inputVal.trim();
      if (!text || this.loading) return;

      this.messages.push({ role: 'user', content: text });
      this.inputVal = "";
      this.scrollToBottom();

      this.loading = true;
      this.currentAiMessage = "";

      try {
        const token = getStore("token") || "";
        const response = await fetch('http://localhost:8088/api/ai/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            question: text
          })
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (let line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.substring(5).trim();
              if (!jsonStr) continue;
              try {
                const obj = JSON.parse(jsonStr);
                if (obj.text) {
                  this.currentAiMessage += obj.text;
                  this.scrollToBottom();
                }
              } catch (e) { /* ignore */ }
            }
          }
        }

        if (this.currentAiMessage) {
          this.messages.push({ role: 'ai', content: this.currentAiMessage });
          this.currentAiMessage = "";
        }
      } catch (e) {
        this.currentAiMessage = "";
        this.messages.push({ role: 'ai', content: '网络异常，请稍后再试。' });
      } finally {
        this.loading = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const box = this.$refs.chatBody;
        if (box) box.scrollTop = box.scrollHeight;
      });
    },
    goToFullPage() {
      this.visible = false;
      if (this.$route.path !== '/ai-chat') {
        this.$router.push('/ai-chat');
      }
    }
  }
};
</script>

<style scoped>
.ai-chat-float-wrapper {
  position: fixed;
  right: 40px;
  bottom: 80px;
  z-index: 9999;
}

.float-btn {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #5b8def, #7a6fdf);
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(91, 141, 239, 0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(91, 141, 239, 0.55);
}

.chat-window {
  width: 340px;
  height: 500px;
  background: #f7f8fa;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  right: 0;
}

.chat-header {
  height: 50px;
  background: linear-gradient(135deg, #5b8def, #7a6fdf);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}
.header-actions { display: flex; align-items: center; gap: 12px; }
.action-btn { cursor: pointer; font-size: 16px; opacity: 0.8; transition: opacity 0.2s; }
.action-btn:hover { opacity: 1; }

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f7f8fa;
}

.msg-row { display: flex; margin-bottom: 14px; align-items: flex-start; }
.msg-row.is-user { flex-direction: row-reverse; }

.avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, #dbe4f0, #c8d5ee);
  color: #5b8def;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: bold; flex-shrink: 0; margin: 0 8px;
}
.is-user .avatar { display: none; }

.bubble {
  max-width: 78%; padding: 10px 14px; border-radius: 12px;
  font-size: 13px; line-height: 1.55; word-break: break-word;
}
.msg-row:not(.is-user) .bubble {
  background: #ffffff; color: #333; border-top-left-radius: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}
.msg-row.is-user .bubble {
  background: linear-gradient(135deg, #5b8def, #7a6fdf);
  color: #fff; border-top-right-radius: 2px;
}
.bubble.typing { color: #999; font-style: italic; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }

.chat-footer {
  padding: 12px; background: #fff;
  border-top: 1px solid #ebeef5; flex-shrink: 0;
}

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
.fade-up-enter, .fade-up-leave-to { opacity: 0; transform: translateY(16px) scale(0.96); }
</style>
