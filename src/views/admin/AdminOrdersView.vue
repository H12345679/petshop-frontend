<template>
  <div id="admin-orders-page">
    <div class="page-head">
      <span class="page-title">交易 / 订单管理</span>
    </div>

    <!-- 搜索栏 -->
    <div class="card search-bar">
      <span class="small muted">订单号</span>
      <el-input v-model="filterOrderNo" placeholder="精确单号" size="small" style="width:200px" clearable @keyup.enter="loadOrders" />
      <span class="small muted">门店</span>
      <el-select v-model="filterShopId" placeholder="全部" size="small" style="width:130px" clearable @change="loadOrders">
        <el-option label="全部" :value="null" />
      </el-select>
      <span class="small muted">状态</span>
      <el-select v-model="filterStatus" placeholder="全部" size="small" style="width:120px" clearable @change="loadOrders">
        <el-option label="全部" :value="null" />
        <el-option label="待支付" :value="0" />
        <el-option label="待发货" :value="1" />
        <el-option label="待收货" :value="2" />
        <el-option label="待评价" :value="3" />
        <el-option label="已完成" :value="4" />
        <el-option label="退款/取消" :value="-1" />
      </el-select>
      <el-button size="small" type="primary" @click="loadOrders">查询</el-button>
      <el-button size="small" @click="exportOrders">导出</el-button>
    </div>

    <!-- 状态 Tabs（下划线风格） -->
    <div class="tabs">
      <span v-for="t in statusTabs" :key="t.value"
        :class="['tab', { on: activeStatus === t.value }]"
        @click="activeStatus = t.value; loadOrders()"
      >{{ t.label }}</span>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

    <template v-else>
      <!-- 表格 -->
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl">
          <thead>
            <tr>
              <th>订单号</th>
              <th>买家</th>
              <th>商品</th>
              <th>实付</th>
              <th style="width:90px">状态</th>
              <th style="width:130px">下单时间</th>
              <th style="width:150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="orders.length === 0"><td colspan="7" class="empty-td">暂无订单</td></tr>
            <tr v-for="o in orders" :key="o.id">
              <td class="small">{{ o.orderNo }}</td>
              <td>{{ o.receiverName || '用户#'+o.userId }}</td>
              <td class="small">{{ summaryProduct(o) }}</td>
              <td class="price">¥{{ (o.payAmount || 0).toFixed(2) }}</td>
              <td><span :class="['tag', statusClass(o.status)]">{{ statusLabel(o.status) }}</span></td>
              <td class="small muted">{{ formatTime(o.createTime) }}</td>
              <td class="small actions">
                <span class="action-link" @click="showOrderDetail(o)">详情</span>
                <template v-if="o.status === 1">
                  <span class="muted"> · </span>
                  <b class="action-link" @click="handleShip(o)">发货</b>
                </template>
                <template v-if="o.status === 2 && o.deliveryNo">
                  <span class="muted"> · </span>
                  <span class="action-link">物流</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页（右对齐） -->
      <div class="pager" v-if="totalPages > 1">
        <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
        <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
        <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
        <span class="total-count">共 {{ total }} 单</span>
      </div>
    </template>

    <!-- ===== 发货弹窗（虚线框风格） ===== -->
    <el-dialog title="发货" :visible.sync="showShip" width="460px">
      <div class="ship-dialog">
        <div class="small muted mb12">订单 {{ shipOrderNo }} · 待发货 → 待收货</div>
        <div class="field">
          <label>物流公司</label>
          <el-select v-model="shipForm.company" placeholder="顺丰 / 中通 / 圆通 ..." style="width:100%">
            <el-option label="顺丰" value="顺丰" />
            <el-option label="中通" value="中通" />
            <el-option label="圆通" value="圆通" />
            <el-option label="韵达" value="韵达" />
            <el-option label="极兔" value="极兔" />
            <el-option label="EMS" value="EMS" />
          </el-select>
        </div>
        <div class="field">
          <label>物流单号</label>
          <el-input v-model="shipForm.trackingNo" placeholder="SF1234567890" />
        </div>
      </div>
      <span slot="footer">
        <el-button @click="showShip = false">取消</el-button>
        <el-button type="primary" @click="doShip" :loading="shipLoading">确认发货</el-button>
      </span>
    </el-dialog>

    <!-- ===== 订单详情弹窗 ===== -->
    <el-dialog title="订单详情" :visible.sync="showDetail" width="640px">
      <div v-if="detailOrder" class="detail-body">
        <div class="detail-status-bar" :class="'ds-' + detailOrder.status">
          <span class="ds-icon">{{ statusIcon(detailOrder.status) }}</span>
          <span class="ds-text">{{ statusLabel(detailOrder.status) }}</span>
        </div>
        <div class="di-section">
          <div class="di-label">📦 商品清单</div>
          <div v-for="item in (detailOrder.orderItems || [])" :key="item.id" class="di-item">
            <img :src="item.productImage || '/logo.png'" class="di-img" />
            <div class="di-info">
              <div class="di-name">{{ item.productName }}</div>
              <div v-if="item.specName" class="di-spec">{{ item.specName }}</div>
            </div>
            <div class="di-price">¥{{ (item.price || 0).toFixed(2) }} × {{ item.quantity }}</div>
          </div>
        </div>
        <div class="di-section">
          <div class="di-label">📍 收货信息</div>
          <div class="di-row"><span class="di-key">收货人</span><span class="di-val">{{ detailOrder.receiverName }} {{ detailOrder.receiverPhone }}</span></div>
          <div class="di-row"><span class="di-key">地址</span><span class="di-val">{{ detailOrder.receiverAddress }}</span></div>
        </div>
        <div class="di-section">
          <div class="di-label">💰 金额明细</div>
          <div class="di-row"><span class="di-key">商品总额</span><span class="di-val">¥{{ (detailOrder.totalAmount || 0).toFixed(2) }}</span></div>
          <div class="di-row" v-if="discountAmount > 0"><span class="di-key">优惠减免</span><span class="di-val discount">-¥{{ discountAmount.toFixed(2) }}</span></div>
          <div class="di-row total"><span class="di-key">实付金额</span><span class="di-val pay">¥{{ (detailOrder.payAmount || 0).toFixed(2) }}</span></div>
        </div>
        <div class="di-section">
          <div class="di-label">📋 订单信息</div>
          <div class="di-row"><span class="di-key">订单编号</span><span class="di-val">{{ detailOrder.orderNo }}</span></div>
          <div class="di-row"><span class="di-key">用户ID</span><span class="di-val">{{ detailOrder.userId }}</span></div>
          <div class="di-row"><span class="di-key">创建时间</span><span class="di-val">{{ formatTime(detailOrder.createTime) }}</span></div>
          <div class="di-row" v-if="detailOrder.payTime"><span class="di-key">付款时间</span><span class="di-val">{{ formatTime(detailOrder.payTime) }}</span></div>
          <div class="di-row" v-if="detailOrder.shipTime"><span class="di-key">发货时间</span><span class="di-val">{{ formatTime(detailOrder.shipTime) }}</span></div>
          <div class="di-row" v-if="detailOrder.receiveTime"><span class="di-key">收货时间</span><span class="di-val">{{ formatTime(detailOrder.receiveTime) }}</span></div>
          <div class="di-row" v-if="detailOrder.cancelReason"><span class="di-key">取消原因</span><span class="di-val">{{ detailOrder.cancelReason }}</span></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { manageOrders, shipOrder } from "@/api/modules/order.js";

