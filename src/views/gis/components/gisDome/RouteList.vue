<template>
  <!-- 模板部分和你原来的完全一致，无需修改 -->
  <div class="route-list-container">
    <!-- 搜索区域 -->
    <div class="route-search">
      <el-input
        v-model="searchKeyword"
        @input="handleSearchInput"
        clearable
        placeholder="请输入要搜索的航线"
      />
    </div>

    <!-- 航线列表 -->
    <div class="route-list-content">
      <div v-for="(item, index) in routeInfo" :key="index">
        <div
          class="routeOperation"
          v-for="(itemInfo, indexInfo) in item"
          :key="indexInfo"
        >
          <div class="routeOperation-box">
            <div class="tooltip-container">
              <span class="truncated-text">{{ itemInfo.name }}</span>
            </div>
            <div class="route-detail-info">
              <div class="detail-item">
                <span class="detail-label">地址：</span>
                <span class="detail-value">{{
                  itemInfo.routeArea || "-"
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">创建时间：</span>
                <span class="detail-value">{{
                  itemInfo.createTime || "-"
                }}</span>
              </div>
            </div>
            <div
              style="
                display: flex;
                justify-content: space-between;
                margin-top: 6px;
              "
            >
              <div style="color: #f4f2f257">
                {{ itemInfo.totalDistance }} 米
              </div>
              <div>
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
                  {{ itemInfo.id === activeRouteId ? "收起" : "查看" }}</span
                >
                <span
                  v-if="
                    itemInfo.id === activeRouteId &&
                    isEditMode &&
                    itemInfo.id === editingRouteId
                  "
                  class="routeOperation-box-complete"
                  @click="completeRouteEdit(itemInfo)"
                  >完成</span
                >
                <span
                  v-if="
                    itemInfo.id === activeRouteId &&
                    isEditMode &&
                    itemInfo.id === editingRouteId
                  "
                  class="routeOperation-box-cancel"
                  @click="cancelRouteEdit(itemInfo)"
                  >取消</span
                >
                <span
                  class="routeOperation-box-edit"
                  @click="routeEdit(itemInfo)"
                  >编辑</span
                >
                <span
                  class="routeOperation-box-delete"
                  @click="deleteRoute(itemInfo)"
                  >删除</span
                >
              </div>
            </div>
          </div>
          <!-- 航点列表 - 新增拖拽功能 -->
          <div class="routeInformation" v-if="itemInfo.id === activeRouteId">
            <div
              class="routeInformation-list"
              v-for="(itemPrototype, indexPrototype) in getCurrentPoints(
                itemInfo,
              )"
              :key="indexPrototype"
              draggable="true"
              @dragstart="handleDragStart(indexPrototype, itemInfo)"
              @dragover="handleDragOver"
              @drop="handleDrop(indexPrototype, itemInfo)"
              @dragend="handleDragEnd"
              :class="{ dragging: isDragging }"
            >
              航点 {{ indexPrototype + 1 }}
              {{
                indexPrototype === 0
                  ? "(起点)"
                  : indexPrototype === getCurrentPoints(itemInfo).length - 1
                    ? "(终点)"
                    : ""
              }}
              <div
                v-show="
                  indexPrototype !== getCurrentPoints(itemInfo).length - 1
                "
                class="routeInformation-list-edit"
                @click="editAirline(itemPrototype, indexPrototype + 1)"
              >
                编辑
              </div>
            </div>
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

    <!-- 编辑航点对话框 -->
    <el-dialog
      v-model="waypointSettingVisible"
      title="航点设置"
      width="25%"
      type="warning"
      style="max-height: 70%; overflow-y: hidden"
    >
      <el-form
        :model="formData"
        label-width="100px"
        style="
          max-height: calc(70vh - 120px);
          display: flex;
          flex-direction: column;
        "
      >
        <div style="flex: 1; overflow-y: auto; margin: 10px 0">
          <el-form-item label="航点序号:">
            <el-input
              disabled
              v-model="formData.waypointNumber"
              placeholder="请输入航点序号"
            />
          </el-form-item>
          <el-form-item label="经度(度):">
            <el-input v-model="formData.lat" />
          </el-form-item>
          <el-form-item label="纬度(度):">
            <el-input v-model="formData.lon" />
          </el-form-item>
          <el-form-item label="停留时间" prop="residenceTime">
            <el-input
              v-model="formData.residence_time"
              placeholder="请输入停留时间"
              type="number"
              :formatter="formatNumber"
              :parser="parseNumber"
            >
              <template #suffix>s</template>
            </el-input>
          </el-form-item>
          <el-form-item label="动作:" prop="action">
            <el-select
              v-model="formData.action"
              placeholder="请选择航向角类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in headingActionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="速度:" prop="velocity">
            <el-input
              v-model="formData.velocity"
              placeholder="请输入速度"
              type="number"
              :formatter="formatNumber"
              :parser="parseNumber"
            >
              <template #suffix>m/s</template>
            </el-input>
          </el-form-item>
          <el-form-item label="航向角:" prop="headingAngle">
            <el-select
              v-model="formData.heading_angle.mode"
              placeholder="请选择航向角类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in headingAngleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-input
              v-show="
                formData.heading_angle.mode ===
                'at an angle to the target point'
              "
              v-model="formData.heading_angle.angle"
              style="width: 50%; margin-top: 10px"
              placeholder="请输入与目标点的角度"
              type="number"
              min="0"
              max="360"
            >
              <template #suffix>°</template>
            </el-input>
            <div
              v-show="formData.heading_angle.mode === 'towards a certain point'"
              class="coordinate-inputs"
            >
              <el-input
                v-model="formData.heading_angle.lon"
                style="width: 50%; margin-top: 10px"
                placeholder="请输入经度"
                type="number"
                step="0.000001"
                min="0"
              >
                <template #suffix>°</template>
              </el-input>
              <el-input
                v-model="formData.heading_angle.lat"
                style="width: 50%; margin-top: 10px"
                placeholder="请输入纬度"
                type="number"
                step="0.000001"
                min="0"
              >
                <template #suffix>°</template>
              </el-input>
            </div>
          </el-form-item>
          <el-form-item label="高度策略:" prop="heightStrategy">
            <el-select
              v-model="formData.height_strategy"
              placeholder="请选择高度策略类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in heightStrategyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级:" prop="priority">
            <el-select
              v-model="formData.priority"
              placeholder="请选择优先级类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in priorityOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="分类:" prop="sort">
            <el-select
              v-model="formData.sort"
              placeholder="请选择分类类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in categoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="航线失联行为:" prop="routeLossBehavior">
            <el-select
              v-model="formData.route_loss_behavior"
              placeholder="请选择航线失联行为"
              style="width: 100%"
            >
              <el-option
                v-for="item in lossBehaviorOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="waypointSettingVisible = false">取消</el-button>
          <el-button type="primary" @click="editWaypoint">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
      type="warning"
    >
      <p>确定要删除这条航线吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmDelete">删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 保存路线弹窗 -->
    <el-dialog
      v-model="saveRouteDialogVisible"
      :title="dialogTitle"
      width="30%"
      type="warning"
      style="max-height: 70%; overflow: hidden"
    >
      <el-form
        ref="saveRouteFormRef"
        :model="saveRouteForm"
        :rules="saveRouteRules"
        label-width="90px"
        style="
          max-height: calc(70vh - 120px);
          display: flex;
          flex-direction: column;
        "
      >
        <el-form-item label="路线名称:" prop="name">
          <el-input v-model="saveRouteForm.name" placeholder="请输入路线名称" />
        </el-form-item>
        <el-form-item label="路线描述:" prop="description">
          <el-input
            v-model="saveRouteForm.description"
            :rows="2"
            type="textarea"
            maxlength="20"
            show-word-limit
            placeholder="请输入路线描述"
          />
        </el-form-item>
        <el-form-item label="航点策略:" prop="waypointStrategy">
          <el-select
            v-model="saveRouteForm.waypointStrategy"
            placeholder="请选择航点策略"
            :disabled="dialogTitle === '编辑路线'"
            @change="handleSelectStrategyChange"
          >
            <el-option
              v-for="item in waypointOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <div
          class="waypoints-scroll-container"
          style="flex: 1; overflow-y: auto; margin: 10px 0"
        >
          <div
            class="save-route"
            v-for="(item, index) in saveRouteForm.points"
            :key="index"
            style="display: flex; align-items: center; margin-bottom: 10px"
          >
            <el-form-item
              label="高度:"
              :prop="`points[${index}].alt`"
              :rules="[
                { required: true, message: '请输入高度', trigger: 'blur' },
              ]"
            >
              <el-input v-model="item.alt" placeholder="高度" />
            </el-form-item>
            <el-form-item
              label="经度:"
              :prop="`points[${index}].lng`"
              :rules="[
                { required: true, message: '请输入经度', trigger: 'blur' },
              ]"
            >
              <el-input v-model="item.lng" placeholder="经度" />
            </el-form-item>
            <el-form-item
              label="纬度:"
              :prop="`points[${index}].lat`"
              :rules="[
                { required: true, message: '请输入纬度', trigger: 'blur' },
              ]"
            >
              <el-input v-model="item.lat" placeholder="纬度" />
            </el-form-item>
            <div
              style="
                display: flex;
                gap: 10px;
                margin-left: 10px;
                margin-bottom: 16px;
              "
            >
              <span
                class="operation-btn add-btn"
                @click="handleAddRow(index, item)"
                title="添加行"
                >+</span
              >
              <span
                class="operation-btn delete-btn"
                @click="handleDeleteRow(index, item)"
                title="删除行"
                :disabled="saveRouteForm.points.length <= 1"
                >-</span
              >
            </div>
          </div>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="saveRouteDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSaveRoute">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { debounce } from "lodash";
