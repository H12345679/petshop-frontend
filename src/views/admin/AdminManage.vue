<template>
  <div class="acontent">
    <!-- KPI 卡片 -->
    <div class="row mb16 gap16">
      <div class="kpi col flex1">
        <div class="kpi-label">总用户</div>
        <div class="kpi-value">{{ stats.totalUsers }}</div>
      </div>
      <div class="kpi col flex1">
        <div class="kpi-label">商家 (MERCHANT)</div>
        <div class="kpi-value">{{ stats.merchantCount }}</div>
      </div>
      <div class="kpi col flex1">
        <div class="kpi-label">付费会员</div>
        <div class="kpi-value">{{ stats.memberCount }}</div>
      </div>
      <div class="kpi col flex1">
        <div class="kpi-label">今日新增</div>
        <div class="kpi-value">{{ stats.todayNew }}</div>
      </div>
    </div>

    <!-- 检索条 -->
    <div class="card row center wrap gap8" style="padding:12px 16px; margin-bottom: 20px;">
      <span class="small muted">用户名</span>
      <div class="input-wrap" style="width:170px">
        <input aria-label="input" v-model="query.username" placeholder="用户名模糊搜索" @keyup.enter="doSearch" />
      </div>
      <span class="small muted">角色</span>
      <div class="input-wrap select-wrap" style="width:120px">
        <select aria-label="select" v-model="query.role" @change="doSearch">
          <option value="">全部</option>
          <option value="USER">USER</option>
          <option value="MERCHANT">MERCHANT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <span class="small muted">会员等级</span>
      <div class="input-wrap select-wrap" style="width:130px">
        <select aria-label="select" v-model="query.memberLevelId" @change="doSearch">
          <option value="">全部</option>
          <option :value="0">游客</option>
          <option v-for="lv in memberLevelOptions" :key="lv.id" :value="lv.id">{{ lv.name }}</option>
        </select>
      </div>
      <span class="small muted">状态</span>
      <div class="input-wrap select-wrap" style="width:110px">
        <select aria-label="select" v-model="query.status" @change="doSearch">
          <option value="">全部</option>
          <option :value="1">正常</option>
          <option :value="0">已禁用</option>
        </select>
      </div>
      <div class="btn primary sm" @click="doSearch">查询</div>
      <div class="btn sm" @click="resetQuery">重置</div>
    </div>

    <!-- 用户列表 -->
    <div class="card" style="padding:0;overflow-x:auto;">
      <table class="tbl">
        <thead>
          <tr>
            <th>用户名</th>
            <th>昵称</th>
            <th style="width:100px">角色</th>
            <th style="width:100px">会员等级</th>
            <th>余额</th>
            <th>积分</th>
            <th style="width:78px">状态</th>
            <th style="width:150px">注册时间</th>
            <th style="width:220px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in displayUsers" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.nickname || '—' }}</td>
            <td>
              <span class="tag" :class="getRoleClass(user.role)">{{ user.role }}</span>
            </td>
            <td>
              <span class="tag" :class="getMemberClass(user.memberLevelId)" v-if="user.memberLevelId > 0">
                {{ getMemberLevelName(user.memberLevelId) }}
              </span>
              <span class="small muted" v-else>游客</span>
            </td>
            <td class="price">¥{{ formatPrice(user.balance) }}</td>
            <td>{{ user.points || 0 }}</td>
            <td>
              <span class="tag" :class="user.status === 1 ? 'ok' : 'danger'">
                {{ user.status === 1 ? '正常' : '已禁用' }}
              </span>
            </td>
            <td class="small muted">{{ formatTime(user.createTime) }}</td>
            <td class="small">
              <span class="action-btn" @click="openRoleModal(user)" v-if="user.role !== 'ADMIN'">
                {{ user.role === 'MERCHANT' ? '改角色' : '设为商家' }}
              </span>
              <span class="action-divider" v-if="user.role !== 'ADMIN'">·</span>
              <span class="action-btn"
                v-if="user.role !== 'ADMIN'"
                :class="{ danger: user.status === 1 }"
                @click="toggleStatus(user)">
                {{ user.status === 1 ? '禁用' : '启用' }}
              </span>
              <span class="small muted" v-if="user.role === 'ADMIN'">系统账号</span>
            </td>
          </tr>
          <tr v-if="displayUsers.length === 0 && users.length > 0">
            <td colspan="9" class="text-center" style="padding: 40px; color: #595959;">当前筛选条件下无匹配数据</td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="9" class="text-center" style="padding: 40px; color: #595959;">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pager" v-if="total > 0">
      <span @click="changePage(query.page - 1)" :class="{ disabled: query.page <= 1 }">‹</span>
      <span v-for="p in totalPages" :key="p" :class="{ on: query.page === p }" @click="changePage(p)">{{ p }}</span>
      <span @click="changePage(query.page + 1)" :class="{ disabled: query.page >= totalPages }">›</span>
      <span class="total-text">共 {{ total }} 人</span>
    </div>

    <!-- 角色变更弹窗 -->
    <div class="modal-mask" v-if="roleModal.visible">
      <div class="modal-wrapper" style="width: 460px;">
        <div class="modal-container">
          <div class="modal-header">
            <h3>变更用户角色</h3>
            <span class="close-btn" @click="roleModal.visible = false">&times;</span>
          </div>
          <div class="modal-body">
            <div class="small muted mb16">
              用户 <b>{{ roleModal.user ? roleModal.user.username : '' }}</b>
              &nbsp;·&nbsp; 当前角色
              <span class="tag" :class="getRoleClass(roleModal.user ? roleModal.user.role : '')" style="margin-left:4px">
                {{ roleModal.user ? roleModal.user.role : '' }}
              </span>
            </div>
            <div class="field mb16">
              <label>目标角色</label>
              <div class="input-wrap select-wrap" style="width:100%">
                <select aria-label="select" v-model="roleModal.selectedRole">
                  <option value="USER">USER（普通用户）</option>
                  <option value="MERCHANT">MERCHANT（商家）</option>
                  <option value="ADMIN">ADMIN（管理员）</option>
                </select>
              </div>
            </div>
            <div class="small muted mb16" v-if="roleModal.selectedRole === 'MERCHANT'">
              设为 MERCHANT 后：该用户登录可创建并管理自己的店铺（建店 owner_id 自动绑定本人），且仅能看本店数据。
            </div>
            <div class="small muted mb16" v-if="roleModal.selectedRole === 'USER' && roleModal.user && roleModal.user.role === 'MERCHANT'">
              降为 USER 后：将收回商家权限，该用户无法再管理店铺。
            </div>
          </div>
          <div class="modal-footer row gap8">
            <div class="spacer"></div>
            <div class="btn" @click="roleModal.visible = false">取消</div>
            <div class="btn primary" @click="confirmRoleChange">确认变更</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getUserManageList, updateUserStatus, updateUserRole } from "@/api/modules/user.js";
