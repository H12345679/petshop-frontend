<template>
  <div class="home">
    <!-- 顶栏 -->
    <header class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <nav class="nav">
        <router-link to="/" class="active">首页</router-link>
        <span class="muted">全部商品</span>
        <span class="muted">找门店</span>
        <span class="muted">萌宠视频</span>
      </nav>
      <div class="search">
        <input v-model.trim="keyword" placeholder="搜索宠物 / 用品..." @keyup.enter="onSearch" />
        <button class="go" @click="onSearch">搜索</button>
      </div>
      <div class="right">
        <span>🛒 购物车</span>
        <template v-if="userInfo">
          <router-link to="/user/center" class="link">👤 {{ userInfo.nickname || userInfo.username }}</router-link>
          <span class="link" @click="logout">退出</span>
        </template>
        <router-link v-else to="/login" class="link">登录 / 注册</router-link>
      </div>
    </header>

    <div class="container">
      <!-- 分类 + 轮播 + 用户卡 -->
      <div class="hero">
        <aside class="cat-card">
          <div class="cat-title">商品分类</div>
          <ul class="cat-list">
            <li v-for="c in categories" :key="c.id">{{ c.name }} <span class="arrow">›</span></li>
            <li v-if="!categories.length" class="muted small">加载中…</li>
          </ul>
        </aside>

        <div class="banner">首页轮播 Banner（自动播放）</div>

        <aside class="user-card">
          <div class="u-top">
            <div class="avatar">{{ userInfo ? (userInfo.nickname || userInfo.username || '我')[0] : '头' }}</div>
            <div v-if="userInfo">
              <div class="u-name">{{ userInfo.nickname || userInfo.username }}</div>
              <div class="muted small">余额 ¥{{ userInfo.balance != null ? userInfo.balance : 0 }}</div>
            </div>
            <div v-else>
              <div class="small">未登录</div>
              <router-link to="/login" class="link small">登录 / 注册</router-link>
            </div>
          </div>
          <div class="entry">🎁 活动入口</div>
          <div class="entry">🎫 领券中心</div>
        </aside>
      </div>

      <!-- 三个展示策略分区 -->
      <section v-for="sec in sections" :key="sec.key" class="block">
        <div class="section-title">
          <span>{{ sec.title }}</span>
          <span class="tag">{{ sec.tag }}</span>
          <span class="more">查看更多 ›</span>
        </div>
        <div class="grid">
          <div class="pcard" v-for="p in sec.list" :key="p.id">
            <div class="pimg" :class="{ ph: !p.mainImage }"
                 :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
              <span v-if="!p.mainImage">商品图</span>
            </div>
            <div class="pbody">
              <div class="pname">{{ p.name }}</div>
              <div class="price-row">
                <span class="price"><span class="cur">¥</span>{{ p.price }}</span>
                <span v-if="p.originalPrice && p.originalPrice > p.price" class="del">¥{{ p.originalPrice }}</span>
              </div>
              <div class="small muted sales">已售 {{ p.sales || 0 }} 件</div>
            </div>
          </div>
          <div v-if="!sec.loading && !sec.list.length" class="empty">暂无数据（确认后端有 status=1 的上架商品）</div>
        </div>
      </section>
    </div>

    <AppFooter />

    <!-- AI 客服悬浮按钮（P23，后续接 /api/ai/chat） -->
    <div class="ai-fab" title="AI 客服">🤖</div>
  </div>
</template>

<script>
import { homeProducts, categoryTree } from "@/api/modules/home.js";
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "HomeView",
  data() {
    return {
      keyword: "",
      categories: [],
      userInfo: null,
      sections: [
        { key: "hot", title: "🔥 热销榜单", tag: "HOT", list: [], loading: true },
        { key: "new", title: "✨ 新鲜上架", tag: "NEW", list: [], loading: true },
        { key: "rec", title: "💡 为你推荐", tag: "RECOMMEND", list: [], loading: true },
      ],
    };
  },
  created() {
    // 读本地登录态
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    // 拉数据（都是公开接口，免登录可看）
    this.loadCategories();
    this.loadSection(this.sections[0], "HOT");
    this.loadSection(this.sections[1], "NEW");
    this.loadSection(this.sections[2], "RECOMMEND");
  },
  methods: {
    async loadCategories() {
      try {
        const res = await categoryTree();
        this.categories = res.data || [];
      } catch (e) {
        this.categories = [];
      }
    },
    async loadSection(sec, strategy) {
      try {
        const res = await homeProducts(strategy, 6);
        sec.list = res.data || [];
      } catch (e) {
        sec.list = [];
      } finally {
        sec.loading = false;
      }
    },
    onSearch() {
      // 商品列表页(P04)做好后跳过去带 keyword；暂时占位
      // this.$router.push({ path: '/products', query: { name: this.keyword } });
    },
    logout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
    },
  },
};
</script>

