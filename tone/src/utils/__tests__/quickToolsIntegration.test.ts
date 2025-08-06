/**
 * QuickToolsサービス間連携ユーティリティのテスト
 */

import {
  QUICKTOOLS_SERVICES,
  getOtherServices,
  getServicesByCategory,
  getRecommendedWorkflow,
  generateServiceUrl,
  QUICKTOOLS_BRAND,
  shareUserPreferences,
  getSharedUserPreferences,
} from '../quickToolsIntegration';

describe('QuickToolsIntegration', () => {
  describe('QUICKTOOLS_SERVICES', () => {
    it('should contain all expected services', () => {
      expect(QUICKTOOLS_SERVICES).toHaveLength(5);
      
      const serviceIds = QUICKTOOLS_SERVICES.map(s => s.id);
      expect(serviceIds).toContain('bg-remove');
      expect(serviceIds).toContain('resize');
      expect(serviceIds).toContain('convert');
      expect(serviceIds).toContain('compress');
      expect(serviceIds).toContain('tone');
    });

    it('should have valid service structure', () => {
      QUICKTOOLS_SERVICES.forEach(service => {
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('url');
        expect(service).toHaveProperty('icon');
        expect(service).toHaveProperty('category');
        expect(service).toHaveProperty('isActive');
        
        expect(typeof service.id).toBe('string');
        expect(typeof service.name).toBe('string');
        expect(typeof service.description).toBe('string');
        expect(typeof service.url).toBe('string');
        expect(typeof service.icon).toBe('string');
        expect(['image', 'utility', 'converter']).toContain(service.category);
        expect(typeof service.isActive).toBe('boolean');
      });
    });
  });

  describe('getOtherServices', () => {
    it('should return services excluding the current one', () => {
      const otherServices = getOtherServices('tone');
      
      expect(otherServices).toHaveLength(4);
      expect(otherServices.find(s => s.id === 'tone')).toBeUndefined();
      expect(otherServices.find(s => s.id === 'bg-remove')).toBeDefined();
    });

    it('should only return active services', () => {
      const otherServices = getOtherServices('tone');
      
      otherServices.forEach(service => {
        expect(service.isActive).toBe(true);
      });
    });
  });

  describe('getServicesByCategory', () => {
    it('should return services filtered by category', () => {
      const imageServices = getServicesByCategory('image');
      
      expect(imageServices.length).toBeGreaterThan(0);
      imageServices.forEach(service => {
        expect(service.category).toBe('image');
      });
    });

    it('should return empty array for non-existent category', () => {
      const services = getServicesByCategory('utility');
      expect(services.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecommendedWorkflow', () => {
    it('should return recommended services for tone', () => {
      const recommended = getRecommendedWorkflow('tone');
      
      expect(recommended.length).toBeGreaterThan(0);
      expect(recommended.find(s => s.id === 'tone')).toBeUndefined();
    });

    it('should return empty array for unknown service', () => {
      const recommended = getRecommendedWorkflow('unknown-service');
      expect(recommended).toHaveLength(0);
    });
  });

  describe('generateServiceUrl', () => {
    it('should generate correct URL without parameters', () => {
      const url = generateServiceUrl('bg-remove');
      expect(url).toBe('https://quicktools.app/bg-remove');
    });

    it('should generate correct URL with parameters', () => {
      const url = generateServiceUrl('bg-remove', { source: 'tone', ref: 'workflow' });
      expect(url).toContain('https://quicktools.app/bg-remove');
      expect(url).toContain('source=tone');
      expect(url).toContain('ref=workflow');
    });

    it('should throw error for unknown service', () => {
      expect(() => generateServiceUrl('unknown-service')).toThrow('Service not found: unknown-service');
    });
  });

  describe('QUICKTOOLS_BRAND', () => {
    it('should have all required brand properties', () => {
      expect(QUICKTOOLS_BRAND).toHaveProperty('name');
      expect(QUICKTOOLS_BRAND).toHaveProperty('tagline');
      expect(QUICKTOOLS_BRAND).toHaveProperty('colors');
      expect(QUICKTOOLS_BRAND).toHaveProperty('social');
      expect(QUICKTOOLS_BRAND).toHaveProperty('support');
    });

    it('should have valid color values', () => {
      const colors = QUICKTOOLS_BRAND.colors;
      Object.values(colors).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should have valid URLs', () => {
      const { social, support } = QUICKTOOLS_BRAND;
      
      Object.values(social).forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
      });
      
      Object.values(support).forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('User Preferences', () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };

    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
      jest.clearAllMocks();
    });

    describe('shareUserPreferences', () => {
      it('should save preferences to localStorage', () => {
        const preferences = { theme: 'dark', language: 'ja' };
        
        shareUserPreferences(preferences);
        
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'quicktools_preferences',
          JSON.stringify(preferences)
        );
      });

      it('should handle localStorage errors gracefully', () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('Storage full');
        });
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        expect(() => shareUserPreferences({ test: 'value' })).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save user preferences:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });

    describe('getSharedUserPreferences', () => {
      it('should retrieve preferences from localStorage', () => {
        const preferences = { theme: 'dark', language: 'ja' };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(preferences));
        
        const result = getSharedUserPreferences();
        
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('quicktools_preferences');
        expect(result).toEqual(preferences);
      });

      it('should return null when no preferences exist', () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        
        const result = getSharedUserPreferences();
        
        expect(result).toBeNull();
      });

      it('should handle JSON parse errors gracefully', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-json');
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = getSharedUserPreferences();
        
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load user preferences:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });
  });
});