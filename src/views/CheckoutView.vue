<template>
  <div id="checkout-page">
    <div class="checkout-container">
      <h1 class="page-title">📋 确认订单</h1>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap"><span class="loading-icon">⏳</span> 加载中…</div>

      <div v-if="!loading" class="checkout-content">
        <!-- ===== 收货地址 ===== -->
        <section class="section">
          <div class="section-header">
            <h2>📍 收货地址</h2>
            <span class="link" @click="showAddressDialog = true">+ 新增</span>
          </div>
          <div v-if="addresses.length === 0" class="section-empty">请添加收货地址</div>
          <div v-else class="address-list">
            <div
              v-for="addr in addresses"
              :key="addr.id"
              class="address-card"
              :class="{ selected: selectedAddressId === addr.id }"
              @click="selectedAddressId = addr.id"
            >
              <div class="addr-top">
                <span class="addr-receiver">{{ addr.receiver }}</span>
                <span class="addr-phone">{{ addr.phone }}</span>
                <span v-if="addr.isDefault === 1" class="default-tag">默认</span>
              </div>
              <div class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</div>
            </div>
          </div>
        </section>

        <!-- ===== 商品清单 ===== -->
        <section class="section">
          <div class="section-header">
            <h2>📦 商品清单</h2>
          </div>
          <div class="order-items">
            <div v-for="(item, idx) in checkoutItems" :key="idx" class="order-item">
              <img :src="item.productImage || '/logo.png'" class="oi-img" />
              <div class="oi-info">
                <div class="oi-name">{{ item.productName }}</div>
                <div class="oi-spec" v-if="item.specName">{{ item.specName }}</div>
              </div>
              <div class="oi-price">¥{{ (item.price || 0).toFixed(2) }}</div>
              <div class="oi-qty">× {{ item.quantity }}</div>
              <div class="oi-subtotal">¥{{ ((item.price || 0) * item.quantity).toFixed(2) }}</div>
            </div>
          </div>
        </section>

        <!-- ===== 优惠券 ===== -->
        <section class="section">
          <div class="section-header">
            <h2>🎫 优惠券</h2>
          </div>
          <div v-if="userCoupons.length === 0" class="section-empty">暂无可用优惠券</div>
          <div v-else class="coupon-list">
            <div
              v-for="coupon in userCoupons"
              :key="coupon.id"
              class="coupon-item"
              :class="{ selected: selectedCouponId === coupon.id }"
              @click="selectCoupon(coupon)"
            >
              <div class="coupon-left">
                <span class="coupon-amount" v-if="coupon.type === 1">¥{{ coupon.amount }}</span>
                <span class="coupon-amount" v-else>{{ (coupon.amount * 10) }}折</span>
                <span class="coupon-desc">{{ coupon.name }}</span>
              </div>
              <div class="coupon-right">
                <span v-if="selectedCouponId === coupon.id">✅</span>
                <span v-else>未使用</span>
              </div>
            </div>
          </div>
          <div v-if="selectedCouponId" class="selected-coupon-info">
            已选优惠，<span class="link" @click="selectedCouponId = null; preSettleCalc()">不使用</span>
          </div>
        </section>

        <!-- ===== 金额明细 ===== -->
        <section class="section">
          <div class="section-header"><h2>💰 金额明细</h2></div>
          <div class="price-detail">
            <div class="price-row">
              <span>商品总额</span>
              <span>¥{{ (settleData.totalAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="price-row" v-if="settleData.couponDiscount > 0">
              <span>优惠券减免</span>
              <span class="discount-text">-¥{{ (settleData.couponDiscount || 0).toFixed(2) }}</span>
            </div>
            <div class="price-row total-row">
              <span>实付金额</span>
              <span class="final-price">¥{{ (settleData.payAmount || 0).toFixed(2) }}</span>
            </div>
          </div>
        </section>

        <!-- ===== 备注 ===== -->
        <section class="section">
          <div class="section-header"><h2>📝 订单备注</h2></div>
          <textarea
            v-model="remark"
            class="remark-input"
            placeholder="选填：给商家的备注信息"
            rows="2"
          ></textarea>
        </section>

        <!-- ===== 新增地址弹窗 ===== -->
        <el-dialog title="新增收货地址" :visible.sync="showAddressDialog" width="500px">
          <el-form :model="addressForm" label-width="80px" size="small">
            <el-form-item label="收货人" required>
              <el-input v-model="addressForm.receiver" placeholder="请输入收货人姓名" />
            </el-form-item>
            <el-form-item label="手机号" required>
              <el-input v-model="addressForm.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="所在地区" required>
              <el-cascader
                v-model="regionCode"
                :options="regionData"
                :props="{ label: 'label', value: 'value', children: 'children' }"
                placeholder="请选择省/市/区"
                @change="handleRegionChange"
                style="width: 100%"
                clearable
              />
            </el-form-item>
          </el-form>
          <span slot="footer">
            <el-button @click="showAddressDialog = false">取消</el-button>
            <el-button type="primary" @click="submitAddress" :loading="addressSubmitting">保存</el-button>
          </span>
        </el-dialog>

        <!-- ===== 提交按钮 ===== -->
        <div class="submit-bar">
          <div class="submit-left">
            <span>合计：</span>
            <span class="final-price">¥{{ (settleData.payAmount || 0).toFixed(2) }}</span>
          </div>
          <button class="submit-btn" :disabled="submitting || !selectedAddressId" @click="submitOrder">
            {{ submitting ? '提交中…' : '提交订单' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { addressList, addAddress } from "@/api/modules/address.js";
import { myCoupons } from "@/api/modules/coupon.js";
import { preSettle, createOrder, payOrder } from "@/api/modules/order.js";
import { regionData, codeToText } from "element-china-area-data";

export default {
  name: "CheckoutView",
  data() {
    return {
      checkoutItems: [],
      addresses: [],
      userCoupons: [],
      selectedAddressId: null,
      selectedCouponId: null,
      remark: "",
      settleData: { totalAmount: 0, payAmount: 0, couponDiscount: 0, memberDiscount: 0 },
      loading: true,
      submitting: false,
      showAddressDialog: false,
      addressForm: {
        receiver: "",
        phone: "",
        province: "",
        city: "",
        district: "",
        detail: "",
        isDefault: false,
      },
      addressSubmitting: false,
      regionCode: [],
      regionData: regionData,
    };
  },
  created() {
    // 从 localStorage 读取结算商品
    try {
      const raw = localStorage.getItem("CHECKOUT_ITEMS");
      this.checkoutItems = raw ? JSON.parse(raw) : [];
      if (!this.checkoutItems || this.checkoutItems.length === 0) {
        this.$message.error("没有要结算的商品");
        this.$router.push("/cart");
        return;
      }
    } catch (e) {
      this.$router.push("/cart");
      return;
    }
    this.initData();
  },
  methods: {
    async initData() {
      this.loading = true;
      try {
        const [addrRes, couponRes] = await Promise.all([
          addressList(),
          myCoupons(0), // 未使用的优惠券
        ]);
        this.addresses = addrRes.data || [];
        this.userCoupons = couponRes.data || [];

        // 默认选中默认地址
        const def = this.addresses.find((a) => a.isDefault === 1);
        if (def) this.selectedAddressId = def.id;
        else if (this.addresses.length > 0) this.selectedAddressId = this.addresses[0].id;

        // 首次试算
        this.preSettleCalc();
      } catch (e) {
        this.$message.error("加载数据失败：" + e.message);
      } finally {
        this.loading = false;
      }
    },

    async preSettleCalc() {
      try {
        const items = this.checkoutItems.map((i) => ({
          productId: i.productId,
          skuId: i.skuId || 0,
          quantity: i.quantity,
        }));
        const data = await preSettle({
          items,
          couponId: this.selectedCouponId || 0,
          addressId: this.selectedAddressId || 0,
        });
        this.settleData = data.data || {};
      } catch (e) {
        console.error("试算失败", e);
      }
    },

    selectCoupon(coupon) {
      if (this.selectedCouponId === coupon.id) {
        this.selectedCouponId = null;
      } else {
        this.selectedCouponId = coupon.id;
      }
      this.preSettleCalc();
    },

    async submitOrder() {
      if (!this.selectedAddressId) {
        this.$message.warning("请选择收货地址");
        return;
      }
      this.submitting = true;
      try {
        const requestId = this.generateUUID();
        const items = this.checkoutItems.map((i) => ({
          productId: i.productId,
          skuId: i.skuId || 0,
          quantity: i.quantity,
        }));

        const res = await createOrder({
          requestId,
          couponId: this.selectedCouponId || 0,
          addressId: this.selectedAddressId,
          items,
          remark: this.remark,
        });

        const orderData = res.data || {};
        const orderIds = orderData.orderIds || [];
        const orderNos = orderData.orderNos || [];

        // 清购物车缓存
        localStorage.removeItem("CHECKOUT_ITEMS");

        this.$alert(
          `订单创建成功！订单号：${orderNos.join("、")}`,
          "下单成功",
          {
            confirmButtonText: "去支付",
            callback: () => {
              if (orderIds.length === 1) {
                this.$router.push(`/order/${orderIds[0]}`);
              } else {
                this.$router.push("/orders");
              }
            },
          }
        );
      } catch (e) {
        this.$message.error(e.message || "下单失败");
      } finally {
        this.submitting = false;
      }
    },

    handleRegionChange(val) {
      if (val && val.length === 3) {
        this.addressForm.province = codeToText[val[0]] || "";
        this.addressForm.city = codeToText[val[1]] || "";
        this.addressForm.district = codeToText[val[2]] || "";
      } else {
        this.addressForm.province = "";
        this.addressForm.city = "";
        this.addressForm.district = "";
      }
    },

    async submitAddress() {
      const f = this.addressForm;
      if (!f.receiver || !f.phone || !f.province || !f.city || !f.district || !f.detail) {
        this.$message.warning("请填写完整的地址信息");
        return;
      }
      this.addressSubmitting = true;
      try {
        await addAddress({
          receiver: f.receiver,
          phone: f.phone,
          province: f.province,
          city: f.city,
          district: f.district,
          detail: f.detail,
          isDefault: f.isDefault ? 1 : 0,
        });
        this.$message.success("地址添加成功");
        this.showAddressDialog = false;
        // 重置表单
        this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefault: false };
        this.regionCode = [];
        // 刷新地址列表
        const addrRes = await addressList();
        this.addresses = addrRes.data || [];
        const def = this.addresses.find((a) => a.isDefault === 1);
        if (def) this.selectedAddressId = def.id;
        else if (this.addresses.length > 0) this.selectedAddressId = this.addresses[0].id;
        this.preSettleCalc();
      } catch (e) {
        this.$message.error(e.message || "添加地址失败");
      } finally {
        this.addressSubmitting = false;
      }
    },

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },
  },
};
</script>

<style scoped>
.checkout-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 100px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 24px;
}
.loading-wrap {
  text-align: center;
  padding: 80px 0;
  color: #999;
}
.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}
.section-empty {
  text-align: center;
  padding: 20px;
  color: #999;
}

/* 地址 */
.address-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.address-card {
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.address-card:hover {
  border-color: #6b8dd6;
}
.address-card.selected {
  border-color: #6b8dd6;
  background: #f6f9ff;
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.addr-receiver {
  font-weight: 600;
  font-size: 15px;
}
.addr-phone {
  color: #666;
  font-size: 14px;
}
.default-tag {
  font-size: 11px;
  background: #6b8dd6;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
}
.addr-detail {
  font-size: 14px;
  color: #666;
}

/* 商品清单 */
.order-items {
  border-top: 1px solid #f0f0f0;
}
.order-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;
}
.oi-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  background: #f5f5f5;
}
.oi-info { flex: 1; min-width: 0; }
.oi-name { font-size: 14px; font-weight: 500; }
.oi-spec { font-size: 12px; color: #999; margin-top: 2px; }
.oi-price { flex: 0 0 70px; text-align: right; color: #666; font-size: 14px; }
.oi-qty { flex: 0 0 40px; text-align: center; color: #999; }
.oi-subtotal { flex: 0 0 80px; text-align: right; font-weight: 600; color: #e74c3c; }

/* 优惠券 */
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.coupon-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.coupon-item:hover {
  border-color: #6b8dd6;
}
.coupon-item.selected {
  border-color: #6b8dd6;
  background: #f6f9ff;
}
.coupon-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.coupon-amount {
  font-size: 20px;
  font-weight: 700;
  color: #e74c3c;
}
.coupon-desc {
  font-size: 14px;
  color: #666;
}
.selected-coupon-info {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
  text-align: right;
}

/* 金额明细 */
.price-detail {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
.price-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #666;
}
.discount-text { color: #27ae60; }
.total-row { border-top: 1px solid #eee; padding-top: 12px; margin-top: 8px; }
.final-price { font-size: 24px; font-weight: 700; color: #e74c3c; }

/* 备注 */
.remark-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
}
.remark-input:focus {
  border-color: #6b8dd6;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 24px;
  padding: 12px 32px;
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 100;
}
.submit-left {
  font-size: 16px;
  color: #666;
}
.submit-btn {
  padding: 12px 56px;
  background: linear-gradient(135deg, #6b8dd6, #8e37d7);
  color: #fff;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.submit-btn:hover:not(:disabled) { opacity: 0.9; }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.link { color: #6b8dd6; cursor: pointer; font-weight: 600; }
.link:hover { opacity: 0.8; }
</style>
