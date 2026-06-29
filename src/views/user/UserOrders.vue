<template>
  <div class="panel">
    <div class="panel-head">
      <h3>我的订单</h3>
      <div class="status-filters">
        <span
          v-for="s in orderStatusFilters"
          :key="s.value"
          :class="['filter-tag', { on: localFilter === s.value }]"
          @click="setFilter(s.value)"
        >{{ s.label }}</span>
      </div>
    </div>

    <div v-if="loadingOrders" class="empty">加载中…</div>
    <div v-else-if="orders.length === 0" class="empty">暂无订单</div>
    <div v-else class="order-list">
      <div v-for="o in orders" :key="o.id" class="order-card">
        <div class="oc-head">
          <span class="oc-no">{{ o.orderNo }}</span>
          <span class="oc-status" :style="{ color: orderStatusColor(o.status) }">{{ orderStatusLabel(o.status) }}</span>
        </div>
        <div class="oc-items">
          <div v-for="item in o.orderItems" :key="item.id" class="oc-item">
            <div class="oci-img" :style="item.productImage ? { backgroundImage: 'url(' + item.productImage + ')' } : null">
              <span v-if="!item.productImage">图</span>
            </div>
            <div class="oci-info">
              <div class="oci-name">{{ item.productName }}</div>
              <div class="oci-spec" v-if="item.specName">{{ item.specName }}</div>
              <div class="oci-price">¥{{ item.price }} × {{ item.quantity }}</div>
            </div>
          </div>
        </div>
        <div class="oc-foot">
          <span class="oc-total">共 {{ o.orderItems ? o.orderItems.length : 0 }} 件，实付 <b>¥{{ o.payAmount }}</b></span>
        </div>
      </div>
    </div>

    <div class="pager" v-if="orderPages > 1">
      <button class="btn sm" :disabled="orderPage <= 1" @click="loadOrders(orderPage - 1)">上一页</button>
      <span class="pager-info">{{ orderPage }} / {{ orderPages }}</span>
      <button class="btn sm" :disabled="orderPage >= orderPages" @click="loadOrders(orderPage + 1)">下一页</button>
    </div>
  </div>
</template>

<script>
import { getMyOrders } from "@/api/modules/user.js";

export default {
  name: "UserOrders",
  props: {
    statusFilter: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      orders: [],
      orderPage: 1,
      orderPages: 1,
      localFilter: "",
      loadingOrders: false,
    };
  },
  computed: {
    orderStatusFilters() {
      return [
        { label: "全部", value: "" },
        { label: "待支付", value: "0" },
        { label: "待发货", value: "1" },
        { label: "待收货", value: "2" },
        { label: "待评价", value: "3" },
        { label: "已完成", value: "4" },
      ];
    }
  },
  watch: {
    statusFilter: {
      handler(val) {
        this.localFilter = val;
        this.loadOrders(1);
      },
      immediate: true
    }
  },
  methods: {
    setFilter(val) {
      this.localFilter = val;
      this.$emit('update:statusFilter', val);
      this.loadOrders(1);
    },
    async loadOrders(page) {
      this.orderPage = page || this.orderPage;
      this.loadingOrders = true;
      try {
        const params = { current: this.orderPage, size: 6 };
        if (this.localFilter !== "") params.status = Number(this.localFilter);
        const res = await getMyOrders(params);
        const d = res.data || {};
        this.orders = d.records || [];
        this.orderPages = d.pages || 1;
      } catch (e) {
        this.orders = [];
      } finally {
        this.loadingOrders = false;
      }
    },
    orderStatusLabel(s) {
      const map = { '0':'待支付','1':'待发货','2':'待收货','3':'待评价','4':'已完成','-1':'已取消','-2':'退款中','-3':'已退款','-4':'管理员退款' };
      return map[String(s)] || '未知';
    },
    orderStatusColor(s) {
      const map = { '0':'#f0ad4e','1':'#5bc0de','2':'#5b8def','3':'#8f7cf0','4':'#5cb85c','-1':'#999','-2':'#d9534f','-3':'#999','-4':'#999' };
      return map[String(s)] || '#999';
    },
  }
};
</script>

<style scoped>
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0; font-size: 16px; }
.panel-head { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }

/* 筛选标签 */
.status-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-tag {
  padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #f0f1f3; color: #666; cursor: pointer; transition: .12s;
}
.filter-tag:hover { background: #e3e7ef; }
.filter-tag.on { background: #5b8def; color: #fff; }

/* 分页 */
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 16px; }
.pager-info { font-size: 13px; color: #888; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.sm { padding: 5px 14px; font-size: 12px; }

/* 订单 */
.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-card { border: 1px solid #e6e8eb; border-radius: 8px; overflow: hidden; }
.oc-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #fafbfc; border-bottom: 1px solid #eef0f3;
}
.oc-no { font-size: 13px; color: #888; }
.oc-status { font-size: 13px; font-weight: 600; }
.oc-items { padding: 8px 14px; }
.oc-item { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f4f5f7; }
.oc-item:last-child { border-bottom: 0; }
.oci-img {
  width: 60px; height: 60px; border-radius: 6px; background: #e3e6ec;
  background-size: cover; background-position: center; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;
}
.oci-info { flex: 1; min-width: 0; }
.oci-name { font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oci-spec { font-size: 11px; color: #aaa; margin-top: 2px; }
.oci-price { font-size: 12px; color: #888; margin-top: 4px; }
.oc-foot {
  padding: 8px 14px; background: #fafbfc; border-top: 1px solid #eef0f3;
  text-align: right; font-size: 13px; color: #666;
}
.oc-foot b { color: #d9534f; }

.empty { padding: 24px 0; text-align: center; color: #999; font-size: 13px; }
</style>
