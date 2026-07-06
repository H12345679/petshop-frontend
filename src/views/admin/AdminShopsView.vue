<template>
  <div class="acontent">
    <!-- 检索条 -->
    <div
      class="card row center wrap gap8"
      style="padding: 12px 16px; margin-bottom: 20px"
    >
      <label for="searchInput" class="small muted">门店名称</label>
      <div class="input-wrap" style="width: 180px">
        <input
          id="searchInput"
          v-model="query.name"
          placeholder="模糊搜索"
          @keyup.enter="doSearch"
        />
      </div>
      <span class="small muted">状态</span>
      <div class="input-wrap select-wrap" style="width: 120px">
        <select v-model="query.status" @change="doSearch">
          <option value="">全部</option>
          <option :value="1">营业中</option>
          <option :value="0">已停业</option>
        </select>
      </div>
      <div class="btn primary sm" @click="doSearch">查询</div>
      <div class="btn sm" @click="resetQuery">重置</div>
      <div class="spacer"></div>
      <div class="btn primary" @click="openAddModal">＋ 新增门店</div>
    </div>

    <!-- 列表 -->
    <div class="card" style="padding: 0; overflow-x: auto">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width: 60px">LOGO</th>
            <th>门店名称</th>
            <th>所在地区</th>
            <th>联系电话</th>
            <th style="width: 90px">状态</th>
            <th style="width: 160px">创建时间</th>
            <th style="width: 160px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="shop in shops" :key="shop.id">
            <td>
              <div
                class="img"
                :style="
                  shop.logo
                    ? { backgroundImage: 'url(' + shop.logo + ')' }
                    : null
                "
              >
                <span v-if="!shop.logo">图</span>
              </div>
            </td>
            <td>{{ shop.name }}</td>
            <td>
              {{ shop.province || "" }} {{ shop.city || "" }}
              {{ shop.district || "" }}
            </td>
            <td>{{ shop.phone || "-" }}</td>
            <td>
              <span
                class="tag-sm"
                :class="shop.status === 1 ? 'ok' : 'stopped'"
                >{{ shop.status === 1 ? "营业中" : "已停业" }}</span
              >
            </td>
            <td class="small muted">{{ formatTime(shop.createdAt) }}</td>
            <td class="small">
              <span class="action-btn" @click="openEditModal(shop)">编辑</span>
              <span class="action-divider">·</span>
              <span class="action-btn" @click="toggleStatus(shop)">{{
                shop.status === 1 ? "停业" : "营业"
              }}</span>
              <span class="action-divider">·</span>
              <span class="action-btn danger" @click="handleDelete(shop.id)"
                >删除</span
              >
            </td>
          </tr>
          <tr v-if="shops.length === 0">
            <td
              colspan="7"
              class="text-center"
              style="padding: 40px; color: #888"
            >
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pager" v-if="total > 0">
      <span
        @click="changePage(query.page - 1)"
        :class="{ disabled: query.page <= 1 }"
        >‹</span
      >
      <span
        v-for="p in totalPages"
        :key="p"
        :class="{ on: query.page === p }"
        @click="changePage(p)"
        >{{ p }}</span
      >
      <span
        @click="changePage(query.page + 1)"
        :class="{ disabled: query.page >= totalPages }"
        >›</span
      >
      <span class="total-text">共 {{ total }} 家</span>
    </div>

    <!-- 弹窗 -->
    <div class="modal-mask" v-if="modalVisible">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>{{ isEdit ? "编辑门店" : "新增门店" }}</h3>
            <span class="close-btn" @click="modalVisible = false">×</span>
          </div>
          <div class="modal-body">
            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label for="shopNameInput"><span class="req">*</span> 门店名称</label>
                <div class="input-wrap">
                  <input
                    id="shopNameInput"
                    v-model="formData.name"
                    placeholder="如：极客宠物南山店"
                  />
                </div>
                <div
                  v-if="formErrors.name"
                  style="color: #d9534f; font-size: 12px; margin-top: 4px"
                >
                  {{ formErrors.name }}
                </div>
              </div>
              <div class="field col flex1">
                <label>联系电话</label>
                <div class="input-wrap">
                  <input v-model="formData.phone" placeholder="0755-xxxxxxxx" />
                </div>
              </div>
            </div>

            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label>省</label>
                <div class="input-wrap">
                  <input v-model="formData.province" placeholder="省" />
                </div>
              </div>
              <div class="field col flex1">
                <label>市</label>
                <div class="input-wrap">
                  <input v-model="formData.city" placeholder="市" />
                </div>
              </div>
              <div class="field col flex1">
                <label>区</label>
                <div class="input-wrap">
                  <input v-model="formData.district" placeholder="区" />
                </div>
              </div>
            </div>

            <div class="field mb16">
              <label>详细地址</label>
              <div class="input-wrap">
                <input
                  v-model="formData.address"
                  placeholder="街道门牌"
                  style="width: 100%"
                />
              </div>
            </div>

            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label>
                  经度 longitude
                  <span
                    class="action-btn"
                    style="float: right; font-size: 12px; font-weight: normal"
                    @click="mapPickerVisible = true"
                    >在地图上选择</span
                  >
                </label>
                <div class="input-wrap">
                  <input
                    v-model="formData.longitude"
                    placeholder="113.943123"
                  />
                </div>
              </div>
              <div class="field col flex1">
                <label>纬度 latitude</label>
                <div class="input-wrap">
                  <input v-model="formData.latitude" placeholder="22.540124" />
                </div>
              </div>
              <div class="field col flex1">
                <label>营业状态</label>
                <div class="input-wrap select-wrap">
                  <select
                    v-model="formData.status"
                    style="width: 100%; height: 36px; padding: 0 10px"
                  >
                    <option :value="1">营业中</option>
                    <option :value="0">已停业</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label>门店 LOGO</label>
                <div class="img-upload-box" @click="triggerUpload">
                  <div
                    class="img-preview"
                    v-if="formData.logo"
                    :style="{ backgroundImage: 'url(' + formData.logo + ')' }"
                  ></div>
                  <span v-else>＋ 上传</span>
                </div>
              </div>
              <div class="field col flex1">
                <label>门店简介</label>
                <div class="input-wrap" style="height: auto">
                  <textarea
                    v-model="formData.description"
                    placeholder="一句话简介"
                    style="
                      height: 64px;
                      width: 100%;
                      resize: none;
                      border: none;
                      outline: none;
                      padding: 8px;
                      font-family: inherit;
                    "
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer row gap8">
            <div class="spacer"></div>
            <div class="btn" @click="modalVisible = false">取消</div>
            <div class="btn primary" @click="saveShop">保存</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div class="modal-mask" v-if="deleteModalVisible">
      <div class="modal-wrapper" style="width: 400px">
        <div class="modal-container">
          <div class="modal-header">
            <h3>确认删除</h3>
            <span class="close-btn" @click="deleteModalVisible = false">×</span>
          </div>
          <div
            class="modal-body"
            style="
              padding: 30px 24px;
              text-align: center;
              font-size: 16px;
              color: #555;
            "
          >
            确定要删除这个门店吗？此操作不可恢复。
          </div>
          <div class="modal-footer row gap8" style="justify-content: flex-end">
            <div class="btn" @click="deleteModalVisible = false">取消</div>
            <div
              class="btn primary danger"
              style="background: #d9534f; border-color: #d9534f; color: #fff"
              @click="confirmDelete"
            >
              确定删除
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图选点弹窗 -->
    <MapPicker :visible.sync="mapPickerVisible" @select="onMapSelect" />

    <!-- 隐藏的文件上传控件 -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      @change="onFileSelected"
      accept="image/*"
    />
  </div>
