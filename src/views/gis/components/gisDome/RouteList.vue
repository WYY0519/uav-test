<template>
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
                <!-- 查看 / 收起 → 永远显示 -->
                <span
                  :class="
                    itemInfo._expanded
                      ? 'routeOperation-box-foldUp'
                      : 'routeOperation-box-view'
                  "
                  @click="
                    itemInfo._expanded
                      ? retractRoute(itemInfo)
                      : viewRoute(itemInfo)
                  "
                >
                  {{ itemInfo._expanded ? "收起" : "查看" }}
                </span>

                <!-- 编辑 / 取消 -->
                <span
                  :class="
                    itemInfo._editing
                      ? 'routeOperation-box-cancel'
                      : 'routeOperation-box-edit'
                  "
                  @click="
                    itemInfo._editing
                      ? cancelRouteEdit(itemInfo)
                      : routeEdit(itemInfo)
                  "
                >
                  {{ itemInfo._editing ? "取消" : "编辑" }}
                </span>

                <!-- 完成 → 仅编辑时显示 -->
                <span
                  v-if="itemInfo._editing"
                  class="routeOperation-box-complete"
                  @click="completeRouteEdit(itemInfo)"
                >
                  完成
                </span>

                <!-- 删除 → 一直显示 -->
                <span
                  class="routeOperation-box-delete"
                  @click="deleteRoute(itemInfo)"
                >
                  删除
                </span>
              </div>
            </div>
          </div>

          <!-- 航点列表 -->
          <div
            class="routeInformation"
            v-if="itemInfo._editing"
            :key="`route-${itemInfo.id}`"
          >
            <div
              class="routeInformation-list"
              v-for="(itemPrototype, indexPrototype) in getCurrentPoints(
                itemInfo,
              )"
              :key="`point-${indexPrototype}-${JSON.stringify(itemPrototype)}`"
              :draggable="itemInfo._editing"
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
            <el-input
              v-model="formData.lon"
              type="number"
              step="0.00001"
              precision="5"
            />
          </el-form-item>
          <el-form-item label="纬度(度):">
            <el-input
              v-model="formData.lat"
              type="number"
              step="0.00001"
              precision="5"
            />
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
          <el-form-item label="动作:">
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
          <el-form-item label="速度:">
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
          <el-form-item label="航向角:">
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
              style="width: 100%; margin-top: 10px"
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
          <el-form-item label="高度策略:">
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
          <el-form-item label="优先级:">
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
          <el-form-item label="分类:">
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
          <el-form-item label="航线失联行为:">
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
        maxlength="20"
        show-word-limit
      >
        <el-form-item label="路线名称:" prop="name">
          <el-input v-model="saveRouteForm.name" placeholder="请输入路线名称" />
        </el-form-item>
        <el-form-item label="路线描述:" prop="description">
          <el-input
            v-model="saveRouteForm.description"
            :rows="2"
            type="textarea"
            maxlength="200"
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
  "route-saved-and-refresh-map",
]);

// 基础状态变量
const searchKeyword = ref("");
const routeInfo = ref([]);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const activeRouteId = ref(null);
const isRouteExpanded = ref(false);
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
const isEditing = ref(false);
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

// 拖拽相关状态
const isDragging = ref(false);
const dragSourceIndex = ref(-1);
const dragTempPoints = ref({});
const originalPoints = ref({});
const isEditCompleted = ref(false);
const currentEditingPoint = ref(null);
const hasDragged = ref({});

// 选项数据
const headingActionOptions = ref([
  { label: "悬停", value: "hover" },
  { label: "偏航", value: "yaw" },
  { label: "翻转", value: "turn over" },
  { label: "俯仰", value: "pitch" },
]);

const headingAngleOptions = ref([
  { label: "朝着目标不变", value: "towards the goal" },
  { label: "偏航", value: "at an angle to the target point" },
]);

