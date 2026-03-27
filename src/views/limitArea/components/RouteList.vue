<template>
  <div class="route-list-container">
    <!-- 搜索区域 - 适配禁飞区：搜索名称/描述 -->
    <div class="route-search">
      <el-input
        v-model="searchKeyword"
        @input="handleSearchInput"
        clearable
        placeholder="请输入要搜索的名称"
      />
      <el-input
        v-model="searchAddress"
        @input="handleSearchInput"
        clearable
        placeholder="请输入要搜索的地址"
      />
    </div>

    <!-- 禁飞区列表 -->
    <div class="route-list-content">
      <div
        v-for="(itemInfo, index) in routeInfo"
        :key="itemInfo.id"
        class="routeOperation"
      >
        <div class="routeOperation-box">
          <!-- 第一行：禁飞区名称 -->
          <div class="tooltip-container">
            <span class="truncated-text">{{ itemInfo.name }}</span>
          </div>
          <!-- 第二行：禁飞区核心信息 -->
          <div class="zone-info">
            <div class="info-row info-row-between">
              <div class="info-item">
                <span class="info-label">面积：</span>
                <span class="info-value"
                  >{{ itemInfo.area.toFixed(2) }} km²</span
                >
              </div>
              <div class="info-item">
                <span
                  class="info-tag"
                  :class="
                    itemInfo.borderColor === '#e74c3c'
                      ? 'tag-danger'
                      : 'tag-warning'
                  "
                >
                  {{ itemInfo.shape === "polygon" ? "多边形" : "圆形" }}
                  {{ itemInfo.borderColor === "#e74c3c" ? "禁飞区" : "禁高区" }}
                </span>
              </div>
            </div>
            <div class="info-row info-row-single">
              <div class="info-item">
                <span class="info-label">地址：</span>
                <span class="info-value">{{
                  itemInfo?.limitAddress || "暂无"
                }}</span>
              </div>
            </div>
            <div class="info-row info-row-single">
              <div class="info-item">
                <span class="info-label">创建时间：</span>
                <span class="info-value">{{
                  formatTime(itemInfo.createTime)
                }}</span>
              </div>
            </div>
          </div>
          <!-- 操作按钮 - 查看/收起、编辑/完成、取消编辑、删除 -->
          <div class="action-buttons">
            <span
              :class="
                itemInfo.id === activeRouteId
                  ? 'routeOperation-box-foldUp'
                  : 'routeOperation-box-view'
              "
              @click="
                itemInfo.id === activeRouteId
                  ? retractRoute()
                  : viewRoute(itemInfo)
              "
            >
              {{ itemInfo.id === activeRouteId ? "收起" : "查看" }}
            </span>
            <span
              :class="
                itemInfo.id === editingZoneId
                  ? 'routeOperation-box-edit-active'
                  : 'routeOperation-box-edit'
              "
              @click="editRoute(itemInfo)"
            >
              {{ itemInfo.id === editingZoneId ? "完成编辑" : "编辑" }}
            </span>
            <span
              v-if="itemInfo.id === editingZoneId"
              class="routeOperation-box-cancel"
              @click="cancelEdit"
            >
              取消编辑
            </span>
            <span
              class="routeOperation-box-delete"
              @click="deleteRoute(itemInfo)"
            >
              删除
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20, 30, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 删除确认弹窗 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
      type="warning"
    >
      <p>确定要删除该域区吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmDelete">删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { debounce } from "lodash";
// import {
//   limitAreasList,
//   limitAreasDelete,
//   limitAreasUpdate,
// } from "@/api/limitAreas.js";
import {
  noflyzoneList,
  noflyzoneDelete,
  noflyzoneUpdate,
} from "@/api/noflyzone.js";
// Props
const props = defineProps({
  map: {
    type: Object,
    required: true,
  },
  noFlyZoneManagerRef: {
    type: Object,
    required: true,
  },
});

// Emits
const emit = defineEmits([
  "route-view",
  "route-retract",
  "route-edit",
  "route-edit-complete",
  "route-delete",
]);

