<script lang="ts" setup>
import { usePostList, useThemeConfig } from 'valaxy'
import { computed, ref } from 'vue'

const PER_PAGE = 4

const posts = usePostList()
const themeConfig = useThemeConfig()

const defaultImage = computed(() => {
  const fallback = themeConfig.value.postList?.defaultImage
  return Array.isArray(fallback) ? fallback[0] : (fallback || '')
})

const offset = ref(0)

const pageCount = computed(() => Math.max(1, Math.ceil(posts.value.length / PER_PAGE)))

const currentPosts = computed(() => {
  const start = offset.value * PER_PAGE
  return posts.value.slice(start, start + PER_PAGE)
})

const pageIndex = computed(() => offset.value + 1)

function prev() {
  offset.value = (offset.value - 1 + pageCount.value) % pageCount.value
}

function next() {
  offset.value = (offset.value + 1) % pageCount.value
}
</script>

<template>
  <div class="sakura-featured-posts">
    <SakuraDivider icon="i-ant-design:star-outlined" text="☆ 推荐文章" />

    <div class="featured-grid">
      <RouterLink
        v-for="post in currentPosts"
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

    <div class="featured-nav">
      <button type="button" class="featured-nav-btn" @click="prev">
        ← 上一篇置顶
      </button>
      <span class="featured-page">{{ pageIndex }} / {{ pageCount }}</span>
      <button type="button" class="featured-nav-btn" @click="next">
        下一篇置顶 →
      </button>
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

.featured-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}

.featured-nav-btn {
  padding: 4px 14px;
  font-size: 0.85rem;
  color: var(--sakura-color-text);
  background: color-mix(in srgb, var(--sakura-color-primary) 10%, transparent);
  border: 1px solid var(--sakura-color-divider);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    color: var(--sakura-color-primary);
    border-color: var(--sakura-color-primary);
    background: color-mix(in srgb, var(--sakura-color-primary) 16%, transparent);
  }
}

.featured-page {
  font-size: 0.85rem;
  color: var(--sakura-color-text-muted);
}

@media (max-width: 768px) {
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
