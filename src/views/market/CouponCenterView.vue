<template>
  <div id="coupon-center-page">
    <div class="coupon-container">
      <div class="page-header">
        <h1 class="page-title">🎫 优惠券</h1>
        <router-link to="/" class="home-link">🏠 返回首页</router-link>
      </div>

      <!-- Tab 切换 -->
      <div class="tabs">
        <span :class="['tab', { active: activeTab === 'center' }]" @click="activeTab = 'center'">领券中心</span>
        <span :class="['tab', { active: activeTab === 'mine' }]" @click="switchToMine">我的优惠券</span>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- ======== 领券中心 ======== -->
      <div v-if="!loading && activeTab === 'center'" class="coupon-list">
        <div v-if="centerList.length === 0" class="empty-state">
          <p>暂无可用优惠券</p>
        </div>
        <div v-for="coupon in centerList" :key="coupon.id" class="coupon-card">
          <div class="coupon-left" :class="coupon.type === 1 ? 'type-reduce' : 'type-discount'">
            <div class="coupon-amount">
              <span class="amount-symbol">¥</span>
              <span class="amount-value">{{ Number(coupon.amount).toFixed(0) }}</span>
            </div>
            <div class="coupon-type">{{ coupon.type === 1 ? '满减券' : '折扣券' }}</div>
          </div>
          <div class="coupon-mid">
            <div class="coupon-name">{{ coupon.name }}</div>
            <div class="coupon-condition">
              {{ Number(coupon.threshold) > 0 ? '满 ¥' + Number(coupon.threshold).toFixed(0) + ' 可用' : '无门槛' }}
            </div>
            <div class="coupon-remain">剩余 {{ coupon.remain }} / {{ coupon.total }} 张</div>
          </div>
          <div class="coupon-right">
            <button
              v-if="!coupon.received"
              class="btn-receive"
              @click="receive(coupon)"
              :disabled="coupon.receiving"
            >
              {{ coupon.receiving ? '领取中…' : '立即领取' }}
            </button>
            <span v-else class="received-tag">已领取</span>
          </div>
        </div>
      </div>

      <!-- ======== 我的优惠券 ======== -->
      <div v-if="!loading && activeTab === 'mine'" class="coupon-list">
        <div class="status-tabs">
          <span
            v-for="st in mineStatusTabs"
            :key="st.value"
            :class="['status-tab', { active: mineStatus === st.value }]"
            @click="mineStatus = st.value; loadMyCoupons()"
          >{{ st.label }}</span>
        </div>
        <div v-if="myList.length === 0" class="empty-state">
          <p>暂无优惠券</p>
        </div>
        <div v-for="uc in myList" :key="uc.id" class="coupon-card mine">
          <div class="coupon-left" :class="uc.couponInfo?.type === 1 ? 'type-reduce' : 'type-discount'">
            <div class="coupon-amount">
              <span class="amount-symbol">{{ uc.couponInfo?.type === 1 ? '¥' : '' }}</span>
              <span class="amount-value">
                {{ uc.couponInfo?.type === 1 ? Number(uc.couponInfo?.amount).toFixed(0) : (Number(uc.couponInfo?.amount) * 10).toFixed(0) + '折' }}
              </span>
            </div>
            <div class="coupon-type">{{ uc.couponInfo?.type === 1 ? '满减券' : '折扣券' }}</div>
          </div>
          <div class="coupon-mid">
            <div class="coupon-name">{{ uc.couponInfo?.name || '优惠券' }}</div>
            <div class="coupon-condition">
              {{ Number(uc.couponInfo?.threshold) > 0 ? '满 ¥' + Number(uc.couponInfo?.threshold).toFixed(0) + ' 可用' : '无门槛' }}
            </div>
            <div class="coupon-time" v-if="uc.couponInfo?.endTime">
              有效期至：{{ formatTime(uc.couponInfo.endTime) }}
            </div>
          </div>
          <div class="coupon-right">
            <span :class="['status-badge', statusBadgeClass(uc.status)]">{{ statusBadgeLabel(uc.status) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { couponList, receiveCoupon, myCoupons } from "@/api/modules/coupon.js";

const MINE_STATUS_TABS = [
  { label: "全部", value: null },
  { label: "未使用", value: 0 },
  { label: "已使用", value: 1 },
  { label: "已过期", value: 2 },
];

export default {
  name: "CouponCenterView",
  data() {
    return {
      activeTab: "center",
      loading: true,
      centerList: [],
      myList: [],
      mineStatus: null,
      mineStatusTabs: MINE_STATUS_TABS,
    };
  },
  created() {
    // 支持 ?tab=mine 查询参数（从导航栏跳转过来时自动切到"我的优惠券"）
    if (this.$route.query.tab === 'mine') {
      this.activeTab = 'mine';
      this.loadMyCoupons();
    } else {
      this.loadCenter();
    }
  },
  methods: {
    async loadCenter() {
      this.loading = true;
      try {
        const res = await couponList();
        // 标记已领取
        this.centerList = (res.data || []).map((c) => ({ ...c, received: false, receiving: false }));
        // 查用户已领的券来标记
        try {
          const mineRes = await myCoupons();
          const mine = mineRes.data || [];
          const claimedIds = new Set(mine.map((uc) => String(uc.couponId)));
          this.centerList.forEach((c) => {
            if (claimedIds.has(String(c.id))) c.received = true;
          });
        } catch (e) {
          // 未登录也能看领券中心
        }
      } catch (e) {
        this.$message.error("加载优惠券失败");
      } finally {
        this.loading = false;
      }
    },

    async switchToMine() {
      this.activeTab = "mine";
      if (this.myList.length === 0) {
        await this.loadMyCoupons();
      }
    },

    async loadMyCoupons() {
      this.loading = true;
      try {
        const res = await myCoupons(this.mineStatus);
        const list = res.data || [];
        // 需要查优惠券详情来展示名称等信息
        const allRes = await couponList();
        const allMap = {};
        (allRes.data || []).forEach((c) => { allMap[c.id] = c; });
        this.myList = list.map((uc) => ({
          ...uc,
          couponInfo: allMap[uc.couponId] || { name: "优惠券", type: 1, amount: 0, threshold: 0 },
        }));
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
      } catch (e) {
        this.$message.error(e.message || "领取失败");
      } finally {
        coupon.receiving = false;
      }
    },

    statusBadgeClass(status) {
      const map = { 0: "badge-unused", 1: "badge-used", 2: "badge-expired" };
      return map[status] || "";
    },

    statusBadgeLabel(status) {
      const map = { 0: "未使用", 1: "已使用", 2: "已过期" };
      return map[status] || "未知";
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 10);
    },
  },
};
</script>

<style scoped>
.coupon-container { max-width: 800px; margin: 0 auto; padding: 24px 20px 60px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0; }
.home-link { font-size: 14px; color: #6b8dd6; text-decoration: none; font-weight: 500; }
.home-link:hover { opacity: 0.8; }

.loading-wrap { text-align: center; padding: 80px; color: #999; font-size: 16px; }
.empty-state { text-align: center; padding: 60px 20px; color: #999; font-size: 15px; }

/* Tab */
.tabs { display: flex; gap: 4px; background: #fff; border-radius: 12px; padding: 8px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.tab { padding: 8px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; color: #666; transition: all 0.2s; font-weight: 500; }
.tab:hover { background: #f0f2f5; }
.tab.active { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }

/* 我的优惠券状态筛选 */
.status-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.status-tab { padding: 6px 16px; border-radius: 100px; font-size: 13px; cursor: pointer; color: #666; background: #f5f5f5; font-weight: 500; transition: all 0.2s; }
.status-tab.active { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }

/* 优惠券卡片 */
.coupon-list { display: flex; flex-direction: column; gap: 12px; }
.coupon-card {
  display: flex; align-items: center; background: #fff; border-radius: 12px;
  padding: 0; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
}
.coupon-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.coupon-card.mine { opacity: 0.9; }

/* 左 - 金额区 */
.coupon-left {
  width: 110px; flex-shrink: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 16px 0;
  color: #fff; position: relative;
}
.coupon-left::after {
  content: ''; position: absolute; right: -8px; top: 50%; margin-top: -8px;
  width: 16px; height: 16px; background: #f5f6fa; border-radius: 50%;
}
.type-reduce { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.type-discount { background: linear-gradient(135deg, #e67e22, #d35400); }
.coupon-amount { display: flex; align-items: baseline; gap: 2px; }
.amount-symbol { font-size: 14px; }
.amount-value { font-size: 28px; font-weight: 800; line-height: 1; }
.coupon-type { font-size: 11px; opacity: 0.9; margin-top: 4px; }

/* 中 - 信息区 */
.coupon-mid { flex: 1; padding: 14px 16px 14px 20px; min-width: 0; }
.coupon-name { font-size: 15px; font-weight: 600; color: #2c3e50; }
.coupon-condition { font-size: 13px; color: #999; margin-top: 4px; }
.coupon-remain { font-size: 12px; color: #bbb; margin-top: 2px; }
.coupon-time { font-size: 12px; color: #bbb; margin-top: 2px; }

/* 右 - 操作区 */
.coupon-right { width: 100px; flex-shrink: 0; padding: 14px; text-align: center; }
.btn-receive {
  padding: 8px 0; width: 100%; border: none; border-radius: 100px;
  background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.btn-receive:hover:not(:disabled) { opacity: 0.85; }
.btn-receive:disabled { opacity: 0.5; cursor: not-allowed; }
.received-tag { font-size: 13px; color: #27ae60; font-weight: 600; }

/* 状态标签 */
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
.badge-unused { background: #e8f5e9; color: #27ae60; }
.badge-used { background: #f5f5f5; color: #999; }
.badge-expired { background: #fbe9e7; color: #d84315; }
</style>
