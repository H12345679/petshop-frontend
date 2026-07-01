<template>
  <div class="acontent">
    <!-- 检索条 -->
    <div class="card row center wrap gap8" style="padding:12px 16px; margin-bottom: 20px;">
          <span class="small muted">商品名</span>
          <div class="input-wrap" style="width:160px">
            <input v-model="query.name" placeholder="搜索" @keyup.enter="doSearch"/>
          </div>
          
          <span class="small muted">门店</span>
          <div class="input-wrap select-wrap" style="width:130px">
            <select v-model="query.shopId" @change="doSearch">
              <option value="">全部</option>
              <option v-for="s in shopOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          
          <span class="small muted">分类</span>
          <div class="input-wrap select-wrap" style="width:120px">
            <select v-model="query.categoryId" @change="doSearch">
              <option value="">全部</option>
              <template v-for="g in categoryTreeData">
                <optgroup v-if="g.children && g.children.length > 0" :key="'qg-'+g.id" :label="g.name">
                  <option v-for="c in g.children" :key="c.id" :value="c.id">{{ c.name }}</option>
                </optgroup>
                <option v-else :key="g.id" :value="g.id">{{ g.name }}</option>
              </template>
            </select>
          </div>
          
          <span class="small muted">类型</span>
          <div class="input-wrap select-wrap" style="width:110px">
            <select v-model="query.type" @change="doSearch">
              <option value="">全部</option>
              <option :value="1">宠物活体</option>
              <option :value="2">周边用品</option>
            </select>
          </div>
          
          <div class="btn primary sm" @click="doSearch">查询</div>
          <div class="btn sm" @click="resetQuery">重置</div>
          
          <div class="spacer"></div>
          <div class="btn primary" @click="openAddModal">＋ 发布商品</div>
        </div>

        <!-- 列表 -->
        <div class="card" style="padding:0;overflow-x:auto;">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:50px">图</th>
                <th>商品名称</th>
                <th>分类/类型</th>
                <th>价格</th>
                <th>库存</th>
                <th>销量</th>
                <th style="width:80px">状态</th>
                <th style="width:160px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in products" :key="p.id">
                <td>
                  <div class="img" :style="p.mainImage ? { backgroundImage: 'url(' + p.mainImage + ')' } : null">
                    <span v-if="!p.mainImage">图</span>
                  </div>
                </td>
                <td>{{ p.name }}</td>
                <td>
                  {{ getCategoryName(p.categoryId) }} / 
                  <span class="tag-sm">{{ p.type === 1 ? '宠物' : '周边' }}</span>
                </td>
                <td class="price">¥{{ p.price }}</td>
                <td>{{ p.stock }}</td>
                <td>{{ p.sales || 0 }}</td>
                <td>
                  <span class="tag-sm" :class="p.status === 1 ? 'ok' : 'stopped'">{{ p.status === 1 ? '上架' : '下架' }}</span>
                </td>
                <td class="small">
                  <span class="action-btn" @click="openEditModal(p)">编辑</span>
                  <span class="action-divider">·</span>
                  <span class="action-btn" @click="toggleStatus(p)">{{ p.status === 1 ? '下架' : '上架' }}</span>
                  <span class="action-divider">·</span>
                  <span class="action-btn danger" @click="handleDelete(p.id)">删除</span>
                </td>
              </tr>
              <tr v-if="products.length === 0">
                <td colspan="8" class="text-center" style="padding: 40px; color: #888;">暂无商品</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="pager" v-if="total > 0">
          <span @click="changePage(query.page - 1)" :class="{ disabled: query.page <= 1 }">‹</span>
          <span v-for="p in totalPages" :key="p" :class="{ on: query.page === p }" @click="changePage(p)">{{ p }}</span>
          <span @click="changePage(query.page + 1)" :class="{ disabled: query.page >= totalPages }">›</span>
          <span class="total-text">共 {{ total }} 件</span>
        </div>

    <!-- 商品表单弹窗 -->
    <div class="modal-mask" v-if="modalVisible">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>{{ isEdit ? '编辑商品' : '发布商品' }}</h3>
            <span class="close-btn" @click="modalVisible = false">×</span>
          </div>
          <div class="modal-body">
            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label><span class="req">*</span> 所属门店</label>
                <div class="input-wrap select-wrap">
                  <select v-model="formData.shopId">
                    <option v-for="s in shopOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
                <div v-if="formErrors.shopId" style="color:#d9534f; font-size:12px; margin-top:4px;">{{formErrors.shopId}}</div>
              </div>
              <div class="field col flex1">
                <label><span class="req">*</span> 商品分类</label>
                <div class="input-wrap select-wrap">
                  <select v-model="formData.categoryId">
                    <template v-for="g in categoryTreeData">
                      <optgroup v-if="g.children && g.children.length > 0" :key="'g-'+g.id" :label="g.name">
                        <option v-for="c in g.children" :key="c.id" :value="c.id">{{ c.name }}</option>
                      </optgroup>
                      <option v-else :key="g.id" :value="g.id">{{ g.name }}</option>
                    </template>
                  </select>
                </div>
                <div v-if="formErrors.categoryId" style="color:#d9534f; font-size:12px; margin-top:4px;">{{formErrors.categoryId}}</div>
              </div>
              <div class="field col flex1">
                <label><span class="req">*</span> 商品类型</label>
                <div class="input-wrap select-wrap">
                  <select v-model="formData.type">
                    <option :value="1">1 宠物（唯一）</option>
                    <option :value="2">2 周边</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="field mb16">
              <label><span class="req">*</span> 商品名称</label>
              <div class="input-wrap">
                <input v-model="formData.name" placeholder="如：英国短毛猫 蓝猫 纯种健康" />
              </div>
              <div v-if="formErrors.name" style="color:#d9534f; font-size:12px; margin-top:4px;">{{formErrors.name}}</div>
            </div>

            <div class="row gap16 mb16">
              <div class="field col flex1">
                <label><span class="req">*</span> 售价</label>
                <div class="input-wrap">
                  <input type="number" v-model.number="formData.price" placeholder="¥2500" />
                </div>
                <div v-if="formErrors.price" style="color:#d9534f; font-size:12px; margin-top:4px;">{{formErrors.price}}</div>
              </div>
              <div class="field col flex1">
                <label>原价</label>
                <div class="input-wrap">
                  <input type="number" v-model.number="formData.originalPrice" placeholder="¥3000" />
                </div>
              </div>
              <div class="field col flex1">
                <label>库存（宠物锁定为1）</label>
                <div class="input-wrap">
                  <input type="number" v-model.number="formData.stock" placeholder="1" :disabled="formData.type === 1" />
                </div>
              </div>
            </div>

            <div class="row gap16 mb16">
              <div class="field col">
                <label>主图</label>
                <div class="img-upload-box" @click="triggerUpload('mainImage')">
                  <div class="img-preview" v-if="formData.mainImage" :style="{backgroundImage: 'url(' + formData.mainImage + ')'}"></div>
                  <span v-else>＋ 上传</span>
                </div>
              </div>
              <div class="field col" style="flex:2">
                <label>商品图册（多张）</label>
                <div class="row gap8 wrap">
                  <div class="img-upload-box small" v-for="(img, idx) in formData.imagesList" :key="idx" :style="{backgroundImage: 'url(' + img + ')'}">
                    <div class="del-btn" @click.stop="formData.imagesList.splice(idx, 1)">×</div>
                  </div>
                  <div class="img-upload-box small" @click="triggerUpload('imagesList')">
                    <span>＋</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="field mb16">
              <label>商品描述</label>
              <div class="input-wrap" style="height:auto">
                <textarea v-model="formData.description" placeholder="详情图文..." style="height: 64px; width: 100%; resize: none; border:none; outline:none; padding: 8px;"></textarea>
              </div>
            </div>

            <!-- SKU 表格 (仅商品 type=2 显示) -->
            <div class="field" v-if="formData.type === 2">
              <label>规格 SKU <span class="btn sm" style="margin-left:8px" @click="addSku">＋ 添加规格</span></label>
              <table class="tbl" style="border:1px solid #eee; margin-top: 8px;">
                <thead>
                  <tr>
                    <th>规格名 (如 性别:母)</th>
                    <th style="width:110px">规格价</th>
                    <th style="width:90px">库存</th>
                    <th style="width:70px">图</th>
                    <th style="width:60px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sku, index) in formData.skus" :key="index">
                    <td>
                      <div class="input-wrap" style="height: 28px;">
                        <input v-model="sku.specName" placeholder="规格名称" />
                      </div>
                    </td>
                    <td>
                      <div class="input-wrap" style="height: 28px;">
                        <input type="number" v-model.number="sku.price" placeholder="价格" />
                      </div>
                    </td>
                    <td>
                      <div class="input-wrap" style="height: 28px;">
                        <input type="number" v-model.number="sku.stock" placeholder="库存" />
                      </div>
                    </td>
                    <td>
                      <div class="img-upload-box tiny" @click="triggerUpload('sku', index)">
                        <div class="img-preview" v-if="sku.image" :style="{backgroundImage: 'url(' + sku.image + ')'}"></div>
                        <span v-else>＋</span>
                      </div>
                    </td>
                    <td class="small" style="color:var(--danger)">
                      <span class="action-btn danger" @click="formData.skus.splice(index, 1)">删除</span>
                    </td>
                  </tr>
                  <tr v-if="formData.skus.length === 0">
                    <td colspan="5" class="text-center" style="color: #aaa; padding: 10px;">暂无规格，将使用默认价格与库存</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
          <div class="modal-footer row gap8">
            <div class="spacer"></div>
            <div class="btn" @click="modalVisible = false">取消</div>
            <div class="btn primary" @click="saveProduct">保存商品</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 删除确认弹窗 -->
    <div class="modal-mask" v-if="deleteModalVisible">
      <div class="modal-wrapper" style="width: 400px;">
        <div class="modal-container">
          <div class="modal-header">
            <h3>确认删除</h3>
            <span class="close-btn" @click="deleteModalVisible = false">×</span>
          </div>
          <div class="modal-body" style="padding: 30px 24px; text-align: center; font-size: 16px; color: #555;">
            确定要删除这个商品吗？此操作不可恢复。
          </div>
          <div class="modal-footer row gap8" style="justify-content: flex-end;">
            <div class="btn" @click="deleteModalVisible = false">取消</div>
            <div class="btn primary danger" style="background:#d9534f; border-color:#d9534f; color:#fff;" @click="confirmDelete">确定删除</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件上传控件 -->
    <input type="file" ref="fileInput" style="display: none;" @change="onFileSelected" accept="image/*" />
  </div>
