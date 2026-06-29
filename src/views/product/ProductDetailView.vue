<template>
  <div class="product-detail-page">
    <AppHeader />

    <div class="container" v-if="product">
      <div class="breadcrumb small muted mb12">首页 / {{ product.type === 1 ? '宠物' : '周边商品' }} / {{ product.name }}</div>

      <!-- 上半：图册 + 信息 -->
      <div class="row mb16">
        <!-- 左图册 -->
        <div style="width: 380px; flex-shrink: 0;">
          <div class="img main-img" :style="{ backgroundImage: 'url(' + activeImage + ')' }">
            <span v-if="!activeImage" style="color: #ccc;">商品主图</span>
          </div>
          <div class="row mt8 gap8 img-list">
            <div class="img thumb-img" 
                 v-for="(img, idx) in imageList" 
                 :key="idx"
                 :class="{ active: activeImage === img }"
                 :style="{ backgroundImage: 'url(' + img + ')' }"
                 @click="activeImage = img">
                 <span v-if="!img">缩</span>
            </div>
          </div>
        </div>

        <!-- 右信息 -->
        <div class="col card info-card">
          <h3 class="p-title">{{ product.name }}</h3>
          <div class="small muted mb12">{{ product.description || '暂无商品描述' }} · 商品编号 #{{ product.id }}</div>

          <div class="price-box">
            <div class="row center gap8">
              <span class="muted small">价格</span>
              <span class="price"><span class="cur">¥</span>{{ currentPrice }}</span>
              <span class="del" v-if="product.originalPrice && product.originalPrice > currentPrice">原价 ¥{{ product.originalPrice }}</span>
              
              <span class="tag warn" v-if="userInfo && userInfo.memberLevelId > 0">
                尊贵会员 <span class="anno" v-if="discount < 1">已享 {{ discount * 10 }} 折</span>
              </span>
            </div>
            <div class="row gap8 small muted mt8">
              <span>总销量 {{ product.sales || 0 }}</span>
              <span>库存 {{ currentStock }}</span>
              <span>{{ product.shopName || '宠物商城自营' }}</span>
            </div>
          </div>

          <!-- 规格 SKU -->
          <div class="field" v-if="product.skus && product.skus.length > 0">
            <label>选择规格（SKU）</label>
            <div class="row gap8 wrap">
              <span class="tag" 
                    v-for="sku in product.skus" 
                    :key="sku.id"
                    :class="{ accent: currentSku && currentSku.id === sku.id, disabled: sku.stock <= 0 }"
                    @click="selectSku(sku)">
                {{ sku.skuName }}
              </span>
            </div>
          </div>
          
          <div class="field">
            <label>购买数量</label>
            <div class="row center gap8">
              <span class="btn sm" :class="{ disabled: quantity <= 1 }" @click="decQty">−</span>
              <span class="input qty-input">{{ quantity }}</span>
              <span class="btn sm" :class="{ disabled: quantity >= currentStock }" @click="incQty">＋</span>
              <span class="small muted" v-if="product.type === 1">（宠物类库存通常为 1）</span>
              <span class="small muted warn-text" v-if="currentStock === 0">缺货中</span>
            </div>
          </div>

          <div class="row gap8 mt16">
            <div class="btn lg add-cart-btn" :class="{ disabled: currentStock === 0 }" @click="handleAddToCart">加入购物车</div>
            <div class="btn lg primary-btn" :class="{ disabled: currentStock === 0 }" @click="handleBuyNow">立即购买</div>
            <div class="btn lg fav-btn" :class="{ 'fav-active': isFavorited }" @click="handleFavorite">{{ isFavorited ? '♥' : '♡' }} 收藏</div>
          </div>
        </div>
      </div>

      <!-- 下半：详情 + 评价 -->
      <div class="row align-start gap20">
        <div style="width: 280px; flex-shrink: 0;" class="card pad16">
          <h3 style="font-size: 15px; margin-bottom: 12px; color: #555;">本店其他</h3>
          <div class="pcard mb12" v-for="p in otherProducts" :key="p.id" style="cursor:pointer; padding: 4px; border: 1px solid transparent; transition: 0.2s;" @click="$router.push('/product/' + p.id)" @mouseenter="$event.currentTarget.style.borderColor='#e6e8eb'" @mouseleave="$event.currentTarget.style.borderColor='transparent'">
            <div class="img pimg" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : null">
              <span v-if="!p.mainImage">图</span>
            </div>
            <div class="pbody" style="padding: 4px; flex: 1; overflow: hidden;">
              <div class="small" style="margin-bottom: 4px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height: 1.4;">{{ p.name }}</div>
              <div class="price small">¥ {{ p.price }}</div>
            </div>
          </div>
          <div v-if="!loading && otherProducts.length === 0" class="muted small text-center">暂无其他商品</div>
        </div>

        <div class="col flex1">
          <div class="tabs">
            <span class="tab" :class="{ on: activeTab === 'detail' }" @click="activeTab = 'detail'">商品详情</span>
            <span class="tab" :class="{ on: activeTab === 'reviews' }" @click="switchReviews">用户评价 ({{ totalReviews }})</span>
            <span class="tab" :class="{ on: activeTab === 'service' }" @click="activeTab = 'service'">售后保障</span>
          </div>
          
          <div class="card pad20" v-show="activeTab === 'detail'">
            <div v-if="product.description">{{ product.description }}</div>
            <div v-else class="muted text-center" style="padding: 40px;">暂无详情内容</div>
          </div>

          <div class="card pad20" v-show="activeTab === 'reviews'">
            <div v-if="reviews.length === 0" class="muted text-center" style="padding: 40px;">暂无用户评价</div>
            <div v-else class="review-list">
              <div v-for="rv in reviews" :key="rv.id" class="review-item">
                <div class="review-top">
                  <span class="review-user">{{ rv.nickname || rv.username || '匿名用户' }}</span>
                  <span class="review-rating">
                    <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= rv.rating }">★</span>
                  </span>
                  <span class="review-time">{{ formatTime(rv.createTime) }}</span>
                </div>
                <div class="review-content">{{ rv.content }}</div>
                <div v-if="rv.reply" class="review-reply">
                  <span class="reply-label">商家回复：</span>{{ rv.reply }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="card pad20" v-show="activeTab === 'service'">
            <div class="small" style="line-height: 1.8;">
              <p>1. 活体宠物提供 7 天健康保障，确诊猫瘟/犬瘟可退换。</p>
              <p>2. 周边商品支持 7 天无理由退货（不影响二次销售）。</p>
              <p>3. 全国大部分地区包邮（偏远地区及活体宠物托运除外）。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container text-center" v-else-if="loading">
      <div style="padding: 100px; color: #5b8def;">加载中...</div>
    </div>
    
    <div class="container text-center" v-else>
      <div class="card" style="padding: 100px; color: #888;">
        商品不存在或已下架
        <div class="mt16"><router-link to="/products" class="btn primary-btn" style="display:inline-block">返回列表</router-link></div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { getProductDetail, addToCart, addFavorite, removeFavorite, checkFavorite, searchProducts, getProductReviews } from "@/api/modules/product.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "ProductDetailView",
  data() {
    return {
      loading: true,
      product: null,
      userInfo: null,
      isFavorite: false,
      
      imageList: [],
      activeImage: "",
      
      currentSku: null,
      quantity: 1,
      
      activeTab: "detail",
      otherProducts: [],
      reviews: [],
      totalReviews: 0,
      isFavorited: false
    };
  },
  watch: {
    '$route.params.id': {
      handler: 'fetchDetail',
      immediate: false
    }
  },
  computed: {
    discount() {
      if (!this.userInfo) return 1;
      // 简单模拟：memberLevelId 1 = 9.5折, 2 = 9折, 3 = 8.5折...
      const level = this.userInfo.memberLevelId || 0;
      if (level > 0) {
        return Math.max(0.7, 1 - level * 0.05);
      }
      return 1;
    },
    currentPrice() {
      let basePrice = this.product.price || 0;
      if (this.currentSku) {
        basePrice = this.currentSku.price;
      }
      return (basePrice * this.discount).toFixed(2);
    },
    currentStock() {
      if (this.currentSku) {
        return this.currentSku.stock || 0;
      }
      return this.product.stock || 0;
    }
  },
  created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    
    this.fetchDetail();
  },
  methods: {
    async fetchDetail() {
      const id = this.$route.params.id;
      if (!id) return;
      
      this.loading = true;
      try {
        const res = await getProductDetail(id);
        if (res.data) {
          this.product = res.data;
          this.initData();
          this.loadReviews();
          this.checkFavStatus();
        }
      } catch (e) {
        console.error("获取商品详情失败", e);
        this.product = null;
      } finally {
        this.loading = false;
      }
    },
    initData() {
      // 解析图片
      this.imageList = [];
      if (this.product.mainImage) {
        this.imageList.push(this.product.mainImage);
      }
      if (this.product.images) {
        try {
          const imgs = JSON.parse(this.product.images);
          if (Array.isArray(imgs)) {
            imgs.forEach(img => {
              if (img && !this.imageList.includes(img)) this.imageList.push(img);
            });
          }
        } catch (e) { /* ignore */ }
      }
      this.activeImage = this.imageList[0] || "";
      
      // 初始化 SKU
      if (this.product.skus && this.product.skus.length > 0) {
        // 默认选中第一个有库存的
        this.currentSku = this.product.skus.find(s => s.stock > 0) || this.product.skus[0];
      }
      
      // 初始化数量
      this.quantity = 1;
      if (this.currentStock === 0) this.quantity = 0;
      
      // 加载收藏状态
      this.checkFavState();
      
      // 加载本店其他商品
      this.fetchOtherProducts();
    },
    async fetchOtherProducts() {
      if (!this.product || !this.product.shopId) return;
      try {
        const res = await searchProducts({ current: 1, size: 5, shopId: this.product.shopId, status: 1 });
        if (res.data && res.data.records) {
          // 排除当前商品，取前3个
          this.otherProducts = res.data.records.filter(p => p.id !== this.product.id).slice(0, 3);
        }
      } catch(e) {
        console.warn("获取本店其他商品失败", e);
      }
    },
    selectSku(sku) {
      if (sku.stock <= 0) return;
      this.currentSku = sku;
      if (this.quantity > sku.stock) {
        this.quantity = sku.stock;
      }
      if (this.quantity === 0 && sku.stock > 0) {
        this.quantity = 1;
      }
    },
    decQty() {
      if (this.quantity > 1) this.quantity--;
    },
    incQty() {
      if (this.quantity < this.currentStock) this.quantity++;
    },
    async handleAddToCart() {
      if (!this.userInfo) {
        this.$router.push('/login');
        return;
      }
      if (this.currentStock === 0) return;
      
      const payload = {
        productId: this.product.id,
        skuId: this.currentSku ? this.currentSku.id : null,
        quantity: this.quantity
      };
      
      try {
        await addToCart(payload);
        alert("已成功加入购物车！");
      } catch (e) {
        alert("加购失败：" + (e.message || "请求异常"));
      }
    },
    handleBuyNow() {
      if (!this.userInfo) {
        this.$router.push('/login');
        return;
      }
      if (this.currentStock === 0) return;
      alert("结算页面暂未开放，敬请期待！");
    },
    async checkFavStatus() {
      if (!this.userInfo || !this.product) return;
      try {
        const res = await checkFavorite(this.product.id);
        this.isFavorited = res.data?.isFavorite === 1;
      } catch (e) { /* ignore */ }
    },

    async handleFavorite() {
      if (!this.userInfo) {
        this.$message.warning("请先登录！");
        this.$router.push('/login');
        return;
      }
      try {
        if (this.isFavorited) {
          await removeFavorite(this.product.id);
          this.isFavorited = false;
          this.$message.success("已取消收藏");
        } else {
          await addFavorite(this.product.id);
          this.isFavorited = true;
          this.$message.success("已收藏");
        }
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      }
    },
    async loadReviews() {
      if (!this.product) return;
      try {
        const res = await getProductReviews(this.product.id, { current: 1, size: 10 });
        this.reviews = res.data?.records || [];
        this.totalReviews = res.data?.total || 0;
      } catch (e) {
        console.error("加载评价失败", e);
      }
    },
    switchReviews() {
      this.activeTab = 'reviews';
      if (this.reviews.length === 0 && this.product) {
        this.loadReviews();
      }
    },
    formatTime(t) {
      if (!t) return '';
      return t.substring(0, 10);
    }
  }
};
</script>

