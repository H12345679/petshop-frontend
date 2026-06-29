<template>
  <div class="map-page-wrapper">
    <AppHeader />

    <div class="map-body">
      <!-- 地图 -->
      <div ref="mapContainer" class="map-container"></div>

      <!-- 加载 -->
      <transition name="fade">
        <div class="loading-overlay" v-if="!mapReady">
          <i class="el-icon-loading"></i>
          <span>正在加载地图...</span>
        </div>
      </transition>

      <!-- 左上按钮 -->
      <div class="top-left-btns">
        <el-tooltip content="回到我的位置" placement="right">
          <el-button icon="el-icon-location-outline" circle @click="locateMe"></el-button>
        </el-tooltip>
        <el-button class="btn-list" @click="$router.push('/shops')">📋 列表模式</el-button>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 搜索 -->
        <div class="search-box">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索地址作为起点..."
            prefix-icon="el-icon-search"
            clearable
            size="medium"
            @input="onSearchInput"
            @clear="clearSearch"
          ></el-input>
          <div class="autocomplete-dropdown" v-if="searchTips.length">
            <div class="tip-item" v-for="(tip, idx) in searchTips" :key="idx" @click="selectSearchTip(tip)">
              <i class="el-icon-location-outline"></i>
              <div class="tip-text">
                <span class="tip-name">{{ tip.name }}</span>
                <span class="tip-addr">{{ tip.district }}{{ tip.address }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 半径 + 统计 -->
        <div class="filter-bar">
          <span class="filter-label">半径 {{ radius }} km</span>
          <el-slider v-model="radius" :min="0.5" :max="20" :step="0.5" @change="onRadiusChange" />
          <div class="shop-count">附近 <strong>{{ shops.length }}</strong> 家宠物店</div>
        </div>

        <!-- 商店列表 -->
        <div class="shop-list" v-if="shops.length">
          <div
            class="shop-item"
            :class="{ highlighted: highlightedShopId === shop.id }"
            v-for="(shop, idx) in shops"
            :key="shop.id"
            @click="previewShop(shop, idx)"
          >
            <div class="shop-rank">{{ idx + 1 }}</div>
            <div class="shop-info">
              <div class="shop-name">{{ shop.name }}</div>
              <div class="shop-addr">{{ shop.address }}</div>
              <div class="shop-dist" v-if="shop.distanceKm != null">{{ shop.distanceKm }} km</div>
            </div>
            <div class="shop-actions">
              <el-button type="primary" size="mini" circle icon="el-icon-guide" @click.stop="goToShop(shop)"></el-button>
            </div>
          </div>
        </div>

        <div class="shop-loading" v-if="loadingShops"><i class="el-icon-loading"></i> 搜索中...</div>
        <div class="shop-empty" v-if="!loadingShops && !shops.length">
          <span v-if="!startPoint">💡 搜索地址或点击定位</span>
          <span v-else>😕 该范围内暂无宠物店</span>
        </div>
      </div>

      <!-- 左侧详情卡片 -->
      <transition name="slide-left">
        <div class="detail-card" v-if="selectedShop">
          <div class="card-head">
            <div class="card-logo-placeholder">🏪</div>
            <div class="card-title">
              <h4>{{ selectedShop.name }}</h4>
              <span class="card-dist" v-if="selectedShop.distanceKm != null">{{ selectedShop.distanceKm }} km</span>
            </div>
            <i class="el-icon-close" @click="selectedShop = null"></i>
          </div>
          <div class="card-body">
            <p v-if="selectedShop.address"><i class="el-icon-location-outline"></i> {{ selectedShop.address }}</p>
            <p v-if="selectedShop.phone"><i class="el-icon-phone-outline"></i> {{ selectedShop.phone }}</p>
          </div>
          <div class="card-actions">
            <el-button type="primary" size="small" class="btn-go" @click="goToShop(selectedShop)">🧭 去这里</el-button>
            <el-button size="small" @click="$router.push('/shop/' + selectedShop.id)">🏪 进入店铺</el-button>
          </div>
        </div>
      </transition>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import { AMAP_CONFIG, DEFAULT_LNG, DEFAULT_LAT, DEFAULT_CITY } from "@/config/env.js";
import { searchNearbyShops } from "@/api/modules/map.js";

function loadAMapScript() {
  return new Promise((resolve, reject) => {
    if (window.AMap) return resolve();
    window._AMapSecurityConfig = { securityJsCode: AMAP_CONFIG.securityJsCode };
    const s = document.createElement("script");
    s.id = "amap-script";
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("fail"));
    document.head.appendChild(s);
  });
}

