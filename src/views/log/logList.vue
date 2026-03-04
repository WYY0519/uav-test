<template>
  <div class="log-list">
    <!-- 单独的搜索条件区域 -->
    <div class="search-bar">
      <div class="search-form">
        <!-- 关键修改1：调整布局结构，按钮区域固定在右侧 -->
        <div class="search-form-left">
          <div class="search-form-item-group">
            <!-- 仅保留3个搜索条件 -->
            <div class="search-form-item">
              <label class="search-label">日志ID：</label>
              <el-input
                v-model="logID"
                placeholder="请输入ID"
                clearable
                @clear="handleLogameClea"
              />
            </div>
            <div class="search-form-item">
              <label class="search-label">飞控编号：</label>
              <el-input
                v-model="logGps"
                placeholder="请输入飞控编号"
                clearable
                @clear="handleLogameClea"
              />
            </div>
            <div class="search-form-item">
              <label class="search-label">截止日期：</label>
              <el-input
                v-model="logTime"
                placeholder="请输入截止日期"
                clearable
                @clear="handleLogameClea"
              />
            </div>
          </div>
        </div>
        <div class="search-form-right">
          <el-button type="primary" @click="fetchLogList" :loading="loading">
            <el-icon> <Search /> </el-icon>搜索
          </el-button>
          <el-button type="primary" @click="refreshLogs" :loading="loading">
            <el-icon> <Refresh /> </el-icon>刷新
          </el-button>
        </div>
      </div>
    </div>

    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <p class="title">飞行日志列表</p>
            <el-tag type="success" effect="plain" class="count-tag">
              共 {{ total }} 条数据
            </el-tag>
          </div>
          <!-- 新增批量删除按钮 -- 暂时隐藏-->
          <!-- <el-button type="danger" @click="handleBatchDelete">
            <el-icon> <Delete /> </el-icon>批量删除
          </el-button> -->
        </div>
      </template>
      <el-table
        ref="logTableRef"
        :data="filteredLogList"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        @row-click="handleRowClick"
        @selection-change="handleSelectionChange"
        :row-key="(row) => row.id"
      >
        <!-- 替换单选为多选列 -->
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column min-width="80" label="序号">
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="id" label="日志ID" min-width="80" />
        <el-table-column
          prop="flightControlId"
          label="飞控号"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="name"
          label="日志名称"
          min-width="350"
          show-overflow-tooltip
        />
        <el-table-column
          prop="createTime"
          label="创建时间"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="查看日志" placement="top">
                <el-button
                  type="primary"
                  link
                  @click="showLogContent(row.name)"
                  :loading="row.loading"
                >
                  <el-icon>
                    <View />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="下载日志" placement="top">
                <el-button type="success" link @click="downloadLog(row.name)">
                  <el-icon>
                    <Download />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <!-- <el-tooltip content="1" placement="top">
                <el-button
                  type="success"
                  link
                  @click="showLogContent1(row.name)"
                >
                  <el-icon>
                    <Download />
                  </el-icon>
                </el-button>
              </el-tooltip> -->
              <!--  -->
              <!-- 新增单行删除按钮 -->
              <!-- <el-tooltip content="删除日志" placement="top">
                <el-button type="danger" link @click="handleSingleDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip> -->
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新日志弹窗组件 -->
    <viewLogsDialog
      :visible="newDialogVisible"
      @update:visible="newDialogVisible = $event"
      :log-filename="newCurrentLogFile"
      :file-loading="newFileLoading"
      :debug="true"
      @close="handleNewDialogClose"
    />
    <!-- 日志内容弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentLogFile"
      width="80%"
      destroy-on-close
    >
      <div class="log-content-container">
        <div class="log-toolbar">
          <el-input
            v-model="searchKeyword"
            placeholder="输入关键词过滤"
            clearable
            style="width: 200px"
          />
          <el-input-number
            v-model="showLines"
            :min="10"
            :max="1000"
            controls-position="right"
            label="显示行数"
          />
        </div>
        <pre class="log-content">{{ filteredLogContent }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import {
  getLogList,
  getLogContent,
  flightLogsDeleteBatchsByIds,
  flightLogsDownload,
  // getLogs,
  // batchDeleteLogs,
  // deleteLog,
} from "@/api/log"; // 新增删除接口
import { downloadFile } from "@/utils/request";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Refresh,
  View,
  Download,
  Search,
  Delete,
} from "@element-plus/icons-vue";
import viewLogsDialog from "./component/viewLogsDialog.vue";

