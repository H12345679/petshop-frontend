module.exports = {
    publicPath: '/',
    outputDir: 'dist', // 打包的目录
    lintOnSave: true, // 在保存时校验格式
    productionSourceMap: false, // 生产环境是否生成 SourceMap
    devServer: {
        open: true, // 启动服务后是否打开浏览器
        host: 'localhost',
        port: 8099, // 服务端口
        https: false,
        historyApiFallback: true,
        //hotOnly: false,
        // http:localhost:8099/
        //vue:  api/book/save
        //mapping:  http://localhost:8088/sb2024/book/save
        proxy: {
            '/api': {             
                //vue:/api/test/get
                //springbtoot:http://localhost:8088/test/get
                //名字必须跟application context相同 否则404
                target: 'http://localhost:8088',//spingboot 项目
                changeOrigin: true //  跨域
                // 注意：后端接口本身就带 /api 前缀（@RequestMapping("/api/...")），
                // 这里【不要】用 pathRewrite 去掉 /api，否则代理过去会 404。
            },
            '/image': {
                target: 'http://localhost:8088',
                changeOrigin: true
            }
        }, // 设置代理
        //before: app => {}
    },
}