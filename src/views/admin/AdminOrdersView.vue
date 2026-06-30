<template>
  <div id="admin-orders-page">
    <!-- ====== 搜索筛选栏 ====== -->
    <div class="card row center wrap gap8" style="padding:12px 16px">
      <span class="small muted">订单号</span>
      <el-input v-model="filterOrderNo" placeholder="精确单号" size="small" style="width:200px" clearable @keyup.enter.native="search" />
      <span class="small muted">门店</span>
      <el-select v-model="filterShopId" placeholder="全部" size="small" style="width:130px" clearable>
        <el-option v-for="s in shopList" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <span class="small muted">状态</span>
      <el-select v-model="filterStatus" placeholder="全部" size="small" style="width:120px" clearable>
        <el-option label="待支付" :value="0" />
        <el-option label="待发货" :value="1" />
        <el-option label="待收货" :value="2" />
        <el-option label="待评价" :value="3" />
        <el-option label="已完成" :value="4" />
        <el-option label="已取消" :value="-1" />
        <el-option label="退款中" :value="-2" />
        <el-option label="已退款" :value="-3" />
      </el-select>
      <el-button type="primary" size="small" @click="search">查询</el-button>
      <el-button size="small" @click="handleExport">导出</el-button>
    </div>

    <!-- ====== Tabs（下划线风格 + 计数） ====== -->
    <div class="tabs">
      <span
        v-for="t in tabs" :key="t.value"
        :class="['tab', { on: activeTab === t.value }]"
        @click="switchTab(t.value)"
      >
        {{ t.label }}
        <b v-if="t.count !== null" :style="{ color: t.countColor || '#d9534f' }">{{ t.count }}</b>
      </span>
    </div>

    <!-- ====== 订单表格 ====== -->
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
        <thead>
          <tr>
            <th>订单号</th>
            <th>买家</th>
            <th>商品</th>
            <th>实付</th>
            <th style="width:90px">状态</th>
            <th style="width:150px">下单时间</th>
            <th style="width:160px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="empty-td">⏳ 加载中…</td></tr>
          <tr v-else-if="orders.length === 0"><td colspan="7" class="empty-td">暂无订单</td></tr>
          <tr v-for="order in orders" :key="order.id">
            <td class="small">{{ order.orderNo }}</td>
            <td>{{ order.receiverName || '用户#'+order.userId }}</td>
            <td class="small">{{ productSummary(order) }}</td>
            <td class="price">¥{{ (order.payAmount || 0).toFixed(2) }}</td>
            <td><span :class="['tag', statusTagClass(order.status)]">{{ order.statusName }}</span></td>
            <td class="small muted">{{ fmtTime(order.createTime) }}</td>
            <td class="small">
              <span class="action-link" @click="showDetail(order)">详情</span>
              <template v-if="order.status === 1">
                <span class="muted"> · </span>
                <b class="action-link accent" @click="openShipDialog(order)">发货</b>
              </template>
              <template v-if="order.status >= 2 && order.status <= 3">
                <span class="muted"> · </span>
                <span class="action-link" @click="showLogistics(order)">物流</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ====== 分页 ====== -->
    <div class="pager" v-if="totalPages > 1">
      <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
      <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
      <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      <span class="total-hint">共 {{ total }} 单</span>
    </div>

    <!-- ====== 发货弹窗 ====== -->
    <el-dialog title="发货" :visible.sync="showShipDialog" width="480px">
      <div class="small muted mb12">订单 {{ shipTarget ? shipTarget.orderNo : '' }} · 待发货 → 待收货</div>
      <div class="field">
        <label>物流公司</label>
        <el-select v-model="shipForm.courierCompany" placeholder="顺丰 / 中通 / 圆通 ..." style="width:100%">
          <el-option label="顺丰速运" value="顺丰速运" />
          <el-option label="中通快递" value="中通快递" />
          <el-option label="圆通速递" value="圆通速递" />
          <el-option label="韵达快递" value="韵达快递" />
          <el-option label="申通快递" value="申通快递" />
          <el-option label="京东物流" value="京东物流" />
          <el-option label="其他" value="其他" />
        </el-select>
      </div>
      <div class="field">
        <label>物流单号</label>
        <el-input v-model="shipForm.trackingNumber" placeholder="SF1234567890" />
      </div>
      <span slot="footer">
        <el-button @click="showShipDialog = false">取消</el-button>
        <el-button type="primary" :loading="shipLoading" @click="confirmShip">确认发货</el-button>
      </span>
    </el-dialog>

    <!-- ====== 订单详情弹窗 ====== -->
    <el-dialog title="订单详情" :visible.sync="showDetailDialog" width="640px">
      <div v-if="detailOrder" class="detail-body">
        <!-- 状态横幅 -->
        <div class="detail-status-bar" :class="'ds-' + detailOrder.status">
          <span class="ds-icon">{{ statusIcon(detailOrder.status) }}</span>
          <span class="ds-text">{{ detailOrder.statusName }}</span>
        </div>

        <!-- 商品清单 -->
        <div class="di-section">
          <div class="di-label">📦 商品清单</div>
          <div v-for="item in (detailOrder.orderItems || [])" :key="item.id" class="di-item">
            <img :src="item.productImage || '/logo.png'" class="di-img" />
            <div class="di-info">
              <div class="di-name">{{ item.productName }}</div>
              <div v-if="item.specName" class="di-spec">{{ item.specName }}</div>
            </div>
            <div class="di-price">¥{{ Number(item.price || 0).toFixed(2) }} × {{ item.quantity }}</div>
          </div>
        </div>

        <!-- 收货信息 -->
        <div class="di-section">
          <div class="di-label">📍 收货信息</div>
          <div class="di-row"><span class="di-key">收货人</span><span class="di-val">{{ detailOrder.receiverName }} {{ detailOrder.receiverPhone }}</span></div>
          <div class="di-row"><span class="di-key">地址</span><span class="di-val">{{ detailOrder.receiverAddress }}</span></div>
          <div class="di-row" v-if="detailOrder.courierCompany"><span class="di-key">物流公司</span><span class="di-val">{{ detailOrder.courierCompany }}</span></div>
          <div class="di-row" v-if="detailOrder.trackingNumber"><span class="di-key">物流单号</span><span class="di-val">{{ detailOrder.trackingNumber }}</span></div>
        </div>

        <!-- 金额明细 -->
        <div class="di-section">
          <div class="di-label">💰 金额明细</div>
          <div class="di-row"><span class="di-key">商品总额</span><span class="di-val">¥{{ Number(detailOrder.totalAmount || 0).toFixed(2) }}</span></div>
          <div class="di-row" v-if="detailOrder.discountAmount > 0"><span class="di-key">优惠减免</span><span class="di-val discount">-¥{{ Number(detailOrder.discountAmount || 0).toFixed(2) }}</span></div>
          <div class="di-row total"><span class="di-key">实付金额</span><span class="di-val pay">¥{{ Number(detailOrder.payAmount || 0).toFixed(2) }}</span></div>
        </div>

        <!-- 订单信息 -->
        <div class="di-section">
          <div class="di-label">📋 订单信息</div>
          <div class="di-row"><span class="di-key">订单编号</span><span class="di-val">{{ detailOrder.orderNo }}</span></div>
          <div class="di-row"><span class="di-key">用户ID</span><span class="di-val">{{ detailOrder.userId }}</span></div>
          <div class="di-row"><span class="di-key">创建时间</span><span class="di-val">{{ detailOrder.createTime }}</span></div>
          <div class="di-row" v-if="detailOrder.payTime"><span class="di-key">付款时间</span><span class="di-val">{{ detailOrder.payTime }}</span></div>
          <div class="di-row" v-if="detailOrder.shipTime"><span class="di-key">发货时间</span><span class="di-val">{{ detailOrder.shipTime }}</span></div>
          <div class="di-row" v-if="detailOrder.receiveTime"><span class="di-key">收货时间</span><span class="di-val">{{ detailOrder.receiveTime }}</span></div>
          <div class="di-row" v-if="detailOrder.cancelReason"><span class="di-key">取消原因</span><span class="di-val">{{ detailOrder.cancelReason }}</span></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { manageOrders, shipOrder } from "@/api/modules/order.js";
