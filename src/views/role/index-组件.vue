<template>
  <div class="device-manage">
    <!-- 1. 公共搜索组件 -->
    <CommonSearch
      :search-items="searchItems"
      :initial-data="initialSearchData"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 2. 公共表格组件 -->
    <CommonTable
      ref="commonTableRef"
      title="无人机设备列表"
      :table-data="filteredDeviceList"
      :columns="tableColumns"
      :total="total"
      :loading="loading"
      show-selection
      :show-action="true"
      :action-width="150"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
    >
      <!-- 表格头部操作按钮插槽 -->
      <template #header-actions>
        <el-button type="primary" @click="refreshList" :icon="Refresh">
          刷新
        </el-button>
        <el-button type="success" @click="handleAdd" :icon="Plus">
          添加设备
        </el-button>
        <el-button type="success" @click="downloadTemplate" :icon="Download">
          下载模板
        </el-button>
        <el-upload
          class="upload-btn"
          action="#"
          :auto-upload="false"
          :on-change="validateImportFile"
          :show-file-list="false"
        >
          <el-button type="success" :icon="DocumentAdd"> 批量导入 </el-button>
        </el-upload>
        <el-button
          type="danger"
          @click="handleBatchDelete"
          :icon="Delete"
          :disabled="selectedRows.length === 0"
        >
          批量删除
        </el-button>
      </template>

      <!-- 表格操作列自定义插槽 -->
      <template #action="{ row }">
        <el-button-group>
          <el-tooltip content="编辑设备" placement="top">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除设备" placement="top">
            <el-button
              type="danger"
              link
              @click="() => handleDelete(row)"
              style="margin-left: 8px"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </template>

      <!-- 设备状态列自定义插槽 -->
      <template #onlineStatus="{ row }">
        <el-tag :type="row.onlineTagType">
          {{ row.onlineStatus }}
        </el-tag>
      </template>

      <!-- 启用状态列自定义插槽 -->
      <template #disable="{ row }">
        <el-switch
          v-model="row.disable"
          @change="() => handleDisableSwitchChange(row)"
        />
      </template>

      <!-- 分页组件插槽 -->
      <template #pagination>
        <CommonPagination
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </template>
    </CommonTable>

    <!-- 3. 公共表单对话框（添加/编辑设备） -->
    <CommonFormDialog
      :title="formDialogTitle"
      v-model="formDialogVisible"
      :form-items="formItems"
      :rules="formRules"
      :initial-data="formInitialData"
      :label-width="'120px'"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    >
      <!-- 视频流地址申请按钮插槽 -->
      <template #extra-buttons>
        <el-button
          type="primary"
          @click="videoStreamURL"
          style="margin-left: 20px"
        >
          申请视频流地址
        </el-button>
      </template>
    </CommonFormDialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onUnmounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Refresh,
  Plus,
  DocumentAdd,
  Download,
  Delete,
  Edit,
} from "@element-plus/icons-vue";

// 引入公共组件
import CommonSearch from "@/components/CommonSearch.vue";
import CommonTable from "@/components/CommonTable.vue";
import CommonPagination from "@/components/CommonPagination.vue";
import CommonFormDialog from "@/components/CommonFormDialog.vue";

// 接口导入
import {
  getCompanyDevices,
  deleteCompanyDevice,
  updateDisable,
  createDevice,
  updateCompanyDevice,
  getVideoStreamAddress,
  deviceManageDownloadDeviceTemplate,
  deviceManageaddDeviceToExcel,
  deviceDeleteCompanyDeviceByIds,
} from "@/api/device";
import { droneIdStatus } from "@/api/drones";

// ===== 搜索配置 =====
const searchItems = [
  { prop: "deviceNumber", label: "设备编号:", placeholder: "输入设备编号搜索" },
];
const initialSearchData = { deviceNumber: "" };
const formInline = reactive({ ...initialSearchData });

