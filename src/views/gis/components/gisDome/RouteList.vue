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
          <div class="routeInformation" v-if="itemInfo.id === activeRouteId">
            <div
              class="routeInformation-list"
              v-for="(itemPrototype, indexPrototype) in itemInfo.points"
              :key="indexPrototype"
            >
              航点 {{ indexPrototype + 1 }}
              {{
                indexPrototype === 0
                  ? "(起点)"
                  : indexPrototype === itemInfo.points.length - 1
                    ? "(终点)"
                    : ""
              }}
              <div
                v-show="indexPrototype !== itemInfo.points.length - 1"
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
      style="max-height: 80%; overflow-y: auto"
    >
      <el-form :model="formData" label-width="100px">
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
          <!-- 与目标点成一定角度 -->
          <el-input
            v-show="
              formData.heading_angle.mode === 'at an angle to the target point'
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
          <!-- 朝某一点不变 -->
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
      style="max-height: 70%; overflow-y: auto"
    >
      <el-form
        ref="saveRouteFormRef"
        :model="saveRouteForm"
        :rules="saveRouteRules"
        label-width="90px"
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
        <!-- 数据行 -->
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
            :prop="`points.[${index}].lng`"
            :rules="[
              { required: true, message: '请输入经度', trigger: 'blur' },
            ]"
          >
            <el-input v-model="item.lng" placeholder="经度" />
          </el-form-item>
          <el-form-item
            label="纬度:"
            :prop="`points.[${index}].lat`"
            :rules="[
              { required: true, message: '请输入纬度', trigger: 'blur' },
            ]"
          >
            <el-input v-model="item.lat" placeholder="纬度" />
          </el-form-item>
          <!-- 操作按钮 -->
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
});

// Emits
const emit = defineEmits([
  "route-view",
  "route-retract",
  "route-edit",
  "route-delete",
  "waypoint-edit",
  "route-save",
]);

// 状态变量
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
//搜索的航线
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
//查看航线
const viewRoute = (route) => {
  emit("route-view", route);
  activeRouteId.value = route.id;
};

const retractRoute = () => {
  emit("route-retract");
  activeRouteId.value = null;
};
//编辑航线
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
//删除航线
const deleteRoute = (route) => {
  deletingRouteIndex.value = route;
  deleteDialogVisible.value = true;
};
//确认删除航线
const confirmDelete = async () => {
  const route = deletingRouteIndex.value;
  let res = await deleteManageRoute(route.id);
  if (res.code === 200) {
    deleteDialogVisible.value = false;
    activeRouteId.value = null;
    ElMessage.success("删除成功");
    emit("route-delete", route);
    await routeList(searchKeyword.value);
  }
};

//记录当前编辑的航线和航点索引
const editAirline = (value, index) => {
  // 原有逻辑
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

// 添加禁飞区/警告区校验
const editWaypoint = async () => {
  // ===== 原有编辑航点逻辑 =====
  try {
    let data = {
      pointData: JSON.stringify(formData.value),
      pointId: formData.value.waypointNumber,
      missionDataId: activeRouteId.value,
    };
    let res = await updatePoint(data);
    if (res.code === 200) {
      ElMessage.success("航点编辑成功");
      waypointSettingVisible.value = false;
      activeRouteId.value = null;
      await routeList(searchKeyword.value);
      emit("route-save");
    }
  } catch (error) {
    console.error("航点编辑失败：", error);
    ElMessage.error("航点编辑失败，请重试");
  }
};
//获取所有策略
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
//航点策略
const handleSelectStrategyChange = (value) => {
  selectedItemStrategy.value = waypointOptions.value.find(
    (item) => item.value === value,
  );
  policyIdDialog.value = selectedItemStrategy.value?.value || "";
};
//添加行
const handleAddRow = (index, item) => {
  const newPoint = {
    alt: "",
    lng: "",
    lat: "",
  };
  saveRouteForm.value.points.splice(index + 1, 0, newPoint);
  ElMessage.info(`在第${index + 1}行后添加了新行`);
};
//删除行
const handleDeleteRow = (index, item) => {
  if (saveRouteForm.value.points.length <= 2) {
    ElMessage.warning("至少保留两个航点");
    return;
  }
  saveRouteForm.value.points.splice(index, 1);
  ElMessage.info(`已删除第${index + 1}行`);
};

// 修改中的校验逻辑
const confirmSaveRoute = async () => {
  saveRouteFormRef.value.validate(async (valid) => {
    if (valid) {
      // ===== 原有保存/编辑逻辑 =====
      if (dialogTitle.value === "保存路线") {
        // 原有保存逻辑
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
        // 原有编辑逻辑
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
  // 初始化
});
// 暴露方法给父组件
defineExpose({
  routeList,
  retractRoute,
});

// 初始化
getAllPolicies();
routeList();
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
  /* max-height: calc(100vh - 460px); */
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

/* .pagination-container {
  margin-top: 10px;
} */

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

.routeInformation-list {
  display: flex;
  justify-content: space-between;
  background-color: #50505066;
  padding: 12px;
  margin-top: 16px;
}

.routeInformation-list:first-child {
  margin-top: 0;
}

.routeInformation-list-edit {
  color: #1677ff;
  cursor: pointer;
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
