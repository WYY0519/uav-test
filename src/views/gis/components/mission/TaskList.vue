<template>
  <div class="task-list-wrapper">
    <div class="toggle-button-wrapper">
      <div class="toggle-button" @click.stop="handleToggleTaskList">
        <el-icon :style="{ color: '#409eff' }">
          <Fold v-if="!showTaskList" />
          <Expand v-else />
        </el-icon>
      </div>
    </div>

    <div v-if="showTaskList" class="top-section">
      <div class="top-section2">
        <div style="margin-bottom: 12px">
          <el-input
            v-model="taskName"
            placeholder="输入任务名称搜索"
            class="search-input"
            clearable
            @clear="taskManagement"
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
                @click="taskManagement"
              />
            </template>
          </el-input>
        </div>

        <div class="task-list-title">任务列表</div>

        <div class="task-items-scroll-container">
          <div
            v-for="item in taskAllList"
            :key="item.missionId"
            class="task-item"
            @click.stop="handleSelectTask(item)"
            :class="{ active: selectedTaskId === item.missionId }"
          >
            <div class="task-name">{{ item.name }}</div>
            <div class="task-row">
              <span class="label">所属项目：</span>
              <span class="text">{{ item.projectName }}</span>
            </div>
            <div class="task-row">
              <span class="label">创建时间：</span>
              <span class="text">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="task-row desc" v-if="item.description">
              <span class="label">描述内容：</span>
              <span class="text">{{ item.description }}</span>
            </div>
          </div>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[5, 10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            style="--el-pagination-font-size: 12px; padding: 12px 12px 0 12px"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { missionAllList } from "@/api/mission";
import { Search, Fold, Expand } from "@element-plus/icons-vue";

const props = defineProps({
  initialShowTaskList: { type: Boolean, default: true },
});

const emit = defineEmits([
  "toggle-task-list",
  "select-task",
  "update-task-list-status",
  "mouseleave-task",
]);

const showTaskList = ref(props.initialShowTaskList);
const taskName = ref("");
const taskAllList = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const selectedTaskId = ref(null);

const handleToggleTaskList = () => {
  showTaskList.value = !showTaskList.value;
  emit("toggle-task-list", showTaskList.value);
};

const handleSelectTask = (item) => {
  selectedTaskId.value = item.missionId;
  emit("select-task", item);
};

const handleMouseleaveTask = () => {
  emit("mouseleave-task");
};

const handleSizeChange = (val) => {
  pageSize.value = val;
  taskManagement();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  taskManagement();
};

const formatTime = (time) => {
  if (!time) return "无";
  return time.replace("T", " ").substring(0, 19);
};

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
      emit("update-task-list-status", {
        total: total.value,
        list: taskAllList.value,
      });
    }
  } catch (err) {
    console.error("查询任务列表失败：", err);
    ElMessage.error("查询任务列表失败");
  }
};

onMounted(() => {
  taskManagement();
});
</script>

<style scoped>
.task-list-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 300px;
}

.toggle-button-wrapper {
  position: absolute;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.toggle-button {
  background: #fff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  pointer-events: auto !important;
}

.top-section,
.top-section2 {
  pointer-events: auto !important;
}

:deep(.search-input) {
  pointer-events: auto !important;
}

:deep(.search-input .el-input__inner) {
  cursor: text !important;
  pointer-events: auto !important;
}

:deep(.search-input .el-input__append) {
  pointer-events: auto !important;
}

:deep(.search-input .el-button) {
  cursor: pointer !important;
  pointer-events: auto !important;
  background-color: #409eff !important;
  color: white !important;
}

:deep(.search-input .el-button:hover) {
  background-color: #66b1ff !important;
}

.top-section {
  width: 100%;
  height: 100%;
  background: #00285a80;
  padding: 35px 12px 12px 12px;
  color: #fff;
  font-size: 16px;
  overflow: hidden !important;
  box-sizing: border-box;
}

.top-section2 {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-list-title {
  margin-bottom: 12px;
}

.task-items-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 127, 231, 0.7) transparent;
}

.task-items-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.task-items-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(60, 127, 231, 0.7);
  border-radius: 3px;
}

/* 任务卡片：无动画、无悬浮效果 */
.task-item {
  background: #2e3649db;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
  cursor: pointer;
  user-select: none;
}

/* 去掉悬浮效果 */
.task-item:hover {
}

/* 选中只显示红色边框，无背景 */
.task-item.active {
  /* background: transparent !important;
  border-color: #ff4d4f !important; */
}

.task-name {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 10px;
  line-height: 1.3;
}

/* 核心修改：统一所有行的布局，标签固定宽度，内容自动换行 */
.task-row {
  display: flex;
  align-items: flex-start; /* 顶部对齐，避免标签错位 */
  font-size: 14px;
  color: #f4f2f257;
  margin-bottom: 6px;
  line-height: 1.4;
}

.task-row .label {
  color: #f4f2f257;
  white-space: nowrap; /* 标签永远不换行 */
  flex-shrink: 0; /* 禁止标签压缩 */
  margin-right: 6px;
}

.task-row .text {
  flex: 1; /* 内容占剩余宽度，自动换行 */
  word-break: break-all; /* 长文本自动换行 */
}

/* 描述行继承统一布局，不再单独限制 */
.task-row.desc {
  color: #f4f2f257;
  line-height: 1.4;
}

.pagination-wrapper {
  background-color: #2e3649db;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
  border-radius: 12px;
  margin-top: auto;
}

:deep(.pagination-wrapper .el-pagination) {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 12px !important;
  width: fit-content !important;
}

.pagination-wrapper::-webkit-scrollbar {
  height: 6px;
}

.pagination-wrapper::-webkit-scrollbar-thumb {
  background: rgba(60, 127, 231, 0.7);
  border-radius: 3px;
}

:deep(.el-pagination__classifier) {
  color: #fff;
}

:deep(.el-pagination > .is-first),
:deep(.el-pagination > .is-last),
:deep(.el-pagination > .el-icon svg) {
  color: #fff;
}
</style>
