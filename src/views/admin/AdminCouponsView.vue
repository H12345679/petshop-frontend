<template>
  <div id="admin-coupons-page">
    <!-- 筛选 + 新建（划线框 wireframe 风格） -->
    <div class="card row center wrap gap8" style="padding:12px 16px">
      <span class="small muted">券名</span>
      <el-input v-model="searchName" placeholder="券名模糊搜索" size="small" style="width:180px" clearable @keyup.enter.native="loadCoupons" />
      <span class="small muted">类型</span>
      <el-select v-model="searchType" placeholder="全部" size="small" style="width:110px" clearable @change="loadCoupons">
        <el-option label="全部" :value="null" />
        <el-option label="满减" :value="1" />
        <el-option label="折扣" :value="2" />
      </el-select>
      <span class="small muted">状态</span>
      <el-select v-model="searchStatus" placeholder="全部" size="small" style="width:110px" clearable @change="loadCoupons">
        <el-option label="全部" :value="null" />
        <el-option label="上架" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
      <el-button type="primary" size="small" @click="loadCoupons">查询</el-button>
      <span class="spacer"></span>
      <el-button type="primary" size="small" @click="openCreate">＋ 新建优惠券</el-button>
    </div>

    <!-- 表格 -->
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
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
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.name }}</td>
          <td><span :class="['tag', row.type === 1 ? 'accent' : 'warn']">{{ row.type === 1 ? '满减' : '折扣' }}</span></td>
          <td>{{ Number(row.threshold) > 0 ? '满 ¥' + Number(row.threshold).toFixed(0) : '无门槛' }}</td>
          <td class="price">{{ row.type === 1 ? '减 ¥' + Number(row.amount).toFixed(0) : (Number(row.amount) * 10).toFixed(1) + ' 折' }}</td>
          <td class="small">{{ row.remain }} / {{ row.total }}</td>
          <td class="small muted">{{ fmtShort(row.startTime) }} ~ {{ fmtShort(row.endTime) }}</td>
          <td>
            <span v-if="isExpired(row)" class="tag">已过期</span>
            <span v-else :class="['tag', row.status === 1 ? 'ok' : '']">{{ row.status === 1 ? '上架' : '下架' }}</span>
          </td>
          <td class="small ops">
            <span class="act-link" @click="openEdit(row)">编辑</span>
            <template v-if="!isExpired(row)">
              <span class="act-sep">·</span>
              <span v-if="row.status === 1" class="act-link danger" @click="toggleStatus(row)">下架</span>
              <span v-else class="act-link ok" @click="toggleStatus(row)">上架</span>
            </template>
          </td>
        </tr>
        <tr v-if="!loading && list.length === 0">
          <td colspan="8" style="text-align:center;color:#999;padding:32px">暂无数据</td>
        </tr>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pager" v-if="totalPages > 1">
      <span :class="{ disabled: current <= 1 }" @click="goPage(current - 1)">‹</span>
      <span v-for="p in pageRange" :key="p" :class="{ on: p === current }" @click="goPage(p)">{{ p }}</span>
      <span :class="{ disabled: current >= totalPages }" @click="goPage(current + 1)">›</span>
      <span class="total-hint">共 {{ total }} 张</span>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      :title="isEdit ? '编辑优惠券' : '新建优惠券'"
      :visible.sync="showDialog"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="form" :model="form" label-width="100px" size="small">
        <el-form-item label="优惠券名称" required>
          <el-input v-model="form.name" placeholder="如 新人大礼包 满200减20" maxlength="50" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio :label="1">满减</el-radio>
            <el-radio :label="2">折扣</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="门槛金额">
          <el-input-number v-model="form.threshold" :min="0" :precision="2" style="width:200px" />
          <span class="form-tip">元（0 = 无门槛）</span>
        </el-form-item>
        <el-form-item :label="form.type === 1 ? '减免金额' : '折扣率'">
          <el-input-number
            v-if="form.type === 1"
            v-model="form.amount"
            :min="1"
            :precision="2"
            style="width:200px"
          />
          <el-input-number
            v-else
            v-model="form.amount"
            :min="0.01"
            :max="9.99"
            :precision="2"
            :step="0.05"
            style="width:200px"
          />
          <span class="form-tip">{{ form.type === 1 ? '元' : '（如 0.90 = 9折）' }}</span>
        </el-form-item>
        <el-form-item label="发行总量" required>
          <el-input-number v-model="form.total" :min="1" :precision="0" style="width:200px" />
          <span class="form-tip">张</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">上架</el-radio>
            <el-radio :label="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生效时间" required>
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="选择生效时间"
            style="width:200px"
          />
        </el-form-item>
        <el-form-item label="失效时间" required>
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="选择失效时间"
            style="width:200px"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { manageCoupons, createCoupon, updateCoupon } from "@/api/modules/coupon.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminCouponsView",
  data() {
    return {
      // 搜索筛选
      searchName: "",
      searchType: null,
      searchStatus: null,
      // 列表
      list: [],
      loading: false,
      total: 0,
      current: 1,
      pageSize: 15,
      // 角色
      isAdmin: false,
      // 弹窗
      showDialog: false,
      isEdit: false,
      submitting: false,
      form: this.getEmptyForm(),
      editId: null,
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
      try {
        const u = JSON.parse(raw);
        this.isAdmin = u.role === "ADMIN";
      } catch (e) { /* ignore */ }
    }
    this.loadCoupons();
  },
  methods: {
    getEmptyForm() {
      return {
        name: "",
        type: 1,
        threshold: 0,
        amount: 10,
        total: 100,
        status: 1,
        startTime: "",
        endTime: "",
      };
    },

    async loadCoupons() {
      this.loading = true;
      try {
        const params = { current: this.current, size: this.pageSize };
        if (this.searchName) params.name = this.searchName;
        if (this.searchType !== null && this.searchType !== "") params.type = this.searchType;
        if (this.searchStatus !== null && this.searchStatus !== "") params.status = this.searchStatus;
        const res = await manageCoupons(params);
        const d = res.data || {};
        this.list = d.records || [];
        this.total = d.total || 0;
      } catch (e) {
        this.$message.error("加载优惠券列表失败");
      } finally {
        this.loading = false;
      }
    },

    goPage(p) {
      if (p < 1 || p > this.totalPages) return;
      this.current = p;
      this.loadCoupons();
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
      if (!f.total || f.total < 1) return this.$message.warning("请输入有效的发行总量");
      if (!f.startTime) return this.$message.warning("请选择生效时间");
      if (!f.endTime) return this.$message.warning("请选择失效时间");
      if (f.startTime >= f.endTime) return this.$message.warning("失效时间必须晚于生效时间");
      if (f.type === 1 && (!f.amount || f.amount < 0.01)) return this.$message.warning("请输入减免金额");

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
        this.current = 1;
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
        await this.$confirm(`确认${label}「${row.name}」？`, "提示", { type: "warning" });
        await updateCoupon(row.id, { status: row.status === 1 ? 0 : 1 });
        this.$message.success(`${label}成功`);
        this.loadCoupons();
      } catch (e) {
        if (e !== "cancel") this.$message.error(e.message || `${label}失败`);
      }
    },

    isExpired(row) {
      if (!row.endTime) return false;
      return new Date(row.endTime).getTime() < Date.now();
    },

    fmtShort(t) { return t ? String(t).substring(5, 16) : ''; },
  },
};
</script>

