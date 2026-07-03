<template>
  <div id="coupon-center-page">
    <AppHeader />
    <div class="coupon-container">
      <!-- 页面头部 -->
      <div class="page-head">
        <h1 class="page-title">🎫 领券中心</h1>
        <router-link to="/" class="back-link">← 返回首页</router-link>
      </div>

      <!-- 主 Tab -->
      <div class="tabs">
        <span
          v-for="tab in mainTabs"
          :key="tab.key"
          :class="['tab', { on: activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >{{ tab.label }}</span>
      </div>

      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- ====== 领券中心 ====== -->
      <template v-if="!loading && activeTab === 'center'">
        <div class="section-label">🎁 可领取优惠券</div>
        <div v-if="centerList.length === 0" class="empty-state">暂无可用优惠券</div>
        <div class="grid c3">
          <div
            v-for="c in centerList"
            :key="c.id"
            class="coupon-card-h"
            :style="{ borderColor: couponColor(c) }"
          >
            <!-- 左侧色块 -->
            <div class="coupon-left-block" :style="{ background: couponGradient(c) }">
              <div class="coupon-big-num">
                <template v-if="c.type === 1">
                  <span class="cur">¥</span>{{ formatAmount(c.amount) }}
                </template>
                <template v-else>
                  {{ formatDiscount(c.amount) }}<span class="cur">折</span>
                </template>
              </div>
              <div class="coupon-condition">{{ c.type === 1 ? '满' + formatAmount(c.threshold) + '可用' : (Number(c.threshold) > 0 ? '满' + formatAmount(c.threshold) + '可用' : '无门槛') }}</div>
            </div>
            <!-- 中间信息 -->
            <div class="coupon-mid-info">
              <div class="coupon-name">{{ c.name }}</div>
              <div class="coupon-detail muted">
                {{ c.type === 1 ? '全场通用' : '全场通用' }} · {{ fmtShort(c.startTime) }}-{{ fmtShort(c.endTime) }}
              </div>
              <div class="small muted">剩余 {{ c.remain }}/{{ c.total }}</div>
            </div>
            <!-- 右侧操作 -->
            <div class="coupon-action">
              <button
                v-if="!c.received"
                class="btn-get"
                :style="{ background: couponGradient(c) }"
                :disabled="c.receiving"
                @click="receive(c)"
              >{{ c.receiving ? '领取中…' : '立即领取' }}</button>
              <span v-else class="tag-getted">已领取</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ====== 我的优惠券 ====== -->
      <template v-if="!loading && activeTab !== 'center'">
        <div class="section-label">🎫 我的优惠券（{{ tabStatusLabel }}）</div>
        <div v-if="myList.length === 0" class="empty-state">暂无优惠券</div>
        <div
          v-for="uc in myList"
          :key="uc.id"
          class="coupon-card-v"
          :class="{ expired: myStatus === 2 }"
          :style="{ borderLeftColor: myStatus === 0 ? '#5b8def' : (myStatus === 2 ? '#ccc' : '#4caf7d') }"
        >
          <div class="my-top">
            <span class="my-amount">
              <template v-if="typeOf(uc) === 1">
                <span class="cur">¥</span>{{ formatAmount(amountOf(uc)) }}
              </template>
              <template v-else>
                {{ formatDiscount(amountOf(uc)) }}<span class="cur">折</span>
              </template>
            </span>
            <span :class="['tag', myStatus === 0 ? 'accent' : (myStatus === 2 ? '' : 'ok')]">
              {{ myStatus === 0 ? '未使用' : (myStatus === 1 ? '已使用' : '已过期') }}
            </span>
          </div>
          <div class="my-name"><b>{{ nameOf(uc) }}</b></div>
          <div class="my-condition muted">
            {{ typeOf(uc) === 1 ? '满' + formatAmount(thresholdOf(uc)) + '减' + formatAmount(amountOf(uc)) : (Number(thresholdOf(uc)) > 0 ? '满' + formatAmount(thresholdOf(uc)) + '享' + formatDiscount(amountOf(uc)) + '折' : '最高减' + formatAmount(amountOf(uc))) }}
          </div>
          <div class="my-time small muted" v-if="endTimeOf(uc)">
            有效期至 {{ fmtDate(endTimeOf(uc)) }}
            <template v-if="myStatus === 1 && usedTimeOf(uc)"> · 使用于 {{ fmtDate(usedTimeOf(uc)) }}</template>
          </div>
          <div v-if="myStatus === 0" class="my-action">
            <router-link to="/products" class="btn-use">去使用</router-link>
          </div>
        </div>
      </template>

      <div v-if="!loading && activeTab !== 'center' && totalPages > 1" class="pager">
        <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
        <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
        <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import { couponList, receiveCoupon, myCoupons } from "@/api/modules/coupon.js";

