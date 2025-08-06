#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying SEO implementation...\n');

// Check if required files exist
const requiredFiles = [
  'public/robots.txt',
  'public/sitemap.xml',
  'public/manifest.json',
  'public/browserconfig.xml',
  'public/.well-known/security.txt',
  'public/humans.txt',
  'src/app/sitemap.ts',
  'src/app/structured-data.tsx'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - exists`);
  } else {
    console.log(`❌ ${file} - missing`);
    allFilesExist = false;
  }
});

// Check robots.txt content
const robotsPath = path.join(__dirname, '..', 'public/robots.txt');
if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  if (robotsContent.includes('Sitemap:') && robotsContent.includes('User-agent:')) {
    console.log('✅ robots.txt - contains required directives');
  } else {
    console.log('❌ robots.txt - missing required directives');
    allFilesExist = false;
  }
}

// Check sitemap.xml content
const sitemapPath = path.join(__dirname, '..', 'public/sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  if (sitemapContent.includes('<urlset') && sitemapContent.includes('<loc>')) {
    console.log('✅ sitemap.xml - contains valid XML structure');
  } else {
    console.log('❌ sitemap.xml - invalid XML structure');
    allFilesExist = false;
  }
}

// Check manifest.json content
const manifestPath = path.join(__dirname, '..', 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifestContent.name && manifestContent.start_url && manifestContent.icons) {
      console.log('✅ manifest.json - contains required PWA fields');
    } else {
      console.log('❌ manifest.json - missing required PWA fields');
      allFilesExist = false;
    }
  } catch (e) {
    console.log('❌ manifest.json - invalid JSON format');
    allFilesExist = false;
  }
}

// Check layout.tsx for metadata
const layoutPath = path.join(__dirname, '..', 'src/app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const hasMetadata = layoutContent.includes('export const metadata');
  const hasOpenGraph = layoutContent.includes('openGraph:');
  const hasTwitter = layoutContent.includes('twitter:');
  const hasManifestLink = layoutContent.includes('rel="manifest"');
  
  if (hasMetadata && hasOpenGraph && hasTwitter && hasManifestLink) {
    console.log('✅ layout.tsx - contains comprehensive metadata');
  } else {
    console.log('❌ layout.tsx - missing some metadata elements');
    console.log(`   - metadata: ${hasMetadata ? '✅' : '❌'}`);
    console.log(`   - openGraph: ${hasOpenGraph ? '✅' : '❌'}`);
    console.log(`   - twitter: ${hasTwitter ? '✅' : '❌'}`);
    console.log(`   - manifest link: ${hasManifestLink ? '✅' : '❌'}`);
    allFilesExist = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 All SEO elements are properly configured!');
  process.exit(0);
} else {
  console.log('⚠️  Some SEO elements need attention.');
  process.exit(1);
}