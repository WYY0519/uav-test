<template>
  <el-dialog v-model="innerVisible" title="冲突详情" width="600px" destroy-on-close>
    <template v-if="data">
      <!-- 关键改动：加上 label-width="120px" -->
      <el-descriptions :column="1" border label-width="120px">
        <el-descriptions-item label="航线名称">{{ data.routeName }}</el-descriptions-item>
        <el-descriptions-item label="禁飞区名称">{{ data.zoneName }}</el-descriptions-item>

        <el-descriptions-item label="冲突类型">
          <el-tag type="danger" size="small">
            {{ getNotifyType(data.notifyType) }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="提醒时间">
          {{ data.createTime || '-' }}
        </el-descriptions-item>

        <el-descriptions-item label="处理时间">
          {{ data.handleTime || '未处理' }}
        </el-descriptions-item>

        <el-descriptions-item label="处理状态">
          <el-tag :type="data.status === 0 ? 'warning' : 'success'" size="small">
            {{ data.status === 0 ? '未处理' : '已处理' }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="标题">
          {{ data.title || '-' }}
        </el-descriptions-item>

        <el-descriptions-item label="冲突描述">
          {{ data.content || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

const innerVisible = computed({
  get() {
    return props.visible
  },
  set(val) {
    emit('update:visible', val)
  }
})

// 冲突类型文字
const getNotifyType = (type) => {
  if (type === 'ROUTE_NOFLYZONE_CONFLICT') return '航线禁飞区冲突'
  return '未知类型'
}
</script>