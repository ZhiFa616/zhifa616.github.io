<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const MUSIC_SRC = '/music/kogda-ya-ujdu.m4a'
const COVER_SRC = '/music/kogda-ya-ujdu.jpg'

const audioRef = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const loading = ref(true)
const current = ref(0)
const duration = ref(0)
const volume = ref(0.55)
const volumeDragging = ref(false)
const volumeTrackRef = ref<HTMLElement | null>(null)

const progress = computed(() => (duration.value > 0 ? Math.min(100, (current.value / duration.value) * 100) : 0))

function toggle() {
  const audio = audioRef.value
  if (!audio)
    return
  if (audio.paused)
    audio.play().catch(() => {})
  else
    audio.pause()
}

function seek(event: MouseEvent) {
  const audio = audioRef.value
  if (!audio || !duration.value)
    return
  const track = event.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  audio.currentTime = ratio * duration.value
  current.value = audio.currentTime
}

function applyVolume(clientX: number) {
  const track = volumeTrackRef.value
  const audio = audioRef.value
  if (!track || !audio)
    return
  const rect = track.getBoundingClientRect()
  if (!rect.width)
    return
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  volume.value = ratio
  audio.volume = ratio
  audio.muted = ratio === 0
}

function onVolumeDown(event: PointerEvent) {
  const track = event.currentTarget as HTMLElement
  volumeDragging.value = true
  try {
    track.setPointerCapture(event.pointerId)
  }
  catch {}
  applyVolume(event.clientX)
}

function onVolumeMove(event: PointerEvent) {
  if (!volumeDragging.value)
    return
  if (event.buttons === 0) {
    volumeDragging.value = false
    return
  }
  applyVolume(event.clientX)
}

