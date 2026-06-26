<template>
  <div class="shop-detail-page">
    <header class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <nav class="nav">
        <router-link to="/">首页</router-link>
        <router-link to="/products">全部商品</router-link>
        <router-link to="/shops">找门店</router-link>
        <span class="muted">萌宠视频</span>
      </nav>
      <div class="search">
        <input v-model.trim="searchKeyword" placeholder="店内搜索..." @keyup.enter="onSearch" />
        <button class="go" @click="onSearch">搜索</button>
      </div>
      <div class="right">
        <span>🛒 购物车</span>
        <span>🔔 消息</span>
        <template v-if="userInfo">
          <span>👤 {{ userInfo.nickname || userInfo.username }}</span>
          <span class="link" @click="logout">退出</span>
        </template>
        <router-link v-else to="/login" class="link">登录 / 注册</router-link>
      </div>
    </header>

    <div class="container" v-if="shop">
      <!-- 店招 -->
      <div class="card shop-header">
        <div class="img shop-logo" :style="shop.logo ? { backgroundImage: 'url(' + shop.logo + ')' } : null">
          <span v-if="!shop.logo">店 LOGO</span>
        </div>
        <div class="col" style="flex: 1;">
          <div class="row center gap8">
            <h3 style="margin: 0; font-size: 20px;">{{ shop.name }}</h3>
            <span class="tag-sm" :class="shop.status === 1 ? 'ok' : 'stopped'">{{ shop.status === 1 ? '营业中' : '已停业' }}</span>
          </div>
          <div class="small muted mt8">{{ shop.description || '暂无店铺简介' }} · 在售商品 {{ total }} 件</div>
          <div class="small muted mt8">📍 {{ shop.address || '暂无地址信息' }}　☎ {{ shop.phone || '暂无联系电话' }}</div>
        </div>
        <div style="text-align: center;">
          <div class="btn primary-btn mb8">＋ 关注店铺</div>
          <div class="btn sm outline" @click="$router.push('/map')">🗺 查看地图</div>
        </div>
      </div>

      <!-- 分类 Tabs -->
      <div class="tabs">
        <span class="tab" :class="{ on: activeTab === 'all' }" @click="selectTab('all')">全部商品</span>
        <span class="tab" :class="{ on: activeTab === 'pets' }" @click="selectTab('pets')">宠物活体</span>
        <span class="tab" :class="{ on: activeTab === 'items' }" @click="selectTab('items')">周边用品</span>
        <span class="tab" :class="{ on: activeTab === 'intro' }" @click="selectTab('intro')">店铺简介</span>
      </div>

      <!-- 店内商品列表 -->
      <div v-show="activeTab !== 'intro'">
        <div class="grid c5" v-if="!loading && products.length > 0">
          <div class="pcard" v-for="p in products" :key="p.id" @click="$router.push('/product/' + p.id)">
            <div class="img pimg" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
              <span v-if="!p.mainImage">商品图</span>
            </div>
            <div class="pbody">
              <div class="pname">{{ p.name }}</div>
              <div class="price">¥ {{ p.price }}</div>
              <div class="small muted mt8">总销量 {{ p.sales || 0 }}</div>
            </div>
          </div>
        </div>

        <div class="text-center" v-else-if="loading" style="padding: 100px; color: #5b8def;">加载中...</div>
        
        <div class="text-center card" v-else style="padding: 100px; color: #888; border: none; background: transparent;">
          该店铺暂无在售商品
        </div>

        <!-- 分页 -->
        <div class="pager" v-if="total > 0">
          <span @click="changePage(query.page - 1)" :class="{ disabled: query.page <= 1 }">‹</span>
          <span v-for="p in totalPages" :key="p" :class="{ on: query.page === p }" @click="changePage(p)">{{ p }}</span>
          <span @click="changePage(query.page + 1)" :class="{ disabled: query.page >= totalPages }">›</span>
          <span class="total-text">共 {{ total }} 件</span>
        </div>
      </div>

      <!-- 店铺简介内容 -->
      <div class="card pad20" v-show="activeTab === 'intro'" style="min-height: 400px;">
        <h3 style="margin-top:0">关于 {{ shop.name }}</h3>
        <p style="color:#555;line-height:1.8;">{{ shop.description || '店主很懒，还没有写任何介绍。' }}</p>
        <div class="line f mb8 mt16"></div>
        <div class="line l mb8"></div>
        <div class="line m"></div>
      </div>

    </div>

    <div class="container text-center" v-else-if="loading">
      <div style="padding: 100px; color: #5b8def;">加载中...</div>
    </div>
    
    <div class="container text-center" v-else>
      <div class="card" style="padding: 100px; color: #888;">
        该店铺不存在或已注销
        <div class="mt16"><router-link to="/shops" class="btn outline primary-outline" style="display:inline-block">返回门店列表</router-link></div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { getShopDetail } from "@/api/modules/shop.js";
