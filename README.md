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

---

## 🛠 最新核心代码细节与优化 (Latest Core Code Details)

在近期的前端体验升级与 Bug 修复中，我们深度优化了以下模块：

### 1. 后台用户管理 (AdminManage)
* **抛弃本地假分页过滤**：删除了原本依赖 `Array.filter` 对当前页数据进行角色、状态、会员等级过滤的缺陷逻辑。
* **接入服务端检索**：重写了下拉框事件，触发 `@change="doSearch"` 并将所有过滤条件传至后端 API，实现了真正的全局搜索。
* **新增“游客”筛选**：在会员等级选择器中加入了 `:value="0"` 的“游客”选项，方便精准查找非付费用户。
* **修复 KPI 统计数据假象**：原 KPI 数据（总用户、商家、会员）仅根据单页 8 条数据计算。现重构为 `fetchStats` 独立发起后端全局聚合请求，结合 `Promise.all` 并发拉取准确指标。

### 2. 前台用户体验优化
* **订单详情页导航统一**：修复了 `OrderDetailView.vue` 缺失全局顶栏组件的问题，重新引入 `<AppHeader />`，与全站风格保持一致。
* **状态机展示联动**：订单状态流转（图标、横幅色块、步骤条）能够准确响应后台状态（包含-1 已取消等异常状态的分支显示）。
