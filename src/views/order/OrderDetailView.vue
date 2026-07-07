<template>
  <div id="detail-page">
    <AppHeader />
    <div class="detail-wrap">
      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 加载失败 -->
      <div v-if="!loading && loadError" class="empty-state">
        <p>{{ loadError }}</p>
        <router-link to="/orders" class="back-link">← 返回订单列表</router-link>
      </div>

      <template v-if="!loading && !loadError && order">
        <!-- 顶部返回 -->
        <div class="top-bar">
          <router-link to="/orders" class="back-link">← 返回订单列表</router-link>
          <span class="top-order-no">订单号：{{ order.orderNo }}</span>
        </div>

        <!-- 状态横幅 -->
        <div class="banner" :class="bannerClass">
          <div class="banner-icon">{{ statusIcon }}</div>
          <div>
            <div class="banner-title">{{ order.statusName }}</div>
            <div v-if="order.status === 0" class="banner-sub">请尽快完成支付，超时订单自动取消并释放库存</div>
            <!-- 退款被驳回：订单恢复原状态后优先展示驳回原因 -->
            <div v-else-if="order.status > 0 && order.refund && order.refund.status === 2" class="banner-sub">
              ❌ 退款申请已被驳回{{ order.refund.auditRemark ? '：' + order.refund.auditRemark : '' }}，如有需要可重新申请退款
            </div>
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

        <!-- 商品明细（同店商品合并在一个卡片内，table 样式） -->
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
                <th style="width:120px">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id" :class="{ 'row-refunding': item.refundStatus === 1, 'row-refunded': item.refundStatus === 2 || item.cancelStatus === 1 }">
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
                <td>
                  <template v-if="item.cancelStatus === 1">
                    <span class="item-refund-status" style="color: #999;">已取消</span>
                  </template>
                  <template v-else-if="item.refundStatus === 2">
                    <span class="item-refund-status" style="color: #999;">已退款</span>
                  </template>
                  <template v-else-if="item.refundStatus === 1">
                    <span class="item-refund-status">{{ itemRefundLabel(item) }}</span>
                    <span v-if="itemRefundObj(item) && itemRefundObj(item).status === 3"
                          class="btn-inline primary" @click="openItemReturnDialog(item)">填写退货单号</span>
                    <span v-else-if="itemRefundObj(item) && itemRefundObj(item).status === 4"
                          class="btn-inline" @click="openItemReturnLogistics(item)">查看退货物流</span>
                  </template>
                  <span v-else class="small muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
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
            <span v-if="order.trackingNumber" class="btn lg" @click="openLogistics">查看物流</span>
            <span v-if="isTerminal" class="btn lg" @click="deleteOrderConfirm">删除订单</span>
            <span v-if="order.status === 0 || order.status === 1" class="btn lg" @click="cancelOrder">取消订单</span>
            <span v-if="order.status === 0" class="btn primary lg" @click="payOrder" :class="{ disabled: paying }">{{ paying ? '支付中…' : '立即支付' }}</span>
            <span v-if="order.status === 2" class="btn lg" @click="openRefund">申请退款</span>
            <span v-if="order.status === 2" class="btn primary lg" @click="receiveOrder">确认收货</span>
            <span v-if="order.status === 3 && activeItems.length" class="btn lg" @click="openRefund">申请退款</span>
            <span v-if="order.status === 3 && activeItems.length" class="btn primary lg" @click="goReview">去评价</span>
            <span v-if="order.status >= 4" class="btn lg" @click="buyAgain">再次购买</span>
            <span v-if="order.status === -1" class="btn lg" disabled>已取消</span>
            <span v-if="order.status === -2" class="btn lg" disabled>退款处理中</span>
            <span v-if="order.status === -3 || order.status === -4" class="btn lg" disabled>已退款</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 选择取消商品弹窗 -->
    <el-dialog title="选择要取消的商品" :visible.sync="showCancelSelect" width="460px">
      <div v-for="item in cancelSelectItems" :key="item.id" class="cancel-select-item" @click="selectCancelItem(item)">
        <div class="prod-img" style="width:44px;height:44px"><img :src="item.productImage || '/logo.png'" /></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">{{ item.productName }}</div>
          <div class="small muted" v-if="item.specName">{{ item.specName }}</div>
        </div>
        <div class="small">× {{ item.quantity }}</div>
        <div class="price" style="margin-left:8px">¥{{ (item.realPayAmount || item.price || 0).toFixed(2) }}</div>
      </div>
      <div class="cancel-whole-btn" @click="cancelWholeOrder">取消整个订单</div>
    </el-dialog>

    <!-- 选择评价商品弹窗 -->
    <el-dialog title="选择要评价的商品" :visible.sync="showReviewSelect" width="460px">
      <div v-for="item in reviewSelectItems" :key="item.id" class="cancel-select-item" @click="selectReviewItem(item)">
        <div class="prod-img" style="width:44px;height:44px"><img :src="item.productImage || '/logo.png'" /></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">{{ item.productName }}</div>
          <div class="small muted" v-if="item.specName">{{ item.specName }}</div>
        </div>
        <div class="small">× {{ item.quantity }}</div>
      </div>
    </el-dialog>

    <!-- 退货快递单号弹窗 -->
    <el-dialog title="填写退货快递单号" :visible.sync="returnDialog.show" width="420px">
      <div style="margin-bottom:12px">
        <label class="small">快递公司</label>
        <el-select v-model="returnDialog.courierCompany" style="width:100%" size="small">
          <el-option v-for="c in courierOptions" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
      <div style="margin-bottom:12px">
        <label class="small"><span style="color:#c0392b">*</span> 快递单号</label>
        <el-input v-model="returnDialog.trackingNumber" placeholder="请输入退货快递单号" size="small" maxlength="50" />
      </div>
      <span slot="footer">
        <el-button size="small" @click="returnDialog.show = false">取消</el-button>
        <el-button type="primary" size="small" :loading="returnDialog.loading" @click="submitReturn">提交</el-button>
      </span>
    </el-dialog>

    <!-- 模拟物流轨迹弹窗 -->
    <LogisticsDialog ref="logisticsDialog" />

    <AppFooter />
  </div>
