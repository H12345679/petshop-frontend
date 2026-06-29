<template>
  <div class="panel">
    <h3>会员中心</h3>
    <div class="member-levels">
      <div
        v-for="lv in membershipLevels"
        :key="lv.id"
        :class="['member-card', { current: userInfo && userInfo.memberLevelId === lv.id }]"
      >
        <div class="ml-badge" :style="{ background: levelColor(lv.level) }">{{ lv.name }}</div>
        <div class="ml-discount">折扣：{{ (lv.discount * 100).toFixed(0) }}%</div>
        <div class="ml-threshold">升级门槛：累计 {{ lv.threshold }} 积分</div>
        <div class="ml-desc">{{ lv.description }}</div>
        <div v-if="userInfo && userInfo.memberLevelId === lv.id" class="ml-current-tag">当前等级</div>
      </div>
    </div>
    <div v-if="userInfo" class="member-status">
      <p>当前积分：<b>{{ userInfo.points }}</b></p>
      <button class="btn primary" :disabled="upgrading" @click="doUpgrade">
        {{ upgrading ? '检测中…' : '立即升级' }}
      </button>
    </div>
  </div>
</template>

<script>
import { getMembershipLevels, upgradeMembership } from "@/api/modules/user.js";

export default {
  name: "UserMembership",
  props: {
    userInfo: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      membershipLevels: [],
      upgrading: false,
    };
  },
  created() {
    this.loadMembershipLevels();
  },
  methods: {
    async loadMembershipLevels() {
      try {
        const res = await getMembershipLevels();
        this.membershipLevels = res.data || [];
      } catch (e) {
        /* ignore */
      }
    },
    async doUpgrade() {
      this.upgrading = true;
      try {
        const res = await upgradeMembership();
        const data = res.data;
        if (data) {
          this.$emit('notify', "success", `恭喜！从「${data.oldLevel}」升级到「${data.newLevel}」，当前积分：${data.currentPoints}`);
        } else {
          this.$emit('notify', "success", res.message || "当前已是最优等级");
        }
        this.$emit('update-user');
        await this.loadMembershipLevels();
      } catch (e) {
        this.$emit('notify', "error", e.message || "升级失败");
      } finally {
        this.upgrading = false;
      }
    },
    levelColor(level) {
      const colors = ["#9aa1b2", "#9aa1b2", "#8f9bb3", "#c9a96e", "#d9534f"];
      return colors[level] || "#9aa1b2";
    }
  }
};
</script>

<style scoped>
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0 0 16px; font-size: 16px; }

/* 会员中心 */
.member-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
.member-card {
  border: 1px solid #e6e8eb; border-radius: 10px; padding: 18px; text-align: center; position: relative; transition: .12s;
}
.member-card.current { border-color: #c9a96e; background: #fffdf5; box-shadow: 0 2px 10px rgba(201,169,110,.15); }
.ml-badge {
  display: inline-block; padding: 4px 16px; border-radius: 14px; color: #fff; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.ml-discount { font-size: 14px; color: #333; margin-bottom: 6px; }
.ml-threshold { font-size: 12px; color: #888; margin-bottom: 6px; }
.ml-desc { font-size: 12px; color: #999; line-height: 1.5; }
.ml-current-tag { margin-top: 10px; font-size: 11px; color: #b8860b; font-weight: 600; }
.member-status { display: flex; align-items: center; gap: 20px; }
.member-status p { font-size: 14px; color: #555; margin: 0; }

.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #5b8def; color: #fff; border-color: #5b8def; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
</style>