// 状态变量
const searchKeyword = ref("");
const searchAddress = ref(""); // 地址搜索（新增）
const routeInfo = ref([]);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const activeRouteId = ref(null); // 当前查看的禁飞区ID
const editingZoneId = ref(null); // 当前编辑的禁飞区ID
const deleteDialogVisible = ref(false);
const deletingRouteIndex = ref(null);
// 添加新的状态变量
const isEditing = ref(false); // 标记是否处于编辑模式
// 时间格式化
const formatTime = (timeStr) => {
  if (!timeStr) return "暂无创建时间";
  const date = new Date(timeStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 获取禁飞区列表
const routeList = async (value = "") => {
  try {
    const res = await noflyzoneList({
      name: searchKeyword.value,
      address: searchAddress.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });

    if (res && res.data) {
      const noFlyList = res.data.list.map((item) => {
        let coordinates = [[[]]]; // 初始化默认三层数组，保证格式统一
        let radius = 0;

        try {
          if (item.coordinates) {
            let parsedCoords;
            try {
              parsedCoords = JSON.parse(item.coordinates);
            } catch (e) {
              // 如果解析失败，尝试检测是否是对象数组字符串
              console.log(
                `JSON.parse失败，尝试其他解析方式:`,
                item.coordinates,
              );
              // 如果是对象数组字符串 "[{\"lng\":xx,\"lat\":yy}...]"，则手动解析
              if (
                item.coordinates.includes('"lng"') &&
                item.coordinates.includes('"lat"')
              ) {
                // 构造完整数组并解析
                parsedCoords = JSON.parse(`[${item.coordinates}]`);
                // 转换为三层数组格式 [[[lat, lng], ...]]
                const points = parsedCoords.map((p) => [p.lat, p.lng]);
                parsedCoords = [points];
              } else {
                throw e;
              }
            }

            const coreCoords = parsedCoords[0] || [];

            if (item.shape === "circle") {
              // 【核心修正】圆形直接解析为[[[lat, lng]]]三层嵌套数组
              if (coreCoords.length > 0 && Array.isArray(coreCoords[0])) {
                const [lat, lng] = coreCoords[0]; // 后端存储：[[[lat,lng]]]，最内层取lat/lng
                coordinates = [[[lat, lng]]]; // 直接赋值为三层数组，和多边形统一
              } else if (
                coreCoords.length > 0 &&
                typeof coreCoords[0] === "number"
              ) {
                // 如果是数字数组 [lat, lng]
                coordinates = [[coreCoords]];
              }
              // 半径计算逻辑不变
              if (item.area && item.area > 0) {
                const areaSquareM = item.area * 1000000;
                radius = Math.sqrt(areaSquareM / Math.PI);
              } else {
                radius = 100;
              }
            } else {
              // 多边形：保持原有三层数组逻辑，确保格式为[[[lat1,lng1], [lat2,lng2], ...]]
              if (coreCoords.length > 0 && Array.isArray(coreCoords[0])) {
                coordinates = [coreCoords]; // 包一层保持三层，和圆形统一
              } else if (
                coreCoords.length >= 3 &&
                typeof coreCoords[0] === "number"
              ) {
                // 如果是数字数组 [lat, lng]，已经是一层的，包两层
                coordinates = [[coreCoords]];
              }
            }
          }
        } catch (e) {
          console.error(`坐标解析失败(${item.name || "未命名区域"})`, e);
          coordinates = [[[]]]; // 解析失败仍保留三层数组，防止格式错乱
          radius = 0;
        }

        return {
          id: item.id,
          name: item.name || "未命名区域",
          address: item.description || "暂无描述",
          area: item.area || 0,
          shape: item.shape || "polygon",
          createTime: item.createTime,
          coordinates: coordinates, // 本地统一存储：[[[lat,lng]]]（圆）/[[[lat1,lng1],...]]（多边形）
          radius: radius, // 圆形保留半径，多边形为0，不影响coordinates格式
          borderColor: item.borderColor || "#e74c3c",
          borderWeight: item.borderWeight || 2,
          fillColor: item.fillColor || "#e74c3c",
          fillOpacity: item.fillOpacity || 0.3,
          limitAddress: item.limitAddress,
          rawData: item,
        };
      });

      routeInfo.value = noFlyList;
      total.value = res.data.total || 0;
      console.log(
        "禁飞区列表加载完成，coordinates已统一为三层数组:",
        noFlyList,
      );
    }
  } catch (error) {
    console.error("获取禁飞区列表失败：", error);
    ElMessage.error("获取区域列表失败，请刷新重试");
  }
};
// 搜索方法
const handleSearchInput = debounce((keyword) => {
  // 直接接收el-input传递的输入值，无需手动解析事件
  currentPage.value = 1; // 搜索时重置为第一页，必选
  routeList(keyword); // 直接传递关键词给列表请求函数
}, 500);
// 分页方法
const handleSizeChange = (val) => {
  pageSize.value = val;
  routeList(searchKeyword.value);
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  routeList(searchKeyword.value);
};

// 查看禁飞区
const viewRoute = (itemInfo) => {
  if (!itemInfo || !itemInfo.id) return;

  // 如果正在编辑其他禁飞区，先取消编辑（不调用接口）
  if (editingZoneId.value && editingZoneId.value !== itemInfo.id) {
    cancelEdit();
  }

  // 如果当前已经查看此禁飞区，则收起
  if (activeRouteId.value === itemInfo.id) {
    retractRoute();
    return;
  }

  console.log("查看禁飞区数据:", itemInfo);

  // 构建完整的禁飞区数据【直接复用routeList中已解析的正确坐标/半径，移除冗余二次解析】
  const zoneData = {
    id: itemInfo.id,
    name: itemInfo.name,
    shape: itemInfo.shape || "polygon",
    coordinates: itemInfo.coordinates || [], // 直接用已解析的{lng,lat}格式
    radius: itemInfo.radius || 0, // 直接用已解析的半径，无需重新计算
    area: itemInfo.area || 0,
    borderColor: itemInfo.borderColor || "#e74c3c",
    borderWeight: itemInfo.borderWeight || 2,
    fillColor: itemInfo.fillColor || "#e74c3c",
    fillOpacity: itemInfo.fillOpacity || 0.3,
    description: itemInfo.address || itemInfo.description || "",
    createTime: itemInfo.createTime,
    rawData: itemInfo.rawData || itemInfo,
    // 圆形专属：确保中心坐标存在（容错）
    center: itemInfo.coordinates[0] || { lng: 0, lat: 0 },
  };

  // 仅对无半径的圆形做兜底（避免新创建的圆形radius缺失）
  if (zoneData.shape === "circle" && zoneData.radius === 0) {
    zoneData.radius =
      zoneData.area > 0 ? Math.sqrt((zoneData.area * 1000000) / Math.PI) : 100;
  }

  emit("route-view", zoneData);
  activeRouteId.value = itemInfo.id;
};
// 收起禁飞区
const retractRoute = () => {
  emit("route-retract");
  activeRouteId.value = null;
  // 如果处于编辑模式，也要退出编辑（但不调用接口）
  if (isEditing.value) {
    cancelEdit();
  }
};

// 编辑禁飞区
const editRoute = async (itemInfo) => {
  if (!itemInfo || !itemInfo.id) return;

  // 如果正在编辑其他禁飞区，先完成编辑
  if (editingZoneId.value && editingZoneId.value !== itemInfo.id) {
    await completeEdit();
  }

  // 如果是完成编辑（点击的是当前正在编辑的项）
  if (editingZoneId.value === itemInfo.id) {
    await completeEdit();
    return;
  }

  console.log("开始编辑禁飞区:", itemInfo);

  // 构建完整的禁飞区数据【直接复用routeList中已解析的正确坐标/半径】
  const zoneData = {
    id: itemInfo.id,
    name: itemInfo.name,
    shape: itemInfo.shape || "polygon",
    coordinates: itemInfo.coordinates || [], // 直接用已解析的{lng,lat}格式
    radius: itemInfo.radius || 0, // 直接用已解析的半径
    area: itemInfo.area || 0,
    borderColor: itemInfo.borderColor || "#e74c3c",
    borderWeight: itemInfo.borderWeight || 2,
    fillColor: itemInfo.fillColor || "#e74c3c",
    fillOpacity: itemInfo.fillOpacity || 0.3,
    description: itemInfo.address || itemInfo.description || "",
    createTime: itemInfo.createTime,
    rawData: itemInfo.rawData || itemInfo,
    center: itemInfo.coordinates[0] || { lng: 0, lat: 0 }, // 圆形中心坐标兜底
  };

  // 仅对无半径的圆形做兜底
  if (zoneData.shape === "circle" && zoneData.radius === 0) {
    zoneData.radius =
      zoneData.area > 0 ? Math.sqrt((zoneData.area * 1000000) / Math.PI) : 100;
  }

  // 设置编辑状态
  editingZoneId.value = itemInfo.id;
  isEditing.value = true;

  // 触发编辑事件，传递完整的禁飞区数据
  emit("route-edit", zoneData);
};

// 取消编辑
const cancelEdit = () => {
  if (!editingZoneId.value) return;

  console.log("取消编辑禁飞区:", editingZoneId.value);

  const currentEditingId = editingZoneId.value;

  // 清除编辑状态
  editingZoneId.value = null;
  isEditing.value = false;

  // 注意：不主动清除 activeRouteId，让查看状态独立存在
  // 如果用户取消编辑，仍然可以保持查看状态

  // 通知父组件取消编辑
  emit("route-edit-complete", currentEditingId);

  // 显示提示消息
  ElMessage.info("已取消编辑");
  activeRouteId.value = null;
};

//完成编辑
const completeEdit = async () => {
  if (!editingZoneId.value) return;

  console.log("完成编辑禁飞区:", editingZoneId.value);
  const currentZone = routeInfo.value.find(
    (item) => item.id === editingZoneId.value,
  );
  if (!currentZone) {
    ElMessage.error("未找到当前编辑的禁飞区");
    return;
  }

  try {
    // 【核心统一】圆形/多边形均直接使用本地[[[lat,lng]]]三层数组，转JSON字符串
    // 彻底删除圆形"经度,纬度,半径"的拼接逻辑
    const submitData = {
      id: currentZone.id,
      name: currentZone.name,
      shape: currentZone.shape || "polygon",
      coordinates: JSON.stringify(currentZone.coordinates), // 统一转JSON，格式完全一致
      area: currentZone.area || 0,
      borderColor: currentZone.borderColor || "#e74c3c",
      borderWeight: currentZone.borderWeight || 2,
      fillColor: currentZone.fillColor || "#e74c3c",
      fillOpacity: currentZone.fillOpacity || 0.3,
      description: currentZone.address || "",
      updateTime:
        currentZone.rawData?.updateTime ||
        new Date().toISOString().replace("T", " ").slice(0, 19),
      limitAddress: currentZone.rawData?.limitAddress || "",
      companyId: currentZone.rawData?.companyId || 0,
    };

    console.log("提交后端统一格式coordinates:", submitData.coordinates); // 验证：圆形/多边形都是"[[[lat,lng],...]]"
    const res = await noflyzoneUpdate(submitData);

    if (res.code === 200) {
      // ElMessage.success("禁飞区编辑成功");
      emit("route-edit-complete", currentZone.id); // 通知主组件清除编辑状态
    } else {
      ElMessage.error("禁飞区编辑失败：" + (res.msg || "未知错误"));
    }
  } catch (error) {
    console.error("编辑提交失败:", error);
    ElMessage.error("禁飞区编辑失败，请重试");
  } finally {
    // 清除编辑状态+刷新列表
    editingZoneId.value = null;
    isEditing.value = false;
    await routeList(searchKeyword.value);
  }
};
let updatesDate = ref("");
// 更新区域数据（在编辑时被父组件调用）
// 更新区域数据（在编辑/新建时被父组件调用）
// RouteList.vue 中的 updateZoneData 函数（修改圆形兜底部分，完整替换）
const updateZoneData = (id, updates) => {
  console.log("更新区域数据:", id, updates);
  const index = routeInfo.value.findIndex((item) => item.id === id);
  if (index !== -1) {
    const updatedItem = { ...routeInfo.value[index] };
    // 全量更新传入字段
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        updatedItem[key] = updates[key];
      }
    });

    // 圆形专属：强制保证coordinates为[[[lat,lng]]]三层嵌套数组（兜底防错）
    if (updatedItem.shape === "circle") {
      // 确保半径有效
      if (
        !updatedItem.radius ||
        isNaN(updatedItem.radius) ||
        updatedItem.radius < 1
      ) {
        updatedItem.radius =
          updatedItem.area > 0
            ? Math.sqrt((updatedItem.area * 1000000) / Math.PI)
            : 100;
      }
      // 【格式兜底】如果coordinates不是三层数组，重新构造
      if (
        !Array.isArray(updatedItem.coordinates) ||
        updatedItem.coordinates.length === 0 ||
        !Array.isArray(updatedItem.coordinates[0]) ||
        !Array.isArray(updatedItem.coordinates[0][0])
      ) {
        // 从现有数据取中心坐标，构造标准三层数组
        const defaultLat = updatedItem.rawData?.lat || 34.78723;
        const defaultLng = updatedItem.rawData?.lng || 113.65644;
        updatedItem.coordinates = [[[defaultLat, defaultLng]]];
      }
    }

    routeInfo.value[index] = updatedItem;
    console.log(
      "本地列表更新完成，圆形coordinates强制为三层数组:",
      updatedItem.coordinates,
    );
  }
};

