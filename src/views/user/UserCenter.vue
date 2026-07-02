<template>
  <div class="user-center">
    <AppHeader />

    <!-- 通知条 -->
    <div v-if="notification" :class="['notify', notification.type]">
      {{ notification.message }}
      <span class="notify-close" @click="notification = null">✕</span>
    </div>

    <div class="uc-body">
      <!-- 左侧菜单 -->
      <aside class="uc-sidebar">
        <div class="side-avatar" v-if="userInfo">
          <div class="avatar-ring" :class="memberClass">
            <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" />
            <span v-else class="avatar-txt">{{ (userInfo.nickname || userInfo.username || '我')[0] }}</span>
          </div>
          <div class="side-name">{{ userInfo.nickname || userInfo.username }}</div>
          <div class="side-tag" :class="memberClass">{{ memberLevelName }}</div>
        </div>
        <div class="side-avatar" v-else>
          <div class="avatar-ring"><span class="avatar-txt">?</span></div>
          <div class="side-name muted">加载中…</div>
        </div>

        <nav class="side-nav">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            :class="['side-item', { active: currentTab === tab.key }]"
            @click="switchTab(tab.key)"
          >
            <span class="side-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </div>
          <div class="side-item danger" @click="handleLogout">退出登录</div>
        </nav>
      </aside>

      <!-- 右侧内容 -->
      <div class="uc-content">
        <!-- 资产卡片 -->
        <div class="kpi-row">
          <div class="kpi-card" @click="$router.push('/recharge')">
            <div class="kpi-label">账户余额</div>
            <div class="kpi-val">¥{{ userInfo ? userInfo.balance : '--' }}</div>
            <div class="kpi-act">充值 ›</div>
          </div>
          <div class="kpi-card" @click="switchTab('membership')">
            <div class="kpi-label">积分</div>
            <div class="kpi-val">{{ userInfo ? userInfo.points : '--' }}</div>
            <div class="kpi-act">兑换 ›</div>
          </div>
          <div class="kpi-card" @click="switchTab('coupons')">
            <div class="kpi-label">优惠券</div>
            <div class="kpi-val">{{ couponCount }}</div>
            <div class="kpi-act">查看 ›</div>
          </div>
          <div class="kpi-card" @click="switchTab('favorites')">
            <div class="kpi-label">收藏商品</div>
            <div class="kpi-val">{{ favoriteTotal }}</div>
            <div class="kpi-act">查看 ›</div>
          </div>
        </div>

        <!-- 订单快捷入口 -->
        <div class="order-bar">
          <div class="order-head">
            <span class="section-title">我的订单</span>
            <span class="more" @click="switchTab('orders')">全部订单 ›</span>
          </div>
          <div class="order-icons">
            <div class="order-item" @click="switchTabOrders('0')">
              <span class="order-emoji">💰</span>
              <span class="order-label">待支付</span>
            </div>
            <div class="order-item" @click="switchTabOrders('1')">
              <span class="order-emoji">📦</span>
              <span class="order-label">待发货</span>
            </div>
            <div class="order-item" @click="switchTabOrders('2')">
              <span class="order-emoji">🚚</span>
              <span class="order-label">待收货</span>
            </div>
            <div class="order-item" @click="switchTabOrders('3')">
              <span class="order-emoji">⭐</span>
              <span class="order-label">待评价</span>
            </div>
            <div class="order-item" @click="switchTab('orders')">
              <span class="order-emoji">↩</span>
              <span class="order-label">退款/售后</span>
            </div>
          </div>
        </div>

        <!-- ========== 动态面板区域 ========== -->
        <keep-alive>
          <UserProfile
            v-if="currentTab === 'profile'"
            :user-info="userInfo"
            @update-user="loadUserInfo"
            @logout="handleLogout"
            @notify="notify"
          />
          <UserOrders
            v-else-if="currentTab === 'orders'"
            :status-filter.sync="orderStatusFilter"
            @notify="notify"
          />
          <UserAddress
            v-else-if="currentTab === 'address'"
            @notify="notify"
          />
          <UserFavorites
            v-else-if="currentTab === 'favorites'"
            @update-total="val => favoriteTotal = val"
            @notify="notify"
          />
          <UserShopFavorites
            v-else-if="currentTab === 'shopFavorites'"
            @update-total="val => shopFavoriteTotal = val"
            @notify="notify"
          />
          <UserCoupons
            v-else-if="currentTab === 'coupons'"
            @update-count="val => couponCount = val"
            @notify="notify"
          />
          <UserMembership
            v-else-if="currentTab === 'membership'"
            :user-info="userInfo"
            @update-user="loadUserInfo"
            @notify="notify"
          />
          <UserMessages
            v-else-if="currentTab === 'messages'"
            @notify="notify"
          />
          <UserReviews
            v-else-if="currentTab === 'reviews'"
            @notify="notify"
          />
        </keep-alive>

        <!-- 修改密码弹窗 -->
        <el-dialog
          title="修改密码"
          :visible.sync="showPasswordModal"
          width="460px"
          :close-on-click-modal="false"
        >
          <UserPassword
            @notify="notify"
            @logout="handleLogout"
          />
        </el-dialog>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import UserProfile from "@/views/user/UserProfile.vue";
