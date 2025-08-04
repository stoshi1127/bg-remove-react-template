/**
 * E2E usability tests
 * Tests user experience, intuitive design, and ease of use
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

test.describe('Usability E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should provide clear visual feedback for user actions', async ({ page }) => {
    // Check initial state visual cues
    await expect(page.getByText('ステップ 1')).toHaveClass(/active/);
    await expect(page.getByText('ステップ 2')).toHaveClass(/disabled/);
    await expect(page.getByText('ステップ 3')).toHaveClass(/disabled/);

    // Upload image and check visual feedback
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Should show loading state during upload
    await expect(page.locator('[aria-label*="アップロード中"]')).toBeVisible();

    // After upload, step 2 should be visually enabled
    await expect(page.getByText('ステップ 2')).toHaveClass(/enabled/, { timeout: 10000 });
    await expect(page.getByText('ステップ 1')).toHaveClass(/completed/);

    // Navigate to step 2 and check visual state
    await page.getByText('ステップ 2').click();
    await expect(page.getByText('ステップ 2')).toHaveClass(/active/);

    // Select preset and check visual feedback
    const presetButton = page.getByText('商品をくっきりと');
    await presetButton.click();
    await expect(presetButton).toHaveClass(/selected/);

    // Step 3 should become visually enabled
    await expect(page.getByText('ステップ 3')).toHaveClass(/enabled/, { timeout: 5000 });
  });

  test('should provide helpful error messages and recovery options', async ({ page }) => {
    // Test invalid file upload
    const invalidFile = path.join(__dirname, 'fixtures', 'invalid.txt');
    const fileInput = page.locator('input[type="file"]');
    
    // Try to upload invalid file
    await fileInput.setInputFiles(invalidFile);

    // Should show clear error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="alert"]')).toContainText('サポートされていないファイル形式');

    // Should provide recovery option
    await expect(page.getByText('別のファイルを選択')).toBeVisible();

    // Test recovery by uploading valid file
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });
  });

  test('should show progress and estimated time during processing', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Select preset and start processing
    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await page.getByText('処理を開始').click();

    // Should show detailed progress information
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText(/\d+% 完了/)).toBeVisible();
    await expect(page.getByText(/処理中:/)).toBeVisible();

    // Should show current file being processed
    await expect(page.getByText('test-image.jpg')).toBeVisible();

    // Wait for completion
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });
  });

  test('should provide intuitive drag and drop functionality', async ({ page }) => {
    // Check for drag and drop area
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await expect(dropZone).toBeVisible();

    // Should show visual cues for drag and drop
    await expect(page.getByText('ファイルをドラッグ&ドロップ')).toBeVisible();

    // Simulate drag over (visual feedback)
    await dropZone.hover();
    
    // Note: Actual file drop simulation is complex in Playwright
    // This test focuses on the UI elements and visual feedback
    await expect(dropZone).toHaveClass(/drag-over/);
  });

  test('should provide clear instructions and help text', async ({ page }) => {
    // Check for helpful instructions on each step
    await expect(page.getByText('JPG, PNG, HEIC形式の画像をアップロード')).toBeVisible();

    // Upload image and check step 2 instructions
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    await page.getByText('ステップ 2').click();
    await expect(page.getByText('お好みのプリセットを選択してください')).toBeVisible();

    // Check preset descriptions
    await expect(page.getByText('商品写真に最適')).toBeVisible();
    await expect(page.getByText('明るく清潔感のある仕上がり')).toBeVisible();

    // Select preset and check step 3 instructions
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await expect(page.getByText('処理を開始してダウンロード')).toBeVisible();
  });

  test('should handle user mistakes gracefully', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Navigate to step 2 and select preset
    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();

    // Navigate to step 3 and start processing
    await page.getByText('ステップ 3').click();
    await page.getByText('処理を開始').click();

    // User realizes they want to change preset - should be able to cancel
    await expect(page.getByText('処理をキャンセル')).toBeVisible();
    await page.getByText('処理をキャンセル').click();

    // Should return to editable state
    await expect(page.getByText('処理を開始')).toBeVisible();

    // User should be able to go back and change preset
    await page.getByText('ステップ 2').click();
    await page.getByText('明るくクリアに').click();
    await expect(page.getByText('明るくクリアに')).toHaveClass(/selected/);
  });

  test('should provide immediate feedback for user interactions', async ({ page }) => {
    // Button hover states
    const uploadButton = page.getByText('ファイルを選択');
    await uploadButton.hover();
    await expect(uploadButton).toHaveClass(/hover/);

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Preset button interactions
    await page.getByText('ステップ 2').click();
    const presetButton = page.getByText('商品をくっきりと');
    
    // Hover feedback
    await presetButton.hover();
    await expect(presetButton).toHaveClass(/hover/);

    // Click feedback
    await presetButton.click();
    await expect(presetButton).toHaveClass(/selected/);

    // Active state feedback
    await expect(presetButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should show appropriate loading states', async ({ page }) => {
    // Initial loading state
    await expect(page.locator('[data-testid="app-loading"]')).not.toBeVisible();

    // File upload loading
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Should show upload progress
    await expect(page.locator('[aria-label*="アップロード"]')).toBeVisible();

    // Wait for upload completion
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Processing loading state
    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await page.getByText('処理を開始').click();

    // Should show processing spinner and progress
    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();
  });

  test('should provide clear success indicators', async ({ page }) => {
    // Complete full workflow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await page.getByText('処理を開始').click();

    // Wait for completion
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });

    // Should show clear success indicators
    await expect(page.locator('[data-testid="success-icon"]')).toBeVisible();
    await expect(page.getByText('処理が完了しました')).toBeVisible();
    await expect(page.getByText('1 / 1 完了')).toBeVisible();

    // Should show download options clearly
    await expect(page.getByText('個別ダウンロード')).toBeVisible();
    await expect(page.getByText('一括ダウンロード')).toBeVisible();
  });

  test('should maintain context and state during navigation', async ({ page }) => {
    // Upload multiple images
    const files = [testImagePath, testImagePath]; // Simulate multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);
    await expect(page.getByText('2 枚の画像がアップロードされました')).toBeVisible({ timeout: 10000 });

    // Navigate to step 2 and select preset
    await page.getByText('ステップ 2').click();
    await page.getByText('暖かみのある雰囲気').click();

    // Navigate back to step 1 - should maintain uploaded files
    await page.getByText('ステップ 1').click();
    await expect(page.getByText('2 枚の画像がアップロードされました')).toBeVisible();

    // Navigate back to step 2 - should maintain preset selection
    await page.getByText('ステップ 2').click();
    await expect(page.getByText('暖かみのある雰囲気')).toHaveClass(/selected/);

    // Navigate to step 3 - should show correct summary
    await page.getByText('ステップ 3').click();
    await expect(page.getByText('2 枚の画像')).toBeVisible();
    await expect(page.getByText('暖かみのある雰囲気')).toBeVisible();
  });

  test('should provide appropriate mobile touch targets', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that touch targets are appropriately sized
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        // Touch targets should be at least 44px (iOS) or 48px (Android)
        expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
      }
    }

    // Test touch interactions
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Touch navigation
    await page.getByText('ステップ 2').tap();
    await expect(page.getByText('プリセット選択')).toBeVisible();

    // Touch preset selection
    await page.getByText('商品をくっきりと').tap();
    await expect(page.getByText('商品をくっきりと')).toHaveClass(/selected/);
  });
});