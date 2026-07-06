<template>
  <div id="payment-page">
    <AppHeader />
    <div class="payment-wrap">
      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 加载失败 -->
      <div v-if="!loading && loadError" class="empty-state">
        <p>{{ loadError }}</p>
        <router-link to="/orders" class="back-link">← 返回订单列表</router-link>
      </div>

      <template v-if="!loading && !loadError && orders.length > 0">
        <!-- 状态横幅（卡片包裹 + 渐变背景，与 wireframe 一致） -->
        <div class="card" style="background:linear-gradient(90deg,#2a69d4,#7aa5f5);color:#fff">
          <div style="font-size:18px;font-weight:700">💳 合并支付 · 待付款</div>
          <div class="small mt8" style="opacity:.9">共 {{ orders.length }} 个订单，{{ totalQty }} 件商品，请尽快完成支付</div>
        </div>

        <!-- 进度步骤（卡片包裹，与 wireframe 一致） -->
        <div class="card">
          <div class="steps">
            <span class="step"><span class="dot">✓</span>提交订单</span>
            <span class="step on"><span class="dot">2</span>付款</span>
            <span class="step"><span class="dot">3</span>商家发货</span>
            <span class="step"><span class="dot">4</span>确认收货</span>
            <span class="step"><span class="dot">5</span>评价</span>
          </div>
        </div>

        <!-- 收货信息 -->
        <div class="card">
          <h3>收货信息</h3>
          <div class="small">{{ orders[0].receiverName }}　{{ orders[0].receiverPhone }}</div>
          <div class="small muted mt8">{{ orders[0].receiverAddress }}</div>
        </div>

        <!-- 商品明细（一个订单 = 一个卡片 + table） -->
        <div
          v-for="(shop, si) in shopGroups"
          :key="si"
          class="card"
        >
          <h3>商品明细　<span class="small muted">{{ shop.shopName || '店铺' }}</span></h3>
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
              <tr v-for="item in shop.items" :key="item.id">
                <td>
                  <div class="prod-cell">
                    <div class="prod-img"><img :src="item.productImage || '/logo.png'" :alt="item.productName" /></div>
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
          <div class="small muted mt8">订单号：{{ shop.orderNo }}　实付 ¥{{ shop.payAmount.toFixed(2) }}</div>
        </div>

        <!-- 付款信息（含支付方式） -->
        <div class="card">
          <h3>付款信息</h3>
          <div class="price-row"><span class="muted">商品总额</span><span>¥{{ totalAmount.toFixed(2) }}</span></div>
          <div class="price-row" v-if="totalDiscount > 0"><span class="muted">优惠合计</span><span class="discount">−¥{{ totalDiscount.toFixed(2) }}</span></div>
          <div class="total-row">
            <span>应付总额</span><span class="total-price">¥{{ totalPayAmount.toFixed(2) }}</span>
          </div>
          <div class="small muted mt8">支付方式：余额支付　可用余额 ¥{{ userBalance.toFixed(2) }}</div>
        </div>

        <!-- 底部操作栏（卡片包裹，与 wireframe 一致） -->
        <div class="card bottom-bar-card">
          <span class="small muted">应付：<span class="price" style="font-size:20px">¥{{ totalPayAmount.toFixed(2) }}</span></span>
          <div class="bottom-actions">
            <span class="btn lg" @click="goBack">返回修改</span>
            <span class="btn primary lg" @click="batchPay" :class="{ disabled: paying }">{{ paying ? '支付中…' : '立即支付' }}</span>
          </div>
        </div>
      </template>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { getOrderById, batchPayOrder } from "@/api/modules/order.js";
