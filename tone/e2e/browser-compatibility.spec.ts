/**
 * E2E browser compatibility tests
 * Tests functionality across different browsers and devices
 */

import { test, expect, devices } from '@playwright/test';
import path from 'path';

const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

// Test on different browsers
const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`Browser Compatibility - ${browserName}`, () => {
    test.use({ 
      ...browserName === 'webkit' ? devices['Desktop Safari'] : 
        browserName === 'firefox' ? devices['Desktop Firefox'] : 
        devices['Desktop Chrome'] 
    });

    test(`should work correctly on ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Test basic functionality
      await expect(page.getByText('ステップ 1')).toBeVisible();
      
      // Upload image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for processing (may be slower on some browsers)
      await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
      
      // Select preset
      await page.getByText('商品をくっきりと').click();
      await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 10000 });
      
      // Process image
      await page.getByText('処理を開始').click();
      await expect(page.getByText('処理結果')).toBeVisible({ timeout: 45000 });
    });

    test(`should handle Canvas API on ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Check if Canvas API is supported
      const canvasSupport = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      });
      
      expect(canvasSupport).toBe(true);
      
      // Test image processing which relies on Canvas
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
      await page.getByText('商品をくっきりと').click();
      await page.getByText('処理を開始').click();
      
      // Should complete without Canvas errors
      await expect(page.getByText('処理結果')).toBeVisible({ timeout: 45000 });
    });

    test(`should handle Web Workers on ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Check Web Worker support
      const workerSupport = await page.evaluate(() => {
        return typeof Worker !== 'undefined';
      });
      
      expect(workerSupport).toBe(true);
      
      // Test functionality that uses Web Workers
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
      await page.getByText('商品をくっきりと').click();
      await page.getByText('処理を開始').click();
      
      // Processing should work with Web Workers
      await expect(page.getByText('処理結果')).toBeVisible({ timeout: 45000 });
    });
  });
});

// Mobile device testing
test.describe('Mobile Device Compatibility', () => {
  test('should work on mobile Chrome', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    const page = await context.newPage();
    
    await page.goto('/');
    
    // Test mobile-specific interactions
    await expect(page.getByText('ステップ 1')).toBeVisible();
    
    // Mobile file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
    
    // Touch interactions
    await page.getByText('商品をくっきりと').tap();
    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 10000 });
    
    await page.getByText('処理を開始').tap();
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 45000 });
    
    await context.close();
  });

  test('should work on mobile Safari', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await page.goto('/');
    
    // Test iOS-specific behavior
    await expect(page.getByText('ステップ 1')).toBeVisible();
    
    // iOS file handling
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
    
    // Test viewport and touch interactions
    await page.getByText('明るくクリアに').tap();
    await expect(page.getByText('ステップ 3')).toBeEnabled({ timeout: 10000 });
    
    await context.close();
  });

  test('should be responsive on different screen sizes', async ({ browser }) => {
    const viewports = [
      { width: 320, height: 568 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // iPad landscape
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Check that main elements are visible at this viewport
      await expect(page.getByText('ステップ 1')).toBeVisible();
      await expect(page.getByText('画像をアップロード')).toBeVisible();
      
      // Test basic functionality
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
      
      await context.close();
    }
  });
});

// Feature detection tests
test.describe('Feature Detection', () => {
  test('should handle missing File API gracefully', async ({ page }) => {
    // Mock missing File API
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.File;
    });
    
    await page.goto('/');
    
    // Should show appropriate fallback or error message
    await expect(page.getByText('ステップ 1')).toBeVisible();
    
    // Check for fallback behavior
    const errorMessage = page.locator('[role="alert"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('サポートされていない');
    }
  });

  test('should handle missing Canvas API gracefully', async ({ page }) => {
    // Mock missing Canvas API
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function() {
        return null;
      };
    });
    
    await page.goto('/');
    
    // Upload should still work
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
    
    // Should show appropriate error when trying to process
    await page.getByText('商品をくっきりと').click();
    await page.getByText('処理を開始').click();
    
    // Should show error message about Canvas support
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing Web Worker gracefully', async ({ page }) => {
    // Mock missing Web Worker
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.Worker;
    });
    
    await page.goto('/');
    
    // Should still function with fallback processing
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 15000 });
    await page.getByText('商品をくっきりと').click();
    await page.getByText('処理を開始').click();
    
    // Should complete processing (may be slower without workers)
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 60000 });
  });
});

// Performance tests
test.describe('Performance Compatibility', () => {
  test('should handle slow network conditions', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Simulate slow 3G
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.goto('/');
    
    // Should still load and function
    await expect(page.getByText('ステップ 1')).toBeVisible({ timeout: 30000 });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    await expect(page.getByText('ステップ 2')).toBeEnabled({ timeout: 30000 });
    
    await context.close();
  });

  test('should handle memory constraints', async ({ page }) => {
    await page.goto('/');
    
    // Test with multiple large files (simulated)
    const largeFiles = Array.from({ length: 5 }, (_, i) => testImagePath);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFiles);
    
    // Should handle multiple files without crashing
    await expect(page.getByText('5 枚の画像がアップロードされました')).toBeVisible({ timeout: 30000 });
    
    await page.getByText('商品をくっきりと').click();
    await page.getByText('処理を開始').click();
    
    // Should complete processing or show appropriate memory warnings
    await expect(page.getByText('処理結果')).toBeVisible({ timeout: 120000 });
  });
});