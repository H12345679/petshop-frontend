<template>
  <div id="detail-page">
    <div class="detail-wrap">
      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 加载失败 -->
      <div v-if="!loading && loadError" class="empty-state">
        <p>{{ loadError }}</p>
        <router-link to="/orders" class="back-link">← 返回订单列表</router-link>
      </div>

      <template v-if="!loading && !loadError && order">
        <!-- 状态横幅 -->
        <div class="banner" :class="bannerClass">
          <div class="banner-icon">{{ statusIcon }}</div>
          <div>
            <div class="banner-title">{{ order.statusName }}</div>
            <div v-if="order.status === 0" class="banner-sub">请尽快完成支付，超时订单自动取消并释放库存</div>
            <div v-else-if="order.status === 2" class="banner-sub">商品已发出，请注意查收</div>
            <div v-else-if="order.status === 3" class="banner-sub">收到货了吗？去评价一下吧</div>
            <div v-else-if="order.status < 0" class="banner-sub">{{ order.cancelReason || '退款处理中' }}</div>
          </div>
        </div>

        <!-- 进度步骤 -->
        <div class="card">
          <div class="steps">
            <span v-for="(s, i) in progressSteps" :key="i" class="step" :class="{ on: s.on }">
              <span class="dot">{{ s.done ? '✓' : s.num }}</span>{{ s.label }}
            </span>
          </div>
        </div>

        <!-- 收货信息 -->
        <div class="card">
          <h3>收货信息</h3>
          <div class="small">{{ order.receiverName }}　{{ order.receiverPhone }}</div>
          <div class="small muted mt8">{{ order.receiverAddress }}</div>
        </div>

        <!-- 商品明细 -->
        <div class="card">
          <h3>商品明细　<span class="small muted">{{ order.shopName || '店铺' }}</span></h3>
          <table class="tbl">
            <thead>
              <tr>
                <th>商品</th>
                <th>规格</th>
                <th style="width:80px">单价</th>
                <th style="width:50px">数量</th>
                <th style="width:90px">小计</th>
                <th style="width:100px">分摊实付</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>
                  <div class="prod-cell">
                    <div class="prod-img"><img :src="item.productImage || '/logo.png'" /></div>
                    {{ item.productName }}
                  </div>
                </td>
                <td class="small muted">{{ item.specName || '—' }}</td>
                <td>¥{{ (item.price || 0).toFixed(2) }}</td>
                <td>{{ item.quantity }}</td>
                <td>¥{{ ((item.price || 0) * item.quantity).toFixed(2) }}</td>
                <td class="price">¥{{ (item.realPayAmount || 0).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="small muted mt8">💡 分摊实付 realPayAmount 为退款上限</div>
        </div>

        <!-- 付款信息 -->
        <div class="card">
          <h3>付款信息</h3>
          <div class="price-row"><span class="muted">商品总额</span><span>¥{{ (order.totalAmount || 0).toFixed(2) }}</span></div>
          <div class="price-row" v-if="order.discountAmount > 0"><span class="muted">优惠合计（会员 + 券）</span><span class="discount">−¥{{ (order.discountAmount || 0).toFixed(2) }}</span></div>
          <div class="total-row"><span>实付款</span><span class="total-price">¥{{ (order.payAmount || 0).toFixed(2) }}</span></div>
        </div>

        <!-- 订单信息 -->
        <div class="card">
          <h3>订单信息</h3>
          <div class="small muted mb8">订单编号：{{ order.orderNo }}　<span class="copy-link" @click="copyOrderNo">复制</span></div>
          <div class="small muted mb8">创建时间：{{ order.createTime }}</div>
          <div class="small muted">支付方式：余额支付 / 模拟快捷支付</div>
        </div>

        <!-- 底部操作栏 -->
        <div class="bottom-bar">
          <span class="small muted">应付：<span class="price" style="font-size:20px">¥{{ (order.payAmount || 0).toFixed(2) }}</span></span>
          <div class="bottom-actions">
            <span v-if="order.status === 0 || order.status === 1" class="btn" @click="cancelOrder">取消订单</span>
            <span v-if="order.status === 0" class="btn primary lg" @click="payOrder" :class="{ disabled: paying }">{{ paying ? '支付中…' : '立即支付' }}</span>
            <span v-if="order.status === 2" class="btn" @click="openRefund">申请退款</span>
            <span v-if="order.status === 2" class="btn primary lg" @click="receiveOrder">确认收货</span>
            <span v-if="order.status === 3" class="btn" @click="openRefund">申请退款</span>
            <span v-if="order.status === 3" class="btn primary lg" @click="goReview">去评价</span>
            <span v-if="order.status >= 4" class="btn sm">再次购买</span>
            <span v-if="order.status < 0" class="btn" disabled>已取消/已退款</span>
          </div>
        </div>
      </template>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { getOrderById, payOrder, cancelOrder, receiveOrder } from "@/api/modules/order.js";
import { getUserInfo } from "@/api/modules/user.js";
import { setStore } from "@/libs/storage.js";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "OrderDetailView",
  components: { AppFooter },
  data() {
    return {
      order: null,
      items: [],
      loading: true,
      loadError: "",
      paying: false,
    };
  },
  computed: {
    statusIcon() {
      const m = { 0:'●', 1:'📦', 2:'🚚', 3:'⭐', 4:'✅', '-1':'❌', '-2':'🔁', '-3':'✅', '-4':'✅' };
      return m[this.order?.status] || '📄';
    },
    bannerClass() {
      const m = { 0:'b-pending', 1:'b-ship', 2:'b-receive', 3:'b-review', 4:'b-done', '-1':'b-cancel', '-2':'b-refund', '-3':'b-refunded', '-4':'b-refunded' };
      return m[this.order?.status] || '';
    },
    progressSteps() {
      const s = this.order ? this.order.status : null;
      if (s === null) return [];
      const es = s < 0 ? Math.max(0, s + 5) : s;
      return [
        { num: 1, label: '提交订单', done: es >= 0, on: es === 0 },
        { num: 2, label: '付款', done: es >= 1, on: es === 1 },
        { num: 3, label: '商家发货', done: es >= 2, on: es === 2 },
        { num: 4, label: '确认收货', done: es >= 3, on: es === 3 },
        { num: 5, label: '评价', done: es >= 4, on: es === 4 },
      ];
    },
  },
  created() { this.loadDetail(); },
  methods: {
    async loadDetail() {
      const id = this.$route.params.id;
      if (!id) {
        this.loadError = "订单ID不存在";
        this.loading = false;
        return;
      }
      this.loading = true;
      this.loadError = "";
      try {
        const res = await getOrderById(id);
        const data = res.data || {};
        if (!data || !data.id) {
          this.loadError = "订单不存在或已被删除";
        } else {
          this.order = data;
          this.items = data.orderItems || [];
        }
      } catch (e) {
        this.loadError = e.message || "订单加载失败，请稍后再试";
        // 兜底：从订单列表查
        try {
          const { myOrders } = await import("@/api/modules/order.js");
          const fallbackRes = await myOrders({ current: 1, size: 200 });
          const records = fallbackRes.data?.records || [];
          const found = records.find(o => String(o.id) === String(id));
          if (found) {
            this.order = found;
            this.items = found.orderItems || [];
            this.loadError = "";
          }
        } catch (e2) { /* ignore */ }
      } finally {
        this.loading = false;
      }
    },

    async refreshBalance() {
      try {
        const res = await getUserInfo();
        if (res && res.data) {
          setStore("userInfo", JSON.stringify(res.data));
        }
      } catch (e) { /* 静默刷新 */ }
    },

    async payOrder() {
      if (this.paying) return;
      if (!this.order || this.order.status !== 0) {
        return this.$message.warning("当前订单状态不可支付");
      }
      await this.$confirm("确定使用余额支付？", "支付确认", {
        confirmButtonText: "支付", cancelButtonText: "取消", type: "info",
      });
      this.paying = true;
      try {
        await payOrder(this.order.id, 1);
        this.$message.success("支付成功！");
        await this.refreshBalance(); // 刷新余额
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error(e.message || "支付失败");
        }
      } finally {
        this.paying = false;
      }
    },

    async cancelOrder() {
      try {
        const { value } = await this.$prompt("取消原因：", "取消订单", { inputValue: "不想要了" });
        await cancelOrder(this.order.id, value);
        this.$message.success("已取消");
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "取消失败");
      }
    },

    async receiveOrder() {
      await this.$confirm("确认收到商品？", "确认收货", { type: "warning" });
      try {
        await receiveOrder(this.order.id);
        this.$message.success("收货成功");
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "操作失败");
      }
    },

    copyOrderNo() {
      if (this.order?.orderNo) {
        navigator.clipboard.writeText(this.order.orderNo).catch(() => {});
        this.$message.success("已复制");
      }
    },

    openRefund() { this.$router.push(`/refund?orderId=${this.order.id}`); },
    goReview() { this.$router.push(`/review?orderId=${this.order.id}`); },
  },
};
</script>

