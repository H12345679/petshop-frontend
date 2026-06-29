<template>
  <div id="order-detail-page">
    <div class="detail-container">
      <!-- 顶部导航 -->
      <div class="detail-nav">
        <router-link to="/orders" class="nav-back">← 我的订单</router-link>
        <router-link to="/" class="nav-home">🏠 首页</router-link>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <div v-if="!loading && order" class="detail-content">
        <!-- 状态引导区 -->
        <div class="status-banner" :class="statusBannerClass">
          <div class="status-icon">{{ statusIcon }}</div>
          <div class="status-info">
            <div class="status-title">{{ order.statusName }}</div>
            <div class="status-desc" v-if="order.status === 0">等待您支付，超时自动取消</div>
            <div class="status-desc" v-else-if="order.status === 1">商家正在准备发货</div>
            <div class="status-desc" v-else-if="order.status === 2">商品已发出，请留意物流</div>
            <div class="status-desc" v-else-if="order.status === 3">收到货了吗？去评价一下吧</div>
            <div class="status-desc" v-else-if="order.cancelReason">取消原因：{{ order.cancelReason }}</div>
            <div class="status-desc" v-else-if="order.status === -2">退款申请已提交，等待商家处理</div>
            <div class="status-desc" v-else-if="order.status === -3 || order.status === -4">该订单已退款</div>
          </div>
          <div class="status-actions">
            <button v-if="order.status === 0" class="btn btn-primary" @click="payOrder">去支付</button>
            <button v-if="order.status === 0 || order.status === 1" class="btn btn-default" @click="cancelOrder">取消订单</button>
            <button v-if="order.status === 2" class="btn btn-primary" @click="receiveOrder">确认收货</button>
            <button v-if="order.status === 3" class="btn btn-primary" @click="showReview = true">去评价</button>
            <button v-if="order.status === 2 || order.status === 3" class="btn btn-default" @click="openRefund">申请退款</button>
            <button v-if="order.status === -2" class="btn btn-default" disabled>退款审核中</button>
          </div>
        </div>

        <!-- 收货地址 -->
        <div class="section">
          <div class="section-header"><h2>📍 收货信息</h2></div>
          <div class="address-info">
            <div class="addr-line"><strong>{{ order.receiverName }}</strong> {{ order.receiverPhone }}</div>
            <div class="addr-line">{{ order.receiverAddress }}</div>
          </div>
        </div>

        <!-- 商品清单 -->
        <div class="section">
          <div class="section-header"><h2>📦 商品清单</h2></div>
          <div class="order-items">
            <div v-for="item in items" :key="item.id" class="order-item">
              <img :src="item.productImage || '/logo.png'" class="oi-img" />
              <div class="oi-info">
                <div class="oi-name">{{ item.productName }}</div>
                <div class="oi-spec" v-if="item.specName">{{ item.specName }}</div>
              </div>
              <div class="oi-price">¥{{ (item.price || 0).toFixed(2) }}</div>
              <div class="oi-qty">× {{ item.quantity }}</div>
              <div class="oi-real">实付：<span class="oi-real-amount">¥{{ (item.realPayAmount || 0).toFixed(2) }}</span></div>
            </div>
          </div>
        </div>

        <!-- 金额明细 -->
        <div class="section">
          <div class="section-header"><h2>💰 金额明细</h2></div>
          <div class="price-detail">
            <div class="price-row"><span>商品总额</span><span>¥{{ (order.totalAmount || 0).toFixed(2) }}</span></div>
            <div class="price-row" v-if="order.discountAmount > 0"><span>优惠减免</span><span class="discount-text">-¥{{ (order.discountAmount || 0).toFixed(2) }}</span></div>
            <div class="price-row total-row"><span>实付金额</span><span class="final-price">¥{{ (order.payAmount || 0).toFixed(2) }}</span></div>
          </div>
        </div>

        <!-- 订单信息 -->
        <div class="section">
          <div class="section-header"><h2>📋 订单信息</h2></div>
          <div class="info-list">
            <div class="info-row"><span class="info-label">订单编号</span><span class="info-val">{{ order.orderNo }}</span></div>
            <div class="info-row"><span class="info-label">创建时间</span><span class="info-val">{{ order.createTime }}</span></div>
            <div class="info-row" v-if="order.payTime"><span class="info-label">付款时间</span><span class="info-val">{{ order.payTime }}</span></div>
            <div class="info-row" v-if="order.shipTime"><span class="info-label">发货时间</span><span class="info-val">{{ order.shipTime }}</span></div>
            <div class="info-row" v-if="order.receiveTime"><span class="info-label">收货时间</span><span class="info-val">{{ order.receiveTime }}</span></div>
          </div>
        </div>

        <!-- 评价弹窗 -->
        <el-dialog title="发表评价" :visible.sync="showReview" width="500px">
          <div v-for="item in items" :key="item.id" class="review-item">
            <p><strong>{{ item.productName }}</strong> <span v-if="item.specName">（{{ item.specName }}）</span></p>
            <el-rate v-model="reviewForm.rating" show-score :max="5"></el-rate>
            <el-input type="textarea" v-model="reviewForm.content" placeholder="说说你的使用感受…" rows="3" style="margin-top:8px"></el-input>
          </div>
          <span slot="footer">
            <el-button @click="showReview = false">取消</el-button>
            <el-button type="primary" @click="submitReview">提交评价</el-button>
          </span>
        </el-dialog>

        <!-- 退款弹窗 -->
        <el-dialog title="申请退款" :visible.sync="showRefund" width="420px">
          <el-form label-width="80px" size="small">
            <el-form-item label="退款金额">
              <el-input-number
                v-model="refundForm.amount"
                :min="0.01"
                :max="order.payAmount"
                :precision="2"
                :step="10"
                style="width: 200px"
              />
              <span style="margin-left: 8px; color: #999; font-size: 13px;">最高 ¥{{ (order.payAmount || 0).toFixed(2) }}</span>
            </el-form-item>
            <el-form-item label="退款原因">
              <el-input
                v-model="refundForm.reason"
                type="textarea"
                :rows="3"
                placeholder="请说明退款原因…"
              />
            </el-form-item>
          </el-form>
          <span slot="footer">
            <el-button @click="showRefund = false">取消</el-button>
            <el-button type="primary" @click="submitRefund" :loading="refundSubmitting">提交申请</el-button>
          </span>
        </el-dialog>
      </div>
    </div>
  </div>
