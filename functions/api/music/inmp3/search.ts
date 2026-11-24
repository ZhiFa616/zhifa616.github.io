const INMP3 = 'https://inmp3.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function decodeHtml(text: string) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

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
 * inmp3 的搜索结果页没有开放跨域头，这里在服务端抓回后整理成 JSON，
 * 只解析固定站点的固定结构，不代理任何用户可控的 URL。
 */
export async function onRequestGet(context: any) {
  const keyword = (new URL(context.request.url).searchParams.get('q') || '').trim()
  if (!keyword)
    return json({ data: [] })

  try {
    const res = await fetch(`${INMP3}/so/${encodeURIComponent(keyword)}/1/`, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    })
    if (!res.ok)
      return json({ data: [] })

    const html = await res.text()
    const blocks = html.split('class="result-item"').slice(1)
    const data: Array<Record<string, string>> = []

    for (const block of blocks.slice(0, 20)) {
      const rid = /data-rid="(\d+)"/.exec(block)
      const title = /<div class="result-title">([\s\S]*?)<\/div>/.exec(block)
      if (!rid || !title)
        continue
      const artist = /<div class="result-artist">([\s\S]*?)<\/div>/.exec(block)
      const album = /<div class="result-album">([\s\S]*?)<\/div>/.exec(block)
      data.push({
        id: rid[1],
        title: decodeHtml(title[1]) || '未知曲目',
        artist: decodeHtml(artist?.[1] || '') || '未知歌手',
        album: decodeHtml(album?.[1] || '').replace(/^专辑：/, ''),
        cover: '',
      })
    }

    return json({ data }, 300)
  }
  catch {
    return json({ data: [] })
  }
}
