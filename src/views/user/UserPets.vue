<template>
  <div class="panel">
    <div class="panel-head">
      <h3>我的宠物</h3>
      <button class="btn outline" v-if="!showForm" @click="openForm()">+ 添加宠物</button>
    </div>
    <div class="small muted hint">
      💡 完善宠物档案后，首页「为你推荐」会优先挑选适合你家宠物的商品（新用户零行为也能个性化）
    </div>

    <!-- 表单 -->
    <div class="pet-form card" v-if="showForm">
      <h4>{{ editingId ? '编辑宠物' : '添加宠物' }}</h4>
      <div class="field-row">
        <div class="field col">
          <label>昵称</label>
          <input class="input" v-model.trim="form.name" placeholder="如：豆豆" maxlength="20" />
        </div>
        <div class="field col">
          <label>种类 <span class="req">*</span></label>
          <select class="input" v-model.number="form.species">
            <option v-for="s in speciesOptions" :key="s.value" :value="s.value">{{ s.emoji }} {{ s.label }}</option>
          </select>
        </div>
        <div class="field col">
          <label>品种</label>
          <input class="input" v-model.trim="form.breed" placeholder="如：英短 / 金毛" maxlength="20" />
        </div>
      </div>
      <div class="field-row">
        <div class="field col">
          <label>性别</label>
          <select class="input" v-model.number="form.gender">
            <option :value="null">未知</option>
            <option :value="1">公</option>
            <option :value="2">母</option>
          </select>
        </div>
        <div class="field col">
          <label>生日</label>
          <input class="input" type="date" v-model="form.birthday" :max="today" />
        </div>
        <div class="field col">
          <label>体重(kg)</label>
          <input class="input" type="number" v-model.number="form.weightKg" min="0" step="0.1" placeholder="如：4.5" />
        </div>
      </div>
      <div class="field-row" style="align-items:center">
        <label class="check-label">
          <input type="checkbox" v-model="form.sterilizedChecked" />
          已绝育
        </label>
        <div class="spacer"></div>
        <button class="btn" @click="cancelForm">取消</button>
        <button class="btn primary" :disabled="saving" @click="savePet">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </div>

    <!-- 宠物卡片列表 -->
    <div v-if="pets.length" class="pet-list">
      <div v-for="p in pets" :key="p.id" class="pet-card">
        <div class="pet-avatar">{{ speciesEmoji(p.species) }}</div>
        <div class="pet-body">
          <div class="pet-line1">
            <span class="pet-name">{{ p.name || speciesLabel(p.species) }}</span>
            <span class="pet-tag">{{ speciesLabel(p.species) }}</span>
            <span v-if="p.breed" class="pet-tag plain">{{ p.breed }}</span>
            <span v-if="p.gender" class="pet-tag plain">{{ p.gender === 1 ? '♂ 公' : '♀ 母' }}</span>
            <span v-if="p.sterilized === 1" class="pet-tag plain">已绝育</span>
          </div>
          <div class="pet-line2">
            <span v-if="p.birthday">{{ ageText(p.birthday) }}</span>
            <span v-if="p.weightKg"> · {{ p.weightKg }}kg</span>
          </div>
        </div>
        <div class="pet-actions">
          <span class="link" @click="openForm(p)">编辑</span>
          <span class="link danger" @click="removePet(p.id)">删除</span>
        </div>
      </div>
    </div>
    <div v-else-if="!loading" class="empty">还没有宠物档案，添加后推荐更懂你 🐾</div>
  </div>
</template>

<script>
import { getMyPets, addPet, updatePet, deletePet } from "@/api/modules/user.js";

const SPECIES = [
  { value: 1, label: "猫咪", emoji: "🐱" },
  { value: 2, label: "狗狗", emoji: "🐶" },
  { value: 3, label: "兔子", emoji: "🐰" },
  { value: 4, label: "鸟类", emoji: "🦜" },
  { value: 9, label: "其他", emoji: "🐾" },
];

