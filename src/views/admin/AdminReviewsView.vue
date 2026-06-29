<template>
  <div id="admin-reviews-page">
    <h2 class="page-title">⭐ 评价管理</h2>

    <!-- 筛选 -->
    <div class="filters">
      <el-select v-model="filterRating" placeholder="评分" clearable @change="loadReviews" size="small" style="width:120px">
        <el-option v-for="r in 5" :key="r" :label="r + ' 星'" :value="r" />
      </el-select>
      <el-select v-model="filterHasReply" placeholder="回复状态" clearable @change="loadReviews" size="small" style="width:140px">
        <el-option label="未回复" :value="0" />
        <el-option label="已回复" :value="1" />
      </el-select>
      <el-button size="small" @click="loadReviews">刷新</el-button>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

    <!-- 评价列表 -->
    <div v-if="!loading" class="review-list">
      <div v-for="rv in reviews" :key="rv.id" class="review-card">
        <div class="review-header">
          <span class="review-user">{{ rv.nickname || rv.username || '匿名' }}</span>
          <span class="review-rating">
            <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= rv.rating }">★</span>
          </span>
          <span class="review-time">{{ formatTime(rv.createTime) }}</span>
          <span :class="['reply-tag', rv.reply ? 'replied' : 'unreplied']">{{ rv.reply ? '已回复' : '未回复' }}</span>
        </div>
        <div class="review-content">{{ rv.content }}</div>
        <div v-if="rv.reply" class="review-reply">
          <span class="reply-label">商家回复：</span>{{ rv.reply }}
        </div>
        <div class="review-footer">
          <span class="review-meta">商品ID: {{ rv.productId }} | 用户ID: {{ rv.userId }}</span>
          <div class="review-actions">
            <el-button v-if="!rv.reply" type="primary" size="mini" @click="openReply(rv)">回复</el-button>
            <el-button v-else size="mini" @click="openReply(rv)">编辑回复</el-button>
            <el-button type="danger" size="mini" plain @click="handleDelete(rv)">删除</el-button>
          </div>
        </div>
      </div>
      <div v-if="reviews.length === 0" class="empty-state">暂无评价</div>
    </div>

    <!-- 回复弹窗 -->
    <el-dialog title="回复评价" :visible.sync="showReply" width="480px">
      <div v-if="replyTarget" class="reply-preview">
        <div class="rp-user">{{ replyTarget.nickname || replyTarget.username }}：</div>
        <div class="rp-content">{{ replyTarget.content }}</div>
      </div>
      <el-input
        v-model="replyText"
        type="textarea"
        :rows="4"
        placeholder="请输入回复内容…"
      />
      <span slot="footer">
        <el-button @click="showReply = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="replySubmitting">提交回复</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { manageReviews, replyReview, deleteReview } from "@/api/modules/order.js";

export default {
  name: "AdminReviewsView",
  data() {
    return {
      reviews: [],
      loading: true,
      filterRating: null,
      filterHasReply: null,
      // Reply dialog
      showReply: false,
      replyTarget: null,
      replyText: "",
      replySubmitting: false,
    };
  },
  created() {
    this.loadReviews();
  },
  methods: {
    async loadReviews() {
      this.loading = true;
      try {
        const params = { current: 1, size: 50 };
        if (this.filterRating) params.rating = this.filterRating;
        if (this.filterHasReply !== null && this.filterHasReply !== "") params.hasReply = this.filterHasReply;
        const res = await manageReviews(params);
        this.reviews = res.data?.records || [];
      } catch (e) {
        this.$message.error("加载评价失败");
      } finally {
        this.loading = false;
      }
    },

    openReply(rv) {
      this.replyTarget = rv;
      this.replyText = rv.reply || "";
      this.showReply = true;
    },

    async submitReply() {
      if (!this.replyText.trim()) {
        this.$message.warning("请输入回复内容");
        return;
      }
      this.replySubmitting = true;
      try {
        await replyReview(this.replyTarget.id, this.replyText.trim());
        this.$message.success("回复成功");
        this.showReply = false;
        this.loadReviews();
      } catch (e) {
        this.$message.error(e.message || "回复失败");
      } finally {
        this.replySubmitting = false;
      }
    },

    handleDelete(rv) {
      this.$confirm(`确认删除该评价？`, "删除确认", {
        type: "warning",
        confirmButtonText: "删除",
      }).then(async () => {
        try {
          await deleteReview(rv.id);
          this.$message.success("评价已删除");
          this.loadReviews();
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 10);
    },
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; }
.filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.loading-wrap { text-align: center; padding: 60px; color: #999; font-size: 15px; }
.empty-state { text-align: center; padding: 60px; color: #999; }

.review-list { display: flex; flex-direction: column; gap: 12px; }
.review-card { background: #fff; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.review-user { font-weight: 600; font-size: 14px; color: #2c3e50; }
.review-rating { display: flex; gap: 2px; }
.star { color: #ddd; font-size: 15px; }
.star.filled { color: #f5a623; }
.review-time { font-size: 12px; color: #bbb; }
.reply-tag { font-size: 11px; padding: 2px 8px; border-radius: 100px; font-weight: 600; margin-left: auto; }
.replied { background: #e8f5e9; color: #2e7d32; }
.unreplied { background: #fff3e0; color: #e65100; }

.review-content { font-size: 14px; color: #555; line-height: 1.6; }
.review-reply { margin-top: 8px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-size: 13px; color: #666; }
.reply-label { color: #6b8dd6; font-weight: 500; }

.review-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f5f5f5; }
.review-meta { font-size: 12px; color: #bbb; }
.review-actions { display: flex; gap: 6px; }

/* 回复弹窗 */
.reply-preview { background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.rp-user { font-weight: 600; font-size: 14px; color: #2c3e50; margin-bottom: 6px; }
.rp-content { font-size: 14px; color: #555; line-height: 1.6; }
</style>
