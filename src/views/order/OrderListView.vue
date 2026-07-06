<template>
  <div id="order-list-page">
    <AppHeader />
    <div class="order-wrap">
      <div class="page-header">
        <div class="section-title">我的订单</div>
        <router-link to="/" class="home-link">← 返回首页</router-link>
      </div>

      <!-- Tab -->
      <div class="tabs">
        <span v-for="tab in tabs" :key="tab.value"
          :class="['tab', { on: activeStatus === tab.value }]"
          @click="switchTab(tab.value)"
        >{{ tab.label }}</span>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 空 -->
      <div v-if="!loading && orders.length === 0" class="empty-state">
        <p>暂无相关订单</p>
        <router-link to="/products" class="go-btn">去逛逛</router-link>
      </div>

      <!-- 订单卡片列表 -->
      <div v-if="!loading" class="order-list">
        <div v-for="order in orders" :key="order.id" class="order-card" @click="$router.push('/order/' + order.id)">
          <!-- 卡片头部 -->
          <div class="oc-head">
            <span class="muted small">
              订单号 {{ order.orderNo }} · {{ order.shopName || '店铺' }} · {{ formatTime(order.createTime) }}
            </span>
            <span :class="['tag', statusTagClass(order.status)]">{{ order.statusName }}</span>
          </div>

          <!-- 商品 -->
          <div class="oc-body">
            <div v-for="item in (order.orderItems || [])" :key="item.id" class="oc-item">
              <div class="oc-img"><img :src="item.productImage || '/logo.png'" /></div>
              <div class="oc-info">
                <div class="oc-name">{{ item.productName }}</div>
                <div class="oc-spec" v-if="item.specName">{{ item.specName }}</div>
                <div class="oc-status-hint" v-if="order.status === 3">已收货</div>
                <div class="oc-status-hint" v-else-if="order.status >= 4">已评价</div>
              </div>
              <div class="oc-qty">× {{ item.quantity }}</div>
              <div class="price">¥{{ (item.price || 0).toFixed(2) }}</div>
            </div>
          </div>

          <!-- 底栏 -->
          <div class="oc-foot">
            <span class="small muted">
              共 {{ (order.orderItems || []).reduce((s,i)=>s+i.quantity,0) }} 件 实付
              <span class="price" style="font-size:16px">¥{{ (order.payAmount || 0).toFixed(2) }}</span>
            </span>
            <div class="oc-actions" @click.stop>
              <!-- 退款被驳回：订单已恢复原状态，仍提示用户驳回结果 -->
              <span v-if="order.status > 0 && order.refund && order.refund.status === 2"
                    class="refund-hint reject">
                ❌ 退款申请已驳回{{ order.refund.auditRemark ? '：' + order.refund.auditRemark : '' }}，可重新申请
              </span>
              <!-- 状态0：待支付 -->
              <template v-if="order.status === 0">
                <span class="btn sm" @click="cancelOrder(order)">取消订单</span>
                <span class="btn sm primary" @click="payOrder(order)">立即支付</span>
              </template>
              <!-- 状态1：待发货 -->
              <template v-if="order.status === 1">
                <span class="btn sm" @click="cancelOrder(order)">取消订单</span>
              </template>
              <!-- 状态2：待收货 -->
              <template v-if="order.status === 2">
                <span v-if="order.trackingNumber" class="btn sm" @click="openLogistics(order)">查看物流</span>
                <span class="btn sm" @click="openRefund(order)">申请退款</span>
                <span class="btn sm primary" @click="receiveOrder(order)">确认收货</span>
              </template>
              <!-- 状态3：待评价 -->
              <template v-if="order.status === 3">
                <span class="btn sm" @click="openRefund(order)">申请退款</span>
                <span class="btn sm primary" @click="goReview(order)">去评价</span>
              </template>
              <!-- 状态4：已完成（已评价仍可申请退款，但必须退货退款） -->
              <template v-if="order.status === 4">
                <span class="btn sm" @click="openRefund(order)">申请退款</span>
                <span class="btn sm" @click="deleteOrderConfirm(order)">删除订单</span>
                <span class="btn sm" @click="buyAgain(order)">再次购买</span>
              </template>
              <!-- 已取消 -->
              <template v-if="order.status === -1">
                <span class="btn sm" @click="deleteOrderConfirm(order)">删除订单</span>
              </template>
              <!-- 退款中(-2)：展示退款/退货进度 -->
              <template v-if="order.status === -2 && order.refund">
                <span v-if="order.refund.status === 0" class="refund-hint">⏳ 退款申请审核中</span>
                <template v-else-if="order.refund.status === 3">
                  <span class="refund-hint warn">商家已同意退货，请寄回商品</span>
                  <span class="btn sm primary" @click="openReturnDialog(order)">填写退货单号</span>
                </template>
                <template v-else-if="order.refund.status === 4">
                  <span class="refund-hint">
                    🚚 退货已寄出（{{ order.refund.returnCourierCompany }} {{ order.refund.returnTrackingNumber }}），待商家确认收货
                  </span>
                  <span class="btn sm" @click="openReturnLogistics(order)">查看退货物流</span>
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="totalPages > 1">
        <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
        <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
        <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      </div>
    </div>

    <!-- 退货快递单号弹窗（商家同意退货后填写） -->
    <el-dialog title="填写退货快递单号" :visible.sync="returnDialog.show" width="420px">
      <div class="rd-field">
        <label for="courierCompanySelect">快递公司</label>
        <el-select id="courierCompanySelect" v-model="returnDialog.courierCompany" style="width:100%">
          <el-option v-for="c in courierOptions" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
      <div class="rd-field">
        <label for="trackingNumberInput"><span style="color:#c0392b">*</span> 快递单号</label>
        <el-input id="trackingNumberInput" v-model="returnDialog.trackingNumber" placeholder="请输入退货快递单号" maxlength="50" />
      </div>
      <div class="small muted">提交后商家将根据单号验收退货，确认收货后退款原路退回余额</div>
      <span slot="footer">
        <el-button @click="returnDialog.show = false">取消</el-button>
        <el-button type="primary" :loading="returnDialog.loading" @click="submitReturn">提交</el-button>
      </span>
    </el-dialog>

    <!-- 模拟物流轨迹弹窗 -->
    <LogisticsDialog ref="logisticsDialog" />

    <AppFooter />
  </div>
