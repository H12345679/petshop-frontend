<template>
  <div class="panel">
    <h3>我的收藏</h3>
    <div v-if="loadingFavorites" class="empty">加载中…</div>
    <div v-else-if="favorites.length === 0" class="empty">还没有收藏商品，去逛逛吧~</div>
    <div v-else class="fav-grid">
      <div v-for="p in favorites" :key="p.id" class="fav-card" @click="$router.push('/product/' + p.id)">
        <div class="fav-img" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
          <span v-if="!p.mainImage">商品图</span>
        </div>
        <div class="fav-body">
          <div class="fav-name">{{ p.name }}</div>
          <div class="fav-price">¥{{ p.price }}</div>
        </div>
        <span class="fav-del" title="取消收藏" @click.stop="doRemoveFavorite(p.id)">✕</span>
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
import { getFavorites, removeFavorite } from "@/api/modules/user.js";

export default {
  name: "UserFavorites",
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
        const res = await getFavorites({ current: this.favoritePage, size: 8 });
        const d = res.data || {};
        this.favorites = d.records || [];
        this.favoritePages = d.pages || 1;
        this.favoriteTotal = d.total || 0;
        this.$emit('update-total', this.favoriteTotal);
      } catch (e) {
        this.favorites = [];
      } finally {
        this.loadingFavorites = false;
      }
    },
    async doRemoveFavorite(productId) {
      if (!confirm("确定取消收藏该商品吗？")) return;
      try {
        await removeFavorite(productId);
        this.$emit('notify', "success", "已取消收藏");
        this.favorites = this.favorites.filter(f => f.id !== productId);
        this.favoriteTotal = Math.max(0, this.favoriteTotal - 1);
        this.$emit('update-total', this.favoriteTotal);
        if (this.favorites.length === 0 && this.favoritePage > 1) {
          this.loadFavorites(this.favoritePage - 1);
        }
      } catch (e) {
        this.$emit('notify', "error", e.message || "操作失败");
      }
    }
  }
};
</script>

<style scoped>
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0 0 16px; font-size: 16px; }

/* 收藏 */
.fav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fav-card {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; overflow: hidden;
  position: relative; transition: .12s; cursor: pointer;
}
.fav-card:hover { box-shadow: 0 4px 14px rgba(60,90,160,.1); }
.fav-img {
  width: 100%; aspect-ratio: 1 / 1; background-size: cover; background-position: center;
  display: flex; align-items: center; justify-content: center; color: #aab0b8; font-size: 12px;
  background-color: #eef0f3;
}
.fav-body { padding: 8px 10px; }
.fav-name { font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-price { font-size: 14px; font-weight: 700; color: #c0392b; margin-top: 4px; }
.fav-del {
  position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%;
  background: rgba(0,0,0,.4); color: #fff; font-size: 11px; display: flex; align-items: center;
  justify-content: center; cursor: pointer; opacity: 0; transition: .12s;
}
.fav-card:hover .fav-del { opacity: 1; }
.fav-del:hover { background: #c0392b; }

/* 分页 */
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; }
.pager-info { font-size: 13px; color: #595959; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.sm { padding: 5px 14px; font-size: 12px; }

.empty { padding: 24px 0; text-align: center; color: #595959; font-size: 13px; }

@media (max-width: 860px) {
  .fav-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
