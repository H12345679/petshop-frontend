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
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "auth" */ '../views/LoginView.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import(/* webpackChunkName: "auth" */ '../views/RegisterView.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// // 全局前置守卫：控制登录态访问。
// // 用法：给需要登录的路由加 meta: { requiresAuth: true }，未登录访问会被弹去 /login。
// //   例：{ path: '/cart', component: Cart, meta: { requiresAuth: true } }
// router.beforeEach((to, from, next) => {
//   const token = getStore('token')
//   // 已登录还去登录/注册页 → 直接回首页
//   if (token && (to.path === '/login' || to.path === '/register')) {
//     return next('/')
//   }
//   // 访问受保护页面但未登录 → 跳登录页，并把目标地址带上，登录成功后回跳
//   if (to.matched.some(r => r.meta && r.meta.requiresAuth) && !token) {
//     return next({ path: '/login', query: { redirect: to.fullPath } })
//   }
//   next()
// })

export default router