</template>

<script>
import { searchProducts, createProduct, updateProduct, deleteProduct, uploadImage, getProductDetail } from "@/api/modules/product.js";
import { searchShops } from "@/api/modules/shop.js";
import { categoryTree } from "@/api/modules/home.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminProductsView",
  data() {
    return {
      userInfo: null,
      products: [],
      total: 0,
      query: {
        page: 1,
        size: 10,
        name: "",
        shopId: "",
        categoryId: "",
        type: ""
      },
      
      shopOptions: [],
      categoryTreeData: [],
      
      modalVisible: false,
      isEdit: false,
      formErrors: {},
      deleteModalVisible: false,
      deleteTargetId: null,
      formData: {
        id: null,
        shopId: "",
        categoryId: "",
        name: "",
        type: 1,
        price: null,
        originalPrice: null,
        stock: 1,
        mainImage: "",
        imagesList: [], // 临时数组，保存前转为 JSON 字符串
        description: "",
        skus: []
      },
      
      // 上传相关的临时标记
      uploadTarget: {
        field: null,
        index: null
      }
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.query.size) || 1;
    }
  },
  watch: {
    'formData.type'(newVal) {
      if (newVal === 1) {
        this.formData.stock = 1;
      }
    }
  },
  async created() {
    const u = getStore("userInfo");
    try { this.userInfo = u ? JSON.parse(u) : null; } catch (e) { this.userInfo = null; }
    
    await this.loadDependencies();
    this.fetchData();
  },
  methods: {
    async loadDependencies() {
      try {
        // 加载商店下拉选项：MERCHANT 只看自己的店，ADMIN 看全部
        const shopParams = { current: 1, size: 999 };
        if (this.userInfo && this.userInfo.role === 'MERCHANT') {
          shopParams.ownerId = this.userInfo.id;
        }
        const shopRes = await searchShops(shopParams);
        if (shopRes.data && shopRes.data.records) {
          this.shopOptions = shopRes.data.records;
        }
        
        // 加载分类树
        const catRes = await categoryTree();
        if (catRes.data) {
          this.categoryTreeData = catRes.data;
        }
      } catch (e) {
        console.warn("加载依赖数据失败", e);
      }
    },
    async fetchData() {
      try {
        const params = {
          current: this.query.page,
          size: this.query.size,
          status: "" // 不传状态或者后端支持按状态过滤，默认传空查全部
        };
        if (this.query.name) params.name = this.query.name;
        if (this.query.shopId) {
          params.shopId = this.query.shopId;
        } else if (this.userInfo && this.userInfo.role === 'MERCHANT' && this.shopOptions.length > 0) {
          // 商家未选择具体门店时，用 shopIds 传所有自己的门店ID
          params.shopIds = this.shopOptions.map(s => s.id).join(',');
        }
        if (this.query.categoryId) params.categoryId = this.query.categoryId;
        if (this.query.type) params.type = this.query.type;

        const res = await searchProducts(params);
        if (res.data && res.data.records) {
          this.products = res.data.records;
          this.total = res.data.total;
        }
      } catch (e) {
        console.warn("获取商品列表失败", e);
        alert(e.message || "获取商品列表失败");
      }
    },
    doSearch() {
      this.query.page = 1;
      this.fetchData();
    },
    resetQuery() {
      this.query = { page: 1, size: 10, name: "", shopId: "", categoryId: "", type: "" };
      this.fetchData();
    },
    changePage(p) {
      if (p < 1 || p > this.totalPages || p === this.query.page) return;
      this.query.page = p;
      this.fetchData();
    },
    getCategoryName(id) {
      if (!id) return "-";
      for (const group of this.categoryTreeData) {
        if (group.id == id) return group.name;
        if (group.children) {
          for (const child of group.children) {
            if (child.id == id) return group.name + " - " + child.name;
          }
        }
      }
      return "未知分类";
    },
    async toggleStatus(product) {
      const newStatus = product.status === 1 ? 0 : 1;
      try {
        await updateProduct(product.id, { status: newStatus });
        product.status = newStatus;
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
        await deleteProduct(this.deleteTargetId);
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
        shopId: this.shopOptions.length > 0 ? this.shopOptions[0].id : "",
        categoryId: "",
        name: "",
        type: 1,
        price: null,
        originalPrice: null,
        stock: 1,
        mainImage: "",
        imagesList: [],
        description: "",
        skus: []
      };
      this.modalVisible = true;
    },
    async openEditModal(p) {
      this.isEdit = true;
      this.formErrors = {};
      
      // 从 API 获取完整商品详情（包含 SKU 列表）
      try {
        const res = await getProductDetail(p.id);
        const detail = res.data;
        let imgList = [];
        try {
          if (detail.images) imgList = JSON.parse(detail.images);
        } catch (e) {
          console.warn("解析图册失败", e);
        }
        
        this.formData = {
          id: detail.id,
          shopId: detail.shopId,
          categoryId: detail.categoryId,
          name: detail.name,
          type: detail.type,
          price: detail.originalPrice || detail.price,
          originalPrice: detail.originalPrice,
          stock: detail.stock,
          mainImage: detail.mainImage || "",
          imagesList: imgList,
          description: detail.description || "",
          skus: detail.skus ? detail.skus.map(s => ({
            specName: s.specName || "",
            price: s.price,
            stock: s.stock,
            image: s.image || ""
          })) : []
        };
        this.modalVisible = true;
      } catch (e) {
        alert("获取商品详情失败：" + (e.message || e));
      }
    },
    addSku() {
      this.formData.skus.push({ specName: "", price: this.formData.price || 0, stock: 1, image: "" });
    },
    triggerUpload(field, index = null) {
      this.uploadTarget = { field, index };
      this.$refs.fileInput.click();
    },
    async onFileSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const res = await uploadImage(file);
        if (res.data && res.data.url) {
          const url = res.data.url;
          if (this.uploadTarget.field === 'mainImage') {
            this.formData.mainImage = url;
          } else if (this.uploadTarget.field === 'imagesList') {
            this.formData.imagesList.push(url);
          } else if (this.uploadTarget.field === 'sku') {
            this.formData.skus[this.uploadTarget.index].image = url;
          }
        }
      } catch (err) {
        alert("上传失败：" + (err.message || err));
      } finally {
        e.target.value = ""; // reset
      }
    },
    async saveProduct() {
      this.formErrors = {};
      let hasError = false;
      if (!this.formData.shopId) {
        this.formErrors = { ...this.formErrors, shopId: "请选择所属门店" };
        hasError = true;
      }
      if (!this.formData.categoryId) {
        this.formErrors = { ...this.formErrors, categoryId: "请选择商品分类" };
        hasError = true;
      }
      if (!this.formData.name || !this.formData.name.trim()) {
        this.formErrors = { ...this.formErrors, name: "请输入商品名称" };
        hasError = true;
      }
      if (this.formData.price == null || this.formData.price === "") {
        this.formErrors = { ...this.formErrors, price: "请输入商品售价" };
        hasError = true;
      }
      if (hasError) return;
      
      const payload = { ...this.formData };
      payload.images = JSON.stringify(payload.imagesList);
      delete payload.imagesList;
      
      if (payload.type === 1) {
        payload.skus = []; // 宠物没 sku
      }
      
      try {
        if (this.isEdit) {
          await updateProduct(payload.id, payload);
        } else {
          await createProduct(payload);
        }
        this.modalVisible = false;
        this.fetchData();
      } catch (e) {
        alert(e.message || "保存失败");
      }
    }
  }
};
</script>

