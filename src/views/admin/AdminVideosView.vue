<template>
  <div class="video-admin-container">
    <!-- 搜索筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="query" size="small" class="filter-form">
        <el-form-item label="标题">
          <el-input v-model="query.title" placeholder="模糊搜索" clearable @keyup.enter.native="doSearch" style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable @change="doSearch" style="width: 120px">
            <el-option label="待审核" :value="2"></el-option>
            <el-option label="已上架" :value="1"></el-option>
            <el-option label="已下架" :value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doSearch">查询</el-button>
        </el-form-item>
        <el-form-item style="float: right; margin-right: 0;">
          <el-button type="primary" icon="el-icon-plus" @click="openAddModal">上传视频</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表区 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="list" style="width: 100%" v-loading="loading">
        <el-table-column label="封面" width="100" align="center">
          <template slot-scope="scope">
            <el-image 
              v-if="scope.row.cover" 
              :src="scope.row.cover" 
              style="width: 72px; height: 42px; border-radius: 4px;"
              fit="cover"
              :preview-src-list="[scope.row.cover]">
            </el-image>
            <div v-else class="no-cover">▶</div>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="200">
          <template slot-scope="scope">
            <div class="video-title">{{ scope.row.title }}</div>
            <el-tag v-if="scope.row.status === 2" type="warning" size="mini">待审核</el-tag>
            <el-tag v-if="scope.row.status === 1" type="success" size="mini">已上架</el-tag>
            <el-tag v-if="scope.row.status === 0" type="danger" size="mini">已下架</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联商品" width="120">
          <template slot-scope="scope">
            <span class="muted-text">{{ scope.row.productId || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="views" label="播放量" width="100"></el-table-column>
        <el-table-column label="所属店" width="150">
          <template slot-scope="scope">
            <span>{{ getShopName(scope.row.shopId) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="160">
          <template slot-scope="scope">
            <span class="muted-text">{{ formatDate(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="240" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openEditModal(scope.row)">编辑</el-button>
            <el-divider direction="vertical"></el-divider>
            <span v-if="scope.row.status === 2 && isAdmin">
              <el-button type="text" size="small" style="color: #67c23a" @click="handleAudit(scope.row, 1)">通过</el-button>
              <el-divider direction="vertical"></el-divider>
              <el-button type="text" size="small" style="color: #f56c6c" @click="handleAudit(scope.row, 0)">驳回</el-button>
              <el-divider direction="vertical"></el-divider>
            </span>
            <el-button type="text" size="small" style="margin: 0 5px;" :disabled="!scope.row.url" @click="openPreviewModal(scope.row)">预览</el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="text" size="small" class="danger-text" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          @current-change="changePage"
          :current-page="query.current"
          :page-size="query.size"
          layout="total, prev, pager, next"
          :total="Number(total) || 0">
        </el-pagination>
      </div>
    </el-card>

    <!-- 上传/编辑 弹窗 -->
    <el-dialog :title="isEdit ? '编辑视频' : '上传 / 编辑视频'" :visible.sync="modalVisible" width="600px" custom-class="video-dialog" :close-on-click-modal="false">
      <el-form ref="videoForm" :model="formData" :rules="rules" label-width="90px" label-position="left">
        <el-form-item label="视频文件" prop="url" class="is-required">
          <div class="upload-area" @click="triggerUpload('video')">
            <template v-if="formData.url">
              <div class="upload-success">
                <i class="el-icon-video-camera-solid" style="font-size: 24px; color: #409EFF; margin-bottom: 8px;"></i>
                <div style="color: #409EFF">已上传，点击重新上传</div>
                <div class="file-name">{{formData.url}}</div>
              </div>
            </template>
            <template v-else>
              <i class="el-icon-upload" style="font-size: 28px; color: #C0C4CC; margin-bottom: 8px;"></i>
              <div>点击上传视频（本地/OSS）</div>
              <div class="upload-tip">上传成功返回 url</div>
            </template>
          </div>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="视频封面" label-width="80px">
              <div class="cover-upload-area" @click="triggerUpload('cover')">
                <img v-if="formData.cover" :src="formData.cover" class="cover-img" />
                <div v-else class="cover-placeholder">＋ 封面图</div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="视频标题" prop="title">
              <el-input v-model="formData.title" placeholder="如：调皮的小加菲猫吃罐头瞬间" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关联商品">
              <el-select 
                v-model="formData.productId" 
                filterable 
                remote 
                reserve-keyword 
                placeholder="输入商品名称搜索" 
                :remote-method="remoteSearchProducts" 
                :loading="productLoading" 
                clearable 
                style="width: 100%"
                @focus="remoteSearchProducts('')">
                <el-option 
                  v-for="p in productOptions" 
                  :key="p.id" 
                  :label="p.name" 
                  :value="p.id">
                  <span>{{ p.name }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属门店" prop="shopId">
              <el-select v-model="formData.shopId" placeholder="选择门店" style="width: 100%">
                <el-option v-for="s in shopOptions" :key="s.id" :label="s.name" :value="s.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="视频简介">
          <el-input type="textarea" v-model="formData.description" :rows="3" placeholder="这是店里新来的加菲猫，超能吃..." />
        </el-form-item>

        <el-form-item label="状态" prop="status" v-if="isAdmin">
          <el-radio-group v-model="formData.status">
            <el-radio :label="2" disabled>待审核</el-radio>
            <el-radio :label="1">上架</el-radio>
            <el-radio :label="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <div slot="footer" class="dialog-footer">
        <div class="footer-btns">
          <el-button @click="modalVisible = false" size="small">取消</el-button>
          <el-button type="primary" @click="saveVideo" :loading="uploading" size="small">保存</el-button>
        </div>
      </div>
      
      <!-- 隐藏的文件输入 -->
      <input type="file" ref="coverInput" accept="image/*" style="display:none" @change="onCoverSelected" />
      <input type="file" ref="videoInput" accept="video/*" style="display:none" @change="onVideoSelected" />
    </el-dialog>

    <!-- 视频在线预览弹窗 -->
    <el-dialog :title="previewData.title || '视频在线预览'" :visible.sync="previewModalVisible" width="680px" custom-class="video-preview-dialog" @close="closePreviewModal" :append-to-body="true">
      <div class="video-preview-wrapper" v-if="previewModalVisible && previewData.url">
        <video :src="previewData.url" :poster="previewData.cover" controls autoplay class="preview-video-player">
          <track kind="captions" src="" label="中文字幕" srclang="zh" />
        </video>
      </div>
      <div v-else class="preview-empty">暂无有效视频链接</div>
    </el-dialog>
  </div>
</template>

<script>
import { getManageVideoList, createVideo, updateVideo, deleteVideo, uploadVideoFile } from "@/api/modules/video.js";
import { uploadImage, searchProducts } from "@/api/modules/product.js";
import { searchShops } from "@/api/modules/shop.js";
import { getStore } from "@/libs/storage.js";

export default {
  name: "AdminVideosView",
  data() {
    return {
      loading: false,
      userInfo: null,
      query: {
        current: 1,
        size: 10,
        title: "",
        shopId: "",
        status: ""
      },
      list: [],
      total: 0,
      shopOptions: [],
      productOptions: [],
      productLoading: false,
      
      previewModalVisible: false,
      previewData: {
        title: "",
        url: "",
        cover: ""
      },

      modalVisible: false,
      isEdit: false,
      uploading: false,
      formData: {
        id: null,
        title: "",
        cover: "",
        url: "",
        description: "",
        productId: null,
        shopId: "",
        status: 1
      },
      rules: {
        title: [{ required: true, message: '请输入视频标题', trigger: 'blur' }],
        shopId: [{ required: true, message: '请选择所属门店', trigger: 'change' }]
      }
    };
  },
  computed: {
    isAdmin() {
      return this.userInfo && this.userInfo.role === 'ADMIN';
    }
  },
  created() {
    try {
      this.userInfo = JSON.parse(getStore("userInfo") || "null");
    } catch(e) { console.warn("ignored", e); }
    this.loadData();
    this.fetchShops();
  },
  methods: {
    formatDate(ds) {
      if (!ds) return "-";
      return ds.substring(0, 16).replace("T", " ");
    },
    getShopName(id) {
      const shop = this.shopOptions.find(s => s.id === id);
      return shop ? shop.name : id;
    },
    async fetchShops() {
      try {
        const res = await searchShops({ size: 100 });
        this.shopOptions = res.data.records || [];
      } catch (e) {
        this.$message.error("加载店铺失败: " + (e.message || e));
      }
    },
    async remoteSearchProducts(query) {
      this.productLoading = true;
      try {
        const params = { size: 50, name: query };
        if (this.formData.shopId) {
          params.shopId = this.formData.shopId;
        }
        const res = await searchProducts(params);
        this.productOptions = res.data.records || [];
      } catch (e) {
        console.error("加载商品失败", e);
      } finally {
        this.productLoading = false;
      }
    },
    async loadData() {
      this.loading = true;
      try {
        const res = await getManageVideoList(this.query);
        this.list = res.data.records || [];
        this.total = Number(res.data.total) || 0;
      } catch (e) {
        this.$message.error("获取视频列表失败: " + (e.message || e));
      } finally {
        this.loading = false;
      }
    },
    doSearch() {
      this.query.current = 1;
      this.loadData();
    },
    changePage(p) {
      this.query.current = p;
      this.loadData();
    },
    async handleDelete(id) {
      this.$confirm('确定要删除该视频吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await deleteVideo(id);
          this.$message.success("删除成功");
          this.loadData();
        } catch (e) {
          this.$message.error(e.message || "删除失败");
        }
      }).catch(() => {});
    },
    async handleAudit(row, status) {
      const actionName = status === 1 ? '通过' : '驳回';
      this.$confirm(`确定要审核${actionName}该视频吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          // 调用现有的 updateVideo 接口，只修改 status
          await updateVideo(row.id, {
            ...row,
            status: status
          });
          this.$message.success(`已${actionName}`);
          this.loadData();
        } catch (e) {
          this.$message.error(e.message || "操作失败");
        }
      }).catch(() => {});
    },
    openAddModal() {
      this.isEdit = false;
      this.formData = {
        id: null,
        title: "",
        cover: "",
        url: "",
        description: "",
        productId: null,
        shopId: this.shopOptions.length > 0 ? this.shopOptions[0].id : "",
        status: 1
      };
      if (this.$refs.videoForm) {
        this.$refs.videoForm.clearValidate();
      }
      this.modalVisible = true;
      this.productOptions = [];
    },
    openEditModal(row) {
      this.isEdit = true;
      this.formData = {
        ...row
      };
      if (row.productId) {
        this.productOptions = [{ id: row.productId, name: "商品 ID: " + row.productId }];
      } else {
        this.productOptions = [];
      }
      if (this.$refs.videoForm) {
        this.$refs.videoForm.clearValidate();
      }
      this.modalVisible = true;
    },
    openPreviewModal(row) {
      this.previewData = {
        title: row.title || "视频在线预览",
        url: row.url || "",
        cover: row.cover || ""
      };
      this.previewModalVisible = true;
    },
    closePreviewModal() {
      this.previewModalVisible = false;
      this.previewData = { title: "", url: "", cover: "" };
    },
    triggerUpload(type) {
      if (type === 'cover') {
        this.$refs.coverInput.click();
      } else {
        this.$refs.videoInput.click();
      }
    },
    async onCoverSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.uploading = true;
      try {
        const res = await uploadImage(file);
        if (res.data && res.data.url) {
          this.formData.cover = res.data.url;
        }
      } catch (err) {
        this.$message.error("封面上传失败: " + (err.message || err));
      } finally {
        this.uploading = false;
        e.target.value = "";
      }
    },
    async onVideoSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.uploading = true;
      try {
        const res = await uploadVideoFile(file);
        if (res.data && res.data.url) {
          this.formData.url = res.data.url;
          if (this.$refs.videoForm) {
            this.$refs.videoForm.validateField('url'); // clear url error if any
          }
        }
      } catch (err) {
        this.$message.error("视频上传失败: " + (err.message || err));
      } finally {
        this.uploading = false;
        e.target.value = "";
      }
    },
    saveVideo() {
      this.$refs.videoForm.validate(async (valid) => {
        if (!valid) return;
        if (!this.formData.url) {
          this.$message.warning("请上传视频文件");
          return;
        }
        
        const payload = { ...this.formData };
        if (!payload.productId) {
          payload.productId = 0;
        }
        
        this.uploading = true;
        try {
          if (this.isEdit) {
            await updateVideo(payload.id, payload);
          } else {
            await createVideo(payload);
          }
          this.$message.success("保存成功");
          this.modalVisible = false;
          this.loadData();
        } catch (e) {
          this.$message.error(e.message || "保存失败");
        } finally {
          this.uploading = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.video-admin-container {
  padding: 24px;
}
.filter-card {
  margin-bottom: 16px;
}
.filter-form .el-form-item {
  margin-bottom: 0;
}
.no-cover {
  width: 72px;
  height: 42px;
  background: #f0f2f5;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin: 0 auto;
}
.video-title {
  font-weight: 500;
  margin-bottom: 4px;
}
.muted-text {
  color: #909399;
}
.danger-text {
  color: #F56C6C;
}
.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* Upload Area Styles */
.upload-area {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #606266;
  background-color: #fafafa;
  transition: border-color 0.3s;
}
.upload-area:hover {
  border-color: #409EFF;
}
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.upload-success {
  text-align: center;
}
.file-name {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-upload-area {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  transition: border-color 0.3s;
}
.cover-upload-area:hover {
  border-color: #409EFF;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  color: #909399;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.video-preview-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  min-height: 240px;
}
.preview-video-player {
  width: 100%;
  max-height: 480px;
  outline: none;
}
.preview-empty {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
</style>