import { getMembershipLevels } from "@/api/modules/user.js";

export default {
  name: "AdminManage",
  data() {
    return {
      users: [],
      displayUsers: [],
      total: 0,
      query: {
        page: 1,
        size: 8,
        username: "",
        role: "",
        memberLevelId: "",
        status: ""
      },
      memberLevelOptions: [],
      stats: {
        totalUsers: 0,
        merchantCount: 0,
        memberCount: 0,
        todayNew: 0
      },
      roleModal: {
        visible: false,
        user: null,
        selectedRole: "MERCHANT"
      }
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    }
  },
  created() {
    this.fetchMemberLevels().then(() => {
      this.fetchStats();
      this.fetchData();
    });
  },
  methods: {
    async fetchMemberLevels() {
      try {
        const res = await getMembershipLevels();
        const levels = res.data || [];
        this.memberLevelOptions = levels.map(l => ({ id: l.id, name: l.name }));
      } catch (e) {
        console.warn("获取会员等级失败", e);
      }
    },
    async fetchStats() {
      try {
        // 全量统计：分别查 total / merchant
        const [allRes, merchantRes] = await Promise.all([
          getUserManageList({ current: 1, size: 1 }),
          getUserManageList({ current: 1, size: 1, role: 'MERCHANT' })
        ]);
        this.stats.totalUsers = (allRes.data?.total || 0);
        this.stats.merchantCount = (merchantRes.data?.total || 0);
        // 会员统计：遍历所有等级并求和
        let memberTotal = 0;
        if (this.memberLevelOptions.length > 0) {
          const memberRequests = this.memberLevelOptions.map(lv =>
            getUserManageList({ current: 1, size: 1, memberLevelId: lv.id })
          );
          const memberResults = await Promise.all(memberRequests);
          memberTotal = memberResults.reduce((sum, r) => sum + Number(r.data?.total || 0), 0);
        }
        this.stats.memberCount = memberTotal;
        // 今日新增：从当前页数据推算
        const today = new Date().toISOString().substring(0, 10);
        this.stats.todayNew = (this.users || []).filter(u => {
          return u.createTime && u.createTime.substring(0, 10) === today;
        }).length;
      } catch (e) {
        console.warn("获取统计失败", e);
      }
    },
    async fetchData() {
      try {
        const params = {
          current: this.query.page,
          size: this.query.size
        };
        if (this.query.username) params.username = this.query.username;
        if (this.query.role) params.role = this.query.role;
        if (this.query.memberLevelId !== "") params.memberLevelId = this.query.memberLevelId;
        if (this.query.status !== "") params.status = this.query.status;

        const res = await getUserManageList(params);
        if (res.data) {
          this.users = res.data.records || [];
          this.total = res.data.total || 0;
          this.displayUsers = this.users;
        }
      } catch (e) {
        console.warn("获取用户列表失败", e);
        alert(e.message || "获取用户列表失败");
      }
    },
    doSearch() {
      this.query.page = 1;
      this.fetchData();
    },
    resetQuery() {
      this.query.username = "";
      this.query.role = "";
      this.query.memberLevelId = "";
      this.query.status = "";
      this.query.page = 1;
      this.fetchStats();
      this.fetchData();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages || p === this.query.page) return;
      this.query.page = p;
      this.fetchData();
    },
    formatTime(timeStr) {
      if (!timeStr) return "-";
      return timeStr.replace("T", " ").substring(0, 16);
    },
    formatPrice(val) {
      if (val == null) return "0.00";
      return Number(val).toFixed(2);
    },
    getMemberLevelName(id) {
      const lv = this.memberLevelOptions.find(l => l.id === id);
      return lv ? lv.name : "—";
    },
    getRoleClass(role) {
      if (role === "ADMIN") return "danger";
      if (role === "MERCHANT") return "accent";
      return "";
    },
    getMemberClass(levelId) {
      if (levelId >= 3) return "warn";
      return "";
    },
    async toggleStatus(user) {
      const newStatus = user.status === 1 ? 0 : 1;
      const actionText = newStatus === 0 ? "禁用" : "启用";
      if (!confirm(`确定要${actionText}用户「${user.username}」吗？`)) return;
      try {
        await updateUserStatus(user.id, newStatus);
        user.status = newStatus;
      } catch (e) {
        alert(e.message || "操作失败");
      }
    },
    openRoleModal(user) {
      this.roleModal.user = user;
      this.roleModal.selectedRole = user.role === "MERCHANT" ? "USER" : "MERCHANT";
      this.roleModal.visible = true;
    },
    async confirmRoleChange() {
      const user = this.roleModal.user;
      const targetRole = this.roleModal.selectedRole;
      if (!user || !targetRole) return;
      if (targetRole === user.role) {
        alert("目标角色与当前角色相同，无需变更");
        return;
      }
      try {
        await updateUserRole(user.id, targetRole);
        user.role = targetRole;
        this.roleModal.visible = false;
      } catch (e) {
        alert(e.message || "角色变更失败");
      }
    }
  }
};
</script>

