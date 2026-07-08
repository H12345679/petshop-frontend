<template>
  <div class="products-page">
    <AppHeader />

    <div class="container">
      <div class="breadcrumb small muted mb12">
        <router-link to="/" class="bc-link">首页</router-link> / 
        <router-link to="/products" class="bc-link">全部商品</router-link>
        <span v-if="currentCategoryName"> / {{ currentCategoryName }}</span>
      </div>
      
      <div class="row layout-body">
        <!-- 左侧分类树 -->
        <aside class="sidebar card">
          <h3 class="cat-title">商品分类</h3>
          <ul class="tree-list">
            <li class="tree-item" :class="{ active: query.categoryId === '' }" @click="selectCategory('', '全部')">
              <span class="tree-label">全部商品</span>
            </li>
            <template v-for="c in categories">
              <li class="tree-item parent" :key="c.id" :class="{ active: query.categoryId === c.id }" @click="selectCategory(c.id, c.name)">
                <span class="tree-label">▾ {{ c.name }}</span>
              </li>
              <li class="tree-item child" v-for="sub in c.children" :key="sub.id" :class="{ active: query.categoryId === sub.id }" @click="selectCategory(sub.id, sub.name)">
                <span class="tree-label">· {{ sub.name }} <span v-if="query.categoryId === sub.id">✓</span></span>
              </li>
            </template>
            <template v-if="!categories.length">
              <li v-for="i in 6" :key="'cat-skel-'+i" style="pointer-events: none; padding: 10px 16px;">
                <el-skeleton animated style="width: 100%;">
                  <template slot="template">
                    <el-skeleton-item variant="text" style="width: 70%;" />
                  </template>
                </el-skeleton>
              </li>
            </template>
          </ul>
        </aside>

        <!-- 右侧主体 -->
        <main class="main-content">
          <!-- 筛选条 -->
          <div class="filter-card card">
            <div class="filter-row wrap gap8">
              <template v-if="!query.categoryId">
                <span class="small muted label">类型：</span>
                <span class="tag" :class="{ accent: query.type === '' }" @click="selectType('')">全部</span>
                <span class="tag" :class="{ accent: query.type === 1 }" @click="selectType(1)">宠物</span>
                <span class="tag" :class="{ accent: query.type === 2 }" @click="selectType(2)">周边商品</span>
              </template>
              
              <span class="small muted label" style="margin-left:20px">排序：</span>
              <span class="tag" :class="{ accent: query.sort === '' || query.sort === 'recommend' }" @click="selectSort('recommend')">
                综合
              </span>
              <span class="tag" :class="{ accent: query.sort === 'sales_desc' }" @click="selectSort('sales_desc')">
                销量
              </span>
              <span class="tag" :class="{ accent: query.sort === 'price_asc' || query.sort === 'price_desc' }" @click="togglePriceSort">
                价格 {{ query.sort === 'price_asc' ? '↑' : (query.sort === 'price_desc' ? '↓' : '↑↓') }}
              </span>
              <span class="tag" :class="{ accent: query.sort === 'new' }" @click="selectSort('new')">
                最新
              </span>
              
              <span class="spacer"></span>
              
              <span class="small muted label">价格区间：</span>
              <div class="price-input">
                <input aria-label="input" v-model.number="query.minPrice" type="number" placeholder="¥最低" @keyup.enter="doSearch" />
              </div>
              <span class="dash">-</span>
              <div class="price-input">
                <input aria-label="input" v-model.number="query.maxPrice" type="number" placeholder="¥最高" @keyup.enter="doSearch" />
              </div>
              <button class="btn-small" @click="doSearch">确定</button>
            </div>
          </div>

          <!-- 商品网格 -->
          <!-- 1. 骨架屏（加载中展示） -->
          <div class="product-grid" v-if="loading">
            <div class="pcard" v-for="i in 10" :key="'skel-'+i" style="cursor: default;">
              <el-skeleton style="width: 100%" animated>
                <template slot="template">
                  <el-skeleton-item variant="image" style="width: 100%; height: 200px; display: block; border-radius: 8px 8px 0 0;" />
                  <div style="padding: 14px;">
                    <el-skeleton-item variant="p" style="width: 85%; margin-bottom: 8px;" />
                    <el-skeleton-item variant="p" style="width: 50%; margin-bottom: 14px;" />
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <el-skeleton-item variant="text" style="width: 35%" />
                      <el-skeleton-item variant="text" style="width: 25%" />
                    </div>
                  </div>
                </template>
              </el-skeleton>
            </div>
          </div>

          <!-- 2. 真实商品列表 -->
          <div class="product-grid" v-else-if="products.length">
            <div class="pcard" v-for="p in products" :key="p.id" @click="goToDetail(p.id)">
              <div class="pimg" :class="{ ph: !p.mainImage }" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
                <span v-if="!p.mainImage">
                  商品主图
                </span>
              </div>
              <div class="pbody">
                <div class="pname">
                  {{ p.name }}
                </div>
                <div class="price-row">
                  <span class="price">
                    <span class="cur">
                      ¥
                    </span>
                    {{ Number(p.price).toFixed(2) }}
                  </span>
                  <span v-if="p.userDiscount < 1" class="del">
                    ¥{{ (p.price / p.userDiscount).toFixed(2) }}
                  </span>
                  <span v-else-if="p.originalPrice && p.originalPrice > p.price" class="del">
                    ¥{{ p.originalPrice }}
                  </span>
                </div>
                <div class="small muted sales">
                  已售 {{ p.sales || 0 }}件
                </div>
              </div>
            </div>
          </div>
          
          <!-- 3. 空状态 -->
          <div class="empty-state" v-else>
            没有找到符合条件的商品，换个关键词或分类试试吧。
          </div>

          <!-- 分页 -->
          <div class="pager" v-if="total > 0 && !loading">
            <span class="arrow" @click="changePage(query.page - 1)" :class="{ disabled: query.page <= 1 }">
              <
            </span>
            <span class="num" v-for="p in totalPages" :key="p" :class="{ on: query.page === p }" @click="changePage(p)">
              {{ p }}
            </span>
            <span class="arrow" @click="changePage(query.page + 1)" :class="{ disabled: query.page >= totalPages }">
              >
            </span>
            <span class="total-text">
              共 {{ total }} 条
            </span>
          </div>
        </main>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import { categoryTree } from "@/api/modules/home.js";
