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
      <div class="kpi-card"><div class="kpi-label">今日营业额</div><div class="kpi-value">¥{{ formatNum(kpiData.todayRevenue) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">今日订单数</div><div class="kpi-value">{{ kpiData.todayOrders }}</div></div>
      <div class="kpi-card"><div class="kpi-label">总用户数</div><div class="kpi-value">{{ kpiData.totalUsers }}</div></div>
      <div class="kpi-card"><div class="kpi-label">在售商品</div><div class="kpi-value">{{ kpiData.activeProducts }}</div></div>
    </div>

    <div class="chart-row">
      <!-- 销量趋势折线图 -->
      <div class="chart-card wide">
        <h3>📈 销量 & 订单趋势</h3>
        <div ref="salesChart" style="height:260px"></div>
      </div>
    </div>

    <!-- 历史预聚合每日数据趋势（仅管理员可见） -->
    <div class="chart-row" v-if="userInfo && userInfo.role === 'ADMIN'">
      <div class="chart-card wide">
        <h3>📅 历史每日数据统计 (定时任务提取)</h3>
        <div ref="dailyAggChart" style="height:260px"></div>
      </div>
    </div>

    <div class="chart-row">
      <!-- 订单状态分布 -->
      <div class="chart-card">
        <h3>🥧 订单状态分布</h3>
        <div ref="orderChart" style="height:220px"></div>
      </div>
      <!-- 会员等级分布 -->
      <div class="chart-card">
        <h3>👥 会员等级分布</h3>
        <div ref="memberChart" style="height:220px"></div>
      </div>
    </div>

    <!-- 系统操作与日志分析（仅管理员可见） -->
    <div class="chart-row" v-if="userInfo && userInfo.role === 'ADMIN'">
      <div class="chart-card">
        <h3>⚡ Top 10 系统操作分布</h3>
        <div ref="logOpChart" style="height:220px"></div>
      </div>
      <div class="chart-card">
        <h3>⏰ 24小时系统操作活跃时段</h3>
        <div ref="logHourChart" style="height:220px"></div>
      </div>
    </div>

    <!-- 商品与店铺销量排行 -->
    <div class="chart-row" style="margin-top:16px">
      <!-- 热销 Top10 -->
      <div class="chart-card">
        <h3>🏆 热门商品销量 Top {{ productLimit }}</h3>
        <div ref="productChart" style="height:260px"></div>
      </div>
      <!-- 店铺销量排行 (仅管理员可见) -->
      <div class="chart-card" v-if="userInfo && userInfo.role === 'ADMIN'">
        <h3>🏪 店铺商品销量排行 Top 10</h3>
        <div ref="shopRankChart" style="height:260px"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { kpi, salesTrend, orderStatus, productSales, memberLevel, dailyStats, logOps, shopRanking } from "@/api/modules/stats.js";
import { getStore } from "@/libs/storage.js";
import * as echarts from "echarts";

export default {
  name: "AdminDashboardView",
  data() {
    return {
      days: 7,
      refreshing: false,
      productLimit: 10,
      kpiData: { todayRevenue: 0, todayOrders: 0, totalUsers: 0, activeProducts: 0 },
      userInfo: null,
    };
  },
  created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
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
      const promises = [
        this.loadSales(),
        this.loadOrderStatus(),
        this.loadMemberLevel(),
        this.loadProductSales(),
      ];
      if (this.userInfo && this.userInfo.role === 'ADMIN') {
        promises.push(this.loadDailyAgg());
        promises.push(this.loadLogStats());
        promises.push(this.loadShopRanking());
      }
      await Promise.all(promises);
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

    async loadDailyAgg() {
      try {
        const res = await dailyStats(this.days);
        const list = res.data || [];
        const dates = list.map(i => i.date);
        const revenues = list.map(i => Number(i.revenue));
        const newUsers = list.map(i => Number(i.newUsers));
        const opCounts = list.map(i => Number(i.operationCount));

        const chart = echarts.getInstanceByDom(this.$refs.dailyAggChart) || echarts.init(this.$refs.dailyAggChart);
        chart.setOption({
          tooltip: { trigger: "axis" },
          legend: { data: ["日营业额", "新增用户", "系统操作量"], bottom: 0 },
          grid: { left: 60, right: 60, bottom: 40, top: 20 },
          xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
          yAxis: [
            { type: "value", name: "金额/人" },
            { type: "value", name: "次数(日志)", position: "right" }
          ],
          series: [
            { name: "日营业额", type: "line", data: revenues, smooth: true, color: "#6bc46b" },
            { name: "新增用户", type: "bar", data: newUsers, color: "#f5a623" },
            { name: "系统操作量", type: "line", data: opCounts, yAxisIndex: 1, smooth: true, color: "#5b8def" },
          ],
        });
      } catch (e) { /* ignore */ }
    },

    async loadOrderStatus() {
      try {
        const res = await orderStatus();
        const list = res.data || [];
        const chart = echarts.getInstanceByDom(this.$refs.orderChart) || echarts.init(this.$refs.orderChart);
        const colorMap = {
          "待支付": "#f5a623", "待发货": "#5b8def", "待收货": "#6bc46b",
          "待评价": "#a0a0a0", "已完成": "#52c41a", "已取消": "#bbb",
          "退款申请": "#e74c3c", "已退款": "#e67e22", "管理员退款": "#e74c3c",
        };
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
        const chart = echarts.getInstanceByDom(this.$refs.memberChart) || echarts.init(this.$refs.memberChart);
        const colorList = ["#dfe3e9", "#5b8def", "#f6c453", "#e6a23c", "#e74c3c"];
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

    async loadLogStats() {
      try {
        const res = await logOps(this.days);
        const d = res.data || {};
        
        // 1) Top 10 系统操作分布
        const opList = d.topOperations || [];
        const opNames = opList.map(i => i.operation);
        const opCounts = opList.map(i => Number(i.count));
        const opChart = echarts.getInstanceByDom(this.$refs.logOpChart) || echarts.init(this.$refs.logOpChart);
        opChart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 10, right: 30, top: 10, bottom: 20 },
          xAxis: { type: "value" },
          yAxis: { type: "category", data: opNames.reverse(), axisLabel: { fontSize: 10 } },
          series: [{ type: "bar", data: opCounts.reverse(), color: "#e74c3c", label: { show: true, position: "right", fontSize: 10 } }],
        });

        // 2) 24小时系统操作活跃时段
        const hourList = d.hourlyDistribution || [];
        const hours = hourList.map(i => i.hour + "时");
        const hourCounts = hourList.map(i => Number(i.count));
        const hourChart = echarts.getInstanceByDom(this.$refs.logHourChart) || echarts.init(this.$refs.logHourChart);
        hourChart.setOption({
          tooltip: { trigger: "axis" },
          grid: { left: 40, right: 20, top: 10, bottom: 20 },
          xAxis: { type: "category", data: hours },
          yAxis: { type: "value" },
          series: [{ type: "line", data: hourCounts, smooth: true, areaStyle: { color: "rgba(231, 76, 60, 0.1)" }, color: "#e74c3c" }],
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

    async loadShopRanking() {
      try {
        const res = await shopRanking(10);
        const list = res.data || [];
        const names = list.map(i => i.shopName);
        const sales = list.map(i => Number(i.totalSales));
        const chart = echarts.getInstanceByDom(this.$refs.shopRankChart) || echarts.init(this.$refs.shopRankChart);
        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 10, right: 60, top: 10, bottom: 20 },
          xAxis: { type: "value" },
          yAxis: { type: "category", data: names.reverse(), axisLabel: { fontSize: 11 } },
          series: [{
            type: "bar", data: sales.reverse(), color: "#6bc46b",
            label: { show: true, position: "right", fontSize: 11 },
          }],
        });
      } catch (e) { /* ignore */ }
    },

    initCharts() {
      // Init all chart instances
      const refs = ["salesChart", "orderChart", "memberChart", "productChart"];
      if (this.userInfo && this.userInfo.role === 'ADMIN') {
        refs.push("dailyAggChart", "logOpChart", "logHourChart", "shopRankChart");
      }
      refs.forEach(ref => {
        if (this.$refs[ref]) echarts.init(this.$refs[ref]);
      });
    },
  },
  beforeDestroy() {
    // Dispose charts
    const refs = ["salesChart", "orderChart", "memberChart", "productChart"];
    if (this.userInfo && this.userInfo.role === 'ADMIN') {
      refs.push("dailyAggChart", "logOpChart", "logHourChart", "shopRankChart");
    }
    refs.forEach(ref => {
      const chart = this.$refs[ref] && echarts.getInstanceByDom(this.$refs[ref]);
      if (chart) chart.dispose();
    });
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }

/* KPI 卡片 */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.kpi-card {
  background: #fff; border-radius: 12px; padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); text-align: center;
}
.kpi-label { font-size: 13px; color: #999; margin-bottom: 8px; }
.kpi-value { font-size: 28px; font-weight: 700; color: #2c3e50; }

/* 图表布局 */
.chart-row { display: flex; gap: 16px; margin-top: 16px; }
.chart-card {
  flex: 1; background: #fff; border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.chart-card.wide { flex: 2; }
.chart-card h3 { font-size: 15px; font-weight: 600; color: #555; margin-bottom: 12px; }
</style>
