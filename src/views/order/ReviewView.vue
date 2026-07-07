<template>
  <div id="review-page">
    <AppHeader />
    <div class="review-wrap">
      <div class="section-title">发表评价</div>

      <!-- 加载 -->
      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <template v-if="!loading && orderItem">
        <div class="card">
          <!-- 商品信息 -->
          <div class="product-row">
            <div class="prod-img"><img :src="orderItem.productImage || '/logo.png'" /></div>
            <div>
              <div class="prod-name">{{ orderItem.productName }}</div>
              <div class="prod-spec" v-if="orderItem.specName">规格：{{ orderItem.specName }}</div>
              <div class="prod-order">订单 {{ orderNo }}</div>
            </div>
          </div>

          <!-- 评分 -->
          <div class="field">
            <label>商品评分</label>
            <div class="star-row">
              <span v-for="s in 5" :key="s"
                :class="['star', { on: s <= form.rating }]"
                @click="form.rating = s"
              >★</span>
              <span class="star-text">{{ ratingText }}</span>
            </div>
          </div>

          <!-- 评价内容 -->
          <div class="field">
            <label>评价内容</label>
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="4"
              placeholder="分享你的使用感受，帮助更多养宠人…（5-500字）"
              maxlength="500"
              show-word-limit
            />
          </div>

          <!-- 晒图 -->
          <div class="field">
            <label>晒图（最多 6 张）</label>
            <div class="upload-row">
              <div v-for="(img, idx) in form.images" :key="idx" class="upload-item">
                <img :src="img" />
              </div>
              <el-upload
                v-if="form.images.length < 6"
                class="upload-add-wrap"
                action="#"
                :show-file-list="false"
                :http-request="uploadImage"
                accept="image/*"
              >
                <div class="upload-add">＋ 上传</div>
              </el-upload>
            </div>
          </div>

          <!-- 匿名 -->
          <div class="field">
            <el-checkbox v-model="form.anonymous">匿名评价</el-checkbox>
          </div>

          <!-- 按钮 -->
          <div class="btn-row">
            <el-button @click="$router.push('/orders')">取消</el-button>
            <el-button type="primary" :loading="submitting" @click="submitReview">提交评价</el-button>
          </div>
        </div>
      </template>

      <!-- 无商品 -->
      <div v-if="!loading && !orderItem" class="empty-state">
        <p>未找到可评价的商品</p>
        <router-link to="/orders" class="back-link">← 返回订单</router-link>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  name: "ReviewView",
  components: { AppHeader, AppFooter },
  data() {
    return {
      loading: true,
      submitting: false,
      orderId: null,
      orderNo: "",
      orderItem: null,
      form: { rating: 5, content: "", images: [], anonymous: false },
    };
  },
  computed: {
    ratingText() {
      const t = ["极差", "较差", "一般", "满意", "非常满意"];
      return t[this.form.rating - 1] || "";
    },
  },
  created() {
    const orderId = this.$route.query.orderId;
    const itemId = this.$route.query.itemId;
    if (orderId) this.loadItem(orderId, itemId);
    else this.loading = false;
  },
  methods: {
    async loadItem(orderId, itemId) {
      try {
        const { get } = await import("@/api/axios.js");
        const res = await get("/orders/my");
        const orders = res.data?.records || [];
        for (const o of orders) {
          if (String(o.id) === String(orderId)) {
            this.orderId = o.id;
            this.orderNo = o.orderNo || "";
            const items = (o.orderItems || []).filter(i =>
                (!i.refundStatus || i.refundStatus === 0) && (!i.cancelStatus || i.cancelStatus === 0));
            this.orderItem = itemId
              ? items.find(i => String(i.id) === String(itemId))
              : items[0];
            break;
          }
        }
      } catch (e) { /* ignore */ }
      this.loading = false;
    },
    async uploadImage(options) {
      try {
        const { upload } = await import("@/api/axios.js");
        const formData = new FormData();
        formData.append("file", options.file);
        const res = await upload("/files/review", formData);
        const url = res.data?.url;
        if (url) {
          this.form.images.push(url);
          this.$message.success("上传成功");
        } else {
          this.$message.error(res.message || "上传失败");
        }
      } catch (e) {
        this.$message.error("上传图片失败：" + e.message);
      }
    },
    async submitReview() {
      if (!this.form.content || this.form.content.length < 5) return this.$message.warning("评价内容至少 5 个字");
      this.submitting = true;
      try {
        const { postJson } = await import("@/api/axios.js");
        await postJson("/reviews", {
          orderId: this.orderId,
          orderItemId: this.orderItem?.id,
          productId: this.orderItem?.productId,
          rating: this.form.rating,
          content: this.form.content,
          images: JSON.stringify(this.form.images),
        });
        this.$message.success("评价成功！");
        this.$router.push("/orders");
      } catch (e) {
        this.$message.error(e.message || "提交失败");
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
#review-page { display: flex; flex-direction: column; min-height: 100vh; background: #f4f5f7; }
.review-wrap { max-width: 700px; width: 100%; margin: 0 auto; padding: 24px 20px 40px; flex: 1; }

.section-title { font-size: 22px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; }
.loading-wrap { text-align: center; padding: 80px; color: #595959; }
.empty-state { text-align: center; padding: 80px; color: #595959; }
.back-link { font-size: 14px; color: #2a69d4; text-decoration: none; }

/* 卡片 */
.card { background: #fff; border: 1px solid #cfd4da; border-radius: 8px; padding: 20px 24px; }

/* 商品信息 */
.product-row { display: flex; gap: 12px; align-items: center; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid #eef0f3; }
.prod-img { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #f5f5f5; flex-shrink: 0; }
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.prod-name { font-size: 14px; font-weight: 600; color: #2c3e50; }
.prod-spec { font-size: 12px; color: #595959; margin-top: 2px; }
.prod-order { font-size: 12px; color: #595959; margin-top: 2px; }

/* 表单 */
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 13px; color: #555; margin-bottom: 8px; }

/* 星级 */
.star-row { display: flex; align-items: center; gap: 2px; font-size: 28px; }
.star { color: #ddd; cursor: pointer; transition: .15s; }
.star.on { color: #f5a623; }
.star-text { font-size: 14px; color: #595959; margin-left: 10px; }

/* 上传 */
.upload-row { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-item { width: 72px; height: 72px; border-radius: 8px; overflow: hidden; border: 1px solid #eef0f3; }
.upload-item img { width: 100%; height: 100%; object-fit: cover; }
.upload-add {
  width: 72px; height: 72px; border: 1px dashed #9aa1aa; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: #595959; cursor: pointer; transition: .15s;
}
.upload-add:hover { border-color: #2a69d4; color: #2a69d4; }

/* 按钮 */
.btn-row { display: flex; gap: 10px; margin-top: 8px; }
</style>
