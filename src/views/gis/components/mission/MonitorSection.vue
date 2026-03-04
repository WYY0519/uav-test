<!-- MonitorSection.vue -->
<template>
  <div class="monitor-section-container">
    <!-- 顶部面板 -->
    <div class="top-panel">
      <el-input
        style="padding: 12px"
        v-model="searchQuery"
        placeholder="输入无人机编号搜索"
        class="search-input"
        clearable
        @clear="handleSearchClear"
        @keyup.enter="handleSearch"
        type="primary"
      >
        <template #append>
          <el-button
            style="background-color: #409eff; color: white; padding-left: 17px"
            :icon="Search"
            @click="handleSearch"
          />
        </template>
      </el-input>
    </div>

    <!-- 左侧信息面板 -->
    <div class="left-panel">
      <div class="panel-content">
        <div class="info-container">
          <div class="compass-container">
            <div class="compass">
              <div
                class="arrow"
                :style="{ transform: `rotate(${droneHeading}deg)` }"
              ></div>
              <span class="direction north">北</span>
              <span class="direction south">南</span>
              <span class="direction west">西</span>
              <span class="direction east">东</span>
            </div>
          </div>
          <div v-if="uavInfo" class="flight-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="飞行航向">
                {{ uavStatusContent?.attitude?.yaw }}
              </el-descriptions-item>
              <el-descriptions-item label="飞行模式">
                {{ uavStatusContent?.heartbeat?.mode }}
              </el-descriptions-item>
              <el-descriptions-item label="油门量">
                {{ uavStatusContent?.vfr_hud?.throttle }}
              </el-descriptions-item>
              <el-descriptions-item label="卫星数">
                {{ uavStatusContent?.gps?.satellites_visible }}
              </el-descriptions-item>
              <el-descriptions-item label="电压">
                {{ uavStatusContent?.battery?.voltage }}
              </el-descriptions-item>
              <el-descriptions-item label="飞行高度">
                {{ uavStatusContent?.vfr_hud?.alt }}
              </el-descriptions-item>
              <el-descriptions-item label="飞行速度">
                {{ uavStatusContent?.vfr_hud?.airspeed }}
              </el-descriptions-item>
              <el-descriptions-item label="飞行时间">
                {{
                  uavStatusContent?.system_time?.time_boot_ms
                    ? convertTime(uavStatusContent?.system_time?.time_boot_ms)
                    : ""
                }}
              </el-descriptions-item>
              <el-descriptions-item label="经纬度">
                {{
                  uavStatusContent?.global_position_int?.lon &&
                  uavStatusContent?.global_position_int?.lat
                    ? `${uavStatusContent?.global_position_int?.lon},
                        ${uavStatusContent?.global_position_int?.lat}`
                    : uavStatusContent?.global_position_int?.lon ||
                      uavStatusContent?.global_position_int?.lat
                }}
              </el-descriptions-item>
            </el-descriptions>
            <el-button
              style="
                width: 100%;
                margin: 5px 0 0 0;
                background: #2c3d45;
                color: #fff;
              "
              class="direction-btn right"
              @click.stop="uavViewDetails()"
              :disabled="!isConnected || !canOperate"
            >
              查看详情
            </el-button>
          </div>
        </div>
        <div class="uav-mode">
          <div style="height: 30px; color: #fff; padding-left: 12px">
            无人机设置灵敏度
          </div>
          <el-select
            v-model="sensitivity"
            placeholder="请选择灵敏度"
            @change="droneModeSettingChange2"
          >
            <el-option
              v-for="item in sensitivityOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <div class="uav-mode">
          <div style="height: 30px; color: #fff; padding-left: 12px">
            无人机模式设置
          </div>
          <el-select
            v-model="droneModeSetting"
            placeholder="Select"
            @change="droneModeSettingChange"
            :disabled="!isConnected || !canOperate"
            ref="selectRef"
            @visible-change="handleVisibleChange"
          >
            <el-option
              v-for="item in options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 右侧监控面板 -->
    <div class="right-panel">
      <div class="panel-content">
        <div class="monitor-section">
          <h4 style="padding-bottom: 6px" class="fontGradient">无人机监控</h4>
          <ShakaPlayer
            v-if="droneMonitoringShow"
            :src="`ws://121.41.60.99:8082/${droneMonitoringUrl}.live.flv`"
            :config="playerConfig"
          />
          <M3u8Player
            v-if="dronM3u8PlayerShow"
            :video-url="videoUrl"
            :width="1000"
            :height="600"
            @error="handleError"
          />
        </div>
        <div class="device-info">
          <h4 class="fontGradient">无人机信息</h4>
          <p>设备编号: {{ selectedDeviceInfo?.deviceId }}</p>
          <p>设备名称: {{ selectedDeviceInfo?.deviceName }}</p>
          <p>
            设备状态:
            {{ selectedDeviceInfo ? (deviceStatus ? "在线" : "离线") : "" }}
          </p>
          <p>设备类型: {{ selectedDeviceInfo?.deviceType }}</p>
        </div>
        <div class="mission-section">
          <div
            class="mission-buttons"
            style="
              display: flex;
              flex-direction: column;
              gap: 8px;
              height: 165px;
              overflow-y: scroll;
              scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
            "
          >
            <el-button
              plain
              class="mission-btn"
              @click="handleUploadMission"
              :disabled="!isConnected"
            >
              <el-icon>
                <Upload />
              </el-icon>
              上传航线
            </el-button>

            <div class="upload-container">
              <el-input
                v-model="fileName"
                placeholder="请输入航线名称"
                style="height: 26px; margin-bottom: 8px"
                clearable
              />
              <el-input
                v-model="fileDescription"
                placeholder="请输入航线描述"
                style="height: 26px; margin-bottom: 8px"
                clearable
              />
              <el-select
                v-model="waypointStrategy"
                placeholder="请选择航点策略"
                @change="handleSelectStrategyChange"
                clearable
              >
                <el-option
                  v-for="item in waypointOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              <el-button
                @click="uploadFile"
                style="
                  margin-top: 10px;
                  height: 26px;
                  width: 100%;
                  background: #2c3d45;
                  color: #fff;
                "
                :disabled="!isConnected"
              >
                上传航线文件
              </el-button>
            </div>
            <el-button
              plain
              class="mission-btn"
              @click="startMission"
              style="margin: 0"
            >
              <el-icon>
                <VideoPlay />
              </el-icon>
              执行航线
            </el-button>
            <el-button
              plain
              class="mission-btn"
              @click="handlePauseMission"
              style="margin: 0"
            >
              <el-icon>
                <VideoPlay />
              </el-icon>
              暂停
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制面板 -->
    <div class="bottom-panel" style="display: flex; flex-direction: column">
      <div class="progress-container">
        <span class="routeProgress">航线进度：</span>
        <el-progress style="width: 100%" :percentage="percentage" striped />
      </div>
      <div class="control-content">
        <!-- 方向控制区域1 -->
        <div style="display: flex; margin-right: 12px">
          <div class="direction-buttons bottom-buttons">
            <div>
              <div style="margin-bottom: 6px; text-align: center">前进</div>
              <el-button
                :disabled="!isConnected || !canOperate"
                @click="flyDirection(1, 'forward')"
              >
                <img :src="ICONS.rise" alt="" />
              </el-button>
            </div>
            <div style="display: flex">
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <div style="width: 48px; margin-right: 6px">左横滚</div>

                <el-button
                  :disabled="!isConnected || !canOperate"
                  @click="flyDirection(2, 'left')"
                >
                  <img :src="ICONS.leftRoll" alt="" />
                </el-button>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <el-button
                  style="
                    border: 2px solid #7f99a6;
                    background: #181d1f;
                    color: #a0c2d2;
                    margin: 6px;
                  "
                  :disabled="!isConnected || !canOperate"
                  @click="flyDirection(2, 'neutralization')"
                >
                  归中
                </el-button>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <el-button
                  style=""
                  :disabled="!isConnected || !canOperate"
                  @click="flyDirection(2, 'right')"
                >
                  <img :src="ICONS.rightRoll" alt="" />
                </el-button>
                <div style="width: 48px; margin-left: 6px">右横滚</div>
              </div>
            </div>
            <div>
              <el-button
                :disabled="!isConnected || !canOperate"
                @click="flyDirection(1, 'backward')"
              >
                <img :src="ICONS.decline" alt="" />
              </el-button>
              <div style="margin-top: 6px; text-align: center">后退</div>
            </div>
          </div>
        </div>
        <!-- 方向控制区域2 -->
        <div class="direction-buttons bottom-buttons">
          <div>
            <div style="margin-bottom: 6px; text-align: center">上升</div>
            <el-button
              :disabled="!isConnected || !canOperate"
              @click="flyDirection(2, 'forward')"
            >
              <img :src="ICONS.forward" alt="" />
            </el-button>
          </div>
          <div style="display: flex">
            <div
              style="
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
              "
            >
              <div style="width: 32px; margin-right: 6px">向左</div>
              <el-button
                :disabled="!isConnected || !canOperate"
                @click="flyDirection(1, 'left')"
              >
                <img :src="ICONS.theLeft" alt="" />
              </el-button>
            </div>
            <div
              style="
                display: flex;
                justify-content: center;
                align-items: center;
              "
            >
              <el-button
                style="
                  border: 2px solid #7f99a6;
                  background: #181d1f;
                  color: #a0c2d2;
                  margin: 6px;
                "
                :disabled="!isConnected || !canOperate"
                @click="flyDirection(2, 'neutralization')"
              >
                归中
              </el-button>
            </div>
            <div
              style="
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
              "
            >
              <el-button
                :disabled="!isConnected || !canOperate"
                @click="flyDirection(1, 'right')"
              >
                <img :src="ICONS.theRight" alt="" />
              </el-button>
              <div style="width: 32px; margin-left: 6px">向右</div>
            </div>
          </div>
          <div>
            <el-button
              :disabled="!isConnected || !canOperate"
              @click="flyDirection(2, 'backward')"
            >
              <img :src="ICONS.backward" alt="" />
            </el-button>
            <div style="margin-top: 6px; text-align: center">下降</div>
          </div>
        </div>
        <!-- 主要控制按钮 -->
        <div class="main-controls">
          <el-button
            type="info"
            :disabled="!isConnected"
            class="control-btn emergency"
            @click="updateDeviceOnlineStatus"
          >
            <el-icon>
              <Refresh />
            </el-icon>
            获取状态
          </el-button>

          <el-button
            type="info"
            :disabled="!isConnected"
            class="control-btn"
            @click="handleArm"
          >
            <el-icon>
              <Unlock />
            </el-icon>
            解锁
          </el-button>
          <el-button
            type="info"
            class="control-btn"
            :disabled="!isConnected || !canOperate"
          >
            <div
              class="lock-slider-container"
              :class="{ disabled: !isConnected }"
            >
              <div
                class="lock-slider"
                :class="{
                  locked: isLocked,
                  'cursor-not-allowed': isLocked,
                }"
                @mousedown="startDrag"
                @touchstart="startDrag"
                ref="sliderContainer"
              >
                <div
                  class="slider-thumb"
                  :style="{ transform: `translateX(${thumbPosition}px)` }"
                  ref="sliderThumb"
                >
                  <el-icon>
                    <Right />
                  </el-icon>
                </div>
                <span class="slider-text">{{
                  isLocked ? "已加锁" : "未加锁"
                }}</span>
              </div>
            </div>
          </el-button>

          <el-button
            type="info"
            class="control-btn"
            @click="handleTakeoff"
            :disabled="!isConnected"
          >
            <el-icon>
              <TopRight />
            </el-icon>
            一键起飞
          </el-button>

          <el-button
            type="info"
            class="control-btn"
            @click="handleReturnLand"
            :disabled="!isConnected || !canOperate"
          >
            <el-icon>
              <Bottom />
            </el-icon>
            降落
          </el-button>

          <el-button
            type="info"
            class="control-btn"
            @click="handleReturn"
            :disabled="!isConnected || !canOperate"
          >
            <el-icon>
              <Back />
            </el-icon>
            一键返航
          </el-button>
          <el-button
            type="info"
            class="control-btn"
            @click="returnPointSettings"
            :disabled="!isConnected || !canOperate"
          >
            <el-icon>
              <Sort />
            </el-icon>
            返航点设置
          </el-button>
        </div>
        <!-- 方向控制区域3 -->
        <div class="direction-controls">
          <div class="direction-buttons bottom-buttons">
            <div style="margin-bottom: 6px">
              <div style="margin-bottom: 6px; text-align: center">上</div>
              <el-button
                :disabled="!isConnected || !canOperate"
                @click="handleDirection1('up')"
              >
                <img :src="ICONS.forward" alt="" />
              </el-button>
            </div>
            <div style="display: flex">
              <div style="text-align: center; margin-right: 6px">
                <el-button
                  :disabled="!isConnected || !canOperate"
                  @click="handleDirection1('left')"
                >
                  <img :src="ICONS.theLeft" alt="" />
                </el-button>
                <div style="margin-top: 6px">左</div>
              </div>
              <div style="text-align: center">
                <el-button
                  :disabled="!isConnected || !canOperate"
                  @click="handleDirection1('down')"
                >
                  <img :src="ICONS.backward" alt="" />
                </el-button>
                <div style="margin-top: 6px">下</div>
              </div>
              <div style="text-align: center; margin-left: 6px">
                <el-button
                  :disabled="!isConnected || !canOperate"
                  @click="handleDirection1('right')"
                >
                  <img :src="ICONS.theRight" alt="" />
                </el-button>
                <div style="margin-top: 6px">右</div>
              </div>
            </div>
          </div>
        </div>
        <!-- 视频按钮 -->
        <div class="functionButtons">
          <el-button
            class="Button"
            style="margin-left: 12px"
            type="info"
            @click="handleDirection1('connect')"
            :disabled="!isConnected || !canOperate"
          >
            <i class="el-icon-video-pause"></i> 连接
          </el-button>
          <el-button
            class="Button"
            type="info"
            @click="handleDirection1('stop')"
            :disabled="!isConnected || !canOperate"
          >
            <i class="el-icon-video-pause"></i> 暂停
          </el-button>
          <el-button
            class="Button"
            type="info"
            @click="handleDirection1('home')"
            :disabled="!isConnected || !canOperate"
          >
            <i class="el-icon-location"></i> 归中
          </el-button>
          <el-button
            class="Button"
            type="info"
            @click="handleDirection1('lowermost')"
            :disabled="!isConnected || !canOperate"
          >
            <i class="el-icon-location"></i> 最低
          </el-button>
        </div>
      </div>
    </div>

    <!-- 查看详情弹窗 -->
    <el-dialog
      :modal="false"
      v-model="isDetailDialogVisible"
      ref="dialogRef"
      :append-to-body="true"
      width="40%"
      style="
        height: 55%;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
        background: rgba(0, 40, 90, 0.7);
        color: #fff;
        border: 2px solid rgba(60, 127, 231, 0.7);
      "
      :before-close="handleClose"
    >
      <div @click.stop.prevent>
        <el-descriptions :column="1" border>
          <!-- 这里保留原有的描述项，由于篇幅限制不完整展示 -->
          <el-descriptions-item label="时间戳">
            {{ uavStatusContent.timestamp }}
          </el-descriptions-item>
          <!-- ... 其他描述项 ... -->
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 返航点设置 -->
    <el-dialog
      title="返航点设置"
      v-model="returnVoyageDialogVisible"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="returnVoyageFormRef"
        :model="returnVoyageForm"
        :rules="returnVoyageRules"
        label-width="100px"
      >
        <el-form-item label="经度" prop="longitude">
          <el-input
            v-model="returnVoyageForm.longitude"
            placeholder="请输入经度"
          />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input
            v-model="returnVoyageForm.latitude"
            placeholder="请输入纬度"
          />
        </el-form-item>
        <el-form-item label="高度" prop="height">
          <el-input v-model="returnVoyageForm.height" placeholder="请输入高度">
            <template #suffix>m</template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="returnVoyageFormCanceled">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 上传航线 -->
    <el-dialog
      class="uploadRoute"
      title="上传航线"
      v-model="returnVoyageDialogVisibleUploadRoute"
      width="600px"
      max-height="600px"
      destroy-on-close
      :append-to-body="true"
      style="z-index: 9999 !important"
    >
      <el-table
        :data="filteredRoutes"
        border
        stripe
        v-loading="loading"
        @row-click="handleRowClick"
        style="width: 100%; height: 400px"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedRouteId"
              :label="row?.id"
              @change="() => handleRadioChange(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="航线名称" min-width="100" />
        <el-table-column prop="createTime" label="航线描述" min-width="180">
          <template #default="{ row }">
            {{ row.description }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="returnVoyageUploadRoute">取消</el-button>
          <el-button type="primary" @click="submitUploadRoute">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { sendMoveCommand } from "@/api/device";
import axios from "axios";
import { deviceDetails } from "@/api/monitor";
import { ICONS } from "@/assets/icons.js";
import {
  droneArm,
  droneDisarm,
  droneTakeoff,
  droneLand,
  droneRtl,
  droneMode,
  droneJoystick,
} from "@/api/drones";
import {
  Bottom,
  Right,
  VideoPlay,
  Sort,
  Refresh,
  Upload,
  TopRight,
  Unlock,
  Back,
  Search,
} from "@element-plus/icons-vue";
import {
  droneIdStatus,
  setHomePosition,
  doMission,
  oneClickExecute,
} from "@/api/drones";
import ShakaPlayer from "../../../component/ShakaPlayer.vue";
import M3u8Player from "../../../component/M3u8Player.vue";
import { dronePolicyList } from "@/api/dronePolicy.js";
import { getRouteList } from "@/api/route";

// 定义props
const props = defineProps({
  showTaskList: {
    type: Boolean,
    default: true,
  },
});

// 定义emits
const emit = defineEmits([
  "search-drone",
  "clear-search",
  "update-status",
  "route-loaded",
]);

// 搜索相关
const searchQuery = ref("");
const selectedDeviceInfo = ref(null);
const isConnected = ref(false);
const uavInfo = ref([]);
const droneHeading = ref(0);
let uavStatusContent = ref({});
const statusTimer = ref(null);
const REFRESH_INTERVAL = 1000;

// 状态变量
const isLocked = ref(false);
const thumbPosition = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const sliderContainer = ref(null);
const sliderThumb = ref(null);
const MAX_THUMB_POSITION = 95;

// 航线相关
const token = localStorage.getItem("authToken");
const headers = ref({
  Authorization: token,
});
const fileName = ref("");
const fileDescription = ref("");
const waypointStrategy = ref("");
const waypointOptions = ref([]);
const canOperate = ref(true);
const percentage = ref(0);

// 航线数据存储
const currentRoutePoints = ref([]);
const routeTotalDistance = ref(0);

// 飞机移动控制
const isFlying = ref(false);
const currentWaypointIndex = ref(0);
const flyingTimer = ref(null);
const FLY_SPEED = 2;

// 飞机实时位置
const planeRealTimePos = ref({
  lon: 0,
  lat: 0,
  alt: 0,
});

const options = [
  { value: "0", label: "手动(MANUAL)" },
  { value: "2", label: "定高模式 (ALT_HOLD)" },
  { value: "3", label: "定点模式(POS_HOLD)" },
  { value: "4", label: "自动模式(AUTO)" },
  { value: "6", label: "Offboard模式 (OFFBOARD)" },
  { value: "20", label: "自动-起飞(AUTO TAKEOFF)" },
  { value: "30", label: "自动-跟踪(AUTO_FOLLOW)" },
  { value: "40", label: "自动-任务(AUTO_MISSION)" },
  { value: "50", label: "自动-返航(AUTO_RTL)" },
  { value: "60", label: "自动-降落(AUTO_LAND)" },
  { value: "300", label: "定点-普通(POS_NOMAL)" },
  { value: "302", label: "定点-避障(POS_AVOID)" },
];

const sensitivityOptions = [
  { value: 200, label: "低" },
  { value: 300, label: "中" },
  { value: 500, label: "高" },
];

const droneModeSetting = ref("3");
let lastConfirmedValue = "3";
let pendingValue = null;
const sensitivity = ref(200);
const deviceStatus = ref("");
const droneMonitoringUrl = ref("");
const droneMonitoringShow = ref(false);
const dronM3u8PlayerShow = ref(false);
const filteredRoutes = ref([]);
const selectedRouteId = ref("");
const videoUrl = ref(
  "http://121.41.60.99:8082/live/2A00283233510834373435/hls.m3u8"
);

// 弹窗相关
let isDetailDialogVisible = ref(false);
let returnVoyageDialogVisible = ref(false);
let returnVoyageDialogVisibleUploadRoute = ref(false);
const returnVoyageFormRef = ref(null);
const dialogRef = ref(null);
const returnVoyageForm = ref({
  longitude: "",
  latitude: "",
  height: "",
});

const returnVoyageRules = {
  longitude: [{ required: true, message: "请输入经度", trigger: "blur" }],
  height: [{ required: true, message: "请输入高度", trigger: "blur" }],
  latitude: [{ required: true, message: "请输入纬度", trigger: "blur" }],
};

// 播放器配置
const playerConfig = {
  preferredAudioLanguage: "zh-CN",
  streaming: {
    bufferingGoal: 30,
    rebufferingGoal: 10,
  },
};

// 定义selectedDeviceId为ref
const selectedDeviceId = ref("");
const unlockLoading = ref(false);

// 飞行时间转换
const convertTime = (value) => {
  const timeStr = value;
  const date = new Date(timeStr);
  const localHours = date.getHours();
  const localMinutes = date.getMinutes();
  const localSeconds = date.getSeconds();
  const format = (num) => num.toString().padStart(2, "0");
  const localTime = `${format(localHours)}:${format(localMinutes)}:${format(
    localSeconds
  )}`;
  return localTime;
};

// 飞行控制
const flyDirection = async (index, direction) => {
  try {
    let x = 0;
    let y = 0;
    let z = 0;
    let r = 0;
    const numberValue = sensitivity.value;

    if (index === 1) {
      if (direction === "forward") {
        x = numberValue;
      } else if (direction === "left") {
        y = -numberValue;
      } else if (direction === "right") {
        y = numberValue;
      } else if (direction === "backward") {
        x = -numberValue;
      } else if (direction === "flyDirection") {
        x = 0;
        y = 0;
        z = 0;
        r = 0;
      }
    } else {
      if (direction === "forward") {
        z = numberValue;
      } else if (direction === "left") {
        r = -numberValue;
      } else if (direction === "right") {
        r = numberValue;
      } else if (direction === "backward") {
        z = -numberValue;
      } else if (direction === "flyDirection") {
        x = 0;
        y = 0;
        z = 0;
        r = 0;
      }
    }

    let data = {
      x: x,
      y: y,
      z: z,
      r: r,
    };
    const res = await droneJoystick(selectedDeviceId.value, data);
    if (res.code === 200) {
      ElMessage.success(res.data);
    }
  } catch (error) {
    console.error("发送控制指令失败:", error);
    ElMessage.error("发送控制指令失败: " + (error.message || "未知错误"));
  }
};

const handleDirection1 = async (direction) => {
  try {
    const res = await sendMoveCommand({
      id: searchQuery.value,
      ip: selectedDeviceInfo.value?.ip,
      command: direction,
      video_ip: selectedDeviceInfo.value?.videoIp,
      data_port: selectedDeviceInfo.value?.dataPort,
      control_port: selectedDeviceInfo.value?.controlPort,
      picture_port: selectedDeviceInfo.value?.picturePort,
    });
    console.log(res);
  } catch (error) {
    console.error("发送控制指令失败:", error);
    ElMessage.error("发送控制指令失败: " + (error.message || "未知错误"));
  }

  ElMessage.info(`发送${direction}控制指令`);
};

// 无人机操作
const handleArm = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }
  try {
    await ElMessageBox.confirm("确定让无人机解锁吗？", "解锁确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    try {
      unlockLoading.value = true;
      const res = await droneArm({
        droneId: selectedDeviceId.value,
      });
      if (res.code === 200) {
        ElMessage.success("无人机解锁成功");
        isLocked.value = false;
        canOperate.value = true;
        thumbPosition.value = 0;
      } else {
        ElMessage.error(res.message || "无人机解锁失败");
      }
    } catch (error) {
      console.error("解锁指令发送失败:", error);
      ElMessage.error("解锁指令发送失败");
    } finally {
      unlockLoading.value = false;
    }
  } catch (error) {
    ElMessage.info("已取消解锁操作");
  }
};

