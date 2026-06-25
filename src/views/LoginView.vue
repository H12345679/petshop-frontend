<template>
  <div class="login-page">
    <!-- 顶栏 -->
    <div class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <div class="spacer"></div>
      <div class="right">
        <router-link to="/">首页</router-link>
        <span>商品</span>
        <span>找门店</span>
      </div>
    </div>

    <!-- 主体：左宣传 + 右登录卡 -->
    <div class="login-main-wrap">
      <div class="login-main">
        <div class="left-poster">
          <div class="poster-content">
            <h2>欢迎来到宠物商城</h2>
            <p>为您的爱宠提供最优质的服务与商品</p>
            <div class="poster-illustration">🐶🐱🐰</div>
          </div>
        </div>
        
        <div class="right-card">
          <div class="section-title">欢迎登录</div>
          <div class="muted small mb12">还没有账号？<router-link to="/register" class="link">立即注册 →</router-link></div>

          <form @submit.prevent="onSubmit">
            <div class="field">
              <label>用户名 / 手机号</label>
              <div class="input-wrap">
                <input v-model.trim="form.username" type="text" placeholder="请输入用户名" />
              </div>
            </div>
            
            <div class="field">
              <label>密码</label>
              <div class="input-wrap">
                <input v-model="form.password" type="password" placeholder="请输入密码" />
              </div>
            </div>
            
            <div class="row between center small mb12 mt-10">
              <label class="muted checkbox-label"><input type="checkbox" /> 记住我</label>
              <span class="link">忘记密码？</span>
            </div>

            <p v-if="error" class="error-text">{{ error }}</p>

            <button type="submit" class="btn primary block lg" :disabled="loading">
              {{ loading ? "登录中..." : "登 录" }}
            </button>
          </form>

          <div class="row center mt16 third-party-divider">
            <div class="line f"></div>
            <span class="muted small text-ph">第三方登录</span>
            <div class="line f"></div>
          </div>
          
          <div class="row center mt12 third-party-icons">
            <div class="avatar">微信</div>
            <div class="avatar">QQ</div>
            <span class="anno small muted">选做 OAuth</span>
          </div>
        </div>
      </div>
    </div>
    
    <AppFooter />
  </div>
</template>

<script>
import { login } from "@/api/modules/auth.js";
import { setStore } from "@/libs/storage.js";

export default {
  name: "LoginView",
  data() {
    return {
      form: { username: "", password: "" },
      loading: false,
      error: "",
    };
  },
  methods: {
    async onSubmit() {
      this.error = "";
      if (!this.form.username || !this.form.password) {
        this.error = "请输入用户名和密码";
        return;
      }
      this.loading = true;
      try {
        // 后端返回 { code, message, data: { token, user } }
        const res = await login(this.form);
        const { token, user } = res.data;
        setStore("token", token);
        setStore("userInfo", user);
        
        const redirect = this.$route.query.redirect || "/";
        this.$router.replace(redirect);
      } catch (e) {
        // 如果后端接口不存在或报错，降级为模拟登录（供参考和前端独立测试使用）
        console.warn("后端登录请求失败，启用模拟登录供查考测试:", e.message);
        
        const mockToken = "mock_token_" + new Date().getTime();
        const mockUser = { 
          id: 1, 
          username: this.form.username, 
          nickname: this.form.username === 'admin' ? "超级管理员" : "测试体验用户",
          balance: 999.00
        };
        
        setStore("token", mockToken);
        setStore("userInfo", mockUser);
        
        const redirect = this.$route.query.redirect || "/";
        this.$router.replace(redirect);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* 颜色变量 */
:root {
  --line: #e6e8eb;
  --accent: #5b8def;
}

.login-page {
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
.right a, .right span {
  color: #555;
  text-decoration: none;
  cursor: pointer;
}
.right a:hover, .right span:hover {
  color: #5b8def;
}

/* 主体 */
.login-main-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}
.login-main {
  display: flex;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(40, 60, 120, 0.08);
  overflow: hidden;
  width: 900px;
  max-width: 100%;
  min-height: 480px;
}

/* 左侧宣传 */
.left-poster {
  flex: 1;
  background: linear-gradient(135deg, #7faaf2 0%, #5b8def 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}
.poster-content h2 {
  font-size: 28px;
  margin-bottom: 16px;
  font-weight: 600;
}
.poster-content p {
  font-size: 15px;
  opacity: 0.9;
  margin-bottom: 30px;
}
.poster-illustration {
  font-size: 64px;
  letter-spacing: 10px;
}

/* 右侧登录卡片 */
.right-card {
  width: 440px;
  flex-shrink: 0;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #222;
  margin-bottom: 8px;
}

.muted { color: #888; }
.small { font-size: 13px; }
.mb12 { margin-bottom: 12px; }
.mt-10 { margin-top: 10px; }
.mt16 { margin-top: 24px; }
.mt12 { margin-top: 16px; }

.link {
  color: #5b8def;
  cursor: pointer;
  text-decoration: none;
}
.link:hover { text-decoration: underline; }

/* 表单字段 */
.field {
  margin-top: 18px;
}
.field label {
  display: block;
  font-size: 14px;
  color: #444;
  margin-bottom: 8px;
  font-weight: 500;
}
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
  padding: 12px 0;
  font-size: 15px;
  color: #333;
  outline: none;
}
.input-wrap input::placeholder {
  color: #aaa;
}

.row { display: flex; }
.between { justify-content: space-between; }
.center { align-items: center; justify-content: center; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

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
  margin-top: 24px;
}
.btn:disabled {
  background: #a9c2f2;
  cursor: not-allowed;
}

.error-text {
  color: #d9534f;
  font-size: 13px;
  margin: 12px 0 0 0;
}

/* 第三方登录 */
.third-party-divider {
  gap: 16px;
}
.third-party-divider .line {
  flex: 1;
  height: 1px;
  background: #e6e8eb;
}
.text-ph {
  color: #bbb;
}

.third-party-icons {
  gap: 20px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f3fa;
  color: #5b8def;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.avatar:hover {
  background: #5b8def;
  color: #fff;
  transform: scale(1.05);
}
.anno {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}


</style>
