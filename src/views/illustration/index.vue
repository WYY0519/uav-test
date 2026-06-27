<template>
  <div class="dashboard">
    <!-- 左侧面板：使用 Element Plus Tree 组件 -->
    <div class="tree-panel">
      <div class="tree-header">
        <el-input v-model="searchQuery" placeholder="请输入日志名称" class="search-input" clearable @input="handleInputSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <div class="action-buttons">
          <button class="btn btn-secondary" @click="selectAllFields">
            勾选全部
          </button>
          <button class="btn btn-secondary" @click="clearAllFields">
            清空全部
          </button>
          <button class="btn btn-secondary" @click="expandAllNodes">
            {{ defaultExpandAll ? '展开全部' : '折叠全部' }}
          </button>
        </div>
      </div>
      <div class="tree-container">
        <el-tree ref="treeRef" :data="treeData" :props="treeProps" node-key="id" :expand-on-click-node="false"
          class="custom-tree" empty-text="输入日志名称展示详细内容">
          <template #default="{ node, data }">
            <div class="tree-node-custom">
              <!-- 所有节点都显示复选框 -->
              <span class="tree-checkbox-wrap">
                <input type="checkbox" :checked="isNodeChecked(data)" :indeterminate="isNodeIndeterminate(data)"
                  @change="(e) => onNodeCheckChange(data, e.target.checked)" />
              </span>

              <span :class="['node-label-custom', data.isLeaf ? 'leaf-label-custom' : '']">
                {{ data.displayLabel }}
                <span v-if="data.isLeaf" class="node-path-hint"> </span>
              </span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧图表区：完全保持不变 -->
    <div class="chart-panel">
      <div class="chart-header">
        <h2>日志图解</h2>
        <div class="selected-badge">{{ selectedText }}</div>
      </div>
      <div ref="chartContainer" class="chart-box"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { getLogContent } from '@/api/log';
import { Search } from '@element-plus/icons-vue';
import { termMap } from './termMap'


const searchQuery = ref('');
let dataPoints = [];
const allPaths = [];
let searchTimer = null;
// 响应式数据 & 图表逻辑
const treeRef = ref(null);
const chartContainer = ref(null);
let chartInstance = null;
const selectedSet = ref(new Set());
const treeData = ref([]);
const treeProps = { children: 'children', label: 'displayLabel' };
const selectedText = computed(() => {
  const count = selectedSet.value.size;
  return count ? `✅ 已选择 ${count} 个数据字段 · 实时渲染` : `✅ 已选择 0 个数据字段 · 实时渲染`;
});
let updateTimer = null;
const defaultExpandAll = ref(true); // 控制树展开/折叠

// 提取所有数值字段路径 (递归安全)
const extractNumericPaths = (obj, prefix = '', pathSet = new Set(), visited = new WeakSet()) => {
  if (obj == null || typeof obj !== 'object') return pathSet;
  if (visited.has(obj)) return pathSet;
  visited.add(obj);
  if (prefix !== '' && Array.isArray(obj)) return pathSet;

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const val = obj[key];
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'number' && !isNaN(val)) {
      pathSet.add(newPrefix);
    } else if (typeof val === 'object' && val !== null) {
      extractNumericPaths(val, newPrefix, pathSet, visited);
    }
  }
  return pathSet;
}

// 构建 Element Tree 数据结构
const getChineseLabel = (path) => {
  const parts = path.split('.');
  // 叶子节点：只取最后一个字段的中文，不拼接父节点
  const lastPart = parts[parts.length - 1];
  return termMap[lastPart] || lastPart;
}

