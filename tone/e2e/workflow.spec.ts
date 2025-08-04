/**
 * E2E tests for the complete 3-step workflow
 * Tests the user journey from upload to download
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test data paths
const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
const testImagesPath = path.join(__dirname, 'fixtures');

test.describe('3-Step Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/EasyTone/);
  });

  test('should complete full workflow from upload to download', async ({ page }) => {
    // Step 1: Upload images
    await expect(page.getByText('ステップ 1')).toBeVisible();
    await expect(page.getByText('画像をアップロード')).toBeVisible();

    // Upload a test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to complete and step 2 to be enabled
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });
    await expect(page.getByText('プリセット選択')).toBeVisible();

    // Step 2: Select preset
    await expect(page.getByText('商品をくっきりと')).toBeVisible();
    await page.getByText('商品をくっきりと').click();

    // Wait for step 3 to be enabled
    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 5000 });
    await expect(page.getByText('処理・ダウンロード')).toBeVisible();

    // Step 3: Process images
    await expect(page.getByText('処理を開始')).toBeVisible();
    await page.getByText('処理を開始').click();

    // Wait for processing to complete
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('個別ダウンロード')).toBeVisible();
    await expect(page.getByText('一括ダウンロード')).toBeVisible();

    // Verify the applied preset is displayed
    await expect(page.getByText('商品をくっきりと')).toBeVisible();
  });

  test('should handle multiple file upload and processing', async ({ page }) => {
    // Create multiple test files for upload
    const files = [
      path.join(testImagesPath, 'test1.jpg'),
      path.join(testImagesPath, 'test2.png')
    ];

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);

    // Wait for files to be processed
    await expect(page.getByText('2 枚の画像がアップロードされました')).toBeVisible({ timeout: 10000 });

    // Select preset
    await expect(page.getByText('明るくクリアに')).toBeVisible();
    await page.getByText('明るくクリアに').click();

    // Process images
    await page.getByText('処理を開始').click();

    // Wait for batch processing to complete
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('2 / 2 完了')).toBeVisible();
  });

  test('should allow navigation between workflow steps', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Select preset
    await page.getByText('暖かみのある雰囲気').click();
    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 5000 });

    // Navigate back to step 1
    await page.getByText('ステップ 1').click();
    await expect(page.getByText('画像をアップロード')).toBeVisible();

    // Navigate to step 2
    await page.getByText('ステップ 2').click();
    await expect(page.getByText('プリセット選択')).toBeVisible();
    
    // Verify preset selection is maintained
    await expect(page.getByText('暖かみのある雰囲気')).toHaveClass(/selected/);

    // Navigate to step 3
    await page.getByText('ステップ 3').click();
    await expect(page.getByText('処理・ダウンロード')).toBeVisible();
  });

  test('should show progress during image processing', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Select preset and start processing
    await page.getByText('クールで都会的').click();
    await page.getByText('処理を開始').click();

    // Verify progress indicators appear
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText('処理中...')).toBeVisible();

    // Wait for completion
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });
  });

  test('should handle workflow reset', async ({ page }) => {
    // Complete a full workflow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });
    await page.getByText('商品をくっきりと').click();
    await page.getByText('処理を開始').click();

    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });

    // Reset workflow
    await page.getByText('新しい画像をアップロード').click();

    // Verify reset to initial state
    await expect(page.getByText('ステップ 1')).toHaveClass(/active/);
    await expect(page.getByText('画像をアップロード')).toBeVisible();
    await expect(page.getByText('ステップ 2')).toBeDisabled();
    await expect(page.getByText('ステップ 3')).toBeDisabled();
  });
});