<template>
  <div id="coupon-center-page">
    <AppHeader />
    <div class="container">
      <!-- Tabs（下划线风格） -->
      <div class="tabs">
        <span :class="['tab', { on: activeTab === 'center' }]" @click="switchTab('center')">领券中心</span>
        <span :class="['tab', { on: activeTab === 'unused' }]" @click="switchTab('unused')">
          我的券·未使用<span v-if="unusedCount > 0">({{ unusedCount }})</span>
        </span>
        <span :class="['tab', { on: activeTab === 'used' }]" @click="switchTab('used')">已使用</span>
        <span :class="['tab', { on: activeTab === 'expired' }]" @click="switchTab('expired')">已过期</span>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- ===== 领券中心 ===== -->
      <template v-if="!loading && activeTab === 'center'">
        <div class="section-title">🎁 可领取优惠券</div>
        <div v-if="centerList.length === 0" class="empty-state">暂无可用优惠券</div>
        <div v-else class="coupon-grid">
          <div v-for="coupon in centerList" :key="coupon.id" class="coupon-card">
            <div class="cc-left" :class="coupon.type === 1 ? 'bg-reduce' : 'bg-discount'">
              <div class="cc-amount">
                {{ coupon.type === 1 ? '¥' + Number(coupon.amount).toFixed(0) : (Number(coupon.amount) * 10).toFixed(0) + '折' }}
              </div>
              <div class="cc-condition">{{ Number(coupon.threshold) > 0 ? '满¥' + Number(coupon.threshold).toFixed(0) + '可用' : '无门槛' }}</div>
            </div>
            <div class="cc-mid">
              <div class="cc-name"><b>{{ coupon.name }}</b></div>
              <div class="cc-duration">全场通用 · {{ formatShortDate(coupon.startTime) }}-{{ formatShortDate(coupon.endTime) }}</div>
              <div class="cc-remain">剩余 {{ coupon.remain }}/{{ coupon.total }}</div>
            </div>
            <div class="cc-right">
              <button v-if="!coupon.received" class="btn-receive" @click="receive(coupon)" :disabled="coupon.receiving">
                {{ coupon.receiving ? '领取中…' : '立即领取' }}
              </button>
              <span v-else class="received-tag">已领取</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ===== 我的优惠券 ===== -->
      <template v-if="!loading && activeTab !== 'center'">
        <div class="section-title">🎫 我的优惠券（{{ tabTitle }}）</div>
        <div v-if="myList.length === 0" class="empty-state">暂无优惠券</div>
        <div v-else class="my-grid">
          <div v-for="uc in myList" :key="uc.id" class="my-card" :class="{ expired: activeTab === 'expired' }">
            <div class="my-row">
              <span class="my-amount" :class="(uc.couponType || 1) === 1 ? 'price' : ''">
                {{ (uc.couponType || 1) === 1 ? '¥' + Number(uc.couponAmount || 0).toFixed(0) : (Number(uc.couponAmount || 0) * 10).toFixed(0) + '折' }}
              </span>
              <span :class="['tag', statusTag(activeTab)]">{{ statusLabel(activeTab) }}</span>
            </div>
            <div class="my-name"><b>{{ uc.couponName || '优惠券' }}</b></div>
            <div class="my-detail small muted">
              {{ activeTab === 'expired' ? '已于 ' + formatDate(uc.couponEndTime) + ' 过期' : '有效期至 ' + formatDate(uc.couponEndTime) + ' · 全场通用' }}
            </div>
            <button v-if="activeTab === 'unused'" class="btn-use" @click="goUse">去使用</button>
          </div>
        </div>
      </template>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import { couponList, receiveCoupon, myCoupons } from "@/api/modules/coupon.js";

const TAB_MAP = { center: 'center', unused: 0, used: 1, expired: 2 };

function isExpired(endTime) {
  if (!endTime) return false;
  return new Date(endTime).getTime() < Date.now();
}

