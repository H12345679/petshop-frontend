<template>
  <div class="home">
    <AppHeader />

    <div class="container">
      <!-- 分类 + 轮播 + 用户卡 -->
      <div class="hero">
        <aside class="cat-card" aria-label="商品分类">
          <div class="cat-title">商品分类</div>
          <ul class="cat-list">
            <li v-for="c in categories" :key="c.id" @click="$router.push({ path: '/products', query: { categoryId: c.id } })">{{ c.name }} <span class="arrow">›</span></li>
            <template v-if="!categories.length">
              <li v-for="i in 5" :key="'cat-skel-'+i" style="pointer-events: none; padding: 10px 16px;">
                <el-skeleton animated style="width: 100%;">
                  <template slot="template">
                    <el-skeleton-item variant="text" style="width: 65%;" />
                  </template>
                </el-skeleton>
              </li>
            </template>
          </ul>
        </aside>

        <div class="banner">
          <el-carousel height="320px" style="width: 100%;">
            <el-carousel-item v-for="(img, index) in banners" :key="index">
              <img :src="img" alt="首页Banner" class="carousel-img" />
            </el-carousel-item>
          </el-carousel>
        </div>

          <aside class="user-card" :class="{ logged: userInfo }" aria-label="用户信息">
            <div class="u-top">
              <div class="avatar">{{ userInfo ? (userInfo.nickname || userInfo.username || '我')[0] : '🐾' }}</div>
              <div v-if="userInfo" class="u-info">
                <div class="u-name">{{ userInfo.nickname || userInfo.username }}</div>
                <div class="u-bal">余额 <span>¥{{ userInfo.balance != null ? userInfo.balance : 0 }}</span> <router-link to="/recharge" class="recharge-link">充值</router-link></div>
              </div>
              <div v-else class="u-info">
                <div class="u-name">欢迎来到宠物商城</div>
                <router-link to="/login" class="u-login-btn">登录 / 注册</router-link>
              </div>
            </div>
          <div class="entry" @click="$router.push('/coupons')">🎫 领券中心</div>
          <div class="entry" @click="$router.push('/user/center')">⚙️ 设置</div>
        </aside>
      </div>

      <!-- 首页商品展示策略分区 -->
      <section v-for="sec in sections" :key="sec.key" class="block">
        <div class="section-title">
          <span>{{ sec.title }}</span>
          <span class="tag">{{ sec.tag }}</span>
          <span class="more" @click="$router.push('/products')">查看更多 ›</span>
        </div>
        <div class="grid">
          <!-- 1. 骨架屏（加载中展示） -->
          <template v-if="sec.loading">
            <div class="pcard" v-for="i in 6" :key="'skel-'+i" style="cursor: default;">
              <el-skeleton style="width: 100%" animated>
                <template slot="template">
                  <el-skeleton-item variant="image" style="width: 100%; height: 180px; display: block; border-radius: 8px 8px 0 0;" />
                  <div style="padding: 12px;">
                    <el-skeleton-item variant="p" style="width: 85%; margin-bottom: 6px;" />
                    <el-skeleton-item variant="p" style="width: 50%; margin-bottom: 12px;" />
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <el-skeleton-item variant="text" style="width: 35%" />
                      <el-skeleton-item variant="text" style="width: 25%" />
                    </div>
                  </div>
                </template>
              </el-skeleton>
            </div>
          </template>

          <!-- 2. 真实商品卡片 -->
          <template v-else-if="sec.list.length > 0">
            <div class="pcard" v-for="p in sec.list" :key="p.id" @click="$router.push('/product/' + p.id)">
              <div class="pimg" :class="{ ph: !p.mainImage }"
                   :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
                <span v-if="!p.mainImage">商品图</span>
              </div>
              <div class="pbody">
                <div class="pname">{{ p.name }}</div>
                <div v-if="p.recommendReason" class="reason">🐾 {{ p.recommendReason }}</div>
                <div class="price-row">
                  <span class="price"><span class="cur">¥</span>{{ Number(p.price).toFixed(2) }}</span>
                  <span v-if="p.userDiscount < 1" class="del">¥{{ (p.price / p.userDiscount).toFixed(2) }}</span>
                  <span v-else-if="p.originalPrice && p.originalPrice > p.price" class="del">¥{{ p.originalPrice }}</span>
                </div>
                <div class="small muted sales">已售 {{ p.sales || 0 }} 件</div>
              </div>
            </div>
          </template>

          <!-- 3. 空状态 -->
          <div v-else class="empty">暂无数据（确认后端有 status=1 的上架商品）</div>
        </div>
      </section>
    </div>

    <AppFooter />


  </div>
</template>

<script>
import { homeProducts, categoryTree } from "@/api/modules/home.js";
import { getUserInfo } from "@/api/modules/user.js";
import { getStore, setStore } from "@/libs/storage.js";

