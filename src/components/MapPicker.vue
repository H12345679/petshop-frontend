<template>
  <div class="map-picker-root">
    <div class="map-picker-mask" v-if="visible" @click.self="close">
      <div class="map-picker-container">
      <!-- 头部 -->
      <div class="map-picker-header">
        <h3>📍 地图选址</h3>
        <span class="close-btn" @click="close">×</span>
      </div>

      <!-- 搜索框 -->
      <div class="map-picker-search">
        <div class="search-inner">
          <span class="search-icon">🔍</span>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="输入地址搜索..."
            @input="onInput"
            @keyup.enter="onEnter"
            @blur="onBlur"
          />
          <span v-if="keyword" class="search-clear" @click="keyword = ''; tips = []">✕</span>
        </div>
        <!-- 搜索建议下拉 -->
        <div class="tips-dropdown" v-if="tips.length">
          <div
            class="tip-item"
            v-for="(tip, i) in tips"
            :key="i"
            @mousedown.prevent="selectTip(tip)"
          >
            <span class="tip-icon">📍</span>
            <div class="tip-text">
              <span class="tip-name">{{ tip.name }}</span>
              <span class="tip-addr">{{ tip.district }}{{ tip.address }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图容器 -->
      <div class="map-picker-body">
        <div ref="mapEl" class="map-el"></div>
        <!-- 加载中遮罩 -->
        <div class="map-loading" v-if="!mapReady">
          <div class="map-loading-spinner"></div>
          <span>地图加载中…</span>
        </div>
      </div>

      <!-- 底部已选地址预览 + 确认 -->
      <div class="map-picker-footer">
        <div class="selected-info" v-if="selectedAddress">
          <span class="selected-icon">✅</span>
          <span class="selected-text">{{ selectedAddress }}</span>
        </div>
        <div class="selected-info placeholder" v-else>
          <span class="selected-icon">💡</span>
          <span class="selected-text">请在地图上点选位置，或搜索地址</span>
        </div>
        <button
          class="confirm-btn"
          :disabled="!selectedData"
          @click="confirm"
        >确认选点</button>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { AMAP_CONFIG, DEFAULT_LNG, DEFAULT_LAT, DEFAULT_CITY } from "@/config/env.js";

/** 动态加载高德地图脚本（全局复用，不重复加载） */
function loadAMapScript() {
  return new Promise((resolve, reject) => {
    if (window.AMap) return resolve();
    window._AMapSecurityConfig = { securityJsCode: AMAP_CONFIG.securityJsCode };
    const existing = document.getElementById("amap-script");
    if (existing) {
      // 脚本已挂载但还在加载中
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("AMap load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "amap-script";
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AMap script load failed"));
    document.head.appendChild(s);
  });
}

export default {
  name: "MapPicker",
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      mapReady: false,
      keyword: "",
      tips: [],
      selectedAddress: "",
      selectedData: null,
    };
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          if (this.$el && this.$el.parentNode !== document.body) {
            document.body.appendChild(this.$el);
          }
          this.initMap();
        });
      } else {
        this.destroyMap();
      }
    }
  },
  created() {
    // 非响应式的地图实例
    this._map = null;
    this._marker = null;
    this._geocoder = null;
    this._autoComplete = null;
    this._searchTimer = null;
  },
  mounted() {
    this.$nextTick(() => {
      if (this.$el && this.$el.parentNode !== document.body) {
        document.body.appendChild(this.$el);
      }
    });
  },
  beforeDestroy() {
    this.destroyMap();
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  },
  methods: {
    /* ===== 地图初始化 ===== */
    async initMap() {
      if (this._map) return; // 已初始化
      try {
        await loadAMapScript();
      } catch {
        return;
      }
      const AMap = window.AMap;
      const el = this.$refs.mapEl;
      if (!el) return;

      this._map = new AMap.Map(el, {
        viewMode: "2D",
        zoom: 13,
        center: [DEFAULT_LNG, DEFAULT_LAT],
        resizeEnable: true,
        mapStyle: "amap://styles/normal",
      });

      AMap.plugin(
        ["AMap.AutoComplete", "AMap.Geocoder", "AMap.PlaceSearch"],
        () => {
          this._autoComplete = new AMap.AutoComplete({ city: DEFAULT_CITY });
          this._geocoder = new AMap.Geocoder({ city: DEFAULT_CITY, radius: 1000 });
          this.mapReady = true;
        }
      );

      // 点击地图选点
      this._map.on("click", (e) => {
        const { lng, lat } = e.lnglat;
        this.placeMarker(lng, lat);
        this.reverseGeocode(lng, lat);
      });
    },

    destroyMap() {
      clearTimeout(this._searchTimer);
      if (this._marker && this._map) {
        this._map.remove(this._marker);
        this._marker = null;
      }
      if (this._map) {
        this._map.destroy();
        this._map = null;
      }
      this.mapReady = false;
      this.keyword = "";
      this.tips = [];
      this.selectedAddress = "";
      this.selectedData = null;
    },

    /* ===== 在地图上放置标记 ===== */
    placeMarker(lng, lat) {
      const AMap = window.AMap;
      if (this._marker && this._map) {
        this._map.remove(this._marker);
      }
      this._marker = new AMap.Marker({
        position: [lng, lat],
        content: `<div style="
          width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:linear-gradient(135deg,#5b8def,#3a6bd5);
          transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
          border:3px solid #fff;box-shadow:0 3px 12px rgba(59,107,213,.5);
        "><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
        offset: new AMap.Pixel(-16, -32),
        zIndex: 200,
      });
      this._map.add(this._marker);
      this._map.setCenter([lng, lat]);
    },

    /* ===== 逆地理编码：坐标→结构化地址 ===== */
    reverseGeocode(lng, lat) {
      if (!this._geocoder) return;
      this._geocoder.getAddress([lng, lat], (status, result) => {
        if (status === "complete" && result.regeocode) {
          const info = result.regeocode;
          const comp = info.addressComponent;
          const province = comp.province || "";
          const city = comp.city || province; // 直辖市 city 可能为空
          const district = comp.district || "";
          // 详细地址 = 街道 + 门牌号 + POI名称
          let detail = (comp.street || "") + (comp.streetNumber || "");
          if (info.pois && info.pois.length) {
            detail = detail ? detail + "（" + info.pois[0].name + "附近）" : info.pois[0].name + "附近";
          }
          if (!detail) {
            detail = comp.township || "";
          }

          this.selectedAddress = info.formattedAddress;
          this.selectedData = { province, city, district, detail, lat, lng };
        } else {
          this.selectedAddress = "";
          this.selectedData = null;
        }
      });
    },

    /* ===== 搜索相关 ===== */
    onInput() {
      clearTimeout(this._searchTimer);
      if (!this.keyword || !this.keyword.trim()) {
        this.tips = [];
        return;
      }
      this._searchTimer = setTimeout(() => {
        if (!this._autoComplete) return;
        this._autoComplete.search(this.keyword, (status, result) => {
          if (status === "complete" && result.tips) {
            this.tips = result.tips.filter(t => t.location && t.name);
          } else {
            this.tips = [];
          }
        });
      }, 300);
    },

    onEnter() {
      if (this.tips.length) {
        this.selectTip(this.tips[0]);
      }
    },

    onBlur() {
      setTimeout(() => { this.tips = []; }, 200);
    },

    selectTip(tip) {
      this.keyword = tip.name;
      this.tips = [];
      if (tip.location) {
        const { lng, lat } = tip.location;
        this.placeMarker(lng, lat);
        this._map.setZoomAndCenter(16, tip.location);
        this.reverseGeocode(lng, lat);
      }
    },

    /* ===== 确认和关闭 ===== */
    confirm() {
      if (this.selectedData) {
        this.$emit("select", { ...this.selectedData });
      }
      this.close();
    },

    close() {
      this.$emit("update:visible", false);
    }
  }
};
</script>

<style scoped>
/* ===== 遮罩层 ===== */
.map-picker-mask {
  position: fixed;
  z-index: 999999 !important;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn .2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ===== 容器 ===== */
.map-picker-container {
  width: 720px;
  max-width: 95vw;
  height: 560px;
  max-height: 90vh;
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
  animation: scaleIn .25s ease;
}
@keyframes scaleIn { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* ===== 头部 ===== */
.map-picker-header {
  padding: 14px 20px;
  border-bottom: 1px solid #eef0f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfd;
  flex-shrink: 0;
}
.map-picker-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1a1a2e;
  font-weight: 700;
}
.close-btn {
  font-size: 24px;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  transition: all .15s;
}
.close-btn:hover { color: #333; background: #f0f2f7; }

/* ===== 搜索框 ===== */
.map-picker-search {
  padding: 10px 16px 6px;
  position: relative;
  flex-shrink: 0;
  background: #fff;
}
.search-inner {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border: 1.5px solid #e8eaf0;
  border-radius: 10px;
  padding: 0 12px;
  transition: all .2s;
}
.search-inner:focus-within {
  border-color: #5b8def;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(91,141,239,.12);
}
.search-icon { font-size: 14px; flex-shrink: 0; }
.search-input {
  flex: 1; border: none; outline: none; background: transparent;
  padding: 10px 8px; font-size: 13px; color: #1a1a2e;
}
.search-input::placeholder { color: #aab0bf; }
.search-clear {
  cursor: pointer; color: #aab0bf; font-size: 13px;
  padding: 2px 4px; border-radius: 50%; transition: color .15s;
}
.search-clear:hover { color: #5b8def; }

/* ===== 搜索建议 ===== */
.tips-dropdown {
  position: absolute;
  top: calc(100% - 2px); left: 16px; right: 16px;
  background: #fff; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  max-height: 200px; overflow-y: auto;
  z-index: 300; border: 1px solid #eef0f5;
}
.tip-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 14px; cursor: pointer; transition: background .12s;
}
.tip-item:hover { background: #f0f4ff; }
.tip-icon { font-size: 13px; flex-shrink: 0; margin-top: 2px; }
.tip-text { display: flex; flex-direction: column; min-width: 0; }
.tip-name {
  font-size: 13px; font-weight: 600; color: #1a1a2e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tip-addr {
  font-size: 11px; color: #9ca0ad; margin-top: 1px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ===== 地图区域 ===== */
.map-picker-body {
  flex: 1; position: relative; min-height: 0;
}
.map-el {
  width: 100%; height: 100%;
}
.map-loading {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: #f5f7fa; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  color: #888; font-size: 13px;
}
.map-loading-spinner {
  width: 28px; height: 28px; border: 3px solid #e0e3ea;
  border-top-color: #5b8def; border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 底部确认栏 ===== */
.map-picker-footer {
  padding: 12px 20px;
  border-top: 1px solid #eef0f5;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fafbfd;
  flex-shrink: 0;
}
.selected-info {
  flex: 1; display: flex; align-items: center; gap: 8px;
  min-width: 0;
}
.selected-info.placeholder .selected-text { color: #aab0bf; }
.selected-icon { font-size: 14px; flex-shrink: 0; }
.selected-text {
  font-size: 13px; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.confirm-btn {
  padding: 9px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
  border: none; background: #5b8def; color: #fff; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.confirm-btn:hover { background: #4a7de0; }
.confirm-btn:disabled { background: #c5d5f5; cursor: not-allowed; }
</style>