function onVolumeUp() {
  volumeDragging.value = false
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

let cleanups: Array<() => void> = []

onMounted(() => {
  const audio = audioRef.value
  if (!audio)
    return

  volume.value = 0.55
  audio.volume = 0.55
  audio.muted = false

  const onPlay = () => { playing.value = true }
  const onPause = () => { playing.value = false }
  const onTime = () => { current.value = audio.currentTime }
  const onMeta = () => {
    duration.value = Number.isFinite(audio.duration) ? audio.duration : 0
    loading.value = false
  }
  const onReady = () => { loading.value = false }
  const onError = () => { loading.value = false }

  audio.addEventListener('play', onPlay)
  audio.addEventListener('pause', onPause)
  audio.addEventListener('timeupdate', onTime)
  audio.addEventListener('loadedmetadata', onMeta)
  audio.addEventListener('canplay', onReady)
  audio.addEventListener('error', onError)
  cleanups.push(() => {
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.removeEventListener('timeupdate', onTime)
    audio.removeEventListener('loadedmetadata', onMeta)
    audio.removeEventListener('canplay', onReady)
    audio.removeEventListener('error', onError)
  })

  audio.play().catch(() => {})

  const events = ['pointerdown', 'touchstart', 'keydown'] as const
  const onFirstInteraction = (event: Event) => {
    const target = event.target as HTMLElement | null
    if (target?.closest?.('.sakura-music-card'))
      return
    if (audio.paused)
      audio.play().catch(() => {})
    events.forEach(name => window.removeEventListener(name, onFirstInteraction))
  }
  events.forEach(name => window.addEventListener(name, onFirstInteraction, { passive: true }))
  cleanups.push(() => events.forEach(name => window.removeEventListener(name, onFirstInteraction)))

  const onWindowPointerUp = () => { volumeDragging.value = false }
  window.addEventListener('pointerup', onWindowPointerUp)
  cleanups.push(() => window.removeEventListener('pointerup', onWindowPointerUp))

  window.addEventListener('sakura-music-toggle', toggle)
  cleanups.push(() => window.removeEventListener('sakura-music-toggle', toggle))
})

onBeforeUnmount(() => {
  cleanups.forEach(fn => fn())
  cleanups = []
})
</script>

<template>
  <section class="sakura-music-card-wrap">
    <div class="sakura-card sakura-music-card" :class="{ 'is-playing': playing, 'is-loading': loading }">
      <audio ref="audioRef" :src="MUSIC_SRC" loop preload="auto" />

      <div class="sakura-music-card__head">
        <h3 class="sakura-music-card__heading">
          背景音乐
        </h3>
        <span class="sakura-music-card__badge">{{ playing ? '正在播放' : '已暂停' }}</span>
      </div>

      <div class="sakura-music-card__inner">
        <button
          class="sakura-music-card__cover"
          type="button"
          :aria-label="playing ? '暂停背景音乐：Когда я уйду' : '播放背景音乐：Когда я уйду'"
          @click="toggle"
        >
          <img :src="COVER_SRC" alt="Когда я уйду 封面" draggable="false">
          <span class="sakura-music-card__shade" aria-hidden="true" />
          <span v-if="playing" class="sakura-music-card__eq" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          <svg v-else class="sakura-music-card__play" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.6 5.4 19 12l-10.4 6.6z" />
          </svg>
        </button>

        <div class="sakura-music-card__body">
          <p class="sakura-music-card__title">
            Когда я уйду
          </p>
          <p class="sakura-music-card__artist">
            EMIN · 当我离开时
          </p>

          <div
            class="sakura-music-card__bar"
            role="slider"
            tabindex="0"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(progress)"
            aria-label="播放进度"
            @click="seek"
          >
            <span class="sakura-music-card__bar-fill" :style="{ width: `${progress}%` }" />
            <span class="sakura-music-card__bar-dot" :style="{ left: `${progress}%` }" />
          </div>

          <div class="sakura-music-card__time">
            <span>{{ fmt(current) }}</span>
            <span>{{ fmt(duration) }}</span>
          </div>

          <div class="sakura-music-card__volume">
            <svg class="sakura-music-card__volume-icon" :class="{ 'is-muted': volume === 0 }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.2v5.6h3.4L12 18.4V5.6L7.4 9.2H4z" fill="currentColor" />
              <path v-if="volume > 0.02" d="M15.4 8.6a4.6 4.6 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path v-if="volume > 0.4" d="M17.8 6.4a7.6 7.6 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <div
              ref="volumeTrackRef"
              class="sakura-music-card__vbar"
              role="slider"
              :aria-valuemin="0"
              :aria-valuemax="100"
              :aria-valuenow="Math.round(volume * 100)"
              aria-label="音量"
              @pointerdown="onVolumeDown"
              @pointermove="onVolumeMove"
              @pointerup="onVolumeUp"
              @pointercancel="onVolumeUp"
            >
              <span class="sakura-music-card__vbar-fill" :style="{ width: `${volume * 100}%` }" />
              <span class="sakura-music-card__vbar-dot" :style="{ left: `${volume * 100}%` }" />
            </div>
            <span class="sakura-music-card__volume-value">{{ Math.round(volume * 100) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.sakura-music-card-wrap {
  width: 100%;
  margin-top: 1.5rem;
}

.sakura-music-card {
  padding: 14px 16px 12px;
  border-radius: var(--sakura-radius, 16px);
  transition: box-shadow 0.3s ease;

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__heading {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--va-c-text, #4a2a2f);
  }

  &__badge {
    font-size: 10px;
    letter-spacing: 0.02em;
    color: rgba(120, 70, 78, 0.55);
    white-space: nowrap;
  }

  &__inner {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__cover {
    position: relative;
    display: block;
    flex: 0 0 auto;
    width: 64px;
    height: 64px;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 14px;
    background: #f3d7da;
    box-shadow: 0 6px 16px rgba(160, 90, 100, 0.22);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    &:hover img {
      transform: scale(1.06);
    }
  }

  &__shade {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 45%, rgba(38, 18, 22, 0.3), rgba(30, 14, 18, 0.58));
  }

  &__play {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 22px;
    height: 22px;
    fill: #fff;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
  }

  &__eq {
    position: absolute;
    left: 50%;
    top: 50%;
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 18px;
    transform: translate(-50%, -50%);

    i {
      width: 3px;
      height: 6px;
      border-radius: 2px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      animation: sakura-music-card-eq 1s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.18s; }
      &:nth-child(3) { animation-delay: 0.36s; }
      &:nth-child(4) { animation-delay: 0.1s; }
    }
  }

  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--va-c-text, #4a2a2f);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__artist {
    margin: 2px 0 0;
    font-size: 11px;
    line-height: 1.35;
    color: rgba(120, 70, 78, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__bar {
    position: relative;
    height: 4px;
    margin-top: 9px;
    border-radius: 999px;
    background: rgba(186, 132, 140, 0.24);
    cursor: pointer;

    &::before {
      content: '';
      position: absolute;
      inset: -8px 0;
    }
  }

  &__bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: linear-gradient(90deg, #f0a9b0, #df9193);
    transition: width 0.15s linear;
  }

  &__bar-dot {
    position: absolute;
    top: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(223, 145, 147, 0.35);
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover &__bar-dot,
  &.is-playing &__bar-dot {
    opacity: 1;
  }

  &__time {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: rgba(120, 70, 78, 0.55);
  }

  &__volume {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 7px;
  }

  &__volume-icon {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
    color: rgba(120, 70, 78, 0.62);

    &.is-muted {
      opacity: 0.45;
    }
  }

  &__vbar {
    position: relative;
    flex: 1 1 auto;
    height: 3px;
    border-radius: 999px;
    background: rgba(186, 132, 140, 0.24);
    cursor: pointer;

    &::before {
      content: '';
      position: absolute;
      inset: -7px 0;
    }
  }

  &__vbar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(240, 169, 176, 0.92), rgba(223, 145, 147, 0.96));
  }

  &__vbar-dot {
    position: absolute;
    top: 50%;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(223, 145, 147, 0.32);
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover &__vbar-dot {
    opacity: 1;
  }

  &__volume-value {
    flex: 0 0 auto;
    width: 22px;
    text-align: right;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: rgba(120, 70, 78, 0.55);
  }

  &.is-playing &__badge {
    color: #d97f88;
  }

  &.is-loading &__play,
  &.is-loading &__eq i {
    opacity: 0.6;
  }

  @media (max-width: 480px) {
    &__cover {
      width: 58px;
      height: 58px;
    }

    &__heading {
      font-size: 14px;
    }
  }
}

html.dark .sakura-music-card {
  &__heading,
  &__title {
    color: rgba(246, 230, 232, 0.92);
  }

  &__artist,
  &__time,
  &__badge {
    color: rgba(246, 230, 232, 0.58);
  }

  &__bar {
    background: rgba(255, 255, 255, 0.16);
  }

  &__vbar {
    background: rgba(255, 255, 255, 0.16);
  }

  &__volume-icon,
  &__volume-value {
    color: rgba(246, 230, 232, 0.6);
  }

  &__badge {
    color: rgba(246, 230, 232, 0.5);
  }

  &.is-playing &__badge {
    color: #f0a9b0;
  }
}

@keyframes sakura-music-card-eq {
  0%, 100% { height: 6px; }
  50% { height: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-music-card__eq i {
    animation: none !important;
  }
}
</style>
