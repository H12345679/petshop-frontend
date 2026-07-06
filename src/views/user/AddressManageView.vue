<template>
  <div id="address-manage-page">
    <AppHeader />
    <div class="addr-container">
      <div class="page-top">
        <h1 class="page-title">📍 收货地址</h1>
        <button class="btn btn-primary" @click="openAdd">+ 新增地址</button>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <!-- 空状态 -->
      <div v-if="!loading && addresses.length === 0" class="empty-state">
        <p>还没有收货地址</p>
        <button class="btn btn-primary" @click="openAdd">+ 添加地址</button>
      </div>

      <!-- 地址列表 -->
      <div v-if="!loading" class="address-list">
        <div v-for="addr in addresses" :key="addr.id" class="address-card">
          <div class="addr-left">
            <div class="addr-top">
              <span class="addr-receiver">{{ addr.receiver }}</span>
              <span class="addr-phone">{{ addr.phone }}</span>
              <span v-if="addr.isDefault === 1" class="default-tag">默认</span>
            </div>
            <div class="addr-detail">
              {{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}
            </div>
          </div>
          <div class="addr-actions">
            <button
              v-if="addr.isDefault !== 1"
              class="btn btn-text"
              @click="setDefault(addr)"
            >设为默认</button>
            <button class="btn btn-text" @click="openEdit(addr)">编辑</button>
            <button class="btn btn-text btn-danger-text" @click="confirmDelete(addr)">删除</button>
          </div>
        </div>
      </div>

      <!-- 新增/编辑弹窗 -->
      <el-dialog :title="dialogTitle" :visible.sync="showDialog" width="520px">
        <el-form :model="form" label-width="80px" size="small">
          <el-form-item label="收货人" required>
            <el-input v-model="form.receiver" placeholder="请输入收货人姓名" />
          </el-form-item>
          <el-form-item label="手机号" required>
            <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="所在地区" required>
            <div style="display: flex; gap: 8px;">
              <el-cascader
                v-model="regionCode"
                :options="regionData"
                :props="{ label: 'label', value: 'value', children: 'children' }"
                placeholder="请选择省/市/区"
                @change="handleRegionChange"
                style="flex: 1;"
                clearable
              />
              <el-button type="primary" plain @click="mapPickerVisible = true" title="在地图上点选自动填充">📍 地图选点</el-button>
            </div>
          </el-form-item>
          <el-form-item label="详细地址" required>
            <el-input v-model="form.detail" placeholder="街道、门牌号等" rows="2" type="textarea" />
          </el-form-item>
          <el-form-item label=" ">
            <el-checkbox v-model="form.isDefault">设为默认地址</el-checkbox>
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button @click="showDialog = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ editing ? '保存修改' : '保存' }}
          </el-button>
        </span>
      </el-dialog>

      <!-- 地图选点弹窗 -->
      <MapPicker :visible.sync="mapPickerVisible" @select="onMapSelect" />
    </div>
    <AppFooter />
  </div>
</template>

<script>
import { addressList, addAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/api/modules/address.js";
import { regionData, codeToText } from "element-china-area-data";
import MapPicker from "@/components/MapPicker.vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const EMPTY_FORM = {
  receiver: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
  longitude: null,
  latitude: null,
  isDefault: false,
};

export default {
  name: "AddressManageView",
  components: { MapPicker,AppHeader, AppFooter },
  data() {
    return {
      addresses: [],
      loading: true,
      showDialog: false,
      editing: false,
      editingId: null,
      form: { ...EMPTY_FORM },
      submitting: false,
      regionCode: [],
      regionData: regionData,
      mapPickerVisible: false,
    };
  },
  computed: {
    dialogTitle() {
      return this.editing ? "编辑收货地址" : "新增收货地址";
    },
  },
  created() {
    this.loadAddresses();
  },
  methods: {
    async loadAddresses() {
      this.loading = true;
      try {
        const res = await addressList();
        this.addresses = res.data || [];
      } catch (e) {
        this.$message.error("加载地址失败");
      } finally {
        this.loading = false;
      }
    },

    openAdd() {
      this.editing = false;
      this.editingId = null;
      this.form = { ...EMPTY_FORM };
      this.regionCode = [];
      this.showDialog = true;
    },

    openEdit(addr) {
      this.editing = true;
      this.editingId = addr.id;
      this.form = {
        receiver: addr.receiver,
        phone: addr.phone,
        province: addr.province,
        city: addr.city,
        district: addr.district,
        detail: addr.detail,
        longitude: addr.longitude || null,
        latitude: addr.latitude || null,
        isDefault: addr.isDefault === 1,
      };
      this.regionCode = this.matchRegionCode(addr.province, addr.city, addr.district);
      this.showDialog = true;
    },

    handleRegionChange(val) {
      if (val && val.length === 3) {
        this.form.province = codeToText[val[0]] || "";
        this.form.city = codeToText[val[1]] || "";
        this.form.district = codeToText[val[2]] || "";
      } else {
        this.form.province = "";
        this.form.city = "";
        this.form.district = "";
      }
    },

    matchRegionCode(province, city, district) {
      if (!province) return [];
      
      const prov = this.regionData.find(p => p.label.includes(province) || province.includes(p.label));
      if (!prov || !prov.children || !city) return [];
      
      const c = prov.children.find(ci => ci.label.includes(city) || city.includes(ci.label));
      if (!c || !c.children || !district) return [];
      
      const dist = c.children.find(d => d.label.includes(district) || district.includes(d.label));
      if (!dist) return [];
      
      return [prov.value, c.value, dist.value];
    },

    onMapSelect(data) {
      if (data) {
        this.form.province = data.province || "";
        this.form.city = data.city || "";
        this.form.district = data.district || "";
        this.form.detail = data.detail || "";
        this.form.longitude = data.lng || null;
        this.form.latitude = data.lat || null;
        this.regionCode = this.matchRegionCode(data.province, data.city, data.district);
      }
    },

    async submitForm() {
      const f = this.form;
      if (!f.receiver || !f.phone || !f.province || !f.city || !f.district || !f.detail) {
        this.$message.warning("请填写完整的地址信息");
        return;
      }
      this.submitting = true;
      try {
        const data = {
          receiver: f.receiver,
          phone: f.phone,
          province: f.province,
          city: f.city,
          district: f.district,
          detail: f.detail,
          longitude: f.longitude,
          latitude: f.latitude,
          isDefault: f.isDefault ? 1 : 0,
        };
        if (this.editing) {
          await updateAddress(this.editingId, data);
          this.$message.success("地址已更新");
        } else {
          await addAddress(data);
          this.$message.success("地址添加成功");
        }
        this.showDialog = false;
        this.loadAddresses();
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      } finally {
        this.submitting = false;
      }
    },

    async setDefault(addr) {
      try {
        await setDefaultAddress(addr.id);
        this.$message.success("已设为默认地址");
        this.loadAddresses();
      } catch (e) {
        this.$message.error(e.message || "操作失败");
      }
    },

    confirmDelete(addr) {
      this.$confirm(`确认删除「${addr.receiver} - ${addr.phone}」的地址？`, "删除确认", {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          await deleteAddress(addr.id);
          this.$message.success("地址已删除");
          this.loadAddresses();
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },
  },
};
</script>

<style scoped>
#address-manage-page {
  display: flex; flex-direction: column; min-height: 100vh;
  background: #f4f5f7;
}
.addr-container { max-width: 800px; width: 100%; margin: 0 auto; padding: 24px 20px 60px; flex: 1; }
.page-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0; }

.loading-wrap { text-align: center; padding: 80px; color: #999; font-size: 16px; }
.empty-state { text-align: center; padding: 80px 20px; color: #999; font-size: 16px; }

.address-list { display: flex; flex-direction: column; gap: 12px; }

.address-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: 12px; padding: 18px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
}
.address-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.addr-left { flex: 1; }
.addr-top { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.addr-receiver { font-weight: 600; font-size: 15px; color: #2c3e50; }
.addr-phone { color: #666; font-size: 14px; }
.default-tag { font-size: 11px; background: #6b8dd6; color: #fff; padding: 2px 8px; border-radius: 4px; }
.addr-detail { font-size: 14px; color: #666; }

.addr-actions { display: flex; gap: 4px; flex-shrink: 0; }

.btn { padding: 8px 20px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.2s; }
.btn-primary { background: linear-gradient(135deg, #6b8dd6, #8e37d7); color: #fff; }
.btn-text { background: transparent; color: #6b8dd6; padding: 6px 12px; }
.btn-danger-text { color: #e74c3c; }
.btn:hover { opacity: 0.8; }
</style>
