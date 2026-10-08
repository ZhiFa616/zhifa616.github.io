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
      <span class="hidden" />
    </template>

    <!-- 中间顶部：四篇推荐卡片（可左右切换） -->
    <template #post-pinned>
      <SakuraFeaturedPosts />
    </template>

    <!-- 左侧栏：头像 + 公告 -->
    <template #left>
      <SakuraSiteInfoCard />
      <SakuraNoticeBoard class="mt-6" />
    </template>

    <!-- 右侧栏：随机文章 + 随机评论 -->
    <template #right>
      <SakuraRandomPosts />
      <SakuraRandomComments />
    </template>
  </SakuraHomeLayout>
</template>
