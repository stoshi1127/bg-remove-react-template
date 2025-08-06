/**
 * Setup file for integration tests
 * Configures common mocks and utilities for integration testing
 */

import '@testing-library/jest-dom';

// Mock Web Workers
class MockWorker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(data) {
    // Simulate async processing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            processedData: data.imageData,
            success: true
          }
        });
      }
    }, 100);
  }
  
  terminate() {}
}

global.Worker = MockWorker;

// Mock File API
global.FileReader = class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mock-base64-data`;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 10);
  }
  
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 10);
  }
};

// Mock Blob and URL
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
  
  slice() {
    return new MockBlob(this.parts, this.options);
  }
  
  stream() {
    return new ReadableStream();
  }
  
  text() {
    return Promise.resolve(this.parts.join(''));
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(8));
  }
};

// Mock Canvas and Image processing
const mockImageData = {
  data: new Uint8ClampedArray(400), // 10x10 image
  width: 10,
  height: 10
};

const mockCanvasContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => mockImageData),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => mockImageData),
  canvas: {
    toBlob: jest.fn((callback) => {
      setTimeout(() => {
        callback(new Blob(['mock-image-data'], { type: 'image/jpeg' }));
      }, 10);
    }),
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-data'),
    width: 100,
    height: 100
  }
};

global.HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

// Mock Image constructor
global.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 100;
    this.height = 100;
    this.naturalWidth = 100;
    this.naturalHeight = 100;
    
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
};

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Export utilities for tests
const createMockFile = (name, type = 'image/jpeg', size = 1000) => {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type });
};

const createMockImageData = (width = 100, height = 100) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(Math.random() * 256);     // R
    data[i + 1] = Math.floor(Math.random() * 256); // G
    data[i + 2] = Math.floor(Math.random() * 256); // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
};

const waitForImageLoad = (img) => {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
    }
  });
};

module.exports = {
  createMockFile,
  createMockImageData,
  waitForImageLoad,
  mockCanvasContext,
  mockImageData
};