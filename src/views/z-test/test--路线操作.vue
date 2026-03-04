<template>
  <div class="demo-container">
    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 地图容器 -->
      <div class="map-container">
        <div ref="mapContainer" class="map-wrapper">
          <!-- 加载中遮罩 -->
          <div v-if="loading" class="loading-mask">
            <el-spin size="large">加载中...</el-spin>
          </div>
        </div>

        <!-- 左侧控制面板，浮动在地图上层 -->
        <div class="floating-panel left-panel" v-show="!isPanelCollapsed">
          <el-card class="control-card" style="background-color: #00285a80">
            <!-- 控制面板 -->
            <div>
              <el-card
                style="
                  background-color: #2e3649db;
                  color: #fff;
                  margin-bottom: 12px;
                "
              >
                <template #header>
                  <div class="panel-header" style="color: #fff">
                    <div style="opacity: 0">11</div>
                    <span style="margin-left: 20px">路线操作</span>
                  </div>
                  <!-- 搜索区域 -->
                  <div>
                    <el-select
                      v-model="queryLocation"
                      placeholder="请输入要搜索的位置"
                      clearable
                      filterable
                      allow-create
                      @change="handleSelectChange"
                      @input="handleInput"
                      :filter-method="() => true"
                    >
                      <el-option
                        v-for="item in options"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </template>

                <!-- 绘制控制 -->
                <div class="control-group">
                  <div class="button-group-container">
                    <el-button
                      type="success"
                      @click="drawBotton"
                      :disabled="isDrawing || isViewing"
                      :icon="EditPen"
                    >
                      绘制
                    </el-button>
                    <el-button
                      type="primary"
                      @click="completeBotton"
                      :disabled="!isDrawing || drawnPoints.length < 2"
                      :icon="Select"
                    >
                      完成
                    </el-button>
                    <el-button
                      type="danger"
                      @click="cancelBotton"
                      :disabled="!isDrawing"
                      :icon="Close"
                    >
                      取消
                    </el-button>
                  </div>
                  <!-- 控制按钮区域 -->
                  <div class="control-panel">
                    <el-button
                      type="primary"
                      @click="startFlight"
                      :disabled="isStartButtonDisabled"
                    >
                      <el-icon>
                        <Play /> </el-icon
                      >开始
                    </el-button>
                    <el-button
                      type="warning"
                      @click="pauseFlight"
                      :disabled="!isPlaying || isPaused"
                    >
                      <el-icon>
                        <Pause /> </el-icon
                      >暂停
                    </el-button>
                    <el-button
                      type="success"
                      @click="resumeFlight"
                      :disabled="!isPaused"
                    >
                      <el-icon>
                        <RefreshRight /> </el-icon
                      >继续
                    </el-button>
                    <el-button
                      type="danger"
                      @click="stopFlight"
                      :disabled="!isPlaying && !isPaused"
                    >
                      <el-icon>
                        <Stop /> </el-icon
                      >停止
                    </el-button>
                    <el-button type="info" @click="toggleDrawingMode">
                      <el-icon>
                        <EditPen /> </el-icon
                      >{{ isDrawing ? "结束绘制" : "绘制路线" }}
                    </el-button>
                    <!-- <span class="status-text">
                                            {{ getStatusText() }}
                                        </span> -->
                  </div>
                  <el-tooltip content="保存当前路线" placement="top">
                    <el-button
                      type="primary"
                      @click="saveRoute3"
                      :disabled="!saveRouteBot"
                      class="save-button"
                      :loading="savingRoute"
                    >
                      <el-icon>
                        <Download /> </el-icon
                      >保存路线
                    </el-button>
                  </el-tooltip>
                </div>
              </el-card>
              <div class="route-search">
                <el-input
                  style="margin-bottom: 12px"
                  v-model="queryLocation2"
                  @input="handleInputRoute"
                  clearable
                  placeholder="请输入要搜索的航线"
                />
              </div>
              <div class="route-list-container">
                <div v-for="(item, index) in routeInfo" :key="index">
                  <div
                    class="routeOperation"
                    v-for="(itemInfo, indexInfo) in item"
                    :key="indexInfo"
                  >
                    <div class="routeOperation-box">
                      <div>
                        <span>{{ itemInfo.name }}</span>
                      </div>
                      <div>
                        <span
                          class="routeOperation-box-view"
                          @click="viewRoute(itemInfo)"
                          >查看</span
                        >
                        <span
                          class="routeOperation-box-edit"
                          @click="routeEdit(itemInfo)"
                          >编辑</span
                        >
                        <span
                          class="routeOperation-box-delete"
                          @click="deleteRoute(itemInfo)"
                          >删除</span
                        >
                      </div>
                    </div>
                    <div
                      class="routeInformation"
                      v-if="itemInfo.id === activeRouteId"
                    >
                      <div
                        class="routeInformation-list"
                        v-for="(
                          itemPrototype, indexPrototype
                        ) in itemInfo.points"
                        :key="indexPrototype"
                      >
                        航点 {{ indexPrototype + 1 }}
                        {{
                          indexPrototype === 0
                            ? "(起点)"
                            : indexPrototype === itemInfo.points.length - 1
                            ? "(终点)"
                            : ""
                        }}
                        <div
                          class="routeInformation-list-edit"
                          @click="
                            editAirline(itemPrototype, indexPrototype + 1)
                          "
                        >
                          编辑
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 之前的代码 -->
            <!-- <template #header>
              <div class="panel-header">
                <el-icon>
                  <Operation />
                </el-icon>
                <span>操作控制</span>
              </div>
            </template> -->

            <!-- 绘制控制组 -->
            <!-- <div class="control-group">
              <div class="group-title">路线绘制</div>
              <el-button-group>
                <el-tooltip content="绘制新路线" placement="top">
                  <el-button type="success" @click="startDrawing" :disabled="isDrawing || isTracking">
                    <el-icon>
                      <EditPen />
                    </el-icon>绘制
                  </el-button>
                </el-tooltip>
                <el-tooltip content="完成绘制" placement="top">
                  <el-button type="success" @click="finishDrawing" :disabled="!isDrawing || drawnPoints.length < 2">
                    <el-icon><Select /></el-icon>完成
                  </el-button>
                </el-tooltip>
                <el-tooltip content="取消绘制" placement="top">
                  <el-button type="danger" @click="cancelDrawing" :disabled="!isDrawing">
                    <el-icon>
                      <Close />
                    </el-icon>取消
                  </el-button>
                </el-tooltip>
              </el-button-group>
              <el-tooltip content="保存当前路线" placement="top">
                <el-button type="primary" @click="saveRoute" :disabled="!hasTrack" class="save-button"
                  :loading="savingRoute">
                  <el-icon>
                    <Download />
                  </el-icon>保存路线
                </el-button>
              </el-tooltip>
            </div> -->

            <!-- 轨迹控制组 -->
            <!-- <div class="control-group">
              <div class="group-title">轨迹控制</div>
              <div class="button-container">
                <el-button-group>
                  <el-tooltip content="开始轨迹播放" placement="top">
                    <el-button type="primary" @click="startTracking" :disabled="isTracking || !hasTrack">
                      <el-icon>
                        <VideoPlay />
                      </el-icon>开始
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="暂停轨迹播放" placement="top">
                    <el-button type="warning" @click="pauseTracking" :disabled="!isTracking">
                      <el-icon>
                        <VideoPause />
                      </el-icon>暂停
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="停止并返回起点" placement="top">
                    <el-button type="danger" @click="stopTracking" :disabled="!isTracking">
                      <el-icon>
                        <CircleClose />
                      </el-icon>停止
                    </el-button>
                  </el-tooltip>
                </el-button-group>
                <el-tooltip content="清除所有路线" placement="top">
                  <el-button type="danger" @click="clearAllTracks" :disabled="isTracking || !hasTrack"
                    class="clear-button">
                    <el-icon>
                      <Delete />
                    </el-icon>清除所有路线
                  </el-button>
                </el-tooltip>
              </div>
            </div> -->
          </el-card>
        </div>

        <!-- 新增：面板收起/展开按钮 -->
        <div
          style="
            position: absolute;
            top: 3.5%;
            left: 54px;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: flex-end; /* 内容靠右对齐 */
          "
        >
          <div
            style="
              background: #fff;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              cursor: pointer;
            "
            @click="togglePanel"
          >
            <el-icon :style="{ color: '#409eff' }">
              <Fold v-if="!isPanelCollapsed" />
              <Expand v-else />
            </el-icon>
          </div>
        </div>
        <!-- 保存路线弹窗 -->
        <el-dialog v-model="saveDialogVisible" title="保存路线" width="30%">
          <el-input
            v-model="newRouteName"
            placeholder="请输入路线名称"
            clearable
          />
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="saveDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="saveRoute2">保存</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 删除确认弹窗 -->
        <el-dialog
          v-model="deleteDialogVisible"
          title="确认删除"
          width="30%"
          type="warning"
        >
          <p>确定要删除这条航线吗？此操作不可恢复。</p>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="deleteDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmDelete">删除</el-button>
            </span>
          </template>
        </el-dialog>
        <!-- 编辑对话框 -->
        <el-dialog
          v-model="waypointSettingVisible"
          title="航点设置"
          width="25%"
          type="warning"
          style="max-height: 80%; overflow-y: auto"
        >
          <el-form :model="formData" label-width="130px">
            <!-- 1. 只读字段：航点序号、经纬度 -->
            <el-form-item label="航点序号:">
              <el-input
                v-model="formData.waypointNumber"
                placeholder="请输入航点序号"
              />
            </el-form-item>
            <!-- <el-form-item label="经纬度:">
              {{ waypointLongLat }}
            </el-form-item> -->
            <el-form-item label="是否展示参数:">
              <el-radio-group v-model="formData.whetherDisplay">
                <el-radio value="1" :label="true">是</el-radio>
                <el-radio value="0" :label="false">否</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="经度(度):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.routeLongitude" />
            </el-form-item>
            <el-form-item
              label="纬度(度):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.routeLatitude" />
            </el-form-item>
            <el-form-item
              label="停留时间(秒):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.residenceTime" />
            </el-form-item>
            <el-form-item
              label="转弯半径(米):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.turningRadius" />
            </el-form-item>
            <el-form-item
              label="航向角(度):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.headingAngle" />
            </el-form-item>
            <el-form-item
              label="航点飞行高度(米):"
              v-show="formData.whetherDisplay === '1' ? false : true"
            >
              <el-input v-model="formData.flightAltitude" />
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="waypointSettingVisible = false"
                >取消</el-button
              >
              <el-button type="primary" @click="editWaypoint">确认</el-button>
            </span>
          </template> </el-dialog
        >console.log(route);
        <!-- 保存路线 -->
        <el-dialog
          v-model="saveRouteDialogVisible"
          :title="dialogTitle"
          width="30%"
          type="warning"
          style="max-height: 80%; overflow-y: auto"
        >
          <el-form
            ref="saveRouteFormRef"
            :model="saveRouteForm"
            :rules="saveRouteRules"
            label-width="90px"
          >
            <el-form-item label="路线名称:" prop="name">
              <el-input
                v-model="saveRouteForm.name"
                placeholder="请输入路线名称"
              />
            </el-form-item>
            <el-form-item label="路线描述:" prop="description">
              <el-input
                v-model="saveRouteForm.description"
                :rows="2"
                type="textarea"
                maxlength="20"
                show-word-limit
                placeholder="请输入路线描述"
              />
            </el-form-item>
            <el-form-item label="航点策略:" prop="waypointStrategy">
              <el-select
                v-model="saveRouteForm.waypointStrategy"
                placeholder="请选择航点策略"
              >
                <el-option
                  v-for="item in waypointOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <!-- 数据行 -->
            <div
              class="save-route"
              v-for="(item, index) in saveRouteForm.points"
              :key="index"
              style="display: flex; align-items: center; margin-bottom: 10px"
            >
              <el-form-item
                label="高度:"
                :prop="`points[${index}].alt`"
                :rules="[
                  { required: true, message: '请输入高度', trigger: 'blur' },
                ]"
              >
                <el-input v-model="item.alt" placeholder="高度" />
              </el-form-item>
              <el-form-item
                label="经度:"
                :prop="`points.[${index}].lng`"
                :rules="[
                  { required: true, message: '请输入经度', trigger: 'blur' },
                ]"
              >
                <el-input v-model="item.lng" placeholder="经度" />
              </el-form-item>
              <el-form-item
                label="纬度:"
                :prop="`points.[${index}].lat`"
                :rules="[
                  { required: true, message: '请输入纬度', trigger: 'blur' },
                ]"
              >
                <el-input v-model="item.lat" placeholder="纬度" />
              </el-form-item>

              <!-- 操作按钮 -->
              <div
                style="
                  display: flex;
                  gap: 10px;
                  margin-left: 10px;
                  margin-bottom: 16px;
                "
              >
                <span
                  class="operation-btn add-btn"
                  @click="handleAddRow(index, item)"
                  title="添加行"
                  >+</span
                >
                <span
                  class="operation-btn delete-btn"
                  @click="handleDeleteRow(index, item)"
                  title="删除行"
                  :disabled="saveRouteForm.points.length <= 1"
                  >-</span
                >
              </div>
            </div>
          </el-form>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="saveRouteDialogVisible = false"
                >取消</el-button
              >
              <el-button type="primary" @click="confirmSaveRoute"
                >确认</el-button
              >
            </span>
          </template>
        </el-dialog>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Fold,
  Expand,
  CircleClose,
  Refresh,
  EditPen,
  Select,
  Close,
  Operation,
  InfoFilled,
  Delete,
  Download,
  Search,
} from "@element-plus/icons-vue";
import droneIcon from "../assets/local.png";
import axios from "axios";
import {
  addRoute,
  updateMission,
  getRouteList,
  deleteManageRoute,
} from "../../api/route.js";
import { debounce } from "lodash"; // 导入防抖函数

