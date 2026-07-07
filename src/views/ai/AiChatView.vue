<template>
  <div class="ai-chat-page">
    <AppHeader />
    <div class="container">
      <div class="chat-layout">
        <!-- 左侧：历史对话列表 -->
        <div class="sidebar">
          <div class="brand">
            <span class="icon">🐾</span> 宠物商城
          </div>
          
          <div class="new-chat-btn" @click="handleNewChat">
            + 新对话
          </div>
          
          <div class="history-title">历史对话</div>
          <div class="history-list">
            <div 
              class="history-item"
              v-for="session in sessions" 
              :key="session.sessionId"
              :class="{ active: currentSessionId === session.sessionId }"
              @click="switchSession(session.sessionId)"
              :title="session.title"
            >
              {{ session.title }}
            </div>
            <div class="empty-tip" v-if="sessions.length === 0">暂无历史对话</div>
          </div>
        </div>
        
        <!-- 右侧：聊天区 -->
        <div class="main-chat">
          <div class="chat-header">
            <div class="user-info" v-if="userInfo">
              <span class="avatar">👤</span> 
              <span>{{ userInfo.nickname || userInfo.username }}</span>
            </div>
            <div class="user-info" v-else @click="$router.push('/login')" style="cursor: pointer;">
              <span class="avatar">👤</span> 
              <span>未登录 (点击登录)</span>
            </div>
          </div>
          
          <div class="chat-body" ref="chatBody">
            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              class="msg-row"
              :class="{ 'is-user': msg.role === 'user' }">
              
              <div class="avatar" v-if="msg.role === 'ai'">AI</div>
              <div class="bubble">
                <div v-safe-html="formatText(msg.content)" @click="handleChatClick"></div>
              </div>
            </div>
            
            <div class="msg-row" v-if="loading && (!currentAiMessage || currentAiMessage === '')">
              <div class="avatar">AI</div>
              <div class="bubble typing">正在思考...</div>
            </div>
            
            <div class="msg-row" v-if="currentAiMessage">
              <div class="avatar">AI</div>
              <div class="bubble">
                <div v-safe-html="formatText(currentAiMessage)" @click="handleChatClick"></div>
              </div>
            </div>
          </div>
          
          <div class="chat-footer">
            <div class="quick-questions">
              <span class="quick-btn" @click="sendQuick('猫咪疫苗时间？')">猫咪疫苗时间？</span>
              <span class="quick-btn" @click="sendQuick('狗狗驱虫频率？')">狗狗驱虫频率？</span>
              <span class="quick-btn" @click="sendQuick('幼猫吃什么？')">幼猫吃什么？</span>
            </div>
            <div class="input-area">
              <el-input 
                v-model="inputVal" 
                placeholder="输入您的养宠问题..." 
                @keyup.enter.native="handleSend"
                class="chat-input"
              >
                <template slot="append">
                  <el-button type="primary" @click="handleSend" :loading="loading">发送</el-button>
                </template>
              </el-input>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";
