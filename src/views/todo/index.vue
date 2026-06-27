<template>
  <div class="todo-container">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <h2>代办事项</h2>
      <p>Route & No-Fly Zone Conflict Detection</p>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：搜索条件 + 列表 -->
      <div class="left-panel">
        <!-- Tab 切换 -->
        <div class="tab-bar">
          <div v-for="tab in tabs" :key="tab.key" :class="['tab-item', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)">
            <span class="tab-label">{{ tab.label }}</span>
            <span class="tab-count">{{ tab.count }}</span>
          </div>
        </div>

        <!-- 搜索条件 -->
        <el-card class="search-card" shadow="never">
          <el-form :model="searchForm" inline class="search-form">
            <el-form-item label="航线名称">
              <el-input v-model="searchForm.routeName" placeholder="输入航线名称" clearable style="width: 180px"
                @keyup.enter="handleSearch" />
            </el-form-item>
            <el-form-item label="区域名称">
              <el-input v-model="searchForm.zoneName" placeholder="输入区域名称" clearable style="width: 180px"
                @keyup.enter="handleSearch" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 操作栏 -->
        <div class="table-toolbar">
          <div class="toolbar-left">
            <span class="list-info">共 <em>{{ total }}</em> 条冲突记录</span>
          </div>
          <div class="toolbar-right">
            <el-button @click="handleRefresh" class="refresh-btn">
              <el-icon>
                <Refresh />
              </el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <!-- 数据列表 -->
        <el-table v-loading="loading" :data="filteredData" border row-class-name="conflict-row" class="flex-table">
          <el-table-column type="index" label="序号" width="55" align="center" />

          <el-table-column prop="routeName" label="航线名称" min-width="200" />
          <el-table-column prop="zoneName" label="禁飞区名称" min-width="220" />

          <el-table-column label="冲突类型" width="160" align="center">
            <template #default="scope">
              <el-tag type="danger" effect="plain" size="small">
                {{ getNotifyType(scope.row.notifyType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="提醒时间" width="210" align="center" />

          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <span :class="['status-dot', `status-${row.status === 0 ? 'unread' : 'read'}`]"></span>
              <span>{{ row.status === 0 ? '未处理' : '已处理' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160" fixed="right" align="center" class-name="operation-column">
            <template #default="{ row }">
              <el-button v-if="row.status === 0" type="success" size="small" @click="handleResolve(row)">处理</el-button>
              <el-button type="primary" size="small" @click="handleView(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="pagination.pageNum" v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper" background
            @size-change="handleSizeChange" @current-change="handlePageChange" />
        </div>
      </div>

      <!-- 右侧：统计概览 -->
      <div class="right-panel">
        <div class="stat-cards">
          <div class="stat-card stat-unresolved">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
              </svg>
            </div>
            <div class="stat-info">
              <p class="stat-value">{{ unresolvedCount }}</p>
              <p class="stat-label">未处理</p>
            </div>
          </div>
          <div class="stat-card stat-resolved">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <div class="stat-info">
              <p class="stat-value">{{ resolvedCount }}</p>
              <p class="stat-label">已处理</p>
            </div>
          </div>
          <div class="stat-card stat-total">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
              </svg>
            </div>
            <div class="stat-info">
              <p class="stat-value">{{ totalCount }}</p>
              <p class="stat-label">总计</p>
            </div>
          </div>
        </div>

        <div class="recent-section">
          <h3 class="section-title">
            <span class="title-dot"></span>
            冲突类型分布
          </h3>
          <div class="type-distribution">
            <div v-for="(item, idx) in typeDistribution" :key="idx" class="dist-bar-wrap">
              <div class="dist-label">
                <span class="dist-name">{{ item.label }}</span>
                <span class="dist-num">{{ item.count }} 条</span>
              </div>
              <div class="dist-track">
                <div class="dist-fill" :style="{
                  width: item.percent + '%',
                  background: item.color,
                }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConflictDetailDialog v-model:visible="showDetailDialog" :data="currentRow" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { Search, Refresh } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import ConflictDetailDialog from "./components/ConflictDetailDialog.vue";
import { todoList } from "@/api/todo";
import { useRouter } from "vue-router";

const router = useRouter();

// Tab
const tabs = reactive([
  { key: "unresolved", label: "未处理", count: 0 },
  { key: "resolved", label: "已处理", count: 0 },
]);
const activeTab = ref("unresolved");

// 搜索
const searchForm = reactive({
  routeName: "",
  zoneName: "",
  notifyType: "",
});

// 表格
const loading = ref(false);
const mockData = ref([]);        // 表格用：分页数据
const allData = ref([]);         // 统计用：全量数据（不分页）

// 过滤（表格数据）
const filteredData = computed(() => {
  let list = [...mockData.value];

  if (activeTab.value === "unresolved") {
    list = list.filter(i => i.status === 0);
  } else if (activeTab.value === "resolved") {
    list = list.filter(i => i.status === 1);
  }

  if (searchForm.routeName) {
    const kw = searchForm.routeName.toLowerCase();
    list = list.filter(i => (i.routeName || "").toLowerCase().includes(kw));
  }
  if (searchForm.zoneName) {
    const kw = searchForm.zoneName.toLowerCase();
    list = list.filter(i => (i.zoneName || "").toLowerCase().includes(kw));
  }
  if (searchForm.notifyType) {
    list = list.filter(i => i.notifyType === searchForm.notifyType);
  }
  return list;
});

// 统计（永远用全量数据 allData）
const unresolvedCount = computed(() => allData.value.filter(i => i.status === 0).length);
const resolvedCount = computed(() => allData.value.filter(i => i.status === 1).length);
const totalCount = computed(() => allData.value.length);

const updateTabCounts = () => {
  tabs[0].count = unresolvedCount.value;
  tabs[1].count = resolvedCount.value;
};

// 类型分布
const typeDistribution = computed(() => {
  // 统计【全量数据allData】，不是分页mockData
  const unresolvedList = allData.value.filter(item => item.status === 0) // 未解决
  const resolvedList = allData.value.filter(item => item.status === 1)   // 已解决
  // 分母 = 全部总数
  const totalAll = allData.value.length || 1

  return [
    {
      label: '航线冲突 未解决',
      count: unresolvedList.length,
      percent: Number((unresolvedList.length / totalAll * 100).toFixed(1)),
      color: '#f56c6c' // 红色
    },
    {
      label: '航线冲突 已解决',
      count: resolvedList.length,
      percent: Number((resolvedList.length / totalAll * 100).toFixed(1)),
      color: '#67c23a' // 绿色
    }
  ]
})

// 分页
const pagination = reactive({ pageNum: 1, pageSize: 10 });
const total = ref(0)
const handleSizeChange = () => { pagination.pageNum = 1; getTableList() }
const handlePageChange = () => getTableList()

// 弹窗
const showDetailDialog = ref(false);
const currentRow = ref(null);

// 方法
const switchTab = (key) => {
  activeTab.value = key
  pagination.pageNum = 1
  getTableList()
}

const handleSearch = () => {
  pagination.pageNum = 1
  getTableList()
}

const handleResolve = async (row) => {
  router.push({
    path: "/gis/demo",
    query: {
      source: row.routeName,
    },
  });
};

const handleView = (row) => {
  currentRow.value = row;
  showDetailDialog.value = true;
};

const handleRefresh = () => {
  pagination.pageNum = 1;
  initData(); // 刷新重新调用全量 + 表格
}

// 冲突类型显示
const getNotifyType = (type) => {
  if (type === "ROUTE_NOFLYZONE_CONFLICT") return "航线禁飞区冲突";
  return "其他冲突";
};

/**
 * 1. 获取全量数据（专门用于统计：总数、未处理、已处理）
 * 不分页，pageSize给极大值
 */
const getAllCountData = async () => {
  try {
    const res = await todoList({
      status: "",        // 空：查询全部状态
      pageNum: 1,
      pageSize: 1000000, // 全量
    });
    if (res?.data?.list) {
      allData.value = res.data.list;
      updateTabCounts();
    }
  } catch (err) {
    console.error("获取全量统计数据失败：", err);
  }
};

/**
 * 2. 获取分页表格数据
 * 带 status、分页、正常渲染表格
 */
const getTableList = async () => {
  try {
    loading.value = true;
    // 根据当前Tab设置状态
    let status = activeTab.value === "unresolved" ? 0 : 1;

    const res = await todoList({
      status,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      // 搜索条件带上
      routeName: searchForm.routeName,
      zoneName: searchForm.zoneName,
      notifyType: searchForm.notifyType,
    });

    if (res?.data) {
      mockData.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (err) {
    console.error("获取表格数据失败：", err);
  } finally {
    loading.value = false;
  }
};

/**
 * 3. 初始化：先拿全量统计，再拿表格数据
 */
const initData = async () => {
  await getAllCountData(); // 第一次：全量统计
  await getTableList();    // 第二次：分页表格
};

onMounted(async () => {
  const pageContent = document.querySelector(".page-content");
  if (pageContent) pageContent.classList.add("current-page-no-padding");
  await initData(); // 页面加载执行两次接口
});
</script>

<style scoped lang="scss">
/* 样式完全不变，我只保留你原来的样式 */
/* 全局美化滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(20, 52, 89, 0.4);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(94, 185, 255, 0.4);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(94, 185, 255, 0.7);
}

.todo-container {
  height: 100%;
  background: linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%);
  color: #e0e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  text-align: center;
  padding: 20px 0 12px;

  h2 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 6px;
    background: linear-gradient(180deg, #fff 0%, #7ec8ff 100%);
    -webkit-background-clip: text;
    -webkit-background-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 30px rgba(100, 180, 255, .3);
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #5a8abf;
    letter-spacing: 3px;
  }
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 24px 24px;
  min-height: 0;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

:deep(.flex-table) {
  flex: 1;
  min-height: 0;
}

.tab-bar {
  display: flex;
  background: rgba(10, 30, 60, .85);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(60, 127, 231, .25);

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    cursor: pointer;
    border-radius: 6px;
    transition: all .3s ease;

    .tab-label {
      font-size: 15px;
      font-weight: 500;
      color: #8aa8c7;
      transition: color .3s;
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, .08);
      color: #8aa8c7;
      transition: all .3s;
    }

    &:hover {
      background: rgba(60, 127, 231, .12);

      .tab-label {
        color: #b8d4ef;
      }
    }

    &.active {
      background: linear-gradient(135deg, #1a5bb5 0%, #2563eb 100%);
      box-shadow: 0 4px 15px rgba(37, 99, 235, .35);

      .tab-label {
        color: #fff;
      }

      .tab-count {
        background: rgba(255, 255, 255, .25);
        color: #fff;
      }
    }
  }
}

.search-card {
  border: 1px solid rgba(60, 127, 231, .25);
  border-radius: 8px;
  background: rgba(10, 30, 60, .75);
  backdrop-filter: blur(8px);

  :deep(.el-card__body) {
    padding: 16px 20px 8px;
  }
}

.search-form {
  flex-wrap: wrap;

  :deep(.el-form-item__label) {
    color: #b0c4de;
    font-weight: 500;
  }

  :deep(.el-form-item) {
    margin-bottom: 8px
  }

  :deep(.el-input__wrapper) {
    background: rgba(20, 52, 89, .8);
    box-shadow: 0 0 0 1px rgba(60, 127, 231, .35) inset;

    &.is-focus {
      box-shadow: 0 0 0 1px #a4c4fe inset;
    }
  }

  :deep(.el-input__inner) {
    color: #e0e8f0;

    &::placeholder {
      color: rgba(150, 175, 200, .5);
    }
  }
}

:deep(.refresh-btn) {
  background: rgba(20, 52, 89, 0.8) !important;
  border: 1px solid rgba(60, 127, 231, 0.35) !important;
  color: #fff !important;
}

:deep(.refresh-btn:hover) {
  background: rgba(37, 99, 235, 0.15) !important;
  border-color: #2563eb !important;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 4px;

  .toolbar-left .list-info {
    font-size: 13px;
    color: #8aa8c7;

    em {
      font-style: normal;
      color: #5eb9ff;
      font-weight: 600;
      padding: 0 2px;
    }
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(26, 91, 181, .35);
  --el-table-row-hover-bg-color: transparent !important;
  --el-table-current-row-bg-color: rgba(37, 99, 235, 0.25) !important;
  --el-table-border-color: rgba(60, 127, 231, .2);
  --el-table-text-color: #d0dde8;
  --el-table-header-text-color: #a8c8e8;
  border-radius: 8px;
  overflow: hidden;

  th.el-table__cell {
    font-weight: 600;
  }
}

:deep(.el-table__row) {
  background: transparent !important;
  transition: background-color 0.2s ease;
}

:deep(.el-table__row:hover > td.el-table__cell) {
  background-color: rgba(56, 139, 253, 0.15) !important;
}

:deep(.el-table .operation-column),
:deep(.el-table__row:hover > td.operation-column) {
  background-color: #002357 !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: #002357
}

:deep(.el-table th.is-last) {
  background-color: rgba(26, 91, 181, 0.4) !important;
}

.text-danger {
  color: #f56c6c;
  font-weight: 600;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;

  &.status-unread {
    background: red;
  }

  &.status-read {
    background: #67c23a;
  }
}

:deep(.conflict-row) .el-table__cell {
  background: #0c1e2f !important;
}

.pagination-wrapper {
  display: flex;
  justify-content: left;
  padding: 8px 0 0;

  :deep(.el-pagination) {
    --el-pagination-bg-color: transparent;
    --el-pagination-text-color: #8aa8c7;
    --el-pagination-button-bg-color: rgba(20, 52, 89, .6);
    --el-pagination-hover-color: #5eb9ff;

    .el-pager li {
      background: rgba(20, 52, 89, .6);
      border: 1px solid rgba(60, 127, 231, .25);
      color: #8aa8c7 !important;

      &.is-active {
        background: #2563eb;
        border-color: #2563eb;
      }
    }



    .btn-prev,
    .btn-next {
      background: rgba(20, 52, 89, .6);
      border: 1px solid rgba(60, 127, 231, .25);
    }
  }
}

:deep(.el-pagination button) {
  color: #8aa8c7 !important;
}

:deep(.el-select__wrapper) {
  background: rgba(20, 52, 89, .8) !important;
  box-shadow: 0 0 0 1px rgba(60, 127, 231, .35) inset !important;
}

:deep(.el-select__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #ff9600 inset !important;
}

:deep(.el-select__input) {
  color: #e0e8f0 !important;
}

:deep(.el-select__placeholder) {
  color: rgba(150, 175, 200, .5) !important;
}

:root .dark-select-popper {
  background-color: #0d2137 !important;
  border: 1px solid rgba(60, 127, 231, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 10px;
  background: rgba(10, 30, 60, .8);
  border: 1px solid rgba(60, 127, 231, .25);
  transition: transform .3s ease, box-shadow .3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0, 20, 60, .4);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 26px;
      height: 26px;
    }
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 2px;
    }

    .stat-label {
      font-size: 13px;
      color: #8aa8c7;
    }
  }

  &.stat-unresolved {
    border-left: 3px solid red;

    .stat-icon {
      background: rgba(230, 162, 60, .15);
      color: red;
    }

    .stat-value {
      color: red;
    }
  }

  &.stat-resolved {
    border-left: 3px solid #67c23a;

    .stat-icon {
      background: rgba(103, 194, 58, .15);
      color: #67c23a;
    }

    .stat-value {
      color: #67c23a;
    }
  }

  &.stat-total {
    border-left: 3px solid #5eb9ff;

    .stat-icon {
      background: rgba(94, 185, 255, .15);
      color: #5eb9ff;
    }

    .stat-value {
      color: #5eb9ff;
    }
  }
}

.recent-section {
  background: rgba(10, 30, 60, .8);
  border: 1px solid rgba(60, 127, 231, .25);
  border-radius: 10px;
  padding: 18px 20px;
  overflow: auto;
  min-height: 100px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #c5daf0;

  .title-dot {
    width: 4px;
    height: 16px;
    border-radius: 2px;
    background: linear-gradient(180deg, #5eb9ff, #2563eb);
  }
}

.type-distribution {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dist-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dist-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;

  .dist-name {
    color: #c0d4ea;
  }

  .dist-num {
    color: #8aa8c7;
    font-weight: 500;
  }
}

.dist-track {
  height: 8px;
  background: rgba(255, 255, 255, .06);
  border-radius: 4px;
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  border-radius: 4px;
  transition: width .6s ease;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;

  &.success {
    background: #67c23a;
  }

  &.info {
    background: #5eb9ff;
  }

  &.warning {
    background: red;
  }

  &.danger {
    background: #f56c6c;
  }
}

.timeline-content {
  flex: 1;
  min-width: 0;

  .timeline-desc {
    font-size: 13px;
    color: #c0d4ea;
    line-height: 1.5;
    word-break: break-all;
  }

  .timeline-time {
    font-size: 12px;
    color: #6a8ba8;
  }
}

.action-buttons {
  display: flex;
  gap: 10px;
}

:deep(.el-dialog) {
  --el-dialog-bg-color: #0d2137;
  --el-dialog-title-font-size: 18px;
  border: 1px solid rgba(60, 127, 231, .3);
  border-radius: 12px;

  .el-dialog__header {
    border-bottom: 1px solid rgba(60, 127, 231, .2);
    padding-bottom: 16px;
  }

  .el-dialog__title {
    color: #c5daf0;
  }
}

:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: rgba(26, 91, 181, .25);
  --el-descriptions-text-color: #d0dde8;
  --el-descriptions-item-bordered-label-color: #a8c8e8;
}

:deep(.el-dialog .el-alert--warning) {
  background: rgba(230, 162, 60, .12);
  border-color: rgba(230, 162, 60, .35);
  color: red;
}
</style>