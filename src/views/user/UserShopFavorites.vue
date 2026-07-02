<template>
  <div class="panel">
    <h3>关注店铺</h3>
    <div v-if="loadingFavorites" class="empty">加载中…</div>
    <div v-else-if="favorites.length === 0" class="empty">还没有关注任何店铺，去逛逛吧~</div>
    <div v-else class="shop-fav-grid">
      <div v-for="shop in favorites" :key="shop.id" class="shop-fav-card" @click="$router.push('/shop/' + shop.id)">
        <div class="shop-fav-img" :style="shop.logo ? { backgroundImage: 'url(' + shop.logo + ')' } : null">
          <span v-if="!shop.logo">{{ shop.name ? shop.name[0] : '店' }}</span>
        </div>
        <div class="shop-fav-body">
          <div class="shop-fav-name">{{ shop.name }}</div>
          <div class="shop-fav-status" :class="shop.status === 1 ? 'status-ok' : 'status-stopped'">
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
.shop-fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 16px;
}
.shop-fav-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: all 0.3s ease;
}
.shop-fav-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
  border-color: #5b8def;
}
.shop-fav-img {
  width: 80px;
  height: 80px;
  background-size: cover;
  background-position: center;
  background-color: #f5f7fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 24px;
  font-weight: bold;
  border: 1px solid #ebeef5;
  margin-bottom: 16px;
}
.shop-fav-body {
  text-align: center;
  width: 100%;
}
.shop-fav-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shop-fav-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}
.status-ok {
  background: #e1f3d8;
  color: #67c23a;
}
.status-stopped {
  background: #f4f4f5;
  color: #909399;
}
.fav-del {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0,0,0,0.02);
}
.fav-del:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  transform: scale(1.1);
}
</style>
