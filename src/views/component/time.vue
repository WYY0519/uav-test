<template>
  <div class="clock-container">
    <div class="clock-card">
      <div class="clock-face">
        <div class="time">{{ currentTime }}</div>
        <div class="date">{{ currentDate }}</div>
      </div>
      <div class="clock-info">
        <div class="info-item">
          <el-icon><Timer /></el-icon>
          <span>{{ weekDay }}</span>
        </div>
        <div class="info-item">
          <el-icon><Calendar /></el-icon>
          <span>{{ currentYear }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<!-- -->
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { Timer, Calendar } from "@element-plus/icons-vue";

const currentTime = ref("");
const currentDate = ref("");
const weekDay = ref("");
const currentYear = ref("");
let timer = null;

// 更新时间
const updateTime = () => {
  const now = new Date();

  // 格式化时间
  currentTime.value = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // 格式化日期
  currentDate.value = now.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  // 获取星期
  const weeks = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  weekDay.value = weeks[now.getDay()];

  // 获取年份
  currentYear.value = now.getFullYear() + "年";
};

// 组件挂载时启动定时器
onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

// 组件卸载时清除定时器
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
.clock-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.clock-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 240px;
}

.clock-face {
  text-align: center;
  margin-bottom: 16px;
}

.time {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  font-family: "Monaco", monospace;
}

.date {
  font-size: 16px;
  color: #606266;
  margin-bottom: 4px;
}

.clock-info {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.el-icon {
  font-size: 16px;
  color: #409eff;
}

/* 响应式调整 */
@media (max-width: 768px) {
  
  .clock-card {
    min-width: 200px;
  }

  .time {
    font-size: 28px;
  }

  .date {
    font-size: 14px;
  }
}

/* 添加动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.time {
  animation: pulse 2s infinite;
}
</style>