const heightStrategyOptions = ref([
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
    { min: 1, max: 15, trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入路线描述", trigger: "blur" },
    { min: 1, max: 30, trigger: "blur" },
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
      let newRouteInfo = res.data.list.map(convertItem);
      total.value = res.data.total;
      newRouteInfo.forEach((item) => {
        item._expanded = false;
        item._editing = false;
        const result = calculateTotalDistance(item.points);
        item.totalDistance = result.total;
      });
      routeInfo.value = [newRouteInfo];
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

// 获取当前显示的航点
const getCurrentPoints = (route) => {
  if (!route) return [];
  if (isEditCompleted.value) {
    return route.points || [];
  } else {
    return dragTempPoints.value[route.id] || route.points || [];
  }
};

// 查看航线
const viewRoute = (route) => {
  // 👇 核心：点击查看时，关闭所有其他航线的 编辑状态 + 展开状态
  routeInfo.value[0].forEach((item) => {
    if (item.id !== route.id) {
      item._editing = false; // 关闭其他编辑
      item._expanded = false; // 收起其他展开
    }
  });

  // 当前查看的：展开、关闭编辑
  route._expanded = true;
  route._editing = false;

  emit("route-view", route);
  isEditMode.value = false;
  isEditing.value = false;
  isEditCompleted.value = false;
  activeRouteId.value = route.id;
  isRouteExpanded.value = true;

  originalPoints.value[route.id] = JSON.parse(
    JSON.stringify(route.points || []),
  );
  dragTempPoints.value[route.id] = JSON.parse(
    JSON.stringify(route.points || []),
  );
  hasDragged.value[route.id] = false;
};

// 收起航线
const retractRoute = (route) => {
  route._expanded = false;
  route._editing = false;
  emit("route-retract");

  activeRouteId.value = null;
  isRouteExpanded.value = false;
  isEditMode.value = false;
  editingRouteId.value = null;
  isEditing.value = false;
  isDragging.value = false;
  dragSourceIndex.value = -1;
  dragTempPoints.value = {};
  originalPoints.value = {};
  isEditCompleted.value = false;
  hasDragged.value = {};
};

// 拖拽开始
const handleDragStart = (index, route) => {
  if (!route._editing) return;
  isDragging.value = true;
  dragSourceIndex.value = index;
  if (!dragTempPoints.value[route.id]) {
    dragTempPoints.value[route.id] = JSON.parse(
      JSON.stringify(route.points || []),
    );
  }
  isEditCompleted.value = false;
};

// 拖拽经过
const handleDragOver = (e) => {
  e.preventDefault();
};

// 拖拽放下
const handleDrop = (targetIndex, route) => {
  if (
    !route._editing ||
    !isDragging.value ||
    dragSourceIndex.value === targetIndex
  )
    return;

  if (!dragTempPoints.value[route.id]) {
    dragTempPoints.value[route.id] = JSON.parse(
      JSON.stringify(route.points || []),
    );
  }

  const points = [...dragTempPoints.value[route.id]];
  const [draggedItem] = points.splice(dragSourceIndex.value, 1);
  points.splice(targetIndex, 0, draggedItem);
  dragTempPoints.value[route.id] = [...points];
  hasDragged.value[route.id] = true;

  emit("waypoint-updated", {
    route,
    pointIndex: targetIndex,
    newPoint: draggedItem,
  });
};

// 拖拽结束
const handleDragEnd = () => {
  isDragging.value = false;
  dragSourceIndex.value = -1;
};

// 编辑航线
const routeEdit = async (route) => {
  routeInfo.value[0].forEach((item) => {
    item._expanded = false;
    item._editing = false;
  });
  route._editing = true;
  route._expanded = true;
  emit("route-edit", route);

  activeRouteId.value = route.id;
  isEditMode.value = true;
  editingRouteId.value = route.id;
  isEditing.value = true;

  hasDragged.value[route.id] = false;
  if (!originalPoints.value[route.id]) {
    originalPoints.value[route.id] = JSON.parse(
      JSON.stringify(route.points || []),
    );
  }
  if (!dragTempPoints.value[route.id]) {
    dragTempPoints.value[route.id] = JSON.parse(
      JSON.stringify(route.points || []),
    );
  }
  isEditCompleted.value = false;
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
    delete hasDragged.value[route.id];
    ElMessage.success("删除成功");
    emit("route-delete", route);
    await routeList(searchKeyword.value);
  }
};

// 完成航线编辑
const completeRouteEdit = async (route) => {
  // 获取最终要保存的航点（优先使用拖动/编辑后的数据）
  let pointsToCheck;
  if (hasDragged.value[route.id] && dragTempPoints.value[route.id]) {
    pointsToCheck = dragTempPoints.value[route.id];
  } else {
    pointsToCheck = route.points;
  }

  const checkPoints = pointsToCheck.map((p) => ({
    lng: Number(p.lng),
    lat: Number(p.lat),
  }));

  const crossNoFly =
    props.noFlyZoneManagerRef?.isRouteCrossingNoFlyZone(checkPoints);
  if (crossNoFly) {
    ElMessage.error("航线/航点进入禁飞区，无法保存！");
    return;
  }

  const crossWarning =
    props.noFlyZoneManagerRef?.isRouteCrossingWarningZone(checkPoints);
  if (crossWarning) {
    ElMessage.warning("航线/航点经过禁高区，请注意飞行安全");
  }

  try {
    if (!hasDragged.value[route.id] && !route.isDragged) {
      ElMessage.warning("未进行任何修改");
      return;
    }

    const currentRoute = routeInfo.value[0].find(
      (item) => item.id === route.id,
    );
    if (!currentRoute) return;

    let finalPoints = hasDragged.value[route.id]
      ? JSON.parse(JSON.stringify(dragTempPoints.value[route.id]))
      : JSON.parse(JSON.stringify(currentRoute.points));

    currentRoute.points = finalPoints;

    const pointsForBackend = finalPoints.map((point) => ({
      lat: formatLatLng(point.lat),
      lon: formatLatLng(point.lng),
      alt: String(point.alt),
    }));

    const routeData = {
      routeData: {
        type: "mission",
        points: pointsForBackend,
        home_pos: pointsForBackend.length
          ? {
              lat: pointsForBackend[0].lat,
              lon: pointsForBackend[0].lon,
              alt: "0",
            }
          : { lat: "", lon: "", alt: "0" },
      },
    };

    const params = {
      id: currentRoute.id,
      description: currentRoute.description,
      name: currentRoute.name,
      pointsJson: JSON.stringify(routeData),
      policyId: Number(currentRoute.policyId),
    };

    const res = await updateMission(params);
    if (res.code === 200) {
      route._editing = false;
      route._expanded = true;

      originalPoints.value[route.id] = JSON.parse(JSON.stringify(finalPoints));
      hasDragged.value[route.id] = false;
      isEditCompleted.value = true;

      ElMessage.success("航线保存成功");
      await routeList(searchKeyword.value);
      emit("route-saved-and-refresh-map", route.id);
      emit("route-save");
    }
  } catch (error) {
    console.error(error);
    ElMessage.error("保存失败");
  }
};

// 取消航线编辑
const cancelRouteEdit = (route) => {
  if (!hasDragged.value[route.id] && !route.isDragged) {
    ElMessage.warning("未进行任何修改");
    return;
  }

  const currentRoute = routeInfo.value[0].find((item) => item.id === route.id);
  if (currentRoute && originalPoints.value[route.id]) {
    currentRoute.points = JSON.parse(
      JSON.stringify(originalPoints.value[route.id]),
    );
  }

  route._editing = false; // 这里必须是false！
  route._expanded = false;

  hasDragged.value[route.id] = false;
  ElMessage.success("已取消编辑，航点已恢复");
  emit("route-cancel-edit", currentRoute);
};

// 经纬度格式化
const formatLatLng = (value) => {
  if (!value || isNaN(Number(value))) return "";
  return Number(Number(value).toFixed(5)).toString();
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
  formData.value.heading_angle = value.headingAngle || {};
  formData.value.height_strategy = value.heightStrategy;
  formData.value.priority = value.priority;
  formData.value.sort = value.sort;
  formData.value.route_loss_behavior = value.routeLossBehavior;
  waypointSettingVisible.value = true;
  emit("waypoint-edit", { value, index });
};

// 保存编辑的航点（不校验禁飞区，只在点击"完成"按钮时校验）
const editWaypoint = async () => {
  const newLng = parseFloat(formData.value.lon);
  const newLat = parseFloat(formData.value.lat);
  const waypointNum = parseInt(formData.value.waypointNumber);

  if (isNaN(newLng) || isNaN(newLat) || isNaN(waypointNum)) {
    ElMessage.error("航点数据格式错误，请输入有效的数字");
    return;
  }

  try {
    const updateData = {
      pointData: JSON.stringify(formData.value),
      pointId: waypointNum,
      missionDataId: activeRouteId.value,
    };
    const res = await updatePoint(updateData);

    if (res.code === 200) {
      ElMessage.success(`航点${waypointNum}编辑成功`);
      waypointSettingVisible.value = false;

      const currentRoute = routeInfo.value[0]?.find(
        (item) => item.id === activeRouteId.value,
      );
      if (!currentRoute) return;

      const pointIndex = waypointNum - 1;
      const updatedWaypoint = {
        id: formData.value.id,
        lng: formData.value.lon,
        lat: formData.value.lat,
        alt: parseInt(formData.value.alt) || 0,
        residenceTime: parseInt(formData.value.residence_time) || 0,
        action: formData.value.action,
        velocity: parseInt(formData.value.velocity) || 0,
        headingAngle: formData.value.heading_angle,
        heightStrategy: formData.value.height_strategy,
        priority: formData.value.priority,
        sort: formData.value.sort,
        routeLossBehavior: formData.value.route_loss_behavior,
      };

      currentRoute.points[pointIndex] = { ...updatedWaypoint };
      if (!dragTempPoints.value[currentRoute.id]) {
        dragTempPoints.value[currentRoute.id] = [...currentRoute.points];
      }
      dragTempPoints.value[currentRoute.id][pointIndex] = {
        ...updatedWaypoint,
      };

      emit("waypoint-updated", {
        route: currentRoute,
        pointIndex,
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
    console.error("获取所有策略：", error);
    ElMessage.error("获取所有策略失败");
  }
};

// 航点策略变更
const handleSelectStrategyChange = (value) => {
  selectedItemStrategy.value = waypointOptions.value.find(
    (item) => item.value === value,
  );
  policyIdDialog.value = selectedItemStrategy.value?.id || "";
};

// 添加航点行
const handleAddRow = (index, item) => {
  const newPoint = { alt: "", lng: "", lat: "" };
  saveRouteForm.value.points.splice(index + 1, 0, newPoint);
};

// 删除航点行
const handleDeleteRow = (index, item) => {
  if (saveRouteForm.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }
  saveRouteForm.value.points.splice(index, 1);
};

// 确认保存路线
const confirmSaveRoute = async () => {
  await saveRouteFormRef.value.validate(async (valid) => {
    if (valid) {
      if (!props.noFlyZoneManagerRef) {
        ElMessage.warning("禁飞区数据未加载，无法进行校验");
        return;
      }

      if (!props.noFlyZoneManagerRef.isZonesLoaded()) {
        ElMessage.warning("禁飞区数据正在加载中，请稍后再试");
        return;
      }

      const routePoints = saveRouteForm.value.points.map((point) => {
        const formattedLng = formatLatLng(point.lng);
        const formattedLat = formatLatLng(point.lat);
        point.lng = formattedLng;
        point.lat = formattedLat;
        return { lng: parseFloat(formattedLng), lat: parseFloat(formattedLat) };
      });

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
          const routeData = { type: "mission", points: [] };
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
          description: newArr.value.description,
          name: newArr.value.name,
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

// 更新 dragTempPoints
const updateDragTempPoints = (routeId, points) => {
  if (dragTempPoints.value[routeId] && points) {
    dragTempPoints.value[routeId] = JSON.parse(JSON.stringify(points));
    hasDragged.value[routeId] = true;
  }
};

// 打开航点编辑弹窗
const openWaypointEditDialog = (route, pointIndex) => {
  const currentRoute = routeInfo.value[0].find((item) => item.id === route.id);
  if (
    !currentRoute ||
    !currentRoute.points ||
    currentRoute.points.length <= pointIndex
  ) {
    ElMessage.error("航点数据未找到");
    return;
  }

  let pointsToUse;
  if (isEditCompleted.value) {
    pointsToUse = currentRoute.points;
  } else if (dragTempPoints.value[route.id]) {
    pointsToUse = dragTempPoints.value[route.id];
  } else {
    pointsToUse = currentRoute.points;
  }

  const point = pointsToUse[pointIndex];
  if (!point) {
    ElMessage.error("航点数据未找到");
    return;
  }

  editAirline(point, pointIndex + 1);
  currentEditingPoint.value = { routeId: route.id, pointIndex };
};

// 打开航线编辑弹窗
const openRouteEditDialog = async (route) => {
  const currentRoute = routeInfo.value[0]?.find((item) => item.id === route.id);
  if (!currentRoute || !currentRoute._editing) {
    return; // 查看状态 → 直接阻止
  }

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
};

// 监听器
watch(waypointSettingVisible, (newValue) => {
  if (!newValue) {
    formData.value = {
      heading_angle: { mode: "", angle: "", lon: "", lat: "" },
    };
  }
});

watch(saveRouteDialogVisible, (newValue) => {
  if (!newValue) {
    saveRouteForm.value = { name: "", description: "", points: [] };
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
  openWaypointEditDialog,
  openRouteEditDialog,
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
  background: rgba(88, 131, 179, 0.5);
  border-radius: 3px;
}
.route-list-content::-webkit-scrollbar-thumb:hover {
  background: rgba(88, 131, 179, 0.8);
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
  color: #d28b06;
  cursor: pointer;
  margin-right: 6px;
}
.routeOperation-box-cancel {
  color: #8c8c8c;
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
  scrollbar-color: rgb(88 131 179) rgba(80, 80, 80, 0.4);
  margin-top: 16px;
}
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
.routeInformation-list.dragging {
  opacity: 0.7;
  background-color: #404858;
  cursor: grabbing;
}
.routeInformation-list[draggable="false"] {
  cursor: default;
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
:deep(.el-pager li.is-active),
:deep(.el-pager li:hover) {
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
  background-color: #f78c8c;
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
