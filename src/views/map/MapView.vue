<template>
  <div class="map-page-wrapper">
    <AppHeader />

    <div class="map-body">
      <!-- ===== 左侧面板 ===== -->
      <div class="left-panel">
        <!-- 搜索框 -->
        <div class="search-box">
          <div class="search-inner">
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="输入地址以设置起始位置..."
              @input="onSearchInput"
              @keyup.enter="triggerSearch"
              @blur="onSearchBlur"
              id="map-search-input"
            />
            <span v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</span>
          </div>
          <!-- 自动补全下拉 -->
          <div class="autocomplete-dropdown" v-if="searchTips.length">
            <div
              class="tip-item"
              v-for="(tip, idx) in searchTips"
              :key="idx"
              @mousedown.prevent="selectSearchTip(tip)"
            >
              <span class="tip-icon">📍</span>
              <div class="tip-text">
                <span class="tip-name">{{ tip.name }}</span>
                <span class="tip-addr">{{ tip.district }}{{ tip.address }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 半径筛选条（搜索模式） -->
        <div class="filter-bar" v-if="searchMode">
          <div class="filter-row">
            <span class="filter-label">搜索半径</span>
            <div class="radius-tags">
              <span
                v-for="item in [{val: 3, label: '3km'}, {val: 5, label: '5km'}, {val: 10, label: '10km'}, {val: 20, label: '20km'}, {val: 1000, label: '>20km'}]"
                :key="item.val"
                class="radius-tag"
                :class="{ active: radius === item.val }"
                @click="setRadius(item.val)"
              >{{ item.label }}</span>
            </div>
            <span class="relocate-btn" @click="locateMe">📍 重新定位</span>
          </div>
        </div>

        <!-- 统计 & 模式提示 -->
        <div class="panel-status">
          <span v-if="loadingShops" class="status-loading">
            <span class="spin">⟳</span> 搜索中...
          </span>
          <template v-else>
            <span v-if="!searchMode && !locationFailed" class="status-text">
              📍 最近 <strong>{{ shops.length }}</strong> 家宠物店
            </span>
            <span v-else-if="searchMode" class="status-text">
              附近找到 <strong>{{ shops.length }}</strong> 家营业中门店
            </span>
            <span v-else-if="locationFailed" class="status-hint">
              💡 定位失败，请手动修改地址
            </span>
          </template>
          <span v-if="!searchMode && !loadingShops" class="list-mode-btn" @click="$router.push('/shops')">
            📋 列表模式
          </span>
        </div>

        <!-- 门店列表 -->
        <div class="shop-list" v-if="shops.length">
          <div
            class="shop-item"
            :class="{ highlighted: highlightedShopId === shop.id }"
            v-for="(shop, idx) in shops"
            :key="shop.id"
            @click="previewShop(shop, idx)"
            :id="'shop-item-' + shop.id"
          >
            <div class="shop-rank" :class="{ active: highlightedShopId === shop.id }">
              {{ idx + 1 }}
            </div>
            <div class="shop-info">
              <div class="shop-name">{{ shop.name }}</div>
              <div class="shop-addr">{{ shop.address }}</div>
              <div class="shop-meta">
                <span class="shop-dist" v-if="shop.distanceKm != null">
                  📏 {{ shop.distanceKm }} km
                </span>
                <span class="shop-status open">营业中</span>
              </div>
            </div>
            <div class="shop-actions">
              <button class="action-btn nav-btn" title="导航" @click.stop="goToShop(shop)">🧭</button>
              <button class="action-btn enter-btn" title="进入店铺" @click.stop="$router.push('/shop/' + shop.id)">🏪</button>
            </div>
          </div>
        </div>

        <!-- 空态 -->
        <div class="shop-empty" v-if="!loadingShops && !shops.length">
          <div class="empty-icon">🗺️</div>
          <div v-if="locating" class="empty-text">正在获取您的位置...</div>
          <div v-else-if="locationFailed" class="empty-text">
            定位失败<br />
            <span class="empty-hint">请在搜索框输入地址</span>
          </div>
          <div v-else class="empty-text">
            该范围内暂无宠物店<br />
            <span class="empty-hint" v-if="radius < 1000">试试扩大搜索半径</span>
            <span class="empty-hint" v-else>全城范围内暂无门店，建议尝试搜索其他城市</span>
          </div>
        </div>
      </div>

      <!-- ===== 地图区域 ===== -->
      <div class="map-area">
        <div ref="mapContainer" class="map-container"></div>

        <!-- 地图加载遮罩 -->
        <transition name="fade">
          <div class="loading-overlay" v-if="!mapReady">
            <div class="loading-spinner"></div>
            <span>正在加载地图...</span>
          </div>
        </transition>

        <!-- 右上角快捷按钮 -->
        <div class="map-fab-group">
          <button class="fab-btn" title="回到我的位置" @click="locateMe" id="fab-locate">
            📍
          </button>
          <button class="fab-btn" title="切换到列表" @click="$router.push('/shops')" id="fab-list">
            📋
          </button>
        </div>

        <!-- 选中门店底部卡片 -->
        <transition name="slide-up">
          <div class="detail-card" v-if="selectedShop" id="map-detail-card">
            <button class="card-close" @click="selectedShop = null; map && map.clearInfoWindow()">✕</button>
            <div class="card-head">
              <div class="card-logo">🏪</div>
              <div class="card-title">
                <h4>{{ selectedShop.name }}</h4>
                <span class="card-status open">营业中</span>
              </div>
              <div class="card-dist" v-if="selectedShop.distanceKm != null">
                {{ selectedShop.distanceKm }} km
              </div>
            </div>
            <div class="card-body">
              <p v-if="selectedShop.address">
                <span class="card-icon">📍</span> {{ selectedShop.address }}
              </p>
              <p v-if="selectedShop.phone">
                <span class="card-icon">📞</span> {{ selectedShop.phone }}
              </p>
            </div>
            <div class="card-actions">
              <button class="card-btn primary" @click="goToShop(selectedShop)">🧭 到这里去</button>
              <button class="card-btn" @click="$router.push('/shop/' + selectedShop.id)">🏪 进店逛逛</button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { DEFAULT_LNG, DEFAULT_LAT, DEFAULT_CITY } from "@/config/env.js";
import { searchNearbyShops, getShopLocation } from "@/api/modules/map.js";
import { getMapConfig } from "@/api/modules/config.js";

/** 动态插入高德地图脚本（避免重复插入） */
function loadAMapScript(key, securityJsCode) {
  return new Promise((resolve, reject) => {
    if (window.AMap) return resolve();
    window._AMapSecurityConfig = { securityJsCode: securityJsCode };
    const s = document.createElement("script");
    s.id = "amap-script";
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AMap script load failed"));
    document.head.appendChild(s);
  });
}

export default {
  name: "MapView",

  data() {
    return {
      mapReady: false,
      // 门店数据
      shops: [],
      loadingShops: false,
      // 当前起点
      startPoint: null,
      // 搜索
      searchKeyword: "",
      searchTips: [],
      // 半径（搜索模式）
      radius: 5,
      // 状态标记
      searchMode: false,   // false=初始最近5家模式 true=搜索/定位后的半径模式
      locating: true,      // 正在定位中
      locationFailed: false,
      // 选中店铺
      selectedShop: null,
      highlightedShopId: null,
    };
  },

  created() {
    // 将地图及相关覆盖物实例定义在非响应式空间中，避免 Vue 深度绑定 Object.defineProperty 导致极度卡顿
    this.map = null;
    this._shopMarkers = [];
    this._infoWindow = null;
    this._startMarker = null;
    this._drivingInstance = null;
    this._autoComplete = null;
    this._searchTimer = null;
  },

  mounted() {
    this.initMap();
  },

  beforeDestroy() {
    clearTimeout(this._searchTimer);
    try {
      this.clearShopMarkers();
      if (this._startMarker && this.map) this.map.remove(this._startMarker);
      if (this._drivingInstance) { this._drivingInstance.clear(); }
      if (this.map) { this.map.destroy(); this.map = null; }
    } catch (e) {
      console.warn("清理地图实例时出现异常:", e);
    }
  },

  methods: {
    /* ==================== 地图初始化 ==================== */
    async initMap() {
      try {
        const configRes = await getMapConfig();
        const { key, securityJsCode } = configRes.data;
        await loadAMapScript(key, securityJsCode);
      } catch (err) {
        console.error("加载高德地图配置失败:", err);
        this.$message && this.$message.error("地图加载失败，请刷新重试");
        return;
      }
      const AMap = window.AMap;
      if (!this.$refs.mapContainer) return;

      this.map = new AMap.Map(this.$refs.mapContainer, {
        viewMode: "2D", // 开启 2D 视图模式，显著提升渲染渲染与拖动帧率
        animateEnable: true,
        zoom: 13,
        center: [DEFAULT_LNG, DEFAULT_LAT],
        resizeEnable: true,
        mapStyle: "amap://styles/normal",
      });

      // 预加载所需插件
      AMap.plugin(
        ["AMap.Scale", "AMap.AutoComplete", "AMap.Geocoder", "AMap.Geolocation", "AMap.Driving"],
        () => {
          try { this.map.addControl(new AMap.Scale({ position: "LB" })); } catch (_) {}
          // 搜索自动补全（城市范围）
          this._autoComplete = new AMap.AutoComplete({ city: DEFAULT_CITY });
          // 创建信息窗体（单例复用）
          this._infoWindow = new AMap.InfoWindow({
            isCustom: true,
            offset: new AMap.Pixel(0, -40),
            closeWhenClickMap: true,
          });
          this.mapReady = true;
          // 地图加载完成后：自动定位并显示最近5家
          this.locateAndLoadNearest();
        }
      );
    },

    /* ==================== 定位并加载最近5家（初始模式） ==================== */
    locateAndLoadNearest() {
      const AMap = window.AMap;
      this.locating = true;
      this.locationFailed = false;
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        getCityWhenFail: true,
      });
      geo.getCurrentPosition(async (status, result) => {
        if (!this.map) return;
        this.locating = false;
        let userLng = DEFAULT_LNG;
        let userLat = DEFAULT_LAT;

        if (status === "complete" && result.position) {
          userLng = result.position.lng;
          userLat = result.position.lat;
          this.map.setZoomAndCenter(14, result.position);
          this.setStartMarker(userLng, userLat);
          this.startPoint = { lng: userLng, lat: userLat };
        } else {
          // 定位失败：使用默认城市中心，同时初始化起点，确保距离切换正常工作
          this.locationFailed = true;
          this.map.setZoomAndCenter(14, [DEFAULT_LNG, DEFAULT_LAT]);
          this.setStartMarker(DEFAULT_LNG, DEFAULT_LAT, "默认位置（杭州）");
          this.startPoint = { lng: DEFAULT_LNG, lat: DEFAULT_LAT };
        }

        const targetShopId = this.$route.query.shopId;
        if (targetShopId) {
          await this.loadTargetShopAndNavigate(targetShopId, userLng, userLat);
        } else {
          // 初始模式：仅加载最近5家，不带半径限制（后端用 limit:5）
          this.fetchShops({ longitude: userLng, latitude: userLat, limit: 5 }, false);
        }
      });
    },

    /* ==================== 重新定位（用户手动触发） ==================== */
    locateMe() {
      const AMap = window.AMap;
      this.locating = true;
      this.locationFailed = false;
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        getCityWhenFail: true,
      });
      geo.getCurrentPosition((status, result) => {
        if (!this.map) return;
        this.locating = false;
        if (status === "complete" && result.position) {
          const { lng, lat } = result.position;
          this.map.setZoomAndCenter(14, result.position);
          this.setStartMarker(lng, lat);
          this.startPoint = { lng, lat };
          if (this.searchMode) {
            // 已在搜索模式：按当前半径重新查
            this.fetchShops({ longitude: lng, latitude: lat, radius: this.radius, limit: 50 }, true);
          } else {
            // 初始模式：加载最近5家
            this.fetchShops({ longitude: lng, latitude: lat, limit: 5 }, false);
          }
        } else {
          this.locationFailed = true;
          this.map.setZoomAndCenter(14, [DEFAULT_LNG, DEFAULT_LAT]);
          this.setStartMarker(DEFAULT_LNG, DEFAULT_LAT, "默认位置（杭州）");
          this.startPoint = { lng: DEFAULT_LNG, lat: DEFAULT_LAT };
          if (this.searchMode) {
            this.fetchShops({ longitude: DEFAULT_LNG, latitude: DEFAULT_LAT, radius: this.radius, limit: 50 }, true);
          } else {
            this.fetchShops({ longitude: DEFAULT_LNG, latitude: DEFAULT_LAT, limit: 5 }, false);
          }
          this.$message && this.$message.warning("自动定位失败，已切换至默认城市中心");
        }
      });
    },

    /* ==================== 加载目标商店并自动导航 ==================== */
    async loadTargetShopAndNavigate(shopId, userLng, userLat) {
      this.loadingShops = true;
      this.selectedShop = null;
      if (this._drivingInstance) { try { this._drivingInstance.clear(); } catch (_) {} }
      if (this._infoWindow) this.map && this.map.clearInfoWindow();
      try {
        const res = await getShopLocation(shopId);
        if (res.data) {
          const shop = res.data;
          // 计算用户当前位置到店铺的直线距离 (公里数)
          const AMap = window.AMap;
          const p1 = new AMap.LngLat(userLng, userLat);
          const p2 = new AMap.LngLat(shop.longitude, shop.latitude);
          const distanceMeters = p1.distance(p2);
          shop.distanceKm = (distanceMeters / 1000).toFixed(1);

          this.shops = [shop];
          this.searchMode = true; // 开启半径/搜索模式状态
          this.placeShopMarkers();
          this.previewShop(shop, 0);

          // 自动启动导航路线规划
          this.goToShop(shop);
        }
      } catch (err) {
        console.error("加载目标店铺位置及导航路线失败:", err);
        this.$message && this.$message.error("加载目标店铺失败");
        this.shops = [];
        this.clearShopMarkers();
      } finally {
        this.loadingShops = false;
      }
    },

    /* ==================== 拉取门店数据 ==================== */
    async fetchShops(params, isSearchMode) {
      this.loadingShops = true;
      this.selectedShop = null;
      if (this._drivingInstance) { try { this._drivingInstance.clear(); } catch (_) {} }
      if (this._infoWindow) this.map && this.map.clearInfoWindow();
      try {
        const res = await searchNearbyShops(params);
        if (!this.map) return;
        let list = res.data || [];
        // 如果是搜索/半径筛选模式，严格过滤掉距离大于当前搜索半径的门店
        if (isSearchMode && params.radius != null) {
          list = list.filter(shop => shop.distanceKm == null || Number(shop.distanceKm) <= Number(params.radius));
        }
        this.shops = list;
        this.searchMode = isSearchMode;
        this.placeShopMarkers();
      } catch {
        this.shops = [];
        this.clearShopMarkers();
      } finally {
        this.loadingShops = false;
      }
    },

    /* ==================== 地图标注 ==================== */
    placeShopMarkers() {
      const AMap = window.AMap;
      this.clearShopMarkers();
      if (!this.shops.length) return;

      this._shopMarkers = this.shops.map((shop, i) => {
        const isTop = i === 0; // 最近的一家突出显示
        const color = isTop ? "#ff6b35" : "#5b8def";
        const size = isTop ? 32 : 26;
        const marker = new AMap.Marker({
          position: [shop.longitude, shop.latitude],
          content: `<div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:${color};
            color:#fff;
            font-size:${isTop ? 14 : 12}px;
            font-weight:700;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,.3);
            cursor:pointer;
            transition:transform .15s;
          ">${i + 1}</div>`,
          offset: new AMap.Pixel(-(size / 2), -(size / 2)),
          zIndex: 100 + (this.shops.length - i),
        });
        marker.on("click", () => this.previewShop(shop, i));
        marker.addTo(this.map);
        return marker;
      });

      // 自动调整视野包含所有标注（留出左侧面板空间）
      if (this._shopMarkers.length) {
        this.map.setFitView(this._shopMarkers, false, [60, 60, 360, 60]);
      }
    },

    clearShopMarkers() {
      if (this._shopMarkers) {
        this._shopMarkers.forEach((m) => this.map && this.map.remove(m));
      }
      this._shopMarkers = [];
    },

    /* ==================== 用户位置标注（红色可拖拽标签） ==================== */
    setStartMarker(lng, lat, titleText) {
      const AMap = window.AMap;
      if (this._startMarker && this.map) this.map.remove(this._startMarker);
      this.startPoint = { lng, lat };

      if (titleText) {
        this.searchKeyword = titleText;
      } else {
        const geocoder = new AMap.Geocoder({ city: DEFAULT_CITY });
        geocoder.getAddress([lng, lat], (status, result) => {
          if (!this.map) return;
          if (status === "complete" && result.regeocode) {
            this.searchKeyword = result.regeocode.formattedAddress;
          }
        });
      }

      this._startMarker = new AMap.Marker({
        position: [lng, lat],
        draggable: true, // 允许拖拽修改起点
        cursor: "move",
        content: `<div class="start-drag-tag" title="按住可拖动更改起点地址">
          <div class="pin-3d">
            <span class="pin-icon">📍</span>
          </div>
          <div class="tag-pulse" style="margin-top: 5px;"></div>
        </div>`,
        offset: new AMap.Pixel(0, 10),
        zIndex: 500,
      });

      // 监听拖拽结束事件
      this._startMarker.on("dragend", (e) => {
        const newLng = e.lnglat.lng;
        const newLat = e.lnglat.lat;
        this.startPoint = { lng: newLng, lat: newLat };

        const geocoder = new AMap.Geocoder({ city: DEFAULT_CITY });
        geocoder.getAddress([newLng, newLat], (status, result) => {
          if (!this.map) return;
          let newAddr = "自定义位置";
          if (status === "complete" && result.regeocode) {
            newAddr = result.regeocode.formattedAddress;
            this.searchKeyword = newAddr;
          }
          this.$message && this.$message.success("起点已更新至：" + newAddr);
          this.setStartMarker(newLng, newLat, newAddr);
          this.fetchShops({ longitude: newLng, latitude: newLat, radius: this.radius, limit: 50 }, true);
        });
      });

      if (this.map) {
        this.map.add(this._startMarker);
      }
    },

    /* ==================== 点击标注 / 列表：弹出预览 ==================== */
    previewShop(shop, idx) {
      this.selectedShop = shop;
      this.highlightedShopId = shop.id;
      if (shop.longitude && shop.latitude) {
        this.map.setCenter([shop.longitude, shop.latitude]);
      }
      // 同步滚动左侧列表
      this.$nextTick(() => {
        const el = document.getElementById("shop-item-" + shop.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },

    /* ==================== 导航 ==================== */
    goToShop(shop) {
      if (!this.startPoint) {
        this.$message && this.$message.warning("请先设置起点（搜索地址或点击定位）");
        return;
      }
      const AMap = window.AMap;
      if (this._drivingInstance) { try { this._drivingInstance.clear(); } catch (_) {} }
      this._drivingInstance = new AMap.Driving({ map: this.map, panel: null });
      this._drivingInstance.search(
        [this.startPoint.lng, this.startPoint.lat],
        [shop.longitude, shop.latitude],
        (status) => {
          if (status === "complete") {
            this.$message && this.$message.success("路线规划完成");
          } else {
            this.$message && this.$message.warning("路线规划失败，请重试");
          }
        }
      );
    },

    /* ==================== 半径切换 ==================== */
    setRadius(r) {
      this.radius = r;
      if (this.startPoint) {
        this.fetchShops(
          { longitude: this.startPoint.lng, latitude: this.startPoint.lat, radius: r, limit: 50 },
          true
        );
      }
    },

    /* ==================== 搜索输入 ==================== */
    onSearchInput(e) {
      const val = e.target ? e.target.value : e;
      this.searchKeyword = val;
      clearTimeout(this._searchTimer);
      if (!val || !val.trim()) {
        this.searchTips = [];
        return;
      }
      this._searchTimer = setTimeout(() => {
        if (!this._autoComplete) return;
        this._autoComplete.search(val, (status, result) => {
          if (!this.map) return;
          if (status === "complete" && result.tips) {
            this.searchTips = result.tips.filter((t) => t.location && t.name);
          } else {
            this.searchTips = [];
          }
        });
      }, 300);
    },

    triggerSearch() {
      if (this.searchTips.length) {
        this.selectSearchTip(this.searchTips[0]);
      } else if (this.searchKeyword && this.searchKeyword.trim()) {
        const AMap = window.AMap;
        const geocoder = new AMap.Geocoder({ city: DEFAULT_CITY });
        geocoder.getLocation(this.searchKeyword, (status, result) => {
          if (!this.map) return;
          if (status === "complete" && result.geocodes.length) {
            const location = result.geocodes[0].location;
            this.map.setZoomAndCenter(14, location);
            this.setStartMarker(location.lng, location.lat);
            this.startPoint = { lng: location.lng, lat: location.lat };
            this.fetchShops({ longitude: location.lng, latitude: location.lat, radius: this.radius, limit: 50 }, true);
          } else {
            this.$message && this.$message.error("无法解析该地址，请输入更精确的地点！");
          }
        });
      }
    },

    onSearchBlur() {
      // 延迟关闭，避免 mousedown 未触发
      setTimeout(() => { this.searchTips = []; }, 200);
    },

    selectSearchTip(tip) {
      this.searchKeyword = tip.name;
      this.searchTips = [];
      if (tip.location) {
        if (!this.map) return;
        const { lng, lat } = tip.location;
        this.setStartMarker(lng, lat);
        this.map.setZoomAndCenter(14, tip.location);
        // 选择了搜索结果：进入搜索模式，按半径拉取
        this.fetchShops({ longitude: lng, latitude: lat, radius: this.radius, limit: 50 }, true);
      }
    },

    clearSearch() {
      this.searchKeyword = "";
      this.searchTips = [];
    },
  },
};
</script>

<style scoped>
/* ============================================================
   全局布局
   ============================================================ */
.map-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f4f5f7;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.map-body {
  flex: 1 1 0;
  display: flex;
  min-height: 0;
  position: relative;
}

/* ============================================================
   左侧面板
   ============================================================ */
.left-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.08);
  z-index: 10;
  overflow: hidden;
  border-right: 1px solid #eef0f5;
}

