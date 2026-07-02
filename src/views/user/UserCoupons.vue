<template>
  <div class="panel">
    <h3>我的优惠券</h3>
    <div class="coupon-status-bar">
      <span
        v-for="s in couponStatusFilters"
        :key="s.value"
        :class="['filter-tag', { on: couponStatusFilter === s.value }]"
        @click="setFilter(s.value)"
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
        <button v-if="!c.received" class="btn primary sm" :disabled="c.claiming" @click="doReceiveCoupon(c)">
          {{ c.claiming ? '领取中…' : '立即领取' }}
        </button>
        <span v-else style="font-size:12px;color:#27ae60;font-weight:600;white-space:nowrap;">已领取</span>
      </div>
    </div>
  </div>
</template>

<script>
import { getMyCoupons, getCouponList, receiveCoupon } from "@/api/modules/user.js";

export default {
  name: "UserCoupons",
  data() {
    return {
      myCoupons: [],
      availableCoupons: [],
      couponStatusFilter: "",
      loadingCoupons: false,
      loadingAvailCoupons: false,
    };
  },
  computed: {
    couponStatusFilters() {
      return [
        { label: "全部", value: "" },
        { label: "未使用", value: "0" },
        { label: "已使用", value: "1" },
        { label: "已过期", value: "2" },
      ];
    }
  },
  created() {
    this.loadMyCoupons();
    this.loadAvailableCoupons();
  },
  activated() {
    this.loadMyCoupons();
    this.loadAvailableCoupons();
  },
  methods: {
    setFilter(val) {
      this.couponStatusFilter = val;
      this.loadMyCoupons();
    },
    async loadMyCoupons() {
      this.loadingCoupons = true;
      try {
        const params = {};
        if (this.couponStatusFilter !== "") params.status = Number(this.couponStatusFilter);
        const res = await getMyCoupons(params);
        this.myCoupons = res.data || [];
        this.$emit('update-count', this.myCoupons.length ? this.myCoupons.filter(c => c.status === 0).length : 0);
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
        // 取出当前用户已领的 couponId，标记"已领取"，避免领券中心对已领券仍显示"立即领取"
        let claimedIds = new Set();
        try {
          const mineRes = await getMyCoupons({});
          claimedIds = new Set((mineRes.data || []).map(uc => String(uc.couponId)));
        } catch (e) { /* 未登录/失败则都按未领取处理 */ }
        this.availableCoupons = (res.data || []).map(c => ({
          ...c,
          claiming: false,
          received: claimedIds.has(String(c.id)),
        }));
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
        this.$emit('notify', "success", "领取成功！");
        this.$set(coupon, "received", true); // 即时标记，避免刷新前仍显示可领
        await this.loadMyCoupons();
        await this.loadAvailableCoupons();
      } catch (e) {
        this.$emit('notify', "error", e.message || "领取失败");
      } finally {
        this.$set(coupon, "claiming", false);
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

/* 筛选标签 */
.coupon-status-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-tag {
  padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #f0f1f3; color: #666; cursor: pointer; transition: .12s;
}
.filter-tag:hover { background: #e3e7ef; }
.filter-tag.on { background: #5b8def; color: #fff; }

/* 优惠券 */
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

.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #5b8def; color: #fff; border-color: #5b8def; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
.btn.sm { padding: 5px 14px; font-size: 12px; }

.empty { padding: 24px 0; text-align: center; color: #999; font-size: 13px; }
</style>