// ===== 表格列配置 =====
const tableColumns = [
  { prop: "id", label: "设备ID", width: "80", align: "center" },
  { prop: "name", label: "设备名称", minWidth: "120", align: "center" },
  { prop: "deviceNumber", label: "设备编号", minWidth: "280", align: "center" },
  { prop: "ip", label: "IP地址", minWidth: "120", align: "center" },
  { prop: "dataPort", label: "数据端口", width: "100", align: "center" },
  { prop: "controlPort", label: "控制端口", width: "100", align: "center" },
  { prop: "picturePort", label: "图传端口", width: "100", align: "center" },
  { prop: "videoIp", label: "视频流地址", minWidth: "280", align: "center" },
  {
    prop: "onlineStatus",
    label: "设备状态",
    width: "100",
    align: "center",
    slotName: "onlineStatus",
  },
  {
    prop: "disable",
    label: "启用状态",
    width: "100",
    align: "center",
    slotName: "disable",
  },
];

// ===== 表单配置 =====
const formItems = [
  {
    prop: "name",
    label: "设备名称",
    type: "input",
    required: true,
    maxlength: 10,
    placeholder: "请输入设备名称",
  },
  {
    prop: "deviceNumber",
    label: "设备编号",
    type: "input",
    required: true,
    maxlength: 22,
    placeholder: "请输入设备编号",
    disabled: computed(() => isEditMode.value), // 编辑模式下禁用
  },
  {
    prop: "ip",
    label: "IP地址",
    type: "input",
    required: true,
    maxlength: 15,
    placeholder: "请输入设备IP地址",
  },
  {
    prop: "dataPort",
    label: "数据端口",
    type: "input",
    required: true,
    maxlength: 5,
    placeholder: "请输入数据端口",
  },
  {
    prop: "controlPort",
    label: "控制端口",
    type: "input",
    required: true,
    maxlength: 5,
    placeholder: "请输入控制端口",
  },
  {
    prop: "picturePort",
    label: "图传端口",
    type: "input",
    required: true,
    maxlength: 5,
    placeholder: "请输入图传端口",
  },
  {
    prop: "videoIp",
    label: "视频流地址",
    type: "input",
    required: true,
    maxlength: 100,
    placeholder: "请输入视频流地址",
    disabled: true, // 默认禁用，通过按钮申请
  },
];

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: "请输入设备名称", trigger: "blur" },
    { min: 1, max: 10, message: "长度在1到10个字符", trigger: "blur" },
  ],
  deviceNumber: [
    { required: true, message: "请输入设备编号", trigger: "blur" },
    { min: 22, max: 22, message: "长度必须为22个字符", trigger: "blur" },
  ],
  ip: [
    { required: true, message: "请输入设备IP地址", trigger: "blur" },
    { min: 1, max: 15, message: "长度在1到15个字符", trigger: "blur" },
  ],
  dataPort: [
    { required: true, message: "请输入数据端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度必须为5个字符", trigger: "blur" },
  ],
  controlPort: [
    { required: true, message: "请输入控制端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度必须为5个字符", trigger: "blur" },
  ],
  picturePort: [
    { required: true, message: "请输入图传端口", trigger: "blur" },
    { min: 5, max: 5, message: "长度必须为5个字符", trigger: "blur" },
  ],
  videoIp: [
    { required: true, message: "请输入视频流地址", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (!value) return callback();
        const reg = /^(rtsp:\/\/|rtmp:\/\/|http:\/\/)[^\s]*$/;
        if (!reg.test(value)) {
          return callback(
            new Error(
              "格式错误（必须以rtsp或rtmp或http://开头，且不能包含空格）",
            ),
          );
        }
        callback();
      },
      trigger: "blur",
    },
  ],
};

// ===== 状态管理 =====
const loading = ref(false);
const formDialogVisible = ref(false);
const isEditMode = ref(false);
const formDialogTitle = computed(() =>
  isEditMode.value ? "编辑设备" : "添加设备",
);
const formInitialData = ref({});
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const filteredDeviceList = ref([]);
const selectedRows = ref([]);
const updateTimer = ref(null);
const commonTableRef = ref(null);

