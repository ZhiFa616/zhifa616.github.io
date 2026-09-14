import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  // 已切换到根域名（仓库重命名为 zhifa616.github.io 后）
  url: 'https://zhifa616.github.io/',
  
  lang: 'zh-CN',

  // 侧边栏大标题
  title: 'RU-CCCP',
  // 侧边栏第一行（原 Next Generation Static Blog Framework.）
  subtitle: '俄罗斯联邦站',

  author: {
    name: 'CCCP',
    // 侧边栏头像（你提供的直链）
    avatar: 'https://picui.ogmua.cn/s1/2026/09/15/6aa8318e5a3c2.webp',
    // 已按要求去掉头像右下角小徽标，故不再配置 status
  },

  // 侧边栏第二行（原 Valaxy Theme Yun Preview.）
  description: 'Minecraft Free',

  social: [
    {
      name: 'QQ群',
      link: 'https://qm.qq.com/q/IfDQEtfkk4',
      icon: 'i-ri-qq-fill',
      color: '#12B7F5',
    },
    {
      name: 'DeBox',
      link: 'https://m.debox.pro/card?id=0in7m9t5&invite_code=0in7m9t5',
      icon: 'i-ri-box-3-line',
      color: '#00C050',
    },
  ],

  search: { enable: false },

  sponsor: {
    enable: true,
    title: '我很可爱，请给我钱！',
    methods: [
      { name: '支付宝', url: 'https://cdn.yunyoujun.cn/img/donate/alipay-qrcode.jpg', color: '#00A3EE', icon: 'i-ri-alipay-line' },
      { name: 'QQ 支付', url: 'https://cdn.yunyoujun.cn/img/donate/qqpay-qrcode.png', color: '#12B7F5', icon: 'i-ri-qq-line' },
      { name: '微信支付', url: 'https://cdn.yunyoujun.cn/img/donate/wechatpay-qrcode.jpg', color: '#2DC100', icon: 'i-ri-wechat-pay-line' },
    ],
  },
})
