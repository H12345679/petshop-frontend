<template>
  <div class="shop-list-page">
    <AppHeader />

    <div class="container pad">
      <div class="card" style="padding: 12px 16px; margin-bottom: 20px;">
        <div class="row center wrap gap8">
          <span class="small muted">营业状态：</span>
          <span class="tag" :class="{ accent: query.status === '' }" @click="selectStatus('')">全部</span>
          <span class="tag" :class="{ accent: query.status === 1 }" @click="selectStatus(1)">营业中</span>
          <span class="tag" :class="{ accent: query.status === 0 }" @click="selectStatus(0)">已停业</span>
          <span class="spacer" style="flex: 1;"></span>
          <div style="display: flex; gap: 8px;">
            <input aria-label="input" v-model="query.name" placeholder="搜索门店名称..." @keyup.enter="doSearch" style="padding: 4px 10px; border: 1px solid #d6dbe3; border-radius: 4px; outline: none; font-size: 13px;" />
            <button class="btn sm outline primary" style="background:#2a69d4; color:#fff;" @click="doSearch">搜索</button>
          </div>
          <span class="btn sm outline" style="width: auto; padding: 0 12px;" @click="$router.push('/map')">🗺 切换地图模式</span>
        </div>
      </div>

      <div class="grid c4" v-if="!loading && shops.length > 0">
        <div class="card shop-card" v-for="shop in shops" :key="shop.id">
          <div class="row center mb12">
            <div class="img shop-logo" :style="shop.logo ? { backgroundImage: 'url(' + shop.logo + ')' } : null">
              <span v-if="!shop.logo">LOGO</span>
            </div>
            <div style="margin-left: 12px; flex: 1;">
              <div>
                <b>{{ shop.name }}</b> 
                <span class="tag-sm" :class="shop.status === 1 ? 'ok' : 'stopped'">{{ shop.status === 1 ? '营业中' : '已停业' }}</span>
              </div>
              <div class="small muted mt4">📍 {{ shop.address || '暂无地址信息' }}</div>
            </div>
          </div>
          <div class="small muted mb8 shop-desc">{{ shop.description || '暂无店铺简介' }}</div>
          <div class="row between center small">
            <span>☎ {{ shop.phone || '暂无电话' }}</span>
            <span class="btn sm outline" :class="{ primary: shop.status === 1, disabled: shop.status === 0 }" style="width: auto; padding: 0 12px;" @click="goToShop(shop)">
              {{ shop.status === 1 ? '进店逛逛 >' : '暂停营业' }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="container text-center" v-else-if="loading">
        <div style="padding: 100px; color: #2a69d4;">加载中...</div>
      </div>

      <div class="container text-center" v-else>
        <div class="card" style="padding: 100px; color: #595959;">
          没有找到相关的门店记录
        </div>
      </div>

      <div class="pager" v-if="total > 0">
        <span @click="changePage(query.page - 1)" :class="{ disabled: query.page <= 1 }"><</span>
        <span v-for="p in totalPages" :key="p" :class="{ on: query.page === p }" @click="changePage(p)">{{ p }}</span>
        <span @click="changePage(query.page + 1)" :class="{ disabled: query.page >= totalPages }">></span>
        <span class="total-text">共 {{ total }} 家</span>
      </div>
    </div>
    
    <AppFooter />
  </div>
</template>

<script>
import { searchShops } from "@/api/modules/shop.js";

export default {
  name: "ShopsView",
  data() {
    return {
      loading: false,
      shops: [],
      total: 0,
      query: {
        page: 1,
        size: 10,
        name: "",
        status: ""
      }
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    }
  },
  created() {    
    this.doSearch();
  },
  methods: {
    async doSearch() {
      this.loading = true;
      try {
        const params = {
          current: this.query.page,
          size: this.query.size
        };
        if (this.query.name) {
          params.name = this.query.name;
        } 
        if (this.query.status !== "") {
          params.status = this.query.status;
        }
        const res = await searchShops(params);
        if (res.data && res.data.records) {
          this.shops = res.data.records;
          this.total = res.data.total;
        }
      } catch (e) {
        console.warn("获取商店列表失败", e);
      } finally {
        this.loading = false;
      }
    },
    selectStatus(status) {
      this.query.status = status;
      this.query.page = 1;
      this.doSearch();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages || p === this.query.page) {
        return;
      }
      this.query.page = p;
      this.doSearch();
    },
    goToShop(shop) {
      if (shop.status === 0) {
        return;
      }
      this.$router.push('/shop/' + shop.id);
    }
  }
};
</script>

<style scoped>
.shop-list-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 布局 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; flex: 1; }
.pad { padding: 18px 0 40px; }
.row { display: flex; }
.center { align-items: center; }
.between { justify-content: space-between; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.mb12 { margin-bottom: 12px; }
.mb8 { margin-bottom: 8px; }
.mt4 { margin-top: 4px; }
.small { font-size: 13px; }
.muted { color: #595959; }
.text-center { text-align: center; }
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 16px; }

/* 网格 */
.grid.c4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }

/* 标签与按钮 */
.tag { margin: 0; padding: 4px 12px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: #555; background: #fff; border: 1px solid transparent; }
.tag.accent { background: #eef4fe; color: #2a69d4; font-weight: 600; }
.tag:hover:not(.accent) { background: #f8f9fb; }
.tag-sm { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 6px; }
.tag-sm.ok { background: #eef4fe; color: #2a69d4; }
.tag-sm.stopped { background: #f5f5f5; color: #aaa; }

.btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; user-select: none; transition: 0.2s; }
.btn.sm { height: 32px; padding: 0 12px; font-size: 13px; background: #f0f3fa; color: #555; }
.btn.outline { border: 1px solid #d6dbe3; background: #fff; }
.btn.outline.primary { border-color: #2a69d4; color: #2a69d4; }
.btn.outline.primary:hover { background: #eef4fe; }
.btn.disabled { opacity: 0.6; cursor: not-allowed; background: #f5f5f5; color: #aaa; border-color: #eee; }

/* 商店卡片内部 */
.shop-logo { width: 56px; height: 56px; background-color: #f0f0f0; border-radius: 8px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ccc; flex-shrink: 0; }
.shop-desc { height: 38px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }

/* 分页 */
.pager { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 30px; }
.pager span { display: flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 10px; background: #fff; border: 1px solid #d6dbe3; border-radius: 6px; cursor: pointer; color: #555; user-select: none; }
.pager span:hover:not(.on):not(.disabled):not(.total-text) { background: #f8f9fb; color: #2a69d4; border-color: #2a69d4; }
.pager .on { background: #2a69d4; color: #fff; border-color: #2a69d4; font-weight: 600; }
.pager .disabled { opacity: 0.4; cursor: not-allowed; }
.pager .total-text { border: none; background: transparent; cursor: default; color: #595959; }
</style>