// ===== 核心业务方法 =====

// 获取设备列表
const fetchDeviceList = async () => {
  try {
    loading.value = true;
    const res = await getCompanyDevices({
      keyword: formInline.deviceNumber,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });

    if (res.code === 200) {
      let list = res.data.list || [];

      // 转换禁用状态
      list.forEach((item) => {
        item.disable = item.disable === 0 ? true : false;
      });

      // 更新设备在线状态
      await updateDeviceStatus(list);

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

// 更新设备状态
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

// 搜索
const handleSearch = (params) => {
  Object.assign(formInline, params);
  currentPage.value = 1;
  fetchDeviceList();
};

// 重置
const handleReset = () => {
  Object.assign(formInline, initialSearchData);
  selectedRows.value = [];
  if (commonTableRef.value) {
    commonTableRef.value.clearSelection();
  }
  currentPage.value = 1;
  fetchDeviceList();
};

// 刷新列表
const refreshList = () => {
  formInline.deviceNumber = "";
  selectedRows.value = [];
  if (commonTableRef.value) {
    commonTableRef.value.clearSelection();
  }
  fetchDeviceList();
};

// 打开添加设备对话框
const handleAdd = () => {
  isEditMode.value = false;
  formInitialData.value = {
    name: "",
    deviceNumber: "",
    ip: "",
    dataPort: "",
    controlPort: "",
    picturePort: "",
    videoIp: "",
  };
  formDialogVisible.value = true;
};

// 打开编辑设备对话框
const handleEdit = (row) => {
  // 保留原功能：编辑时先勾选当前行并清空其他行
  if (commonTableRef.value) {
    // 清空所有选中
    commonTableRef.value.clearSelection();
    // 找到当前行并勾选
    const targetRow = filteredDeviceList.value.find(
      (item) => item.id === row.id,
    );
    if (targetRow) {
      commonTableRef.value.toggleRowSelection(targetRow, true);
    }
  }

  isEditMode.value = true;
  formInitialData.value = {
    ...row,
    id: row.id, // 保留ID用于编辑
  };
  formDialogVisible.value = true;
};

// 删除设备（保留原功能：先勾选当前行，再删除）
const handleDelete = (row) => {
  // 保存原选中状态（用于取消删除时恢复）
  const originalSelected = [...selectedRows.value];

  // 第一步：清空其他行，只勾选当前行
  if (commonTableRef.value) {
    commonTableRef.value.clearSelection();
    const targetRow = filteredDeviceList.value.find(
      (item) => item.id === row.id,
    );
    if (targetRow) {
      commonTableRef.value.toggleRowSelection(targetRow, true);
    }
  }

  // 第二步：弹出确认框
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
        // 失败时恢复原来的选中状态
        restoreSelection(originalSelected);
      }
    })
    .catch(() => {
      // 取消时恢复原来的选中状态
      restoreSelection(originalSelected);
    });
};

