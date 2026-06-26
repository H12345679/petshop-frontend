import Vue from 'vue'
import VueRouter from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getStore } from '../libs/storage.js'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/videos',
    name: 'videos',
    component: () => import(/* webpackChunkName: "video" */ '../views/VideoListView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/LoginView.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/RegisterView.vue')
  },
  {
    path: '/products',
    name: 'products',
    component: () => import(/* webpackChunkName: "product" */ '../views/product/ProductsView.vue')
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: () => import(/* webpackChunkName: "product" */ '../views/product/ProductDetailView.vue')
  },
  {
    path: '/shops',
    name: 'shops',
    component: () => import(/* webpackChunkName: "shop" */ '../views/shop/ShopsView.vue')
  },
  {
    path: '/shop/:id',
    name: 'shop-detail',
    component: () => import(/* webpackChunkName: "shop" */ '../views/shop/ShopDetailView.vue')
  },
  {
    path: '/admin/shops',
    name: 'admin-shops',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminShopsView.vue'),
    meta: { requiresAdmin: true }
  },
  {
    path: '/admin/products',
    name: 'admin-products',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminProductsView.vue'),
    meta: { requiresAdmin: true }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// 全局前置守卫：控制登录态与权限访问
router.beforeEach((to, from, next) => {
  const token = getStore('token')
  let userInfo = null
  try { userInfo = JSON.parse(getStore('userInfo') || 'null') } catch(e) {}

  // 已登录还去登录/注册页 → 直接回首页
  if (token && (to.path === '/login' || to.path === '/register')) {
    return next('/')
  }
  
  // 需要管理员权限的页面
  if (to.matched.some(r => r.meta && r.meta.requiresAdmin)) {
    if (!token) {
      alert("请先登录");
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
    if (!userInfo || (userInfo.role !== 'ADMIN' && userInfo.role !== 'MERCHANT')) {
      alert("越权访问：仅限管理员或商家访问后台");
      return next('/');
    }
  }

  // 普通需要登录的页面
  if (to.matched.some(r => r.meta && r.meta.requiresAuth) && !token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  
  next()
})

export default router
