<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface Track {
  id: string
  title: string
  artist: string
  album: string
  cover: string
  source?: 'netease' | 'inmp3'
}

/* 搜索走公开的免费音乐接口，播放直链由 Meting 接口解析（均为可跨域调用的公开服务）
   inmp3 的页面没有开放跨域头，走本站同域代理抓取完整版直链 */
const SEARCH_ENDPOINT = 'https://api.vkeys.cn/v2/music/netease'
const METING_ENDPOINT = 'https://meting.noome.cn/api'
const INMP3_API = '/api/music/inmp3'
const PAGE_FULL = 20

const SUGGESTIONS = ['周杰伦', '林俊杰', '五月天', '陈奕迅', '邓紫棋', 'Taylor Swift', 'Adele', '李荣浩']

const keyword = ref('')
const searching = ref(false)
const tracks = ref<Track[]>([])
const searched = ref(false)
const message = ref('')
const messageKind = ref<'tip' | 'error' | 'empty'>('tip')

const audioRef = ref<HTMLAudioElement | null>(null)
const progressTrackRef = ref<HTMLElement | null>(null)
const volumeTrackRef = ref<HTMLElement | null>(null)

const currentIndex = ref(-1)
const playing = ref(false)
const buffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.6)
const seeking = ref(false)
const seekPreview = ref(0)
const volumeDragging = ref(false)
const audioError = ref('')
const skipNote = ref('')
let autoSkipLeft = 0

const currentTrack = computed(() => (currentIndex.value >= 0 ? tracks.value[currentIndex.value] : null))
const progress = computed(() => {
  if (!duration.value)
    return 0
  const value = seeking.value ? seekPreview.value : currentTime.value
  return Math.min(100, Math.max(0, (value / duration.value) * 100))
})
const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(() => currentIndex.value >= 0 && currentIndex.value < tracks.value.length - 1)

/* 任意外部接口挂起时都按时放弃，保证搜索一定能出结果 */
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  }
  finally {
    clearTimeout(timer)
  }
}

