<template>
  <div class="recharge-page">
    <AppHeader />

    <div class="container">
      <div class="card recharge-card">
        <h2>💰 账户充值</h2>

        <!-- 当前余额 -->
        <div class="balance-row">
          <span class="bal-label">当前余额</span>
          <span class="bal-value">¥{{ formatBalance(currentBalance) }}</span>
        </div>

        <!-- 快捷金额 -->
        <div class="quick-amounts">
          <span
            v-for="amt in quickAmounts"
            :key="amt"
            class="amount-tag"
            :class="{ active: selectedAmount === amt }"
            @click="selectAmount(amt)"
          >¥{{ amt }}</span>
        </div>

        <!-- 自定义金额 -->
        <div class="custom-row">
          <span class="muted">或输入自定义金额</span>
          <el-input-number
            v-model="customAmount"
            :min="1"
            :max="999999"
            :precision="0"
            :step="10"
            style="width:180px"
            size="medium"
            @change="onCustomChange"
          />
          <span class="muted">元</span>
        </div>

        <!-- 充值按钮 -->
        <div class="action-row">
          <el-button type="primary" size="large" @click="handleRecharge" :loading="submitting" :disabled="!canRecharge">
            {{ submitting ? '充值中…' : '✅ 确认充值' }}
          </el-button>
        </div>

        <!-- 提示 -->
        <div class="notice">
          <p>💡 充值说明：</p>
          <p>· 充值金额会实时到账，可用于下单支付</p>
          <p>· 单次充值上限 ¥999,999</p>
          <p>· 本系统为模拟充值，无需真实付款</p>
        </div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { recharge, getMe } from "@/api/modules/user.js";

export default {
  name: "RechargeView",
  components: { AppHeader: () => import("@/components/AppHeader.vue"), AppFooter: () => import("@/components/AppFooter.vue") },
  data() {
    return {
      currentBalance: 0,
      quickAmounts: [10, 50, 100, 200, 500, 1000],
      selectedAmount: null,
      customAmount: null,
      submitting: false,
    };
  },
  computed: {
    amount() {
      return this.selectedAmount || this.customAmount || 0;
    },
    canRecharge() {
      return this.amount > 0 && !this.submitting;
    },
  },
  created() {
    this.loadBalance();
  },
  methods: {
    formatBalance(v) {
      return Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    async loadBalance() {
      try {
        const res = await getMe();
        this.currentBalance = res.data?.balance || 0;
      } catch (e) { /* ignore */ }
    },
    selectAmount(amt) {
      this.selectedAmount = amt;
      this.customAmount = null;
    },
    onCustomChange(val) {
      this.customAmount = val;
      if (val !== null && val !== undefined) {
        this.selectedAmount = null;
      }
    },
    async handleRecharge() {
      if (!this.canRecharge) return;
      this.submitting = true;
      try {
        const res = await recharge(this.amount);
        this.currentBalance = res.data?.balance || 0;
        this.$alert(
          `充值成功！当前余额：¥${this.formatBalance(this.currentBalance)}`,
          "✅ 充值成功",
          { type: "success", confirmButtonText: "好的" }
        );
        this.selectedAmount = null;
        this.customAmount = null;
      } catch (e) {
        this.$message.error(e.message || "充值失败");
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.recharge-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }
.container { width: 520px; max-width: 100%; margin: 0 auto; padding: 40px 16px; flex: 1; }
.recharge-card { padding: 32px; }
.recharge-card h2 { font-size: 22px; font-weight: 700; color: #2c3e50; margin-bottom: 24px; }

.balance-row { text-align: center; padding: 20px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 24px; }
.bal-label { font-size: 14px; color: #999; display: block; margin-bottom: 8px; }
.bal-value { font-size: 36px; font-weight: 700; color: #e74c3c; }

.quick-amounts { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px; }
.amount-tag {
  padding: 8px 20px; border: 2px solid #e6e8eb; border-radius: 8px;
  cursor: pointer; font-size: 16px; font-weight: 600; color: #555;
  transition: all 0.2s; background: #fff;
}
.amount-tag:hover { border-color: #5b8def; color: #5b8def; }
.amount-tag.active { border-color: #5b8def; background: #eef4fe; color: #5b8def; }

.custom-row { display: flex; align-items: center; gap: 10px; justify-content: center; margin-bottom: 24px; }
.custom-row .muted { font-size: 13px; color: #999; }

.action-row { text-align: center; margin-bottom: 20px; }
.action-row .el-button { padding: 12px 48px; font-size: 16px; }

.notice { background: #f9fafb; border-radius: 8px; padding: 16px; font-size: 13px; color: #999; line-height: 1.8; }
.notice p { margin: 0; }
</style>
