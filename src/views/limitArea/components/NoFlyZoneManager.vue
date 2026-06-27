<template>
  <div class="control-toolbar" v-show="toolbarVisible">
    <h3>
      区域管理
      <el-icon @click="regionClose">
        <Close />
      </el-icon>
    </h3>

    <button @click="startDraw('polygon')" :class="{
      btn: true,
      primary: selectedRegion === 'jf',
      warningArea: selectedRegion === 'jg',
    }">
      <i class="icon-polygon"></i> 绘制多边形区域
    </button>

    <button @click="startDraw('circle')" :class="{
      btn: true,
      primary: selectedRegion === 'jf',
      warningArea: selectedRegion === 'jg',
    }">
      <i class="circle"></i> 绘制圆形区域
    </button>

    <div style="display: flex">
      <button @click="confirmDraw" style="margin-right: 8px" class="btn secondary">
        <i class="confirm"></i> 确认绘制
      </button>
      <button @click="cancelDraw" class="btn secondary">
        <i class="cancel"></i> 取消绘制
      </button>
    </div>

    <div class="legend">
      <div class="legend-item" @click="regionSelection('jf')">
        <div class="legend-color red"></div>
        <span>禁飞区域</span>
      </div>
      <div class="legend-item" @click="regionSelection('jg')">
        <div class="legend-color orange"></div>
        <span>警告区域</span>
      </div>
    </div>
  </div>

  <el-dialog v-model="dialogVisible" :title="`完善${regionName}信息`" width="400px" :before-close="handleDialogClose">
    <el-form :model="formData" :rules="formRules" ref="formRef" label-width="80px">
      <el-form-item label="区域名称" prop="name">
        <el-input v-model="formData.name" :placeholder="`请输入${regionName}名称`" maxlength="20" show-word-limit />
      </el-form-item>
      <el-form-item label="区域描述" prop="description">
        <el-input v-model="formData.description" :placeholder="`请输入${regionName}描述（可选）`" type="textarea" :rows="3"
          maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleDialogClose">取消</el-button>
      <el-button type="primary" @click="submitForm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { noflyzoneAdd } from "@/api/noflyzone.js";
import { Close } from "@element-plus/icons-vue";

const props = defineProps({
  map: { type: Object, required: true },
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "zone-saved"]);

const toolbarVisible = ref(false);
const dialogVisible = ref(false);
const formRef = ref(null);
const formData = ref({ name: "", description: "" });
const selectedRegion = ref("jf");
const regionName = ref("禁飞区");

let mouseTool = null;
let centerPoint = null;
let tempCircle = null;
const currentShape = ref(null);

const regionColors = {
  jf: { borderColor: "#e74c3c", fillColor: "#e74c3c", name: "禁飞区" },
  jg: { borderColor: "#ffa500", fillColor: "#ffa500", name: "警告区" },
};
const currentColor = computed(() => regionColors[selectedRegion.value]);

const formRules = ref({
  name: [{ required: true, message: "请输入区域名称", trigger: "blur" }],
});

watch(() => props.visible, (val) => {
  toolbarVisible.value = val;
  if (val) initMouseTool();
});

function initMouseTool() {
  if (!props.map || mouseTool) return;
  AMap.plugin(["AMap.MouseTool", "AMap.Circle", "AMap.GeometryUtil"], () => {
    if (mouseTool) return; // 防止重复创建
    mouseTool = new AMap.MouseTool(props.map);
  });
}

const regionSelection = (val) => {
  selectedRegion.value = val;
  regionName.value = regionColors[val].name;
  ElMessage.success(`已切换：${regionName.value}`);
};

function startDraw(type) {
  cancelDraw(false);
  // 确保 MouseTool 已加载再开始绘制
  if (!mouseTool) {
    initMouseTool();
    // 等待插件加载完成后重新调用 startDraw
    const retry = () => {
      if (mouseTool && props.map) startDraw(type);
      else setTimeout(retry, 100);
    };
    retry();
    return;
  }
  if (type === "polygon") {
    startPolygonDraw();
  } else {
    startCircleDraw();
  }
}