import { get } from "@/api/axios.js";

export default {
  name: "AdminOrdersView",
  data() {
    return {
      // Filters
      filterOrderNo: "",
      filterShopId: null,
      filterStatus: null,
      shopList: [],
      // Tabs
      activeTab: null,
      tabs: [
        { label: "全部", value: null, count: null, countColor: null },
        { label: "待支付", value: 0, count: null, countColor: null },
        { label: "待发货", value: 1, count: null, countColor: "#d9534f" },
        { label: "待收货", value: 2, count: null, countColor: null },
        { label: "待评价", value: 3, count: null, countColor: null },
        { label: "已完成", value: 4, count: null, countColor: null },
        { label: "退款/取消", value: "refund", count: null, countColor: null },
      ],
      // Orders
      orders: [],
      loading: true,
      current: 1,
      pageSize: 10,
      total: 0,
      // Ship dialog
      showShipDialog: false,
      shipTarget: null,
      shipForm: { courierCompany: "", trackingNumber: "" },
      shipLoading: false,
      // Detail dialog
      showDetailDialog: false,
      detailOrder: null,
    };
  },
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
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
    this.loadOrders();
    this.loadShops();
  },
  methods: {
    async loadShops() {
      try {
        const res = await get("/shops");
        this.shopList = res.data?.records || res.data || [];
      } catch (e) { /* ignore */ }
    },

    async loadOrders() {
      this.loading = true;
      try {
        const params = { current: this.current, size: this.pageSize };
        if (this.filterOrderNo) params.orderNo = this.filterOrderNo;
        if (this.filterShopId) params.shopId = this.filterShopId;
        // 对于 "退款/取消" tab，可能的后端状态是多个负值，这里统一不传 status 由前端二次过滤
        if (this.activeTab === "refund") {
          // 不传status，从全部中筛选
        } else if (this.activeTab !== null && this.activeTab !== "") {
          params.status = this.activeTab;
        } else if (this.filterStatus !== null && this.filterStatus !== "") {
          params.status = this.filterStatus;
        }
        const res = await manageOrders(params);
        let records = res.data?.records || [];
        this.total = res.data?.total || 0;
        // 退款/取消：前端过滤负状态
        if (this.activeTab === "refund") {
          records = records.filter(o => o.status < 0);
        }
        this.orders = records;
      } catch (e) {
        this.$message.error("加载订单失败");
        this.orders = [];
      } finally {
        this.loading = false;
      }
    },

    search() {
      this.current = 1;
      this.activeTab = null;
      this.loadOrders();
    },

    switchTab(value) {
      this.activeTab = value;
      this.current = 1;
      this.filterOrderNo = "";
      this.filterStatus = null;
      this.loadOrders();
    },

    goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loadOrders();
    },

    productSummary(order) {
      const items = order.orderItems || [];
      if (items.length === 0) return "—";
      const first = items[0].productName || "商品";
      return items.length === 1 ? first : first + " 等" + items.length + "件";
    },

    fmtTime(t) {
      if (!t) return "";
      // 后端返回格式可能是 "2026-06-23T12:00:00" 或 "2026-06-23 12:00:00"
      const s = String(t);
      if (s.length >= 16) {
        // MM-DD HH:mm
        const parts = s.split(/[T ]/);
        if (parts.length >= 2) {
          const d = parts[0];
          const time = parts[1].substring(0, 5);
          const md = d.length >= 10 ? d.substring(5, 10) : d;
          return md + " " + time;
        }
      }
      return s.substring(0, 16);
    },

    statusTagClass(status) {
      const map = {
        0: "warn",       // 待支付 → 橙色
        1: "accent",     // 待发货 → 蓝色
        2: "accent",     // 待收货 → 蓝色(物流)
        3: "accent",     // 待评价
        4: "",           // 已完成 → 灰色
        "-1": "danger",  // 已取消
        "-2": "warn",    // 退款中
        "-3": "ok",      // 已退款
        "-4": "ok",      // 管理员退款
      };
      return map[String(status)] || "";
    },

    statusIcon(status) {
      const map = {
        0: "⏳", 1: "📦", 2: "🚚", 3: "⭐", 4: "✅",
        "-1": "❌", "-2": "🔁", "-3": "✅", "-4": "✅",
      };
      return map[String(status)] || "📋";
    },

    showDetail(order) {
      this.detailOrder = order;
      this.showDetailDialog = true;
    },

    openShipDialog(order) {
      this.shipTarget = order;
      this.shipForm = { courierCompany: "", trackingNumber: "" };
      this.showShipDialog = true;
    },

    async confirmShip() {
      if (!this.shipTarget) return;
      this.shipLoading = true;
      try {
        await shipOrder(
          this.shipTarget.id,
          this.shipForm.courierCompany || null,
          this.shipForm.trackingNumber || null
        );
        this.$message.success("发货成功");
        this.showShipDialog = false;
        this.loadOrders();
      } catch (e) {
        this.$message.error(e.message || "发货失败");
      } finally {
        this.shipLoading = false;
      }
    },

    showLogistics(order) {
      const info = [];
      if (order.courierCompany) info.push("物流公司：" + order.courierCompany);
      if (order.trackingNumber) info.push("单号：" + order.trackingNumber);
      if (info.length === 0) info.push("暂无物流信息");
      this.$alert(info.join("\n"), "物流信息", { confirmButtonText: "知道了" });
    },

    handleExport() {
      this.$message.info("导出功能开发中…");
    },
  },
};
</script>

