<template>
  <div id="checkout-page">
    <AppHeader />
    <div class="checkout-wrap">
      <!-- 步骤条 -->
      <div class="steps">
        <span class="step"><span class="dot">1</span>购物车</span><span class="bar"></span>
        <span class="step on"><span class="dot">2</span>确认订单</span><span class="bar"></span>
        <span class="step"><span class="dot">3</span>支付</span><span class="bar"></span>
        <span class="step"><span class="dot">4</span>完成</span>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <div v-if="!loading" class="row">
        <!-- 左栏 -->
        <div class="col">
          <!-- 收货地址 -->
          <div class="card">
            <h3>收货地址 <router-link to="/addresses" class="more">管理地址 ›</router-link></h3>
            <div class="addr-grid">
              <div
                v-for="addr in addresses"
                :key="addr.id"
                :class="['addr-card', { selected: selectedAddressId === addr.id }]"
                @click="selectedAddressId = addr.id"
              >
                <div class="addr-top">
                  <b>{{ addr.receiver }}</b>　{{ addr.phone }}
                  <span v-if="addr.isDefault === 1" class="tag accent">默认</span>
                </div>
                <div class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</div>
              </div>
              <div class="addr-add" @click="showAddressDialog = true">＋ 新增</div>
            </div>
          </div>

          <!-- 商品清单（按店拆单，每店一个卡片 + table） -->
          <div
            v-for="(shop, si) in shopGroups"
            :key="si"
            class="card"
          >
            <h3>商品明细　<span class="small muted">{{ shop.shopName || '店铺' }}</span></h3>
            <table class="tbl">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>规格</th>
                  <th style="width:90px">单价</th>
                  <th style="width:60px">数量</th>
                  <th style="width:90px">小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in shop.items" :key="(item.cartId || item.productId) + '_' + (item.skuId || 0)">
                  <td>
                    <div class="prod-cell">
                      <div class="prod-img"><img :src="item.productImage || '/logo.png'" :alt="item.productName" /></div>
                      {{ item.productName }}
                    </div>
                  </td>
                  <td class="small muted">{{ item.specName || '—' }}</td>
                  <td class="price">¥{{ (item.price || 0).toFixed(2) }}</td>
                  <td>{{ item.quantity }}</td>
                  <td class="price">¥{{ ((item.price || 0) * item.quantity).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 优惠券 -->
          <div class="card">
            <h3>优惠券</h3>
            <div v-if="userCoupons.length === 0" class="small muted">暂无可用优惠券</div>
            <div v-else class="coupon-chips">
              <div
                v-for="c in visibleCoupons"
                :key="c.id"
                :class="['coupon-chip', { on: selectedCouponId === c.id }]"
                @click="selectCoupon(c)"
              >
                {{ c.type === 1 ? '¥' + Number(c.amount).toFixed(0) : (Number(c.amount) * 10).toFixed(0) + '折' }}
                · {{ c.name }}
                <span class="small muted" v-if="selectedCouponId === c.id">· 已选用</span>
                <span class="small muted" v-else-if="!couponUsable(c)">· 不满足</span>
              </div>
              <div
                v-if="hiddenCoupons.length > 0"
                class="coupon-more"
                @click="showCouponDialog = true"
              >＋ 更多优惠券（{{ hiddenCoupons.length }}）</div>
              <div :class="['coupon-chip', { on: selectedCouponId === null }]" @click="selectedCouponId = null; preSettleCalc()" style="border-style:dashed">不使用优惠券</div>
            </div>
          </div>

          <!-- 买家留言 -->
          <div class="card">
            <h3>买家留言</h3>
            <textarea v-model="remark" class="remark-input" placeholder="选填：对本次交易的备注（限50字）" maxlength="50" rows="2"></textarea>
          </div>
        </div>

        <!-- 右栏：金额试算 -->
        <div class="right-col">
          <div class="card settle-card">
            <h3>金额明细</h3>
            <div class="price-row"><span class="muted">商品总额</span><span>¥{{ (settleData.totalAmount || 0).toFixed(2) }}</span></div>
            <div class="price-row" v-if="settleData.memberDiscount > 0"><span class="muted">会员优惠</span><span class="discount">−¥{{ (settleData.memberDiscount || 0).toFixed(2) }}</span></div>
            <div class="price-row" v-if="settleData.couponDiscount > 0"><span class="muted">优惠券</span><span class="discount">−¥{{ (settleData.couponDiscount || 0).toFixed(2) }}</span></div>
            <div class="price-row"><span class="muted">运费</span><span>¥0.00</span></div>
            <div class="total-row">
              <span>应付总额</span><span class="total-price">¥{{ (settleData.payAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="small muted mb12">共 {{ totalQty }} 件 · 预计赠送 {{ Math.floor(settleData.payAmount || 0) }} 积分</div>
            <button class="btn primary block lg" :disabled="submitting || !selectedAddressId" @click="submitOrder">
              {{ submitting ? '提交中…' : '提交订单' }}
            </button>
            <div class="small muted mt8" style="text-align:center">提交即生成 requestId 幂等键，防止重复下单</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 优惠券弹窗 -->
    <el-dialog title="选择优惠券" :visible.sync="showCouponDialog" width="480px">
      <div v-if="userCoupons.length === 0" style="text-align:center;padding:30px;color:#999">暂无可用优惠券</div>
      <div v-else class="dialog-coupons">
        <div
          v-for="c in userCoupons"
          :key="c.id"
          :class="['coupon-chip', 'block', { on: selectedCouponId === c.id }]"
          @click="selectCoupon(c); showCouponDialog = false"
        >
          <span class="c-type" :class="c.type === 1 ? 'reduce' : 'discount'">{{ c.type === 1 ? '¥' + Number(c.amount).toFixed(0) : (Number(c.amount) * 10).toFixed(0) + '折' }}</span>
          <span>{{ c.name }}</span>
          <span class="small muted">· {{ Number(c.threshold) > 0 ? '满¥' + Number(c.threshold).toFixed(0) : '无门槛' }}</span>
          <span v-if="selectedCouponId === c.id" class="tag accent" style="margin-left:auto">已选</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增地址弹窗 -->
    <el-dialog title="新增收货地址" :visible.sync="showAddressDialog" width="500px">
      <el-form :model="addressForm" label-width="80px" size="small">
        <el-form-item label="收货人" required><el-input v-model="addressForm.receiver" placeholder="收货人姓名" /></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="addressForm.phone" placeholder="手机号" maxlength="11" /></el-form-item>
        <el-form-item label="所在地区" required>
          <el-cascader v-model="regionCode" :options="regionData" :props="{ label:'label', value:'value', children:'children' }" placeholder="请选择省/市/区" @change="handleRegionChange" style="width:100%" clearable />
        </el-form-item>
        <el-form-item label="详细地址" required><el-input v-model="addressForm.detail" placeholder="街道门牌号" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="showAddressDialog = false">取消</el-button>
        <el-button type="primary" :loading="addressSubmitting" @click="submitAddress">保存</el-button>
      </span>
    </el-dialog>

    <AppFooter />
  </div>
</template>

<script>
import { addressList, addAddress } from "@/api/modules/address.js";
import { myCoupons, couponList } from "@/api/modules/coupon.js";
import { preSettle, createOrder } from "@/api/modules/order.js";
import { regionData, codeToText } from "element-china-area-data";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "CheckoutView",
  components: { AppHeader, AppFooter },
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
      showCouponDialog: false,
      addressForm: { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefault: false },
      addressSubmitting: false,
      regionCode: [],
      regionData,
    };
  },
  computed: {
    visibleCoupons() { return this.userCoupons.slice(0, 4); },
    hiddenCoupons() { return this.userCoupons.slice(4); },
    totalQty() { return this.checkoutItems.reduce((s, i) => s + i.quantity, 0); },
    shopGroups() {
      const map = {};
      this.checkoutItems.forEach((i) => {
        const k = i.shopName || 'default';
        if (!map[k]) map[k] = { shopName: i.shopName, items: [] };
        map[k].items.push(i);
      });
      return Object.values(map);
    },
  },
  created() {
    try {
      const raw = localStorage.getItem("CHECKOUT_ITEMS");
      this.checkoutItems = raw ? JSON.parse(raw) : [];
      if (!this.checkoutItems.length) { this.$message.error("没有要结算的商品"); this.$router.push("/cart"); return; }
    } catch (e) { this.$router.push("/cart"); return; }
    this.initData();
  },
  methods: {
    async initData() {
      this.loading = true;
      try {
        const [addrRes, myRes, allRes] = await Promise.all([addressList(), myCoupons(0), couponList()]);
        this.addresses = addrRes.data || [];
        const allMap = {};
        (allRes.data || []).forEach(c => { allMap[c.id] = c; });
        this.userCoupons = (myRes.data || []).map(uc => {
          const info = allMap[uc.couponId] || {};
          return { ...uc, name: info.name || '优惠券', type: info.type, amount: info.amount, threshold: info.threshold || 0, endTime: info.endTime };
        });
        const def = this.addresses.find(a => a.isDefault === 1);
        this.selectedAddressId = def ? def.id : (this.addresses[0] || {}).id;
        this.preSettleCalc();
      } catch (e) { this.$message.error("加载失败：" + e.message); }
      finally { this.loading = false; }
    },
    couponUsable(c) { return Number(c.threshold || 0) <= (this.settleData.totalAmount || 0); },
    async preSettleCalc() {
      try {
        const items = this.checkoutItems.map(i => ({ cartId: i.cartId, productId: i.productId, skuId: i.skuId || 0, quantity: i.quantity }));
        const res = await preSettle({ items, couponId: this.selectedCouponId || 0, addressId: this.selectedAddressId || 0 });
        this.settleData = res.data || {};
      } catch (e) { /* ignore */ }
    },
    selectCoupon(coupon) {
      this.selectedCouponId = this.selectedCouponId === coupon.id ? null : coupon.id;
      this.preSettleCalc();
    },
    handleRegionChange(val) {
      if (val && val.length === 3) {
        this.addressForm.province = codeToText[val[0]] || "";
        this.addressForm.city = codeToText[val[1]] || "";
        this.addressForm.district = codeToText[val[2]] || "";
      } else { this.addressForm.province = ""; this.addressForm.city = ""; this.addressForm.district = ""; }
    },
    async submitAddress() {
      const f = this.addressForm;
      if (!f.receiver || !f.phone || !f.province || !f.city || !f.district || !f.detail) return this.$message.warning("请填写完整地址");
      this.addressSubmitting = true;
      try {
        await addAddress({ receiver: f.receiver, phone: f.phone, province: f.province, city: f.city, district: f.district, detail: f.detail, isDefault: f.isDefault ? 1 : 0 });
        this.$message.success("地址添加成功");
        this.showAddressDialog = false;
        const addrRes = await addressList();
        this.addresses = addrRes.data || [];
        if (!this.selectedAddressId && this.addresses.length) this.selectedAddressId = this.addresses[0].id;
        this.preSettleCalc();
      } catch (e) { this.$message.error(e.message || "添加失败"); }
      finally { this.addressSubmitting = false; }
    },
    async submitOrder() {
      if (!this.selectedAddressId) return this.$message.warning("请选择收货地址");
      this.submitting = true;
      try {
        const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
        const items = this.checkoutItems.map(i => ({ cartId: i.cartId, productId: i.productId, skuId: i.skuId || 0, quantity: i.quantity }));
        const res = await createOrder({ requestId, couponId: this.selectedCouponId || 0, addressId: this.selectedAddressId, items, remark: this.remark });
        const d = res.data || {};
        localStorage.removeItem("CHECKOUT_ITEMS");
        const ids = d.orderIds || []; const nos = d.orderNos || [];
        if (ids.length === 0) throw new Error("订单创建失败：未返回订单ID");
        try {
          const { getUserInfo } = await import("@/api/modules/user.js");
          const { setStore } = await import("@/libs/storage.js");
          const userRes = await getUserInfo();
          if (userRes && userRes.data) setStore("userInfo", JSON.stringify(userRes.data));
        } catch (_) { /* ignore */ }
        localStorage.setItem("PAYMENT_ORDER_IDS", JSON.stringify(ids));
        this.$message.success("订单创建成功！");
        if (ids.length === 1) {
          this.$router.push(`/order/${ids[0]}`);
        } else {
          this.$router.push("/payment");
        }
      } catch (e) { this.$message.error(e.message || "下单失败"); }
      finally { this.submitting = false; }
    },
  },
};
</script>

<style scoped>
#checkout-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.checkout-wrap { max-width: 1080px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.loading-wrap { text-align: center; padding: 80px; color: #999; }

/* 步骤条 */
.steps { display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
.step { display: flex; align-items: center; color: #888; font-size: 13px; }
.step .dot { width: 22px; height: 22px; border-radius: 50%; background: #dfe3e9; color: #777; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 6px; }
.step.on { color: #5b8def; }
.step.on .dot { background: #5b8def; color: #fff; }
.bar { width: 46px; height: 2px; background: #cfd4da; margin: 0 10px; }

/* 两栏 */
.row { display: flex; gap: 16px; align-items: flex-start; }
.col { flex: 1; min-width: 0; }
.right-col { width: 300px; flex-shrink: 0; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.card h3 { margin: 0 0 12px; font-size: 15px; }
.more { float: right; font-size: 12px; color: #5b8def; font-weight: 400; text-decoration: none; }
.more:hover { opacity: 0.8; }

/* 地址 */
.addr-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.addr-card { flex: 1; min-width: 200px; border: 2px solid #cfd4da; border-radius: 6px; padding: 10px; cursor: pointer; transition: .15s; }
.addr-card:hover { border-color: #5b8def; }
.addr-card.selected { border-color: #5b8def; background: #e7eefc; }
.addr-top { margin-bottom: 4px; font-size: 13px; }
.addr-detail { font-size: 12px; color: #888; }
.addr-add { min-width: 90px; height: 70px; border: 1px dashed #cfd4da; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 12px; cursor: pointer; }
.addr-add:hover { border-color: #5b8def; color: #5b8def; }

/* 商品表格 */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { background: #f7f8fa; text-align: left; padding: 10px; border-bottom: 1px solid #cfd4da; color: #555; font-weight: 600; white-space: nowrap; }
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafbfc; }
.prod-cell { display: flex; align-items: center; gap: 8px; }
.prod-img { width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.price { color: #d9534f; font-weight: 700; }

/* 优惠券 */
.coupon-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.coupon-chip {
  padding: 8px 14px; border: 1px solid #cfd4da; border-radius: 6px; font-size: 13px;
  cursor: pointer; transition: .15s; background: #fff;
}
.coupon-chip:hover { border-color: #5b8def; }
.coupon-chip.on { border-color: #5b8def; background: #e7eefc; }
.coupon-chip.block { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.coupon-more { padding: 8px 14px; border: 1px dashed #cfd4da; border-radius: 6px; font-size: 13px; color: #5b8def; cursor: pointer; }
.coupon-more:hover { background: #f7faff; }
.c-type { padding: 2px 10px; border-radius: 4px; color: #fff; font-weight: 700; font-size: 12px; }
.c-type.reduce { background: #e74c3c; }
.c-type.discount { background: #e67e22; }
.dialog-coupons { max-height: 400px; overflow-y: auto; }

/* 买家留言 */
.remark-input { width: 100%; padding: 9px 12px; border: 1px solid #cfd4da; border-radius: 6px; font-size: 13px; resize: vertical; outline: none; font-family: inherit; color: #666; }
.remark-input:focus { border-color: #5b8def; }

/* 金额明细 */
.settle-card { position: sticky; top: 80px; }
.price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #555; }
.total-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cfd4da; margin: 10px 0; padding-top: 10px; }
.total-price { font-size: 26px; color: #d9534f; font-weight: 700; }
.discount { color: #4caf7d; }
.mb12 { margin-bottom: 12px; }
.mt8 { margin-top: 8px; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #9aa1aa; background: #fff; color: #444; border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; }
.btn.primary { background: #5b8def; border-color: #5b8def; color: #fff; }
.btn.block { display: flex; width: 100%; }
.btn.lg { padding: 11px 22px; font-size: 15px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 标签 */
.tag { display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px; padding: 1px 8px; font-size: 12px; color: #555; }
.tag.accent { background: #e7eefc; border-color: #bcd0f6; color: #5b8def; }

.small { font-size: 12px; }
.muted { color: #888; }

@media (max-width: 768px) {
  .row { flex-direction: column; }
  .right-col { width: 100%; }
}
</style>
