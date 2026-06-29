<template>
  <div class="panel">
    <div class="panel-head">
      <h3>收货地址</h3>
      <button class="btn outline" v-if="!showAddressForm" @click="openAddressForm()">+ 新增地址</button>
    </div>

    <div class="address-form card" v-if="showAddressForm">
      <h4>{{ editingAddressId ? '编辑地址' : '新增地址' }}</h4>
      <div class="field-row">
        <div class="field col">
          <label>收货人 <span class="req">*</span></label>
          <input class="input" v-model.trim="addressForm.receiver" placeholder="收货人姓名" />
        </div>
        <div class="field col">
          <label>手机号 <span class="req">*</span></label>
          <input class="input" v-model.trim="addressForm.phone" placeholder="手机号" />
        </div>
      </div>
      <div class="field-row three">
        <div class="field col">
          <label>省份 <span class="req">*</span></label>
          <input class="input" v-model.trim="addressForm.province" placeholder="省" />
        </div>
        <div class="field col">
          <label>城市 <span class="req">*</span></label>
          <input class="input" v-model.trim="addressForm.city" placeholder="市" />
        </div>
        <div class="field col">
          <label>区/县 <span class="req">*</span></label>
          <input class="input" v-model.trim="addressForm.district" placeholder="区/县" />
        </div>
      </div>
      <div class="field">
        <label>详细地址 <span class="req">*</span></label>
        <input class="input" v-model.trim="addressForm.detail" placeholder="街道门牌号" />
      </div>
      <div class="field-row" style="align-items:center">
        <label class="check-label">
          <input type="checkbox" v-model="addressForm.isDefaultChecked" />
          设为默认地址
        </label>
        <div class="spacer"></div>
        <button class="btn" @click="cancelAddressForm">取消</button>
        <button class="btn primary" :disabled="savingAddress" @click="saveAddress">
          {{ savingAddress ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="addresses.length" class="addr-list">
      <div v-for="addr in addresses" :key="addr.id" :class="['addr-card', { default: addr.isDefault === 1 }]">
        <div class="addr-body">
          <div class="addr-line1">
            <span class="addr-receiver">{{ addr.receiver }}</span>
            <span class="addr-phone">{{ addr.phone }}</span>
            <span v-if="addr.isDefault === 1" class="addr-tag">默认</span>
          </div>
          <div class="addr-line2">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</div>
        </div>
        <div class="addr-actions">
          <span class="link" @click="openAddressForm(addr)">编辑</span>
          <span class="link" v-if="addr.isDefault !== 1" @click="setDefault(addr.id)">设为默认</span>
          <span class="link danger" @click="removeAddress(addr.id)">删除</span>
        </div>
      </div>
    </div>
    <div v-else-if="!loadingAddresses" class="empty">暂无收货地址，点击上方按钮新增</div>
  </div>
</template>

<script>
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/api/modules/user.js";

export default {
  name: "UserAddress",
  data() {
    return {
      addresses: [],
      loadingAddresses: false,
      
      showAddressForm: false,
      editingAddressId: null,
      addressForm: { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false },
      savingAddress: false,
    };
  },
  created() {
    this.loadAddresses();
  },
  methods: {
    async loadAddresses() {
      this.loadingAddresses = true;
      try {
        const res = await getAddresses();
        this.addresses = res.data || [];
      } catch (e) { 
        this.addresses = []; 
      } finally { 
        this.loadingAddresses = false; 
      }
    },
    openAddressForm(addr) {
      if (addr) {
        this.editingAddressId = addr.id;
        this.addressForm = {
          receiver: addr.receiver || "", phone: addr.phone || "",
          province: addr.province || "", city: addr.city || "", district: addr.district || "",
          detail: addr.detail || "", isDefaultChecked: addr.isDefault === 1,
        };
      } else {
        this.editingAddressId = null;
        this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false };
      }
      this.showAddressForm = true;
    },
    cancelAddressForm() {
      this.showAddressForm = false;
      this.editingAddressId = null;
      this.addressForm = { receiver: "", phone: "", province: "", city: "", district: "", detail: "", isDefaultChecked: false };
    },
    async saveAddress() {
      const f = this.addressForm;
      if (!f.receiver.trim() || !f.phone.trim() || !f.province.trim() || !f.city.trim() || !f.district.trim() || !f.detail.trim()) {
        return this.$emit('notify', "error", "请完整填写所有地址字段");
      }
      this.savingAddress = true;
      const payload = {
        receiver: f.receiver.trim(), phone: f.phone.trim(),
        province: f.province.trim(), city: f.city.trim(), district: f.district.trim(),
        detail: f.detail.trim(), isDefault: f.isDefaultChecked ? 1 : 0,
      };
      try {
        if (this.editingAddressId) {
          await updateAddress(this.editingAddressId, payload);
          this.$emit('notify', "success", "地址已更新");
        } else {
          await addAddress(payload);
          this.$emit('notify', "success", "地址已添加");
        }
        this.cancelAddressForm();
        await this.loadAddresses();
      } catch (e) {
        this.$emit('notify', "error", e.message || "操作失败");
      } finally {
        this.savingAddress = false;
      }
    },
    async setDefault(id) {
      try {
        await setDefaultAddress(id);
        this.$emit('notify', "success", "已设为默认地址");
        await this.loadAddresses();
      } catch (e) {
        this.$emit('notify', "error", e.message || "操作失败");
      }
    },
    async removeAddress(id) {
      if (!confirm("确定要删除该地址吗？")) return;
      try {
        await deleteAddress(id);
        this.$emit('notify', "success", "地址已删除");
        await this.loadAddresses();
      } catch (e) {
        this.$emit('notify', "error", e.message || "删除失败");
      }
    }
  }
};
</script>

<style scoped>
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0; font-size: 16px; }
.panel h4 { margin: 0 0 12px; font-size: 14px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }

