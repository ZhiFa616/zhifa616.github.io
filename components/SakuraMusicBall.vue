<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const MUSIC_SRC = '/music/kogda-ya-ujdu.m4a'

const audioRef = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const loading = ref(true)

function toggle() {
  const audio = audioRef.value
  if (!audio)
    return
  if (audio.paused)
    audio.play().catch(() => {})
  else
    audio.pause()
}

let cleanups: Array<() => void> = []

onMounted(() => {
  const audio = audioRef.value
  if (!audio)
    return

  audio.volume = 0.55

  const onPlay = () => { playing.value = true }
  const onPause = () => { playing.value = false }
  const onReady = () => { loading.value = false }
  const onError = () => { loading.value = false }

  audio.addEventListener('play', onPlay)
  audio.addEventListener('pause', onPause)
  audio.addEventListener('canplay', onReady)
  audio.addEventListener('error', onError)
  cleanups.push(() => {
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.removeEventListener('canplay', onReady)
    audio.removeEventListener('error', onError)
  })

  // 优先尝试自动播放（浏览器允许时立即响）
  audio.play().catch(() => {})

  // 被浏览器拦截时，用户第一次交互后自动开始
  const events = ['pointerdown', 'touchstart', 'keydown'] as const
  const onFirstInteraction = (event: Event) => {
    const target = event.target as HTMLElement | null
    // 点击悬浮球本身由 click 处理，避免一次点击触发两次切换
    if (target?.closest?.('.sakura-music-ball'))
      return
    if (audio.paused)
      audio.play().catch(() => {})
    events.forEach(name => window.removeEventListener(name, onFirstInteraction))
  }
  events.forEach(name => window.addEventListener(name, onFirstInteraction, { passive: true }))
  cleanups.push(() => events.forEach(name => window.removeEventListener(name, onFirstInteraction)))

  // 吊绳娃娃点击时联动
  const onToggleRequest = () => toggle()
  window.addEventListener('sakura-music-toggle', onToggleRequest)
  cleanups.push(() => window.removeEventListener('sakura-music-toggle', onToggleRequest))
})

onBeforeUnmount(() => {
  cleanups.forEach(fn => fn())
  cleanups = []
})
</script>

<template>
  <div
    class="sakura-music-ball"
    :class="{ 'is-playing': playing, 'is-loading': loading }"
    role="button"
    tabindex="0"
    :aria-label="playing ? '暂停背景音乐：Когда я уйду' : '播放背景音乐：Когда я уйду'"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <audio ref="audioRef" :src="MUSIC_SRC" loop preload="auto" />

    <span class="sakura-music-ball__ring" aria-hidden="true" />

    <div v-if="playing" class="sakura-music-ball__eq" aria-hidden="true">
      <span /><span /><span /><span />
    </div>
    <svg v-else class="sakura-music-ball__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>

    <span class="sakura-music-ball__tip" aria-hidden="true">Когда я уйду · EMIN</span>
  </div>
</template>

<style lang="scss">
.sakura-music-ball {
  position: fixed;
  left: 26px;
  bottom: 26px;
  z-index: 260;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  background:
    radial-gradient(circle at 32% 24%, #fff5f6 0%, #f8bcc2 34%, #e79ba2 62%, #c97480 100%);
  box-shadow:
    0 12px 26px rgba(223, 145, 147, 0.42),
    0 3px 8px rgba(90, 40, 45, 0.18),
    inset 0 2px 6px rgba(255, 255, 255, 0.75),
    inset 0 -7px 14px rgba(170, 80, 92, 0.32);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.07);
  }

  .sakura-music-ball__ring {
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    opacity: 0;
    background: conic-gradient(
      from 0deg,
      rgba(223, 145, 147, 0.95),
      rgba(255, 255, 255, 0.18),
      rgba(223, 145, 147, 0.55),
      rgba(255, 255, 255, 0.14),
      rgba(223, 145, 147, 0.95)
    );
    mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
    transition: opacity 0.4s ease;
  }

  &.is-playing .sakura-music-ball__ring {
    opacity: 1;
    animation: sakura-music-spin 3.2s linear infinite;
  }

  .sakura-music-ball__icon {
    width: 24px;
    height: 24px;
    fill: #fff;
    filter: drop-shadow(0 1px 2px rgba(120, 50, 60, 0.35));
  }

  .sakura-music-ball__eq {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 20px;

    span {
      width: 3px;
      height: 6px;
      border-radius: 2px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(120, 50, 60, 0.3);
      animation: sakura-music-eq 1s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.18s; }
      &:nth-child(3) { animation-delay: 0.36s; }
      &:nth-child(4) { animation-delay: 0.1s; }
    }
  }

  &.is-loading .sakura-music-ball__eq span,
  &.is-loading .sakura-music-ball__icon {
    opacity: 0.55;
  }

  .sakura-music-ball__tip {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 12px);
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(28, 22, 24, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(10px);
    color: #fff;
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, 6px);
    transition: opacity 0.25s ease, transform 0.25s ease;
  }

  &:hover .sakura-music-ball__tip {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  @media (max-width: 768px) {
    left: 16px;
    bottom: 18px;
    width: 54px;
    height: 54px;

    .sakura-music-ball__icon {
      width: 20px;
      height: 20px;
    }

    .sakura-music-ball__tip {
      display: none;
    }
  }
}

@keyframes sakura-music-spin {
  to { transform: rotate(360deg); }
}

@keyframes sakura-music-eq {
  0%, 100% { height: 6px; }
  50% { height: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-music-ball__ring,
  .sakura-music-ball__eq span {
    animation: none !important;
  }
}
</style>
