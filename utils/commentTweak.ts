import { isClient } from '@vueuse/core'

/**
 * Twikoo 评论区的本地化改造：
 * 把 "必填 / 选填" 换成能看懂的中文提示。
 *
 * 访客身份交给 Twikoo 原生机制：访客自己填昵称和邮箱发表评论后，
 * TkMetaInput 会把信息写进 localStorage('twikoo')，刷新时自动回填，
 * 头像也跟着邮箱记住。这里不预填、不锁定任何身份。
 */

const META_PLACEHOLDERS: Record<string, string> = {
  nick: '填写你的昵称',
  mail: '填写你的邮箱',
  link: '填写你的网址（选填）',
}

const COMMENT_PLACEHOLDER = '写下你的想法…'

/** 之前版本自动生成过的匿名身份，需要清掉让访客回到"无身份"状态 */
const LEGACY_VISITOR_MAIL = /^visitor-[a-z0-9]+@visitor\.mcntsb\.club$/i

/** 访客成功发表过评论后，身份信息不再让他改，只留内容框 */
const LOCKED_KEY = 'sakura-comment-identity-locked'

let observer: MutationObserver | null = null
let timer: number | null = null
let scheduled = false
let pendingSubmitAt: number | null = null
let pendingBaseCount = 0

function scheduleApply() {
  if (scheduled)
    return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    applyCommentTweak()
  })
}

/** 清掉旧版本注入的匿名身份，只清我们自己造的那种邮箱 */
function resetLegacyVisitorIdentity() {
  try {
    const raw = localStorage.getItem('twikoo')
    if (!raw)
      return

    const parsed = JSON.parse(raw)
    const mail = parsed && typeof parsed.mail === 'string' ? parsed.mail.trim() : ''
    if (mail && LEGACY_VISITOR_MAIL.test(mail))
      localStorage.removeItem('twikoo')
  }
  catch {
    // 脏数据直接忽略
  }
}

function readIdentity(): { nick: string, mail: string } | null {
  try {
    const raw = localStorage.getItem('twikoo')
    if (!raw)
      return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object')
      return null

    const nick = typeof parsed.nick === 'string' ? parsed.nick.trim() : ''
    const mail = typeof parsed.mail === 'string' ? parsed.mail.trim() : ''
    if (!nick || !mail)
      return null

    return { nick, mail }
  }
  catch {
    return null
  }
}

function isIdentityLocked() {
  try {
    return localStorage.getItem(LOCKED_KEY) === '1'
  }
  catch {
    return false
  }
}

function lockIdentity() {
  try {
    localStorage.setItem(LOCKED_KEY, '1')
  }
  catch {
    // 隐私模式下忽略
  }
  applyCommentTweak()
}

function countComments(root: HTMLElement) {
  return root.querySelectorAll('.tk-comment').length
}

function applyCommentTweak() {
  if (!isClient)
    return

  resetLegacyVisitorIdentity()

  document.querySelectorAll('.twikoo').forEach((node) => {
    const root = node as HTMLElement

    root.querySelectorAll('.tk-meta-input input').forEach((input) => {
      const el = input as HTMLInputElement
      el.placeholder = META_PLACEHOLDERS[el.name] ?? ''
      el.readOnly = false
    })

    const textarea = root.querySelector('.tk-input textarea') as HTMLTextAreaElement | null
    if (textarea)
      textarea.placeholder = COMMENT_PLACEHOLDER

    // 旧版本插入过的身份说明一并清理
    root.querySelectorAll('.tk-identity-note').forEach(note => note.remove())

    // 已经成功发表过评论、并且身份已被记住 → 收起昵称/邮箱/网址，只留内容框
    const shouldHideMeta = isIdentityLocked() && !!readIdentity()
    root.querySelectorAll('.tk-meta-input').forEach((el) => {
      (el as HTMLElement).style.display = shouldHideMeta ? 'none' : ''
    })

    // 监听一次点击发送之后的提交结果，用来判断"发表成功"
    if (pendingSubmitAt !== null) {
      if (countComments(root) > pendingBaseCount) {
        pendingSubmitAt = null
        lockIdentity()
        return
      }
      // 评论提交可能因后端通知等耗时较久，留足窗口
      if (Date.now() - pendingSubmitAt > 90000)
        pendingSubmitAt = null
    }
  })
}

function bindObserver() {
  if (observer)
    return
  observer = new MutationObserver(() => scheduleApply())
  observer.observe(document.body, { childList: true, subtree: true })
}

let sendClickHandler: ((event: MouseEvent) => void) | null = null

function bindSubmitWatcher() {
  if (sendClickHandler)
    return

  sendClickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target || typeof target.closest !== 'function')
      return

    const button = target.closest('.tk-send')
    if (!button)
      return

    const root = button.closest('.twikoo') as HTMLElement | null
    if (!root)
      return

    const textarea = root.querySelector('.tk-input textarea') as HTMLTextAreaElement | null
    if (!textarea || !textarea.value.trim())
      return

    pendingBaseCount = countComments(root)
    pendingSubmitAt = Date.now()
  }

  document.addEventListener('click', sendClickHandler, true)
}

export function mountCommentTweak() {
  if (!isClient)
    return

  applyCommentTweak()
  bindObserver()
  bindSubmitWatcher()

  // 评论组件异步渲染、路由切换都会重建 DOM，低频兜底校正
  if (timer === null) {
    timer = window.setInterval(() => applyCommentTweak(), 1200)
  }

  document.documentElement.dataset.commentTweak = 'ready'
}

export function unmountCommentTweak() {
  if (!isClient)
    return

  observer?.disconnect()
  observer = null

  if (sendClickHandler) {
    document.removeEventListener('click', sendClickHandler, true)
    sendClickHandler = null
  }

  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }

  delete document.documentElement.dataset.commentTweak
}
