<!-- 无人机监控组件内部 -->
<template>
  <div class="drone-monitor">
    <!-- 地图底层 -->
    <div class="map-container" ref="mapContainer"></div>
            <!-- 3种地图图层下拉选择 -->
      <div style="position: absolute; top: 20px; right: 20px; z-index: 9999">
        <el-select
          v-model="mapLayerType"
          @change="onMapLayerChange"
          style="width: 130px"
          size="default"
        >
          <el-option label="标准地图" value="normal" />
          <el-option label="卫星地图" value="satellite" />
          <el-option label="卫星混合" value="satelliteMix" />
        </el-select>
      </div>
    <div class="layout-container">
      <div
        class="task-details-card-wrapper"
        :class="{ 'task-list-expanded': showTaskList }"
        v-show="showTaskDetails"
      >
        <el-card style="max-width: 480px">
          <template #header>
            <div class="card-header">
              <span>任务详情</span>
            </div>
          </template>
          <p style="font-size: 12px">飞控编号：</p>
          <p style="font-size: 12px">
            {{
              selectedMission?.assignedDevice
                ? selectedMission?.assignedDevice?.deviceNumber
                : "--"
            }}
          </p>

          <el-select
            style="margin: 12px 0"
            v-model="selectedRouteValue"
            placeholder="请选择航线"
            @change="handleRouteSelect"
          >
            <el-option
              v-for="item in taskOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <div>
            <el-button type="info" @click="showTaskDetails = false"
              >取消</el-button
            >
            <!--  -->
            <el-button
              :disabled="
                !(
                  selectedMission?.assignedDevice?.deviceNumber &&
                  selectedMission?.assignedDevice?.deviceNumber.trim()
                ) || !selectedRouteValue
              "
              type="primary"
              @click="executeMission(selectedMission)"
              >开始</el-button
            >
          </div>
        </el-card>
      </div>
      <!-- 引入任务列表组件 -->
      <TaskList
        style="width: 15%"
        :initial-show-task-list="showTaskList"
        @toggle-task-list="handleTaskListToggle"
        @select-task="selectTask"
        @mouseleave-task="mouseleaveTask"
        @update-task-list-status="handleTaskListStatusUpdate"
      />
      <div
        class="bottom-section"
        :style="{
          flex: showTaskList ? '0 0 85%' : '0 0 100%',
          'min-width': showTaskList ? '85%' : '100%',
        }"
      >
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
                style="
                  background-color: #409eff;
                  color: white;
                  padding-left: 17px;
                "
                :icon="Search"
                @click="handleSearch"
              />
            </template>
          </el-input>
        </div>
        <!-- 左侧信息面板  -->
        <div class="left-panel">
          <div class="panel-content">
            <div
              style="
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow-y: auto;
                padding: 16px;
                background: rgba(0, 40, 90, 0.7);
                border: 2px solid rgba(60, 127, 231, 0.7);
                border-radius: 12px;
                box-sizing: border-box;
              "
            >
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
                        ? convertTime(
                            uavStatusContent?.system_time?.time_boot_ms
                          )
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
              <h4 style="padding-bottom: 6px" class="fontGradient">
                无人机监控
              </h4>
              <!-- 监控内容区域 -->
              <!-- <ShakaPlayer src="http://192.168.1.148:7080/stream/1/hls.m3u8" :config="playerConfig" /> -->
              <!-- hls视频流播放 -->
              <!-- <ShakaPlayer src="http://121.41.60.99:7896/live/stream_key/index.m3u8" :config="playerConfig" /> -->
              <!-- flv格式的视频流播放; -->
              <!-- <ShakaPlayer
          :src= "ws://121.41.60.99:8082/live/stream_key.live.flv"
          :config="playerConfig" /> -->
              <!-- <ShakaPlayer :src="videoStream" :config="playerConfig" /> rtsp://121.41.60.99:7896/stream_from_yunxiang/1F00263233510834373435  -->
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
                <!-- <div>
              <span style="color: #fff">航线进度</span>
              <el-progress
                :percentage="percentage"
                :stroke-width="15"
                striped
              />
            </div> -->
              </div>
            </div>
          </div>
        </div>

        <!-- 底部控制面板 -->
        <div class="bottom-panel" style="display: flex; flex-direction: column">
          <div
            style="
              width: 100%;
              display: flex;
              background: rgba(0, 40, 90, 0.7);
              border: 2px solid rgba(60, 127, 231, 0.7);
              border-radius: 12px;
              padding: 6px 12px;
              overflow-x: auto;
              scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
            "
          >
            <span class="routeProgress">航线进度：</span>
            <el-progress style="width: 100%" :percentage="percentage" striped />
          </div>
          <div class="control-content">
            <!-- 方向控制区域1  -->
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
            <!-- 方向控制区域 -->
            <div class="direction-controls">
              <div class="direction-buttons bottom-buttons">
                <div style="margin-bottom: 6px">
                  <div style="margin-bottom: 6px; text-align: center">上</div>
                  <el-button
                    :disabled="!isConnected || !canOperate"
                    @click="handleVideoControl('up')"
                  >
                    <img :src="ICONS.forward" alt=""
                  </el-button>
                </div>
                <div style="display: flex">
                  <div style="text-align: center; margin-right: 6px">
                    <el-button
                      :disabled="!isConnected || !canOperate"
                      @click="handleVideoControl('left')"
                    >
                      <img :src="ICONS.theLeft" alt="" />
                    </el-button>
                    <div style="margin-top: 6px">左</div>
                  </div>
                  <div style="text-align: center">
                    <el-button
                      :disabled="!isConnected || !canOperate"
                      @click="handleVideoControl('down')"
                    >
                      <img :src="ICONS.backward" alt="" />
                    </el-button>
                    <div style="margin-top: 6px">下</div>
                  </div>
                  <div style="text-align: center; margin-left: 6px">
                    <el-button
                      :disabled="!isConnected || !canOperate"
                      @click="handleVideoControl('right')"
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
                @click="handleVideoControl('connect')"
                :disabled="!isConnected || !canOperate"
              >
                <i class="el-icon-video-pause"></i> 连接
              </el-button>
              <el-button
                class="Button"
                type="info"
                @click="handleVideoControl('stop')"
                :disabled="!isConnected || !canOperate"
              >
                <i class="el-icon-video-pause"></i> 暂停
              </el-button>
              <el-button
                class="Button"
                type="info"
                @click="handleVideoControl('home')"
                :disabled="!isConnected || !canOperate"
              >
                <i class="el-icon-location"></i> 归中
              </el-button>
              <el-button
                class="Button"
                type="info"
                @click="handleVideoControl('lowermost')"
                :disabled="!isConnected || !canOperate"
              >
                <i class="el-icon-location"></i> 最低
              </el-button>
            </div>
          </div>
        </div>

        <!-- 查看详情弹窗  -->
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
              <!-- 顶层时间戳 -->
              <el-descriptions-item label="时间戳">
                {{ uavStatusContent.timestamp }}
              </el-descriptions-item>

              <!-- 缩放气压数据 -->
              <el-descriptions-item label="缩放气压数据-气压差">
                {{ uavStatusContent?.scaled_pressure?.press_diff }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放气压数据-温度">
                {{ uavStatusContent?.scaled_pressure?.temperature }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放气压数据-绝对气压">
                {{ uavStatusContent?.scaled_pressure?.press_abs }}
              </el-descriptions-item>

              <!-- 全局位置信息（整数） -->
              <el-descriptions-item label="全局位置信息(整数)-X方向速度">
                {{ uavStatusContent?.global_position_int?.vx }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-Y方向速度">
                {{ uavStatusContent?.global_position_int?.vy }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-Z方向速度">
                {{ uavStatusContent?.global_position_int?.vz }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-海拔高度">
                {{ uavStatusContent?.global_position_int?.alt }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-相对高度">
                {{ uavStatusContent?.global_position_int?.relative_alt }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-经度">
                {{ uavStatusContent?.global_position_int?.lon }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-航向角">
                {{ uavStatusContent?.global_position_int?.hdg }}
              </el-descriptions-item>
              <el-descriptions-item label="全局位置信息(整数)-纬度">
                {{ uavStatusContent?.global_position_int?.lat }}
              </el-descriptions-item>

              <!-- 系统时间 -->
              <el-descriptions-item label="系统时间-Unix时间(微秒)">
                {{ uavStatusContent?.system_time?.time_unix_usec }}
              </el-descriptions-item>
              <el-descriptions-item label="系统时间-启动后时间（毫秒）">
                {{ uavStatusContent?.system_time?.time_boot_ms }}
              </el-descriptions-item>

              <!-- 缩放惯性测量单元数据(IMU) -->
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-磁力计Y轴">
                {{ uavStatusContent?.scaled_imu?.mag_y }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-磁力计X轴">
                {{ uavStatusContent?.scaled_imu?.mag_x }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-磁力计Z轴">
                {{ uavStatusContent?.scaled_imu?.mag_z }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-陀螺仪Y轴">
                {{ uavStatusContent?.scaled_imu?.gyro_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="缩放惯性测量单元数据(IMU)-加速度计Z轴"
              >
                {{ uavStatusContent?.scaled_imu?.acc_z }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-陀螺仪X轴">
                {{ uavStatusContent?.scaled_imu?.gyro_x }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放惯性测量单元数据(IMU)-陀螺仪Z轴">
                {{ uavStatusContent?.scaled_imu?.gyro_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="缩放惯性测量单元数据(IMU)-加速度计Y轴"
              >
                {{ uavStatusContent?.scaled_imu?.acc_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="缩放惯性测量单元数据(IMU)-加速度计X轴"
              >
                {{ uavStatusContent?.scaled_imu?.acc_x }}
              </el-descriptions-item>

              <!-- 导航控制器输出 -->
              <el-descriptions-item label="导航控制器输出-导航滚转角">
                {{ uavStatusContent?.nav_controller_output?.nav_roll }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-航点距离">
                {{ uavStatusContent?.nav_controller_output?.wp_dist }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-高度误差">
                {{ uavStatusContent?.nav_controller_output?.alt_error }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-横向轨迹误差">
                {{ uavStatusContent?.nav_controller_output?.xtrack_error }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-导航俯仰角">
                {{ uavStatusContent?.nav_controller_output?.nav_pitch }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-目标方位角">
                {{ uavStatusContent?.nav_controller_output?.target_bearing }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-导航方位角">
                {{ uavStatusContent?.nav_controller_output?.nav_bearing }}
              </el-descriptions-item>
              <el-descriptions-item label="导航控制器输出-空速误差">
                {{ uavStatusContent?.nav_controller_output?.aspd_error }}
              </el-descriptions-item>

              <!-- 心跳包 -->
              <el-descriptions-item label="心跳包-模式">
                {{ uavStatusContent?.heartbeat?.mode }}
              </el-descriptions-item>
              <el-descriptions-item label="心跳包-MAVLink协议版本">
                {{ uavStatusContent?.heartbeat?.mavlink_version }}
              </el-descriptions-item>
              <el-descriptions-item label="心跳包-状态">
                {{ uavStatusContent?.heartbeat?.status }}
              </el-descriptions-item>

              <!-- 扩展系统状态 -->
              <el-descriptions-item label="扩展系统状态-垂直起降状态">
                {{ uavStatusContent?.extended_sys_state?.vtol_state }}
              </el-descriptions-item>
              <el-descriptions-item label="扩展系统状态-着陆状态">
                {{ uavStatusContent?.extended_sys_state?.landed_state }}
              </el-descriptions-item>

              <!-- 自动驾驶仪版本 -->
              <el-descriptions-item label="自动驾驶仪版本-序列号">
                {{ uavStatusContent?.autopilot_version?.serial_number }}
              </el-descriptions-item>
              <el-descriptions-item label="自动驾驶仪版本-固件版本">
                {{ uavStatusContent?.autopilot_version?.firmware_version }}
              </el-descriptions-item>

              <!-- GPS数据 -->
              <el-descriptions-item label="GPS数据-可见卫星数量">
                {{ uavStatusContent?.gps?.satellites_visible }}
              </el-descriptions-item>
              <el-descriptions-item label="GPS数据-海拔">
                {{ uavStatusContent?.gps?.alt }}
              </el-descriptions-item>
              <el-descriptions-item label="GPS数据-定位类型">
                {{ uavStatusContent?.gps?.fix_type }}
              </el-descriptions-item>
              <el-descriptions-item label="GPS数据-经度">
                {{ uavStatusContent?.gps?.lon }}
              </el-descriptions-item>
              <el-descriptions-item label="GPS数据-纬度">
                {{ uavStatusContent?.gps?.lat }}
              </el-descriptions-item>

              <!-- 电池数据 -->
              <el-descriptions-item label="电池数据-电流">
                {{ uavStatusContent?.battery?.current }}
              </el-descriptions-item>
              <el-descriptions-item label="电池数据-剩余电量（百分比）">
                {{ uavStatusContent?.battery?.battery_remaining }}
              </el-descriptions-item>
              <el-descriptions-item label="电池数据-电压">
                {{ uavStatusContent?.battery?.voltage }}
              </el-descriptions-item>

              <!-- 第二GPS原始数据 -->
              <el-descriptions-item label="第二GPS原始数据-可见卫星数量">
                {{ uavStatusContent?.gps2_raw?.satellites_visible }}
              </el-descriptions-item>
              <el-descriptions-item label="第二GPS原始数据-海拔">
                {{ uavStatusContent?.gps2_raw?.alt }}
              </el-descriptions-item>
              <el-descriptions-item label="第二GPS原始数据-定位类型">
                {{ uavStatusContent?.gps2_raw?.fix_type }}
              </el-descriptions-item>
              <el-descriptions-item label="第二GPS原始数据-经度">
                {{ uavStatusContent?.gps2_raw?.lon }}
              </el-descriptions-item>
              <el-descriptions-item label="第二GPS原始数据-纬度">
                {{ uavStatusContent?.gps2_raw?.lat }}
              </el-descriptions-item>

              <!-- 振动数据 -->
              <el-descriptions-item label="振动数据-Y方向振动值">
                {{ uavStatusContent?.vibration?.vibration_y }}
              </el-descriptions-item>
              <el-descriptions-item label="振动数据-1通道削波计数">
                {{ uavStatusContent?.vibration?.clipping_1 }}
              </el-descriptions-item>
              <el-descriptions-item label="振动数据-Z方向振动值">
                {{ uavStatusContent?.vibration?.vibration_z }}
              </el-descriptions-item>
              <el-descriptions-item label="振动数据-2通道削波计数">
                {{ uavStatusContent?.vibration?.clipping_2 }}
              </el-descriptions-item>
              <el-descriptions-item label="振动数据-X方向振动值">
                {{ uavStatusContent?.vibration?.vibration_x }}
              </el-descriptions-item>
              <el-descriptions-item label="振动数据-0通道削波计数">
                {{ uavStatusContent?.vibration?.clipping_0 }}
              </el-descriptions-item>

              <!-- 本地北东地坐标系(NED)位置 -->
              <el-descriptions-item label="本地北东地坐标系(NED)位置-X方向速度">
                {{ uavStatusContent?.local_position_ned?.vx }}
              </el-descriptions-item>
              <el-descriptions-item label="本地北东地坐标系(NED)位置-Y方向速度">
                {{ uavStatusContent?.local_position_ned?.vy }}
              </el-descriptions-item>
              <el-descriptions-item label="本地北东地坐标系(NED)位置-Z方向速度">
                {{ uavStatusContent?.local_position_ned?.vz }}
              </el-descriptions-item>
              <el-descriptions-item label="本地北东地坐标系(NED)位置-X坐标">
                {{ uavStatusContent?.local_position_ned?.x }}
              </el-descriptions-item>
              <el-descriptions-item label="本地北东地坐标系(NED)位置-Y坐标">
                {{ uavStatusContent?.local_position_ned?.y }}
              </el-descriptions-item>
              <el-descriptions-item label="本地北东地坐标系(NED)位置-Z坐标">
                {{ uavStatusContent?.local_position_ned?.z }}
              </el-descriptions-item>

              <!-- 第二缩放惯性测量单元数据(IMU2) -->
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-磁力计Y轴"
              >
                {{ uavStatusContent?.scaled_imu2?.mag_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-磁力计X轴"
              >
                {{ uavStatusContent?.scaled_imu2?.mag_x }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-磁力计Z轴"
              >
                {{ uavStatusContent?.scaled_imu2?.mag_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-陀螺仪Y轴"
              >
                {{ uavStatusContent?.scaled_imu2?.gyro_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-加速度计Z轴"
              >
                {{ uavStatusContent?.scaled_imu2?.acc_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-陀螺仪X轴"
              >
                {{ uavStatusContent?.scaled_imu2?.gyro_x }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-陀螺仪Z轴"
              >
                {{ uavStatusContent?.scaled_imu2?.gyro_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-加速度计Y轴"
              >
                {{ uavStatusContent?.scaled_imu2?.acc_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第二缩放惯性测量单元数据(IMU2)-加速度计X轴"
              >
                {{ uavStatusContent?.scaled_imu2?.acc_x }}
              </el-descriptions-item>

              <!-- 第三缩放惯性测量单元数据(IMU3) -->
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-磁力计Y轴"
              >
                {{ uavStatusContent?.scaled_imu3?.mag_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-磁力计X轴"
              >
                {{ uavStatusContent?.scaled_imu3?.mag_x }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-磁力计Z轴"
              >
                {{ uavStatusContent?.scaled_imu3?.mag_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-陀螺仪Y轴"
              >
                {{ uavStatusContent?.scaled_imu3?.gyro_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-加速度计Z轴"
              >
                {{ uavStatusContent?.scaled_imu3?.acc_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-陀螺仪X轴"
              >
                {{ uavStatusContent?.scaled_imu3?.gyro_x }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-陀螺仪Z轴"
              >
                {{ uavStatusContent?.scaled_imu3?.gyro_z }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-加速度计Y轴"
              >
                {{ uavStatusContent?.scaled_imu3?.acc_y }}
              </el-descriptions-item>
              <el-descriptions-item
                label="第三缩放惯性测量单元数据(IMU3)-加速度计X轴"
              >
                {{ uavStatusContent?.scaled_imu3?.acc_x }}
              </el-descriptions-item>

              <!-- 缩放的遥控通道数据 -->
              <el-descriptions-item label="缩放的遥控通道数据-第6通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan6_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第7通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan7_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-信号强度（RSSI）">
                {{ uavStatusContent?.rc_channels_scaled?.rssi }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第1通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan1_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第8通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan8_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第4通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan4_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第5通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan5_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第2通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan2_scaled }}
              </el-descriptions-item>
              <el-descriptions-item label="缩放的遥控通道数据-第3通道缩放值">
                {{ uavStatusContent?.rc_channels_scaled?.chan3_scaled }}
              </el-descriptions-item>

              <!-- 当前任务信息 -->
              <el-descriptions-item label="当前任务信息-总任务数">
                {{ uavStatusContent?.mission_current?.total }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-任务状态">
                {{ uavStatusContent?.mission_current?.mission_state }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-任务模式">
                {{ uavStatusContent?.mission_current?.mission_mode }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-任务ID">
                {{ uavStatusContent?.mission_current?.mission_id }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-电子围栏ID">
                {{ uavStatusContent?.mission_current?.fence_id }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-集结点ID">
                {{ uavStatusContent?.mission_current?.rally_points_id }}
              </el-descriptions-item>
              <el-descriptions-item label="当前任务信息-当前序列">
                {{ uavStatusContent?.mission_current?.seq }}
              </el-descriptions-item>

              <!-- 障碍物距离 -->
              <el-descriptions-item label="障碍物距离-距离数组">
                {{
                  JSON.stringify(uavStatusContent?.obstacle_distance?.distances)
                }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-角度偏移">
                {{ uavStatusContent?.obstacle_distance?.angle_offset }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-最小距离">
                {{ uavStatusContent?.obstacle_distance?.min_distance }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-角度增量（浮点）">
                {{ uavStatusContent?.obstacle_distance?.increment_f }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-角度增量（整数）">
                {{ uavStatusContent?.obstacle_distance?.increment }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-传感器类型">
                {{ uavStatusContent?.obstacle_distance?.sensor_type }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-最大距离">
                {{ uavStatusContent?.obstacle_distance?.max_distance }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-时间（微秒）">
                {{ uavStatusContent?.obstacle_distance?.time_usec }}
              </el-descriptions-item>
              <el-descriptions-item label="障碍物距离-坐标系">
                {{ uavStatusContent?.obstacle_distance?.frame }}
              </el-descriptions-item>

              <!-- 遥控通道数据 -->
              <el-descriptions-item label="遥控通道数据-信号强度(RSSI)">
                {{ uavStatusContent?.rc_channels?.rssi }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第3通道原始值">
                {{ uavStatusContent?.rc_channels?.chan3_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第6通道原始值">
                {{ uavStatusContent?.rc_channels?.chan6_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第5通道原始值">
                {{ uavStatusContent?.rc_channels?.chan5_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第4通道原始值">
                {{ uavStatusContent?.rc_channels?.chan4_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第7通道原始值">
                {{ uavStatusContent?.rc_channels?.chan7_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第2通道原始值">
                {{ uavStatusContent?.rc_channels?.chan2_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第1通道原始值">
                {{ uavStatusContent?.rc_channels?.chan1_raw }}
              </el-descriptions-item>
              <el-descriptions-item label="遥控通道数据-第8通道原始值">
                {{ uavStatusContent?.rc_channels?.chan8_raw }}
              </el-descriptions-item>

              <!-- 虚拟飞行仪表数据(VFR HUD) -->
              <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-爬升率">
                {{ uavStatusContent?.vfr_hud?.climb }}
              </el-descriptions-item>
              <el-descriptions-item
                label="虚拟飞行仪表数据(VFR HUD)-油门（百分比）"
              >
                {{ uavStatusContent?.vfr_hud?.throttle }}
              </el-descriptions-item>
              <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-航向">
                {{ uavStatusContent?.vfr_hud?.heading }}
              </el-descriptions-item>
              <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-高度">
                {{ uavStatusContent?.vfr_hud?.alt }}
              </el-descriptions-item>
              <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-地速">
                {{ uavStatusContent?.vfr_hud?.groundspeed }}
              </el-descriptions-item>
              <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-空速">
                {{ uavStatusContent?.vfr_hud?.airspeed }}
              </el-descriptions-item>

              <!-- 调试向量数据  -->
              <el-descriptions-item label="调试向量数据-名称">
                {{ uavStatusContent?.debug_vect?.name }}
              </el-descriptions-item>
              <el-descriptions-item label="调试向量数据-X分量">
                {{ uavStatusContent?.debug_vect?.x }}
              </el-descriptions-item>
              <el-descriptions-item label="调试向量数据-Y分量">
                {{ uavStatusContent?.debug_vect?.y }}
              </el-descriptions-item>
              <el-descriptions-item label="调试向量数据-Z分量">
                {{ uavStatusContent?.debug_vect?.z }}
              </el-descriptions-item>
              <el-descriptions-item label="调试向量数据-时(MS)">
                {{ uavStatusContent?.debug_vect?.time_usec }}
              </el-descriptions-item>

              <!-- 姿态数据 -->
              <el-descriptions-item label="姿态数据-滚转角(°)">
                {{ uavStatusContent?.attitude?.roll }}
              </el-descriptions-item>
              <el-descriptions-item label="姿态数据-俯仰角（°）">
                {{ uavStatusContent?.attitude?.pitch }}
              </el-descriptions-item>
              <el-descriptions-item label="姿态数据-偏航角（°）">
                {{ uavStatusContent?.attitude?.yaw }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-dialog>
        <!--  返航点设置  -->
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
              <el-input
                v-model="returnVoyageForm.height"
                placeholder="请输入高度"
              >
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
        <UploadRouteDialog
          v-model="returnVoyageDialogVisibleUploadRoute"
          @confirm="handleUploadRouteConfirm"
          @cancel="handleUploadRouteCancel"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  inject,
  reactive,
  nextTick,
} from "vue";
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
  uploadRouteFile

} from "@/api/drones";
import { missionAllList, missioRoutes } from "@/api/mission";
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
  Fold,
  Expand,
} from "@element-plus/icons-vue";
import {
  droneIdStatus,
  setHomePosition,
  doMission,
  oneClickExecute,
} from "@/api/drones";
import ShakaPlayer from "../../component/ShakaPlayer.vue";
import M3u8Player from "../../component/M3u8Player.vue";
import { dronePolicyList } from "@/api/dronePolicy.js";
import { getRouteList } from "@/api/route";
// import droneIconUrl from "@/assets/mti-无人机.png";
import planeIcon from "@/assets/飞机.png";
import localIcon from "@/assets/local.png";
import TaskList from "../components/mission/TaskList.vue";
import UploadRouteDialog from "../components/mission/UploadRouteDialog.vue";
import DroneDetailDialog from "../components/mission/DroneDetailDialog.vue";
// 可选的播放器配置
const playerConfig = {
  // 可以在这里添加Shaka Player的配置项
  // 例如：
  preferredAudioLanguage: "zh-CN",
  streaming: {
    bufferingGoal: 30,
    rebufferingGoal: 10,
  },
};
let videoStream = "ws://121.41.60.99:8082/live/stream_key.live.flv";
// 注入父组件提供的上下文
const collapseContext = inject("collapseContext", {
  isCollapse: ref(false),
});
// 解构出方法和状态（可选）
const { isCollapse } = collapseContext;
const selectedDeviceId = ref("");
const unlockLoading = ref(false);
let dialogVisible = ref(false);
let isDetailDialogVisible = ref(false);
let returnVoyageDialogVisible = ref(false);
let returnVoyageDialogVisibleUploadRoute = ref(false);
const returnVoyageFormRef = ref(null);
const dialogRef = ref(null);
let droneMarker = null;
let trackPolyline = null;
const returnVoyageForm = ref({
  longitude: "",
  latitude: "",
  height: "",
});
// 表单验证规则
const returnVoyageRules = {
  longitude: [{ required: true, message: "请输入经度", trigger: "blur" }],
  height: [{ required: true, message: "请输入高度", trigger: "blur" }],
  latitude: [{ required: true, message: "请输入纬度", trigger: "blur" }],
};
// 无人机状态
const status = ref({
  connected: true,
  satellites: "/",
  armed: false,
  gps: true,
  latitude: "/",
  longitude: "/",
  speed: 8.5,
  relativeHeight: "/",
  absoluteHeight: 150.2,
  battery: 78,
  voltage: 11.8,
  remainingTime: "25分钟",
  signalStrength: 85,
  flightMode: "GPS定点模式",
});
// 状态管理
const trackState = reactive({
  points: [], // 轨迹点坐标数组
  markers: [], // 轨迹点标记数组
  labels: new Map(), // 轨迹点标签映射表 (key: "lng,lat")
  lastCleanupIndex: 0, // 上次清理的索引
  lastPosition: null, // 上一次位置，用于计算移动距离
  bounds: null, // 轨迹点边界对象
});
// 搜索相关
const searchQuery = ref("");
const taskName = ref("");
let selectedDeviceInfo = ref(null);
const isConnected = ref(false); //0816测试无人机按钮是否可用
let disabledViewDetails = ref(true);
let uavInfo = ref([]);
// 箭头的度数
const droneHeading = ref(0);
let uavStatusContent = ref({});
// 定时器ID（用于后续清除）
const statusTimer = ref(null);
// 定时刷新间隔
const REFRESH_INTERVAL = 1000;
// 状态变量
const isLocked = ref(false); // 初始状态为锁定
const thumbPosition = ref(0); // 滑块初始位置（锁定状态）
const isDragging = ref(false);
const startX = ref(0);
const sliderContainer = ref(null);
const sliderThumb = ref(null);
// 滑块可移动的最大距离
const MAX_THUMB_POSITION = 95;
// 定义响应式数据
const token = localStorage.getItem("authToken");
const headers = ref({
  // "Content-Type": "multipart/form-data",
  Authorization: token, // 从本地存储中获取 token
});
const fileName = ref("");
const fileDescription = ref("");
const waypointStrategy = ref("");
const waypointOptions = ref([]);
let controlSensitivity = ref(100);
const canOperate = ref(true);
const percentage = ref(0);
// 1. 航线数据存储
const currentRoutePoints = reactive([]); // 当前选中的完整航线点数组（S点到E点）
const routeTotalDistance = ref(0); // 航线总距离（米）

// 2. 飞机移动控制
const isFlying = ref(false); // 是否正在沿航线飞行
const currentWaypointIndex = ref(0); // 当前飞行到的路径点索引（从0开始，S点是0）
const flyingTimer = ref(null); // 飞行定时器（用于停止/重置）
const FLY_SPEED = 2; // 固定飞行速度：2米/秒

// 3. 飞机实时位置（用于计算剩余路程）
const planeRealTimePos = reactive({
  lon: 0,
  lat: 0,
  alt: 0,
});
const options = [
  {
    value: "0",
    label: "手动(MANUAL)",
  },
  {
    value: "2",
    label: "定高模式 (ALT_HOLD)",
  },
  {
    value: "3",
    label: "定点模式(POS_HOLD)",
  },
  {
    value: "4",
    label: "自动模式(AUTO)",
  },

  {
    value: "6",
    label: "Offboard模式 (OFFBOARD)",
  },
  {
    value: "20",
    label: "自动-起飞(AUTO TAKEOFF)",
  },
  {
    value: "30",
    label: "自动-跟踪(AUTO_FOLLOW)",
  },
  {
    value: "40",
    label: "自动-任务(AUTO_MISSION)",
  },
  {
    value: "50",
    label: "自动-返航(AUTO_RTL)",
  },
  {
    value: "60",
    label: "自动-降落(AUTO_LAND)",
  },
  {
    value: "300",
    label: "定点-普通(POS_NOMAL)",
  },
  {
    value: "302",
    label: "定点-避障(POS_AVOID)",
  },
];
const sensitivityOptions = [
  {
    value: 200,
    label: "低",
  },
  {
    value: 300,
    label: "中",
  },
  {
    value: 500,
    label: "高",
  },
];
const taskOptions = ref([]);
const selectedRouteValue = ref("");
const droneModeSetting = ref("3");
// 记录上一次的模式值（用于取消时回滚）
let lastModeValue = droneModeSetting.value;
// select组件的ref
const selectRef = ref(null);
let lastConfirmedValue = "3"; // 记录最后一次确认的值
let pendingValue = null; // 临时存储待确认的值
const sensitivity = ref(200);
const deviceStatus = ref("");
// 预设起点和终点
const startPoint = { lon: 112.28354, lat: 34.14335, alt: 30 };
const endPoint = { lon: 112.38354, lat: 34.19335, alt: 30 }; // 预设终点坐标
// 状态变量
const mapContainer = ref(null);
let map = null;
const currentPoint = ref({ ...startPoint }); // 当前动画点
const animatedPoints = ref([startPoint]); // 存储所有轨迹点
const markers = ref([]);
const lines = ref([]);
const animationTimer = ref(null);
const totalSeconds = 10; // 总动画时长（秒），到达终点或超时停止// 初始化地图
const droneMonitoringUrl = ref("");
const droneMonitoringShow = ref(false);
const dronM3u8PlayerShow = ref(false);
// 标记是否是首次加载（用于初始缩放）
const isFirstLoad = ref(true);
// 标记用户是否手动缩放过地图（用于后续更新时保持缩放）
const isUserZoomed = ref(false); // 新增：默认未手动缩放
const filteredRoutes = ref([]);
const selectedRouteId = ref("");
const videoUrl = ref(
  "http://121.41.60.99:8082/live/2A00283233510834373435/hls.m3u8"
);
const showTaskList = ref(true); // 控制任务列表显示状态
const taskAllList = ref([]);
const selectedMission = ref("");
const showTaskDetails = ref(false);
const routeList = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const taskRouteId = ref(0);
// 切换任务列表显示/隐藏
const toggleTaskList = () => {
  showTaskList.value = !showTaskList.value;
  showTaskDetails.value = false;
};
// 新增：地图图层切换
const mapLayerType = ref("satelliteMix"); // 默认卫星混合
const initMap = () => {
  if (!window.AMap) {
    ElMessage.error("高德地图API未加载");
    return;
  }
  try {
    // 创建地图实例 - 使用默认中心点和缩放级别
    map = new AMap.Map(mapContainer.value, {
      zoom: 15,
      center: [113.65644, 34.78723],
      viewMode: "3D",
      renderMode: "webgl",
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
    });
    // 地图加载完成事件
    map.on("complete", () => {
      ElMessage.success("地图加载成功");
    });

    // 定位到当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          map.setCenter(new AMap.LngLat(lng, lat));
          console.log("已定位到当前位置:", lng, lat);
        },
        (err) => {
          console.warn("定位失败，使用默认位置");
        }
      );
    }

    // 监听缩放结束事件，标记用户手动缩放
    map.on("zoomend", () => {
      const currentZoom = map.getZoom();
      console.log("当前缩放级别：", currentZoom);
      isUserZoomed.value = true;
    });

    // 添加控件 - 高德地图
    // 使用 AMap.plugin 加载 Scale 控件
    AMap.plugin('AMap.Scale', function () {
      map.addControl(new AMap.Scale());
    });

    // 创建轨迹线
    trackPolyline = new AMap.Polyline({
      strokeColor: "#2C64A7",
      strokeWeight: 4,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round',
    });
    map.add(trackPolyline);
  } catch (error) {
    console.error("地图初始化失败:", error);
    ElMessage.error("地图初始化失败");
  }
};
// 地图图层切换
const onMapLayerChange = (val) => {
  if (!map) return;

  let layers = [];
  let label = "";

  switch (val) {
    case "normal":
      layers = [new AMap.TileLayer()];
      label = "标准地图";
      break;
    case "satellite":
      layers = [new AMap.TileLayer.Satellite()];
      label = "卫星地图";
      break;
    case "satelliteMix":
      layers = [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()];
      label = "卫星混合";
      break;
  }

  map.setLayers(layers);
  ElMessage.success("已切换 → " + label);
};

// 处理任务列表展开/收起状态变更
const handleTaskListToggle = (status) => {
  showTaskList.value = status;
  showTaskDetails.value = false; // 保持原有逻辑
};

// 处理任务列表状态更新（如总数、列表数据）
const handleTaskListStatusUpdate = (status) => {
  console.log("任务列表状态更新：", status);
  // 可根据需求做后续处理，如缓存任务列表数据
};

const selectTask = (value) => {
  selectedRouteValue.value = ""; // 清空下拉框选中值，恢复"请选择航线"
  taskRouteId.value = 0; // 清空旧航线ID，避免残留

  // if (value.assignedDevice) {
  selectedMission.value = value;
  //任务下面的航线
  handleRouteManage();
  showTaskDetails.value = true;
  // }
  console.log(value);
};
//鼠标移出任务
const mouseleaveTask = () => {
  // showTaskDetails.value = false;
  console.log("鼠标移出任务");
};
const handleSizeChange = (val) => {
  pageSize.value = val;
  taskManagement();
  // routeList(searchKeyword.value);
};
const handleCurrentChange = (val) => {
  currentPage.value = val;
  taskManagement();

  // routeList(searchKeyword.value);
};
// 添加标记点（强制最后一个点为终点）
const addMarker = (point, index, isFinalPoint = false) => {
  let markerLabel, markerClass;

  if (index === 0) {
    // 起点：显示"S"，红色
    markerLabel = "S";
    markerClass = "start";
  } else if (isFinalPoint) {
    // 终点：显示"E"，绿色
    markerLabel = "E";
    markerClass = "end";
  } else {
    // 中间点：显示数字（从2开始），蓝色
    markerLabel = (index + 1).toString();
    markerClass = "middle";
  }
  const markerHtml = `
    <div class="route-marker ${markerClass}">
      ${markerLabel}
    </div>
  `;

  const marker = new AMap.Marker({
    position: new AMap.LngLat(point.lon, point.lat),
    content: markerHtml,
    anchor: 'center',
    zIndex: 9000,
  });

  map.add(marker);
  markers.value.push(marker);
  console.log(`添加标记点 ${index}: ${markerLabel} (${markerClass})`);
};

// 添加线段
const addLineSegment = (fromPoint, toPoint) => {
  const path = [
    new AMap.LngLat(fromPoint.lon, fromPoint.lat),
    new AMap.LngLat(toPoint.lon, toPoint.lat),
  ];

  const line = new AMap.Polyline({
    path: path,
    strokeColor: "#409EFF",
    strokeWeight: 3,
    strokeOpacity: 0.8,
    lineStyle: "solid",
  });

  map.add(line);
  lines.value.push(line);
};

// 清除所有覆盖物
const clearOverlays = () => {
  if (map) {
    markers.value.forEach((marker) => map.remove(marker));
    lines.value.forEach((line) => map.remove(line));
    markers.value = [];
    lines.value = [];
  }
};

// 开始绘制路线动画
const startAnimation = () => {
  if (!map) {
    ElMessage.warning("地图未加载完成");
    return;
  }

  // 重置状态
  clearOverlays();
  currentPoint.value = { ...startPoint };
  animatedPoints.value = [startPoint]; // 重置为仅起点
  let animationSeconds = 0; // 动画已运行秒数

  ElMessage.success("轨迹动画已开始");

  // 清除旧定时器
  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }

  // 添加起点标记
  addMarker(startPoint, 0);

  // 每秒更新经纬度
  animationTimer.value = setInterval(() => {
    animationSeconds++;

    // 计算新坐标（使用精确的终点计算）
    const progress = Math.min(animationSeconds / totalSeconds, 1);
    const newLon = startPoint.lon + progress * (endPoint.lon - startPoint.lon);
    const newLat = startPoint.lat + progress * (endPoint.lat - startPoint.lat);

    // 更新当前点
    currentPoint.value = {
      lon: newLon,
      lat: newLat,
      alt: 30,
    };
    // 添加新点到轨迹
    animatedPoints.value.push(currentPoint.value);

    // 确定是否为最后一个点
    const isLastPoint = animationSeconds >= totalSeconds;

    // 添加新标记点和连线
    const newIndex = animatedPoints.value.length - 1;
    addMarker(currentPoint.value, newIndex, isLastPoint);

    if (newIndex >= 1) {
      const prevPoint = animatedPoints.value[newIndex - 1];
      addLineSegment(prevPoint, currentPoint.value);
    }

    // 移动地图视野跟随动画
    map.panTo(new AMap.LngLat(newLon, newLat));

    // 到达终点或超时停止动画
    if (isLastPoint) {
      clearInterval(animationTimer.value);
      ElMessage.success("已到达终点");
    }
  }, 1000);
};

// 开始拖动
const startDrag = (e) => {
  if (!isConnected.value || isLocked.value) return; // 加锁时禁止拖动
  isDragging.value = true;
  startX.value = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", handleDrag, { passive: false });
  document.addEventListener("touchend", stopDrag);
  e.preventDefault();
  e.stopPropagation();
};

// 拖动过程
const handleDrag = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  e.stopPropagation();
  // 获取当前位置
  const currentX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
  const diffX = currentX - startX.value;
  // 计算新位置（基于当前状态限制范围）
  let newPosition;
  if (isLocked.value) {
    newPosition = Math.max(
      0,
      Math.min(MAX_THUMB_POSITION, MAX_THUMB_POSITION + diffX)
    );
  } else {
    newPosition = Math.max(0, Math.min(MAX_THUMB_POSITION, 0 + diffX));
  }
  // 更新滑块位置
  thumbPosition.value = newPosition;
};

// 结束拖动
const stopDrag = async () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  // 移除事件监听
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.removeEventListener("touchmove", handleDrag);
  document.removeEventListener("touchend", stopDrag);
  // 判断是否需要切换状态（超过一半距离）
  const shouldLock = thumbPosition.value > MAX_THUMB_POSITION / 2;
  // 如果状态发生变化
  if (shouldLock !== isLocked.value) {
    try {
      // 发送锁定/解锁指令
      const res = await droneDisarm({
        droneId: selectedDeviceId.value,
      });
      console.log(res, "[=========]");

      if (res.code === 200) {
        isLocked.value = shouldLock;
        ElMessage.success(`加锁成功`);
        // 关键逻辑：加锁时限制操作权限，解锁时恢复
        canOperate.value = !isLocked.value;
        // 加锁后滑块固定在右侧，禁止拖动
        if (isLocked.value) {
          thumbPosition.value = MAX_THUMB_POSITION;
        } else {
          thumbPosition.value = 0;
        }
      } else {
        // 指令失败，恢复原位置
        thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
        ElMessage.error(res.message || "操作失败");
      }
    } catch (error) {
      // 发生错误，恢复原位置
      thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
      ElMessage.error("操作失败");
    }
  } else {
    // 未切换状态，回到原位置
    thumbPosition.value = shouldLock ? MAX_THUMB_POSITION : 0;
  }
};
// 修改handleSearch方法
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning("请输入无人机编号");
    return;
  }
  try {
    let aaa = searchQuery.value.trim();
    console.log(searchQuery.value, "------");
    console.log(searchQuery.value.trim, "------");
    // 调用后端API，传递deviceNumber参数
    const response = await deviceDetails({
      deviceNumber: searchQuery.value.trim(),
    });
    if (response.code === 200) {
      // 格式化返回的数据，匹配设备信息展示结构
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
      // 设置当前选中的设备ID，用于后续操作
      selectedDeviceId.value = response.data.deviceNumber;

      const prefixes = ["rtmp://121.41.60.99:", "rtsp://121.41.60.99:"];
      const rtmpUrl = response.data.videoIp;
      console.log(rtmpUrl, "rtmpUrl");
      if (rtmpUrl) {
        if (rtmpUrl.endsWith("hls.m3u8")) {
          dronM3u8PlayerShow.value = true; // 符合条件，显示第二个播放器
        } else {
          droneMonitoringShow.value = true; // 不符合，显示第一个播放器
        }
      }
      console.log(response.data.videoIp, "==========");
      // 找到匹配的前缀（如果存在）
      const matchedPrefix = prefixes.find((prefix) =>
        rtmpUrl.startsWith(prefix)
      );
      const isMatch = !!matchedPrefix; // 转换为布尔值判断是否匹配
      console.log(isMatch, "isMatch");

      // 如果匹配，则提取路径部分（live/stream2）
      if (isMatch) {
        // 使用实际匹配的前缀长度来截取，避免因前缀长度不同导致错误
        const afterPrefix = rtmpUrl.slice(matchedPrefix.length);
        const parts = afterPrefix.split("/");
        droneMonitoringUrl.value = parts.slice(1).join("/");
        console.log("提取的路径部分: ", droneMonitoringUrl.value);
        // 注意这里修正了模板字符串的变量名
        console.log(
          "完整的url: ",
          `ws://121.41.60.99:8082/${droneMonitoringUrl.value}.live.flv`
        );
      }
      ElMessage.success("搜索成功");
      isConnected.value = true;
      status.value.connected = isConnected.value;
      // droneSetup(); //无人机模式设置
      updateDeviceOnlineStatus();
      // 清除已有定时器（避免重复）
      if (statusTimer.value) {
        clearInterval(statusTimer.value);
      }
      // 启动新定时器，每隔REFRESH_INTERVAL毫秒更新一次状态
      statusTimer.value = setInterval(() => {
        updateDeviceOnlineStatus(searchQuery.value.trim());
      }, REFRESH_INTERVAL);
    } else {
      ElMessage.error(response.message || "搜索失败");
    }
  } catch (error) {
    console.error("搜索失败:", error);
  }
};
//清除无人机编号并且清除定时器
const handleSearchClear = () => {
  searchQuery.value = "";
  selectedDeviceInfo.value = null;
  // 清除定时器
  if (statusTimer.value) {
    clearInterval(statusTimer.value);
    statusTimer.value = null;
    ElMessage.info("已停止状态刷新");
  }
};
// 创建轨迹线
const createTrackPolyline = () => {
  if (trackPolyline) map.remove(trackPolyline);
  trackPolyline = new AMap.Polyline([], {
    strokeColor: "#2C64A7",
    strokeWeight: 4,
    strokeOpacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round',
  });
  map.add(trackPolyline);
};
//查看详情弹窗关闭
const handleClose = () => {
  dialogVisible.value = false;
};
//飞行时间 转换
const convertTime = (value) => {
  const timeStr = value;
  const date = new Date(timeStr);
  // 1. 获取本地时区（如中国标准时间，UTC+8）的时分秒
  const localHours = date.getHours();
  const localMinutes = date.getMinutes();
  const localSeconds = date.getSeconds();

  // 格式化时分秒为两位数（如2→"02"）
  const format = (num) => num.toString().padStart(2, "0");

  // 拼接结果
  const localTime = `${format(localHours)}:${format(localMinutes)}:${format(
    localSeconds
  )}`;
  return localTime;
};

const flyDirection = async (index, direction) => {
  // 添加 async 关键字
  try {
    console.log(direction);
    let x = 0;
    let y = 0;
    let z = 0;
    let r = 0;
    if (index === 1) {
      if (direction === "forward") {
        x = controlSensitivity.value;
      } else if (direction === "left") {
        y = -controlSensitivity.value;
      } else if (direction === "right") {
        y = controlSensitivity.value;
      } else if (direction === "backward") {
        x = -controlSensitivity.value;
      } else if (direction === "flyDirection") {
        x = 0;
        y = 0;
        z = 0;
        r = 0;
      }
    } else {
      if (direction === "forward") {
        z = controlSensitivity.value;
      } else if (direction === "left") {
        r = -controlSensitivity.value;
      } else if (direction === "right") {
        r = controlSensitivity.value;
      } else if (direction === "backward") {
        z = -controlSensitivity.value;
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
    console.log(res, "=========>");
    if (res.code === 200) {
      ElMessage.success(res.data);
    }
    console.log(res);
  } catch (error) {
    console.error("发送控制指令失败:", error);
    ElMessage.error("发送控制指令失败: " + (error.message || "未知错误"));
  }
};
const handleVideoControl = async (direction) => {
  try {
    const res = await sendMoveCommand({
      id: searchQuery.value,
      ip: selectedDeviceInfo.value.ip,
      command: direction,
      video_ip: selectedDeviceInfo.value.videoIp,
      data_port: selectedDeviceInfo.value.dataPort,
      control_port: selectedDeviceInfo.value.controlPort,
      picture_port: selectedDeviceInfo.value.picturePort,
    });
    console.log(res);
  } catch (error) {
    console.error("发送控制指令失败:", error);
    ElMessage.error("发送控制指令失败: " + (error.message || "未知错误"));
  }

  ElMessage.info(`发送${direction}控制指令`);
};
// 解锁按钮点击事件
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
    // 用户点击确定后的逻辑
    try {
      unlockLoading.value = true;
      const res = await droneArm({
        droneId: selectedDeviceId.value,
      });
      console.log(res);

      if (res.code === 200) {
        ElMessage.success("无人机解锁成功");
        // 可以在这里更新无人机状态
        isLocked.value = false; // 解锁后设置为未加锁状态
        canOperate.value = true; // 恢复操作权限
        thumbPosition.value = 0; // 滑块回到初始位置
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
    // 用户点击取消或其他错误
    ElMessage.info("已取消解锁操作");
  }
};
//一键返航
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
        // 可以在这里更新无人机状态
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
const returnPointSettings = async () => {
  console.log("返航点设置");
  ElMessage.info("请在地图上标注返航点，可拖拽标记调整位置");
};
//一键起飞
const handleTakeoff = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }
  ElMessageBox.confirm("确定让无人机起飞吗？", "起飞确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    showInput: true, // 显式声明显示输入框（关键属性）
    inputType: "number",
    inputPlaceholder: "请输入起飞高度",
    inputPattern: /^[1-9]\d*$/, // 匹配大于0的整数
    inputErrorMessage: "请输入有效起飞高度",
  }).then(async (value) => {
    try {
      console.log(value, "=======value");
      if (value.value) {
        unlockLoading.value = true;
        const res = await droneTakeoff({
          droneId: selectedDeviceId.value,
          altitude: value.value, // 发送起飞指令
        });

        if (res.code === 200) {
          ElMessage.success("无人机起飞成功");
          isLocked.value = false; // 解锁后设置为未加锁状态
          canOperate.value = true; // 恢复操作权限
          thumbPosition.value = 0; // 滑块回到初始位置
          // 可以在这里更新无人机状态
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
//降落
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
        altitude: uavStatusContent?.global_position_int?.alt || 0, // 发送起飞指令
      });
      if (res.code === 200) {
        ElMessage.success("无人机降落成功");
        // 可以在这里更新无人机状态
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
//无人机模式设置
const droneSetup = async () => {
  try {
    let res = await droneMode({
      droneId: selectedDeviceId.value,
      mode: droneModeSetting.value,
    });
    if (res.code === 200) {
      ElMessage.success(res.data);
    }
    console.log(res, "111");
  } catch (error) {
    console.log(error);
  }
};
//无人机模式设置
const droneModeSettingChange = (value) => {
  // 保存当前值为“旧值”（用于取消时恢复）
  // 存储待确认的值
  pendingValue = value;
  console.log(lastModeValue, "=========");

  ElMessageBox.confirm("是否切换无人机模式设置", "警告", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      // if (selectedDeviceId.value) {
      //   droneModeSetting.value = value;
      //   droneSetup(); //无人机模式设置
      // }
      droneModeSetting.value = value;
      // 确认：更新最终值
      lastConfirmedValue = value;
      droneSetup();
    })
    .catch((error) => {
      // 取消：强制回滚到最后确认的值
      droneModeSetting.value = lastConfirmedValue;

      console.log("error", error);
    });
};
// 监听下拉框展开/收起（关键修复）
const handleVisibleChange = (isVisible) => {
  // 当下拉框收起时，如果没有确认过（pending状态），强制回滚
  if (
    !isVisible &&
    pendingValue !== null &&
    pendingValue !== lastConfirmedValue
  ) {
    droneModeSetting.value = lastConfirmedValue;
  }
};

// 手动触发相同值的选择（通过点击选项文本）
const forceChange = async (value) => {
  // 如果选择的值和最后确认值相同，强制触发事件
  if (value === lastConfirmedValue) {
    // 步骤1：临时改为无效值
    droneModeSetting.value = "INVALID";
    await nextTick();
    // 步骤2：改回目标值，触发@change
    droneModeSetting.value = value;
  }
};

// 初始化选项点击监听
const initOptionListener = () => {
  // 等待组件渲染完成
  nextTick(() => {
    const dropdown = selectRef.value.$el.querySelector(".el-select-dropdown");
    if (dropdown) {
      // 监听所有选项的点击
      dropdown.addEventListener("click", (e) => {
        const option = e.target.closest(".el-select-dropdown__item");
        if (option) {
          const value = option.dataset.value;
          forceChange(value); // 强制处理相同值选择
        }
      });
    }
  });
};

//无人机模式设置
const droneModeSettingChange2 = (value) => {
  controlSensitivity.value = value;
};
//上传航线 api/drones/mission
const handleUploadMission = () => {
  returnVoyageDialogVisibleUploadRoute.value = true;
};
// 添加新的处理方法
const handleUploadRouteConfirm = async (routeId) => {
  try {
    if (routeId) {
      const res = await doMission({
        droneId: searchQuery.value,
        missionId: routeId + "",
      });
      if (res.code === 200) {
        ElMessage.success("上传航线成功");

        // 转换数据
        const jsonData = JSON.parse(res.data);
        // 航点转换成航线，并转换经纬度为数字类型
        let routePoints = jsonData.routeData.points.map(point => ({
          ...point,
          lon: parseFloat(point.lon),
          lat: parseFloat(point.lat),
          alt: parseFloat(point.alt || 30)
        }));
        markRouteOnMap(routePoints);

        // 关闭上传航线弹窗
        returnVoyageDialogVisibleUploadRoute.value = false;
      }
    }
  } catch (error) {
    console.error("上传航线失败:", error);
    // ElMessage.error("上传航线失败");
  }
};

const handleUploadRouteCancel = () => {
  console.log("用户取消了航线选择");
};
const flyToNextWaypoint = async () => {
  if (!isFlying.value) return; // 非飞行状态直接返回
  // ① 校验是否已到达终点E
  if (currentWaypointIndex.value >= currentRoutePoints.length - 1) {
    clearInterval(flyingTimer.value); // 停止定时器
    isFlying.value = false;
    percentage.value = 100; // 进度条拉满
    ElMessage.success("已成功到达航线终点（E点）");
    return;
  }

  // ② 获取当前目标路径点（currentWaypointIndex指向的点）和下一个点
  const targetWaypoint = currentRoutePoints[currentWaypointIndex.value + 1];
  // 计算“飞机当前位置”到“下一个路径点”的距离
  const distanceToTarget = calculateDistance(
    planeRealTimePos.lat,
    planeRealTimePos.lon,
    targetWaypoint.lat,
    targetWaypoint.lon
  );

  // ③ 若已接近目标点（误差≤0.5米），切换到下一个路径点
  if (distanceToTarget <= 0.5) {
    currentWaypointIndex.value += 1;
    return;
  }

  // ④ 计算100ms内需要移动的距离（速度2m/s → 0.2m/100ms）
  const moveStep = FLY_SPEED * 0.1; // 0.1秒=100ms
  // 计算经纬度增量（按移动距离占总距离的比例分配，保证方向正确）
  const lonStep =
    (targetWaypoint.lon - planeRealTimePos.lon) * (moveStep / distanceToTarget);
  const latStep =
    (targetWaypoint.lat - planeRealTimePos.lat) * (moveStep / distanceToTarget);

  // ⑤ 更新飞机实时位置
  planeRealTimePos.lon += lonStep;
  planeRealTimePos.lat += latStep;

  // ⑥ 更新飞机标记：调整航向（朝向目标点）+ 位置
  const heading = calculateHeading(
    planeRealTimePos.lon,
    planeRealTimePos.lat,
    targetWaypoint.lon,
    targetWaypoint.lat
  );
  droneHeading.value = heading; // 控制飞机图标旋转
  markPositionOnMap2(
    planeRealTimePos.lon,
    planeRealTimePos.lat,
    planeRealTimePos.alt
  );

  // ⑦ 计算剩余路程和进度条百分比
  const remainingDistance = calculateRemainingDistance();
  // 进度=（1-剩余距离/总距离）×100，限制在0-100之间
  // 容错：当剩余距离≈总距离时，强制进度为0%
  if (Math.abs(remainingDistance - routeTotalDistance.value) < 0.5) {
    percentage.value = 0;
  } else {
    percentage.value = Math.max(
      0,
      Math.min(
        100,
        Math.round((1 - remainingDistance / routeTotalDistance.value) * 100)
      )
    );
  }
};
// 辅助方法2：计算“飞机当前位置”到“终点E”的剩余距离
const calculateRemainingDistance = () => {
  let remaining = 0;
  const currentIndex = currentWaypointIndex.value;
  // 下一个目标点索引（初始时currentIndex=0，下一个是1）
  const nextIndex = currentIndex + 1;

  // ① 计算：飞机当前位置 → 下一个点的距离（初始时是S→第一个中间点）
  const currentPos = planeRealTimePos;
  const nextPoint = currentRoutePoints[nextIndex];
  if (nextPoint) {
    const distToNext = calculateDistance(
      currentPos.lat,
      currentPos.lon,
      nextPoint.lat,
      nextPoint.lon
    );
    remaining += distToNext;
    console.log(
      `当前位置到点${nextIndex}的距离：`,
      distToNext.toFixed(2),
      "米"
    );
  }

  // ② 计算：所有后续航段的距离（从nextIndex到终点）
  for (let i = nextIndex; i < currentRoutePoints.length - 1; i++) {
    const p1 = currentRoutePoints[i];
    const p2 = currentRoutePoints[i + 1];
    remaining += calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
  }

  // 日志：验证初始剩余距离是否等于总距离
  console.log(
    "剩余距离：",
    remaining.toFixed(2),
    "米 | 总距离：",
    routeTotalDistance.value.toFixed(2),
    "米"
  );
  return remaining;
};
// 辅助方法3：计算飞机航向（朝向目标点的角度，用于图标旋转）
const calculateHeading = (currentLon, currentLat, targetLon, targetLat) => {
  const dLon = targetLon - currentLon;
  const dLat = targetLat - currentLat;
  // 计算方位角（弧度转角度）
  let heading = Math.atan2(dLon, dLat) * (180 / Math.PI);
  // 调整为0-360度（与现有droneHeading逻辑兼容）
  if (heading < 0) heading += 360;
  return heading;
};
const successExecutedRoute = async () => {
  try {
    //2. 调用接口（带错误捕获）
    let res = await oneClickExecute({
      droneId: searchQuery.value,
    });
    // 3. 接口成功后的逻辑（如提示、数据处理）
    console.log("一键执行成功：", res.data);
    if (res.code === 200) {
      // 一键执行的接口成功，开始执行航线
      startMission();
    }
  } catch (error) {
    // 4. 接口失败后的处理（如打印错误、提示用户）
    console.error("一键执行失败：", error.response?.data || error.message);
    // ElMessage.error("指令发送失败，请重试");
  }
};
//执行航线处理函数
const startMission = async () => {
  console.log("执行航线");
  // 1. 前置校验：避免无效操作
  if (currentRoutePoints.length < 2) {
    ElMessage.warning("请先上传有效航线（至少包含起点S和终点E）");
    return;
  }
  if (isFlying.value) {
    ElMessage.info("无人机已在沿航线飞行，无需重复启动");
    return;
  }
  if (!selectedDeviceId.value) {
    ElMessage.warning("请先选择无人机设备");
    return;
  }

  // 2. 弹出确认框（可选，增强交互安全性）
  try {
    await ElMessageBox.confirm(
      "确定让无人机沿标注航线飞行吗？",
      "执行航线确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch (error) {
    ElMessage.info("已取消执行航线");
    return;
  }

  // 3. 初始化飞行状态
  percentage.value = 0; // 执行航线前强制重置进度条
  isFlying.value = true;
  currentWaypointIndex.value = 0; // 从S点（索引0）开始飞行
  percentage.value = 0; // 进度条重置为0%

  // 4. 强制小飞机初始位置与S点（航点0）完全一致
  const startPoint = currentRoutePoints[0];
  if (!startPoint) {
    ElMessage.error("航线数据异常");
    return;
  }
  // 强制保留6位小数，与航点坐标严格对齐
  planeRealTimePos.lon = parseFloat(startPoint.lon.toFixed(6));
  planeRealTimePos.lat = parseFloat(startPoint.lat.toFixed(6));
  // 打印初始位置与S点的对比（关键验证）
  console.log(`🚀  初始位置 vs S点：`, {
    小飞机初始lon: planeRealTimePos.lon,
    S点lon: startPoint.lon.toFixed(6),
    小飞机初始lat: planeRealTimePos.lat,
    S点lat: startPoint.lat.toFixed(6),
  });
  // 更新飞机标记到S点（复用现有方法）
  markPositionOnMap2(
    planeRealTimePos.lon,
    planeRealTimePos.lat,
    planeRealTimePos.alt
  );

  // 5. 启动定时器：每100ms更新一次位置（保证移动平滑）
  // 启动定时器前，手动计算一次初始进度（确保为0%）
  const initialRemaining = calculateRemainingDistance();
  percentage.value = Math.round(
    (1 - initialRemaining / routeTotalDistance.value) * 100
  );
  console.log("初始进度：", percentage.value, "%"); // 此处必须为0%

  // 启动定时器
  flyingTimer.value = setInterval(async () => {
    await flyToNextWaypoint();
  }, 100);
};
//暂停
const handlePauseMission = () => {
  // 1. 停止飞行定时器（核心：定时器停止，位置不再更新）
  if (flyingTimer.value) {
    clearInterval(flyingTimer.value);
    flyingTimer.value = null; // 重置定时器，避免内存泄漏
  }

  // 2. 重置飞行状态（标记为未飞行）
  isFlying.value = false;

  // 3. 提示用户暂停成功
  ElMessage.success("飞行已暂停，小飞机停止移动");

  // 4. 可选：打印当前暂停位置（便于调试）
  console.log(
    `✈️  飞行暂停，当前位置：lon=${planeRealTimePos.lon.toFixed(
      6
    )}, lat=${planeRealTimePos.lat.toFixed(6)}`
  );
};
//返航点设置 取消
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
// 返航点设置确认
const submitForm = async () => {
  returnVoyageFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保经纬度来自拖拽后的最新值
        const lng = parseFloat(returnVoyageForm.value.longitude);
        const lat = parseFloat(returnVoyageForm.value.latitude);
        const alt = returnVoyageForm.value.height * 100;

        // 验证经纬度有效性
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

        // 发送到后端
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

          // 更新地图标记为不可拖拽状态（可选）
          if (returnVoyageMarker.value) {
            const markerElement = returnVoyageMarker.value._icon._element;
            markerElement.style.cursor = "default"; // 恢复默认光标
            // 移除拖拽事件监听
            markerElement.removeEventListener("mousedown", () => {});
            markerElement.removeEventListener("touchstart", () => {});
          }
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

// 修改地图标注方法
const markPositionOnMap2 = (lng, lat, height) => {
  console.log(lng, lat, "");

  if (!map) {
    ElMessage.warning("地图未加载完成，无法标注位置");
    return;
  }
  try {
    // 清除已有的返航点标记
    clearReturnVoyageMarkers2();
    // 创建经纬度对象
    const point = new AMap.LngLat(lng, lat);
    // 创建自定义HTML标记（使用DivIcon替代Control）
    const html = `
<div style="
  position: relative;
  display: flex; /* 启用 Flex 布局 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */


">
  <!-- 图标居中显示 -->
  <div style="
    width: 26px;
    height: 26px;
    background-image: url('${planeIcon}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    margin: 0;
    position: absolute; /* 让图标作为背景层，不影响文字布局 */
    transform: rotate(${droneHeading.value}deg);
    transform-origin: center; /* 旋转中心点设为容器中心 */
  "></div>
</div>
`;
    // 创建Marker
    const marker = new AMap.Marker({
      position: point,
      content: html,
      anchor: "center",
      zIndex: 10000,
    });
    map.add(marker);
    // 保存标记引用以便后续清除
    dronePositionMarker.value = marker;
    // 核心逻辑：根据状态决定缩放级别
    let targetZoom;
    if (isFirstLoad.value && !isUserZoomed.value) {
      // 首次加载且未手动缩放：用默认级别16
      targetZoom = 16;
      isFirstLoad.value = false; // 首次加载后标记为非首次
    } else {
      // 非首次加载或用户已手动缩放：用当前地图的缩放级别
      targetZoom = map.getZoom();
    }
    // 移动到目标位置，使用计算出的缩放级别（不会重置为16）
    map.setCenter(point);
    map.setZoom(targetZoom);
  } catch (error) {
    console.error("标注位置失败:", error);
    ElMessage.error("标注位置失败");
  }
};
// 清除返航点标记
let returnVoyageMarker = ref(null);
const clearReturnVoyageMarkers = () => {
  if (returnVoyageMarker.value && map) {
    try {
      map.remove(returnVoyageMarker.value);
    } catch (error) {
      console.warn("清除标记失败:", error);
    }
  }
  returnVoyageMarker.value = null;
};
// 清除返航点标记
let dronePositionMarker = ref(null);
const clearReturnVoyageMarkers2 = () => {
  if (dronePositionMarker.value && map) {
    map.remove(dronePositionMarker.value);
    dronePositionMarker.value = null;
  }
};
//任务列表
const taskManagement = async () => {
  try {
    let res = await missionAllList({
      keyword: taskName.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    if (res.code === 200) {
      taskAllList.value = res.data.list;
      total.value = res.data.total;
    }
    console.log(res, "qwefrfdg");
  } catch (err) {}
};
// 任务航线管理
const handleRouteManage = async (row) => {
  console.log(row, "row任务无人机管理");
  try {
    let missionId = selectedMission.value.missionId;
    const res = await missioRoutes(missionId);
    console.log(res, "resresres");

    if (res.code === 200) {
      routeList.value = res.data;
      //渲染到select上
      taskOptions.value = res.data.map((item) => {
        return {
          value: item.routeId,
          label: item.routeName,
        };
      });
    } else {
      ElMessage.warning("获取无人机列表失败");
    }
  } catch (error) {
    console.error("获取无人机列表失败:", error);
    ElMessage.error("获取无人机列表失败");
  }
};
//选择航线
const handleRouteSelect = (value) => {
  taskRouteId.value = value;
  console.log(value, "resresres");
};
const executeMission = async (value) => {
  try {
    // 1. 获取选中的航线数据
    let filterFlightRoutes = routeList.value.filter(
      (item) => item.routeId === taskRouteId.value
    );
    if (!filterFlightRoutes.length) {
      ElMessage.warning("未找到对应的航线数据");
      return;
    }
    const selectedRoute = filterFlightRoutes[0];
    // 2. 检查是否有航点数据
    if (!selectedRoute.pointsJson) {
      ElMessage.warning("该航线没有航点数据");
      return;
    }

    // 3. 解析航点JSON数据
    let routeData;
    try {
      routeData = JSON.parse(selectedRoute.pointsJson);

      // 确保有points数组
      if (!routeData.routeData || !Array.isArray(routeData.routeData.points)) {
        ElMessage.warning("航点数据格式不正确");
        return;
      }

      // 检查数组是否为空
      if (routeData.routeData.points.length === 0) {
        ElMessage.warning("航点数据为空");
        return;
      }

      console.log("解析的航点数据:", routeData.routeData.points);
    } catch (parseError) {
      console.error("解析航点JSON失败:", parseError);
      ElMessage.error("航点数据解析失败");
      return;
    }

    // 4. 如果有无人机设备，自动搜索
    if (value.assignedDevice && value.assignedDevice.deviceNumber) {
      // 拿到任务里面的无人机编号
      searchQuery.value = value.assignedDevice.deviceNumber;
      // 自动搜索无人机
      await handleSearch();
    }

    // 5. 提取并转换航点数据格式
    const rawPoints = routeData.routeData.points;
    const formattedRoutePoints = rawPoints.map((point) => {
      // 注意：第一个点的lat是字符串，需要转换为数字
      return {
        lat: parseFloat(point.lat),
        lon: parseFloat(point.lon),
        alt: parseFloat(point.alt) || 30, // 默认高度30米
      };
    });

    // 过滤掉转换后无效的点（经纬度为NaN）
    const validRoutePoints = formattedRoutePoints.filter(
      (point) =>
        !isNaN(point.lon) &&
        !isNaN(point.lat) &&
        point.lon !== 0 &&
        point.lat !== 0
    );

    if (validRoutePoints.length < 2) {
      ElMessage.warning("有效航点数量不足，无法生成航线");
      return;
    }

    // 6. 调用地图标注方法
    markRouteOnMap(validRoutePoints);

    // 7. 显示成功消息
    ElMessage.success(
      `航线 "${selectedRoute.routeName || "未命名航线"}" 已加载到地图`
    );

    // 8. 关闭任务详情面板
    showTaskDetails.value = false;

    // 9. 自动计算并显示航线总距离
    const totalDistance = calculateTotalRouteDistance(validRoutePoints);
    console.log(`航线总路程：${totalDistance} 米`);
  } catch (error) {
    console.error("执行任务航线失败:", error);
    ElMessage.error("加载航线失败: " + (error.message || "未知错误"));
  }
};
watch(
  isCollapse,
  (newVal) => {
    console.log("isCollapse变化了:", newVal);
    // 当折叠状态变化时，触发地图尺寸重计算
    if (map && typeof map.checkResize === "function") {
      // 延迟一小段时间，确保DOM已经更新完成
      setTimeout(() => {
        map.checkResize(); // 高德地图API提供的重绘方法
        // 如果有必要，可以同时调整地图视野
        if (currentPosition.value) {
          map.panTo(
            new AMap.LngLat(currentPosition.value.lng, currentPosition.value.lat)
          );
        }
      }, 300);
    }
  },
  { immediate: true }
);
watch(
  showTaskDetails,
  (newVal, oldVal) => {
    // 当弹窗从显示（true）变为隐藏（false）时，清空航线选中状态
    if (oldVal === true && newVal === false) {
      console.log("任务详情弹窗关闭，清空选中航线");
      // 1. 清空下拉框绑定的选中值
      selectedRouteValue.value = "";
      // 2. 清空航线ID
      taskRouteId.value = 0;
    }
  },
  { immediate: false } // 初始加载时不触发，仅状态变化时触发
);
// 生命周期钩子
onMounted(() => {
  // console.log('%c ', 'color:pink; font-size:14px')
  const topElement = document.querySelector(".drone-monitor");
  if (topElement) {
    topElement.scrollIntoView({
      behavior: "smooth",
      block: "start", // 元素顶部与视口顶部对齐，但会受scroll-margin-top影响
    });
  }
  initMap();
  getAllPolicies(); //获取策略
  initOptionListener();
  //任务管理
  taskManagement();
  // 根据初始锁定状态设置滑块位置
  thumbPosition.value = isLocked.value ? MAX_THUMB_POSITION : 0;
  window.addEventListener("resize", handleResize);
  // 找到当前页面的.page-content元素（确保只作用于当前页面的容器）
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    // 添加自定义类名（无padding）
    pageContent.classList.add("current-page-no-padding");
  }
  document.addEventListener("click", handleClickOutside);
});
// 挂载到父容器
const parentElement = document.querySelector(".parent-container");
parentElement?.addEventListener("click", handleClickOutside);

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);

  document.removeEventListener("click", handleClickOutside);
  // 清除定时器
  if (statusTimer.value) {
    clearInterval(statusTimer.value);
    statusTimer.value = null;
  }
  // ===== 新增：停止飞行定时器，避免内存泄漏 =====
  if (flyingTimer.value) {
    clearInterval(flyingTimer.value);
    isFlying.value = false; // 重置飞行状态
  }
  //清除padding避免影响其他页面
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.remove("current-page-no-padding");
  }
  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }
  clearOverlays();
  if (map) {
    map = null;
  }
  // 清理所有标记
  trackState.markers.forEach((marker) => {
    try {
      map.remove(marker);
    } catch (error) {
      /* 忽略错误 */
    }
  });

  // 清理所有标签
  trackState.labels.forEach((label, key) => {
    try {
      map.removeControl(label);
    } catch (error) {
      /* 忽略错误 */
    }
  });

  // 清理轨迹线
  if (trackPolyline) {
    try {
      map.remove(trackPolyline);
    } catch (error) {
      /* 忽略错误 */
    }
    trackPolyline = null;
  }

  // 清空数组
  trackState.points = [];
  trackState.markers = [];
  trackState.labels.clear();
});

// 响应式处理
function handleResize() {
  if (map && mapContainer.value) {
    map.checkResize();
  }
}
// 获取所有策略（确保value为数字类型）
const getAllPolicies = async () => {
  try {
    const res = await dronePolicyList();
    if (res.code === 200) {
      waypointOptions.value = res.data.map((item) => ({
        ...item,
        value: Number(item.id), // 转为数字类型，与1精确匹配
        label: item.name,
      }));
    }
  } catch (error) {
    console.error("获取所有策略:", error);
    ElMessage.error("获取所有策略失败");
  }
};

// 策略选择变化处理（保持同步）
const handleSelectStrategyChange = (value) => {
  console.log("当前选中策略ID:", value);
};
// 1. 工具函数：角度转弧度
const degreesToRadians = (degrees) => {
  return (degrees * Math.PI) / 180;
};

// 2. 工具函数：计算两点间距离（米）
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000; // 地球半径（米）
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c; // 返回两点距离（米）
};

// 3. 核心函数：计算航线总路程
const calculateTotalRouteDistance = (routePoints) => {
  console.log(routePoints, "routePoints");

  let totalDistance = 0;
  // 遍历相邻两点，累加距离
  for (let i = 0; i < routePoints.length - 1; i++) {
    const currentPoint = routePoints[i];
    const nextPoint = routePoints[i + 1];
    // 提取当前点和下一点的经纬度
    const lat1 = currentPoint.lat;
    const lon1 = currentPoint.lon;
    const lat2 = nextPoint.lat;
    const lon2 = nextPoint.lon;
    // 计算当前段距离并累加
    const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
    totalDistance += segmentDistance;
  }
  return totalDistance.toFixed(3); // 保留1位小数，返回总路程（米）
};
// mock假数据
const mockMissionResponse = {
  code: 200, // 成功状态码
  message: "航线文件上传成功", // 提示信息
  data: JSON.stringify({
    // data 为 JSON 字符串，前端会 JSON.parse 解析
    routeData: {
      points: [
        { lat: 34.75682, lon: 113.66234, alt: 30 }, // 起点S
        { lat: 34.7571575, lon: 113.662751, alt: 30 }, // 航点1
        { lat: 34.757495, lon: 113.663162, alt: 30 }, // 航点2
        { lat: 34.7578325, lon: 113.663573, alt: 30 }, // 航点3
        { lat: 34.75817, lon: 113.663984, alt: 30 }, // 终点E
      ],
      routeName: "郑州城区测试航线", // 可选：航线名称（前端可忽略）
      totalPoints: 5, // 可选：航点总数（前端可忽略）
    },
    missionId: "mock-mission-123", // 可选：任务ID（前端可忽略）
  }),
};
const uploadFile = async () => {
  if (fileName.value === "") {
    ElMessage.warning("请输入文件名后再上传");
    return;
  } else if (fileDescription.value === "") {
    ElMessage.warning("请输入文件描述后再上传");
    return;
  } else if (waypointStrategy.value === "") {
    ElMessage.warning("请选择航点策略后再上传");
    return;
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".kml"; // 只允许选择kml文件
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", fileName.value);
        formData.append("description", fileDescription.value);
        formData.append("policyId", waypointStrategy.value);

        console.log("上传文件参数：", {
          fileName: fileName.value,
          fileDescription: fileDescription.value,
          waypointStrategy: waypointStrategy.value,
          file: file.name
        });

        // 使用新的API函数上传文件
        const response = await uploadRouteFile(formData);

        console.log("文件上传响应：", response);

        if (response.code === 200) {
          ElMessage.success("上传成功");
          fileName.value = "";
          fileDescription.value = "";
          waypointStrategy.value = "";

          let jsonRouteData;
          try {
            jsonRouteData = typeof response.data === 'string'
              ? JSON.parse(response.data)
              : response.data;

            if (jsonRouteData && jsonRouteData.routeData) {
              const routeData = jsonRouteData.routeData;
              const routePoints = routeData.points || [];
              markRouteOnMap(routePoints);

              const totalDistance = calculateTotalRouteDistance(routePoints);
              console.log(`航线总路程：${totalDistance} 米`);
            } else {
              ElMessage.warning("上传成功，但未获取到航线数据");
            }
          } catch (parseError) {
            console.error("解析返回的航线数据失败：", parseError);
            ElMessage.warning("文件上传成功，但解析航线数据失败");
          }
        } else {
          ElMessage.error(response.message || "上传失败");
        }
      } catch (error) {
        console.error("上传失败：", error);
        ElMessage.error("文件上传失败，请检查网络或联系管理员");

        // 保留原有mock数据逻辑用于测试
        console.log("使用测试数据模拟上传成功");
        const mockResponse = mockMissionResponse;
        if (mockResponse.code === 200) {
          ElMessage.success("上传成功（使用测试数据）");
          fileName.value = "";
          fileDescription.value = "";
          waypointStrategy.value = "";

          let jsonRouteData = JSON.parse(mockResponse.data);
          if (jsonRouteData && jsonRouteData.routeData) {
            const routeData = jsonRouteData.routeData;
            const routePoints = routeData.points || [];
            markRouteOnMap(routePoints);

            const totalDistance = calculateTotalRouteDistance(routePoints);
            console.log(`Mock 航线总路程：${totalDistance} 米`);
          }
        }
      } finally {
        // 关闭加载状态
        // loading.close();
      }
    }
  };
  fileInput.click();
};
// const uploadFile = async () => {
//   if (fileName.value === "") {
//     ElMessage.warning("请输入文件名后再上传");
//     return;
//   } else if (fileDescription.value === "") {
//     ElMessage.warning("请输入文件描述后再上传");
//     return;
//   } else if (waypointStrategy.value === "") {
//     ElMessage.warning("请输入航点策略后再上传");
//     return;
//   }
//   const fileInput = document.createElement("input");
//   fileInput.type = "file";
//   fileInput.onchange = async (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("name", fileName.value); // 添加文件名参数
//       formData.append("description", fileDescription.value); // 添加描述信息
//       formData.append("policyId", waypointStrategy.value); // 添加航线策略 暂时先不传
//       console.log("上传参数:", { fileName: fileName.value, description: fileDescription.value, policyId: waypointStrategy.value, droneId: searchQuery.value });
//       console.log("FormData entries:");
//       for (let pair of formData.entries()) {
//         console.log(pair[0], pair[1]);
//       }
//       try {
//         // 调用 doMission 接口上传航线文件
//         console.log("开始调用 doMission 接口...");
//         const response = await doMission(formData, searchQuery.value);
//         console.log("doMission 接口响应:", response);
        
//         if (response.code === 200) {
//           ElMessage.success("上传成功");
//           fileName.value = "";
//           fileDescription.value = "";
//           waypointStrategy.value = "";

//           // 关闭上传航线弹窗
//           returnVoyageDialogVisibleUploadRoute.value = false;

//           // 解析返回的航线数据
//           let jsonRouteData = null;
//           try {
//             jsonRouteData = JSON.parse(response.data);
//             console.log("解析后的航线数据:", jsonRouteData);
//           } catch (e) {
//             console.warn("解析航线数据失败:", e);
//           }

//           if (jsonRouteData && jsonRouteData.routeData) {
//             // 1. 提取并转换航线数据（与选择已有航线格式对齐）
//             const routeData = jsonRouteData.routeData;
//             let routePoints = routeData.points || []; // 确保拿到点数组

//             // 2. 转换经纬度为数字类型（后端返回的是字符串）
//             routePoints = routePoints.map(point => ({
//               ...point,
//               lon: parseFloat(point.lon),
//               lat: parseFloat(point.lat),
//               alt: parseFloat(point.alt || 30)
//             }));

//             console.log("转换后的航点数据:", routePoints);
//             // 3. 调用markRouteOnMap在地图展示航线
//             markRouteOnMap(routePoints);
//             console.log(jsonRouteData, "jsonRouteData");
//             const totalDistance = calculateTotalRouteDistance(
//               jsonRouteData.routeData.points
//             );
//             console.log(`航线总路程：${totalDistance} 米`); // 输出：航线总路程：315.7 米
//           } else {
//             // 异常处理：上传成功但无航线数据
//             ElMessage.warning("上传成功，但未获取到航线数据，无法在地图展示");
//             console.warn("航线数据缺失：", response.data);
//           }
//         } else {
//           ElMessage.error(response.message || "上传失败");
//         }
//       } catch (error) {
//         ElMessage.error(error.message || "上传失败");
//         console.log(error + "111111", "==www===");
//         // 1. 手动构建 Mock 响应
//         const mockResponse = mockMissionResponse; // 引入上面定义的 Mock 数据
//         // 2. 走原有成功流程：解析 Mock 数据
//         if (mockResponse.code === 200) {
//           ElMessage.success("上传成功（使用测试数据）");
//           // 清空表单（与真实成功逻辑一致）
//           fileName.value = "";
//           fileDescription.value = "";
//           waypointStrategy.value = "";
//           // 解析 Mock 的航线数据（与真实逻辑一致）
//           let jsonRouteData = JSON.parse(mockResponse.data);
//           if (jsonRouteData && jsonRouteData.routeData) {
//             const routeData = jsonRouteData.routeData;
//             const routePoints = routeData.points || [];
//             // 标注航线到地图（与真实逻辑一致）
//             markRouteOnMap(routePoints);
//             // 计算并打印航线总距离（与真实逻辑一致）
//             const totalDistance = calculateTotalRouteDistance(routePoints);
//             console.log(`Mock 航线总路程：${totalDistance} 米`);
//           }
//         } else {
//           ElMessage.error(mockResponse.message || "测试数据加载失败");
//         }
//       }
//     }
//   };
//   fileInput.click();
// };
// 在地图上标注航线点（修复距离计算重复累加问题）
const markRouteOnMap = (routeData) => {
  if (!map) {
    ElMessage.warning("地图未加载完成，无法标注航线");
    return;
  }

  try {
    // 1. 清除旧航线相关数据（标记、线段、距离变量）
    clearRouteMarkers();
    currentRoutePoints.length = 0; // 清空旧航线点数组
    routeTotalDistance.value = 0; // 重置总距离为0

    // 2. 先过滤无效坐标，再一次性收集所有有效航线点（避免循环内重复计算）
    const validRoutePoints = routeData.filter((point) => {
      const { lat, lon } = point;
      // 过滤经纬度为NaN或0的无效点
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
        console.warn(`忽略无效坐标: 纬度=${lat}, 经度=${lon}`);
        return false;
      }
      return true;
    });

    // 3. 验证有效航线点数量（至少2个点才构成航线）
    if (validRoutePoints.length < 2) {
      ElMessage.warning("有效航线点不足2个，无法生成航线");
      return;
    }

    // 4. 一次性转换航线点格式，存入 currentRoutePoints（供后续飞行和距离计算使用）
    // 4. 一次性转换航线点格式，存入 currentRoutePoints
    currentRoutePoints.push(
      ...validRoutePoints.map((point, idx) => {
        const formatted = {
          lat: point.lat,
          lon: point.lon,
          alt: point.alt || 30,
        };
        // 打印每个航点的索引和坐标（关键验证）
        console.log(`🗺️  航线航点${idx}：`, {
          lon: formatted.lon.toFixed(6),
          lat: formatted.lat.toFixed(6),
        });
        return formatted;
      })
    );

    // 5. 调用正确的距离计算函数，一次性获取航线总距离（核心修复：避免重复累加）
    const totalDist = calculateTotalRouteDistance(currentRoutePoints);
    routeTotalDistance.value = parseFloat(totalDist); // 转为数字类型，适配进度条计算
    console.log(
      `✅ 航线总距离（修复后）：${routeTotalDistance.value.toFixed(2)} 米`
    );
    console.log(`✅ 航线总路程（原正确逻辑）：${totalDist} 米`); // 两者结果一致

    // 6. 生成地图标记和航线线段（保留原功能逻辑）
    const mapRoutePoints = []; // 用于高德地图绘制的经纬度数组
    validRoutePoints.forEach((point, index) => {
      const { lat, lon, alt = 30 } = point;
      const lngLat = new AMap.LngLat(lon, lat);
      mapRoutePoints.push(lngLat);

      // 生成标记点（S起点、E终点、中间点）
      let markerLabel, markerClass;
      if (index === 0) {
        markerLabel = "S";
        markerClass = "route-start";
      } else if (index === validRoutePoints.length - 1) {
        markerLabel = "E";
        markerClass = "route-end";
      } else {
        markerLabel = (index + 1).toString();
        markerClass = "route-point";
      }

      const markerHtml = `
        <div class="route-marker ${markerClass}">
          ${markerLabel}
        </div>
      `;

      const marker = new AMap.Marker({
        position: lngLat,
        content: markerHtml,
        anchor: 'center',
        zIndex: 500,
      });
      map.add(marker);
      routeMarkers.push(marker);
    });
    console.log(
      "✅ 过滤后的有效航点：",
      validRoutePoints.map((p) => ({
        lon: p.lon.toFixed(6),
        lat: p.lat.toFixed(6),
      }))
    );
    // 7. 绘制航线线段并调整地图视野（保留原功能）
    drawRouteLine(mapRoutePoints);
    console.log("准备调整地图视野，航点数量:", mapRoutePoints.length);
    fitMapToRoute(mapRoutePoints);
    ElMessage.success(
      `航线标注成功！总长度：${routeTotalDistance.value.toFixed(2)} 米`
    );
  } catch (error) {
    console.error("标注航线失败:", error);
    ElMessage.error("标注航线失败");
  }
};
// 清除航线标记
let routeMarkers = [];
let routeLabels = [];
let routePolyline = null;
const clearRouteMarkers = () => {
  if (map) {
    // 清除标记
    routeMarkers.forEach((marker) => {
      try {
        map.remove(marker);
      } catch (error) {
        /* 忽略错误 */
      }
    });
    routeMarkers = [];

    // 清除标签
    routeLabels.forEach((label) => {
      try {
        map.removeControl(label);
      } catch (error) {
        /* 忽略错误 */
      }
    });
    routeLabels = [];

    // 清除航线
    if (routePolyline) {
      try {
        map.remove(routePolyline);
      } catch (error) {
        /* 忽略错误 */
      }
      routePolyline = null;
    }
  }
};
// 绘制航线（增加高德地图兼容性处理）
const drawRouteLine = (routePoints) => {
  if (!map || routePoints.length < 2) return;

  // 清除旧航线
  if (routePolyline) {
    try {
      map.remove(routePolyline);
    } catch (error) {
      console.warn("清除旧航线失败：", error);
    }
  }

  try {
    // 创建新航线（高德地图）
    routePolyline = new AMap.Polyline({
      path: routePoints,
      strokeColor: "#409EFF",
      strokeWeight: 4,
      strokeOpacity: 0.8,
      lineStyle: "solid",
    });

    map.add(routePolyline);
  } catch (lineErr) {
    console.error("绘制航线失败：", lineErr);
    ElMessage.warning("绘制航线失败");
  }
};

// 优化：调整地图视图以显示完整航线（高德地图兼容版）
const fitMapToRoute = (routePoints) => {
  if (!map || routePoints.length === 0) return;

  try {
    if (routePoints.length === 1) {
      // 只有一个点时，直接定位到该点
      map.panTo(routePoints[0]); // 使用panTo替代setCenter
      map.setZoom(15); // 设置合适的缩放级别
      return;
    }

    // 计算所有点的经纬度范围（优化版）
    let minLng = routePoints[0].lng;
    let maxLng = routePoints[0].lng;
    let minLat = routePoints[0].lat;
    let maxLat = routePoints[0].lat;

    routePoints.forEach((point) => {
      const lng = point.lng;
      const lat = point.lat;

      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    // 计算中心点
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerPoint = new AMap.LngLat(centerLng, centerLat);

    // 计算经纬度跨度
    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;

    // 计算合适的缩放级别（优化算法）
    let zoomLevel = calculateOptimalZoom(lngSpan, latSpan);

    // 添加边距调整
    const marginFactor = 1.2; // 边距系数，可调整
    const adjustedLngSpan = lngSpan * marginFactor;
    const adjustedLatSpan = latSpan * marginFactor;

    // 重新计算考虑边距的缩放级别
    zoomLevel = calculateOptimalZoom(adjustedLngSpan, adjustedLatSpan);

    // 设置地图中心点和缩放级别
    map.panTo(centerPoint); // 使用panTo替代setCenter
    map.setZoom(zoomLevel);

    console.log(
      `地图视野调整完成，中心点: (${centerLng}, ${centerLat}), 缩放级别: ${zoomLevel}`
    );
  } catch (viewErr) {
    console.error("调整地图视图失败：", viewErr);
    ElMessage.warning("无法自动调整地图视野，请手动缩放查看航线");
  }
};
// 优化：计算最优缩放级别（独立函数）
const calculateOptimalZoom = (lngSpan, latSpan) => {
  // 经纬度跨度到实际距离的转换（简化计算，1度约等于111公里）
  const lngDistance = lngSpan * 111;
  const latDistance = latSpan * 111;

  // 计算地图需要显示的最大距离
  const maxDistance = Math.max(lngDistance, latDistance);

  // 根据距离计算缩放级别（高德地图缩放级别范围：1-18）
  let zoomLevel = 18; // 最大缩放级别

  if (maxDistance > 1000) {
    zoomLevel = 10;
  } else if (maxDistance > 100) {
    zoomLevel = 13;
  } else if (maxDistance > 10) {
    zoomLevel = 16;
  } else {
    zoomLevel = 18;
  }

  // 确保缩放级别在有效范围内
  return Math.max(1, Math.min(18, zoomLevel));
};
// 处理数字小数位数的方法
function formatTo5Decimals(data) {
  // 处理数组
  if (Array.isArray(data)) {
    return data.map((item) => formatTo5Decimals(item));
  }

  // 处理对象
  if (typeof data === "object" && data !== null) {
    const result = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = formatTo5Decimals(data[key]);
      }
    }
    return result;
  }

  // 处理数字
  if (typeof data === "number") {
    // 将数字转换为字符串检查小数部分长度
    const numStr = data.toString();
    const decimalIndex = numStr.indexOf(".");

    // 没有小数部分或小数部分长度 <= 5，直接返回原数字
    if (decimalIndex === -1 || numStr.length - decimalIndex - 1 <= 5) {
      return data;
    }

    // 小数部分过长，四舍五入保留5位
    return Number(data.toFixed(5));
  }

  // 非数字类型直接返回
  return data;
}
const updateDeviceOnlineStatus = async (deviceList) => {
  try {
    const res = await droneIdStatus(searchQuery.value.trim());
    if (res.code === 200) {
      deviceStatus.value = res.data.status;
      isFirstLoad.value = true;

      if (res.data.status) {
        uavStatusContent.value = formatTo5Decimals(res.data.statusData);
        droneHeading.value = res.data.statusData.attitude?.yaw;
        console.log(droneHeading, "droneHeading");

        disabledViewDetails.value = false;

        // 检查是否存在有效的经纬度数据
        if (res.data.statusData.global_position_int) {
          let { lon, lat, alt } = res.data.statusData.global_position_int;

          // 确保经纬度不是默认的0值（严格判断）
          if (lon !== 0 && lat !== 0 && !isNaN(lon) && !isNaN(lat)) {
            // 使用实际经纬度更新位置标记
            markPositionOnMap2(lon, lat, alt || 2);
            // 调用路线动画方法，使用实际经纬度
            // startAnimationWithCoordinates(lon, lat);
          } else {
            // 经纬度为0或无效时，生成10组模拟数据
            console.log("经纬度为默认0值，使用模拟数据执行动画");

            // 生成基于默认位置的10组模拟数据
            // const baseLon = 113.603112; // 基础经度
            // const baseLat = 34.798278; // 基础纬度
            // const mockPoints = generateMockPoints(baseLon, baseLat, 10);

            // 更新位置标记为基础位置
            // markPositionOnMap2(baseLon, baseLat, alt || 2);

            // 使用模拟数据执行动画
            // startAnimationWithMockData(mockPoints);
          }
        }
      } else {
        // 当没有状态数据时，使用默认起点和终点启动动画
        // startAnimation();
      }
    }
  } catch (error) {
    console.log(error);
  }
};

// 生成模拟经纬度数据（10组）
const generateMockPoints = (baseLon, baseLat, count) => {
  const points = [];
  // 每次迭代的偏移量（约50米）
  const step = 0.0005;

  for (let i = 0; i < count; i++) {
    // 生成略有变化的经纬度，模拟无人机移动轨迹
    // 先向东移动5步，再向北移动5步，形成L形轨迹
    let lon, lat;
    if (i < 5) {
      // 前5点：向东移动
      lon = baseLon + i * step;
      lat = baseLat + i * step * 0.2; // 略微向北偏移
    } else {
      // 后5点：向北移动
      lon = baseLon + 5 * step + (i - 5) * step * 0.2; // 略微向东偏移
      lat = baseLat + 5 * step * 0.2 + (i - 5) * step;
    }

    points.push({
      lon: parseFloat(lon.toFixed(6)), // 保留6位小数
      lat: parseFloat(lat.toFixed(6)),
      alt: 30 + i * 2, // 高度逐渐增加
    });
  }

  return points;
};

// 使用模拟数据执行动画
const startAnimationWithMockData = (mockPoints) => {
  if (!map || !mockPoints || mockPoints.length === 0) {
    ElMessage.warning("地图未加载完成或模拟数据无效");
    return;
  }

  // 重置状态
  clearOverlays();
  currentPoint.value = { ...mockPoints[0] };
  animatedPoints.value = [mockPoints[0]]; // 从第一组模拟数据开始
  let animationIndex = 0; // 当前动画索引

  ElMessage.success("使用模拟数据的轨迹动画已开始");

  // 清除旧定时器
  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }

  // 添加起点标记
  addMarker(mockPoints[0], 0);

  // 每1秒更新一次位置（遍历10组模拟数据）
  animationTimer.value = setInterval(() => {
    animationIndex++;

    // 检查是否到达最后一组数据
    if (animationIndex >= mockPoints.length) {
      clearInterval(animationTimer.value);
      ElMessage.success("模拟轨迹动画已完成");
      return;
    }

    // 获取当前点数据
    const current = mockPoints[animationIndex];
    currentPoint.value = current;

    // 添加新点到轨迹
    animatedPoints.value.push(current);

    // 确定是否为最后一个点
    const isLastPoint = animationIndex === mockPoints.length - 1;

    // 添加新标记点和连线
    addMarker(current, animationIndex, isLastPoint);

    if (animationIndex >= 1) {
      const prevPoint = mockPoints[animationIndex - 1];
      addLineSegment(prevPoint, current);
    }

    // 移动地图视野跟随动画
    map.panTo(new AMap.LngLat(current.lon, current.lat));
  }, 1000); // 1秒切换一个点
};

// 基于实际经纬度的动画（保持不变）
const startAnimationWithCoordinates = (currentLon, currentLat) => {
  if (!map) {
    ElMessage.warning("地图未加载完成");
    return;
  }

  // 重置状态
  clearOverlays();

  // 仅使用传入的当前经纬度作为起点
  const startPoint = {
    lon: currentLon,
    lat: currentLat,
    alt: 30,
  };

  // 基于当前位置计算一个合理的终点
  const offset = 0.005; // 约550米的偏移量
  const endPoint = {
    lon: currentLon + offset,
    lat: currentLat + offset,
    alt: 30,
  };

  currentPoint.value = { ...startPoint };
  animatedPoints.value = [startPoint];
  let animationSeconds = 0;

  ElMessage.success("基于实际位置的轨迹动画已开始");

  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }

  addMarker(startPoint, 0);

  animationTimer.value = setInterval(() => {
    animationSeconds++;
    const progress = Math.min(animationSeconds / totalSeconds, 1);
    const newLon = startPoint.lon + progress * (endPoint.lon - startPoint.lon);
    const newLat = startPoint.lat + progress * (endPoint.lat - startPoint.lat);

    currentPoint.value = { lon: newLon, lat: newLat, alt: 30 };
    animatedPoints.value.push(currentPoint.value);

    const isLastPoint = animationSeconds >= totalSeconds;
    const newIndex = animatedPoints.value.length - 1;
    addMarker(currentPoint.value, newIndex, isLastPoint);

    if (newIndex >= 1) {
      const prevPoint = animatedPoints.value[newIndex - 1];
      addLineSegment(prevPoint, currentPoint.value);
    }

    map.panTo(new AMap.LngLat(newLon, newLat));

    if (isLastPoint) {
      clearInterval(animationTimer.value);
      ElMessage.success("轨迹动画已完成");
    }
  }, 1000);
};
//查看详情
const uavViewDetails = () => {
  console.log("uavViewDetails:");
  isDetailDialogVisible.value = true;
};
const handleClickOutside = (event) => {
  // 弹窗未显示时不处理
  if (!isDetailDialogVisible.value) return;

  // 延迟 0 毫秒（等待DOM更新），确保弹窗已渲染
  setTimeout(() => {
    console.log(dialogRef.value, "");
    const dialogEl = dialogRef.value?.$el;
    if (dialogEl && !dialogEl.contains(event.target)) {
      isDetailDialogVisible.value = false;
    }
  }, 0);
};
</script>
<style scoped>
.drone-monitor {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 地图容器 */
.map-container {
  width: 100%;
  height: 100%;
  background: #eaf4ff;
  z-index: 0;
  position: absolute;
  top: 0;
  pointer-events: auto;
}

/* 上下分栏容器 */
.layout-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  z-index: 1;
  background: transparent;
  pointer-events: none !important;
}

/* 顶部区域 - 任务列表容器 */
.top-section {
  flex: 0 0 15%;
  min-width: 15%;
  background: rgba(0, 40, 90, 0.7);
  padding: 20px;
  color: #fff;
  font-size: 16px;
  overflow-y: auto; /* 仅保留垂直滚动（任务列表需要） */
  overflow-x: hidden; /* 强制隐藏横向滚动条 */
  border-radius: 12px;
  border: 2px solid rgba(60, 127, 231, 0.7);
  /* margin: 20px 0 20px 20px; */
  
  scrollbar-width: thin; /* 火狐：窄滚动条 */
  scrollbar-color: rgba(60, 127, 231, 0.7) transparent; /* 火狐：滚动条颜色 */
}
.top-section2 {
  height: 100%;
}
/* 分页滚动容器核心样式 */
.pagination-wrapper {
  background-color: #2e3649db;
  width: 100%;
  overflow-x: auto; /* 超出宽度显示滚动条 */
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
  border-radius: 12px;
}
/* 强制分页组件整体在一行 */
:deep(.pagination-wrapper .el-pagination) {
  display: flex !important; /* 强制flex布局 */
  flex-wrap: nowrap !important; /* 禁止任何换行 */
  align-items: center !important; /* 垂直居中 */
  gap: 12px !important; /* 各模块之间保留间距 */
  width: fit-content !important; /* 让分页宽度自适应内容（关键） */
}
/* 可选：美化滚动条 */
.pagination-wrapper::-webkit-scrollbar {
  height: 6px; /* 滚动条高度 */
}
.pagination-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 40, 90, 0.1); /* 滚动条轨道背景 */
  border-radius: 3px;
}
.pagination-wrapper::-webkit-scrollbar-thumb {
  background: rgba(60, 127, 231, 0.7); /* 滚动条滑块颜色 */
  border-radius: 3px;
}
.pagination-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 127, 231, 0.9); /* 滑块hover状态 */
}

/* 强制分页内部子元素（总条数、页码、跳转等）不换行 */
:deep(.pagination-wrapper .el-pagination > *) {
  display: inline-flex !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
}
:deep(.el-pagination__classifier) {
  color: #fff;
}
:deep(.el-pagination > .is-first),
:deep(.el-pagination > .is-last),
:deep(.el-pagination > .el-icon svg) {
  color: #fff;
}

:deep(.route-search .el-input__inner) {
  color: #fff;
}
.bottom-section {
  flex: 0 0 85%;
  min-width: 85%;
  position: relative;
  overflow: hidden;
  /* pointer-events: none; */
}
.top-panel,
.left-panel,
.right-panel,
.bottom-panel,
.top-section,
.task-details-card-wrapper {
  pointer-events: auto;
}
/* 顶部面板 */
.top-panel {
  position: absolute;
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

/* 左侧面板 - 核心调整 */
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

/* 右侧面板 - 核心调整 */
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

/* 面板内容容器 - 实现滚动效果 */
.panel-content {
  display: flex;
  flex-direction: column;
  justify-content: end;
  height: 100%;
  /* pointer-events: auto; */
  /* overflow-y: auto; */
  /* scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4); */
}

/* 左侧面板内部布局 */
.compass-container {
  margin-bottom: 16px;
}

/* 飞行信息区域 - 明确高度以触发滚动 */
.flight-info {
  flex: 1;
  /* 占据剩余空间 */
  overflow-y: auto;
  /* 为内容添加滚动条 */
  max-height: 100%;
  /* 最大高度 */
}

/* 自定义滚动条样式 - 兼容Chrome, Safari, Edge */
.flight-info::-webkit-scrollbar {
  width: 6px;
  /* 滚动条宽度 */
}

.flight-info::-webkit-scrollbar-track {
  background: transparent;
  /* 轨道背景 */
}

.flight-info::-webkit-scrollbar-thumb {
  background-color: rgba(60, 127, 231, 0.7);
  /* 滚动条拇指颜色 */
  border-radius: 3px;
  /* 圆角 */
}

.flight-info::-webkit-scrollbar-thumb:hover {
  background-color: rgba(60, 127, 231, 0.9);
  /* 悬停时颜色 */
}

.uav-mode {
  background: rgba(0, 40, 90, 0.7);
  border: 2px solid rgba(60, 127, 231, 0.7);
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
  margin-top: 12px;
}

/* 右侧面板内部布局 */
.monitor-section {
  /* flex: 1; */
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

/* 底部面板 - 核心调整 */
.bottom-panel {
  /* position: absolute;
  bottom: 80px;
  left: 315px;
  right: 290px;
  height: 225px;
  border-radius: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center; */
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
  /* border: none; */
}

.control-btn.emergency {
  grid-column: span 2;
  height: 25px;
  background: #2c3d45;
  /* border: none; */
  color: #fff;
}

.direction-buttons {
  display: flex;
  margin-right: 12px;
  flex-direction: column;
  align-items: center;
  /* gap: 8px; */
  color: #92b7cc;
}

.functionButtons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

:deep(.functionButtons .Button) {
  /* border: none; */
  background: #2c3d45;
  padding: 0px 36px;
  height: 25px;
}

.lock-slider-container {
  /* width: 120px; */
  height: 26px;
  position: relative;
}

.lock-slider {
  /* width: 100%; */
  height: 100%;
  border-radius: 13px;
  /* background-color: #4e5969; */
  position: relative;
  cursor: pointer;
  /* transition: background-color 0.3s ease; */
  display: flex;
  align-items: center;
  /* box-sizing: border-box; */
}

.lock-slider.cursor-not-allowed {
  cursor: not-allowed;
  pointer-events: none;
  /* 禁用鼠标和触摸事件 */
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
.draggable-marker {
  cursor: move; /* 确保拖拽光标显示 */
  user-select: none; /* 禁止文本选择 */
  -webkit-user-drag: none; /* 禁用浏览器默认拖拽 */
}
.draggable-marker:hover {
  transform: scale(1.1); /* 悬停放大效果 */
  z-index: 1001; /* 提升层级 */
}
/* 任务详情Card容器 - 核心定位 */
.task-details-card-wrapper {
  position: absolute;
  top: 20px; /* 保持顶部与top-panel对齐 */
  z-index: 99;
}
/* 任务列表展开时：左侧 = 任务列表宽度(20%) + 任务列表的左margin(20px) */
.task-details-card-wrapper.task-list-expanded {
  left: calc(15% + 20px);
}

/* 任务列表收起时：左侧与top-panel对齐（20px） */
.task-details-card-wrapper:not(.task-list-expanded) {
  left: 20px;
}

/* （保留之前的风格统一样式） */
:deep(.task-details-card-wrapper .el-card) {
  max-width: 480px;
  box-sizing: border-box;
  background: rgba(0, 40, 90, 0.9);
  border: 2px solid rgba(60, 127, 231, 0.7);
  color: #fff;
  border-radius: 12px;
}
/* 统一Card视觉风格（与其他面板一致） */
:deep(.task-details-card-wrapper .el-card) {
  max-width: 480px;
  box-sizing: border-box;
  background: rgba(0, 40, 90, 0.9); /* 与其他面板背景统一 */
  border: 2px solid rgba(60, 127, 231, 0.7); /* 与其他面板边框统一 */
  color: #fff; /* 文字颜色统一为白色 */
  border-radius: 12px; /* 与其他面板圆角统一 */
}

/* 统一Card头部样式 */
:deep(.task-details-card-wrapper .el-card__header) {
  background: rgba(0, 40, 90, 0.7);
  border-bottom: 1px solid rgba(60, 127, 231, 0.5);
  color: #fff;
  padding: 12px 16px;
}

/* 统一Card内容区样式 */
:deep(.task-details-card-wrapper .el-card__body) {
  padding: 16px;
}

/* 统一下拉框/按钮样式 */
:deep(.task-details-card-wrapper .el-select .el-input__inner) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(60, 127, 231, 0.7);
  color: #fff;
}
:deep(.task-details-card-wrapper .el-button) {
  margin-right: 8px;
}
:deep(.uploadRoute) {
  max-height: 600px;
}
:deep(.el-dialog__body) {
  height: calc(100% - 56px);
}
:deep(.direction-buttons .el-button.is-disabled, .el-button.is-disabled:hover) {
  background: none;
  border: none;
  width: 33px;
  /* margin: 0 6px; */
}

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

:deep(.tdt-div-icon) {
  border: none;
  background: none;
  margin-left: -13px !important;
  margin-top: -13px !important;
  width: 26px !important;
  height: 26px !important;
  z-index: 0;
}

/* 标记点样式（深度选择器确保生效） */
:deep(.tdt-div-icon .route-marker) {
  width: 26px;
  height: 26px;
  border-radius: 50% !important;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  font-size: 16px;
  transition: transform 0.3s ease;
}

:deep(.tdt-div-icon .start) {
  background-color: #f56c6c !important;
  /* 起点红色 */
}

:deep(.tdt-div-icon .end) {
  background-color: #67c23a !important;
  /* 终点绿色 */
}

:deep(.tdt-div-icon .middle) {
  background-color: #409eff !important;
  /* 中间点蓝色 */
}
:deep .route-marker {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  box-sizing: border-box;
  border: 2px solid white;
}

:deep .route-start {
  background-color: #e74c3c; /* 红色起点 */
}

:deep .route-end {
  background-color: #27ae60; /* 绿色终点 */
}

:deep .route-point {
  background-color: #3498db; /* 蓝色中间点 */
}
:deep(.el-progress__text) {
  color: white;
}
.route-marker:hover {
  transform: scale(1.1);
}

/* 响应式调整 - 确保在各种屏幕尺寸下保持对齐 */
@media (max-width: 1600px) {
  .routeProgress {
    min-width: 80px;
  }
  .bottom-panel {
    left: 305px;
    right: 300px;
  }
  .task-details-card-wrapper {
    left: 305px;
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
  .task-details-card-wrapper {
    left: 290px;
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

  .left-panel,
  .right-panel {
    bottom: 20px;
    /* 对应底部面板高度调整 */
  }
  .routeProgress {
    min-width: 80px;
  }
  .task-details-card-wrapper {
    left: 250px;
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
  .routeProgress {
    min-width: 80px;
  }

  .task-details-card-wrapper {
    left: 210px;
  }
}

/* 确保所有元素使用相同的盒模型计算方式 */
* {
  box-sizing: border-box;
}
</style>
