<template>
  <div class="home">
    <AppHeader />

    <div class="container">
      <!-- 分类 + 轮播 + 用户卡 -->
      <div class="hero">
        <aside class="cat-card">
          <div class="cat-title">商品分类</div>
          <ul class="cat-list">
            <li v-for="c in categories" :key="c.id" @click="$router.push({ path: '/products', query: { categoryId: c.id } })">{{ c.name }} <span class="arrow">›</span></li>
            <li v-if="!categories.length" class="muted small">加载中…</li>
          </ul>
        </aside>

        <div class="banner">
          <img src="@/assets/home_bg.png" alt="首页Banner" />
        </div>

          <aside class="user-card" :class="{ logged: userInfo }">
            <div class="u-top">
              <div class="avatar">{{ userInfo ? (userInfo.nickname || userInfo.username || '我')[0] : '🐾' }}</div>
              <div v-if="userInfo" class="u-info">
                <div class="u-name">{{ userInfo.nickname || userInfo.username }}</div>
                <div class="u-bal">余额 <span>¥{{ formatBalance }}</span></div>
              </div>
              <div v-else class="u-info">
                <div class="u-name">欢迎来到宠物商城</div>
                <router-link to="/login" class="u-login-btn">登录 / 注册</router-link>
              </div>
            </div>
          <div class="entry">🎁 活动入口</div>
          <div class="entry" @click="$router.push('/coupons')">🎫 领券中心</div>
        </aside>
      </div>

      <!-- 三个展示策略分区 -->
      <section v-for="sec in sections" :key="sec.key" class="block">
        <div class="section-title">
          <span>{{ sec.title }}</span>
          <span class="tag">{{ sec.tag }}</span>
          <span class="more" @click="$router.push('/products')">查看更多 ›</span>
        </div>
        <div class="grid">
          <div class="pcard" v-for="p in sec.list" :key="p.id" @click="$router.push('/product/' + p.id)">
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
          <div v-if="!sec.loading && !sec.list.length" class="empty">暂无数据</div>
        </div>
      </section>
    </div>

    <AppFooter />

    <!-- AI 客服悬浮按钮 -->
    <div class="ai-fab" title="AI 客服">🤖</div>
  </div>
</template>

