<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useSiteConfig } from 'valaxy'

// Netlify 部署的 Twikoo 云函数地址（与 valaxy.config.ts 的 addonTwikoo envId 一致）
const ENV_ID = 'https://twikoo-cccp.netlify.app/.netlify/functions/twikoo'
const PAGE_SIZE = 15 // 取最近 15 条再随机挑
const SHOW_COUNT = 4

interface TwikooComment {
  comment?: string
  nick?: string
  avatar?: string
  url?: string
  link?: string
  created?: number
}

declare global {
  interface Window {
    twikoo?: {
      init: (options: any) => any
      getRecentComments: (options: any) => Promise<{ comments: TwikooComment[] }>
    }
  }
}

const siteConfig = useSiteConfig()
const comments = ref<TwikooComment[]>([])
const loading = ref(true)

function loadTwikooSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.twikoo)
      return resolve()

    const prefix = (siteConfig.value.cdn.prefix || 'https://unpkg.com/').replace(/\/+$/, '/')
    const script = document.createElement('script')
    script.src = `${prefix}twikoo@1.6.44/dist/twikoo.all.min.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('twikoo sdk 加载失败'))
    document.head.appendChild(script)
  })
}

function formatTime(ts?: number): string {
  if (!ts)
    return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60)
    return '刚刚'
  if (diff < 3600)
    return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30)
    return `${Math.floor(diff / 86400)} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(async () => {
  try {
    await loadTwikooSdk()
    const data = await window.twikoo!.getRecentComments({ envId: ENV_ID, pageSize: PAGE_SIZE })
    const all = (data?.comments || []).filter(c => c && c.comment)
    // 洗牌后随机取 SHOW_COUNT 条
    const shuffled = [...all].sort(() => Math.random() - 0.5)
    comments.value = shuffled.slice(0, SHOW_COUNT)
  }
  catch (e) {
    console.error('[random-comments]', e)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <SakuraCard class="sakura-card sakura-random-comments">
    <SakuraDivider icon="i-ant-design:message-outlined" text="随机评论" />
    <ul v-if="comments.length" class="random-comment-list">
      <li v-for="(c, i) in comments" :key="i">
        <a
          v-if="c.url"
          :href="c.url"
          target="_blank"
          rel="noopener"
          class="random-comment-link"
        >
          <span class="random-comment-head">
            <span class="random-comment-nick">{{ c.nick || '匿名' }}</span>
            <span v-if="c.created" class="random-comment-time">{{ formatTime(c.created) }}</span>
          </span>
          <span class="random-comment-text">{{ (c.comment || '').slice(0, 50) }}</span>
        </a>
        <div v-else class="random-comment-link">
          <span class="random-comment-head">
            <span class="random-comment-nick">{{ c.nick || '匿名' }}</span>
            <span v-if="c.created" class="random-comment-time">{{ formatTime(c.created) }}</span>
          </span>
          <span class="random-comment-text">{{ (c.comment || '').slice(0, 50) }}</span>
        </div>
      </li>
    </ul>
    <p v-else-if="loading" class="random-comment-empty">
      加载中...
    </p>
    <p v-else class="random-comment-empty">
      暂无评论，快来抢沙发~
    </p>
  </SakuraCard>
</template>

<style lang="scss" scoped>
.sakura-random-comments {
  margin-top: 16px;
  padding: 16px 20px;
  background: var(--sakura-card-bg);

  :deep(.sakura-divider) {
    margin-bottom: 8px;
  }
}

.random-comment-list {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    padding: 7px 0;
    border-bottom: 1px dashed var(--sakura-color-divider);

    &:last-child {
      border-bottom: none;
    }
  }
}

.random-comment-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--sakura-color-text);
  text-decoration: none;
  transition: color 0.3s;

  &:hover {
    color: var(--sakura-color-primary);

    .random-comment-text {
      color: var(--sakura-color-primary);
    }
  }
}

.random-comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.random-comment-nick {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--sakura-color-text-deep);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.random-comment-time {
  font-size: 0.7rem;
  color: var(--sakura-color-text);
  flex-shrink: 0;
}

.random-comment-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--sakura-color-text);
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  transition: color 0.3s;
}

.random-comment-empty {
  margin: 0;
  padding: 8px 0;
  font-size: 0.85rem;
  color: var(--sakura-color-text);
}
</style>
