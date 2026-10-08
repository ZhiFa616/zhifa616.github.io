import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://mcntsb.club',
  cdn: {
    // twikoo SDK 本地化（public/twikoo-cdn），避免外网 CDN 加载慢/失败
    prefix: '/twikoo-cdn/',
  },
  lang: 'zh-CN',
  title: '隙间互联',
  subtitle: '免费分享 Minecraft 整合包的小站',
  author: {
    name: '隙间互联',
    avatar: 'https://img.remit.ee/i/AH4V4ok2D8eY',
    status: {
      emoji: '⛏️',
      message: '整合包施工中...',
      },
  },
  description: '一个免费分享 Minecraft 整合包的小站',

  favicon: '/favicon.png',  //文件在public文件夹

  social: [
    {
      name: 'RSS',
      link: '/atom.xml',
      icon: 'i-ri-rss-line',
      color: 'orange',
    },
    {
      name: 'GitHub',
      link: 'https://github.com/ZhiFa616',
      icon: 'i-ri-github-line',
      color: '#6e5494',
    },
    {
      name: 'QQ 群',
      link: 'https://qm.qq.com/q/IfDQEtfkk4',
      icon: 'i-ri-qq-line',
      color: '#12B7F5',
    },
  ],



  search: {
    enable: true,  //启用搜索
    type: 'fuse',
  },
  fuse: {
    /**
     * 设置搜索的文件路径
     */
    // pattern: 'pages/**/*.md',
    options: {
      keys: ['title', 'tags', 'categories', 'excerpt', 'content'],
      /**
       * @default 0.6
       * @see https://www.fusejs.io/api/options.html#threshold
       * 设置匹配阈值，越低越精确
       */
      // threshold: 0.6,
      /**
       * @default false
       * @see https://www.fusejs.io/api/options.html#ignoreLocation
       * 忽略位置
       * 这对于搜索文档全文内容有用，若无需全文搜索，则无需设置此项
       */
      ignoreLocation: true,
    },
  },

  sponsor: {
    enable: true,
    title: '喜欢我的整合包？欢迎打赏支持！',
    methods: [
      {
        name: '支付宝',
        url: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: '微信支付',
        url: 'https://picui.ogmua.cn/s1/2026/09/13/6aa5ad8e71063.webp',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
    ],
  },

  // 文章图片点击放大预览（自定义画廊，支持左右切换）
  mediumZoom: {
    enable: false,  //禁用默认图片预览，本项目使用自建图片预览，需要禁用内置
  },

  // 代码块超过该高度（px）时自动折叠，点击底部按钮可展开
  codeHeightLimit: 360,

  // 统计阅读时间和字数
  statistics: {
    enable: true,
    readTime: {
      speed: { cn: 300, en: 100 },
    },
  },
})
