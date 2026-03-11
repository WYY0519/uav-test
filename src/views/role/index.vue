<template>
  <div class="manage-container">
    <!-- 搜索组件 -->
    <CommonSearch
      :search-items="searchItems"
      :initial-data="searchForm"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 表格组件 -->
    <CommonTable
      title="无人机列表"
      :table-data="filteredDeviceList"
      :columns="columns"
      :total="total"
      :loading="loading"
      :show-selection="true"
      :show-action="true"
      action-width="200"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      ref="tableRef"
    >
      <template #header-actions>
        <el-button type="primary" :icon="Refresh" @click="refreshList">
          刷新
        </el-button>
        <el-button type="success" :icon="Plus" @click="handleAdd">
          添加设备
        </el-button>
        <el-button type="success" @click="downloadTemplate">
          <el-icon>
            <Download />
          </el-icon>
          下载模版
        </el-button>
        <el-upload
          class="upload-btn"
          action="#"
          :auto-upload="false"
          :on-change="validateImportFile"
          ref="uploadRef"
          :show-file-list="false"
        >
          <el-button type="success">
            <el-icon>
              <DocumentAdd />
            </el-icon>
            批量导入
          </el-button>
        </el-upload>
        <el-button type="danger" @click="handleBatchDelete">
          <el-icon> <Delete /> </el-icon>批量删除
        </el-button>
      </template>

      <!-- 设备状态列 -->
      <template #onlineStatus="{ row }">
        <el-tag :type="row.onlineTagType">
          {{ row.onlineStatus }}
        </el-tag>
      </template>

      <!-- 启用状态列 -->
      <template #disable="{ row }">
        <el-switch
          v-model="row.disable"
          @change="() => handleDisableSwitchChange(row)"
        />
      </template>

      <!-- 操作列 -->
      <template #action="{ row }">
        <el-button-group>
          <el-tooltip content="编辑设备" placement="top">
            <el-button
              type="primary"
              :icon="Edit"
              link
              @click="handleEdit(row)"
            />
          </el-tooltip>
          <el-tooltip content="删除设备" placement="top">
            <el-button
              type="danger"
              :icon="Delete"
              link
              @click="handleDelete(row)"
            />
          </el-tooltip>
        </el-button-group>
      </template>

      <!-- 分页 -->
      <template #pagination>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchDeviceList"
          @current-change="fetchDeviceList"
        />
      </template>
    </CommonTable>

    <!-- 新增/编辑弹窗 -->
    <CommonFormDialog
      ref="formRef"
      v-model="deviceDialogVisible"
      :form-dialog-title="dialogTitle"
      :form-items="formItems"
      :initial-data="deviceFormData"
      :rules="deviceRules"
      @submit="submitForm"
    >
      <template #form-videoIp>
        <div style="width: 100%">
          <el-input
            v-model="deviceFormData.videoIp"
            placeholder="请输入视频流地址"
            disabled
            clearable
            style="width: 100%"
          />
          <el-button
            v-if="!isEditMode"
            type="primary"
            @click="videoStreamURL"
            style="margin-top: 8px"
          >
            申请视频流地址
          </el-button>
        </div>
      </template>
    </CommonFormDialog>
  </div>
</template>

<style scoped>
.manage-container {
  height: 100%;
  background-color: #f5f7fa;
  box-sizing: border-box;
}

