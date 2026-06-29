<template>
  <div class="user-center">
    <!-- 顶栏 -->
    <header class="topbar">
      <router-link to="/" class="logo"><span class="paw">🐾</span>宠物商城</router-link>
      <div class="spacer"></div>
      <div class="right">
        <span>🛒 购物车</span>
        <template v-if="userInfo">
          <span class="link">👤 {{ userInfo.nickname || userInfo.username }}</span>
          <span class="link" @click="handleLogout">退出</span>
        </template>
        <router-link v-else to="/login" class="link">登录 / 注册</router-link>
      </div>
    </header>

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
          <div class="kpi-card" @click="switchTab('profile')">
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
            <div class="kpi-label">收藏</div>
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
            <div class="order-item" @click="switchTabOrders(0)">
              <span class="order-emoji">💰</span>
              <span class="order-label">待支付</span>
            </div>
            <div class="order-item" @click="switchTabOrders(1)">
              <span class="order-emoji">📦</span>
              <span class="order-label">待发货</span>
            </div>
            <div class="order-item" @click="switchTabOrders(2)">
              <span class="order-emoji">🚚</span>
              <span class="order-label">待收货</span>
            </div>
            <div class="order-item" @click="switchTabOrders(3)">
              <span class="order-emoji">⭐</span>
              <span class="order-label">待评价</span>
            </div>
            <div class="order-item" @click="switchTab('orders')">
              <span class="order-emoji">↩</span>
              <span class="order-label">退款/售后</span>
            </div>
          </div>
        </div>

        <!-- ========== 面板区域 ========== -->

        <!-- 个人资料 -->
        <div class="panel" v-if="currentTab === 'profile'">
          <h3>个人资料</h3>
          <div class="profile-layout">
            <div class="profile-avatar-col">
              <div class="avatar-big">
                <img v-if="profileForm.avatar" :src="profileForm.avatar" class="avatar-img" />
                <span v-else class="avatar-txt big">{{ (userInfo.nickname || userInfo.username || '我')[0] }}</span>
              </div>
              <div class="field mt8">
                <label>头像URL</label>
                <input class="input" v-model.trim="profileForm.avatar" placeholder="输入头像图片地址" />
              </div>
            </div>
            <div class="profile-fields">
              <div class="field-row">
                <div class="field col">
                  <label>用户名</label>
                  <input class="input disabled" :value="userInfo.username" disabled />
                </div>
                <div class="field col">
                  <label>昵称 <span class="req">*</span></label>
                  <input class="input" v-model.trim="profileForm.nickname" placeholder="你的昵称" />
                </div>
              </div>
              <div class="field-row">
                <div class="field col">
                  <label>性别</label>
                  <select class="input" v-model.number="profileForm.gender">
                    <option :value="0">未知</option>
                    <option :value="1">男</option>
                    <option :value="2">女</option>
                  </select>
                </div>
                <div class="field col">
                  <label>手机号</label>
                  <input class="input" v-model.trim="profileForm.phone" placeholder="手机号" />
                </div>
              </div>
              <div class="field-row">
                <div class="field col">
                  <label>邮箱</label>
                  <input class="input" v-model.trim="profileForm.email" placeholder="邮箱地址" />
                </div>
                <div class="field col"></div>
              </div>
              <button class="btn primary" :disabled="savingProfile" @click="saveProfile">
                {{ savingProfile ? '保存中…' : '保存修改' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 修改密码 -->
        <div class="panel" v-if="currentTab === 'password'">
          <h3>账号安全 · 修改密码</h3>
          <div class="form-narrow">
            <div class="field">
              <label>当前密码 <span class="req">*</span></label>
              <input class="input" v-model="passwordForm.oldPassword" type="password" placeholder="输入当前密码" />
            </div>
            <div class="field">
              <label>新密码 <span class="req">*</span></label>
              <input class="input" v-model="passwordForm.newPassword" type="password" placeholder="至少 6 位" />
            </div>
            <div class="field">
              <label>确认新密码 <span class="req">*</span></label>
              <input class="input" v-model="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" />
            </div>
            <button class="btn primary" :disabled="savingPassword" @click="savePassword">
              {{ savingPassword ? '保存中…' : '保存新密码' }}
            </button>
          </div>
        </div>

        <!-- ====== 我的订单 ====== -->
        <div class="panel" v-if="currentTab === 'orders'">
          <div class="panel-head">
            <h3>我的订单</h3>
            <div class="status-filters">
              <span
                v-for="s in orderStatusFilters"
                :key="s.value"
                :class="['filter-tag', { on: orderStatusFilter === s.value }]"
                @click="orderStatusFilter = s.value; loadOrders(1)"
              >{{ s.label }}</span>
            </div>
          </div>

          <div v-if="loadingOrders" class="empty">加载中…</div>
          <div v-else-if="orders.length === 0" class="empty">暂无订单</div>
          <div v-else class="order-list">
            <div v-for="o in orders" :key="o.id" class="order-card">
              <div class="oc-head">
                <span class="oc-no">{{ o.orderNo }}</span>
                <span class="oc-status" :style="{ color: orderStatusColor(o.status) }">{{ orderStatusLabel(o.status) }}</span>
              </div>
              <div class="oc-items">
                <div v-for="item in o.orderItems" :key="item.id" class="oc-item">
                  <div class="oci-img" :style="item.productImage ? { backgroundImage: 'url(' + item.productImage + ')' } : null">
                    <span v-if="!item.productImage">图</span>
                  </div>
                  <div class="oci-info">
                    <div class="oci-name">{{ item.productName }}</div>
                    <div class="oci-spec" v-if="item.specName">{{ item.specName }}</div>
                    <div class="oci-price">¥{{ item.price }} × {{ item.quantity }}</div>
                  </div>
                </div>
              </div>
              <div class="oc-foot">
                <span class="oc-total">共 {{ o.orderItems ? o.orderItems.length : 0 }} 件，实付 <b>¥{{ o.payAmount }}</b></span>
              </div>
            </div>
          </div>

          <div class="pager" v-if="orderPages > 1">
            <button class="btn sm" :disabled="orderPage <= 1" @click="loadOrders(orderPage - 1)">上一页</button>
            <span class="pager-info">{{ orderPage }} / {{ orderPages }}</span>
            <button class="btn sm" :disabled="orderPage >= orderPages" @click="loadOrders(orderPage + 1)">下一页</button>
          </div>
        </div>

        <!-- ====== 收货地址 ====== -->
        <div class="panel" v-if="currentTab === 'address'">
          <div class="panel-head">
            <h3>收货地址</h3>
            <button class="btn outline" v-if="!showAddressForm" @click="openAddressForm()">+ 新增地址</button>
          </div>

          <div class="address-form card" v-if="showAddressForm">
            <h4>{{ editingAddressId ? '编辑地址' : '新增地址' }}</h4>
            <div class="field-row">
              <div class="field col">
                <label>收货人 <span class="req">*</span></label>
                <input class="input" v-model.trim="addressForm.receiver" placeholder="收货人姓名" />
              </div>
              <div class="field col">
                <label>手机号 <span class="req">*</span></label>
                <input class="input" v-model.trim="addressForm.phone" placeholder="手机号" />
              </div>
            </div>
            <div class="field-row three">
              <div class="field col">
                <label>省份 <span class="req">*</span></label>
                <input class="input" v-model.trim="addressForm.province" placeholder="省" />
              </div>
              <div class="field col">
                <label>城市 <span class="req">*</span></label>
                <input class="input" v-model.trim="addressForm.city" placeholder="市" />
              </div>
              <div class="field col">
                <label>区/县 <span class="req">*</span></label>
                <input class="input" v-model.trim="addressForm.district" placeholder="区/县" />
              </div>
            </div>
            <div class="field">
              <label>详细地址 <span class="req">*</span></label>
              <input class="input" v-model.trim="addressForm.detail" placeholder="街道门牌号" />
            </div>
            <div class="field-row" style="align-items:center">
              <label class="check-label">
                <input type="checkbox" v-model="addressForm.isDefaultChecked" />
                设为默认地址
              </label>
              <div class="spacer"></div>
              <button class="btn" @click="cancelAddressForm">取消</button>
              <button class="btn primary" :disabled="savingAddress" @click="saveAddress">
                {{ savingAddress ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>

          <div v-if="addresses.length" class="addr-list">
            <div v-for="addr in addresses" :key="addr.id" :class="['addr-card', { default: addr.isDefault === 1 }]">
              <div class="addr-body">
                <div class="addr-line1">
                  <span class="addr-receiver">{{ addr.receiver }}</span>
                  <span class="addr-phone">{{ addr.phone }}</span>
                  <span v-if="addr.isDefault === 1" class="addr-tag">默认</span>
                </div>
                <div class="addr-line2">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</div>
              </div>
              <div class="addr-actions">
                <span class="link" @click="openAddressForm(addr)">编辑</span>
                <span class="link" v-if="addr.isDefault !== 1" @click="setDefault(addr.id)">设为默认</span>
                <span class="link danger" @click="removeAddress(addr.id)">删除</span>
              </div>
            </div>
          </div>
          <div v-else-if="!loadingAddresses" class="empty">暂无收货地址，点击上方按钮新增</div>
        </div>

        <!-- ====== 我的收藏 ====== -->
        <div class="panel" v-if="currentTab === 'favorites'">
          <h3>我的收藏</h3>
          <div v-if="loadingFavorites" class="empty">加载中…</div>
          <div v-else-if="favorites.length === 0" class="empty">还没有收藏商品，去逛逛吧~</div>
          <div v-else class="fav-grid">
            <div v-for="p in favorites" :key="p.id" class="fav-card">
              <div class="fav-img" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
                <span v-if="!p.mainImage">商品图</span>
              </div>
              <div class="fav-body">
                <div class="fav-name">{{ p.name }}</div>
                <div class="fav-price">¥{{ p.price }}</div>
              </div>
              <span class="fav-del" title="取消收藏" @click="doRemoveFavorite(p.id)">✕</span>
            </div>
          </div>
          <div class="pager" v-if="favoritePages > 1">
            <button class="btn sm" :disabled="favoritePage <= 1" @click="loadFavorites(favoritePage - 1)">上一页</button>
            <span class="pager-info">{{ favoritePage }} / {{ favoritePages }}</span>
            <button class="btn sm" :disabled="favoritePage >= favoritePages" @click="loadFavorites(favoritePage + 1)">下一页</button>
          </div>
        </div>

        <!-- ====== 优惠券 ====== -->
        <div class="panel" v-if="currentTab === 'coupons'">
          <h3>我的优惠券</h3>
          <div class="coupon-status-bar">
            <span
              v-for="s in couponStatusFilters"
              :key="s.value"
              :class="['filter-tag', { on: couponStatusFilter === s.value }]"
              @click="couponStatusFilter = s.value; loadMyCoupons()"
            >{{ s.label }}</span>
          </div>
          <div v-if="loadingCoupons" class="empty">加载中…</div>
          <div v-else-if="myCoupons.length === 0" class="empty">暂无优惠券</div>
          <div v-else class="coupon-list">
            <div
              v-for="c in myCoupons"
              :key="c.id"
              :class="['coupon-card', { used: c.status !== 0, expired: c.status === 2 }]"
            >
              <div class="cp-left">
                <div class="cp-amount" v-if="c.type === 1"><span class="cp-yen">¥</span>{{ c.amount }}</div>
                <div class="cp-amount" v-else>{{ (c.amount * 100).toFixed(0) }}<span class="cp-yen">折</span></div>
              </div>
              <div class="cp-right">
                <div class="cp-name">{{ c.name }}</div>
                <div class="cp-desc">满{{ c.threshold }}元可用</div>
                <div class="cp-time">有效期至 {{ c.endTime }}</div>
              </div>
              <div class="cp-badge" v-if="c.status === 1">已使用</div>
              <div class="cp-badge expired" v-else-if="c.status === 2">已过期</div>
            </div>
          </div>

          <h3 style="margin-top:24px">领券中心</h3>
          <div v-if="loadingAvailCoupons" class="empty">加载中…</div>
          <div v-else-if="availableCoupons.length === 0" class="empty">暂无可领优惠券</div>
          <div v-else class="coupon-list">
            <div v-for="c in availableCoupons" :key="c.id" class="coupon-card">
              <div class="cp-left highlight">
                <div class="cp-amount" v-if="c.type === 1"><span class="cp-yen">¥</span>{{ c.amount }}</div>
                <div class="cp-amount" v-else>{{ (c.amount * 100).toFixed(0) }}<span class="cp-yen">折</span></div>
              </div>
              <div class="cp-right">
                <div class="cp-name">{{ c.name }}</div>
                <div class="cp-desc">满{{ c.threshold }}元可用 · 剩余 {{ c.remain }} / {{ c.total }}</div>
                <div class="cp-time">{{ c.startTime }} ~ {{ c.endTime }}</div>
              </div>
              <button class="btn primary sm" :disabled="c.claiming" @click="doReceiveCoupon(c)">
                {{ c.claiming ? '领取中…' : '立即领取' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ====== 会员中心 ====== -->
        <div class="panel" v-if="currentTab === 'membership'">
          <h3>会员中心</h3>
          <div class="member-levels">
            <div
              v-for="lv in membershipLevels"
              :key="lv.id"
              :class="['member-card', { current: userInfo && userInfo.memberLevelId === lv.id }]"
            >
              <div class="ml-badge" :style="{ background: levelColor(lv.level) }">{{ lv.name }}</div>
              <div class="ml-discount">折扣：{{ (lv.discount * 100).toFixed(0) }}%</div>
              <div class="ml-threshold">升级门槛：累计 {{ lv.threshold }} 积分</div>
              <div class="ml-desc">{{ lv.description }}</div>
              <div v-if="userInfo && userInfo.memberLevelId === lv.id" class="ml-current-tag">当前等级</div>
            </div>
          </div>
          <div v-if="userInfo" class="member-status">
            <p>当前积分：<b>{{ userInfo.points }}</b></p>
            <button class="btn primary" :disabled="upgrading" @click="doUpgrade">
              {{ upgrading ? '检测中…' : '立即升级' }}
            </button>
          </div>
        </div>

        <!-- ====== 消息中心 ====== -->
        <div class="panel" v-if="currentTab === 'messages'">
          <div class="panel-head">
            <h3>消息中心</h3>
            <button class="btn outline sm" @click="doReadAllMessages">全部已读</button>
          </div>
          <div v-if="loadingMessages" class="empty">加载中…</div>
          <div v-else-if="messages.length === 0" class="empty">暂无消息</div>
          <div v-else class="msg-list">
            <div
              v-for="m in messages"
              :key="m.id"
              :class="['msg-card', { unread: m.isRead === 0 }]"
              @click="openMessage(m)"
            >
              <div class="msg-dot" v-if="m.isRead === 0"></div>
              <div class="msg-body">
                <div class="msg-title">{{ m.title }}</div>
                <div class="msg-preview">{{ m.content }}</div>
                <div class="msg-time">{{ m.createTime }}</div>
              </div>
              <span class="msg-type-tag">{{ messageTypeLabel(m.type) }}</span>
            </div>
          </div>
          <div class="pager" v-if="messagePages > 1">
            <button class="btn sm" :disabled="messagePage <= 1" @click="loadMessages(messagePage - 1)">上一页</button>
            <span class="pager-info">{{ messagePage }} / {{ messagePages }}</span>
            <button class="btn sm" :disabled="messagePage >= messagePages" @click="loadMessages(messagePage + 1)">下一页</button>
          </div>

          <!-- 消息详情弹窗 -->
          <div class="modal-overlay" v-if="detailMessage" @click.self="detailMessage = null">
            <div class="modal-box">
              <h4>{{ detailMessage.title }}</h4>
              <div class="msg-type-tag flat">{{ messageTypeLabel(detailMessage.type) }}</div>
              <p class="modal-content">{{ detailMessage.content }}</p>
              <div class="modal-time">{{ detailMessage.createTime }}</div>
              <button class="btn" @click="detailMessage = null">关闭</button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import AppFooter from "@/components/AppFooter.vue";
import {
  getUserInfo, updateUserInfo, changePassword,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  getMembershipLevels, upgradeMembership,
  getMyOrders,
  getFavorites, removeFavorite,
  getMyCoupons, getCouponList, receiveCoupon,
  getMyMessages, readMessage, readAllMessages,
} from "@/api/modules/user.js";
import { getStore, setStore, removestore } from "@/libs/storage.js";

export default {
  name: "UserCenter",
  components: { AppFooter },
  data() {
    return {
      currentTab: "profile",
      tabs: [
        { key: "profile",    label: "个人资料",    icon: "👤" },
        { key: "orders",     label: "我的订单",    icon: "📋" },
        { key: "address",    label: "收货地址",    icon: "📍" },
        { key: "favorites",  label: "我的收藏",    icon: "❤️" },
        { key: "coupons",    label: "优惠券",      icon: "🎫" },
        { key: "membership", label: "会员中心",    icon: "👑" },
        { key: "messages",   label: "消息中心",    icon: "💬" },
        { key: "password",   label: "🔒 修改密码", icon: "🔒" },
      ],

      // 用户数据
      userInfo: null,
      membershipLevels: [],
      addresses: [],

      // 资料表单
      profileForm: { nickname: "", avatar: "", phone: "", email: "", gender: 0 },
      savingProfile: false,

      // 密码表单
      passwordForm: { oldPassword: "", newPassword: "", confirmPassword: "" },
      savingPassword: false,

      // 地址
      showAddressForm: false,
      editingAddressId: null,
      addressForm: { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false },
      savingAddress: false,
      loadingAddresses: false,

      // 订单
      orders: [],
      orderPage: 1,
      orderPages: 1,
      orderStatusFilter: "",
      loadingOrders: false,

      // 收藏
      favorites: [],
      favoritePage: 1,
      favoritePages: 1,
      favoriteTotal: 0,
      loadingFavorites: false,

      // 优惠券
      myCoupons: [],
      availableCoupons: [],
      couponStatusFilter: "",
      loadingCoupons: false,
      loadingAvailCoupons: false,

      // 消息
      messages: [],
      messagePage: 1,
      messagePages: 1,
      loadingMessages: false,
      detailMessage: null,

      // 会员升级
      upgrading: false,

      // UI
      loading: true,
      notification: null,
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
    },
    couponCount() {
      return this.myCoupons.length ? this.myCoupons.filter(c => c.status === 0).length : '--';
    },
    orderStatusFilters() {
      return [
        { label: "全部", value: "" },
        { label: "待支付", value: "0" },
        { label: "待发货", value: "1" },
        { label: "待收货", value: "2" },
        { label: "待评价", value: "3" },
        { label: "已完成", value: "4" },
      ];
    },
    couponStatusFilters() {
      return [
        { label: "全部", value: "" },
        { label: "未使用", value: "0" },
        { label: "已使用", value: "1" },
        { label: "已过期", value: "2" },
      ];
    },
  },
  created() {
    this.restoreLocal();
    this.loadUserInfo();
    this.loadMembershipLevels();
  },
  methods: {
    // ========== 数据加载 ==========
    restoreLocal() {
      const u = getStore("userInfo");
      try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
      if (this.userInfo) this.syncProfileForm();
    },
    async loadUserInfo() {
      try {
        const res = await getUserInfo();
        this.userInfo = res.data;
        setStore("userInfo", JSON.stringify(res.data));
        this.syncProfileForm();
      } catch (e) { /* 本地兜底 */ } finally { this.loading = false; }
    },
    async loadMembershipLevels() {
      try {
        const res = await getMembershipLevels();
        this.membershipLevels = res.data || [];
      } catch (e) { /* ignore */ }
    },
    async loadAddresses() {
      this.loadingAddresses = true;
      try {
        const res = await getAddresses();
        this.addresses = res.data || [];
      } catch (e) { this.addresses = []; }
      finally { this.loadingAddresses = false; }
    },

    // ========== 订单 ==========
    async loadOrders(page) {
      this.orderPage = page || this.orderPage;
      this.loadingOrders = true;
      try {
        const params = { current: this.orderPage, size: 6 };
        if (this.orderStatusFilter !== "") params.status = Number(this.orderStatusFilter);
        const res = await getMyOrders(params);
        const d = res.data || {};
        this.orders = d.records || [];
        this.orderPages = d.pages || 1;
      } catch (e) {
        this.orders = [];
      } finally {
        this.loadingOrders = false;
      }
    },
    switchTabOrders(status) {
      this.orderStatusFilter = String(status);
      this.currentTab = "orders";
      this.loadOrders(1);
    },
    orderStatusLabel(s) {
      const map = { '0':'待支付','1':'待发货','2':'待收货','3':'待评价','4':'已完成','-1':'已取消','-2':'退款中','-3':'已退款','-4':'管理员退款' };
      return map[String(s)] || '未知';
    },
    orderStatusColor(s) {
      const map = { '0':'#f0ad4e','1':'#5bc0de','2':'#5b8def','3':'#8f7cf0','4':'#5cb85c','-1':'#999','-2':'#d9534f','-3':'#999','-4':'#999' };
      return map[String(s)] || '#999';
    },

    // ========== 收藏 ==========
    async loadFavorites(page) {
      this.favoritePage = page || this.favoritePage;
      this.loadingFavorites = true;
      try {
        const res = await getFavorites({ current: this.favoritePage, size: 8 });
        const d = res.data || {};
        this.favorites = d.records || [];
        this.favoritePages = d.pages || 1;
        this.favoriteTotal = d.total || 0;
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
        this.notify("success", "已取消收藏");
        this.favorites = this.favorites.filter(f => f.id !== productId);
        this.favoriteTotal = Math.max(0, this.favoriteTotal - 1);
      } catch (e) {
        this.notify("error", e.message || "操作失败");
      }
    },

    // ========== 优惠券 ==========
    async loadMyCoupons() {
      this.loadingCoupons = true;
      try {
        const params = {};
        if (this.couponStatusFilter !== "") params.status = Number(this.couponStatusFilter);
        const res = await getMyCoupons(params);
        this.myCoupons = res.data || [];
      } catch (e) {
        this.myCoupons = [];
      } finally {
        this.loadingCoupons = false;
      }
    },
    async loadAvailableCoupons() {
      this.loadingAvailCoupons = true;
      try {
        const res = await getCouponList();
        this.availableCoupons = (res.data || []).map(c => ({ ...c, claiming: false }));
      } catch (e) {
        this.availableCoupons = [];
      } finally {
        this.loadingAvailCoupons = false;
      }
    },
    async doReceiveCoupon(coupon) {
      this.$set(coupon, "claiming", true);
      try {
        await receiveCoupon(coupon.id);
        this.notify("success", "领取成功！");
        await this.loadMyCoupons();
        await this.loadAvailableCoupons();
      } catch (e) {
        this.notify("error", e.message || "领取失败");
      } finally {
        this.$set(coupon, "claiming", false);
      }
    },

    // ========== 消息 ==========
    async loadMessages(page) {
      this.messagePage = page || this.messagePage;
      this.loadingMessages = true;
      try {
        const res = await getMyMessages({ current: this.messagePage, size: 10 });
        const d = res.data || {};
        this.messages = d.records || [];
        this.messagePages = d.pages || 1;
      } catch (e) {
        this.messages = [];
      } finally {
        this.loadingMessages = false;
      }
    },
    async openMessage(m) {
      this.detailMessage = m;
      if (m.isRead === 0) {
        try {
          await readMessage(m.id);
          m.isRead = 1;
        } catch (e) { /* ignore */ }
      }
    },
    async doReadAllMessages() {
      try {
        await readAllMessages();
        this.messages.forEach(m => { m.isRead = 1; });
        this.notify("success", "已全部标为已读");
      } catch (e) {
        this.notify("error", e.message || "操作失败");
      }
    },
    messageTypeLabel(t) {
      const map = { 1:'系统', 2:'订单', 3:'活动', 4:'资讯' };
      return map[t] || '通知';
    },

    // ========== 表单同步 ==========
    syncProfileForm() {
      if (!this.userInfo) return;
      this.profileForm.nickname = this.userInfo.nickname || "";
      this.profileForm.avatar = this.userInfo.avatar || "";
      this.profileForm.phone = this.userInfo.phone || "";
      this.profileForm.email = this.userInfo.email || "";
      this.profileForm.gender = this.userInfo.gender != null ? this.userInfo.gender : 0;
    },

    // ========== 菜单切换 ==========
    switchTab(key) {
      this.currentTab = key;
      if (key === "orders" && !this.orders.length) this.loadOrders(1);
      if (key === "favorites" && !this.favorites.length) this.loadFavorites(1);
      if (key === "coupons") { if (!this.myCoupons.length) this.loadMyCoupons(); if (!this.availableCoupons.length) this.loadAvailableCoupons(); }
      if (key === "messages" && !this.messages.length) this.loadMessages(1);
      if (key === "address" && !this.addresses.length && !this.loadingAddresses) this.loadAddresses();
    },

    // ========== 通知 ==========
    notify(type, message) {
      this.notification = { type, message };
      setTimeout(() => { this.notification = null; }, 3500);
    },

    // ========== 个人资料 ==========
    async saveProfile() {
      if (!this.profileForm.nickname.trim()) return this.notify("error", "昵称不能为空");
      this.savingProfile = true;
      try {
        const payload = {
          nickname: this.profileForm.nickname.trim(),
          avatar: this.profileForm.avatar.trim(),
          phone: this.profileForm.phone.trim(),
          email: this.profileForm.email.trim(),
          gender: this.profileForm.gender,
        };
        await updateUserInfo(payload);
        Object.assign(this.userInfo, payload);
        setStore("userInfo", JSON.stringify(this.userInfo));
        this.notify("success", "个人资料已保存");
      } catch (e) {
        this.notify("error", e.message || "保存失败");
      } finally {
        this.savingProfile = false;
      }
    },

    // ========== 修改密码 ==========
    async savePassword() {
      const { oldPassword, newPassword, confirmPassword } = this.passwordForm;
      if (!oldPassword) return this.notify("error", "请输入当前密码");
      if (!newPassword || newPassword.length < 6) return this.notify("error", "新密码至少 6 位");
      if (newPassword !== confirmPassword) return this.notify("error", "两次输入的新密码不一致");
      this.savingPassword = true;
      try {
        await changePassword({ oldPassword, newPassword });
        this.notify("success", "密码修改成功，请重新登录");
        this.passwordForm = { oldPassword: "", newPassword: "", confirmPassword: "" };
        setTimeout(() => this.handleLogout(), 1500);
      } catch (e) {
        this.notify("error", e.message || "密码修改失败");
      } finally {
        this.savingPassword = false;
      }
    },

    // ========== 收货地址 ==========
    openAddressForm(addr) {
      if (addr) {
        this.editingAddressId = addr.id;
        this.addressForm = {
          receiver: addr.receiver || "", phone: addr.phone || "",
          province: addr.province || "", city: addr.city || "", district: addr.district || "",
          detail: addr.detail || "", isDefaultChecked: addr.isDefault === 1,
        };
      } else {
        this.editingAddressId = null;
        this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false };
      }
      this.showAddressForm = true;
    },
    cancelAddressForm() {
      this.showAddressForm = false;
      this.editingAddressId = null;
      this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false };
    },
    async saveAddress() {
      const f = this.addressForm;
      if (!f.receiver.trim() || !f.phone.trim() || !f.province.trim() || !f.city.trim() || !f.district.trim() || !f.detail.trim()) {
        return this.notify("error", "请完整填写所有地址字段");
      }
      this.savingAddress = true;
      const payload = {
        receiver: f.receiver.trim(), phone: f.phone.trim(),
        province: f.province.trim(), city: f.city.trim(), district: f.district.trim(),
        detail: f.detail.trim(), isDefault: f.isDefaultChecked ? 1 : 0,
      };
      try {
        if (this.editingAddressId) {
          await updateAddress(this.editingAddressId, payload);
          this.notify("success", "地址已更新");
        } else {
          await addAddress(payload);
          this.notify("success", "地址已添加");
        }
        this.cancelAddressForm();
        await this.loadAddresses();
      } catch (e) {
        this.notify("error", e.message || "操作失败");
      } finally {
        this.savingAddress = false;
      }
    },
    async setDefault(id) {
      try {
        await setDefaultAddress(id);
        this.notify("success", "已设为默认地址");
        await this.loadAddresses();
      } catch (e) {
        this.notify("error", e.message || "操作失败");
      }
    },
    async removeAddress(id) {
      if (!confirm("确定要删除该地址吗？")) return;
      try {
        await deleteAddress(id);
        this.notify("success", "地址已删除");
        await this.loadAddresses();
      } catch (e) {
        this.notify("error", e.message || "删除失败");
      }
    },

    // ========== 会员升级 ==========
    async doUpgrade() {
      this.upgrading = true;
      try {
        const res = await upgradeMembership();
        const data = res.data;
        if (data) {
          this.notify("success", `恭喜！从「${data.oldLevel}」升级到「${data.newLevel}」，当前积分：${data.currentPoints}`);
        } else {
          this.notify("success", res.message || "当前已是最优等级");
        }
        await this.loadUserInfo();
        await this.loadMembershipLevels();
      } catch (e) {
        this.notify("error", e.message || "升级失败");
      } finally {
        this.upgrading = false;
      }
    },

    // ========== 退出登录 ==========
    handleLogout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
      this.$router.push("/");
    },

    levelColor(level) {
      const colors = ["#9aa1b2", "#9aa1b2", "#8f9bb3", "#c9a96e", "#d9534f"];
      return colors[level] || "#9aa1b2";
    },
  },
};
</script>

<style scoped>
/* ========== 全局布局 ========== */
.user-center { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

.topbar {
  display: flex; align-items: center; gap: 18px;
  padding: 12px 24px; background: #fff; border-bottom: 1px solid #e6e8eb;
  position: sticky; top: 0; z-index: 10;
}
.logo { font-weight: 700; font-size: 18px; color: #5b8def; text-decoration: none; white-space: nowrap; }
.logo .paw { margin-right: 4px; }
.spacer { flex: 1; }
.right { display: flex; align-items: center; gap: 14px; font-size: 13px; color: #555; white-space: nowrap; }
.link { color: #5b8def; cursor: pointer; text-decoration: none; }
.link:hover { text-decoration: underline; }

.notify {
  padding: 10px 24px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;
}
.notify.success { background: #e7f5ec; color: #1a7a3a; border-bottom: 1px solid #b8dfc8; }
.notify.error { background: #fdecea; color: #b71c1c; border-bottom: 1px solid #f5c6cb; }
.notify-close { cursor: pointer; font-weight: 700; }

.uc-body {
  flex: 1; display: flex; width: 1200px; max-width: 100%; margin: 20px auto; gap: 20px; padding: 0 24px;
}

/* ========== 左侧菜单 ========== */
.uc-sidebar {
  width: 210px; flex-shrink: 0; background: #fff; border: 1px solid #e6e8eb; border-radius: 10px;
  padding: 20px 0; align-self: flex-start; position: sticky; top: 70px;
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
.uc-content { flex: 1; min-width: 0; }

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

/* ========== 面板通用 ========== */
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px; margin-bottom: 16px;
}
.panel h3 { margin: 0 0 16px; font-size: 16px; }
.panel h4 { margin: 0 0 12px; font-size: 14px; }
.panel-head { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.panel-head h3 { margin: 0; }

/* 筛选标签 */
.status-filters, .coupon-status-bar { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-tag {
  padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #f0f1f3; color: #666; cursor: pointer; transition: .12s;
}
.filter-tag:hover { background: #e3e7ef; }
.filter-tag.on { background: #5b8def; color: #fff; }

/* 分页 */
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; }
.pager-info { font-size: 13px; color: #888; }
.btn.sm { padding: 5px 14px; font-size: 12px; }

/* 表单通用 */
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.field .req { color: #d9534f; }
.field-row { display: flex; gap: 14px; margin-bottom: 6px; }
.field-row.three > .col { flex: 1; }
.field.col { flex: 1; }
.mt8 { margin-top: 8px; }
.input {
  width: 100%; padding: 9px 12px; border: 1px solid #d6dbe3; border-radius: 6px; font-size: 13px;
  color: #333; background: #fafbfc; outline: none; transition: border-color .15s;
}
.input:focus { border-color: #5b8def; background: #fff; }
.input.disabled { background: #eef0f3; color: #999; cursor: not-allowed; }
select.input { cursor: pointer; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #5b8def; color: #fff; border-color: #5b8def; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
.btn.outline { border-color: #5b8def; color: #5b8def; }
.btn.outline:hover { background: #e7eefc; }
.check-label { font-size: 13px; color: #555; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.check-label input { cursor: pointer; }
.form-narrow { max-width: 420px; }

/* ========== 个人资料 ========== */
.profile-layout { display: flex; gap: 24px; }
.profile-avatar-col { width: 140px; flex-shrink: 0; text-align: center; }
.avatar-big {
  width: 100px; height: 100px; border-radius: 50%; background: #e3e6ec; color: #999;
  display: flex; align-items: center; justify-content: center; margin: 0 auto;
  overflow: hidden; border: 2px solid #e6e8eb;
}
.avatar-big .avatar-txt.big { font-size: 32px; }
.avatar-big .avatar-img { width: 100%; height: 100%; object-fit: cover; }
.profile-fields { flex: 1; }

/* ========== 订单 ========== */
.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-card { border: 1px solid #e6e8eb; border-radius: 8px; overflow: hidden; }
.oc-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #fafbfc; border-bottom: 1px solid #eef0f3;
}
.oc-no { font-size: 13px; color: #888; }
.oc-status { font-size: 13px; font-weight: 600; }
.oc-items { padding: 8px 14px; }
.oc-item { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f4f5f7; }
.oc-item:last-child { border-bottom: 0; }
.oci-img {
  width: 60px; height: 60px; border-radius: 6px; background: #e3e6ec;
  background-size: cover; background-position: center; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;
}
.oci-info { flex: 1; min-width: 0; }
.oci-name { font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oci-spec { font-size: 11px; color: #aaa; margin-top: 2px; }
.oci-price { font-size: 12px; color: #888; margin-top: 4px; }
.oc-foot {
  padding: 8px 14px; background: #fafbfc; border-top: 1px solid #eef0f3;
  text-align: right; font-size: 13px; color: #666;
}
.oc-foot b { color: #d9534f; }

/* ========== 收货地址 ========== */
.address-form.card { border: 1px solid #d6dbe3; border-radius: 8px; padding: 16px; background: #fafbfc; margin-bottom: 14px; }
.addr-list { display: flex; flex-direction: column; gap: 10px; }
.addr-card {
  border: 1px solid #e6e8eb; border-radius: 8px; padding: 14px; display: flex;
  justify-content: space-between; align-items: center; transition: .12s;
}
.addr-card.default { border-color: #5b8def; background: #f7faff; }
.addr-body { flex: 1; min-width: 0; }
.addr-line1 { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.addr-receiver { font-weight: 600; font-size: 14px; }
.addr-phone { color: #888; font-size: 13px; }
.addr-tag { font-size: 11px; background: #5b8def; color: #fff; padding: 1px 8px; border-radius: 8px; }
.addr-line2 { font-size: 13px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.addr-actions { display: flex; gap: 12px; flex-shrink: 0; margin-left: 16px; }
.addr-actions .link { font-size: 12px; cursor: pointer; color: #5b8def; }
.addr-actions .link.danger { color: #d9534f; }

/* ========== 收藏 ========== */
.fav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fav-card {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; overflow: hidden;
  position: relative; transition: .12s;
}
.fav-card:hover { box-shadow: 0 4px 14px rgba(60,90,160,.1); }
.fav-img {
  width: 100%; aspect-ratio: 1 / 1; background-size: cover; background-position: center;
  display: flex; align-items: center; justify-content: center; color: #aab0b8; font-size: 12px;
  background-color: #eef0f3;
}
.fav-body { padding: 8px 10px; }
.fav-name { font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-price { font-size: 14px; font-weight: 700; color: #d9534f; margin-top: 4px; }
.fav-del {
  position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%;
  background: rgba(0,0,0,.4); color: #fff; font-size: 11px; display: flex; align-items: center;
  justify-content: center; cursor: pointer; opacity: 0; transition: .12s;
}
.fav-card:hover .fav-del { opacity: 1; }
.fav-del:hover { background: #d9534f; }

/* ========== 优惠券 ========== */
.coupon-list { display: flex; flex-direction: column; gap: 10px; }
.coupon-card {
  display: flex; align-items: center; border: 1px solid #e6e8eb; border-radius: 8px;
  overflow: hidden; position: relative; background: #fff;
}
.coupon-card.used { opacity: .55; }
.coupon-card.expired { opacity: .45; }
.cp-left {
  width: 100px; flex-shrink: 0; padding: 16px 0; text-align: center;
  background: #fdf3e1; color: #b8860b; border-right: 1px dashed #e6d5b3;
}
.cp-left.highlight { background: #e7f5ec; color: #1a7a3a; border-right-color: #b8dfc8; }
.coupon-card.used .cp-left, .coupon-card.expired .cp-left { background: #f0f1f3; color: #999; border-right-color: #d6dbe3; }
.cp-amount { font-size: 24px; font-weight: 700; }
.cp-yen { font-size: 13px; font-weight: 400; }
.cp-right { flex: 1; padding: 12px 14px; min-width: 0; }
.cp-name { font-size: 14px; font-weight: 600; color: #333; }
.cp-desc { font-size: 12px; color: #888; margin-top: 4px; }
.cp-time { font-size: 11px; color: #aaa; margin-top: 4px; }
.cp-badge {
  position: absolute; top: 0; right: 0; padding: 2px 10px; font-size: 10px;
  background: #d6dbe3; color: #888; border-radius: 0 8px 0 6px;
}
.cp-badge.expired { background: #f5c6cb; color: #b71c1c; }
.coupon-card > .btn { margin-right: 14px; flex-shrink: 0; }

/* ========== 会员中心 ========== */
.member-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
.member-card {
  border: 1px solid #e6e8eb; border-radius: 10px; padding: 18px; text-align: center; position: relative; transition: .12s;
}
.member-card.current { border-color: #c9a96e; background: #fffdf5; box-shadow: 0 2px 10px rgba(201,169,110,.15); }
.ml-badge {
  display: inline-block; padding: 4px 16px; border-radius: 14px; color: #fff; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.ml-discount { font-size: 14px; color: #333; margin-bottom: 6px; }
.ml-threshold { font-size: 12px; color: #888; margin-bottom: 6px; }
.ml-desc { font-size: 12px; color: #999; line-height: 1.5; }
.ml-current-tag { margin-top: 10px; font-size: 11px; color: #b8860b; font-weight: 600; }
.member-status { display: flex; align-items: center; gap: 20px; }
.member-status p { font-size: 14px; color: #555; margin: 0; }

/* ========== 消息中心 ========== */
.msg-list { display: flex; flex-direction: column; gap: 6px; }
.msg-card {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border: 1px solid #eef0f3; border-radius: 8px; cursor: pointer; transition: .12s;
}
.msg-card:hover { background: #fafbfc; }
.msg-card.unread { background: #f7faff; border-color: #d6e3f5; }
.msg-dot { width: 8px; height: 8px; border-radius: 50%; background: #5b8def; flex-shrink: 0; }
.msg-body { flex: 1; min-width: 0; }
.msg-title { font-size: 14px; font-weight: 600; color: #333; }
.msg-preview { font-size: 12px; color: #888; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.msg-time { font-size: 11px; color: #aaa; margin-top: 4px; }
.msg-type-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f0f3fa; color: #6a7c9c; flex-shrink: 0;
}
.msg-type-tag.flat { display: inline-block; margin: 8px 0; }

/* 消息弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 28px; max-width: 520px; width: 90%; max-height: 70vh; overflow-y: auto;
}
.modal-box h4 { margin: 0 0 8px; font-size: 17px; }
.modal-content { font-size: 14px; color: #555; line-height: 1.7; margin: 12px 0; white-space: pre-wrap; }
.modal-time { font-size: 12px; color: #aaa; margin-bottom: 14px; }

/* ========== 空状态 ========== */
.empty { padding: 24px 0; text-align: center; color: #999; font-size: 13px; }

/* 响应式 */
@media (max-width: 860px) {
  .uc-body { flex-direction: column; padding: 0 12px; }
  .uc-sidebar { width: 100%; position: static; }
  .side-nav { display: flex; flex-wrap: wrap; justify-content: center; }
  .side-item { padding: 8px 14px; font-size: 12px; border-right: none; border-bottom: 2px solid transparent; }
  .side-item.active { border-right: none; border-bottom-color: #5b8def; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .profile-layout { flex-direction: column; align-items: center; }
  .fav-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
