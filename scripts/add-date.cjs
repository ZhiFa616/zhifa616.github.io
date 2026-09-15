/**
 * 自动给文章添加 date 字段
 * 如果文章没有 date 字段，则从 createdAt 或文件修改时间提取
 * 在构建前自动运行，确保新文章按日期正确排序
 */
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'pages', 'posts');

function addDateToPost(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 已有 date 字段，跳过
  if (/^\s*date:\s*/m.test(content)) {
    return false;
  }

  let date = null;

  // 优先从 createdAt 提取
  const createdAtMatch = content.match(/createdAt:\s*["']?(\d{4}-\d{2}-\d{2})/);
  if (createdAtMatch) {
    date = createdAtMatch[1];
  }

  // 没有 createdAt 则用文件修改时间
  if (!date) {
    const stat = fs.statSync(filePath);
    date = stat.mtime.toISOString().split('T')[0];
  }

  // 在 title 行后面插入 date 字段
  content = content.replace(/(title:\s*[^\n]+\n)/, `$1date: ${date}\n`);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
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
    if (addDateToPost(filePath)) {
      console.log(`  ✓ ${file} 已添加 date 字段`);
      updated++;
    }
  });

  if (updated > 0) {
    console.log(`\n共为 ${updated} 篇文章添加了 date 字段`);
  } else {
    console.log('所有文章已有 date 字段，无需处理');
  }
}

main();
