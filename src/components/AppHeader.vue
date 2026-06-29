<template>
  <header class="topbar">
    <div class="logo"><span class="paw">🐾</span>宠物商城</div>
    <nav class="nav">
      <router-link to="/" :class="{ active: $route.path === '/' }">首页</router-link>
      <router-link to="/products" :class="{ active: $route.path.startsWith('/product') }">全部商品</router-link>
      <router-link to="/shops" :class="{ active: $route.path.startsWith('/shop') }">找门店</router-link>
      <router-link to="/videos" :class="{ active: $route.path.startsWith('/video') }" class="muted" style="text-decoration:none">萌宠视频</router-link>
    </nav>
    <div class="search">
      <input v-model.trim="keyword" placeholder="搜索宠物 / 用品..." @keyup.enter="onSearch" />
      <button class="go" @click="onSearch">搜索</button>
    </div>
    <div class="right">
      <router-link to="/cart" class="cart-link">🛒 购物车</router-link>
      <router-link to="/messages" class="link">🔔 消息</router-link>
      <template v-if="userInfo">
        <router-link to="/orders" class="link" style="font-weight: 500;">📄 我的订单</router-link>
        <router-link to="/coupons?tab=mine" class="link" style="font-weight: 500;">🎫 优惠券</router-link>
        <span>👤 {{ userInfo.nickname || userInfo.username }}</span>
        <router-link to="/addresses" class="link" style="font-weight: 500;">📍 地址管理</router-link>
        <router-link v-if="userInfo.role === 'ADMIN' || userInfo.role === 'MERCHANT'" to="/admin/shops" class="link" style="color: #ff5000; font-weight: 600;">管理后台</router-link>
        <span class="link" @click="logout">退出</span>
      </template>
      <router-link v-else to="/login" class="link">登录 / 注册</router-link>
    </div>
  </header>
</template>

<script>
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "AppHeader",
  data() {
    return {
      keyword: "",
      userInfo: null,
    };
  },
  watch: {
    // 监听路由参数中的 name，如果变化则同步回搜索框
    '$route.query.name': {
      immediate: true,
      handler(val) {
        if (val !== undefined) {
          this.keyword = val;
        }
      }
    }
  },
  created() {
    // 读本地登录态
    const u = getStore("userInfo");
    try {
      this.userInfo = u ? JSON.parse(u) : null;
    } catch (e) {
      this.userInfo = null;
    }
  },
  methods: {
    onSearch() {
      // 避免重复跳转
      if (this.$route.path === '/products' && this.$route.query.name === this.keyword) {
        return;
      }
      this.$router.push({ path: '/products', query: { name: this.keyword } });
    },
    logout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
      // 登出后跳转回首页或刷新
      if (this.$route.path !== '/') {
        this.$router.push('/');
      } else {
        window.location.reload();
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* 顶栏 (毛玻璃化) */
.topbar {
  display: flex; align-items: center; gap: 18px;
  padding: 12px 32px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
  position: sticky; top: 0; z-index: 50;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.logo { font-weight: 700; font-size: 20px; color: #6B8DD6; white-space: nowrap; letter-spacing: -0.5px; }
.logo .paw { margin-right: 6px; }
.nav { display: flex; gap: 24px; font-size: 15px; margin-left: 10px; }
.nav a, .nav span { color: #555; text-decoration: none; cursor: pointer; transition: color 0.2s; font-weight: 500; }
.nav a:hover, .nav span:hover { color: #6B8DD6; }
.nav .active { color: #6B8DD6; font-weight: 700; }

/* 搜索框 (药丸型与微光发光特效) */
.search {
  flex: 1; max-width: 480px; display: flex;
  background: #f0f2f5; border-radius: 100px; overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 20px;
}
.search:focus-within {
  border-color: #6B8DD6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(107, 141, 214, 0.15);
}
.search input { flex: 1; border: 0; padding: 10px 20px; outline: none; font-size: 14px; background: transparent; }
.search .go {
  border: 0; background: linear-gradient(135deg, #6B8DD6 0%, #8E37D7 100%);
  color: #fff; padding: 0 24px; cursor: pointer; font-weight: 600;
  transition: opacity 0.2s;
}
.search .go:hover { opacity: 0.9; }

.right { display: flex; align-items: center; gap: 20px; font-size: 14px; color: #555; white-space: nowrap; margin-left: auto; font-weight: 500; }
.right span { cursor: pointer; transition: color 0.2s; }
.right span:hover { color: #6B8DD6; }
.link { color: #6B8DD6; cursor: pointer; text-decoration: none; font-weight: 600; transition: opacity 0.2s; }
.link:hover { opacity: 0.8; }
.cart-link { color: #555; cursor: pointer; text-decoration: none; font-weight: 500; transition: color 0.2s; }
.cart-link:hover { color: #6B8DD6; }
.muted { color: #999; }
</style>