</template>

<script>
import { myOrders, payOrder, cancelOrder, receiveOrder, submitReview, applyRefund } from "@/api/modules/order.js";

export default {
  name: "OrderDetailView",
  data() {
    return {
      order: null,
      items: [],
      loading: true,
      showReview: false,
      reviewForm: { rating: 5, content: "" },
      showRefund: false,
      refundForm: { amount: 0, reason: "" },
      refundSubmitting: false,
    };
  },
  computed: {
    statusIcon() {
      const map = { 0: "⏳", 1: "📦", 2: "🚚", 3: "⭐", 4: "✅", "-1": "❌", "-2": "🔁", "-3": "✅", "-4": "✅" };
      return map[this.order?.status] || "📄";
    },
    statusBannerClass() {
      const map = {
        0: "banner-pending", 1: "banner-ship", 2: "banner-receive",
        3: "banner-review", 4: "banner-done",
        "-1": "banner-cancel", "-2": "banner-refund", "-3": "banner-refunded", "-4": "banner-refunded",
      };
      return map[this.order?.status] || "";
    },
  },
  created() {
    this.loadDetail();
  },
  methods: {
    async loadDetail() {
      const id = this.$route.params.id;
      this.loading = true;
      try {
        const res = await myOrders({ current: 1, size: 100 });
        const list = res.data?.records || [];
        this.order = list.find((o) => String(o.id) === String(id)) || null;
        if (this.order) {
          this.items = this.order.orderItems || [];
        } else {
          this.$message.error("订单不存在");
        }
      } catch (e) {
        this.$message.error("加载失败");
      } finally {
        this.loading = false;
      }
    },

    async payOrder() {
      this.$confirm("确定余额支付？", "支付确认", {
        confirmButtonText: "支付",
        cancelButtonText: "取消",
        type: "info",
      }).then(async () => {
        try {
          await payOrder(this.order.id, 1);
          this.$message.success("支付成功！");
          this.loadDetail();
        } catch (e) {
          this.$message.error(e.message || "支付失败");
        }
      }).catch(() => {});
    },

    async cancelOrder() {
      this.$prompt("取消原因：", "取消订单", {
        confirmButtonText: "确定",
        cancelButtonText: "再想想",
        inputValue: "不想要了",
      }).then(async ({ value }) => {
        try {
          await cancelOrder(this.order.id, value || "用户取消");
          this.$message.success("已取消");
          this.loadDetail();
        } catch (e) {
          this.$message.error(e.message || "取消失败");
        }
      }).catch(() => {});
    },

    async receiveOrder() {
      this.$confirm("确认收到商品？", "收货确认", {
        confirmButtonText: "确认收货",
        cancelButtonText: "再想想",
        type: "warning",
      }).then(async () => {
        try {
          await receiveOrder(this.order.id);
          this.$message.success("收货成功");
          this.loadDetail();
        } catch (e) {
          this.$message.error(e.message || "收货失败");
        }
      }).catch(() => {});
    },

    async submitReview() {
      if (!this.reviewForm.content) {
        this.$message.warning("请填写评价内容");
        return;
      }
      try {
        for (const item of this.items) {
          await submitReview({
            orderId: this.order.id,
            orderItemId: item.id,
            productId: item.productId,
            rating: this.reviewForm.rating,
            content: this.reviewForm.content,
          });
        }
        this.$message.success("评价成功！");
        this.showReview = false;
        this.loadDetail();
      } catch (e) {
        this.$message.error(e.message || "评价失败");
      }
    },

    openRefund() {
      this.refundForm = { amount: this.order.payAmount, reason: "" };
      this.showRefund = true;
    },

    async submitRefund() {
      if (!this.refundForm.reason) {
        this.$message.warning("请填写退款原因");
        return;
      }
      if (!this.refundForm.amount || this.refundForm.amount <= 0) {
        this.$message.warning("请填写正确的退款金额");
        return;
      }
      this.refundSubmitting = true;
      try {
        await applyRefund({
          orderId: this.order.id,
          amount: this.refundForm.amount,
          reason: this.refundForm.reason,
        });
        this.$message.success("退款申请已提交，等待商家处理");
        this.showRefund = false;
        this.loadDetail();
      } catch (e) {
        this.$message.error(e.message || "申请退款失败");
      } finally {
        this.refundSubmitting = false;
      }
    },
  },
};
</script>

