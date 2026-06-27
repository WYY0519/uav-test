<template>
  <div class="manage-container">
    <!-- 搜索 -->
    <!-- <CommonSearch
      :search-items="searchItems"
      :initial-data="searchForm"
      @search="handleSearch"
      @reset="handleReset"
    /> -->

    <!-- 表格 -->
    <CommonTable title="航拍列表" :table-data="filteredDeviceList" :columns="columns" :total="total" :loading="loading"
      :show-selection="false" :show-action="true" action-width="100" @row-click="handleRowClick" ref="tableRef">
      <!-- 操作列：纯图标 -->
      <template #action="{ row }">
        <el-button-group>
          <!-- 回放（图标） -->
          <el-tooltip content="回放视频" placement="top">
            <el-button type="primary" link @click="handlePlay(row)">
              <el-icon>
                <VideoPlay />
              </el-icon>
            </el-button>
          </el-tooltip>

          <!-- 下载（图标） -->
          <el-tooltip content="下载视频" placement="top">
            <el-button type="success" link @click="handleDownload(row)">
              <el-icon>
                <Download />
              </el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </template>

      <!-- 分页 -->
      <template #pagination>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchDeviceList" @current-change="fetchDeviceList" />
      </template>
    </CommonTable>
  </div>
</template>

<script setup>
import { ref, onUnmounted, onMounted } from "vue";
import { ElMessage } from "element-plus";
// 引入图标
import { VideoPlay, Download } from "@element-plus/icons-vue";
import CommonSearch from "@/components/CommonSearch.vue";
import CommonTable from "@/components/CommonTable.vue";
import { videoList, videoPlayUrl, videoDownload, videoDownloadUrl } from "@/api/video";

// 状态
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const deviceList = ref([]);
const filteredDeviceList = ref([]);

// 搜索
const searchForm = ref({ keyword: "" });
const searchItems = [
  {
    prop: "keyword",
    label: "设备编号",
    placeholder: "请输入设备编号搜索",
  },
];

// 表格列
const columns = [
  // { prop: "id", label: "ID", minWidth: "80" },
  {
    prop: "droneId",
    label: "无人机ID",
    minWidth: "180",
    showOverflowTooltip: true,
  },
  {
    prop: "title",
    label: "视频标题",
    minWidth: "200",
    showOverflowTooltip: true,
  },
  {
    prop: "fileName",
    label: "文件名",
    minWidth: "280",
    showOverflowTooltip: true,
  },
  {
    prop: "startTime",
    label: "开始时间",
    minWidth: "160",
    showOverflowTooltip: true,
  },
  {
    prop: "endTime",
    label: "结束时间",
    minWidth: "160",
    showOverflowTooltip: true,
  },
  { prop: "duration", label: "时长(秒)", minWidth: "100" },
  { slotName: "status", label: "状态", width: "100" },
];

// 获取列表
const fetchDeviceList = async () => {
  try {
    loading.value = true;
    const res = await videoList({
      keyword: searchForm.value.keyword,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    if (res.code === 200) {
      const list = res.data.list || [];
      deviceList.value = list;
      filteredDeviceList.value = list;
      total.value = res.data.total;
    }
  } catch (err) {
    ElMessage.error("获取航拍列表失败");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = async (data) => {
  searchForm.value = { ...data };
  currentPage.value = 1;
  await fetchDeviceList();
};

// 重置
const handleReset = async () => {
  searchForm.value = { keyword: "" };
  await fetchDeviceList();
};

// 回放
const handlePlay = async (row) => {
  try {
    let res = await videoPlayUrl(row.id);
    if (res.code == 200) {
      window.open(res.data);
    }
    console.log(res, "======");
  } catch (err) {
    console.log(err)
  }
};

// 下载
let downloading = false;
const handleDownload = async (row) => {
  if (downloading) return alert("正在下载，请稍等");
  if (!row?.id) return alert("视频ID无效");
  downloading = true;
  try {
    console.log("开始下载视频，ID：", row.id);
    const res = await videoDownload(row.id);
    console.log("后端返回完整数据：", res);

    // 兼容两种返回格式：blob 或 JSON（后端报错时返回JSON）
    let videoBlob;
    if (res instanceof Blob) {
      // 如果是 JSON 类型的 Blob，说明后端返回了错误
      if (res.type === "application/json" || res.size < 1000) {
        const errText = await res.text();
        let errMsg = errText;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.msg || errJson.message || "视频资源异常";
        } catch (e) { }
        throw new Error(`后端提示：${errMsg}`);
      }
      videoBlob = res;
    } else {
      throw new Error("接口返回数据格式错误");
    }

    // 解析文件名
    let fileName = `video_${row.fileName}.mp4`;
    if (row.fileName) {
      fileName = row.fileName;
    }

    // 创建下载链接并触发
    const blobUrl = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log("下载成功：", fileName);
  } catch (err) {
    console.error("下载异常详情：", err);
    alert(`视频下载失败：${err?.message || "获取地址异常"}`);
  } finally {
    downloading = false;
  }
};
const handleRowClick = (row) => { };
// 生命周期
onMounted(() => {
  fetchDeviceList();
});

onUnmounted(() => { });
</script>

<style scoped>
.manage-container {
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
}
</style>