// 自动翻译英文单词为中文（后备方案）
const autoTranslate = (str) => {
  if (termMap[str]) return termMap[str];
  // 常见英文单词映射
  const wordMap = {
    alt: '高度', lat: '纬度', lon: '经度', x: 'X轴', y: 'Y轴', z: 'Z轴',
    vx: '北向速度', vy: '东向速度', vz: '垂向速度', roll: '横滚角', pitch: '俯仰角', yaw: '偏航角',
    time: '时间', ms: '毫秒', raw: '原始值', scaled: '缩放值', us: '微秒',
    dist: '距离', error: '误差', nav: '导航', target: '目标', bearing: '方位角',
    heading: '航向角', speed: '速度', air: '空气', ground: '地面', climb: '爬升率',
    acc: '加速度', gyro: '陀螺仪', mag: '磁力计', vibration: '振动频谱',
    battery: '电池', voltage: '电压', current: '电流', remaining: '剩余',
    satellites: '卫星数', fix: '定位', type: '类型', visible: '可见',
    imu: '惯性测量', pressure: '气压', temp: '温度', press: '气压',
    channel: '通道', rc: '遥控', mode: '模式',
    boot: '启动', bootms: '启动毫秒', system: '系统', global: '全局',
    position: '位置', local: '本地', ned: '北东地', int: '整数',
    heartbeat: '心跳', mission: '任务', current: '当前', wp: '航点',
    obstacle: '障碍物', distance: '距离', vtol: '垂直起降', landed: '着陆',
    rssi: '信号强度', throttle: '油门', aspd: '空速', hdg: '航向',
    gps: 'GPS', home: '家', offset: '偏移', origin: '原点',
    sensor: '传感器', mag_declination: '磁偏角', windspeed: '风速',
    scaled: '缩放', absolute: '绝对', differential: '差分',
    relative: '相对', unix: 'Unix时间', boot: '启动', global: '全局',
    position: '位置', int: '整数型', controller: '控制器', output: '输出',
    controller: '控制器', output: '输出', roll: '横滚', pitch: '俯仰',
    yaw: '偏航', waypoint: '航点', error: '误差', cross_track: '横滚距',
    target: '目标', bearing: '方位角', asp: '空速', airspeed: '空速',
    groundspeed: '地速', heading: '航向角', throttle: '油门百分比',
    armed: '解锁', landed: '着陆', vtol: '垂直起降', extended: '扩展',
    version: '版本', firmware: '固件', serial: '序列号', autopilot: '飞控',
    gps: 'GPS', raw: '原始', scaled: '缩放', vibration: '振动',
    local: '本地', ned: '北东地', imu: '惯性测量', magnetometer: '磁力计',
    accelerometer: '加速度计', gyroscope: '陀螺仪', rc: '遥控', channels: '通道',
    mission: '任务', current: '当前', rally: '集结点', fence: '围栏',
    total: '总数', seq: '序号', id: '编号', id: '编号', obstacle: '障碍物',
    distance: '障碍物距离', angle: '角度', offset: '偏移', increment: '增量',
    sensor: '传感器', type: '类型', frame: '坐标系', time: '时间',
    usec: '微秒', min: '最小', max: '最大', clipping: '削波',
    debug: '调试', vect: '向量', unknown: '未知', watchdog: '看门狗',
    heartbeat: '心跳', vfr: '平显', hud: '平显',
  };
  return wordMap[str] || str;
}

// 构建 Element Tree 数据结构
const buildElementTree = (paths, expandAll = false) => {
  const rootMap = new Map();
  for (const p of paths) {
    const parts = p.split('.');
    let currentMap = rootMap;
    let parentNode = null;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!currentMap.has(part)) {
        const isLeaf = i === parts.length - 1;
        const node = {
          id: parts.slice(0, i + 1).join('.'),
          name: part,
          label: autoTranslate(part),
          displayLabel: autoTranslate(part),
          path: isLeaf ? p : null,
          isLeaf: isLeaf,
          children: [],
          expanded: expandAll, // 👈 关键在这里
        };
        currentMap.set(part, node);
        if (parentNode) parentNode.children.push(node);
      }
      const currentNode = currentMap.get(part);
      if (i === parts.length - 1) {
        currentNode.isLeaf = true;
        currentNode.path = p;
        currentNode.displayLabel = autoTranslate(part);
      }
      if (!currentNode.children) currentNode.children = [];
      if (i < parts.length - 1) {
        if (!currentNode.childrenMap) currentNode.childrenMap = new Map();
        currentMap = currentNode.childrenMap;
        parentNode = currentNode;
      }
    }
  }

  const convertMapToArray = (map) => {
    const arr = [];
    for (let [key, node] of map.entries()) {
      if (node.childrenMap) {
        node.children = convertMapToArray(node.childrenMap);
        delete node.childrenMap;
      }
      if (node.children) node.children.sort((a, b) => a.name.localeCompare(b.name));
      arr.push(node);
    }
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }

  const rootArray = [];
  for (let [key, node] of rootMap.entries()) {
    if (node.childrenMap) {
      node.children = convertMapToArray(node.childrenMap);
      delete node.childrenMap;
    }
    if (node.children) node.children.sort((a, b) => a.name.localeCompare(b.name));
    rootArray.push(node);
  }
  rootArray.sort((a, b) => a.name.localeCompare(b.name));

  // 🔥 跳过顶层只有一个父节点的情况，将其子节点提升到根
  const skipNames = ['fc_status', 'flight_status', 'status', 'system', 'vehicle'];
  if (rootArray.length === 1 && skipNames.includes(rootArray[0].name) && rootArray[0].children?.length) {
    return rootArray[0].children;
  }

  return rootArray;
}


