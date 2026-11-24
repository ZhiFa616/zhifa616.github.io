const INMP3 = 'https://inmp3.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/* 只放行公开音源站使用的 CDN 域名，避免把这里变成任意网址的转发口 */
const ALLOWED_HOSTS = ['kuwo.cn', 'inmp3.com']

function json(payload: unknown, maxAge = 0) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  })
}

/**
 * 从 inmp3 的歌曲页里取出音频直链。页面把地址做了 base64，
 * 解码后仍是带时效签名的 CDN 链接，所以不长期缓存。
 */
export async function onRequestGet(context: any) {
  const id = (new URL(context.request.url).searchParams.get('id') || '').trim()
  if (!/^\d{1,12}$/.test(id))
    return json({ url: '' })

  try {
    const res = await fetch(`${INMP3}/song/${id}/`, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    })
    if (!res.ok)
      return json({ url: '' })

    const html = await res.text()
    const match = /encodedUrl\s*=\s*"([^"]+)"/.exec(html)
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)
    const cover = og ? og[1] : ''
    if (!match)
      return json({ url: '', cover })

    let decoded = ''
    try {
      decoded = atob(match[1])
    }
    catch {
      return json({ url: '', cover })
    }

    let parsed: URL
    try {
      parsed = new URL(decoded)
    }
    catch {
      return json({ url: '', cover })
    }

    const hostAllowed = ALLOWED_HOSTS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
    if (parsed.protocol !== 'https:' || !hostAllowed)
      return json({ url: '', cover })

    return json({ url: parsed.toString(), cover }, 300)
  }
  catch {
    return json({ url: '' })
  }
}
