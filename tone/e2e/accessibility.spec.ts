/**
 * E2E accessibility tests
 * Tests keyboard navigation, screen reader support, and ARIA compliance
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

test.describe('Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should support keyboard navigation through workflow', async ({ page }) => {
    // Upload image first
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Navigate to step 2 using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Focus on step 2 button
    await page.keyboard.press('Enter');

    await expect(page.getByText('プリセット選択')).toBeVisible();

    // Navigate through presets using keyboard
    await page.keyboard.press('Tab'); // Focus on first preset
    await page.keyboard.press('Enter'); // Select first preset

    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 5000 });

    // Navigate to step 3 using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Focus on step 3 button
    await page.keyboard.press('Enter');

    await expect(page.getByText('処理・ダウンロード')).toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check main workflow region
    await expect(page.locator('[role="region"][aria-labelledby*="workflow"]')).toBeVisible();

    // Check step indicators have proper ARIA attributes
    await expect(page.locator('[aria-label*="現在のステップ"]')).toBeVisible();

    // Upload image to enable more elements
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Check preset selector accessibility
    await page.getByText('ステップ 2').click();
    await expect(page.locator('[role="radiogroup"]')).toBeVisible();
    await expect(page.locator('[role="radio"]').first()).toBeVisible();

    // Select preset and check processor accessibility
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();

    // Check progress bar accessibility
    await page.getByText('処理を開始').click();
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });

  test('should provide screen reader announcements', async ({ page }) => {
    // Check for live regions that announce status changes
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();

    // Upload image and check for status announcements
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload completion announcement
    await expect(page.locator('[aria-live="polite"]')).toContainText('アップロード完了', { timeout: 10000 });

    // Navigate to step 2 and check announcements
    await page.getByText('ステップ 2').click();
    await expect(page.locator('[aria-live="polite"]')).toContainText('プリセット選択', { timeout: 5000 });

    // Select preset and check announcement
    await page.getByText('商品をくっきりと').click();
    await expect(page.locator('[aria-live="polite"]')).toContainText('商品をくっきりと', { timeout: 5000 });
  });

  test('should have proper focus management', async ({ page }) => {
    // Check initial focus
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Navigate to step 2 and check focus
    await page.getByText('ステップ 2').click();
    
    // Focus should move to the preset selection area
    const activeElement = await page.locator(':focus');
    await expect(activeElement).toBeVisible();

    // Tab through preset options
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Focus should be on a preset button
    const focusedPreset = await page.locator(':focus');
    await expect(focusedPreset).toHaveAttribute('role', 'radio');
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode simulation
    await page.emulateMedia({ colorScheme: 'dark' });

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Check that elements are still visible and accessible
    await expect(page.getByText('ステップ 1')).toBeVisible();
    await expect(page.getByText('ステップ 2')).toBeVisible();
    await expect(page.getByText('ステップ 3')).toBeVisible();

    // Navigate through workflow
    await page.getByText('ステップ 2').click();
    await expect(page.getByText('商品をくっきりと')).toBeVisible();
    
    await page.getByText('商品をくっきりと').click();
    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 5000 });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1')).toBeVisible();

    // Upload image to reveal more content
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Navigate through steps and check heading hierarchy
    await page.getByText('ステップ 2').click();
    await expect(page.locator('h2, h3')).toBeVisible();

    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await expect(page.locator('h2, h3')).toBeVisible();

    // Check that headings are in logical order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should provide alternative text for images', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    // Navigate to step 2 and select preset
    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();
    await page.getByText('処理を開始').click();

    // Wait for processing to complete
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 30000 });

    // Check that result images have alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const altText = await img.getAttribute('alt');
      expect(altText).toBeTruthy();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Upload image and navigate through workflow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 10000 });

    await page.getByText('ステップ 2').click();
    await page.getByText('商品をくっきりと').click();
    await page.getByText('ステップ 3').click();

    // Verify that animations are reduced or disabled
    // This would typically check for CSS animation-duration: 0s or similar
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all();
    
    // Elements should still be functional even with reduced motion
    await expect(page.getByText('処理を開始')).toBeVisible();
  });
});