.operation-card {
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.right-section {
  display: flex;
  align-items: center;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow-x: auto;
  padding: 8px 16px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 250px;
}

.action-button {
  padding: 10px 20px;
}

.upload-btn {
  display: inline-block;
  margin-left: 12px;
}

/* 表格单元格居中 */
.el-table .cell {
  text-align: center !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .action-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .left-section {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .action-button {
    width: 100%;
  }
}
</style>
<script setup>
import { ref, onUnmounted, onMounted, watch, computed, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Refresh, Plus, Edit, Delete } from "@element-plus/icons-vue";
import {
  getCompanyDevices,
  deleteCompanyDevice,
  updateDisable,
  deviceManageDownloadDeviceTemplate,
  deviceManageaddDeviceToExcel,
  deviceDeleteCompanyDeviceByIds,
  createDevice,
  updateCompanyDevice,
  getVideoStreamAddress,
} from "@/api/device";
import { Download, DocumentAdd } from "@element-plus/icons-vue";
import { droneIdStatus } from "../../api/drones";
import CommonSearch from "@/components/CommonSearch.vue";
import CommonTable from "@/components/CommonTable.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";

// 状态变量
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const deviceList = ref([]);
const selectedDeviceId = ref("");
const deviceDialogVisible = ref(false);
const currentDevice = ref({});
const isEditMode = ref(false);
const filteredDeviceList = ref([]);
const uploadRef = ref(null);
const selectedRows = ref([]);
const tableRef = ref(null);

// 搜索表单配置
const searchForm = ref({
  keyword: "",
});
const searchItems = [
  {
    prop: "keyword",
    label: "设备编号",
    placeholder: "请输入设备编号搜索",
  },
];

// 表格列配置
const columns = [
  {
    prop: "id",
    label: "设备ID",
    minWidth: "80",
  },
  {
    prop: "name",
    label: "设备名称",
    minWidth: "120",
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    minWidth: "280",
  },
  {
    prop: "videoIp",
    label: "视频IP",
    minWidth: "280",
  },
  {
    slotName: "onlineStatus",
    label: "设备状态",
    width: "100",
  },
  {
    slotName: "disable",
    label: "启用状态",
    width: "100",
  },
];

// 表单项配置
const formItems = computed(() => [
  {
    prop: "name",
    label: "设备名称",
    type: "input",
    placeholder: "请输入设备名称",
    required: true,
    maxlength: 10,
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    type: "input",
    placeholder: "请输入设备编号",
    required: true,
    maxlength: 22,
    disabled: isEditMode.value,
  },
  {
    prop: "videoIp",
    label: "视频流地址",
    slotName: "videoIp",
    required: true,
  },
]);

// 表单验证规则
const deviceRules = {
  name: [
    { required: true, message: "请输入设备名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在 1 到 10 个字符", trigger: "blur" },
  ],
  deviceNumber: [
    { required: true, message: "请输入设备编号", trigger: "blur" },
    { min: 22, max: 22, message: "长度在22个字符", trigger: "blur" },
  ],
  videoIp: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.trim() === "") {
          return callback(new Error("请输入视频流地址"));
        }
        const reg = /^(rtsp:\/\/|rtmp:\/\/|http:\/\/)[^\s]*$/;
        if (!reg.test(value)) {
          return callback(
            new Error(
              "视频流地址格式错误（必须以rtsp或rtmp或http://开头，且不能包含空格）",
            ),
          );
        }
        callback();
      },
      trigger: "blur",
    },
  ],
};

// 表单数据
const deviceFormData = ref({
  id: "",
  name: "",
  deviceNumber: "",
  videoIp: "",
});

// 弹窗标题
const dialogTitle = computed(() => {
  return isEditMode.value ? "编辑设备" : "添加设备";
});

// 批量更新设备在线状态
const updateDeviceStatus = async (deviceList) => {
  if (!deviceList || deviceList.length === 0) return;

  await Promise.all(
    deviceList.map(async (item) => {
      try {
        const statusRes = await droneIdStatus(item.deviceNumber);
        if (statusRes.code === 200) {
          item.onlineStatus = statusRes.data.status ? "在线" : "离线";
          item.onlineTagType = statusRes.data.status ? "success" : "danger";
        } else {
          item.onlineStatus = "未知";
          item.onlineTagType = "warning";
        }
      } catch (error) {
        console.error(`设备 ${item.deviceNumber} 状态更新失败:`, error);
        item.onlineStatus = "异常";
        item.onlineTagType = "danger";
      }
    }),
  );
};

