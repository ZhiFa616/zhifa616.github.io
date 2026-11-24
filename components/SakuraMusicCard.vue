<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import type { App } from 'vue'
import { createApp } from 'vue'
import { useRoute } from 'vue-router'
import MusicCardPlayer from './MusicCardPlayer.vue'
import { isHomePaginationPath, resolveHomePageIndex } from '../utils/homePagination'

const SLOT_ID = 'sakura-music-slot'

const route = useRoute()
// 首页第一页始终展示；翻页后手机端隐藏，电脑端（>=768px）与其他侧栏一起保留
const isHome = computed(() => {
  if (!isHomePaginationPath(route.path))
    return false
  if (resolveHomePageIndex(route) <= 1)
    return true
  if (typeof window === 'undefined')
    return false
  return window.matchMedia('(min-width: 768px)').matches
})

let musicApp: App | null = null

function destroyPlayer() {
  if (!musicApp)
    return
  try {
    musicApp.unmount()
  }
  catch {}
  musicApp = null
}

async function setup() {
  if (typeof document === 'undefined')
    return

  destroyPlayer()

  if (!isHome.value)
    return

  await nextTick()

  for (let i = 0; i < 30; i++) {
    const notice = document.querySelector('.notice-board-wrap')
    if (notice && notice.parentElement) {
      let slot = document.getElementById(SLOT_ID)
      if (!slot) {
        slot = document.createElement('div')
        slot.id = SLOT_ID
        slot.className = 'sakura-music-slot'
        notice.parentElement.insertBefore(slot, notice)
      }
      slot.innerHTML = ''
      musicApp = createApp(MusicCardPlayer)
      musicApp.mount(slot)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 120))
  }
}

watch([isHome, () => route.path], setup, { immediate: true })

onMounted(() => {
  setup()
})

onBeforeUnmount(() => {
  destroyPlayer()
})
</script>

<template>
  <span style="display:none" aria-hidden="true" />
</template>

<style lang="scss">
.sakura-music-slot {
  width: 100%;
}
</style>
