<template>
  <el-dialog
    :modal="false"
    v-model="dialogVisible"
    :append-to-body="true"
    width="40%"
    :modal-append-to-body="false"
    style="
      height: 55%;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgb(88, 130, 179) rgba(80, 80, 80, 0.4);
      background: rgba(0, 40, 90, 0.7) !important;
      color: #fff;
      border: 2px solid rgba(60, 127, 231, 0.9);
    "
    :before-close="handleClose"
  >
    <template #header>
      <div style="color: #fff; font-size: 16px; font-weight: bold">
        任务详情
      </div>
    </template>
    <div @click.stop.prevent>
      <el-descriptions :column="1" border :label-width="'50%'" :content-width="'50%'">
        <el-descriptions-item label="时间戳">
          {{ uavStatusContent.timestamp }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放气压数据-气压差">
          {{ uavStatusContent?.scaled_pressure?.press_diff }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放气压数据-温度">
          {{ uavStatusContent?.scaled_pressure?.temperature }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放气压数据-绝对气压">
          {{ uavStatusContent?.scaled_pressure?.press_abs }}
        </el-descriptions-item>
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
        <el-descriptions-item label="系统时间-Unix时间(微秒)">
          {{ uavStatusContent?.system_time?.time_unix_usec }}
        </el-descriptions-item>
        <el-descriptions-item label="系统时间-启动后时间（毫秒）">
          {{ uavStatusContent?.system_time?.time_boot_ms }}
        </el-descriptions-item>
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
        <el-descriptions-item label="缩放惯性测量单元数据(IMU)-加速度计Z轴">
          {{ uavStatusContent?.scaled_imu?.acc_z }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放惯性测量单元数据(IMU)-陀螺仪X轴">
          {{ uavStatusContent?.scaled_imu?.gyro_x }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放惯性测量单元数据(IMU)-陀螺仪Z轴">
          {{ uavStatusContent?.scaled_imu?.gyro_z }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放惯性测量单元数据(IMU)-加速度计Y轴">
          {{ uavStatusContent?.scaled_imu?.acc_y }}
        </el-descriptions-item>
        <el-descriptions-item label="缩放惯性测量单元数据(IMU)-加速度计X轴">
          {{ uavStatusContent?.scaled_imu?.acc_x }}
        </el-descriptions-item>
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
        <el-descriptions-item label="心跳包-模式">
          {{ uavStatusContent?.heartbeat?.mode }}
        </el-descriptions-item>
        <el-descriptions-item label="心跳包-MAVLink协议版本">
          {{ uavStatusContent?.heartbeat?.mavlink_version }}
        </el-descriptions-item>
        <el-descriptions-item label="心跳包-状态">
          {{ uavStatusContent?.heartbeat?.status }}
        </el-descriptions-item>
        <el-descriptions-item label="扩展系统状态-垂直起降状态">
          {{ uavStatusContent?.extended_sys_state?.vtol_state }}
        </el-descriptions-item>
        <el-descriptions-item label="扩展系统状态-着陆状态">
          {{ uavStatusContent?.extended_sys_state?.landed_state }}
        </el-descriptions-item>
        <el-descriptions-item label="自动驾驶仪版本-序列号">
          {{ uavStatusContent?.autopilot_version?.serial_number }}
        </el-descriptions-item>
        <el-descriptions-item label="自动驾驶仪版本-固件版本">
          {{ uavStatusContent?.autopilot_version?.firmware_version }}
        </el-descriptions-item>
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
        <el-descriptions-item label="电池数据-电流">
          {{ uavStatusContent?.battery?.current }}
        </el-descriptions-item>
        <el-descriptions-item label="电池数据-剩余电量（百分比）">
          {{ uavStatusContent?.battery?.battery_remaining }}
        </el-descriptions-item>
        <el-descriptions-item label="电池数据-电压">
          {{ uavStatusContent?.battery?.voltage }}
        </el-descriptions-item>
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
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-磁力计Y轴">
          {{ uavStatusContent?.scaled_imu2?.mag_y }}
        </el-descriptions-item>
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-磁力计X轴">
          {{ uavStatusContent?.scaled_imu2?.mag_x }}
        </el-descriptions-item>
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-磁力计Z轴">
          {{ uavStatusContent?.scaled_imu2?.mag_z }}
        </el-descriptions-item>
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-陀螺仪Y轴">
          {{ uavStatusContent?.scaled_imu2?.gyro_y }}
        </el-descriptions-item>
        <el-descriptions-item
          label="第二缩放惯性测量单元数据(IMU2)-加速度计Z轴"
        >
          {{ uavStatusContent?.scaled_imu2?.acc_z }}
        </el-descriptions-item>
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-陀螺仪X轴">
          {{ uavStatusContent?.scaled_imu2?.gyro_x }}
        </el-descriptions-item>
        <el-descriptions-item label="第二缩放惯性测量单元数据(IMU2)-陀螺仪Z轴">
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
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-磁力计Y轴">
          {{ uavStatusContent?.scaled_imu3?.mag_y }}
        </el-descriptions-item>
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-磁力计X轴">
          {{ uavStatusContent?.scaled_imu3?.mag_x }}
        </el-descriptions-item>
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-磁力计Z轴">
          {{ uavStatusContent?.scaled_imu3?.mag_z }}
        </el-descriptions-item>
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-陀螺仪Y轴">
          {{ uavStatusContent?.scaled_imu3?.gyro_y }}
        </el-descriptions-item>
        <el-descriptions-item
          label="第三缩放惯性测量单元数据(IMU3)-加速度计Z轴"
        >
          {{ uavStatusContent?.scaled_imu3?.acc_z }}
        </el-descriptions-item>
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-陀螺仪X轴">
          {{ uavStatusContent?.scaled_imu3?.gyro_x }}
        </el-descriptions-item>
        <el-descriptions-item label="第三缩放惯性测量单元数据(IMU3)-陀螺仪Z轴">
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
        <el-descriptions-item label="障碍物距离-距离数组">
          {{ JSON.stringify(uavStatusContent?.obstacle_distance?.distances) }}
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
        <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-爬升率">
          {{ uavStatusContent?.vfr_hud?.climb }}
        </el-descriptions-item>
        <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-油门（百分比）">
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
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  uavStatusContent: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};
</script>

<style scoped>
/* 弹窗基础样式（保持不变） */
:deep(.el-dialog) {
  background: rgba(0, 40, 90, 0.7) !important;
}
:deep(.el-dialog__header) {
  background: rgba(0, 40, 90, 0.7);
  padding: 15px 20px;
  border-bottom: 1px solid rgba(60, 127, 231, 0.5);
}
:deep(.el-dialog__body) {
  background: rgba(0, 40, 90, 0.7);
  color: #fff;
  padding: 20px;
}
:deep(.el-dialog__title) {
  color: #fff;
}

/* ===================== 关闭按钮：终极修复（覆盖所有状态） ===================== */
/* 1. 按钮容器：强制白色，覆盖默认 */
:deep(.el-dialog__headerbtn) {
  color: #fff !important;
  background: transparent !important; /* 去掉默认背景 */
}

/* 2. SVG 图标：强制白色，覆盖所有默认属性 */
:deep(.el-dialog__close svg) {
  color: #fff !important;
  fill: #fff !important; /* SVG 填充色（核心） */
  stroke: #fff !important; /* SVG 描边色（兜底） */
  transition: none !important; /* 禁用默认过渡，防止闪烁 */
}

/* 3. 鼠标悬浮状态：强制白色，彻底禁止变蓝 */
:deep(.el-dialog__headerbtn:hover) {
  color: #fff !important;
  background: transparent !important;
}
:deep(.el-dialog__headerbtn:hover .el-dialog__close svg) {
  color: #fff !important;
  fill: #fff !important;
  stroke: #fff !important;
}

/* 4. 聚焦/激活状态：兜底覆盖，防止点击时变色 */
:deep(.el-dialog__headerbtn:focus),
:deep(.el-dialog__headerbtn:active) {
  color: #fff !important;
  background: transparent !important;
}
:deep(.el-dialog__headerbtn:focus .el-dialog__close svg),
:deep(.el-dialog__headerbtn:active .el-dialog__close svg) {
  color: #fff !important;
  fill: #fff !important;
  stroke: #fff !important;
}

/* ===================== 描述列表样式（保持不变） ===================== */
:deep(.el-descriptions) {
  color: #fff;
}
:deep(.el-descriptions__label) {
  background: rgba(0, 40, 90, 0.7) !important;
  color: #fff !important;
  border-color: rgba(60, 127, 231, 0.5);
}
:deep(.el-descriptions__content) {
  background: rgba(0, 40, 90, 0.7) !important;
  color: #fff;
  border-color: rgba(60, 127, 231, 0.5);
}
:deep(.el-descriptions__body),
:deep(.el-descriptions__table),
:deep(.el-descriptions__cell) {
  background: rgba(0, 40, 90, 0.7) !important;
  border-color: rgba(60, 127, 231, 0.5) !important;
}
</style>
