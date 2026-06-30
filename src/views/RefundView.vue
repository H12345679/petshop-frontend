<template>
  <div id="refund-page">
    <AppHeader />

    <div class="container">
      <div class="section-title">申请退款 / 退货</div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <template v-if="!loading && orderItem">
        <!-- 退款商品 -->
        <div class="card">
          <h3>退款商品</h3>
          <table class="tbl">
            <thead>
              <tr>
                <th>商品</th>
                <th style="width:120px">实付金额</th>
                <th style="width:140px">可退上限</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="prod-cell">
                    <img :src="orderItem.productImage || '/logo.png'" class="tbl-img" />
                    <span>{{ orderItem.productName }} × {{ orderItem.quantity }}</span>
                  </div>
                </td>
                <td class="price">¥{{ (orderItem.realPayAmount || 0).toFixed(2) }}</td>
                <td class="price">¥{{ maxRefund.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="small muted tip">💡 可退金额上限 = 该明细分摊优惠后的实付（realPayAmount）</div>
        </div>

        <!-- 退款表单 -->
        <div class="card">
          <div class="field">
            <label>退款类型</label>
            <div class="tag-row">
              <span :class="['tag', { accent: form.type === 1 }]" @click="form.type = 1">仅退款</span>
              <span :class="['tag', { accent: form.type === 2 }]" @click="form.type = 2">退货退款</span>
            </div>
          </div>

          <div class="field">
            <label><span class="req">*</span> 退款金额</label>
            <div class="amount-row">
              <span class="currency">¥</span>
              <input type="number" v-model.number="form.amount" :max="maxRefund" :min="0.01" step="0.01" class="amount-input" />
              <span class="small muted">最多可退 ¥{{ maxRefund.toFixed(2) }}</span>
            </div>
          </div>

          <div class="field">
            <label><span class="req">*</span> 退款原因</label>
            <el-select v-model="form.reason" placeholder="请选择：商品有瑕疵 / 不想要了 / 商家发错货 ..." style="width:100%">
              <el-option label="商品有瑕疵" value="商品有瑕疵" />
              <el-option label="不想要了" value="不想要了" />
              <el-option label="商家发错货" value="商家发错货" />
              <el-option label="尺寸不符" value="尺寸不符" />
              <el-option label="其他" value="其他" />
            </el-select>
          </div>

          <div class="field">
            <label>问题描述（选填）</label>
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="补充说明，便于商家审核…"
              maxlength="500"
            />
          </div>

          <div class="field">
            <label>上传凭证（选填）</label>
            <div class="upload-row">
              <div v-for="(img, idx) in form.images" :key="idx" class="upload-img">
                <img :src="img" />
              </div>
              <div v-if="form.images.length < 6" class="upload-add" @click="addImage">＋</div>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn" @click="$router.back()">取消</button>
            <button class="btn primary lg" @click="submitRefund" :disabled="submitting">
              {{ submitting ? '提交中…' : '提交申请' }}
            </button>
          </div>
        </div>
      </template>

      <!-- 无商品 -->
      <div v-if="!loading && !orderItem" class="empty-state">
        <p>未找到可退款商品</p>
        <router-link to="/orders" class="back-link">← 返回订单</router-link>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
export default {
  name: "RefundView",
  components: {
    AppHeader: () => import("@/components/AppHeader.vue"),
    AppFooter: () => import("@/components/AppFooter.vue"),
  },
  data() {
    return {
      loading: true,
      submitting: false,
      orderItem: null,
      maxRefund: 0,
      form: { type: 1, amount: 0, reason: "", description: "", images: [] },
    };
  },
  created() {
    const orderId = this.$route.query.orderId;
    const itemId = this.$route.query.itemId;
    if (orderId && itemId) this.loadItem(orderId, itemId);
    else this.loading = false;
  },
  methods: {
    async loadItem(orderId, itemId) {
      try {
        const { get } = await import("@/api/axios.js");
        const res = await get("/orders/my");
        const orders = res.data?.records || [];
        for (const o of orders) {
          if (String(o.id) === String(orderId)) {
            const item = (o.orderItems || []).find(i => String(i.id) === String(itemId));
            if (item) {
              this.orderItem = item;
              this.maxRefund = Number(item.realPayAmount || 0);
              this.form.amount = this.maxRefund;
            }
          }
        }
      } catch (e) { /* ignore */ }
      this.loading = false;
    },

    addImage() {
      const url = prompt("输入图片URL（模拟上传）");
      if (url && this.form.images.length < 6) this.form.images.push(url);
    },

    async submitRefund() {
      if (!this.form.amount || this.form.amount <= 0) return this.$message.warning("请输入退款金额");
      if (this.form.amount > this.maxRefund) return this.$message.warning("退款金额不可超过上限");
      if (!this.form.reason) return this.$message.warning("请选择退款原因");
      this.submitting = true;
      try {
        const { postJson } = await import("@/api/axios.js");
        await postJson("/refunds", {
          orderId: this.$route.query.orderId,
          amount: this.form.amount,
          reason: this.form.reason,
          description: this.form.description,
          refundType: this.form.type,
          images: this.form.images,
        });
        this.$message.success("退款申请已提交");
        this.$router.push("/orders");
      } catch (e) {
        this.$message.error(e.message || "提交失败");
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
#refund-page { background:#f4f5f7; min-height:100vh; display:flex; flex-direction:column; }
.container { width: 700px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }
.section-title { font-size:22px; font-weight:700; color:#2c3e50; margin-bottom:20px; }

.loading-wrap { text-align:center; padding:80px 0; color:#999; }
.empty-state { text-align:center; padding:80px 0; color:#999; }
.back-link { font-size:14px; color:#6b8dd6; text-decoration:none; font-weight:500; }

/* ===== 卡片 ===== */
.card { background:#fff; border-radius:12px; padding:20px 24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.card h3 { font-size:16px; font-weight:600; color:#2c3e50; margin:0 0 12px; }

/* ===== 商品表格 ===== */
.tbl { width:100%; border-collapse:collapse; font-size:14px; }
.tbl th { background:#f7f8fa; padding:10px; text-align:left; font-weight:600; color:#666; border-bottom:1px solid #eee; }
.tbl td { padding:10px; border-bottom:1px solid #f5f5f5; vertical-align:middle; }
.tbl tr:last-child td { border-bottom:none; }
.prod-cell { display:flex; align-items:center; gap:10px; }
.tbl-img { width:44px; height:44px; border-radius:6px; object-fit:cover; background:#f5f5f5; flex-shrink:0; }
.price { color:#e74c3c; font-weight:600; }
.tip { margin-top:8px; }

/* ===== 表单字段 ===== */
.field { margin-bottom:18px; }
.field label { display:block; font-size:14px; color:#333; font-weight:500; margin-bottom:8px; }
.req { color:#e74c3c; }

/* ===== 退款类型标签 ===== */
.tag-row { display:flex; gap:8px; }
.tag { padding:8px 22px; border-radius:100px; font-size:14px; cursor:pointer; background:#f0f2f5; color:#666; font-weight:500; transition:all .2s; border:1px solid transparent; }
.tag:hover { border-color:#6b8dd6; }
.tag.accent { background:#eef4ff; color:#6b8dd6; border-color:#6b8dd6; font-weight:600; }

/* ===== 退款金额 ===== */
.amount-row { display:flex; align-items:center; gap:10px; }
.currency { font-size:20px; color:#333; font-weight:600; }
.amount-input {
  width:160px; padding:10px 14px; font-size:18px; font-weight:700; color:#e74c3c;
  border:1px solid #e0e0e0; border-radius:8px; outline:none;
}
.amount-input:focus { border-color:#6b8dd6; }

/* ===== 上传凭证 ===== */
.upload-row { display:flex; gap:8px; flex-wrap:wrap; }
.upload-img { width:70px; height:70px; border-radius:8px; overflow:hidden; border:1px solid #eee; }
.upload-img img { width:100%; height:100%; object-fit:cover; }
.upload-add {
  width:70px; height:70px; border:1px dashed #ccc; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; color:#999; cursor:pointer; transition:all .2s;
}
.upload-add:hover { border-color:#6b8dd6; color:#6b8dd6; }

/* ===== 按钮 ===== */
.btn-row { display:flex; gap:10px; margin-top:8px; }
.btn { padding:10px 28px; border-radius:100px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid #e0e0e0; background:#fff; color:#555; transition:opacity .2s; }
.btn:hover { opacity:.85; }
.btn.primary { background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border:none; }
.btn.lg { padding:12px 36px; font-size:15px; }
.btn:disabled { opacity:.4; cursor:not-allowed; }

.small { font-size:12px; }
.muted { color:#999; }
</style>