import { searchProducts } from "@/api/modules/product.js";
import { getStore } from "@/libs/storage.js";


export default {
  name: "ProductsView",
  data() {
    return {
      categories: [],
      currentCategoryName: "",
      userInfo: null,
      
      products: [],
      total: 0,
      loading: false,
      
      query: {
        categoryId: "",
        name: "",
        type: "",
        sort: "recommend",
        minPrice: null,
        maxPrice: null,
        page: 1,
        size: 10
      }
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    }
  },
  created() {
    const u = getStore("userInfo");
    try {
      this.userInfo = u ? JSON.parse(u) : null;
    } catch (e) {
      this.userInfo = null;
    }

    // 初始化参数
    if (this.$route.query.categoryId) {
      this.query.categoryId = Number(this.$route.query.categoryId) || this.$route.query.categoryId;
    }
    if (this.$route.query.name) {
      this.query.name = this.$route.query.name;
    }
    if (this.$route.query.type) {
      this.query.type = Number(this.$route.query.type);
    }
    
    this.loadCategories();
    this.doSearch();
  },
  watch: {
    '$route.query.name'(newVal) {
      this.query.name = newVal || "";
      this.query.page = 1;
      this.doSearch();
    }
  },
  methods: {
    async loadCategories() {
      try {
        const res = await categoryTree();
        this.categories = res.data || [];
      } catch (e) {
        console.warn("加载分类失败", e);
        this.categories = [];
      }
    },
    async doSearch() {
      this.loading = true;
      try {
        const params = {
          current: this.query.page,
          size: this.query.size,
          status: 1 // 只查上架
        };
        if (this.query.categoryId) { 
          params.categoryId = this.query.categoryId;
        }
        if (this.query.name) { 
          params.name = this.query.name;
        }
        if (this.query.type) { 
          params.type = this.query.type;
        }
        if (this.query.minPrice != null) {
          params.minPrice = this.query.minPrice;
        }
        if (this.query.maxPrice != null) {
          params.maxPrice = this.query.maxPrice;
        }
        if (this.query.sort) {
          params.sort = this.query.sort;
        }

        const res = await searchProducts(params);
        // 如果后端有数据返回 (PageResult 的结构中有 records 和 total)
        if (res.data && res.data.records) {
          this.products = res.data.records;
          this.total = res.data.total;
        } else {
          throw new Error("无数据或格式不匹配");
        }
      } catch (e) {
        console.warn("商品搜索请求失败:", e.message);
        this.products = [];
        this.total = 0;
      } finally {
        this.loading = false;
        this.updateUrl();
      }
    },
    selectCategory(id, name) {
      this.query.categoryId = id;
      if (id !== '') {
        this.query.type = ''; // 清除类型筛选，因为具体分类下不展示类型筛选
      }
      this.currentCategoryName = id === '' ? '' : name;
      this.query.page = 1;
      this.doSearch();
    },
    selectType(type) {
      this.query.type = type;
      this.query.page = 1;
      this.doSearch();
    },
    selectSort(sort) {
      this.query.sort = sort;
      this.query.page = 1;
      this.doSearch();
    },
    togglePriceSort() {
      if (this.query.sort === 'price_asc') {
        this.selectSort('price_desc');
      } else {
        this.selectSort('price_asc');
      }
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages) {
        return;
      }
      this.query.page = p;
      this.doSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    updateUrl() {
      const q = {};
      if (this.query.categoryId !== "") {
        q.categoryId = this.query.categoryId;
      }
      if (this.query.name) {
        q.name = this.query.name;
      }
      if (this.query.type !== "") {
        q.type = this.query.type;
      }
      
      const currentQuery = this.$route.query;
      const isSame = Object.keys(q).length === Object.keys(currentQuery).length && 
                     Object.keys(q).every(key => String(q[key]) === String(currentQuery[key]));
      if (!isSame) {
        this.$router.replace({ path: '/products', query: q }).catch(() => {});
      }
    },
    goToDetail(id) {
      this.$router.push('/product/' + id);
    }
  }
};
</script>

