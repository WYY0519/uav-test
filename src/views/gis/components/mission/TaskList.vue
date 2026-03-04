<template>
  <div class="task-list-wrapper">
    <!-- 面板收起/展开按钮 -->
    <div class="toggle-button-wrapper">
      <div class="toggle-button" @click.stop="handleToggleTaskList">
        <el-icon :style="{ color: '#409eff !important' }">
          <Fold v-if="!showTaskList" />
          <Expand v-else />
        </el-icon>
      </div>
    </div>

    <!-- 任务列表主体 -->
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
        <div>任务列表</div>
        <div
          v-for="item in taskAllList"
          style="
            background: #2e3649db;
            padding: 12px;
            margin: 12px 0;
            border-radius: 12px;
            border-radius: 12px;
            cursor: pointer !important;
            pointer-events: auto !important;
          "
          @click.stop="handleSelectTask(item)"
          @mouseleave="handleMouseleaveTask()"
        >
          {{ item.name }}
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
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { missionAllList } from "@/api/mission";
import { Search, Fold, Expand } from "@element-plus/icons-vue";

// 1. 定义Props：接收外部需要的参数（暂无外部传入依赖，可根据需求扩展）
const props = defineProps({
  // 可扩展：如需外部控制任务列表初始显示状态，可添加props
  initialShowTaskList: {
    type: Boolean,
    default: true,
  },
});

// 2. 定义Emits：向父组件传递事件
const emit = defineEmits([
  "toggle-task-list", // 任务列表展开/收起状态变更
  "select-task", // 选中某个任务
  "update-task-list-status", // 同步任务列表相关状态
]);

// 响应式数据
const showTaskList = ref(props.initialShowTaskList);
const taskName = ref("");
const taskAllList = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 切换任务列表显示/隐藏
const handleToggleTaskList = () => {
  showTaskList.value = !showTaskList.value;
  // 向父组件发送状态变更事件
  emit("toggle-task-list", showTaskList.value);
};

// 选中任务
const handleSelectTask = (item) => {
  // 向父组件发送选中的任务数据
  emit("select-task", item);
};

// 鼠标移出任务
const handleMouseleaveTask = () => {
  // 可向父组件发送鼠标移出事件（如需）
  emit("mouseleave-task");
};

// 分页尺寸变更
const handleSizeChange = (val) => {
  pageSize.value = val;
  taskManagement();
};

// 当前页码变更
const handleCurrentChange = (val) => {
  currentPage.value = val;
  taskManagement();
};

// 任务列表查询
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
      // 同步任务列表数据总数给父组件
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

// 组件挂载时初始化任务列表
import { onMounted } from "vue";
onMounted(() => {
  taskManagement();
});
</script>

<style scoped>
/* 任务列表最外层容器，占满父容器高度 */
.task-list-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 切换按钮容器 */
.toggle-button-wrapper {
  position: absolute;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* 切换按钮 */
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

/* 1. 确保搜索组件父级不阻断交互 */
.top-section,
.top-section2 {
  pointer-events: auto !important;
}

/* 2. 穿透修改 el-input 样式，强制开启交互+修复光标 */
:deep(.search-input) {
  pointer-events: auto !important;
}
/* 穿透修改 el-input 输入框内部样式 */
:deep(.search-input .el-input__inner) {
  cursor: text !important; /* 输入框内显示文本光标 */
  pointer-events: auto !important;
}
/* 输入框后缀按钮（搜索按钮容器） */
:deep(.search-input .el-input__append) {
  pointer-events: auto !important;
}

/* 3. 穿透修改 el-button 样式，强制开启交互+修复光标 */
:deep(.search-input .el-button) {
  cursor: pointer !important; /* 按钮悬浮显示小手光标 */
  pointer-events: auto !important;
  background-color: #409eff !important;
  color: white !important;
}
/* 按钮悬浮样式（增强交互反馈） */
:deep(.search-input .el-button:hover) {
  background-color: #66b1ff !important; /* 按钮悬浮变色 */
}

/* 任务列表主体样式 - 占满高度 */
.top-section {
  width: 100%;
  height: 100%;
  background: rgba(0, 40, 90, 0.7);
  padding: 35px 12px 12px 12px;
  color: #fff;
  font-size: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  /* border-radius: 12px; */
  border: 2px solid rgba(60, 127, 231, 0.7);
  /* margin: 20px 0 20px 20px; */
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 127, 231, 0.7) transparent;
  box-sizing: border-box;
}

.top-section2 {
  height: 100%;
  display: flex;
  flex-direction: column;
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

.pagination-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 40, 90, 0.1);
  border-radius: 3px;
}

.pagination-wrapper::-webkit-scrollbar-thumb {
  background: rgba(60, 127, 231, 0.7);
  border-radius: 3px;
}

.pagination-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 127, 231, 0.9);
}

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
</style>
