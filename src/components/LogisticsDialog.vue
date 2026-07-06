<template>
  <el-dialog :title="title" :visible.sync="show" width="500px" append-to-body>
    <div class="lg-head">
      <div class="lg-row"><span class="lg-key">快递公司</span><span>{{ courierCompany || '未填写' }}</span></div>
      <div class="lg-row">
        <span class="lg-key">快递单号</span>
        <span>{{ trackingNumber || '—' }}　<span v-if="trackingNumber" class="lg-copy" @click="copyNo">复制</span></span>
      </div>
      <div class="lg-row" v-if="address"><span class="lg-key">收货地址</span><span>{{ address }}</span></div>
    </div>

    <div v-if="nodes.length" class="lg-timeline">
      <div v-for="(n, i) in nodes" :key="i" :class="['lg-node', { on: i === 0 }]">
        <span class="lg-dot"></span>
        <div class="lg-text">{{ n.text }}</div>
        <div class="lg-time">{{ n.timeText }}</div>
      </div>
    </div>
    <div v-else class="lg-empty">暂无物流轨迹</div>

    <div class="lg-tip">* 模拟物流数据，仅供实训演示</div>
  </el-dialog>
</template>

<script>
const CITIES = ["杭州", "上海", "南京", "苏州", "广州", "武汉", "成都", "郑州"];
const HOUR = 3600 * 1000;

/** 后端时间可能是 "yyyy-MM-dd HH:mm:ss" 或 ISO 的 "yyyy-MM-ddTHH:mm:ss"，统一转 Date */
function parseTime(s) {
  if (!s) return null;
  const d = new Date(String(s).replaceAll("T", " ").replaceAll("-", "/"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 简单字符串哈希，同一单号每次生成同样的轨迹 */
function hashCode(s) {
  let h = 0;
  s = String(s || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.codePointAt(i)) >>> 0;
  return h;
}

function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 模拟物流轨迹弹窗。父组件通过 ref 调用：
 *   this.$refs.logisticsDialog.open({
 *     title, courierCompany, trackingNumber, address,
 *     shipTime,           // 轨迹起点（发货/退货寄出时间），缺失则显示"暂无物流轨迹"
 *     receiveTime,        // 签收时间，有值则轨迹以"已签收"收尾
 *     seed,               // 随机种子（一般传快递单号），保证同一单每次轨迹一致
 *     destName,           // 目的地名称，不传则从收货地址里提取"xx市"
 *   })
 */
export default {
  name: "LogisticsDialog",
  data() {
    return {
      show: false,
      title: "物流信息",
      courierCompany: "",
      trackingNumber: "",
      address: "",
      nodes: [],
    };
  },
  methods: {
    open(payload) {
      const p = payload || {};
      this.title = p.title || "物流信息";
      this.courierCompany = p.courierCompany || "";
      this.trackingNumber = p.trackingNumber || "";
      this.address = p.address || "";
      this.nodes = this.buildNodes(p);
      this.show = true;
    },
    buildNodes({ shipTime, receiveTime, seed, address, courierCompany, destName }) {
      const start = parseTime(shipTime);
      if (!start) return [];

      const h = hashCode(seed || this.trackingNumber);
      const origin = CITIES[h % CITIES.length];
      let transit = CITIES[(h >> 3) % CITIES.length];
      if (transit === origin) transit = CITIES[(h % CITIES.length + 1) % CITIES.length];
      // 目的城市从收货地址提取"xx市"，取不到用兜底名
      const m = /(?:[^省]{1,8}省|[^区]{1,8}自治区)?([^市]{1,8}市)/.exec(address || "");
      const dest = destName || (m ? m[1] : "目的城市");
      const courier = courierCompany || "快递公司";

      // 以发货时间为起点、固定小时偏移生成节点
      const plan = [
        { at: 0, text: `【${origin}市】${courier}已揽收快件` },
        { at: 2, text: `【${origin}市】快件已到达 ${origin}转运中心` },
        { at: 5, text: `【${origin}市】快件已从 ${origin}转运中心 发出，下一站 ${transit}转运中心` },
        { at: 18, text: `【${transit}市】快件已到达 ${transit}转运中心，正发往 ${dest}` },
        { at: 30, text: `【${dest}】快件已到达 ${dest}，进入分拣中心` },
        { at: 34, text: `【${dest}】快递员正在为您派送，请保持电话畅通` },
      ];

      const now = new Date();
      const end = parseTime(receiveTime);
      const nodes = [];
      for (const step of plan) {
        const t = new Date(start.getTime() + step.at * HOUR);
        if (t > now) break;
        if (end && t > end) break;
        nodes.push({ text: step.text, timeText: fmt(t) });
      }
      if (end && end <= now) {
        nodes.push({ text: `【${dest}】快件已签收，签收人：本人。感谢使用${courier}`, timeText: fmt(end) });
      }
      return nodes.reverse(); // 最新的在最上面
    },
    copyNo() {
      navigator.clipboard.writeText(this.trackingNumber).catch(() => {});
      this.$message.success("单号已复制");
    },
  },
};
</script>

<style scoped>
.lg-head { background: #f7f8fa; border: 1px solid #eef0f3; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
.lg-row { display: flex; font-size: 13px; color: #333; margin-bottom: 6px; }
.lg-row:last-child { margin-bottom: 0; }
.lg-key { color: #888; width: 70px; flex-shrink: 0; }
.lg-copy { color: #5b8def; cursor: pointer; }
.lg-copy:hover { opacity: 0.8; }

.lg-timeline { max-height: 320px; overflow-y: auto; padding: 4px 0 0 8px; }
.lg-node { position: relative; padding: 0 0 18px 18px; border-left: 1px solid #e3e6ea; }
.lg-node:last-child { border-left-color: transparent; padding-bottom: 4px; }
.lg-dot { position: absolute; left: -5px; top: 3px; width: 9px; height: 9px; border-radius: 50%; background: #cfd4da; }
.lg-node.on .lg-dot { background: #5b8def; box-shadow: 0 0 0 3px #e7eefc; }
.lg-text { font-size: 13px; color: #666; line-height: 1.5; }
.lg-node.on .lg-text { color: #333; font-weight: 600; }
.lg-time { font-size: 12px; color: #aaa; margin-top: 3px; }

.lg-empty { text-align: center; color: #888; padding: 30px 0; font-size: 13px; }
.lg-tip { margin-top: 10px; font-size: 12px; color: #bbb; text-align: right; }
</style>