export default {
  name: "MapView",

  data() {
    return {
      map: null,
      mapReady: false,
      shops: [],
      loadingShops: false,
      _shopMarkers: [],
      startPoint: null,
      _startMarker: null,
      searchKeyword: "",
      searchTips: [],
      _autoComplete: null,
      _searchTimer: null,
      radius: 10,
      _radiusTimer: null,
      selectedShop: null,
      highlightedShopId: null,
    };
  },

  mounted() { this.initMap(); },

  beforeDestroy() {
    clearTimeout(this._searchTimer);
    clearTimeout(this._radiusTimer);
    this.clearShopMarkers();
    if (this._startMarker && this.map) this.map.remove(this._startMarker);
    if (this.map) { this.map.destroy(); this.map = null; }
    const s = document.getElementById("amap-script");
    if (s) s.remove();
  },

  methods: {
    async initMap() {
      try { await loadAMapScript(); } catch { this.$message.error("地图加载失败"); return; }
      const AMap = window.AMap;
      if (!this.$refs.mapContainer) return;

      this.map = new AMap.Map(this.$refs.mapContainer, {
        zoom: 14,
        center: [DEFAULT_LNG, DEFAULT_LAT],
        resizeEnable: true,
      });

      AMap.plugin(["AMap.Scale", "AMap.AutoComplete", "AMap.Geocoder", "AMap.Geolocation", "AMap.Driving"], () => {
        try {
          this.map.addControl(new AMap.Scale({ position: "LB" }));
        } catch (_) {}
        this._autoComplete = new AMap.AutoComplete({ city: DEFAULT_CITY });
        this._autoComplete.on("select", (e) => this.onAutoSelect(e));
        this.mapReady = true;
        this.locateMe();
      });
    },

    locateMe() {
      const AMap = window.AMap;
      const geo = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 6000 });
      geo.getCurrentPosition((status, result) => {
        if (status === "complete" && result.position) {
          this.map.setZoomAndCenter(15, result.position);
          new AMap.Geocoder().getAddress(result.position, (s, r) => {
            if (s === "complete" && r.info === "OK") {
              this.setStartPoint(result.position.lng, result.position.lat);
            }
          });
        }
        this.fetchShops();
      });
    },

    async fetchShops() {
      this.loadingShops = true;
      const lng = this.startPoint ? this.startPoint.lng : DEFAULT_LNG;
      const lat = this.startPoint ? this.startPoint.lat : DEFAULT_LAT;
      try {
        const res = await searchNearbyShops({ longitude: lng, latitude: lat, radius: this.radius, limit: 50 });
        this.shops = res.data || [];
        this.placeShopMarkers();
      } catch { this.shops = []; this.clearShopMarkers(); }
      finally { this.loadingShops = false; }
    },

    placeShopMarkers() {
      const AMap = window.AMap;
      this.clearShopMarkers();
      if (!this.shops.length) return;

      this._shopMarkers = this.shops.map((shop, i) => {
        const marker = new AMap.Marker({
          position: [shop.longitude, shop.latitude],
          // 用简单 content，可靠且兼容
          content: '<div style="width:26px;height:26px;border-radius:50%;background:#5b8def;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer">' + (i + 1) + '</div>',
          offset: new AMap.Pixel(-13, -13),
          zIndex: 100 + i,
        });
        marker.on("click", () => this.previewShop(shop, i));
        marker.addTo(this.map);
        return marker;
      });
      if (this._shopMarkers.length) this.map.setFitView(this._shopMarkers, [40, 380, 60, 40]);
    },

    clearShopMarkers() {
      if (this._shopMarkers) this._shopMarkers.forEach((m) => this.map && this.map.remove(m));
      this._shopMarkers = [];
    },

    setStartPoint(lng, lat) {
      const AMap = window.AMap;
      if (this._startMarker) this.map.remove(this._startMarker);
      this.startPoint = { lng, lat };
      this._startMarker = new AMap.Marker({
        position: [lng, lat],
        content: '<div style="width:20px;height:20px;border-radius:50%;background:#f56c6c;border:3px solid #fff;box-shadow:0 0 10px rgba(245,108,108,.6);animation:marker-pulse 1.5s ease-out infinite"></div>',
        offset: new AMap.Pixel(-10, -10),
        zIndex: 300,
      });
      this.map.add(this._startMarker);
    },

    onSearchInput(val) {
      clearTimeout(this._searchTimer);
      if (!val || !val.trim()) { this.searchTips = []; return; }
      this._searchTimer = setTimeout(() => {
        this._autoComplete.search(val, (status, result) => {
          this.searchTips = (status === "complete" && result.tips) ? result.tips.filter((t) => t.location && t.name) : [];
        });
      }, 300);
    },

    selectSearchTip(tip) {
      this.searchKeyword = tip.name; this.searchTips = [];
      if (tip.location) {
        this.setStartPoint(tip.location.lng, tip.location.lat);
        this.map.setZoomAndCenter(15, tip.location);
        this.fetchShops();
      }
    },

    clearSearch() { this.searchKeyword = ""; this.searchTips = []; },

    onAutoSelect(e) {
      if (e.poi && e.poi.location) {
        this.searchKeyword = e.poi.name; this.searchTips = [];
        this.setStartPoint(e.poi.location.lng, e.poi.location.lat);
        this.map.setZoomAndCenter(15, e.poi.location);
        this.fetchShops();
      }
    },

    previewShop(shop) {
      this.selectedShop = shop;
      this.highlightedShopId = shop.id;
      if (shop.longitude && shop.latitude) this.map.setCenter([shop.longitude, shop.latitude]);
    },

    goToShop(shop) {
      if (!this.startPoint) { this.$message.warning("请先设置起点"); return; }
      const driving = new window.AMap.Driving({ map: this.map, panel: null });
      driving.search([this.startPoint.lng, this.startPoint.lat], [shop.longitude, shop.latitude], (status) => {
        this.$message[status === "complete" ? "success" : "warning"](status === "complete" ? "路线规划完成" : "路线规划失败");
      });
    },

    onRadiusChange() {
      clearTimeout(this._radiusTimer);
      this._radiusTimer = setTimeout(() => this.fetchShops(), 300);
    },
  },
};
</script>

