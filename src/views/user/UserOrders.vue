<template>
  <div class="panel">
    <div class="panel-head">
      <h3>我的订单</h3>
      <div class="status-filters">
        <span v-for="s in orderStatusFilters" :key="s.value"
          :class="['tab', { on: localFilter === s.value }]"
          @click="setFilter(s.value)"
        >{{ s.label }}</span>
      </div>
    </div>

    <div v-if="loadingOrders" class="loading-wrap">⏳ 加载中…</div>
    <div v-else-if="orders.length === 0" class="empty">暂无相关订单</div>

    <template v-else>
      <div v-for="o in orders" :key="o.id" class="card" @click="$router.push('/order/' + o.id)">
        <!-- 订单头部 -->
        <div class="card-header">
          <span class="muted">
            订单号 {{ o.orderNo }} · {{ o.shopName || '店铺#' + o.shopId }} · {{ formatTime(o.createTime) }}
          </span>
          <span :class="['tag', statusTagClass(o.status)]">{{ statusLabel(o.status) }}</span>
        </div>

        <!-- 订单商品 -->
        <div class="card-body">
          <div v-for="item in (o.orderItems || [])" :key="item.id" class="prod-row">
            <div class="prod-img-wrap">
              <img :src="item.productImage || '/logo.png'" class="prod-img" />
            </div>
            <div class="prod-info">
              <div class="prod-name">{{ item.productName }}</div>
              <div class="prod-spec">{{ item.specName || '默认' }} × {{ item.quantity }}</div>
            </div>
            <div class="prod-price">¥{{ (item.price || 0).toFixed(2) }}</div>
          </div>
          <!-- 物流信息 -->
          <div v-if="o.status === 2 && o.deliveryNo" class="delivery-info">
            已发货 · {{ o.deliveryCompany || '快递' }} {{ o.deliveryNo }}
          </div>
        </div>

        <!-- 订单底栏 -->
        <div class="card-footer">
          <span class="small muted">共 {{ totalQty(o) }} 件 实付 <span class="price">¥{{ (o.payAmount || 0).toFixed(2) }}</span></span>
          <div class="footer-actions">
            <template v-if="o.status === 0">
              <button class="btn sm" @click.stop="cancelOrder(o)">取消订单</button>
              <button class="btn sm primary" @click.stop="payOrder(o)">立即支付</button>
            </template>
            <template v-if="o.status === 1">
              <button class="btn sm" @click.stop="cancelOrder(o)">取消订单</button>
            </template>
            <template v-if="o.status === 2">
              <button class="btn sm" @click.stop="$router.push('/order/' + o.id)">查看物流</button>
              <button class="btn sm primary" @click.stop="receiveOrder(o)">确认收货</button>
            </template>
            <template v-if="o.status === 3">
              <button class="btn sm primary" @click.stop="goReview(o)">去评价</button>
            </template>
            <template v-if="o.status === 4">
              <button class="btn sm" @click.stop="deleteOrder(o)">删除订单</button>
              <button class="btn sm" @click.stop="buyAgain(o)">再次购买</button>
            </template>
            <template v-if="o.status === -1">
              <button class="btn sm" @click.stop="deleteOrder(o)">删除订单</button>
            </template>
            <template v-if="o.status === -2 || o.status === -3">
              <button class="btn sm" @click.stop="$router.push('/order/' + o.id)">查看详情</button>
            </template>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="orderPages > 1">
        <span :class="{ disabled: orderPage <= 1 }" @click="loadOrders(orderPage - 1)">‹</span>
        <span v-for="p in pageRange" :key="p" :class="{ on: p === orderPage }" @click="loadOrders(p)">{{ p }}</span>
        <span :class="{ disabled: orderPage >= orderPages }" @click="loadOrders(orderPage + 1)">›</span>
      </div>
    </template>
  </div>
</template>

<script>
import { getMyOrders } from "@/api/modules/user.js";
import { payOrder, cancelOrder, receiveOrder } from "@/api/modules/order.js";

