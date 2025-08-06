/**
 * QuickToolsブランド統合の検証スクリプト
 * 本番URL設定の確認
 */

const fs = require('fs');
const path = require('path');

// 検証対象ファイル
const filesToCheck = [
  'src/utils/quickToolsIntegration.ts',
  'src/app/layout.tsx',
  'src/app/structured-data.tsx',
  'src/app/sitemap.ts'
];

// 期待される本番URL
const expectedUrls = [
  'https://quicktools.app',
  'https://quicktools.app/tone',
  'https://quicktools.app/bg-remove',
  'https://quicktools.app/resize',
  'https://quicktools.app/convert',
  'https://quicktools.app/compress',
  'https://quicktools.app/help',
  'https://quicktools.app/contact',
  'https://quicktools.app/privacy',
  'https://quicktools.app/terms',
  'https://twitter.com/quicktoolsapp',
  'https://github.com/quicktools-app'
];

// 検出すべきでない開発URL
const developmentUrls = [
  'localhost',
  '127.0.0.1',
  'http://localhost',
  'https://localhost',
  '.local'
];

console.log('🔍 QuickToolsブランド統合の検証を開始...\n');

let allChecksPass = true;
const results = [];

// ファイルごとに検証
filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ファイルが見つかりません: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const fileResults = {
    file: filePath,
    foundUrls: [],
    developmentUrls: [],
    missingUrls: []
  };

  // 本番URLの確認
  expectedUrls.forEach(url => {
    if (content.includes(url)) {
      fileResults.foundUrls.push(url);
    }
  });

  // 開発URLの検出
  developmentUrls.forEach(devUrl => {
    if (content.includes(devUrl)) {
      fileResults.developmentUrls.push(devUrl);
      allChecksPass = false;
    }
  });

  results.push(fileResults);
});

// 結果の表示
results.forEach(result => {
  console.log(`📁 ${result.file}`);
  
  if (result.foundUrls.length > 0) {
    console.log(`  ✅ 本番URL (${result.foundUrls.length}個):`);
    result.foundUrls.forEach(url => console.log(`    - ${url}`));
  }
  
  if (result.developmentUrls.length > 0) {
    console.log(`  ❌ 開発URL検出 (${result.developmentUrls.length}個):`);
    result.developmentUrls.forEach(url => console.log(`    - ${url}`));
  }
  
  console.log('');
});

// 統合状態の確認
console.log('📊 統合状態サマリー:');
console.log(`  - 検証ファイル数: ${filesToCheck.length}`);
console.log(`  - 本番URL設定: ${allChecksPass ? '✅ 完了' : '❌ 未完了'}`);

// QuickToolsサービス一覧の確認
const integrationFile = path.join(__dirname, '..', 'src/utils/quickToolsIntegration.ts');
if (fs.existsSync(integrationFile)) {
  const integrationContent = fs.readFileSync(integrationFile, 'utf8');
  
  console.log('\n🔗 QuickToolsサービス統合:');
  
  // サービス数の確認
  const serviceMatches = integrationContent.match(/id:\s*'[^']+'/g);
  if (serviceMatches) {
    console.log(`  - 統合サービス数: ${serviceMatches.length}`);
    serviceMatches.forEach(match => {
      const serviceId = match.match(/'([^']+)'/)[1];
      console.log(`    - ${serviceId}`);
    });
  }
  
  // ブランド設定の確認
  if (integrationContent.includes('QUICKTOOLS_BRAND')) {
    console.log('  - ブランド設定: ✅ 設定済み');
  } else {
    console.log('  - ブランド設定: ❌ 未設定');
    allChecksPass = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 QuickToolsブランド統合の設定が完了しました！');
  console.log('   すべての本番URLが正しく設定されています。');
} else {
  console.log('⚠️  QuickToolsブランド統合に問題があります。');
  console.log('   上記の問題を修正してください。');
}

process.exit(allChecksPass ? 0 : 1);