<style scoped>
.bc-link { color: inherit; text-decoration: none; cursor: pointer; transition: color 0.2s; }
.bc-link:hover { color: #2a69d4; }
.products-page { background: #f4f5f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 布局 */
.container { width: 1600px; max-width: 100%; margin: 0 auto; padding: 18px 0 40px; flex: 1; }
.layout-body { display: flex; align-items: stretch; gap: 20px; }
.row { display: flex; }
.col { display: flex; flex-direction: column; }
.between { justify-content: space-between; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.mb12 { margin-bottom: 12px; }
.mt8 { margin-top: 8px; }
.small { font-size: 13px; }
.muted { color: #595959; }
.accent { color: #2a69d4 !important; font-weight: 600; }
.spacer { flex: 1; }
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; }

/* 侧边分类树 */
.sidebar { width: 220px; flex-shrink: 0; padding: 20px 0; }
.cat-title { font-size: 15px; margin: 0 20px 16px; font-weight: 700; color: #595959; }
.tree-list { list-style: none; margin: 0; padding: 0; }
.tree-item { padding: 10px 20px; cursor: pointer; color: #444; font-size: 14px; transition: 0.2s; }
.tree-item:hover { background: #f8f9fb; color: #2a69d4; }
.tree-item.active { color: #2a69d4; font-weight: 600; background: #eef4fe; }
.tree-item.parent { font-weight: 600; color: #333; }
.tree-item.child { padding-left: 36px; font-size: 13px; }

/* 右侧主体区 */
.main-content { flex: 1; display: flex; flex-direction: column; gap: 20px; }

/* 筛选卡片 */
.filter-card { padding: 16px 24px; }
.filter-row { display: flex; align-items: center; font-size: 13px; }
.filter-row .label { margin-right: 4px; }
.tag { margin: 0 4px; padding: 4px 10px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: #555; }
.tag:hover { background: #f4f5f7; color: #2a69d4; }
.tag.accent { background: #eef4fe; color: #2a69d4; }

.price-input { width: 70px; border: 1px solid #d6dbe3; border-radius: 4px; overflow: hidden; }
.price-input input { width: 100%; border: 0; padding: 6px 8px; font-size: 12px; outline: none; }
.dash { margin: 0 6px; color: #aaa; }
.btn-small { margin-left: 10px; padding: 5px 12px; border: 1px solid #d6dbe3; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-small:hover { background: #f8f9fb; border-color: #cdd3db; }

/* 商品网格 */
.product-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
.pcard { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; }
.pcard:hover { box-shadow: 0 8px 24px rgba(60, 90, 160, 0.1); transform: translateY(-3px); }
.pimg { width: 100%; aspect-ratio: 1 / 1; background-size: cover; background-position: center; }
.pimg.ph { display: flex; align-items: center; justify-content: center; color: #aab0b8; font-size: 12px; background: repeating-linear-gradient(45deg, #eef0f3, #eef0f3 10px, #e6e9ee 10px, #e6e9ee 20px); }
.pbody { padding: 12px; }
.pname { font-size: 14px; color: #333; height: 40px; line-height: 20px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 8px; }
.price-row { display: flex; align-items: baseline; }
.price { color: #c0392b; font-weight: 700; font-size: 18px; }
.price .cur { font-size: 13px; }
.del { color: #aaa; text-decoration: line-through; font-size: 12px; margin-left: 6px; }
.sales { color: #94a3b8; font-size: 12px; margin-top: 8px; }

/* 分页 */
.pager { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; font-size: 14px; padding-bottom: 20px;}
.pager span { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; border-radius: 4px; cursor: pointer; color: #555; }
.pager .num:hover, .pager .arrow:hover { background: #eef4fe; color: #2a69d4; }
.pager .on { background: #2a69d4 !important; color: #fff !important; font-weight: 600; }
.pager .disabled { color: #ccc; cursor: not-allowed; background: transparent !important; }
.pager .total-text { margin-left: 10px; color: #595959; font-size: 13px; cursor: default; }

.empty-state { padding: 60px 0; text-align: center; color: #595959; background: #fff; border-radius: 10px; border: 1px solid #e6e8eb; }
.loading-state { padding: 60px 0; text-align: center; color: #2a69d4; font-weight: 500; }
</style>