import {
  calculateTotalDistance,
  convertItem,
  convertPoints,
} from "@/utils/routeHelper.js";
import {
  getRouteList,
  deleteManageRoute,
  updateMission,
  addRoute,
  updatePoint,
} from "@/api/route.js";
import { dronePolicyList } from "@/api/dronePolicy.js";

// Props
const props = defineProps({
  map: {
    type: Object,
    required: true,
  },
  noFlyZoneManagerRef: {
    type: Object,
    default: null,
  },
});

// Emits
const emit = defineEmits([
  "route-view",
  "route-retract",
  "route-edit",
  "route-delete",
  "waypoint-edit",
  "route-save",
  "route-cancel-edit",
  "waypoint-updated",
]);

// 基础状态变量
const searchKeyword = ref("");
const routeInfo = ref([]);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const activeRouteId = ref(null);
const waypointSettingVisible = ref(false);
const deleteDialogVisible = ref(false);
const saveRouteDialogVisible = ref(false);
const dialogTitle = ref("");
const listRouteEditId = ref("");
const policyIdDialog = ref("");
const saveRouteFormRef = ref(null);
const waypointOptions = ref([]);
const selectedItemStrategy = ref({});
const deletingRouteIndex = ref(-1);
const newArr = ref([]);
const isEditMode = ref(false);
const editingRouteId = ref(null);
const formData = ref({
  heading_angle: {
    mode: "",
    angle: "",
    lon: "",
    lat: "",
  },
});
const saveRouteForm = ref({
  name: "",
  description: "",
  points: [],
  waypointStrategy: "",
});

