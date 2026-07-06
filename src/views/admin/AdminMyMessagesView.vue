<template>
  <div id="admin-my-messages">
    <div class="page-head">
        <h2>🔔 我的消息</h2>
        <el-button size="small" @click="markAllRead" :disabled="!hasUnread">全部已读</el-button>
      </div>

      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <div v-else class="msg-list">
        <div
          v-for="msg in list"
          :key="msg.id"
          class="msg-item"
          :class="{ unread: msg.isRead === 0 }"
          @click="handleRead(msg)"
        >
          <div class="msg-head">
            <span class="msg-type" :class="'type-' + msg.type">{{ typeLabel(msg.type) }}</span>
            <span class="msg-title">{{ msg.title }}</span>
            <span class="msg-dot" v-if="msg.isRead === 0">●</span>
            <span class="msg-time">{{ formatTime(msg.createTime) }}</span>
          </div>
          <div class="msg-body">{{ msg.content }}</div>
        </div>

        <div v-if="list.length === 0" class="empty-state">暂无消息</div>
      </div>

      <!-- 分页 -->
      <el-pagination
        v-if="total > size"
        style="margin-top:20px;text-align:center"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="size"
        :current-page.sync="current"
        @current-change="loadMessages"
      />
  </div>
</template>

<script>
import { getMyMessages, readMessage, readAllMessages } from "@/api/modules/user.js";

const TYPE_MAP = { 1: "系统", 2: "订单", 3: "活动", 4: "宠物资讯" };

export default {
  name: "AdminMyMessagesView",
  data() {
    return {
      list: [],
      loading: true,
      total: 0,
      current: 1,
      size: 15,
    };
  },
  computed: {
    hasUnread() {
      return this.list.some(m => m.isRead === 0);
    },
  },
  created() {
    this.loadMessages();
  },
  methods: {
    typeLabel(t) {
      return TYPE_MAP[t] || "其他";
    },

    async loadMessages() {
      this.loading = true;
      try {
        const res = await getMyMessages({ current: this.current, size: this.size });
        const d = res.data || {};
        this.list = d.records || [];
        this.total = d.total || 0;
      } catch (e) {
        this.$message.error("加载消息失败");
      } finally {
        this.loading = false;
      }
    },

    async handleRead(msg) {
      if (msg.isRead === 1) return;
      try {
        await readMessage(msg.id);
        msg.isRead = 1;
      } catch (e) {
        /* ignore */
      }
    },

    async markAllRead() {
      try {
        await readAllMessages();
        this.list.forEach(m => (m.isRead = 1));
        this.$message.success("已全部标记为已读");
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      }
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 16).replace("T", " ");
    },
  },
};
</script>

<style scoped>
.page-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.page-head h2 { font-size: 20px; color: #2c3e50; margin: 0; }
.loading-wrap { padding: 40px; text-align: center; color: #595959; }
.msg-list { border-top: 1px solid #eee; }
.msg-item {
  padding: 16px; border-bottom: 1px solid #eee; cursor: pointer;
  transition: background 0.3s;
}
.msg-item:hover { background: #f9fafc; }
.msg-item.unread .msg-title { font-weight: bold; color: #333; }
.msg-head { display: flex; align-items: center; margin-bottom: 8px; }
.msg-type {
  font-size: 12px; padding: 2px 6px; border-radius: 4px; margin-right: 12px;
  background: #f0f2f5; color: #666;
}
.type-1 { background: #e6f7ff; color: #1890ff; }
.type-2 { background: #fff7e6; color: #fa8c16; }
.type-3 { background: #f6ffed; color: #52c41a; }
.msg-title { font-size: 15px; color: #666; }
.msg-dot { color: #f5222d; margin-left: 8px; font-size: 12px; }
.msg-time { margin-left: auto; font-size: 13px; color: #595959; }
.msg-body { font-size: 14px; color: #595959; line-height: 1.5; margin-top: 4px; }
.empty-state { padding: 60px 0; text-align: center; color: #595959; font-size: 15px; }
</style>
