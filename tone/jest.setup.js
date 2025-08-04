// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Worker for heic2any
global.Worker = class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
  }

  postMessage(msg) {
    // Mock implementation
  }

  terminate() {
    // Mock implementation
  }
};

// Mock Canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 100,
      height: 100
    })),
    putImageData: jest.fn(),
    canvas: { toBlob: jest.fn((callback) => callback(new Blob())) }
  })),
  width: 100,
  height: 100
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;

// Mock Image constructor
global.Image = class MockImage {
  onload = null;
  src = '';
  width = 100;
  height = 100;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
};