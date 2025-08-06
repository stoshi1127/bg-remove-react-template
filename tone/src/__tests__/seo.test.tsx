import { describe, it, expect } from '@jest/globals';
import { generateStructuredData } from '../app/structured-data';
import { render } from '@testing-library/react';

describe('SEO Implementation', () => {
  it('should generate valid structured data', () => {
    const structuredData = generateStructuredData();
    expect(structuredData).toBeDefined();
    expect(structuredData.props.type).toBe('application/ld+json');
    
    const jsonData = JSON.parse(structuredData.props.dangerouslySetInnerHTML.__html);
    expect(jsonData['@context']).toBe('https://schema.org');
    expect(jsonData['@type']).toBe('WebApplication');
    expect(jsonData.name).toBe('EasyTone');
    expect(jsonData.url).toBe('https://quicktools.app/tone');
  });

  it('should include required SEO elements', () => {
    const jsonData = JSON.parse(generateStructuredData().props.dangerouslySetInnerHTML.__html);
    
    // Check required fields
    expect(jsonData.description).toContain('3ステップで簡単に');
    expect(jsonData.applicationCategory).toBe('MultimediaApplication');
    expect(jsonData.featureList).toBeInstanceOf(Array);
    expect(jsonData.featureList.length).toBeGreaterThan(0);
    
    // Check author and publisher
    expect(jsonData.author.name).toBe('QuickTools');
    expect(jsonData.publisher.name).toBe('QuickTools');
    
    // Check offers (free service)
    expect(jsonData.offers.price).toBe('0');
    expect(jsonData.offers.priceCurrency).toBe('JPY');
  });

  it('should include FAQ structured data', () => {
    const jsonData = JSON.parse(generateStructuredData().props.dangerouslySetInnerHTML.__html);
    
    expect(jsonData.mainEntity['@type']).toBe('FAQPage');
    expect(jsonData.mainEntity.mainEntity).toBeInstanceOf(Array);
    expect(jsonData.mainEntity.mainEntity.length).toBeGreaterThan(0);
    
    const firstFaq = jsonData.mainEntity.mainEntity[0];
    expect(firstFaq['@type']).toBe('Question');
    expect(firstFaq.name).toBeDefined();
    expect(firstFaq.acceptedAnswer['@type']).toBe('Answer');
    expect(firstFaq.acceptedAnswer.text).toBeDefined();
  });

  it('should render structured data component without errors', () => {
    const StructuredDataComponent = () => generateStructuredData();
    
    expect(() => {
      render(<StructuredDataComponent />);
    }).not.toThrow();
  });
});