<style scoped>
/* KPI 卡片 */
.kpi {
  background: #fff;
  border: 1px solid #e6e8eb;
  border-radius: 8px;
  padding: 16px 20px;
  min-width: 140px;
}
.kpi-label {
  font-size: 13px;
  color: #595959;
  margin-bottom: 8px;
}
.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}
.kpi-value small {
  font-size: 13px;
  font-weight: 400;
  color: #5cb85c;
  margin-left: 4px;
}

/* 通用布局工具 */
.row { display: flex; }
.col { display: flex; flex-direction: column; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.gap16 { gap: 16px; }
.mb16 { margin-bottom: 16px; }
.flex1 { flex: 1; }
.spacer { flex: 1; }
.small { font-size: 13px; }
.muted { color: #595959; }
.text-center { text-align: center; }
.price { font-family: "SF Mono", "Menlo", monospace; }

/* 卡片 */
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 8px; }

/* 输入框 */
.input-wrap {
  border: 1px solid #d6dbe3;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  overflow: hidden;
  height: 32px;
}
.input-wrap input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0 10px;
  height: 100%;
  background: transparent;
}
.select-wrap select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  height: 100%;
  padding: 0 10px;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 16px;
  border-radius: 4px;
  border: 1px solid #d6dbe3;
  background: #fff;
  cursor: pointer;
  transition: 0.2s;
  user-select: none;
  font-size: 14px;
}
.btn:hover { background: #f8f9fb; }
.btn.primary { background: #2a69d4; border-color: #2a69d4; color: #fff; }
.btn.primary:hover { background: #4a7ce0; }
.btn.sm { height: 28px; padding: 0 12px; font-size: 13px; }

/* 表格 */
.tbl {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.tbl th, .tbl td {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.tbl th {
  background: #fafbfc;
  color: #555;
  font-weight: 500;
  font-size: 13px;
}
.tbl tr:hover td { background: #fafbfc; }

/* 标签 */
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #f0f0f0;
  color: #666;
}
.tag.ok { background: #eef4fe; color: #2a69d4; }
.tag.danger { background: #fde8e8; color: #c0392b; }
.tag.accent { background: #e8f4fd; color: #2a69d4; }
.tag.warn { background: #fef5e7; color: #e67e22; }

/* 操作按钮 */
.action-btn { color: #2a69d4; cursor: pointer; }
.action-btn:hover { text-decoration: underline; }
.action-btn.danger { color: #c0392b; }
.action-divider { margin: 0 6px; color: #ccc; }

/* 分页 */
.pager {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 16px;
}
.pager span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: #fff;
  border: 1px solid #d6dbe3;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
  user-select: none;
}
.pager span:hover:not(.on):not(.disabled):not(.total-text) {
  background: #f8f9fb;
  border-color: #2a69d4;
  color: #2a69d4;
}
.pager .on { background: #2a69d4; color: #fff; border-color: #2a69d4; }
.pager .disabled { opacity: 0.4; cursor: not-allowed; }
.pager .total-text { border: none; background: transparent; color: #595959; cursor: default; }

/* 弹窗 */
.modal-mask {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-wrapper {
  width: 460px;
  max-width: 90%;
}
.modal-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { font-size: 20px; color: #aaa; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #333; }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #eee; display: flex; align-items: center; }
.field label { display: block; margin-bottom: 6px; font-size: 13px; color: #555; font-weight: 500; }
</style>