// 判断节点是否选中（全选）
const isNodeChecked = (data) => {
  if (!data.children || data.children.length === 0) {
    return selectedSet.value.has(data.path);
  }
  return getAllChildPaths(data).every((p) => selectedSet.value.has(p));
};

// 判断节点是否半选
const isNodeIndeterminate = (data) => {
  if (!data.children || data.children.length === 0) return false;
  const children = getAllChildPaths(data);
  const checkedCount = children.filter((p) => selectedSet.value.has(p)).length;
  return checkedCount > 0 && checkedCount < children.length;
};

// 递归获取所有子节点 path
const getAllChildPaths = (node) => {
  let paths = [];
  if (node.isLeaf && node.path) paths.push(node.path);
  if (node.children && node.children.length) {
    node.children.forEach((child) => {
      paths.push(...getAllChildPaths(child));
    });
  }
  return paths;
};

// 父节点 + 子节点统一勾选事件
const onNodeCheckChange = (data, checked) => {
  const paths = getAllChildPaths(data);
  const newSet = new Set(selectedSet.value);

  if (checked) {
    paths.forEach((p) => newSet.add(p));
  } else {
    paths.forEach((p) => newSet.delete(p));
  }

  selectedSet.value = newSet;
  updateChartDebounced();
};

const selectAllFields = async () => {
  if (!treeData.value.length) {
    if (!searchQuery.value) {
      console.warn('请先输入日志名称');
      return;
    }
    await doSearch();
  }
  const allLeafPaths = new Set();
  const collectLeaves = (nodes) => {
    nodes.forEach((node) => {
      if (node.isLeaf && node.path) allLeafPaths.add(node.path);
      if (node.children && node.children.length) collectLeaves(node.children);
    });
  };
  collectLeaves(treeData.value);
  console.log('勾选全部 - 收集到的路径数量:', allLeafPaths.size);
  selectedSet.value = allLeafPaths;
  updateChartDebounced();
};

const clearAllFields = () => {
  selectedSet.value = new Set();
  updateChartDebounced();
};

// 递归给所有节点设置展开状态
function setNodeExpand(nodes, status) {
  nodes.forEach(node => {
    node.expanded = status
    if (node.children && node.children.length) {
      setNodeExpand(node.children, status)
    }
  })
}

// 展开所有
const expandAllNodes = () => {
  console.log(defaultExpandAll, "wefd");

  if (defaultExpandAll.value) {
    if (!treeData.value.length) return;
    const traverse = (nodes) => {
      nodes.forEach(node => {
        node.expanded = true;
        if (node.children?.length) traverse(node.children);
      });
    };
    traverse(treeData.value);
    // 强制更新视图
    nextTick(() => {
      if (treeRef.value) {
        const allNodes = treeRef.value.store.nodesMap;
        for (const key in allNodes) {
          allNodes[key].expanded = true;
        }
      }
    });
    defaultExpandAll.value = !defaultExpandAll.value; // 切换状态
  } else {
    if (!treeData.value.length) return;
    const traverse = (nodes) => {
      nodes.forEach(node => {
        node.expanded = false;
        if (node.children?.length) traverse(node.children);
      });
    };
    traverse(treeData.value);
    // 强制更新视图
    nextTick(() => {
      if (treeRef.value) {
        const allNodes = treeRef.value.store.nodesMap;
        for (const key in allNodes) {
          allNodes[key].expanded = false;
        }
      }
    });
    defaultExpandAll.value = !defaultExpandAll.value; // 切换状态
  }

};
// X轴标签：完整显示每一个时间点
const getXAxisLabels = () => {
  return dataPoints.map((dp, idx) => {
    const ts = dp.timestamp || `点${idx}`;
    if (typeof ts === 'string' && ts.includes(' ')) {
      const timePart = ts.split(' ')[1].slice(0, 8);
      return `T${idx} ${timePart}`;
    }
    return `时间点${idx}`;
  });
};

// 生成系列数据：多系列折线
const getSeriesData = () => {
  const series = [];
  // 匹配你示例图的渐变色系：绿→黄→橙→红→紫
  const colors = ['#2ca02c', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0', '#673ab7'];

  let colorIndex = 0;
  for (let path of selectedSet.value) {
    const values = [];
    for (let dp of dataPoints) {
      const parts = path.split('.');
      let val = dp;
      for (let p of parts) {
        if (val && typeof val === 'object') val = val[p];
        else {
          val = null;
          break;
        }
      }
      if (typeof val === 'number' && !isNaN(val)) values.push(val);
      else values.push(null);
    }
    if (values.some((v) => v !== null)) {
      series.push({
        name: getChineseLabel(path),
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          shadowBlur: 6,
          shadowColor: 'rgba(0,0,0,0.1)',
        },
        itemStyle: {
          color: colors[colorIndex % colors.length],
        },
        emphasis: { focus: 'series' },
      });
      colorIndex++;
    }
  }
  return series;
};

