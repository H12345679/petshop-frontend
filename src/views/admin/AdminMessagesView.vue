<template>
  <div class="admin-messages-page">
    <el-row :gutter="24">
      <!-- 左侧：发送消息表单 -->
      <el-col :span="10">
        <el-card class="box-card" shadow="never">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold; font-size: 16px;">发送新消息</span>
          </div>
          <el-form :model="form" :rules="rules" ref="msgForm" label-position="top">
            <el-form-item label="消息标题" prop="title">
              <el-input v-model="form.title" placeholder="如：系统维护通知"></el-input>
            </el-form-item>

            <el-form-item label="消息内容" prop="content">
              <el-input 
                type="textarea" 
                v-model="form.content" 
                :rows="6" 
                placeholder="系统将于今晚24:00进行版本更新升级..."></el-input>
            </el-form-item>

            <el-form-item label="消息类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio-button :label="1">1 系统</el-radio-button>
                <el-radio-button :label="2">2 订单</el-radio-button>
                <el-radio-button :label="3">3 活动</el-radio-button>
                <el-radio-button :label="4">4 宠物资讯</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="推送范围" prop="scope">
              <el-radio-group v-model="form.scope">
                <el-radio-button :label="1">1 全体广播</el-radio-button>
                <el-radio-button :label="2">2 定向用户</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="目标用户 (定向时填)" prop="targetUserIds" v-if="form.scope === 2">
              <el-input 
                v-model="form.targetUserIds" 
                placeholder="填写用户 ID，多个用逗号隔开">
              </el-input>
            </el-form-item>

            <el-form-item style="margin-top: 30px; margin-bottom: 0;">
              <el-button 
                type="primary" 
                style="width: 100%; font-size: 16px; padding: 12px 0;" 
                @click="submitForm" 
                :loading="submitting">
                立即推送
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：历史消息列表 -->
      <el-col :span="14">
        <el-card class="box-card" shadow="never">
          <el-table :data="tableData" v-loading="loading" style="width: 100%">
            <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip>
            </el-table-column>
            
            <el-table-column label="类型" width="100">
              <template slot-scope="scope">
                <el-tag :type="getTypeTag(scope.row.type)" size="small">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="范围" width="100">
              <template slot-scope="scope">
                <span>{{ scope.row.scope === 1 ? '广播' : '定向' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="已读率" width="80">
              <template slot-scope="scope">
                <span style="color: #909399;">N/A</span>
              </template>
            </el-table-column>

            <el-table-column prop="createTime" label="发送时间" width="160">
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div style="text-align: right; margin-top: 20px;">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="page.current"
              :page-size="page.size"
              :total="page.total"
              @current-change="handlePageChange">
            </el-pagination>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { pushMessage, getManageMessages } from "@/api/modules/user.js";

export default {
  name: "AdminMessagesView",
  data() {
    return {
      form: {
        title: "",
        content: "",
        type: 1,
        scope: 1,
        targetUserIds: ""
      },
      rules: {
        title: [{ required: true, message: "请输入消息标题", trigger: "blur" }],
        content: [{ required: true, message: "请输入消息内容", trigger: "blur" }]
      },
      submitting: false,
      
      loading: false,
      tableData: [],
      page: {
        current: 1,
        size: 10,
        total: 0
      }
    };
  },
  created() {
    this.loadMessages();
  },
  methods: {
    getTypeName(type) {
      const map = { 1: "系统", 2: "订单", 3: "活动", 4: "资讯" };
      return map[type] || "未知";
    },
    getTypeTag(type) {
      const map = { 1: "", 2: "success", 3: "warning", 4: "info" };
      return map[type] || "";
    },
    async loadMessages() {
      this.loading = true;
      try {
        const res = await getManageMessages({
          current: this.page.current,
          size: this.page.size
        });
        if (res.data) {
          this.tableData = res.data.records || [];
          this.page.total = res.data.total || 0;
        }
      } catch (e) {
        this.$message.error("加载历史消息失败");
      } finally {
        this.loading = false;
      }
    },
    handlePageChange(val) {
      this.page.current = val;
      this.loadMessages();
    },
    submitForm() {
      this.$refs.msgForm.validate(async (valid) => {
        if (!valid) return;
        
        // 构造 payload
        let targetUserIds = [];
        if (this.form.scope === 2) {
          if (!this.form.targetUserIds.trim()) {
            this.$message.warning("定向发送必须填写目标用户ID");
            return;
          }
          targetUserIds = this.form.targetUserIds
            .split(/[,，]/)
            .map(id => id.trim())
            .filter(id => id)
            .map(id => Number(id));
            
          if (targetUserIds.length === 0 || targetUserIds.some(isNaN)) {
            this.$message.warning("目标用户ID格式不正确，必须是数字ID");
            return;
          }
        }

        const payload = {
          title: this.form.title,
          content: this.form.content,
          type: this.form.type,
          scope: this.form.scope,
          targetUserIds: this.form.scope === 2 ? targetUserIds : null
        };

        this.submitting = true;
        try {
          await pushMessage(payload);
          this.$message.success("推送成功！");
          this.$refs.msgForm.resetFields();
          this.form.targetUserIds = "";
          
          // 回到第一页并刷新列表
          this.page.current = 1;
          this.loadMessages();
        } catch (e) {
          this.$message.error("推送失败：" + (e.message || "未知错误"));
        } finally {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.admin-messages-page {
  /* Default Element UI styles work well here */
}
</style>
