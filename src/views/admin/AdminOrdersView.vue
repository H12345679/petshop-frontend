<template>
  <div id="admin-orders-page">
    <h2 class="page-title">📋 订单管理</h2>

    <!-- Tab 切换 -->
    <div class="tabs">
      <span :class="['tab', { active: activeTab === 'orders' }]" @click="activeTab = 'orders'; loadOrders()">订单列表</span>
      <span :class="['tab', { active: activeTab === 'refunds' }]" @click="activeTab = 'refunds'; loadRefunds()">退款审核</span>
    </div>

    <!-- ===================== 订单列表 ===================== -->
    <div v-if="activeTab === 'orders'">
      <div class="filters">
        <el-select v-model="filterStatus" placeholder="订单状态" clearable @change="loadOrders" size="small" style="width:140px">
          <el-option label="待支付" :value="0" />
          <el-option label="待发货" :value="1" />
          <el-option label="待收货" :value="2" />
          <el-option label="待评价" :value="3" />
          <el-option label="已完成" :value="4" />
          <el-option label="已取消" :value="-1" />
          <el-option label="退款中" :value="-2" />
          <el-option label="已退款" :value="-3" />
        </el-select>
        <el-input v-model="filterOrderNo" placeholder="订单号" size="small" style="width:200px" clearable @keyup.enter="loadOrders" />
        <el-button size="small" @click="loadOrders">搜索</el-button>
      </div>

      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <div v-if="!loading" class="order-list">
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-header">
            <span class="order-no">{{ order.orderNo }}</span>
            <span :class="['status-tag', statusClass(order.status)]">{{ order.statusName }}</span>
          </div>
          <div class="order-body">
            <div class="order-items">
              <div v-for="item in (order.orderItems || [])" :key="item.id" class="order-item">
                <img :src="item.productImage || '/logo.png'" class="oi-img" />
                <div class="oi-info">
                  <div class="oi-name">{{ item.productName }}</div>
                  <div v-if="item.specName" class="oi-spec">{{ item.specName }}</div>
                </div>
                <div class="oi-price">¥{{ Number(item.price || 0).toFixed(2) }} × {{ item.quantity }}</div>
              </div>
            </div>
            <div class="order-user">
              用户ID: {{ order.userId }} | 收货人: {{ order.receiverName }} | {{ order.receiverPhone }}
            </div>
            <div class="order-amount">
              实付：<span class="pay-amount">¥{{ Number(order.payAmount || 0).toFixed(2) }}</span>
            </div>
          </div>
          <div class="order-footer">
            <div class="order-time">{{ order.createTime }}</div>
            <div class="order-actions">
              <el-button v-if="order.status === 1" type="primary" size="mini" @click="handleShip(order)">发货</el-button>
              <el-button size="mini" @click="showOrderDetail(order)">详情</el-button>
            </div>
          </div>
        </div>
        <div v-if="orders.length === 0" class="empty-state">暂无订单</div>
      </div>

      <div v-if="hasMore" class="load-more">
        <el-button @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <!-- ===================== 退款审核 ===================== -->
    <div v-if="activeTab === 'refunds'">
      <div v-if="refundLoading" class="loading-wrap">⏳ 加载中…</div>
      <div v-if="!refundLoading" class="refund-list">
        <div v-for="rf in refunds" :key="rf.id" class="refund-card">
          <div class="refund-header">
            <span class="refund-no">{{ rf.refundNo }}</span>
            <span :class="['refund-status', refundStatusClass(rf.status)]">{{ refundStatusLabel(rf.status) }}</span>
          </div>
          <div class="refund-body">
            <div class="refund-info">订单号：{{ rf.orderId }}</div>
            <div class="refund-info">退款金额：<span class="pay-amount">¥{{ Number(rf.amount || 0).toFixed(2) }}</span></div>
            <div class="refund-info">退款原因：{{ rf.reason }}</div>
            <div v-if="rf.auditRemark" class="refund-info">审核备注：{{ rf.auditRemark }}</div>
          </div>
          <div v-if="rf.status === 0" class="refund-actions">
            <el-button type="primary" size="mini" @click="auditRefund(rf, 1)">通过退款</el-button>
            <el-button type="danger" size="mini" @click="auditRefund(rf, 2)">拒绝</el-button>
          </div>
        </div>
        <div v-if="refunds.length === 0" class="empty-state">暂无退款申请</div>
      </div>
    </div>

    <!-- ===================== 订单详情弹窗 ===================== -->
    <el-dialog title="订单详情" :visible.sync="showDetail" width="640px">
      <div v-if="detailOrder" class="detail-body">
        <div class="detail-status-bar" :class="'ds-' + detailOrder.status">
          <span class="ds-icon">{{ detailOrder.status === 0 ? '⏳' : detailOrder.status === 1 ? '📦' : detailOrder.status === 2 ? '🚚' : detailOrder.status === 3 ? '⭐' : detailOrder.status === 4 ? '✅' : detailOrder.status === -1 ? '❌' : detailOrder.status === -2 ? '🔁' : '✅' }}</span>
          <span class="ds-text">{{ detailOrder.statusName }}</span>
        </div>

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

        <div class="di-section">
          <div class="di-label">📍 收货信息</div>
          <div class="di-row"><span class="di-key">收货人</span><span class="di-val">{{ detailOrder.receiverName }} {{ detailOrder.receiverPhone }}</span></div>
          <div class="di-row"><span class="di-key">地址</span><span class="di-val">{{ detailOrder.receiverAddress }}</span></div>
        </div>

        <div class="di-section">
          <div class="di-label">💰 金额明细</div>
          <div class="di-row"><span class="di-key">商品总额</span><span class="di-val">¥{{ Number(detailOrder.totalAmount || 0).toFixed(2) }}</span></div>
          <div class="di-row" v-if="detailOrder.discountAmount > 0"><span class="di-key">优惠减免</span><span class="di-val discount">-¥{{ Number(detailOrder.discountAmount || 0).toFixed(2) }}</span></div>
          <div class="di-row total"><span class="di-key">实付金额</span><span class="di-val pay">¥{{ Number(detailOrder.payAmount || 0).toFixed(2) }}</span></div>
        </div>

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
import { manageOrders, shipOrder, manageRefunds, auditRefund } from "@/api/modules/order.js";