import { getAiHistory, getAiSessions } from "@/api/modules/ai.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AiChatView",
  components: {
    AppHeader
  },
  data() {
    return {
      userInfo: null,
      sessions: [],
      currentSessionId: "",
      messages: [],
      inputVal: "",
      loading: false,
      currentAiMessage: ""
    };
  },
  created() {
    const u = getStore("userInfo");
    if (u) {
      try { this.userInfo = JSON.parse(u); } catch (e) { /* ignore */ }
    }
    this.initPage();
  },
  methods: {
    async initPage() {
      // 1. 获取本地记录的当前会话（悬浮窗可能创建了）
      let sid = localStorage.getItem("ai_current_session");
      if (!sid) {
        sid = 'session_' + Date.now() + '_' + (window.crypto.getRandomValues(new Uint32Array(1))[0] % 1000);
        localStorage.setItem("ai_current_session", sid);
      }
      this.currentSessionId = sid;
      
      // 2. 如果已登录，拉取后端历史会话列表
      if (this.userInfo) {
        await this.loadSessions();
      }
      
      // 3. 加载当前会话内容
      await this.loadHistory();
    },
    async loadSessions() {
      try {
        const res = await getAiSessions();
        if (res.data) {
          this.sessions = res.data;
          // 如果后端列表里没有本地生成的这个 sid，为了方便，我们可以手动插到列表最前面，或者等发了消息后再刷新列表
          const exists = this.sessions.find(s => s.sessionId === this.currentSessionId);
          if (!exists && this.messages.length > 0) {
            // 但此时 messages 还没加载，不急，发送消息成功后再 loadSessions
          }
        }
      } catch (e) {
        console.error("加载会话列表失败", e);
      }
    },
    async loadHistory() {
      this.messages = [];
      try {
        const res = await getAiHistory({ sessionId: this.currentSessionId });
        if (res.data && res.data.length > 0) {
          res.data.forEach(item => {
            if (item.question) this.messages.push({ role: 'user', content: item.question });
            if (item.answer) this.messages.push({ role: 'ai', content: item.answer });
          });
        } else {
          this.messages.push({ role: 'ai', content: '您好！我是养宠智能助手🐾 可以为您解答养宠、用药、选品等问题，请问有什么可以帮您？' });
        }
        this.scrollToBottom();
      } catch (e) {
        this.messages.push({ role: 'ai', content: '您好！我是养宠智能助手🐾 可以为您解答养宠、用药、选品等问题，请问有什么可以帮您？' });
      }
    },
    handleNewChat() {
      const randomArr = new Uint32Array(1);
      globalThis.crypto.getRandomValues(randomArr);
      const sid = 'session_' + Date.now() + '_' + (randomArr[0] % 1000);
      localStorage.setItem("ai_current_session", sid);
      this.currentSessionId = sid;
      this.messages = [
        { role: 'ai', content: '您好！我是养宠智能助手🐾 可以为您解答养宠、用药、选品等问题，请问有什么可以帮您？' }
      ];
    },
    switchSession(sid) {
      if (this.currentSessionId === sid) return;
      this.currentSessionId = sid;
      localStorage.setItem("ai_current_session", sid);
      this.loadHistory();
    },
    formatText(text) {
      if (!text) return "";
      let html = text
        // 0. 防御 XSS：转义 < 和 >
        .replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        // 1. 处理 **[text](url)** 格式（加粗包裹的标准链接）
        .replace(/\*\*\[([^[\]\n]+)\]\(([^()\n]+)\)\*\*/g, '<a data-link="$2" class="ai-product-link" style="color:#2a69d4;cursor:pointer;text-decoration:underline;">$1</a>')
        // 2. 处理普通标准 [text](url) 格式
        .replace(/\[([^[\]\n]+)\]\(([^()\n]+)\)/g, '<a data-link="$2" class="ai-product-link" style="color:#2a69d4;cursor:pointer;text-decoration:underline;">$1</a>')
        // 3. 兜底：【name】（ /product/123 ）或 【name】( /product/123 ) — 全角/半角括号带空格
        .replace(/(【[^【】\n]+】)[ \t]*[（(][ \t]*(\/product\/\d+)[ \t]*[）)]/g, '<a data-link="$2" class="ai-product-link" style="color:#2a69d4;cursor:pointer;text-decoration:underline;">$1</a>')
        // 4. 处理 **文字** 加粗（排除已转换的 <a> 标签内容）
        .replace(/\*\*([^*<>\n]+)\*\*/g, '<strong>$1</strong>')
        // 5. 换行
        .replaceAll("\n", "<br/>");
      return html;
    },
    handleChatClick(e) {
      const target = e.target;
      if (target.classList.contains('ai-product-link')) {
        const link = target.dataset.link;
        if (link) {
          this.$router.push(link);
        }
      }
    },
    sendQuick(text) {
      this.inputVal = text;
      this.handleSend();
    },
    processStreamLines(lines) {
      for (let line of lines) {
        if (line.startsWith('data:')) {
          let jsonStr = line.substring(5).trim();
          if (jsonStr !== "") {
            try {
              let obj = JSON.parse(jsonStr);
              if (obj.text) {
                this.currentAiMessage += obj.text;
              }
            } catch (e) {
              console.warn("ignored", e);
              // ignore parse errors
            }
          }
        }
      }
    },
    async handleSend() {
      const text = this.inputVal.trim();
      if (!text) return;
      
      this.messages.push({ role: 'user', content: text });
      this.inputVal = "";
      this.scrollToBottom();
      
      this.loading = true;
      this.currentAiMessage = "";
      
      try {
        const token = getStore("token") || "";
        // 动态获取当前主机名（支持 localhost 及局域网 IP），开发环境直连后端 8088 端口，跳过 webpack-dev-server 缓冲从而保证流式输出
        const streamUrl = process.env.NODE_ENV === 'production' 
          ? '/api/ai/chat/stream' 
          : `${globalThis.location.protocol}//${globalThis.location.hostname}:8088/api/ai/chat/stream`;
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            sessionId: this.currentSessionId,
            question: text
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 保留最后一行（可能不完整）在 buffer 中，等下次拼
          
          this.processStreamLines(lines);
          this.scrollToBottom();
        }

        if (this.currentAiMessage) {
          this.messages.push({ role: 'ai', content: this.currentAiMessage });
          this.currentAiMessage = "";
        } else {
          this.messages.push({ role: 'ai', content: '抱歉，我没有理解您的问题。' });
        }
        
        if (this.userInfo) {
          this.loadSessions();
        }
      } catch (e) {
        console.error(e);
        this.messages.push({ role: 'ai', content: '网络异常，请稍后再试。' });
      } finally {
        this.loading = false;
        this.currentAiMessage = "";
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
    }
  }
};
</script>

<style scoped>
.ai-chat-page {
  background: #f4f5f7;
  min-height: 100vh;
  padding-bottom: 24px;
}
.container {
  width: 1200px;
  max-width: 100%;
  margin: 0 auto;
  padding-top: 24px;
}
.chat-layout {
  display: flex;
  height: 80vh;
  min-height: 600px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  overflow: hidden;
}

/* 左侧边栏 */
.sidebar {
  width: 260px;
  background: #f8f9fa;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
}
.brand {
  font-size: 18px;
  font-weight: bold;
  color: #2a69d4;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
}
.brand .icon {
  margin-right: 8px;
  font-size: 24px;
}
.new-chat-btn {
  background: #2a69d4;
  color: #fff;
  text-align: center;
  padding: 10px 0;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 24px;
  transition: opacity 0.2s;
}
.new-chat-btn:hover {
  opacity: 0.9;
}
.history-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 12px;
}
.history-list {
  flex: 1;
  overflow-y: auto;
}
.history-item {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
}
.history-item:hover {
  border-color: #2a69d4;
  color: #2a69d4;
}
.history-item.active {
  border-color: #164082;
  background: #f0f5ff;
  color: #164082;
}
.empty-tip {
  font-size: 13px;
  color: #595959;
  text-align: center;
  margin-top: 20px;
}

/* 右侧聊天区 */
.main-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.chat-header {
  height: 60px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
}
.user-info {
  display: flex;
  align-items: center;
  color: #606266;
  font-size: 14px;
}
.user-info .avatar {
  margin-right: 8px;
  font-size: 18px;
}

.chat-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.msg-row {
  display: flex;
  margin-bottom: 24px;
  align-items: flex-start;
}
.msg-row.is-user {
  flex-direction: row-reverse;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #dbe4f0;
  color: #2a69d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  margin: 0 16px;
}
.is-user .avatar {
  display: none;
}

.bubble {
  max-width: 65%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.msg-row:not(.is-user) .bubble {
  background: #f4f5f7;
  color: #333;
  border-top-left-radius: 2px;
}
.msg-row.is-user .bubble {
  background: #2a69d4;
  color: #fff;
  border-top-right-radius: 2px;
}
.bubble.typing {
  color: #595959;
  font-style: italic;
}

.chat-footer {
  padding: 20px 24px;
  border-top: 1px solid #ebeef5;
}
.quick-questions {
  margin-bottom: 12px;
  display: flex;
  gap: 12px;
}
.quick-btn {
  padding: 6px 12px;
  background: #f4f5f7;
  border-radius: 16px;
  font-size: 13px;
  color: #434a54;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-btn:hover {
  background: #ebeef5;
  color: #164082;
}
.input-area {
  margin-bottom: 12px;
}
.footer-tip {
  font-size: 12px;
  color: #994d00;
  background: #fdf6ec;
  padding: 8px 12px;
  border-radius: 4px;
}
</style>