// 更新开始按钮的disabled状态计算
// 优化开始按钮禁用状态计算
const isStartButtonDisabled = computed(() => {
  const disabled =
    isPlaying.value || isPaused.value || routePoints.value.length < 2;
  console.log("开始按钮禁用状态:", disabled);
  console.log("isPlaying:", isPlaying.value);
  console.log("isPaused:", isPaused.value);
  console.log("routePoints长度:", routePoints.value.length);
  return disabled;
});
// 注入父组件提供的上下文
const collapseContext = inject("collapseContext", {
  isCollapse: ref(false),
});

// 解构出方法和状态（可选）
const { isCollapse } = collapseContext;
// --------------------- 无人机飞行相关状态 ---------------------
// const mapContainer = ref(null);
// let map = null;
let droneMarker = null;
let routeLine = null;
let animationFrameId = null;
let droneIconElement = null;
let lastTime = 0; // 用于时间差计算

// 飞行状态
// const loading = ref(true);
const routePoints = ref([]); // 用于飞行的路线点
const isPlaying = ref(false);
const isPaused = ref(false);
const currentPositionIndex = ref(0);
const progress = ref(0);
// const isDrawing = ref(false);
const flightSpeed = ref(50); // 飞行速度（米/秒）

// --------------------- 原有应用状态 ---------------------
// 状态变量
const mapContainer = ref(null);
const isTracking = ref(false);
const currentPosition = ref(null);
const currentTime = ref("");
const totalDistance = ref(0);

// 在状态变量部分添加
const lastEndPoint = ref(null);

let map = ref(null);
let carTrack = null;
// 修改预设的轨迹点为空数组
const fixedTrackPoints = [];
let currentPointIndex = ref(0);

// 轨迹点历史
const trackHistory = ref([fixedTrackPoints[0]]);

// 添加加载状态
const loading = ref(true);

// 添加绘制相关的状态
const isDrawing = ref(false);
const drawnPoints = ref([]);
let drawingLine = null;

//新增
const queryLocation = ref(""); //查询地点
const queryLocation2 = ref(""); //搜索航线
const geocoder = ref(null); // 用于地理编码的实例
const formData = ref({
  waypointNumber: "", //航点序号
  whetherDisplay: "1", //是否使展示航线参数
  routeLongitude: "", //航线经度
  routeLatitude: "", //航线纬度
  residenceTime: "", //停留时间
  turningRadius: "", //航向角
  headingAngle: "", //航线纬度
  flightAltitude: "", //航点飞行高度
});
let newArr = ref([]);
let routeInfo = ref([]);
let saveRouteBot = ref(false);
// 航线数据
const routes = ref([
  // 示例数据
  {
    id: 1,
    name: "城市观光路线",
    points: [
      { lng: 116.481028, lat: 39.921983 }, //0
      { lng: 116.494458, lat: 39.908823 }, //1 -1 0
      { lng: 116.489261, lat: 39.897262 }, //2 - 1 1
      { lng: 116.474868, lat: 39.909405 }, //3-1 2
    ],
  },
]);
// 天地图API密钥（请替换为您自己的密钥）
const TIANDITU_KEY = "您的天地图API密钥";
// 保存路线对话框状态
const saveRouteDialogVisible = ref(false);
//
const listRouteEditId = ref("");
const saveRouteFormRef = ref(null);
const saveRouteForm = ref({
  name: "",
  description: "",
  points: [],
});
// 表单验证规则
const saveRouteRules = {
  name: [
    { required: true, message: "请输入路线名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在 1 到 10 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入路线描述", trigger: "blur" },
    { min: 1, max: 20, message: "长度在 1 到 20 个字符", trigger: "blur" },
  ],
  points: [
    {
      type: "array",
      required: true,
      message: "至少需要2个航点",
      trigger: "blur",
      min: 2, // 确保至少2个航点
    },
  ],
};
const waypointOptions = [
  {
    value: "Option1",
    label: "航点策略一",
  },
];
let drawingClickHandler = null;
let currentRouteId = 0;
const isViewing = ref(false);
const saveDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const dialogTitle = ref("");
const waypointSettingVisible = ref(false);
const newRouteName = ref("");
const deletingRouteIndex = ref(-1);
let routePoints2 = ref([]);
const hasTrack = computed(() => {
  return fixedTrackPoints.length >= 2 || drawnPoints.value.length >= 2;
});

