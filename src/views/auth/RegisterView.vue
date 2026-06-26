<template>
  <div class="auth-wrap">
    <div class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <div class="spacer"></div>
      <div class="right">
        <span>已有账号？<router-link class="link" to="/login" style="font-weight:600">去登录</router-link></span>
      </div>
    </div>

    <div class="screen pad" style="flex: 1; display:flex; flex-direction:column; align-items:center; justify-content: center; padding: 60px 20px">
      <div class="section-title" style="margin-bottom:24px; font-size:28px; font-weight:700; color: #222; letter-spacing: 1px;">创建新账号</div>
      <div class="auth-card">
        <form @submit.prevent="onSubmit">
          <div class="field">
            <label><i class="req">*</i> 用户名</label>
            <div class="input-wrap">
              <input v-model.trim="form.username" type="text" placeholder="4-16 位字母 / 数字，唯一" />
            </div>
          </div>
          <div class="field">
            <label><i class="req">*</i> 密码</label>
            <div class="input-wrap">
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="至少 6 位" autocomplete="new-password" />
              <span class="muted small" style="cursor:pointer; margin-left: 8px;" @click="showPassword = !showPassword">👁</span>
            </div>
          </div>
          <div class="field">
            <label><i class="req">*</i> 确认密码</label>
            <div class="input-wrap">
              <input v-model="confirm" :type="showConfirm ? 'text' : 'password'" placeholder="再次输入密码" autocomplete="new-password" />
              <span class="muted small" style="cursor:pointer; margin-left: 8px;" @click="showConfirm = !showConfirm">👁</span>
            </div>
          </div>
          <div class="row gap16 mt16">
            <div class="field col flex1">
              <label>昵称（选填）</label>
              <div class="input-wrap">
                <input v-model.trim="form.nickname" type="text" placeholder="如：旺财主人" />
              </div>
            </div>
            <div class="field col flex1">
              <label>手机号（选填）</label>
              <div class="input-wrap">
                <input v-model.trim="form.phone" type="text" placeholder="13800138000" />
              </div>
            </div>
          </div>
          <div class="field mt16">
            <label>邮箱（选填）</label>
            <div class="input-wrap">
              <input v-model.trim="form.email" type="text" placeholder="user@example.com" />
            </div>
          </div>

          <div class="small muted mb12 mt16 row center" style="justify-content:flex-start">
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" checked /> 我已阅读并同意 <span class="link">《用户协议》</span> 与 <span class="link">《隐私政策》</span>
            </label>
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="btn primary block lg mt16" type="submit" :disabled="loading" style="font-size: 16px; padding: 14px; margin-top: 24px;">
            {{ loading ? "注册中…" : "立即注册" }}
          </button>
        </form>
      </div>
    </div>
    
    <AppFooter />
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
      showPassword: false,
      showConfirm: false
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
  flex-direction: column;
  background: #f4f5f7;
}

/* 顶栏 */
.topbar {
  display: flex;
  align-items: center;
  padding: 16px 40px;
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
}
.logo {
  font-weight: 700;
  font-size: 20px;
  color: #5b8def;
}
.paw { margin-right: 6px; }
.spacer { flex: 1; }
.right {
  display: flex;
  gap: 24px;
  font-size: 15px;
  color: #555;
}

.auth-card {
  width: 680px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(40, 60, 120, 0.08);
  padding: 56px 64px;
}

.brand { font-size: 20px; font-weight: 700; color: #5b8def; text-align: center; }
.brand .paw { margin-right: 4px; }
.title { margin: 16px 0 4px; font-size: 22px; color: #222; }
.sub { margin: 0 0 20px; font-size: 13px; color: #888; }
.link { color: #5b8def; text-decoration: none; cursor: pointer; }
.link:hover { text-decoration: underline; }

.row { display: flex; }
.col { flex: 1; }
.flex1 { flex: 1; }
.gap16 { gap: 16px; }
.mt16 { margin-top: 16px; }
.mb12 { margin-bottom: 12px; }
.center { align-items: center; justify-content: center; }
.muted { color: #888; }
.small { font-size: 13px; }

/* 表单字段 */
.field {
  margin-top: 20px;
}
.field label {
  display: block;
  font-size: 14px;
  color: #444;
  margin-bottom: 10px;
  font-weight: 500;
}
.field label .req { color: #d9534f; font-style: normal; margin-right: 4px; }

.input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #d6dbe3;
  border-radius: 8px;
  padding: 0 14px;
  background: #fafbfc;
  transition: all 0.2s ease;
}
.input-wrap:focus-within {
  border-color: #5b8def;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.1);
}
.input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 15px;
  color: #333;
  outline: none;
}
.input-wrap input::placeholder {
  color: #aaa;
}

.error { color: #d9534f; font-size: 13px; margin: 12px 0 0; }

/* 按钮 */
.btn {
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}
.btn.primary {
  background: #5b8def;
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: #4a7ce0;
  transform: translateY(-1px);
}
.btn.block {
  width: 100%;
  display: block;
}
.btn.lg {
  padding: 14px 20px;
}
.btn:disabled {
  background: #a9c2f2;
  cursor: not-allowed;
}
</style>
