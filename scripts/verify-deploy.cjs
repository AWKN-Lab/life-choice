// 验证部署后的关键接口
const base = 'https://awkn.cn';

async function main() {
  // 1. 前端首页 + 提取JS资源
  const home = await fetch(base + '/life/');
  const html = await home.text();
  console.log('前端首页:', home.status);

  // 提取所有 js/css 资源
  const jsMatches = [...html.matchAll(/(?:src|href)="(\/(?:assets|life\/assets)\/[^"]+)"/g)];
  const urls = jsMatches.map(m => m[1]);
  console.log(`找到 ${urls.length} 个静态资源`);

  // 测试前 5 个
  for (const u of urls.slice(0, 5)) {
    const r = await fetch(base + u);
    console.log(`  ${r.status} ${u}`);
  }
}

main().catch(e => console.error('ERR:', e.message));
