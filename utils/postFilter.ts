import type { Post } from 'valaxy'

/**
 * 独立栏目分类：这类文章不出现在主页文章列表，
 * 仅在对应的栏目页（/maps 恐怖地图、/textures 材质包）展示。
 *
 * 写文章时在 frontmatter 中加一行即可归入对应栏目：
 *   categories: 恐怖地图   或   categories: 材质包
 * （Valaxy 会自动把字符串转为数组，两种写法等价）
 */
export const COLUMN_CATEGORIES = ['恐怖地图', '材质包'] as const

/** 判断文章是否属于独立栏目分类 */
export function isColumnPost(post: Post): boolean {
  const cats = post.categories || []
  return cats.some(c => (COLUMN_CATEGORIES as readonly string[]).includes(c))
}

/** 主页文章：排除独立栏目分类 */
export function filterMainPosts(posts: Post[]): Post[] {
  return posts.filter(post => !isColumnPost(post))
}

/** 按分类取栏目文章（仅匹配完全相等的分类名） */
export function filterPostsByCategory(posts: Post[], category: string): Post[] {
  return posts.filter(post => (post.categories || []).includes(category))
}