import { searchProducts } from "@/api/modules/product.js";
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "ShopDetailView",
  data() {
    return {
      userInfo: null,
      loading: true,
      shop: null,
      searchKeyword: "",
      
      activeTab: "all",
      
      products: [],
      total: 0,
      query: {
        page: 1,
        size: 10,
        type: "",
        name: ""
      }
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    }
  },
  created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    
    this.fetchShopData();
  },
  methods: {
    async fetchShopData() {
      const id = this.$route.params.id;
      if (!id) return;
      
      this.loading = true;
      try {
        const res = await getShopDetail(id);
        if (res.data) {
          this.shop = res.data;
          this.fetchProducts();
        }
      } catch (e) {
        console.error("获取店铺详情失败", e);
        this.shop = null;
        this.loading = false;
      }
    },
    async fetchProducts() {
      if (!this.shop) return;
      this.loading = true;
      try {
        const params = {
          current: this.query.page,
          size: this.query.size,
          shopId: this.shop.id,
          status: 1 // 店铺里只展示上架商品
        };
        if (this.query.name) params.name = this.query.name;
        if (this.query.type) params.type = this.query.type;

        const res = await searchProducts(params);
        if (res.data && res.data.records) {
          this.products = res.data.records;
          this.total = res.data.total;
        }
      } catch (e) {
        console.warn("获取店内商品失败", e);
      } finally {
        this.loading = false;
      }
    },
    selectTab(tab) {
      this.activeTab = tab;
      if (tab === 'intro') return;
      
      if (tab === 'all') this.query.type = "";
      else if (tab === 'pets') this.query.type = 1;
      else if (tab === 'items') this.query.type = 2;
      
      this.query.page = 1;
      this.fetchProducts();
    },
    onSearch() {
      this.activeTab = 'all';
      this.query.type = "";
      this.query.name = this.searchKeyword;
      this.query.page = 1;
      this.fetchProducts();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages || p === this.query.page) return;
      this.query.page = p;
      this.fetchProducts();
    },
    logout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
    }
  }
};
</script>

<style scoped>
.shop-detail-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶栏 */
.topbar { display: flex; align-items: center; gap: 18px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e6e8eb; position: sticky; top: 0; z-index: 10; }
.logo { font-weight: 700; font-size: 18px; color: #5b8def; white-space: nowrap; }
.logo .paw { margin-right: 4px; }
.nav { display: flex; gap: 18px; font-size: 14px; }
.nav a, .nav span { color: #555; text-decoration: none; cursor: pointer; }
.nav .active { color: #5b8def; font-weight: 600; }
.search { flex: 1; max-width: 420px; display: flex; border: 1px solid #d6dbe3; border-radius: 20px; overflow: hidden; }
.search input { flex: 1; border: 0; padding: 8px 14px; outline: none; font-size: 13px; background: #fafbfc; }
.search .go { border: 0; background: #5b8def; color: #fff; padding: 0 18px; cursor: pointer; }
.right { display: flex; align-items: center; gap: 14px; font-size: 13px; color: #555; white-space: nowrap; margin-left: auto; }

/* 布局 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; flex: 1; }
.row { display: flex; }
.col { display: flex; flex-direction: column; }
.center { align-items: center; }
.gap8 { gap: 8px; }
.mb12 { margin-bottom: 12px; }
.mb8 { margin-bottom: 8px; }
.mt8 { margin-top: 8px; }
.mt16 { margin-top: 16px; }
.small { font-size: 13px; }
.muted { color: #888; }
.text-center { text-align: center; }
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 16px; }
.pad20 { padding: 20px; }

/* 占位线条 */
.line { background: #eee; height: 16px; border-radius: 4px; }
.line.f { width: 100%; }
.line.l { width: 80%; }
.line.m { width: 60%; }

/* 店招 */
.shop-header { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
.shop-logo { width: 88px; height: 88px; background-color: #f0f0f0; border-radius: 8px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ccc; flex-shrink: 0; border: 1px solid #eee; }
.tag-sm { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.tag-sm.ok { background: #eef4fe; color: #5b8def; }
.tag-sm.stopped { background: #f5f5f5; color: #aaa; }

.btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; user-select: none; transition: 0.2s; font-size: 14px; padding: 0 16px; height: 36px; }
.btn.sm { height: 30px; padding: 0 12px; font-size: 13px; }
.btn.outline { border: 1px solid #d6dbe3; background: #fff; color: #555; }
.btn.outline:hover { background: #f8f9fb; border-color: #bbb;}
.primary-btn { background: #5b8def; border: 1px solid #5b8def; color: #fff; }
.primary-btn:hover { background: #4a7ce0; }
.primary-outline { border-color: #5b8def; color: #5b8def; }
.primary-outline:hover { background: #eef4fe; border-color: #5b8def; }

/* Tabs */
.tabs { display: flex; border-bottom: 2px solid #e6e8eb; margin-bottom: 20px; }
.tab { padding: 12px 24px; font-size: 15px; cursor: pointer; position: relative; color: #555; font-weight: 500; }
.tab.on { color: #5b8def; font-weight: 600; }
.tab.on::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: #5b8def; }

/* 商品网格 */
.grid.c5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 30px; }
.pcard { background: #fff; border: 1px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; }
.pcard:hover { border-color: #d6dbe3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.pimg { height: 260px; background-color: #f0f0f0; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #ccc; }
.pbody { padding: 16px; flex: 1; display: flex; flex-direction: column; }
.pname { font-size: 15px; font-weight: 500; margin-bottom: 8px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: #d9534f; font-weight: 700; font-size: 18px; margin-top: auto; }

/* 分页 */
.pager { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 30px; }
.pager span { display: flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 10px; background: #fff; border: 1px solid #d6dbe3; border-radius: 6px; cursor: pointer; color: #555; user-select: none; }
.pager span:hover:not(.on):not(.disabled):not(.total-text) { background: #f8f9fb; color: #5b8def; border-color: #5b8def; }
.pager .on { background: #5b8def; color: #fff; border-color: #5b8def; font-weight: 600; }
.pager .disabled { opacity: 0.4; cursor: not-allowed; }
.pager .total-text { border: none; background: transparent; cursor: default; color: #888; }
</style>
