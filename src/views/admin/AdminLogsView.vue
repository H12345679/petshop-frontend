<template>
  <div class="admin-logs">
    <div class="page-header">
      <h2>日志审核</h2>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input v-model="query.username" placeholder="操作人用户名" style="width: 200px" clearable />
      <el-input v-model="query.operation" placeholder="操作描述" style="width: 200px; margin-left: 10px;" clearable />
      <el-button type="primary" style="margin-left: 10px;" @click="onSearch">查询</el-button>
    </div>

    <!-- 列表 -->
    <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%; margin-top: 20px;">
      <el-table-column prop="id" label="日志ID" width="100" />
      <el-table-column prop="username" label="操作人" width="150" />
      <el-table-column prop="operation" label="操作描述" width="200" />
      <el-table-column prop="method" label="请求方法" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP地址" width="150" />
      <el-table-column prop="time" label="耗时(ms)" width="100" />
      <el-table-column prop="createTime" label="操作时间" width="200">
        <template slot-scope="scope">
          {{ formatDate(scope.row.createTime) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 20px; text-align: right;">
      <el-pagination
        background
        layout="prev, pager, next, total"
        :total="total"
        :page-size="query.size"
        :current-page.sync="query.current"
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<script>
import { getLogs } from '@/api/modules/log'

export default {
  name: 'AdminLogsView',
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      query: {
        current: 1,
        size: 10,
        username: '',
        operation: ''
      }
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    onSearch() {
      this.query.current = 1
      this.fetchData()
    },
    async fetchData() {
      this.loading = true
      try {
        const res = await getLogs(this.query)
        if (res.code === 200 && res.data) {
          this.tableData = res.data.records || []
          this.total = Number(res.data.total) || 0
        } else {
          this.$message.error(res.msg || '获取日志失败')
        }
      } catch (error) {
        console.error(error)
        this.$message.error('请求失败')
      } finally {
        this.loading = false
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleString()
    }
  }
}
</script>

<style scoped>
.admin-logs { padding: 20px; }
.page-header { margin-bottom: 20px; }
</style>
