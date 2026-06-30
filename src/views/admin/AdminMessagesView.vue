<template>
  <div id="admin-msg-page">
    <h2 class="page-title">🔔 消息推送</h2>

    <div class="push-layout">
      <!-- 发送表单 -->
      <el-card class="form-card">
        <div slot="header"><b>发送新消息</b></div>
        <el-form ref="form" :model="form" label-width="90px" size="small">
          <el-form-item label="消息标题" required>
            <el-input v-model="form.title" placeholder="如：系统维护通知" maxlength="100" />
          </el-form-item>

          <el-form-item label="消息类型" required>
            <div class="tag-group">
              <span v-for="t in typeOptions" :key="t.value"
                :class="['type-tag', { active: form.type === t.value }]"
                @click="form.type = t.value"
              >{{ t.label }}</span>
            </div>
          </el-form-item>

          <el-form-item label="发送范围" required>
            <div class="tag-group">
              <span v-for="s in scopeOptions" :key="s.value"
                :class="['scope-tag', { active: form.scope === s.value }]"
                @click="form.scope = s.value"
              >{{ s.label }}</span>
            </div>
          </el-form-item>

          <el-form-item v-if="form.scope === 2" label="目标用户" required>
            <el-input
              v-model="form.targetUserIdsInput"
              type="textarea"
              :rows="3"
              placeholder="输入用户ID，多个用逗号分隔，如：1,2,3"
            />
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
              {{ form.scope === 1 ? '📢 立即推送' : '🎯 发送' }}
            </el-button>
            <el-button @click="resetForm" size="medium">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 历史记录 -->
      <div class="history-section">
        <h3 class="section-title">📋 发送记录</h3>
        <el-table :data="history" v-loading="historyLoading" stripe border style="width:100%">
          <el-table-column prop="title" label="标题" min-width="140" />
          <el-table-column label="类型" width="80" align="center">
            <template slot-scope="{row}">{{ typeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column label="范围" width="90" align="center">
            <template slot-scope="{row}">{{ row.scope === 1 ? '广播' : '定向' }}</template>
          </el-table-column>
          <el-table-column label="已读率" width="80" align="center">
            <template slot-scope="{row}">{{ row.readRate || '--' }}</template>
          </el-table-column>
          <el-table-column label="发送时间" width="150" align="center">
            <template slot-scope="{row}">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
        </el-table>
        <div v-if="!historyLoading && history.length === 0" class="muted text-center" style="padding:30px">暂无发送记录</div>
        <el-pagination
          v-if="historyTotal > historySize"
          style="margin-top:16px;text-align:center"
          layout="total, prev, pager, next"
          :total="historyTotal"
          :page-size="historySize"
          :current-page.sync="historyCurrent"
          @current-change="loadHistory"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { sendMessage, manageMessages } from "@/api/modules/message.js";

const TYPE_MAP = { 1: "系统", 2: "订单", 3: "活动", 4: "宠物资讯" };

export default {
  name: "AdminMessagesView",
  data() {
    return {
      typeOptions: [
        { label: "1 系统", value: 1 },
        { label: "2 订单", value: 2 },
        { label: "3 活动", value: 3 },
        { label: "4 宠物资讯", value: 4 },
      ],
      scopeOptions: [
        { label: "1 全体广播", value: 1 },
        { label: "2 定向用户", value: 2 },
      ],
      form: {
        title: "", type: 1, scope: 1, content: "", targetUserIdsInput: "",
      },
      sending: false,
      history: [],
      historyLoading: true,
      historyCurrent: 1,
      historySize: 10,
      historyTotal: 0,
    };
  },
  created() {
    this.loadHistory();
  },
  methods: {
    typeLabel(t) { return TYPE_MAP[t] || "其他"; },

    async loadHistory() {
      this.historyLoading = true;
      try {
        const res = await manageMessages({ current: this.historyCurrent, size: this.historySize });
        const d = res.data || {};
        this.history = (d.records || []).map(m => ({
          ...m,
          // 后端暂无 readRate 字段，模拟占位
          readRate: m.readRate || '--',
        }));
        this.historyTotal = d.total || 0;
      } catch (e) {
        // ignore
      } finally {
        this.historyLoading = false;
      }
    },

    async submitSend() {
      const f = this.form;
      if (!f.title.trim()) return this.$message.warning("请输入消息标题");
      if (!f.content.trim()) return this.$message.warning("请输入消息内容");

      const payload = {
        title: f.title.trim(), type: f.type, scope: f.scope, content: f.content.trim(),
      };
      if (f.scope === 2) {
        const ids = f.targetUserIdsInput
          .split(/[,，\s]+/).map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0);
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
      this.form = { title: "", type: 1, scope: 1, content: "", targetUserIdsInput: "" };
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
.push-layout { display: flex; gap: 20px; align-items: flex-start; }
.form-card { width: 420px; flex-shrink: 0; }
.history-section { flex: 1; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: #2c3e50; margin-bottom: 12px; }
.muted { color: #999; }
.text-center { text-align: center; }

.tag-group { display: flex; gap: 6px; flex-wrap: wrap; }
.type-tag, .scope-tag {
  padding: 4px 14px; border-radius: 100px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  background: #f0f2f5; color: #666;
}
.type-tag:hover, .scope-tag:hover { background: #e6e9ef; }
.type-tag.active, .scope-tag.active {
  background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff;
}
</style>
