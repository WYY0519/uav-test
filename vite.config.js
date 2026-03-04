import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
// import vueDevTools from 'vite-plugin-vue-devtools'
import os from "os";
// 获取本地 IP 地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
  return "localhost";
}
// https://vite.dev/config/
export default defineConfig({
  // build: {
  //   assetsDir: "static/assets", // 打包后静态资源目录
  //   rollupOptions: {
  //     output: {
  //       assetFileNames: "static/assets/[name]-[hash][extname]",
  //     },
  //   },
  // },
  server: {
    host: "0.0.0.0", // 允许外部访问
    port: 5173, // 指定端口
    open: true, // 自动打开浏览器
    // cors: true, // 允许跨域请求
    // https: true,
    proxy: {
      "/api": {
        // target: "http://192.168.1.148:9090/api", // 金康
        // target: "http://192.168.1.213:9090/api", // 小汪
        // target: "http://192.168.1.179:8081", // 小崔
        // target: "http://192.168.1.252:9090", // 小陶
        target: "http://192.168.1.29:9090", // 张
        // target: "http://192.168.1.29:33333", // 张
        // target: "http://127.0.0.1:8080/api", //服务器
        changeOrigin: true, // 是否改变源
        // rewrite: (path) => path.replace(/^\/api/, ''),
        rewrite: (path) => path.replace(/^\/api/, ""),
        secure: false, // 如果是https接口，需要配置这个参数
        ws: true,
      },
    },
    // 启动时显示本地 IP
    onListening: function (server) {
      const localIP = getLocalIP();
      const port = server.config.server.port; // 获取端口号
      console.log("\n  App running at:");
      console.log(`  - Local:   http://localhost:${port}/`); // 本地访问地址
      console.log(`  - Network: http://${localIP}:${port}/\n`); // 网络访问地址
    },
  },
  plugins: [
    vue(), // 添加 Vue 插件
    // vueDevTools(), // 开发工具
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/cesium/Build/Cesium/Workers", // 工作线程
          dest: "Cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/ThirdParty", // 第三方库
          dest: "Cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/Assets", // 资源文件（如图片、模型）
          dest: "Cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/Widgets", // 控件样式
          dest: "Cesium",
        },
      ],
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/Cesium"),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)), // 配置别名
      leaflet: path.resolve(__dirname, "node_modules/leaflet"),
    },
  },
});