// 状态变量
const loading = ref(false);
const dialogVisible = ref(false);
const currentLogFile = ref("");
const logContent = ref([]);
const searchKeyword = ref("");
const showLines = ref(100);
const searchQuery = ref("");
const logFiles = ref([]);
const logTime = ref("");
const logGps = ref("");
const logID = ref("");
// 多选相关
const logTableRef = ref(null);
const selectedLogFilenames = ref([]); // 保存选中的日志ID
// 新组件弹窗相关状态
const newDialogVisible = ref(false);
const newCurrentLogFile = ref("");
const newFileLoading = ref(false);
// 分页
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);

// 获取日志文件列表
const fetchLogList = async () => {
  try {
    loading.value = true;
    let data = {
      filename: logGps.value,
      id: logID.value,
      days: logTime.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    };
    const response = await getLogList(data);

    if (response.code !== 200 || !response.data) {
      throw new Error(response.message || "请求失败，服务端返回异常");
    }

    const resData = response.data;
    if (!Array.isArray(resData.list)) {
      throw new Error("响应数据中list不是有效数组");
    }

    logFiles.value = resData.list.map((item) => ({
      filename: item?.name,
      id: item?.id,
      name: item?.name,
      createTime: "--",
      size: "--",
      ...parseLogInfo(item?.name),
      loading: false,
    }));

    total.value = resData.total;
  } catch (error) {
    console.error("获取日志列表失败:", error);
    ElMessage.error(`获取日志列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 清空搜索条件
const handleLogameClea = async () => {
  logID.value = "";
  logGps.value = "";
  logTime.value = "";
  await fetchLogList();
};

// 刷新日志列表
const refreshLogs = () => {
  loading.value = true;
  setTimeout(() => {
    logTime.value = "";
    logGps.value = "";
    logID.value = "";
    selectedLogFilenames.value = [];
    if (logTableRef.value) {
      logTableRef.value.clearSelection(); // 清空多选
    }
    fetchLogList();
    loading.value = false;
    ElMessage.success("刷新成功");
  }, 1000);
};

// 打开新弹窗（保留原有逻辑）
const showLogContent1 = async (filename) => {
  console.log("父组件: 调用showLogContent1，参数filename:", filename);

  const file = logFiles.value.find((f) => f.name === filename);
  if (!file) {
    console.error("父组件: 未找到文件:", filename);
    ElMessage.error("未找到对应的日志文件");
    return;
  }

  try {
    newFileLoading.value = true;
    newDialogVisible.value = false;
    await nextTick();

    newCurrentLogFile.value = filename;
    await nextTick();

    newDialogVisible.value = true;
    console.log("父组件: 已设置newDialogVisible为true");
  } catch (error) {
    console.error("父组件: 打开弹窗出错:", error);
    ElMessage.error(`打开日志失败: ${error.message}`);
  } finally {
    newFileLoading.value = false;
  }
};

// 新弹窗关闭回调
const handleNewDialogClose = () => {
  newCurrentLogFile.value = "";
};

// 查看日志内容
const showLogContent = async (filename) => {
  const file = logFiles.value.find((f) => f.name === filename);
  if (!file) return;

  try {
    file.loading = true;
    currentLogFile.value = filename;
    const res = await getLogContent(filename);

    if (res && res.code === 200) {
      logContent.value = res.data;
      dialogVisible.value = true;
    } else {
      ElMessage.error(res?.message || "获取日志内容失败");
    }
  } catch (error) {
    console.error("获取日志内容失败:", error);
    ElMessage.error(`downloadFile: ${error.message}`);
  } finally {
    file.loading = false;
  }
};

// 辅助函数：校验Blob是否为有效Excel文件（通过魔术数判断）
const checkExcelBlob = (blob) => {
  // Excel(xlsx)的魔术数（文件开头的二进制标识）
  const excelMagicNumbers = [
    "504B0304", // .xlsx 核心标识
    "D0CF11E0", // .xls 标识（旧版Excel）
  ];

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const uint8Array = new Uint8Array(e.target.result);
      // 取前4个字节转成16进制字符串
      const magicNumber = Array.from(uint8Array.slice(0, 4))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      resolve(excelMagicNumbers.includes(magicNumber));
    };
    // 只读前4个字节，提升性能
    reader.readAsArrayBuffer(blob.slice(0, 4));
  });
};
//下载日志
const downloadLog = async (filename) => {
  try {
    // 1. 编码文件名（避免中文/特殊字符乱码）
    const encodedFilename = encodeURIComponent(filename);
    // 2. 调用下载接口获取Blob文件流
    const blob = await flightLogsDownload(encodedFilename);
    console.log("日志文件Blob：", blob);

    // 3. 基础校验：确保是有效Blob且非空
    if (!(blob instanceof Blob) || blob.size === 0) {
      ElMessage.error("下载失败：返回的日志文件数据无效");
      return;
    }

    // 4. 尝试解析Blob，区分"真文件流"和"JSON错误信息"
    const fileReader = new FileReader();
    const blobContent = await new Promise((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = () => reject(new Error("解析Blob失败"));
      fileReader.readAsText(blob); // 读取Blob内容为文本
    });

    // 5. 判断是否是JSON格式的错误响应（后端返回的假200）
    try {
      const jsonData = JSON.parse(blobContent);
      ElMessage.error(
        `下载失败：接口返回错误信息（${jsonData.message || "无文件流"}）`,
      );
      return;
    } catch (e) {
      // 解析失败 = 是正常的.log文件流，执行下载
      // 6. 安全触发下载（避免浏览器拦截）
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.log$/, "")}.log`; // 不用encodedFilename，避免文件名编码乱码
      document.body.appendChild(a);

      // 延迟点击，确保标签挂载完成
      setTimeout(() => {
        a.click();
        // 7. 延迟清理资源，确保下载完成
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 1000);
      }, 0);

      ElMessage.success("日志文件下载成功！");
    }
  } catch (error) {
    // 8. 错误提示
    console.error("日志文件下载异常：", error);
  }
};