<script>
import { homeProducts, categoryTree } from "@/api/modules/home.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "HomeView",
  data() {
    return {
      categories: [],
      userInfo: null,
      sections: [
        { key: "hot", title: "🔥 热销榜单", tag: "HOT", list: [], loading: true },
        { key: "new", title: "✨ 新鲜上架", tag: "NEW", list: [], loading: true },
        { key: "rec", title: "💡 为你推荐", tag: "RECOMMEND", list: [], loading: true },
      ],
    };
  },
  computed: {
    formatBalance() {
      const b = this.userInfo?.balance;
      return b != null ? Number(b).toLocaleString("zh-CN", { minimumFractionDigits: 2 }) : "0.00";
    },
  },
  created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
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
        const res = await homeProducts(strategy, 5);
        sec.list = res.data || [];
      } catch (e) {
        sec.list = [];
      } finally {
        sec.loading = false;
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.home {
  background: #f6f8fb;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.container { width: 1400px; max-width: 100%; margin: 0 auto; padding: 24px 0 60px; }
.hero { display: flex; gap: 20px; margin-bottom: 32px; height: 320px; }

.cat-card, .user-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(149, 157, 165, 0.1);
  padding: 20px;
}

/* 分类卡片 */
.cat-card { width: 170px; flex-shrink: 0; display: flex; flex-direction: column; }
.cat-title { font-size: 14px; font-weight: 700; color: #222; margin-bottom: 12px; }
.cat-list { list-style: none; margin: 0; padding: 0; flex: 1; overflow-y: auto; }
.cat-list li {
  padding: 8px 4px; font-size: 13px; color: #555; cursor: pointer;
  border-radius: 6px; margin-bottom: 2px;
}
.cat-list li:hover { background: #f5f8ff; color: #6B8DD6; }
.cat-list .arrow { float: right; color: #cbd5e1; }
.cat-list li:hover .arrow { color: #6B8DD6; }

/* 中央大屏 Banner */
.banner {
  flex: 1; border-radius: 16px; overflow: hidden;
  box-shadow: 0 12px 32px rgba(107, 141, 214, 0.25);
}
.banner img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* 用户卡片 */
.user-card { width: 200px; flex-shrink: 0; display: flex; flex-direction: column; }
.u-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.avatar {
  width: 46px; height: 46px; border-radius: 50%;
  background: linear-gradient(135deg, #eef2fb, #dce4f7); color: #6B8DD6;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 20px; font-weight: 700;
}
.u-info { flex: 1; min-width: 0; }
.u-name { font-weight: 700; font-size: 14px; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.u-bal { font-size: 11px; color: #888; margin-top: 2px; }
.u-bal span { color: #FF4757; font-weight: 600; font-size: 13px; }
.u-login-btn {
  display: inline-block; background: #ffece8; color: #FF4757;
  padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-decoration: none;
}
.u-login-btn:hover { background: #ffd9d1; }
.entry {
  flex: 1; border-radius: 10px; background: #f8f9fc; color: #475569;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;
  margin-top: 10px; cursor: pointer; transition: all 0.2s;
}
.entry:hover { background: #fff; box-shadow: 0 4px 12px rgba(107, 141, 214, 0.1); }

/* 分区区块 */
.block { margin-bottom: 40px; }
.section-title { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 700; color: #111; margin: 0 0 20px; }
.section-title .tag { font-size: 11px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #FF4757, #ff6b81); border-radius: 6px; padding: 3px 8px; }
.section-title .more { margin-left: auto; font-size: 13px; font-weight: 500; color: #888; cursor: pointer; }
.section-title .more:hover { color: #6B8DD6; }

/* 商品网格 5 列 */
.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
.pcard {
  background: #fff; border-radius: 16px; overflow: hidden; cursor: pointer;
  box-shadow: 0 4px 16px rgba(149, 157, 165, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.pcard:hover {
  box-shadow: 0 16px 32px rgba(107, 141, 214, 0.15);
  transform: translateY(-8px);
}
.pimg { width: 100%; aspect-ratio: 1 / 1; background-size: cover; background-position: center; transition: transform 0.5s ease; }
.pcard:hover .pimg { transform: scale(1.06); }
.pimg.ph { display: flex; align-items: center; justify-content: center; color: #aab0b8; font-size: 13px; background: #f0f2f5; }
.pbody { padding: 14px; background: #fff; }
.pname { font-size: 13px; font-weight: 500; color: #222; height: 38px; line-height: 19px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.price-row { margin: 10px 0 4px; display: flex; align-items: baseline; }
.price { color: #FF4757; font-weight: 700; font-size: 18px; }
.price .cur { font-size: 12px; margin-right: 1px; }
.del { color: #a0aec0; text-decoration: line-through; font-size: 11px; margin-left: 6px; font-weight: 400; }
.sales { color: #94a3b8; font-size: 11px; }
.empty { grid-column: 1 / -1; color: #888; font-size: 14px; padding: 40px 0; text-align: center; background: #fff; border-radius: 16px; }

.muted { color: #999; }
.small { font-size: 12px; }

/* AI 客服 */
.ai-fab {
  position: fixed; right: 40px; bottom: 40px; width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #6B8DD6, #8E37D7); color: #fff; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(107, 141, 214, 0.4); cursor: pointer; z-index: 100;
  animation: pulse 2s infinite; transition: transform 0.2s;
}
.ai-fab:hover { transform: scale(1.1); animation: none; }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(107, 141, 214, 0.6); }
  70% { box-shadow: 0 0 0 20px rgba(107, 141, 214, 0); }
  100% { box-shadow: 0 0 0 0 rgba(107, 141, 214, 0); }
}
</style>