</template>

<script>
import { myOrders, payOrder, cancelOrder, receiveOrder, deleteOrder, submitReturnShipping } from "@/api/modules/order.js";
import { getUserInfo } from "@/api/modules/user.js";
import { setStore } from "@/libs/storage.js";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import LogisticsDialog from "@/components/LogisticsDialog.vue";

const TABS = [
  { label: "全部", value: null },
  { label: "待支付", value: 0 },
  { label: "待发货", value: 1 },
  { label: "待收货", value: 2 },
  { label: "待评价", value: 3 },
  { label: "退款/售后", value: "refund" },
];

export default {
  name: "OrderListView",
  components: { AppHeader, AppFooter, LogisticsDialog },
  data() {
    return {
      orders: [],
      current: 1,
      pageSize: 10,
      total: 0,
      activeStatus: null,
      loading: false,
      courierOptions: ["顺丰速运", "中通快递", "圆通速递", "韵达快递", "申通快递", "邮政EMS", "京东物流", "其他"],
      returnDialog: { show: false, refundId: null, courierCompany: "顺丰速运", trackingNumber: "", loading: false },
    };
  },
  computed: {
    tabs() { return TABS; },
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
    pageRange() {
      const p = []; const tp = this.totalPages; const c = this.current;
      let s = Math.max(1, c - 2), e = Math.min(tp, c + 2);
      if (e - s < 4) { if (s === 1) e = Math.min(tp, s + 4); else s = Math.max(1, e - 4); }
      for (let i = s; i <= e; i++) p.push(i);
      return p;
    },
  },
  created() {
    if (this.$route.query.status !== undefined) this.activeStatus = Number(this.$route.query.status);
    this.loadOrders();
  },
  methods: {
    async loadOrders() {
      this.loading = true; this.current = 1;
      try {
        const isRefund = this.activeStatus === 'refund';
        const params = { current: 1, size: this.pageSize };
        if (this.activeStatus !== null && !isRefund) params.status = this.activeStatus;
        const res = await myOrders(params);
        let recs = res.data?.records || [];
        this.total = res.data?.total || 0;
        // 退款/售后含被驳回的（订单已恢复原状态，但退款单 status=2）
        if (isRefund) recs = recs.filter(o => [-2, -3, -4].includes(o.status) || (o.refund && o.refund.status === 2));
        this.orders = recs;
      } catch (e) { this.$message.error("加载失败"); }
      finally { this.loading = false; }
    },
    async goPage(p) {
      if (p < 1 || p > this.totalPages) return;
      this.current = p; this.loading = true;
      try {
        const isRefund = this.activeStatus === 'refund';
        const params = { current: p, size: this.pageSize };
        if (this.activeStatus !== null && !isRefund) params.status = this.activeStatus;
        const res = await myOrders(params);
        let recs = res.data?.records || [];
        if (isRefund) recs = recs.filter(o => [-2, -3, -4].includes(o.status) || (o.refund && o.refund.status === 2));
        this.orders = recs;
      } catch (e) { this.orders = []; }
      this.loading = false;
    },
    switchTab(v) { this.activeStatus = v; this.loadOrders(); },

    async refreshBalance() {
      try {
        const res = await getUserInfo();
        if (res && res.data) setStore("userInfo", JSON.stringify(res.data));
      } catch (e) { /* 静默 */ }
    },

    async payOrder(order) {
      if (order.status !== 0) return this.$message.warning("当前状态不可支付");
      await this.$confirm("确定余额支付？", "支付确认", { confirmButtonText: "支付", type: "info" });
      try {
        await payOrder(order.id, 1);
        this.$message.success("支付成功！");
        await this.refreshBalance();
        this.loadOrders();
      } catch (e) { if (e !== 'cancel') this.$message.error(e.message || "支付失败"); }
    },
    async cancelOrder(order) {
      try {
        const { value } = await this.$prompt("取消原因：", "取消订单", { inputValue: "不想要了" });
        await cancelOrder(order.id, value); this.$message.success("已取消"); this.loadOrders();
      } catch (e) { if (e !== 'cancel') this.$message.error(e.message || "取消失败"); }
    },
    async receiveOrder(order) {
      await this.$confirm("确认收到商品？", "确认收货", { type: "warning" });
      try { await receiveOrder(order.id); this.$message.success("收货成功"); await this.refreshBalance(); this.loadOrders(); }
      catch (e) { if (e !== 'cancel') this.$message.error(e.message || "操作失败"); }
    },
    openRefund(order) { this.$router.push(`/refund?orderId=${order.id}`); },
    openLogistics(order) {
      this.$refs.logisticsDialog.open({
        title: "物流信息",
        courierCompany: order.courierCompany,
        trackingNumber: order.trackingNumber,
        address: order.receiverAddress,
        shipTime: order.shipTime,
        receiveTime: order.receiveTime,
        seed: order.trackingNumber || order.id,
      });
    },
    openReturnLogistics(order) {
      const rf = order.refund || {};
      this.$refs.logisticsDialog.open({
        title: "退货物流",
        courierCompany: rf.returnCourierCompany,
        trackingNumber: rf.returnTrackingNumber,
        shipTime: rf.returnTime,
        seed: rf.returnTrackingNumber || rf.id,
        destName: "商家仓库",
      });
    },
    openReturnDialog(order) {
      this.returnDialog.refundId = order.refund.id;
      this.returnDialog.trackingNumber = "";
      this.returnDialog.show = true;
    },
    async submitReturn() {
      const d = this.returnDialog;
      if (!d.trackingNumber.trim()) return this.$message.warning("请输入退货快递单号");
      d.loading = true;
      try {
        await submitReturnShipping(d.refundId, {
          courierCompany: d.courierCompany,
          trackingNumber: d.trackingNumber.trim(),
        });
        this.$message.success("退货单号已提交，等待商家确认收货");
        d.show = false;
        this.loadOrders();
      } catch (e) {
        this.$message.error(e.message || "提交失败");
      } finally {
        d.loading = false;
      }
    },
    goReview(order) { this.$router.push(`/review?orderId=${order.id}`); },
    buyAgain(order) {
      if (order.orderItems && order.orderItems.length > 0) {
        this.$router.push(`/product/${order.orderItems[0].productId}`);
      }
    },
    async deleteOrderConfirm(order) {
      try {
        await this.$confirm("确定删除该订单？删除后无法恢复。", "删除订单", {
          confirmButtonText: "删除", cancelButtonText: "取消", type: "warning",
        });
        await deleteOrder(order.id);
        this.$message.success("订单已删除");
        this.loadOrders();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "删除失败");
      }
    },
    statusTagClass(s) {
      const m = { 0:'warn', 1:'accent', 2:'accent', 3:'ok', 4:'', '-1':'cancel', '-2':'warn', '-3':'ok', '-4':'ok' };
      return m[s] || '';
    },
    formatTime(t) { return t ? t.substring(0, 10) : ''; },
  },
};
</script>