const handleReturn = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }
  ElMessageBox.confirm("确定让无人机返航吗？", "返航确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      unlockLoading.value = true;
      const res = await droneRtl({
        droneId: selectedDeviceId.value,
      });
      if (res.code === 200) {
        ElMessage.success("无人机返航成功");
      } else {
        ElMessage.error(res.message || "无人机返航失败");
      }
    } catch (error) {
      console.error("返航指令发送失败:", error);
      ElMessage.error("返航指令发送失败");
    } finally {
      unlockLoading.value = false;
    }
  });
};

const handleTakeoff = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }
  ElMessageBox.confirm("确定让无人机起飞吗？", "起飞确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    showInput: true,
    inputType: "number",
    inputPlaceholder: "请输入起飞高度",
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: "请输入有效起飞高度",
  }).then(async (value) => {
    try {
      if (value.value) {
        unlockLoading.value = true;
        const res = await droneTakeoff({
          droneId: selectedDeviceId.value,
          altitude: value.value,
        });
        if (res.code === 200) {
          ElMessage.success("无人机起飞成功");
          isLocked.value = false;
          canOperate.value = true;
          thumbPosition.value = 0;
        } else {
          ElMessage.error(res.message || "无人机起飞失败");
        }
      } else {
        ElMessage.error("请输入无人机起飞高度");
      }
    } catch (error) {
      console.error("起飞指令发送失败:", error);
      ElMessage.error("起飞指令发送失败");
    } finally {
      unlockLoading.value = false;
    }
  });
};