// 获取设备列表数据
const fetchDeviceList = async () => {
  try {
    loading.value = true;
    const res = await getCompanyDevices({
      keyword: searchForm.value.keyword,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    if (res.code === 200) {
      let list = res.data.list || [];

      list.forEach((item) => {
        item.disable = item.disable === 0 ? true : false;
      });

      await updateDeviceStatus(list);

      deviceList.value = list;
      filteredDeviceList.value = list;
      total.value = res.data.total;
    } else {
      ElMessage.error(res.message || "获取设备列表失败");
    }
  } catch (error) {
    console.error("获取设备列表失败:", error);
    ElMessage.error("获取设备列表失败");
  } finally {
    loading.value = false;
  }
};

// 处理禁用状态切换
const handleDisableSwitchChange = async (row) => {
  let disable = { disable: row.disable ? 0 : 1 };
  const res = await updateDisable(row.id, disable);
  if (res.code === 200) {
    ElMessage.success(row.disable ? "解禁成功" : "禁用成功");
  } else {
    ElMessage.error("操作失败");
    row.disable = !row.disable;
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
  searchForm.value = {
    keyword: "",
  };
  await fetchDeviceList();
};

// 刷新列表
const refreshList = () => {
  loading.value = true;
  searchForm.value = "";
  selectedDeviceId.value = "";
  tableRef.value?.clearSelection();
  fetchDeviceList();
};

// 新增设备
const handleAdd = () => {
  isEditMode.value = false;
  deviceFormData.value = {
    id: "",
    name: "",
    deviceNumber: "",
    videoIp: "",
  };
  deviceDialogVisible.value = true;
};

// 编辑设备
const handleEdit = (row) => {
  isEditMode.value = true;
  deviceFormData.value = {
    id: row.id,
    name: row.name,
    deviceNumber: row.deviceNumber,
    videoIp: row.videoIp,
  };
  // 使用 nextTick 确保数据更新后再打开弹窗
  nextTick(() => {
    deviceDialogVisible.value = true;
  });
};

// 删除设备
const handleDelete = (row) => {
  const originalSelected = [...selectedRows.value];

  ElMessageBox.confirm(`确定要删除设备【${row.name}】`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  })
    .then(async () => {
      try {
        const res = await deleteCompanyDevice(row.id);
        if (res.code === 200) {
          ElMessage.success("删除设备成功");
          await fetchDeviceList();
        }
      } catch (error) {
        ElMessage.error("删除设备失败");
        restoreSelection(originalSelected);
      }
    })
    .catch(() => {
      restoreSelection(originalSelected);
    });
};

// 恢复选中状态的方法
const restoreSelection = (originalSelected) => {
  if (!tableRef.value || !originalSelected.length) return;

  tableRef.value.clearSelection();

  originalSelected.forEach((item) => {
    const targetRow = filteredDeviceList.value.find(
      (row) => row.id === item.id,
    );
    if (targetRow) {
      tableRef.value.tableRef.value.toggleRowSelection(targetRow, true);
    }
  });

  selectedRows.value = originalSelected.filter((item) =>
    filteredDeviceList.value.some((row) => row.id === item.id),
  );
};

// 下载模版
const downloadTemplate = async () => {
  try {
    const blob = await deviceManageDownloadDeviceTemplate();
    const fileReader = new FileReader();
    const blobContent = await new Promise((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = () => reject(new Error("解析Blob失败"));
      fileReader.readAsText(blob);
    });
    try {
      const jsonData = JSON.parse(blobContent);
      ElMessage.error(
        `下载失败：接口返回JSON数据（${jsonData.message || "无文件流"}）`,
      );
      return;
    } catch (e) {
      const isExcel = checkExcelBlob(blob);
      if (!isExcel) {
        ElMessage.error("下载失败：返回的文件不是有效的Excel文件");
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "无人机模板.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      ElMessage.success("无人机模板Excel下载成功！");
    }
  } catch (error) {
    console.error("Excel下载异常：", error);
  }
};

const checkExcelBlob = (blob) => {
  const excelMagicNumbers = ["504B0304", "D0CF11E0"];

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const uint8Array = new Uint8Array(e.target.result);
      const magicNumber = Array.from(uint8Array.slice(0, 4))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      resolve(excelMagicNumbers.includes(magicNumber));
    };
    reader.readAsArrayBuffer(blob.slice(0, 4));
  });
};