<style scoped>
/* 基础样式（对齐 wireframe） */
.row { display: flex; gap: 14px; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.spacer { flex: 1; }
.small { font-size: 12px; }
.muted { color: #888; }

.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 16px; margin-bottom: 16px; }

/* 表格 */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl th {
  background: #f5f6f8;
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  color: #444;
  border-bottom: 1px solid #dfe2e7;
  white-space: nowrap;
}
.tbl td {
  padding: 12px 10px;
  border-bottom: 1px solid #eef0f3;
  color: #333;
}
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafbfc; }

.price { color: #e74c3c; font-weight: 600; }

/* 标签 */
.tag {
  display: inline-block;
  background: #e9ecf1;
  border: 1px solid #cfd4da;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #555;
}
.tag.accent { background: #eef2ff; border-color: #b6c8f0; color: #5b8def; }
.tag.ok { background: #e6f4ec; border-color: #b6dcc6; color: #4caf7d; }
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #e6914e; }

/* 操作链接 */
.ops { white-space: nowrap; }
.act-link { color: #5b8def; cursor: pointer; }
.act-link:hover { opacity: 0.8; }
.act-link.danger { color: #d9534f; }
.act-link.ok { color: #4caf7d; }
.act-sep { color: #ccc; margin: 0 4px; }

/* 分页 */
.pager { display: flex; gap: 6px; justify-content: flex-end; margin-top: 14px; align-items: center; }
.pager span {
  min-width: 30px; height: 30px; border: 1px solid #cfd4da; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  color: #555; background: #fff; padding: 0 8px; cursor: pointer;
}
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; border-color: #5b8def; color: #fff; }
.pager span.disabled { opacity: 0.3; cursor: not-allowed; }
.total-hint { border: none !important; background: transparent !important; color: #888; font-size: 12px; cursor: default !important; }

.form-tip { margin-left: 8px; font-size: 12px; color: #999; }
</style>
