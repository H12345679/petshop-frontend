<template>
  <div class="video-detail-page">
    <!-- 顶栏 -->
    <header class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <nav class="nav">
        <router-link to="/">首页</router-link>
        <router-link to="/products">全部商品</router-link>
        <router-link to="/shops">找门店</router-link>
        <router-link to="/videos" class="active">萌宠视频</router-link>
      </nav>
      <div class="search">
        <input placeholder="搜索视频..." @keyup.enter="handleSearch" v-model="searchKeyword" />
        <button class="go" @click="handleSearch">搜索</button>
      </div>
      <div class="right">
        <span>🛒 购物车</span>
        <span>🔔 消息</span>
        <template v-if="userInfo">
          <span>👤 {{ userInfo.nickname || userInfo.username }}</span>
          <span class="link" @click="logout">退出</span>
        </template>
        <router-link v-else to="/login" class="link">登录 / 注册</router-link>
      </div>
    </header>

    <div class="container" v-if="video">
      <el-row :gutter="24">
        <!-- 左侧：播放器 + 信息 + 带货 -->
        <el-col :span="17">
          
          <!-- 播放器区域 -->
          <div class="player-wrapper">
             <video v-if="video.url" 
                    :src="video.url" 
                    :poster="video.cover"
                    controls 
                    autoplay 
                    class="video-element">
             </video>
             <div v-else class="player-placeholder">视频信息加载中...</div>
          </div>

          <!-- 视频信息卡片 (移除社交功能) -->
          <el-card class="video-info-card" shadow="never">
             <h2 class="video-title">{{ video.title }}</h2>
             <div class="video-meta">
                <span>▶ {{ video.views }} 播放</span>
                <span>{{ formatDate(video.createTime) }} 发布</span>
                <span v-if="video.shopName" class="shop-name">{{ video.shopName }}</span>
             </div>
             <p v-if="video.description" class="video-desc">{{ video.description }}</p>
          </el-card>

          <!-- 视频同款商品卡片 -->
          <el-card v-if="video.productId && video.productId !== 0" class="product-card" shadow="never">
             <div slot="header" class="product-header">
               <span>🛒 视频同款商品</span>
             </div>
             <div class="product-content">
                <el-image :src="video.productMainImage || ''" class="product-img" fit="cover">
                  <div slot="error" class="image-slot">暂无图片</div>
                </el-image>
                <div class="product-info">
                   <div class="product-name">{{ video.productName }}</div>
                   <div class="product-price">￥{{ video.productPrice }}</div>
                </div>
                <div class="product-action">
                   <el-button size="medium" @click="goToProduct(video.productId)">查看详情</el-button>
                   <el-button size="medium" type="primary">立即购买</el-button>
                </div>
             </div>
          </el-card>

        </el-col>

        <!-- 右侧：相关推荐 -->
        <el-col :span="7">
          <el-card shadow="never" class="recommend-card">
             <div slot="header" style="font-weight: bold; color: #333;">相关推荐</div>
             
             <div v-if="recommendList.length === 0" class="empty-recommend">暂无推荐视频</div>
             
             <div class="recommend-list" v-else>
               <div v-for="item in recommendList" :key="item.id" class="recommend-item" @click="goToVideo(item.id)">
                  <div class="r-cover">
                     <el-image :src="item.cover" class="r-img" fit="cover">
                       <div slot="error" class="image-slot">暂无</div>
                     </el-image>
                     <span class="r-views">▶ {{ item.views }}</span>
                  </div>
                  <div class="r-info">
                     <div class="r-title" :title="item.title">{{ item.title }}</div>
                  </div>
               </div>
             </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { getVideoDetail, getVideoList } from "@/api/modules/video.js";
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "VideoDetailView",
  data() {
    return {
      userInfo: null,
      searchKeyword: "",
      video: null,
      recommendList: []
    };
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.loadVideoDetail(newId);
          this.loadRecommendations();
        }
      }
    }
  },
  created() {
    const u = getStore("userInfo");
    if (u) {
      try { this.userInfo = JSON.parse(u); } catch (e) {}
    }
  },
  methods: {
    formatDate(ds) {
      if (!ds) return "";
      return ds.substring(0, 10);
    },
    async loadVideoDetail(id) {
      try {
        const res = await getVideoDetail(id);
        this.video = res.data;
        document.title = (this.video?.title || '视频详情') + ' - 宠物商城';
      } catch (e) {
        this.$message.error("加载视频详情失败：" + (e.message || e));
      }
    },
    async loadRecommendations() {
      try {
        const res = await getVideoList({ current: 1, size: 6, status: 1 });
        const list = res.data.records || [];
        this.recommendList = list.filter(v => String(v.id) !== String(this.$route.params.id)).slice(0, 5);
      } catch (e) {
        console.error("加载推荐失败", e);
      }
    },
    handleSearch() {
      if (this.searchKeyword.trim()) {
        this.$router.push({ path: '/videos', query: { title: this.searchKeyword.trim() } });
      }
    },
    goToVideo(id) {
      this.$router.push(`/video/${id}`);
    },
    goToProduct(id) {
      this.$router.push(`/product/${id}`);
    },
    logout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
      if (this.$route.meta.requiresAuth) {
        this.$router.push("/login");
      }
    }
  }
};
</script>

<style scoped>
.video-detail-page {
  background: #f4f5f7;
  min-height: 100vh;
}

/* 顶栏样式 (复用全站) */
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
.link { color: #5b8def; cursor: pointer; text-decoration: none; }

/* 页面内容区 */
.container {
  width: 1200px;
  max-width: 100%;
  margin: 0 auto;
  padding: 24px 0;
}

/* 播放器 */
.player-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #111;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  position: relative;
}
.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
}
.player-placeholder {
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 视频信息 */
.video-info-card {
  border-radius: 0 0 8px 8px;
  border-top: none;
  margin-top: 0;
}
.video-info-card .el-card__body {
  padding: 24px;
}
.video-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  color: #222;
  line-height: 1.4;
}
.video-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 16px;
}
.shop-name {
  color: #606266;
}
.video-desc {
  color: #606266;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
}

/* 同款商品 */
.product-card {
  margin-top: 16px;
  border-radius: 8px;
}
.product-header {
  font-weight: bold;
  font-size: 16px;
}
.product-content {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fafbfc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.product-img {
  width: 100px;
  height: 100px;
  border-radius: 4px;
  background: #f5f7fa;
  flex-shrink: 0;
}
.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #c0c4cc;
  font-size: 12px;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 90px;
}
.product-name {
  font-size: 16px;
  color: #303133;
  font-weight: 500;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.product-price {
  color: #F56C6C;
  font-size: 22px;
  font-weight: bold;
}
.product-action {
  display: flex;
  gap: 12px;
}

/* 右侧推荐 */
.recommend-card {
  border-radius: 8px;
}
.empty-recommend {
  color: #909399;
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.recommend-item {
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.recommend-item:hover {
  opacity: 0.8;
}
.r-cover {
  width: 130px;
  height: 74px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  background: #f5f7fa;
}
.r-img {
  width: 100%;
  height: 100%;
}
.r-views {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 11px;
}
.r-info {
  flex: 1;
  min-width: 0;
}
.r-title {
  font-size: 13px;
  color: #303133;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
