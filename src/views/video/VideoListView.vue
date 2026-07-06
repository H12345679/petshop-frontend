<template>
  <div class="video-list-page">
    <AppHeader />

    <div class="container">
      <!-- 分类 Tabs 与搜索 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px;">
        <div class="tabs" style="border-bottom: none; margin-bottom: 0;">
          <span v-for="tab in tabs" :key="tab.value" 
                class="tab" :class="{ on: activeTab === tab.value }" 
                @click="switchTab(tab.value)">
            {{ tab.label }}
          </span>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input aria-label="input" v-model.trim="keyword" placeholder="搜索视频标题..." @keyup.enter="onSearch" style="padding: 6px 12px; border: 1px solid #d6dbe3; border-radius: 4px; outline: none; font-size: 13px;" />
          <button class="btn sm primary" style="background:#2a69d4; color:#fff; border: none; padding: 0 16px; cursor: pointer; border-radius: 4px;" @click="onSearch">搜索</button>
        </div>
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
          <div class="img pimg" :style="{ backgroundImage: v.cover ? 'url(' + v.cover + ')' : null }">
            <span v-if="!v.cover">▶ 视频封面</span>
            <span class="duration-tag" v-if="v.duration">{{ v.duration }}</span>
          </div>
          <div class="pbody">
            <div class="pname">{{ v.title }}</div>
            <div class="row between small muted mt8">
              <span>▶ {{ v.views || 0 }} 播放</span>
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
import { getCategories } from "@/api/modules/product.js";
import { getStore, removestore } from "@/libs/storage.js";

export default {
  name: "VideoListView",
  data() {
    return {
      keyword: "",
      userInfo: null,
      activeTab: "", // 空代表推荐或全部
      tabs: [
        { label: "推荐 / 全部", value: "" }
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
    if (this.$route.query.title) {
      this.keyword = this.$route.query.title;
    }
    this.loadCategories();
    this.fetchVideos();
  },
  methods: {
    async loadCategories() {
      try {
        const res = await getCategories();
        if (res.data) {
          const categoryTabs = res.data.map(c => ({ label: c.name, value: c.id }));
          this.tabs = [{ label: "推荐 / 全部", value: "" }, ...categoryTabs];
        }
      } catch (e) {
        console.error("加载分类失败", e);
      }
    },
    async fetchVideos() {
      this.loading = true;
      this.isError = false;
      try {
        const params = {
          page: this.pageNum,
          size: this.pageSize,
          status: 1 // 只拉取已上架的视频
        };
        if (this.keyword) params.title = this.keyword;
        if (this.activeTab) params.productCategoryId = this.activeTab;
        
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
      this.$router.push(`/video/${id}`);
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
.video-list-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

.container { width: 1200px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; }

.tabs { display: flex; gap: 24px; margin-bottom: 20px; border-bottom: 1px solid #e6e8eb; padding-bottom: 10px; }
.tab { font-size: 15px; color: #666; cursor: pointer; padding: 4px 0; position: relative; }
.tab:hover { color: #2a69d4; }
.tab.on { color: #2a69d4; font-weight: bold; }
.tab.on::after { content: ''; position: absolute; bottom: -11px; left: 0; width: 100%; height: 2px; background: #2a69d4; }

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
.muted { color: #595959; }
.small { font-size: 12px; }
.mt8 { margin-top: 8px; }
.tag.accent { color: #c0392b; border: 1px solid #c0392b; padding: 1px 6px; border-radius: 4px; font-size: 11px; }

.pager { display: flex; justify-content: center; gap: 8px; margin-top: 30px; }
.pager span { display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; background: #fff; border: 1px solid #e6e8eb; border-radius: 4px; cursor: pointer; font-size: 14px; color: #555; }
.pager span:hover { border-color: #2a69d4; color: #2a69d4; }
.pager span.on { background: #2a69d4; color: #fff; border-color: #2a69d4; }
.pager span.disabled { opacity: 0.5; cursor: not-allowed; }

.empty { color: #595959; font-size: 14px; padding: 40px 0; text-align: center; }
.link { color: #2a69d4; cursor: pointer; text-decoration: none; }
</style>
