# petshop-frontend

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

---

## 🛠 开发说明 (Development Notes)

### 后台管理模块 (Admin) 路由说明
为了避免代码重复，提高后台页面的可维护性，后台页面现已使用 **嵌套路由** 机制进行重构：
- **公共外壳**：`src/views/admin/AdminLayout.vue` 包含了通用的左侧边栏 (`.aside`) 和顶部信息栏 (`.atop`)。
- **添加新后台页面**：在开发新的后台管理页面（如视频管理、订单管理）时，**无需**在页面内重复编写侧边栏和顶栏。只需编写页面核心内容区块，并在 `router/index.js` 中将其作为 `/admin` 路由的 `children` 注册即可。
- **页面标题**：在路由的 `meta: { title: 'xxx / xxx' }` 中配置，顶栏将自动读取并展示。
