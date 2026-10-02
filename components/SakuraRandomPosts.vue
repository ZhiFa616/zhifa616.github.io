<script lang="ts" setup>
import { ref, watch } from 'vue'
import { usePostList } from 'valaxy'

const posts = usePostList()
const randomPosts = ref<typeof posts.value>([])

function shuffle() {
  const all = [...posts.value]
  if (!all.length)
    return
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  randomPosts.value = all.slice(0, 6)
}

watch(posts, shuffle, { immediate: true })
</script>

<template>
  <SakuraCard class="sakura-card sakura-random-posts">
    <SakuraDivider icon="i-ant-design:swap-outlined" text="随机文章" />
    <ul class="random-post-list">
      <li v-for="post in randomPosts" :key="post.path">
        <RouterLink :to="post.path" class="random-post-link">
          {{ post.title }}
        </RouterLink>
      </li>
    </ul>
  </SakuraCard>
</template>

<style lang="scss" scoped>
.sakura-random-posts {
  padding: 16px 20px;
  background: var(--sakura-card-bg);

  :deep(.sakura-divider) {
    margin-bottom: 8px;
  }
}

.random-post-list {
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

.random-post-link {
  color: var(--sakura-color-text);
  text-decoration: none;
  font-size: 0.9rem;
  line-height: 1.5;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s;

  &:hover {
    color: var(--sakura-color-primary);
  }
}
</style>
