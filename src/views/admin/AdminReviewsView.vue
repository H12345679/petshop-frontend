<template>
  <div id="admin-reviews-page">
    <div class="page-head">
      <span class="page-title">商品 / 评价管理</span>
    </div>

    <!-- 搜索栏 -->
    <div class="card search-bar">
      <span class="small muted">商品</span>
      <el-input v-model="searchProduct" placeholder="商品名搜索" size="small" style="width:180px" clearable @keyup.enter="loadReviews" />
      <span class="small muted">评分</span>
      <el-select v-model="filterRating" placeholder="全部" size="small" style="width:110px" clearable @change="loadReviews">
        <el-option label="全部" :value="null" />
        <el-option v-for="r in 5" :key="r" :label="r + ' 星'" :value="r" />
      </el-select>
      <span class="small muted">回复状态</span>
      <el-select v-model="filterHasReply" placeholder="全部" size="small" style="width:120px" clearable @change="loadReviews">
        <el-option label="全部" :value="null" />
        <el-option label="未回复" :value="0" />
        <el-option label="已回复" :value="1" />
      </el-select>
      <el-button size="small" type="primary" @click="loadReviews">查询</el-button>
    </div>

    <!-- KPI -->
    <div class="row kpi-row">
      <div class="kpi-item">
        <div class="kpi-label">总评价数</div>
        <div class="kpi-value">{{ kpis.total }}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">平均评分</div>
        <div class="kpi-value">{{ kpis.avgRating }} <small class="star-c">★</small></div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">好评率</div>
        <div class="kpi-value">{{ kpis.goodRate }}%</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">待回复</div>
        <div class="kpi-value danger">{{ kpis.pendingReply }}</div>
      </div>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

    <!-- 评价卡片列表 -->
    <div v-if="!loading" class="review-list">
      <div v-for="rv in reviews" :key="rv.id" class="card review-card">
        <!-- 头部：头像 + 用户 + 评分 + 时间 + 标签 + 删除 -->
        <div class="rc-header">
          <span class="avatar">{{ (rv.nickname || rv.username || '匿')[0] }}</span>
          <div class="rc-user">
            <b>{{ rv.nickname || rv.username || '匿名用户' }}</b>
            <span class="stars">
              <span v-for="s in 5" :key="s" :class="['star', { on: s <= rv.rating }]">★</span>
            </span>
          </div>
          <span class="rc-time small muted">{{ formatTime(rv.createTime) }}</span>
          <span :class="['rc-tag', rv.reply ? 'replied' : 'unreplied']">{{ rv.reply ? '已回复' : '待回复' }}</span>
          <span v-if="isAdmin" class="rc-delete" @click="handleDelete(rv)">🗑 删除违规</span>
        </div>

        <!-- 评价内容 -->
        <div class="rc-content">{{ rv.content }}</div>

        <!-- 晒图 -->
        <div v-if="parsedImages(rv.images).length" class="rc-images">
          <div v-for="(img, idx) in parsedImages(rv.images)" :key="idx" class="rc-img"><img :src="img" alt="晒图" /></div>
        </div>

        <!-- 回复区域 -->
        <div v-if="rv.reply" class="rc-reply">
          <b>商家回复：</b>{{ rv.reply }}
        </div>
        <div v-else class="rc-reply-input">
          <el-input v-model="replyTexts[rv.id]" placeholder="回复买家评价..." size="small" class="reply-input" @keyup.enter.native="submitReply(rv)" />
          <el-button size="small" type="primary" @click="submitReply(rv)">回复</el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="reviews.length === 0 && !loading" class="empty-state">暂无评价数据</div>
    </div>

    <!-- 分页 -->
    <div class="pager" v-if="totalPages > 1">
      <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
      <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
      <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      <span class="total-count">共 {{ total }} 条</span>
    </div>
  </div>
</template>