// 拖拽相关状态（核心新增）
const isDragging = ref(false); // 是否正在拖拽
const dragSourceIndex = ref(-1); // 拖拽源索引
const dragTempPoints = ref({}); // 各航线的拖拽临时航点 { routeId: points }
const originalPoints = ref({}); // 各航线的原始航点备份 { routeId: points }
const isEditCompleted = ref(false); // 是否点击完成保存拖拽

// 选项数据
const headingActionOptions = ref([
  { label: "悬停", value: "hover" },
  { label: "偏航", value: "yaw" },
  { label: "翻转", value: "turn over" },
  { label: "俯仰", value: "pitch" },
]);

const headingAngleOptions = ref([
  { label: "朝着目标不变", value: "towards the goal" },
  { label: "与目标点成一定角度", value: "at an angle to the target point" },
  { label: "朝某一点不变", value: "towards a certain point" },
]);

const heightStrategyOptions = ref([
  { label: "先升高再向目标点", value: "Rise first" },
  { label: "先向目标点再升高", value: "First to the target point" },
  { label: "匀速升高", value: "Rise at a uniform rate" },
]);

const priorityOptions = ref([
  { label: "最高", value: "highest" },
  { label: "高", value: "high" },
  { label: "中", value: "middle" },
  { label: "低", value: "low" },
  { label: "最低", value: "lowest" },
]);

const categoryOptions = ref([
  { label: "常规任务", value: "Regular tasks" },
  { label: "紧急任务", value: "urgent" },
  { label: "巡检任务", value: "Inspection" },
  { label: "侦察任务", value: "reconnoiter" },
  { label: "其他任务", value: "other" },
]);

const lossBehaviorOptions = ref([
  { label: "继续执行航线", value: "continue" },
  { label: "返航", value: "return" },
  { label: "降落", value: "landing" },
  { label: "悬停", value: "hover" },
]);

