<template>
  <div id="admin-refunds-page">
    <!-- ====== 搜索筛选栏 ====== -->
    <div class="card row center wrap gap8" style="padding:12px 16px">
      <span class="small muted">退单号</span>
      <el-input v-model="filterRefundNo" placeholder="精确退单号" size="small" style="width:200px" clearable @keyup.enter.native="search" />
      <span class="small muted">买家名称</span>
      <el-input v-model="filterUsername" placeholder="模糊买家名称" size="small" style="width:160px" clearable @keyup.enter.native="search" />
      <el-button type="primary" size="small" @click="search">查询</el-button>
    </div>

    <!-- ====== Tabs（下划线风格 + 计数） ====== -->
    <div class="tabs">
      <span v-for="t in statusTabs" :key="t.value"
        :class="['tab', { on: activeTab === t.value }]"
        @click="activeTab = t.value; loadData()"
      >{{ t.label }} <b v-if="t.count !== null" style="color:#d9534f">{{ t.count }}</b></span>
    </div>

    <!-- ====== 退单列表 ====== -->
    <template v-if="activeTab !== 'direct'">
      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl">
          <thead>
            <tr>
              <th>退单号</th>
              <th>订单号</th>
              <th>买家</th>
              <th style="width:150px">类型</th>
              <th>退款金额</th>
              <th>原因</th>
              <th style="width:100px">状态</th>
              <th style="width:170px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="empty-td">⏳ 加载中…</td></tr>
            <tr v-else-if="list.length === 0"><td colspan="8" class="empty-td">暂无数据</td></tr>
            <tr v-for="rf in list" :key="rf.id">
              <td class="small">{{ rf.refundNo }}</td>
              <td class="small">{{ truncateOrderNo(rf.orderNo) }}</td>
              <td>{{ rf.buyerName || '用户#'+rf.userId }}</td>
              <td class="small">
                <span :class="['tag', typeTagClass(rf)]">{{ typeText(rf) }}</span>
              </td>
              <td class="price">¥{{ (rf.amount || 0).toFixed(2) }}</td>
              <td class="small">{{ rf.reason || '—' }}</td>
              <td><span :class="['tag', statusClass(rf.status)]">{{ statusLabel(rf.status) }}</span></td>
              <td class="small actions">
                <span class="action-link" @click="showDetail(rf)">
                  {{ rf.status === 0 || rf.status === 4 ? '处理' : '详情' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="totalPages > 1">
        <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
        <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
        <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      </div>
    </template>

    <!-- ====== 管理员直退 ====== -->
    <template v-if="activeTab === 'direct'">
      <div class="direct-card">
        <h3>管理员直接退款</h3>
        <div class="small muted mb12">无需用户申请，管理员主动全额退款（→ -4 管理员退款）。仅限「已收货(待评价)」状态订单，必须录入退单理由。</div>
        <div class="field">
          <label>订单号</label>
          <el-input v-model="directForm.orderNo" placeholder="ORD..." style="width:320px" />
        </div>
        <div class="field">
          <label>退款理由</label>
          <el-input v-model="directForm.reason" type="textarea" :rows="2" placeholder="系统缺货，商家主动取消并退款" style="width:400px" />
        </div>
        <div class="mt12">
          <el-button type="warning" :loading="directLoading" @click="submitDirectRefund">确认直接退款</el-button>
        </div>
      </div>
    </template>



    <!-- ====== 确认收到退货弹窗 ====== -->
    <el-dialog title="确认收到退货" :visible.sync="showConfirmReturn" width="440px">
      <template v-if="confirmTarget">
        <div class="small muted mb8">退单 {{ confirmTarget.refundNo }} · 订单 {{ truncateOrderNo(confirmTarget.orderNo) }}</div>
        <div class="audit-box">
          <div class="audit-row"><span class="muted">退货快递</span>
            <span>{{ confirmTarget.returnCourierCompany || '—' }} {{ confirmTarget.returnTrackingNumber }}</span>
          </div>
          <div class="audit-row"><span class="muted">寄回时间</span><span>{{ confirmTarget.returnTime || '—' }}</span></div>
          <div class="audit-row"><span class="muted">退款金额</span><span class="price">¥{{ (confirmTarget.amount || 0).toFixed(2) }}</span></div>
        </div>
        <div class="field mt12">
          <label for="confirmRemark">备注（选填）</label>
          <el-input id="confirmRemark" v-model="confirmRemark" type="textarea" :rows="2" placeholder="退货已验收无误" />
        </div>
        <div class="small muted mt8">⚠ 确认后立即退款到用户余额，订单转为「已退款」，库存回滚。</div>
      </template>
      <span slot="footer">
        <el-button @click="showConfirmReturn = false">取消</el-button>
        <el-button type="primary" style="background:#4caf7d;border-color:#4caf7d" :loading="confirmLoading" @click="doConfirmReturn">确认收货并退款</el-button>
      </span>
    </el-dialog>

    <!-- ====== 退单详情弹窗 ====== -->
    <el-dialog title="退单详情" :visible.sync="showDetailDialog" width="600px">
      <div v-if="detailRefund" class="detail-body">
        <!-- 状态横幅 -->
        <div class="detail-status-bar" :class="'ds-' + detailRefund.status">
          <span class="ds-text">{{ statusLabel(detailRefund.status) }}</span>
        </div>

        <!-- 基础信息 -->
        <div class="di-section">
          <div class="di-label">📋 基础信息</div>
          <div class="di-row"><span class="di-key">退单号</span><span class="di-val">{{ detailRefund.refundNo }}</span></div>
          <div class="di-row"><span class="di-key">订单号</span><span class="di-val">{{ detailRefund.orderNo }}</span></div>
          <div class="di-row"><span class="di-key">买家</span><span class="di-val">{{ detailRefund.buyerName || '用户#'+detailRefund.userId }}</span></div>
          <div class="di-row"><span class="di-key">类型</span>
            <span class="di-val">
               <span :class="['tag', typeTagClass(detailRefund)]">{{ typeText(detailRefund) }}</span>
            </span>
          </div>
          <div class="di-row"><span class="di-key">商品</span><span class="di-val">{{ detailRefund.productName || '—' }}</span></div>
        </div>

        <!-- 退款信息 -->
        <div class="di-section">
          <div class="di-label">💰 退款信息</div>
          <div class="di-row total"><span class="di-key">退款金额</span><span class="di-val pay">¥{{ (detailRefund.amount || 0).toFixed(2) }}</span></div>
          <div class="di-row"><span class="di-key">可退上限</span><span class="di-val">¥{{ (detailRefund.maxRefund || 0).toFixed(2) }}</span></div>
          <div class="di-row"><span class="di-key">退款原因</span><span class="di-val">{{ detailRefund.reason || '—' }}</span></div>
          <div class="di-row" v-if="detailRefund.description"><span class="di-key">问题描述</span><span class="di-val">{{ detailRefund.description }}</span></div>
          <div class="di-row" v-if="detailRefund.images && parseImages(detailRefund.images).length > 0">
            <span class="di-key">客户凭证</span>
            <span class="di-val" style="display:flex; gap:8px; flex-wrap:wrap;">
              <el-image
                v-for="(img, idx) in parseImages(detailRefund.images)" :key="idx"
                :src="img"
                :preview-src-list="parseImages(detailRefund.images)"
                style="width:60px; height:60px; border-radius:4px; border:1px solid #eee;"
                fit="cover"
              />
            </span>
          </div>
        </div>

        <!-- 审核与退货信息 -->
        <div class="di-section" v-if="detailRefund.status !== 0">
          <div class="di-label">📝 审核与退货信息</div>
          <div class="di-row" v-if="detailRefund.auditRemark"><span class="di-key">审核意见</span><span class="di-val">{{ detailRefund.auditRemark }}</span></div>
          <div class="di-row" v-if="detailRefund.auditTime"><span class="di-key">审核时间</span><span class="di-val">{{ detailRefund.auditTime }}</span></div>
          <div class="di-row" v-if="detailRefund.returnTrackingNumber"><span class="di-key">退货快递</span><span class="di-val">{{ detailRefund.returnCourierCompany || '—' }} {{ detailRefund.returnTrackingNumber }}</span></div>
          <div class="di-row" v-if="detailRefund.returnTime"><span class="di-key">寄回时间</span><span class="di-val">{{ detailRefund.returnTime }}</span></div>
        </div>

        <!-- 审核表单 (仅待审核状态) -->
        <div class="di-section" v-if="detailRefund.status === 0">
          <div class="di-label">📝 审核处理</div>
          <div v-if="detailRefund.reviewed" class="special-tip warn">
            <strong>特别提示：该订单用户已评价</strong><br />
            已评价的订单退款前必须进行退货。请确保同意前要求用户退回商品。
          </div>
          <div v-if="detailRefund.received === 0" class="special-tip danger">
            <strong>特别提示：快递退货 / 丢件</strong><br />
            请先核实物流确已退回，点击「确认退货退款」即直接退款。
          </div>
          <div class="field">
            <label for="auditRemarkInput">审核意见</label>
            <el-input id="auditRemarkInput" v-model="auditRemark" type="textarea" :rows="2" placeholder="同意退款 / 拒绝退款的理由…" />
          </div>
          <div class="small muted mt8">
            <template v-if="detailRefund.refundType === 2 && detailRefund.received !== 0">⚠ 同意退货后暂不打款，待用户填写退货单号、您确认收货后再退款。</template>
            <template v-else>⚠ 通过时校验退款金额 ≤ 上限，退回余额并视情况恢复优惠券/回滚积分。</template>
          </div>
        </div>
      </div>
      <span slot="footer" v-if="detailRefund">
        <template v-if="detailRefund.status === 0">
          <el-button @click="showDetailDialog = false">取消</el-button>
          <el-button style="border-color:#d9534f;color:#d9534f" @click="doAudit(detailRefund, 2)" :loading="auditLoading">驳回（恢复原状态）</el-button>
          <el-button type="primary" style="background:#4caf7d;border-color:#4caf7d" @click="doAudit(detailRefund, 1)" :loading="auditLoading">
            {{ detailRefund.received === 0 ? '确认退货退款' : (detailRefund.refundType === 2 ? '同意退货' : '通过退款') }}
          </el-button>
        </template>
        <template v-else-if="detailRefund.status === 4">
          <el-button @click="showDetailDialog = false">取消</el-button>
          <el-button type="primary" style="background:#4caf7d;border-color:#4caf7d" @click="openConfirmReturn(detailRefund)">确认收货并退款</el-button>
        </template>
        <template v-else>
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </template>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { manageRefunds, auditRefund, confirmReturnRefund } from "@/api/modules/order.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminRefundsView",
  data() {
    return {
      activeTab: null,
      statusTabs: [
        { label: "全部", value: null, count: null },
        { label: "待审核", value: 0, count: null },
        { label: "待用户退货", value: 3, count: null },
        { label: "待确认收货", value: 4, count: null },
        { label: "已退款", value: 1, count: null },
        { label: "已驳回", value: 2, count: null },
        { label: "管理员直退", value: "direct", count: null, adminOnly: true },
      ].filter(t => !t.adminOnly || this.isAdmin),
      list: [],
      loading: true,
      current: 1,
      pageSize: 10,
      total: 0,
      // Detail dialog
      showDetailDialog: false,
      detailRefund: null,
      // Filters
      filterRefundNo: "",
      filterUsername: "",
      auditRemark: "",
      auditLoading: false,
      // Confirm return (确认收到退货)
      showConfirmReturn: false,
      confirmTarget: null,
      confirmRemark: "",
      confirmLoading: false,
      // Direct refund
      directForm: { orderNo: "", reason: "" },
      directLoading: false,
      isAdmin: false,
    };
  },
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let s = Math.max(1, c - 2);
      let e = Math.min(tp, c + 2);
      if (e - s < 4) {
        if (s === 1) e = Math.min(tp, s + 4);
        else s = Math.max(1, e - 4);
      }
      for (let i = s; i <= e; i++) pages.push(i);
      return pages;
    },
  },
  created() {
    const raw = getStore("userInfo");
    if (raw) {
      try { this.isAdmin = JSON.parse(raw).role === "ADMIN"; } catch (e) {}
    }
    this.loadData();
  },
  methods: {
    statusClass(s) { return { 0:'warn', 1:'ok', 2:'cancel', 3:'warn', 4:'warn' }[s] || 'done'; },
    statusLabel(s) { return { 0:'待审核', 1:'已退款', 2:'已驳回', 3:'待用户退货', 4:'待确认收货' }[s] || '其他'; },

    typeText(rf) {
      let text = rf.refundType === 2 ? '退货退款' : '仅退款';
      if (rf.received === 0) text += ' (未收到货)';
      if (rf.reviewed) text += ' (已评价)';
      return text;
    },
    
    typeTagClass(rf) {
      if (rf.received === 0) return 'cancel'; // 红
      if (rf.reviewed) return 'warn';         // 橙
      if (rf.refundType === 2) return 'accent'; // 蓝
      return ''; // 灰
    },

    truncateOrderNo(no) {
      if (!no) return '—';
      return no.length > 14 ? no.substring(0, 14) + '…' : no;
    },

    async loadData() {
      if (this.activeTab === 'direct') return;
      this.loading = true;
      this.current = 1;
      try {
        const params = { current: 1, size: this.pageSize };
        if (this.activeTab !== null && this.activeTab !== '') params.status = this.activeTab;
        if (this.filterRefundNo) params.refundNo = this.filterRefundNo;
        if (this.filterUsername) params.username = this.filterUsername;
        const res = await manageRefunds(params);
        this.list = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) { this.list = []; }
      this.loading = false;
    },

    search() {
      this.current = 1;
      // activeTab doesn't need to be reset unless we want to search across all tabs
      // this.activeTab = null; 
      this.loadData();
    },

    async goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loading = true;
      try {
        const params = { current: page, size: this.pageSize };
        if (this.activeTab !== null && this.activeTab !== '') params.status = this.activeTab;
        if (this.filterRefundNo) params.refundNo = this.filterRefundNo;
        if (this.filterUsername) params.username = this.filterUsername;
        const res = await manageRefunds(params);
        this.list = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) { this.list = []; }
      this.loading = false;
    },



    openConfirmReturn(rf) {
      this.confirmTarget = rf;
      this.confirmRemark = '';
      this.showConfirmReturn = true;
    },
    async doConfirmReturn() {
      if (!this.confirmTarget) return;
      this.confirmLoading = true;
      try {
        await confirmReturnRefund(this.confirmTarget.id, { remark: this.confirmRemark || '' });
        this.$message.success('已确认收货，退款已退回用户余额');
        this.showConfirmReturn = false;
        this.loadData();
      } catch (e) {
        this.$message.error(e.message || '操作失败');
      } finally {
        this.confirmLoading = false;
      }
    },

    async doAudit(rf, result) {
      this.auditLoading = true;
      try {
        await auditRefund(rf.id, { status: result, auditRemark: this.auditRemark || '' });
        this.$message.success(result === 1 ? "处理通过" : "已驳回退单");
        this.showDetailDialog = false;
        this.loadData();
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      } finally {
        this.auditLoading = false;
      }
    },

    showDetail(rf) {
      this.detailRefund = rf;
      this.auditRemark = '';
      if (rf.status === 0) {
        if (rf.received === 0) this.auditRemark = '已核实快递退回，确认退货退款';
        else if (rf.refundType === 2) this.auditRemark = '同意退货，请尽快寄回商品并填写退货快递单号';
        else this.auditRemark = '同意退款，金额已返回您的余额账号';
      }
      this.showDetailDialog = true;
    },
    parseImages(imgStr) {
      if (!imgStr) return [];
      try {
        return JSON.parse(imgStr);
      } catch (e) {
        console.warn("Failed to parse images", e);
        return [];
      }
    },

    async submitDirectRefund() {
      const orderNo = this.directForm.orderNo.trim();
      const reason = this.directForm.reason.trim();
      if (!orderNo) return this.$message.warning("请输入订单号");
      if (!reason) return this.$message.warning("请输入退款理由");
      this.directLoading = true;
      try {
        const { postJson } = await import("@/api/axios.js");
        await postJson("/refunds/direct", { orderNo, reason });
        this.$message.success("直接退款成功");
        this.directForm = { orderNo: "", reason: "" };
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      } finally {
        this.directLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ====== 搜索筛选 ====== */
.row { display: flex; gap: 14px; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }

/* ====== Tabs（下划线风格，对齐 wireframe.css） ====== */
.tabs { display: flex; gap: 0; border-bottom: 1px solid #cfd4da; margin-bottom: 14px; flex-wrap: wrap; }
.tab {
  padding: 8px 16px; font-size: 13px; color: #666; border-bottom: 2px solid transparent;
  cursor: pointer; white-space: nowrap; transition: color .15s;
}
.tab:hover { color: #5b8def; }
.tab.on { color: #5b8def; border-bottom-color: #5b8def; font-weight: 600; }
.tab b { margin-left: 4px; }

/* ====== 卡片 ====== */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; margin-bottom: 16px; }

/* ====== 表格（对齐 wireframe.css .tbl） ====== */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th {
  background: #f7f8fa; text-align: left; padding: 10px; border-bottom: 1px solid #cfd4da;
  color: #555; font-weight: 600; white-space: nowrap;
}
.tbl td { padding: 10px; border-bottom: 1px solid #eef0f3; color: #555; vertical-align: middle; }
.tbl tr:hover td { background: #fafbfc; }
.tbl tr:last-child td { border-bottom: none; }
.empty-td { text-align: center; padding: 40px !important; color: #888; }

.price { color: #d9534f; font-weight: 700; }
.small { font-size: 12px; }
.muted { color: #888; }

/* ====== 状态标签（对齐 wireframe.css .tag） ====== */
.tag {
  display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px;
  padding: 1px 8px; font-size: 12px; color: #555;
}
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #e6914e; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }
.tag.cancel { background: #fbe7e6; border-color: #f0c2c0; color: #d9534f; }
.tag.done { background: #f0f0f0; border-color: #d0d0d0; color: #767676; }
.tag.accent { background: #e7eefc; border-color: #bcd0f6; color: #164082; }

/* ====== 操作链接 ====== */
.actions .action-link { cursor: pointer; }
.actions .action-link.ok { color: #4caf7d; }
.actions .action-link.danger { color: #d9534f; }
.actions .action-link:hover { opacity: .8; }

/* ====== 分页（对齐 wireframe.css .pager） ====== */
.pager { display: flex; gap: 6px; justify-content: flex-end; margin-top: 14px; align-items: center; }
.pager span {
  min-width: 30px; height: 30px; border: 1px solid #cfd4da; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  color: #555; background: #fff; padding: 0 8px; cursor: pointer;
}
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; border-color: #5b8def; color: #fff; }
.pager span.disabled { opacity: .3; cursor: not-allowed; }

/* ====== 直退卡片 ====== */
.direct-card {
  background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 20px;
}
.direct-card h3 { font-size: 15px; font-weight: 600; margin: 0 0 8px; color: #2c3e50; }

/* ====== 表单 ====== */
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 5px; }
.mt8 { margin-top: 8px; }
.mt12 { margin-top: 12px; }
.mb8 { margin-bottom: 8px; }
.mb12 { margin-bottom: 12px; }

/* ====== 审核弹窗 ====== */
.audit-box { background: #fafbfc; border: 1px solid #eef0f3; border-radius: 6px; padding: 12px; }
.audit-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
.audit-row .muted { color: #888; }

/* ====== 特别提示（已评价须退货 / 快递退款） ====== */
.special-tip { border-radius: 6px; padding: 10px 12px; font-size: 13px; line-height: 1.6; margin-bottom: 10px; }
.special-tip.danger { background: #fbe7e6; border: 1px solid #f0c2c0; color: #a92522; }
.special-tip.warn { background: #fcefe2; border: 1px solid #f0cda6; color: #9b5a1b; }

/* ====== 详情弹窗 ====== */
.detail-body { max-height: 70vh; overflow-y: auto; }
.detail-status-bar {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 10px;
  margin-bottom: 16px; font-size: 16px; font-weight: 600;
}
.ds-0, .ds-3, .ds-4 { background: #fff8e1; color: #e65100; }
.ds-1 { background: #e8f5e9; color: #0d4212; }
.ds-2 { background: #fbe9e7; color: #bf360c; }
.di-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.di-section:last-child { border-bottom: none; }
.di-label { font-size: 14px; font-weight: 600; color: #2c3e50; margin-bottom: 8px; }
.di-row { display: flex; padding: 4px 0; font-size: 13px; }
.di-key { width: 80px; color: #999; flex-shrink: 0; }
.di-val { color: #555; }
.di-row.total { border-top: 1px solid #eee; padding-top: 8px; margin-top: 4px; }
.di-val.pay { font-size: 16px; font-weight: 700; color: #e74c3c; }
</style>