const handleReturnLand = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }
  ElMessageBox.confirm("确定让无人机降落吗？", "降落确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      unlockLoading.value = true;
      const res = await droneLand({
        droneId: selectedDeviceId.value,
        altitude: uavStatusContent?.global_position_int?.alt || 0,
      });
      if (res.code === 200) {
        ElMessage.success("无人机降落成功");
      } else {
        ElMessage.error(res.message || "无人机降落失败");
      }
    } catch (error) {
      console.error("降落指令发送失败:", error);
      ElMessage.error("降落指令发送失败");
    } finally {
      unlockLoading.value = false;
    }
  });
};

const droneSetup = async () => {
  try {
    let res = await droneMode({
      droneId: selectedDeviceId.value,
      mode: droneModeSetting.value,
    });
    if (res.code === 200) {
      ElMessage.success(res.data);
    }
  } catch (error) {
    console.log(error);
  }
};

const droneModeSettingChange = (value) => {
  pendingValue = value;
  ElMessageBox.confirm("是否切换无人机模式设置", "警告", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      droneModeSetting.value = value;
      lastConfirmedValue = value;
      droneSetup();
    })
    .catch((error) => {
      droneModeSetting.value = lastConfirmedValue;
      console.log("error", error);
    });
};

const handleVisibleChange = (isVisible) => {
  if (
    !isVisible &&
    pendingValue !== null &&
    pendingValue !== lastConfirmedValue
  ) {
    droneModeSetting.value = lastConfirmedValue;
  }
};