export default {
  name: "CouponCenterView",
  components: { AppHeader, AppFooter },
  data() {
    return {
      activeTab: "center",
      loading: true,
      // 领券中心
      centerList: [],
      // 我的券
      myList: [],
      myTotal: 0,
      current: 1,
      pageSize: 20,
      // 主 tabs
      mainTabs: [
        { key: "center", label: "领券中心" },
        { key: "unused", label: "我的券·未使用" },
        { key: "used", label: "已使用" },
        { key: "expired", label: "已过期" },
      ],
    };
  },
  computed: {
    myStatus() {
      const map = { unused: 0, used: 1, expired: 2 };
      return map[this.activeTab] ?? null;
    },
    tabStatusLabel() {
      const map = { unused: "未使用", used: "已使用", expired: "已过期" };
      return map[this.activeTab] || "";
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.myTotal / this.pageSize));
    },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let s = Math.max(1, c - 2);
      let e = Math.min(tp, c + 2);
      if (e - s < 4) {
        if (s === 1) e = Math.min(tp, s + 4);
        else s = Math.max(1, e - 4);
      }
      for (let i = s; i <= e; i++) pages.push(i);
      return pages;
    },
  },
  created() {
    this.loadCenter();
  },
  methods: {
    switchTab(key) {
      this.activeTab = key;
      this.current = 1;
      if (key === "center") {
        this.loadCenter();
      } else {
        this.loadMyCoupons();
      }
    },

    // ====== 领券中心 ======
    async loadCenter() {
      this.loading = true;
      try {
        const res = await couponList();
        this.centerList = (res.data || []).map(c => ({ ...c, received: false, receiving: false }));
        // 标记已领取
        try {
          const mineRes = await myCoupons(null);
          const claimedIds = new Set((mineRes.data || []).map(uc => String(uc.couponId)));
          this.centerList.forEach(c => {
            if (claimedIds.has(String(c.id))) c.received = true;
          });
        } catch (e) { /* 未登录也能看 */ }
      } catch (e) {
        this.$message.error("加载优惠券失败");
      } finally {
        this.loading = false;
      }
    },

    async receive(c) {
      c.receiving = true;
      try {
        await receiveCoupon(c.id);
        this.$message.success("🎉 领取成功！");
        c.received = true;
      } catch (e) {
        this.$message.error(e.message || "领取失败");
      } finally {
        c.receiving = false;
      }
    },

    // ====== 我的优惠券 ======
    async loadMyCoupons() {
      this.loading = true;
      try {
        const res = await myCoupons(this.myStatus);
        this.myList = (res.data || []).map(uc => ({
          ...uc,
          _couponDetail: false,
        }));
        this.myTotal = this.myList.length;
        // 填充优惠券详情
        await this.fillCouponDetails();
      } catch (e) {
        this.$message.error("加载失败");
        this.myList = [];
      } finally {
        this.loading = false;
      }
    },

    async fillCouponDetails() {
      try {
        const allRes = await couponList();
        const allMap = {};
        (allRes.data || []).forEach(c => { allMap[c.id] = c; });
        this.myList.forEach(uc => {
          this.$set(uc, '_detail', allMap[uc.couponId] || null);
        });
      } catch (e) { /* use defaults */ }
    },

    // ====== 工具 ======
    couponColor(c) {
      const colors = ['#f0cda6', '#f0cda6', '#f0cda6'];
      return colors[c.id % 3] || '#f0cda6';
    },
    couponGradient(c) {
      const gradients = [
        'linear-gradient(135deg, #ffb96b, #f59e3e)',
        'linear-gradient(135deg, #ff7a7a, #e75151)',
        'linear-gradient(135deg, #9c7bff, #7b5ce0)',
      ];
      return gradients[c.id % 3] || gradients[0];
    },
    formatAmount(v) { return Number(v || 0).toFixed(0); },
    formatDiscount(v) { return (Number(v || 0) * 10).toFixed(0); },
    fmtDate(t) { return t ? String(t).substring(0, 10) : ''; },
    fmtShort(t) { return t ? String(t).substring(5, 10) : ''; },
    goPage(p) {
      if (p < 1 || p > this.totalPages) return;
      this.current = p;
      this.loadMyCoupons();
    },

    // 从后端直返字段或 _detail 安全取数据
    typeOf(uc) { return uc.type ?? uc._detail?.type ?? 1; },
    amountOf(uc) { return uc.amount ?? uc._detail?.amount ?? 0; },
    thresholdOf(uc) { return uc.threshold ?? uc._detail?.threshold ?? 0; },
    nameOf(uc) { return uc.name ?? uc._detail?.name ?? '优惠券'; },
    endTimeOf(uc) { return uc.endTime ?? uc._detail?.endTime ?? ''; },
    usedTimeOf(uc) { return uc.usedTime ?? ''; },
  },
};
</script>