// 过滤显示的日志内容
const filteredLogContent = computed(() => {
  let content = logContent.value;
  if (searchKeyword.value) {
    content = content.filter((line) => line.includes(searchKeyword.value));
  }
  return content.slice(-showLines.value).join("\n");
});

// 过滤后的日志列表
const filteredLogList = computed(() => {
  if (!searchQuery.value) return logFiles.value;
  return logFiles.value.filter(
    (log) =>
      log.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.flightControlId
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase()),
  );
});

// 处理行点击
const handleRowClick = (row) => {
  // 行点击时选中当前行
  logTableRef.value?.toggleRowSelection(row, true);
};

// 处理多选变化（核心：保存选中的ID）
const handleSelectionChange = (val) => {
  selectedLogFilenames.value = val.map((item) => item.name);
  console.log("选中的日志ID:", selectedLogFilenames.value);
};

const handleBatchDelete = async () => {
  if (selectedLogFilenames.value.length === 0) {
    ElMessage.warning("请选择要删除的日志");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的【${selectedLogFilenames.value.length}】条日志吗？`,
      "批量删除",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );

    loading.value = true;
    let deleteIds = selectedLogFilenames.value;
    const res = await flightLogsDeleteBatchsByIds(deleteIds);
    if (res.code === 200) {
      ElMessage.success("批量删除成功");
      // 清空选中状态
      logTableRef.value?.clearSelection();
      selectedLogFilenames.value = [];
      // 刷新列表
      await fetchLogList();
    } else {
      ElMessage.error(res.message || "批量删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      // 排除用户取消的情况
      console.error("批量删除失败:", error);
      ElMessage.error("批量删除失败");
    }
  } finally {
    loading.value = false;
  }
};

// 单行删除日志
const handleSingleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除日志【${row.name}】吗？`,
      "删除日志",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );

    loading.value = true;
    // 调用单行删除接口
    const res = await deleteLog(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      // 清空选中状态
      logTableRef.value?.clearSelection();
      selectedLogFilenames.value = [];
      // 刷新列表
      await fetchLogList();
    } else {
      ElMessage.error(res.message || "删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除失败:", error);
      ElMessage.error("删除失败");
    }
  } finally {
    loading.value = false;
  }
};

