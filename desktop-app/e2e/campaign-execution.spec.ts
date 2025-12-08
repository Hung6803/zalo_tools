import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite for Campaign Execution
 *
 * Prerequisites:
 * 1. Backend server running on localhost:3001
 * 2. Frontend running on localhost:3000 (or Electron app launched)
 * 3. Test account already logged in
 * 4. Test data prepared (templates, contacts)
 */

test.describe('Campaign Execution Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to app
    await page.goto('http://localhost:3000');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Select test account (assuming first account is already logged in)
    const accountCard = page.locator('.MuiPaper-root').first();
    await accountCard.click();
  });

  test('EXE-001 to EXE-005: Complete campaign lifecycle', async () => {
    /**
     * Tests the complete flow:
     * 1. Create campaign
     * 2. Start campaign
     * 3. Pause campaign
     * 4. Resume campaign
     * 5. Campaign completes
     */

    // Navigate to Campaigns
    await page.click('text=Quản lý Chiến Dịch');
    await expect(page.locator('h5:has-text("Quản lý Chiến Dịch")')).toBeVisible();

    // Create new campaign
    await page.click('button:has-text("Tạo Chiến Dịch")');

    // Fill campaign form
    await page.fill('input[name="name"]', 'E2E Test Campaign');
    await page.fill('textarea[name="description"]', 'Automated test campaign');

    // Select campaign type (MESSAGE_TO_FRIENDS)
    await page.click('text=Gửi tin nhắn đến bạn bè');

    // Select template
    await page.click('text=Template *');
    await page.click('text=Test Template'); // Assuming this exists

    // Add recipients (assuming there's a way to add them in UI)
    // This would be implemented based on actual UI

    // Set delay
    await page.fill('input[label="Độ trễ giữa các tin nhắn (ms)"]', '1000');

    // Create campaign
    await page.click('button:has-text("Tạo")');

    // Wait for success message
    await expect(page.locator('text=Tạo chiến dịch thành công')).toBeVisible({ timeout: 5000 });

    // Find the created campaign
    const campaignCard = page.locator('.MuiCard-root:has-text("E2E Test Campaign")');
    await expect(campaignCard).toBeVisible();

    // Verify status is "draft"
    await expect(campaignCard.locator('text=Nháp')).toBeVisible();

    // Test EXE-001: Start campaign
    const playButton = campaignCard.locator('button[aria-label*="Bắt đầu"]');
    await playButton.click();

    // Wait for status change to "running"
    await expect(campaignCard.locator('text=Đang chạy')).toBeVisible({ timeout: 5000 });

    // Verify progress bar appears
    await expect(campaignCard.locator('.MuiLinearProgress-root')).toBeVisible();

    // Test EXE-002: Pause campaign
    await page.waitForTimeout(2000); // Let it run for 2 seconds
    const pauseButton = campaignCard.locator('button[aria-label*="Tạm dừng"]');
    await pauseButton.click();

    // Verify status is "paused"
    await expect(campaignCard.locator('text=Tạm dừng')).toBeVisible({ timeout: 3000 });

    // Get current progress
    const progressText = await campaignCard.locator('text=/\\d+\\/\\d+/').textContent();

    // Test EXE-003: Resume campaign
    const resumeButton = campaignCard.locator('button[aria-label*="Tiếp tục"]');
    await resumeButton.click();

    // Verify status is "running" again
    await expect(campaignCard.locator('text=Đang chạy')).toBeVisible({ timeout: 3000 });

    // Test EXE-005: Wait for completion
    // This assumes campaign has few recipients for testing
    await expect(campaignCard.locator('text=Hoàn thành')).toBeVisible({ timeout: 30000 });

    // Verify final counts
    const sentCount = await campaignCard.locator('[data-testid="sent-count"]').textContent();
    expect(parseInt(sentCount || '0')).toBeGreaterThan(0);
  });

  test('CMP-001: Create MESSAGE_TO_PHONE campaign', async () => {
    await page.click('text=Quản lý Chiến Dịch');
    await page.click('button:has-text("Tạo Chiến Dịch")');

    // Fill basic info
    await page.fill('input[name="name"]', 'Phone Campaign Test');

    // Expand messaging category
    await page.click('text=Tin nhắn');

    // Select MESSAGE_TO_PHONE type
    await page.click('text=Gửi tin nhắn qua số điện thoại');

    // Verify template selector appears
    await expect(page.locator('text=Template *')).toBeVisible();

    // Select template
    await page.click('text=Template *');
    await page.click('.MuiMenuItem-root:has-text("Test Template")');

    // Submit
    await page.click('button:has-text("Tạo")');

    // Verify campaign created
    await expect(page.locator('text=Tạo chiến dịch thành công')).toBeVisible();
  });

  test('EXE-004: Stop running campaign', async () => {
    // Navigate to campaigns
    await page.click('text=Quản lý Chiến Dịch');

    // Find a running campaign (or create and start one)
    const runningCampaign = page.locator('.MuiCard-root:has-text("Đang chạy")').first();

    if (await runningCampaign.count() > 0) {
      // Stop the campaign
      const stopButton = runningCampaign.locator('button[aria-label*="Dừng"]');
      await stopButton.click();

      // Verify status changed to "stopped"
      await expect(runningCampaign.locator('text=Đã dừng')).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('EXE-006: Progress tracking accuracy', async () => {
    await page.click('text=Quản lý Chiến Dịch');

    // Find a running campaign
    const runningCampaign = page.locator('.MuiCard-root:has-text("Đang chạy")').first();

    if (await runningCampaign.count() > 0) {
      // Get initial progress
      const initialProgress = await runningCampaign.locator('[data-testid="progress"]').getAttribute('value');

      // Wait 5 seconds
      await page.waitForTimeout(5000);

      // Get new progress
      const newProgress = await runningCampaign.locator('[data-testid="progress"]').getAttribute('value');

      // Verify progress increased
      expect(parseFloat(newProgress || '0')).toBeGreaterThan(parseFloat(initialProgress || '0'));

      // Verify sentCount + failedCount matches progress
      const sentCount = await runningCampaign.locator('[data-testid="sent-count"]').textContent();
      const failedCount = await runningCampaign.locator('[data-testid="failed-count"]').textContent();
      const totalRecipients = await runningCampaign.locator('[data-testid="total-recipients"]').textContent();

      const processed = parseInt(sentCount || '0') + parseInt(failedCount || '0');
      const total = parseInt(totalRecipients || '0');
      const expectedProgress = (processed / total) * 100;

      expect(Math.abs(parseFloat(newProgress || '0') - expectedProgress)).toBeLessThan(1);
    } else {
      test.skip();
    }
  });

  test('MGT-002: View campaign details', async () => {
    await page.click('text=Quản lý Chiến Dịch');

    // Find any campaign
    const campaign = page.locator('.MuiCard-root').first();

    // Click view details button
    await campaign.locator('button[aria-label*="Xem chi tiết"]').click();

    // Verify dialog appears
    await expect(page.locator('.MuiDialog-root')).toBeVisible();

    // Verify dialog contains campaign details
    await expect(page.locator('.MuiDialog-root:has-text("Chi tiết chiến dịch")')).toBeVisible();

    // Verify key fields are displayed
    await expect(page.locator('text=Tên chiến dịch:')).toBeVisible();
    await expect(page.locator('text=Loại chiến dịch:')).toBeVisible();
    await expect(page.locator('text=Trạng thái:')).toBeVisible();

    // Close dialog
    await page.click('button:has-text("Đóng")');
    await expect(page.locator('.MuiDialog-root')).not.toBeVisible();
  });

  test('MSG-001: MESSAGE_TO_PHONE execution flow', async () => {
    /**
     * Full flow for MESSAGE_TO_PHONE campaign:
     * 1. Create campaign
     * 2. Add phone numbers as recipients
     * 3. Run campaign
     * 4. Verify each recipient receives message
     */

    await page.click('text=Quản lý Chiến Dịch');
    await page.click('button:has-text("Tạo Chiến Dịch")');

    // Configure MESSAGE_TO_PHONE campaign
    await page.fill('input[name="name"]', 'Phone Test Campaign');
    await page.click('text=Gửi tin nhắn qua số điện thoại');
    await page.click('text=Template *');
    await page.click('text=Test Template');

    // Add test phone numbers (this depends on your UI implementation)
    // Assuming there's a recipient input section
    const testPhones = ['0123456789', '0987654321', '0111222333'];

    for (const phone of testPhones) {
      // Add recipient logic here based on actual UI
    }

    // Create and start campaign
    await page.click('button:has-text("Tạo")');
    await page.waitForTimeout(1000);

    const campaign = page.locator('.MuiCard-root:has-text("Phone Test Campaign")');
    await campaign.locator('button[aria-label*="Bắt đầu"]').click();

    // Wait for completion
    await expect(campaign.locator('text=Hoàn thành')).toBeVisible({ timeout: 60000 });

    // Verify all messages sent
    const sentCount = await campaign.locator('[data-testid="sent-count"]').textContent();
    expect(parseInt(sentCount || '0')).toBe(testPhones.length);

    // Verify in message history
    await page.click('text=Lịch Sử Tin Nhắn');

    for (const phone of testPhones) {
      await expect(page.locator(`text=${phone}`)).toBeVisible();
    }
  });
});

test.describe('Contact Management E2E', () => {
  test('Full CRUD flow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Navigate to contacts
    await page.click('text=Danh bạ');
    await expect(page.locator('h5:has-text("Quản Lý Danh Bạ")')).toBeVisible();

    // Test CREATE
    await page.click('button:has-text("Thêm Contact")');
    await page.fill('input[label="User ID"]', 'e2etest123');
    await page.fill('input[label="Tên hiển thị"]', 'E2E Test User');
    await page.fill('input[label="Số điện thoại"]', '0999888777');
    await page.click('button:has-text("Thêm")');

    await expect(page.locator('text=Thêm contact thành công')).toBeVisible();

    // Verify contact appears in list
    await expect(page.locator('text=E2E Test User')).toBeVisible();
    await expect(page.locator('text=e2etest123')).toBeVisible();

    // Test EDIT
    const contactRow = page.locator('tr:has-text("E2E Test User")');
    await contactRow.locator('button[aria-label=""]').click(); // More menu
    await page.click('text=Chỉnh sửa');

    await page.fill('input[label="Tên hiển thị"]', 'E2E Test User Updated');
    await page.click('button:has-text("Lưu")');

    await expect(page.locator('text=Cập nhật contact thành công')).toBeVisible();
    await expect(page.locator('text=E2E Test User Updated')).toBeVisible();

    // Test DELETE
    await contactRow.locator('button[aria-label=""]').click();
    await page.click('text=Xóa');

    // Confirm deletion
    page.on('dialog', dialog => dialog.accept());

    await expect(page.locator('text=Xóa contact thành công')).toBeVisible();
    await expect(page.locator('text=E2E Test User Updated')).not.toBeVisible();
  });

  test('IMP-004 & IMP-001: Import and Export CSV', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Danh bạ');

    // Test EXPORT
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Xuất CSV")'),
    ]);

    expect(download.suggestedFilename()).toMatch(/contacts_\d+\.csv/);

    // Test IMPORT
    const csvContent = `User ID,Tên hiển thị,Số điện thoại,Avatar URL
"import1","Import User 1","0111111111",""
"import2","Import User 2","0222222222",""`;

    // Create file
    const buffer = Buffer.from(csvContent);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Nhập CSV")');
    const fileChooser = await fileChooserPromise;

    // Upload file
    await fileChooser.setFiles({
      name: 'test-import.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });

    // Verify import success
    await expect(page.locator('text=/Đã nhập \\d+ contacts/')).toBeVisible({ timeout: 10000 });

    // Verify imported contacts appear
    await expect(page.locator('text=Import User 1')).toBeVisible();
    await expect(page.locator('text=Import User 2')).toBeVisible();
  });
});