function normalizeCover(raw?: string) {
  if (!raw)
    return ''
  let url = raw.replace(/^http:\/\//i, 'https://')
  // 只有网易云的图片支持按尺寸裁剪参数，其它源的封面原样使用
  if (/126\.net/i.test(url) && !/param=/.test(url))
    url += (url.includes('?') ? '&' : '?') + 'param=200y200'
  return url
}

function idFromUrl(raw?: string) {
  if (!raw)
    return ''
  const match = /[?&]id=([^&]+)/.exec(raw)
  return match ? decodeURIComponent(match[1]) : ''
}

async function searchVkeys(word: string): Promise<Track[]> {
  const res = await fetchWithTimeout(`${SEARCH_ENDPOINT}?word=${encodeURIComponent(word)}&page=1&num=${PAGE_FULL}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  const json: any = await res.json()
  if (!json || json.code !== 200 || !Array.isArray(json.data) || !json.data.length)
    throw new Error('empty result')
  return json.data.map((item: any) => ({
    id: String(item.id ?? idFromUrl(item.url)),
    title: item.song || item.name || '未知曲目',
    artist: item.singer || item.artist || '未知歌手',
    album: item.album || '',
    cover: normalizeCover(item.cover || item.pic),
    source: 'netease' as const,
  })).filter((item: Track) => Boolean(item.id))
}

async function searchNoome(word: string): Promise<Track[]> {
  const res = await fetchWithTimeout(`${METING_ENDPOINT}?server=netease&type=search&id=${encodeURIComponent(word)}&page=1`, {}, 10000)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  const json: any = await res.json()
  if (!Array.isArray(json) || !json.length)
    throw new Error('empty result')
  return json.map((item: any) => ({
    id: String(idFromUrl(item.url)),
    title: item.title || '未知曲目',
    artist: item.author || '未知歌手',
    album: '',
    cover: normalizeCover(item.pic),
    source: 'netease' as const,
  })).filter((item: Track) => Boolean(item.id))
}

/* inmp3 经由本站同域代理取回，曲库是完整版 MP3，作为首选的完整音源 */
async function searchInmp3(word: string): Promise<Track[]> {
  const res = await fetchWithTimeout(`${INMP3_API}/search?q=${encodeURIComponent(word)}`, {
    headers: { Accept: 'application/json' },
  }, 10000)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  const json: any = await res.json()
  if (!json || !Array.isArray(json.data) || !json.data.length)
    throw new Error('empty result')
  return json.data.map((item: any) => ({
    id: String(item.id ?? ''),
    title: item.title || '未知曲目',
    artist: item.artist || '未知歌手',
    album: item.album || '',
    cover: normalizeCover(item.cover),
    source: 'inmp3' as const,
  })).filter((item: Track) => Boolean(item.id))
}

function trackKey(item: Track) {
  return item.title.replace(/\s+/g, '').toLowerCase()
}

function mergeTracks(primary: Track[], extra: Track[]) {
  const out = primary.slice()
  const seen = new Map<string, Track>()
  out.forEach((item) => { seen.set(trackKey(item), item) })
  for (const item of extra) {
    const key = trackKey(item)
    const existed = seen.get(key)
    if (existed) {
      // 同名曲目已有完整音源时，只借它的封面
      if (!existed.cover && item.cover)
        existed.cover = item.cover
      continue
    }
    seen.set(key, item)
    out.push(item)
  }
  return out.slice(0, 48)
}

function resetPlayer() {
  const audio = audioRef.value
  currentIndex.value = -1
  playing.value = false
  buffering.value = false
  currentTime.value = 0
  duration.value = 0
  audioError.value = ''
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
  }
}

const COVER_HINT = /(翻唱|翻自|翻版|cover|伴奏|钢琴版|吉他版|纯音乐|dj|remix|ktv|铃声)/i

function rankTracks(list: Track[], word: string) {
  const tokens = word.split(/\s+/).filter(Boolean).map(token => token.toLowerCase())
  const scored = list.map((item, index) => {
    let score = 0
    for (const token of tokens) {
      if (item.title.toLowerCase().includes(token))
        score += 5
      if (item.artist.toLowerCase().includes(token))
        score += 2
    }
    // 能播完整版的曲目优先，翻唱/伴奏类版本往后放
    if (item.source === 'inmp3')
      score += 5
    if (COVER_HINT.test(item.title))
      score -= 3
    return { item, index, score }
  })
  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index))
  return scored.map(entry => entry.item)
}

/* 首次解析要抓取歌曲页，比较慢；结果出来后空闲时先备好前几首的直链 */
function warmUpTracks(list: Track[]) {
  const pending = list.filter(item => item.source === 'inmp3').slice(1, 4)
  pending.forEach((item, order) => {
    setTimeout(() => {
      if (urlCache.has(item.id))
        return
      resolveTrackUrl(item).catch(() => {})
    }, 500 * (order + 1))
  })
}

async function runSearch() {
  const word = keyword.value.trim()
  if (!word) {
    message.value = '先输入歌名、歌手或专辑，再点搜索'
    messageKind.value = 'tip'
    return
  }
  if (searching.value)
    return

  searching.value = true
  searched.value = true
  tracks.value = []
  resetPlayer()
  message.value = ''
  messageKind.value = 'tip'

  const [inmp3Result, vkeysResult, noomeResult] = await Promise.allSettled([
    searchInmp3(word),
    searchVkeys(word),
    searchNoome(word),
  ])
  const full = inmp3Result.status === 'fulfilled' ? inmp3Result.value : []
  const primary = vkeysResult.status === 'fulfilled' ? vkeysResult.value : []
  const extra = noomeResult.status === 'fulfilled' ? noomeResult.value : []
  const list = mergeTracks(full, [...primary, ...extra])

  if (!list.length) {
    message.value = '搜索失败：接口暂时没有响应，稍后再试一次'
    messageKind.value = 'error'
    searching.value = false
    return
  }

  tracks.value = rankTracks(list, word)
  selectTrack(0, false)
  warmUpTracks(tracks.value)
  searching.value = false
}

let loadToken = 0

const urlCache = new Map<string, { url: string, cover: string, at: number }>()
const URL_CACHE_MS = 5 * 60 * 1000

async function resolveTrackUrl(track: Track): Promise<{ url: string, cover: string }> {
  if (track.source === 'inmp3') {
    const cached = urlCache.get(track.id)
    if (cached && Date.now() - cached.at < URL_CACHE_MS)
      return { url: cached.url, cover: cached.cover }
    const res = await fetchWithTimeout(`${INMP3_API}/resolve?id=${encodeURIComponent(track.id)}`, {
      headers: { Accept: 'application/json' },
    }, 12000)
    if (!res.ok)
      throw new Error(`HTTP ${res.status}`)
    const json: any = await res.json()
    if (!json || !json.url)
      throw new Error('no url')
    const url = String(json.url)
    const cover = normalizeCover(json.cover ? String(json.cover) : '')
    urlCache.set(track.id, { url, cover, at: Date.now() })
    return { url, cover }
  }
  return {
    url: `${METING_ENDPOINT}?server=netease&type=url&id=${encodeURIComponent(track.id)}`,
    cover: '',
  }
}

function skipUnavailable(title: string) {
  buffering.value = false
  playing.value = false
  if (autoSkipLeft > 0 && currentIndex.value >= 0 && currentIndex.value < tracks.value.length - 1) {
    autoSkipLeft -= 1
    skipNote.value = `「${title}」没有可用音源，已自动跳到下一首`
    selectTrack(currentIndex.value + 1, true)
    return
  }
  audioError.value = '这首暂时拿不到可用音源，换一首或再搜一次试试'
}

async function selectTrack(index: number, autoplay: boolean) {
  if (index < 0 || index >= tracks.value.length)
    return
  const audio = audioRef.value
  const track = tracks.value[index]
  const token = ++loadToken
  currentIndex.value = index
  currentTime.value = 0
  duration.value = 0
  seeking.value = false
  seekPreview.value = 0
  audioError.value = ''
  buffering.value = autoplay
  if (!audio)
    return
  audio.pause()
  audio.removeAttribute('src')
  playing.value = false

  let resolved = { url: '', cover: '' }
  try {
    resolved = await resolveTrackUrl(track)
  }
  catch {
    resolved = { url: '', cover: '' }
  }
  // 解析期间又切了别的歌，这次的结果作废
  if (token !== loadToken)
    return
  if (!resolved.url) {
    skipUnavailable(track.title)
    return
  }
  if (resolved.cover && !track.cover)
    track.cover = resolved.cover
  audio.src = resolved.url
  audio.load()
  if (autoplay)
    audio.play().catch(() => {})
}

function togglePlay() {
  const audio = audioRef.value
  if (!audio)
    return
  if (currentIndex.value < 0) {
    autoSkipLeft = 2
    selectTrack(0, true)
    return
  }
  if (audio.paused) {
    audioError.value = ''
    audio.play().catch(() => {
      audioError.value = '播放被浏览器拦截，点一下播放键再试'
    })
  }
  else {
    audio.pause()
  }
}

function pickTrack(index: number) {
  autoSkipLeft = 2
  skipNote.value = ''
  selectTrack(index, true)
}

function playPrev() {
  skipNote.value = ''
  if (canPrev.value)
    selectTrack(currentIndex.value - 1, true)
}

function playNext() {
  skipNote.value = ''
  if (canNext.value)
    selectTrack(currentIndex.value + 1, true)
}

function applySeek(clientX: number) {
  const track = progressTrackRef.value
  if (!track || !duration.value)
    return
  const rect = track.getBoundingClientRect()
  if (!rect.width)
    return
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  seekPreview.value = ratio * duration.value
}

function onSeekDown(event: PointerEvent) {
  if (!duration.value)
    return
  seeking.value = true
  seekPreview.value = currentTime.value
  applySeek(event.clientX)
  try {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  catch {}
}

function onSeekMove(event: PointerEvent) {
  if (!seeking.value)
    return
  applySeek(event.clientX)
}

function onSeekUp() {
  if (!seeking.value)
    return
  seeking.value = false
  const audio = audioRef.value
  if (audio && duration.value)
    audio.currentTime = Math.min(duration.value, seekPreview.value)
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
  volumeDragging.value = true
  applyVolume(event.clientX)
  try {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  catch {}
}

function onVolumeMove(event: PointerEvent) {
  if (!volumeDragging.value)
    return
  applyVolume(event.clientX)
}

function onVolumeUp() {
  volumeDragging.value = false
}

function onKeywordEnter() {
  runSearch()
}

function useSuggestion(word: string) {
  keyword.value = word
  runSearch()
}

function hideBrokenCover(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.visibility = 'hidden'
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0)
    return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

let cleanups: Array<() => void> = []

onMounted(() => {
  const audio = audioRef.value
  if (!audio)
    return
  audio.volume = volume.value
  const onPlay = () => { playing.value = true; audioError.value = '' }
  const onPause = () => { playing.value = false }
  const onWaiting = () => { buffering.value = true }
  const onCanPlay = () => { buffering.value = false }
  const onMeta = () => { duration.value = Number.isFinite(audio.duration) ? audio.duration : 0 }
  const onTime = () => { if (!seeking.value) currentTime.value = audio.currentTime }
  const onEnded = () => { buffering.value = false; if (canNext.value) selectTrack(currentIndex.value + 1, true) }
  const onError = () => {
    if (currentIndex.value < 0)
      return
    const failedTitle = tracks.value[currentIndex.value]?.title || '这首'
    skipUnavailable(failedTitle)
  }
  const onWindowUp = () => { volumeDragging.value = false; onSeekUp() }

  audio.addEventListener('play', onPlay)
  audio.addEventListener('pause', onPause)
  audio.addEventListener('waiting', onWaiting)
  audio.addEventListener('canplay', onCanPlay)
  audio.addEventListener('loadedmetadata', onMeta)
  audio.addEventListener('timeupdate', onTime)
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)
  window.addEventListener('pointerup', onWindowUp)
  cleanups.push(() => {
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.removeEventListener('waiting', onWaiting)
    audio.removeEventListener('canplay', onCanPlay)
    audio.removeEventListener('loadedmetadata', onMeta)
    audio.removeEventListener('timeupdate', onTime)
    audio.removeEventListener('ended', onEnded)
    audio.removeEventListener('error', onError)
    window.removeEventListener('pointerup', onWindowUp)
    audio.pause()
    audio.removeAttribute('src')
  })
})

onBeforeUnmount(() => {
  cleanups.forEach(fn => fn())
  cleanups = []
})
</script>

<template>
  <section class="ms-page">
    <header class="ms-page__head">
      <div class="ms-page__headline">
        <h1 class="ms-page__title">在线音乐</h1>
        <span class="ms-page__tag">免费试听</span>
      </div>
      <p class="ms-page__desc">
        搜索在线音乐，音源来自公开免费音源，仅供试听，版权归属各平台与原作者。
      </p>
    </header>

    <div class="ms-search">
      <div class="ms-search__box">
        <svg class="ms-search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="m16 16 4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <input
          v-model="keyword"
          class="ms-search__input"
          type="search"
          inputmode="search"
          placeholder="搜索歌曲、歌手或专辑，例如「晴天」"
          autocomplete="off"
          @keyup.enter="onKeywordEnter"
        >
        <button v-if="keyword" class="ms-search__clear" type="button" aria-label="清空" @click="keyword = ''">
          ×
        </button>
      </div>
      <button class="ms-search__btn" type="button" :disabled="searching" @click="runSearch()">
        {{ searching ? '搜索中…' : '搜索' }}
      </button>
    </div>

    <div class="ms-suggest">
      <span class="ms-suggest__label">试试</span>
      <button
        v-for="word in SUGGESTIONS"
        :key="word"
        class="ms-suggest__chip"
        type="button"
        @click="useSuggestion(word)"
      >
        {{ word }}
      </button>
    </div>

    <p v-if="message" class="ms-note" :class="`is-${messageKind}`">
      {{ message }}
    </p>

    <div class="ms-player" :class="{ 'is-empty': !currentTrack, 'is-playing': playing }">
      <audio ref="audioRef" preload="none" />

      <div class="ms-player__cover">
        <img
          v-if="currentTrack && currentTrack.cover"
          :src="currentTrack.cover"
          alt=""
          draggable="false"
          @error="hideBrokenCover"
        >
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18.4V5.6l10-2v11.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          <circle cx="6.6" cy="18.4" r="2.6" fill="currentColor" />
          <circle cx="16.6" cy="15.4" r="2.6" fill="currentColor" />
        </svg>
        <span v-if="playing" class="ms-player__eq" aria-hidden="true"><i /><i /><i /><i /></span>
      </div>

      <div class="ms-player__body">
        <p class="ms-player__title">
          {{ currentTrack ? currentTrack.title : '选一首歌开始播放' }}
        </p>
        <p class="ms-player__sub">
          <template v-if="currentTrack">
            {{ currentTrack.artist }}<template v-if="currentTrack.album"> · {{ currentTrack.album }}</template>
          </template>
          <template v-else>搜索结果可单击播放。</template>
        </p>

        <div
          v-if="currentTrack"
          ref="progressTrackRef"
          class="ms-player__bar"
          role="slider"
          tabindex="0"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="Math.round(progress)"
          aria-label="播放进度"
          @pointerdown="onSeekDown"
          @pointermove="onSeekMove"
          @pointerup="onSeekUp"
          @pointercancel="onSeekUp"
        >
          <span class="ms-player__bar-fill" :style="{ width: `${progress}%` }" />
          <span class="ms-player__bar-dot" :style="{ left: `${progress}%` }" />
        </div>

        <div v-if="currentTrack" class="ms-player__time">
          <span>{{ fmt(seeking ? seekPreview : currentTime) }}</span>
          <span>{{ fmt(duration) }}</span>
        </div>

        <div v-if="currentTrack" class="ms-player__foot">
          <div class="ms-player__volume">
            <svg class="ms-player__volume-icon" :class="{ 'is-muted': volume === 0 }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.2v5.6h3.4L12 18.4V5.6L7.4 9.2H4z" fill="currentColor" />
              <path v-if="volume > 0.02" d="M15.4 8.6a4.6 4.6 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path v-if="volume > 0.4" d="M17.8 6.4a7.6 7.6 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <div
              ref="volumeTrackRef"
              class="ms-player__vbar"
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
              <span class="ms-player__vbar-fill" :style="{ width: `${volume * 100}%` }" />
            </div>
            <span class="ms-player__volume-value">{{ Math.round(volume * 100) }}</span>
          </div>

          <div class="ms-player__controls">
            <button class="ms-player__ctrl" type="button" :disabled="!canPrev" aria-label="上一首" @click="playPrev">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M18 5.8v12.4L8.8 12z" fill="currentColor" />
              </svg>
            </button>
            <button class="ms-player__play" type="button" :aria-label="playing ? '暂停' : '播放'" @click="togglePlay">
              <span v-if="buffering" class="ms-player__spinner" aria-hidden="true" />
              <svg v-else-if="playing" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7.4" y="5.6" width="3.2" height="12.8" rx="1.2" fill="currentColor" />
                <rect x="13.4" y="5.6" width="3.2" height="12.8" rx="1.2" fill="currentColor" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.8 5.6 18.4 12 8.8 18.4z" fill="currentColor" />
              </svg>
            </button>
            <button class="ms-player__ctrl" type="button" :disabled="!canNext" aria-label="下一首" @click="playNext">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M6 5.8v12.4L15.2 12z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <p v-if="skipNote" class="ms-player__skip">
          {{ skipNote }}
        </p>
        <p v-if="audioError" class="ms-player__error">
          {{ audioError }}
        </p>
      </div>
    </div>

    <div v-if="tracks.length" class="ms-list">
      <div class="ms-list__head">
        <span>{{ tracks.length }} 首结果</span>
        <span class="ms-list__hint">点击任意一行即可播放</span>
      </div>
      <ol class="ms-list__items">
        <li v-for="(track, index) in tracks" :key="track.id + index">
          <button
            class="ms-track"
            :class="{ 'is-active': index === currentIndex }"
            type="button"
            @click="pickTrack(index)"
          >
            <span class="ms-track__index">
              <svg v-if="index === currentIndex && playing" class="ms-track__eq" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="1" y="5" width="2" height="6" rx="1" fill="currentColor" />
                <rect x="5" y="2" width="2" height="9" rx="1" fill="currentColor" />
                <rect x="9" y="4" width="2" height="7" rx="1" fill="currentColor" />
              </svg>
              <template v-else>{{ String(index + 1).padStart(2, '0') }}</template>
            </span>
            <span class="ms-track__cover">
              <img v-if="track.cover" :src="track.cover" alt="" loading="lazy" draggable="false" @error="hideBrokenCover">
            </span>
            <span class="ms-track__meta">
              <span class="ms-track__title">{{ track.title }}</span>
              <span class="ms-track__sub">{{ track.artist }}<template v-if="track.album"> · {{ track.album }}</template></span>
            </span>
            <span class="ms-track__play" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 6.4 17.6 12 9 17.6z" fill="currentColor" />
              </svg>
            </span>
          </button>
        </li>
      </ol>
    </div>

    <div v-else-if="searched && !searching" class="ms-empty">
      <p>还没有结果</p>
      <span>换个关键词，或者点上面的歌手名试试</span>
    </div>
    <div v-else-if="!searched" class="ms-empty">
      <p>想听什么？</p>
      <span>今天也要听歌呢！</span>
    </div>
  </section>
</template>

<style lang="scss">
.ms-page {
  --ms-accent: var(--sakura-color-primary, #df9193);
  --ms-accent-soft: color-mix(in srgb, var(--ms-accent) 16%, transparent);
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: calc(var(--sakura-navbar-height, 65px) + 22px) 18px 56px;
  color: var(--va-c-text, #4a2a2f);
}

.ms-page__head {
  display: block;
}

.ms-page__headline {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.ms-page__title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--va-c-text, #4a2a2f);
}

.ms-page__desc {
  max-width: 560px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(120, 70, 78, 0.62);
}

.ms-page__tag {
  flex: 0 0 auto;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ms-accent);
  background: var(--ms-accent-soft);
}

.ms-search {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.ms-search__box {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--sakura-color-border, #f2d3de);
  border-radius: 14px;
  background: var(--sakura-card-bg, rgba(255, 251, 253, 0.97));
  box-shadow: 0 6px 20px rgba(160, 90, 100, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: var(--ms-accent);
    box-shadow: 0 8px 24px rgba(160, 90, 100, 0.16);
  }
}

.ms-search__icon {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  color: rgba(120, 70, 78, 0.5);
}

.ms-search__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  font-size: 14px;
  color: inherit;
  background: transparent;

  &::placeholder {
    color: rgba(120, 70, 78, 0.42);
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
}

.ms-search__clear {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  font-size: 15px;
  line-height: 1;
  color: rgba(120, 70, 78, 0.55);
  background: rgba(186, 132, 140, 0.16);
  cursor: pointer;
}

.ms-search__btn {
  flex: 0 0 auto;
  min-width: 86px;
  padding: 0 20px;
  border: 0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #f0a9b0, var(--ms-accent));
  box-shadow: 0 8px 20px rgba(200, 120, 140, 0.26);
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.ms-suggest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.ms-suggest__label {
  font-size: 11px;
  color: rgba(120, 70, 78, 0.45);
}

.ms-suggest__chip {
  padding: 4px 11px;
  border: 1px solid var(--sakura-color-border, #f2d3de);
  border-radius: 999px;
  font-size: 12px;
  color: rgba(120, 70, 78, 0.75);
  background: transparent;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    color: var(--ms-accent);
    border-color: var(--ms-accent);
    background: var(--ms-accent-soft);
  }
}

.ms-note {
  margin: 14px 0 0;
  padding: 9px 13px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(120, 70, 78, 0.7);
  background: rgba(186, 132, 140, 0.1);

  &.is-error {
    color: #c25a68;
    background: rgba(223, 120, 130, 0.14);
  }

  &.is-empty {
    color: rgba(120, 70, 78, 0.62);
  }
}

.ms-player {
  display: flex;
  gap: 14px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--sakura-color-border, #f2d3de);
  border-radius: var(--sakura-radius, 16px);
  background: var(--sakura-card-bg, rgba(255, 251, 253, 0.97));
  box-shadow: 0 14px 34px rgba(160, 90, 100, 0.12);

  &.is-empty {
    border-style: dashed;
    box-shadow: none;
    background: rgba(255, 251, 253, 0.72);
  }
}

.ms-player__cover {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 86px;
  height: 86px;
  overflow: hidden;
  border-radius: 16px;
  color: rgba(120, 70, 78, 0.4);
  background: linear-gradient(135deg, rgba(240, 169, 176, 0.34), rgba(223, 145, 147, 0.2));

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 30px;
    height: 30px;
  }
}

.ms-player.is-playing .ms-player__cover img {
  animation: ms-cover-breathe 6s ease-in-out infinite;
}

.ms-player__eq {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;

  i {
    width: 2.5px;
    height: 4px;
    border-radius: 2px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    animation: ms-eq 0.9s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
    &:nth-child(4) { animation-delay: 0.45s; }
  }
}

.ms-player__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ms-player__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--va-c-text, #4a2a2f);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-player__sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: rgba(120, 70, 78, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-player__bar {
  position: relative;
  height: 4px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(186, 132, 140, 0.22);
  cursor: pointer;
  touch-action: none;

  &::before {
    content: '';
    position: absolute;
    inset: -9px 0;
  }
}

.ms-player__bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #f0a9b0, var(--ms-accent));
}

.ms-player__bar-dot {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ms-accent) 34%, transparent);
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ms-player:hover .ms-player__bar-dot,
.ms-player.is-playing .ms-player__bar-dot {
  opacity: 1;
}

.ms-player__time {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: rgba(120, 70, 78, 0.5);
}

.ms-player__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
}

.ms-player__volume {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.ms-player__volume-icon {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: rgba(120, 70, 78, 0.58);

  &.is-muted {
    opacity: 0.4;
  }
}

.ms-player__vbar {
  position: relative;
  flex: 1 1 auto;
  max-width: 92px;
  height: 3px;
  border-radius: 999px;
  background: rgba(186, 132, 140, 0.22);
  cursor: pointer;
  touch-action: none;

  &::before {
    content: '';
    position: absolute;
    inset: -8px 0;
  }
}

.ms-player__vbar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(240, 169, 176, 0.9), var(--ms-accent));
}

.ms-player__volume-value {
  flex: 0 0 auto;
  width: 20px;
  font-size: 10px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(120, 70, 78, 0.5);
}

.ms-player__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
}

.ms-player__ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: rgba(120, 70, 78, 0.72);
  background: transparent;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    color: var(--ms-accent);
    background: var(--ms-accent-soft);
  }

  &:disabled {
    opacity: 0.32;
    cursor: default;
  }
}

.ms-player__play {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #f1b3b8, var(--ms-accent));
  box-shadow: 0 8px 20px rgba(200, 120, 140, 0.3);
  cursor: pointer;
  transition: transform 0.16s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    transform: scale(1.04);
  }

  &:active {
    transform: scale(0.96);
  }
}

.ms-player__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ms-spin 0.9s linear infinite;
}

.ms-player__skip {
  margin: 9px 0 0;
  font-size: 11px;
  color: rgba(120, 70, 78, 0.62);
}

.ms-player__error {
  margin: 9px 0 0;
  font-size: 11px;
  color: #c25a68;
}

.ms-list {
  margin-top: 20px;
}

.ms-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(120, 70, 78, 0.6);
}

.ms-list__hint {
  font-size: 11px;
  color: rgba(120, 70, 78, 0.4);
}

.ms-list__items {
  max-height: 460px;
  margin: 0 !important;
  padding: 0 4px 0 0 !important;
  overflow-y: auto;
  list-style: none !important;
  scrollbar-width: thin;

  li {
    margin: 0 !important;
    padding: 0 !important;
    list-style: none !important;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(186, 132, 140, 0.28);
  }
}

.ms-track {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover {
    background: rgba(186, 132, 140, 0.09);
  }

  &.is-active {
    border-color: color-mix(in srgb, var(--ms-accent) 34%, transparent);
    background: var(--ms-accent-soft);
  }
}

.ms-track__index {
  flex: 0 0 auto;
  width: 18px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: rgba(120, 70, 78, 0.45);
}

.ms-track.is-active .ms-track__index {
  color: var(--ms-accent);
}

.ms-track__eq {
  width: 12px;
  height: 12px;
}

.ms-track__cover {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(240, 169, 176, 0.28), rgba(223, 145, 147, 0.16));

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 18px;
    height: 18px;
  }
}

.ms-track__meta {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ms-track__title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--va-c-text, #4a2a2f);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-track__sub {
  font-size: 11px;
  line-height: 1.4;
  color: rgba(120, 70, 78, 0.58);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-track__play {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--ms-accent);
  background: transparent;
  opacity: 0;
  transition: opacity 0.18s ease;

  svg {
    width: 14px;
    height: 14px;
  }
}

.ms-track:hover .ms-track__play,
.ms-track.is-active .ms-track__play {
  opacity: 1;
}

.ms-list__more {
  display: flex;
  justify-content: center;
  margin-top: 10px;

  button {
    padding: 7px 22px;
    border: 1px solid var(--sakura-color-border, #f2d3de);
    border-radius: 999px;
    font-size: 12px;
    color: rgba(120, 70, 78, 0.72);
    background: transparent;
    cursor: pointer;
    transition: all 0.18s ease;

    &:hover:not(:disabled) {
      color: var(--ms-accent);
      border-color: var(--ms-accent);
    }

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }
}

.ms-empty {
  margin-top: 26px;
  padding: 34px 20px;
  border: 1px dashed var(--sakura-color-border, #f2d3de);
  border-radius: var(--sakura-radius, 16px);
  text-align: center;

  p {
    margin: 0 0 6px;
    font-size: 14px;
    color: rgba(120, 70, 78, 0.7);
  }

  span {
    font-size: 12px;
    color: rgba(120, 70, 78, 0.45);
  }
}

html.dark .ms-page {
  color: rgba(246, 230, 232, 0.92);

  --ms-accent-soft: color-mix(in srgb, var(--ms-accent) 22%, transparent);
}

html.dark .ms-page__title,
html.dark .ms-player__title,
html.dark .ms-track__title {
  color: rgba(246, 230, 232, 0.94);
}

html.dark .ms-page__desc,
html.dark .ms-player__sub,
html.dark .ms-track__sub,
html.dark .ms-list__head {
  color: rgba(246, 230, 232, 0.55);
}

html.dark .ms-search__box,
html.dark .ms-player {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(38, 31, 36, 0.72);
}

html.dark .ms-player.is-empty,
html.dark .ms-empty {
  background: rgba(38, 31, 36, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

html.dark .ms-search__input::placeholder {
  color: rgba(246, 230, 232, 0.36);
}

html.dark .ms-suggest__chip {
  color: rgba(246, 230, 232, 0.66);
  border-color: rgba(255, 255, 255, 0.12);
}

html.dark .ms-note {
  color: rgba(246, 230, 232, 0.62);
  background: rgba(255, 255, 255, 0.06);
}

html.dark .ms-player__bar,
html.dark .ms-player__vbar {
  background: rgba(255, 255, 255, 0.14);
}

html.dark .ms-player__ctrl {
  color: rgba(246, 230, 232, 0.7);
}

html.dark .ms-player__time,
html.dark .ms-player__volume-value {
  color: rgba(246, 230, 232, 0.45);
}

html.dark .ms-track:hover {
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 640px) {
  .ms-page {
    padding: calc(var(--sakura-navbar-height, 65px) + 12px) 14px 44px;
  }

  .ms-page__head {
    margin-bottom: 0;
  }

  .ms-page__title {
    font-size: 22px;
  }

  .ms-search__btn {
    min-width: 72px;
    padding: 0 14px;
  }

  .ms-player {
    gap: 11px;
    padding: 13px;
  }

  .ms-player__cover {
    width: 62px;
    height: 62px;
    border-radius: 13px;
  }

  .ms-player__play {
    width: 36px;
    height: 36px;
  }

  .ms-player__foot {
    gap: 6px;
  }

  .ms-player__vbar {
    max-width: 56px;
  }

  .ms-list__items {
    max-height: 54vh;
  }

  .ms-track__cover {
    width: 36px;
    height: 36px;
  }

  .ms-track {
    gap: 9px;
    padding: 7px 6px;
  }
}

@keyframes ms-cover-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}

@keyframes ms-eq {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}

@keyframes ms-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ms-player__eq i,
  .ms-player.is-playing .ms-player__cover img {
    animation: none !important;
  }
}
</style>