const validateImportFile = (file) => {
  const extension = file.name.split(".").pop().toLowerCase();
  const isExcel = extension === "xlsx" || extension === "xls";
  if (!isExcel) {
    ElMessage.error("请上传Excel文件 (xlsx/xls)");
    uploadRef.value.clearFiles();
  } else {
    handleBatchImport(file);
  }
};

const handleBatchImport = async (file) => {
  if (!file?.raw) {
    ElMessage.warning("请选择要导入的Excel文件！");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("file", file.raw);
    const res = await deviceManageaddDeviceToExcel(formData);
    ElMessage.success(res.message || "数据导入成功！");
    await fetchDeviceList();
  } catch (error) {
    console.error("导入异常：", error);
    open(error);
  }
};

const handleRowClick = (row) => {
  selectedDeviceId.value = row.id;
  console.log("选中设备:", row);
};

const handleSelectionChange = (val) => {
  selectedRows.value = val;
  console.log("选中的多行数据:", val);
};

const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchDeviceList();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchDeviceList();
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning("请选择要删除的设备");
    return;
  }

  try {
    loading.value = true;
    const deleteIds = selectedRows.value.map((row) => row.id);
    const res = await deviceDeleteCompanyDeviceByIds(deleteIds);
    if (res.code === 200) {
      ElMessage.success(`成功删除 ${selectedRows.value.length} 台设备`);
      await fetchDeviceList();
      tableRef.value?.clearSelection();
    } else {
      ElMessage.error(res.message || "批量删除失败");
    }
  } catch (error) {
    console.error("批量删除接口调用失败:", error);
    ElMessage.error("批量删除失败，请重试");
  } finally {
    loading.value = false;
  }
};

// 提交表单
const submitForm = async (formData) => {
  try {
    let res;
    const formDataObj = {
      name: formData.name,
      deviceNumber: formData.deviceNumber,
      videoIp: formData.videoIp,
    };

    if (isEditMode.value && formData.id) {
      res = await updateCompanyDevice(formDataObj, formData.id);
    } else {
      res = await createDevice(formDataObj);
    }
    if (res.code === 200) {
      ElMessage.success(isEditMode.value ? "编辑设备成功" : "添加设备成功");
      deviceDialogVisible.value = false;
      await fetchDeviceList();
    } else {
      ElMessage.error(res.message || "操作失败");
    }
  } catch (error) {
    console.error("操作失败:", error);
    ElMessage.error("操作失败");
  }
};

// 对话框取消
const handleDialogCancel = () => {
  deviceFormData.value = {
    id: "",
    name: "",
    deviceNumber: "",
    videoIp: "",
  };
};

// 表单ref
const formRef = ref(null);

// 申请视频流地址
const videoStreamURL = async () => {
  try {
    let res = await getVideoStreamAddress();
    if (res.code === 200) {
      deviceFormData.value.videoIp = res.data;
      // 清除验证错误
      await nextTick();
      formRef.value?.clearValidate("videoIp");
    }
  } catch (err) {
    ElMessage.error("视频流获取失败");
  }
};

watch(deviceDialogVisible, (newVal) => {
  if (newVal === false) {
    deviceFormData.value = {
      id: "",
      name: "",
      deviceNumber: "",
      videoIp: "",
    };
  }
});
onMounted(() => {
  fetchDeviceList();
  const updateTimer = setInterval(async () => {
    if (deviceList.value.length > 0) {
      await updateDeviceStatus(deviceList.value);
    }
  }, 5000);
});
onUnmounted(() => {
  // clearInterval(updateTimer);
  // const handleSubmit = (formData) => {
  //   submitForm(formData);
  // };
});
</script>

<style scoped>
.manage-container {
  height: 100%;
  background-color: #f5f7fa;
  box-sizing: border-box;
}

.operation-card {
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.right-section {
  display: flex;
  align-items: center;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow-x: auto;
  padding: 8px 16px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 250px;
}

.action-button {
  padding: 10px 20px;
}

.upload-btn {
  display: inline-block;
  margin-left: 12px;
}

/* 表格单元格居中 */
.el-table .cell {
  text-align: center !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .action-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .left-section {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .action-button {
    width: 100%;
  }
}
</style>