// 删除禁飞区
const deleteRoute = (noFlyZone) => {
  if (!noFlyZone || !noFlyZone.id) return;

  // 如果正在编辑或查看该禁飞区，先退出
  if (editingZoneId.value === noFlyZone.id) {
    completeEdit();
  }
  if (activeRouteId.value === noFlyZone.id) {
    retractRoute();
  }

  deletingRouteIndex.value = noFlyZone;
  deleteDialogVisible.value = true;
};

// 确认删除
const confirmDelete = async () => {
  const noFlyZone = deletingRouteIndex.value;
  if (!noFlyZone || !noFlyZone.id) {
    ElMessage.error("未找到待删除的区域");
    deleteDialogVisible.value = false;
    return;
  }

  try {
    const res = await noflyzoneDelete(noFlyZone.id);
    if (res.code === 200) {
      deleteDialogVisible.value = false;

      // 清除状态
      if (activeRouteId.value === noFlyZone.id) {
        activeRouteId.value = null;
      }
      if (editingZoneId.value === noFlyZone.id) {
        editingZoneId.value = null;
      }

      ElMessage.success("删除成功");
      emit("route-delete", noFlyZone);
      await routeList(searchKeyword.value);
    } else {
      ElMessage.error(`删除失败：${res.message || "未知错误"}`);
    }
  } catch (error) {
    console.error("删除禁飞区失败：", error);
    ElMessage.error("删除区域失败，请重试");
  }
};

