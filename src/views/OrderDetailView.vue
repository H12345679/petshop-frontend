<template>
  <div id="order-detail-page">
    <AppHeader />

    <div class="container">
      <!-- 顶部导航 -->
      <div class="detail-nav">
        <router-link to="/orders" class="back-link">← 我的订单</router-link>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <template v-if="!loading && order">
        <!-- ===== 状态横幅 ===== -->
        <div class="status-banner" :style="bannerStyle">
          <div class="banner-title">{{ statusTitle }}</div>
          <div class="banner-desc">{{ statusDesc }}</div>
        </div>

        <!-- ===== 进度步骤 ===== -->
        <div class="card">
          <div class="steps">
            <span class="step on"><span class="step-dot">✓</span>提交订单</span><span class="step-bar"></span>
            <span :class="['step', { on: order.status >= 1 }]"><span class="step-dot">2</span>付款</span><span class="step-bar"></span>
            <span :class="['step', { on: order.status >= 2 }]"><span class="step-dot">3</span>商家发货</span><span class="step-bar"></span>
            <span :class="['step', { on: order.status >= 3 }]"><span class="step-dot">4</span>确认收货</span><span class="step-bar"></span>
            <span :class="['step', { on: order.status >= 4 }]"><span class="step-dot">5</span>评价</span>
          </div>
        </div>

        <!-- ===== 收货信息 ===== -->
        <div class="card">
          <h3 class="card-title">收货信息</h3>
          <div class="addr-name">{{ order.receiverName }}　{{ order.receiverPhone }}</div>
          <div class="addr-detail">{{ order.receiverAddress }}</div>
        </div>

        <!-- ===== 商品明细 ===== -->
        <div class="card">
          <h3 class="card-title">
            商品明细
            <span class="small muted" v-if="order.shopName">　{{ order.shopName }}</span>
          </h3>
          <table class="prod-table">
            <thead>
              <tr>
                <th>商品</th>
                <th style="width:70px">规格</th>
                <th style="width:80px">单价</th>
                <th style="width:50px">数量</th>
                <th style="width:90px">小计</th>
                <th style="width:100px">分摊实付</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>
                  <div class="prod-cell">
                    <img :src="item.productImage || '/logo.png'" class="prod-img" />
                    <span>{{ item.productName }}</span>
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
          <div class="small muted" style="margin-top:8px">💡 分摊实付 realPayAmount 为退款上限</div>
        </div>

        <!-- ===== 付款信息 ===== -->
        <div class="card">
          <h3 class="card-title">付款信息</h3>
          <div class="price-row">
            <span class="muted">商品总额</span>
            <span>¥{{ (order.totalAmount || 0).toFixed(2) }}</span>
          </div>
          <div class="price-row" v-if="discountTotal > 0">
            <span class="muted">优惠合计（会员 + 券）</span>
            <span style="color:#27ae60">−¥{{ discountTotal.toFixed(2) }}</span>
          </div>
          <div class="divider"></div>
          <div class="pay-row">
            <span>实付款</span>
            <span class="pay-amount">¥{{ (order.payAmount || 0).toFixed(2) }}</span>
          </div>
        </div>

        <!-- ===== 订单信息 ===== -->
        <div class="card">
          <h3 class="card-title">订单信息</h3>
          <div class="info-line">
            订单编号：{{ order.orderNo }}
            <span class="copy-link" @click="copyOrderNo">复制</span>
          </div>
          <div class="info-line" v-if="order.createTime">创建时间：{{ formatTime(order.createTime) }}</div>
          <div class="info-line" v-if="order.payTime">付款时间：{{ formatTime(order.payTime) }}</div>
          <div class="info-line" v-if="order.shipTime">发货时间：{{ formatTime(order.shipTime) }}</div>
          <div class="info-line" v-if="order.receiveTime">收货时间：{{ formatTime(order.receiveTime) }}</div>
          <div class="info-line">支付方式：余额支付 / 模拟快捷支付</div>
        </div>

        <!-- ===== 底部操作栏（粘性） ===== -->
        <div class="bottom-bar">
          <span class="bottom-summary">
            应付：<span class="pay-amount" style="font-size:20px">¥{{ (order.payAmount || 0).toFixed(2) }}</span>
          </span>
          <div class="bottom-actions">
            <template v-if="order.status === 0">
              <button class="btn" @click="cancelOrder">取消订单</button>
              <button class="btn primary lg" @click="payOrder">立即支付</button>
            </template>
            <template v-if="order.status === 1">
              <button class="btn" @click="cancelOrder">取消订单</button>
            </template>
            <template v-if="order.status === 2">
              <button class="btn" @click="receiveOrder">确认收货</button>
              <button class="btn" @click="openRefund">申请退款</button>
            </template>
            <template v-if="order.status === 3">
              <button class="btn primary" @click="openReview">去评价</button>
              <button class="btn" @click="openRefund">申请退款</button>
            </template>
            <template v-if="order.status === -2">
              <button class="btn" disabled>退款审核中</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <AppFooter />

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

  </div>