<style scoped>
/* 实用类 */
.row { display: flex; }
.col { display: flex; flex-direction: column; }
.center { align-items: center; }
.wrap { flex-wrap: wrap; }
.gap8 { gap: 8px; }
.gap16 { gap: 16px; }
.mb16 { margin-bottom: 16px; }
.flex1 { flex: 1; }
.spacer { flex: 1; }
.small { font-size: 13px; }
.muted { color: #888; }
.text-center { text-align: center; }
.card { background: #fff; border: 1px solid #e6e8eb; border-radius: 8px; }

/* 表单输入 */
.input-wrap { border: 1px solid #d6dbe3; border-radius: 4px; background: #fff; display: flex; align-items: center; overflow: hidden; height: 32px; }
.input-wrap input { width: 100%; border: none; outline: none; padding: 0 10px; height: 100%; background: transparent; }
.select-wrap select { width: 100%; border: none; outline: none; background: transparent; cursor: pointer; height: 100%; padding: 0 10px; }

/* 按钮 */
.btn { display: inline-flex; align-items: center; justify-content: center; height: 32px; padding: 0 16px; border-radius: 4px; border: 1px solid #d6dbe3; background: #fff; cursor: pointer; transition: 0.2s; user-select: none; }
.btn:hover { background: #f8f9fb; }
.btn.primary { background: #5b8def; border-color: #5b8def; color: #fff; }
.btn.primary:hover { background: #4a7ce0; }
.btn.sm { height: 28px; padding: 0 12px; font-size: 13px; }

/* 表格 */
.tbl { width: 100%; border-collapse: collapse; text-align: left; }
.tbl th, .tbl td { padding: 12px 16px; border-bottom: 1px solid #eee; }
.tbl th { background: #fafbfc; color: #555; font-weight: 500; font-size: 13px; }
.tbl tr:hover td { background: #fafbfc; }
.img { width: 40px; height: 40px; background-color: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 12px; background-size: cover; background-position: center; }
.price { color: #ff5000; font-weight: 600; }

/* 标签 */
.tag-sm { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.tag-sm.ok { background: #eef4fe; color: #5b8def; }
.tag-sm.stopped { background: #f5f5f5; color: #aaa; }

/* 操作按钮 */
.action-btn { color: #5b8def; cursor: pointer; }
.action-btn:hover { text-decoration: underline; }
.action-btn.danger { color: #d9534f; }
.action-divider { margin: 0 6px; color: #ccc; }

/* 分页 */
.pager { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 16px; }
.pager span { display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 8px; background: #fff; border: 1px solid #d6dbe3; border-radius: 4px; cursor: pointer; color: #555; user-select: none; }
.pager span:hover:not(.on):not(.disabled):not(.total-text) { background: #f8f9fb; border-color: #5b8def; color: #5b8def; }
.pager .on { background: #5b8def; color: #fff; border-color: #5b8def; }
.pager .disabled { opacity: 0.4; cursor: not-allowed; }
.pager .total-text { border: none; background: transparent; color: #888; cursor: default; }

/* 弹窗 */
.modal-mask { position: fixed; z-index: 1000; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; }
.modal-wrapper { width: 780px; max-width: 95%; }
.modal-container { background: #fff; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; max-height: 90vh; }
.modal-header { padding: 16px 24px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { font-size: 20px; color: #aaa; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #333; }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #eee; display: flex; }
.field label { display: block; margin-bottom: 6px; font-size: 13px; color: #555; }
.field .req { color: #d9534f; margin-right: 2px; }

/* 图片上传框 */
.img-upload-box { width: 70px; height: 70px; background-color: #f8f9fb; border: 1px dashed #d6dbe3; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 13px; cursor: pointer; position: relative; background-size: cover; background-position: center; }
.img-upload-box:hover { border-color: #5b8def; color: #5b8def; }
.img-upload-box.small { width: 60px; height: 60px; }
.img-upload-box.tiny { width: 34px; height: 34px; font-size: 12px; }
.img-preview { width: 100%; height: 100%; background-size: cover; background-position: center; border-radius: 4px; }
.del-btn { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: rgba(0,0,0,0.5); color: #fff; border-radius: 50%; font-size: 12px; display: flex; align-items: center; justify-content: center; line-height: 1; }
.del-btn:hover { background: rgba(217,83,79,0.8); }
</style>
