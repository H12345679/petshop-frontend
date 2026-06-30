<template>
  <div id="checkout-page">
    <AppHeader />

    <div class="container">
      <!-- 步骤条 -->
      <div class="steps">
        <span class="step"><span class="step-dot">1</span>购物车</span><span class="step-bar"></span>
        <span class="step on"><span class="step-dot">2</span>确认订单</span><span class="step-bar"></span>
        <span class="step"><span class="step-dot">3</span>支付</span><span class="step-bar"></span>
        <span class="step"><span class="step-dot">4</span>完成</span>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <template v-if="!loading">
        <div class="row-layout">
          <!-- ========== 左列 ========== -->
          <div class="col-main">

            <!-- 收货地址 -->
            <div class="card">
              <h3 class="card-title">
                收货地址
                <span class="link" @click="manageAddress">管理地址 ›</span>
              </h3>
              <div class="addr-row">
                <div
                  v-for="addr in addresses"
                  :key="addr.id"
                  class="addr-card"
                  :class="{ selected: selectedAddressId === addr.id, 'is-default': addr.isDefault === 1 }"
                  @click="selectedAddressId = addr.id; preSettleCalc()"
                >
                  <div class="addr-top">
                    <b>{{ addr.receiver }}</b>　{{ addr.phone }}
                    <span v-if="addr.isDefault === 1" class="tag accent">默认</span>
                  </div>
                  <div class="addr-detail">{{ addr.province }} {{ addr.city }} {{ addr.district }} {{ addr.detail }}</div>
                </div>
                <div class="addr-add" @click="showAddressDialog = true">＋ 新增</div>
              </div>
            </div>

            <!-- 商品清单 -->
            <div class="card">
              <h3 class="card-title">
                商品清单
                <span class="small muted">（跨店将自动拆为多张订单）</span>
              </h3>
              <div v-for="(shop, si) in shopGroups" :key="si" style="margin-bottom:16px">
                <div class="shop-name" v-if="shop.shopName">🏬 {{ shop.shopName }}</div>
                <table class="prod-table">
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th style="width:80px">规格</th>
                      <th style="width:90px">单价</th>
                      <th style="width:60px">数量</th>
                      <th style="width:90px">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, ii) in shop.items" :key="ii">
                      <td>
                        <div class="prod-cell">
                          <img :src="item.productImage || '/logo.png'" class="prod-img" />
                          <span>{{ item.productName }}</span>
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
            </div>

            <!-- 优惠券 -->
            <div class="card">
              <h3 class="card-title">优惠券</h3>
              <div v-if="userCoupons.length === 0" class="small muted" style="margin-bottom:8px">暂无可用优惠券</div>
              <div v-else class="coupon-row">
                <div
                  v-for="coupon in visibleCoupons"
                  :key="coupon.id"
                  class="coupon-chip"
                  :class="{ selected: selectedCouponId === coupon.id }"
                  @click="selectCoupon(coupon)"
                >
                  <span class="coupon-type-tag" :class="coupon.type === 1 ? 'reduce' : 'discount'">
                    {{ coupon.type === 1 ? '减' : '折' }}
                  </span>
                  <b>{{ coupon.type === 1 ? '¥' + Number(coupon.amount).toFixed(0) : (Number(coupon.amount) * 10).toFixed(0) + '折' }}</b>
                  <span class="small muted">{{ Number(coupon.threshold) > 0 ? '满¥' + Number(coupon.threshold).toFixed(0) : '无门槛' }}</span>
                </div>
                <div
                  v-if="userCoupons.length > MAX_VISIBLE"
                  class="coupon-chip expand-chip"
                  @click="showCouponDialog = true"
                >＋ 更多优惠券 ({{ userCoupons.length - MAX_VISIBLE }})</div>
                <div
                  class="coupon-chip no-coupon"
                  :class="{ selected: selectedCouponId === null }"
                  @click="selectCoupon(null)"
                >不使用</div>
              </div>
            </div>

            <!-- 买家留言 -->
            <div class="card">
              <h3 class="card-title">买家留言</h3>
              <textarea
                v-model="remark"
                class="remark-input"
                placeholder="选填：对本次交易的备注（限50字）"
                maxlength="50"
                rows="2"
              ></textarea>
            </div>
          </div>

          <!-- ========== 右栏（金额/提交） ========== -->
          <div class="col-side">
            <div class="card sticky-card">
              <h3 class="card-title">金额明细</h3>
              <div class="price-row">
                <span class="muted">商品总额</span>
                <span>¥{{ (settleData.totalAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="price-row" v-if="settleData.memberDiscount > 0">
                <span class="muted">会员优惠</span>
                <span style="color:#27ae60">−¥{{ (settleData.memberDiscount || 0).toFixed(2) }}</span>
              </div>
              <div class="price-row" v-if="settleData.couponDiscount > 0">
                <span class="muted">优惠券减免</span>
                <span style="color:#27ae60">−¥{{ (settleData.couponDiscount || 0).toFixed(2) }}</span>
              </div>
              <div class="price-row">
                <span class="muted">运费</span>
                <span>¥{{ (settleData.freight || 0).toFixed(2) }}</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                <span>应付总额</span>
                <span class="total-price">¥{{ (settleData.payAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="small muted" style="text-align:center;margin:8px 0 12px">
                共 {{ totalQty }} 件 · 预计赠送 {{ (settleData.payAmount || 0).toFixed(0) }} 积分
              </div>
              <button
                class="submit-btn"
                :disabled="submitting || !selectedAddressId"
                @click="submitOrder"
              >{{ submitting ? '提交中…' : '提交订单' }}</button>
              <div class="small muted" style="text-align:center;margin-top:8px">提交即生成 requestId 幂等键，防止重复下单</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <AppFooter />

    <!-- 优惠券弹窗 -->
    <el-dialog title="选择优惠券" :visible.sync="showCouponDialog" width="620px">
      <div v-if="userCoupons.length === 0" class="small muted" style="text-align:center;padding:30px">暂无可用优惠券</div>
      <div v-else class="coupon-dialog-grid">
        <div
          v-for="coupon in userCoupons"
          :key="coupon.id"
          class="coupon-dialog-item"
          :class="{ selected: selectedCouponId === coupon.id }"
          @click="selectCouponFromDialog(coupon)"
        >
          <div class="cd-left" :class="coupon.type === 1 ? 'bg-reduce' : 'bg-discount'">
            <div class="cd-amount">{{ coupon.type === 1 ? '¥' + Number(coupon.amount).toFixed(0) : (Number(coupon.amount) * 10).toFixed(0) + '折' }}</div>
            <div class="cd-condition">{{ Number(coupon.threshold) > 0 ? '满¥' + Number(coupon.threshold).toFixed(0) : '无门槛' }}</div>
          </div>
          <div class="cd-mid">
            <div class="cd-name"><b>{{ coupon.name }}</b></div>
            <div class="cd-info small muted">
              {{ coupon.type === 1 ? '满减券' : '折扣券' }} · 全场通用
              · {{ formatCouponDate(coupon.startTime) }}-{{ formatCouponDate(coupon.endTime) }}
            </div>
          </div>
          <div class="cd-right">
            <span v-if="selectedCouponId === coupon.id" class="cd-check">✓ 已选</span>
            <span v-else class="cd-use">选择</span>
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="selectCouponFromDialog(null)">不使用优惠券</el-button>
        <el-button type="primary" @click="showCouponDialog = false">完成</el-button>
      </span>
    </el-dialog>

    <!-- 新增地址弹窗 -->
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
            style="width:100%"
            clearable
          />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input v-model="addressForm.detail" placeholder="街道 / 门牌号" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-checkbox v-model="addressForm.isDefault">默认地址</el-checkbox>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="showAddressDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAddress" :loading="addressSubmitting">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { addressList, addAddress } from "@/api/modules/address.js";
import { myCoupons, couponList } from "@/api/modules/coupon.js";
import { preSettle, createOrder } from "@/api/modules/order.js";
import { regionData, codeToText } from "element-china-area-data";

export default {
  name: "CheckoutView",
  components: {
    AppHeader: () => import("@/components/AppHeader.vue"),
    AppFooter: () => import("@/components/AppFooter.vue"),
  },
  data() {
    return {
      checkoutItems: [],
      addresses: [],
      userCoupons: [],
      selectedAddressId: null,
      selectedCouponId: null,
      MAX_VISIBLE: 4,
      showCouponDialog: false,
      remark: "",
      settleData: { totalAmount: 0, payAmount: 0, couponDiscount: 0, memberDiscount: 0, freight: 0 },
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
  computed: {
    totalQty() {
      return this.checkoutItems.reduce((s, i) => s + (i.quantity || 0), 0);
    },
    shopGroups() {
      const map = {};
      for (const item of this.checkoutItems) {
        const key = item.shopId || 0;
        if (!map[key]) map[key] = { shopName: item.shopName || "", items: [] };
        map[key].items.push(item);
      }
      return Object.values(map);
    },
    visibleCoupons() {
      return this.userCoupons.slice(0, this.MAX_VISIBLE);
    },
  },
  created() {
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
        const [addrRes, myCouponRes] = await Promise.all([
          addressList(),
          myCoupons(0),
        ]);
        this.addresses = addrRes.data || [];

        // 合并优惠券信息：myCoupons 仅返回 UserCoupon（含 couponId），
        // 需要用 couponList() 补全 name/type/amount/threshold
        const raw = myCouponRes.data || [];
        if (raw.length > 0) {
          try {
            const cr = await couponList();
            const infoMap = {};
            (cr.data || []).forEach(c => { infoMap[c.id] = c; });
            this.userCoupons = raw.map(uc => {
              const info = infoMap[uc.couponId] || null;
              return {
                id: uc.id,
                couponId: uc.couponId,
                name: info ? info.name : '优惠券',
                type: info ? info.type : 1,
                amount: info ? info.amount : 0,
                threshold: info ? info.threshold : 0,
                startTime: info ? info.startTime : null,
                endTime: info ? info.endTime : null,
              };
            });
          } catch (e) {
            this.userCoupons = [];
          }
        } else {
          this.userCoupons = [];
        }

        const def = this.addresses.find((a) => a.isDefault === 1);
        if (def) this.selectedAddressId = def.id;
        else if (this.addresses.length > 0) this.selectedAddressId = this.addresses[0].id;

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
      if (coupon === null) {
        this.selectedCouponId = null;
      } else if (this.selectedCouponId === coupon.id) {
        this.selectedCouponId = null;
      } else {
        this.selectedCouponId = coupon.id;
      }
      this.preSettleCalc();
    },

    selectCouponFromDialog(coupon) {
      if (coupon === null) {
        this.selectedCouponId = null;
      } else {
        this.selectedCouponId = coupon.id;
      }
      this.showCouponDialog = false;
      this.preSettleCalc();
    },

    formatCouponDate(t) {
      return t ? t.substring(5, 10) : '';
    },

    manageAddress() {
      this.$router.push("/user/center?tab=address");
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
        this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefault: false };
        this.regionCode = [];
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
#checkout-page { background: #f4f5f7; min-height: 100vh; display:flex; flex-direction:column; }
.container { width: 1100px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }

.loading-wrap { text-align:center; padding:80px 0; color:#999; }

/* ===== 步骤条 ===== */
.steps { display:flex; align-items:center; justify-content:center; margin-bottom:24px; gap:0; }
.step { display:flex; align-items:center; gap:6px; font-size:14px; color:#999; font-weight:500; }
.step.on { color:#6b8dd6; font-weight:700; }
.step-dot { display:inline-flex; width:26px; height:26px; border-radius:50%; align-items:center; justify-content:center; font-size:13px; font-weight:700; background:#e8e8e8; color:#fff; }
.step.on .step-dot { background:linear-gradient(135deg,#6b8dd6,#8e37d7); }
.step-bar { display:inline-block; width:60px; height:2px; background:#e0e0e0; margin:0 12px; }
.step.on + .step-bar { background:#6b8dd6; }

/* ===== 两栏布局 ===== */
.row-layout { display:flex; gap:20px; align-items:flex-start; }
.col-main { flex:1; min-width:0; }
.col-side { width:300px; flex-shrink:0; }

/* ===== 卡片 ===== */
.card { background:#fff; border-radius:12px; padding:20px 24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.card-title { font-size:16px; font-weight:600; color:#2c3e50; margin:0 0 14px; display:flex; justify-content:space-between; align-items:center; }
.sticky-card { position:sticky; top:10px; }

/* ===== 地址 ===== */
.addr-row { display:flex; gap:8px; flex-wrap:wrap; }
.addr-card { flex:1; min-width:200px; border:2px solid #e8e8e8; border-radius:8px; padding:10px 12px; cursor:pointer; transition:all .2s; }
.addr-card:hover { border-color:#6b8dd6; }
.addr-card.selected { border-color:#6b8dd6; background:#f0f6ff; }
.addr-card.is-default { border-color:#6b8dd6; }
.addr-top { font-size:14px; margin-bottom:6px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.addr-detail { font-size:12px; color:#999; }
.addr-add { width:90px; border:1px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px; cursor:pointer; flex-shrink:0; }
.addr-add:hover { border-color:#6b8dd6; color:#6b8dd6; }

.tag { font-size:11px; padding:1px 8px; border-radius:4px; }
.tag.accent { background:#eef4ff; color:#6b8dd6; font-weight:600; }

/* ===== 商品表格 ===== */
.shop-name { font-size:13px; color:#666; font-weight:500; margin-bottom:6px; }
.prod-table { width:100%; border-collapse:collapse; font-size:13px; }
.prod-table th { background:#f7f8fa; padding:8px 10px; text-align:left; font-weight:600; color:#666; border-bottom:1px solid #eee; }
.prod-table td { padding:10px; border-bottom:1px solid #f5f5f5; vertical-align:middle; }
.prod-table tr:last-child td { border-bottom:none; }
.prod-cell { display:flex; align-items:center; gap:10px; }
.prod-img { width:44px; height:44px; border-radius:6px; object-fit:cover; background:#f5f5f5; flex-shrink:0; }
.price { color:#e74c3c; font-weight:600; }

/* ===== 优惠券 ===== */
.coupon-row { display:flex; gap:8px; flex-wrap:wrap; }
.coupon-chip { border:2px solid #e8e8e8; border-radius:8px; padding:8px 14px; font-size:13px; cursor:pointer; transition:all .2s; }
.coupon-chip:hover { border-color:#6b8dd6; }
.coupon-chip.selected { border-color:#6b8dd6; background:#f0f6ff; }
.coupon-chip.no-coupon { border-style:dashed; color:#999; }
.coupon-chip.no-coupon.selected { border-style:solid; }
.coupon-chip.expand-chip { border-style:dashed; color:#6b8dd6; border-color:#6b8dd6; font-weight:600; }
.coupon-chip.expand-chip:hover { background:#f0f6ff; }

.coupon-type-tag { display:inline-block; font-size:10px; padding:1px 5px; border-radius:3px; margin-right:4px; font-weight:600; }
.coupon-type-tag.reduce { background:#fff3e0; color:#f57c00; }
.coupon-type-tag.discount { background:#fce4ec; color:#e91e63; }

/* ===== 优惠券弹窗 ===== */
.coupon-dialog-grid { display:flex; flex-direction:column; gap:10px; max-height:420px; overflow-y:auto; }
.coupon-dialog-item { display:flex; border:2px solid #e8e8e8; border-radius:8px; overflow:hidden; cursor:pointer; transition:border-color .2s; }
.coupon-dialog-item:hover { border-color:#6b8dd6; }
.coupon-dialog-item.selected { border-color:#6b8dd6; background:#f0f6ff; }
.cd-left { width:80px; flex-shrink:0; padding:14px 0; text-align:center; color:#fff; display:flex; flex-direction:column; justify-content:center; }
.cd-left.bg-reduce { background:#ffb96b; }
.cd-left.bg-discount { background:#ff7a7a; }
.cd-amount { font-size:20px; font-weight:800; }
.cd-condition { font-size:11px; opacity:.9; margin-top:2px; }
.cd-mid { flex:1; padding:12px 14px; min-width:0; display:flex; flex-direction:column; justify-content:center; }
.cd-name { font-size:14px; color:#2c3e50; margin-bottom:4px; }
.cd-info { font-size:11px; color:#888; }
.cd-right { width:70px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.cd-use { font-size:12px; color:#6b8dd6; font-weight:600; }
.cd-check { font-size:12px; color:#27ae60; font-weight:700; }

/* ===== 留言 ===== */
.remark-input { width:100%; padding:10px 14px; border:1px solid #e0e0e0; border-radius:8px; font-size:14px; resize:vertical; outline:none; font-family:inherit; box-sizing:border-box; }
.remark-input:focus { border-color:#6b8dd6; }

/* ===== 金额明细 ===== */
.price-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; color:#333; }
.divider { border-top:1px solid #eee; margin:10px 0; }
.total-row { display:flex; justify-content:space-between; align-items:center; }
.total-price { font-size:26px; font-weight:700; color:#e74c3c; }
.muted { color:#999; }
.small { font-size:12px; }

/* ===== 提交按钮 ===== */
.submit-btn {
  display:block; width:100%; padding:14px 0;
  background:linear-gradient(135deg,#6b8dd6,#8e37d7);
  color:#fff; border:none; border-radius:100px;
  font-size:16px; font-weight:600; cursor:pointer;
  transition:opacity .2s;
}
.submit-btn:hover:not(:disabled) { opacity:.9; }
.submit-btn:disabled { opacity:.4; cursor:not-allowed; }

.link { color:#6b8dd6; cursor:pointer; font-size:13px; font-weight:600; }
.link:hover { opacity:.8; }
</style>
