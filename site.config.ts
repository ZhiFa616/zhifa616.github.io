import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://zhifa616.github.io/',
  lang: 'zh-CN',
  title: 'RU-CCCP',
  subtitle: '俄罗斯联邦站',
  author: {
    name: 'CCCP',
    avatar: 'https://picui.ogmua.cn/s1/2026/09/15/6aa8318e5a3c2.webp',
  },
  description: 'Minecraft Free',
  social: [
    { name: 'QQ 群', link: 'https://qm.qq.com/q/IfDQEtfkk4', icon: 'i-ri-qq-fill' },
    { name: 'DeBox', link: 'https://m.debox.pro/card?id=0in7m9t5&invite_code=0in7m9t5', icon: 'i-ri-box-3-line' },
  ],
  search: {
    enable: true,
    provider: 'fuse',
    type: 'fuse',
  },
  fuse: {
    options: {
      keys: ['title', 'tags', 'categories', 'excerpt', 'content'],
      threshold: 0.6,
      ignoreLocation: true,
    },
  },
} as const)
