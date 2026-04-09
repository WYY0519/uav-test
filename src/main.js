import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { zhCn } from "element-plus/es/locale/index";
import VueTianditu from "vue-tianditu";
// import 'vue-tianditu/dist/style.css'
import "video.js/dist/video-js.css";
import "leaflet/dist/leaflet.css";
import videojs from "video.js";
import "videojs-flash";

// 动态加载高德地图脚本
const loadAMapScript = () => {
  // 如果已经加载，直接返回
  if (window.AMap) {
    return Promise.resolve();
  }
  const amapKey = import.meta.env.VITE_AMAP_KEY;
  if (!amapKey) {
    console.warn("VITE_AMAP_KEY 未设置，高德地图可能无法使用");
    return Promise.reject(new Error("Missing VITE_AMAP_KEY"));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geocoder,AMap.Scale`;
    script.onload = () => {
      console.log("高德地图脚本加载成功");
      resolve();
    };
    script.onerror = (error) => {
      console.error("高德地图脚本加载失败", error);
      reject(new Error("Failed to load AMap script"));
    };
    document.head.appendChild(script);
  });
};

// 开始加载高德地图脚本（不阻塞应用初始化），Promise 挂到全局供组件等待
window.__amapReady = loadAMapScript().catch((err) => {
  console.error("加载高德地图脚本失败:", err);
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.use(VueTianditu, {
  v: "4.0", //目前只支持4.0版本
  // tk:"9ba367ae035d60d46439d8cf1be3c485"
  tk: import.meta.env.VITE_APP_TIANDITU_KEY || "69a5cdb2a588f9138791d3ec5136addc",
});

app.mount("#app");