<script>
import { manageReviews, replyReview, deleteReview } from "@/api/modules/order.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminReviewsView",
  data() {
    return {
      reviews: [],
      loading: false,
      total: 0,
      current: 1,
      size: 15,
      searchProduct: "",
      filterRating: null,
      filterHasReply: null,
      isAdmin: false,
      replyTexts: {},  // keyed by review id
    };
  },
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.total / this.size)); },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let start = Math.max(1, c - 2);
      let end = Math.min(tp, c + 2);
      if (end - start < 4) {
        if (start === 1) end = Math.min(tp, start + 4);
        else start = Math.max(1, end - 4);
      }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    },
    kpis() {
      const total = this.total;
      let avg = 0, good = 0, pending = 0;
      if (this.reviews.length) {
        const sum = this.reviews.reduce((s, r) => s + (r.rating || 0), 0);
        avg = (sum / this.reviews.length).toFixed(1);
        good = Math.round((this.reviews.filter(r => (r.rating || 0) >= 4).length / this.reviews.length) * 100);
        pending = this.reviews.filter(r => !r.reply).length;
      }
      return { total, avgRating: avg, goodRate: good, pendingReply: pending };
    },
  },
  created() {
    const raw = getStore("userInfo");
    if (raw) {
      try { const u = JSON.parse(raw); this.isAdmin = u.role === "ADMIN"; } catch (e) { /* ignore */ }
    }
    this.loadReviews();
  },
  methods: {
    async loadReviews() {
      this.loading = true;
      this.replyTexts = {};
      this.current = 1;
      try {
        const params = { current: 1, size: this.size };
        if (this.searchProduct) params.productId = this.searchProduct;
        if (this.filterRating) params.rating = this.filterRating;
        if (this.filterHasReply !== null && this.filterHasReply !== "") params.hasReply = this.filterHasReply;
        const res = await manageReviews(params);
        const d = res.data || {};
        this.reviews = d.records || [];
        this.total = d.total || 0;
      } catch (e) {
        this.$message.error("加载评价失败");
      } finally {
        this.loading = false;
      }
    },

    async goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loading = true;
      try {
        const params = { current: page, size: this.size };
        if (this.searchProduct) params.productId = this.searchProduct;
        if (this.filterRating) params.rating = this.filterRating;
        if (this.filterHasReply !== null && this.filterHasReply !== "") params.hasReply = this.filterHasReply;
        const res = await manageReviews(params);
        const d = res.data || {};
        this.reviews = d.records || [];
        this.total = d.total || 0;
      } catch (e) {
        this.reviews = [];
      }
      this.loading = false;
    },

    async submitReply(rv) {
      const text = this.replyTexts[rv.id];
      if (!text || !text.trim()) {
        this.$message.warning("请输入回复内容");
        return;
      }
      try {
        await replyReview(rv.id, text.trim());
        this.$message.success("回复成功");
        delete this.replyTexts[rv.id];
        this.loadReviews();
      } catch (e) {
        this.$message.error(e.message || "回复失败");
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

    parsedImages(imgs) {
      if (!imgs) return [];
      try { return JSON.parse(imgs); } catch (e) { return []; }
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 10);
    },
  },
};
</script>

<style scoped>
#admin-reviews-page { }

.page-head { margin-bottom:16px; }
.page-title { font-size:17px; font-weight:600; color:#2c3e50; }

/* Search bar */
.search-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:12px 16px !important; }
.search-bar .small { font-size:12px; color:#888; white-space:nowrap; }

/* Card */
.card { background:#fff; border:1px solid #cfd4da; border-radius:8px; padding:16px; margin-bottom:12px; }

.loading-wrap { text-align:center; padding:60px; color:#888; font-size:14px; }
.empty-state { text-align:center; padding:60px; color:#888; font-size:14px; }

/* KPI row */
.kpi-row { display:flex; gap:16px; margin-bottom:16px; }
.kpi-item { flex:1; background:#fff; border:1px solid #cfd4da; border-radius:8px; padding:16px 20px; text-align:center; }
.kpi-label { font-size:12px; color:#888; margin-bottom:6px; }
.kpi-value { font-size:24px; font-weight:700; color:#2c3e50; }
.kpi-value .star-c { color:#f5a623; font-size:16px; }
.kpi-value.danger { color:#d9534f; }

/* Review card */
.review-card { }
.rc-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
.avatar { width:32px; height:32px; border-radius:50%; background:#cfd4da; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; }
.rc-user { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.rc-user b { font-size:14px; color:#2c3e50; }
.stars { display:flex; gap:1px; }
.star { color:#ddd; font-size:14px; }
.star.on { color:#f5a623; }
.rc-time { margin-left:4px; }
.small { font-size:12px; }
.muted { color:#888; }
.rc-tag { font-size:11px; padding:2px 8px; border-radius:100px; font-weight:600; margin-left:auto; }
.rc-tag.replied { background:#e6f4ec; border-color:#b6dcc6; color:#4caf7d; border:1px solid transparent; }
.rc-tag.unreplied { background:#fcefe2; border-color:#f0cda6; color:#e6914e; border:1px solid transparent; }
.rc-delete { font-size:12px; color:#d9534f; cursor:pointer; opacity:.7; white-space:nowrap; }
.rc-delete:hover { opacity:1; }

.rc-content { font-size:14px; color:#555; line-height:1.6; margin-bottom:8px; }

.rc-images { display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
.rc-img { width:56px; height:56px; border-radius:6px; overflow:hidden; border:1px solid #eee; }
.rc-img img { width:100%; height:100%; object-fit:cover; }

.rc-reply { background:#f7f8fa; border-radius:6px; padding:8px 12px; font-size:13px; color:#666; margin-top:8px; }
.rc-reply b { color:#5b8def; font-weight:600; }

.rc-reply-input { display:flex; gap:8px; margin-top:8px; }
.reply-input { flex:1; }

/* Pagination */
.pager { display:flex; gap:6px; justify-content:flex-end; margin-top:16px; align-items:center; }
.pager span { min-width:30px; height:30px; border:1px solid #cfd4da; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; color:#555; background:#fff; padding:0 8px; cursor:pointer; }
.pager span:hover { border-color:#5b8def; color:#5b8def; }
.pager span.on { background:#5b8def; border-color:#5b8def; color:#fff; }
.pager span.disabled { opacity:.3; cursor:not-allowed; }
.total-count { border:none !important; color:#888; font-size:12px; cursor:default !important; min-width:auto !important; }
</style>
