module.exports = {
  publicPath: "/",
  outputDir: "dist", // 打包的目录
  lintOnSave: true, // 在保存时校验格式
  productionSourceMap: false, // 生产环境是否生成 SourceMap
  devServer: {
    open: true, // 启动服务后是否打开浏览器
    host: "0.0.0.0", // 允许局域网内的其他设备通过 IP 访问
    port: 8099, // 服务端口
    client: {
      // 关键修复：解决 Vue CLI 5 局域网访问时无限刷新的问题
      webSocketURL: 'auto://0.0.0.0:0/ws'
    },
    https: false,
    historyApiFallback: true,
    //hotOnly: false,
    // http:localhost:8099/
    //vue:  api/book/save
    //mapping:  http://localhost:8088/sb2024/book/save
    proxy: {
      "/api": {
        //vue:/api/test/get
        //springbtoot:http://localhost:8088/test/get
        //名字必须跟application context相同 否则404
        target: "http://localhost:8088", //spingboot 项目
        changeOrigin: true,
        // 关键：关闭代理的响应体缓冲，确保 SSE 流式数据能实时透传到浏览器
        selfHandleResponse: false,
        onProxyRes: function (proxyRes, req, res) {
          // 对 SSE 接口关掉代理缓冲
          if (req.url && req.url.includes('/stream')) {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['x-accel-buffering'] = 'no';
            // 强制不压缩，防止 gzip 导致分块被缓冲
            delete proxyRes.headers['content-encoding'];
          }
        }
      },
      "/image": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
    }, // 设置代理
    //before: app => {}
  },
};

