/**
 * 自动为文章计算字数与阅读时间，写入 frontmatter
 * - wordCount: 纯数字（中文字符数 + 英文单词数）
 * - readingTime: 分钟（按 300 字/分钟）
 * 在构建前自动运行
 */
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'pages', 'posts');
const READ_SPEED = 300;

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory())
      out.push(...walk(p));
    else if (name.endsWith('.md'))
      out.push(p);
  }
  return out;
}

function countWords(content) {
  // 去掉 front matter
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  let body = bodyMatch ? bodyMatch[1] : content;

  // 去掉代码块
  body = body.replace(/```[\s\S]*?```/g, ' ');
  // 去掉行内代码
  body = body.replace(/`[^`]*`/g, ' ');
  // 去掉图片与链接
  body = body.replace(/!\[.*?\]\(.*?\)/g, ' ');
  body = body.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // 去掉 HTML 标签
  body = body.replace(/<[^>]+>/g, ' ');
  // 去掉 markdown 标题符号与列表符号
  body = body.replace(/^#{1,6}\s*/gm, ' ');
  body = body.replace(/^\s*[-*+]\s+/gm, ' ');
  body = body.replace(/^\s*\d+\.\s+/gm, ' ');

  const cn = (body.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (body.match(/[a-zA-Z0-9]+/g) || []).length;
  return cn + en;
}

function addWordsToPost(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 已有 wordCount 且非空，跳过
  const wcMatch = content.match(/^wordCount:\s*(.+)$/m);
  if (wcMatch && wcMatch[1].trim() && wcMatch[1].trim() !== '""') {
    return false;
  }

  const words = countWords(content);
  if (!words)
    return false;

  const readingTime = Math.max(1, Math.round(words / READ_SPEED));

  if (wcMatch) {
    content = content.replace(/^wordCount:\s*.+$/m, `wordCount: ${words}`);
  } else {
    content = content.replace(/(title:\s*[^\n]+\n)/, `$1wordCount: ${words}\nreadingTime: ${readingTime}\n`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return { words, readingTime };
}

function main() {
  if (!fs.existsSync(postsDir)) {
    console.log('posts 目录不存在，跳过');
    return;
  }

  const files = walk(postsDir);
  let updated = 0;
  let totalWords = 0;

  files.forEach(file => {
    const result = addWordsToPost(file);
    if (result) {
      console.log(`  ✓ ${path.basename(file)}: ${result.words} 字 / ${result.readingTime} 分钟`);
      totalWords += result.words;
      updated++;
    }
  });

  // 汇总所有文章（含已有 wordCount 的）总字数，写入 public/words.json 供前端展示
  let grandTotal = 0;
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const m = content.match(/^wordCount:\s*(\d+)\s*$/m);
    if (m)
      grandTotal += Number(m[1]);
  });

  const outDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(outDir))
    fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'words.json'), JSON.stringify({ total: grandTotal }), 'utf8');
  console.log(`\n总字数 ${grandTotal} 字，已写入 public/words.json`);

  if (updated > 0) {
    console.log(`共为 ${updated} 篇文章写入字数统计`);
  } else {
    console.log('所有文章已有字数统计或正文为空');
  }
}

main();
