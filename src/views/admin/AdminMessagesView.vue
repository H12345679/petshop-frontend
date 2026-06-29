<template>
  <div id="admin-msg-page">
    <h2 class="page-title">🔔 消息推送</h2>

    <el-card class="form-card">
      <el-form ref="form" :model="form" label-width="100px" size="small">
        <el-form-item label="消息标题" required>
          <el-input v-model="form.title" placeholder="如：系统维护通知" maxlength="100" />
        </el-form-item>

        <el-form-item label="消息类型" required>
          <el-radio-group v-model="form.type">
            <el-radio :label="1">系统</el-radio>
            <el-radio :label="2">订单</el-radio>
            <el-radio :label="3">活动</el-radio>
            <el-radio :label="4">宠物资讯</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="发送范围" required>
          <el-radio-group v-model="form.scope">
            <el-radio :label="1">📢 全体广播（所有用户都能收到）</el-radio>
            <el-radio :label="2">🎯 定向发送（指定用户）</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.scope === 2" label="目标用户" required>
          <el-input
            v-model="form.targetUserIdsInput"
            type="textarea"
            :rows="3"
            placeholder="输入用户ID，多个用逗号分隔，如：1,2,3"
          />
          <span class="form-tip">可从用户管理页面查看用户 ID</span>
        </el-form-item>

        <el-form-item label="消息内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="请输入消息正文…"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitSend" :loading="sending" size="medium">
            {{ form.scope === 1 ? '📢 发送广播' : '🎯 发送' }}
          </el-button>
          <el-button @click="resetForm" size="medium">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 发送记录（最近 10 条） -->
    <h3 style="margin: 24px 0 12px; font-size: 16px; color: #2c3e50;">📋 最近发送记录</h3>
    <el-table :data="history" v-loading="historyLoading" stripe border style="width:100%">
      <el-table-column prop="title" label="标题" min-width="140" />
      <el-table-column label="类型" width="80" align="center">
        <template slot-scope="{row}">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="范围" width="100" align="center">
        <template slot-scope="{row}">{{ row.scope === 1 ? '全体广播' : '定向' }}</template>
      </el-table-column>
      <el-table-column label="内容" min-width="200">
        <template slot-scope="{row}">
          <span class="content-preview">{{ row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发送时间" width="150" align="center">
        <template slot-scope="{row}">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
    </el-table>
    <div v-if="!historyLoading && history.length === 0" class="muted text-center" style="padding: 30px;">暂无发送记录</div>
  </div>
</template>

<script>
import { sendMessage, myMessages } from "@/api/modules/message.js";

const TYPE_MAP = { 1: "系统", 2: "订单", 3: "活动", 4: "宠物资讯" };

export default {
  name: "AdminMessagesView",
  data() {
    return {
      form: {
        title: "",
        type: 1,
        scope: 1,
        content: "",
        targetUserIdsInput: "",
      },
      sending: false,
      // 发送记录
      history: [],
      historyLoading: true,
    };
  },
  created() {
    this.loadHistory();
  },
  methods: {
    typeLabel(t) {
      return TYPE_MAP[t] || "其他";
    },

    async loadHistory() {
      this.historyLoading = true;
      try {
        // 复用 myMessages API 查看历史发送（admin 视角，能看到所有消息）
        const res = await myMessages({ current: 1, size: 10 });
        const d = res.data || {};
        this.history = d.records || [];
      } catch (e) {
        // 静默失败
      } finally {
        this.historyLoading = false;
      }
    },

    async submitSend() {
      const f = this.form;
      if (!f.title.trim()) return this.$message.warning("请输入消息标题");
      if (!f.content.trim()) return this.$message.warning("请输入消息内容");

      const payload = {
        title: f.title.trim(),
        type: f.type,
        scope: f.scope,
        content: f.content.trim(),
      };

      if (f.scope === 2) {
        const ids = f.targetUserIdsInput
          .split(/[,，\s]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .map(Number)
          .filter(n => !isNaN(n) && n > 0);
        if (ids.length === 0) return this.$message.warning("请输入有效的目标用户 ID");
        payload.targetUserIds = ids;
      }

      this.sending = true;
      try {
        await sendMessage(payload);
        this.$message.success("消息发送成功！");
        this.resetForm();
        this.loadHistory();
      } catch (e) {
        this.$message.error(e.message || "发送失败");
      } finally {
        this.sending = false;
      }
    },

    resetForm() {
      this.form = {
        title: "",
        type: 1,
        scope: 1,
        content: "",
        targetUserIdsInput: "",
      };
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 16).replace("T", " ");
    },
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 16px; }
.form-card { max-width: 700px; }
.form-tip { margin-left: 8px; font-size: 12px; color: #999; }
.content-preview {
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5;
}
.muted { color: #999; }
.text-center { text-align: center; }
</style>
