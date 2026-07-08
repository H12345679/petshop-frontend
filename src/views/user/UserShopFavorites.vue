<template>
  <div class="panel">
    <h3>关注店铺</h3>
    <div v-if="loadingFavorites" class="empty">加载中…</div>
    <div v-else-if="favorites.length === 0" class="empty">还没有关注任何店铺，去逛逛吧~</div>
    <div v-else class="fav-grid">
      <div v-for="shop in favorites" :key="shop.id" class="fav-card" @click="$router.push('/shop/' + shop.id)">
        <div class="fav-img" :style="shop.logo ? { backgroundImage: 'url(' + shop.logo + ')' } : null">
          <span v-if="!shop.logo">
            {{ shop.name ? shop.name[0] : '店' }}
          </span>
        </div>
        <div class="fav-body" style="text-align: center; padding: 12px 0;">
          <div class="fav-name" style="margin-bottom: 8px;">
            {{ shop.name }}
          </div>
          <div class="fav-status" :class="shop.status === 1 ? 'status-ok' : 'status-stopped'">
            {{ shop.status === 1 ? '营业中' : '已停业' }}
          </div>
        </div>
        <span class="fav-del" title="取消关注" @click.stop="doRemoveFavorite(shop.id)">
          ✕
        </span>
      </div>
    </div>
    <div class="pager" v-if="favoritePages > 1">
      <button class="btn sm" :disabled="favoritePage <= 1" @click="loadFavorites(favoritePage - 1)">
        上一页
      </button>
      <span class="pager-info">{{ favoritePage }} / {{ favoritePages }}</span>
      <button class="btn sm" :disabled="favoritePage >= favoritePages" @click="loadFavorites(favoritePage + 1)">
        下一页
      </button>
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
        this.$emit("notify", "success", "已取消关注");
        if (this.favorites.length === 1 && this.favoritePage > 1) {
          this.favoritePage--;
        }
        this.loadFavorites(this.favoritePage);
      } catch (e) {
        console.error(e);
        this.$emit("notify", "error", e.message || "取消失败");
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
  display: flex; align-items: center; justify-content: center; color: #434a54; font-size: 16px;
  background-color: #eef0f3;
}
.fav-body { padding: 8px 10px; }
.fav-name {
  font-size: 14px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 4px;
}
.fav-del {
  position: absolute; right: 8px; top: 8px; width: 24px; height: 24px; line-height: 22px;
  text-align: center; background: rgba(0,0,0,.3); color: #fff; border-radius: 50%;
  font-size: 14px; opacity: 0; transition: .2s;
}
.fav-card:hover .fav-del { opacity: 1; }
.fav-del:hover { background: rgba(0,0,0,.6); }

.fav-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}
.status-ok {
  background: #e1f3d8;
  color: #164f19;
}
.status-stopped {
  background: #f4f4f5;
  color: #595959;
}
</style>