const STATUS_TABS = [
  { label: "全部", value: null },
  { label: "待支付", value: 0 },
  { label: "待发货", value: 1 },
  { label: "待收货", value: 2 },
  { label: "待评价", value: 3 },
  { label: "已完成", value: 4 },
  { label: "退款/取消", value: -1 },
];

export default {
  name: "AdminOrdersView",
  data() {
    return {
      orders: [],
      current: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      filterOrderNo: "",
      filterShopId: null,
      filterStatus: null,
      activeStatus: null,
      showDetail: false,
      detailOrder: null,
      showShip: false,
      shipTarget: null,
      shipOrderNo: "",
      shipForm: { company: "", trackingNo: "" },
      shipLoading: false,
    };
  },
  computed: {
    statusTabs() { return STATUS_TABS; },
    discountAmount() {
      if (!this.detailOrder) return 0;
      return Math.max(0, (this.detailOrder.totalAmount || 0) - (this.detailOrder.payAmount || 0));
    },
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
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
  created() { this.loadOrders(); },
  methods: {
    async loadOrders() {
      this.loading = true;
      this.current = 1;
      try {
        const params = { current: 1, size: this.pageSize };
        if (this.activeStatus !== null) params.status = this.activeStatus;
        if (this.filterOrderNo) params.orderNo = this.filterOrderNo;
        const res = await manageOrders(params);
        this.orders = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) {
        this.$message.error("加载订单失败");
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
        if (this.filterOrderNo) params.orderNo = this.filterOrderNo;
        const res = await manageOrders(params);
        this.orders = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) {
        this.$message.error("加载失败");
      } finally {
        this.loading = false;
      }
    },
    summaryProduct(order) {
      const items = order.orderItems || [];
      if (!items.length) return '—';
      const first = items[0].productName || '商品';
      return items.length > 1 ? `${first} 等${items.length}件` : first;
    },
    formatTime(t) {
      if (!t) return "";
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    },
    statusLabel(s) {
      const map = { 0:"待支付",1:"待发货",2:"待收货",3:"待评价",4:"已完成","-1":"已取消","-2":"退款中","-3":"已退款" };
      return map[String(s)] || "未知";
    },
    statusClass(s) {
      const map = { 0:"warn",1:"accent",2:"receive",3:"review",4:"done","-1":"cancel","-2":"warn","-3":"done" };
      return map[String(s)] || "done";
    },
    statusIcon(s) {
      const map = { 0:"⏳",1:"📦",2:"🚚",3:"⭐",4:"✅","-1":"❌","-2":"🔁","-3":"✅" };
      return map[String(s)] || "📄";
    },
    showOrderDetail(order) { this.detailOrder = order; this.showDetail = true; },
    handleShip(order) {
      this.shipTarget = order;
      this.shipOrderNo = order.orderNo;
      this.shipForm = { company: "", trackingNo: "" };
      this.showShip = true;
    },
    async doShip() {
      if (!this.shipTarget) return;
      this.shipLoading = true;
      try {
        await shipOrder(this.shipTarget.id);
        this.$message.success("已标记为发货");
        this.showShip = false;
        this.loadOrders();
      } catch (e) {
        this.$message.error(e.message || "发货失败");
      } finally {
        this.shipLoading = false;
      }
    },
    exportOrders() { this.$message.info("导出功能开发中"); },
  },
};
</script>

<style scoped>
/* ===== 线框风格 ===== */
.page-head { margin-bottom:16px; }
.page-title { font-size:17px; font-weight:600; color:#2c3e50; }

/* 搜索栏 — card 风格 */
.search-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.search-bar .small { font-size:12px; color:#888; white-space:nowrap; }

.card { background:#fff; border:1px solid #cfd4da; border-radius:8px; padding:16px; margin-bottom:16px; }

.loading-wrap { text-align:center; padding:60px; color:#888; font-size:14px; }

/* ===== Tabs（下划线风格，非 pill） ===== */
.tabs { display:flex; gap:0; border-bottom:1px solid #cfd4da; margin-bottom:14px; flex-wrap:wrap; }
.tab { padding:8px 16px; font-size:13px; color:#666; border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap; transition:color .15s; }
.tab:hover { color:#5b8def; }
.tab.on { color:#5b8def; border-bottom-color:#5b8def; font-weight:600; }

/* ===== 表格 ===== */
.tbl { width:100%; border-collapse:collapse; font-size:13px; }
.tbl th { background:#f7f8fa; text-align:left; padding:10px; border-bottom:1px solid #cfd4da; color:#555; font-weight:600; white-space:nowrap; }
.tbl td { padding:10px; border-bottom:1px solid #eef0f3; color:#555; vertical-align:middle; }
.tbl tr:hover td { background:#fafbfc; }
.tbl tr:last-child td { border-bottom:none; }
.tbl .small { font-size:12px; }
.empty-td { text-align:center; padding:40px !important; color:#888; }

.price { color:#d9534f; font-weight:700; }
.muted { color:#888; }

/* Tags */
.tag { display:inline-block; background:#e9ecf1; border:1px solid #cfd4da; border-radius:4px; padding:1px 8px; font-size:12px; color:#555; }
.tag.warn { background:#fcefe2; border-color:#f0cda6; color:#e6914e; }
.tag.accent { background:#e7eefc; border-color:#bcd0f6; color:#5b8def; }
.tag.receive { background:#e6f4ec; border-color:#b6dcc6; color:#4caf7d; }
.tag.review { background:#f3e5f5; border-color:#ce93d8; color:#7b1fa2; }
.tag.done { background:#f0f0f0; border-color:#d0d0d0; color:#888; }
.tag.cancel { background:#fbe7e6; border-color:#f0c2c0; color:#d9534f; }

/* Actions */
.actions .action-link { color:#5b8def; cursor:pointer; }
.actions .action-link:hover { opacity:.8; }

/* ===== 分页（右对齐） ===== */
.pager { display:flex; gap:6px; justify-content:flex-end; margin-top:14px; align-items:center; }
.pager span { min-width:30px; height:30px; border:1px solid #cfd4da; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; color:#555; background:#fff; padding:0 8px; cursor:pointer; }
.pager span:hover { border-color:#5b8def; color:#5b8def; }
.pager span.on { background:#5b8def; border-color:#5b8def; color:#fff; }
.pager span.disabled { opacity:.3; cursor:not-allowed; }
.total-count { border:none !important; color:#888; font-size:12px; cursor:default !important; min-width:auto !important; }

/* ===== 发货弹窗 ===== */
.ship-dialog { padding:8px 0; }
.ship-dialog .field { margin-bottom:14px; }
.ship-dialog .field label { display:block; font-size:13px; color:#555; margin-bottom:5px; }

.mb12 { margin-bottom:12px; }
.small { font-size:12px; }
.muted { color:#888; }

/* ===== 详情弹窗 ===== */
.detail-body { max-height:70vh; overflow-y:auto; }
.detail-status-bar { display:flex; align-items:center; gap:10px; padding:14px 18px; border-radius:8px; margin-bottom:16px; font-size:16px; font-weight:600; }
.ds-0 { background:#fff8e1; color:#f57c00; }
.ds-1 { background:#e3f2fd; color:#1976d2; }
.ds-2 { background:#e8f5e9; color:#388e3c; }
.ds-3 { background:#f3e5f5; color:#7b1fa2; }
.ds-4 { background:#f5f5f5; color:#888; }
.ds--1 { background:#fbe9e7; color:#d84315; }
.ds--2 { background:#fff3e0; color:#e65100; }
.ds--3, .ds--4 { background:#e8f5e9; color:#2e7d32; }
.ds-icon { font-size:22px; }
.di-section { margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #f0f0f0; }
.di-section:last-child { border-bottom:none; }
.di-label { font-size:14px; font-weight:600; color:#2c3e50; margin-bottom:8px; }
.di-item { display:flex; align-items:center; gap:10px; padding:6px 0; }
.di-img { width:36px; height:36px; object-fit:cover; border-radius:6px; background:#f5f5f5; }
.di-info { flex:1; min-width:0; }
.di-name { font-size:13px; font-weight:500; }
.di-spec { font-size:11px; color:#999; }
.di-price { font-size:13px; color:#666; white-space:nowrap; }
.di-row { display:flex; padding:4px 0; font-size:13px; }
.di-key { width:80px; color:#999; flex-shrink:0; }
.di-val { color:#555; }
.di-row.total { border-top:1px solid #eee; padding-top:8px; margin-top:4px; }
.di-val.discount { color:#27ae60; }
.di-val.pay { font-size:16px; font-weight:700; color:#e74c3c; }
</style>
