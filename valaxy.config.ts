import { defineValaxyConfig } from 'valaxy'
import { addonVercount } from 'valaxy-addon-vercount'
import { addonHitokoto } from 'valaxy-addon-hitokoto'
import { vaFoucLoader } from './plugins/va-fouc-loader'
import { disableSsgHydration } from './plugins/disable-ssg-hydration'
import siteConfig from './site.config'
const themePrimary = '#DF9193'   //主题色

const mainNavItems = [
  {
    text: '首页',
    icon: 'i-ant-design:home-filled',
    link: '/',
  },
  {
    text: '文章',
    icon: 'i-ant-design:read-filled',
    link: '/categories',
    collapsed: true,
    items: [
      {
        icon: 'i-ant-design:appstore-filled',
        locale: 'menu.categories',
        link: '/categories',
      },
      {
        icon: 'i-ant-design:container-filled',
        locale: 'menu.archives',
        link: '/archives',
      },
      {
        icon: 'i-ant-design:tags-filled',
        locale: 'menu.tags',
        link: '/tags',
      },
    ],
  },
  {
    text: '番剧',
    icon: 'i-ant-design:play-square-filled',
    link: 'https://www.yhdz.one/',
    target: '_blank',
  },
  {
    text: '资源',
    icon: 'i-ant-design:appstore-filled',
    link: '/list',
    collapsed: true,
    items: [
      {
        text: '清单',
        icon: 'i-ant-design:ordered-list',
        link: '/list',
      },
      {
        text: '电影',
        icon: 'i-ant-design:video-camera-filled',
        link: '/movies',
      },
      {
        text: '游戏',
        icon: 'i-ant-design:gamepad-filled',
        link: '/games',
      },
      {
        text: '歌单',
        icon: 'i-ant-design:audio-filled',
        link: '/playlists',
      },
    ],
  },
  {
    text: '社交',
    icon: 'i-ant-design:team-outlined',
    link: '/comments',
    collapsed: true,
    items: [
      {
        text: '留言板',
        icon: 'i-ant-design:message-filled',
        link: '/comments',
      },
      {
        text: '朋友圈',
        icon: 'i-ant-design:smile-filled',
        link: '/friends',
      },
      {
        text: '加入官方 Q 群',
        icon: 'i-ri-qq-line',
        link: 'https://qm.qq.com/q/IfDQEtfkk4',
        target: '_blank',
      },
      {
        text: '联系开发者',
        icon: 'i-ant-design:customer-service-filled',
        link: 'https://m.debox.pro/card?id=tjdcyuj2&invite_code=tjdcyuj2',
        target: '_blank',
      },
    ],
  },
  {
    text: '打赏',
    icon: 'i-ant-design:heart-filled',
    link: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp',
    target: '_blank',
  },
  {
    text: '关于',
    icon: 'i-ant-design:idcard-filled',
    link: '/about',
  },
]

const sidebarItems = [
  { text: '🌈 首页', link: '/' },
  { text: '📁 归档', link: '/archives' },
  { text: '📁 分类', link: '/categories' },
  { text: '🏷️ 标签', link: '/tags' },
  { text: '🎯 清单', link: '/list' },
  { text: '🎞️ 电影', link: '/movies' },
  { text: '🍿 番剧', link: 'https://www.yhdz.one/', target: '_blank' },
  { text: '🎮 游戏', link: '/games' },
  { text: '🎵 歌单', link: '/playlists' },
  { text: '📝 留言板', link: '/comments' },
  { text: '🍻 朋友圈', link: '/friends' },
  { text: '❤️ 打赏', link: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp', target: '_blank' },
  { text: '📌 关于', link: '/about' },
]

/**
 * User Config
 */
export default defineValaxyConfig({
  // site config see site.config.ts
  vite: {
    plugins: [disableSsgHydration(), vaFoucLoader({
      avatar: '/favicon.png',
      title: siteConfig.title,
      subtitle: siteConfig.subtitle,
      primary: themePrimary,
    })],
  },
  modules: {
    rss: {
      enable: true,
      fullText: false,
      // 当设置为 true 时，会从构建后的 HTML 中提取图片的实际路径（包含 hash）
      // When set to true, it will extract actual image paths (with hash) from built HTML
      extractImagePathsFromHTML: true,
    },
  },

  build: {
    ssgForPagination: false,
    foucGuard: {
      enabled: true,
      maxDuration: 6000,
    },
  },

  siteConfig: {
    // 启用评论
    comment: {
      enable: false
    },
  },
  theme: 'sakura',    //主题设置
  themeConfig: {
    notice: {                      //公告栏内容
      rotateInterval: 5000,
      title: '公告栏',
      sections: [
        {
          label: '--- 官方公告 ---',
          lines: [
            '90G 整合包合集需加入我们的官方 Q 群获取！',
            { text: '👉 点击加入官方 Q 群', url: 'https://qm.qq.com/q/IfDQEtfkk4' },
          ],
        },
      ],
    },

    ui: {
      primary: themePrimary,
      postList: {
        responsive: {
          xl: 1,
        }
     }
    },
    postList: {
      defaultImage: '/default-cover.png',  //文章默认封面，本地路径在public文件夹
    },

    sidebar: [...sidebarItems],
    sidebarOptions: {
      position: 'left',
      offset: true,
      initialState: false,
      // null：不从 session/localStorage 恢复，避免 SSG hydration 不一致
      persistence: null,
    },

    hero: {
      title: '隙间互联',
      motto: '一个免费分享 Minecraft 整合包的小站',
      urls: [
        'https://img.remit.ee/i/iL1Se79AWwKz',   //图床背景图
        '/hero/awdsv.jpg',    //本地文件在public文件夹
        '/hero/cover.png',
        '/hero/wallhaven-5geqr5.jpg',
      ],
      randomUrls: true,
      style: 'dot', // 使用扫描线效果
      fixedImg: true, // 固定背景图片
      typewriter: true, // 启用打字机效果
      enableHitokoto: true, // 启用一言
      waveTheme: 'horizontal', // 设置水平波纹主题
    },

  postFooter: {
    navigationMerge: true // 合并导航显示
  },

   footer: {
      powered: false,
      since: 2026,
      runtimeSince: '2026-09-13',    //网站运行开始时间
      icon: {
        animated: true,
        url: 'https://mcntsb.club',
        title: '隙间互联',
      },
    },

    navbar: [...mainNavItems],
    navbarOptions: {
      title: ['隙间', '互联'],
      subTitle: '免费分享 Minecraft 整合包的小站',
      offset: 0,
      invert: ['home'],
      showMarker: false,
      autoHide: ['home'],
    },

    pagination: {
      type: 'standard',
      itemsPerPage: 8,
    },

    scrollDamping: true, // 启用滚动阻尼
    scrollAnimation: true, // 启用滚动动画
    scrollIndicator: true, // 显示滚动指示器
    scrollLock: false, // 禁用滚动锁定
    scrollToTop: false,
    scrollDown: {
      enable: true,
    },             //首页下滑按钮
    // 分类页样式：list 列表 / chart 环状图（玫瑰图或旭日图）
    categories: {
      style: 'chart',
    },
    // 归档页样式：list 时间线 / chart 发布统计折线面积图
    archives: {
      style: 'chart',
      startMonth: '2026-01',
    },
    // 标签页样式：list 按钮列表 / chart 柱状统计图
    tagsPage: {
      style: 'chart',
      chartLength: 10,
    },
    tags: {
      rainbow: false,
    },
  },
  addons: [
    addonVercount({
      api: 'cn'   //访问统计
    }),
    addonHitokoto({
      api: 'intl',
    }),
  ],
})