</template>

<script>
import {
  searchShops,
  createShop,
  updateShop,
  deleteShop,
} from "@/api/modules/shop.js";
import { uploadImage } from "@/api/modules/product.js";
import { getStore } from "@/libs/storage.js";
import MapPicker from "@/components/MapPicker.vue";

export default {
  name: "AdminShopsView",
  components: { MapPicker },
  data() {
    return {
      userInfo: null,
      shops: [],
      total: 0,
      query: {
        page: 1,
        size: 10,
        name: "",
        status: "",
      },
      modalVisible: false,
      isEdit: false,
      formErrors: {},
      deleteModalVisible: false,
      deleteTargetId: null,
      mapPickerVisible: false,
      formData: {
        id: null,
        name: "",
        phone: "",
        province: "",
        city: "",
        district: "",
        address: "",
        longitude: "",
        latitude: "",
        status: 1,
        logo: "",
        description: "",
      },
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    },
  },
  created() {
    const u = getStore("userInfo");
    try {
      this.userInfo = u ? JSON.parse(u) : null;
    } catch (e) {
      this.userInfo = null;
    }

    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const params = {
          current: this.query.page,
          size: this.query.size,
        };
        if (this.query.name) params.name = this.query.name;
        if (this.query.status !== "") params.status = this.query.status;

        if (this.userInfo && this.userInfo.role === "MERCHANT") {
          params.ownerId = this.userInfo.id;
        }

        const res = await searchShops(params);
        if (res.data && res.data.records) {
          this.shops = res.data.records;
          this.total = res.data.total;
        }
      } catch (e) {
        console.warn("获取商店列表失败", e);
        alert(e.message || "获取商店列表失败");
      }
    },
    triggerUpload() {
      this.$refs.fileInput.click();
    },
    async onFileSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await uploadImage(file);
        if (res.data && res.data.url) {
          this.formData.logo = res.data.url;
        }
      } catch (err) {
        alert("上传失败：" + (err.message || err));
      } finally {
        e.target.value = ""; // 清空 input 以便下次能触发 change
      }
    },
    onMapSelect(loc) {
      this.formData.latitude = loc.lat;
      this.formData.longitude = loc.lng;
      if (loc.province) this.formData.province = loc.province;
      if (loc.city) this.formData.city = loc.city;
      if (loc.district) this.formData.district = loc.district;
      if (loc.detail) this.formData.address = loc.detail;
      this.mapPickerVisible = false;
    },
    doSearch() {
      this.query.page = 1;
      this.fetchData();
    },
    resetQuery() {
      this.query.name = "";
      this.query.status = "";
      this.query.page = 1;
      this.fetchData();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages || p === this.query.page) return;
      this.query.page = p;
      this.fetchData();
    },
    formatTime(timeStr) {
      if (!timeStr) return "-";
      return timeStr.replace("T", " ").substring(0, 16);
    },
    async toggleStatus(shop) {
      const newStatus = shop.status === 1 ? 0 : 1;
      try {
        await updateShop(shop.id, { status: newStatus });
        shop.status = newStatus;
      } catch (e) {
        alert(e.message || "状态切换失败");
      }
    },
    handleDelete(id) {
      this.deleteTargetId = id;
      this.deleteModalVisible = true;
    },
    async confirmDelete() {
      try {
        await deleteShop(this.deleteTargetId);
        this.deleteModalVisible = false;
        this.fetchData();
      } catch (e) {
        alert(e.message || "删除失败");
      }
    },
    openAddModal() {
      this.isEdit = false;
      this.formErrors = {};
      this.formData = {
        id: null,
        name: "",
        phone: "",
        province: "",
        city: "",
        district: "",
        address: "",
        longitude: "",
        latitude: "",
        status: 1,
        logo: "",
        description: "",
      };
      this.modalVisible = true;
    },
    openEditModal(shop) {
      this.isEdit = true;
      this.formErrors = {};
      this.formData = {
        id: shop.id,
        name: shop.name || "",
        phone: shop.phone || "",
        province: shop.province || "",
        city: shop.city || "",
        district: shop.district || "",
        address: shop.address || "",
        longitude: shop.longitude || "",
        latitude: shop.latitude || "",
        status: shop.status,
        logo: shop.logo || "",
        description: shop.description || "",
      };
      this.modalVisible = true;
    },
    async saveShop() {
      this.formErrors = {};
      if (!this.formData.name || !this.formData.name.trim()) {
        this.formErrors = { name: "请输入门店名称" };
        return;
      }

      try {
        if (this.isEdit) {
          await updateShop(this.formData.id, this.formData);
        } else {
          // 这里如果是 MERCHANT 自己新建商店，后端会通过 token 自己识别归属人并赋值 owner_id
          await createShop(this.formData);
        }
        this.modalVisible = false;
        this.fetchData();
      } catch (e) {
        alert(e.message || "保存失败");
      }
    },
  },
};
</script>