// 多边形绘制（双击完成）
function startPolygonDraw() {
  const style = {
    strokeColor: currentColor.value.borderColor,
    strokeWeight: 2,
    fillColor: currentColor.value.fillColor,
    fillOpacity: 0.3,
  };
  mouseTool.polygon(style);
  ElMessage.info("点击绘制多边形 → 双击完成");
  mouseTool.once("draw", (e) => {
    currentShape.value = e.obj;
    mouseTool.close();
    ElMessage.success("多边形绘制完成");
  });
}
// 
// 圆形绘制（双击完成）
function startCircleDraw() {
  ElMessage.info("单击选圆心 → 拖动调半径 → 双击完成");
  const map = props.map;
  centerPoint = null;
  tempCircle = null;

  const clickCenter = (e) => {
    if (!e || !e.lnglat) return;
    centerPoint = e.lnglat;
    map.off("click", clickCenter);
    const moveHandler = (ev) => {
      if (!ev || !ev.lnglat || !centerPoint) return;
      let r = AMap.GeometryUtil.distance(centerPoint, ev.lnglat);
      //最小半径80米，保证后端一定能保存
      // if (r < 80) r = 80;
      if (tempCircle) {
        tempCircle.setRadius(r);
      } else {
        tempCircle = new AMap.Circle({
          center: centerPoint,
          radius: r,
          strokeColor: currentColor.value.borderColor,
          fillColor: currentColor.value.fillColor,
          strokeWeight: 2,
          fillOpacity: 0.3,
          clickable: false,
          bubble: true,
        });
        map.add(tempCircle);
      }
    };

    map.on("mousemove", moveHandler);

    const dblEnd = () => {
      map.off("mousemove", moveHandler);
      map.off("dblclick", dblEnd);
      if (tempCircle) {
        currentShape.value = tempCircle;
        ElMessage.success("圆形绘制完成");
      }
    };
    map.once("dblclick", dblEnd);
  };

  map.once("click", clickCenter);
}

// 确认绘制
function confirmDraw() {
  if (!currentShape.value) {
    ElMessage.warning("请先完成绘制！");
    return;
  }

  let apiCoordinates, area, radius = 0, shapeType;

  if (currentShape.value instanceof AMap.Polygon) {
    const path = currentShape.value.getPath().map(p => [p.getLng(), p.getLat()]);
    apiCoordinates = JSON.stringify([path]);
    area = Math.abs(AMap.GeometryUtil.ringArea(path)) / 1000000;
    shapeType = "polygon";
  } else if (currentShape.value instanceof AMap.Circle) {
    const center = currentShape.value.getCenter();
    radius = currentShape.value.getRadius();
    apiCoordinates = JSON.stringify([[[center.getLng(), center.getLat()]]]);
    area = Math.PI * radius * radius / 1000000;
    shapeType = "circle";
  } else {
    ElMessage.warning("不支持的图形");
    return;
  }

  window._tempDrawData = { apiCoordinates, area, radius, shape: shapeType };
  formData.value = { name: "", description: "" };
  dialogVisible.value = true;
}
// 取消绘制（showTip = true 显示提示，false 不显示）
function cancelDraw(showTip = true) {
  const map = props.map;
  if (!map) return;

  if (mouseTool) {
    mouseTool.off("draw");
    mouseTool.close(true);
  }

  map.off("click");
  map.off("mousemove");
  map.off("dblclick");

  if (currentShape.value) {
    try { map.remove(currentShape.value); } catch (e) { }
    currentShape.value = null;
  }

  if (tempCircle) {
    try { map.remove(tempCircle); } catch (e) { }
    tempCircle = null;
  }

  centerPoint = null;

  // 只有 showTip = true 才提示
  if (showTip) {
    ElMessage.info("已取消绘制");
  }
}

// 提交保存
async function submitForm() {
  await formRef.value.validate();
  const data = window._tempDrawData;
  if (!data) return;

  try {
    const c = currentColor.value;
    const res = await noflyzoneAdd({
      area: data.area.toFixed(6),
      borderColor: c.borderColor,
      coordinates: data.apiCoordinates,
      fillColor: c.fillColor,
      name: formData.value.name,
      description: formData.value.description || "无",
      shape: data.shape,
      fillOpacity: 0.3,
      borderWeight: 2,
      createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    });

    if (res.code === 200) {
      ElMessage.success("保存成功！");
      emit("zone-saved");
      cancelDraw(false);
    } else {
      ElMessage.error("保存失败：" + (res.msg || "参数非法"));
    }
  } catch (err) {
    ElMessage.error("接口异常");
    console.error(err)
  }

  dialogVisible.value = false;
  window._tempDrawData = null;
}

const regionClose = () => {
  cancelDraw();
  emit("update:visible", false);
};

const handleDialogClose = () => {
  dialogVisible.value = false;
  formRef.value?.resetFields();
};

onBeforeUnmount(() => {
  cancelDraw();
});
</script>

<style scoped>
.control-toolbar {
  position: absolute;
  top: 92px;
  right: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 220px;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}

.btn {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.primary {
  background: #e74c3c;
  color: white;
}

.warningArea {
  background: #ffa500;
  color: white;
}

.secondary {
  background: #f5f5f5;
  color: #333;
}

.legend {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  cursor: pointer;
}

.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 8px;
}

.red {
  background: rgba(231, 76, 60, 0.6);
}

.orange {
  background: rgba(255, 165, 0, 0.6);
}
</style>