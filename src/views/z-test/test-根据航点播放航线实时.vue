<template>
    <div class="demo-container">
        <!-- 主要内容区 -->
        <div class="main-content">
            <!-- 地图容器 -->
            <div class="map-container">
                <div ref="mapContainer" class="map-wrapper">
                    <!-- 加载中遮罩 -->
                    <div v-if="loading" class="loading-mask">
                        <div class="spinner"></div>
                        <div class="loading-text">加载中...</div>
                    </div>
                </div>
            </div>
            <!-- 控制面板 -->
            <div class="control-panel">
                <el-button type="primary" @click="startAnimation" :disabled="isAnimating">开始动画</el-button>
                <!-- <el-button type="warning" @click="pauseAnimation" :disabled="!isAnimating">暂停</el-button>
                <el-button type="danger" @click="stopAnimation" :disabled="!isAnimating">停止</el-button> -->
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { ElMessage, ElButton } from "element-plus";

// 轨迹数据
const pointsJson = [
    {
        policyId: "118",
        routeData: {
            type: "mission",
            home_pos: { alt: 0, lon: 112.28354, lat: 34.14335 },
            points: [
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.28354,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.14335,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.35519,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.1944,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.36229,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.19496,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.3074,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.12531,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.42722,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.15571,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.36019,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.19906,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.36619,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.10306,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.40318,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.1817,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.36919,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.19306,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.39919,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.10306,
                },
                {
                    residence_time: 5,
                    heading_angle: {
                        mode: "towards a certain point",
                        lon: 112.42722,
                        lat: 34.15571,
                    },
                    height_strategy: "Rise first",
                    alt: 30,
                    action: "turn over",
                    lon: 112.32919,
                    velocity: 5,
                    route_loss_behavior: "continue",
                    lat: 34.19006,
                },
            ],
        },
    },
];

// 状态变量
const mapContainer = ref(null);
let map = null;
const loading = ref(true);
const isAnimating = ref(false);
const currentPointIndex = ref(0);
const animationTimer = ref(null);
const markers = ref([]); // 存储所有标记点
const lines = ref([]); // 存储所有线段
const animatedPoints = ref([]); // 存储动画过程中的点

// 初始化地图
const initMap = async () => {
    if (!window.T) {
        ElMessage.error("天地图API未加载");
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        // 创建地图实例
        map = new T.Map(mapContainer.value);

        // 地图加载完成事件
        map.addEventListener("load", () => {
            loading.value = false;
            ElMessage.success("地图初始化成功，请点击开始动画按钮");
            // 解析轨迹数据但不立即显示
            parseRouteData(pointsJson[0].routeData.points);
        });

        map.addEventListener("error", (error) => {
            console.error("地图加载出错:", error);
            loading.value = false;
            ElMessage.error("地图加载失败，请刷新页面重试");
        });

        // 默认中心点（使用第一个点的坐标）
        const firstPoint = pointsJson[0].routeData.points[0];
        const defaultLng = firstPoint.lon;
        const defaultLat = firstPoint.lat;
        map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 12);

        // 添加控件
        map.addControl(new T.Control.MapType());
        map.addControl(new T.Control.Scale());
    } catch (error) {
        console.error("地图初始化失败:", error);
        ElMessage.error("地图初始化失败");
        loading.value = false;
    }
};

// 解析轨迹数据但不显示
const parseRouteData = (points) => {
    if (points.length === 0) return;

    // 转换坐标并准备动画数据
    animatedPoints.value = points.map((point) => {
        return {
            lng: point.lon,
            lat: point.lat,
            alt: point.alt || 30,
        };
    });
};

const addMarker = (point, index) => {
    // 起点显示"S"，终点显示"E"，中间点显示数字
    const markerLabel =
        index === 0
            ? "S"
            : index === animatedPoints.value.length - 1
                ? "E"
                : (index + 1).toString();

    const markerClass =
        index === 0
            ? "start"
            : index === animatedPoints.value.length - 1
                ? "end"
                : "middle";

    const markerHtml = `
        <div class="route-marker ${markerClass}">
            ${markerLabel}
        </div>
    `;

    const marker = new T.Marker(new T.LngLat(point.lng, point.lat), {
        icon: new T.DivIcon({
            html: markerHtml,
            iconSize: new T.Point(40, 40),
            iconAnchor: new T.Point(20, 20),
        }),
    });

    map.addOverLay(marker);
    markers.value.push(marker);
    map.panTo(new T.LngLat(point.lng, point.lat));
};