test.describe('Analytics Dashboard E2E', () => {
  test('ANA-001 to ANA-006: View analytics metrics', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Thống kê & Phân tích');

    // Verify overview stats cards
    await expect(page.locator('text=Tổng Chiến Dịch')).toBeVisible();
    await expect(page.locator('text=Tin Nhắn Đã Gửi')).toBeVisible();
    await expect(page.locator('text=Tin Nhắn Thất Bại')).toBeVisible();
    await expect(page.locator('text=Hoàn Thành')).toBeVisible();

    // Verify success rate section
    await expect(page.locator('text=Tỷ Lệ Thành Công')).toBeVisible();
    await expect(page.locator('.MuiLinearProgress-root')).toBeVisible();

    // Verify tables
    await expect(page.locator('text=Top Templates')).toBeVisible();
    await expect(page.locator('text=Loại Chiến Dịch')).toBeVisible();
    await expect(page.locator('text=Nhóm Danh Bạ')).toBeVisible();
    await expect(page.locator('text=Tự Động Trả Lời')).toBeVisible();

    // Test date range filter
    await page.click('text=Khoảng thời gian');
    await page.click('text=7 ngày qua');

    // Wait for data reload
    await page.waitForTimeout(1000);

    // Verify stats updated (numbers might change but elements should still be visible)
    await expect(page.locator('text=Tổng Chiến Dịch')).toBeVisible();
  });
});
