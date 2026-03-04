<template>
  <el-dialog
    :modal="false"
    v-model="dialogVisible"
    :append-to-body="true"
    width="20%"
    class="drone-detail-dialog"
    @close="handleClose"
  >
    <div class="dialog-container">
      <!-- 标题区域 -->
      <div class="dialog-header">
        <div class="header-content">
          <span class="title">无人机详情</span>
          <el-button class="close-btn" type="text" @click="handleClose">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="dialog-content-wrapper">
        <div class="dialog-content">
          <!-- 调试：查看数据内容 -->
          <!-- <div style="color: #fff; margin-bottom: 10px;">
            数据: {{ detailData?.attitude ? JSON.stringify(detailData.attitude) : '暂无数据' }}
          </div> -->
          <el-descriptions :column="1" border>
            <!-- 姿态数据 -->
            <el-descriptions-item label="姿态数据-滚转角(°)">
              <span class="detail-value">{{
                detailData?.attitude?.roll || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="姿态数据-俯仰角（°）">
              <span class="detail-value">{{
                detailData?.attitude?.pitch || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="姿态数据-偏航角（°）">
              <span class="detail-value">{{
                detailData?.attitude?.yaw || "--"
              }}</span>
            </el-descriptions-item>

            <!-- 心跳包 -->
            <el-descriptions-item label="心跳包-模式">
              <span class="detail-value">{{
                detailData?.heartbeat?.mode || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="心跳包-MAVLink协议版本">
              <span class="detail-value">{{
                detailData?.heartbeat?.mavlink_version || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="心跳包-状态">
              <span class="detail-value">{{
                detailData?.heartbeat?.status || "--"
              }}</span>
            </el-descriptions-item>

            <!-- GPS数据 -->
            <el-descriptions-item label="GPS数据-可见卫星数量">
              <span class="detail-value">{{
                detailData?.gps?.satellites_visible || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="GPS数据-海拔">
              <span class="detail-value">{{
                detailData?.gps?.alt || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="GPS数据-定位类型">
              <span class="detail-value">{{
                detailData?.gps?.fix_type || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="GPS数据-经度">
              <span class="detail-value">{{
                detailData?.gps?.lon || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="GPS数据-纬度">
              <span class="detail-value">{{
                detailData?.gps?.lat || "--"
              }}</span>
            </el-descriptions-item>

            <!-- 电池数据 -->
            <el-descriptions-item label="电池数据-电流">
              <span class="detail-value">{{
                detailData?.battery?.current || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="电池数据-剩余电量（百分比）">
              <span class="detail-value">{{
                detailData?.battery?.battery_remaining || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="电池数据-电压">
              <span class="detail-value">{{
                detailData?.battery?.voltage || "--"
              }}</span>
            </el-descriptions-item>

            <!-- 虚拟飞行仪表数据(VFR HUD) -->
            <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-爬升率">
              <span class="detail-value">{{
                detailData?.vfr_hud?.climb || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item
              label="虚拟飞行仪表数据(VFR HUD)-油门（百分比）"
            >
              <span class="detail-value">{{
                detailData?.vfr_hud?.throttle || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-航向">
              <span class="detail-value">{{
                detailData?.vfr_hud?.heading || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-高度">
              <span class="detail-value">{{
                detailData?.vfr_hud?.alt || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-地速">
              <span class="detail-value">{{
                detailData?.vfr_hud?.groundspeed || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="虚拟飞行仪表数据(VFR HUD)-空速">
              <span class="detail-value">{{
                detailData?.vfr_hud?.airspeed || "--"
              }}</span>
            </el-descriptions-item>

            <!-- 全局位置信息（整数） -->
            <el-descriptions-item label="全局位置信息(整数)-X方向速度">
              <span class="detail-value">{{
                detailData?.global_position_int?.vx || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-Y方向速度">
              <span class="detail-value">{{
                detailData?.global_position_int?.vy || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-Z方向速度">
              <span class="detail-value">{{
                detailData?.global_position_int?.vz || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-海拔高度">
              <span class="detail-value">{{
                detailData?.global_position_int?.alt || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-相对高度">
              <span class="detail-value">{{
                detailData?.global_position_int?.relative_alt || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-经度">
              <span class="detail-value">{{
                detailData?.global_position_int?.lon || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-纬度">
              <span class="detail-value">{{
                detailData?.global_position_int?.lat || "--"
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="全局位置信息(整数)-航向角">
              <span class="detail-value">{{
                detailData?.global_position_int?.hdg || "--"
              }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { Close } from "@element-plus/icons-vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  detailData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:visible", "close"]);

const dialogVisible = ref(props.visible);

// 监听父组件传递的visible变化
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
  }
);

// 监听内部dialogVisible变化，通知父组件
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    emit("update:visible", false);
    emit("close");
  }
});

const handleClose = () => {
  dialogVisible.value = false;
};
</script>

<style scoped>
.drone-detail-dialog {
  /* 保持原有样式 */
}

/* 自定义对话框容器 */
.dialog-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  width: 100%;
}

/* 标题区域 */
.dialog-header {
  flex: 0 0 50px; /* 固定高度，不是50%了 */
  background: rgba(0, 40, 90, 0.7);
  border-bottom: 2px solid rgba(60, 127, 231, 0.7);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 24px;
}

.title {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  color: #fff;
  font-size: 18px;
  padding: 8px;
  transition: all 0.3s;
}

.close-btn:hover {
  color: #409eff;
  transform: scale(1.1);
}

/* 内容区域 - 占据剩余空间 */
.dialog-content-wrapper {
  flex: 1;
  overflow-y: auto;
  background: rgba(0, 40, 90, 0.7);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  padding: 16px;
}

.dialog-content {
  height: 100%;
}

.detail-value {
  color: #fff;
  font-weight: normal;
}

/* 确保滚动条样式一致 */
.dialog-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.dialog-content-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 40, 90, 0.3);
  border-radius: 3px;
}

.dialog-content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(60, 127, 231, 0.7);
  border-radius: 3px;
}

.dialog-content-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 127, 231, 0.9);
}
</style>

<style>
/* 使用全局样式覆盖element-plus对话框样式 */
.drone-detail-dialog .el-dialog {
  background: rgba(0, 40, 90, 0.7) !important;
  border: 2px solid rgba(60, 127, 231, 0.7) !important;
  border-radius: 12px !important;
  box-sizing: border-box;
  padding: 0 !important;
}

/* 隐藏原有的header和body内边距 */
.drone-detail-dialog .el-dialog__header {
  display: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.drone-detail-dialog .el-dialog__body {
  background: transparent !important;
  color: #fff !important;
  padding: 0 !important;
  margin: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* 调整描述列表样式 - 关键修复 */
.drone-detail-dialog .el-descriptions {
  background: transparent !important;
  width: 100% !important;
}

.drone-detail-dialog .el-descriptions__body {
  background: transparent !important;
}

.drone-detail-dialog .el-descriptions__table {
  background: transparent !important;
  width: 100% !important;
  table-layout: fixed !important;
}

/* 标签单元格样式 */
.drone-detail-dialog .el-descriptions__label {
  /* background: rgba(44, 61, 69, 0.5) !important; */
  color: #a0c2d2 !important;
  border-color: rgba(60, 127, 231, 0.3) !important;
  padding: 8px 12px !important;
  width: 50% !important; /* 控制标签列宽度 */
  min-width: 180px !important;
  max-width: 50% !important;
  text-align: left !important;
  vertical-align: middle !important;
}

/* 内容单元格样式 */
.drone-detail-dialog .el-descriptions__content {
  /* background: rgba(44, 61, 69, 0.3) !important; */
  color: #fff !important;
  border-color: rgba(60, 127, 231, 0.3) !important;
  padding: 8px 12px !important;
  width: 50% !important; /* 控制内容列宽度 */
  vertical-align: middle !important;
}

/* 确保单元格在同一行显示 */
.drone-detail-dialog .el-descriptions__row {
  display: table-row !important;
}

.drone-detail-dialog .el-descriptions__cell {
  display: table-cell !important;
  white-space: normal !important;
  word-break: break-word !important;
}

/* 对话框关闭按钮样式（隐藏原有的） */
.drone-detail-dialog .el-dialog__headerbtn {
  display: none !important;
}

/* 修复表格布局，确保标签和内容在同一行 */
.drone-detail-dialog
  .el-descriptions__table.is-bordered
  .el-descriptions__cell {
  border-collapse: collapse !important;
}
:deep(.el-dialog, .drone-detail-dialog) {
  --el-dialog-bg-color: pink;
}
</style>