export default {
  name: "AdminOrdersView",
  data() {
    return {
      activeTab: "orders",
      // Orders
      orders: [],
      current: 1,
      total: 0,
      pageSize: 10,
      loading: false,
      filterStatus: null,
      filterOrderNo: "",
      // Refunds
      refunds: [],
      refundLoading: false,
      // Detail dialog
      showDetail: false,
      detailOrder: null,
    };
  },
  computed: {
    hasMore() {
      return this.orders.length < this.total;
    },
  },
  created() {
    this.loadOrders();
  },
  methods: {
    async loadOrders() {
      this.loading = true;
      this.current = 1;
      try {
        const params = { current: 1, size: this.pageSize };
        if (this.filterStatus !== null && this.filterStatus !== "") params.status = this.filterStatus;
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

    async loadMore() {
      this.current++;
      try {
        const params = { current: this.current, size: this.pageSize };
        if (this.filterStatus !== null && this.filterStatus !== "") params.status = this.filterStatus;
        if (this.filterOrderNo) params.orderNo = this.filterOrderNo;
        const res = await manageOrders(params);
        this.orders = this.orders.concat(res.data?.records || []);
      } catch (e) {
        this.$message.error("加载更多失败");
        this.current--;
      }
    },

    showOrderDetail(order) {
      this.detailOrder = order;
      this.showDetail = true;
    },

    async handleShip(order) {
      this.$confirm(`确认发货（订单：${order.orderNo}）？`, "发货确认", {
        type: "warning",
      }).then(async () => {
        try {
          await shipOrder(order.id);
          this.$message.success("已标记为发货");
          this.loadOrders();
        } catch (e) {
          this.$message.error(e.message || "发货失败");
        }
      }).catch(() => {});
    },

    async loadRefunds() {
      this.refundLoading = true;
      try {
        const res = await manageRefunds({ current: 1, size: 50 });
        this.refunds = res.data?.records || [];
      } catch (e) {
        this.$message.error("加载退款列表失败");
      } finally {
        this.refundLoading = false;
      }
    },

    async auditRefund(rf, status) {
      const label = status === 1 ? "通过退款" : "拒绝退款";
      this.$prompt("请输入审核备注：", label, {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }).then(async ({ value }) => {
        try {
          await auditRefund(rf.id, { status, auditRemark: value || "" });
          this.$message.success(status === 1 ? "退款已通过" : "已拒绝退款");
          this.loadRefunds();
        } catch (e) {
          this.$message.error(e.message || "操作失败");
        }
      }).catch(() => {});
    },

    statusClass(status) {
      const map = {
        0: "tag-pending", 1: "tag-ship", 2: "tag-receive",
        3: "tag-review", 4: "tag-done",
        "-1": "tag-cancel", "-2": "tag-refund", "-3": "tag-refunded",
      };
      return map[status] || "";
    },

    refundStatusClass(status) {
      const map = { 0: "rs-pending", 1: "rs-approved", 2: "rs-rejected" };
      return map[status] || "";
    },

    refundStatusLabel(status) {
      const map = { 0: "待审核", 1: "已退款", 2: "已拒绝" };
      return map[status] || "未知";
    },
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; background: #fff; border-radius: 8px; padding: 6px; margin-bottom: 16px; }
.tab { padding: 6px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; color: #666; transition: all 0.2s; font-weight: 500; }
.tab:hover { background: #f0f2f5; }
.tab.active { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }
.filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.loading-wrap { text-align: center; padding: 60px; color: #999; font-size: 15px; }
.empty-state { text-align: center; padding: 60px; color: #999; }

/* 订单卡片 */
.order-card { background: #fff; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.order-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f5f5f5; }
.order-no { font-size: 13px; color: #999; }
.status-tag { font-size: 12px; padding: 2px 10px; border-radius: 100px; font-weight: 600; }
.tag-pending { background: #fff3e0; color: #f57c00; }
.tag-ship { background: #e3f2fd; color: #1976d2; }
.tag-receive { background: #e8f5e9; color: #388e3c; }
.tag-review { background: #f3e5f5; color: #7b1fa2; }
.tag-done { background: #f5f5f5; color: #888; }
.tag-cancel { background: #fbe9e7; color: #d84315; }
.tag-refund { background: #fff3e0; color: #e65100; }
.tag-refunded { background: #e8f5e9; color: #2e7d32; }
.order-body { padding: 12px 16px; }
.order-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.oi-img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; background: #f5f5f5; }
.oi-info { flex: 1; min-width: 0; }
.oi-name { font-size: 13px; font-weight: 500; }
.oi-spec { font-size: 11px; color: #999; }
.oi-price { font-size: 13px; color: #666; white-space: nowrap; }
.order-user { font-size: 12px; color: #999; margin-top: 8px; }
.order-amount { font-size: 14px; margin-top: 4px; }
.pay-amount { font-size: 16px; font-weight: 700; color: #e74c3c; }
.order-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-top: 1px solid #f5f5f5; }
.order-time { font-size: 12px; color: #bbb; }
.order-actions { display: flex; gap: 6px; }
.load-more { text-align: center; padding: 20px; }

/* 退款卡片 */
.refund-card { background: #fff; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.refund-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f5f5f5; }
.refund-no { font-size: 13px; color: #999; }
.refund-status { font-size: 12px; padding: 2px 10px; border-radius: 100px; font-weight: 600; }
.rs-pending { background: #fff3e0; color: #f57c00; }
.rs-approved { background: #e8f5e9; color: #2e7d32; }
.rs-rejected { background: #fbe9e7; color: #d84315; }
.refund-body { padding: 12px 16px; }
.refund-info { font-size: 13px; color: #555; margin-bottom: 4px; }
.refund-actions { padding: 10px 16px; border-top: 1px solid #f5f5f5; display: flex; gap: 8px; }

/* 订单详情弹窗 */
.detail-body { max-height: 70vh; overflow-y: auto; }
.detail-status-bar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 10px; margin-bottom: 16px; font-size: 16px; font-weight: 600; }
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
