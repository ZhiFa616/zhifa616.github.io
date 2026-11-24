<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores/app.ts'
import { resolveHomePageIndex } from '../utils/homePagination'

const route = useRoute()
const sakura = useSakuraAppStore()

const pageIndex = computed(() => resolveHomePageIndex(route))

// 第一页展示完整内容；翻页后手机端只留文章，电脑端保留左右栏
const isFirstPage = computed(() => pageIndex.value <= 1)

// 与主题一致的 md 断点（768px）：桌面端保留左右两栏
const isWideScreen = ref(false)
let mql: MediaQueryList | null = null

function syncWideScreen() {
  if (typeof window === 'undefined')
    return
  isWideScreen.value = window.matchMedia('(min-width: 768px)').matches
}

function handleMediaChange(event: MediaQueryListEvent) {
  isWideScreen.value = event.matches
}

onMounted(() => {
  if (typeof window === 'undefined')
    return
  mql = window.matchMedia('(min-width: 768px)')
  isWideScreen.value = mql.matches
  mql.addEventListener('change', handleMediaChange)
})

// 翻页时重新读取一次，避免跨路由复用组件时沿用旧值
watch(() => route.path, syncWideScreen, { immediate: true })

onBeforeUnmount(() => {
  mql?.removeEventListener('change', handleMediaChange)
  mql = null
})

sakura.curPage = pageIndex.value

watch(pageIndex, (value) => {
  sakura.curPage = value
}, { immediate: true })
</script>

<template>
  <!-- 第一页：头像卡 + 公告 + 随机文章/评论 + 最热文章 -->
  <SakuraHomeLayout v-if="isFirstPage">
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

  <!-- 第 2 页起 · 电脑端：左右两栏保持不变，只去掉顶部最热文章 -->
  <SakuraHomeLayout v-else-if="isWideScreen">
    <!-- 翻页页不渲染首屏大图，只留导航栏高度的空位，进入页面即是文章列表 -->
    <template #hero>
      <div class="sakura-page-top-spacer" />
    </template>

    <template #notice-board>
      <span class="hidden" />
    </template>

    <template #post-pinned>
      <span class="hidden" />
    </template>

    <template #left>
      <SakuraSiteInfoCard />
      <SakuraNoticeBoard class="mt-6" />
    </template>

    <template #right>
      <SakuraRandomPosts />
      <SakuraRandomComments />
    </template>
  </SakuraHomeLayout>

  <!-- 第 2 页起 · 手机端：不传侧栏插槽，布局自动收成单列，文章补满空出的位置 -->
  <SakuraHomeLayout v-else>
    <template #hero>
      <div class="sakura-page-top-spacer" />
    </template>

    <template #notice-board>
      <span class="hidden" />
    </template>

    <template #post-pinned>
      <span class="hidden" />
    </template>
  </SakuraHomeLayout>
</template>
