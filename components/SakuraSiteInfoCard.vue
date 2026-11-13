<script lang="ts" setup>
import { useSiteConfig, useThemeConfig } from 'valaxy'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const siteConfig = useSiteConfig()
const themeConfig = useThemeConfig()
const router = useRouter()

// 总字数：构建脚本生成 public/words.json（所有文章 wordCount 合计）
const totalWords = ref(0)

// 运行天数：起始日取自 valaxy.config.ts 的 themeConfig.footer.runtimeSince，
// 解析方式与 components/SakuraFooter.vue 完全一致（本地时间 0 点起算，floor 取整天）
const RUNTIME_SINCE_FALLBACK = '2026-09-13'

function parseRuntimeStart(since: string): Date | null {
  const trimmed = since.trim()
  // 显式按东八区 0 点解析：构建（UTC 环境）与浏览器得到同一时刻，避免 SSG 少算一天
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const start = new Date(`${trimmed}T00:00:00+08:00`)
    return Number.isNaN(start.getTime()) ? null : start
  }
  const start = new Date(trimmed)
  return Number.isNaN(start.getTime()) ? null : start
}

function calcRuntimeDays(): number {
  const footer = (themeConfig.value as { footer?: { runtimeSince?: string } } | undefined)?.footer
  const since = footer?.runtimeSince || RUNTIME_SINCE_FALLBACK
  const start = parseRuntimeStart(since)
  if (!start)
    return 0
  const diff = Date.now() - start.getTime()
  return diff < 0 ? 0 : Math.floor(diff / 86_400_000)
}

const runtimeDays = ref(calcRuntimeDays())

// 访问量：vercount 固定统计线上域名 mcntsb.club（避免本地预览 localhost 的共享计数）
const pvText = ref('...')

onMounted(async () => {
  // 每次进站按当前时间重算，避免构建时固化
  runtimeDays.value = calcRuntimeDays()

  try {
    const r = await fetch('/words.json')
    const d = await r.json()
    if (d && typeof d.total === 'number')
      totalWords.value = d.total
  }
  catch {}

  try {
    const res = await fetch('https://cn.vercount.one/api/v2/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://mcntsb.club/' }),
    })
    const data = await res.json()
    const pv: number = data?.data?.site_pv
    if (typeof pv === 'number')
      pvText.value = formatK(pv)
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
        <span class="content-text">运行天数</span><br>
        <span class="content-number">{{ runtimeDays }}</span>
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
