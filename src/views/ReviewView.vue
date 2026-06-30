<template>
  <div id="review-page">
    <div class="container">
      <div class="page-head">
        <h2>⭐ 发表评价</h2>
        <router-link to="/orders" class="back-link">← 返回订单</router-link>
      </div>

      <div v-if="loading" class="loading-wrap">⏳ 加载中…</div>

      <div v-if="!loading && orderItem" class="card">
        <div class="product-row">
          <img :src="orderItem.productImage || '/logo.png'" class="prod-img" />
          <div>
            <div class="prod-name">{{ orderItem.productName }}</div>
            <div class="prod-spec" v-if="orderItem.specName">{{ orderItem.specName }}</div>
          </div>
        </div>

        <div class="field">
          <label>商品评分</label>
          <el-rate v-model="form.rating" :texts="texts" show-text />
        </div>
        <div class="field">
          <label>评价内容</label>
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="分享你的使用感受，帮助更多养宠人…（5-500字）" maxlength="500" show-word-limit />
        </div>
        <div class="field">
          <label>晒图（最多 6 张）</label>
          <div class="upload-area">
            <div v-for="(img, idx) in form.images" :key="idx" class="upload-item"><img :src="img" /></div>
            <div v-if="form.images.length < 6" class="upload-btn" @click="addImage">＋ 上传</div>
          </div>
        </div>
        <div class="field">
          <el-checkbox v-model="form.anonymous">匿名评价</el-checkbox>
        </div>
        <div class="btn-row">
          <el-button @click="$router.push('/orders')">取消</el-button>
          <el-button type="primary" @click="submitReview" :loading="submitting">提交评价</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ReviewView",
  data() {
    return {
      loading: true,
      submitting: false,
      orderId: null,
      orderItem: null,
      texts: ["极差", "较差", "一般", "满意", "非常满意"],
      form: { rating: 5, content: "", images: [], anonymous: false },
    };
  },
  created() {
    const orderId = this.$route.query.orderId;
    const itemId = this.$route.query.itemId;
    if (orderId && itemId) this.loadItem(orderId, itemId);
    else this.loading = false;
  },
  methods: {
    async loadItem(orderId, itemId) {
      try {
        const { get } = await import("@/api/axios.js");
        const res = await get("/orders/my");
        const orders = res.data?.records || [];
        for (const o of orders) {
          if (String(o.id) === orderId) {
            this.orderId = o.id;
            const item = (o.orderItems || []).find(i => String(i.id) === itemId);
            if (item) this.orderItem = item;
          }
        }
      } catch (e) { /* ignore */ }
      this.loading = false;
    },
    addImage() {
      const url = prompt("输入图片URL（模拟上传）");
      if (url && this.form.images.length < 6) this.form.images.push(url);
    },
    async submitReview() {
      if (!this.form.content || this.form.content.length < 5) return this.$message.warning("评价内容至少 5 个字");
      this.submitting = true;
      try {
        const { postJson } = await import("@/api/axios.js");
        await postJson("/reviews", {
          orderId: this.orderId,
          orderItemId: this.orderItem.id,
          rating: this.form.rating,
          content: this.form.content,
          images: JSON.stringify(this.form.images),
        });
        this.$message.success("评价成功！");
        this.$router.push("/orders?status=4");
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
.container { max-width: 700px; margin: 0 auto; padding: 24px 16px 60px; }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-head h2 { font-size: 20px; font-weight: 700; color: #2c3e50; }
.back-link { font-size: 13px; color: #6B8DD6; text-decoration: none; }
.loading-wrap { text-align: center; padding: 80px; color: #999; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.product-row { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.prod-img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
.prod-name { font-size: 14px; font-weight: 600; }
.prod-spec { font-size: 12px; color: #999; margin-top: 2px; }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 13px; color: #666; margin-bottom: 8px; }
.upload-area { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-item { width: 72px; height: 72px; border-radius: 8px; overflow: hidden; }
.upload-item img { width: 100%; height: 100%; object-fit: cover; }
.upload-btn { width: 72px; height: 72px; border: 1px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; cursor: pointer; }
.btn-row { display: flex; gap: 10px; margin-top: 8px; }
</style>
