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
import { DEFAULT_LNG, DEFAULT_LAT, DEFAULT_CITY } from "@/config/env.js";
import { getMapConfig } from "@/api/modules/config.js";

/** 动态加载高德地图脚本（全局复用，不重复加载） */
function loadAMapScript(key, securityJsCode) {
  return new Promise((resolve, reject) => {
    if (window.AMap) return resolve();
    window._AMapSecurityConfig = { securityJsCode: securityJsCode };
    const existing = document.getElementById("amap-script");
    if (existing) {
      // 脚本已挂载但还在加载中
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("AMap load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "amap-script";
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
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
        const configRes = await getMapConfig();
        const { key, securityJsCode } = configRes.data;
        await loadAMapScript(key, securityJsCode);
      } catch (err) {
        console.error("加载高德地图配置失败:", err);
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
/* ===== 遮罩层 (现代高阶磨砂玻璃背板) ===== */
.map-picker-mask {
  position: fixed;
  z-index: 999999 !important;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn .3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ===== 容器 (流光圆角及立体悬浮阴影) ===== */
.map-picker-container {
  width: 760px;
  max-width: 95vw;
  height: 600px;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22), 0 1px 3px rgba(0, 0, 0, 0.05);
  animation: scaleIn .35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  border: 1px solid rgba(255, 255, 255, 0.8);
}
@keyframes scaleIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* ===== 头部 (精致扁平化设计) ===== */
.map-picker-header {
  padding: 18px 24px;
  border-bottom: 1px solid #f1f3f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, #ffffff, #fcfdfe);
  flex-shrink: 0;
}
.map-picker-header h3 {
  margin: 0;
  font-size: 17px;
  color: #0f172a;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.close-btn {
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: #f8fafc;
  transition: all .25s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.close-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
  transform: rotate(90deg) scale(1.05);
}

/* ===== 搜索栏 (浮动搜索舱) ===== */
.map-picker-search {
  padding: 12px 24px 8px;
  position: relative;
  flex-shrink: 0;
  background: #fff;
  z-index: 10;
}
.search-inner {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 14px;
  transition: all .25s ease;
}
.search-inner:focus-within {
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.05);
}
.search-icon { font-size: 14px; flex-shrink: 0; color: #64748b; }
.search-input {
  flex: 1; border: none; outline: none; background: transparent;
  padding: 11px 10px; font-size: 14px; color: #0f172a;
  font-weight: 500;
}
.search-input::placeholder { color: #94a3b8; }
.search-clear {
  cursor: pointer; color: #94a3b8; font-size: 12px;
  padding: 3px; border-radius: 50%; transition: all .15s;
}
.search-clear:hover { color: #3b82f6; background: #eff6ff; }

/* ===== 搜索智能下拉建议 ===== */
.tips-dropdown {
  position: absolute;
  top: calc(100% - 2px); left: 24px; right: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  max-height: 220px; overflow-y: auto;
  z-index: 300; border: 1px solid #e2e8f0;
  margin-top: 4px;
}
.tip-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 11px 16px; cursor: pointer; transition: all .15s ease;
}
.tip-item:hover { background: #eff6ff; }
.tip-icon { font-size: 14px; flex-shrink: 0; color: #3b82f6; margin-top: 1px; }
.tip-text { display: flex; flex-direction: column; min-width: 0; }
.tip-name {
  font-size: 13.5px; font-weight: 600; color: #0f172a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tip-addr {
  font-size: 11.5px; color: #64748b; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ===== 地图视窗 ===== */
.map-picker-body {
  flex: 1; position: relative; min-height: 0;
  border-top: 1px solid #f1f3f7;
  border-bottom: 1px solid #f1f3f7;
}
.map-el {
  width: 100%; height: 100%;
}
.map-loading {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: #f8fafc; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  color: #64748b; font-size: 14px;
}
.map-loading-spinner {
  width: 32px; height: 32px; border: 3.5px solid #e2e8f0;
  border-top-color: #3b82f6; border-radius: 50%;
  animation: spin .8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 底部确认栏 ===== */
.map-picker-footer {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  flex-shrink: 0;
}
.selected-info {
  flex: 1; display: flex; align-items: center; gap: 10px;
  min-width: 0;
  background: #f8fafc;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.selected-info.placeholder {
  background: #f8fafc;
  border-color: #f1f5f9;
}
.selected-info.placeholder .selected-text { color: #94a3b8; }
.selected-icon { font-size: 15px; flex-shrink: 0; }
.selected-text {
  font-size: 13.5px; color: #1e293b;
  font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.confirm-btn {
  padding: 11px 28px; border-radius: 12px; font-size: 14px; font-weight: 600;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff; cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all .2s cubic-bezier(0.25, 0.8, 0.25, 1);
  flex-shrink: 0;
}
.confirm-btn:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
  background: linear-gradient(135deg, #60a5fa, #2563eb);
}
.confirm-btn:active {
  transform: translateY(0.5px);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}
.confirm-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
</style>