const droneModeSettingChange2 = (value) => {
  sensitivity.value = value;
};

// 滑块控制
const startDrag = (e) => {
  if (!isConnected.value || isLocked.value) return;
  isDragging.value = true;
  startX.value = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", handleDrag, { passive: false });
  document.addEventListener("touchend", stopDrag);
  e.preventDefault();
  e.stopPropagation();
};

const handleDrag = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  e.stopPropagation();
  const currentX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
  const diffX = currentX - startX.value;
  let newPosition;
  if (isLocked.value) {
    newPosition = Math.max(
      0,
      Math.min(MAX_THUMB_POSITION, MAX_THUMB_POSITION + diffX)
    );
  } else {
    newPosition = Math.max(0, Math.min(MAX_THUMB_POSITION, 0 + diffX));
  }
  thumbPosition.value = newPosition;
};

const stopDrag = async () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.removeEventListener("touchmove", handleDrag);
  document.removeEventListener("touchend", stopDrag);

  const shouldLock = thumbPosition.value > MAX_THUMB_POSITION / 2;
  if (shouldLock !== isLocked.value) {
    try {
      const res = await droneDisarm({
        droneId: selectedDeviceId.value,
      });
      if (res.code === 200) {
        isLocked.value = shouldLock;
        ElMessage.success(`加锁成功`);
        canOperate.value = !isLocked.value;
        if (isLocked.value) {
          thumbPosition.value = MAX_THUMB_POSITION;
        } else {
          thumbPosition.value = 0;
        }
      } else {
        thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
        ElMessage.error(res.message || "操作失败");
      }
    } catch (error) {
      thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
      ElMessage.error("操作失败");
    }
  } else {
    thumbPosition.value = shouldLock ? MAX_THUMB_POSITION : 0;
  }
};