// 监听器
watch(deleteDialogVisible, (newVal) => {
  if (!newVal) deletingRouteIndex.value = null;
});

// 初始化
onMounted(() => {
  routeList();
});

// 暴露方法给父组件
defineExpose({
  routeList,
  retractRoute,
  completeEdit,
  cancelEdit,
  updateZoneData,
});
</script>

<style scoped>
.route-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #fff;
  box-sizing: border-box;
  padding: 8px;
}

.route-search {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* justify-content: space-between; */
}

.route-list-content {
  flex: 1;
  overflow-y: auto;
  /* max-height: calc(100vh - 460px); */
  padding-right: 6px;
}

/* 自定义滚动条 */
.route-list-content::-webkit-scrollbar {
  width: 6px;
}
.route-list-content::-webkit-scrollbar-track {
  background: rgba(80, 80, 80, 0.1);
  border-radius: 3px;
}
.route-list-content::-webkit-scrollbar-thumb {
  background: rgba(88, 130, 179, 0.5);
  border-radius: 3px;
}
.route-list-content::-webkit-scrollbar-thumb:hover {
  background: rgba(88, 130, 179, 0.8);
}

.pagination-container {
  margin-top: 10px;
}

/* 禁飞区卡片样式 */
.routeOperation {
  background-color: #2e3649db;
  color: #fff;
  margin-bottom: 12px;
  padding: 16px 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.routeOperation-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-container {
  position: relative;
  display: block;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.truncated-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
}

/* 信息区域样式 */
.zone-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.info-row-between {
  justify-content: space-between;
}

.info-row-between .info-item {
  flex: 0 1 auto;
}

.info-row-single {
  display: flex;
  align-items: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.info-label {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.8;
}

.info-value {
  color: #cbd5e1;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.tag-danger {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.tag-warning {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.routeOperation-box-view {
  color: #7db164;
  cursor: pointer;
  transition: all 0.3s ease;
}
.routeOperation-box-view:hover {
  color: #93d078;
}

.routeOperation-box-foldUp {
  color: rgba(255, 255, 255, 0.34);
  cursor: pointer;
  transition: all 0.3s ease;
}
.routeOperation-box-foldUp:hover {
  color: rgba(255, 255, 255, 0.6);
}

.routeOperation-box-edit {
  color: #1677ff;
  cursor: pointer;
  transition: all 0.3s ease;
}
.routeOperation-box-edit:hover {
  color: #409eff;
}

.routeOperation-box-edit-active {
  color: #ff9800;
  cursor: pointer;
  font-weight: 600;
  animation: pulse 2s infinite;
}

.routeOperation-box-delete {
  color: #f56c6c;
  cursor: pointer;
  transition: all 0.3s ease;
}
.routeOperation-box-delete:hover {
  color: #ff7875;
}

.routeOperation-box-cancel {
  color: #909399;
  cursor: pointer;
  transition: all 0.3s ease;
}
.routeOperation-box-cancel:hover {
  color: #a6a9ad;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

/* Element Plus 样式穿透 */
:deep(.el-pagination) {
  justify-content: left !important;
  overflow-x: scroll;
  margin-top: 10px;
  background: #2e3649db;
  padding: 12px 8px 8px !important;
  border-radius: 12px 12px 0 0;
}
:deep(.el-pagination__classifier) {
  color: #fff;
}
:deep(.el-select__wrapper) {
  margin: 6px 0 0 0;
}
:deep(.el-pagination .el-select__wrapper),
:deep(.el-pagination .btn-prev),
:deep(.el-pager li),
:deep(.el-pagination button),
:deep(.el-input__wrapper) {
  background: none;
}
:deep(.el-pager li.is-active, .el-pager li:hover) {
  color: #409eff;
}
:deep(.el-pagination > .is-first),
:deep(.el-pagination > .is-last),
:deep(.el-pagination .el-select__placeholder),
:deep(.el-pagination > .el-icon svg),
:deep(.el-pager li),
:deep(.el-pagination .el-input__inner),
:deep(.el-pagination button) {
  color: #fff;
}

:deep(.route-search .el-input__wrapper) {
  background-color: #2e3649db;
}
:deep(.route-search .el-input__inner) {
  color: #fff;
}

/* 响应式适配 */
@media screen and (max-width: 800px) {
  .tooltip-container {
    width: 65%;
  }
  .zone-info {
    gap: 6px;
    padding: 8px;
  }
  .info-row {
    gap: 0;
  }
  .info-item {
    font-size: 12px;
  }
  .info-label {
    font-size: 12px;
  }
  .info-value {
    font-size: 11px;
  }
  .info-tag {
    font-size: 11px;
    padding: 1px 6px;
  }
  .action-buttons {
    flex-wrap: wrap;
  }
  .routeOperation-box-view,
  .routeOperation-box-foldUp,
  .routeOperation-box-edit,
  .routeOperation-box-edit-active,
  .routeOperation-box-delete {
    font-size: 0;
    width: 20px;
    text-align: center;
    margin-right: 8px;
  }
  .routeOperation-box-view::after {
    content: "查";
    font-size: 16px;
  }
  .routeOperation-box-foldUp::after {
    content: "收";
    font-size: 16px;
  }
  .routeOperation-box-edit::after {
    content: "编";
    font-size: 16px;
  }
  .routeOperation-box-edit-active::after {
    content: "完";
    font-size: 16px;
    color: #ff9800;
  }
  .routeOperation-box-delete::after {
    content: "删";
    font-size: 16px;
  }
  .routeOperation-box-cancel::after {
    content: "消";
    font-size: 16px;
  }
}
</style>
