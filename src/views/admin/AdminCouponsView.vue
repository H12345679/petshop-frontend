<template>
  <div id="admin-coupons-page">
    <h2 class="page-title">🎫 优惠券管理</h2>

    <!-- 搜索 + 新建 -->
    <div class="toolbar">
      <el-input
        v-model="searchName"
        placeholder="搜索优惠券名称…"
        clearable
        size="small"
        style="width:220px"
        @keyup.enter.native="loadCoupons"
      />
      <el-button size="small" type="primary" @click="loadCoupons">搜索</el-button>
      <el-button size="small" @click="resetSearch">重置</el-button>
      <el-button size="small" type="success" @click="openCreate">+ 新建优惠券</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="list" v-loading="loading" stripe border style="width:100%">
      <el-table-column prop="id" label="ID" width="80" align="center" />
      <el-table-column prop="name" label="名称" min-width="130" />
      <el-table-column label="类型" width="70" align="center">
        <template slot-scope="{row}">{{ row.type === 1 ? '满减' : '折扣' }}</template>
      </el-table-column>
      <el-table-column label="使用门槛" width="110" align="center">
        <template slot-scope="{row}">
          <span v-if="Number(row.threshold) <= 0">无门槛</span>
          <span v-else>满 ¥{{ Number(row.threshold).toFixed(0) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="优惠" width="100" align="center">
        <template slot-scope="{row}">
          <span v-if="row.type === 1">减 ¥{{ Number(row.amount).toFixed(0) }}</span>
          <span v-else>{{ (Number(row.amount) * 10).toFixed(1) }} 折</span>
        </template>
      </el-table-column>
      <el-table-column label="库存" width="90" align="center">
        <template slot-scope="{row}">{{ row.remain }} / {{ row.total }}</template>
      </el-table-column>
      <!-- Admin 专列：所属店铺 -->
      <el-table-column label="所属店铺" width="140" align="center" v-if="isAdmin">
        <template slot-scope="{row}">
          {{ row.shopName || (row.shopId ? '店铺#'+row.shopId : '全局券') }}
        </template>
      </el-table-column>
      <el-table-column label="有效期" min-width="180" align="center">
        <template slot-scope="{row}">
          {{ formatTime(row.startTime) }} ~ {{ formatTime(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="70" align="center">
        <template slot-scope="{row}">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="mini">
            {{ row.status === 1 ? '上架' : '下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center" fixed="right">
        <template slot-scope="{row}">
          <el-button size="mini" @click="openEdit(row)">编辑</el-button>
          <el-button
            size="mini"
            :type="row.status === 1 ? 'warning' : 'success'"
            plain
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '下架' : '上架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      style="margin-top:20px;text-align:right"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="size"
      :current-page.sync="current"
      @current-change="loadCoupons"
    />

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      :title="isEdit ? '编辑优惠券' : '新建优惠券'"
      :visible.sync="showDialog"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="form" :model="form" label-width="100px" size="small">
        <el-form-item label="优惠券名称" required>
          <el-input v-model="form.name" placeholder="如：新人专享满减券" maxlength="50" />
        </el-form-item>
        <el-form-item label="优惠类型" required>
          <el-radio-group v-model="form.type">
            <el-radio :label="1">满减（减固定金额）</el-radio>
            <el-radio :label="2">折扣（按比例打折）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="使用门槛" required>
          <el-input-number v-model="form.threshold" :min="0" :precision="0" style="width:200px" />
          <span class="form-tip">元（0 = 无门槛）</span>
        </el-form-item>
        <el-form-item :label="form.type === 1 ? '减免金额' : '折扣率'" required>
          <el-input-number
            v-if="form.type === 1"
            v-model="form.amount"
            :min="1"
            :precision="0"
            style="width:200px"
          />
          <el-input-number
            v-else
            v-model="form.amount"
            :min="0.1"
            :max="9.9"
            :precision="1"
            :step="0.1"
            style="width:200px"
          />
          <span class="form-tip">{{ form.type === 1 ? '元' : '（如 0.9 = 9折）' }}</span>
        </el-form-item>
        <el-form-item label="发放总量" required>
          <el-input-number v-model="form.total" :min="1" :precision="0" style="width:200px" />
          <span class="form-tip">张</span>
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
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
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
      // 列表
      list: [],
      loading: false,
      total: 0,
      current: 1,
      size: 15,
      searchName: "",
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
  created() {
    // 判断角色
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
        startTime: "",
        endTime: "",
      };
    },

    async loadCoupons() {
      this.loading = true;
      try {
        const params = { current: this.current, size: this.size };
        if (this.searchName) params.name = this.searchName;
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

    resetSearch() {
      this.searchName = "";
      this.current = 1;
      this.loadCoupons();
    },

    // ---- 新建 ----
    openCreate() {
      this.isEdit = false;
      this.editId = null;
      this.form = this.getEmptyForm();
      this.showDialog = true;
    },

    // ---- 编辑 ----
    openEdit(row) {
      this.isEdit = true;
      this.editId = row.id;
      this.form = {
        name: row.name,
        type: row.type,
        threshold: Number(row.threshold),
        amount: Number(row.amount),
        total: row.total,
        startTime: row.startTime,
        endTime: row.endTime,
      };
      this.showDialog = true;
    },

    // ---- 提交表单 ----
    async submitForm() {
      const f = this.form;
      if (!f.name || !f.name.trim()) return this.$message.warning("请输入优惠券名称");
      if (f.type !== 1 && f.type !== 2) return this.$message.warning("请选择优惠类型");
      if (f.amount === null || f.amount === undefined) return this.$message.warning("请输入优惠金额/折扣率");
      if (!f.total || f.total < 1) return this.$message.warning("请输入有效的发放总量");
      if (!f.startTime) return this.$message.warning("请选择生效时间");
      if (!f.endTime) return this.$message.warning("请选择失效时间");
      if (f.startTime >= f.endTime) return this.$message.warning("失效时间必须晚于生效时间");

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

    // ---- 切换上架/下架 ----
    async toggleStatus(row) {
      const label = row.status === 1 ? "下架" : "上架";
      try {
        await this.$confirm(`确认${label}「${row.name}」？`, "提示", {
          type: "warning",
          confirmButtonText: "确认",
        });
        await updateCoupon(row.id, { status: row.status === 1 ? 0 : 1 });
        this.$message.success(`${label}成功`);
        this.loadCoupons();
      } catch (e) {
        if (e !== "cancel") this.$message.error(e.message || `${label}失败`);
      }
    },

    formatTime(t) {
      if (!t) return "";
      return t.substring(0, 10);
    },
  },
};
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 16px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.form-tip { margin-left: 8px; font-size: 12px; color: #999; }
</style>
