<template>
  <div id="cart-page">
    <AppHeader />

    <div class="container">
      <div class="section-title" v-if="!loading">
        我的购物车<span v-if="items.length">（{{ items.length }} 件商品）</span>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 空购物车 -->
      <div v-else-if="items.length === 0" class="empty-cart">
        <div class="empty-icon">🛒</div>
        <p class="empty-text">购物车空空的，去逛逛吧~</p>
        <router-link to="/products" class="go-shop-btn">去逛逛</router-link>
      </div>

      <!-- 购物车列表 -->
      <div v-else class="cart-content">
        <table class="cart-table">
          <thead>
            <tr>
              <th style="width:40px">☑</th>
              <th>商品信息</th>
              <th style="width:120px">单价</th>
              <th style="width:140px">数量</th>
              <th style="width:110px">小计</th>
              <th style="width:70px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id"
              :class="{ invalid: !item.valid }"
            >
              <td>
                <input type="checkbox"
                  :checked="item.selected === 1"
                  :disabled="!item.valid"
                  @change="toggleSelect(item)"
                />
              </td>
              <td>
                <div class="prod-info">
                  <img :src="item.productImage || '/logo.png'" class="prod-img" @click="$router.push('/product/' + item.productId)" />
                  <div class="prod-detail">
                    <div class="prod-name" @click="$router.push('/product/' + item.productId)">{{ item.productName }}</div>
                    <div class="prod-spec" v-if="item.specName">{{ item.specName }}</div>
                    <span v-if="!item.valid" class="invalid-tag">已失效</span>
                  </div>
                </div>
              </td>
              <td class="col-price" :class="{ muted: !item.valid }">{{ item.valid ? '¥' + (item.price || 0).toFixed(2) : '--' }}</td>
              <td>
                <div class="qty-ctrl" v-if="item.valid">
                  <button class="qty-btn" @click="changeQty(item, -1)">−</button>
                  <span class="qty-val">{{ item.quantity }}</span>
                  <button class="qty-btn" @click="changeQty(item, 1)">+</button>
                </div>
                <span v-else class="small muted">不可结算</span>
              </td>
              <td class="col-subtotal" :class="{ muted: !item.valid }">{{ item.valid ? '¥' + ((item.price || 0) * item.quantity).toFixed(2) : '--' }}</td>
              <td><span class="del-link" @click="confirmDelete(item)">删除</span></td>
            </tr>
          </tbody>
        </table>

        <!-- 底栏 -->
        <div class="cart-footer">
          <div class="footer-left">
            <label class="chk-label">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" /> 全选
            </label>
            <span class="action-link" @click="deleteSelected">删除选中</span>
            <span class="action-link" @click="clearInvalid">清空失效</span>
          </div>
          <div class="footer-right">
            <span class="summary">已选 <b>{{ selectedCount }}</b> 件　合计：</span>
            <span class="total-price">¥{{ totalPrice.toFixed(2) }}</span>
            <span class="small muted">（不含运费 / 优惠）</span>
            <button class="checkout-btn" :disabled="selectedCount === 0" @click="goCheckout">去结算（{{ selectedCount }}）</button>
          </div>
        </div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { cartList, updateCartQty, deleteCart, toggleCartSelect } from "@/api/modules/cart.js";

export default {
  name: "CartView",
  components: { AppHeader: () => import("@/components/AppHeader.vue"), AppFooter: () => import("@/components/AppFooter.vue") },
  data() {
    return { items: [], loading: true };
  },
  computed: {
    selectedItems() {
      return this.items.filter(i => i.valid && i.selected === 1);
    },
    selectedCount() {
      return this.selectedItems.length;
    },
    totalPrice() {
      return this.selectedItems.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
    },
    allSelected: {
      get() {
        const valid = this.items.filter(i => i.valid);
        return valid.length > 0 && valid.every(i => i.selected === 1);
      },
    },
  },
  created() { this.loadCart(); },
  methods: {
    async loadCart() {
      this.loading = true;
      try {
        const res = await cartList();
        this.items = (res.data || []).map(i => ({ ...i }));
      } catch (e) {
        if (e.response?.status === 401) return;
        this.$message.error("加载购物车失败");
      } finally {
        this.loading = false;
      }
    },

    async toggleSelect(item) {
      const newVal = item.selected === 1 ? 0 : 1;
      try {
        await toggleCartSelect(item.id, newVal);
        item.selected = newVal;
      } catch (e) {
        this.$message.error("操作失败");
      }
    },

    toggleAll() {
      const newVal = this.allSelected ? 0 : 1;
      Promise.all(
        this.items.filter(i => i.valid).map(i =>
          toggleCartSelect(i.id, newVal).then(() => i.selected = newVal)
        )
      ).catch(() => this.$message.error("操作失败"));
    },

    async changeQty(item, delta) {
      const newQty = item.quantity + delta;
      if (newQty < 1) return;
      try {
        await updateCartQty(item.id, newQty);
        item.quantity = newQty;
      } catch (e) {
        this.$message.error("修改数量失败");
      }
    },

    confirmDelete(item) {
      this.$confirm("确定删除该商品？", "提示", { type: "warning" })
        .then(async () => {
          try {
            await deleteCart(item.id);
            this.items = this.items.filter(i => i.id !== item.id);
          } catch (e) {
            this.$message.error("删除失败");
          }
        }).catch(() => {});
    },

    deleteSelected() {
      const selected = this.items.filter(i => i.selected === 1);
      if (!selected.length) return this.$message.info("请先勾选要删除的商品");
      this.$confirm(`确定删除选中的 ${selected.length} 件商品？`, "提示", { type: "warning" })
        .then(async () => {
          try {
            await Promise.all(selected.map(i => deleteCart(i.id)));
            this.items = this.items.filter(i => i.selected !== 1);
          } catch (e) {
            this.$message.error("删除失败");
          }
        }).catch(() => {});
    },

    clearInvalid() {
      const invalid = this.items.filter(i => !i.valid);
      if (!invalid.length) return this.$message.info("没有失效商品");
      Promise.all(invalid.map(i => deleteCart(i.id).catch(() => {})))
        .then(() => { this.items = this.items.filter(i => i.valid); });
    },

    goCheckout() {
      if (this.selectedCount === 0) return this.$message.info("请至少选择一件商品");
      localStorage.setItem("CHECKOUT_ITEMS", JSON.stringify(
        this.selectedItems.map(i => ({
          productId: i.productId, skuId: i.skuId || 0, quantity: i.quantity,
          productName: i.productName, productImage: i.productImage,
          specName: i.specName, price: i.price,
        }))
      ));
      this.$router.push("/checkout");
    },
  },
};
</script>