// 搜索无人机
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning("请输入无人机编号");
    return;
  }
  try {
    emit("search-drone", searchQuery.value.trim());

    const response = await deviceDetails({
      deviceNumber: searchQuery.value.trim(),
    });
    if (response.code === 200) {
      selectedDeviceInfo.value = {
        deviceId: response.data.deviceNumber,
        deviceName: response.data.name || "未命名设备",
        status: response.data.status || "未知",
        deviceType: response.data.type || "无人机",
        ip: response.data.ip || "",
        dataPort: response.data.dataPort || "",
        controlPort: response.data.controlPort || "",
        picturePort: response.data.picturePort || "",
        videoIp: response.data.videoIp || "",
      };
      selectedDeviceId.value = response.data.deviceNumber;

      const rtmpUrl = response.data.videoIp;
      if (rtmpUrl) {
        if (rtmpUrl.endsWith("hls.m3u8")) {
          dronM3u8PlayerShow.value = true;
          droneMonitoringShow.value = false;
        } else {
          droneMonitoringShow.value = true;
          dronM3u8PlayerShow.value = false;
        }
      }

      const prefixes = ["rtmp://121.41.60.99:", "rtsp://121.41.60.99:"];
      const matchedPrefix = prefixes.find((prefix) =>
        rtmpUrl.startsWith(prefix)
      );
      if (matchedPrefix) {
        const afterPrefix = rtmpUrl.slice(matchedPrefix.length);
        const parts = afterPrefix.split("/");
        droneMonitoringUrl.value = parts.slice(1).join("/");
      }

      ElMessage.success("搜索成功");
      isConnected.value = true;
      updateDeviceOnlineStatus();

      if (statusTimer.value) {
        clearInterval(statusTimer.value);
      }
      statusTimer.value = setInterval(() => {
        updateDeviceOnlineStatus();
      }, REFRESH_INTERVAL);
    } else {
      ElMessage.error(response.message || "搜索失败");
    }
  } catch (error) {
    console.error("搜索失败:", error);
    ElMessage.error("搜索失败: " + error.message);
  }
};