// 表单验证规则
const saveRouteRules = {
  name: [
    { required: true, message: "请输入路线名称", trigger: "blur" },
    { min: 1, max: 15, message: "长度在 1 到 15 个字符", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入路线描述", trigger: "blur" },
    { min: 1, max: 30, message: "长度在 1 到 30 个字符", trigger: "blur" },
  ],
  points: [
    {
      type: "array",
      required: true,
      message: "至少需要2个航点",
      trigger: "blur",
      min: 2,
    },
  ],
};

// 航线列表
const routeList = async (value = "") => {
  try {
    const res = await getRouteList({
      keyword: value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    if (res.code === 200) {
      let newRouteInfo = ref([res.data.list.map(convertItem)]);
      total.value = res.data.total;
      newRouteInfo.value[0].forEach((item) => {
        const result = calculateTotalDistance(item.points);
        item.totalDistance = result.total;
      });
      routeInfo.value[0] = newRouteInfo.value[0];

      if (activeRouteId.value) {
        const activeRoute = newRouteInfo.value[0].find(
          (item) => item.id === activeRouteId.value,
        );
        if (activeRoute) {
          setTimeout(() => viewRoute(activeRoute), 300);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};

// 搜索处理
const handleSearchInput = debounce((param) => {
  let inputValue;
  if (param instanceof InputEvent) {
    inputValue = param.target.value.trim();
  } else {
    inputValue = String(param).trim();
  }
  routeList(inputValue);
}, 500);

const handleSizeChange = (val) => {
  pageSize.value = val;
  routeList(searchKeyword.value);
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  routeList(searchKeyword.value);
};

// 获取当前显示的航点（核心：区分临时/正式数据）
const getCurrentPoints = (route) => {
  if (!route || !activeRouteId.value) return [];

  // 已完成编辑：显示正式数据；未完成：显示临时数据
  if (isEditCompleted.value) {
    return route.points || [];
  } else {
    return dragTempPoints.value[route.id] || route.points || [];
  }
};

// 查看航线（核心：初始化拖拽临时数据）
const viewRoute = (route) => {
  emit("route-view", route);
  activeRouteId.value = route.id;
  isEditMode.value = true;
  editingRouteId.value = route.id;

  // 保存原始航点（用于回滚）
  originalPoints.value[route.id] = JSON.parse(
    JSON.stringify(route.points || []),
  );
  // 初始化临时拖拽航点
  dragTempPoints.value[route.id] = JSON.parse(
    JSON.stringify(route.points || []),
  );
  // 重置完成状态（未点完成，不保存拖拽）
  isEditCompleted.value = false;

  console.log("初始化航线数据:", {
    original: originalPoints.value[route.id],
    temp: dragTempPoints.value[route.id],
  });
};

// 收起航线（核心：回滚未保存的拖拽数据）
const retractRoute = () => {
  emit("route-retract");

  // 未完成编辑：回滚到原始航点
  if (activeRouteId.value && !isEditCompleted.value) {
    const currentRoute = routeInfo.value[0]?.find(
      (r) => r.id === activeRouteId.value,
    );
    if (currentRoute && originalPoints.value[activeRouteId.value]) {
      // 回滚为原始数据
      currentRoute.points = JSON.parse(
        JSON.stringify(originalPoints.value[activeRouteId.value]),
      );
      ElMessage.info("未保存的拖拽已重置");
    }
  }

  // 重置所有状态
  activeRouteId.value = null;
  isEditMode.value = false;
  editingRouteId.value = null;
  isDragging.value = false;
  dragSourceIndex.value = -1;
  dragTempPoints.value = {};
  originalPoints.value = {};
  isEditCompleted.value = false;
};

// 拖拽开始
const handleDragStart = (index, route) => {
  isDragging.value = true;
  dragSourceIndex.value = index;
  // 初始化临时数据（如果未初始化）
  if (!dragTempPoints.value[route.id]) {
    dragTempPoints.value[route.id] = JSON.parse(
      JSON.stringify(route.points || []),
    );
  }
  // 标记为未完成（未点完成，不保存）
  isEditCompleted.value = false;
};

// 拖拽经过
const handleDragOver = (e) => {
  e.preventDefault(); // 必须阻止默认行为才能触发drop
};

// 拖拽放下（交换航点位置）
const handleDrop = (targetIndex, route) => {
  if (!isDragging.value || dragSourceIndex.value === -1) return;

  const points = dragTempPoints.value[route.id];
  if (!points) return;

  // 创建新数组，交换元素
  const newPoints = [...points];
  const [dragged] = newPoints.splice(dragSourceIndex.value, 1);
  newPoints.splice(targetIndex, 0, dragged);

  // 整体赋值，触发响应式更新
  dragTempPoints.value[route.id] = newPoints;

  // 调试：打印拖拽后的顺序
  console.log(
    "拖拽后新顺序:",
    newPoints.map((p) => p.lat + "," + p.lng),
  );

  // 通知父组件（可选）
  emit("waypoint-updated", {
    route,
    pointIndex: targetIndex,
    newPoint: dragged,
  });
};

// 拖拽结束
const handleDragEnd = () => {
  isDragging.value = false;
  dragSourceIndex.value = -1;
};

// 编辑航线
const routeEdit = async (route) => {
  await getAllPolicies();
  saveRouteForm.value = {
    name: route.name,
    description: route.description,
    points: JSON.parse(JSON.stringify(route.points || [])),
    waypointStrategy: route.policyId,
  };
  dialogTitle.value = "编辑路线";
  saveRouteDialogVisible.value = true;
  listRouteEditId.value = route.id;
  policyIdDialog.value = route.policyId;
  emit("route-edit", route);
};

// 删除航线
const deleteRoute = (route) => {
  deletingRouteIndex.value = route;
  deleteDialogVisible.value = true;
};

// 确认删除
const confirmDelete = async () => {
  const route = deletingRouteIndex.value;
  let res = await deleteManageRoute(route.id);
  if (res.code === 200) {
    deleteDialogVisible.value = false;
    activeRouteId.value = null;
    isEditMode.value = false;
    editingRouteId.value = null;
    isEditCompleted.value = false;
    delete dragTempPoints.value[route.id];
    delete originalPoints.value[route.id];
    ElMessage.success("删除成功");
    emit("route-delete", route);
    await routeList(searchKeyword.value);
  }
};

// 修正后的 completeRouteEdit 函数
const completeRouteEdit = async (route) => {
  try {
    const currentRoute = routeInfo.value[0].find(
      (item) => item.id === route.id,
    );
    if (!currentRoute) {
      ElMessage.error("航线数据未找到");
      return;
    }

    console.log("=== 开始保存航点 ===");
    console.log("航线ID:", route.id);

    // 打印拖拽临时数据（应为最新顺序）
    console.log(
      "dragTempPoints 存在?",
      !!dragTempPoints.value[route.id],
    );
    if (dragTempPoints.value[route.id]) {
      console.log(
        "dragTempPoints 长度:",
        dragTempPoints.value[route.id].length,
      );
      console.log(
        "dragTempPoints 内容:",
        dragTempPoints.value[route.id].map((p) => ({ lat: p.lat, lng: p.lng })),
      );
    }
    // 打印原始航线数据（应为旧顺序）
    console.log(
      "currentRoute.points 长度:",
      currentRoute.points.length,
    );
    console.log(
      "currentRoute.points 内容:",
      currentRoute.points.map((p) => ({ lat: p.lat, lng: p.lng })),
    );
    console.log("isEditCompleted:", isEditCompleted.value);

    // 优先使用 dragTempPoints（若存在且有数据）
    let finalPoints = [];
    if (dragTempPoints.value[route.id]?.length > 0) {
      console.log("使用 dragTempPoints 作为最终数据");
      finalPoints = JSON.parse(JSON.stringify(dragTempPoints.value[route.id]));
    } else {
      console.log("dragTempPoints 为空，使用 currentRoute.points");
      finalPoints = JSON.parse(JSON.stringify(currentRoute.points));
    }

    console.log(
      "finalPoints 最终数据:",
      finalPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
    );

    // 【关键修复】先更新 currentRoute.points，确保后续使用的是最新数据
    currentRoute.points = finalPoints;

    // 构建后端所需格式（注意字段名：lat, lon, alt）
    const pointsForBackend = finalPoints.map((point) => ({
      lat: String(point.lat),
      lon: String(point.lng), // 前端字段 lng 转后端 lon
      alt: String(point.alt),
    }));

    console.log(
      "pointsForBackend:",
      pointsForBackend.map((p) => ({ lat: p.lat, lon: p.lon })),
    );

    // 构造 pointsJson 字符串（与接口要求一致）
    const routeData = {
      routeData: {
        type: "mission",
        points: pointsForBackend,
        home_pos:
          pointsForBackend.length > 0
            ? {
                lat: pointsForBackend[0].lat,
                lon: pointsForBackend[0].lon,
                alt: "0",
              }
            : { lat: "", lon: "", alt: "0" },
      },
    };

    const pointsJsonString = JSON.stringify(routeData);

    const params = {
      id: currentRoute.id,
      description: currentRoute.description,
      name: currentRoute.name,
      pointsJson: pointsJsonString,
      policyId: Number(currentRoute.policyId),
    };

    console.log("最终发送参数:", params);

    let res = await updateMission(params); // 只传一个参数

    if (res.code === 200) {
      isEditCompleted.value = true;
      originalPoints.value[route.id] = JSON.parse(JSON.stringify(finalPoints));
      dragTempPoints.value[route.id] = JSON.parse(JSON.stringify(finalPoints));
      await routeList(searchKeyword.value);
      emit("route-saved-and-refresh-map", route.id);
      ElMessage.success("航线编辑成功！");
      emit("route-save");
    } else {
      ElMessage.error(`保存失败：${res.msg || "接口返回非200状态"}`);
    }
  } catch (error) {
    console.error("航线编辑失败：", error);
    ElMessage.error("航线编辑失败，请检查控制台日志");
  }
};
// 取消航线编辑
const cancelRouteEdit = (route) => {
  const currentRoute = routeInfo.value[0].find((item) => item.id === route.id);
  if (currentRoute && originalPoints.value[route.id]) {
    // 恢复原始航点
    currentRoute.points = JSON.parse(
      JSON.stringify(originalPoints.value[route.id]),
    );
    dragTempPoints.value[route.id] = JSON.parse(
      JSON.stringify(originalPoints.value[route.id]),
    );
    emit("route-cancel-edit", JSON.parse(JSON.stringify(currentRoute)));
  }

  ElMessage.info("已取消编辑，恢复原始航点位置");
};

// 编辑航点
const editAirline = (value, index) => {
  formData.value.waypointNumber = index;
  formData.value.lon = value.lng;
  formData.value.lat = value.lat;
  formData.value.alt = value.alt;
  formData.value.residence_time = value.residenceTime;
  formData.value.action = value.action;
  formData.value.velocity = value.velocity;
  formData.value.heading_angle = {
    mode: value.headingAngle?.mode || "",
    angle: value.headingAngle?.angle || "",
    lon: value.headingAngle?.lon || "",
    lat: value.headingAngle?.lat || "",
  };
  formData.value.height_strategy = value.heightStrategy;
  formData.value.priority = value.priority;
  formData.value.sort = value.sort;
  formData.value.route_loss_behavior = value.routeLossBehavior;
  waypointSettingVisible.value = true;
  emit("waypoint-edit", { value, index });
};

// 保存编辑的航点
const editWaypoint = async () => {
  if (!props.noFlyZoneManagerRef) {
    ElMessage.warning("禁飞区数据未加载，无法进行校验");
    return;
  }

  if (!props.noFlyZoneManagerRef.isZonesLoaded()) {
    ElMessage.warning("禁飞区数据正在加载中，请稍候再试");
    return;
  }

  // ========== 1. 强制校验并格式化输入的经纬度 ==========
  const newLng = parseFloat(formData.value.lon); // 编辑后的经度（如113.341220）
  const newLat = parseFloat(formData.value.lat); // 编辑后的纬度（如23.041830）
  const waypointNum = parseInt(formData.value.waypointNumber); // 航点编号（如1）
  const pointIndex = waypointNum - 1; // 转为数组索引（0开始）

  if (isNaN(newLng) || isNaN(newLat) || isNaN(waypointNum)) {
    ElMessage.error("航点数据格式错误，请输入有效的数字");
    return;
  }

  const pointToCheck = { lng: newLng, lat: newLat };
  const isPointInNoFlyZone =
    props.noFlyZoneManagerRef.isPointInNoFlyZone(pointToCheck);
  if (isPointInNoFlyZone) {
    ElMessage.error("该航点位置在禁飞区内，无法保存");
    return;
  }

  const isPointInWarningZone =
    props.noFlyZoneManagerRef?.isRouteCrossingWarningZone([pointToCheck]);
  if (isPointInWarningZone) {
    ElMessage.warning("该航点位置在禁高区（警告区）内，请注意飞行安全");
  }

  try {
    // ========== 2. 先调用接口保存航点编辑 ==========
    const updateData = {
      pointData: JSON.stringify(formData.value),
      pointId: waypointNum,
      missionDataId: activeRouteId.value,
    };
    const res = await updatePoint(updateData);

    if (res.code === 200) {
      ElMessage.success(`航点${waypointNum}编辑成功`);
      waypointSettingVisible.value = false;

      // ========== 3. 强制找到当前航线并更新所有缓存 ==========
      const currentRoute = routeInfo.value[0]?.find(
        (item) => item.id === activeRouteId.value,
      );
      if (!currentRoute) {
        ElMessage.error("未找到当前航线数据");
        return;
      }

      // ========== 核心：手动构建编辑后的完整航点数据 ==========
      const updatedWaypoint = {
        lat: newLat.toString(), // 强制用编辑后的纬度（23.041830）
        lng: newLng.toString(), // 强制用编辑后的经度（113.341220）
        alt: parseInt(formData.value.alt) || 30,
        action: formData.value.action || "hover",
        headingAngle: formData.value.heading_angle || {
          mode: "towards the goal",
          angle: "",
          lon: "",
          lat: "",
        },
        heightStrategy:
          formData.value.height_strategy || "Rise at a uniform rate",
        residenceTime: parseInt(formData.value.residence_time) || 0,
        routeLossBehavior: formData.value.route_loss_behavior || "return",
        velocity: parseInt(formData.value.velocity) || 1,
        priority: formData.value.priority || "high",
        sort: formData.value.sort || "Regular tasks",
      };

      // ========== 4. 暴力更新所有相关缓存（确保100%同步） ==========
      // ① 更新本地航线数据
      currentRoute.points[pointIndex] = { ...updatedWaypoint };
      // ② 更新拖拽临时数据（核心：如果不存在则初始化，存在则直接替换）
      if (!dragTempPoints.value[activeRouteId.value]) {
        dragTempPoints.value[activeRouteId.value] = [...currentRoute.points];
      }
      dragTempPoints.value[activeRouteId.value][pointIndex] = {
        ...updatedWaypoint,
      };

      // ========== 5. 调试日志：确认更新后的数据 ==========
      console.log(
        `【调试】航点${waypointNum}编辑后 - 本地数据：`,
        currentRoute.points[pointIndex],
      );
      console.log(
        `【调试】航点${waypointNum}编辑后 - 拖拽缓存：`,
        dragTempPoints.value[activeRouteId.value][pointIndex],
      );

      // ========== 6. 通知地图更新 + 刷新列表 ==========
      emit("waypoint-updated", {
        route: currentRoute,
        pointIndex: pointIndex,
        newPoint: updatedWaypoint,
      });
      await routeList(searchKeyword.value);
      emit("route-save");
    }
  } catch (error) {
    console.error("航点编辑失败：", error);
    ElMessage.error("航点编辑失败，请重试");
  }
};

// 获取所有策略
const getAllPolicies = async () => {
  try {
    const res = await dronePolicyList();
    if (res.code === 200) {
      waypointOptions.value = res.data.map((item) => ({
        ...item,
        value: Number(item.id),
        label: item.name,
      }));
    }
  } catch (error) {
    console.error("获取所有策略:", error);
    ElMessage.error("获取所有策略失败");
  }
};

// 航点策略变更
const handleSelectStrategyChange = (value) => {
  selectedItemStrategy.value = waypointOptions.value.find(
    (item) => item.value === value,
  );
  policyIdDialog.value = selectedItemStrategy.value?.value || "";
};

// 添加航点行
const handleAddRow = (index, item) => {
  const newPoint = {
    alt: "",
    lng: "",
    lat: "",
  };
  saveRouteForm.value.points.splice(index + 1, 0, newPoint);
  ElMessage.info(`在第${index + 1}行后添加了新行`);
};

// 删除航点行
const handleDeleteRow = (index, item) => {
  if (saveRouteForm.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }
  saveRouteForm.value.points.splice(index, 1);
  ElMessage.info(`已删除第${index + 1}行`);
};

// 确认保存路线
const confirmSaveRoute = async () => {
  saveRouteFormRef.value.validate(async (valid) => {
    if (valid) {
      if (!props.noFlyZoneManagerRef) {
        ElMessage.warning("禁飞区数据未加载，无法进行校验");
        return;
      }

      if (!props.noFlyZoneManagerRef.isZonesLoaded()) {
        ElMessage.warning("禁飞区数据正在加载中，请稍候再试");
        return;
      }

      const routePoints = saveRouteForm.value.points.map((point) => ({
        lng: parseFloat(point.lng),
        lat: parseFloat(point.lat),
      }));

      const isCrossingNoFlyZone =
        props.noFlyZoneManagerRef.isRouteCrossingNoFlyZone(routePoints);
      if (isCrossingNoFlyZone) {
        ElMessage.error("航线穿越禁飞区域，无法保存");
        return;
      }

      const isCrossingWarningZone =
        props.noFlyZoneManagerRef.isRouteCrossingWarningZone(routePoints);
      if (isCrossingWarningZone) {
        ElMessage.warning("注意：当前航线穿越禁高区（警告区），请注意飞行安全");
      }

      if (dialogTitle.value === "保存路线") {
        try {
          const routeData = {
            type: "mission",
            points: [],
          };

          newArr.value = {
            name: saveRouteForm.value.name,
            description: saveRouteForm.value.description,
            points: routeData.points,
          };

          const pointsJson = convertPoints(newArr.value.points);
          let params = {
            name: newArr.value.name,
            description: newArr.value.description,
            pointsJson: pointsJson,
            policyId: policyIdDialog.value,
          };

          let res = await addRoute(params);
          if (res.code === 200) {
            saveRouteDialogVisible.value = false;
            ElMessage.success("路线保存成功");
            await routeList();
            emit("route-save");
          }
        } catch (error) {
          console.error("表单验证失败", error);
        }
      } else if (dialogTitle.value === "编辑路线") {
        newArr.value = {
          name: saveRouteForm.value.name,
          description: saveRouteForm.value.description,
          points: saveRouteForm.value.points,
        };
        const pointsJson = convertPoints(newArr.value.points);
        let params = {
          id: listRouteEditId.value,
          description: saveRouteForm.value.description,
          name: saveRouteForm.value.name,
          pointsJson: pointsJson,
          policyId: policyIdDialog.value,
        };

        let res = await updateMission(params);
        if (res.code === 200) {
          saveRouteDialogVisible.value = false;
          ElMessage.success("编辑成功");
          await routeList();
          emit("route-save");
        }
      }
    }
  });
};

const formatNumber = (value) => {
  return value;
};

const parseNumber = (value) => {
  return value;
};

// 更新 dragTempPoints（供父组件调用）
const updateDragTempPoints = (routeId, points) => {
  if (dragTempPoints.value[routeId] && points) {
    dragTempPoints.value[routeId] = JSON.parse(JSON.stringify(points));
    console.log("更新 dragTempPoints:", routeId, points.map((p) => ({ lat: p.lat, lng: p.lng })));
  }
};

// 监听器
watch(waypointSettingVisible, (newValue) => {
  if (!newValue) {
    formData.value = {
      heading_angle: {
        mode: "",
        angle: "",
        lon: "",
        lat: "",
      },
    };
  }
});

watch(saveRouteDialogVisible, (newValue) => {
  if (!newValue) {
    saveRouteForm.value = {
      name: "",
      description: "",
      points: [],
    };
  }
});

onMounted(() => {
  getAllPolicies();
  routeList();
});

// 暴露方法给父组件
defineExpose({
  routeList,
  retractRoute,
  updateDragTempPoints,
});
</script>

<style scoped>
.route-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.route-search {
  margin-bottom: 12px;
}

.route-list-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

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

.routeOperation {
  background-color: #2e3649db;
  color: #fff;
  margin-bottom: 12px;
  padding: 16px 8px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.routeOperation-box {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  width: 100%;
}

.tooltip-container {
  position: relative;
  display: inline-block;
}

.truncated-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  cursor: pointer;
}

.route-detail-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  color: #f4f2f257;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-label {
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.routeOperation-box-view {
  color: #7db164;
  cursor: pointer;
  margin-right: 6px;
}

.routeOperation-box-foldUp {
  color: rgb(255 255 255 / 34%);
  cursor: pointer;
  margin-right: 6px;
}

.routeOperation-box-edit {
  color: #1677ff;
  cursor: pointer;
  margin-right: 6px;
}

.routeOperation-box-complete {
  color: #67c23a;
  cursor: pointer;
  margin-right: 6px;
}

.routeOperation-box-cancel {
  color: #f56c6c;
  cursor: pointer;
  margin-right: 6px;
}

.routeOperation-box-delete {
  color: red;
  cursor: pointer;
}

.routeInformation {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(88 130 179) rgba(80, 80, 80, 0.4);
  margin-top: 16px;
}

/* 拖拽样式增强 */
.routeInformation-list {
  display: flex;
  justify-content: space-between;
  background-color: #50505066;
  padding: 12px;
  margin-top: 16px;
  cursor: grab;
  transition: all 0.2s ease;
}

.routeInformation-list:first-child {
  margin-top: 0;
}

.routeInformation-list-edit {
  color: #1677ff;
  cursor: pointer;
}

/* 拖拽中样式 */
.routeInformation-list.dragging {
  opacity: 0.7;
  background-color: #404858;
  cursor: grabbing;
}

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

:deep(.save-route .el-form-item__label) {
  width: 60px !important;
}

:deep(.save-route .el-form-item__content) {
  margin-right: 12px !important;
}

.operation-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.add-btn {
  background-color: #409eff;
  color: white;
}

.add-btn:hover {
  background-color: #66b1ff;
}

.delete-btn {
  background-color: #f56c6c;
  color: white;
}

.delete-btn:hover {
  background-color: #f78989;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

:deep(.waypoints-scroll-container) {
  scrollbar-width: thin;
  scrollbar-color: #409eff rgba(0, 0, 0, 0.1);
}

:deep(.waypoints-scroll-container::-webkit-scrollbar) {
  width: 6px;
}

:deep(.waypoints-scroll-container::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

:deep(.waypoints-scroll-container::-webkit-scrollbar-thumb) {
  background: #409eff;
  border-radius: 3px;
}

@media screen and (max-width: 800px) {
  .tooltip-container {
    width: 65%;
  }

  .routeOperation-box-view,
  .routeOperation-box-foldUp,
  .routeOperation-box-edit,
  .routeOperation-box-delete {
    font-size: 0;
    width: 20px;
    text-align: center;
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

  .routeOperation-box-delete::after {
    content: "删";
    font-size: 16px;
  }
}
</style>
