#!/usr/bin/env node

/**
 * アクセシビリティ検証スクリプト
 * ARIA属性、キーボードナビゲーション、スクリーンリーダー対応の完全性をチェック
 */

const fs = require('fs');
const path = require('path');

// 検証対象のファイルパターン
const COMPONENT_PATTERNS = [
  'src/components/**/*.tsx',
  'src/app/**/*.tsx'
];

// 必須のアクセシビリティ属性
const REQUIRED_ARIA_ATTRIBUTES = {
  'button': ['aria-label', 'aria-describedby'],
  'input': ['aria-label', 'aria-describedby'],
  'img': ['alt'],
  'dialog': ['aria-modal', 'aria-labelledby'],
  'region': ['aria-labelledby', 'aria-describedby'],
  'radiogroup': ['aria-labelledby'],
  'radio': ['aria-checked', 'aria-describedby'],
  'progressbar': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  'grid': ['aria-labelledby'],
  'gridcell': ['aria-label']
};

// 必須のライブリージョン
const REQUIRED_LIVE_REGIONS = [
  'aria-live="polite"',
  'aria-live="assertive"',
  'role="status"',
  'role="alert"'
];

// キーボードナビゲーション必須要素
const KEYBOARD_NAVIGATION_ELEMENTS = [
  'tabIndex',
  'onKeyDown',
  'onKeyPress',
  'onKeyUp'
];

class AccessibilityVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checkedFiles = 0;
  }

  /**
   * ファイル内容を解析してアクセシビリティ問題を検出
   */
  analyzeFile(filePath, content) {
    this.checkedFiles++;
    console.log(`Checking: ${filePath}`);

    // ARIA属性の検証
    this.checkAriaAttributes(filePath, content);
    
    // ライブリージョンの検証
    this.checkLiveRegions(filePath, content);
    
    // キーボードナビゲーションの検証
    this.checkKeyboardNavigation(filePath, content);
    
    // フォーカス管理の検証
    this.checkFocusManagement(filePath, content);
    
    // セマンティックHTML要素の検証
    this.checkSemanticElements(filePath, content);
    
    // 画像のalt属性検証
    this.checkImageAltText(filePath, content);
  }

  /**
   * ARIA属性の完全性をチェック
   */
  checkAriaAttributes(filePath, content) {
    // role属性を持つ要素を検索
    const roleMatches = content.match(/role=["']([^"']+)["']/g);
    if (roleMatches) {
      roleMatches.forEach(match => {
        const role = match.match(/role=["']([^"']+)["']/)[1];
        if (REQUIRED_ARIA_ATTRIBUTES[role]) {
          const requiredAttrs = REQUIRED_ARIA_ATTRIBUTES[role];
          requiredAttrs.forEach(attr => {
            if (!content.includes(attr)) {
              this.warnings.push({
                file: filePath,
                type: 'MISSING_ARIA_ATTRIBUTE',
                message: `Role "${role}" should have "${attr}" attribute`,
                line: this.getLineNumber(content, match)
              });
            }
          });
        }
      });
    }

    // aria-labelledby参照の検証
    const labelledByMatches = content.match(/aria-labelledby=["']([^"']+)["']/g);
    if (labelledByMatches) {
      labelledByMatches.forEach(match => {
        const id = match.match(/aria-labelledby=["']([^"']+)["']/)[1];
        if (!content.includes(`id="${id}"`)) {
          this.errors.push({
            file: filePath,
            type: 'BROKEN_ARIA_REFERENCE',
            message: `aria-labelledby references non-existent id "${id}"`,
            line: this.getLineNumber(content, match)
          });
        }
      });
    }

    // aria-describedby参照の検証
    const describedByMatches = content.match(/aria-describedby=["']([^"']+)["']/g);
    if (describedByMatches) {
      describedByMatches.forEach(match => {
        const id = match.match(/aria-describedby=["']([^"']+)["']/)[1];
        if (!content.includes(`id="${id}"`)) {
          this.errors.push({
            file: filePath,
            type: 'BROKEN_ARIA_REFERENCE',
            message: `aria-describedby references non-existent id "${id}"`,
            line: this.getLineNumber(content, match)
          });
        }
      });
    }
  }

  /**
   * ライブリージョンの検証
   */
  checkLiveRegions(filePath, content) {
    // エラー表示コンポーネントにrole="alert"があるかチェック
    if (content.includes('error') || content.includes('Error')) {
      if (!content.includes('role="alert"') && !content.includes('aria-live="assertive"')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_ERROR_ANNOUNCEMENT',
          message: 'Error components should have role="alert" or aria-live="assertive"',
          line: 0
        });
      }
    }

    // ステータス更新にaria-live="polite"があるかチェック
    if (content.includes('status') || content.includes('progress')) {
      if (!content.includes('aria-live="polite"') && !content.includes('role="status"')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_STATUS_ANNOUNCEMENT',
          message: 'Status updates should have aria-live="polite" or role="status"',
          line: 0
        });
      }
    }
  }

  /**
   * キーボードナビゲーションの検証
   */
  checkKeyboardNavigation(filePath, content) {
    // クリック可能な要素にキーボードハンドラーがあるかチェック
    const clickableElements = content.match(/<(div|span)[^>]*onClick/g);
    if (clickableElements) {
      clickableElements.forEach(element => {
        if (!content.includes('onKeyDown') && !content.includes('onKeyPress')) {
          this.warnings.push({
            file: filePath,
            type: 'MISSING_KEYBOARD_HANDLER',
            message: 'Clickable elements should have keyboard event handlers',
            line: this.getLineNumber(content, element)
          });
        }
        
        if (!content.includes('tabIndex')) {
          this.warnings.push({
            file: filePath,
            type: 'MISSING_TABINDEX',
            message: 'Clickable elements should have tabIndex attribute',
            line: this.getLineNumber(content, element)
          });
        }
      });
    }

    // radiogroup内のradioボタンの矢印キーナビゲーション
    if (content.includes('role="radiogroup"')) {
      if (!content.includes('ArrowRight') && !content.includes('ArrowLeft')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_ARROW_NAVIGATION',
          message: 'Radio groups should support arrow key navigation',
          line: 0
        });
      }
    }
  }

  /**
   * フォーカス管理の検証
   */
  checkFocusManagement(filePath, content) {
    // モーダルのフォーカストラップ
    if (content.includes('role="dialog"')) {
      if (!content.includes('useEffect') || !content.includes('focus')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_FOCUS_MANAGEMENT',
          message: 'Modals should manage focus properly',
          line: 0
        });
      }
    }

    // ステップ変更時のフォーカス管理
    if (content.includes('currentStep') || content.includes('step')) {
      if (!content.includes('focus') && !content.includes('Focus')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_STEP_FOCUS',
          message: 'Step changes should manage focus for screen readers',
          line: 0
        });
      }
    }
  }

  /**
   * セマンティックHTML要素の検証
   */
  checkSemanticElements(filePath, content) {
    // 見出しの階層構造チェック
    const headings = content.match(/<h[1-6]/g);
    if (headings && headings.length > 1) {
      // 簡単な階層チェック（h1 -> h2 -> h3の順序）
      const levels = headings.map(h => parseInt(h.charAt(2)));
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i-1] + 1) {
          this.warnings.push({
            file: filePath,
            type: 'HEADING_HIERARCHY_SKIP',
            message: `Heading hierarchy skips levels: h${levels[i-1]} to h${levels[i]}`,
            line: 0
          });
        }
      }
    }

    // リストの適切な使用
    if (content.includes('map(') && content.includes('key=')) {
      if (!content.includes('<ul>') && !content.includes('<ol>') && !content.includes('role="list"')) {
        this.warnings.push({
          file: filePath,
          type: 'MISSING_LIST_SEMANTICS',
          message: 'Repeated elements should use proper list semantics',
          line: 0
        });
      }
    }
  }

  /**
   * 画像のalt属性検証
   */
  checkImageAltText(filePath, content) {
    // img要素のalt属性チェック
    const imgElements = content.match(/<img[^>]*>/g);
    if (imgElements) {
      imgElements.forEach(img => {
        if (!img.includes('alt=')) {
          this.errors.push({
            file: filePath,
            type: 'MISSING_ALT_TEXT',
            message: 'Images must have alt attributes',
            line: this.getLineNumber(content, img)
          });
        }
      });
    }

    // Next.js Image コンポーネントのalt属性チェック
    const nextImageElements = content.match(/<Image[^>]*>/g);
    if (nextImageElements) {
      nextImageElements.forEach(img => {
        if (!img.includes('alt=')) {
          this.errors.push({
            file: filePath,
            type: 'MISSING_ALT_TEXT',
            message: 'Next.js Image components must have alt attributes',
            line: this.getLineNumber(content, img)
          });
        }
      });
    }
  }

  /**
   * 行番号を取得
   */
  getLineNumber(content, searchString) {
    const index = content.indexOf(searchString);
    if (index === -1) return 0;
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 結果を出力
   */
  printResults() {
    console.log('\n=== アクセシビリティ検証結果 ===\n');
    console.log(`検証ファイル数: ${this.checkedFiles}`);
    console.log(`エラー: ${this.errors.length}`);
    console.log(`警告: ${this.warnings.length}\n`);

    if (this.errors.length > 0) {
      console.log('🚨 エラー:');
      this.errors.forEach(error => {
        console.log(`  ${error.file}:${error.line} - ${error.type}: ${error.message}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  警告:');
      this.warnings.forEach(warning => {
        console.log(`  ${warning.file}:${warning.line} - ${warning.type}: ${warning.message}`);
      });
      console.log('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ アクセシビリティ検証に合格しました！');
    }

    return this.errors.length === 0;
  }
}

/**
 * ファイルを再帰的に検索
 */
function findFiles(dir, pattern) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (stat.isFile() && item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * メイン実行関数
 */
function main() {
  const verifier = new AccessibilityVerifier();
  const srcDir = path.join(__dirname, '..', 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('src ディレクトリが見つかりません');
    process.exit(1);
  }

  const files = findFiles(srcDir, '*.tsx');
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      verifier.analyzeFile(path.relative(process.cwd(), file), content);
    } catch (error) {
      console.error(`ファイル読み込みエラー: ${file}`, error.message);
    }
  }

  const success = verifier.printResults();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { AccessibilityVerifier };