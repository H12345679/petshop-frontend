<template>
  <div class="panel">
    <div class="panel-head">
      <h3>消息中心</h3>
      <button class="btn outline sm" @click="doReadAllMessages">全部已读</button>
    </div>
    <div v-if="loadingMessages" class="empty">加载中…</div>
    <div v-else-if="messages.length === 0" class="empty">暂无消息</div>
    <div v-else class="msg-list">
      <div
        v-for="m in messages"
        :key="m.id"
        :class="['msg-card', { unread: m.isRead === 0 }]"
        @click="openMessage(m)"
      >
        <div class="msg-dot" v-if="m.isRead === 0"></div>
        <div class="msg-body">
          <div class="msg-title">{{ m.title }}</div>
          <div class="msg-preview">{{ m.content }}</div>
          <div class="msg-time">{{ m.createTime }}</div>
        </div>
        <span class="msg-type-tag">{{ messageTypeLabel(m.type) }}</span>
      </div>
    </div>
    <div class="pager" v-if="messagePages > 1">
      <button class="btn sm" :disabled="messagePage <= 1" @click="loadMessages(messagePage - 1)">上一页</button>
      <span class="pager-info">{{ messagePage }} / {{ messagePages }}</span>
      <button class="btn sm" :disabled="messagePage >= messagePages" @click="loadMessages(messagePage + 1)">下一页</button>
    </div>

    <!-- 消息详情弹窗 -->
    <div class="modal-overlay" v-if="detailMessage" @click.self="detailMessage = null">
      <div class="modal-box">
        <h4>{{ detailMessage.title }}</h4>
        <div class="msg-type-tag flat">{{ messageTypeLabel(detailMessage.type) }}</div>
        <p class="modal-content">{{ detailMessage.content }}</p>
        <div class="modal-time">{{ detailMessage.createTime }}</div>
        <button class="btn" @click="detailMessage = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getMyMessages, readMessage, readAllMessages } from "@/api/modules/user.js";

export default {
  name: "UserMessages",
  data() {
    return {
      messages: [],
      messagePage: 1,
      messagePages: 1,
      loadingMessages: false,
      detailMessage: null,
    };
  },
  created() {
    this.loadMessages(1);
  },
  methods: {
    async loadMessages(page) {
      this.messagePage = page || this.messagePage;
      this.loadingMessages = true;
      try {
        const res = await getMyMessages({ current: this.messagePage, size: 10 });
        const d = res.data || {};
        this.messages = d.records || [];
        this.messagePages = d.pages || 1;
      } catch (e) {
        this.messages = [];
      } finally {
        this.loadingMessages = false;
      }
    },
    async openMessage(m) {
      this.detailMessage = m;
      if (m.isRead === 0) {
        try {
          await readMessage(m.id);
          m.isRead = 1;
        } catch (e) { /* ignore */ }
      }
    },
    async doReadAllMessages() {
      try {
        await readAllMessages();
        this.messages.forEach(m => { m.isRead = 1; });
        this.$emit('notify', "success", "已全部标为已读");
      } catch (e) {
        this.$emit('notify', "error", e.message || "操作失败");
      }
    },
    messageTypeLabel(t) {
      const map = { 1:'系统', 2:'订单', 3:'活动', 4:'资讯' };
      return map[t] || '通知';
    }
  }
};
</script>

<style scoped>
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0; font-size: 16px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }

/* 消息中心 */
.msg-list { display: flex; flex-direction: column; gap: 6px; }
.msg-card {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border: 1px solid #eef0f3; border-radius: 8px; cursor: pointer; transition: .12s;
}
.msg-card:hover { background: #fafbfc; }
.msg-card.unread { background: #f7faff; border-color: #d6e3f5; }
.msg-dot { width: 8px; height: 8px; border-radius: 50%; background: #2a69d4; flex-shrink: 0; }
.msg-body { flex: 1; min-width: 0; }
.msg-title { font-size: 14px; font-weight: 600; color: #333; }
.msg-preview { font-size: 12px; color: #595959; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.msg-time { font-size: 11px; color: #aaa; margin-top: 4px; }
.msg-type-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f0f3fa; color: #6a7c9c; flex-shrink: 0;
}
.msg-type-tag.flat { display: inline-block; margin: 8px 0; }

/* 消息弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 28px; max-width: 520px; width: 90%; max-height: 70vh; overflow-y: auto;
}
.modal-box h4 { margin: 0 0 8px; font-size: 17px; }
.modal-content { font-size: 14px; color: #555; line-height: 1.7; margin: 12px 0; white-space: pre-wrap; }
.modal-time { font-size: 12px; color: #aaa; margin-bottom: 14px; }

/* 分页 */
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; }
.pager-info { font-size: 13px; color: #595959; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.sm { padding: 5px 14px; font-size: 12px; }
.btn.outline { border-color: #2a69d4; color: #2a69d4; }
.btn.outline:hover { background: #e7eefc; }

.empty { padding: 24px 0; text-align: center; color: #595959; font-size: 13px; }
</style>
