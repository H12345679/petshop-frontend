<template>
  <div class="video-list-page">
    <!-- 顶栏 -->
    <header class="topbar">
      <div class="logo"><span class="paw">🐾</span>宠物商城</div>
      <nav class="nav">
        <router-link to="/">首页</router-link>
        <span class="muted">全部商品</span>
        <span class="muted">找门店</span>
        <router-link to="/videos" class="active">萌宠视频</router-link>
      </nav>
      <div class="search">
        <input v-model.trim="keyword" placeholder="搜索视频标题..." @keyup.enter="onSearch" />
        <button class="go" @click="onSearch">搜索</button>
      </div>
      <div class="right">
        <span>🛒 购物车</span>
        <template v-if="userInfo">
          <span>👤 {{ userInfo.nickname || userInfo.username }}</span>
          <span class="link" @click="logout">退出</span>
        </template>
        <router-link v-else to="/login" class="link">登录 / 注册</router-link>
      </div>
    </header>

    <div class="container">
      <div class="tabs">
        <span v-for="tab in tabs" :key="tab.value" 
              class="tab" :class="{ on: activeTab === tab.value }" 
              @click="switchTab(tab.value)">
          {{ tab.label }}
        </span>
      </div>

      <!-- 骨架屏 (加载中显示) -->
      <div class="grid c4" v-if="loading">
        <div class="pcard" v-for="i in 8" :key="'skel-'+i">
          <el-skeleton style="width: 100%" animated>
            <template slot="template">
              <el-skeleton-item variant="image" style="width: 100%; height: 160px; display: block;" />
              <div style="padding: 12px;">
                <el-skeleton-item variant="p" style="width: 90%" />
                <el-skeleton-item variant="p" style="width: 60%" />
                <div style="margin-top: 10px;">
                  <el-skeleton-item variant="text" style="width: 40%" />
                </div>
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <!-- 真实数据 -->
      <div class="grid c4" v-else-if="videoList.length > 0">
        <div class="pcard" v-for="v in videoList" :key="v.id" @click="goToDetail(v.id)">
          <div class="img pimg" :style="{ backgroundImage: v.coverUrl ? 'url(' + v.coverUrl + ')' : null }">
            <span v-if="!v.coverUrl">▶ 视频封面</span>
            <span class="duration-tag" v-if="v.duration">{{ v.duration }}</span>
          </div>
          <div class="pbody">
            <div class="pname">{{ v.title }}</div>
            <div class="row between small muted mt8">
              <span>▶ {{ v.viewCount || 0 }} 播放</span>
              <span class="tag accent" v-if="v.productId">关联商品</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态或错误状态 -->
      <div v-else class="empty">
        <div v-if="isError">
          <div style="font-size: 40px; margin-bottom: 15px;">📡</div>
          <div>网络连接失败，无法获取视频列表</div>
          <button class="go mt16" style="padding: 8px 24px; border-radius: 20px; margin-top: 20px;" @click="fetchVideos">重新加载</button>
        </div>
        <div v-else>暂无相关视频</div>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="totalPages > 1">
        <span @click="changePage(pageNum - 1)" :class="{ disabled: pageNum === 1 }">‹</span>
        <span v-for="p in totalPages" :key="p" :class="{ on: pageNum === p }" @click="changePage(p)">{{ p }}</span>
        <span @click="changePage(pageNum + 1)" :class="{ disabled: pageNum === totalPages }">›</span>
      </div>
    </div>
    
    <AppFooter />
  </div>
</template>

<script>
import { getVideoList } from "@/api/modules/video.js";
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "VideoListView",
  data() {
    return {
      keyword: "",
      userInfo: null,
      activeTab: "", // 空代表推荐或全部
      tabs: [
        { label: "推荐", value: "" },
        { label: "猫咪", value: "cat" },
        { label: "狗狗", value: "dog" },
        { label: "萌宠日常", value: "daily" },
        { label: "养护知识", value: "knowledge" },
      ],
      videoList: [],
      pageNum: 1,
      pageSize: 12,
      totalPages: 0,
      loading: false,
      isError: false
    };
  },
  created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    
    if (this.$route.query.title) {
      this.keyword = this.$route.query.title;
    }
    this.fetchVideos();
  },
  methods: {
    async fetchVideos() {
      this.loading = true;
      this.isError = false;
      try {
        const params = {
          page: this.pageNum,
          size: this.pageSize
        };
        if (this.keyword) params.title = this.keyword;
        if (this.activeTab) params.category = this.activeTab;
        
        const res = await getVideoList(params);
        if (res.data && res.data.records) {
          this.videoList = res.data.records;
          this.totalPages = res.data.pages || 1;
        } else if (Array.isArray(res.data)) {
          this.videoList = res.data;
          this.totalPages = 1;
        } else {
          this.videoList = [];
        }
      } catch (e) {
        this.videoList = [];
        this.isError = true;
      } finally {
        this.loading = false;
      }
    },
    onSearch() {
      this.pageNum = 1;
      this.fetchVideos();
    },
    switchTab(val) {
      this.activeTab = val;
      this.pageNum = 1;
      this.fetchVideos();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages) return;
      this.pageNum = p;
      this.fetchVideos();
    },
    goToDetail(id) {
      this.$router.push(`/videos/${id}`);
    },
    logout() {
      removestore("token");
      removestore("userInfo");
      this.userInfo = null;
    }
  }
};
</script>

<style scoped>
.video-list-page { background: #f4f5f7; min-height: 100vh; }

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

.container { width: 1200px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; }

.tabs { display: flex; gap: 24px; margin-bottom: 20px; border-bottom: 1px solid #e6e8eb; padding-bottom: 10px; }
.tab { font-size: 15px; color: #666; cursor: pointer; padding: 4px 0; position: relative; }
.tab:hover { color: #5b8def; }
.tab.on { color: #5b8def; font-weight: bold; }
.tab.on::after { content: ''; position: absolute; bottom: -11px; left: 0; width: 100%; height: 2px; background: #5b8def; }

.grid.c4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.pcard { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; overflow: hidden; cursor: pointer; transition: .15s; }
.pcard:hover { box-shadow: 0 6px 18px rgba(60, 90, 160, .12); transform: translateY(-2px); }
.pimg { width: 100%; height: 160px; background-size: cover; background-position: center; position: relative; display: flex; align-items: center; justify-content: center; background-color: #eef0f3; color: #aab0b8; font-size: 14px; }
.duration-tag { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,.6); color: #fff; border: 0; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.pbody { padding: 12px; }
.pname { font-size: 14px; color: #333; height: 40px; line-height: 20px; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; font-weight: 500; }
.row { display: flex; align-items: center; }
.between { justify-content: space-between; }
.muted { color: #999; }
.small { font-size: 12px; }
.mt8 { margin-top: 8px; }
.tag.accent { color: #d9534f; border: 1px solid #d9534f; padding: 1px 6px; border-radius: 4px; font-size: 11px; }

.pager { display: flex; justify-content: center; gap: 8px; margin-top: 30px; }
.pager span { display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; background: #fff; border: 1px solid #e6e8eb; border-radius: 4px; cursor: pointer; font-size: 14px; color: #555; }
.pager span:hover { border-color: #5b8def; color: #5b8def; }
.pager span.on { background: #5b8def; color: #fff; border-color: #5b8def; }
.pager span.disabled { opacity: 0.5; cursor: not-allowed; }

.empty { color: #999; font-size: 14px; padding: 40px 0; text-align: center; }
.link { color: #5b8def; cursor: pointer; text-decoration: none; }
</style>
