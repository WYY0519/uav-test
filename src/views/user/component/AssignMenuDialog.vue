<template>
  <el-dialog
    title="分配菜单"
    :model-value="modelValue"
    @update:model-value="handleVisibleChange"
    width="500px"
    destroy-on-close
  >
    <el-form :model="formData" label-width="100px">
      <el-form-item label="权限" prop="permission">
        <el-tree
          style="width: 100%"
          :data="treeData"
          show-checkbox
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          @check-change="handleCheckChange"
          :default-checked-keys="checkedKeys"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
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
  // 获取角色已分配菜单的函数
  getRoleMenuList: {
    type: Function,
    required: true,
  },
  // 获取所有菜单树形结构的函数
  getMenuTreeList: {
    type: Function,
    required: true,
  },
  // 分配菜单的函数
  allocateMenu: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "success"]);

const treeData = ref([]);
const checkedKeys = ref([]);
const menuIds = ref([]);
const formData = ref({
  permission: "",
});

// 树形结构转换
const convertToTree = (data) => {
  return data.map((item) => {
    const treeNode = {
      id: item.id,
      label: item.title,
      children:
        item.children && item.children.length > 0
          ? convertToTree(item.children)
          : [],
    };
    return treeNode;
  });
};

// 加载菜单数据
const loadMenuData = async () => {
  if (!props.roleId) return;

  try {
    console.log(props, "props");

    // 获取当前选中角色已分配的菜单（使用选中行的 roleId）
    const roleMenuRes = await props.getRoleMenuList(props.roleId);
    // 获取所有菜单树（使用当前用户的 currentRoleId）
    const menuTreeRes = await props.getMenuTreeList({ roleId: props.currentRoleId });

    treeData.value = convertToTree(menuTreeRes.data);
    const roleMenuIds = new Set(roleMenuRes.data.map((item) => item.id));

    // 清空选中状态
    checkedKeys.value = [];
    menuIds.value = [];

    // 递归设置选中状态
    const collectCheckedIds = (node) => {
      if (!node.children || node.children.length === 0) {
        if (roleMenuIds.has(node.id)) {
          checkedKeys.value.push(node.id);
          menuIds.value.push(node.id);
        }
      } else {
        node.children.forEach((child) => {
          if (roleMenuIds.has(child.id)) {
            checkedKeys.value.push(child.id);
            menuIds.value.push(child.id);
          }
          collectCheckedIds(child);
        });

        const allChildrenChecked = node.children.every((child) =>
          checkedKeys.value.includes(child.id),
        );
        if (allChildrenChecked && !checkedKeys.value.includes(node.id)) {
          checkedKeys.value.push(node.id);
          menuIds.value.push(node.id);
        }
      }
    };

    treeData.value.forEach((node) => {
      collectCheckedIds(node);
    });
  } catch (error) {
    ElMessage.error("加载菜单数据失败");
    console.error(error);
  }
};

// 复选框变化事件
const handleCheckChange = (data, checked) => {
  if (checked) {
    menuIds.value.push(data.id);
  } else {
    menuIds.value = menuIds.value.filter((id) => id !== data.id);
  }
};

// 提交分配菜单
const handleSubmit = async () => {
  try {
    const data = {
      roleId: props.roleId,
      menuIds: [...new Set(menuIds.value)].join(",") || "",
    };
    const res = await props.allocateMenu(data);
    if (res.code === 200) {
      ElMessage.success("分配菜单成功");
      emit("success");
      emit("update:modelValue", false);
    } else {
      ElMessage.error(res.message || "分配菜单失败");
    }
  } catch (error) {
    ElMessage.error("分配菜单失败");
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
      loadMenuData();
    }
  },
);
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