import UserOrders from "@/views/user/UserOrders.vue";
import UserAddress from "@/views/user/UserAddress.vue";
import UserFavorites from "./UserFavorites.vue";
import UserShopFavorites from "./UserShopFavorites.vue";
import UserCoupons from "./UserCoupons.vue";
import UserMembership from "@/views/user/UserMembership.vue";
import UserMessages from "@/views/user/UserMessages.vue";
import UserReviews from "@/views/user/UserReviews.vue";
import UserPassword from "@/views/user/UserPassword.vue";

import { getUserInfo, getMembershipLevels, getFavorites, getMyCoupons } from "@/api/modules/user.js";
import { getStore, setStore, removestore } from "@/libs/storage.js";

export default {
  name: "UserCenter",
  components: { 
    AppHeader,
    AppFooter,
    UserProfile,
    UserOrders,
    UserAddress,
    UserFavorites,
    UserShopFavorites,
    UserCoupons,
    UserMembership,
    UserMessages,
    UserReviews,
    UserPassword
  },
  data() {
    return {
      currentTab: "profile",
      tabs: [
        { key: "profile",    label: "个人资料",    icon: "👤" },
        { key: "orders", label: "我的订单", icon: "📦" },
        { key: "favorites", label: "我的收藏", icon: "⭐" },
        { key: "shopFavorites", label: "关注店铺", icon: "🏪" },
        { key: "coupons", label: "我的优惠券", icon: "🎫" },
        { key: "membership", label: "会员中心",    icon: "👑" },
        { key: "reviews",    label: "我的评价",    icon: "⭐" },
        { key: "messages",   label: "消息中心",    icon: "💬" },
        { key: "password",   label: "修改密码", icon: "🔒" },
      ],

      // 用户数据
      userInfo: null,
      membershipLevels: [],

      // 简单缓存一些数量供快捷面板显示
      couponCount: '--',
      favoriteTotal: '--',
      orderStatusFilter: "",

      // UI
      loading: true,
      notification: null,
      showPasswordModal: false,
    };
  },
  computed: {
    memberLevelName() {
      if (!this.userInfo || !this.userInfo.memberLevelId) return "普通用户";
      const lv = this.membershipLevels.find(l => l.id === this.userInfo.memberLevelId);
      return lv ? lv.name : "普通用户";
    },
    memberClass() {
      if (!this.userInfo) return "";
      const id = this.userInfo.memberLevelId;
      if (id >= 3) return "gold";
      if (id === 2) return "silver";
      return "";
    }
  },
  created() {
    this.restoreLocal();
    this.loadUserInfo();
    this.loadMembershipLevels();
    this.loadFavoriteCount();
    this.loadCouponCount();
  },
  methods: {
    restoreLocal() {
      const u = getStore("userInfo");
      try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    },
    async loadUserInfo() {
      try {
        const res = await getUserInfo();
        this.userInfo = res.data;
        setStore("userInfo", JSON.stringify(res.data));
      } catch (e) { /* 本地兜底 */ } finally { this.loading = false; }
    },
    async loadMembershipLevels() {
      try {
        const res = await getMembershipLevels();
        this.membershipLevels = res.data || [];
      } catch (e) { /* ignore */ }
    },
    async loadFavoriteCount() {
      try {
        const res = await getFavorites({ current: 1, size: 1 });
        if (res && res.data && res.data.total !== undefined) {
          this.favoriteTotal = res.data.total;
        }
      } catch (e) { /* ignore */ }
    },
    async loadCouponCount() {
      try {
        const res = await getMyCoupons({ status: 0 });
        this.couponCount = res.data ? res.data.length : 0;
      } catch (e) { /* ignore */ }
    },

    // ========== 菜单切换 ==========
    switchTab(key) {
      if (key === 'password') {
        this.showPasswordModal = true;
      } else {
        this.currentTab = key;
      }
    },
    switchTabOrders(status) {
      this.orderStatusFilter = status;
      this.currentTab = "orders";
    },

    // ========== 通知 ==========
    notify(type, message) {
      this.notification = { type, message };
      setTimeout(() => { this.notification = null; }, 3500);
    },

    // ========== 退出登录 ==========
    handleLogout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
      this.$router.push("/");
    },
  },
};
</script>

