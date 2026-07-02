// 拦截 Canvas 2D getContext 以解决高德地图等第三方组件频繁 getImageData 导致的 Canvas2D willReadFrequently 警告
(function () {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attribs) {
    if (type === "2d") {
      attribs = attribs || {};
      attribs.willReadFrequently = true;
    }
    return originalGetContext.call(this, type, attribs);
  };
})();

import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

Vue.config.productionTip = false
Vue.component('AppFooter', AppFooter)
Vue.component('AppHeader', AppHeader)
Vue.use(ElementUI)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
