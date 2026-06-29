<template>
  <div id="cart-page">
    <!-- AppHeader is registered globally in main.js -->

    <div class="cart-container">
      <div class="page-header">
        <h1 class="page-title">🛒 我的购物车</h1>
        <router-link to="/" class="home-link">🏠 返回首页</router-link>
      </div>

      <!-- 空购物车 -->
      <div v-if="loading === false && items.length === 0" class="empty-cart">
        <div class="empty-icon">🛒</div>
        <p class="empty-text">购物车空空的，去逛逛吧~</p>
        <router-link to="/products" class="go-shop-btn">去逛逛</router-link>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">
        <span class="loading-icon">⏳</span> 加载中…
      </div>

      <!-- 购物车列表 -->
      <div v-if="items.length > 0" class="cart-panel">
        <!-- 表头操作栏 -->
        <div class="cart-toolbar">
          <label class="checkbox-all">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            <span>全选</span>
          </label>
          <span class="toolbar-info">共 {{ items.length }} 件商品</span>
          <span class="toolbar-action link" @click="deleteSelected">删除选中</span>
        </div>

        <!-- 商品列表 -->
        <div class="cart-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="cart-item"
            :class="{ 'item-invalid': !item.valid }"
          >
            <!-- 勾选 -->
            <div class="col-select">
              <input
                type="checkbox"
                :checked="item.selected === 1"
                :disabled="!item.valid"
                @change="toggleSelect(item)"
              />
            </div>

            <!-- 商品图片 -->
            <div class="col-img" @click="$router.push('/product/' + item.productId)">
              <img :src="item.productImage || '/logo.png'" :alt="item.productName" />
            </div>

            <!-- 商品信息 -->
            <div class="col-info">
              <div class="product-name" @click="$router.push('/product/' + item.productId)">
                {{ item.productName }}
              </div>
              <div class="product-spec" v-if="item.specName">{{ item.specName }}</div>
              <div v-if="!item.valid" class="invalid-tag">⛔ 已失效</div>
            </div>

            <!-- 单价 -->
            <div class="col-price">¥{{ (item.price || 0).toFixed(2) }}</div>

            <!-- 数量 -->
            <div class="col-qty">
              <button class="qty-btn" :disabled="!item.valid" @click="changeQty(item, -1)">−</button>
              <span class="qty-val">{{ item.quantity }}</span>
              <button class="qty-btn" :disabled="!item.valid" @click="changeQty(item, 1)">+</button>
            </div>

            <!-- 小计 -->
            <div class="col-subtotal">
              ¥{{ ((item.price || 0) * item.quantity).toFixed(2) }}
            </div>

            <!-- 删除 -->
            <div class="col-action">
              <span class="del-btn" @click="confirmDelete(item)">🗑️</span>
            </div>
          </div>
        </div>

        <!-- 底栏 -->
        <div class="cart-footer">
          <div class="footer-left">
            <label class="checkbox-all">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              <span>全选</span>
            </label>
            <span class="footer-del link" @click="deleteSelected">删除选中</span>
          </div>
          <div class="footer-right">
            <div class="footer-sum">
              合计：<span class="total-price">¥{{ totalPrice.toFixed(2) }}</span>
              <span class="total-count">（已选 {{ selectedCount }} 件）</span>
            </div>
            <button
              class="checkout-btn"
              :disabled="selectedCount === 0"
              @click="goCheckout"
            >
              去结算
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AppFooter is registered globally in main.js -->
  </div>
</template>