<style scoped>
/* Admin 基础布局 */
.admin-layout {
  display: flex;
  height: 100vh;
  background: #f4f5f7;
  font-size: 14px;
  color: #333;
}
.aside {
  width: 280px;
  background: #2c303a;
  border-right: none;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  color: #aeb9c2;
}
.brand {
  padding: 24px 20px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  background: #242830;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  letter-spacing: 1px;
}
.menu-group {
  padding: 20px 20px 10px;
  font-size: 15px;
  color: #76838f;
  font-weight: 600;
}
.aside a {
  display: block;
  padding: 16px 24px;
  font-size: 16px;
  color: #aeb9c2;
  text-decoration: none;
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
}
.aside a:hover {
  background: #343a46;
  color: #fff;
  padding-left: 28px;
}
.aside a.active {
  color: #fff;
  font-weight: 600;
  background: #3b4252;
  border-left-color: #5b8def;
}

.amain {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.atop {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  padding: 0 24px;
  font-weight: 500;
}
.acontent {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.row {
  display: flex;
}
.col {
  display: flex;
  flex-direction: column;
}
.center {
  align-items: center;
}
.wrap {
  flex-wrap: wrap;
}
.gap8 {
  gap: 8px;
}
.gap16 {
  gap: 16px;
}
.mb16 {
  margin-bottom: 16px;
}
.flex1 {
  flex: 1;
}
.spacer {
  flex: 1;
}
.small {
  font-size: 13px;
}
.muted {
  color: #888;
}
.text-center {
  text-align: center;
}
.card {
  background: #fff;
  border: 1px solid #e6e8eb;
  border-radius: 8px;
}

/* 输入框 */
.input-wrap {
  border: 1px solid #d6dbe3;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  overflow: hidden;
  height: 32px;
}
.input-wrap input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0 10px;
  height: 100%;
  background: transparent;
}
.select-wrap select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  height: 100%;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 16px;
  border-radius: 4px;
  border: 1px solid #d6dbe3;
  background: #fff;
  cursor: pointer;
  transition: 0.2s;
  user-select: none;
}
.btn:hover {
  background: #f8f9fb;
}
.btn.primary {
  background: #5b8def;
  border-color: #5b8def;
  color: #fff;
}
.btn.primary:hover {
  background: #4a7ce0;
}
.btn.sm {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
}

