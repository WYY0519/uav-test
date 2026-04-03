<template>
  <div v-if="show" class="version-modal">
    <div class="version-content" ref="modalContentRef">
      <div class="version-header">
        <div class="title">What's New</div>
        <p class="desc">更新日志</p>
      </div>

      <div class="version-list">
        <div
          class="version-card"
          v-for="(item, index) in versionList"
          :key="index"
        >
          <div class="version-header-row">
            <div class="version-tag">{{ item.version }}</div>
            <div class="version-date">
              {{ item.version.match(/\((.*?)\)/)?.[1] || "" }}
            </div>
          </div>

          <div v-if="item?.add && item.add.length">
            <div
              class="update-item"
              v-for="(addItem, idx) in item.add"
              :key="`add-${idx}`"
            >
              <span class="item-dot"></span>
              <span class="tag tag-new">新增</span>
              <span class="item-text">{{ addItem.content }}</span>
            </div>
          </div>

          <div v-if="item?.repair && item.repair.length">
            <div
              class="update-item"
              v-for="(repairItem, idx) in item.repair"
              :key="`repair-${idx}`"
            >
              <span class="item-dot"></span>
              <span class="tag tag-fix">修复</span>
              <span class="item-text">{{ repairItem.content }}</span>
            </div>
          </div>

          <div v-if="item?.optimize && item.optimize.length">
            <div
              class="update-item"
              v-for="(optimizeItem, idx) in item.optimize"
              :key="`optimize-${idx}`"
            >
              <span class="item-dot"></span>
              <span class="tag tag-opt">优化</span>
              <span class="item-text">{{ optimizeItem.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  versionList: { type: Array, default: () => [] },
});

const emit = defineEmits(["close"]);
const modalContentRef = ref(null);

const handleOutsideClick = (event) => {
  if (
    props.show &&
    modalContentRef.value &&
    !modalContentRef.value.contains(event.target)
  ) {
    emit("close");
  }
};

onMounted(() => document.addEventListener("click", handleOutsideClick));
onBeforeUnmount(() =>
  document.removeEventListener("click", handleOutsideClick),
);
</script>

<style scoped>
/* 科技风遮罩层 */
.version-modal {
  position: fixed;
  inset: 0;
  background: rgba(8, 16, 34, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
  backdrop-filter: blur(6px);
}

/* 科技风弹窗主体 */
.version-content {
  width: 520px;
  max-width: 92vw;
  max-height: 80vh;
  background: #0d1b36;
  border-radius: 20px;
  border: 1px solid #253a5e;
  box-shadow:
    0 0 40px rgba(64, 158, 255, 0.15),
    0 20px 40px rgba(0, 0, 0, 0.3);
  padding: 32px;
  overflow-y: auto;
  animation: slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
}

/* 标题 */
.version-header {
  text-align: center;
  margin-bottom: 28px;
}
.title {
  font-size: 22px;
  font-weight: 700;
  color: #e6f0ff;
  margin-bottom: 6px;
  letter-spacing: 0.4px;
}
.desc {
  font-size: 13px;
  color: #8cb6e5;
  margin: 0;
}

/* 版本列表 */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 科技风版本卡片 */
.version-card {
  background: #142442;
  border-radius: 16px;
  padding: 20px;
  border-left: 5px solid #409eff;
  transition: all 0.26s ease;
  position: relative;
}
.version-card:hover {
  background: #1a2d52;
  border-left-color: #69b1ff;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.1);
}

/* 版本头部 */
.version-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.version-tag {
  background: linear-gradient(90deg, #2d7cff, #409eff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 50px;
  letter-spacing: 0.3px;
}
.version-date {
  font-size: 12px;
  color: #8cb6e5;
  font-weight: 500;
}

/* 每一项 */
.update-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  transition: all 0.2s ease;
}
.update-item:hover {
  padding-left: 4px;
}

/* 小圆点 */
.item-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #409eff;
  margin-top: 7px;
  flex-shrink: 0;
}

/* 科技风标签 */
.tag {
  padding: 2px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.tag-new {
  background: rgba(66, 184, 131, 0.15);
  color: #42b883;
  border: 1px solid rgba(66, 184, 131, 0.3);
}
.tag-fix {
  background: rgba(255, 161, 69, 0.15);
  color: #ffa145;
  border: 1px solid rgba(255, 161, 69, 0.3);
}
.tag-opt {
  background: rgba(108, 142, 255, 0.15);
  color: #6c8eff;
  border: 1px solid rgba(108, 142, 255, 0.3);
}

/* 文本 */
.item-text {
  font-size: 14px;
  line-height: 1.55;
  color: #d0e0ff;
  flex: 1;
}

/* 科技风滚动条 */
.version-content::-webkit-scrollbar {
  width: 6px;
}
.version-content::-webkit-scrollbar-track {
  background: #111d35;
  border-radius: 10px;
}
.version-content::-webkit-scrollbar-thumb {
  background: #305999;
  border-radius: 10px;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