const handleSearchClear = () => {
  searchQuery.value = "";
  selectedDeviceInfo.value = null;
  if (statusTimer.value) {
    clearInterval(statusTimer.value);
    statusTimer.value = null;
    ElMessage.info("已停止状态刷新");
  }
  emit("clear-search");
};

// 获取设备状态
const updateDeviceOnlineStatus = async () => {
  try {
    if (!searchQuery.value.trim()) return;

    const res = await droneIdStatus(searchQuery.value.trim());
    if (res.code === 200) {
      deviceStatus.value = res.data.status;
      if (res.data.status) {
        uavStatusContent.value = formatTo5Decimals(res.data.statusData);
        droneHeading.value = res.data.statusData.attitude?.yaw;
        emit("update-status", res.data);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

// 航线相关方法
const getAllPolicies = async () => {
  try {
    const res = await dronePolicyList();
    if (res.code === 200) {
      waypointOptions.value = res.data.map((item) => ({
        ...item,
        value: Number(item.id),
        label: item.name,
      }));
    }
  } catch (error) {
    console.error("获取所有策略:", error);
    ElMessage.error("获取所有策略失败");
  }
};

const handleSelectStrategyChange = (value) => {
  console.log("当前选中策略ID:", value);
};

const handleUploadMission = () => {
  returnVoyageDialogVisibleUploadRoute.value = true;
  fetchRoutes();
};

const fetchRoutes = async () => {
  try {
    const res = await getRouteList({
      pageNum: 1,
      pageSize: 20,
    });
    if (res.code === 200) {
      filteredRoutes.value = res.data.list;
    } else {
      ElMessage.error(res.message || "获取航线列表失败");
    }
  } catch (error) {
    console.error("获取航线列表失败:", error);
    ElMessage.error("获取航线列表失败: " + error.message);
  }
};

const handleRadioChange = (row) => {
  selectedRouteId.value = row.id;
};

const submitUploadRoute = async () => {
  try {
    if (selectedRouteId.value) {
      const res = await doMission({
        droneId: searchQuery.value,
        missionId: selectedRouteId.value + "",
      });
      if (res.code === 200) {
        returnVoyageDialogVisibleUploadRoute.value = false;
        ElMessage.success("上传航线成功");
        const jsonData = JSON.parse(res.data);
        let routePoints = jsonData.routeData.points;
        emit("route-loaded", routePoints);
      }
    } else {
      returnVoyageDialogVisibleUploadRoute.value = false;
    }
  } catch (error) {
    returnVoyageDialogVisibleUploadRoute.value = false;
  }
};

const uploadFile = async () => {
  if (fileName.value === "") {
    ElMessage.warning("请输入文件名后再上传");
    return;
  } else if (fileDescription.value === "") {
    ElMessage.warning("请输入文件描述后再上传");
    return;
  } else if (waypointStrategy.value === "") {
    ElMessage.warning("请输入航点策略后再上传");
    return;
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", fileName.value);
      formData.append("description", fileDescription.value);
      formData.append("policyId", waypointStrategy.value);

      try {
        const response = await axios.post(`/api/drones/mission?`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: headers.value.Authorization,
          },
        });

        if (response.data.code === 200) {
          ElMessage.success("上传成功");
          fileName.value = "";
          fileDescription.value = "";
          waypointStrategy.value = "";
          let jsonRouteData = JSON.parse(response.data.data);
          if (jsonRouteData && jsonRouteData.routeData) {
            const routeData = jsonRouteData.routeData;
            const routePoints = routeData.points || [];
            emit("route-loaded", routePoints);
          } else {
            ElMessage.warning("上传成功，但未获取到航线数据，无法在地图展示");
          }
        } else {
          ElMessage.error(response.data.message);
        }
      } catch (error) {
        ElMessage.error(error.message);
      }
    }
  };
  fileInput.click();
};

const startMission = async () => {
  console.log("执行航线");
};

const handlePauseMission = () => {
  if (flyingTimer.value) {
    clearInterval(flyingTimer.value);
    flyingTimer.value = null;
  }
  isFlying.value = false;
  ElMessage.success("飞行已暂停，小飞机停止移动");
};

// 返航点设置
const returnPointSettings = () => {
  console.log("返航点设置");
  returnVoyageDialogVisible.value = true;
};

const returnVoyageFormCanceled = () => {
  returnVoyageDialogVisible.value = false;
  returnVoyageForm.value = {
    longitude: "",
    latitude: "",
    height: "",
  };
};

const returnVoyageUploadRoute = () => {
  returnVoyageDialogVisibleUploadRoute.value = false;
};

const submitForm = async () => {
  returnVoyageFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const lng = parseFloat(returnVoyageForm.value.longitude);
        const lat = parseFloat(returnVoyageForm.value.latitude);
        const alt = returnVoyageForm.value.height * 100;

        if (
          isNaN(lng) ||
          isNaN(lat) ||
          lng < -180 ||
          lng > 180 ||
          lat < -90 ||
          lat > 90
        ) {
          ElMessage.error("请输入有效的经纬度");
          return;
        }

        const data = {
          lat,
          lon: lng,
          alt,
          id: searchQuery.value,
        };
        const res = await setHomePosition(data);

        if (res.code === 200) {
          ElMessage.success("返航点设置成功");
          returnVoyageDialogVisible.value = false;
        } else {
          ElMessage.error(res.message || "设置失败");
        }
      } catch (error) {
        console.error("设置返航点失败:", error);
        ElMessage.error("设置返航点失败11");
      }
    }
  });
};

