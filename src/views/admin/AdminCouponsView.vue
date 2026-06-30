<template>
  <div id="admin-coupons-page">
    <div class="page-head">
      <span class="page-title">交易 / 优惠券管理</span>
    </div>

    <!-- 搜索栏 -->
    <div class="card search-bar">
      <span class="small muted">券名</span>
      <el-input v-model="searchName" placeholder="券名模糊搜索" size="small" style="width:180px" clearable @keyup.enter="loadCoupons" />
      <span class="small muted">类型</span>
      <el-select v-model="filterType" placeholder="全部" size="small" style="width:110px" clearable @change="loadCoupons">
        <el-option label="全部" :value="null" />
        <el-option label="满减" :value="1" />
        <el-option label="折扣" :value="2" />
      </el-select>
      <span class="small muted">状态</span>
      <el-select v-model="filterStatus" placeholder="全部" size="small" style="width:110px" clearable @change="loadCoupons">
        <el-option label="全部" :value="null" />
        <el-option label="上架" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
      <el-button size="small" type="primary" @click="loadCoupons">查询</el-button>
      <span class="spacer"></span>
      <el-button size="small" type="primary" @click="openCreate">＋ 新建优惠券</el-button>
    </div>

    <!-- 表格 -->
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
        <thead>
          <tr>
            <th>券名</th>
            <th style="width:74px">类型</th>
            <th>门槛</th>
            <th>面额 / 折扣</th>
            <th>发行 / 剩余</th>
            <th>有效期</th>
            <th style="width:78px">状态</th>
            <th style="width:140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="empty-td">⏳ 加载中…</td></tr>
          <tr v-else-if="list.length === 0"><td colspan="8" class="empty-td">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.name }}</td>
            <td><span :class="['tag', row.type === 1 ? 'accent' : 'warn']">{{ row.type === 1 ? '满减' : '折扣' }}</span></td>
            <td>{{ Number(row.threshold) > 0 ? '满 ¥' + Number(row.threshold).toFixed(0) : '无门槛' }}</td>
            <td class="price">{{ row.type === 1 ? '减 ¥' + Number(row.amount).toFixed(0) : (Number(row.amount) * 10).toFixed(1) + ' 折' }}</td>
            <td class="small">{{ row.remain }} / {{ row.total }}</td>
            <td class="small muted">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</td>
            <td><span :class="['tag', statusClass(row)]">{{ statusText(row) }}</span></td>
            <td class="small actions">
              <span class="action-link" @click="openEdit(row)">编辑</span>
              <span class="muted"> · </span>
              <span v-if="!isExpired(row.endTime)" :class="['action-link', row.status === 1 ? 'danger' : 'ok']" @click="toggleStatus(row)">
                {{ row.status === 1 ? '下架' : '上架' }}
              </span>
              <span class="muted" v-if="!isExpired(row.endTime)"> · </span>
              <span class="action-link danger" @click="handleDelete(row)">删除</span>
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
      <span class="total-count">共 {{ total }} 张</span>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog :title="isEdit ? '编辑优惠券' : '新建优惠券'" :visible.sync="showDialog" width="560px" :close-on-click-modal="false">
      <div class="form-body">
        <div class="form-row">
          <div class="field">
            <label>券名 <span class="req">*</span></label>
            <el-input v-model="form.name" placeholder="如 新人大礼包 满200减20" maxlength="50" />
          </div>
          <div class="field" style="max-width:160px">
            <label>类型 <span class="req">*</span></label>
            <el-select v-model="form.type" style="width:100%">
              <el-option label="满减" :value="1" />
              <el-option label="折扣" :value="2" />
            </el-select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>门槛金额（满 X 元可用）</label>
            <el-input-number v-model="form.threshold" :min="0" :precision="2" style="width:100%" />
          </div>
          <div class="field">
            <label>{{ form.type === 1 ? '减免金额' : '折扣率' }}</label>
            <el-input-number v-if="form.type === 1" v-model="form.amount" :min="1" :precision="2" style="width:100%" />
            <el-input-number v-else v-model="form.amount" :min="0.1" :max="9.9" :precision="2" :step="0.1" style="width:100%" />
            <span class="form-hint">{{ form.type === 1 ? '满减填减额(20)；' : '折扣填 0.90' }}</span>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>发行总量 <span class="req">*</span></label>
            <el-input-number v-model="form.total" :min="1" :precision="0" style="width:100%" />
          </div>
          <div class="field" style="max-width:160px">
            <label>状态</label>
            <el-select v-model="form.status" style="width:100%">
              <el-option label="上架" :value="1" />
              <el-option label="下架" :value="0" />
            </el-select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>生效时间</label>
            <el-date-picker v-model="form.startTime" type="datetime" value-format="yyyy-MM-dd HH:mm:ss" placeholder="选择生效时间" style="width:100%" />
          </div>
          <div class="field">
            <label>失效时间</label>
            <el-date-picker v-model="form.endTime" type="datetime" value-format="yyyy-MM-dd HH:mm:ss" placeholder="选择失效时间" style="width:100%" />
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { manageCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/api/modules/coupon.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminCouponsView",
  data() {
    return {
      list: [],
      loading: false,
      total: 0,
      current: 1,
      size: 15,
      searchName: "",
      filterType: null,
      filterStatus: null,
      isAdmin: false,
      showDialog: false,
      isEdit: false,
      submitting: false,
      editId: null,
      form: this.getEmptyForm(),
    };
  },
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.total / this.size)); },
    pageRange() {
      const pages = [];
      const tp = this.totalPages;
      const c = this.current;
      let start = Math.max(1, c - 2);
      let end = Math.min(tp, c + 2);
      if (end - start < 4) {
        if (start === 1) end = Math.min(tp, start + 4);
        else start = Math.max(1, end - 4);
      }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    },
  },
  created() {
    const raw = getStore("userInfo");
    if (raw) {
      try { const u = JSON.parse(raw); this.isAdmin = u.role === "ADMIN"; } catch (e) { /* ignore */ }
    }
    this.loadCoupons();
  },
  methods: {
    getEmptyForm() {
      return { name: "", type: 1, threshold: 0, amount: 10, total: 100, status: 1, startTime: "", endTime: "" };
    },

    async loadCoupons() {
      this.loading = true;
      this.current = 1;
      try {
        const params = { current: 1, size: this.size };
        if (this.searchName) params.name = this.searchName;
        if (this.filterType !== null) params.type = this.filterType;
        if (this.filterStatus !== null) params.status = this.filterStatus;
        const res = await manageCoupons(params);
        const d = res.data || {};
        this.list = d.records || [];
        this.total = d.total || 0;
      } catch (e) {
        this.$message.error("加载失败");
      } finally {
        this.loading = false;
      }
    },

    async goPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.current = page;
      this.loading = true;
      try {
        const params = { current: page, size: this.size };
        if (this.searchName) params.name = this.searchName;
        if (this.filterType !== null) params.type = this.filterType;
        if (this.filterStatus !== null) params.status = this.filterStatus;
        const res = await manageCoupons(params);
        this.list = res.data?.records || [];
        this.total = res.data?.total || 0;
      } catch (e) { this.list = []; }
      this.loading = false;
    },

    openCreate() {
      this.isEdit = false;
      this.editId = null;
      this.form = this.getEmptyForm();
      this.showDialog = true;
    },

    openEdit(row) {
      this.isEdit = true;
      this.editId = row.id;
      this.form = {
        name: row.name,
        type: row.type,
        threshold: Number(row.threshold),
        amount: Number(row.amount),
        total: row.total,
        status: row.status,
        startTime: row.startTime,
        endTime: row.endTime,
      };
      this.showDialog = true;
    },

    async submitForm() {
      const f = this.form;
      if (!f.name || !f.name.trim()) return this.$message.warning("请输入优惠券名称");
      if (f.amount === null || f.amount === undefined) return this.$message.warning("请输入优惠金额/折扣率");
      if (!f.total || f.total < 1) return this.$message.warning("请输入有效的发放总量");
      const payload = { ...f, name: f.name.trim() };
      this.submitting = true;
      try {
        if (this.isEdit) {
          await updateCoupon(this.editId, payload);
          this.$message.success("更新成功");
        } else {
          await createCoupon(payload);
          this.$message.success("创建成功");
        }
        this.showDialog = false;
        this.loadCoupons();
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      } finally {
        this.submitting = false;
      }
    },

    async toggleStatus(row) {
      const label = row.status === 1 ? "下架" : "上架";
      try {
        await this.$confirm(`确认${label}「${row.name}」？`, "提示", { type: "warning", confirmButtonText: "确认" });
        await updateCoupon(row.id, { status: row.status === 1 ? 0 : 1 });
        this.$message.success(`${label}成功`);
        this.loadCoupons();
      } catch (e) {
        if (e !== "cancel") this.$message.error(e.message || `${label}失败`);
      }
    },

    formatDate(t) { return t ? t.substring(5, 10) : ''; },

    isExpired(endTime) {
      if (!endTime) return false;
      return new Date(endTime).getTime() < Date.now();
    },

    statusText(row) {
      if (row.status === 1 && this.isExpired(row.endTime)) return '已过期';
      return row.status === 1 ? '上架' : '下架';
    },

    statusClass(row) {
      if (row.status === 1 && this.isExpired(row.endTime)) return 'expired';
      return row.status === 1 ? 'ok' : '';
    },

    async handleDelete(row) {
      try {
        await this.$confirm(`确认永久删除优惠券「${row.name}」？删除后不可恢复`, "删除确认", {
          type: "warning",
          confirmButtonText: "确认删除",
        });
        await deleteCoupon(row.id);
        this.$message.success("已删除");
        this.loadCoupons();
      } catch (e) {
        if (e !== "cancel") this.$message.error(e.message || "删除失败");
      }
    },
  },
};
</script>