export default {
  name: "HomeView",
  data() {
    return {
      categories: [],
      userInfo: null,
      sections: [
        { key: "rec", title: "💡 为你推荐", tag: "RECOMMEND", list: [], loading: true },
        { key: "hot", title: "🔥 热销榜单", tag: "HOT", list: [], loading: true },
        { key: "new", title: "✨ 新鲜上架", tag: "NEW", list: [], loading: true },
        { key: "cf", title: "🛍️ 大家都在买", tag: "CF", list: [], loading: true },
      ],
      banners: [
        '/img/banners/banner1.jpg',
        '/img/banners/banner2.jpg',
        '/img/banners/banner3.jpg',
        '/img/banners/banner4.jpg',
        '/img/banners/banner5.jpg'
      ],
    };
  },
  computed: {
  },
  created() {
    // 读本地登录态
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { console.warn(e); this.userInfo = null; }
    // 从 API 刷新最新用户信息（余额同步）
    if (this.userInfo) {
      this.refreshUserInfo();
    }
    // 拉数据（都是公开接口，免登录可看）
    this.loadCategories();
    this.sections.forEach(sec => {
      this.loadSection(sec, sec.tag);
    });
  },
  methods: {
    async refreshUserInfo() {
      try {
        const res = await getUserInfo();
        if (res && res.data) {
          this.userInfo = res.data;
          setStore("userInfo", JSON.stringify(res.data));
        }
      } catch (e) { console.warn("ignored", e); /* 使用本地缓存兜底 */ }
    },
    async loadCategories() {
      try {
        const res = await categoryTree();
        this.categories = res.data || [];
      } catch (e) {
        console.warn(e);
        this.categories = [];
      }
    },

    async loadSection(sec, strategy) {
      try {
        const res = await homeProducts(strategy, 6);
        sec.list = res.data || [];
      } catch (e) {
        console.warn(e);
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

/* 主体容器 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; padding: 24px 0 60px; }
.hero { display: flex; gap: 20px; margin-bottom: 32px; height: 320px; }

/* 基础卡片样式 */
.cat-card, .user-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(149, 157, 165, 0.1);
  padding: 20px;
}

/* 左侧分类卡片 */
.cat-card { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; }
.cat-title { font-size: 16px; font-weight: 700; color: #222; margin-bottom: 12px; padding-left: 8px; }
.cat-list { list-style: none; margin: 0; padding: 0; flex: 1; overflow-y: auto; }
.cat-list li {
  padding: 10px 12px; font-size: 14px; color: #555; cursor: pointer;
  border-radius: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 4px;
}
.cat-list li:hover {
  background: #f5f8ff; color: #164082; font-weight: 600;
  transform: translateX(6px);
}
.cat-list .arrow { float: right; color: #cbd5e1; transition: transform 0.2s; }
.cat-list li:hover .arrow { color: #6B8DD6; transform: translateX(2px); }

/* 中央大屏 Banner */
.banner {
  flex: 1; border-radius: 16px;
  box-shadow: 0 12px 32px rgba(107, 141, 214, 0.25);
  position: relative; overflow: hidden;
}
.carousel-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

/* 右侧用户卡片 */
.user-card { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; }
.user-card.logged {
  background: linear-gradient(160deg, #ffffff 0%, #f6f8fc 100%);
  border: 1px solid #eef2fb;
}
.u-top { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #eef2fb, #dce4f7); color: #6B8DD6;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 24px; font-weight: 700; box-shadow: 0 4px 12px rgba(107, 141, 214, 0.2);
}
.u-info { flex: 1; }
.u-name { font-weight: 700; font-size: 16px; color: #222; margin-bottom: 4px; }
.u-bal { font-size: 12px; color: #595959; }
.u-bal span { color: #FF4757; font-weight: 600; font-size: 14px; }
.recharge-link { margin-left: 8px; font-size: 12px; color: #2a69d4; font-weight: 600; text-decoration: none; }
.recharge-link:hover { opacity: 0.8; }
.u-login-btn {
  display: inline-block; background: #ffece8; color: #cc0014;
  padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-decoration: none; transition: background 0.2s;
}
.u-login-btn:hover { background: #ffd9d1; }
.entry {
  flex: 1; border-radius: 12px; background: #f8f9fc; color: #475569;
  display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-top: 12px; cursor: pointer;
  transition: all 0.2s; border: 1px solid transparent;
}
.entry:hover { background: #fff; border-color: #dce4f7; color: #164082; box-shadow: 0 4px 12px rgba(107, 141, 214, 0.1); transform: translateY(-2px); }

/* 分区区块 */
.block { margin-bottom: 40px; }
.section-title { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; color: #111; margin: 0 0 20px; letter-spacing: -0.5px; }
.section-title .tag { font-size: 12px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #FF4757, #ff6b81); border-radius: 6px; padding: 4px 10px; box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3); }
.section-title .more { margin-left: auto; font-size: 14px; font-weight: 500; color: #595959; cursor: pointer; transition: color 0.2s; }
.section-title .more:hover { color: #164082; }

/* 商品网格 & 微交互 */
.grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
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
.pbody { padding: 16px; position: relative; background: #fff; z-index: 2; }
.pname { font-size: 14px; font-weight: 500; color: #222; height: 40px; line-height: 20px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; transition: color 0.2s; }
.pcard:hover .pname { color: #6B8DD6; }
.reason {
  display: inline-block; margin-top: 6px; font-size: 11px; color: #e6914e;
  background: #fdf3e7; border-radius: 8px; padding: 2px 8px; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.price-row { margin: 12px 0 4px; display: flex; align-items: baseline; }
.price { color: #FF4757; font-weight: 700; font-size: 20px; letter-spacing: -0.5px; }
.price .cur { font-size: 13px; margin-right: 2px; }
.del { color: #a0aec0; text-decoration: line-through; font-size: 12px; margin-left: 8px; font-weight: 400; }
.sales { color: #94a3b8; font-size: 12px; }
.empty { grid-column: 1 / -1; color: #595959; font-size: 15px; padding: 40px 0; text-align: center; background: #fff; border-radius: 16px; box-shadow: 0 4px 16px rgba(149, 157, 165, 0.05); }

.muted { color: #595959; }
.small { font-size: 12px; }
.link { color: #6B8DD6; cursor: pointer; text-decoration: none; font-weight: 600; transition: opacity 0.2s; }
.link:hover { opacity: 0.8; }


</style>
