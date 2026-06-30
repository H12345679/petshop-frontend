<template>
  <div id="admin-reviews-page">
    <!-- ====== 搜索筛选栏 ====== -->
    <div class="card row center wrap gap8" style="padding:12px 16px">
      <span class="small muted">商品</span>
      <el-input v-model="filterProductName" placeholder="商品名搜索" size="small" style="width:180px" clearable @keyup.enter.native="search" />
      <span class="small muted">评分</span>
      <el-select v-model="filterRating" placeholder="全部" size="small" style="width:120px" clearable>
        <el-option v-for="r in 5" :key="r" :label="r + ' 星'" :value="r" />
      </el-select>
      <span class="small muted">回复状态</span>
      <el-select v-model="filterHasReply" placeholder="全部" size="small" style="width:120px" clearable>
        <el-option label="未回复" :value="0" />
        <el-option label="已回复" :value="1" />
      </el-select>
      <el-button type="primary" size="small" @click="search">查询</el-button>
    </div>

    <!-- ====== KPI 统计卡片 ====== -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">总评价数</div>
        <div class="kpi-value">{{ total }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均评分</div>
        <div class="kpi-value">{{ avgRating }} <small>★</small></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">好评率</div>
        <div class="kpi-value">{{ goodRate }}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">待回复</div>
        <div class="kpi-value warn">{{ unrepliedCount }}</div>
      </div>
    </div>

    <!-- ====== Tabs：正常 / 已删除（仅 ADMIN） ====== -->
    <div class="status-tabs" v-if="isAdmin">
      <span :class="['status-tab', { active: showDeleted === 0 }]" @click="switchTab(0)">正常评价</span>
      <span :class="['status-tab', { active: showDeleted === 1 }]" @click="switchTab(1)">🗑 已删除</span>
    </div>

    <!-- ====== 评价卡片列表 ====== -->
    <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

    <template v-if="!loading">
      <div v-if="reviews.length === 0" class="empty-state">暂无评价</div>

      <div v-for="rv in reviews" :key="rv.id" class="card review-card">
        <!-- 头部：头像 + 用户 + 评分 + 状态标签 -->
        <div class="review-top">
          <div class="avatar">{{ (rv.nickname || rv.username || '匿')[0] }}</div>
          <div class="review-user-info">
            <div class="review-user-line">
              <b>{{ rv.nickname || rv.username || '匿名' }}</b>
              <span class="review-stars">
                <span v-for="s in 5" :key="s" :class="['star', { on: s <= rv.rating }]">★</span>
              </span>
            </div>
            <div class="small muted">
              {{ rv.productName || '商品' }}
              <template v-if="rv.specName"> · {{ rv.specName }}</template>
              · {{ fmtDate(rv.createTime) }}
            </div>
          </div>
          <span class="spacer"></span>
          <span :class="['tag', rv.reply ? 'ok' : 'warn']">{{ rv.reply ? '已回复' : '待回复' }}</span>

          <!-- 操作：仅 ADMIN 可删除/恢复 -->
          <template v-if="isAdmin">
            <!-- 删除（仅正常评价） -->
            <span v-if="showDeleted === 0" class="delete-link" @click="handleDelete(rv)">🗑 删除违规</span>
            <!-- 恢复（仅已删除评价） -->
            <span v-if="showDeleted === 1" class="restore-link" @click="handleRestore(rv)">↩ 恢复</span>
          </template>
        </div>

        <!-- 评价内容 -->
        <div class="review-content">{{ rv.content }}</div>

        <!-- 晒图 -->
        <div v-if="imagesParsed(rv).length" class="review-images">
          <div v-for="(img, idx) in imagesParsed(rv)" :key="idx" class="review-image-item">
            <img :src="img" />
          </div>
        </div>

        <!-- 商家回复（已有） -->
        <div v-if="rv.reply" class="review-reply">
          <b>商家回复：</b>{{ rv.reply }}
        </div>

        <!-- 内联回复框（仅正常评价且未回复 — ADMIN 和 MERCHANT 都可回复） -->
        <div v-if="showDeleted === 0 && !rv.reply && rv._showReplyInput" class="review-reply-input">
          <el-input
            v-model="rv._replyText"
            placeholder="回复买家评价..."
            size="small"
            @keyup.enter.native="submitInlineReply(rv)"
          />
          <el-button type="primary" size="small" :loading="rv._replyLoading" @click="submitInlineReply(rv)">回复</el-button>
        </div>
      </div>
    </template>

    <!-- ====== 分页 ====== -->
    <div class="pager" v-if="totalPages > 1">
      <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
      <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
      <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      <span class="total-hint">共 {{ total }} 条</span>
    </div>
  </div>
</template>

<script>
import { manageReviews, replyReview, deleteReview, restoreReview } from "@/api/modules/order.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminReviewsView",
  data() {
    return {
      // 角色
      isAdmin: false,
      // Filters
      filterProductName: "",
      filterRating: null,
      filterHasReply: null,
      // Tab: 0=正常, 1=已删除
      showDeleted: 0,
      // KPIs
      total: 0,
      unrepliedCount: 0,
      // List
      reviews: [],
      loading: true,
      current: 1,
      pageSize: 10,
    };
  },
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let s = Math.max(1, c - 2);
      let e = Math.min(tp, c + 2);
      if (e - s < 4) {
        if (s === 1) e = Math.min(tp, s + 4);
        else s = Math.max(1, e - 4);
      }
      for (let i = s; i <= e; i++) pages.push(i);
      return pages;
    },
    avgRating() {
      if (this.reviews.length === 0) return "—";
      const sum = this.reviews.reduce((s, r) => s + (r.rating || 0), 0);
      return (sum / this.reviews.length).toFixed(1);
    },
    goodRate() {
      if (this.reviews.length === 0) return "—";
      const good = this.reviews.filter(r => r.rating >= 4).length;
      return Math.round((good / this.reviews.length) * 100);
    },
  },
  created() {
    // 判断角色
    const raw = getStore("userInfo");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        this.isAdmin = u.role === "ADMIN";
      } catch (e) { /* ignore */ }
    }
    this.loadReviews();
  },
  methods: {
    imagesParsed(rv) {
      if (!rv.images) return [];
      if (Array.isArray(rv.images)) return rv.images;
      try { return JSON.parse(rv.images); } catch (e) { return []; }
    },

    fmtDate(t) {
      if (!t) return "";
      const s = String(t);
      return s.substring(0, 10);
    },

    switchTab(val) {
      if (this.showDeleted === val) return;
      this.showDeleted = val;
      this.current = 1;
      this.loadReviews();
    },

    async loadReviews() {
      this.loading = true;
      try {
        const params = { current: this.current, size: this.pageSize };
        if (this.filterRating) params.rating = this.filterRating;
        if (this.filterHasReply !== null && this.filterHasReply !== "") params.hasReply = this.filterHasReply;
        // showDeleted 仅在 ADMIN 查看已删除时传 1
        if (this.showDeleted === 1) params.showDeleted = 1;

        const res = await manageReviews(params);
        let records = res.data?.records || [];
        this.total = res.data?.total || 0;

        // Client-side product name filter
        if (this.filterProductName) {
          const kw = this.filterProductName.toLowerCase();
          records = records.filter(r => (r.productName || "").toLowerCase().includes(kw));
        }

        // Attach reactive reply state
        records.forEach(r => {
          if (!r._replyText) this.$set(r, '_replyText', '');
          if (!r._replyLoading) this.$set(r, '_replyLoading', false);
          if (!r._showReplyInput) this.$set(r, '_showReplyInput', false);
        });

        this.reviews = records;
        this.unrepliedCount = records.filter(r => !r.reply).length;
      } catch (e) {
        this.$message.error("加载评价失败");
        this.reviews = [];
      } finally {
        this.loading = false;
      }
    },

    search() {
      this.current = 1;
      this.loadReviews();
    },

    goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loadReviews();
    },

    showReplyInput(rv) {
      this.$set(rv, '_showReplyInput', true);
      this.$set(rv, '_replyText', '');
    },

    async submitInlineReply(rv) {
      const text = (rv._replyText || '').trim();
      if (!text) {
        if (!rv._showReplyInput) {
          this.$set(rv, '_showReplyInput', true);
        }
        return this.$message.warning("请输入回复内容");
      }
      this.$set(rv, '_replyLoading', true);
      try {
        await replyReview(rv.id, text);
        this.$message.success("回复成功");
        this.$set(rv, 'reply', text);
        this.$set(rv, '_showReplyInput', false);
        this.$set(rv, '_replyText', '');
        this.unrepliedCount = Math.max(0, this.unrepliedCount - 1);
      } catch (e) {
        this.$message.error(e.message || "回复失败");
      } finally {
        this.$set(rv, '_replyLoading', false);
      }
    },

    handleDelete(rv) {
      this.$confirm("确认删除该评价？删除后可在「已删除」页签中恢复。", "删除违规评价", {
        type: "warning",
        confirmButtonText: "删除",
      }).then(async () => {
        try {
          await deleteReview(rv.id);
          this.$message.success("评价已删除（逻辑删除，可恢复）");
          this.loadReviews();
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },

    handleRestore(rv) {
      this.$confirm("确认恢复该评价？恢复后将重新出现在正常评价列表中。", "恢复评价", {
        type: "info",
        confirmButtonText: "恢复",
      }).then(async () => {
        try {
          await restoreReview(rv.id);
          this.$message.success("评价已恢复");
          this.loadReviews();
        } catch (e) {
          this.$message.error(e.message || "恢复失败");
        }
      }).catch(() => {});
    },
  },
};
</script>

<style scoped>
/* ====== 搜索筛选 ====== */
.row { display: flex; gap: 14px; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }

/* ====== 卡片 ====== */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }

/* ====== KPI 统计卡 ====== */
.kpi-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.kpi-card { flex: 1; min-width: 130px; background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; }
.kpi-label { font-size: 12px; color: #888; margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 700; color: #2c3e50; }
.kpi-value small { font-size: 13px; color: #4caf7d; font-weight: 400; margin-left: 4px; }
.kpi-value.warn { color: #d9534f; }

/* ====== 状态 Tab ====== */
.status-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.status-tab {
  padding: 6px 16px; border-radius: 100px; font-size: 13px; cursor: pointer;
  color: #666; background: #f0f2f5; font-weight: 500; transition: all 0.2s;
}
.status-tab.active { background: #5b8def; color: #fff; }
.status-tab:hover:not(.active) { background: #e4e8ee; }

/* ====== 评价卡片 ====== */
.review-card { padding: 16px 20px; }
.review-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }

.avatar {
  width: 44px; height: 44px; border-radius: 50%; background: #dfe3e9; border: 1px solid #cfd4da;
  display: flex; align-items: center; justify-content: center; color: #888; font-size: 15px;
  flex-shrink: 0;
}
.review-user-info { flex: 1; min-width: 0; }
.review-user-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.review-user-line b { font-size: 14px; color: #2c3e50; }

.review-stars { display: flex; gap: 1px; }
.star { color: #ddd; font-size: 15px; }
.star.on { color: #f5a623; }

.tag {
  display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px;
  padding: 1px 8px; font-size: 12px; color: #555; white-space: nowrap;
}
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #e6914e; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }

.delete-link { font-size: 12px; color: #d9534f; cursor: pointer; margin-left: 12px; }
.delete-link:hover { opacity: .8; }

.restore-link { font-size: 12px; color: #5b8def; cursor: pointer; margin-left: 12px; font-weight: 600; }
.restore-link:hover { opacity: .8; }

.review-content { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 8px; }

.review-images { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.review-image-item {
  width: 56px; height: 56px; border-radius: 6px; overflow: hidden;
  background: #f5f5f5; border: 1px solid #eef0f3;
}
.review-image-item img { width: 100%; height: 100%; object-fit: cover; }

.review-reply {
  background: #f4f5f7; border-radius: 6px; padding: 8px 12px; font-size: 13px;
  color: #666; line-height: 1.5;
}
.review-reply b { color: #5b8def; }

.review-reply-input { display: flex; gap: 8px; margin-top: 8px; align-items: center; }

.loading-wrap { text-align: center; padding: 60px; color: #888; }
.empty-state { text-align: center; padding: 60px; color: #888; }

.spacer { flex: 1; }
.small { font-size: 12px; }
.muted { color: #888; }

.pager { display: flex; gap: 6px; justify-content: flex-end; margin-top: 14px; align-items: center; }
.pager span {
  min-width: 30px; height: 30px; border: 1px solid #cfd4da; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  color: #555; background: #fff; padding: 0 8px; cursor: pointer;
}
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; border-color: #5b8def; color: #fff; }
.pager span.disabled { opacity: .3; cursor: not-allowed; }
.total-hint { border: none !important; background: transparent !important; color: #888; font-size: 12px; cursor: default !important; }
</style>