</template>

<script>
import { getOrderById, payOrder, cancelOrder, receiveOrder, deleteOrder, submitReturnShipping } from "@/api/modules/order.js";
import { getUserInfo } from "@/api/modules/user.js";
import { setStore } from "@/libs/storage.js";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import LogisticsDialog from "@/components/LogisticsDialog.vue";

export default {
  name: "OrderDetailView",
  components: { AppHeader, AppFooter, LogisticsDialog },
  data() {
    return {
      order: null,
      items: [],
      loading: true,
      loadError: "",
      paying: false,
      showCancelSelect: false,
      cancelSelectItems: [],
      courierOptions: ["顺丰速运", "中通快递", "圆通速递", "韵达快递", "申通快递", "邮政EMS", "京东物流", "其他"],
      returnDialog: { show: false, refundId: null, courierCompany: "顺丰速运", trackingNumber: "", loading: false },
      showReviewSelect: false,
      reviewSelectItems: [],
    };
  },
  computed: {
    activeItems() {
      return this.items.filter(i => i.refundStatus !== 2 && (!i.cancelStatus || i.cancelStatus === 0));
    },
    refundedItems() {
      return this.items.filter(i => i.refundStatus === 2);
    },
    cancelledItems() {
      return this.items.filter(i => i.cancelStatus && i.cancelStatus > 0);
    },
    isTerminal() {
      const s = this.order?.status;
      return s === -1 || s === 4 || s === -3 || s === -4;
    },
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
      
      if (s === -2 || s === -3 || s === -4) {
        return [
          { num: 1, label: '申请退款', done: true, on: false },
          { num: 2, label: '退款处理中', done: true, on: s === -2 },
          { num: 3, label: '退款成功', done: s === -3 || s === -4, on: s === -3 || s === -4 },
        ];
      }

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
        if (res && res.data) setStore("userInfo", JSON.stringify(res.data));
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
        await this.refreshBalance();
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "支付失败");
      } finally {
        this.paying = false;
      }
    },

    async cancelOrder() {
      const active = this.activeItems;
      if (active.length > 1) {
        this.cancelSelectItems = active;
        this.showCancelSelect = true;
        return;
      }
      try {
        const { value } = await this.$prompt("取消原因：", "取消订单", { inputValue: "不想要了" });
        await cancelOrder(this.order.id, value);
        this.$message.success("已取消");
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "取消失败");
      }
    },
    async doCancelItem(orderItemId) {
      try {
        const { value } = await this.$prompt("取消原因：", "取消商品", { inputValue: "不想要了" });
        await cancelOrder(this.order.id, value, orderItemId);
        this.$message.success("商品已取消");
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "取消失败");
      }
    },
    selectCancelItem(item) {
      this.showCancelSelect = false;
      this.doCancelItem(item.id);
    },
    cancelWholeOrder() {
      this.showCancelSelect = false;
      this.$prompt("取消原因：", "取消整个订单", { inputValue: "不想要了" }).then(async ({ value }) => {
        try {
          await cancelOrder(this.order.id, value);
          this.$message.success("已取消");
          this.loadDetail();
        } catch (e) { this.$message.error(e.message || "取消失败"); }
      }).catch(() => {});
    },

    async receiveOrder() {
      await this.$confirm("确认收到商品？", "确认收货", { type: "warning" });
      try {
        await receiveOrder(this.order.id);
        this.$message.success("收货成功");
        await this.refreshBalance(); // 收货已赠积分，刷新用户信息让积分即时更新
        this.loadDetail();
      } catch (e) {
        if (e !== 'cancel') this.$message.error(e.message || "操作失败");
      }
    },

    deleteOrderConfirm() {
      this.$confirm("确定删除该订单？删除后无法恢复。", "删除订单", {
        confirmButtonText: "删除", cancelButtonText: "取消", type: "warning",
      }).then(async () => {
        try {
          await deleteOrder(this.order.id);
          this.$message.success("订单已删除");
          this.$router.push("/orders");
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },

    copyOrderNo() {
      if (this.order?.orderNo) {
        navigator.clipboard.writeText(this.order.orderNo).catch(() => {});
        this.$message.success("已复制");
      }
    },

    openRefund() { this.$router.push(`/refund?orderId=${this.order.id}`); },
    openLogistics() {
      this.$refs.logisticsDialog.open({
        title: "物流信息",
        courierCompany: this.order.courierCompany,
        trackingNumber: this.order.trackingNumber,
        address: this.order.receiverAddress,
        shipTime: this.order.shipTime,
        receiveTime: this.order.receiveTime,
        seed: this.order.trackingNumber || this.order.id,
      });
    },
    goReview() {
      const reviewable = this.activeItems.filter(i =>
          (!i.refundStatus || i.refundStatus === 0) && !i.reviewed);
      if (reviewable.length === 0) return this.$message.warning("暂无可评价的商品");
      if (reviewable.length === 1) {
        this.$router.push(`/review?orderId=${this.order.id}&itemId=${reviewable[0].id}`);
      } else {
        this.reviewSelectItems = reviewable;
        this.showReviewSelect = true;
      }
    },
    selectReviewItem(item) {
      this.showReviewSelect = false;
      this.$router.push(`/review?orderId=${this.order.id}&itemId=${item.id}`);
    },
    itemRefundObj(item) {
      const refunds = this.order?.refunds || [];
      return refunds.find(r => String(r.orderItemId) === String(item.id));
    },
    itemRefundLabel(item) {
      const rf = this.itemRefundObj(item);
      if (!rf) return "退款中";
      const labels = { 0: "审核中", 3: "待退货", 4: "退货已寄出" };
      return labels[rf.status] || "退款中";
    },
    openItemReturnDialog(item) {
      const rf = this.itemRefundObj(item);
      if (!rf) return;
      this.returnDialog.refundId = rf.id;
      this.returnDialog.trackingNumber = "";
      this.returnDialog.show = true;
    },
    openItemReturnLogistics(item) {
      const rf = this.itemRefundObj(item);
      if (!rf) return;
      this.$refs.logisticsDialog.open({
        title: "退货物流",
        courierCompany: rf.returnCourierCompany,
        trackingNumber: rf.returnTrackingNumber,
        shipTime: rf.returnTime,
        seed: rf.returnTrackingNumber || rf.id,
        destName: "商家仓库",
      });
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
        this.$message.success("退货信息已提交");
        d.show = false;
        this.loadDetail();
      } catch (e) {
        this.$message.error(e.message || "提交失败");
      } finally {
        d.loading = false;
      }
    },
    buyAgain() {
      if (this.items && this.items.length > 0) {
        this.$router.push(`/product/${this.items[0].productId}`);
      }
    },
  },
};
</script>

