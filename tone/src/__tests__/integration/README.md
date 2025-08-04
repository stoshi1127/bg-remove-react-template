# Integration Test Suite

This directory contains integration tests for the EasyTone application. These tests verify that components work together correctly and that the complete user workflows function as expected.

## Test Structure

### 1. Component Integration Tests (`componentIntegration.test.tsx`)
Tests the communication and data flow between individual components:
- ImageUploader to PresetSelector integration
- PresetSelector to ImageProcessor integration  
- ImageProcessor to ResultViewer integration
- Full application component integration
- Error handling between components

### 2. File Processing Pipeline Tests (`fileProcessingPipeline.test.tsx`)
Tests the complete file processing workflow:
- JPEG/PNG processing pipeline
- HEIC conversion and processing
- Multiple file format handling
- Filter application for each preset
- Download functionality (individual and bulk)
- Error recovery mechanisms

### 3. Workflow Integration Tests (`workflowIntegration.test.tsx`)
Tests the 3-step user workflow:
- Navigation between workflow steps
- Progress indicators and state management
- Workflow error handling
- Accessibility features
- Performance with large file sets
- Workflow reset and restart functionality

### 4. Main Integration Test (`../integration.test.tsx`)
Simplified integration tests covering core functionality:
- Complete workflow from upload to download
- Multiple file processing
- Error handling
- Component data passing
- State consistency
- Performance testing

## Test Coverage

The integration tests cover the following requirements from the specification:

### Requirements 1.1-1.4 (File Upload)
- Multiple file upload functionality
- JPG, PNG, HEIC format support
- Drag & drop functionality
- File preview generation

### Requirements 2.1-2.6 (Preset Selection)
- 4 preset options display and selection
- Preset effect application
- Preview functionality
- No manual adjustment sliders

### Requirements 3.1-3.4 (Batch Processing)
- Bulk preset application
- Progress indication
- Error handling with continuation
- Before/after comparison display

### Requirements 4.1-4.4 (Result Preview)
- Before/after image comparison
- Zoom functionality
- Multiple image navigation
- Applied preset name display

### Requirements 5.1-5.4 (Download)
- Individual file download
- Bulk ZIP download
- Original quality preservation
- Automatic filename generation

### Requirements 6.1-6.4 (UI/UX)
- 3-step workflow navigation
- Current step highlighting
- Clear action indicators
- Responsive design

### Requirements 7.1-7.4 (Brand Integration)
- QuickTools design consistency
- Navigation links
- Logo and branding
- Color scheme compliance

### Requirements 8.1-8.4 (Performance)
- Parallel processing
- Large file handling
- Progress indication
- Memory management

## Running Integration Tests

### Run all integration tests:
```bash
npm run test:integration
```

### Run specific test file:
```bash
npm test -- integration.test.tsx
```

### Run with coverage:
```bash
npm run test:coverage
```

### Run in watch mode:
```bash
npm run test:integration -- --watch
```

## Test Environment Setup

The integration tests use the following mocks and setup:

### Canvas API Mocking
- HTMLCanvasElement.getContext() mocked for image processing
- ImageData creation and manipulation
- Canvas.toBlob() for file generation

### File API Mocking
- File constructor for test file creation
- FileReader for file reading simulation
- URL.createObjectURL/revokeObjectURL for blob handling

### Web Workers Mocking
- Worker constructor and message passing
- Async processing simulation
- Error handling simulation

### Browser API Mocking
- Image constructor for image loading
- ResizeObserver and IntersectionObserver
- matchMedia for responsive design testing

## Test Data

### Mock Files
Tests use various mock file types:
- JPEG files (image/jpeg)
- PNG files (image/png)  
- HEIC files (image/heic)
- Invalid files (text/plain) for error testing

### Mock Image Data
- 100x100 pixel mock images
- RGBA color data simulation
- Various file sizes for performance testing

## Assertions and Expectations

### UI Assertions
- Component rendering verification
- Text content and labeling
- Button states and interactions
- Progress indicators and loading states

### Functional Assertions
- File upload and processing
- Preset selection and application
- Image processing completion
- Download functionality

### Error Handling Assertions
- Invalid file rejection
- Processing error recovery
- User feedback display
- Graceful degradation

## Performance Testing

### Load Testing
- Multiple file upload (up to 20 files)
- Large file size handling (10MB+)
- Processing time measurement
- Memory usage monitoring

### Responsiveness Testing
- UI responsiveness during processing
- Progress indication accuracy
- User interaction availability
- Loading state management

## Accessibility Testing

### Keyboard Navigation
- Tab order verification
- Enter/Space key interactions
- Focus management
- Skip links functionality

### Screen Reader Support
- ARIA label verification
- Live region announcements
- Role and state communication
- Alternative text provision

## Browser Compatibility

The integration tests simulate various browser environments:
- Modern browsers with full API support
- Browsers with limited Web Worker support
- Mobile browsers with touch interactions
- Browsers with different Canvas API implementations

## Continuous Integration

These integration tests are designed to run in CI/CD environments:
- Headless browser testing
- Deterministic test execution
- Proper cleanup and teardown
- Parallel test execution support

## Troubleshooting

### Common Issues

1. **Canvas API Errors**: Ensure proper mocking of HTMLCanvasElement
2. **File Upload Failures**: Check File constructor mocking
3. **Async Test Timeouts**: Increase timeout for processing tests
4. **Memory Leaks**: Verify proper cleanup in afterEach hooks

### Debug Mode

Run tests with additional logging:
```bash
DEBUG=true npm run test:integration
```

### Test Isolation

Each test is isolated with:
- Fresh component mounting
- Mock function resets
- Global state cleanup
- Event listener removal