<style scoped>
.map-page-wrapper {
  display: flex; flex-direction: column; height: 100vh; background: #f4f5f7; overflow: hidden;
}
.map-body {
  flex: 1 1 0; position: relative; min-height: 0;
}
.map-container { width: 100%; height: 100%; }

.loading-overlay {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 600;
  background: rgba(255,255,255,.95); border-radius: 12px; padding: 20px 36px;
  box-shadow: 0 4px 20px rgba(0,0,0,.1); display: flex; align-items: center; gap: 12px;
  font-size: 15px; color: #5b8def;
}

/* 左上 */
.top-left-btns {
  position: absolute; top: 12px; left: 12px; z-index: 500; display: flex; gap: 8px;
}
.top-left-btns .el-button {
  background: rgba(255,255,255,.95); backdrop-filter: blur(8px);
  border: 1px solid #e0e3e9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.top-left-btns .el-button:hover { border-color: #5b8def; color: #5b8def; }
.btn-list { padding: 0 14px; height: 38px; font-size: 13px; }

/* 右侧面板 */
.right-panel {
  position: absolute; top: 0; right: 0; z-index: 500;
  width: 360px; height: 100%;
  background: rgba(255,255,255,.97); backdrop-filter: blur(12px);
  box-shadow: -2px 0 20px rgba(0,0,0,.08);
  display: flex; flex-direction: column; overflow: hidden;
}
.search-box { padding: 12px 12px 6px; position: relative; }
.search-box >>> .el-input__inner { border-radius: 10px; }

.autocomplete-dropdown {
  position: absolute; top: 50px; left: 12px; right: 12px;
  background: #fff; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,.12);
  max-height: 220px; overflow-y: auto; z-index: 10;
}
.tip-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; }
.tip-item:hover { background: #f0f4ff; }
.tip-item i { color: #5b8def; flex-shrink: 0; }
.tip-text { display: flex; flex-direction: column; min-width: 0; }
.tip-name { font-size: 13px; font-weight: 600; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tip-addr { font-size: 11px; color: #999; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 筛选 */
.filter-bar { padding: 8px 14px; border-bottom: 1px solid #f0f0f0; }
.filter-label { font-size: 13px; color: #333; font-weight: 500; }
.filter-bar >>> .el-slider { margin: 0 2px; }
.shop-count { font-size: 12px; color: #888; text-align: center; }
.shop-count strong { color: #5b8def; font-size: 15px; }

/* 商店列表 */
.shop-list { flex: 1; overflow-y: auto; }
.shop-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  cursor: pointer; border-bottom: 1px solid #f8f8f8; transition: background .15s;
}
.shop-item:hover { background: #f9fafe; }
.shop-item.highlighted { background: #eef3ff; }
.shop-rank {
  width: 28px; height: 28px; border-radius: 50%; background: #5b8def; color: #fff;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.shop-item.highlighted .shop-rank { background: #f56c6c; }
.shop-info { flex: 1; min-width: 0; }
.shop-name { font-size: 14px; font-weight: 500; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shop-addr { font-size: 12px; color: #999; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shop-dist { font-size: 12px; color: #5b8def; margin-top: 1px; font-weight: 600; }

.shop-loading, .shop-empty { padding: 40px 14px; text-align: center; font-size: 13px; color: #aaa; }

/* 左侧详情卡 */
.detail-card {
  position: absolute; top: 70px; left: 70px; z-index: 500;
  width: 300px; max-width: 35vw; background: #fff; border-radius: 14px;
  box-shadow: 0 8px 36px rgba(0,0,0,.18); padding: 16px;
}
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-logo-placeholder {
  width: 40px; height: 40px; border-radius: 10px; background: #f0f3fa;
  display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
}
.card-title { flex: 1; min-width: 0; }
.card-title h4 { margin: 0 0 2px; font-size: 15px; color: #1a1a2e; }
.card-dist { font-size: 12px; color: #5b8def; font-weight: 600; }
.card-head .el-icon-close { cursor: pointer; color: #bbb; font-size: 18px; flex-shrink: 0; }
.card-head .el-icon-close:hover { color: #333; }
.card-body p { margin: 4px 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px; }
.card-body i { color: #5b8def; font-size: 14px; }
.card-actions { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.btn-go { width: 100%; background: #5b8def; border-color: #5b8def; border-radius: 8px; height: 36px; }
.card-actions .el-button + .el-button { margin-left: 0 !important; }

/* 动画 */
.slide-left-enter-active,.slide-left-leave-active { transition: all .25s ease; }
.slide-left-enter,.slide-left-leave-to { transform: translateX(-20px); opacity: 0; }
.fade-enter-active,.fade-leave-active { transition: opacity .25s; }
.fade-enter,.fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .right-panel { width: 100%; height: 45%; top: auto; bottom: 0; border-radius: 14px 14px 0 0; }
  .detail-card { bottom: 48%; top: auto; left: 8px; width: calc(100% - 16px); max-width: none; }
  .top-left-btns { top: 8px; left: 8px; }
}
</style>