const updateChartDebounced = () => {
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    updateChart();
  }, 50);
};

//  核心：支持鼠标放大缩小 + 多Y轴都在左侧
const updateChart = () => {
  if (!chartInstance && chartContainer.value) {
    chartInstance = echarts.init(chartContainer.value);
  }
  if (!chartInstance) return;
  const series = getSeriesData();
  const xAxisData = getXAxisLabels();

  if (series.length === 0) {
    chartInstance.setOption(
      {
        tooltip: { trigger: 'axis' },
        xAxis: { data: xAxisData, name: '时间', axisLabel: { rotate: 20 } },
        yAxis: { name: '数值' },
        series: [],
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '请从左侧勾选需要展示的日志\n折线图将动态展示飞行数据趋势',
              fill: '#9ab3cc',
              fontSize: 14,
              fontWeight: 'normal',
            },
            z: 100,
          },
        ],
      },
      true
    );
    return;
  }

  // ==============================================
  // 🔥 多Y轴全部在左侧，依次向右错开（修复空白问题）
  // ==============================================
  const yAxisCount = Math.min(series.length, 2);
  const yAxisList = [];

  for (let i = 0; i < yAxisCount; i++) {
    yAxisList.push({
      type: 'value',
      position: 'left',       // 全部靠左
      offset: i * 60,         // 依次向右偏移，避免重叠
      axisLine: { lineStyle: { color: '#aaa' } },
      axisLabel: { color: '#666' },
      splitLine: {
        lineStyle: { type: 'dashed', color: '#ddd' }
      },
      scale: true,
    });
  }

  // 给每条线分配对应Y轴
  series.forEach((s, idx) => {
    s.yAxisIndex = idx % yAxisCount;
  });

  chartInstance.setOption(
    {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', snap: true },
        backgroundColor: 'rgba(255,255,255,0.95)',
        textStyle: { color: '#333' },
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        top: 0,
        left: 'center',
        width: '90%',
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 50,
        right: '5%',
        top: 30,
        bottom: 35,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { interval: 'auto', rotate: 30, fontSize: 11 },
        axisLine: { lineStyle: { color: '#aaa' } },
      },
      yAxis: yAxisList,
      dataZoom: [
        { type: 'inside', start: 0, end: 100, zoomOnMouseWheel: true },
        { type: 'slider', start: 0, end: 100, height: 20, bottom: 0 },
      ],
      series: series,
      graphic: [],
    },
    true
  );
};
watch(selectedSet, () => {
  updateChartDebounced();
});

// 窗口自适应
const handleResize = () => {
  if (chartInstance) chartInstance.resize();
};

// 搜索功能（防抖调用接口）
const doSearch = async () => {
  selectedSet.value = new Set(); // 清空之前选中的内容
  if (!searchQuery.value) {
    dataPoints = [];
    allPaths.splice(0, allPaths.length);
    treeData.value = [];
    updateChart();
    return;
  }
  const realDataList = await loadLogData();
  if (!realDataList) return;
  dataPoints = realDataList;
  const paths = Array.from(extractNumericPaths(dataPoints[0])).sort();
  allPaths.splice(0, allPaths.length, ...paths);
  treeData.value = buildElementTree(allPaths, false);
  updateChart();
};

const handleInputSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(doSearch, 500);
};
// 独立方法：加载日志数据
const loadLogData = async () => {
  try {
    //searchQuery
    const res = await getLogContent(searchQuery.value);
    // const res = await getLogContent('');
    console.log('接口返回原始数据:', res);

    if (res?.code === 200 && Array.isArray(res.data)) {
      const realDataList = res.data
        .map((str) => {
          try {
            return JSON.parse(str);
          } catch (e) {
            console.warn('单条数据解析失败', e);
            return null;
          }
        })
        .filter(Boolean);

      console.log('解析成功的真实数据条数:', realDataList.length);
      return realDataList.length ? realDataList : null;
    }
  } catch (error) {
    console.error('获取日志内容失败:', error);
  }
  return null;
};

// 独立方法：初始化图表
const initChart = () => {
  if (chartContainer.value) {
    chartInstance = echarts.init(chartContainer.value);
    updateChart();
  }
  window.addEventListener('resize', handleResize);
};