<style scoped>
#coupon-center-page {
  background: #f6f8fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.coupon-container {
  flex: 1;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 24px; font-weight: 700; color: #222; margin: 0; }
.back-link { font-size: 14px; color: #5b8def; text-decoration: none; }
.back-link:hover { opacity: 0.8; }

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 14px;
  color: #888;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}
.tab:hover { color: #5b8def; background: #f8faff; }
.tab.on { color: #5b8def; font-weight: 600; border-bottom-color: #5b8def; background: #f8faff; }

.section-label { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 14px; }

.loading-wrap { text-align: center; padding: 80px; color: #999; }
.empty-state { text-align: center; padding: 60px; color: #aaa; }

/* ====== 领券中心网格 ====== */
.grid { display: grid; gap: 16px; }
.c3 { grid-template-columns: repeat(3, 1fr); }

.coupon-card-h {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0cda6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
  min-height: 100px;
}
.coupon-card-h:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); }

.coupon-left-block {
  width: 100px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 14px 8px;
  text-align: center;
}
.coupon-big-num { font-size: 24px; font-weight: 800; line-height: 1.2; }
.coupon-big-num .cur { font-size: 13px; }
.coupon-condition { font-size: 11px; opacity: 0.85; margin-top: 6px; }

.coupon-mid-info {
  flex: 1;
  padding: 14px 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.coupon-name { font-size: 14px; font-weight: 600; color: #333; }
.coupon-detail { font-size: 12px; margin-top: 4px; }

.coupon-action {
  width: 82px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.btn-get {
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.btn-get:hover:not(:disabled) { opacity: 0.85; }
.btn-get:disabled { opacity: 0.5; cursor: not-allowed; }
.tag-getted { font-size: 12px; color: #27ae60; font-weight: 600; }

/* ====== 我的优惠券 ====== */
.coupon-card-v {
  background: #fff;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 12px;
  border-left: 4px solid #5b8def;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
}
.coupon-card-v:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.coupon-card-v.expired { opacity: 0.65; }

.my-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.my-amount { font-size: 22px; font-weight: 700; color: #e74c3c; }
.my-amount .cur { font-size: 14px; }

.tag {
  display: inline-block; padding: 2px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600; border: 1px solid #cfd4da; color: #555;
}
.tag.accent { background: #eef2ff; border-color: #b6c8f0; color: #5b8def; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }

.my-name { margin: 6px 0 4px; }
.my-name b { font-size: 14px; color: #2c3e50; }
.my-condition { font-size: 13px; margin-bottom: 4px; }
.my-time { color: #aaa; }

.my-action { margin-top: 10px; }
.btn-use {
  display: inline-block;
  padding: 6px 20px;
  border-radius: 6px;
  background: #5b8def;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}
.btn-use:hover { opacity: 0.85; }

.muted { color: #999; }
.small { font-size: 12px; }

/* Pager */
.pager {
  display: flex; gap: 6px; justify-content: center; margin-top: 24px;
}
.pager span {
  min-width: 32px; height: 32px; border: 1px solid #cfd4da; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: #555; background: #fff; padding: 0 8px; cursor: pointer;
}
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; border-color: #5b8def; color: #fff; }
.pager span.disabled { opacity: 0.3; cursor: not-allowed; }

@media (max-width: 800px) {
  .c3 { grid-template-columns: repeat(2, 1fr); }
  .coupon-left-block { width: 80px; }
}
@media (max-width: 540px) {
  .c3 { grid-template-columns: 1fr; }
}
</style>
