<template>
  <div class="ai-chat-float-wrapper">
    <!-- 悬浮按钮 -->
    <div 
      class="float-btn" 
      v-show="!visible" 
      @click="visible = true"
      title="常驻悬浮按钮">
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
          <!-- 消息列表 -->
          <div 
            v-for="(msg, index) in messages" 
            :key="index"
            class="msg-row"
            :class="{ 'is-user': msg.role === 'user' }">
            
            <div class="avatar" v-if="msg.role === 'ai'">AI</div>
            <div class="bubble">
              <div v-html="formatText(msg.content)"></div>
            </div>
          </div>
          
          <div class="msg-row" v-if="loading">
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
import { aiChat, getAiHistory } from "@/api/modules/ai.js";

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
      loading: false
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
      // 尝试加载历史记录
      this.loadHistory();
    },
    async loadHistory() {
      try {
        const res = await getAiHistory({ sessionId: this.sessionId });
        if (res.data && res.data.length > 0) {
          // 清空初始欢迎语，换成真实历史
          this.messages = [];
          res.data.forEach(item => {
            if (item.question) this.messages.push({ role: 'user', content: item.question });
            if (item.answer) this.messages.push({ role: 'ai', content: item.answer });
          });
          this.scrollToBottom();
        }
      } catch (e) {
        // 如果后端报错（比如未登录），就忽略，作为新会话
      }
    },
    formatText(text) {
      if (!text) return "";
      return text.replace(/\n/g, '<br/>');
    },
    async handleSend() {
      const text = this.inputVal.trim();
      if (!text) return;
      
      this.messages.push({ role: 'user', content: text });
      this.inputVal = "";
      this.scrollToBottom();
      
      this.loading = true;
      try {
        const res = await aiChat({
          sessionId: this.sessionId,
          question: text
        });
        if (res.data && res.data.answer) {
          this.messages.push({ role: 'ai', content: res.data.answer });
        } else {
          this.messages.push({ role: 'ai', content: '抱歉，我没有理解您的问题。' });
        }
      } catch (e) {
        this.messages.push({ role: 'ai', content: '网络异常，请稍后再试。' });
      } finally {
        this.loading = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const box = this.$refs.chatBody;
        if (box) {
          box.scrollTop = box.scrollHeight;
        }
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
  background: #5b8def;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(91, 141, 239, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  transition: transform 0.2s;
}
.float-btn:hover {
  transform: scale(1.05);
}

.chat-window {
  width: 320px;
  height: 480px;
  background: #f7f8fa;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  right: 0;
}

.chat-header {
  height: 48px;
  background: #5b8def;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-weight: 500;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.action-btn {
  cursor: pointer;
  font-size: 16px;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.action-btn:hover {
  opacity: 1;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f7f8fa;
}

.msg-row {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}
.msg-row.is-user {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #dbe4f0;
  color: #5b8def;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin: 0 8px;
}
.is-user .avatar {
  display: none; /* 用户通常不显示头像或放右边 */
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
.msg-row:not(.is-user) .bubble {
  background: #e4e7ed;
  color: #333;
  border-top-left-radius: 2px;
}
.msg-row.is-user .bubble {
  background: #5b8def;
  color: #fff;
  border-top-right-radius: 2px;
}
.bubble.typing {
  color: #999;
  font-style: italic;
}

.chat-footer {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

/* 动画 */
.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.3s;
}
.fade-up-enter, .fade-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
