<template>
  <div class="map-picker-mask" v-if="visible">
    <div class="map-picker-container">
      <div class="map-picker-header">
        <h3>在地图上点击选点</h3>
        <span class="close-btn" @click="close">×</span>
      </div>
      <div class="map-picker-body">
        <iframe 
          id="mapPage" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          src="https://apis.map.qq.com/tools/locpicker?search=1&type=1&key=OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77&referer=petshop">
        </iframe>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "MapPicker",
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  mounted() {
    window.addEventListener('message', this.handleMessage, false);
  },
  beforeDestroy() {
    window.removeEventListener('message', this.handleMessage, false);
  },
  methods: {
    handleMessage(event) {
      const loc = event.data;
      if (loc && loc.module === 'locationPicker') {
        this.$emit('select', {
          lat: loc.latlng.lat,
          lng: loc.latlng.lng,
          address: loc.poiaddress,
          city: loc.cityname
        });
      }
    },
    close() {
      this.$emit('update:visible', false);
    }
  }
}
</script>

<style scoped>
.map-picker-mask {
  position: fixed;
  z-index: 2000;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.map-picker-container {
  width: 800px;
  max-width: 95%;
  height: 600px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.2);
}
.map-picker-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
}
.map-picker-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}
.close-btn {
  font-size: 24px;
  color: #888;
  cursor: pointer;
  line-height: 1;
}
.close-btn:hover {
  color: #333;
}
.map-picker-body {
  flex: 1;
  width: 100%;
  height: 100%;
}
</style>
