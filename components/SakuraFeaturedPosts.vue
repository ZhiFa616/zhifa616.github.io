<script lang="ts" setup>
import { usePostList, useSiteConfig, useThemeConfig } from 'valaxy'
import { computed, onMounted, ref } from 'vue'

const PER_PAGE = 4
const CACHE_KEY = 'mcntsb_featured_pv_v1'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h 缓存，避免重复查询与重复计数

const posts = usePostList()
const themeConfig = useThemeConfig()
const siteConfig = useSiteConfig()

const defaultImage = computed(() => {
  const fallback = themeConfig.value.postList?.defaultImage
  return Array.isArray(fallback) ? fallback[0] : (fallback || '')
})

const hotPosts = ref<any[]>([])
const loading = ref(true)

const baseUrl = computed(() =>
  String(siteConfig.value.url || 'https://mcntsb.club').replace(/\/+$/, ''),
)

function loadCache(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw)
      return null
    const data = JSON.parse(raw)
    if (!data || !data.ts || Date.now() - data.ts > CACHE_TTL)
      return null
    return data.pv || null
  }
  catch {
    return null
  }
}

function saveCache(pv: Record<string, number>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), pv }))
  }
  catch {}
}

async function queryPv(url: string): Promise<number> {
  try {
    const r = await fetch('https://cn.vercount.one/api/v2/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const d = await r.json()
    return Number(d?.data?.page_pv) || 0
  }
  catch {
    return 0
  }
}

onMounted(async () => {
  const items = [...posts.value]
  if (!items.length) {
    loading.value = false
    return
  }

  const cached = loadCache()
  if (cached) {
    const sorted = items
      .map(p => ({ post: p, pv: cached[p.path] || 0 }))
      .sort((a, b) => b.pv - a.pv)
    hotPosts.value = sorted.slice(0, PER_PAGE).map(x => x.post)
    loading.value = false
    return
  }

  // 无缓存：分批查询全站文章查看数（每批 12 个，避免并发过多）
  const pvMap: Record<string, number> = {}
  const batch = 12
  for (let i = 0; i < items.length; i += batch) {
    const slice = items.slice(i, i + batch)
    await Promise.all(slice.map(async (p) => {
      pvMap[p.path] = await queryPv(baseUrl.value + p.path)
    }))
  }
  saveCache(pvMap)

  const sorted = items
    .map(p => ({ post: p, pv: pvMap[p.path] || 0 }))
    .sort((a, b) => b.pv - a.pv)
  hotPosts.value = sorted.slice(0, PER_PAGE).map(x => x.post)
  loading.value = false
})
</script>

<template>
  <div class="sakura-featured-posts">
    <SakuraDivider icon="i-ant-design:fire-outlined" text="☆ 最热文章" />

    <div class="featured-grid">
      <RouterLink
        v-for="post in (loading ? posts.slice(0, PER_PAGE) : hotPosts)"
        :key="post.path"
        :to="post.path"
        class="sakura-card featured-card"
      >
        <div class="featured-cover">
          <img
            v-if="post.cover || defaultImage"
            :src="post.cover || defaultImage"
            :alt="post.title"
            loading="lazy"
            decoding="async"
          >
          <span v-else class="featured-cover-placeholder" />
        </div>
        <div class="featured-title">
          {{ post.title }}
        </div>
        <p v-if="post.excerpt" class="featured-excerpt">
          {{ post.excerpt }}
        </p>
      </RouterLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sakura-featured-posts {
  margin-bottom: 1rem;

  :deep(.sakura-divider) {
    margin-bottom: 12px;
  }
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.featured-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  text-decoration: none;
  color: var(--sakura-color-text);
  background: var(--sakura-card-bg, var(--sakura-post-card-bg));
  border: 1px solid var(--sakura-color-divider);
  border-radius: var(--sakura-post-card-rd, 12px);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--sakura-color-primary);
    box-shadow: 0 8px 20px rgb(0 0 0 / 15%);
  }
}

.featured-cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: color-mix(in srgb, var(--sakura-color-primary) 10%, var(--sakura-card-bg));

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.4s ease;
  }

  .featured-card:hover & img {
    transform: scale(1.05);
  }
}

.featured-cover-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sakura-color-primary) 18%, transparent),
    color-mix(in srgb, var(--sakura-color-primary) 6%, transparent)
  );
}

.featured-title {
  padding: 10px 12px 2px;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--sakura-color-text-deep);
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.featured-excerpt {
  margin: 0;
  padding: 4px 12px 12px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--sakura-color-text);
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

@media (max-width: 768px) {
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
