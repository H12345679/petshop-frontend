<template>
  <div class="user-reviews-comp">
    <div class="header-banner">
      <div class="title-wrap">
        <h2>我的评价</h2>
        <p class="subtitle">记录每一份真实的声音与体验</p>
      </div>
    </div>
    
    <div v-if="loading" class="state-wrap">
      <div class="loader"></div>
      <p>正在加载您的专属回忆...</p>
    </div>
    
    <div v-else-if="reviews.length === 0" class="state-wrap empty">
      <div class="empty-icon">📝</div>
      <p>您还没有留下过任何评价哦~</p>
    </div>
    
    <div v-else class="review-gallery">
      <div v-for="rv in reviews" :key="rv.id" class="review-card">
        <!-- 商品信息悬浮条 -->
        <div class="product-bar" @click="$router.push('/product/' + rv.productId)">
          <div class="p-img" :style="{ backgroundImage: 'url(' + (rv.productImage || '/logo.png') + ')' }"></div>
          <div class="p-info">
            <div class="p-name">{{ rv.productName }}</div>
            <div class="p-meta">{{ rv.specName || '默认规格' }} · 订单号：{{ rv.orderNo }}</div>
          </div>
          <div class="p-link">
            <span class="link-icon">↗</span>
          </div>
        </div>
        
        <div class="review-body">
          <!-- 评分与时间 -->
          <div class="r-header">
            <div class="star-rating">
              <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= rv.rating }">
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </span>
            </div>
            <div class="r-time">{{ formatTime(rv.createTime) }}</div>
          </div>
          
          <!-- 评价正文 -->
          <div class="r-content">
            "{{ rv.content }}"
          </div>
          
          <!-- 晒图画廊 -->
          <div v-if="rv.parsedImages && rv.parsedImages.length > 0" class="image-gallery">
            <div v-for="(img, idx) in rv.parsedImages" :key="idx" class="gallery-item">
              <div class="img-inner" :style="{ backgroundImage: 'url(' + img + ')' }"></div>
            </div>
          </div>
          
          <!-- 商家回复 -->
          <div v-if="rv.reply" class="merchant-reply">
            <div class="reply-header">
              <span class="reply-icon">💬</span> 商家回复
            </div>
            <div class="reply-text">{{ rv.reply }}</div>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > size">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="size"
          :current-page.sync="current"
          @current-change="loadReviews"
        ></el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "UserReviews",
  data() {
    return {
      loading: true,
      reviews: [],
      total: 0,
      current: 1,
      size: 10
    };
  },
  created() {
    this.loadReviews();
  },
  methods: {
    async loadReviews() {
      this.loading = true;
      try {
        const { get } = await import("@/api/axios.js");
        const res = await get("/reviews/my", { current: this.current, size: this.size });
        const records = res.data?.records || [];
        records.forEach(r => {
          try {
            r.parsedImages = r.images ? JSON.parse(r.images) : [];
          } catch(e) {
            r.parsedImages = [];
          }
        });
        this.reviews = records;
        this.total = res.data?.total || 0;
      } catch (e) {
        this.$emit("notify", { type: "error", message: "加载评价失败：" + e.message });
      } finally {
        this.loading = false;
      }
    },
    formatTime(t) {
      if (!t) return "";
      const d = new Date(t);
      return d.getFullYear() + "-" + 
             String(d.getMonth()+1).padStart(2, '0') + "-" + 
             String(d.getDate()).padStart(2, '0') + " " + 
             String(d.getHours()).padStart(2, '0') + ":" + 
             String(d.getMinutes()).padStart(2, '0');
    }
  }
};
</script>

<style scoped>
/* Modern typography and aesthetics */
.user-reviews-comp {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 500px;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header Banner */
.header-banner {
  background: linear-gradient(135deg, #f6f8fb 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 24px 30px;
  margin-bottom: 24px;
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
}
.title-wrap h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}
.subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* States */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #94a3b8;
  font-size: 14px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.loader {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Review Cards */
.review-gallery {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.review-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.review-card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

/* Product Bar */
.product-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
.product-bar:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}
.p-img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  margin-right: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.p-info {
  flex: 1;
}
.p-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
}
.p-meta {
  font-size: 12px;
  color: #94a3b8;
}
.p-link {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  font-weight: bold;
}
.product-bar:hover .p-link {
  color: #3b82f6;
  transform: scale(1.1);
}

/* Review Body */
.review-body {
  padding-left: 8px;
}
.r-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.star-rating {
  display: flex;
  gap: 4px;
}
.star svg {
  fill: #e2e8f0;
  transition: fill 0.2s;
}
.star.filled svg {
  fill: #fbbf24;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.4));
}
.r-time {
  font-size: 13px;
  color: #cbd5e1;
}

/* Content */
.r-content {
  font-size: 15px;
  line-height: 1.6;
  color: #1e293b;
  margin-bottom: 16px;
  font-weight: 400;
  font-style: italic;
}

/* Gallery */
.image-gallery {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.gallery-item {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.img-inner {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.gallery-item:hover .img-inner {
  transform: scale(1.1);
}

/* Reply */
.merchant-reply {
  background: linear-gradient(to right, #eff6ff, #f8fafc);
  border-left: 3px solid #3b82f6;
  border-radius: 4px 12px 12px 4px;
  padding: 14px 16px;
  margin-top: 12px;
}
.reply-header {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.reply-text {
  font-size: 14px;
  line-height: 1.5;
  color: #475569;
}

/* Pagination */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active {
  background-color: #3b82f6 !important;
  color: #fff;
}
</style>