<style scoped>
/* ====== 搜索筛选 ====== */
.row { display: flex; gap: 14px; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }

/* ====== 卡片 ====== */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; margin-bottom: 16px; }

/* ====== Tabs（下划线风格，对齐 wireframe.css） ====== */
.tabs { display: flex; gap: 0; border-bottom: 1px solid #cfd4da; margin-bottom: 14px; flex-wrap: wrap; }
.tab {
  padding: 8px 16px; font-size: 13px; color: #666; border-bottom: 2px solid transparent;
  cursor: pointer; white-space: nowrap; transition: color .15s;
}
.tab:hover { color: #5b8def; }
.tab.on { color: #5b8def; border-bottom-color: #5b8def; font-weight: 600; }
.tab b { margin-left: 4px; font-weight: 700; }

/* ====== 表格（对齐 wireframe.css .tbl） ====== */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; }
.tbl th {
  background: #f7f8fa; text-align: left; padding: 10px; border-bottom: 1px solid #cfd4da;
  color: #555; font-weight: 600; white-space: nowrap;
}
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:hover td { background: #fafbfc; }
.tbl tr:last-child td { border-bottom: none; }
.empty-td { text-align: center; padding: 40px !important; color: #888; }

.price { color: #d9534f; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #888; }

/* ====== 状态标签（对齐 wireframe.css .tag） ====== */
.tag {
  display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px;
  padding: 1px 8px; font-size: 12px; color: #555;
}
.tag.accent { background: #e7eefc; border-color: #bcd0f6; color: #5b8def; }
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #e6914e; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }
.tag.danger { background: #fbe7e6; border-color: #f0c2c0; color: #d9534f; }

/* ====== 操作链接 ====== */
.action-link { cursor: pointer; color: #5b8def; }
.action-link:hover { opacity: .8; }
.action-link.accent { color: #5b8def; }

/* ====== 分页（对齐 wireframe.css .pager） ====== */
.pager { display: flex; gap: 6px; justify-content: flex-end; margin-top: 14px; align-items: center; }
.pager span {
  min-width: 30px; height: 30px; border: 1px solid #cfd4da; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  color: #555; background: #fff; padding: 0 8px; cursor: pointer;
}
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; border-color: #5b8def; color: #fff; }
.pager span.disabled { opacity: .3; cursor: not-allowed; }
.total-hint { border: none !important; background: transparent !important; color: #888; font-size: 12px; cursor: default !important; }

/* ====== 表单 ====== */
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 5px; }
.mb12 { margin-bottom: 12px; }

/* ====== 订单详情弹窗（复用原样式） ====== */
.detail-body { max-height: 70vh; overflow-y: auto; }
.detail-status-bar {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 10px;
  margin-bottom: 16px; font-size: 16px; font-weight: 600;
}
.ds-0 { background: #fff8e1; color: #f57c00; }
.ds-1 { background: #e3f2fd; color: #1976d2; }
.ds-2 { background: #e8f5e9; color: #388e3c; }
.ds-3 { background: #f3e5f5; color: #7b1fa2; }
.ds-4 { background: #f5f5f5; color: #888; }
.ds--1 { background: #fbe9e7; color: #d84315; }
.ds--2 { background: #fff3e0; color: #e65100; }
.ds--3, .ds--4 { background: #e8f5e9; color: #2e7d32; }
.ds-icon { font-size: 22px; }
.di-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.di-section:last-child { border-bottom: none; }
.di-label { font-size: 14px; font-weight: 600; color: #2c3e50; margin-bottom: 8px; }
.di-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.di-img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; background: #f5f5f5; }
.di-info { flex: 1; min-width: 0; }
.di-name { font-size: 13px; font-weight: 500; }
.di-spec { font-size: 11px; color: #999; }
.di-price { font-size: 13px; color: #666; white-space: nowrap; }
.di-row { display: flex; padding: 4px 0; font-size: 13px; }
.di-key { width: 80px; color: #999; flex-shrink: 0; }
.di-val { color: #555; }
.di-row.total { border-top: 1px solid #eee; padding-top: 8px; margin-top: 4px; }
.di-val.discount { color: #27ae60; }
.di-val.pay { font-size: 16px; font-weight: 700; color: #e74c3c; }
</style>