import { getUserInfo } from "@/api/modules/user.js";
import { setStore } from "@/libs/storage.js";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "PaymentView",
  components: { AppHeader, AppFooter },
  data() {
    return {
      orders: [],
      orderIds: [],
      loading: true,
      loadError: "",
      paying: false,
      payMethod: 1,
      userBalance: 0,
    };
  },
  computed: {
    totalQty() {
      return this.orders.reduce((sum, o) => {
        return sum + (o.orderItems || []).reduce((s, i) => s + i.quantity, 0);
      }, 0);
    },
    totalAmount() {
      return this.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    },
    totalDiscount() {
      return this.orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    },
    totalPayAmount() {
      return this.orders.reduce((sum, o) => sum + (o.payAmount || 0), 0);
    },
    shopGroups() {
      return this.orders.map(order => ({
        shopName: order.shopName || '店铺',
        orderNo: order.orderNo,
        payAmount: order.payAmount || 0,
        items: (order.orderItems || []).map(item => ({
          ...item,
          shopName: order.shopName,
        })),
      }));
    },
  },
  created() {
    this.loadPaymentData();
  },
  methods: {
    async loadPaymentData() {
      this.loading = true;
      try {
        const raw = localStorage.getItem("PAYMENT_ORDER_IDS");
        if (!raw) {
          this.loadError = "未找到待支付订单";
          this.loading = false;
          return;
        }
        this.orderIds = JSON.parse(raw);
        if (this.orderIds.length === 0) {
          this.loadError = "未找到待支付订单";
          this.loading = false;
          return;
        }

        const orderPromises = this.orderIds.map(id => getOrderById(id));
        const results = await Promise.all(orderPromises);
        this.orders = results.map(r => r.data || {}).filter(o => o && o.id && o.status === 0);

        if (this.orders.length === 0) {
          this.loadError = "这些订单已支付或已被取消";
          this.loading = false;
          return;
        }

        const userRes = await getUserInfo();
        if (userRes && userRes.data) {
          this.userBalance = userRes.data.balance || 0;
          setStore("userInfo", JSON.stringify(userRes.data));
        }
      } catch (e) {
        this.loadError = e.message || "加载失败，请稍后再试";
      } finally {
        this.loading = false;
      }
    },

    async refreshBalance() {
      try {
        const res = await getUserInfo();
        if (res && res.data) {
          this.userBalance = res.data.balance || 0;
          setStore("userInfo", JSON.stringify(res.data));
        }
      } catch (e) {
        console.error("获取用户信息失败", e);
      }
    },

    async batchPay() {
      if (this.paying) return;
      if (this.userBalance < this.totalPayAmount) {
        return this.$message.warning("余额不足，当前余额 ¥" + this.userBalance.toFixed(2) + "，应付 ¥" + this.totalPayAmount.toFixed(2));
      }
      await this.$confirm(
        `确定使用余额支付 ¥${this.totalPayAmount.toFixed(2)}？共 ${this.orders.length} 个订单`,
        "合并支付确认",
        { confirmButtonText: "支付", cancelButtonText: "取消", type: "info" }
      );
      this.paying = true;
      try {
        const payIds = this.orders.map(o => o.id);
        await batchPayOrder(payIds, this.payMethod);
        this.$message.success("全部支付成功！");
        await this.refreshBalance();
        localStorage.removeItem("PAYMENT_ORDER_IDS");
        setTimeout(() => {
          this.$router.push("/orders").catch(() => {});
        }, 1500);
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "支付失败");
      } finally {
        this.paying = false;
      }
    },

    goBack() {
      localStorage.removeItem("PAYMENT_ORDER_IDS");
      this.$router.push("/orders").catch(() => {});
    },
  },
};
</script>

<style scoped>
#payment-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.payment-wrap { max-width: 760px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.loading-wrap { text-align: center; padding: 80px; color: #595959; }
.empty-state { text-align: center; padding: 80px; color: #595959; }
.empty-state .back-link { font-size: 14px; color: #2a69d4; text-decoration: none; font-weight: 500; }

/* 步骤条 */
.steps { display: flex; align-items: center; justify-content: center; }
.step { display: flex; align-items: center; color: #595959; font-size: 13px; }
.step .dot { width: 22px; height: 22px; border-radius: 50%; background: #dfe3e9; color: #555; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 4px; }
.step.on { color: #2a69d4; }
.step.on .dot { background: #2a69d4; color: #fff; }
.step + .step { margin-left: 10px; position: relative; }
.step + .step::before { content: ''; display: inline-block; width: 46px; height: 2px; background: #cfd4da; margin-right: 10px; }
.step.on::before, .step.on + .step::before { background: #2a69d4; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.card h3 { margin: 0 0 12px; font-size: 15px; }

/* 商品表格 */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { background: #f7f8fa; text-align: left; padding: 10px; border-bottom: 1px solid #cfd4da; color: #555; font-weight: 600; white-space: nowrap; }
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafbfc; }
.prod-cell { display: flex; align-items: center; gap: 8px; }
.prod-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }

/* 金额 */
.price { color: #c0392b; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #595959; }
.mt8 { margin-top: 8px; }
.price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #555; }
.total-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cfd4da; margin: 10px 0; padding-top: 10px; }
.total-price { font-size: 26px; color: #c0392b; font-weight: 700; }
.discount { color: #4caf7d; }

/* 底部操作栏（卡片样式） */
.bottom-bar-card {
  display: flex; justify-content: space-between; align-items: center;
  position: sticky; bottom: 0;
}
.bottom-actions { display: flex; gap: 10px; align-items: center; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #9aa1aa; background: #fff; color: #444; border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn.primary { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.btn.lg { padding: 11px 22px; font-size: 15px; }
.btn:hover { opacity: 0.85; }
.btn.disabled { opacity: 0.4; cursor: not-allowed; }
</style>
