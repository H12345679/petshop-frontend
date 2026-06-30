<template>
  <div id="order-list-page">
    <AppHeader />

    <div class="container">
      <div class="section-title">我的订单</div>

      <!-- 状态标签 -->
      <div class="tabs">
        <span v-for="tab in statusTabs" :key="tab.value"
          :class="['tab', { on: activeStatus === tab.value }]"
          @click="switchTab(tab.value)"
        >{{ tab.label }}</span>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 空状态 -->
      <div v-else-if="orders.length === 0" class="empty-state">
        <p>暂无相关订单</p>
        <router-link to="/products" class="go-shop-btn">去逛逛</router-link>
      </div>

      <!-- 订单列表 -->
      <template v-else>
        <div v-for="order in orders" :key="order.id" class="card" @click="$router.push('/order/' + order.id)">
          <!-- 订单头部 -->
          <div class="card-header">
            <span class="muted">
              订单号 {{ order.orderNo }} · {{ order.shopName || '店铺#' + order.shopId }} · {{ formatTime(order.createTime) }}
            </span>
            <span :class="['tag', statusTagClass(order.status)]">{{ statusLabel(order.status) }}</span>
          </div>

          <!-- 订单商品 -->
          <div class="card-body">
            <div v-for="item in (order.orderItems || [])" :key="item.id" class="prod-row">
              <div class="prod-left">
                <img :src="item.productImage || '/logo.png'" class="prod-img" />
                <div class="prod-info">
                  <div class="prod-name">{{ item.productName }}</div>
                  <div class="prod-spec" v-if="item.specName">{{ item.specName }} × {{ item.quantity }}</div>
                  <div class="prod-spec" v-else>× {{ item.quantity }}</div>
                </div>
              </div>
              <div class="prod-price">¥{{ (item.price || 0).toFixed(2) }}</div>
            </div>
            <!-- 物流信息 -->
            <div v-if="order.status === 2 && order.deliveryNo" class="delivery-info">
              已发货 · {{ order.deliveryCompany || '快递' }} {{ order.deliveryNo }}
            </div>
          </div>

          <!-- 订单底栏 -->
          <div class="card-footer">
            <div class="footer-summary">
              <span class="small muted">共 {{ totalQty(order) }} 件 实付 </span>
              <span class="price">¥{{ (order.payAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="footer-actions">
              <!-- 待支付 -->
              <template v-if="order.status === 0">
                <button class="btn sm" @click.stop="cancelOrder(order)">取消订单</button>
                <button class="btn sm primary" @click.stop="payOrder(order)">立即支付</button>
              </template>
              <!-- 待发货 -->
              <template v-if="order.status === 1">
                <button class="btn sm" @click.stop="cancelOrder(order)">取消订单</button>
              </template>
              <!-- 待收货 -->
              <template v-if="order.status === 2">
                <button class="btn sm" @click.stop="$router.push('/order/' + order.id)">查看物流</button>
                <button class="btn sm" @click.stop="refundOrder(order)">申请退款</button>
                <button class="btn sm primary" @click.stop="receiveOrder(order)">确认收货</button>
              </template>
              <!-- 待评价 -->
              <template v-if="order.status === 3">
                <button class="btn sm" @click.stop="refundOrder(order)">申请退款</button>
                <button class="btn sm primary" @click.stop="goReview(order)">去评价</button>
              </template>
              <!-- 已完成 -->
              <template v-if="order.status === 4">
                <button class="btn sm" @click.stop="deleteOrder(order)">删除订单</button>
                <button class="btn sm" @click.stop="buyAgain(order)">再次购买</button>
              </template>
              <!-- 退款/售后 -->
              <template v-if="order.status === -2 || order.status === -3">
                <button class="btn sm" @click.stop="$router.push('/order/' + order.id)">查看详情</button>
              </template>
              <!-- 已取消 -->
              <template v-if="order.status === -1">
                <button class="btn sm" @click.stop="deleteOrder(order)">删除订单</button>
              </template>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pager" v-if="totalPages > 1">
          <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
          <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
          <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
        </div>
      </template>
    </div>

    <AppFooter />
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
  { label: "退款/售后", value: -2 },
];

export default {
  name: "OrderListView",
  components: {
    AppHeader: () => import("@/components/AppHeader.vue"),
    AppFooter: () => import("@/components/AppFooter.vue"),
  },
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
      return STATUS_TABS;
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let start = Math.max(1, c - 2);
      let end = Math.min(tp, c + 2);
      if (end - start < 4) {
        if (start === 1) end = Math.min(tp, start + 4);
        else start = Math.max(1, end - 4);
      }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
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

    async goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loading = true;
      try {
        const params = { current: page, size: this.pageSize };
        if (this.activeStatus !== null) params.status = this.activeStatus;
        const res = await myOrders(params);
        this.orders = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) {
        this.$message.error("加载失败");
        this.current = page > this.current ? page - 1 : page + 1;
      } finally {
        this.loading = false;
      }
    },

    switchTab(value) {
      this.activeStatus = value;
      this.loadOrders();
    },

    totalQty(order) {
      return (order.orderItems || []).reduce((s, i) => s + (i.quantity || 0), 0);
    },

    formatTime(t) {
      if (!t) return "";
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${mo}-${dd} ${h}:${mi}`;
    },

    statusLabel(status) {
      const map = {
        0: "待支付", 1: "待发货", 2: "待收货", 3: "待评价", 4: "已完成",
        "-1": "已取消", "-2": "退款中", "-3": "已退款",
      };
      return map[status] || "未知";
    },

    statusTagClass(status) {
      const map = {
        0: "warn", 1: "accent", 2: "accent", 3: "ok", 4: "done",
        "-1": "cancel", "-2": "warn", "-3": "done",
      };
      return map[status] || "done";
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

    refundOrder(order) {
      const item = (order.orderItems || [])[0];
      if (item) {
        this.$router.push(`/refund?orderId=${order.id}&itemId=${item.id}`);
      } else {
        this.$message.info("该订单暂无可退款商品");
      }
    },

    goReview(order) {
      const item = (order.orderItems || [])[0];
      if (item) {
        this.$router.push(`/review?orderId=${order.id}&itemId=${item.id}`);
      } else {
        this.$router.push(`/order/${order.id}`);
      }
    },

    async deleteOrder(order) {
      this.$confirm("确定删除该订单？删除后不可恢复", "提示", {
        type: "warning",
      }).then(async () => {
        try {
          const { del } = await import("@/api/axios.js");
          await del(`/orders/${order.id}`);
          this.$message.success("已删除");
          this.loadOrders();
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },

    buyAgain(order) {
      localStorage.removeItem("CHECKOUT_ITEMS");
      const items = (order.orderItems || []).map(i => ({
        productId: i.productId,
        skuId: i.skuId || 0,
        quantity: i.quantity,
        productName: i.productName,
        productImage: i.productImage,
        specName: i.specName,
        price: i.price,
      }));
      localStorage.setItem("CHECKOUT_ITEMS", JSON.stringify(items));
      this.$router.push("/checkout");
    },
  },
};
</script>

<style scoped>
#order-list-page { background:#f4f5f7; min-height:100vh; display:flex; flex-direction:column; }
.container { width: 900px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }
.section-title { font-size:16px; font-weight:600; color:#2c3e50; margin-bottom:16px; }

.loading-wrap { text-align:center; padding:80px 0; color:#999; }
.empty-state { text-align:center; padding:80px 20px; color:#999; font-size:16px; }
.go-shop-btn { display:inline-block; margin-top:16px; padding:10px 32px; background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border-radius:100px; text-decoration:none; font-weight:600; }

/* ===== Tabs ===== */
.tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:16px; }
.tab { padding:6px 16px; border-radius:8px; font-size:13px; cursor:pointer; color:#666; font-weight:500; transition:all .2s; }
.tab:hover { background:#f0f2f5; }
.tab.on { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; }

/* ===== 订单卡片 ===== */
.card { background:#fff; border-radius:12px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); cursor:pointer; overflow:hidden; transition:box-shadow .2s; }
.card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }

.card-header {
  display:flex; justify-content:space-between; align-items:center;
  background:#f7f8fa; padding:10px 14px; border-bottom:1px solid #eee;
  font-size:12px;
}
.card-header .muted { color:#999; }

.card-body { padding:14px; }
.prod-row { display:flex; align-items:center; margin-bottom:8px; }
.prod-row:last-child { margin-bottom:0; }
.prod-left { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
.prod-img { width:54px; height:54px; border-radius:8px; object-fit:cover; background:#f5f5f5; flex-shrink:0; }
.prod-info { min-width:0; }
.prod-name { font-size:14px; font-weight:500; color:#2c3e50; }
.prod-spec { font-size:12px; color:#999; margin-top:2px; }
.prod-price { font-size:14px; font-weight:600; color:#e74c3c; flex-shrink:0; margin-left:12px; }

.delivery-info { margin-top:8px; font-size:12px; color:#1976d2; background:#e3f2fd; padding:6px 10px; border-radius:6px; }

/* ===== 底部 ===== */
.card-footer {
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 14px; border-top:1px solid #f5f5f5;
}
.footer-summary { font-size:14px; color:#666; }
.price { font-size:18px; font-weight:700; color:#e74c3c; }
.footer-actions { display:flex; gap:8px; }

/* ===== 按钮 ===== */
.btn { padding:7px 18px; border-radius:100px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #e0e0e0; background:#fff; color:#555; transition:opacity .2s; }
.btn:hover { opacity:.85; }
.btn.primary { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border:none; padding:8px 18px; }
.btn.sm { padding:5px 14px; font-size:12px; }

/* ===== 标签 ===== */
.tag { font-size:12px; font-weight:600; padding:3px 12px; border-radius:100px; white-space:nowrap; }
.tag.warn { background:#fff3e0; color:#f57c00; }
.tag.accent { background:#e3f2fd; color:#1976d2; }
.tag.ok { background:#e8f5e9; color:#388e3c; }
.tag.done { background:#f5f5f5; color:#888; }
.tag.cancel { background:#fbe9e7; color:#d84315; }

/* ===== 分页 ===== */
.pager { display:flex; justify-content:center; align-items:center; gap:4px; margin-top:24px; }
.pager span { display:inline-flex; width:36px; height:36px; border-radius:8px; align-items:center; justify-content:center; font-size:14px; color:#666; cursor:pointer; background:#fff; border:1px solid #eee; }
.pager span:hover { border-color:#6b8dd6; color:#6b8dd6; }
.pager span.on { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border-color:transparent; }
.pager span.disabled { opacity:.3; cursor:not-allowed; }

.small { font-size:12px; }
.muted { color:#999; }
</style>
