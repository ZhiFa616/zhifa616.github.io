<script setup lang="ts">
import { useConfig } from 'valaxy'
import { computed } from 'vue'

const props = defineProps<{
  rotateInterval?: number
}>()

const config = useConfig()

const themeConfig = computed(() => config.value.themeConfig as {
  notice?: {
    rotateInterval?: number
    title?: string
    sections?: Array<{
      label: string
      lines: NoticeLineConfig[]
    }>
  }
})

type NoticeLineConfig = string | {
  text: string
  url?: string
}

interface ResolvedNoticeLine {
  text: string
  url?: string
  external?: boolean
}

function guessNoticeUrl(text: string): string | undefined {
  const value = text.trim()
  if (!value)
    return undefined
  if (/^https?:\/\//i.test(value))
    return value
  if (value.startsWith('/'))
    return value
  if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(value))
    return `https://${value}`
  return undefined
}

function resolveNoticeLine(line: NoticeLineConfig): ResolvedNoticeLine {
  if (typeof line === 'object') {
    const url = line.url || guessNoticeUrl(line.text)
    return {
      text: line.text,
      url,
      external: url ? /^https?:\/\//i.test(url) : false,
    }
  }

  const url = guessNoticeUrl(line)
  return {
    text: line,
    url,
    external: url ? /^https?:\/\//i.test(url) : false,
  }
}

void props

const noticeTitle = computed(() => themeConfig.value.notice?.title || '公告栏')

const noticeSections = computed(() => {
  const sections = themeConfig.value.notice?.sections
  if (!sections?.length)
    return []

  return sections.map(section => ({
    label: section.label,
    lines: section.lines.map(line => resolveNoticeLine(line)),
  }))
})
</script>

<template>
  <div class="notice-board-wrap">
    <div class="notice-board-wrap__notice sakura-card">
      <h3 class="notice-board-wrap__title">
        {{ noticeTitle }}
      </h3>

      <template
        v-for="(section, sectionIndex) in noticeSections"
        :key="`${section.label}-${sectionIndex}`"
      >
        <div class="notice-board-wrap__section">
          {{ section.label }}
        </div>
        <p
          v-for="(line, lineIndex) in section.lines"
          :key="`${sectionIndex}-${lineIndex}`"
          class="notice-board-wrap__line"
        >
          <a
            v-if="line.url"
            :href="line.url"
            class="notice-board-wrap__link"
            :target="line.external ? '_blank' : undefined"
            :rel="line.external ? 'noopener noreferrer' : undefined"
          >
            {{ line.text }}
          </a>
          <template v-else>
            {{ line.text }}
          </template>
        </p>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notice-board-wrap {
  width: 100%;

  &__notice {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 16px 14px;
    text-align: center;
    color: var(--sakura-color-text);
    border: 1px solid rgba(0, 0, 0, 0.85);
    border-radius: var(--sakura-post-card-rd, 12px);
    background: var(--sakura-card-bg, var(--sakura-post-card-bg));
  }

  @at-root html.dark & {
    &__notice {
      border-color: var(--sakura-color-divider, rgb(255 255 255 / 20%));
    }
  }

  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--sakura-color-text-deep, inherit);
    letter-spacing: 0.06em;
    text-align: center;
  }

  &__section {
    margin-top: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--sakura-color-primary);
    letter-spacing: 0.04em;
    text-align: center;

    &:first-of-type {
      margin-top: 0;
    }
  }

  &__line {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.55;
    color: var(--sakura-color-text);
    word-break: break-all;
    text-align: center;
  }

  &__link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--sakura-color-primary);
      text-decoration: underline;
    }
  }
}
</style>