// 解析日志信息（保留原有逻辑）
const parseLogInfo = (filename) => {
  const isHexString = (str) => {
    return str && /^[0-9A-Fa-f]{8,}$/.test(str);
  };

  try {
    const extIndex = filename.lastIndexOf(".");
    const name = extIndex === -1 ? filename : filename.slice(0, extIndex);

    const parts = name.split("_");
    console.log("分割后的文件名部分：", parts);

    if (parts.length < 5) throw new Error("文件名格式错误，段数不足");

    const datePart = parts[parts.length - 2];
    const timePart = parts[parts.length - 1];

    if (!/^\d{8}$/.test(datePart) || !/^\d{6}$/.test(timePart)) {
      throw new Error("日期或时间格式错误");
    }

    const year = datePart.slice(0, 4);
    const month = datePart.slice(4, 6);
    const day = datePart.slice(6, 8);
    const hour = timePart.slice(0, 2);
    const minute = timePart.slice(2, 4);
    const second = timePart.slice(4, 6);

    const fcStartIndex = 2;
    const fcParts = parts.slice(fcStartIndex, parts.length - 2);
    const fcStr = fcParts.join("_");

    const flightControlId = isHexString(fcStr) ? fcStr : "--";

    return {
      createTime: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
      flightControlId,
    };
  } catch (error) {
    console.warn(`解析失败: ${filename}`, error);
    return {
      createTime: "--",
      flightControlId: "--",
    };
  }
};

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchLogList();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchLogList();
};

// 初始化加载
onMounted(() => {
  fetchLogList();
});
</script>

<style scoped>
/* 新增搜索栏样式 */
.search-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* 关键修改2：核心布局样式 - 弹性布局+空间分配 */
.search-form {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
}

/* 左侧搜索条件区域：占满剩余空间，禁止换行 */
.search-form-left {
  flex: 1;
  min-width: 0; /* 关键：解决弹性布局下内容溢出问题 */
}

/* 搜索项分组：弹性布局，强制3个item在一行，禁止换行 */
.search-form-item-group {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

/* 关键修改3：每个搜索项平均分配宽度，不写死，自适应屏幕 */
.search-form-item {
  display: flex;
  align-items: center;
  flex: 1; /* 平均分配宽度 */
  min-width: 0; /* 允许宽度收缩，适配小屏幕 */
}

/* 输入框宽度自适应父容器 */
:deep(.search-form-item .el-input) {
  width: 100%;
}

.search-label {
  color: #606266;
  font-size: 14px;
  margin-right: 8px;
  white-space: nowrap;
  flex: 0 0 auto; /* label宽度自适应内容，不伸缩 */
}

/* 右侧按钮区域：固定不换行 */
.search-form-right {
  flex: 0 0 auto; /* 关键：固定宽度，不伸缩、不换行 */
  display: flex;
  gap: 8px;
  white-space: nowrap; /* 强制按钮在一行 */
}

.list-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow-x: auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  min-width: 100px;
  margin: 0;
}

.count-tag {
  padding: 4px 8px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  border-radius: 8px;
  margin-top: 20px;
}

:deep(.el-button-group) {
  display: flex;
  gap: 8px;
}

.log-content-container {
  height: 60vh;
  display: flex;
  flex-direction: column;
}

.log-toolbar {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

.log-content {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: auto;
  font-family: monospace;
  white-space: pre-wrap;
}

/* 响应式优化：小屏幕下调整布局 */
@media (max-width: 768px) {
  .search-form {
    flex-direction: column; /* 小屏幕下按钮区域换行到下方 */
    align-items: stretch;
    gap: 8px;
  }

  .search-form-item-group {
    flex-direction: column; /* 小屏幕下搜索项垂直排列 */
    gap: 8px;
    align-items: stretch;
  }

  .search-form-item {
    width: 100%;
  }

  .search-form-right {
    justify-content: flex-start;
  }

  .card-header {
    flex-direction: column;
    gap: 16px;
  }

  :deep(.el-table__body) {
    width: 100% !important;
  }

  :deep(.el-table__header) {
    width: 100% !important;
  }
}
</style>
