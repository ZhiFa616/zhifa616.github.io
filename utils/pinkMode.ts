import { createApp } from 'vue'
import type { App } from 'vue'
import PinkModeButton from '../components/PinkModeButton.vue'

type SlotRecord = { app: App; el: HTMLElement }

const records: SlotRecord[] = []
const observers: MutationObserver[] = []
let pollTimer: number | undefined
let pendingTimer: number | undefined
let booted = false

function cleanupDetached() {
  for (let i = records.length - 1; i >= 0; i--) {
    const item = records[i]
    if (!item.el.isConnected) {
      try { item.app.unmount() } catch {}
      item.el.remove()
      records.splice(i, 1)
    }
  }
}

function mountSlot(slot: HTMLElement, variant: 'sidebar' | 'aside') {
  const app = createApp(PinkModeButton, { variant })
  app.mount(slot)
  records.push({ app, el: slot })
}

/* 手机端侧边栏：插在导航列表（含「首页」）上方 */
function ensureSidebar() {
  const sidebar = document.querySelector('.sakura-sidebar')
  if (!sidebar || sidebar.querySelector('#pink-mode-slot-side'))
    return
  const nav = sidebar.querySelector('.sakura-sidebar-link')
  if (!nav)
    return
  const slot = document.createElement('div')
  slot.id = 'pink-mode-slot-side'
  slot.className = 'pink-slot pink-slot--side'
  nav.before(slot)
  mountSlot(slot, 'sidebar')
}

/* 电脑端首页右栏：放在「随机评论」卡片下方 */
function ensureAside() {
  if (document.getElementById('pink-mode-slot-aside'))
    return

  let anchor: Element | null = null
  const asides = [...document.querySelectorAll('aside')].filter(a => !a.classList.contains('sakura-sidebar'))
  for (const aside of asides) {
    for (const child of [...aside.children]) {
      if ((child.textContent || '').includes('随机评论')) {
        anchor = child
        break
      }
    }
    if (anchor)
      break
  }
  if (!anchor)
    return

  const slot = document.createElement('div')
  slot.id = 'pink-mode-slot-aside'
  slot.className = 'pink-slot pink-slot--aside'
  anchor.after(slot)
  mountSlot(slot, 'aside')
}

function scan() {
  cleanupDetached()
  ensureSidebar()
  ensureAside()
  document.documentElement.dataset.pinkSlots = String(records.length)
}

function startPolling() {
  if (typeof window === 'undefined')
    return
  let left = 24
  const run = () => {
    scan()
    left -= 1
    if (left > 0)
      pollTimer = window.setTimeout(run, 400)
  }
  run()
}

export function mountPinkMode() {
  if (typeof window === 'undefined')
    return
  if (booted)
    return
  booted = true
  document.documentElement.dataset.pinkMount = 'ready'

  /* 粉色优先：主题的深/浅切换加 dark 时自动撤销 */
  const classObserver = new MutationObserver(() => {
    const html = document.documentElement
    if (html.classList.contains('pink') && html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('sakura-pink-mode', '1')
    }
  })
  classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  observers.push(classObserver)

  /* 侧边栏与随机评论为后渲染，DOM 变动时补挂 */
  const domObserver = new MutationObserver(() => {
    if (pendingTimer)
      return
    pendingTimer = window.setTimeout(() => {
      pendingTimer = undefined
      scan()
    }, 250)
  })
  domObserver.observe(document.body, { childList: true, subtree: true })
  observers.push(domObserver)

  startPolling()
}

export function unmountPinkMode() {
  if (pollTimer)
    clearTimeout(pollTimer)
  if (pendingTimer)
    clearTimeout(pendingTimer)
  observers.forEach(o => o.disconnect())
  observers.length = 0
  for (const { app, el } of records) {
    try { app.unmount() } catch {}
    el.remove()
  }
  records.length = 0
  booted = false
}