export default {
  name: "UserOrders",
  props: {
    statusFilter: { type: String, default: "" }
  },
  data() {
    return {
      orders: [],
      orderPage: 1,
      orderPages: 1,
      localFilter: "",
      loadingOrders: false,
    };
  },
  computed: {
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
    pageRange() {
      const pages = [];
      const tp = this.orderPages;
      const c = this.orderPage;
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
  watch: {
    statusFilter: {
      handler(val) { this.localFilter = val; this.loadOrders(1); },
      immediate: true,
    },
  },
  methods: {
    setFilter(val) {
      this.localFilter = val;
      this.$emit("update:statusFilter", val);
      this.loadOrders(1);
    },
    async loadOrders(page) {
      if (page) this.orderPage = page;
      this.loadingOrders = true;
      try {
        const params = { current: this.orderPage, size: 6 };
        if (this.localFilter !== "") params.status = Number(this.localFilter);
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

    statusLabel(s) {
      const map = { 0: "待支付", 1: "待发货", 2: "待收货", 3: "待评价", 4: "已完成", "-1": "已取消", "-2": "退款中", "-3": "已退款" };
      return map[String(s)] || "未知";
    },

    statusTagClass(s) {
      const map = { 0: "warn", 1: "accent", 2: "accent", 3: "ok", 4: "done", "-1": "cancel", "-2": "warn", "-3": "done" };
      return map[String(s)] || "done";
    },

    async payOrder(order) {
      this.$confirm("确定支付该订单？", "提示", { confirmButtonText: "余额支付", cancelButtonText: "取消", type: "info" })
        .then(async () => {
          try {
            await payOrder(order.id, 1);
            this.$message.success("支付成功！");
            this.loadOrders(this.orderPage);
          } catch (e) { this.$message.error(e.message || "支付失败"); }
        }).catch(() => {});
    },

    async cancelOrder(order) {
      this.$prompt("请输入取消原因：", "取消订单", { confirmButtonText: "确定", cancelButtonText: "再想想", inputValue: "不想要了" })
        .then(async ({ value }) => {
          try {
            await cancelOrder(order.id, value || "用户取消");
            this.$message.success("订单已取消");
            this.loadOrders(this.orderPage);
          } catch (e) { this.$message.error(e.message || "取消失败"); }
        }).catch(() => {});
    },

    async receiveOrder(order) {
      this.$confirm("确认收到商品了吗？", "确认收货", { confirmButtonText: "确认", cancelButtonText: "再想想", type: "warning" })
        .then(async () => {
          try {
            await receiveOrder(order.id);
            this.$message.success("收货成功，请评价");
            this.loadOrders(this.orderPage);
          } catch (e) { this.$message.error(e.message || "收货失败"); }
        }).catch(() => {});
    },

    goReview(order) {
      const item = (order.orderItems || [])[0];
      if (item) this.$router.push(`/review?orderId=${order.id}&itemId=${item.id}`);
      else this.$router.push(`/order/${order.id}`);
    },

    async deleteOrder(order) {
      this.$confirm("确定删除该订单？删除后不可恢复", "提示", { type: "warning" })
        .then(async () => {
          try {
            const { del } = await import("@/api/axios.js");
            await del(`/orders/${order.id}`);
            this.$message.success("已删除");
            this.loadOrders(this.orderPage);
          } catch (e) { this.$message.error(e.message || "删除失败"); }
        }).catch(() => {});
    },

    buyAgain(order) {
      const items = (order.orderItems || []).map(i => ({
        productId: i.productId, skuId: i.skuId || 0, quantity: i.quantity,
        productName: i.productName, productImage: i.productImage,
        specName: i.specName, price: i.price,
      }));
      localStorage.setItem("CHECKOUT_ITEMS", JSON.stringify(items));
      this.$router.push("/checkout");
    },
  },
};
</script>

<style scoped>
.panel { background:#fff; border-radius:12px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.panel-head { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.panel-head h3 { margin:0; font-size:16px; font-weight:600; color:#2c3e50; }

/* tabs */
.status-filters { display:flex; gap:4px; flex-wrap:wrap; }
.tab { padding:6px 16px; border-radius:8px; font-size:13px; cursor:pointer; color:#666; font-weight:500; transition:all .2s; }
.tab:hover { background:#f0f2f5; }
.tab.on { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; }

.loading-wrap { text-align:center; padding:40px 0; color:#999; }
.empty { text-align:center; padding:40px 0; color:#999; font-size:14px; }

/* ===== 订单卡片 ===== */
.card { border-radius:12px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.04); cursor:pointer; overflow:hidden; transition:box-shadow .2s; }
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
.prod-img-wrap { width:54px; height:54px; border-radius:8px; overflow:hidden; flex-shrink:0; background:#f5f5f5; }
.prod-img { width:100%; height:100%; object-fit:cover; }
.prod-info { flex:1; min-width:0; margin-left:10px; }
.prod-name { font-size:14px; font-weight:500; color:#2c3e50; }
.prod-spec { font-size:12px; color:#999; margin-top:2px; }
.prod-price { font-size:14px; font-weight:600; color:#e74c3c; flex-shrink:0; margin-left:12px; }

.delivery-info { margin-top:8px; font-size:12px; color:#1976d2; background:#e3f2fd; padding:6px 10px; border-radius:6px; }

.card-footer {
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 14px; border-top:1px solid #f5f5f5;
}
.price { font-size:16px; font-weight:700; color:#e74c3c; }
.footer-actions { display:flex; gap:8px; }

/* ===== 按钮 ===== */
.btn { padding:6px 16px; border-radius:100px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #e0e0e0; background:#fff; color:#555; transition:opacity .2s; }
.btn:hover { opacity:.85; }
.btn.primary { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border:none; }
.btn.sm { padding:5px 14px; font-size:12px; }

/* ===== 标签 ===== */
.tag { font-size:12px; font-weight:600; padding:3px 12px; border-radius:100px; white-space:nowrap; }
.tag.warn { background:#fff3e0; color:#f57c00; }
.tag.accent { background:#e3f2fd; color:#1976d2; }
.tag.ok { background:#e8f5e9; color:#388e3c; }
.tag.done { background:#f5f5f5; color:#888; }
.tag.cancel { background:#fbe9e7; color:#d84315; }

/* ===== 分页 ===== */
.pager { display:flex; justify-content:center; align-items:center; gap:4px; margin-top:20px; }
.pager span { display:inline-flex; width:34px; height:34px; border-radius:8px; align-items:center; justify-content:center; font-size:13px; color:#666; cursor:pointer; background:#fff; border:1px solid #eee; }
.pager span:hover { border-color:#6b8dd6; color:#6b8dd6; }
.pager span.on { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border-color:transparent; }
.pager span.disabled { opacity:.3; cursor:not-allowed; }

.small { font-size:12px; }
.muted { color:#999; }
</style>