</template>

<script>
import { myOrders, payOrder, cancelOrder, receiveOrder, submitReview } from "@/api/modules/order.js";

export default {
  name: "OrderDetailView",
  components: {
    AppHeader: () => import("@/components/AppHeader.vue"),
    AppFooter: () => import("@/components/AppFooter.vue"),
  },
  data() {
    return {
      order: null,
      items: [],
      loading: true,
      showReview: false,
      reviewForm: { rating: 5, content: "" },
    };
  },
  computed: {
    discountTotal() {
      const total = (this.order?.totalAmount || 0);
      const pay = (this.order?.payAmount || 0);
      return Math.max(0, total - pay);
    },
    bannerStyle() {
      const s = this.order?.status;
      if (s === 0) return 'background:linear-gradient(90deg,#5b8def,#7aa5f5);color:#fff';
      if (s === 1) return 'background:linear-gradient(135deg,#e3f2fd,#bbdefb)';
      if (s === 2) return 'background:linear-gradient(135deg,#e8f5e9,#c8e6c9)';
      if (s === 3) return 'background:linear-gradient(135deg,#f3e5f5,#e1bee7)';
      if (s === 4) return 'background:#f5f5f5';
      if (s === -1) return 'background:#fbe9e7';
      return 'background:#fff3e0';
    },
    statusTitle() {
      const map = {
        0: "● 等待买家付款", 1: "● 等待商家发货", 2: "● 已发货，等待收货",
        3: "● 待评价", 4: "● 已完成",
        "-1": "● 已取消", "-2": "● 退款中", "-3": "● 已退款",
      };
      return map[this.order?.status] || "● 未知状态";
    },
    statusDesc() {
      const s = this.order?.status;
      if (s === 0) return "请在 30 分钟内完成支付，超时订单自动取消并释放库存";
      if (s === 1) return "商家正在准备发货，请耐心等待";
      if (s === 2) return "商品已发出，请留意物流信息";
      if (s === 3) return "收到货了吗？去评价一下吧";
      if (s === 4) return "感谢您的购买";
      if (s === -1 && this.order?.cancelReason) return `取消原因：${this.order.cancelReason}`;
      if (s === -2) return "退款申请已提交，等待商家处理";
      if (s === -3 || s === -4) return "该订单已退款";
      return "";
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

    formatTime(t) {
      if (!t) return "";
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const sec = String(d.getSeconds()).padStart(2, "0");
      return `${y}-${mo}-${dd} ${h}:${mi}:${sec}`;
    },

    copyOrderNo() {
      if (this.order?.orderNo) {
        navigator.clipboard.writeText(this.order.orderNo).then(() => {
          this.$message.success("已复制订单号");
        }).catch(() => {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = this.order.orderNo;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          this.$message.success("已复制订单号");
        });
      }
    },

    async payOrder() {
      this.$confirm("确定余额支付？", "支付确认", {
        confirmButtonText: "支付", cancelButtonText: "取消", type: "info",
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
        confirmButtonText: "确定", cancelButtonText: "再想想", inputValue: "不想要了",
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
        confirmButtonText: "确认收货", cancelButtonText: "再想想", type: "warning",
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

    openReview() {
      this.reviewForm = { rating: 5, content: "" };
      this.showReview = true;
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
      const item = this.items[0];
      if (item) {
        this.$router.push(`/refund?orderId=${this.order.id}&itemId=${item.id}`);
      } else {
        this.$message.info("该订单暂无可退款商品");
      }
    },
  },
};
</script>

<style scoped>
#order-detail-page { background:#f4f5f7; min-height:100vh; display:flex; flex-direction:column; }
.container { width: 800px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }

.loading-wrap { text-align:center; padding:80px 0; color:#999; }

/* 顶部导航 */
.detail-nav { margin-bottom:16px; }
.back-link { font-size:14px; color:#6b8dd6; text-decoration:none; font-weight:500; }
.back-link:hover { opacity:.8; }

/* ===== 状态横幅 ===== */
.status-banner { border-radius:12px; padding:20px 24px; margin-bottom:16px; }
.banner-title { font-size:18px; font-weight:700; }
.banner-desc { font-size:13px; margin-top:6px; opacity:.9; }

/* ===== 卡片 ===== */
.card { background:#fff; border-radius:12px; padding:20px 24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.card-title { font-size:16px; font-weight:600; color:#2c3e50; margin:0 0 12px; display:flex; align-items:center; }

/* ===== 步骤条 ===== */
.steps { display:flex; align-items:center; justify-content:center; gap:0; }
.step { display:flex; align-items:center; gap:6px; font-size:13px; color:#ccc; font-weight:500; }
.step.on { color:#6b8dd6; font-weight:600; }
.step-dot { display:inline-flex; width:24px; height:24px; border-radius:50%; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#e8e8e8; color:#fff; }
.step.on .step-dot { background:linear-gradient(135deg,#6b8dd6,#8e37d7); }
.step-bar { display:inline-block; width:50px; height:2px; background:#e0e0e0; margin:0 8px; }
.step.on + .step-bar { background:#6b8dd6; }

/* ===== 收货信息 ===== */
.addr-name { font-size:14px; color:#333; }
.addr-detail { font-size:13px; color:#999; margin-top:6px; }

/* ===== 商品表格 ===== */
.prod-table { width:100%; border-collapse:collapse; font-size:13px; }
.prod-table th { background:#f7f8fa; padding:8px 10px; text-align:left; font-weight:600; color:#666; border-bottom:1px solid #eee; }
.prod-table td { padding:10px; border-bottom:1px solid #f5f5f5; vertical-align:middle; }
.prod-table tr:last-child td { border-bottom:none; }
.prod-cell { display:flex; align-items:center; gap:10px; }
.prod-img { width:40px; height:40px; border-radius:6px; object-fit:cover; background:#f5f5f5; flex-shrink:0; }
.price { color:#e74c3c; font-weight:600; }
.small { font-size:12px; }
.muted { color:#999; }

/* ===== 付款信息 ===== */
.price-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; color:#333; }
.divider { border-top:1px solid #eee; margin:10px 0; }
.pay-row { display:flex; justify-content:space-between; align-items:center; }
.pay-amount { font-size:22px; font-weight:700; color:#e74c3c; }

/* ===== 订单信息 ===== */
.info-line { font-size:13px; color:#999; margin-bottom:8px; }
.copy-link { color:#6b8dd6; cursor:pointer; font-weight:600; margin-left:6px; font-size:12px; }
.copy-link:hover { opacity:.8; }

/* ===== 底部操作栏 ===== */
.bottom-bar {
  display:flex; justify-content:space-between; align-items:center;
  position:sticky; bottom:0;
  padding:14px 24px; background:#fff; border-radius:12px;
  box-shadow:0 -2px 12px rgba(0,0,0,0.08); margin-top:16px;
}
.bottom-summary { font-size:14px; color:#666; }
.bottom-actions { display:flex; gap:8px; }

/* ===== 按钮 ===== */
.btn { padding:8px 20px; border-radius:100px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid #e0e0e0; background:#fff; color:#555; transition:opacity .2s; }
.btn:hover { opacity:.85; }
.btn.primary { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border:none; }
.btn.lg { padding:10px 28px; font-size:14px; }
.btn:disabled { opacity:.4; cursor:not-allowed; }

/* 评价 */
.review-item { margin-bottom:16px; padding:12px; background:#f9fafb; border-radius:8px; }
</style>