<style scoped>
.product-detail-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 布局 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; flex: 1; }
.row { display: flex; }
.col { display: flex; flex-direction: column; }
.center { align-items: center; }
.align-start { align-items: flex-start; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.gap20 { gap: 20px; }
.mb12 { margin-bottom: 12px; }
.mb16 { margin-bottom: 16px; }
.mt8 { margin-top: 8px; }
.mt16 { margin-top: 16px; }
.small { font-size: 13px; }
.muted { color: #888; }
.warn { color: #fff; background: #e5a452; }
.warn-text { color: #e5a452; }
.text-center { text-align: center; }
.flex1 { flex: 1; }
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; }
.pad16 { padding: 16px; }
.pad20 { padding: 20px; }

/* 左侧图册 */
.main-img { width: 100%; height: 380px; background-color: #f0f0f0; border-radius: 10px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; }
.thumb-img { width: 64px; height: 64px; background-color: #f0f0f0; border-radius: 6px; cursor: pointer; border: 2px solid transparent; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ccc;}
.thumb-img.active { border-color: #5b8def; }

/* 右侧信息 */
.info-card { padding: 24px; margin-left: 20px; flex: 1; }
.p-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 8px; }
.price-box { background: #fdf5f6; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #fae8e9; }
.price { color: #d9534f; font-weight: 700; font-size: 28px; }
.price .cur { font-size: 16px; margin-right: 2px; }
.del { color: #aaa; text-decoration: line-through; font-size: 13px; margin-left: 8px; }
.tag { margin: 0; padding: 4px 12px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: #555; border: 1px solid #e6e8eb; background: #fff;}
.tag.accent { background: #eef4fe; color: #5b8def; border-color: #cce0ff; font-weight: 600; }
.tag.disabled { background: #f5f5f5; color: #bbb; cursor: not-allowed; border-style: dashed; }
.tag.warn { border: none; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; color: #888; margin-bottom: 8px; }
.btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; user-select: none; transition: 0.2s; }
.btn.sm { width: 32px; height: 32px; background: #f0f3fa; color: #555; }
.btn.sm:hover:not(.disabled) { background: #e2e8f5; }
.btn.sm.disabled { color: #ccc; cursor: not-allowed; }
.qty-input { width: 60px; height: 32px; border: 1px solid #e6e8eb; text-align: center; line-height: 30px; font-size: 14px; }

.btn.lg { height: 44px; padding: 0 24px; font-size: 15px; font-weight: 600; border: 1px solid #d6dbe3; background: #fff; }
.btn.lg.disabled { opacity: 0.6; cursor: not-allowed; }
.add-cart-btn { background: #ffb96b !important; border-color: #ffb96b !important; color: #fff; }
.add-cart-btn:hover:not(.disabled) { background: #ffa84a !important; }
.primary-btn { background: #5b8def !important; border-color: #5b8def !important; color: #fff; }
.primary-btn:hover:not(.disabled) { background: #4a7ce0 !important; }
.fav-btn { color: #555; }
.fav-btn:hover { background: #f8f9fb; }
.fav-btn.fav-active { color: #e74c3c; border-color: #e74c3c; background: #fef2f2; }
.fav-btn.fav-active:hover { background: #fde8e8; }

/* 底部 Tabs */
.tabs { display: flex; border-bottom: 2px solid #e6e8eb; margin-bottom: 20px; }
.tab { padding: 12px 24px; font-size: 15px; cursor: pointer; position: relative; color: #555; font-weight: 500; }
.tab.on { color: #5b8def; font-weight: 600; }
.tab.on::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: #5b8def; }

.pcard { display: flex; gap: 12px; }
.pimg { width: 80px; height: 80px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #aaa; flex-shrink: 0; }
/* 评价 */
.review-list { display: flex; flex-direction: column; gap: 16px; }
.review-item { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.review-item:last-child { border-bottom: none; }
.review-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.review-user { font-weight: 600; font-size: 14px; color: #2c3e50; }
.review-rating { display: flex; gap: 2px; }
.star { color: #ddd; font-size: 16px; }
.star.filled { color: #f5a623; }
.review-time { font-size: 12px; color: #bbb; margin-left: auto; }
.review-content { font-size: 14px; color: #555; line-height: 1.6; }
.review-reply { margin-top: 8px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-size: 13px; color: #666; }
.reply-label { color: #6b8dd6; font-weight: 500; }
</style>
