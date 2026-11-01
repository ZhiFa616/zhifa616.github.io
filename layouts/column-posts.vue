<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFrontmatter, usePostList } from 'valaxy'
import { filterPostsByCategory } from '../utils/postFilter'

const route = useRoute()
const frontmatter = useFrontmatter()

// 路由路径 → 栏目分类名（与 utils/postFilter.ts 中的分类保持一致）
const CATEGORY_MAP: Record<string, string> = {
  '/maps': '恐怖地图',
  '/textures': '材质包',
}

const category = computed(() => CATEGORY_MAP[route.path] || '')

const allPosts = usePostList()
const posts = computed(() => filterPostsByCategory(allPosts.value, category.value))
</script>

<template>
  <article class="sakura-page sakura-column-posts-page">
    <header class="sakura-page-header sakura-safe-padding">
      <div class="sakura-header-title" flex="~">
        <SakuraTitle :fm="frontmatter" />
      </div>
    </header>

    <div class="sakura-column-posts-main sakura-safe-padding">
      <div v-if="posts.length" class="column-posts-list">
        <SakuraPostCard
          v-for="post in posts"
          :key="post.path"
          :post
          position="left"
          class="column-post-card"
        />
      </div>
      <p v-else class="column-empty">
        该栏目暂无文章，敬请期待~
      </p>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.sakura-column-posts-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .sakura-page-header {
    margin-top: var(--sakura-navbar-spacing);

    .sakura-header-title {
      justify-content: center;
    }
  }

  .sakura-column-posts-main {
    margin-top: 24px;
  }

  .column-posts-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .column-empty {
    padding: 48px 0;
    color: var(--va-c-text-lighter);
    text-align: center;
  }
}
</style>
