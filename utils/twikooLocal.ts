import type { ComputedRef } from 'vue'
import type { ValaxyAddon } from 'valaxy'
import { useRuntimeConfig } from 'valaxy'
import { isClient } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import twikooScriptUrl from 'twikoo/dist/twikoo.all.min.js?url'

export interface TwikooOptions {
  envId: string
  el?: string
  region?: string
  path?: string
  lang?: string
  placeholder?: string
}

const COMMENT_PLACEHOLDER = '写下你的想法…'
const META_PLACEHOLDERS: Record<string, string> = {
  nick: '填写你的昵称',
  mail: '填写你的邮箱',
  link: '填写你的网址（选填）',
}

/** Twikoo 自身用于记住访客身份的 localStorage 键 */
const VISITOR_KEY = 'twikoo'

let formCustomizeObserver: MutationObserver | null = null

function randomToken(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i++)
    out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/**
 * 首次访问时写入一份固定的访客身份，之后一直沿用，
 * 避免访客刷新页面后被当成新用户。
 */
function ensureVisitorIdentity() {
  if (!isClient)
    return

  try {
    const raw = localStorage.getItem(VISITOR_KEY)
    let data: Record<string, string> = {}
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object')
        data = parsed as Record<string, string>
    }

    const mail = typeof data.mail === 'string' ? data.mail.trim() : ''
    const nick = typeof data.nick === 'string' ? data.nick.trim() : ''

    if (!mail)
      data.mail = `visitor-${randomToken()}@visitor.mcntsb.club`
    if (!nick)
      data.nick = `访客${randomToken(4)}`
    if (typeof data.link !== 'string')
      data.link = ''

    localStorage.setItem(VISITOR_KEY, JSON.stringify({ nick: data.nick, mail: data.mail, link: data.link }))
  }
  catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可
  }
}

function customizeTwikooCommentForm() {
  if (!isClient)
    return

  document.querySelectorAll('.twikoo').forEach((root) => {
    root.querySelectorAll('.tk-meta-input input').forEach((input) => {
      const el = input as HTMLInputElement
      el.placeholder = META_PLACEHOLDERS[el.name] ?? ''
      // 邮箱决定访客身份，锁住它才不会因改成新邮箱而变成另一个用户
      if (el.name === 'mail') {
        el.readOnly = true
        el.title = '已为你记住访客身份，刷新后仍是同一个用户'
      }
    })

    root.querySelectorAll('.tk-input textarea').forEach((textarea) => {
      (textarea as HTMLTextAreaElement).placeholder = COMMENT_PLACEHOLDER
    })
  })
}

function observeTwikooCommentForm() {
  if (!isClient || formCustomizeObserver)
    return

  const targets = document.querySelectorAll('.sakura-comment, .comment, #tcomment')
  if (!targets.length)
    return

  formCustomizeObserver = new MutationObserver(() => customizeTwikooCommentForm())
  targets.forEach(target => formCustomizeObserver!.observe(target, { childList: true, subtree: true }))
}

declare global {
  interface Window {
    twikoo: {
      init: (options: TwikooOptions | Record<string, unknown>) => unknown
    }
  }
}

let loadPromise: Promise<void> | null = null

function useAddonTwikoo() {
  const runtimeConfig = useRuntimeConfig()
  return computed(() => runtimeConfig.value.addons['valaxy-addon-twikoo'] as ValaxyAddon<TwikooOptions>)
}

function loadTwikooScript() {
  if (!isClient)
    return Promise.resolve()

  if (window.twikoo)
    return Promise.resolve()

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = twikooScriptUrl
      script.async = true
      script.onload = () => {
        if (window.twikoo)
          resolve()
        else
          reject(new Error('Twikoo script loaded but window.twikoo is missing'))
      }
      script.onerror = () => reject(new Error('Failed to load local Twikoo script'))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

export function useTwikoo(options: ComputedRef<TwikooOptions | undefined>, _version = 'latest') {
  const route = useRoute()
  const { locale } = useI18n()

  function initTwikoo(twikooOptions: TwikooOptions) {
    if (!isClient)
      return

    // 必须在 Twikoo 读取 localStorage 之前写好访客身份
    ensureVisitorIdentity()

    const defaultOptions = {
      el: '.comment #tcomment',
      lang: locale.value,
      path: route.path,
      placeholder: COMMENT_PLACEHOLDER,
    }
    const newTwikooOptions = Object.assign(defaultOptions, twikooOptions || {})
    const result = window.twikoo.init(newTwikooOptions)
    requestAnimationFrame(() => {
      customizeTwikooCommentForm()
      observeTwikooCommentForm()
    })
    return result
  }

  loadTwikooScript().then(() => {
    if (options.value)
      initTwikoo(options.value)
  }).catch((error) => {
    console.error('[twikoo-local]', error)
  })
}

export function useTwikooWithOptions(_version = 'latest') {
  const addonTwikoo = useAddonTwikoo()
  const options = computed(() => addonTwikoo.value.options)
  useTwikoo(options, _version)
}
