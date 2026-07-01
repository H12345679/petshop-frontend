<template>
  <div id="admin-dashboard" class="dashboard-shell">
    <section class="dashboard-hero">
      <div>
        <div class="eyebrow">Operations Intelligence</div>
        <h2 class="page-title">数据看板</h2>
        <p class="page-subtitle">
          销售、订单、会员与日志流水的实时运营概览
        </p>
      </div>

      <div class="hero-actions">
        <el-radio-group v-model="days" size="small" @change="loadCharts">
          <el-radio-button :label="7">7 天</el-radio-button>
          <el-radio-button :label="30">30 天</el-radio-button>
        </el-radio-group>
        <el-button
          class="refresh-btn"
          size="small"
          type="primary"
          icon="el-icon-refresh"
          @click="refreshAll"
          :loading="refreshing"
        >
          刷新
        </el-button>
      </div>
    </section>

    <section class="kpi-grid">
      <article
        v-for="item in metricCards"
        :key="item.key"
        class="kpi-card"
        :class="item.tone"
      >
        <div class="kpi-top">
          <span class="kpi-icon"><i :class="item.icon"></i></span>
          <span class="kpi-tag">{{ item.tag }}</span>
        </div>
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-foot">{{ item.foot }}</div>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="chart-card span-2">
        <div class="card-head">
          <div>
            <h3>销量与订单趋势</h3>
            <p>{{ selectedRangeLabel }}营业额 / 下单量</p>
          </div>
          <span class="chip">实时接口</span>
        </div>
        <div ref="salesChart" class="chart-host chart-lg"></div>
      </article>

      <article v-if="isAdmin" class="chart-card span-2 accent-card">
        <div class="card-head">
          <div>
            <h3>历史每日数据统计</h3>
            <p>定时任务提取后的日度聚合结果</p>
          </div>
          <span class="chip chip-warm">预聚合</span>
        </div>
        <div ref="dailyAggChart" class="chart-host chart-lg"></div>
      </article>

      <article class="chart-card">
        <div class="card-head">
          <div>
            <h3>订单状态分布</h3>
            <p>订单生命周期占比</p>
          </div>
        </div>
        <div ref="orderChart" class="chart-host"></div>
      </article>

      <article class="chart-card">
        <div class="card-head">
          <div>
            <h3>会员等级分布</h3>
            <p>用户权益层级结构</p>
          </div>
        </div>
        <div ref="memberChart" class="chart-host"></div>
      </article>

      <article v-if="isAdmin" class="chart-card">
        <div class="card-head">
          <div>
            <h3>系统操作 Top 10</h3>
            <p>日志流水中的高频操作</p>
          </div>
        </div>
        <div ref="logOpChart" class="chart-host"></div>
      </article>

      <article v-if="isAdmin" class="chart-card">
        <div class="card-head">
          <div>
            <h3>24 小时操作活跃度</h3>
            <p>按小时统计的后台操作量</p>
          </div>
        </div>
        <div ref="logHourChart" class="chart-host"></div>
      </article>

      <article class="chart-card">
        <div class="card-head">
          <div>
            <h3>热门商品销量 Top {{ productLimit }}</h3>
            <p>按商品累计销量排序</p>
          </div>
          <span class="chip">商品</span>
        </div>
        <div ref="productChart" class="chart-host chart-md"></div>
      </article>

      <article v-if="isAdmin" class="chart-card">
        <div class="card-head">
          <div>
            <h3>店铺商品销量排行</h3>
            <p>Top 10 店铺销售贡献</p>
          </div>
          <span class="chip chip-green">店铺</span>
        </div>
        <div ref="shopRankChart" class="chart-host chart-md"></div>
      </article>
    </section>
  </div>
</template>

<script>
import {
  kpi,
  salesTrend,
  orderStatus,
  productSales,
  memberLevel,
  dailyStats,
  logOps,
  shopRanking,
} from "@/api/modules/stats.js";
import { getStore } from "@/libs/storage.js";
import * as echarts from "echarts";

const PALETTE = {
  ink: "#1f2937",
  muted: "#7b8494",
  blue: "#3f6fd8",
  amber: "#d89b2b",
  green: "#2f9d72",
  red: "#d95f55",
  violet: "#7257b8",
  grid: "#e8edf4",
};

