# Testing Guide - Zalo Marketing Desktop

## Quick Start

### Install Dependencies

```bash
cd desktop-app

# Install test dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest \
  jest \
  ts-jest \
  @playwright/test \
  supertest \
  @types/supertest \
  identity-obj-proxy
```

### Run Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ContactsPanel.test.tsx

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run integration tests only
npm test -- __tests__/api/
```

## Test Structure

```
desktop-app/
├── renderer/
│   └── __tests__/
│       └── components/
│           ├── ContactsPanel.test.tsx
│           ├── CampaignsPanel.test.tsx
│           └── AnalyticsDashboard.test.tsx
├── worker/
│   └── __tests__/
│       ├── api/
│       │   ├── contacts.test.ts
│       │   ├── campaigns.test.ts
│       │   └── analytics.test.ts
│       └── db/
│           └── local-db.test.ts
├── e2e/
│   ├── campaign-execution.spec.ts
│   ├── contacts-crud.spec.ts
│   └── bulk-operations.spec.ts
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

## Writing Tests

### Unit Test Example (React Component)

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactsPanel from '../../src/components/ContactsPanel';

describe('ContactsPanel', () => {
  it('should display contacts', async () => {
    render(<ContactsPanel accountId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Contact')).toBeInTheDocument();
    });
  });
});
```

### Integration Test Example (API)

```typescript
import request from 'supertest';
import app from '../../api-server';

describe('Contacts API', () => {
  it('should create contact', async () => {
    const response = await request(app)
      .post('/local/contacts')
      .send({
        accountId: 1,
        userId: 'test123',
        displayName: 'Test User',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### E2E Test Example (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('create contact flow', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.click('text=Danh bạ');
  await page.click('button:has-text("Thêm Contact")');

  await page.fill('input[label="User ID"]', 'test123');
  await page.fill('input[label="Tên hiển thị"]', 'Test User');

  await page.click('button:has-text("Thêm")');

  await expect(page.locator('text=Test User')).toBeVisible();
});
```

## Test Coverage

### View Coverage Report

```bash
npm test -- --coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in browser to view detailed report.

### Coverage Thresholds

Current thresholds (defined in `jest.config.js`):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Best Practices

### 1. Test Naming Convention

Use descriptive test names that match test case IDs from TEST_PLAN.md:

```typescript
it('CON-001: should display contact list', () => {
  // Test implementation
});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should create contact', async () => {
  // Arrange
  const mockContact = { userId: 'test', displayName: 'Test' };

  // Act
  render(<ContactForm />);
  fireEvent.click(submitButton);

  // Assert
  expect(screen.getByText('Contact created')).toBeVisible();
});
```

### 3. Mock External Dependencies

```typescript
jest.mock('../../api/localApi');

const mockedApi = localApi as jest.Mocked<typeof localApi>;
mockedApi.get.mockResolvedValue({ data: mockData });
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});
```

### 5. Use Data Test IDs

Add data-testid attributes to components for easier selection:

```tsx
<div data-testid="contact-list">
  {contacts.map(c => (
    <div key={c.id} data-testid={`contact-${c.id}`}>
      {c.displayName}
    </div>
  ))}
</div>
```

Then in tests:

```typescript
const contactList = screen.getByTestId('contact-list');
expect(contactList).toBeInTheDocument();
```

## Debugging Tests

### Debug Single Test

```bash
# Run specific test with verbose output
npm test -- --verbose ContactsPanel.test.tsx

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand ContactsPanel.test.tsx
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug E2E Tests

```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug

# Run specific test file
npm run test:e2e -- campaign-execution.spec.ts
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Performance Testing

### Measure Test Execution Time

```bash
npm test -- --verbose --maxWorkers=1
```

### Optimize Slow Tests

1. **Use beforeAll instead of beforeEach** for expensive setup
2. **Mock heavy dependencies** (database, API calls)
3. **Use shallow rendering** when possible
4. **Parallelize tests** (default in Jest)

## Test Data Management

### Seed Test Database

Create `__tests__/helpers/seedDatabase.ts`:

```typescript
export async function seedTestData(db: LocalDatabase) {
  // Create test accounts
  await db.upsertAccount({ accountId: 1, displayName: 'Test Account' });

  // Create test contacts
  await db.upsertContact({
    accountId: 1,
    userId: 'test1',
    displayName: 'Test User 1',
    synced: 0,
  });

  // Create test templates
  await db.createTemplate({
    accountId: 1,
    name: 'Test Template',
    content: 'Hello {name}',
    variables: '["name"]',
  });
}
```

### Clean Test Database

```typescript
afterEach(async () => {
  await db.exec('DELETE FROM contacts');
  await db.exec('DELETE FROM templates');
  await db.exec('DELETE FROM campaigns');
});
```

## Common Issues

### Issue: Tests timing out

**Solution**: Increase timeout in test:

```typescript
it('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Issue: Mock not working

**Solution**: Ensure mock is called before import:

```typescript
jest.mock('../../api/localApi'); // Must be at top
import { Component } from '../../Component';
```

### Issue: E2E test flaky

**Solution**: Add explicit waits:

```typescript
await page.waitForSelector('[data-testid="contact-list"]');
await expect(page.locator('text=Contact')).toBeVisible();
```

### Issue: Can't find element

**Solution**: Use more specific selectors:

```typescript
// Instead of:
screen.getByText('Submit');

// Use:
screen.getByRole('button', { name: 'Submit' });
// Or:
screen.getByTestId('submit-button');
```

## Test Metrics & Reporting

### Generate HTML Report

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Generate Playwright Report

```bash
npm run test:e2e
npx playwright show-report
```

### Track Test Results

- **Total Tests**: Number of test cases executed
- **Pass Rate**: % of tests passing
- **Code Coverage**: % of code covered by tests
- **Execution Time**: Time taken to run all tests
- **Flakiness Rate**: Tests that fail intermittently

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Package.json Scripts

Add these scripts to `desktop-app/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:api": "jest __tests__/api",
    "test:components": "jest __tests__/components",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

## Next Steps

1. ✅ Install test dependencies
2. ✅ Configure Jest and Playwright
3. ⬜ Write unit tests for all components
4. ⬜ Write integration tests for all APIs
5. ⬜ Write E2E tests for critical user flows
6. ⬜ Set up CI/CD pipeline
7. ⬜ Achieve 80%+ code coverage
8. ⬜ Monitor and maintain test suite

---

**Happy Testing! 🧪**
