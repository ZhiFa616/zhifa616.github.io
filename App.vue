<script setup lang="ts">
import { useSiteConfig } from 'valaxy'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ImageGalleryViewer from './components/ImageGalleryViewer.vue'
import SakuraDanglingDoll from './components/SakuraDanglingDoll.vue'
import SakuraSnowfall from './components/SakuraSnowfall.vue'
import SakuraClickEffect from './components/SakuraClickEffect.vue'
import SakuraMusicCard from './components/SakuraMusicCard.vue'
import { applyCodeBlockFold, initCodeBlockFold } from './utils/collapseCode'
import { initImageGallery } from './utils/imageGallery'
import { isHomePaginationPath } from './utils/homePagination'
import { mountPinkMode, unmountPinkMode } from './utils/pinkMode'
import { mountCommentTweak, unmountCommentTweak } from './utils/commentTweak'
import { useSakuraAppStore } from './node_modules/valaxy-theme-sakura/stores/app.ts'

const route = useRoute()
const router = useRouter()
const siteConfig = useSiteConfig()
const sakura = useSakuraAppStore()

function setupCodeBlockFold() {
  const limit = siteConfig.value.codeHeightLimit
  if (typeof limit === 'number' && limit > 0)
    initCodeBlockFold(limit)
}

const CHUNK_RELOAD_KEY = 'valaxy-chunk-reload'

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error)
  const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)
  if (!isChunkError)
    return

  const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY)
  if (reloaded === to.fullPath) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, to.fullPath)
  window.location.assign(to.fullPath)
})

const PAGE_TURN_CLASS = 'is-page-turn'
let pageTurnTimer: ReturnType<typeof setTimeout> | null = null

function markPageTurn() {
  if (typeof document === 'undefined')
    return
  const root = document.documentElement
  root.classList.remove(PAGE_TURN_CLASS)
  // 强制回流，保证连续翻页时动画能重新播放
  void root.offsetWidth
  root.classList.add(PAGE_TURN_CLASS)
  if (pageTurnTimer)
    clearTimeout(pageTurnTimer)
  pageTurnTimer = setTimeout(() => {
    root.classList.remove(PAGE_TURN_CLASS)
    pageTurnTimer = null
  }, 720)
}

const PAGINATION_LINK_RE = /^\/page\/(\d+)\/?$/

let suppressAutoScroll = false
let pageTransitionRunning = false

function pageNumberFromPath(path: string) {
  const match = path.match(/^\/page\/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 1
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function goToPage(href: string, direction: 'forward' | 'backward') {
  if (pageTransitionRunning)
    return

  // 这套流程自己负责滚动，让 afterEach 的自动滚动让路
  suppressAutoScroll = true

  // 翻页页的首屏就是文章列表，先把旧页滚回顶部，新旧快照才对得上
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

  const run = async () => {
    await router.push(href)
    await nextTick()
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    sakura.setScrollPosition(href, 0)
  }

  const vtDocument = document as Document & {
    startViewTransition?: (callback: () => Promise<void>) => { finished: Promise<void> }
  }

  if (!vtDocument.startViewTransition || prefersReducedMotion()) {
    markPageTurn()
    await run()
    suppressAutoScroll = false
    return
  }

  const root = document.documentElement
  pageTransitionRunning = true
  root.classList.add('is-page-vt', `pt-${direction}`)

  try {
    const transition = vtDocument.startViewTransition(run)
    // 个别情况下 finished 迟迟不 resolve，加个上限，避免状态一直卡在“过渡中”
    await Promise.race([
      transition.finished.catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ])
  }
  catch {
    // 浏览器拒绝开启过渡时退回淡入动画
    markPageTurn()
    await run().catch(() => {})
  }
  finally {
    pageTransitionRunning = false
    suppressAutoScroll = false
    root.classList.remove('is-page-vt', `pt-${direction}`)

    // 右栏评论、音乐卡这类内容异步落位时会被浏览器的滚动锚定带偏，补正两次
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 220)
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 600)
  }
}

function handlePaginationClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return
  if (pageTransitionRunning)
    return

  const link = (event.target as HTMLElement | null)?.closest?.('a')
  if (!link || !link.closest('.sakura-pagination-standard, .pagination'))
    return

  const href = link.getAttribute('href')
  if (!href || href === route.path)
    return
  // 只接管首页分页（/ 或 /page/N），其他链接交回路由处理
  if (!isHomePaginationPath(href))
    return

  const page = href === '/' ? 1 : Number.parseInt(PAGINATION_LINK_RE.exec(href)?.[1] ?? '', 10)
  if (!page)
    return

  event.preventDefault()
  // 失焦，避免浏览器把焦点所在的旧分页按钮滚回视口，和归顶动作来回顶牛
  link.blur()
  const current = pageNumberFromPath(route.path)
  void goToPage(href, page > current ? 'forward' : 'backward')
}

router.afterEach((to, from) => {
  if (suppressAutoScroll) {
    suppressAutoScroll = false
    return
  }
  if (to.hash)
    return

  if (
    isHomePaginationPath(to.path)
    && isHomePaginationPath(from.path)
    && to.path !== from.path
  ) {
    // 翻页页首屏就是列表，统一回到顶部
    nextTick(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      sakura.setScrollPosition(to.path, 0)
    })
  }
})

initImageGallery()
setupCodeBlockFold()

onMounted(() => {
  mountPinkMode()
  mountCommentTweak()
  document.addEventListener('click', handlePaginationClick, true)
})

onBeforeUnmount(() => {
  unmountPinkMode()
  unmountCommentTweak()
  document.removeEventListener('click', handlePaginationClick, true)
})

watch(() => route.path, () => {
  nextTick(() => applyCodeBlockFold())
})
</script>

<template>
  <ImageGalleryViewer />
  <SakuraDanglingDoll />
  <SakuraMusicCard />
  <SakuraSnowfall />
  <SakuraClickEffect />
</template>
