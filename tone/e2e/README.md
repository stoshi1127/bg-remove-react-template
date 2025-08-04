# E2E Test Suite

This directory contains End-to-End (E2E) tests for the EasyTone application using Playwright. These tests verify the complete user workflows across different browsers and devices.

## Test Structure

### 1. Workflow Tests (`workflow.spec.ts`)
Tests the complete 3-step user workflow:
- **Full workflow completion**: Upload → Preset Selection → Processing → Download
- **Multiple file processing**: Handling batch uploads and processing
- **Workflow navigation**: Moving between steps and maintaining state
- **Progress indication**: Visual feedback during processing
- **Workflow reset**: Starting over with new images

### 2. Accessibility Tests (`accessibility.spec.ts`)
Tests accessibility compliance and usability:
- **Keyboard navigation**: Tab order and keyboard interactions
- **ARIA compliance**: Labels, roles, and live regions
- **Screen reader support**: Announcements and descriptions
- **Focus management**: Proper focus handling throughout workflow
- **High contrast mode**: Visual accessibility features
- **Heading hierarchy**: Proper semantic structure
- **Alternative text**: Image descriptions and labels
- **Reduced motion**: Respecting user preferences

### 3. Browser Compatibility Tests (`browser-compatibility.spec.ts`)
Tests functionality across different browsers and environments:
- **Multi-browser support**: Chrome, Firefox, Safari
- **Canvas API compatibility**: Image processing functionality
- **Web Worker support**: Parallel processing capabilities
- **Mobile device testing**: Touch interactions and responsive design
- **Feature detection**: Graceful degradation for missing APIs
- **Performance testing**: Slow network and memory constraints

### 4. Usability Tests (`usability.spec.ts`)
Tests user experience and interface design:
- **Visual feedback**: Clear indication of user actions and states
- **Error handling**: Helpful error messages and recovery options
- **Progress indication**: Detailed processing feedback
- **Drag and drop**: Intuitive file upload interactions
- **Instructions and help**: Clear guidance throughout workflow
- **Mistake recovery**: Ability to correct user errors
- **Loading states**: Appropriate feedback during operations
- **Success indicators**: Clear completion notifications
- **Context preservation**: Maintaining state during navigation
- **Touch targets**: Mobile-friendly interaction areas

## Test Coverage

The E2E tests cover all requirements from the specification:

### Requirements 6.1-6.4 (UI/UX)
- ✅ 3-step workflow navigation
- ✅ Current step highlighting
- ✅ Clear action indicators
- ✅ Responsive design across devices

### Requirements 7.1-7.4 (Brand Integration)
- ✅ QuickTools design consistency
- ✅ Navigation and branding elements
- ✅ Color scheme compliance

### Requirements 8.1-8.4 (Performance)
- ✅ Parallel processing functionality
- ✅ Large file handling
- ✅ Progress indication accuracy
- ✅ Memory management

### Additional Coverage
- ✅ Cross-browser compatibility
- ✅ Mobile device support
- ✅ Accessibility compliance (WCAG 2.1)
- ✅ Error handling and recovery
- ✅ Performance under constraints

## Running E2E Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`
3. Start the development server: `npm run dev`

### Test Commands

#### Run all E2E tests:
```bash
npm run test:e2e
```

#### Run tests with UI mode (interactive):
```bash
npm run test:e2e:ui
```

#### Run tests in headed mode (visible browser):
```bash
npm run test:e2e:headed
```

#### Debug tests:
```bash
npm run test:e2e:debug
```

#### View test report:
```bash
npm run test:e2e:report
```

#### Run specific test file:
```bash
npx playwright test workflow.spec.ts
```

#### Run tests on specific browser:
```bash
npx playwright test --project=chromium
```

#### Run tests on mobile:
```bash
npx playwright test --project="Mobile Chrome"
```

## Test Configuration

### Browser Support
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)
- **Responsive**: Various viewport sizes

### Test Environment
- **Base URL**: http://localhost:3000
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Full parallelization enabled

### Reporting
- **HTML Report**: Generated after test runs
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## Test Data

### Fixtures
Located in `e2e/fixtures/`:
- `test-image.jpg`: Standard JPEG test image
- `test1.jpg`: Additional JPEG for multi-file tests
- `test2.png`: PNG format test image
- `invalid.txt`: Invalid file for error testing

### Mock Data
Tests use realistic mock data for:
- Image files of various formats
- Processing results and metadata
- Error conditions and edge cases

## Continuous Integration

### CI Configuration
The E2E tests are designed for CI/CD environments:
- Headless browser execution
- Parallel test execution
- Retry on failure
- Artifact collection (screenshots, videos, reports)

### GitHub Actions Example
```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Debugging Tests

### Local Debugging
1. Use `npm run test:e2e:debug` for step-by-step debugging
2. Use `npm run test:e2e:headed` to see browser actions
3. Use `npm run test:e2e:ui` for interactive test development

### Test Failures
1. Check screenshots in `test-results/`
2. View HTML report with `npm run test:e2e:report`
3. Examine traces for detailed execution steps

### Common Issues
- **Timeout errors**: Increase timeout for slow operations
- **Element not found**: Check selectors and wait conditions
- **Flaky tests**: Add proper wait conditions and retries

## Best Practices

### Test Writing
1. Use descriptive test names
2. Include proper wait conditions
3. Test realistic user scenarios
4. Verify both success and error paths

### Selectors
1. Prefer semantic selectors (role, label)
2. Use data-testid for complex elements
3. Avoid brittle CSS selectors
4. Test accessibility attributes

### Assertions
1. Use specific assertions
2. Wait for elements to be visible/enabled
3. Verify user-facing text and behavior
4. Test error messages and feedback

## Performance Considerations

### Test Execution
- Tests run in parallel for speed
- Shared browser contexts where possible
- Efficient fixture management
- Proper cleanup after tests

### Resource Usage
- Optimized for CI environments
- Configurable worker count
- Memory-efficient test design
- Proper browser lifecycle management

## Accessibility Testing

### WCAG 2.1 Compliance
- **Level A**: Basic accessibility requirements
- **Level AA**: Standard accessibility requirements
- **Level AAA**: Enhanced accessibility (where applicable)

### Testing Areas
- Keyboard navigation and focus management
- Screen reader compatibility
- Color contrast and visual design
- Alternative text and descriptions
- Form labels and error messages
- Semantic HTML structure

### Tools Integration
- Built-in Playwright accessibility testing
- axe-core integration for automated checks
- Manual testing scenarios for complex interactions

## Mobile Testing

### Device Coverage
- **iOS**: iPhone 12, iPad
- **Android**: Pixel 5, various screen sizes
- **Responsive**: Breakpoint testing

### Touch Interactions
- Tap targets and touch areas
- Swipe and scroll behaviors
- Virtual keyboard handling
- Orientation changes

### Performance
- Network throttling simulation
- Battery and memory constraints
- Touch response times
- Loading performance on mobile networks