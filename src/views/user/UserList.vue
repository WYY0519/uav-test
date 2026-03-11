<template>
  <div class="user-list">
    <div class="SearchArea">
      <el-form :inline="true" :model="formInline" class="demo-form-inline">
        <!-- 用户名表单项 -->
        <el-form-item label="用户名:" class="form-item">
          <el-input
            v-model="formInline.username"
            placeholder="请输入用户名"
            clearable
            @clear="handleUserClea"
          />
        </el-form-item>

        <!-- 手机号表单项 -->
        <el-form-item label="手机号:" class="form-item">
          <el-input
            v-model="formInline.phone"
            :formatter="formatNumber"
            :parser="parseNumber"
            placeholder="请输入手机号"
            clearable
            @clear="handleUserClea"
          />
        </el-form-item>

        <!-- 按钮组容器，使用Flex布局靠右 -->
        <div class="button-group">
          <el-form-item>
            <el-button type="primary" @click="queryData">
              <el-icon> <Search /> </el-icon>搜索</el-button
            >
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="resetForm"
              ><el-icon> <Refresh /> </el-icon>刷新</el-button
            >
          </el-form-item>
        </div>
      </el-form>
    </div>
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">用户列表</span>
            <el-tag type="success" effect="plain" class="count-tag">
              共 {{ total }} 条数据
            </el-tag>
          </div>

          <div class="header-right">
            <el-button-group>
              <el-button
                type="success"
                :disabled="!isSuperAdminUser"
                @click="handleAdd"
              >
                <el-icon> <Plus /> </el-icon>添加用户
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredUserList"
        border
        stripe
        v-loading="loading"
        style="width: 100%"
        @row-click="handleRowClick"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column width="55">
          <template #default="{ row }">
            <el-radio
              v-model="selectedUserId"
              :label="row.userId"
              @change="() => handleRadioChange(row)"
            >
              <span></span>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column
          prop="role"
          label="角色权限"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div v-for="item in row.roleList" :key="item">
              <el-tag :type="getRoleType(row.role)">
                {{ item.name }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="adminId" label="添加者" min-width="120" />
        <!-- 状态 -->
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-switch v-model="row.status" @change="handleSwitchChange(row)">
            </el-switch>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="编辑用户" placement="top">
                <el-button
                  type="primary"
                  link
                  :disabled="!isSuperAdminUser"
                  @click="handleEdit(row)"
                >
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除用户" placement="top">
                <el-button
                  type="danger"
                  link
                  :disabled="!isSuperAdminUser"
                  @click="handleDelete(row)"
                >
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

    <!-- 用户表单对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色权限" prop="roleList">
          <el-select
            v-model="userForm.roleList"
            placeholder="请选择角色"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userFormCanceled">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Plus, Edit, Delete, Refresh } from "@element-plus/icons-vue";
import {
  adminUserList, // 管理员查看所有用户信息
  adminDeleteUser, // 管理员删除用户
  adminAddUser, //管理员添加用户
  admiadminUpdaten, //修改用户信息
  updateStatus, //修改用户状态
  isSuperAdmin, //查询自己是否为超级管理员
} from "@/api/admin";

import { listAllSelectable } from "@/api/role";
// 状态变量
const loading = ref(false); //
const dialogVisible = ref(false);
const dialogTitle = ref("添加用户");
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const userList = ref([]);
const userFormRef = ref(null);
const selectedUserId = ref("");
const adminupId = ref("");
const isSuperAdminUser = ref(false); // 是否为超级管理员
// 用户表单
const userForm = ref({
  username: "",
  phone: "",
  email: "",
  roleList: "",
});
//查询
const formInline = reactive({
  username: null,
  phone: null,
});
const newRole = ref([]);
// 表单验证规则
const userRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "长度在 3 到 20 个字符", trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" },
  ],
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: "请输入正确的手机号",
      trigger: "blur",
    },
  ],
  roleList: [{ required: true, message: "请选择角色", trigger: "change" }],
};
const roleOptions = ref([]);
// 计算属性：过滤后的用户列表
const filteredUserList = ref([]);

// 添加用户
const handleAdd = async () => {
  dialogTitle.value = "添加用户";
  dialogVisible.value = true;
  await roletAllList(null);
};
//获取所有角色
const roletAllList = async (targetUserId = null) => {
  // const currentUser = await getCurrentUser();
  // console.log(currentUser, "currentUser");
  let data = targetUserId ? { targetUserId } : {};
  const res = await listAllSelectable(data);
  console.log(res.data, "res");
  newRole.value = res.data;
  roleOptions.value = res.data.map((item) => {
    return {
      value: item.id,
      label: item.name,
    };
  });
};
//编辑用户
const handleEdit = async (row) => {
  dialogTitle.value = "编辑用户";
  dialogVisible.value = true;
  userForm.value = { ...row };
  // 改为单选，只取第一个角色的ID
  if (row.roleList && row.roleList.length > 0) {
    userForm.value.roleList = row.roleList[0].id;
  } else {
    userForm.value.roleList = "";
  }
  adminupId.value = row.userId;
  await roletAllList(row.userId);
};
// 删除用户
const handleDelete = (row) => {
  console.log(row, "删除用户");
  ElMessageBox.confirm(`确定要删除用户 ${row.username} 吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    const res = await adminDeleteUser(row.userId);
    console.log(res, "删除用户");
    if (res.code == 200) {
      ElMessage.success("删除成功");
      userlistdata();
    } else {
      ElMessage.error("删除失败");
    }
  });
};
//状态
const handleSwitchChange = async (row) => {
  const id = row.userId;
  let status = {
    status: row.status === true ? 1 : 0,
  };
  let res = await updateStatus(id, status);
  if (res.code === 200) {
    ElMessage.success("状态修改成功");
  } else {
    ElMessage.error("状态修改失败");
  }
};
//重置
const resetForm = async () => {
  formInline.value = {
    username: "",
    phone: "",
  };
  selectedUserId.value = "";
  await userlistdata();
};

// 添加/编辑用户
const submitForm = async () => {
  userFormRef.value.validate(async (valid) => {
    if (valid) {
      if (dialogTitle.value === "添加用户") {
        try {
          // const filteredRoles = newRole.value.filter(item => userForm.value.roleList.includes(item.id));
          const data = {
            username: userForm.value.username,
            phone: userForm.value.phone,
            email: userForm.value.email,
            roleIds: userForm.value.roleList,
          };
          console.log(data);
          const res = await adminAddUser(data);
          console.log(res, "添加用户");
          if (res.code == 200) {
            ElMessage.success("添加成功,用户默认密码：123456");
            dialogVisible.value = false;
            userlistdata();
            userForm.value = {
              username: "",
              phone: "",
              email: "",
              roleList: "",
            };
          } else {
            ElMessage.error("添加失败");
          }
        } catch (error) {
          console.log(error);
        }
      } else {
        const filteredRole = newRole.value.find(
          (item) => item.id === userForm.value.roleList,
        );
        const data = {
          username: userForm.value.username,
          phone: userForm.value.phone,
          email: userForm.value.email,
          roleList: filteredRole ? [filteredRole] : [],
        };
        console.log(filteredRole, userForm.value.roleList, newRole.value);

        const res = await admiadminUpdaten(adminupId.value, data);
        if (res.code == 200) {
          ElMessage.success("修改成功");
          dialogVisible.value = false;
          userlistdata();
          userForm.value = {
            username: "",
            phone: "",
            email: "",
            roleList: "",
          };
        } else {
          ElMessage.error("添加失败");
        }
      }
    } else {
      return false;
    }
  });
};
const userFormCanceled = () => {
  dialogVisible.value = false;
  userForm.value = {
    username: "",
    phone: "",
    email: "",
    roleList: "",
  };
};

// 工具方法
const getRoleType = (role) => {
  const roleTypes = {
    管理员: "danger",
    操作员: "warning",
    普通用户: "info",
    超级管理员: "success",
  };
  return roleTypes[role] || "info";
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

// 获取用户列表数据
const userlistdata = async () => {
  console.log(formInline, "formInline");

  loading.value = true;
  const res = await adminUserList({
    //通过用户id进行排序排序字段（0-正序 1-倒序）
    namekeyword: formInline.username,
    phonekeyword: formInline.phone,
    // roleid: "",
    status: "",
    sort: 1,
    pageSize: pageSize.value || 5,
    pageNum: currentPage.value || 1,
  });
  console.log(res, "用户列表数据");
  if (res.code === 200) {
    filteredUserList.value = res.data.list;
    filteredUserList.value.map((item) => {
      if (item.status === 1) {
        item.status = true;
      } else {
        item.status = false;
      }
    });
    userList.value = res.data.list;
    total.value = res.data.total;
  }
  setTimeout(() => {
    loading.value = false;
  }, 500);
};
//查询
const queryData = async () => {
  await userlistdata();
};

// 解析值（确保只提交数字）
const parseNumber = (val) => {
  return val.replace(/[^0-9]/g, "");
};
// 格式化显示（移除非数字字符）
const formatNumber = (val) => {
  return val ? val.replace(/[^0-9]/g, "") : "";
};

// 修改分页处理方法
const handleSizeChange = (val) => {
  pageSize.value = val;
  userlistdata();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  userlistdata();
};

// 处理行点击
const handleRowClick = (row) => {
  selectedUserId.value = row.userId;
  console.log("选中用户:1", row);
};

// 处理单选框变化
const handleRadioChange = (row) => {
  selectedUserId.value = row.userId;
  console.log("选中用户:2", row);
};
// 生命周期钩子
onMounted(() => {
  userlistdata();
  //查询自己是否是超级管理员
  checkSuperAdminStatus();
});
watch(dialogVisible, (newValue) => {
  if (newValue === false) {
    userForm.value = {
      username: "",
      phone: "",
      email: "",
      roleList: "",
    };
  }
});
// 监听clear事件
const handleUserClea = () => {
  userlistdata();
};

// 查询自己是否是超级管理员
const checkSuperAdminStatus = async () => {
  try {
    const res = await isSuperAdmin();
    console.log(res, "超级管理员状态======");
    if (res && res.data && res.data.isSuperAdmin !== undefined) {
      isSuperAdminUser.value = res.data.isSuperAdmin === "true" || res.data.isSuperAdmin === true;
    }
    return res;
  } catch (error) {
    console.error("查询超级管理员状态失败", error);
    isSuperAdminUser.value = false;
    return false;
  }
};
</script>

<style scoped>
.user-list {
  /* padding: 20px; */
}

.SearchArea {
  background: #fff;
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 18px;
  border-radius: 8px;
  padding: 18px 0 0 20px;
  min-width: 650px;
}

.demo-form-inline {
  display: flex;
  width: 100%;
}

.form-item {
  flex: 1;
  min-width: 150px;
  max-width: 450px;
  /* 设置最小宽度，防止过小 */
  margin-right: 10px;
  /* 项之间的间距 */
}

.form-item:last-child {
  margin-right: 0;
}

.button-group {
  display: flex;
  margin-left: auto;
  /* 按钮组靠右 */
  align-items: flex-end;
  /* 垂直对齐 */
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

/* 添加单选框样式 */
:deep(.el-radio) {
  margin-right: 0;
  display: flex;
  justify-content: center;
}

:deep(.el-radio__label) {
  display: none;
}
</style>
