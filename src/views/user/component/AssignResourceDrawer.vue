<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="handleVisibleChange"
    title="分配资源"
    :with-header="true"
  >
    <div>
      <template v-for="(module, index) in modules" :key="index">
        <div class="module-item">
          <div class="module-header" @click="toggleModule(module)">
            <el-checkbox
              v-model="module.checked"
              @change="handleModuleChange(module)"
              :indeterminate="module.checked === null"
            >
              <el-icon v-if="module.children" class="expand-icon">
                <i
                  :class="
                    module.expanded
                      ? 'el-icon-arrow-down'
                      : 'el-icon-arrow-right'
                  "
                ></i>
              </el-icon>
              {{ module.name }}
            </el-checkbox>
            <el-tooltip
              class="box-item"
              effect="dark"
              content="Right Top prompts info"
              placement="right-start"
            >
              <!-- <img style="width: 22px" src="@/assets/提示图标.png" alt="" /> -->
            </el-tooltip>
          </div>

          <div
            class="sub-modules"
            v-if="
              module.children && module.children.length > 0 && module.expanded
            "
          >
            <div class="sub-module-grid">
              <template
                v-for="(subModule, subIndex) in module.children"
                :key="subIndex"
              >
                <el-checkbox
                  v-model="subModule.checked"
                  @change="handleSubModuleChange(subModule)"
                  class="sub-module-item"
                >
                  {{ subModule.name }}
                </el-checkbox>
              </template>
            </div>
          </div>
        </div>
      </template>
      <div class="drawer-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  roleId: {
    type: String,
    default: "",
  },
  currentRoleId: {
    type: String,
    default: "",
  },
  // 查询所有后台资源分类的函数
  getAllResourceCategories: {
    type: Function,
    required: true,
  },
  // 查询所有资源的函数
  getAllResources: {
    type: Function,
    required: true,
  },
  // 获取角色相关资源的函数
  getRoleResources: {
    type: Function,
    required: true,
  },
  // 给角色分配资源的函数
  allocateResource: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "success"]);

const modules = ref([]);
const backendResourcesList = ref([]);
const allResourceList = ref([]);
const roleResourceList = ref([]);

// 加载资源数据
const loadResourceData = async () => {
  if (!props.roleId) return;

  try {
    modules.value = [];
    const categoriesRes = await props.getAllResourceCategories();
    const resourcesRes = await props.getAllResources();
    const roleResourcesRes = await props.getRoleResources(props.roleId);

    backendResourcesList.value = categoriesRes.data;
    allResourceList.value = resourcesRes.data;
    roleResourceList.value = roleResourcesRes.data;

    if (backendResourcesList.value && allResourceList.value) {
      modules.value = mergeResources(
        backendResourcesList.value,
        allResourceList.value,
      );

      if (roleResourceList.value) {
        modules.value.forEach((item) => {
          if (item.children.length) {
            item.expanded = true;
          }
          item.children.forEach((itemChildren) => {
            roleResourceList.value.forEach((itemRole) => {
              if (itemChildren.id === itemRole.id) {
                itemChildren.checked = true;
              }
            });
          });
        });

        // 处理父模块选中状态
        const parentModules = modules.value.filter(
          (module) => module.children && module.children.length > 0,
        );

        parentModules.forEach((parentModule) => {
          const allChecked = parentModule.children.every(
            (child) => child.checked === true,
          );
          const someChecked = parentModule.children.some(
            (child) => child.checked === true,
          );

          if (allChecked) {
            parentModule.checked = true;
          } else if (someChecked) {
            parentModule.checked = null;
          } else {
            parentModule.checked = false;
          }
        });
      }
    }
  } catch (error) {
    ElMessage.error("加载资源数据失败");
    console.error(error);
  }
};

// 数据合并
const mergeResources = (categories, resources) => {
  const categoryMap = new Map();
  categories.forEach((category) => {
    category.children = [];
    categoryMap.set(category.id, category);
  });
  resources.forEach((resource) => {
    const category = categoryMap.get(resource.categoryId);
    if (category) {
      category.children.push(resource);
    }
  });
  return [...categoryMap.values()].sort((a, b) => b.sort - a.sort);
};

// 模块勾选状态改变处理
const handleModuleChange = (module) => {
  module.children.forEach((subModule) => {
    subModule.checked = module.checked;
  });
};

// 子模块勾选状态改变处理
const handleSubModuleChange = (subModule) => {
  const parentModule = modules.value.find(
    (module) => module.children && module.children.includes(subModule),
  );
  if (parentModule) {
    const allChecked = parentModule.children.every(
      (child) => child.checked === true,
    );
    const someChecked = parentModule.children.some(
      (child) => child.checked === true,
    );

    if (allChecked) {
      parentModule.checked = true;
    } else if (someChecked) {
      parentModule.checked = null;
    } else {
      parentModule.checked = false;
    }
  }
};

// 切换模块展开/折叠
const toggleModule = (module) => {
  console.log(module, "module");
};

// 递归函数：提取checked为true的节点ID
const extractCheckedIds = (treeData) => {
  const result = [];
  function traverseNodes(nodes) {
    nodes.forEach((node) => {
      if (node.checked) {
        result.push(node.id);
      }
      if (node.children && node.children.length > 0) {
        traverseNodes(node.children);
      }
    });
  }
  traverseNodes(treeData);
  return result;
};
console.log(props, "====");

// 提交分配资源
const handleSubmit = async () => {
  try {
    const checkedIds = extractCheckedIds(modules.value);
    const data = {
      roleId: props.roleId,
      resourceIds: checkedIds.join(","),
    };
    const res = await props.allocateResource(data);
    if (res.code === 200) {
      ElMessage.success("分配资源成功");
      emit("success");
      emit("update:modelValue", false);
    } else {
      ElMessage.error(res.message || "分配资源失败");
    }
  } catch (error) {
    ElMessage.error("分配资源失败");
    console.error(error);
  }
};

// 取消
const handleCancel = () => {
  emit("update:modelValue", false);
};

// 处理显隐变化
const handleVisibleChange = (value) => {
  emit("update:modelValue", value);
};

// 监听弹窗显隐
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      loadResourceData();
    }
  },
);
</script>

<style scoped>
.module-card {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.module-item {
  margin-bottom: 15px;
  border-radius: 4px;
  overflow: hidden;
}

.module-header {
  padding: 10px 15px;
  background-color: #e6f7ff;
  border: 1px solid #d9ecff;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.expand-icon {
  margin-right: 8px;
  transition: transform 0.3s;
}

.module-header:hover {
  background-color: #d6efff;
}

.sub-modules {
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.sub-module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.sub-module-item {
  padding: 8px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.drawer-footer {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
}

::deep(.el-drawer__body) {
  margin-bottom: 70px;
}

::deep(.el-drawer) {
  width: 38% !important;
}

::deep(.el-checkbox__label) {
  display: flex;
  justify-content: center;
}
</style>
