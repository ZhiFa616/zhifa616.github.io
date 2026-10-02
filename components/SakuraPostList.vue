<script setup lang="ts">
import type { Post } from 'valaxy'
import type { CSSProperties } from 'vue'
import { computed } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { usePostList, useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import type { ResponsiveBreakpoints } from '../node_modules/valaxy-theme-sakura/types'

const props = defineProps<{
  icon?: string
  text?: string
  posts?: Post[]
  responsive?: ResponsiveBreakpoints
}>()

const themeConfig = useThemeConfig()
const postsList = usePostList()
const breakpoints = useBreakpoints(breakpointsTailwind)

const isImageReversed = computed(() => themeConfig.value.postList?.isImageReversed)

const icon = computed(() => props.icon ?? themeConfig.value.ui.postList?.icon)
const text = computed(() => props.text ?? themeConfig.value.postList?.text)
const posts = computed(() => props.posts || postsList.value)
const responsive = computed(() => props.responsive || themeConfig.value.ui.postList?.responsive || {})

const cols = computed(() => {
  const keys: (keyof typeof breakpointsTailwind)[] = ['2xl', 'xl', 'lg', 'md', 'sm']
  // 客户端：按视口断点匹配
  for (const key of keys) {
    if (breakpoints[key].value && responsive.value[key]) {
      return responsive.value[key]
    }
  }
  // SSR/构建：无法检测视口，采用配置中最大的桌面列数，保证静态产物即为多列
  for (const key of keys) {
    if (responsive.value[key]) {
      return responsive.value[key]
    }
  }
  return 1
})

const parts = computed(() => {
  const result = Array.from({ length: cols.value }, () => [] as typeof posts.value)
  posts.value.forEach((item, i) => {
    result[i % cols.value].push(item)
  })
  return result
})

const breakpointsStyle = computed<CSSProperties>(() => {
  return { 'grid-template-columns': `repeat(${cols.value}, minmax(0, 1fr))` }
})
</script>

<template>
  <div id="home-post-list" class="sakura-post-list">
    <SakuraDivider :icon :text />
    <div :style="breakpointsStyle" class="post-list-container" grid="~ gap-3">
      <div v-for="items, idx of parts" :key="idx" class="post-list-section" flex="~ col" grid="gap-4 md:gap-5">
        <SakuraPostCard v-for="(post, index) of items" :id="`article-${index * parts.length + idx}`" :key="post.path || index" :cols class="article-list" :position="(index % 2 === (isImageReversed ? 1 : 0) ? 'left' : 'right')" :post />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post-list-container,
.post-list-section {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}
</style>