/* -- 搜索框 -- */
.search-box {
  padding: 14px 14px 8px;
  position: relative;
  flex-shrink: 0;
}

.search-inner {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border: 1.5px solid #e8eaf0;
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.2s;
}
.search-inner:focus-within {
  border-color: #5b8def;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.12);
}
.search-icon { font-size: 15px; flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 11px 8px;
  font-size: 14px;
  color: #1a1a2e;
}
.search-input::placeholder { color: #aab0bf; }
.search-clear {
  cursor: pointer;
  color: #aab0bf;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 50%;
  transition: color 0.15s;
  flex-shrink: 0;
}
.search-clear:hover { color: #5b8def; }

/* -- 自动补全下拉 -- */
.autocomplete-dropdown {
  position: absolute;
  top: calc(100% - 4px);
  left: 14px;
  right: 14px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 220px;
  overflow-y: auto;
  z-index: 200;
  border: 1px solid #eef0f5;
}
.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.12s;
}
.tip-item:hover { background: #f0f4ff; }
.tip-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.tip-text { display: flex; flex-direction: column; min-width: 0; }
.tip-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tip-addr {
  font-size: 11px;
  color: #9ca0ad;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- 半径筛选 -- */
.filter-bar {
  padding: 8px 14px 10px;
  border-bottom: 1px solid #f0f2f7;
  flex-shrink: 0;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-label { font-size: 12px; color: #888; font-weight: 500; }
.radius-tags { display: flex; gap: 6px; }
.radius-tag {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1.5px solid #e0e3ea;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.radius-tag:hover { border-color: #5b8def; color: #5b8def; }
.radius-tag.active {
  background: #5b8def;
  border-color: #5b8def;
  color: #fff;
}
.relocate-btn {
  margin-left: auto;
  font-size: 12px;
  color: #5b8def;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
.relocate-btn:hover { opacity: 0.75; }

/* -- 状态栏 -- */
.panel-status {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid #f0f2f7;
  flex-shrink: 0;
  min-height: 38px;
}
.status-text { font-size: 12px; color: #888; flex: 1; }
.status-text strong { color: #5b8def; font-size: 15px; }
.status-loading { font-size: 12px; color: #aab; flex: 1; display: flex; align-items: center; gap: 5px; }
.status-hint { font-size: 12px; color: #ffa940; flex: 1; }
.list-mode-btn {
  font-size: 12px;
  color: #5b8def;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
.list-mode-btn:hover { opacity: 0.75; }

/* 拖拽起点标签样式 (立体3D红标) */
.start-drag-tag {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: move;
  user-select: none;
  z-index: 10;
}
.pin-3d {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #ff7878 0%, #e63946 100%);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 3px 3px 12px rgba(230, 57, 70, 0.6), inset 2px 2px 5px rgba(255, 255, 255, 0.5), inset -2px -2px 5px rgba(0, 0, 0, 0.2);
  border: 3px solid #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}
.start-drag-tag:hover .pin-3d {
  transform: rotate(-45deg) scale(1.08);
  box-shadow: 5px 5px 16px rgba(230, 57, 70, 0.8), inset 2px 2px 5px rgba(255, 255, 255, 0.5), inset -2px -2px 5px rgba(0, 0, 0, 0.2);
}
.pin-icon {
  transform: rotate(45deg);
  font-size: 22px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  margin-left: 2px;
  margin-top: 2px;
}
.tag-pulse {
  width: 20px;
  height: 20px;
  background: #e63946;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(230, 57, 70, 0.8);
  animation: map-pulse 1.5s ease-out infinite;
}

/* -- 门店列表 -- */
.shop-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.shop-list::-webkit-scrollbar { width: 4px; }
.shop-list::-webkit-scrollbar-thumb { background: #e0e3ea; border-radius: 2px; }

.shop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fc;
  transition: background 0.12s;
  position: relative;
}
.shop-item:hover { background: #f9fafe; }
.shop-item.highlighted { background: #eef3ff; }
.shop-item.highlighted::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #5b8def;
  border-radius: 0 2px 2px 0;
}

.shop-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #5b8def;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.shop-rank.active { background: #ff6b35; }
/* 最近一家橙色标注 */
.shop-item:first-child .shop-rank { background: #ff6b35; }

.shop-info { flex: 1; min-width: 0; }
.shop-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shop-addr {
  font-size: 12px;
  color: #9ca0ad;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shop-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.shop-dist { font-size: 12px; color: #5b8def; font-weight: 600; }
.shop-status { font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
.shop-status.open { background: #f0fff4; color: #52c41a; }

.shop-actions { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #e8eaf0;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  padding: 0;
}
.action-btn:hover { border-color: #5b8def; background: #f0f4ff; transform: scale(1.05); }
.nav-btn:hover { border-color: #5b8def; }
.enter-btn:hover { border-color: #52c41a; background: #f0fff4; }

/* -- 空态 -- */
.shop-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #bcc0cc;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-text { font-size: 14px; text-align: center; line-height: 1.7; color: #aab0bf; }
.empty-hint { font-size: 12px; color: #c0c4cc; }

/* ============================================================
   地图区域
   ============================================================ */
.map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.map-container { width: 100%; height: 100%; }

/* -- 加载遮罩 -- */
.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 600;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  padding: 20px 36px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 15px;
  color: #5b8def;
  font-weight: 500;
}
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid #d0ddf8;
  border-top-color: #5b8def;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* -- 地图悬浮按钮 -- */
.map-fab-group {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fab-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}
.fab-btn:hover {
  background: #5b8def;
  border-color: #5b8def;
  transform: scale(1.06);
  box-shadow: 0 6px 20px rgba(91, 141, 239, 0.3);
}

/* -- 底部详情卡 -- */
.detail-card {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 340px;
  max-width: calc(100% - 32px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  padding: 18px;
  z-index: 500;
}
.card-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  color: #bcc0cc;
  font-size: 16px;
  padding: 2px 4px;
  border-radius: 50%;
  transition: color 0.15s;
}
.card-close:hover { color: #333; }
.card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.card-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f4ff 0%, #e6edff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.card-title { flex: 1; min-width: 0; }
.card-title h4 { margin: 0 0 4px; font-size: 16px; color: #1a1a2e; font-weight: 700; }
.card-status { font-size: 11px; padding: 1px 8px; border-radius: 4px; font-weight: 600; }
.card-status.open { background: #f0fff4; color: #52c41a; }
.card-dist { font-size: 14px; color: #5b8def; font-weight: 700; flex-shrink: 0; }
.card-body p {
  margin: 4px 0;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-icon { font-size: 14px; }
.card-actions { display: flex; gap: 8px; margin-top: 14px; }
.card-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  border: 1.5px solid #e8eaf0;
  background: #f5f7fa;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #444;
  transition: all 0.15s;
}
.card-btn:hover { border-color: #5b8def; background: #f0f4ff; color: #5b8def; }
.card-btn.primary {
  background: linear-gradient(135deg, #5b8def 0%, #3d6dd8 100%);
  border-color: transparent;
  color: #fff;
}
.card-btn.primary:hover { opacity: 0.9; box-shadow: 0 4px 14px rgba(91, 141, 239, 0.35); }

/* ============================================================
   动画
   ============================================================ */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes map-pulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.5); }
  70% { box-shadow: 0 0 0 12px rgba(245, 108, 108, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0); }
}
.spin { display: inline-block; animation: spin 1s linear infinite; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-up-enter, .slide-up-leave-to { transform: translateX(-50%) translateY(20px); opacity: 0; }

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 768px) {
  .map-body { flex-direction: column; }
  .left-panel {
    width: 100%;
    height: 45%;
    flex-shrink: 0;
    border-right: none;
    border-bottom: 1px solid #eef0f5;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }
  .map-area { flex: 1; }
  .detail-card { bottom: 12px; width: calc(100% - 24px); left: 12px; transform: none; }
  .slide-up-enter, .slide-up-leave-to { transform: translateY(20px); opacity: 0; }
}
</style>
