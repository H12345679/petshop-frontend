<template>
  <div id="admin-refunds-page">
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
                <span :class="['tag', rf.refundType === 2 ? 'warn' : '']">{{ rf.refundType === 2 ? '退货退款' : '仅退款' }}</span>
                <span v-if="rf.received === 0" class="tag cancel" style="margin-left:4px">未收到货</span>
                <span v-if="rf.reviewed" class="tag warn" style="margin-left:4px">已评价</span>
              </td>
              <td class="price">¥{{ (rf.amount || 0).toFixed(2) }}</td>
              <td class="small">{{ rf.reason || '—' }}</td>
              <td><span :class="['tag', statusClass(rf.status)]">{{ statusLabel(rf.status) }}</span></td>
              <td class="small actions">
                <template v-if="rf.status === 0">
                  <b v-if="rf.received === 0" class="action-link ok" @click="auditRefund(rf, 1)">确认退货退款</b>
                  <b v-else-if="rf.refundType === 2" class="action-link ok" @click="auditRefund(rf, 1)">同意退货</b>
                  <b v-else class="action-link ok" @click="auditRefund(rf, 1)">通过</b>
                  <span class="muted"> · </span>
                  <b class="action-link danger" @click="auditRefund(rf, 2)">驳回</b>
                </template>
                <template v-else-if="rf.status === 3">
                  <span class="muted">待用户寄回退货…</span>
                </template>
                <template v-else-if="rf.status === 4">
                  <b class="action-link ok" @click="openConfirmReturn(rf)">确认收货并退款</b>
                </template>
                <template v-else>
                  <span class="action-link" @click="showDetail(rf)">详情</span>
                </template>
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

    <!-- ====== 审核弹窗 ====== -->
    <el-dialog title="退单审核" :visible.sync="showAudit" width="480px">
      <div class="small muted mb8">退单 {{ auditRefundNo }} · 订单 {{ auditOrderNo }}</div>

      <!-- 特别提示 -->
      <div v-if="auditTarget && auditTarget.reviewed" class="special-tip danger">
        ⚠ 特别提示：该订单用户<b>已评价</b>，退款必须退货。请点击「同意退货」，
        待用户寄回商品并确认收货后再打款，不可直接仅退款。
      </div>
      <div v-else-if="auditTarget && auditTarget.received === 0" class="special-tip warn">
        📦 快递退款：用户声明<b>未收到货</b>（快递退回/丢件），无需用户寄回。
        请先核实物流确已退回，点击「确认退货退款」即直接退款。
      </div>

      <div class="audit-box">
        <div class="audit-row"><span class="muted">退款类型</span>
          <span>{{ auditTarget && auditTarget.refundType === 2 ? '退货退款' : '仅退款' }}
            <template v-if="auditTarget && auditTarget.received === 0">（未收到货）</template>
          </span>
        </div>
        <div class="audit-row"><span class="muted">退款商品</span><span>{{ auditProductName }}</span></div>
        <div class="audit-row"><span class="muted">申请金额</span><span class="price">¥{{ (auditAmount || 0).toFixed(2) }}</span></div>
        <div class="audit-row"><span class="muted">可退上限(分摊实付)</span><span>¥{{ (auditMaxRefund || 0).toFixed(2) }}</span></div>
        <div class="audit-row"><span class="muted">退款原因</span><span>{{ auditReason }}</span></div>
        <div class="audit-row" v-if="auditTarget && auditTarget.description">
          <span class="muted">问题描述</span><span>{{ auditTarget.description }}</span>
        </div>
        <!-- 客户凭证 -->
        <div v-if="auditImages && auditImages.length > 0" class="audit-images mt12">
          <div class="muted mb4">客户凭证</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <el-image
              v-for="(img, idx) in auditImages" :key="idx"
              :src="img"
              :preview-src-list="auditImages"
              style="width:80px; height:80px; border-radius:4px; border:1px solid #eee;"
              fit="cover"
            />
          </div>
        </div>
      </div>
      <div class="field mt12">
        <label>审核意见</label>
        <el-input v-model="auditRemark" type="textarea" :rows="2" placeholder="同意退款，金额已返回您的余额账号" />
      </div>
      <div class="small muted mt8">
        <template v-if="auditTarget && auditTarget.refundType === 2">⚠ 同意退货后暂不打款，待用户填写退货单号、您确认收货后再退款。</template>
        <template v-else>⚠ 通过时校验退款金额 ≤ 上限，退回余额并视情况恢复优惠券/回滚积分。</template>
      </div>
      <span slot="footer">
        <el-button @click="showAudit = false">取消</el-button>
        <el-button style="border-color:#d9534f;color:#d9534f" @click="doAudit(2)" :loading="auditLoading">驳回（恢复原状态）</el-button>
        <el-button type="primary" style="background:#4caf7d;border-color:#4caf7d" @click="doAudit(1)" :loading="auditLoading">
          {{ auditTarget && auditTarget.received === 0 ? '确认退货退款' : (auditTarget && auditTarget.refundType === 2 ? '同意退货' : '通过退款') }}
        </el-button>
      </span>
    </el-dialog>

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
          <label>备注（选填）</label>
          <el-input v-model="confirmRemark" type="textarea" :rows="2" placeholder="退货已验收无误" />
        </div>
        <div class="small muted mt8">⚠ 确认后立即退款到用户余额，订单转为「已退款」，库存回滚。</div>
      </template>
      <span slot="footer">
        <el-button @click="showConfirmReturn = false">取消</el-button>
        <el-button type="primary" style="background:#4caf7d;border-color:#4caf7d" :loading="confirmLoading" @click="doConfirmReturn">确认收货并退款</el-button>
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
      activeTab: 0,
      statusTabs: [
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
      // Audit dialog
      showAudit: false,
      auditTarget: null,
      auditRefundNo: "",
      auditOrderNo: "",
      auditProductName: "",
      auditAmount: 0,
      auditMaxRefund: 0,
      auditReason: "",
      auditImages: [],
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
        const res = await manageRefunds(params);
        this.list = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) { this.list = []; }
      this.loading = false;
    },

    async goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loading = true;
      try {
        const params = { current: page, size: this.pageSize };
        if (this.activeTab !== null && this.activeTab !== '') params.status = this.activeTab;
        const res = await manageRefunds(params);
        this.list = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) { this.list = []; }
      this.loading = false;
    },

    auditRefund(rf, result) {
      this.auditTarget = rf;
      this.auditRefundNo = rf.refundNo || '';
      this.auditOrderNo = rf.orderNo || 'ORD…'+String(rf.orderId).slice(-4);
      this.auditProductName = rf.productName || '—';
      this.auditAmount = rf.amount || 0;
      this.auditMaxRefund = rf.maxRefund || 0;
      this.auditReason = rf.reason || '—';
      try {
        this.auditImages = rf.images ? JSON.parse(rf.images) : [];
      } catch (e) {
        this.auditImages = [];
      }
      if (result === 1) {
        if (rf.received === 0) this.auditRemark = '已核实快递退回，确认退货退款';
        else if (rf.refundType === 2) this.auditRemark = '同意退货，请尽快寄回商品并填写退货快递单号';
        else this.auditRemark = '同意退款，金额已返回您的余额账号';
      } else {
        this.auditRemark = '';
      }
      this.showAudit = true;
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

    async doAudit(result) {
      if (!this.auditTarget) return;
      this.auditLoading = true;
      try {
        await auditRefund(this.auditTarget.id, { status: result, auditRemark: this.auditRemark || '' });
        this.$message.success(result === 1 ? "退款已通过" : "已驳回退款");
        this.showAudit = false;
        this.loadData();
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      } finally {
        this.auditLoading = false;
      }
    },

    showDetail(rf) {
      const info = [];
      if (rf.refundNo) info.push("退单号：" + rf.refundNo);
      if (rf.orderNo) info.push("订单号：" + rf.orderNo);
      if (rf.buyerName) info.push("买家：" + rf.buyerName);
      if (rf.productName) info.push("商品：" + rf.productName);
      info.push("类型：" + (rf.refundType === 2 ? "退货退款" : "仅退款") + (rf.received === 0 ? "（未收到货·快递退款）" : ""));
      if (rf.reviewed) info.push("特别提示：该订单用户已评价，退款须退货");
      info.push("退款金额：¥" + (rf.amount || 0).toFixed(2));
      info.push("可退上限：¥" + (rf.maxRefund || 0).toFixed(2));
      if (rf.reason) info.push("原因：" + rf.reason);
      if (rf.description) info.push("问题描述：" + rf.description);
      if (rf.returnTrackingNumber) info.push("退货快递：" + (rf.returnCourierCompany || '') + " " + rf.returnTrackingNumber);
      if (rf.auditRemark) info.push("审核意见：" + rf.auditRemark);
      if (rf.auditTime) info.push("审核时间：" + rf.auditTime);
      this.$alert(info.join("\n"), "退单详情", { confirmButtonText: "知道了" });
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
.tag.done { background: #f0f0f0; border-color: #d0d0d0; color: #888; }

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
.special-tip.danger { background: #fbe7e6; border: 1px solid #f0c2c0; color: #c9302c; }
.special-tip.warn { background: #fcefe2; border: 1px solid #f0cda6; color: #b5722e; }
</style>
