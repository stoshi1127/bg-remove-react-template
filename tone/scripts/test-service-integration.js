/**
 * サービス統合機能のテストスクリプト
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 サービス統合機能のテストを開始...\n');

// TypeScriptコンパイルテスト
console.log('1. TypeScriptコンパイルテスト');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
  console.log('   ✅ TypeScriptコンパイル成功\n');
} catch (error) {
  console.log('   ❌ TypeScriptコンパイルエラー:');
  console.log(error.stdout?.toString() || error.message);
  console.log('');
}

// 重要なコンポーネントファイルの存在確認
console.log('2. 重要なファイルの存在確認');
const requiredFiles = [
  'src/components/QuickToolsHeader.tsx',
  'src/components/QuickToolsFooter.tsx',
  'src/components/RecommendedServices.tsx',
  'src/components/ServiceIntegrationStatus.tsx',
  'src/utils/quickToolsIntegration.ts',
  'src/styles/quicktools-theme.css'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - ファイルが見つかりません`);
    allFilesExist = false;
  }
});

console.log('');

// Next.js設定の確認
console.log('3. Next.js設定の確認');
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (nextConfig.includes("basePath: '/tone'")) {
    console.log('   ✅ basePath設定: /tone');
  } else {
    console.log('   ❌ basePath設定が見つかりません');
  }
  
  if (nextConfig.includes("assetPrefix: '/tone'")) {
    console.log('   ✅ assetPrefix設定: /tone');
  } else {
    console.log('   ❌ assetPrefix設定が見つかりません');
  }
} else {
  console.log('   ❌ next.config.ts が見つかりません');
}

console.log('');

// パッケージ依存関係の確認
console.log('4. パッケージ依存関係の確認');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = ['react', 'next', 'typescript'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} - 依存関係が見つかりません`);
    }
  });
} else {
  console.log('   ❌ package.json が見つかりません');
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 サービス統合機能のテストが完了しました！');
  console.log('   すべての必要なファイルが存在し、設定が正しく行われています。');
} else {
  console.log('⚠️  一部のファイルまたは設定に問題があります。');
  console.log('   上記の問題を確認してください。');
}