<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores/app.ts'
import { resolveHomePageIndex } from '../utils/homePagination'

const route = useRoute()
const sakura = useSakuraAppStore()

const pageIndex = computed(() => resolveHomePageIndex(route))

sakura.curPage = pageIndex.value

watch(pageIndex, (value) => {
  sakura.curPage = value
}, { immediate: true })
</script>

<template>
  <SakuraHomeLayout>
    <!-- 公告移到左侧栏，中间不再显示 -->
    <template #notice-board>
    </template>

    <!-- 左侧栏：头像 + 公告 -->
    <template #left>
      <SakuraSiteInfoCard />
      <SakuraNoticeBoard class="mt-6" />
    </template>

    <!-- 右侧栏：随机文章 -->
    <template #right>
      <SakuraRandomPosts />
    </template>
  </SakuraHomeLayout>
</template>

<style>
/* 三栏布局：左 250px / 中间自适应 / 右 280px（参考 daily.yybb.us） */
.sakura-home-layout.sakura-triple-columns {
  @media (min-width: 1024px) {
    grid-template-columns: 250px minmax(0, 1fr) 280px !important;
  }

  @media (min-width: 1280px) {
    grid-template-columns: 250px minmax(0, 1fr) 280px !important;
  }
}

/* 侧栏卡片之间留间距 */
.sakura-home-layout aside > * + * {
  margin-top: 1rem;
}
</style>
