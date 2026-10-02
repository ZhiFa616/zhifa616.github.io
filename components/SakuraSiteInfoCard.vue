<script lang="ts" setup>
import { useSiteConfig, useSiteStore } from 'valaxy'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAddonVercount } from 'valaxy-addon-vercount'

const siteConfig = useSiteConfig()
const site = useSiteStore()
const router = useRouter()

const { site: visitSite } = useAddonVercount()

// 总字数：构建脚本生成 public/words.json（所有文章 wordCount 合计）
const totalWords = ref(0)

onMounted(async () => {
  try {
    const r = await fetch('/words.json')
    const d = await r.json()
    if (d && typeof d.total === 'number')
      totalWords.value = d.total
  }
  catch {}
})

function formatK(n: number): string {
  if (Number.isNaN(n) || n === 0)
    return '0'
  if (n >= 10000)
    return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000)
    return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const wordsText = computed(() => formatK(totalWords.value))
const pvText = computed(() => {
  const pv = visitSite.value?.pv as number | undefined
  return pv == null ? '...' : formatK(pv)
})
</script>

<template>
  <SakuraCard class="sakura-card sakura-site-info-card">
    <RouterLink class="site-author-avatar" to="/about">
      <img class="rounded-full" :src="siteConfig.author.avatar" alt="avatar">
      <span class="site-author-status" :title="siteConfig.author.status.message">{{ siteConfig.author.status.emoji }}</span>
    </RouterLink>
    <div
      class="site-author-name leading-6"
      m="t-0 b-4"
    >
      <RouterLink to="/about">
        {{ siteConfig.author.name }}
      </RouterLink>
    </div>
    <RouterLink v-if="router.hasRoute('/about/site')" to="/about/site" class="site-name">
      {{ siteConfig.title }}
    </RouterLink>
    <span v-else class="site-name">{{ siteConfig.title }}</span>
    <h4 v-if="siteConfig.subtitle" class="site-subtitle block" text="xs">
      {{ siteConfig.subtitle }}
    </h4>
    <div v-if="siteConfig.description" class="site-description my-1">
      {{ siteConfig.description }}
    </div>

    <div class="content-container grid grid-cols-3 gap-x-8">
      <div class="article">
        <span class="content-text">文章</span><br>
        <span class="content-number">{{ site.postList.length }}</span>
      </div>
      <div class="label">
        <span class="content-text">字数</span><br>
        <span class="content-number">{{ wordsText }}</span>
      </div>
      <div class="category">
        <span class="content-text">访问</span><br>
        <span class="content-number">{{ pvText }}</span>
      </div>
    </div>
  </SakuraCard>
</template>

<style lang="scss" scoped>
.sakura-site-info-card {
  padding: 20px 24px;
}

.content-container {
  text-align: center;
  margin-top: 14px;
}

.content-text {
  font-size: 1rem;
  line-height: 1.5rem;
}

.content-number {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
}
</style>
