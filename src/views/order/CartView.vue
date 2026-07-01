<template>
  <div id="cart-page">
    <AppHeader />
    <div class="cart-container">
      <div class="page-header">
        <div class="section-title">我的购物车（{{ items.length }} 件商品）</div>
        <router-link to="/" class="home-link">← 返回首页</router-link>
      </div>

      <!-- 空购物车 -->
      <div v-if="!loading && items.length === 0" class="empty-cart">
        <div class="empty-icon">🛒</div>
        <p class="empty-text">购物车空空的，去逛逛吧~</p>
        <router-link to="/products" class="go-shop-btn">去逛逛</router-link>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 商品表格 -->
      <div v-if="items.length > 0" class="cart-panel">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:40px">☑</th>
              <th>商品信息</th>
              <th style="width:140px">单价</th>
              <th style="width:140px">数量</th>
              <th style="width:120px">小计</th>
              <th style="width:80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              :class="{ 'row-invalid': !item.valid }"
            >
              <!-- 勾选 -->
              <td>
                <input
                  type="checkbox"
                  :checked="item.selected === 1"
                  :disabled="!item.valid"
                  @change="toggleSelect(item)"
                />
              </td>

              <!-- 商品信息 -->
              <td>
                <div class="prod-cell" @click="$router.push('/product/' + item.productId)">
                  <div class="prod-img">
                    <img :src="item.productImage || '/logo.png'" :alt="item.productName" />
                  </div>
                  <div class="prod-info">
                    <div class="prod-name">
                      {{ item.productName }}
                      <span v-if="!item.valid" class="tag danger">已失效</span>
                    </div>
                    <div class="prod-spec" v-if="item.specName">{{ item.specName }}</div>
                    <div v-if="!item.valid" class="invalid-reason">商品已下架 / 规格已删除</div>
                  </div>
                </div>
              </td>

              <!-- 单价 -->
              <td>
                <span v-if="item.valid" class="price">¥{{ unitPrice(item).toFixed(2) }}</span>
                <span v-else class="muted">--</span>
              </td>

              <!-- 数量 -->
              <td>
                <div v-if="item.valid" class="qty-row">
                  <span class="qty-btn" @click="changeQty(item, -1)">−</span>
                  <span class="qty-val">{{ item.quantity }}</span>
                  <span class="qty-btn" @click="changeQty(item, 1)">＋</span>
                </div>
                <span v-else class="muted small">不可结算</span>
              </td>

              <!-- 小计 -->
              <td>
                <span v-if="item.valid" class="price">¥{{ (unitPrice(item) * item.quantity).toFixed(2) }}</span>
                <span v-else class="muted">--</span>
              </td>

              <!-- 操作 -->
              <td>
                <span class="del-link" @click="confirmDelete(item)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 结算栏 -->
        <div class="settle-bar">
          <div class="settle-left">
            <label class="check-all-label">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              <span>全选</span>
            </label>
            <span class="settle-link" @click="deleteSelected">删除选中</span>
            <span v-if="hasInvalid" class="settle-link danger" @click="clearInvalid">清空失效</span>
          </div>
          <div class="settle-right">
            <span class="settle-info">
              已选 <b>{{ selectedCount }}</b> 件　合计：
            </span>
            <span class="settle-total">¥{{ totalPrice.toFixed(2) }}</span>
            <span class="settle-note">（不含运费 / 优惠）</span>
            <button class="checkout-btn" :disabled="selectedCount === 0" @click="goCheckout">
              去结算（{{ selectedCount }}）
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { cartList, updateCartQty, deleteCart, toggleCartSelect } from "@/api/modules/cart.js";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "CartView",
  components: { AppHeader, AppFooter },
  data() {
    return {
      items: [],
      loading: true,
    };
  },
  computed: {
    selectedItems() {
      return this.items.filter((i) => i.valid && i.selected === 1);
    },
    selectedCount() {
      return this.selectedItems.length;
    },
    totalPrice() {
      return this.selectedItems.reduce((sum, i) => sum + this.unitPrice(i) * i.quantity, 0);
    },
    allSelected: {
      get() {
        const valid = this.items.filter((i) => i.valid);
        return valid.length > 0 && valid.every((i) => i.selected === 1);
      },
    },
    hasInvalid() {
      return this.items.some((i) => !i.valid);
    },
  },
  created() {
    this.loadCart();
  },
  methods: {
    // 购物车展示会员折后价（memberPrice）；结算时仍按原价(i.price)传递，保证结算/订单口径一致
    unitPrice(item) {
      const p = item.memberPrice != null ? item.memberPrice : item.price;
      return Number(p || 0);
    },
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
      if (!item.valid) return;
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
      if (!item.valid) return;
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

    clearInvalid() {
      const invalid = this.items.filter((i) => !i.valid);
      if (invalid.length === 0) return;
      this.$confirm(`确定清空 ${invalid.length} 件失效商品？`, "清除失效", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await Promise.all(invalid.map((i) => deleteCart(i.id)));
            this.items = this.items.filter((i) => i.valid);
            this.$message.success("已清空失效商品");
          } catch (e) {
            this.$message.error("操作失败");
          }
        })
        .catch(() => {});
    },

    goCheckout() {
      if (this.selectedCount === 0) {
        this.$message.info("请至少选择一件商品");
        return;
      }
      const checkoutItems = this.selectedItems.map((i) => ({
        cartId: i.id,
        productId: i.productId,
        skuId: i.skuId || 0,
        quantity: i.quantity,
        productName: i.productName,
        productImage: i.productImage,
        specName: i.specName,
        shopName: i.shopName || "",
        price: i.price,
      }));
      localStorage.setItem("CHECKOUT_ITEMS", JSON.stringify(checkoutItems));
      this.$router.push("/checkout");
    },
  },
};
</script>