onMounted(() => {
  nextTick(() => {
    initChart();
  });
});

onUnmounted(() => {
  if (chartInstance) chartInstance.dispose();
  window.removeEventListener('resize', handleResize);
  if (updateTimer) clearTimeout(updateTimer);
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard {
  display: flex;
  height: 100%;
  width: 100%;
  gap: 20px;
}

.tree-panel {
  width: 300px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(2px);
  border-radius: 28px;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.05),
    0 2px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
}

.tree-header {
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(46, 87, 122, 0.12);
}

.tree-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, #1e4b6e, #2c6e9e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  letter-spacing: -0.2px;
}

.tree-header h3:before {
  content: '📡';
  font-size: 1.5rem;
  background: none;
  -webkit-background-clip: unset;
  color: #2c6e9e;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 10px;
}

.btn {
  padding: 6px 14px;
  border-radius: 40px;
  border: none;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  background: #f2f5f9;
  color: #1f4a6e;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.02);
  letter-spacing: 0.3px;
}

.btn-primary {
  background: linear-gradient(105deg, #236b97, #1f5983);
  color: white;
  border: none;
  box-shadow: 0 4px 8px -2px rgba(33, 101, 145, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(105deg, #1f5983, #1a4c70);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px -4px rgba(33, 101, 145, 0.4);
}

.btn-secondary:hover {
  background: #eef3fc;
  border-color: #bdd3e8;
  transform: translateY(-1px);
}

.tree-stats {
  font-size: 0.7rem;
  background: #ecf3f9;
  padding: 6px 12px;
  border-radius: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #1f5983;
  font-weight: 500;
  margin-top: 6px;
  backdrop-filter: blur(2px);
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px 20px 12px;
  scrollbar-width: thin;
}

.tree-container::-webkit-scrollbar {
  width: 5px;
}

.tree-container::-webkit-scrollbar-track {
  background: #eef2f6;
  border-radius: 10px;
}

.tree-container::-webkit-scrollbar-thumb {
  background: #bfd3e2;
  border-radius: 10px;
}

/* 覆盖 Element Plus Tree 默认样式，完美融合原有设计 */
.custom-tree {
  background: transparent;
  --el-tree-node-hover-bg-color: #eef3fe;
  --el-tree-node-content-height: 32px;
}

.custom-tree .el-tree-node__content {
  height: auto;
  padding: 4px 0;
  border-radius: 12px;
}

.custom-tree .el-tree-node__expand-icon {
  font-size: 12px;
  color: #5d7f9e;
}

.custom-tree .el-tree-node__expand-icon.expanded {
  transform: rotate(0deg);
}

.tree-node-custom {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 3px 4px 3px 0;
  font-size: 0.85rem;
}

.tree-checkbox-wrap {
  margin-right: 10px;
  display: inline-flex;
  align-items: center;
}

.tree-checkbox-wrap input {
  width: 16px;
  height: 16px;
  accent-color: #2c6e9e;
  cursor: pointer;
  border-radius: 4px;
}

.node-label-custom {
  color: #1f3b4c;
  font-weight: 500;
  word-break: break-word;
}

.leaf-label-custom {
  font-weight: 600;
  color: #0f4c6b;
}

.node-path-hint {
  font-size: 0.6rem;
  color: #8dabbf;
  margin-left: 8px;
  font-family: 'SF Mono', monospace;
  opacity: 0.7;
  letter-spacing: -0.2px;
}

.chart-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(2px);
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 16px 16px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}

.chart-header {
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(60, 90, 110, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-header h2 {
  font-size: 1.35rem;
  font-weight: 600;
  background: linear-gradient(125deg, #1e4e70, #2b6d99);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-header h2:before {
  content: '📊';
  font-size: 1.5rem;
  background: none;
  -webkit-background-clip: unset;
  color: #2c6e9e;
}

.selected-badge {
  background: #eaf3fc;
  padding: 6px 18px;
  border-radius: 60px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1c6a93;
  box-shadow:
    inset 0 0 0 1px rgba(44, 110, 158, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(2px);
}

.chart-box {
  flex: 1;
  width: 100%;
  min-height: 0;
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.02),
    inset 0 0 0 1px rgba(0, 0, 0, 0.02);
  transition: all 0.2s;
}

@media (max-width: 720px) {
  .dashboard {
    flex-direction: column;
    height: auto;
    overflow-y: auto;
  }

  .tree-panel {
    width: 100%;
    max-height: 50vh;
  }

  .chart-panel {
    width: 100%;
  }
}
</style>
