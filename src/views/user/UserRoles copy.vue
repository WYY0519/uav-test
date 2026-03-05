<template>
  <div class="user-list">
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">权限列表</span>
            <el-tag type="success" effect="plain" class="count-tag">
              共 {{ total }} 条数据
            </el-tag>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchQuery"
              placeholder="搜索角色名称"
              class="search-input"
              clearable
              @clear="handleSearchClear"
            >
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="queryRole">
              <el-icon> <Refresh /> </el-icon>搜索
            </el-button>
            <el-button type="primary" @click="refreshList">
              <el-icon> <Refresh /> </el-icon>刷新
            </el-button>
            <el-button type="success" @click="handleAdd">
              <el-icon> <Plus /> </el-icon>添加角色
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredUserList"
        border
        stripe
        v-loading="tableLoading"
        style="width: 100%"
        @row-click="handleRowClick"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedUserId"
              :label="row.id"
              @change="() => handleRadioChange(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="角色名称" min-width="120" />
        <el-table-column prop="description" label="备注" min-width="180" />
        <el-table-column prop="sort" label="排序值" min-width="120" />
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="分配菜单" placement="top">
                <el-button type="info" link @click="assignmentsMenu(row)">
                  <el-icon>
                    <Menu />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="分配资源" placement="top">
                <el-button type="warning" link @click="allocateResources(row)">
                  <el-icon>
                    <Document />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑权限" placement="top">
                <el-button type="primary" link @click="handleEdit(row)">
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除权限" placement="top">
                <el-button type="danger" link @click="handleDelete(row)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 编辑权限对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
      destroy-on-close
      :append-to-body="true"
      class="custom-dialog"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
        style="height: calc(100% - 60px); overflow-y: auto"
      >
        <el-form-item label="角色名称 " prop="name">
          <el-input v-model="userForm.name" placeholder="请输入角色名称 " />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="userForm.sort"
            placeholder="请输入排序值"
            class="mx-4"
            :min="0"
            :max="10"
            controls-position="right"
            @change="handleChange"
          />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input
            v-model="userForm.description"
            type="textarea"
            placeholder="请输入备注"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div
          class="dialog-footer"
          style="
            position: sticky;
            bottom: 0;
            background-color: white;
            z-index: 10;
            padding: 10px;
          "
        >
          <div style="display: flex; justify-content: flex-end; gap: 10px">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
    <!-- 分配菜单对话框 -->
    <el-dialog
      title="分配菜单"
      v-model="menuVisible"
      width="500px"
      destroy-on-close
    >
      <el-form ref="userMeunFormRef" :model="userMeunForm" label-width="100px">
        <el-form-item label="权限" prop="permission">
          <el-tree
            style="width: 100%"
            :data="mockData"
            show-checkbox
            node-key="id"
            default-expand-all
            :expand-on-click-node="false"
            @check-change="handleCheckChange"
            :default-checked-keys="checkedIds"
          >
          </el-tree>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="menuVisible = false">取消</el-button>
          <el-button type="primary" @click="submitMenuForm">确定</el-button>
        </div>
      </template>
    </el-dialog>
    <!-- 分配资源抽屉 -->
    <el-drawer
      v-model="allocateResourcesDrawer"
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
                <img style="width: 22px" src="@/assets/提示图标.png" alt="" />
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
        <div style="position: absolute; bottom: 20px; right: 20px">
          <el-button @click="allocateResourcesDrawer = false">取消</el-button>
          <el-button type="primary" @click="submitResourcesForm"
            >确认</el-button
          >
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Plus,
  Edit,
  Delete,
  Refresh,
  Menu,
  Document,
} from "@element-plus/icons-vue";
import {
  roleList, //根据角色名称分页获取角色列表
  roleCreate, // 添加角色
  roleUpdate, //修改角色
  roleDelete, //删除角色
  rolelistMenu, //获取角色相关菜单
  roleAllocMenu, //给角色分配菜单
  listAllResourceCategory, //查询所有后台资源分类
  listAllResource, //查询所有资源
  listResource, //获取角色相关资源
  roleTreeList, //树形结构返回所有菜单列表,
  allocResource, //给角色分配资源
} from "@/api/role";
// 状态变量
const tableLoading = ref(false); //
const dialogVisible = ref(false);
const dialogTitle = ref("添加角色");
const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const userFormRef = ref(null);
const userMeunFormRef = ref(null);
const selectedUserId = ref("");
const adminupId = ref("");
const menuVisible = ref(false);
const allocateResourcesDrawer = ref(false);
// 需要选中的节点ID列表
const checkedIds = ref([]); // 示例：选中ID为1,2,3的节点
// 角色表单
const userForm = ref({
  name: "",
  sort: "",
  description: "",
});
//
const userMeunForm = ref({
  permission: "",
});
const mockData = ref([]);
const menuIds = ref([]);
// 表单验证规则
const userRules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  sort: [
    { required: true, message: "请输入排序值", trigger: "blur" },
    { type: "number", message: "请输入数字", trigger: "blur" },
  ],
  description: [
    { required: true, message: "请输入备注", trigger: "blur" },
    { message: "请输入备注", trigger: "blur" },
  ],
};
// 计算属性：过滤后的角色列表
const filteredUserList = ref([]);
const modules = ref([]);
const backendResourcesList = ref([]); //后台资源列表
const allResourceList = ref([]); //所有资源列表
const roleResourceList = ref([]); //获取角色相关资源
// 添加角色
const handleAdd = () => {
  dialogTitle.value = "添加权限";
  dialogVisible.value = true;
};
//编辑权限
const handleEdit = (row) => {
  dialogTitle.value = "编辑权限";
  dialogVisible.value = true;
  userForm.value = { ...row };
  adminupId.value = row.id;
};
// 删除权限
const handleDelete = (row) => {
  console.log(row, "删除权限");
  ElMessageBox.confirm(`确定要删除权限 ${row.name} 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    console.log("111", row.id);
    const res = await roleDelete(row.id);
    console.log(res, "删除权限");
    if (res.code == 200) {
      ElMessage.success("删除成功");
      await userlistdata();
    } else {
      ElMessage.error("删除失败");
    }
  });
};
//树形结构返回所有菜单列表
const convertToTree = (data) => {
  return data.map((item) => {
    // 构建当前节点
    const treeNode = {
      id: item.id, // 使用原始id作为唯一标识
      label: item.title, // 显示标签
      // ...item, // 保留原始数据的其他属性
      // 递归处理子节点
      children:
        item.children && item.children.length > 0
          ? convertToTree(item.children)
          : [], // 无子节点时不添加children属性
    };
    return treeNode;
  });
};
const assignmentsMenu = async (row) => {
  menuIds.value = [];
  menuVisible.value = true;
  let data = { roleId: row.id };
  const res = await rolelistMenu(row.id);
  const res2 = await roleTreeList(data);
  mockData.value = convertToTree(res2.data);
  const aaIdMap = new Set(res.data.map((item) => item.id));
  console.log(res, "res");
  console.log(res2, "res2");

  // 清空checkedIds
  checkedIds.value = [];
  // 递归函数：设置checkedIds，同时处理父级和子级
  const collectCheckedIds = (node) => {
    // 检查当前节点是否需要勾选（如果没有子节点，直接勾选父节点）
    if (!node.children || node.children.length === 0) {
      if (aaIdMap.has(node.id)) {
        checkedIds.value.push(node.id);
        menuIds.value.push(node.id);
      }
    } else {
      // 处理子节点
      node.children.forEach((child) => {
        if (aaIdMap.has(child.id)) {
          checkedIds.value.push(child.id);
          menuIds.value.push(child.id);
        }
        collectCheckedIds(child);
      });

      // 检查父节点是否应该勾选（如果所有子节点都勾选，则勾选父节点）
      const allChildrenChecked = node.children.every((child) =>
        checkedIds.value.includes(child.id),
      );
      if (allChildrenChecked && !checkedIds.value.includes(node.id)) {
        checkedIds.value.push(node.id);
        menuIds.value.push(node.id);
      }
    }
  };

  // 遍历设置checkedIds，处理所有节点
  mockData.value.forEach((node) => {
    collectCheckedIds(node);
  });
  console.log(mockData.value, "mockData");
};
// 复选框变化事件
const handleCheckChange = (data, checked, indeterminate) => {
  console.log(data, checked);
  if (checked) {
    menuIds.value.push(data.id);
  } else {
    menuIds.value = menuIds.value.filter((id) => id !== data.id);
  }
};
//分配菜单
const submitMenuForm = async () => {
  console.log([...new Set(menuIds.value)], "分配菜单");
  const data = {
    roleId: selectedUserId.value, //角色id
    menuIds: [...new Set(menuIds.value)].join(",") || "", //菜单ids
  };
  const res = await roleAllocMenu(data);
  if (res.code === 200) {
    ElMessage.success("分配菜单成功");
    menuVisible.value = false; //关闭分配菜单弹窗
    menuIds.value = "";
    await userlistdata(); //刷新列表
  } else {
    ElMessage.error(res.message);
  }
};
// 分配资源
const allocateResources = async (row) => {
  modules.value = [];
  allocateResourcesDrawer.value = true;
  await backendResources(); //查询所有后台资源分类
  await allResource(); //查询所有资源
  await listNaturalResource();

  if (backendResourcesList.value && allResourceList.value) {
    modules.value = mergeResources(
      backendResourcesList.value,
      allResourceList.value,
    );
    console.log(modules.value, "modules.value", roleResourceList.value);

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
    }

    const parentModules = modules.value.filter(
      (module) => module.children && module.children.length > 0,
    );
    console.log(parentModules, "parentModules1111");

    // 处理每个父模块
    parentModules.forEach((parentModule) => {
      // 检查所有子模块是否都被选中
      const allChecked = parentModule.children.every(
        (child) => child.checked === true,
      );
      // 检查是否有部分子模块被选中
      const someChecked = parentModule.children.some(
        (child) => child.checked === true,
      );

      if (allChecked) {
        // 所有子模块都被选中，父模块设为选中状态
        parentModule.checked = true;
      } else if (someChecked) {
        // 部分子模块被选中，父模块设为半选状态
        parentModule.checked = null;
      } else {
        // 没有子模块被选中，父模块设为未选中状态
        parentModule.checked = false;
      }
    });
  }
};
//查询所有后台资源分类
const backendResources = async () => {
  try {
    const res = await listAllResourceCategory();
    backendResourcesList.value = res.data;
    console.log(res, "查询所有后台资源分类");
  } catch (error) {
    ElMessage.error(error);
  }
};
//查询所有资源
const allResource = async () => {
  try {
    const res = await listAllResource();
    allResourceList.value = res.data;
    console.log(res, "查询所有资源");
  } catch (error) {
    ElMessage.error(error);
  }
};
//获取角色相关资源
const listNaturalResource = async () => {
  try {
    const res = await listResource(selectedUserId.value);
    roleResourceList.value = res.data;
    console.log(res, "获取角色相关资源");
  } catch (error) {
    ElMessage.error(error);
  }
};
//数据合并
const mergeResources = (categories, resources) => {
  // 创建分类索引 map
  const categoryMap = new Map();
  categories.forEach((category) => {
    // 为分类添加 children 数组
    category.children = [];
    categoryMap.set(category.id, category);
  });
  // 将资源分配到对应的分类
  resources.forEach((resource) => {
    const category = categoryMap.get(resource.categoryId);
    if (category) {
      category.children.push(resource);
    }
  });
  // 按 sort 字段排序
  return [...categoryMap.values()].sort((a, b) => b.sort - a.sort);
};

// 模块勾选状态改变处理
const handleModuleChange = (module) => {
  console.log(module);

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
    // 检查所有子模块是否都被选中
    const allChecked = parentModule.children.every(
      (child) => child.checked === true,
    );
    // 检查是否有部分子模块被选中
    const someChecked = parentModule.children.some(
      (child) => child.checked === true,
    );

    if (allChecked) {
      // 所有子模块都被选中，父模块设为选中状态
      parentModule.checked = true;
    } else if (someChecked) {
      // 部分子模块被选中，父模块设为半选状态
      parentModule.checked = null;
    } else {
      // 没有子模块被选中，父模块设为未选中状态
      parentModule.checked = false;
    }
  }
};

// 切换模块展开/折叠
const toggleModule = (module) => {
  console.log(module, "module");
  // module.expanded = !module.expanded;
};
// 递归函数：提取checked为true的节点ID
const extractCheckedIds = (treeData) => {
  const result = [];
  // 定义递归辅助函数
  function traverseNodes(nodes) {
    nodes.forEach((node) => {
      // 检查当前节点是否checked为true
      if (node.checked) {
        result.push(node.id);
      }
      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        traverseNodes(node.children);
      }
    });
  }
  // 开始遍历
  traverseNodes(treeData);
  return result;
};
//分配菜资源
const submitResourcesForm = async () => {
  const checkedIds = extractCheckedIds(modules.value);
  const data = {
    roleId: selectedUserId.value, //角色id
    resourceIds: checkedIds.join(","), //资源ids
  };
  const res = await allocResource(data);
  if (res.code === 200) {
    ElMessage.success("分配资源成功");
    allocateResourcesDrawer.value = false; //关闭分配菜单弹窗
    await userlistdata(); //刷新列表
  } else {
    ElMessage.error(res.message);
  }
};
// 搜索
const handleSearchClear = async () => {
  searchQuery.value = "";
  await userlistdata();
};

//刷新列表
const refreshList = async () => {
  try {
    searchQuery.value = "";
    await userlistdata(currentPage.value, pageSize.value);
    setTimeout(() => {
      ElMessage.success("刷新成功");
    }, 500);
  } catch (error) {
    console.error("刷新失败", error);
    ElMessage.error("刷新失败");
  }
};
//查询
const queryRole = async () => {
  await userlistdata();
};
// 获取角色列表数据
const userlistdata = async (
  page = currentPage.value,
  size = pageSize.value,
) => {
  try {
    tableLoading.value = true;
    // 向后端传递页码和每页条数
    const data = {
      keyword: searchQuery.value,
      pageNum: page,
      pageSize: size,
    };
    const res = await roleList(data);
    if (res.code === 200) {
      filteredUserList.value = res.data.page.list;
      total.value = res.data.page.total;
    }
    setTimeout(() => {
      tableLoading.value = false;
    }, 500);
  } catch (error) {
    console.error("获取角色列表失败", error);
    ElMessage.error("获取数据失败");
  }
};

// 添加/修改角色
const submitForm = async () => {
  userFormRef.value.validate(async (valid) => {
    if (valid) {
      if (dialogTitle.value === "添加权限") {
        console.log(userForm.value);
        const data = {
          description: userForm.value.description,
          name: userForm.value.name,
          sort: userForm.value.sort,
        };
        const res = await roleCreate(data);
        if (res.code === 200) {
          dialogVisible.value = false;
          ElMessage.success("添加成功");
          await userlistdata();
        } else {
          ElMessage.error("添加失败");
        }
      } else if (dialogTitle.value === "编辑权限") {
        const roleID = userForm.value.id;
        const data = {
          description: userForm.value.description,
          name: userForm.value.name,
          sort: userForm.value.sort,
        };
        const res = await roleUpdate(roleID, data);
        if (res.code === 200) {
          dialogVisible.value = false;
          ElMessage.success("修改成功");
          await userlistdata();
        } else {
          ElMessage.error("修改失败");
        }
      }
    }
  });
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};
// 修改分页处理方法
const handleSizeChange = (val) => {
  pageSize.value = val;
  userlistdata(currentPage.value, val); // 切换每页条数时重新获取数据
  console.log(val, "val", currentPage.value);
};

const handleCurrentChange = (val) => {
  console.log(val, "val2", pageSize.value);
  currentPage.value = val;
  userlistdata(val, pageSize.value); // 切换页码时重新获取数据
};

// 处理行点击
const handleRowClick = (row) => {
  selectedUserId.value = row.id;
  console.log("选中角色:", row);
};

// 处理单选框变化
const handleRadioChange = (row) => {
  selectedUserId.value = row.id;
  console.log("选中角色:", row);
};
// 生命周期钩子
onMounted(() => {
  userlistdata();
});
watch(dialogVisible, (neswValue) => {
  if (neswValue === false) {
    userForm.value = {
      name: "",
      sort: "",
      description: "",
    };
  }
});
</script>

<style scoped>
.user-list {
  /* padding: 20px; */
}

.list-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.count-tag {
  padding: 4px 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 240px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  border-radius: 8px;
  margin-top: 20px;
}

:deep(.el-button-group) {
  display: flex;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }
}

.module-card {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
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
  /* border: 1px solid #e4e7ed; */
  border-radius: 4px;
  /* background-color: #fafafa; */
  transition: background-color 0.2s;
}

.custom-dialog .el-dialog__body {
  padding-bottom: 0;
  /* 移除默认底部内边距，由sticky按钮处理 */
}

:deep(.el-drawer__body) {
  margin-bottom: 70px;
}

:deep(.el-drawer) {
  width: 38% !important;
}

/* .sub-module-item:hover {
  background-color: #f5f7fa;
} */

/* 添加单选框样式 */
:deep(.el-radio) {
  margin-right: 0;
  display: flex;
  justify-content: center;
}

:deep(.el-radio__label) {
  display: none;
}
:deep(.el-checkbox__label) {
  display: flex;
  justify-content: center;
}
</style>