<style scoped>
#cart-page {
  display: flex; flex-direction: column; min-height: 100vh;
  background: #f4f5f7;
}
.cart-container {
  max-width: 1100px; width: 100%; margin: 0 auto;
  padding: 24px 20px 40px; flex: 1;
}

/* 标题&导航 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.home-link {
  font-size: 13px;
  color: #5b8def;
  text-decoration: none;
}
.home-link:hover { opacity: 0.8; }

/* 空购物车 */
.empty-cart { text-align: center; padding: 100px 20px; }
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.empty-text { font-size: 18px; color: #999; margin-bottom: 24px; }
.go-shop-btn {
  display: inline-block; padding: 12px 36px;
  background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff;
  border-radius: 100px; font-weight: 600; text-decoration: none; transition: opacity 0.2s;
}
.go-shop-btn:hover { opacity: 0.9; }

.loading-wrap { text-align: center; padding: 80px 0; font-size: 16px; color: #999; }

/* 面板 */
.cart-panel { }

/* ===== 表格（对齐线框模板）===== */
.tbl {
  width: 100%; border-collapse: collapse; background: #fff;
  font-size: 13px; border-radius: 8px; overflow: hidden;
  border: 1px solid #cfd4da;
}
.tbl th {
  background: #f7f8fa; text-align: left; padding: 10px;
  border-bottom: 1px solid #cfd4da; color: #555; font-weight: 600; white-space: nowrap;
}
.tbl td {
  padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle;
}
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafbfc; }

/* 失效行 */
.row-invalid { opacity: 0.5; }
.row-invalid:hover td { background: transparent; }

/* 商品单元格 */
.prod-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.prod-img {
  width: 60px; height: 60px; flex-shrink: 0; border-radius: 6px; overflow: hidden;
  border: 1px solid #eef0f3; background: #f5f5f5;
}
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.prod-info { min-width: 0; }
.prod-name { font-size: 13px; color: #333; }
.prod-spec { font-size: 12px; color: #888; margin-top: 2px; }
.invalid-reason { font-size: 12px; color: #888; margin-top: 2px; }

/* 标签 */
.tag {
  display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px;
  padding: 1px 8px; font-size: 12px; color: #555;
}
.tag.danger { background: #fbe7e6; border-color: #f0c2c0; color: #d9534f; }

/* 文本 */
.price { color: #d9534f; font-weight: 700; }
.muted { color: #888; }
.small { font-size: 12px; }

/* 数量 */
.qty-row { display: flex; align-items: center; gap: 6px; }
.qty-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: 1px solid #cfd4da; border-radius: 4px;
  background: #fff; color: #444; font-size: 14px; cursor: pointer; transition: background 0.15s;
}
.qty-btn:hover { background: #f0f2f5; }
.qty-val {
  min-width: 36px; text-align: center; font-size: 13px; font-weight: 500;
}

/* 删除 */
.del-link { font-size: 13px; color: #5b8def; cursor: pointer; }
.del-link:hover { opacity: 0.8; }

/* 结算栏 */
.settle-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border: 1px solid #cfd4da; border-radius: 8px;
  padding: 12px 16px; margin-top: 16px;
}
.settle-left { display: flex; align-items: center; gap: 8px; }
.settle-right { display: flex; align-items: center; gap: 8px; }

.check-all-label {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 13px; color: #555;
}
.check-all-label input { width: 16px; height: 16px; cursor: pointer; }

.settle-link { font-size: 12px; color: #5b8def; cursor: pointer; }
.settle-link:hover { opacity: 0.8; }
.settle-link.danger { color: #d9534f; }

.settle-info { font-size: 12px; color: #888; }
.settle-info b { color: #333; }

.settle-total { font-size: 24px; color: #d9534f; font-weight: 700; }

.settle-note { font-size: 12px; color: #888; }

.checkout-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 11px 22px; background: #5b8def; border: 1px solid #5b8def;
  color: #fff; border-radius: 6px; font-size: 15px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: opacity 0.2s;
  margin-left: 8px;
}
.checkout-btn:hover:not(:disabled) { opacity: 0.9; }
.checkout-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 768px) {
  .settle-bar { flex-direction: column; gap: 10px; }
  .settle-right { flex-wrap: wrap; justify-content: center; }
  .tbl { font-size: 12px; }
}
</style>