<style scoped>
#order-list-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.order-wrap { max-width: 900px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.section-title { font-size: 16px; font-weight: 700; margin: 6px 0 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin: 6px 0 12px; }
.home-link { font-size: 13px; color: #2a69d4; text-decoration: none; }
.home-link:hover { opacity: 0.8; }
.loading-wrap { text-align: center; padding: 60px; color: #595959; }
.empty-state { text-align: center; padding: 80px; color: #595959; }
.go-btn { display: inline-block; margin-top: 12px; padding: 10px 32px; background: #2a69d4; color: #fff; border-radius: 100px; text-decoration: none; font-weight: 600; }

/* Tabs（下划线风格） */
.tabs { display: flex; gap: 0; border-bottom: 1px solid #cfd4da; margin-bottom: 14px; }
.tab { padding: 8px 16px; font-size: 13px; color: #666; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
.tab:hover { color: #2a69d4; }
.tab.on { color: #2a69d4; border-bottom-color: #2a69d4; font-weight: 600; }

/* 订单卡片 */
.order-card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; margin-bottom: 12px; cursor: pointer; overflow: hidden; }
.oc-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #f7f8fa; border-bottom: 1px solid #cfd4da;
}
.oc-body { padding: 14px; }
.oc-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.oc-item:last-child { margin-bottom: 0; }
.oc-img { width: 54px; height: 54px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.oc-img img { width: 100%; height: 100%; object-fit: cover; }
.oc-info { flex: 1; min-width: 0; }
.oc-name { font-size: 13px; color: #333; }
.oc-spec { font-size: 12px; color: #595959; margin-top: 2px; }
.oc-status-hint { font-size: 12px; color: #595959; margin-top: 2px; }
.oc-qty { font-size: 13px; color: #595959; flex-shrink: 0; }

/* 底栏 */
.oc-foot {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-top: 1px solid #eef0f3;
}
.oc-actions { display: flex; gap: 8px; align-items: center; }

/* 退款/退货进度提示 */
.refund-hint { font-size: 12px; color: #595959; }
.refund-hint.warn { color: #e6914e; font-weight: 600; }
.refund-hint.reject { color: #c0392b; }
.rd-field { margin-bottom: 14px; }
.rd-field label { display: block; font-size: 13px; color: #555; margin-bottom: 5px; }

/* 标签 */
.tag { display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px; padding: 1px 8px; font-size: 12px; color: #555; }
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #e6914e; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }
.tag.accent { background: #e7eefc; border-color: #bcd0f6; color: #2a69d4; }
.tag.cancel { background: #fbe7e6; border-color: #f0c2c0; color: #c0392b; }

.price { color: #c0392b; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #595959; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #9aa1aa; background: #fff; color: #444; border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn.sm { padding: 4px 12px; font-size: 12px; }
.btn.primary { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.btn:hover { opacity: 0.85; }

/* 分页 */
.pager { display: flex; gap: 6px; justify-content: flex-end; margin-top: 14px; }
.pager span { min-width: 30px; height: 30px; border: 1px solid #cfd4da; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #555; background: #fff; padding: 0 8px; cursor: pointer; }
.pager span:hover { border-color: #2a69d4; }
.pager span.on { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.pager span.disabled { opacity: .3; cursor: not-allowed; }
</style>