// 恢复选中状态的方法（保留原功能）
const restoreSelection = (originalSelected) => {
  if (!commonTableRef.value || !originalSelected.length) return;

  // 先清空当前选中
  commonTableRef.value.clearSelection();

  // 恢复原选中行
  originalSelected.forEach((item) => {
    const targetRow = filteredDeviceList.value.find(
      (row) => row.id === item.id,
    );
    if (targetRow) {
      commonTableRef.value.toggleRowSelection(targetRow, true);
    }
  });

  // 同步更新选中数据
  selectedRows.value = originalSelected.filter((item) =>
    filteredDeviceList.value.some((row) => row.id === item.id),
  );
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning("请选择要删除的设备");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的【${selectedRows.value.length}】台设备吗？`,
      "批量删除",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );

    const deleteIds = selectedRows.value.map((row) => row.id);
    const res = await deviceDeleteCompanyDeviceByIds(deleteIds);

    if (res.code === 200) {
      ElMessage.success(`成功删除 ${selectedRows.value.length} 台设备`);
      await fetchDeviceList();
      selectedRows.value = [];
      if (commonTableRef.value) {
        commonTableRef.value.clearSelection();
      }
    } else {
      ElMessage.error(res.message || "批量删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("批量删除失败:", error);
    }
  }
};

// 禁用/启用切换
const handleDisableSwitchChange = async (row) => {
  let disable = { disable: row.disable ? 0 : 1 };
  const res = await updateDisable(row.id, disable);
  if (res.code === 200) {
    ElMessage.success(row.disable ? "解禁成功" : "禁用成功");
  } else {
    ElMessage.error("操作失败");
    row.disable = !row.disable; // 回滚状态
  }
};

// 下载模板
const downloadTemplate = async () => {
  try {
    const blob = await deviceManageDownloadDeviceTemplate();

    // 检查是否是有效的Excel文件
    const fileReader = new FileReader();
    const blobContent = await new Promise((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = () => reject(new Error("解析Blob失败"));
      fileReader.readAsText(blob);
    });

    // 判断是否是JSON格式（后端返回的错误信息）
    try {
      const jsonData = JSON.parse(blobContent);
      ElMessage.error(`下载失败：${jsonData.message || "无文件流"}`);
      return;
    } catch (e) {
      // 解析失败，说明是正常的Excel二进制流
      const isExcel = await checkExcelBlob(blob);
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
    ElMessage.error("模板下载失败");
  }
};

// 校验Excel文件
const checkExcelBlob = (blob) => {
  const excelMagicNumbers = [
    "504B0304", // .xlsx
    "D0CF11E0", // .xls
  ];

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

// 验证导入文件
const validateImportFile = (file) => {
  const extension = file.name.split(".").pop().toLowerCase();
  const isExcel = extension === "xlsx" || extension === "xls";
  if (!isExcel) {
    ElMessage.error("请上传Excel文件 (xlsx/xls)");
  } else {
    handleBatchImport(file);
  }
};

// 批量导入
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
    ElMessage.error("导入失败");
  }
};

// 申请视频流地址
const videoStreamURL = async () => {
  try {
    const res = await getVideoStreamAddress();
    if (res.code === 200) {
      formInitialData.value.videoIp = res.data;
    }
  } catch (err) {
    ElMessage.error("视频流获取失败");
  }
};

// 表单提交
const handleFormSubmit = async (formData) => {
  try {
    let res;
    if (isEditMode.value && formInitialData.value.id) {
      // 编辑模式
      res = await updateCompanyDevice(formData, formInitialData.value.id);
    } else {
      // 添加模式
      res = await createDevice(formData);
    }

    if (res.code === 200) {
      ElMessage.success(isEditMode.value ? "编辑设备成功" : "添加设备成功");
      formDialogVisible.value = false;
      await fetchDeviceList();
    } else {
      ElMessage.error(res.message || "操作失败");
    }
  } catch (error) {
    console.error("操作失败:", error);
    ElMessage.error("操作失败");
  }
};

// 表单取消
const handleFormCancel = () => {
  formDialogVisible.value = false;
  formInitialData.value = {};
};

// 行点击
const handleRowClick = (row) => {
  console.log("选中设备:", row);
};

// 多选状态变化
const handleSelectionChange = (val) => {
  selectedRows.value = val;
};

// 分页事件处理
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchDeviceList();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchDeviceList();
};

// ===== 生命周期 =====
onMounted(() => {
  fetchDeviceList();

  // 定时更新设备状态
  updateTimer.value = setInterval(async () => {
    if (filteredDeviceList.value.length > 0) {
      await updateDeviceStatus(filteredDeviceList.value);
    }
  }, 5000);
});

onUnmounted(() => {
  if (updateTimer.value) {
    clearInterval(updateTimer.value);
  }
});
</script>

<style scoped>
.device-manage {
  height: 100%;
  background-color: #f5f7fa;
  box-sizing: border-box;
  padding: 16px;
}

.upload-btn {
  display: inline-block;
  margin-left: 12px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .device-manage {
    padding: 12px;
  }
}
</style>