<style scoped>
#detail-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.detail-wrap { max-width: 760px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.loading-wrap { text-align: center; padding: 80px; color: #888; }
.empty-state { text-align: center; padding: 80px; color: #888; }
.empty-state .back-link { font-size: 14px; color: #5b8def; text-decoration: none; font-weight: 500; }

/* 状态横幅 */
.banner {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 24px; border-radius: 8px; color: #fff; margin-bottom: 16px;
  background: linear-gradient(90deg, #5b8def, #7aa5f5);
}
.banner.b-pending { background: linear-gradient(90deg, #5b8def, #7aa5f5); }
.banner.b-done { background: #aaa; }
.banner.b-cancel { background: linear-gradient(90deg, #d9534f, #e88583); }
.banner.b-refund, .banner.b-refunded { background: linear-gradient(90deg, #e6914e, #f0b880); }
.banner-icon { font-size: 32px; }
.banner-title { font-size: 18px; font-weight: 700; }
.banner-sub { font-size: 13px; opacity: .9; margin-top: 6px; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.card h3 { margin: 0 0 12px; font-size: 15px; }

/* 步骤条 */
.steps { display: flex; align-items: center; justify-content: center; }
.step { display: flex; align-items: center; color: #888; font-size: 13px; }
.step .dot { width: 22px; height: 22px; border-radius: 50%; background: #dfe3e9; color: #777; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 4px; }
.step.on { color: #5b8def; }
.step.on .dot { background: #5b8def; color: #fff; }
.step + .step { margin-left: 10px; position: relative; }
.step + .step::before { content: ''; display: inline-block; width: 46px; height: 2px; background: #cfd4da; margin-right: 10px; }
.step.on::before, .step.on + .step::before { background: #5b8def; }

/* 商品表格 */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { background: #f7f8fa; text-align: left; padding: 8px; border-bottom: 1px solid #cfd4da; color: #555; font-weight: 600; }
.tbl td { padding: 8px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.prod-cell { display: flex; align-items: center; gap: 8px; }
.prod-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.mt8 { margin-top: 8px; }
.mb8 { margin-bottom: 8px; }

/* 金额 */
.price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #555; }
.total-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cfd4da; padding-top: 10px; }
.total-price { font-size: 22px; color: #d9534f; font-weight: 700; }
.discount { color: #4caf7d; }

/* 操作栏 */
.bottom-bar {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 12px 16px;
}
.bottom-actions { display: flex; gap: 8px; align-items: center; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #9aa1aa; background: #fff; color: #444; border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn.primary { background: #5b8def; border-color: #5b8def; color: #fff; }
.btn.lg { padding: 11px 22px; font-size: 15px; }
.btn:hover { opacity: 0.85; }
.btn.disabled { opacity: 0.4; cursor: not-allowed; }

.price { color: #d9534f; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #888; }
.copy-link { color: #5b8def; cursor: pointer; }
</style>
