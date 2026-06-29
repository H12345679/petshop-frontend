<template>
  <div class="msg-center-page">
    <AppHeader />

    <div class="container">
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

    <AppFooter />
  </div>
</template>

<script>
import { myMessages, readMessage, readAllMessages } from "@/api/modules/message.js";

const TYPE_MAP = { 1: "系统", 2: "订单", 3: "活动", 4: "宠物资讯" };

export default {
  name: "MessageCenterView",
  components: { AppHeader: () => import("@/components/AppHeader.vue"), AppFooter: () => import("@/components/AppFooter.vue") },
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
        const res = await myMessages({ current: this.current, size: this.size });
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
.msg-center-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }
.container { width: 900px; max-width: 100%; margin: 0 auto; padding: 24px 16px 60px; flex: 1; }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-head h2 { font-size: 20px; font-weight: 700; color: #2c3e50; }
.loading-wrap, .empty-state { text-align: center; padding: 80px 0; color: #999; font-size: 15px; }

.msg-list { display: flex; flex-direction: column; gap: 10px; }
.msg-item {
  background: #fff; border-radius: 10px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); cursor: pointer;
  border-left: 4px solid transparent; transition: all 0.2s;
}
.msg-item:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.msg-item.unread { border-left-color: #5b8def; background: #f8faff; }
.msg-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.msg-type {
  font-size: 11px; padding: 2px 8px; border-radius: 100px; font-weight: 600;
  background: #eef4fe; color: #5b8def; flex-shrink: 0;
}
.msg-type.type-2 { background: #fef3e2; color: #e5a452; }
.msg-type.type-3 { background: #fde8e8; color: #e74c3c; }
.msg-type.type-4 { background: #e8f5e9; color: #2e7d32; }
.msg-title { font-weight: 600; font-size: 14px; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-dot { color: #e74c3c; font-size: 12px; flex-shrink: 0; }
.msg-time { font-size: 12px; color: #bbb; flex-shrink: 0; }
.msg-body { font-size: 13px; color: #666; line-height: 1.6; padding-left: 4px; }
</style>