<style scoped>
.page-head { margin-bottom:16px; }
.page-title { font-size:17px; font-weight:600; color:#2c3e50; }

/* Search bar */
.search-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.search-bar .small { font-size:12px; color:#888; white-space:nowrap; }
.spacer { flex:1; }

.card { background:#fff; border:1px solid #cfd4da; border-radius:8px; padding:16px; margin-bottom:16px; }

.loading-wrap { text-align:center; padding:60px; color:#888; }

/* Table */
.tbl { width:100%; border-collapse:collapse; font-size:13px; }
.tbl th { background:#f7f8fa; text-align:left; padding:10px; border-bottom:1px solid #cfd4da; color:#555; font-weight:600; white-space:nowrap; }
.tbl td { padding:10px; border-bottom:1px solid #eef0f3; color:#555; vertical-align:middle; }
.tbl tr:hover td { background:#fafbfc; }
.tbl tr:last-child td { border-bottom:none; }
.tbl .small { font-size:12px; }
.empty-td { text-align:center; padding:40px !important; color:#888; }

.price { color:#d9534f; font-weight:700; }
.muted { color:#888; }

.tag { display:inline-block; background:#e9ecf1; border:1px solid #cfd4da; border-radius:4px; padding:1px 8px; font-size:12px; color:#555; }
.tag.accent { background:#e7eefc; border-color:#bcd0f6; color:#5b8def; }
.tag.warn { background:#fcefe2; border-color:#f0cda6; color:#e6914e; }
.tag.ok { background:#e6f4ec; border-color:#b6dcc6; color:#4caf7d; }
.tag.expired { background:#f5f5f5; border-color:#d0d0d0; color:#999; }

.actions .action-link { cursor:pointer; color:#5b8def; }
.actions .action-link.danger { color:#d9534f; }
.actions .action-link.ok { color:#4caf7d; }
.actions .action-link:hover { opacity:.8; }

/* Pagination */
.pager { display:flex; gap:6px; justify-content:flex-end; margin-top:14px; align-items:center; }
.pager span { min-width:30px; height:30px; border:1px solid #cfd4da; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; color:#555; background:#fff; padding:0 8px; cursor:pointer; }
.pager span:hover { border-color:#5b8def; color:#5b8def; }
.pager span.on { background:#5b8def; border-color:#5b8def; color:#fff; }
.pager span.disabled { opacity:.3; cursor:not-allowed; }
.total-count { border:none !important; color:#888; font-size:12px; cursor:default !important; min-width:auto !important; }

/* Form */
.form-body { }
.form-row { display:flex; gap:14px; margin-bottom:4px; }
.form-row .field { flex:1; margin-bottom:14px; }
.field label { display:block; font-size:13px; color:#555; margin-bottom:5px; }
.field label .req { color:#d9534f; }
.form-hint { font-size:11px; color:#888; margin-top:2px; display:block; }
</style>