// 添加保存状态
const savingRoute = ref(false);
const options = ref([]);
// 新增状态：记录当前激活的航线ID（用于控制航点显示）
const activeRouteId = ref(null);
// 控制左侧面板收起/展开的状态（默认展开）
const isPanelCollapsed = ref(false);
const originalSaveRouteForm = ref("");
// 切换面板收起/展开状态
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
  ElMessage.success(isPanelCollapsed.value ? "面板已收起" : "面板已展开");
};
// 初始化地图
// 初始化地图（整合原有和新增逻辑）
const initMap = () => {
  if (!window.T) {
    ElMessage.error("天地图API未加载，请检查网络连接");
    loading.value = false;
    return;
  }

  try {
    map = new T.Map(mapContainer.value);

    map.addEventListener("load", () => {
      loading.value = false;
      map.checkResize();
      ElMessage.success("地图加载成功");
      geocoder.value = new T.Geocoder();
      // 确保地图点击事件在加载完成后绑定
      if (isDrawing.value) {
        map.addEventListener("click", drawingClickHandler);
      }
    });

    map.addEventListener("error", (e) => {
      console.error("地图加载错误:", e);
      loading.value = false;
      ElMessage.error("地图加载失败，请刷新页面重试");
    });

    // 设置地图中心点和缩放级别
    const defaultLng = 112.42;
    const defaultLat = 34.16;
    if (map.setCenter && map.setZoom) {
      map.setCenter(new T.LngLat(defaultLng, defaultLat));
      map.setZoom(15);
    } else if (map.centerAndZoom) {
      map.centerAndZoom(new T.LngLat(defaultLng, defaultLat), 15);
    }

    // 添加地图图层
    const layer = new T.TileLayer("img_w", {
      zIndex: 1,
      token: TIANDITU_KEY,
    });
    map.addLayer(layer);

    // 添加控件
    map.addControl(new T.Control.MapType());
    map.setMapType(TMAP_HYBRID_MAP);
    map.addControl(new T.Control.Scale());

    // 尝试获取当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          if (map.setCenter && map.setZoom) {
            map.setCenter(new T.LngLat(lng, lat));
            map.setZoom(15);
          } else if (map.centerAndZoom) {
            map.centerAndZoom(new T.LngLat(lng, lat), 15);
          }
        },
        (err) => {
          console.log("定位失败:", err);
        }
      );
    }
  } catch (error) {
    console.error("地图初始化失败:", error);
    loading.value = false;
    ElMessage.error("地图初始化失败，请检查配置");
  }
};
// 地图缩放导致地图没有覆盖到整个地图容器时，重新定位
const handleMapZoom = () => {
  console.log("地图缩放事件触发");
  if (map && typeof map.checkResize === "function") {
    // 延迟一小段时间，确保DOM已经更新完成
    setTimeout(() => {
      map.checkResize(); // 天地图API提供的重绘方法

      // 如果有必要，可以同时调整地图视野
      if (currentPosition.value) {
        map.panTo(
          new T.LngLat(currentPosition.value.lng, currentPosition.value.lat)
        );
      }
    }, 300);
  }
};
// 修改开始绘制函数
const startDrawing = () => {
  if (!map) return;

  // 清除现有的轨迹和覆盖物
  if (carTrack) {
    carTrack.stop();
    map.removeOverLay(carTrack);
    carTrack = null;
  }
  map.clearOverLays();

  isDrawing.value = true;
  drawnPoints.value = [];

  // 如果有上次的结束点，作为本次绘制的第一个点
  if (lastEndPoint.value) {
    drawnPoints.value.push(lastEndPoint.value);

    // 添加起点标记
    const startMarker = new T.Marker(
      new T.LngLat(lastEndPoint.value.lng, lastEndPoint.value.lat),
      {
        icon: new T.Icon({
          iconUrl: droneIcon,
          iconSize: new T.Point(12, 12),
          iconAnchor: new T.Point(6, 6),
        }),
      }
    );
    map.addOverLay(startMarker);

    // 创建绘制线并设置第一个点
    drawingLine = new T.Polyline(
      [new T.LngLat(lastEndPoint.value.lng, lastEndPoint.value.lat)],
      {
        color: "#c0274e",
        weight: 3,
        opacity: 0.8,
        lineStyle: "solid",
      }
    );
    map.addOverLay(drawingLine);

    ElMessage.info("已从上一次结束点开始绘制，请继续添加路线点");
  } else {
    // 没有上次结束点，正常开始绘制
    drawingLine = new T.Polyline([], {
      color: "#c0274e",
      weight: 3,
      opacity: 0.8,
      lineStyle: "solid",
    });
    map.addOverLay(drawingLine);
    ElMessage.info("请在地图上点击添加路线点");
  }

  // 添加地图点击事件监听
  map.addEventListener("click", handleMapClick);

  // 创建绘制线
  drawingLine = new T.Polyline([], {
    color: "#c0274e",
    weight: 3,
    opacity: 0.8,
    lineStyle: "solid",
  });
  map.addOverLay(drawingLine);

  ElMessage.info("请在地图上点击添加路线点");
};

// 修改完成绘制函数
const finishDrawing = () => {
  if (drawnPoints.value.length < 2) {
    ElMessage.warning("至少需要2个点才能形成路线");
    return;
  }

  // 保存最后一个点作为下次绘制的起点
  lastEndPoint.value = drawnPoints.value[drawnPoints.value.length - 1];

  // 清除绘制状态
  map.removeEventListener("click", handleMapClick);
  isDrawing.value = false;

  // 更新轨迹点
  fixedTrackPoints.length = 0;
  fixedTrackPoints.push(...drawnPoints.value);

  // 重新初始化轨迹对象
  if (carTrack) {
    carTrack.stop();
    map.removeOverLay(carTrack);
  }

  // 创建新的轨迹对象
  carTrack = new T.CarTrack(map, {
    Datas: fixedTrackPoints.map((point) => new T.LngLat(point.lng, point.lat)),
    interval: 50,
    speed: 5,
    polylinestyle: {
      color: "#2C64A7",
      weight: 4,
      opacity: 0.8,
      lineStyle: "solid",
    },
    carstyle: {
      display: true,
      iconUrl: droneIcon,
      width: 20,
      height: 20,
      offset: new T.Point(24, 24),
    },
  });

  // 重新添加事件监听 start
  carTrack.addEventListener("move", (e) => {
    const point = e.currentTarget.Datas[Math.floor(e.index)];
    currentPosition.value = point;
    currentPointIndex.value = Math.floor(e.index);
    currentTime.value = new Date().toLocaleTimeString();
  });

  // 重新计算总距离
  calculateTotalDistance();

  // 清除绘制线
  map.removeOverLay(drawingLine);
  drawingLine = null;

  ElMessage.success("路线绘制完成，可以开始播放轨迹");
};

// 取消绘制
const cancelDrawing = () => {
  if (!isDrawing.value) return;

  // 清除绘制状态
  map.removeEventListener("click", handleMapClick);
  isDrawing.value = false;

  // 清除绘制线和点标记
  if (drawingLine) {
    map.removeOverLay(drawingLine);
    drawingLine = null;
  }

  // 清除所有点标记
  drawnPoints.value.forEach((point) => {
    const markers = map.getOverlays();
    markers.forEach((marker) => {
      if (
        marker instanceof T.Marker &&
        marker.getLngLat().lng === point.lng &&
        marker.getLngLat().lat === point.lat
      ) {
        map.removeOverLay(marker);
      }
    });
  });

  drawnPoints.value = [];
  ElMessage.info("已取消绘制");
};

// 修改清除所有路线的函数
const clearAllTracks = () => {
  ElMessageBox.confirm("确定要清除所有路线吗？此操作不可恢复。", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      try {
        // 停止轨迹动画
        if (carTrack) {
          carTrack.stop();
          map.removeOverLay(carTrack);
          carTrack = null;
        }

        // 清除绘制线
        if (drawingLine) {
          map.removeOverLay(drawingLine);
          drawingLine = null;
        }

        // 使用while循环确保所有覆盖物都被清除
        let overlays = map.getOverlays();
        while (overlays && overlays.length > 0) {
          overlays.forEach((overlay) => {
            try {
              map.removeOverLay(overlay);
            } catch (e) {
              console.error("清除覆盖物失败:", e);
            }
          });
          map.clearOverLays();
          overlays = map.getOverlays();
        }

        // 重置所有状态
        isTracking.value = false; // 停止轨迹播放
        isDrawing.value = false;
        drawnPoints.value = [];
        currentPosition.value = null;
        currentPointIndex.value = 0;
        currentTime.value = "";
        totalDistance.value = 0;
        trackHistory.value = [];

        //// 重置上次结束点
        lastEndPoint.value = null;

        // 清空固定轨迹点
        fixedTrackPoints.length = 0;

        // 重置地图视图
        map.setZoom(15);
        map.panTo(new T.LngLat(113.93751, 35.06488));

        // 强制刷新地图并重新清除
        setTimeout(() => {
          // 再次清除所有覆盖物
          map.clearOverLays();
          // 刷新地图
          map.checkResize();
          // 重新设置中心点
          map.panTo(new T.LngLat(113.93751, 35.06488));

          // 创建新的空白绘制线，替换旧的
          drawingLine = new T.Polyline([], {
            color: "#c0274e",
            weight: 3,
            opacity: 0.8,
            lineStyle: "solid",
          });
        }, 100);

        // 最后一次检查和清除
        setTimeout(() => {
          map.clearOverLays();
          // 强制刷新地图显示
          map.checkResize();
          // 重新初始化地图状态
          initMap();
        }, 300);

        ElMessage.success("已清除所有路线和覆盖物");
      } catch (error) {
        console.error("清除路线失败:", error);
        ElMessage.error("清除路线失败: " + error.message);
      }
    })
    .catch(() => {
      ElMessage.info("已取消清除");
    });
};

// 处理地图点击
// const handleMapClick = (e) => {
//   if (!isDrawing.value) return;

//   const point = new T.LngLat(e.lnglat.lng, e.lnglat.lat);

//   drawnPoints.value.push({
//     lng: e.lnglat.lng,
//     lat: e.lnglat.lat,
//   });
//   drawingLine.setLngLats(
//     drawnPoints.value.map((p) => new T.LngLat(p.lng, p.lat))
//   );

//   // 添加点标记
//   const marker = new T.Marker(point, {
//     icon: new T.Icon({
//       iconUrl: droneIcon,
//       iconSize: new T.Point(12, 12),
//       iconAnchor: new T.Point(6, 6),
//     }),
//   });
//   map.addOverLay(marker);
// };

// const handleMapClick = (e) => {
//   if (!isDrawing.value) return;

//   const point = {
//     lng: e.lnglat.lng,
//     lat: e.lnglat.lat,
//   };

//   // 添加新点
//   drawnPoints.value.push(point);

//   // 更新绘制线
//   if (drawingLine) {
//     drawingLine.setLngLats(
//       drawnPoints.value.map((p) => new T.LngLat(p.lng, p.lat))
//     );
//   }

//   // 添加点标记（不添加起点标记，因为起点已经标记过）
//   if (
//     !lastEndPoint.value ||
//     point.lng !== lastEndPoint.value.lng ||
//     point.lat !== lastEndPoint.value.lat
//   ) {
//     const marker = new T.Marker(new T.LngLat(point.lng, point.lat), {
//       icon: new T.Icon({
//         iconUrl: droneIcon,
//         // iconSize: new T.Point(600, 600),
//         // iconAnchor: new T.Point(6000, 6000),
//       }),
//     });
//     map.addOverLay(marker);
//   }
// };

