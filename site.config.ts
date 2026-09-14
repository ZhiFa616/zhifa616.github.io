import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://zhifa616.github.io/',
base: '/',
  lang: 'zh-CN',
  title: 'RU-CCCP',
  author: {
    name: 'CCCP',
  },
  description: 'Valaxy Theme Yun Preview.',
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

  search: {
    enable: false,
  },

  sponsor: {
    enable: true,
    title: '我很可爱，请给我钱！',
    methods: [
      {
        name: '支付宝',
        url: 'https://cdn.yunyoujun.cn/img/donate/alipay-qrcode.jpg',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: 'QQ 支付',
        url: 'https://cdn.yunyoujun.cn/img/donate/qqpay-qrcode.png',
        color: '#12B7F5',
        icon: 'i-ri-qq-line',
      },
      {
        name: '微信支付',
        url: 'https://cdn.yunyoujun.cn/img/donate/wechatpay-qrcode.jpg',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
    ],
  },
})