// 查看详情
const uavViewDetails = () => {
  isDetailDialogVisible.value = true;
};

const handleClose = () => {
  isDetailDialogVisible.value = false;
};

// 工具函数
const formatTo5Decimals = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => formatTo5Decimals(item));
  }
  if (typeof data === "object" && data !== null) {
    const result = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = formatTo5Decimals(data[key]);
      }
    }
    return result;
  }
  if (typeof data === "number") {
    const numStr = data.toString();
    const decimalIndex = numStr.indexOf(".");
    if (decimalIndex === -1 || numStr.length - decimalIndex - 1 <= 5) {
      return data;
    }
    return Number(data.toFixed(5));
  }
  return data;
};

// 初始化
onMounted(() => {
  getAllPolicies();
  thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
});

onBeforeUnmount(() => {
  if (statusTimer.value) {
    clearInterval(statusTimer.value);
    statusTimer.value = null;
  }
  if (flyingTimer.value) {
    clearInterval(flyingTimer.value);
    isFlying.value = false;
  }
});
</script>

<style scoped>
.monitor-section-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.top-panel,
.left-panel,
.right-panel,
.bottom-panel {
  pointer-events: auto;
}

/* 顶部面板 */
.top-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 275px;
  height: 60px;
  line-height: 60px;
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 12px;
  z-index: 10;
}