/* 表格 */
.tbl {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.tbl th,
.tbl td {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.tbl th {
  background: #fafbfc;
  color: #555;
  font-weight: 500;
  font-size: 13px;
}
.tbl tr:hover td {
  background: #fafbfc;
}
.img {
  width: 40px;
  height: 40px;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 12px;
  background-size: cover;
  background-position: center;
}

/* 标签 */
.tag-sm {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.tag-sm.ok {
  background: #eef4fe;
  color: #5b8def;
}
.tag-sm.stopped {
  background: #f5f5f5;
  color: #aaa;
}

/* 操作按钮 */
.action-btn {
  color: #5b8def;
  cursor: pointer;
}
.action-btn:hover {
  text-decoration: underline;
}
.action-btn.danger {
  color: #d9534f;
}
.action-divider {
  margin: 0 6px;
  color: #ccc;
}

/* 分页 */
.pager {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 16px;
}
.pager span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: #fff;
  border: 1px solid #d6dbe3;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
  user-select: none;
}
.pager span:hover:not(.on):not(.disabled):not(.total-text) {
  background: #f8f9fb;
  border-color: #5b8def;
  color: #5b8def;
}
.pager .on {
  background: #5b8def;
  color: #fff;
  border-color: #5b8def;
}
.pager .disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pager .total-text {
  border: none;
  background: transparent;
  color: #888;
  cursor: default;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-wrapper {
  width: 720px;
  max-width: 90%;
}
.modal-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
}
.close-btn {
  font-size: 20px;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
}
.close-btn:hover {
  color: #333;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
}
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  display: flex;
}
.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
}
.field .req {
  color: #d9534f;
  margin-right: 2px;
}

/* 图片上传框 */
.img-upload-box {
  width: 70px;
  height: 70px;
  background-color: #f8f9fb;
  border: 1px dashed #d6dbe3;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  background-size: cover;
  background-position: center;
}
.img-upload-box:hover {
  border-color: #5b8def;
  color: #5b8def;
}
.img-preview {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  border-radius: 4px;
}
</style>
