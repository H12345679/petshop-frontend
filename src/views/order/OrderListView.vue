<template>
  <div id="order-list-page">
    <div class="order-container">
      <div class="page-header">
        <h1 class="page-title">📄 我的订单</h1>
        <router-link to="/" class="home-link">🏠 返回首页</router-link>
      </div>

      <!-- 状态筛选标签 -->
      <div class="status-tabs">
        <span
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['tab', { active: activeStatus === tab.value }]"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="tab-count">({{ tab.count }})</span>
        </span>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 空状态 -->
      <div v-if="!loading && orders.length === 0" class="empty-state">
        <p>暂无相关订单</p>
        <router-link to="/products" class="go-btn">去逛逛</router-link>
      </div>

      <!-- 订单列表 -->
      <div v-if="!loading" class="order-list">
        <div v-for="order in orders" :key="order.id" class="order-card" @click="$router.push('/order/' + order.id)">
          <!-- 订单头部 -->
          <div class="order-header">
            <span class="order-no">订单号：{{ order.orderNo }}</span>
            <span class="shop-name" v-if="order.shopId">🏪 店铺 #{{ order.shopId }}</span>
            <span :class="['status-tag', statusClass(order.status)]">{{ order.statusName }}</span>
          </div>

          <!-- 订单商品 -->
          <div class="order-items">
            <div v-for="item in (order.orderItems || [])" :key="item.id" class="order-item">
              <img :src="item.productImage || '/logo.png'" class="oi-img" />
              <div class="oi-info">
                <div class="oi-name">{{ item.productName }}</div>
                <div class="oi-spec" v-if="item.specName">{{ item.specName }}</div>
              </div>
              <div class="oi-price">¥{{ (item.price || 0).toFixed(2) }}</div>
              <div class="oi-qty">× {{ item.quantity }}</div>
            </div>
          </div>

          <!-- 订单底栏 -->
          <div class="order-footer">
            <div class="order-amount">
              共 {{ (order.orderItems || []).reduce((s, i) => s + i.quantity, 0) }} 件
              合计：<span class="pay-amount">¥{{ (order.payAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="order-actions">
              <template v-if="order.status === 0">
                <button class="btn btn-primary" @click.stop="payOrder(order)">去支付</button>
                <button class="btn btn-default" @click.stop="cancelOrder(order)">取消</button>
              </template>
              <template v-if="order.status === 1">
                <button class="btn btn-default" @click.stop="cancelOrder(order)">取消</button>
              </template>
              <template v-if="order.status === 2">
                <button class="btn btn-primary" @click.stop="receiveOrder(order)">确认收货</button>
              </template>
              <template v-if="order.status === 3">
                <button class="btn btn-primary" @click.stop="$router.push('/order/' + order.id)">去评价</button>
              </template>
              <button class="btn btn-text" @click.stop="$router.push('/order/' + order.id)">详情</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="load-more">
        <button class="btn btn-default" @click="loadMore">加载更多</button>
      </div>
    </div>
  </div>
</template>

<script>
import { myOrders, payOrder, cancelOrder, receiveOrder } from "@/api/modules/order.js";

const STATUS_TABS = [
  { label: "全部", value: null },
  { label: "待支付", value: 0 },
  { label: "待发货", value: 1 },
  { label: "待收货", value: 2 },
  { label: "待评价", value: 3 },
  { label: "已完成", value: 4 },
  { label: "已取消", value: -1 },
];

export default {
  name: "OrderListView",
  data() {
    return {
      orders: [],
      current: 1,
      pageSize: 10,
      total: 0,
      activeStatus: null,
      loading: false,
    };
  },
  computed: {
    statusTabs() {
      return STATUS_TABS.map((t) => ({
        ...t,
        count: undefined,
      }));
    },
    hasMore() {
      return this.orders.length < this.total;
    },
  },
  created() {
    const statusParam = this.$route.query.status;
    if (statusParam !== undefined) {
      this.activeStatus = Number(statusParam);
    }
    this.loadOrders();
  },
  methods: {
    async loadOrders() {
      this.loading = true;
      try {
        const params = { current: 1, size: this.pageSize };
        if (this.activeStatus !== null) params.status = this.activeStatus;
        const res = await myOrders(params);
        this.orders = res.data?.records || [];
        this.total = res.data?.total || 0;
        this.current = 1;
      } catch (e) {
        this.$message.error("加载订单失败：" + e.message);
      } finally {
        this.loading = false;
      }
    },

    async loadMore() {
      this.current++;
      try {
        const params = { current: this.current, size: this.pageSize };
        if (this.activeStatus !== null) params.status = this.activeStatus;
        const res = await myOrders(params);
        const records = res.data?.records || [];
        this.orders = this.orders.concat(records);
      } catch (e) {
        this.$message.error("加载更多失败");
        this.current--;
      }
    },

    switchTab(value) {
      this.activeStatus = value;
      this.loadOrders();
    },

    async payOrder(order) {
      this.$confirm("确定支付该订单？", "提示", {
        confirmButtonText: "余额支付",
        cancelButtonText: "取消",
        type: "info",
      }).then(async () => {
        try {
          await payOrder(order.id, 1);
          this.$message.success("支付成功！");
          this.loadOrders();
        } catch (e) {
          this.$message.error(e.message || "支付失败");
        }
      }).catch(() => {});
    },

    async cancelOrder(order) {
      this.$prompt("请输入取消原因：", "取消订单", {
        confirmButtonText: "确定",
        cancelButtonText: "再想想",
        inputValue: "不想要了",
      }).then(async ({ value }) => {
        try {
          await cancelOrder(order.id, value || "用户取消");
          this.$message.success("订单已取消");
          this.loadOrders();
        } catch (e) {
          this.$message.error(e.message || "取消失败");
        }
      }).catch(() => {});
    },

    async receiveOrder(order) {
      this.$confirm("确认收到商品了吗？", "确认收货", {
        confirmButtonText: "确认",
        cancelButtonText: "再想想",
        type: "warning",
      }).then(async () => {
        try {
          await receiveOrder(order.id);
          this.$message.success("收货成功，请评价");
          this.loadOrders();
        } catch (e) {
          this.$message.error(e.message || "收货失败");
        }
      }).catch(() => {});
    },

    statusClass(status) {
      const map = {
        0: "status-pending", 1: "status-ship", 2: "status-receive",
        3: "status-review", 4: "status-done",
        "-1": "status-cancel", "-2": "status-refund", "-3": "status-refunded",
        "-4": "status-refunded",
      };
      return map[status] || "";
    },
  },
};
</script>

<style scoped>
.order-container { max-width: 900px; margin: 0 auto; padding: 24px 20px 60px; }
.page-title { font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 24px; }

/* 状态标签 */
.status-tabs { display: flex; gap: 4px; background: #fff; border-radius: 12px; padding: 8px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); flex-wrap: wrap; }
.tab { padding: 8px 18px; border-radius: 8px; font-size: 14px; cursor: pointer; color: #666; transition: all 0.2s; font-weight: 500; }
.tab:hover { background: #f0f2f5; }
.tab.active { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }
.tab-count { font-size: 12px; }

.loading-wrap { text-align: center; padding: 60px; color: #999; font-size: 16px; }
.empty-state { text-align: center; padding: 80px 20px; color: #999; font-size: 16px; }
.go-btn { display: inline-block; margin-top: 16px; padding: 10px 32px; background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; border-radius: 100px; text-decoration: none; font-weight: 600; }

/* 订单卡片 */
.order-card { background: #fff; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); cursor: pointer; transition: box-shadow 0.2s; }
.order-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.order-header { display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f5f5f5; gap: 12px; }
.order-no { font-size: 13px; color: #999; }
.shop-name { font-size: 13px; color: #666; flex: 1; }
.status-tag { font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 100px; }
.status-pending { background: #fff3e0; color: #f57c00; }
.status-ship { background: #e3f2fd; color: #1976d2; }
.status-receive { background: #e8f5e9; color: #388e3c; }
.status-review { background: #f3e5f5; color: #7b1fa2; }
.status-done { background: #f5f5f5; color: #888; }
.status-cancel { background: #fbe9e7; color: #d84315; }
.status-refund, .status-refunded { background: #fff3e0; color: #e65100; }

/* 订单商品 */
.order-items { padding: 12px 20px; }
.order-item { display: flex; align-items: center; padding: 8px 0; gap: 12px; }
.oi-img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; background: #f5f5f5; }
.oi-info { flex: 1; min-width: 0; }
.oi-name { font-size: 14px; font-weight: 500; }
.oi-spec { font-size: 12px; color: #999; }
.oi-price { flex: 0 0 60px; text-align: right; color: #666; font-size: 13px; }
.oi-qty { flex: 0 0 30px; text-align: center; color: #999; }

/* 订单底栏 */
.order-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid #f5f5f5; }
.order-amount { font-size: 14px; color: #666; }
.pay-amount { font-size: 18px; font-weight: 700; color: #e74c3c; }
.order-actions { display: flex; gap: 8px; }
.btn { padding: 8px 20px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.2s; }
.btn-primary { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }
.btn-default { background: #f0f0f0; color: #555; border: 1px solid #e0e0e0; }
.btn-text { background: transparent; color: #6b8dd6; padding: 8px 12px; }
.btn:hover { opacity: 0.85; }
.load-more { text-align: center; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { margin-bottom: 0; }
.home-link { font-size: 14px; color: #6b8dd6; text-decoration: none; font-weight: 500; }
.home-link:hover { opacity: 0.8; }
</style>