<style scoped>
.home { background: #f4f5f7; min-height: 100vh; }

/* 顶栏 */
.topbar {
  display: flex; align-items: center; gap: 18px;
  padding: 12px 24px; background: #fff; border-bottom: 1px solid #e6e8eb;
  position: sticky; top: 0; z-index: 10;
}
.logo { font-weight: 700; font-size: 18px; color: #5b8def; white-space: nowrap; }
.logo .paw { margin-right: 4px; }
.nav { display: flex; gap: 18px; font-size: 14px; }
.nav a, .nav span { color: #555; text-decoration: none; cursor: pointer; }
.nav .active { color: #5b8def; font-weight: 600; }
.search { flex: 1; max-width: 420px; display: flex; border: 1px solid #d6dbe3; border-radius: 20px; overflow: hidden; }
.search input { flex: 1; border: 0; padding: 8px 14px; outline: none; font-size: 13px; background: #fafbfc; }
.search .go { border: 0; background: #5b8def; color: #fff; padding: 0 18px; cursor: pointer; }
.right { display: flex; align-items: center; gap: 14px; font-size: 13px; color: #555; white-space: nowrap; margin-left: auto; }

/* 主体 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; }
.hero { display: flex; gap: 14px; margin-bottom: 18px; }
.cat-card, .user-card { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 14px; }
.cat-card { width: 180px; flex-shrink: 0; }
.cat-title { font-size: 13px; color: #888; margin-bottom: 10px; }
.cat-list { list-style: none; margin: 0; padding: 0; }
.cat-list li { padding: 7px 0; font-size: 14px; color: #444; cursor: pointer; }
.cat-list li:hover { color: #5b8def; }
.cat-list .arrow { float: right; color: #bbb; }
.banner {
  flex: 1; height: 240px; border-radius: 10px; color: #fff; font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(120deg, #6aa0f5, #8f7cf0);
}
.user-card { width: 210px; flex-shrink: 0; }
.u-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: #e3e6ec; color: #999;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.u-name { font-weight: 600; }
.entry { height: 60px; border-radius: 8px; background: #f0f3fa; color: #6a7c9c;
  display: flex; align-items: center; justify-content: center; font-size: 13px; margin-top: 10px; }

/* 分区 */
.block { margin-bottom: 22px; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; margin: 6px 0 12px; }
.section-title .tag { font-size: 12px; font-weight: 400; color: #5b8def; background: #e7eefc; border: 1px solid #cdddf8; border-radius: 4px; padding: 1px 8px; }
.section-title .more { margin-left: auto; font-size: 12px; font-weight: 400; color: #999; cursor: pointer; }

/* 商品网格 */
.grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
.pcard { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; overflow: hidden; cursor: pointer; transition: .15s; }
.pcard:hover { box-shadow: 0 6px 18px rgba(60, 90, 160, .12); transform: translateY(-2px); }
.pimg { width: 100%; aspect-ratio: 1 / 1; background-size: cover; background-position: center; }
.pimg.ph { display: flex; align-items: center; justify-content: center; color: #aab0b8; font-size: 12px;
  background: repeating-linear-gradient(45deg, #eef0f3, #eef0f3 10px, #e6e9ee 10px, #e6e9ee 20px); }
.pbody { padding: 10px; }
.pname { font-size: 13px; color: #333; height: 38px; line-height: 19px; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
.price-row { margin: 6px 0 2px; }
.price { color: #d9534f; font-weight: 700; font-size: 16px; }
.price .cur { font-size: 12px; }
.del { color: #aaa; text-decoration: line-through; font-size: 12px; margin-left: 6px; }
.sales { margin-top: 6px; }
.empty { grid-column: 1 / -1; color: #999; font-size: 13px; padding: 16px 0; text-align: center; }

.muted { color: #999; }
.small { font-size: 12px; }
.link { color: #5b8def; cursor: pointer; text-decoration: none; }



.ai-fab {
  position: fixed; right: 28px; bottom: 28px; width: 52px; height: 52px; border-radius: 50%;
  background: #5b8def; color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 18px rgba(91, 141, 239, .4); cursor: pointer;
}
</style>
