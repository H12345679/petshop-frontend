import Vue from "vue";
import VueRouter from "vue-router";
import HomeView from "../views/HomeView.vue";
import { getStore } from "../libs/storage.js";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/videos",
    name: "videos",
    component: () =>
      import(/* webpackChunkName: "video" */ "../views/video/VideoListView.vue"),
  },
  {
    path: "/video/:id",
    name: "video-detail",
    component: () =>
      import(
        /* webpackChunkName: "video" */ "../views/video/VideoDetailView.vue"
      ),
  },
  {
    path: "/login",
    name: "login",
    component: () =>
      import(/* webpackChunkName: "auth" */ "../views/auth/LoginView.vue"),
  },
  {
    path: "/register",
    name: "register",
    component: () =>
      import(/* webpackChunkName: "auth" */ "../views/auth/RegisterView.vue"),
  },
  {
    path: "/user/center",
    name: "userCenter",
    component: () =>
      import(/* webpackChunkName: "user" */ "../views/user/UserCenter.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/products",
    name: "products",
    component: () =>
      import(
        /* webpackChunkName: "product" */ "../views/product/ProductsView.vue"
      ),
  },
  {
    path: "/product/:id",
    name: "product-detail",
    component: () =>
      import(
        /* webpackChunkName: "product" */ "../views/product/ProductDetailView.vue"
      ),
  },
  {
    path: "/shops",
    name: "shops",
    component: () =>
      import(/* webpackChunkName: "shop" */ "../views/shop/ShopsView.vue"),
  },
  {
    path: "/shop/:id",
    name: "shop-detail",
    component: () =>
      import(/* webpackChunkName: "shop" */ "../views/shop/ShopDetailView.vue"),
  },
  {
    path: "/map",
    name: "map",
    component: () =>
      import(/* webpackChunkName: "map" */ "../views/map/MapView.vue"),
  },
  {
    path: "/coupons",
    name: "coupons",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/market/CouponCenterView.vue"),
  },
  {
    path: "/messages",
    name: "messages",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/user/MessageCenterView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/recharge",
    name: "recharge",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/user/RechargeView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/addresses",
    name: "addresses",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/user/AddressManageView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/cart",
    name: "cart",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/CartView.vue"),
  },
  {
    path: "/checkout",
    name: "checkout",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/CheckoutView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/orders",
    name: "orders",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/OrderListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/order/:id",
    name: "order-detail",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/OrderDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/refund",
    name: "refund",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/RefundView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/review",
    name: "review",
    component: () =>
      import(/* webpackChunkName: "order" */ "../views/order/ReviewView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/ai-chat",
    name: "ai-chat",
    component: () =>
      import(/* webpackChunkName: "ai" */ "../views/ai/AiChatView.vue"),
  },
  {
    path: "/admin",
    component: () =>
      import(/* webpackChunkName: "admin" */ "../views/admin/AdminLayout.vue"),
    meta: { requiresAdmin: true },
    children: [
      {
        path: "",
        redirect: "/admin/dashboard",
      },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: () =>
          import(
            /* webpackChunkName: "admin" */ "../views/admin/AdminDashboardView.vue"
          ),
        meta: { title: "数据 / 数据看板" },
      },
      {
        path: "shops",
        name: "AdminShops",
        component: () => import("../views/admin/AdminShopsView.vue"),
        meta: { title: "后台管理 - 门店管理" },
      },
      {
        path: "videos",
        name: "AdminVideos",
        component: () => import("../views/admin/AdminVideosView.vue"),
        meta: { title: "后台管理 - 视频管理" },
      },
      {
        path: "messages",
        name: "AdminMessages",
        component: () => import("../views/admin/AdminMessagesView.vue"),
        meta: { title: "运营 / 消息推送" },
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminProductsView.vue'),
        meta: { title: '商品 / 商品管理' }
      },
      {
        path: 'logs',
        name: 'AdminLogs',
        component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminLogsView.vue'),
        meta: { title: '后台管理 - 日志审核', requiresSuperAdmin: true }
      },
      {
        path: "orders",
        name: "admin-orders",
        component: () =>
          import(
            /* webpackChunkName: "admin" */ "../views/admin/AdminOrdersView.vue"
          ),
        meta: { title: "订单 / 订单管理" },
      },
      {
        path: "refunds",
        name: "admin-refunds",
        component: () =>
          import(
            /* webpackChunkName: "admin" */ "../views/admin/AdminRefundsView.vue"
          ),
        meta: { title: "退单 / 退单审核" },
      },
      {
        path: "reviews",
        name: "admin-reviews",
        component: () =>
          import(
            /* webpackChunkName: "admin" */ "../views/admin/AdminReviewsView.vue"
          ),
        meta: { title: "评价 / 评价管理" },
      },
      {
        path: "coupons",
        name: "admin-coupons",
        component: () =>
          import(
            /* webpackChunkName: "admin" */ "../views/admin/AdminCouponsView.vue"
          ),
        meta: { title: "优惠券 / 优惠券管理" },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminManage.vue'),
        meta: { title: '用户 / 用户与会员管理' }
      }
    ],
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

// 全局前置守卫：控制登录态与权限访问
router.beforeEach((to, from, next) => {
  const token = getStore("token");
  let userInfo = null;
  try {
    userInfo = JSON.parse(getStore("userInfo") || "null");
  } catch (e) { }

  // 已登录还去登录/注册页 → 直接回首页
  if (token && (to.path === "/login" || to.path === "/register")) {
    return next("/");
  }

  // 需要管理员权限的页面
  if (to.matched.some((r) => r.meta && r.meta.requiresAdmin)) {
    if (!token) {
      alert("请先登录");
      return next({ path: "/login", query: { redirect: to.fullPath } });
    }
    if (
      !userInfo ||
      (userInfo.role !== "ADMIN" && userInfo.role !== "MERCHANT")
    ) {
      alert("越权访问：仅限管理员或商家访问后台");
      return next("/");
    }
  }

  // 检查是否需要超级管理员权限
  if (to.matched.some((r) => r.meta && r.meta.requiresSuperAdmin)) {
    if (!userInfo || userInfo.role !== "ADMIN") {
      alert("越权访问，仅系统管理员可查看该页面");
      return next("/admin");
    }
  }

  // 普通需要登录的页面
  if (to.matched.some((r) => r.meta && r.meta.requiresAuth) && !token) {
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }

  next();
});

export default router;