<script>
import { cartList, updateCartQty, deleteCart, toggleCartSelect } from "@/api/modules/cart.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "CartView",
  data() {
    return {
      items: [],
      loading: true,
    };
  },
  computed: {
    // 有效且勾选的商品（用于结算）
    selectedItems() {
      return this.items.filter((i) => i.valid && i.selected === 1);
    },
    selectedCount() {
      return this.selectedItems.length;
    },
    totalPrice() {
      return this.selectedItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
    },
    allSelected: {
      get() {
        const valid = this.items.filter((i) => i.valid);
        return valid.length > 0 && valid.every((i) => i.selected === 1);
      },
    },
  },
  created() {
    this.loadCart();
  },
  methods: {
    async loadCart() {
      this.loading = true;
      try {
        const res = await cartList();
        this.items = (res.data || []).map((i) => ({ ...i }));
      } catch (e) {
        this.$message.error("加载购物车失败：" + e.message);
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
      const promises = this.items
        .filter((i) => i.valid)
        .map((i) => toggleCartSelect(i.id, newVal).then(() => (i.selected = newVal)));
      Promise.all(promises).catch(() => this.$message.error("操作失败"));
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
      this.$confirm("确定删除该商品？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await deleteCart(item.id);
            this.items = this.items.filter((i) => i.id !== item.id);
            this.$message.success("已删除");
          } catch (e) {
            this.$message.error("删除失败");
          }
        })
        .catch(() => {});
    },

    deleteSelected() {
      const selected = this.items.filter((i) => i.selected === 1);
      if (selected.length === 0) {
        this.$message.info("请先勾选要删除的商品");
        return;
      }
      this.$confirm(`确定删除选中的 ${selected.length} 件商品？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await Promise.all(selected.map((i) => deleteCart(i.id)));
            this.items = this.items.filter((i) => i.selected !== 1);
            this.$message.success("删除成功");
          } catch (e) {
            this.$message.error("删除失败");
          }
        })
        .catch(() => {});
    },

    goCheckout() {
      if (this.selectedCount === 0) {
        this.$message.info("请至少选择一件商品");
        return;
      }
      // 把选中的商品信息通过 localStorage 传给结算页
      const checkoutItems = this.selectedItems.map((i) => ({
        productId: i.productId,
        skuId: i.skuId || 0,
        quantity: i.quantity,
        productName: i.productName,
        productImage: i.productImage,
        specName: i.specName,
        price: i.price,
      }));
      localStorage.setItem("CHECKOUT_ITEMS", JSON.stringify(checkoutItems));
      this.$router.push("/checkout");
    },
  },
};
</script>

<style scoped>
.cart-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 100px;
  min-height: 60vh;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 24px;
}

/* 空购物车 */
.empty-cart {
  text-align: center;
  padding: 100px 20px;
}
.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 18px;
  color: #999;
  margin-bottom: 24px;
}
.go-shop-btn {
  display: inline-block;
  padding: 12px 36px;
  background: linear-gradient(135deg, #6b8dd6, #8e37d7);
  color: #fff;
  border-radius: 100px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}
.go-shop-btn:hover {
  opacity: 0.9;
}

/* 加载 */
.loading-wrap {
  text-align: center;
  padding: 80px 0;
  font-size: 16px;
  color: #999;
}
.loading-icon {
  margin-right: 8px;
}

/* 工具栏 */
.cart-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  gap: 16px;
  font-size: 14px;
}
.toolbar-info {
  color: #999;
  flex: 1;
}
.toolbar-action {
  font-weight: 600;
}

/* 商品列表 */
.cart-list {
  background: #fff;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}
.cart-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  gap: 16px;
  transition: background 0.2s;
}
.cart-item:hover {
  background: #fafbfc;
}
.cart-item.item-invalid {
  opacity: 0.5;
}
.col-select {
  flex: 0 0 30px;
}
.col-select input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.col-img {
  flex: 0 0 80px;
  cursor: pointer;
}
.col-img img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  background: #f5f5f5;
}
.col-info {
  flex: 1;
  min-width: 0;
}
.product-name {
  font-size: 15px;
  font-weight: 500;
  color: #2c3e50;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-name:hover {
  color: #6b8dd6;
}
.product-spec {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.invalid-tag {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #e74c3c;
  font-weight: 600;
}
.col-price {
  flex: 0 0 80px;
  text-align: right;
  font-size: 14px;
  color: #666;
}
.col-qty {
  flex: 0 0 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}
.qty-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f8f8f8;
  font-size: 18px;
  cursor: pointer;
  color: #555;
  transition: background 0.2s;
}
.qty-btn:hover:not(:disabled) {
  background: #e8e8e8;
}
.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty-val {
  width: 44px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}
.col-subtotal {
  flex: 0 0 90px;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
  color: #e74c3c;
}
.col-action {
  flex: 0 0 40px;
  text-align: center;
}
.del-btn {
  cursor: pointer;
  font-size: 18px;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.del-btn:hover {
  opacity: 1;
}

/* 底栏 */
.cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 100;
  max-width: 100%;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.footer-del {
  font-size: 14px;
  color: #999;
  cursor: pointer;
}
.footer-del:hover {
  color: #e74c3c;
}
.footer-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.footer-sum {
  font-size: 15px;
  color: #666;
}
.total-price {
  font-size: 24px;
  font-weight: 700;
  color: #e74c3c;
}
.total-count {
  font-size: 13px;
  color: #999;
  margin-left: 4px;
}
.checkout-btn {
  padding: 12px 48px;
  background: linear-gradient(135deg, #6b8dd6, #8e37d7);
  color: #fff;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.checkout-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.checkout-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* checkbox-all 复用于工具栏和底栏 */
.checkbox-all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
}
.checkbox-all input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.link {
  color: #6b8dd6;
  cursor: pointer;
  font-weight: 600;
}
.link:hover {
  opacity: 0.8;
}
.home-link { font-size: 14px; color: #6b8dd6; text-decoration: none; font-weight: 500; }
.home-link:hover { opacity: 0.8; }

@media (max-width: 768px) {
  .cart-item {
    flex-wrap: wrap;
    gap: 10px;
  }
  .col-price,
  .col-subtotal {
    flex: 0 0 auto;
  }
  .col-action {
    flex: 0 0 auto;
  }
  .cart-footer {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
  }
}
</style>
