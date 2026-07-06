<template>
  <div id="refund-page">
    <AppHeader />
    <div class="refund-wrap">
      <div class="section-title">申请退款 / 退货</div>

      <!-- 加载 -->
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
                    <div class="prod-img"><img :src="orderItem.productImage || '/logo.png'" /></div>
                    {{ orderItem.productName }} × {{ orderItem.quantity }}
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
          <!-- 是否收到货：仅待收货(2)订单需要声明 -->
          <div class="field" v-if="orderStatus === 2">
            <div class="mock-label">货物状态</div>
            <div class="chip-row">
              <span :class="['chip', { on: form.received === 1 }]" @click="setReceived(1)">已收到货</span>
              <span :class="['chip', { on: form.received === 0 }]" @click="setReceived(0)">未收到货（快递退回/丢件）</span>
            </div>
            <div v-if="form.received === 0" class="small warn-tip">
              📦 未收到货将按「快递退款」处理：无需退货，商家核实快递退回后确认退款
            </div>
          </div>

          <div class="field">
            <div class="mock-label">退款类型</div>
            <div class="chip-row">
              <span :class="['chip', { on: form.type === 1, disabled: orderStatus === 4 }]" @click="setType(1)">仅退款</span>
              <span :class="['chip', { on: form.type === 2, disabled: form.received === 0 }]" @click="setType(2)">退货退款</span>
            </div>
            <div v-if="orderStatus === 4" class="small warn-tip">
              ⚠ 该订单已评价，退款必须退货：商家同意后请寄回商品并填写退货快递单号
            </div>
            <div v-else-if="form.type === 2" class="small muted tip">
              商家同意退货后，需在订单列表填写退货快递单号，商家确认收货后退款到账
            </div>
          </div>

          <div class="field">
            <label for="refundAmountInput"><span class="req">*</span> 退款金额</label>
            <div class="amount-row">
              <span class="currency">¥</span>
              <input
                id="refundAmountInput"
                type="number"
                v-model.number="form.amount"
                :max="maxRefund"
                :min="0.01"
                step="0.01"
                class="amount-input"
              />
              <span class="small muted">最多可退 ¥{{ maxRefund.toFixed(2) }}</span>
            </div>
          </div>

          <div class="field">
            <label for="refundReasonSelect"><span class="req">*</span> 退款原因</label>
            <el-select id="refundReasonSelect" v-model="form.reason" placeholder="请选择：商品有瑕疵 / 不想要了 / 商家发错货 ..." style="width:100%">
              <el-option label="商品有瑕疵" value="商品有瑕疵" />
              <el-option label="不想要了" value="不想要了" />
              <el-option label="商家发错货" value="商家发错货" />
              <el-option label="尺寸不符" value="尺寸不符" />
              <el-option label="其他" value="其他" />
            </el-select>
          </div>

          <div class="field">
            <label for="refundDescInput">问题描述（选填）</label>
            <el-input
              id="refundDescInput"
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="补充说明，便于商家审核…"
              maxlength="500"
              show-word-limit
            />
          </div>

          <div class="field">
            <div class="mock-label">上传凭证（选填）</div>
            <div class="upload-row">
              <div v-for="(img, idx) in form.images" :key="idx" class="upload-item">
                <img :src="img" />
              </div>
              <el-upload
                v-if="form.images.length < 6"
                class="upload-add-wrap"
                action="#"
                :show-file-list="false"
                :http-request="uploadImage"
                accept="image/*"
              >
                <div class="upload-add">＋</div>
              </el-upload>
            </div>
          </div>

          <div class="btn-row">
            <span class="btn" @click="$router.back()">取消</span>
            <span class="btn primary lg" :class="{ disabled: submitting }" @click="submitRefund">
              {{ submitting ? '提交中…' : '提交申请' }}
            </span>
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
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "RefundView",
  components: { AppHeader, AppFooter },
  data() {
    return {
      loading: true,
      submitting: false,
      orderItem: null,
      orderStatus: null,
      maxRefund: 0,
      form: { type: 1, received: 1, amount: 0, reason: "", description: "", images: [] },
    };
  },
  created() {
    const orderId = this.$route.query.orderId;
    const itemId = this.$route.query.itemId;
    if (orderId) this.loadItem(orderId, itemId);
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
            this.orderStatus = o.status;
            // 已评价(4)的订单退款必须退货
            if (o.status === 4) this.form.type = 2;
            const items = o.orderItems || [];
            // 如果指定了 itemId，只退该明细；否则退整单第一项
            const item = itemId
              ? items.find(i => String(i.id) === String(itemId))
              : items[0];
            if (item) {
              this.orderItem = item;
              this.maxRefund = Number(item.realPayAmount || 0);
              this.form.amount = this.maxRefund;
            }
            break;
          }
        }
      } catch (e) { /* ignore */ }
      this.loading = false;
    },
    setReceived(v) {
      this.form.received = v;
      // 未收到货没有货可退，只能仅退款（快递退款）
      if (v === 0) this.form.type = 1;
    },
    setType(t) {
      if (t === 1 && this.orderStatus === 4) {
        return this.$message.warning("已评价的订单退款必须退货，请选择退货退款");
      }
      if (t === 2 && this.form.received === 0) {
        return this.$message.warning("未收到货无法退货，请选择仅退款");
      }
      this.form.type = t;
    },
    async uploadImage(options) {
      try {
        const { upload } = await import("@/api/axios.js");
        const formData = new FormData();
        formData.append("file", options.file);
        const res = await upload("/files/refund", formData);
        const url = res.data?.url;
        if (url) {
          this.form.images.push(url);
          this.$message.success("上传成功");
        } else {
          this.$message.error(res.message || "上传失败");
        }
      } catch (e) {
        this.$message.error("上传图片失败：" + e.message);
      }
    },
    async submitRefund() {
      if (this.submitting) return;
      if (!this.form.amount || this.form.amount <= 0) return this.$message.warning("请输入退款金额");
      if (this.form.amount > this.maxRefund) return this.$message.warning("退款金额不可超过可退上限");
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
          received: this.form.received,
          images: this.form.images,
        });
        this.$message.success("退款申请已提交，等待商家处理");
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
#refund-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.refund-wrap { max-width: 700px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.section-title { font-size: 22px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; }
.loading-wrap { text-align: center; padding: 80px; color: #595959; }
.empty-state { text-align: center; padding: 80px; color: #595959; }
.back-link { font-size: 14px; color: #2a69d4; text-decoration: none; font-weight: 500; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 20px 24px; margin-bottom: 16px; }
.card h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #2c3e50; }

/* 商品表格 */
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th { background: #f7f8fa; text-align: left; padding: 10px; color: #666; font-weight: 600; border-bottom: 1px solid #cfd4da; }
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; vertical-align: middle; color: #555; }
.tbl tr:last-child td { border-bottom: none; }
.prod-cell { display: flex; align-items: center; gap: 10px; }
.prod-img { width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.price { color: #c0392b; font-weight: 600; }
.tip { margin-top: 8px; }

/* 表单 */
.field { margin-bottom: 18px; }
.field label, .mock-label { display: block; font-size: 14px; color: #333; font-weight: 500; margin-bottom: 8px; }
.req { color: #c0392b; }

/* 类型选择 */
.chip-row { display: flex; gap: 8px; }
.chip { padding: 8px 22px; border-radius: 100px; font-size: 14px; cursor: pointer; background: #f0f2f5; color: #666; font-weight: 500; transition: .15s; border: 1px solid transparent; }
.chip:hover { border-color: #2a69d4; }
.chip.on { background: #e7eefc; border-color: #2a69d4; color: #2a69d4; font-weight: 600; }
.chip.disabled { opacity: .45; cursor: not-allowed; }
.warn-tip { margin-top: 8px; color: #e6914e; }

/* 金额 */
.amount-row { display: flex; align-items: center; gap: 10px; }
.currency { font-size: 20px; color: #333; font-weight: 600; }
.amount-input {
  width: 160px; padding: 10px 14px; font-size: 18px; font-weight: 700; color: #c0392b;
  border: 1px solid #cfd4da; border-radius: 8px; outline: none;
}
.amount-input:focus { border-color: #2a69d4; }

/* 上传 */
.upload-row { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-item { width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1px solid #eef0f3; }
.upload-item img { width: 100%; height: 100%; object-fit: cover; }
.upload-add {
  width: 70px; height: 70px; border: 1px dashed #9aa1aa; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: #595959; cursor: pointer; transition: .15s;
}
.upload-add:hover { border-color: #2a69d4; color: #2a69d4; }

/* 按钮 */
.btn-row { display: flex; gap: 10px; margin-top: 8px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 28px; border: 1px solid #9aa1aa; border-radius: 6px;
  background: #fff; color: #444; font-size: 14px; font-weight: 600; cursor: pointer; transition: .15s;
}
.btn:hover { opacity: .85; }
.btn.primary { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.btn.lg { padding: 12px 36px; font-size: 15px; }
.btn.disabled { opacity: .4; cursor: not-allowed; }

.small { font-size: 12px; }
.muted { color: #595959; }
</style>
