<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

withDefaults(defineProps<{ variant?: 'sidebar' | 'aside' }>(), { variant: 'sidebar' })

const STORAGE_KEY = 'sakura-pink-mode'
const PREV_DARK_KEY = 'sakura-pink-prev-dark'
const SYNC_EVENT = 'sakura-pink-change'

const active = ref(false)

if (typeof window !== 'undefined') {
  active.value = localStorage.getItem(STORAGE_KEY) === '1'
  if (active.value) {
    document.documentElement.classList.add('pink')
    document.documentElement.classList.remove('dark')
  }
}

/* 侧边栏与右栏是两个独立挂载的实例，靠自定义事件保持状态一致 */
function syncState() {
  if (typeof window === 'undefined')
    return
  active.value = localStorage.getItem(STORAGE_KEY) === '1'
}
window.addEventListener(SYNC_EVENT, syncState)
onBeforeUnmount(() => window.removeEventListener(SYNC_EVENT, syncState))

function applyPink(on: boolean) {
  const html = document.documentElement
  if (on) {
    localStorage.setItem(PREV_DARK_KEY, html.classList.contains('dark') ? '1' : '0')
    html.classList.add('pink')
    html.classList.remove('dark')
  }
  else {
    html.classList.remove('pink')
    if (localStorage.getItem(PREV_DARK_KEY) === '1')
      html.classList.add('dark')
    localStorage.removeItem(PREV_DARK_KEY)
  }
  localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  window.dispatchEvent(new CustomEvent(SYNC_EVENT))
}

function toggle() {
  active.value = !active.value
  applyPink(active.value)
}
</script>

<template>
  <button
    type="button"
    class="pink-toggle"
    :class="[`is-${variant}`, { 'is-active': active }]"
    :aria-pressed="active"
    @click="toggle"
  >
    <span class="pink-toggle__ico" aria-hidden="true">🌸</span>
    <span class="pink-toggle__text">{{ active ? '粉色模式 · 已开启' : '切换到粉色模式' }}</span>
  </button>
</template>

<style lang="scss" scoped>
.pink-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 14px;
  border: 1px solid #f7c8d8;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff0f5 0%, #ffe0ea 50%, #ffd0e0 100%);
  color: #a84368;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.4px;
  cursor: pointer;
  box-shadow: 0 6px 16px -10px rgb(220 120 155 / 55%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.35s ease,
    color 0.35s ease,
    border-color 0.35s ease;
}

.pink-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -12px rgb(220 120 155 / 75%);
}

.pink-toggle:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px -8px rgb(220 120 155 / 60%);
}

.pink-toggle__ico {
  font-size: 13px;
  line-height: 1;
}

.pink-toggle__text {
  line-height: 1.2;
  white-space: nowrap;
}

.pink-toggle.is-active {
  border-color: #f0839f;
  background: linear-gradient(135deg, #ffa8c2 0%, #f97ba4 55%, #ee6d97 100%);
  color: #fff;
  box-shadow: 0 8px 20px -10px rgb(238 109 151 / 80%);
}

.pink-toggle.is-sidebar {
  font-size: 13px;
}

.pink-toggle.is-aside {
  padding: 9px 16px;
  font-size: 13.5px;
}
</style>
