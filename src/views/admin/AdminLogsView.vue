<template>
  <div class="admin-logs">
    <div class="page-header">
      <h2>日志审核</h2>
    </div>

    <!-- Tab 切换 -->
    <div class="tabs">
      <span :class="['tab', { on: activeTab === 'sys' }]" @click="switchTab('sys')">系统操作日志</span>
      <span :class="['tab', { on: activeTab === 'order' }]" @click="switchTab('order')">订单流转日志</span>
    </div>

    <!-- ====== 系统操作日志 ====== -->
    <template v-if="activeTab === 'sys'">
      <div class="search-bar">
        <el-input v-model="sysQuery.username" placeholder="操作人用户名" style="width: 200px" clearable />
        <el-input v-model="sysQuery.operation" placeholder="操作描述" style="width: 200px; margin-left: 10px;" clearable />
        <el-button type="primary" style="margin-left: 10px;" @click="sysQuery.current = 1; fetchSysLogs()">查询</el-button>
      </div>

      <el-table :data="sysData" v-loading="sysLoading" border stripe style="width: 100%; margin-top: 20px;">
        <el-table-column prop="id" label="日志ID" width="100" />
        <el-table-column prop="username" label="操作人" width="150" />
        <el-table-column prop="operation" label="操作描述" width="200" />
        <el-table-column prop="method" label="请求方法" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="150" />
        <el-table-column prop="time" label="耗时(ms)" width="100" />
        <el-table-column prop="createTime" label="操作时间" width="200">
          <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; text-align: right;">
        <el-pagination background layout="prev, pager, next, total"
          :total="sysTotal" :page-size="sysQuery.size"
          :current-page.sync="sysQuery.current" @current-change="fetchSysLogs" />
      </div>
    </template>

    <!-- ====== 订单流转日志 ====== -->
    <template v-if="activeTab === 'order'">
      <div class="search-bar">
        <el-input v-model="orderQuery.orderId" placeholder="订单ID（模糊）" style="width: 180px" clearable />
        <el-select v-model="orderQuery.operatorRole" placeholder="操作人角色" style="width: 140px; margin-left: 10px;" clearable>
          <el-option label="用户" value="USER" />
          <el-option label="管理员" value="ADMIN" />
          <el-option label="商家" value="MERCHANT" />
        </el-select>
        <el-input v-model="orderQuery.remark" placeholder="备注关键词" style="width: 200px; margin-left: 10px;" clearable />
        <el-button type="primary" style="margin-left: 10px;" @click="orderQuery.current = 1; fetchOrderLogs()">查询</el-button>
      </div>

      <el-table :data="orderData" v-loading="orderLoading" border stripe style="width: 100%; margin-top: 20px;">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="orderId" label="订单ID" width="110" />
        <el-table-column label="状态变更" width="180">
          <template slot-scope="scope">
            <span class="tag">{{ statusText(scope.row.fromStatus) }}</span>
            <span style="margin: 0 4px;">→</span>
            <span class="tag accent">{{ statusText(scope.row.toStatus) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column prop="operatorRole" label="角色" width="90">
          <template slot-scope="scope">
            <span :class="['tag', roleClass(scope.row.operatorRole)]">{{ roleText(scope.row.operatorRole) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column prop="createTime" label="时间" width="200">
          <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; text-align: right;">
        <el-pagination background layout="prev, pager, next, total"
          :total="orderTotal" :page-size="orderQuery.size"
          :current-page.sync="orderQuery.current" @current-change="fetchOrderLogs" />
      </div>
    </template>
  </div>
</template>

<script>
import { getLogs, getOrderStatusLogs } from '@/api/modules/log'

const STATUS_MAP = {
  0: '待支付', 1: '待发货', 2: '待收货', 3: '待评价', 4: '已完成',
  '-1': '已取消', '-2': '退款申请中', '-3': '已退款', '-4': '管理员退款'
}

export default {
  name: 'AdminLogsView',
  data() {
    return {
      activeTab: 'sys',
      // 系统日志
      sysLoading: false,
      sysData: [],
      sysTotal: 0,
      sysQuery: { current: 1, size: 10, username: '', operation: '' },
      // 订单流转日志
      orderLoading: false,
      orderData: [],
      orderTotal: 0,
      orderQuery: { current: 1, size: 10, orderId: '', operatorRole: '', remark: '' }
    }
  },
  created() {
    this.fetchSysLogs()
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab
      if (tab === 'sys' && this.sysData.length === 0) this.fetchSysLogs()
      if (tab === 'order' && this.orderData.length === 0) this.fetchOrderLogs()
    },

    // ===== 系统日志 =====
    async fetchSysLogs() {
      this.sysLoading = true
      try {
        const res = await getLogs(this.sysQuery)
        if (res.code === 200 && res.data) {
          this.sysData = res.data.records || []
          this.sysTotal = Number(res.data.total) || 0
        }
      } catch (e) {
        this.$message.error('请求失败')
      } finally {
        this.sysLoading = false
      }
    },

    // ===== 订单流转日志 =====
    async fetchOrderLogs() {
      this.orderLoading = true
      try {
        const params = { current: this.orderQuery.current, size: this.orderQuery.size }
        if (this.orderQuery.orderId) params.orderId = this.orderQuery.orderId
        if (this.orderQuery.operatorRole) params.operatorRole = this.orderQuery.operatorRole
        if (this.orderQuery.remark) params.remark = this.orderQuery.remark
        const res = await getOrderStatusLogs(params)
        if (res.code === 200 && res.data) {
          this.orderData = res.data.records || []
          this.orderTotal = Number(res.data.total) || 0
        }
      } catch (e) {
        this.$message.error('请求失败')
      } finally {
        this.orderLoading = false
      }
    },

    statusText(code) {
      return STATUS_MAP[String(code)] || String(code)
    },
    roleText(role) {
      return { USER: '用户', ADMIN: '管理员', MERCHANT: '商家' }[role] || role || '—'
    },
    roleClass(role) {
      return { USER: '', ADMIN: 'warn', MERCHANT: 'accent' }[role] || ''
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleString()
    }
  }
}
</script>

<style scoped>
.admin-logs { padding: 20px; }
.page-header { margin-bottom: 20px; }

.tabs { display: flex; gap: 0; border-bottom: 1px solid #cfd4da; margin-bottom: 14px; }
.tab {
  padding: 8px 16px; font-size: 13px; color: #666; border-bottom: 2px solid transparent;
  cursor: pointer; white-space: nowrap; transition: color .15s;
}
.tab:hover { color: #2a69d4; }
.tab.on { color: #2a69d4; border-bottom-color: #2a69d4; font-weight: 600; }

.search-bar { display: flex; align-items: center; flex-wrap: wrap; }

.tag {
  display: inline-block; background: #e9ecf1; border: 1px solid #cfd4da; border-radius: 4px;
  padding: 1px 6px; font-size: 12px; color: #555;
}
.tag.warn { background: #fcefe2; border-color: #f0cda6; color: #c86a20; }
.tag.accent { background: #e7eefc; border-color: #bcd0f6; color: #164082; }
</style>