// 修复：优化地图点击处理
const handleMapClick = (e) => {
  if (!isDrawing.value) return;

  console.log("地图点击事件触发，当前绘制模式激活");

  try {
    const point = {
      lng: e.lnglat.lng,
      lat: e.lnglat.lat,
    };

    drawnPoints.value.push(point);
    updateDrawingLine();
    addPointMarker(
      point,
      drawnPoints.value.length - 1,
      drawnPoints.value.length
    );

    ElMessage.info(`已添加 ${drawnPoints.value.length} 个航点`);
  } catch (error) {
    console.error("处理地图点击时出错:", error);
    ElMessage.error("添加航点失败，请重试");
  }
};
// 开始跟踪
const startTracking = () => {
  if (!carTrack) {
    ElMessage.warning("轨迹未加载，无法开始播放");
    return;
  }

  try {
    carTrack.start();
    isTracking.value = true;
    ElMessage.success("轨迹播放开始");
  } catch (error) {
    console.error("开始播放失败:", error);
    ElMessage.error("开始播放失败: " + error.message);
  }
};

// 暂停跟踪
const pauseTracking = () => {
  if (!carTrack || !isTracking.value) {
    return;
  }

  try {
    carTrack.pause();
    isTracking.value = false;
    ElMessage.info("轨迹播放暂停");
  } catch (error) {
    console.error("暂停播放失败:", error);
    ElMessage.error("暂停播放失败: " + error.message);
  }
};

// 停止跟踪
const stopTracking = () => {
  if (!carTrack) {
    return;
  }

  try {
    carTrack.stop();
    isTracking.value = false;
    currentPointIndex.value = 0;
    currentPosition.value = fixedTrackPoints[0];
    ElMessage.info("轨迹播放停止");
  } catch (error) {
    console.error("停止播放失败:", error);
    ElMessage.error("停止播放失败: " + error.message);
  }
};

// 计算总距离
const calculateTotalDistance = () => {
  let distance = 0;
  for (let i = 0; i < fixedTrackPoints.length - 1; i++) {
    const p1 = new T.LngLat(fixedTrackPoints[i].lng, fixedTrackPoints[i].lat);
    const p2 = new T.LngLat(
      fixedTrackPoints[i + 1].lng,
      fixedTrackPoints[i + 1].lat
    );
    distance += p1.distanceTo(p2);
  }
  totalDistance.value = distance / 1000; // 转换为公里
};