// 添加线段（连接当前点和前一个点）
const addLineSegment = (fromPoint, toPoint) => {
    const path = [
        new T.LngLat(fromPoint.lng, fromPoint.lat),
        new T.LngLat(toPoint.lng, toPoint.lat),
    ];

    const line = new T.Polyline(path, {
        color: "#409EFF",
        weight: 3,
        opacity: 0.8,
        lineStyle: "solid",
    });

    map.addOverLay(line);
    lines.value.push(line);
};

// 清除所有覆盖物
const clearOverlays = () => {
    if (map) {
        // 清除标记点
        markers.value.forEach((marker) => {
            if (marker) map.removeOverLay(marker);
        });
        markers.value = [];

        // 清除线段
        lines.value.forEach((line) => {
            if (line) map.removeOverLay(line);
        });
        lines.value = [];
    }
};

// 开始动画
const startAnimation = () => {
    if (!map || animatedPoints.value.length === 0) {
        ElMessage.warning("没有可播放的轨迹数据");
        return;
    }

    if (isAnimating.value) return;

    // 重置状态
    clearOverlays();
    currentPointIndex.value = 0;

    isAnimating.value = true;

    // 清除可能存在的旧定时器
    if (animationTimer.value) {
        clearInterval(animationTimer.value);
    }

    // 立即显示第一个点
    showCurrentPoint();

    // 从第二个点开始，每秒更新一个点
    animationTimer.value = setInterval(() => {
        currentPointIndex.value++;
        if (currentPointIndex.value >= animatedPoints.value.length) {
            // 动画结束
            clearInterval(animationTimer.value);
            isAnimating.value = false;
            ElMessage.success("轨迹动画播放完毕");
            return;
        }

        showCurrentPoint();
    }, 1000);

    ElMessage.success("轨迹动画已开始");
};

// 显示当前点，并添加与前一个点的连线
const showCurrentPoint = () => {
    const point = animatedPoints.value[currentPointIndex.value];

    // 添加当前点标记
    addMarker(point, currentPointIndex.value);

    // 如果不是第一个点，添加与前一个点的连线
    if (currentPointIndex.value > 0) {
        const prevPoint = animatedPoints.value[currentPointIndex.value - 1];
        addLineSegment(prevPoint, point);
    }
};

// // 暂停动画
// const pauseAnimation = () => {
//     if (!isAnimating.value) return;

//     clearInterval(animationTimer.value);
//     animationTimer.value = null;
//     isAnimating.value = false;

//     ElMessage.info("轨迹动画已暂停");
// };

// // 停止动画
// const stopAnimation = () => {
//     pauseAnimation();
//     clearOverlays();
//     currentPointIndex.value = 0;
//     ElMessage.info("轨迹动画已停止");
// };

onMounted(() => {
    initMap();
});

onBeforeUnmount(() => {
    // 清理资源
    if (animationTimer.value) {
        clearInterval(animationTimer.value);
    }
    clearOverlays();
    if (map) {
        map = null;
    }
});
</script>

<style scoped>
.demo-container {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
    overflow: hidden;
    position: relative;
}

.main-content {
    flex: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.map-container {
    width: 100%;
    height: calc(100% - 50px);
    position: relative;
    overflow: hidden;
}

.map-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
}

.control-panel {
    display: flex;
    gap: 10px;
    padding: 10px 20px;
    background-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    justify-content: center;
    z-index: 100;
}

.loading-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.loading-text {
    margin-top: 16px;
    font-size: 16px;
    color: #666;
}

/* 加载动画 */
.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(64, 158, 255, 0.2);
    border-left-color: #409eff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

:deep(.tdt-div-icon) {
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    border-radius: 50%;
}

:deep(.tdt-div-icon .start, .tdt-div-icon .middle, .tdt-div-icon .end) {
    background-color: #67c23a;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 18px;
}

:deep(.tdt-div-icon .middle) {
    background-color: #409eff;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 18px;
}

:deep(.tdt-div-icon .end) {
    background-color: #f56c6c;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 18px;
}

/* 标记点样式 */
.route-marker {
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    font-size: 16px;
    z-index: 100;
    transition: transform 0.3s ease;
}

.route-marker:hover {
    transform: scale(1.1);
}
</style>
