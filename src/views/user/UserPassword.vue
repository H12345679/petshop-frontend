<template>
  <div class="password-panel">
    <div class="form-narrow">
      <div class="field">
        <label>当前密码 <span class="req">*</span></label>
        <input aria-label="input" class="input" v-model="form.oldPassword" type="password" placeholder="输入当前密码" />
      </div>
      <div class="field">
        <label>新密码 <span class="req">*</span></label>
        <input aria-label="input" class="input" v-model="form.newPassword" type="password" placeholder="至少 6 位" />
      </div>
      <div class="field">
        <label>确认新密码 <span class="req">*</span></label>
        <input aria-label="input" class="input" v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" />
      </div>
      <button class="btn primary" :disabled="saving" @click="savePassword">
        {{ saving ? '保存中…' : '保存新密码' }}
      </button>
    </div>
  </div>
</template>

<script>
import { changePassword } from "@/api/modules/user.js";

export default {
  name: "UserPassword",
  data() {
    return {
      form: { oldPassword: "", newPassword: "", confirmPassword: "" },
      saving: false,
    };
  },
  methods: {
    // 保存密码
    async savePassword() {
      const { 
        oldPassword, 
        newPassword, 
        confirmPassword 
      } = this.form;
      if (!oldPassword){
        return this.$emit('notify', "error", "请输入当前密码");
      }
      if (!newPassword || newPassword.length < 6){
        return this.$emit('notify', "error", "新密码至少 6 位");
      }
      if (newPassword !== confirmPassword){
        return this.$emit('notify', "error", "两次输入的新密码不一致");
      }

      this.saving = true;
      try {
        await changePassword({ 
          oldPassword, 
          newPassword 
        });
        this.$emit('notify', "success", "密码修改成功，请重新登录");
        this.form = { 
          oldPassword: "", 
          newPassword: "", 
          confirmPassword: "" 
        };
        setTimeout(() => this.$emit('logout'), 1500);
      } catch (e) {
        this.$emit('notify', "error", e.message || "密码修改失败");
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.password-panel { padding: 0; }
.form-narrow { max-width: 420px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.field .req { color: #c0392b; }
.input {
  width: 100%; padding: 9px 12px; border: 1px solid #d6dbe3; border-radius: 6px; font-size: 13px;
  color: #333; background: #fafbfc; outline: none; transition: border-color .15s;
}
.input:focus { border-color: #2a69d4; background: #fff; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #2a69d4; color: #fff; border-color: #2a69d4; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
</style>
