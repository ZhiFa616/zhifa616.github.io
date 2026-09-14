import { defineValaxyConfig } from 'valaxy'
import type { ThemeUserConfig } from 'valaxy-theme-sakura'

const safelist = [
  'i-ri-home-line',
  'i-line-md-folder-twotone',
  'i-fa-archive',
  'i-fa-film',
  'i-ri-qq-fill',
  'i-fa-leaf',
  'i-ri-customer-service-2-fill',
  'i-fa-hand-holding-usd',
  'i-ri-box-3-line',
  'i-fa-sakura', // 确保樱花图标在白名单中
]

export default defineValaxyConfig<ThemeUserConfig>({
  theme: 'sakura',

  vite: {
    // 根域名部署，必须为 '/'
    base: '/',
  },

  themeConfig: {
    hero: {
      title: '欢迎来到隙间互联官网',
      motto: '一个免费分享 Minecraft 整合包的小站',
      urls: [
        'https://videotourl.com/videos/1789237226221-ae5c6b18-f38e-4ee4-929c-2317bc820e42.mp4',
      ],
    },

    navbar: [
      { icon: 'i-ri-home-line', text: '首页', link: '/' },
      { icon: 'i-line-md-folder-twotone', text: '分类', link: '/categories' },
      { icon: 'i-fa-archive', text: '归档', link: '/archives' },
      { icon: 'i-fa-film', text: '番剧', link: 'https://www.yhdz.one/', target: '_blank' },
      { icon: 'i-ri-qq-fill', text: '加入官方 Q 群', link: 'https://qm.qq.com/q/IfDQEtfkk4', target: '_blank' },
      { icon: 'i-fa-leaf', text: '关于', link: '/posts/about' },
      { icon: 'i-fa-hand-holding-usd', text: '打赏', link: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp', target: '_blank' },
      { icon: 'i-ri-customer-service-2-fill', text: '联系开发者', link: 'https://m.debox.pro/card?id=tjdcyuj2&invite_code=tjdcyuj2', target: '_blank' },
    ],

    navbarOptions: {
      title: '隙间互联',
      subTitle: '',
      offset: 0,
      invert: ['home'],
      showMarker: false,
      autoHide: ['home'],
    },

    // ✅ 侧边栏：平铺展示，包含所有新导航项，统一使用 🌸 emoji
    sidebar: [
      { icon: 'i-fa-sakura', text: '🌸 首页', link: '/' },
      { icon: 'i-fa-sakura', text: '🌸 归档', link: '/archives' },
      { icon: 'i-fa-sakura', text: '🌸 分类', link: '/categories' },
      { icon: 'i-fa-sakura', text: ' 标签', link: '/tags' },
      { icon: 'i-fa-sakura', text: '🌸 清单', link: '/posts/list' },
      { icon: 'i-fa-sakura', text: '🌸 电影', link: '/posts/movies' },
      { icon: 'i-fa-sakura', text: '🌸 番剧', link: 'https://www.yhdz.one/', target: '_blank' },
      { icon: 'i-fa-sakura', text: '🌸 游戏', link: '/posts/games' },
      { icon: 'i-fa-sakura', text: '🌸 歌单', link: '/posts/playlists' },
      { icon: 'i-fa-sakura', text: '🌸 留言板', link: '/comments' },
      { icon: 'i-fa-sakura', text: '🌸 朋友圈', link: '/posts/friends' },
      { icon: 'i-fa-sakura', text: '🌸 打赏', link: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp', target: '_blank' },
      { icon: 'i-fa-sakura', text: '🌸 关于', link: '/posts/about' },
    ],

    sidebarOptions: {
      position: 'left',
      enableOnDesktop: false,
    },

    notice: {
      message: '90G 整合包合集需加入我们的官方 Q 群获取！',
    },
  },

  unocss: { safelist },
})