<style scoped>
#detail-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.detail-wrap { max-width: 760px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.loading-wrap { text-align: center; padding: 80px; color: #595959; }
.empty-state { text-align: center; padding: 80px; color: #595959; }
.empty-state .back-link { font-size: 14px; color: #2a69d4; text-decoration: none; font-weight: 500; }

/* 顶部返回 */
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.back-link { font-size: 14px; color: #2a69d4; text-decoration: none; font-weight: 500; }
.back-link:hover { opacity: 0.8; }
.top-order-no { font-size: 12px; color: #595959; }

/* 状态横幅 */
.banner {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 24px; border-radius: 8px; color: #fff; margin-bottom: 16px;
  background: linear-gradient(90deg, #2a69d4, #7aa5f5);
}
.banner.b-pending { background: linear-gradient(90deg, #2a69d4, #7aa5f5); }
.banner.b-done { background: linear-gradient(90deg, #37a36c, #7bce9f); }
.banner.b-cancel { background: linear-gradient(90deg, #c0392b, #e88583); }
.banner.b-refund, .banner.b-refunded { background: linear-gradient(90deg, #e6914e, #f0b880); }
.banner-icon { font-size: 32px; }
.banner-title { font-size: 18px; font-weight: 700; }
.banner-sub { font-size: 13px; opacity: .9; margin-top: 6px; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.card h3 { margin: 0 0 12px; font-size: 15px; }

/* 步骤条 */
.steps { display: flex; align-items: center; justify-content: center; }
.step { display: flex; align-items: center; color: #595959; font-size: 13px; }
.step .dot { width: 22px; height: 22px; border-radius: 50%; background: #dfe3e9; color: #777; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 4px; }
.step.on { color: #2a69d4; }
.step.on .dot { background: #2a69d4; color: #fff; }
.step + .step { margin-left: 10px; position: relative; }
.step + .step::before { content: ''; display: inline-block; width: 46px; height: 2px; background: #cfd4da; margin-right: 10px; }
.step.on::before, .step.on + .step::before { background: #2a69d4; }

/* 商品表格 */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { background: #f7f8fa; text-align: left; padding: 10px; border-bottom: 1px solid #cfd4da; color: #555; font-weight: 600; white-space: nowrap; }
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafbfc; }
.prod-cell { display: flex; align-items: center; gap: 8px; }
.prod-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }

.price { color: #c0392b; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #595959; }
.mt8 { margin-top: 8px; }
.mb8 { margin-bottom: 8px; }

/* 金额 */
.price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #555; }
.total-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cfd4da; padding-top: 10px; }
.total-price { font-size: 22px; color: #c0392b; font-weight: 700; }
.discount { color: #4caf7d; }

/* 操作栏 */
.bottom-bar {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 12px 16px;
}
.bottom-actions { display: flex; gap: 8px; align-items: center; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #9aa1aa; background: #fff; color: #444; border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn.primary { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.btn.lg { padding: 11px 22px; font-size: 15px; }
.btn:hover { opacity: 0.85; }
.btn.disabled { opacity: 0.4; cursor: not-allowed; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.copy-link { color: #2a69d4; cursor: pointer; }

/* 已退款商品提示 */
.refunded-note { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #eef0f3; }
.refunded-tag {
  display: inline-block; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px;
  padding: 2px 8px; font-size: 12px; color: #999; margin: 4px 4px 0 0; text-decoration: line-through;
}
.cancel-select-item {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  border: 1px solid #eef0f3; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: .15s;
}
.cancel-select-item:hover { border-color: #2a69d4; background: #f7f9fc; }
.cancel-whole-btn {
  text-align: center; padding: 10px; margin-top: 8px; border: 1px dashed #c0392b;
  border-radius: 8px; color: #c0392b; cursor: pointer; font-size: 13px; transition: .15s;
}
.cancel-whole-btn:hover { background: #fbe7e6; }
.row-refunding td { background: #fffbf0 !important; }
.row-refunded td { opacity: 0.6; }
.item-refund-status { display: block; font-size: 12px; color: #e6914e; font-weight: 600; margin-bottom: 4px; }
.btn-inline {
  display: inline-block; font-size: 11px; padding: 2px 8px; border: 1px solid #9aa1aa;
  border-radius: 4px; cursor: pointer; color: #555; background: #fff;
}
.btn-inline.primary { border-color: #2a69d4; color: #2a69d4; }
.btn-inline:hover { opacity: .8; }
</style>