<style scoped>
.detail-container { max-width: 800px; margin: 0 auto; padding: 24px 20px 60px; }
.loading-wrap { text-align: center; padding: 80px; color: #999; font-size: 16px; }

/* 顶部导航 */
.detail-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.nav-back { font-size: 14px; color: #6b8dd6; text-decoration: none; font-weight: 500; }
.nav-back:hover { opacity: 0.8; }
.nav-home { font-size: 14px; color: #6b8dd6; text-decoration: none; font-weight: 500; }
.nav-home:hover { opacity: 0.8; }

/* 状态横幅 */
.status-banner { display: flex; align-items: center; padding: 24px 28px; border-radius: 16px; margin-bottom: 20px; gap: 20px; }
.status-banner.banner-pending { background: linear-gradient(135deg, #fff8e1, #fff3e0); }
.status-banner.banner-ship { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
.status-banner.banner-receive { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
.status-banner.banner-review { background: linear-gradient(135deg, #f3e5f5, #e1bee7); }
.status-banner.banner-done { background: #f5f5f5; }
.status-banner.banner-cancel { background: #fbe9e7; }
.status-banner.banner-refund, .banner-refunded { background: #fff3e0; }
.status-icon { font-size: 36px; }
.status-info { flex: 1; }
.status-title { font-size: 20px; font-weight: 700; color: #2c3e50; }
.status-desc { font-size: 14px; color: #666; margin-top: 4px; }
.status-actions { display: flex; gap: 8px; }

/* 通用 section */
.section { background: #fff; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.section-header h2 { font-size: 16px; font-weight: 600; color: #2c3e50; margin: 0 0 12px 0; }

/* 地址 */
.address-info { background: #f9fafb; padding: 14px 16px; border-radius: 8px; }
.addr-line { font-size: 14px; color: #555; margin-bottom: 4px; }

/* 商品 */
.order-item { display: flex; align-items: center; padding: 10px 0; gap: 12px; border-bottom: 1px solid #f5f5f5; }
.order-item:last-child { border-bottom: none; }
.oi-img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; background: #f5f5f5; }
.oi-info { flex: 1; min-width: 0; }
.oi-name { font-size: 14px; font-weight: 500; }
.oi-spec { font-size: 12px; color: #999; }
.oi-price { flex: 0 0 60px; text-align: right; color: #666; font-size: 13px; }
.oi-qty { flex: 0 0 30px; text-align: center; color: #999; }
.oi-real { flex: 0 0 100px; text-align: right; font-size: 13px; color: #999; }
.oi-real-amount { color: #e74c3c; font-weight: 600; }

/* 金额明细 */
.price-detail { border-top: 1px solid #f0f0f0; padding-top: 12px; }
.price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #666; }
.discount-text { color: #27ae60; }
.total-row { border-top: 1px solid #eee; padding-top: 12px; margin-top: 8px; }
.final-price { font-size: 20px; font-weight: 700; color: #e74c3c; }

/* 订单信息 */
.info-list { font-size: 14px; }
.info-row { display: flex; padding: 6px 0; }
.info-label { width: 100px; color: #999; flex-shrink: 0; }
.info-val { color: #555; word-break: break-all; }

.btn { padding: 8px 20px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.2s; }
.btn-primary { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }
.btn-default { background: #f0f0f0; color: #555; border: 1px solid #e0e0e0; }
.btn:hover { opacity: 0.85; }

/* 评价 */
.review-item { margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; }
</style>
