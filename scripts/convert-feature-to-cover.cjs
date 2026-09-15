const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'pages', 'posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

let hasFeature = 0;
let converted = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 匹配 feature: 后面的内容（带引号或不带引号）
  const featureMatch = content.match(/^feature:\s*(.+)$/m);
  if (featureMatch) {
    const value = featureMatch[1].trim();
    // 只有非空值才转换
    if (value && value !== '""' && value !== "''") {
      // 改名为 cover
      content = content.replace(/^feature:\s*(.+)$/m, `cover: $1`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ ${file}: feature -> cover (${value.substring(0, 50)}...)`);
      converted++;
    } else {
      // 空值的feature，直接删除这一行
      content = content.replace(/^feature:\s*["']?\s*["']?\s*$/m, '');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  - ${file}: 删除空feature`);
    }
    hasFeature++;
  }
});

console.log(`\n共处理 ${hasFeature} 篇文章，转换 ${converted} 篇`);