<style scoped>
#cart-page { background: #f4f5f7; min-height: 100vh; display:flex; flex-direction:column; }
.container { width: 1100px; max-width:100%; margin:0 auto; padding:24px 16px 40px; flex:1; }
.section-title { font-size:20px; font-weight:700; color:#2c3e50; margin-bottom:20px; }
.loading-wrap, .empty-cart { text-align:center; padding:80px 20px; }
.empty-icon { font-size:64px; margin-bottom:16px; }
.empty-text { font-size:18px; color:#999; margin-bottom:24px; }
.go-shop-btn { display:inline-block; padding:12px 36px; background:linear-gradient(135deg,#6b8dd6,#8e37d7); color:#fff; border-radius:100px; font-weight:600; text-decoration:none; }

/* 表格 */
.cart-content { }
.cart-table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.cart-table th { background:#f7f8fa; padding:12px 16px; font-size:13px; color:#666; font-weight:600; text-align:left; border-bottom:1px solid #eee; }
.cart-table td { padding:14px 16px; border-bottom:1px solid #f5f5f5; font-size:14px; vertical-align:middle; }
.cart-table tr.invalid td { opacity:.5; }
.cart-table tr:last-child td { border-bottom:none; }
.cart-table input[type=checkbox] { width:18px; height:18px; cursor:pointer; vertical-align:middle; }

.prod-info { display:flex; align-items:center; gap:12px; }
.prod-img { width:60px; height:60px; border-radius:8px; object-fit:cover; background:#f5f5f5; cursor:pointer; }
.prod-detail { flex:1; min-width:0; }
.prod-name { font-size:14px; font-weight:500; color:#2c3e50; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.prod-name:hover { color:#6b8dd6; }
.prod-spec { font-size:12px; color:#999; margin-top:2px; }
.invalid-tag { display:inline-block; font-size:11px; color:#e74c3c; font-weight:600; margin-top:2px; }
.col-price { color:#2c3e50; font-weight:500; }
.col-price.muted, .col-subtotal.muted { color:#ccc; font-weight:400; }

.qty-ctrl { display:inline-flex; align-items:center; border:1px solid #e0e0e0; border-radius:6px; overflow:hidden; }
.qty-btn { width:34px; height:34px; border:none; background:#f8f8f8; font-size:16px; cursor:pointer; color:#555; }
.qty-btn:hover { background:#e8e8e8; }
.qty-val { width:42px; text-align:center; font-size:14px; }
.col-subtotal { color:#e74c3c; font-weight:600; }

.del-link { font-size:13px; color:#6b8dd6; cursor:pointer; }
.del-link:hover { opacity:.8; }

/* 底栏 */
.cart-footer {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 24px; margin-top:16px;
  background:#fff; border-radius:12px;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
}
.footer-left { display:flex; align-items:center; gap:16px; }
.chk-label { display:flex; align-items:center; gap:6px; font-size:14px; color:#555; cursor:pointer; }
.chk-label input { width:18px; height:18px; }
.action-link { font-size:13px; color:#6b8dd6; cursor:pointer; }
.action-link:hover { opacity:.8; }
.footer-right { display:flex; align-items:center; gap:12px; }
.summary { font-size:14px; color:#666; }
.total-price { font-size:24px; font-weight:700; color:#e74c3c; }
.checkout-btn {
  padding:12px 36px; background:linear-gradient(135deg,#6b8dd6,#8e37d7);
  color:#fff; border:none; border-radius:100px; font-size:15px; font-weight:600;
  cursor:pointer; white-space:nowrap;
}
.checkout-btn:disabled { opacity:.4; cursor:not-allowed; }
.checkout-btn:hover:not(:disabled) { opacity:.9; }
.small { font-size:12px; }
.muted { color:#999; }
</style>