export default {
  name: "AdminDashboardView",
  data() {
    return {
      days: 7,
      refreshing: false,
      productLimit: 10,
      kpiData: {
        todayRevenue: 0,
        todayOrders: 0,
        totalUsers: 0,
        activeProducts: 0,
      },
      userInfo: null,
      resizeTimer: null,
    };
  },
  computed: {
    isAdmin() {
      return this.userInfo && this.userInfo.role === "ADMIN";
    },
    selectedRangeLabel() {
      return `最近 ${this.days} 天`;
    },
    chartRefs() {
      const refs = ["salesChart", "orderChart", "memberChart", "productChart"];
      if (this.isAdmin) {
        refs.push("dailyAggChart", "logOpChart", "logHourChart", "shopRankChart");
      }
      return refs;
    },
    metricCards() {
      return [
        {
          key: "revenue",
          label: "今日营业额",
          value: this.formatCurrency(this.kpiData.todayRevenue),
          foot: "已支付订单金额",
          tag: "Revenue",
          icon: "el-icon-coin",
          tone: "tone-blue",
        },
        {
          key: "orders",
          label: "今日订单数",
          value: this.formatInteger(this.kpiData.todayOrders),
          foot: "今日新增交易单",
          tag: "Orders",
          icon: "el-icon-tickets",
          tone: "tone-amber",
        },
        {
          key: "users",
          label: "总用户数",
          value: this.formatInteger(this.kpiData.totalUsers),
          foot: "平台累计用户",
          tag: "Members",
          icon: "el-icon-user",
          tone: "tone-green",
        },
        {
          key: "products",
          label: "在售商品",
          value: this.formatInteger(this.kpiData.activeProducts),
          foot: "可购买商品数",
          tag: "SKU",
          icon: "el-icon-goods",
          tone: "tone-violet",
        },
      ];
    },
  },
  created() {
    const u = getStore("userInfo");
    try {
      this.userInfo = u ? JSON.parse(u) : null;
    } catch (e) {
      this.userInfo = null;
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initCharts();
      this.refreshAll();
      window.addEventListener("resize", this.handleResize);
    });
  },
  methods: {
    formatCurrency(v) {
      const num = Number(v || 0);
      return `¥${num.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    formatInteger(v) {
      return Number(v || 0).toLocaleString("zh-CN");
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
      } catch (e) { /* keep default KPI values */ }
    },
    async loadCharts() {
      const promises = [
        this.loadSales(),
        this.loadOrderStatus(),
        this.loadMemberLevel(),
        this.loadProductSales(),
      ];
      if (this.isAdmin) {
        promises.push(this.loadDailyAgg(), this.loadLogStats(), this.loadShopRanking());
      }
      await Promise.all(promises);
    },
    async loadSales() {
      try {
        const res = await salesTrend(this.days);
        const d = res.data || {};
        const dates = d.dates || [];
        const orderCounts = (d.orderCounts || []).map(Number);
        const revenues = (d.revenues || []).map(Number);
        const chart = this.getChart("salesChart");

        if (!dates.length) {
          this.paintEmpty("salesChart", "暂无趋势数据");
          return;
        }

        chart.setOption(this.withBaseOption({
          tooltip: this.axisTooltip(),
          legend: this.bottomLegend(["订单量", "营业额"]),
          grid: this.grid({ left: 52, right: 56, bottom: 48, top: 22 }),
          xAxis: this.categoryAxis(dates),
          yAxis: [
            this.valueAxis({ name: "单量" }),
            this.valueAxis({ name: "金额", position: "right" }),
          ],
          series: [
            this.lineSeries("订单量", orderCounts, PALETTE.blue),
            this.lineSeries("营业额", revenues, PALETTE.amber, { yAxisIndex: 1 }),
          ],
        }), true);
      } catch (e) {
        this.paintEmpty("salesChart", "趋势数据加载失败");
      }
    },
    async loadDailyAgg() {
      try {
        const res = await dailyStats(this.days);
        const list = res.data || [];
        const chart = this.getChart("dailyAggChart");

        if (!list.length) {
          this.paintEmpty("dailyAggChart", "暂无定时聚合数据");
          return;
        }

        chart.setOption(this.withBaseOption({
          tooltip: this.axisTooltip(),
          legend: this.bottomLegend(["日营业额", "新增用户", "系统操作量"]),
          grid: this.grid({ left: 58, right: 60, bottom: 48, top: 22 }),
          xAxis: this.categoryAxis(list.map(i => i.date)),
          yAxis: [
            this.valueAxis({ name: "金额/人" }),
            this.valueAxis({ name: "次数", position: "right" }),
          ],
          series: [
            this.lineSeries("日营业额", list.map(i => Number(i.revenue)), PALETTE.green),
            {
              name: "新增用户",
              type: "bar",
              barWidth: 14,
              data: list.map(i => Number(i.newUsers)),
              itemStyle: { color: PALETTE.amber, borderRadius: [6, 6, 0, 0] },
            },
            this.lineSeries("系统操作量", list.map(i => Number(i.operationCount)), PALETTE.blue, { yAxisIndex: 1 }),
          ],
        }), true);
      } catch (e) {
        this.paintEmpty("dailyAggChart", "定时聚合数据加载失败");
      }
    },
    async loadOrderStatus() {
      try {
        const res = await orderStatus();
        const list = res.data || [];
        this.paintDonut("orderChart", list, {
          nameKey: "label",
          valueKey: "count",
          empty: "暂无订单状态数据",
          colors: [PALETTE.amber, PALETTE.blue, PALETTE.green, "#9aa3b2", "#54b56f", "#c4cad4", PALETTE.red],
        });
      } catch (e) {
        this.paintEmpty("orderChart", "订单状态加载失败");
      }
    },
    async loadMemberLevel() {
      try {
        const res = await memberLevel();
        const list = res.data || [];
        this.paintDonut("memberChart", list, {
          nameKey: "level_name",
          valueKey: "count",
          empty: "暂无会员等级数据",
          colors: ["#cfd7e3", PALETTE.blue, PALETTE.amber, PALETTE.green, PALETTE.violet],
        });
      } catch (e) {
        this.paintEmpty("memberChart", "会员数据加载失败");
      }
    },
    async loadLogStats() {
      try {
        const res = await logOps(this.days);
        const d = res.data || {};
        this.paintHorizontalBar("logOpChart", d.topOperations || [], {
          nameKey: "operation",
          valueKey: "count",
          color: PALETTE.red,
          empty: "暂无操作日志数据",
        });

        const hourList = d.hourlyDistribution || [];
        const hourChart = this.getChart("logHourChart");
        if (!hourList.length) {
          this.paintEmpty("logHourChart", "暂无小时分布数据");
          return;
        }
        hourChart.setOption(this.withBaseOption({
          tooltip: this.axisTooltip(),
          grid: this.grid({ left: 42, right: 18, bottom: 34, top: 18 }),
          xAxis: this.categoryAxis(hourList.map(i => `${i.hour}时`)),
          yAxis: this.valueAxis({ name: "次数" }),
          series: [this.lineSeries("操作量", hourList.map(i => Number(i.count)), PALETTE.red, {
            areaStyle: { color: "rgba(217,95,85,.12)" },
            symbolSize: 5,
          })],
        }), true);
      } catch (e) {
        this.paintEmpty("logOpChart", "日志统计加载失败");
        this.paintEmpty("logHourChart", "日志统计加载失败");
      }
    },
    async loadProductSales() {
      try {
        const res = await productSales(this.productLimit);
        this.paintHorizontalBar("productChart", res.data || [], {
          nameKey: "product_name",
          valueKey: "total_sales",
          color: PALETTE.blue,
          empty: "暂无商品销量数据",
        });
      } catch (e) {
        this.paintEmpty("productChart", "商品销量加载失败");
      }
    },
    async loadShopRanking() {
      try {
        const res = await shopRanking(10);
        this.paintHorizontalBar("shopRankChart", res.data || [], {
          nameKey: "shopName",
          valueKey: "totalSales",
          color: PALETTE.green,
          empty: "暂无店铺排行数据",
        });
      } catch (e) {
        this.paintEmpty("shopRankChart", "店铺排行加载失败");
      }
    },
    getChart(ref) {
      const el = this.$refs[ref];
      if (!el) return null;
      return echarts.getInstanceByDom(el) || echarts.init(el);
    },
    initCharts() {
      this.chartRefs.forEach(ref => {
        if (this.$refs[ref] && !echarts.getInstanceByDom(this.$refs[ref])) {
          echarts.init(this.$refs[ref]);
        }
      });
    },
    handleResize() {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.chartRefs.forEach(ref => {
          const chart = this.$refs[ref] && echarts.getInstanceByDom(this.$refs[ref]);
          if (chart) chart.resize();
        });
      }, 120);
    },
    paintHorizontalBar(ref, list, config) {
      const chart = this.getChart(ref);
      if (!chart) return;
      if (!list.length) {
        this.paintEmpty(ref, config.empty);
        return;
      }

      const names = list.map(i => this.truncate(i[config.nameKey], 14)).reverse();
      const values = list.map(i => Number(i[config.valueKey])).reverse();
      chart.setOption(this.withBaseOption({
        tooltip: this.axisTooltip("shadow"),
        grid: this.grid({ left: 10, right: 48, bottom: 18, top: 12, containLabel: true }),
        xAxis: this.valueAxis({ showName: false }),
        yAxis: {
          type: "category",
          data: names,
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: PALETTE.muted, fontSize: 11 },
        },
        series: [{
          type: "bar",
          data: values,
          barWidth: 12,
          itemStyle: { color: config.color, borderRadius: [0, 7, 7, 0] },
          label: { show: true, position: "right", color: PALETTE.muted, fontSize: 11 },
        }],
      }), true);
    },
    paintDonut(ref, list, config) {
      const chart = this.getChart(ref);
      if (!chart) return;
      if (!list.length) {
        this.paintEmpty(ref, config.empty);
        return;
      }

      chart.setOption(this.withBaseOption({
        color: config.colors,
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: {
          type: "scroll",
          bottom: 0,
          left: "center",
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: PALETTE.muted, fontSize: 11 },
        },
        series: [{
          type: "pie",
          radius: ["48%", "72%"],
          center: ["50%", "43%"],
          avoidLabelOverlap: true,
          label: { formatter: "{b}\n{d}%", color: PALETTE.ink, fontSize: 11 },
          labelLine: { length: 8, length2: 6 },
          itemStyle: { borderColor: "#fff", borderWidth: 3 },
          data: list.map(i => ({
            name: i[config.nameKey] || "未命名",
            value: Number(i[config.valueKey]),
          })),
        }],
      }), true);
    },
    paintEmpty(ref, text) {
      const chart = this.getChart(ref);
      if (!chart) return;
      chart.setOption(this.withBaseOption({
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text,
            fill: PALETTE.muted,
            fontSize: 13,
            fontWeight: 500,
          },
        },
      }), true);
    },
    withBaseOption(option) {
      return {
        backgroundColor: "transparent",
        textStyle: {
          color: PALETTE.ink,
          fontFamily: "Avenir Next, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
        },
        animationDuration: 650,
        animationEasing: "cubicOut",
        ...option,
      };
    },
    grid(extra = {}) {
      return { left: 46, right: 20, bottom: 36, top: 20, containLabel: false, ...extra };
    },
    axisTooltip(axisPointerType = "line") {
      return {
        trigger: "axis",
        axisPointer: { type: axisPointerType },
        backgroundColor: "rgba(31,41,55,.94)",
        borderWidth: 0,
        textStyle: { color: "#fff", fontSize: 12 },
        padding: [8, 10],
      };
    },
    bottomLegend(data) {
      return {
        data,
        bottom: 0,
        left: "center",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: PALETTE.muted, fontSize: 11 },
      };
    },
    categoryAxis(data) {
      return {
        type: "category",
        data,
        boundaryGap: false,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: PALETTE.grid } },
        axisLabel: { color: PALETTE.muted, fontSize: 11 },
      };
    },
    valueAxis({ name, position, showName = true } = {}) {
      return {
        type: "value",
        name: showName ? name : "",
        position,
        min: 0,
        nameTextStyle: { color: PALETTE.muted, fontSize: 11, padding: [0, 0, 4, 0] },
        splitLine: { lineStyle: { color: PALETTE.grid, type: "dashed" } },
        axisLabel: { color: PALETTE.muted, fontSize: 11 },
      };
    },
    lineSeries(name, data, color, extra = {}) {
      return {
        name,
        type: "line",
        data,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 3, color },
        itemStyle: { color },
        areaStyle: extra.areaStyle || { color: `${color}18` },
        ...extra,
      };
    },
    truncate(value, max) {
      const text = value == null ? "未命名" : String(value);
      return text.length > max ? `${text.slice(0, max)}...` : text;
    },
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
    clearTimeout(this.resizeTimer);
    this.chartRefs.forEach(ref => {
      const chart = this.$refs[ref] && echarts.getInstanceByDom(this.$refs[ref]);
      if (chart) chart.dispose();
    });
  },
};
</script>

<style scoped>
.dashboard-shell {
  min-height: 100%;
  color: #1f2937;
  background:
    linear-gradient(135deg, rgba(63, 111, 216, .07), rgba(47, 157, 114, .05) 42%, rgba(216, 155, 43, .06)),
    #f6f8fb;
}

.dashboard-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px;
  margin-bottom: 18px;
  border: 1px solid rgba(105, 118, 138, .16);
  border-radius: 8px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, .95), rgba(244, 248, 255, .88)),
    repeating-linear-gradient(90deg, rgba(63, 111, 216, .06) 0, rgba(63, 111, 216, .06) 1px, transparent 1px, transparent 18px);
  box-shadow: 0 14px 34px rgba(31, 41, 55, .06);
}

.eyebrow {
  margin-bottom: 8px;
  color: #3f6fd8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  color: #172033;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #6d7688;
  font-size: 13px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.refresh-btn {
  border-color: #2f9d72;
  background: #2f9d72;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.kpi-card {
  position: relative;
  overflow: hidden;
  min-height: 138px;
  padding: 18px;
  border: 1px solid rgba(105, 118, 138, .14);
  border-radius: 8px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 12px 28px rgba(31, 41, 55, .055);
}

.kpi-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: var(--tone);
}

.tone-blue { --tone: #3f6fd8; }
.tone-amber { --tone: #d89b2b; }
.tone-green { --tone: #2f9d72; }
.tone-violet { --tone: #7257b8; }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 12%, white);
}

.kpi-tag {
  color: #8a94a6;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
}

.kpi-label {
  color: #6d7688;
  font-size: 13px;
  margin-bottom: 6px;
}

.kpi-value {
  color: #172033;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 800;
}

.kpi-foot {
  margin-top: 10px;
  color: #96a0ae;
  font-size: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-card {
  min-width: 0;
  padding: 18px 18px 14px;
  border: 1px solid rgba(105, 118, 138, .14);
  border-radius: 8px;
  background: rgba(255, 255, 255, .98);
  box-shadow: 0 12px 28px rgba(31, 41, 55, .055);
}

.chart-card.span-2 {
  grid-column: span 2;
}

.accent-card {
  background:
    linear-gradient(180deg, rgba(255, 250, 239, .86), rgba(255, 255, 255, .98));
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.card-head h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 800;
}

.card-head p {
  margin: 5px 0 0;
  color: #8a94a6;
  font-size: 12px;
}

.chip {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 6px;
  color: #3f6fd8;
  background: rgba(63, 111, 216, .1);
  font-size: 11px;
  font-weight: 700;
}

.chip-warm {
  color: #a96f17;
  background: rgba(216, 155, 43, .13);
}

.chip-green {
  color: #207654;
  background: rgba(47, 157, 114, .12);
}

.chart-host {
  width: 100%;
  height: 236px;
}

.chart-md {
  height: 270px;
}

.chart-lg {
  height: 286px;
}

::v-deep .el-radio-button__inner {
  border-color: rgba(105, 118, 138, .24);
  color: #596376;
  font-weight: 700;
}

::v-deep .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  border-color: #3f6fd8;
  background: #3f6fd8;
  box-shadow: -1px 0 0 0 #3f6fd8;
}

@supports not (color: color-mix(in srgb, red 10%, white)) {
  .kpi-icon {
    background: #eef3fb;
  }
}

@media (max-width: 1180px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .dashboard-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .chart-card.span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .dashboard-shell {
    margin: -12px;
  }

  .dashboard-hero,
  .chart-card,
  .kpi-card {
    border-radius: 8px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 24px;
  }

  .chart-host,
  .chart-md,
  .chart-lg {
    height: 250px;
  }
}
</style>
