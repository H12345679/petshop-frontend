<template>
  <div id="app">
    <router-view/>
    <AiChatFloat v-if="!isAdminRoute" />
  </div>
</template>

<script>
import { getStore } from "@/libs/storage.js";
import AiChatFloat from "@/components/AiChatFloat.vue";

export default {
  name: 'App',
  components: {
    AiChatFloat
  },
  computed: {
    isAdminRoute() {
      return this.$route.path.startsWith('/admin');
    }
  }
}
</script>

<style lang="scss">
/* 全局 reset：去掉浏览器默认的 body 外边距（四周白边），让页面铺满 */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #f4f5f7; }

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