export default {
  name: "UserPets",
  data() {
    return {
      pets: [],
      loading: false,
      showForm: false,
      editingId: null,
      form: this.emptyForm(),
      saving: false,
    };
  },
  computed: {
    speciesOptions() { return SPECIES; },
    today() { return new Date().toISOString().slice(0, 10); },
  },
  created() {
    this.loadPets();
  },
  methods: {
    emptyForm() {
      return { name: "", species: 1, breed: "", gender: null, birthday: "", weightKg: null, sterilizedChecked: false };
    },
    speciesLabel(v) { const s = SPECIES.find(x => x.value === v); return s ? s.label : "宠物"; },
    speciesEmoji(v) { const s = SPECIES.find(x => x.value === v); return s ? s.emoji : "🐾"; },
    ageText(birthday) {
      const b = new Date(birthday);
      if (isNaN(b.getTime())) return "";
      const months = Math.max(0, Math.floor((Date.now() - b.getTime()) / (30.44 * 24 * 3600 * 1000)));
      if (months < 12) return months + "个月（幼年）";
      const years = Math.floor(months / 12);
      return years + "岁（" + (years <= 7 ? "成年" : "老年") + "）";
    },
    async loadPets() {
      this.loading = true;
      try {
        const res = await getMyPets();
        this.pets = res.data || [];
      } catch (e) {
        this.pets = [];
      } finally {
        this.loading = false;
      }
    },
    openForm(pet) {
      if (pet) {
        this.editingId = pet.id;
        this.form = {
          name: pet.name || "", species: pet.species || 1, breed: pet.breed || "",
          gender: pet.gender || null, birthday: pet.birthday || "",
          weightKg: pet.weightKg != null ? Number(pet.weightKg) : null,
          sterilizedChecked: pet.sterilized === 1,
        };
      } else {
        this.editingId = null;
        this.form = this.emptyForm();
      }
      this.showForm = true;
    },
    cancelForm() {
      this.showForm = false;
      this.editingId = null;
      this.form = this.emptyForm();
    },
    async savePet() {
      if (!this.form.species) return this.$emit('notify', "error", "请选择宠物种类");
      this.saving = true;
      const payload = {
        name: this.form.name || null,
        species: this.form.species,
        breed: this.form.breed || null,
        gender: this.form.gender || null,
        birthday: this.form.birthday || null,
        weightKg: this.form.weightKg || null,
        sterilized: this.form.sterilizedChecked ? 1 : 0,
      };
      try {
        if (this.editingId) {
          await updatePet(this.editingId, payload);
          this.$emit('notify', "success", "宠物档案已更新");
        } else {
          await addPet(payload);
          this.$emit('notify', "success", "宠物已添加，首页推荐将为TA优化");
        }
        this.cancelForm();
        await this.loadPets();
      } catch (e) {
        this.$emit('notify', "error", e.message || "操作失败");
      } finally {
        this.saving = false;
      }
    },
    async removePet(id) {
      if (!confirm("确定要删除该宠物档案吗？")) return;
      try {
        await deletePet(id);
        this.$emit('notify', "success", "已删除");
        await this.loadPets();
      } catch (e) {
        this.$emit('notify', "error", e.message || "删除失败");
      }
    },
  },
};
</script>

<style scoped>
.panel { background: #fff; border: 1px solid #e6e8eb; border-radius: 10px; padding: 20px; }
.panel h3 { margin: 0; font-size: 16px; }
.panel h4 { margin: 0 0 12px; font-size: 14px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 6px; }
.hint { margin-bottom: 14px; }
.small { font-size: 12px; }
.muted { color: #999; }

/* 表单 */
.pet-form.card { border: 1px solid #d6dbe3; border-radius: 8px; padding: 16px; background: #fafbfc; margin-bottom: 14px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.field .req { color: #d9534f; }
.field-row { display: flex; gap: 14px; margin-bottom: 6px; }
.field.col { flex: 1; }
.input {
  width: 100%; padding: 9px 12px; border: 1px solid #d6dbe3; border-radius: 6px; font-size: 13px;
  color: #333; background: #fafbfc; outline: none; transition: border-color .15s; box-sizing: border-box;
}
.input:focus { border-color: #5b8def; background: #fff; }
.btn {
  padding: 9px 22px; border-radius: 6px; font-size: 13px; border: 1px solid #d6dbe3; background: #fff;
  color: #444; cursor: pointer; transition: .12s;
}
.btn:hover { border-color: #bbb; }
.btn.primary { background: #5b8def; color: #fff; border-color: #5b8def; }
.btn.primary:disabled { background: #9dbef5; border-color: #9dbef5; cursor: not-allowed; }
.btn.outline { border-color: #5b8def; color: #5b8def; }
.btn.outline:hover { background: #e7eefc; }
.check-label { font-size: 13px; color: #555; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.spacer { flex: 1; }

/* 宠物卡片 */
.pet-list { display: flex; flex-direction: column; gap: 10px; }
.pet-card {
  border: 1px solid #e6e8eb; border-radius: 8px; padding: 14px; display: flex;
  align-items: center; gap: 12px; transition: .12s;
}
.pet-card:hover { border-color: #5b8def; background: #f7faff; }
.pet-avatar {
  width: 46px; height: 46px; border-radius: 50%; background: #f0f4ff;
  display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
}
.pet-body { flex: 1; min-width: 0; }
.pet-line1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.pet-name { font-weight: 600; font-size: 14px; }
.pet-tag { font-size: 11px; background: #5b8def; color: #fff; padding: 1px 8px; border-radius: 8px; }
.pet-tag.plain { background: #f0f1f3; color: #666; }
.pet-line2 { font-size: 12px; color: #888; }
.pet-actions { display: flex; gap: 12px; flex-shrink: 0; }
.pet-actions .link { font-size: 12px; cursor: pointer; color: #5b8def; }
.pet-actions .link.danger { color: #d9534f; }

.empty { padding: 24px 0; text-align: center; color: #999; font-size: 13px; }
</style>
