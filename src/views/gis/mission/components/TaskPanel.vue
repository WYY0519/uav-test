<template>
  <div class="task-panel-container">
    <!-- 任务详情卡片 -->
    <div class="task-details-card-wrapper" :class="{ 'task-list-expanded': showTaskList }" v-show="showTaskDetails">
      <el-card style="max-width: 480px">
        <template #header>
          <div class="card-header">
            <span>任务详情</span>
          </div>
        </template>
        <p style="font-size: 12px">所属任务：</p>
        <p style="font-size: 12px">
          {{ selectedMission?.missionName || selectedMission?.name || "--" }}
        </p>
        <p style="font-size: 12px">飞控编号：</p>
        <p style="font-size: 12px">
          {{
            selectedMission?.assignedDevice
              ? selectedMission?.assignedDevice?.deviceNumber
              : "--"
          }}
        </p>

        <el-select style="margin: 12px 0" :value="selectedRouteValue" placeholder="请选择航线" @change="handleRouteSelect">
          <el-option v-for="item in taskOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <div>
          <el-button type="info" @click="showTaskDetails = false">取消</el-button>
          <el-button :disabled="!(
            selectedMission?.assignedDevice?.deviceNumber &&
            selectedMission?.assignedDevice?.deviceNumber.trim()
          ) || !selectedRouteValue
            " type="primary" @click="executeMission(selectedMission)">开始</el-button>
        </div>
      </el-card>
    </div>
    <!-- 任务列表切换按钮 -->
    <div class="task-list-toggle" @click.stop="$emit('toggle')">
      <el-icon :style="{ color: '#409eff' }">
        <Fold v-if="!showTaskList" />
        <Expand v-else />
      </el-icon>
    </div>
  </div>
</template>

<script setup>
import { Fold, Expand } from "@element-plus/icons-vue";

const props = defineProps({
  showTaskList: {
    type: Boolean,
    default: true
  },
  showTaskDetails: {
    type: Boolean,
    default: false
  },
  selectedMission: {
    type: Object,
    default: null
  },
  taskOptions: {
    type: Array,
    default: () => []
  },
  selectedRouteValue: {
    type: [String, Number],
    default: ""
  }
});

const emit = defineEmits(['toggle', 'update:selectedRouteValue', 'execute', 'selectRoute']);

const handleRouteSelect = (value) => {
  emit('update:selectedRouteValue', value);
  emit('selectRoute', value);
};

const executeMission = (mission) => {
  emit('execute', mission);
};
</script>

<style scoped>
.task-panel-container {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.task-panel-container * {
  pointer-events: auto;
}

.task-details-card-wrapper {
  position: absolute;
  z-index: 99;
}

.task-details-card-wrapper.task-list-expanded {
  left: calc(20% + 20px);
}

.task-details-card-wrapper:not(.task-list-expanded) {
  left: 20px;
}

::deep(.task-details-card-wrapper .el-card) {
  max-width: 480px;
  box-sizing: border-box;
  background: rgba(0, 40, 90, 0.9);
  border: 2px solid rgba(60, 127, 231, 0.7);
  color: #fff;
  border-radius: 12px;
}

::deep(.task-details-card-wrapper .el-card__header) {
  background: rgba(0, 40, 90, 0.7);
  border-bottom: 1px solid rgba(60, 127, 231, 0.5);
  color: #fff;
  padding: 12px 16px;
}

::deep(.task-details-card-wrapper .el-card__body) {
  padding: 16px;
}

::deep(.task-details-card-wrapper .el-select .el-input__inner) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(60, 127, 231, 0.7);
  color: #fff;
}

::deep(.task-details-card-wrapper .el-button) {
  margin-right: 8px;
}

.task-list-toggle {
  position: absolute;
  cursor: pointer;
  pointer-events: auto !important;
  left: 0px;
  top: 0px;
  z-index: 1000;
  background: #fff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.task-list-toggle:hover {
  background: #f5f5f5;
}
</style>
