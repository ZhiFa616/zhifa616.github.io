/**
 * 自动提取文章中的第一张图片作为封面
 * 如果文章没有 cover 字段，则从正文提取第一张图片
 * 在构建前自动运行
 */
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'pages', 'posts');

function extractFirstImage(content) {
  // 去掉 front matter
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : content;

  // 匹配 Markdown 图片: ![alt](url)
  const mdImgMatch = body.match(/!\[.*?\]\(([^)\s]+)\)/);
  if (mdImgMatch) return mdImgMatch[1];

  // 匹配 HTML 图片: <img src="url">
  const htmlImgMatch = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImgMatch) return htmlImgMatch[1];

  return null;
}

function addCoverToPost(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 已有 cover 字段且非空，跳过
  const coverMatch = content.match(/^cover:\s*(.+)$/m);
  if (coverMatch && coverMatch[1].trim() && coverMatch[1].trim() !== '""' && coverMatch[1].trim() !== "''") {
    return false;
  }

  // 提取第一张图片
  const imgUrl = extractFirstImage(content);
  if (!imgUrl) return false;

  // 如果已有空的 cover 字段，替换它
  if (coverMatch) {
    content = content.replace(/^cover:\s*.+$/m, `cover: ${imgUrl}`);
  } else {
    // 在 title 行后面插入 cover 字段
    content = content.replace(/(title:\s*[^\n]+\n)/, `$1cover: ${imgUrl}\n`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return imgUrl;
}

function main() {
  if (!fs.existsSync(postsDir)) {
    console.log('posts 目录不存在，跳过');
    return;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  let updated = 0;

  files.forEach(file => {
    const filePath = path.join(postsDir, file);
    const result = addCoverToPost(filePath);
    if (result) {
      console.log(`  ✓ ${file}`);
      console.log(`    封面: ${result.substring(0, 60)}...`);
      updated++;
    }
  });

  if (updated > 0) {
    console.log(`\n共为 ${updated} 篇文章提取了封面图`);
  } else {
    console.log('所有文章已有封面或正文中无图片');
  }
}

main();