/* 表单通用 */
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.field .req { color: #d9534f; }
.field-row { display: flex; gap: 14px; margin-bottom: 6px; }
.field-row.three > .col { flex: 1; }
.field.col { flex: 1; }
.input {
  width: 100%; padding: 9px 12px; border: 1px solid #d6dbe3; border-radius: 6px; font-size: 13px;
  color: #333; background: #fafbfc; outline: none; transition: border-color .15s;
}
.input:focus { border-color: #5b8def; background: #fff; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #5b8def; color: #fff; border-color: #5b8def; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
.btn.outline { border-color: #5b8def; color: #5b8def; }
.btn.outline:hover { background: #e7eefc; }
.check-label { font-size: 13px; color: #555; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.check-label input { cursor: pointer; }
.spacer { flex: 1; }

/* 收货地址 */
.address-form.card { border: 1px solid #d6dbe3; border-radius: 8px; padding: 16px; background: #fafbfc; margin-bottom: 14px; }
.addr-list { display: flex; flex-direction: column; gap: 10px; }
.addr-card {
  border: 1px solid #e6e8eb; border-radius: 8px; padding: 14px; display: flex;
  justify-content: space-between; align-items: center; transition: .12s;
}
.addr-card.default { border-color: #5b8def; background: #f7faff; }
.addr-body { flex: 1; min-width: 0; }
.addr-line1 { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.addr-receiver { font-weight: 600; font-size: 14px; }
.addr-phone { color: #888; font-size: 13px; }
.addr-tag { font-size: 11px; background: #5b8def; color: #fff; padding: 1px 8px; border-radius: 8px; }
.addr-line2 { font-size: 13px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.addr-actions { display: flex; gap: 12px; flex-shrink: 0; margin-left: 16px; }
.addr-actions .link { font-size: 12px; cursor: pointer; color: #5b8def; }
.addr-actions .link.danger { color: #d9534f; }

.empty { padding: 24px 0; text-align: center; color: #999; font-size: 13px; }
</style>
