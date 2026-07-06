<template>
  <div>
    <!-- 个人资料 -->
    <div class="panel">
      <h3>个人资料</h3>
      <div class="profile-layout">
        <div class="profile-avatar-col">
          <div class="avatar-big" @click="$refs.avatarInput.click()" title="点击更换头像" style="cursor: pointer; position: relative;">
            <img v-if="profileForm.avatar" :src="profileForm.avatar" class="avatar-img" />
            <span v-else class="avatar-txt big">{{ (userInfo.nickname || userInfo.username || '我')[0] }}</span>
            <div class="avatar-overlay">更换头像</div>
            <input aria-label="input" type="file" ref="avatarInput" accept="image/*" style="display:none" @change="handleAvatarChange" />
          </div>
        </div>
        <div class="profile-fields">
          <div class="field-row">
            <div class="field col">
              <label>用户名</label>
              <input aria-label="input" class="input disabled" :value="userInfo.username" disabled />
            </div>
            <div class="field col">
              <label>昵称 <span class="req">*</span></label>
              <input aria-label="input" class="input" v-model.trim="profileForm.nickname" placeholder="你的昵称" />
            </div>
          </div>
          <div class="field-row">
            <div class="field col">
              <label>性别</label>
              <select aria-label="select" class="input" v-model.number="profileForm.gender">
                <option :value="0">未知</option>
                <option :value="1">男</option>
                <option :value="2">女</option>
              </select>
            </div>
            <div class="field col">
              <label>手机号</label>
              <input aria-label="input" class="input" v-model.trim="profileForm.phone" placeholder="手机号" />
            </div>
          </div>
          <div class="field-row">
            <div class="field col">
              <label>邮箱</label>
              <input aria-label="input" class="input" v-model.trim="profileForm.email" placeholder="邮箱地址" />
            </div>
            <div class="field col"></div>
          </div>
          <button class="btn primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? '保存中…' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { updateUserInfo, uploadAvatar } from "@/api/modules/user.js";
import { setStore } from "@/libs/storage.js";

export default {
  name: "UserProfile",
  props: {
    userInfo: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      profileForm: { nickname: "", avatar: "", phone: "", email: "", gender: 0 },
      savingProfile: false,
    };
  },
  watch: {
    userInfo: {
      handler() {
        this.syncProfileForm();
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    syncProfileForm() {
      if (!this.userInfo) return;
      this.profileForm.nickname = this.userInfo.nickname || "";
      this.profileForm.avatar = this.userInfo.avatar || "";
      this.profileForm.phone = this.userInfo.phone || "";
      this.profileForm.email = this.userInfo.email || "";
      this.profileForm.gender = this.userInfo.gender != null ? this.userInfo.gender : 0;
    },
    async handleAvatarChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const res = await uploadAvatar(formData);
        this.profileForm.avatar = res.data.url;
        
        // 头像传完后直接触发保存，更新全局 userInfo，避免用户忘记点保存按钮
        await this.saveProfile();
        
      } catch (err) {
        this.$emit('notify', "error", "上传头像失败");
      } finally {
        e.target.value = ''; // 清空 input 保证下次同名文件仍能触发 change
      }
    },
    async saveProfile() {
      if (!this.profileForm.nickname.trim()) return this.$emit('notify', "error", "昵称不能为空");
      this.savingProfile = true;
      try {
        const payload = {
          nickname: this.profileForm.nickname.trim(),
          avatar: this.profileForm.avatar.trim(),
          phone: this.profileForm.phone.trim(),
          email: this.profileForm.email.trim(),
          gender: this.profileForm.gender,
        };
        await updateUserInfo(payload);
        
        // Notify parent to refresh user info or update it locally
        const updatedUser = { ...this.userInfo, ...payload };
        setStore("userInfo", JSON.stringify(updatedUser));
        
        this.$emit('update-user');
        this.$emit('notify', "success", "个人资料已保存");
      } catch (e) {
        this.$emit('notify', "error", e.message || "保存失败");
      } finally {
        this.savingProfile = false;
      }
    },
  }
};
</script>

<style scoped>
/* 面板通用 */
.panel {
  background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px;
}
.panel h3 { margin: 0 0 16px; font-size: 16px; }
.mt16 { margin-top: 16px; }

/* 表单通用 */
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.field .req { color: #c0392b; }
.field-row { display: flex; gap: 14px; margin-bottom: 6px; }
.field.col { flex: 1; }
.mt8 { margin-top: 8px; }
.input {
  width: 100%; padding: 9px 12px; border: 1px solid #d6dbe3; border-radius: 6px; font-size: 13px;
  color: #333; background: #fafbfc; outline: none; transition: border-color .15s;
}
.input:focus { border-color: #2a69d4; background: #fff; }
.input.disabled { background: #eef0f3; color: #595959; cursor: not-allowed; }
select.input { cursor: pointer; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #2a69d4; color: #fff; border-color: #2a69d4; }
.btn.primary:hover { background: #4a7de0; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
.form-narrow { max-width: 420px; }

/* 个人资料 */
.profile-layout { display: flex; gap: 24px; }
.profile-avatar-col { width: 140px; flex-shrink: 0; text-align: center; }
.avatar-big {
  width: 100px; height: 100px; border-radius: 50%; background: #e3e6ec; color: #595959;
  display: flex; align-items: center; justify-content: center; margin: 0 auto;
  overflow: hidden; border: 2px solid #e6e8eb; position: relative;
}
.avatar-big:hover .avatar-overlay { opacity: 1; }
.avatar-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); color: #fff; display: flex;
  align-items: center; justify-content: center; font-size: 13px;
  opacity: 0; transition: opacity 0.2s; pointer-events: none;
}
.avatar-big .avatar-txt.big { font-size: 32px; }
.avatar-big .avatar-img { width: 100%; height: 100%; object-fit: cover; }
.profile-fields { flex: 1; }

@media (max-width: 860px) {
  .profile-layout { flex-direction: column; align-items: center; }
}
</style>
