<template>
  <div id="admin-dashboard">
    <h2 class="page-title">📊 数据看板</h2>

    <!-- 时间范围切换 -->
    <div class="toolbar">
      <el-radio-group v-model="days" size="small" @change="loadCharts">
        <el-radio-button :label="7">最近 7 天</el-radio-button>
        <el-radio-button :label="30">最近 30 天</el-radio-button>
      </el-radio-group>
      <el-button size="small" @click="refreshAll" :loading="refreshing">刷新</el-button>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">今日营业额</div>
        <div class="kpi-value">¥{{ formatNum(kpiData.todayRevenue) }}</div>
        <div class="kpi-growth" v-if="kpiData.revenueGrowth != null">
          <span :class="kpiData.revenueGrowth >= 0 ? 'up' : 'down'">{{ kpiData.revenueGrowth >= 0 ? '↑' : '↓' }}{{ Math.abs(kpiData.revenueGrowth) }}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">今日订单数</div>
        <div class="kpi-value">{{ kpiData.todayOrders }}</div>
        <div class="kpi-growth" v-if="kpiData.orderGrowth != null">
          <span :class="kpiData.orderGrowth >= 0 ? 'up' : 'down'">{{ kpiData.orderGrowth >= 0 ? '↑' : '↓' }}{{ Math.abs(kpiData.orderGrowth) }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总用户数</div>
        <div class="kpi-value">{{ kpiData.totalUsers }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">在售商品</div>
        <div class="kpi-value">{{ kpiData.activeProducts }}</div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card wide">
        <h3>📈 销量 & 订单趋势</h3>
        <div ref="salesChart" style="height:260px"></div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card">
        <h3>🥧 订单状态分布</h3>
        <div ref="orderChart" style="height:200px"></div>
        <div class="chart-legend" v-if="orderLegend.length">
          <span v-for="item in orderLegend" :key="item.label" :class="['legend-tag', item.cls]">{{ item.label }} {{ item.count }}</span>
        </div>
      </div>
      <div class="chart-card">
        <h3>👥 会员等级分布</h3>
        <div ref="memberChart" style="height:200px"></div>
        <div class="chart-legend" v-if="memberLegend.length">
          <span v-for="item in memberLegend" :key="item.label" :class="['legend-tag', item.cls]">{{ item.label }} {{ item.count }}</span>
        </div>
      </div>
    </div>

    <div class="chart-card" style="margin-top:16px">
      <h3>🏆 热门商品销量 Top {{ productLimit }}</h3>
      <div ref="productChart" style="height:260px"></div>
    </div>
  </div>
</template>

<script>
import { kpi, salesTrend, orderStatus, productSales, memberLevel } from "@/api/modules/stats.js";
import * as echarts from "echarts";

export default {
  name: "AdminDashboardView",
  data() {
    return {
      days: 7,
      refreshing: false,
      productLimit: 10,
      kpiData: { todayRevenue: 0, todayOrders: 0, totalUsers: 0, activeProducts: 0 },
      orderLegend: [],
      memberLegend: [],
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.initCharts();
      this.refreshAll();
    });
  },
  methods: {
    formatNum(v) {
      if (v === null || v === undefined) return "0";
      return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    async refreshAll() {
      this.refreshing = true;
      try {
        await Promise.all([this.loadKpi(), this.loadCharts()]);
      } finally {
        this.refreshing = false;
      }
    },

    async loadKpi() {
      try {
        const res = await kpi();
        Object.assign(this.kpiData, res.data || {});
      } catch (e) { /* ignore */ }
    },

    async loadCharts() {
      await Promise.all([
        this.loadSales(),
        this.loadOrderStatus(),
        this.loadMemberLevel(),
        this.loadProductSales(),
      ]);
    },

    async loadSales() {
      try {
        const res = await salesTrend(this.days);
        const d = res.data || {};
        const chart = echarts.getInstanceByDom(this.$refs.salesChart) || echarts.init(this.$refs.salesChart);
        chart.setOption({
          tooltip: { trigger: "axis" },
          legend: { data: ["订单量", "营业额(元)"], bottom: 0 },
          grid: { left: 50, right: 20, bottom: 40, top: 10 },
          xAxis: { type: "category", data: d.dates || [], axisLabel: { fontSize: 11 } },
          yAxis: [{ type: "value", min: 0 }, { type: "value", min: 0 }],
          series: [
            { name: "订单量", type: "line", data: d.orderCounts || [], smooth: true, color: "#5b8def", yAxisIndex: 0 },
            { name: "营业额(元)", type: "line", data: (d.revenues || []).map(Number), smooth: true, color: "#f5a623", yAxisIndex: 1 },
          ],
        });
      } catch (e) { /* ignore */ }
    },

    async loadOrderStatus() {
      try {
        const res = await orderStatus();
        const list = res.data || [];
        this.orderLegend = list.map(i => ({ label: i.label, count: i.count, cls: '' }));
        const colorMap = {
          "待支付": "#f5a623", "待发货": "#5b8def", "待收货": "#6bc46b",
          "待评价": "#a0a0a0", "已完成": "#52c41a", "已取消": "#bbb",
          "退款申请": "#e74c3c", "已退款": "#e67e22",
        };
        const chart = echarts.getInstanceByDom(this.$refs.orderChart) || echarts.init(this.$refs.orderChart);
        chart.setOption({
          tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
          series: [{
            type: "pie", radius: ["40%", "70%"],
            data: list.map(i => ({ value: Number(i.count), name: i.label, itemStyle: { color: colorMap[i.label] || "#999" } })),
            label: { show: true, formatter: "{b}\n{d}%", fontSize: 11 },
          }],
        });
      } catch (e) { /* ignore */ }
    },

    async loadMemberLevel() {
      try {
        const res = await memberLevel();
        const list = res.data || [];
        const colorList = ["#dfe3e9", "#5b8def", "#f6c453", "#e6a23c", "#e74c3c"];
        this.memberLegend = list.map((i, idx) => ({ label: i.level_name, count: i.count, cls: '' }));
        const chart = echarts.getInstanceByDom(this.$refs.memberChart) || echarts.init(this.$refs.memberChart);
        chart.setOption({
          tooltip: { trigger: "item", formatter: "{b}: {c}人 ({d}%)" },
          series: [{
            type: "pie", radius: ["40%", "70%"],
            data: list.map((i, idx) => ({ value: Number(i.count), name: i.level_name, itemStyle: { color: colorList[idx % colorList.length] } })),
            label: { show: true, formatter: "{b}\n{d}%", fontSize: 11 },
          }],
        });
      } catch (e) { /* ignore */ }
    },

    async loadProductSales() {
      try {
        const res = await productSales(this.productLimit);
        const list = res.data || [];
        const names = list.map(i => (i.product_name || "").length > 12 ? (i.product_name || "").substring(0, 12) + "…" : i.product_name || "");
        const sales = list.map(i => Number(i.total_sales));
        const chart = echarts.getInstanceByDom(this.$refs.productChart) || echarts.init(this.$refs.productChart);
        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 10, right: 60, top: 10, bottom: 20 },
          xAxis: { type: "value" },
          yAxis: { type: "category", data: names.reverse(), axisLabel: { fontSize: 11 } },
          series: [{
            type: "bar", data: sales.reverse(), color: "#5b8def",
            label: { show: true, position: "right", fontSize: 11 },
          }],
        });
      } catch (e) { /* ignore */ }
    },

    initCharts() {
      ["salesChart", "orderChart", "memberChart", "productChart"].forEach(ref => {
        if (this.$refs[ref]) echarts.init(this.$refs[ref]);
      });
    },
  },
  beforeDestroy() {
    ["salesChart", "orderChart", "memberChart", "productChart"].forEach(ref => {
      const chart = this.$refs[ref] && echarts.getInstanceByDom(this.$refs[ref]);
      if (chart) chart.dispose();
    });
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.kpi-card {
  background: #fff; border-radius: 12px; padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); text-align: center;
}
.kpi-label { font-size: 13px; color: #999; margin-bottom: 8px; }
.kpi-value { font-size: 28px; font-weight: 700; color: #2c3e50; }
.kpi-growth { font-size: 12px; margin-top: 4px; }
.kpi-growth .up { color: #52c41a; }
.kpi-growth .down { color: #e74c3c; }

.chart-row { display: flex; gap: 16px; margin-top: 16px; }
.chart-card {
  flex: 1; background: #fff; border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.chart-card.wide { flex: 2; }
.chart-card h3 { font-size: 15px; font-weight: 600; color: #555; margin-bottom: 12px; }

.chart-legend { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.legend-tag {
  font-size: 11px; padding: 2px 10px; border-radius: 100px;
  background: #f0f2f5; color: #666; font-weight: 500;
}
</style>