const saveRoute = async () => {
  if (!hasTrack.value) {
    ElMessage.warning("没有可保存的路线");
    return;
  }

  try {
    savingRoute.value = true;

    // 获取当前路线的点
    const routePoints =
      fixedTrackPoints.length > 0 ? fixedTrackPoints : drawnPoints.value;

    // 获取当前位置作为home_pos
    let homePosition = null;
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        homePosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          alt: 0,
        };
      } catch (error) {
        console.warn("获取当前位置失败:", error);
        // 如果获取当前位置失败，使用第一个点作为home_pos
        homePosition = {
          lat: routePoints[0].lat,
          lng: routePoints[0].lng,
          alt: 0,
        };
      }
    }

    // 弹出输入框让用户输入路线名称
    const { value: routeName } = await ElMessageBox.prompt(
      "请输入路线名称",
      "保存路线",
      {
        confirmButtonText: "保存",
        cancelButtonText: "取消",
        inputPattern: /^.{1,50}$/,
        inputErrorMessage: "路线名称长度应在1-50个字符之间",
      }
    );

    if (!routeName) {
      return; // 用户点击取消或输入空名称
    }

    // 创建符合格式的路线数据对象
    const routeData = {
      type: "mission",
      // 添加路线名称
      points: routePoints.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        alt: 30, // 默认高度30米，可以根据需要修改
      })),
      home_pos: homePosition,
    };
    const name = { name: routeName };
    // 在请求发送之前做一些处理
    const token = localStorage.getItem("authToken");

    // 发送到后端
    const response = await axios.post(
      `/api/route/addRoute?name=${encodeURIComponent(name.name)}`,
      { routeData },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    console.log(response.data);

    if (response.data.code === 0) {
      ElMessage.success("路线保存成功");

      // 同时提供下载
      const routeJson = JSON.stringify(routeData, null, 2);
      const blob = new Blob([routeJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `route_${routeName.replace(/[^\w]/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      throw new Error(response.data.message || "保存失败");
    }
  } catch (error) {
    console.error("保存路线失败:", error);
    if (error !== "cancel") {
      // 过滤掉用户取消输入的情况
      ElMessage.error("保存路线失败: " + (error.message || "未知错误"));
    }
  } finally {
    savingRoute.value = false;
  }
};
// 转换函数：将原始数据项转换为目标格式的单个对象
const convertItem = (item) => {
  // 解析pointsJson获取路线点数据
  const pointsObj = JSON.parse(item.pointsJson);
  // 转换points数组（将lon转为lng）
  const convertedPoints = pointsObj.routeData.points.map((point) => ({
    lat: point.lat, // 保留纬度
    lng: point.lon, // 经度字段从lon转为lng
    alt: point.alt, // 保留高度
  }));
  // 返回转换后的单个路线对象
  return {
    name: item.name, // 使用原始名称
    description: item.description, //描述
    id: item.id,
    points: convertedPoints, // 转换后的点数组
  };
};
//航线列表
const routeList = async (value) => {
  // if (!value) {
  //   routeInfo.value = []
  // } else {
  const res = await getRouteList({
    keyword: value,
    pageNum: 1,
    pageSize: 20,
  });
  let newRouteInfo = ref([res.data.list.map(convertItem)]);
  console.log(newRouteInfo.value, "newRouteInfo");
  routeInfo.value[0] = newRouteInfo.value[0];
  console.log(routeInfo.value); // 输出转换后的结果
  // }
};
onMounted(async () => {
  //地图
  initMap();
  //航线列表
  routeList();
  // 测试郑州站坐标转换
  const apiLng = 113.658097;
  const apiLat = 34.745795;
  const [wgsLng, wgsLat] = gcj02towgs84(apiLng, apiLat);
  // 找到当前页面的.page-content元素（确保只作用于当前页面的容器）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    // 添加自定义类名（无padding）
    pageContent.classList.add("current-page-no-padding");
  }
  // 检查地图实例是否正常
  if (map) {
    console.log("地图实例初始化成功");
  } else {
    console.error("地图实例初始化失败");
  }
});
// 修改子组件中监听isCollapse变化的部分
watch(
  isCollapse,
  (newVal) => {
    console.log("isCollapse变化了:", newVal);

    // 当折叠状态变化时，触发地图尺寸重计算
    if (map && typeof map.checkResize === "function") {
      // 延迟一小段时间，确保DOM已经更新完成
      setTimeout(() => {
        map.checkResize(); // 天地图API提供的重绘方法

        // 如果有必要，可以同时调整地图视野
        if (currentPosition.value) {
          map.panTo(
            new T.LngLat(currentPosition.value.lng, currentPosition.value.lat)
          );
        }
      }, 300);
    }
  },
  { immediate: true }
);
// 卸载
onBeforeUnmount(() => {
  if (map && drawingClickHandler) {
    map.removeEventListener("click", drawingClickHandler);
    drawingClickHandler = null;
  }
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.remove("current-page-no-padding");
  }
  // 移除地图缩放事件监听
  if (map) {
    map.removeEventListener("zoomend", handleMapZoom);
  }
  try {
    // 停止并清除轨迹对象
    if (carTrack) {
      carTrack.stop();
      map.removeOverLay(carTrack);
      carTrack = null;
    }

    // 清除绘制线
    if (drawingLine) {
      map.removeOverLay(drawingLine);
      drawingLine = null;
    }

    // 清除所有覆盖物
    if (map) {
      const overlays = map.getOverlays();
      overlays.forEach((overlay) => {
        map.removeOverLay(overlay);
      });
    }

    // 移除事件监听
    if (map) {
      map.removeEventListener("click", handleMapClick);
      map.removeEventListener("load");
      map.removeEventListener("error");
    }

    // 销毁地图实例
    if (map) {
      // map.destroy();
      map = null;
    }

    // 重置所有状态
    isTracking.value = false; //
    isDrawing.value = false;
    loading.value = false;
    currentPosition.value = null;
    currentPointIndex.value = 0;
    currentTime.value = "";
    totalDistance.value = 0;
    drawnPoints.value = [];
    trackHistory.value = [];
  } catch (error) {
    console.error("清理资源失败:", error);
  }
  // 清理资源
  if (map) {
    map.removeEventListener("load", () => {});
    map.removeEventListener("error", () => {});
    if (drawingClickHandler) {
      map.removeEventListener("click", drawingClickHandler);
    }
    map = null;
  }
  drawingLine = null;
  carTrack = null;
});

//新增

// // 地图缩放处理
// const handleMapZoom = () => {
//     if (map && typeof map.checkResize === 'function') {
//         setTimeout(() => {
//             map.checkResize();
//             if (currentPosition.value) {
//                 map.panTo(new T.LngLat(currentPosition.value.lng, currentPosition.value.lat));
//             }
//         }, 300);
//     }
// };

// 处理地图点击（绘制时）
// const handleMapClick = (e) => {
//     if (!isDrawing.value) return;

//     const point = {
//         lng: e.lnglat.lng,
//         lat: e.lnglat.lat,
//     };

//     drawnPoints.value.push(point);
//     updateDrawingLine();

//     if (drawnPoints.value.length === 1) {
//         createDroneMarker(point);
//     }
// };

// 创建无人机标记
const createDroneMarker = (position) => {
  if (droneMarker) {
    map.removeOverLay(droneMarker);
    droneIconElement = null;
  }

  const droneId = `drone-marker-${Date.now()}`;

  const iconHtml = `
    <div id="${droneId}" style="width: 40px; height: 40px; position: relative;">
      <img src="https://picsum.photos/40/40?drone" 
           alt="无人机" 
           style="width: 100%; height: 100%; object-fit: contain; transform: rotate(0deg);">
    </div>
  `;

  const droneIcon = new T.DivIcon({
    html: iconHtml,
    iconSize: new T.Point(40, 40),
    iconAnchor: new T.Point(20, 20),
  });

  droneMarker = new T.Marker(new T.LngLat(position.lng, position.lat), {
    icon: droneIcon,
  });
  map.addOverLay(droneMarker);

  setTimeout(() => {
    const markerElement = document.getElementById(droneId);
    if (markerElement) {
      droneIconElement = markerElement.querySelector("img");
    }
  }, 100);
};

// 更新绘制中的路线
const updateDrawingLine = () => {
  if (drawingLine) {
    map.removeOverLay(drawingLine);
  }

  if (drawnPoints.value.length < 2) return;

  const points = drawnPoints.value.map(
    (point) => new T.LngLat(point.lng, point.lat)
  );

  drawingLine = new T.Polyline(points, {
    color: "#c0274e",
    weight: 8,
    opacity: 0.8,
    lineStyle: "solid",
  });

  map.addOverLay(drawingLine);
};

// 优化开始飞行函数
const startFlight = () => {
  // 使用查看的路线或绘制的路线，优先使用查看的路线
  // 明确使用查看的路线（如果有）
  const viewedRoutePoints =
    routePoints.value.length >= 2 ? routePoints.value : [];
  const drawnRoutePoints =
    drawnPoints.value.length >= 2 ? drawnPoints.value : [];

  // 优先使用查看的路线
  const usePoints =
    viewedRoutePoints.length >= 2 ? viewedRoutePoints : drawnRoutePoints;

  if (usePoints.length < 2) {
    ElMessage.warning("请至少添加两个点来创建路线");
    return;
  }

  isPlaying.value = true;
  isPaused.value = false;
  currentPositionIndex.value = 0;
  progress.value = 0;
  lastTime = performance.now();

  const startPoint = usePoints[0];
  if (!droneMarker) {
    createDroneMarker(startPoint);
  } else {
    droneMarker.setLngLat(new T.LngLat(startPoint.lng, startPoint.lat));
  }

  animateDrone();
  ElMessage.success("无人机开始飞行");
};
// 暂停飞行
const pauseFlight = () => {
  if (!isPlaying.value || isPaused.value) return;

  isPaused.value = true;
  isPlaying.value = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  ElMessage.info("无人机已暂停");
};

// 继续飞行
const resumeFlight = () => {
  if (!isPaused.value) return;

  isPaused.value = false;
  isPlaying.value = true;
  lastTime = performance.now();

  animateDrone();
  ElMessage.info("无人机继续飞行");
};

// 停止飞行
const stopFlight = () => {
  isPlaying.value = false;
  isPaused.value = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  ElMessage.info("无人机已停止");
};

// 修复：切换绘制模式时的状态处理
const toggleDrawingMode = () => {
  if (isDrawing.value) {
    // 结束绘制时保存路线点
    if (drawnPoints.value.length >= 2) {
      routePoints.value = [...drawnPoints.value];
      updateRouteLine();
    }
    isDrawing.value = false;
    ElMessage.info(`已完成路线绘制，共${drawnPoints.value.length}个点`);
  } else {
    // 开始绘制时停止飞行
    if (isPlaying.value) {
      stopFlight();
    }
    isDrawing.value = true;
    ElMessage.info("请在地图上点击添加路线点，至少需要两个点");
  }
};

// 更新飞行路线显示
const updateRouteLine = () => {
  if (routeLine) {
    map.removeOverLay(routeLine);
  }

  if (routePoints.value.length < 2) return;

  const points = routePoints.value.map(
    (point) => new T.LngLat(point.lng, point.lat)
  );

  routeLine = new T.Polyline(points, {
    color: "#3388ff",
    weight: 5,
    opacity: 0.8,
    lineJoin: "round",
  });

  map.addOverLay(routeLine);
};

// 计算两点之间的实际距离
const calculateDistance = (point1, point2) => {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 距离（米）
};

// 平滑动画实现
const animateDrone = (timestamp) => {
  if (!isPlaying.value || isPaused.value) return;

  // 计算时间差（毫秒）
  if (!timestamp) timestamp = performance.now();
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // 获取当前段的起点和终点（使用绘制或保存的路线）
  const usePoints =
    drawnPoints.value.length >= 2 ? drawnPoints.value : routePoints.value;
  const startPoint = usePoints[currentPositionIndex.value];
  const endPoint = usePoints[currentPositionIndex.value + 1];

  // 到达最后一个点的终点
  if (!endPoint) {
    ElMessage.success("已到达路线终点");
    isPlaying.value = false;
    return;
  }

  // 计算当前段距离和所需时间
  const segmentDistance = calculateDistance(startPoint, endPoint);
  const segmentDuration = (segmentDistance / flightSpeed.value) * 500; // 毫秒
  const progressIncrement = deltaTime / segmentDuration; // 基于时间的进度增量

  // 更新进度
  progress.value += progressIncrement;

  // 段内移动
  if (progress.value < 1) {
    // 线性插值计算当前位置
    const currentLng =
      startPoint.lng + (endPoint.lng - startPoint.lng) * progress.value;
    const currentLat =
      startPoint.lat + (endPoint.lat - startPoint.lat) * progress.value;
    // 更新位置
    droneMarker.setLngLat(new T.LngLat(currentLng, currentLat));

    // 更新朝向
    if (droneIconElement) {
      const angle = calculateAngle(startPoint, {
        lng: currentLng,
        lat: currentLat,
      });
      droneIconElement.style.transform = `rotate(${angle}deg)`;
    }

    // 继续动画
    animationFrameId = requestAnimationFrame(animateDrone);
  } else {
    // 移动到下一段
    progress.value = 0;
    currentPositionIndex.value++;

    // 如果是最后一段的终点，直接定位到终点
    if (currentPositionIndex.value + 1 >= usePoints.length) {
      droneMarker.setLngLat(new T.LngLat(endPoint.lng, endPoint.lat));

      // 更新朝向
      if (droneIconElement) {
        const angle = calculateAngle(startPoint, endPoint);
        droneIconElement.style.transform = `rotate(${angle}deg)`;
      }

      ElMessage.success("已到达路线终点");
      isPlaying.value = false;
      return;
    }

    // 继续下一段动画
    animationFrameId = requestAnimationFrame(animateDrone);
  }
};

// 计算两点之间的角度
const calculateAngle = (start, end) => {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (angle + 90) % 360;
};

// 修复：增强版绘制按钮处理
const drawBotton = () => {
  if (!map) {
    ElMessage.error("地图未初始化，无法绘制");
    console.error("地图实例(map)为null，请检查地图初始化");
    return;
  }

  if (isDrawing.value) {
    ElMessage.warning("当前已处于绘制模式");
    return;
  }

  if (isViewing.value) {
    ElMessage.warning("请先结束查看模式");
    return;
  }

  // 停止当前飞行
  if (isPlaying.value) {
    stopFlight();
    ElMessage.info("已停止飞行并进入绘制模式");
  }

  clearOverlays();
  drawnPoints.value = [];
  isDrawing.value = true;

  // 创建绘制线
  drawingLine = new T.Polyline([], {
    color: "#c0274e",
    weight: 8,
    opacity: 0.8,
    lineStyle: "solid",
  });
  map.addOverLay(drawingLine);

  ElMessage.info("请在地图上点击添加航点");

  // 绑定点击事件（带错误处理）
  try {
    drawingClickHandler = (e) => {
      handleMapClick(e);
    };
    map.addEventListener("click", drawingClickHandler);
    console.log("绘制模式点击事件已绑定");
  } catch (error) {
    console.error("绑定点击事件失败:", error);
    ElMessage.error("绑定点击事件失败，请刷新页面重试");
  }
};

const addPointMarker = (point, index, totalPoints) => {
  console.log("添加标记点，坐标:", point);

  if (!map) {
    console.error("地图实例(map)为null，无法添加标记");
    return;
  }

  // 统一标记点样式配置
  const MARKER_STYLES = {
    START: { className: "marker start", color: "#67c23a", label: "S" },
    END: { className: "marker end", color: "#f56c6c", label: "E" },
    MIDDLE: {
      className: "marker middle",
      color: "#409EFF",
      label: (index + 1).toString(),
    },
  };

  const markerStyle =
    index === 0
      ? MARKER_STYLES.START
      : index === totalPoints - 1
      ? MARKER_STYLES.END
      : MARKER_STYLES.MIDDLE;

  // 确保所有标记点使用统一的z-index
  const markerHtml = `<div class="${markerStyle.className}" style="z-index: 1000;">${markerStyle.label}</div>`;

  const marker = new T.Marker(new T.LngLat(point.lng, point.lat), {
    icon: new T.DivIcon({
      html: markerHtml,
      iconSize: new T.Point(40, 40),
      iconAnchor: new T.Point(20, 20),
    }),
  });

  // 确保样式只添加一次
  if (!document.getElementById("route-markers-style")) {
    const style = document.createElement("style");
    style.id = "route-markers-style";
    style.innerHTML = `
        .marker {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 16px;
            z-index: 1000; /* 统一设置z-index */
        }
        .start { background-color: #67c23a; }
        .end { background-color: #f56c6c; }
        .middle { background-color: #409EFF; }
    `;
    document.head.appendChild(style);
  }

  marker.isRouteMarker = true;
  map.addOverLay(marker);
};

// 在调用addPointMarker的地方，传入当前数组长度
drawnPoints.value.forEach((point, index) => {
  addPointMarker(point, index, drawnPoints.value.length);
});
// 清除标记点
const clearMarkers = () => {
  if (!map) return;

  map.getOverlays().forEach((overlay) => {
    if (overlay instanceof T.Marker && overlay.isRouteMarker) {
      map.removeOverLay(overlay);
    }
  });
};
// 完成绘制

const completeBotton = () => {
  if (!isDrawing.value || drawnPoints.value.length < 2) {
    ElMessage.warning("至少需要2个航点才能形成路线");
    return;
  }

  // 直接使用绘制时已转换的坐标（无需再次转换）
  const path = drawnPoints.value.map(
    (point) => new T.LngLat(point.lng, point.lat)
  );

  // 清除之前的覆盖物
  clearOverlays();

  // 创建线对象（使用统一坐标）
  const polyline = new T.Polyline(path, {
    color: "#409eff",
    weight: 8,
    opacity: 0.8,
    lineStyle: "solid",
    zIndex: 500, // 路线线层级低于标记点
  });
  map.addOverLay(polyline);

  // 调整地图视野显示所有点
  const bounds = new T.LngLatBounds();
  path.forEach((lnglat) => bounds.extend(lnglat));
  map.setViewport(bounds); // 天地图推荐的视野调整方法
  // 关键修改：查看路线后设置为当前飞行路线
  routePoints.value = route.points;
  console.log("查看路线后routePoints:", routePoints.value);
  console.log("路线点数量:", routePoints.value.length);
  updateRouteLine();
  // 新增：检查路线点数量
  if (routePoints.value.length < 2) {
    ElMessage.warning("路线点数量不足，无法飞行");
    return;
  }
  // 清除绘制状态
  isDrawing.value = false;
  map.removeEventListener("click", drawingClickHandler);
  drawingClickHandler = null;
  saveRouteBot.value = true;
  ElMessage.success("路线绘制完成请保存");
};
// 取消绘制
const cancelBotton = () => {
  if (!isDrawing.value) return;

  // 清除绘制状态
  isDrawing.value = false;
  map.removeEventListener("click", drawingClickHandler);
  drawingClickHandler = null;
  clearOverlays();
  drawnPoints.value = [];
  activeRouteId.value = null;
  ElMessage.info("已取消绘制");
};
// 完成绘制
const saveRoute2 = () => {
  if (!newRouteName.value) {
    ElMessage.warning("请输入路线名称");
    return;
  }
  if (drawnPoints.value.length < 2) {
    ElMessage.warning("至少需要2个航点才能保存路线");
    return;
  }
  // 创建新路线
  const newRoute = {
    id: ++currentRouteId,
    name: newRouteName.value,
    points: drawnPoints.value,
  };

  // 添加到路线列表
  console.log(routes.value, "routes");
  routes.value.push(newRoute);
  // 关闭对话框并清除状态
  saveDialogVisible.value = false;
  newRouteName.value = "";
  clearOverlays();
  ElMessage.success("路线保存成功");
};
//保存路线
const saveRoute3 = async () => {
  if (!hasTrack.value) {
    ElMessage.warning("没有可保存的路线");
    return;
  }
  try {
    dialogTitle.value = "保存路线";
    savingRoute.value = true;
    // 获取当前路线的点
    const routePoints =
      fixedTrackPoints.length > 0 ? fixedTrackPoints : drawnPoints.value;
    routePoints2.value = routePoints;
    // 获取当前位置作为home_pos
    let homePosition = null;
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        homePosition = {
          lat: position.coords.latitude,
          log: position.coords.longitude,
          alt: 0,
        };
      } catch (error) {
        console.warn("获取当前位置失败:", error);
        // 如果获取当前位置失败，使用第一个点作为home_pos
        homePosition = {
          lat: routePoints[0].lat,
          log: routePoints[0].lng,
          alt: 0,
        };
      }
    }
    saveRouteDialogVisible.value = true;
    savingRoute.value = false;
    isDrawing.value = false;
    saveRouteBot.value = false;
    // 清除现有覆盖物和状态 saveRouteForm
    clearOverlays();
    drawnPoints.value = [];
    // isDrawing.value = true;
    // 新建路线时，初始化独立的points数组
    saveRouteForm.value = {
      name: "",
      description: "",
      points: [], // 全新空数组，后续操作仅影响此数组
    };

    // 记录初始状态（用于关闭时清空）
    originalSaveRouteForm.value = JSON.parse(
      JSON.stringify(saveRouteForm.value)
    );
    // 打开对话框
    dialogTitle.value = "保存路线";
    saveRouteDialogVisible.value = true;
  } catch (error) {
    savingRoute.value = false;
    isDrawing.value = false;
  }
};
function convertPoints(points) {
  // 1. 转换 points 数组（lng → lon）
  const convertedPoints = points.map((point) => ({
    lat: point.lat,
    lon: point.lng, // 重命名 lng 为 lon
    alt: point.alt,
  }));

  // 2. 设置 home_pos（使用第一个点）
  const homePos =
    points.length > 0
      ? {
          lat: points[0].lat,
          lon: points[0].lng,
          alt: 0, // home_pos 的 alt 固定为 0
        }
      : { lat: 0, lon: 0, alt: 0 };

  // 3. 构建完整对象并序列化为 JSON 字符串
  const result = {
    routeData: {
      type: "mission",
      points: convertedPoints,
      home_pos: homePos,
    },
  };

  return JSON.stringify(result);
}
// 添加行处理方法
const handleAddRow = (index, item) => {
  console.log("当前行数据:", item);
  console.log("当前索引:", index);

  // 在当前行后面插入新行，复制当前行数据作为基础
  // const newPoint = { ...item };
  // 创建空白数据对象（不复制当前行数据）
  const newPoint = {
    alt: "", // 空白高度
    lng: "", // 空白经度
    lat: "", // 空白纬度
  };
  saveRouteForm.value.points.splice(index + 1, 0, newPoint);
  ElMessage.info(`在第${index + 1}行后添加了新行`);
};

// 删除行处理方法
const handleDeleteRow = (index, item) => {
  console.log("要删除的行数据:", item);
  console.log("要删除的索引:", index);

  // 至少保留一行
  if (saveRouteForm.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }

  saveRouteForm.value.points.splice(index, 1);
  ElMessage.info(`已删除第${index + 1}行`);
};
// 确认保存路线
const confirmSaveRoute = async () => {
  console.log(saveRouteForm.value, "saveRouteForm.value");

  saveRouteFormRef.value.validate(async (valid) => {
    console.log(valid);
    if (valid) {
      console.log(dialogTitle.value);
      if (dialogTitle.value === "保存路线") {
        try {
          const routeData = {
            type: "mission",
            // 添加路线名称
            points: routePoints2.value.map((point) => ({
              lat: point.lat,
              lng: point.lng,
              alt: 30, // 默认高度30米
            })),
          };
          (newArr.value = {
            name: saveRouteForm.value.name,
            description: saveRouteForm.value.description,
            points: routeData.points,
          }),
            console.log(newArr.value);
          const pointsJson = convertPoints(newArr.value.points);
          console.log(pointsJson, " sss");
          let params = {
            name: newArr.value.name,
            description: newArr.value.description,
            points: pointsJson,
          };
          let res = await addRoute(params);
          if (res.code === 200) {
            saveRouteDialogVisible.value = false;
            ElMessage.success("路线存成功");
            //航线列表
            await routeList();
          }
        } catch (error) {
          console.error("表单验证失败", error);
        }
      } else if (dialogTitle.value === "编辑路线") {
        console.log(listRouteEditId, "v");
        newArr.value = {
          name: saveRouteForm.value.name,
          description: saveRouteForm.value.description,
          points: saveRouteForm.value.points,
        };
        const pointsJson = convertPoints(newArr.value.points);
        let params = {
          id: listRouteEditId.value,
          description: saveRouteForm.value.description,
          name: saveRouteForm.value.name,
          pointsJson: pointsJson,
        };
        console.log("params", params);

        let res = await updateMission(params);
        if (res.code === 200) {
          saveRouteDialogVisible.value = false;
          ElMessage.success("编辑成功");
          //航线列表
          await routeList();
        }
        console.log(params, "===");
      }
    }
  });
};
const routeEdit = (route) => {
  console.log(route, "待编辑的原始路线数据");

  // 关键：深拷贝原始数据（避免修改表单时影响原始route.points）
  const copiedPoints = JSON.parse(JSON.stringify(route.points));

  // 赋值拷贝后的数据到表单，后续添加/删除仅影响此拷贝数据
  saveRouteForm.value = {
    name: route.name,
    description: route.description,
    points: copiedPoints, // 用深拷贝的数据，而非原始引用
  };

  // 记录原始数据快照（用于关闭对话框时恢复，可选）
  originalSaveRouteForm.value = JSON.parse(JSON.stringify(saveRouteForm.value));

  // 打开对话框
  dialogTitle.value = "编辑路线";
  saveRouteDialogVisible.value = true;
  // console.log(route)
  listRouteEditId.value = route.id;
  // saveRouteDialogVisible.value = true;
  // dialogTitle.value = "编辑路线";
  // saveRouteForm.value.name = route.name;
  // saveRouteForm.value.description = route.description;
  // saveRouteForm.value.points = route.points;
};
const viewRoute = (route) => {
  if (!map) {
    ElMessage.error("地图未初始化，无法查看路线");
    return;
  }

  try {
    // 清除现有覆盖物
    clearOverlays();
    // 记录当前激活的航线ID
    activeRouteId.value = route.id;
    // 确保路线有点数据
    if (!route?.points || route.points.length < 2) {
      ElMessage.warning("路线点数量不足，无法显示");
      return;
    }
    routePoints.value = [...route.points];
    // 绘制路线
    const path = route.points.map((p) => new T.LngLat(p.lng, p.lat));
    const polyline = new T.Polyline(path, {
      color: "#409eff",
      weight: 8,
      opacity: 0.8,
      lineStyle: "solid",
      zIndex: 500, // 路线线层级低于标记点
    });
    map.addOverLay(polyline);

    // 添加标记点
    route.points.forEach((point, index) => {
      addPointMarker(point, index, route.points.length);
    });

    // 计算边界范围
    let minLng = Infinity,
      minLat = Infinity;
    let maxLng = -Infinity,
      maxLat = -Infinity;

    // 遍历所有点找到最大最小经纬度
    path.forEach((lnglat) => {
      minLng = Math.min(minLng, lnglat.lng);
      minLat = Math.min(minLat, lnglat.lat);
      maxLng = Math.max(maxLng, lnglat.lng);
      maxLat = Math.max(maxLat, lnglat.lat);
    });

    // 计算中心点
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerPoint = new T.LngLat(centerLng, centerLat);

    // 计算经纬度差（路线大小）
    const lngDiff = maxLng - minLng;
    const latDiff = maxLat - minLat;

    // 获取地图容器的宽高比例，用于精确计算
    const mapContainer = document.getElementById("mapContainer"); // 假设地图容器ID为mapContainer
    const aspectRatio = mapContainer
      ? mapContainer.clientWidth / mapContainer.clientHeight
      : 1.6; // 默认宽高比

    // 动态缓冲系数：根据路线大小和地图比例调整
    const baseBuffer = 0.01;
    const buffer = Math.max(
      baseBuffer,
      Math.min(lngDiff * 0.1, latDiff * 0.1) // 缓冲不超过路线大小的10%
    );

    // 应用缓冲
    const bufferedMinLng = minLng - buffer;
    const bufferedMaxLng = maxLng + buffer;
    const bufferedMinLat = minLat - buffer;
    const bufferedMaxLat = maxLat + buffer;
    console.log(bufferedMinLng);
    console.log(bufferedMaxLng);
    console.log(bufferedMinLng);
    console.log(bufferedMinLng);

    // 重新计算带缓冲的经纬度差
    const bufferedLngDiff = bufferedMaxLng - bufferedMinLng;
    const bufferedLatDiff = bufferedMaxLat - bufferedMinLat;

    // 优化的缩放级别计算：确保完整显示在可视区域内
    const getZoomByBounds = (lngDiff, latDiff, aspectRatio) => {
      console.log("getZoomByBounds", lngDiff, latDiff, aspectRatio);
      // 根据地图宽高比调整经纬度差的权重
      const adjustedLngDiff = lngDiff * aspectRatio;
      console.log(adjustedLngDiff, "1");

      const effectiveDiff = Math.max(adjustedLngDiff, latDiff);
      console.log(effectiveDiff, "2");

      // 天地图缩放级别：1（最大范围）- 18（最小范围）
      const zoomLevels = [
        { max: 1000, level: 1 },
        { max: 500, level: 2 },
        { max: 200, level: 3 },
        { max: 100, level: 4 },
        { max: 50, level: 5 },
        { max: 20, level: 6 },
        { max: 10, level: 7 },
        { max: 5, level: 8 },
        { max: 2, level: 9 },
        { max: 1, level: 10 },
        { max: 0.5, level: 11 },
        { max: 0.2, level: 12 },
        { max: 0.1, level: 13 },
        { max: 0.05, level: 14 },
        { max: 0.02, level: 15 },
        { max: 0.01, level: 16 },
        { max: 0.005, level: 17 },
        { max: 0, level: 18 }, // 所有更小的范围都用最大缩放级别
      ];

      // 找到最合适的缩放级别
      for (const { max, level } of zoomLevels) {
        if (effectiveDiff > max) {
          return level;
        }
      }

      return 18; // 默认最大级别
    };

    // 获取计算后的缩放级别
    const zoomLevel = getZoomByBounds(
      bufferedLngDiff,
      bufferedLatDiff,
      aspectRatio
    );

    // 确保缩放级别在有效范围内
    const safeZoomLevel = Math.max(14, Math.min(18, zoomLevel));

    // 设置地图中心点和缩放级别
    map.panTo(centerPoint);
    map.setZoom(safeZoomLevel);

    // 强制刷新地图
    map.checkResize();

    ElMessage.success(
      `已显示路线: ${route.name}（缩放级别: ${safeZoomLevel}）`
    );
  } catch (error) {
    console.error("查看路线时发生错误:", error);
    ElMessage.error("查看路线失败，请重试");
  }
};
//编辑航线
const editAirline = (value, index) => {
  console.log(value, index, "editAirline");
  // //航点序号
  // waypointNumber.value = index;
  // //航线经纬度
  // waypointLongLat.value = value.lng + "," + value.lat;
  formData.value.waypointNumber = index;
  formData.value.routeLongitude = value.lng;
  formData.value.routeLatitude = value.lat;
  waypointSettingVisible.value = true;
};
// 删除路线
const deleteRoute = (index) => {
  deletingRouteIndex.value = index;
  deleteDialogVisible.value = true;
};

// 确认删除路线
const confirmDelete = async (value) => {
  const index = deletingRouteIndex.value;
  let res = await deleteManageRoute(index.id);
  console.log(res, "====");

  if (res.code === 200) {
    deleteDialogVisible.value = false;
    activeRouteId.value = null;
    ElMessage.success("删除成功");
    clearOverlays();
    //航线列表
    await routeList();
  }
};

// 清除所有覆盖物
const clearOverlays = () => {
  if (map) {
    map.clearOverLays();
    if (drawingLine) {
      map.removeOverLay(drawingLine);
      drawingLine = null;
    }
    if (carTrack) {
      carTrack.stop();
      map.removeOverLay(carTrack);
      carTrack = null;
    }
  }
};

// 清空所有路线
const clearAllRoutes = () => {
  ElMessageBox.confirm("确定要清空所有路线吗？此操作不可恢复。", "警告", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      routes.value.length = 0;
      clearOverlays();
      isViewing.value = false;
      ElMessage.success("已清空所有路线");
    })
    .catch(() => {
      ElMessage.info("已取消清空");
    });
};
// 航线编辑
const editWaypoint = () => {
  console.log(formData.value);
};
// 获取当前位置
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("浏览器不支持地理位置API"));
    }

    // 请求用户授权并获取位置
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        // 处理错误情况
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("用户拒绝了位置请求"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("位置信息不可用"));
            break;
          case error.TIMEOUT:
            reject(new Error("获取位置超时"));
            break;
          default:
            reject(new Error("未知错误"));
        }
      },
      {
        enableHighAccuracy: true, // 高精度模式
        timeout: 10000, // 超时时间10秒
        maximumAge: 0, // 不使用缓存位置
      }
    );
  });
};
// 防抖函数（保持不变）
const debouncedSearch = debounce((keyword) => {
  console.log("[debouncedSearch] 防抖后执行，关键词：", keyword);
  if (keyword && keyword.length >= 1) {
    searchLocation(keyword);
  } else {
    options.value = [];
  }
}, 500);

const handleInput = (param) => {
  // 1. 区分参数是事件对象还是直接值
  let inputValue;
  if (param instanceof InputEvent) {
    // 若为事件对象，从 target.value 获取输入值
    inputValue = param.target.value.trim();
  } else {
    // 若为直接值，直接转换为字符串
    inputValue = String(param).trim();
  }

  // 2. 验证并输出日志
  console.log("当前输入完整内容：", inputValue);
  queryLocation.value = inputValue;

  // 3. 触发防抖搜索
  debouncedSearch(inputValue);
};
// 处理下拉选择事件
const handleSelectChange = (value) => {
  if (!value || !options.value.length) return;

  const selectedItem = options.value.find((item) => item.value === value);
  if (!selectedItem || !selectedItem.location) {
    ElMessage.warning("未找到该地点的坐标信息");
    return;
  }

  // 搜索结果的location已经是转换后的WGS84坐标（无需再次转换）
  const [lng, lat] = selectedItem.location.split(",").map(Number);
  if (!lng || !lat) {
    ElMessage.error("坐标格式错误");
    return;
  }

  // 直接添加转换后的坐标（与手动绘制的坐标系统统一）
  drawnPoints.value.push({
    lng,
    lat,
    isFromApi: true, // 标记为接口获取的点（已转换为WGS84）
  });

  // 绘制标记点（使用统一坐标）
  drawSelectedMarker(lng, lat, selectedItem.label);
};
// 核心添加：GCJ-02转WGS84坐标转换函数
// 替换原有的gcj02towgs84函数，优化精度
// 替换原有的gcj02towgs84函数，精准适配郑州地区
const gcj02towgs84 = (lng, lat) => {
  const pi = 3.1415926535897932384626;
  const a = 6378245.0; // 地球半径
  const ee = 0.00669342162296594323; // 偏心率平方

  // 郑州区域判定（东经112.4-114.6，北纬33.5-35.5）
  const isZhengzhouArea =
    lng > 112.4 && lng < 114.6 && lat > 33.5 && lat < 35.5;

  // 非国内区域不偏移
  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }

  // 基础转换计算
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * pi;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);

  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * pi);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * pi);
  const mgLat = lat + dLat;
  const mgLng = lng + dLng;

  // 基础转换结果
  let baseLng = lng * 2 - mgLng;
  let baseLat = lat * 2 - mgLat;

  // 郑州区域二次修正（核心优化）
  if (isZhengzhouArea) {
    // 针对郑州地区的偏移特性微调（经纬度修正值通过大量样本校准）
    baseLng -= 0.00035; // 经度额外西偏修正
    baseLat += 0.0002; // 纬度额外北偏修正
  }

  // 保留6位小数精度（约10厘米级）
  return [Number(baseLng.toFixed(6)), Number(baseLat.toFixed(6))];
};

// 辅助函数：判断是否在国内，不在国内则不做偏移
const outOfChina = (lng, lat) => {
  return (
    lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271 || false
  );
};

// 辅助函数：纬度转换
const transformLat = (x, y) => {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
};

// 辅助函数：经度转换
const transformLng = (x, y) => {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
};

const handleInputRoute = async (param) => {
  let inputValue;
  if (param instanceof InputEvent) {
    inputValue = param.target.value.trim();
  } else {
    inputValue = String(param).trim();
  }
  console.log("当前输入完整内容：", inputValue);
  await routeList(inputValue);
};
// 搜索逻辑（增强类型安全）
const searchLocation = async (keyword) => {
  // 强制转为字符串并去空格（解决trim报错问题）
  const safeKeyword = String(keyword).trim();

  if (!safeKeyword) {
    options.value = []; // 空输入时清空下拉框
    return;
  }

  try {
    // 获取当前位置（带容错处理）
    let position;
    try {
      position = await getCurrentPosition();
    } catch (err) {
      ElMessage.warning(`定位失败，使用默认位置: ${err.message}`);
      // 定位失败时使用默认坐标（例如郑州）
      position = { latitude: 34.74769, longitude: 113.65337 };
    }
    // 发起搜索请求
    const url = `https://digital-elevation.djigate.com/amap-proxy/e9faf6/v3/assistant/inputtips?keywords=${safeKeyword}&location=${position.longitude},${position.latitude}&language=zh-CN`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.tips || data.tips.length === 0) {
      ElMessage.info("未找到匹配地点");
      options.value = [];
      return;
    }
    console.log(data, "datadata");
    // 1. 先过滤掉 location 无效的条目
    const validTips = data.tips.filter((item) => {
      // 校验 location 是否为有效的字符串（非空数组、非空字符串）
      // 排除 location 是数组（如 []）或空字符串的情况
      return typeof item.location === "string" && item.location.trim() !== "";
    });
    // 2. 若过滤后无有效数据，直接清空 options
    if (validTips.length === 0) {
      ElMessage.warning("未找到有效的地点坐标");
      options.value = [];
      return;
    }
    // 处理搜索结果（坐标转换）
    options.value = validTips.map((item) => {
      const [gcjLng, gcjLat] = item?.location?.split(",").map(Number);
      const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);

      return {
        value: item.id,
        label: item.name, // 下拉框显示的文本
        location: `${wgsLng},${wgsLat}`,
        originalLocation: item.location,
      };
    });
  } catch (error) {
    // ElMessage.error("搜索失败，请检查网络");
    console.error("搜索错误:", error);
    // options.value = []; // 出错时清空选项
  }
};
// 状态变量：保存当前搜索选中的标记，用于清除旧标记
const searchMarker = ref(null);

// 绘制搜索选中的标记点
const drawSelectedMarker = (lng, lat, name) => {
  // 1. 清除上一个搜索标记（避免叠加）
  if (searchMarker.value) {
    map.removeOverLay(searchMarker.value);
  }

  // 2. 验证地图实例是否存在
  if (!map || !map.addOverLay) {
    ElMessage.error("地图未初始化完成");
    return;
  }

  // 3. 验证坐标有效性
  if (isNaN(lng) || isNaN(lat)) {
    ElMessage.error("坐标解析失败");
    return;
  }

  // 4. 创建天地图坐标点
  const point = new T.LngLat(lng, lat);

  // 5. 地图定位到标记点（修复setCenter问题，使用天地图正确方法）
  map.panTo(point); // 平滑移动到点
  map.setZoom(16); // 放大到合适级别

  ElMessage.success(`已标记地点：${name}`);
};
//航点设置弹窗--数据清空
watch(waypointSettingVisible, (newVale) => {
  if (newVale === false) {
    formData.value = {
      waypointNumber: "", //航点序号
      whetherDisplay: "1", //是否使展示航线参数
      routeLongitude: "", //航线经度
      routeLatitude: "", //航线纬度
      residenceTime: "", //停留时间
      turningRadius: "", //航向角
      headingAngle: "", //航线纬度
      flightAltitude: "", //航点飞行高度
    };
  }
});
//编辑路线弹窗--数据清空
watch(saveRouteDialogVisible, (newvalue) => {
  if (!newvalue) {
    saveRouteForm.value = {
      name: "",
      description: "",
      points: [],
    };
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

.header {
  padding: 16px 24px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  color: #303133;
  font-weight: 600;
}

.main-content {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
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

.map-wrapper {
  z-index: 1;
  /* 地图容器层级 */
}

.floating-panel {
  z-index: 1000;
  /* 控制面板层级，与标记点相同或更高 */
}

/* 浮动面板样式 */
.floating-panel {
  position: absolute;
  /* top: 5px;
  left: 5px; */
  z-index: 1000;
  width: 360px;
  max-height: calc(100vh - 65px);
  /* overflow-y: auto; */
  /* background: transparent; */
}

/* 航线列表滚动容器 */
.route-list-container {
  /* 限定高度（根据面板高度调整，预留上方操作区域空间） */
  max-height: calc(100vh - 400px);
  /* 减去顶部操作区和面板边框的高度 */
  overflow-y: auto;
  /* 仅在内容超出时显示垂直滚动条 */
  padding-right: 6px;
  /* 避免滚动条遮挡内容 */
}

/* 美化滚动条样式 */
.route-list-container::-webkit-scrollbar {
  width: 6px;
  /* 滚动条宽度 */
}

.route-list-container::-webkit-scrollbar-track {
  background: rgba(80, 80, 80, 0.1);
  /* 滚动条轨道颜色 */
  border-radius: 3px;
}

.route-list-container::-webkit-scrollbar-thumb {
  background: rgba(88, 130, 179, 0.5);
  /* 滚动条滑块颜色 */
  border-radius: 3px;
}

.route-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(88, 130, 179, 0.8);
  /* 滚动条滑块 hover 颜色 */
}

.control-card {
  background: rgba(255, 255, 255, 0.95);
  /* backdrop-filter: blur(10px); */
  /* border-radius: 8px; */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.routeOperation {
  background-color: #2e3649db;
  color: #fff;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.routeOperation-box {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.routeOperation-box-view {
  color: #67c23a;
  cursor: pointer;
  margin-right: 12px;
}

.routeOperation-box-edit {
  color: #1677ff;
  cursor: pointer;
  margin-right: 12px;
}

.routeOperation-box-delete {
  color: red;
  cursor: pointer;
}

.routeInformation {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(88 130 179) rgba(80, 80, 80, 0.4);
  margin-top: 16px;
}

.routeInformation-list {
  display: flex;
  justify-content: space-between;
  background-color: #50505066;
  padding: 12px;
  margin-top: 16px;
}

.routeInformation-list:first-child {
  margin-top: 0;
}

.routeInformation-list-edit {
  color: #1677ff;
  cursor: pointer;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  height: 55px;
}

.control-group {
  /* padding: 16px 0; */
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* 按钮容器使用弹性布局 */
.button-group-container {
  display: flex;
  width: 100%;
  /* 占满父容器宽度 */
  gap: 4px;
  /* 按钮间最小间距 */
}

/* 按钮自适应样式 */
.button-group-container :deep(.el-button) {
  flex: 1;
  /* 平均分配宽度 */
  min-width: 60px;
  /* 最小宽度，确保按钮不会过小 */
  padding: clamp(4px, 2vw, 8px);
  /* 内边距随屏幕缩放 */
  font-size: clamp(12px, 1.5vw, 14px);
  /* 字体大小自适应 */
  white-space: nowrap;
  /* 禁止文字换行 */
  overflow: hidden;
  /* 超出部分隐藏 */
  text-overflow: ellipsis;
  /* 文字溢出显示省略号 */
}

/* 图标与文字间距优化 */
.button-group-container :deep(.el-button .el-icon) {
  margin-right: 2px;
  /* 缩小图标间距 */
  font-size: clamp(12px, 1.5vw, 14px);
  /* 图标大小同步缩放 */
}

.control-group:last-child {
  border-bottom: none;
}

.group-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clear-button {
  width: 100%;
  margin-top: 8px;
}

.save-button {
  margin-top: 12px;
  width: 100%;
}

/* 滚动条样式 */
.floating-panel::-webkit-scrollbar {
  width: 6px;
}

.floating-panel::-webkit-scrollbar-track {
  background: transparent;
}

.floating-panel::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

.floating-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.5);
}

.marker {
  /* 其他样式保持不变 */
  z-index: 1000;
  /* 统一层级，确保高于地图但低于其他UI元素 */
}

.start,
.end,
.middle {
  /* 颜色等样式保持不变 */
  z-index: 1000;
  /* 明确设置层级，确保一致性 */
}

/* 确保标记显示在最上层 */
:deep(.t-map) {
  z-index: 1;
  /* 地图容器层级 */
}

:deep(.el-card) {
  border: none;
}

:deep(.el-button-group) {
  gap: 8px;
  display: flex;
  flex-wrap: wrap;
}

:deep(.route-search .el-input__wrapper) {
  background-color: rgba(0, 40, 90, 0.5);
}

:deep(.route-search .el-input__inner) {
  color: #fff;
}

.el-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}

.el-radio-group {
  display: flex;
  gap: 20px;
}

:deep(.el-form-item__label) {
  justify-content: start;
}

:deep(.tdt-div-icon) {
  border: none;
  background: none;
}

:deep(.save-route .el-form-item__label) {
  width: 60px !important;
}

:deep(.save-route .el-form-item__content) {
  margin-right: 12px !important;
}

.operation-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.add-btn {
  background-color: #409eff;
  color: white;
}

.add-btn:hover {
  background-color: #66b1ff;
}

.delete-btn {
  background-color: #f56c6c;
  color: white;
}

.delete-btn:hover {
  background-color: #f78989;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 在子组件的样式中添加 */
.map-container,
.map-wrapper {
  width: 100% !important;
  overflow: hidden !important;
}

:deep(.el-card__header) {
  padding-top: 0px;
}

@media (max-width: 1200px) {
  .floating-panel {
    width: 320px;
  }
}

@media (max-width: 1000px) {
  .floating-panel {
    width: 300px;
  }
}

@media (max-width: 800px) {
  .floating-panel {
    width: 280px;
  }

  .button-group-container {
    gap: 0;
  }
}

/* 超小屏幕下的极限适配 */
@media screen and (max-width: 800px) {
  .button-group-container :deep(.el-button span:not(.el-icon)) {
    /* 进一步缩短文字，只保留核心字 */
    font-size: 0;
  }

  .button-group-container :deep(.el-button span:not(.el-icon))::after {
    font-size: 12px;
    /* 重新设置伪元素字体大小 */
  }

  /* 为每个按钮设置简化文字 */
  .button-group-container
    :deep(.el-button:nth-child(1) span:not(.el-icon))::after {
    content: "绘";
  }

  .button-group-container
    :deep(.el-button:nth-child(2) span:not(.el-icon))::after {
    content: "完";
  }

  .button-group-container
    :deep(.el-button:nth-child(3) span:not(.el-icon))::after {
    content: "取";
  }
}
</style>