export default {
  name: "CouponCenterView",
  components: { AppHeader: () => import("@/components/AppHeader.vue"), AppFooter: () => import("@/components/AppFooter.vue") },
  data() {
    return {
      activeTab: "center",
      loading: true,
      centerList: [],
      myList: [],
      unusedCount: 0,
      couponInfoMap: {},
    };
  },
  computed: {
    tabTitle() {
      return { unused: '未使用', used: '已使用', expired: '已过期' }[this.activeTab] || '';
    },
  },
  created() {
    if (this.$route.query.tab === 'mine') {
      this.switchTab('unused');
    } else {
      this.initCenter();
    }
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab;
      if (tab === 'center') this.initCenter();
      else this.loadMyCoupons(TAB_MAP[tab]);
    },

    statusTag(tab) {
      return { unused: 'accent', used: 'done', expired: 'done' }[tab] || 'done';
    },
    statusLabel(tab) {
      return { unused: '未使用', used: '已使用', expired: '已过期' }[tab] || '';
    },

    async initCenter() {
      this.loading = true;
      try {
        const res = await couponList();
        const list = res.data || [];
        this.centerList = list.map(c => ({ ...c, received: false, receiving: false }));
        // 缓存券信息，供其他 tab 使用
        list.forEach(c => { this.couponInfoMap[c.id] = c; });
        try {
          const mineRes = await myCoupons();
          const mine = mineRes.data || [];
          const claimed = new Set(mine.map(uc => String(uc.couponId)));
          this.centerList.forEach(c => { if (claimed.has(String(c.id))) c.received = true; });
          // 未使用数不含已过期的
          this.unusedCount = mine.filter(uc => uc.status === 0 && !isExpired(this.couponInfoMap[uc.couponId]?.endTime)).length;
        } catch (e) { /* 未登录可见 */ }
      } catch (e) {
        this.$message.error("加载优惠券失败");
      } finally {
        this.loading = false;
      }
    },

    async loadMyCoupons(status) {
      this.loading = true;
      try {
        // "已过期"tab 需同时拉取未使用券（status=0），检测到期后归入
        const fetchStatus = status === 2 ? null : status;
        const res = await myCoupons(fetchStatus);
        const raw = res.data || [];

        // 补全券信息
        if (Object.keys(this.couponInfoMap).length === 0) {
          try {
            const cr = await couponList();
            (cr.data || []).forEach(c => { this.couponInfoMap[c.id] = c; });
          } catch (e) { /* ignore */ }
        }

        const now = Date.now();
        const mapped = raw.map(uc => {
          const info = this.couponInfoMap[uc.couponId] || null;
          const endTime = info ? info.endTime : null;
          const expired = endTime ? new Date(endTime).getTime() < now : false;
          return {
            ...uc,
            couponName: info ? info.name : '优惠券（已失效）',
            couponType: info ? info.type : 1,
            couponAmount: info ? info.amount : 0,
            couponThreshold: info ? info.threshold : 0,
            couponEndTime: endTime,
            _expired: expired,
          };
        });

        if (status === 0) {
          // 未使用：过滤掉已过期的
          this.myList = mapped.filter(uc => uc.status === 0 && !uc._expired);
        } else if (status === 1) {
          // 已使用
          this.myList = mapped.filter(uc => uc.status === 1);
        } else if (status === 2) {
          // 已过期：status=2 的 + status=0 但已到期的
          this.myList = mapped.filter(uc => uc.status === 2 || (uc.status === 0 && uc._expired));
        }
      } catch (e) {
        this.$message.error("加载失败");
      } finally {
        this.loading = false;
      }
    },

    async receive(coupon) {
      coupon.receiving = true;
      try {
        await receiveCoupon(coupon.id);
        this.$message.success("领取成功！");
        coupon.received = true;
        this.unusedCount++;
      } catch (e) {
        this.$message.error(e.message || "领取失败");
      } finally {
        coupon.receiving = false;
      }
    },

    goUse() { this.$router.push('/products'); },
    formatDate(t) { return t ? t.substring(0, 10) : ''; },
    formatShortDate(t) { return t ? t.substring(5, 10) : ''; },
  },
};
</script>

<style scoped>
#coupon-center-page { background:#f4f5f7; min-height:100vh; display:flex; flex-direction:column; }
.container { width: 960px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }

.loading-wrap, .empty-state { text-align:center; padding:60px 20px; color:#888; font-size:14px; }

/* ===== Tabs（下划线） ===== */
.tabs { display:flex; gap:0; border-bottom:1px solid #cfd4da; margin-bottom:20px; flex-wrap:wrap; }
.tab { padding:8px 18px; font-size:14px; color:#666; border-bottom:2px solid transparent; cursor:pointer; transition:color .15s; }
.tab:hover { color:#5b8def; }
.tab.on { color:#5b8def; border-bottom-color:#5b8def; font-weight:600; }

.section-title { font-size:16px; font-weight:700; margin:6px 0 16px; color:#2c3e50; }

/* ===== 领券中心 - 3列网格 ===== */
.coupon-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
.coupon-card { display:flex; background:#fff; border:1px solid #f0cda6; border-radius:8px; overflow:hidden; }
.cc-left { padding:18px 14px; text-align:center; color:#fff; display:flex; flex-direction:column; justify-content:center; flex-shrink:0; width:90px; }
.cc-left.bg-reduce { background:#ffb96b; }
.cc-left.bg-discount { background:#ff7a7a; }
.cc-amount { font-size:22px; font-weight:800; line-height:1.2; }
.cc-condition { font-size:11px; opacity:.9; margin-top:4px; }
.cc-mid { flex:1; padding:12px; min-width:0; }
.cc-name { font-size:14px; color:#2c3e50; }
.cc-duration { font-size:11px; color:#888; margin-top:4px; }
.cc-remain { font-size:11px; color:#888; margin-top:2px; }
.cc-right { width:80px; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:12px; }
.btn-receive { padding:7px 0; width:100%; background:#5b8def; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }
.btn-receive:disabled { opacity:.5; cursor:not-allowed; }
.received-tag { font-size:12px; color:#888; }

/* ===== 我的优惠券 - 3列网格 ===== */
.my-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.my-card {
  background:#fff; border:1px solid #cfd4da; border-radius:8px;
  padding:16px; border-left:4px solid #5b8def;
}
.my-card.expired { opacity:.6; border-left-color:#888; }
.my-row { display:flex; justify-content:space-between; align-items:center; }
.my-amount { font-size:22px; font-weight:700; }
.my-amount.price { color:#d9534f; }
.tag { display:inline-block; background:#e9ecf1; border:1px solid #cfd4da; border-radius:4px; padding:1px 8px; font-size:11px; color:#555; }
.tag.accent { background:#e7eefc; border-color:#bcd0f6; color:#5b8def; }
.tag.done { background:#f0f0f0; border-color:#d0d0d0; color:#888; }
.my-name { margin-top:10px; font-size:14px; color:#2c3e50; }
.my-detail { margin-top:6px; }
.small { font-size:12px; }
.muted { color:#888; }
.btn-use { display:block; width:100%; margin-top:10px; padding:6px 0; background:#5b8def; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }

@media (max-width:860px) {
  .coupon-grid, .my-grid { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:560px) {
  .coupon-grid, .my-grid { grid-template-columns:1fr; }
}
</style>
