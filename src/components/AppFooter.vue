<template>
  <footer class="app-foot">
    <div class="links">
      <a href="#">关于我们</a>
      <span class="divider">｜</span>
      <a href="#">帮助中心</a>
      <span class="divider">｜</span>
      <a href="#">联系客服</a>
    </div>
    <div class="copy">© 2026 宠物商城 · 程序设计实训</div>
  </footer>
</template>

<script>
export default {
  name: "AppFooter",
};
</script>

<style scoped>
.app-foot {
  text-align: center;
  padding: 24px;
  background: #2b3243;
  color: #9aa1b2;
  font-size: 13px;
  margin-top: auto; /* 在 flex 布局中自动推到底部 */
}
.app-foot .links {
  margin-bottom: 8px;
}
.app-foot a {
  color: #9aa1b2;
  text-decoration: none;
  transition: color 0.2s;
}
.app-foot a:hover {
  color: #fff;
}
.app-foot .divider {
  margin: 0 8px;
  color: #555b6a;
}
.app-foot .copy {
  opacity: 0.8;
}
</style>
