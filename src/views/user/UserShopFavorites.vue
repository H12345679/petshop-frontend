<template>
  <div class="panel">
    <h3>关注店铺</h3>
    <div v-if="loadingFavorites" class="empty">加载中…</div>
    <div v-else-if="favorites.length === 0" class="empty">还没有关注任何店铺，去逛逛吧~</div>
    <div v-else class="fav-grid">
      <div v-for="shop in favorites" :key="shop.id" class="fav-card shop-fav-card" @click="$router.push('/shop/' + shop.id)">
        <div class="fav-img" :style="shop.logo ? { backgroundImage: 'url(' + shop.logo + ')' } : null" style="border-radius: 50%;">
          <span v-if="!shop.logo">店 LOGO</span>
        </div>
        <div class="fav-body" style="text-align: center;">
          <div class="fav-name" style="margin-top: 8px;">{{ shop.name }}</div>
          <div class="small muted mt8" style="font-size: 12px; color: #888;">
            {{ shop.status === 1 ? '营业中' : '已停业' }}
          </div>
        </div>
        <span class="fav-del" title="取消关注" @click.stop="doRemoveFavorite(shop.id)">✕</span>
      </div>
    </div>
    <div class="pager" v-if="favoritePages > 1">
      <button class="btn sm" :disabled="favoritePage <= 1" @click="loadFavorites(favoritePage - 1)">上一页</button>
      <span class="pager-info">{{ favoritePage }} / {{ favoritePages }}</span>
      <button class="btn sm" :disabled="favoritePage >= favoritePages" @click="loadFavorites(favoritePage + 1)">下一页</button>
    </div>
  </div>
</template>

<script>
import { getShopFavorites, removeShopFavorite } from "@/api/modules/shop.js";

export default {
  name: "UserShopFavorites",
  data() {
    return {
      favorites: [],
      favoritePage: 1,
      favoritePages: 1,
      favoriteTotal: 0,
      loadingFavorites: false,
    };
  },
  created() {
    this.loadFavorites(1);
  },
  activated() {
    this.loadFavorites(this.favoritePage);
  },
  methods: {
    async loadFavorites(page) {
      this.favoritePage = page || this.favoritePage;
      this.loadingFavorites = true;
      try {
        const res = await getShopFavorites({
          current: this.favoritePage,
          size: 12
        });
        if (res.data) {
          this.favorites = res.data.records || [];
          this.favoriteTotal = res.data.total || 0;
          this.favoritePages = Math.ceil(this.favoriteTotal / 12) || 1;
          this.$emit("update-total", this.favoriteTotal);
        }
      } catch (e) {
        console.warn("加载店铺收藏失败", e);
      } finally {
        this.loadingFavorites = false;
      }
    },
    async doRemoveFavorite(id) {
      if (!confirm("确定要取消关注该店铺吗？")) return;
      try {
        await removeShopFavorite(id);
        this.$emit("notify", { type: "success", message: "已取消关注" });
        if (this.favorites.length === 1 && this.favoritePage > 1) {
          this.favoritePage--;
        }
        this.loadFavorites(this.favoritePage);
      } catch (e) {
        console.error(e);
        this.$emit("notify", { type: "error", message: e.message || "取消失败" });
      }
    }
  }
};
</script>

<style scoped>
.shop-fav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}
.shop-fav-card .fav-img {
  width: 80px;
  height: 80px;
  background-size: cover;
  background-position: center;
  background-color: #f0f2f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 12px;
}
</style>