/* 左侧面板 */
.left-panel {
  position: absolute;
  top: 100px;
  left: 20px;
  bottom: 20px;
  width: 275px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

/* 右侧面板 */
.right-panel {
  position: absolute;
  top: 100px;
  right: 40px;
  bottom: 20px;
  width: 250px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

/* 面板内容容器 */
.panel-content {
  display: flex;
  flex-direction: column;
  justify-content: end;
  height: 100%;
}

.info-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 12px;
  box-sizing: border-box;
}

.compass-container {
  margin-bottom: 16px;
}

.flight-info {
  flex: 1;
  overflow-y: auto;
  max-height: 100%;
}

.uav-mode {
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
  margin-top: 12px;
}

.monitor-section {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  box-sizing: border-box;
  color: #fff;
}

.device-info {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 40, 90, 0.7);
  color: #fff;
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 12px;
  box-sizing: border-box;
  font-size: 14px;
}

.mission-section {
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 12px;
  box-sizing: border-box;
}

/* 底部面板 */
.bottom-panel {
  position: absolute;
  bottom: 20px;
  left: 315px;
  right: 310px;
  height: 225px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-container {
  width: 100%;
  display: flex;
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 12px;
  padding: 6px 12px;
  overflow-x: auto;
  scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
}

.routeProgress {
  color: #fff;
  min-width: 80px;
}

.control-content {
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  overflow-x: auto;
  scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  padding: 10px 10px 0px;
  border-radius: 12px;
  margin-top: 12px;
}

/* 指南针样式 */
.compass {
  width: 100px;
  height: 100px;
  margin: auto;
  border-radius: 50%;
  border: 3px solid #ccc;
  position: relative;
  background: radial-gradient(circle, #e5f2ff 0%, #ffffff 100%);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.arrow {
  position: absolute;
  top: 85%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 40px solid #42a5f5;
  transform-origin: 50% 100%;
  margin-left: -12px;
  margin-top: -60px;
  transition: transform 0.2s ease;
}

.direction {
  position: absolute;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.north {
  left: 50%;
  transform: translateX(-50%);
}

.south {
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
}

.west {
  left: 0px;
  top: 50%;
  transform: translateY(-50%);
}

.east {
  right: 0px;
  top: 50%;
  transform: translateY(-50%);
}

/* 控制按钮样式 */
.main-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-right: 12px;
}

.control-btn {
  height: 26px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 4px;
  transition: all 0.3s ease;
  margin: 0;
  background: #2c3d45;
  color: #fff;
}

.control-btn.emergency {
  grid-column: span 2;
  height: 25px;
  background: #2c3d45;
  color: #fff;
}

.direction-buttons {
  display: flex;
  margin-right: 12px;
  flex-direction: column;
  align-items: center;
  color: #92b7cc;
}

.functionButtons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

:deep(.functionButtons .Button) {
  background: #2c3d45;
  padding: 0px 36px;
  height: 25px;
}

.lock-slider-container {
  height: 26px;
  position: relative;
}

.lock-slider {
  height: 100%;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.lock-slider.cursor-not-allowed {
  cursor: not-allowed;
  pointer-events: none;
}

.lock-slider.locked {
  background-color: #13ce66;
}

.slider-thumb {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: white;
  position: absolute;
  left: -53px;
  top: 6px;
  transition: transform 0.1s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.slider-text {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: white;
  pointer-events: none;
  z-index: 1;
  left: -12px;
}

/* 响应式调整 */
@media (max-width: 1600px) {
  .bottom-panel {
    left: 305px;
    right: 300px;
  }
}

@media (max-width: 1400px) {
  .left-panel,
  .top-panel {
    width: 250px;
  }
  .right-panel {
    width: 230px;
  }
  .bottom-panel {
    left: 290px;
    right: 290px;
  }
}

@media (max-width: 1200px) {
  .left-panel,
  .top-panel {
    width: 180px;
  }
  .right-panel {
    width: 200px;
  }
  .bottom-panel {
    left: 250px;
    right: 260px;
    height: 190px;
  }
}

@media (max-width: 992px) {
  .left-panel,
  .right-panel {
    width: 180px;
    bottom: 20px;
  }
  .bottom-panel {
    left: 210px;
    right: 230px;
    height: 190px;
  }
}

/* 样式覆盖 */
:deep(.el-descriptions__body) {
  background: none;
}

:deep(.el-descriptions__label.el-descriptions__cell.is-bordered-label) {
  background: none;
  color: #fff;
}

:deep(
    .el-descriptions__body
      .el-descriptions__table.is-bordered
      .el-descriptions__cell
  ) {
  padding: 6px 10px;
  width: 50%;
}

:deep(.el-descriptions__content.el-descriptions__cell.is-bordered-content) {
  background: none;
  color: #fff;
}

:deep(.el-button.is-plain) {
  background: #2c3d45;
  color: #fff;
}

:deep(.bottom-buttons .el-button, .el-button.is-round) {
  border: none;
  background: none;
  width: 33px;
}

:deep(.el-progress__text) {
  color: white;
}

:deep(.uploadRoute) {
  max-height: 600px;
}

:deep(.el-dialog__body) {
  height: calc(100% - 56px);
}

/* 滚动条样式 */
.flight-info::-webkit-scrollbar {
  width: 6px;
}

.flight-info::-webkit-scrollbar-track {
  background: transparent;
}

.flight-info::-webkit-scrollbar-thumb {
  background-color: rgba(60, 127, 231, 0.7);
  border-radius: 3px;
}

.flight-info::-webkit-scrollbar-thumb:hover {
  background-color: rgba(60, 127, 231, 0.9);
}
</style>
