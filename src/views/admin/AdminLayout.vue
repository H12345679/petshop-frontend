<template>
  <div class="admin-layout">
    <div class="aside">
      <div class="brand">
        🐾 宠物商城后台
      </div>
      <div class="menu-group">
        数据
      </div>
      <router-link to="/admin/dashboard">
        📊 数据看板
      </router-link>
      <div class="menu-group">
        商品
      </div>
      <router-link to="/admin/shops">
        🏬 商店管理
      </router-link>
      <router-link to="/admin/products">
        📦 商品管理
      </router-link>
      <router-link to="/admin/reviews">
        ⭐ 评价管理
      </router-link>
      <div class="menu-group">
        交易
      </div>
      <router-link to="/admin/orders">
        🧾 订单管理
      </router-link>
      <router-link to="/admin/refunds">
        ↩ 退单审核
      </router-link>
      <router-link to="/admin/coupons" v-if="userInfo && userInfo.role === 'ADMIN'">
        🎫 优惠券管理
      </router-link>
      <div class="menu-group">
        运营
      </div>
      <router-link to="/admin/videos">
        🎬 视频管理
      </router-link>
      <router-link to="/admin/messages" v-if="userInfo && ['ADMIN', 'MERCHANT'].includes(userInfo.role)">
        🔔 消息推送
      </router-link>
      <router-link to="/admin/my-messages">
        📩 我的消息
      </router-link>
      <template v-if="userInfo && userInfo.role === 'ADMIN'">
        <div class="menu-group">
          用户
        </div>
        <router-link to="/admin/users">
          👥 用户与会员
        </router-link>
      </template>
      <template v-if="userInfo && userInfo.role === 'ADMIN'">
        <div class="menu-group">
          系统
        </div>
        <router-link to="/admin/logs">
          📝 日志审核
        </router-link>
      </template>
      <div style="flex: 1;"></div>
      <router-link to="/" class="menu-group" style="margin-bottom: 20px; color: #595959;">
        ← 返回前台
      </router-link>
    </div>

    <div class="amain">
      <div class="atop">
        <span>{{ $route.meta.title || '后台管理' }}</span>
        <div class="spacer"></div>
        <span>👤 {{ userInfo ? (userInfo.nickname || userInfo.username) : '未登录' }}</span>
      </div>

      <div class="acontent">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminLayout",
  data() {
    return {
      userInfo: null
    };
  },
  created() {
    const u = getStore("userInfo");
    try {
      this.userInfo = u ? JSON.parse(u) : null;
    } catch (e) {
      this.userInfo = null;
    }
  }
};
</script>

<style scoped>
/* Admin 基础布局 */
.admin-layout { display: flex; height: 100vh; background: #f4f5f7; font-size: 14px; color: #333; }
.aside { width: 280px; background: #2c303a; border-right: none; display: flex; flex-direction: column; flex-shrink: 0; color: #aeb9c2; overflow-y: auto; }
.brand { padding: 24px 20px; font-size: 22px; font-weight: 700; color: #fff; background: #242830; margin-bottom: 12px; display: flex; align-items: center; letter-spacing: 1px; }
.menu-group { padding: 20px 20px 10px; font-size: 15px; color: #76838f; font-weight: 600; text-decoration: none;}
.aside a { display: block; padding: 16px 24px; font-size: 16px; color: #aeb9c2; text-decoration: none; cursor: pointer; border-left: 4px solid transparent; transition: all 0.3s ease; }
.aside a:hover { background: #343a46; color: #fff; padding-left: 28px; }
/* vue-router's exact active class automatically applies .router-link-exact-active */
.aside a.router-link-active { color: #fff; font-weight: 600; background: #3b4252; border-left-color: #2a69d4; }

.amain { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.atop { height: 60px; background: #fff; border-bottom: 1px solid #e6e8eb; display: flex; align-items: center; padding: 0 24px; font-weight: 500; }
.acontent { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; }
.spacer { flex: 1; }
</style>