<style scoped>
/* ========== 全局布局 ========== */
.user-center { background: #f4f5f7; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }



.notify {
  padding: 10px 24px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;
}
.notify.success { background: #e7f5ec; color: #1a7a3a; border-bottom: 1px solid #b8dfc8; }
.notify.error { background: #fdecea; color: #b71c1c; border-bottom: 1px solid #f5c6cb; }
.notify-close { cursor: pointer; font-weight: 700; }

.uc-body {
  flex: 1; display: flex; width: 1600px; max-width: 100%; margin: 20px auto; gap: 20px; padding: 0 24px; overflow: hidden;
}

/* ========== 左侧菜单 ========== */
.uc-sidebar {
  width: 210px; flex-shrink: 0; background: #fff; border: 1px solid #e6e8eb; border-radius: 10px;
  padding: 20px 0; overflow-y: auto; height: 100%; box-sizing: border-box;
}
.side-avatar { text-align: center; padding: 0 16px 16px; border-bottom: 1px solid #e6e8eb; margin-bottom: 8px; }
.avatar-ring {
  width: 64px; height: 64px; border-radius: 50%; background: #e3e6ec; color: #999;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;
  overflow: hidden; border: 2px solid #e6e8eb;
}
.avatar-ring.gold { border-color: #c9a96e; }
.avatar-ring.silver { border-color: #8f9bb3; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-txt { font-size: 22px; }
.side-name { font-weight: 600; font-size: 14px; }
.side-tag {
  display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 10px; margin-top: 6px;
  background: #f0f3fa; color: #6a7c9c;
}
.side-tag.gold { background: #fdf3e1; color: #b8860b; }
.side-tag.silver { background: #eef0f3; color: #5c6b82; }
.muted { color: #999; }

.side-nav { padding: 0; }
.side-item {
  padding: 10px 24px; font-size: 14px; color: #444; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: .12s;
}
.side-item:hover { background: #f4f5f7; color: #5b8def; }
.side-item.active { background: #e7eefc; color: #5b8def; font-weight: 600; border-right: 3px solid #5b8def; }
.side-item.danger { color: #d9534f; }
.side-item.danger:hover { background: #fdecea; }
.side-icon { width: 20px; text-align: center; }

/* ========== 右侧内容 ========== */
.uc-content { flex: 1; min-width: 0; height: 100%; overflow-y: auto; padding-right: 8px; }

/* 自定义滚动条样式 */
.uc-content::-webkit-scrollbar, .uc-sidebar::-webkit-scrollbar { width: 6px; }
.uc-content::-webkit-scrollbar-thumb, .uc-sidebar::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 4px; }
.uc-content::-webkit-scrollbar-track, .uc-sidebar::-webkit-scrollbar-track { background: transparent; }

.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
.kpi-card {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 16px; cursor: pointer; transition: .15s;
}
.kpi-card:hover { box-shadow: 0 4px 14px rgba(60,90,160,.1); transform: translateY(-1px); }
.kpi-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.kpi-val { font-size: 22px; font-weight: 700; color: #333; margin-bottom: 6px; }
.kpi-act { font-size: 12px; color: #5b8def; }

.order-bar {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.order-head { display: flex; align-items: center; margin-bottom: 14px; }
.section-title { font-size: 15px; font-weight: 600; }
.more { margin-left: auto; font-size: 12px; color: #5b8def; cursor: pointer; }
.order-icons { display: flex; justify-content: space-around; }
.order-item { text-align: center; cursor: pointer; padding: 8px 12px; border-radius: 8px; transition: .12s; }
.order-item:hover { background: #f4f5f7; }
.order-emoji { font-size: 26px; display: block; margin-bottom: 4px; }
.order-label { font-size: 12px; color: #666; }

/* 响应式 */
@media (max-width: 860px) {
  .uc-body { flex-direction: column; padding: 0 12px; }
  .uc-sidebar { width: 100%; position: static; }
  .side-nav { display: flex; flex-wrap: wrap; justify-content: center; }
  .side-item { padding: 8px 14px; font-size: 12px; border-right: none; border-bottom: 2px solid transparent; }
  .side-item.active { border-right: none; border-bottom-color: #5b8def; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
