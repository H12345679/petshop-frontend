<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand"><span class="paw">🐾</span> 宠物商城</div>
      <h2 class="title">创建新账号</h2>
      <p class="sub">已有账号？<router-link class="link" to="/login">去登录</router-link></p>

      <form @submit.prevent="onSubmit">
        <div class="field">
          <label><i class="req">*</i> 用户名</label>
          <input v-model.trim="form.username" type="text" placeholder="4-16 位字母 / 数字，唯一" />
        </div>
        <div class="field">
          <label><i class="req">*</i> 密码</label>
          <input v-model="form.password" type="password" placeholder="至少 6 位" autocomplete="new-password" />
        </div>
        <div class="field">
          <label><i class="req">*</i> 确认密码</label>
          <input v-model="confirm" type="password" placeholder="再次输入密码" autocomplete="new-password" />
        </div>
        <div class="row">
          <div class="field col">
            <label>昵称（选填）</label>
            <input v-model.trim="form.nickname" type="text" placeholder="如：旺财主人" />
          </div>
          <div class="field col">
            <label>手机号（选填）</label>
            <input v-model.trim="form.phone" type="text" placeholder="13800138000" />
          </div>
        </div>
        <div class="field">
          <label>邮箱（选填）</label>
          <input v-model.trim="form.email" type="text" placeholder="user@example.com" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? "注册中…" : "注 册" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { register } from "@/api/modules/auth.js";

export default {
  name: "RegisterView",
  data() {
    return {
      form: { username: "", password: "", nickname: "", phone: "", email: "" },
      confirm: "",
      loading: false,
      error: "",
    };
  },
  methods: {
    validate() {
      if (!this.form.username || !this.form.password) return "用户名和密码必填";
      if (this.form.password.length < 6) return "密码至少 6 位";
      if (this.form.password !== this.confirm) return "两次输入的密码不一致";
      if (this.form.phone && !/^1[3-9]\d{9}$/.test(this.form.phone)) return "手机号格式不正确";
      if (this.form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email)) return "邮箱格式不正确";
      return "";
    },
    async onSubmit() {
      this.error = this.validate();
      if (this.error) return;
      this.loading = true;
      try {
        await register(this.form);
        alert("注册成功，请登录");
        this.$router.push("/login");
      } catch (e) {
        // 后端会对「用户名已存在」等返回 400 + message
        this.error = e.message || "注册失败";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2fb 0%, #f6f8fc 100%);
  padding: 24px;
}
.auth-card {
  width: 440px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(40, 60, 120, 0.12);
  padding: 32px 32px 26px;
}
.brand { font-size: 20px; font-weight: 700; color: #5b8def; text-align: center; }
.brand .paw { margin-right: 4px; }
.title { margin: 16px 0 4px; font-size: 22px; color: #222; }
.sub { margin: 0 0 20px; font-size: 13px; color: #888; }
.link { color: #5b8def; text-decoration: none; }
.row { display: flex; gap: 14px; }
.col { flex: 1; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; }
.field label .req { color: #d9534f; font-style: normal; margin-right: 2px; }
.field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d6dbe3;
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus { border-color: #5b8def; }
.error { color: #d9534f; font-size: 13px; margin: 0 0 12px; }
.btn {
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: #5b8def;
  color: #fff;
  font-size: 15px;
  padding: 12px;
  cursor: pointer;
  margin-top: 4px;
}
.btn:hover { background: #4a7ce0; }
.btn:disabled { background: #a9c2f2; cursor: not-allowed; }
</style>
