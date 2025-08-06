/**
 * Integration test runner
 * Runs all integration tests with proper setup and reporting
 */

import { execSync } from 'child_process';
import path from 'path';

const runIntegrationTests = async () => {
  console.log('🚀 Starting Integration Tests...\n');

  const testFiles = [
    'componentIntegration.test.tsx',
    'fileProcessingPipeline.test.tsx',
    'workflowIntegration.test.tsx'
  ];

  const testResults: { file: string; passed: boolean; error?: string }[] = [];

  for (const testFile of testFiles) {
    console.log(`📋 Running ${testFile}...`);
    
    try {
      const testPath = path.join(__dirname, testFile);
      execSync(`npx jest ${testPath} --verbose --maxWorkers=1 --runInBand --forceExit`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout per test file
      });
      
      testResults.push({ file: testFile, passed: true });
      console.log(`✅ ${testFile} passed\n`);
    } catch (error) {
      testResults.push({ 
        file: testFile, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ ${testFile} failed\n`);
    }
  }

  // Print summary
  console.log('📊 Integration Test Summary:');
  console.log('=' .repeat(50));
  
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  
  testResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.file}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`Results: ${passed}/${total} test suites passed`);
  
  if (passed === total) {
    console.log('🎉 All integration tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some integration tests failed');
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

export default runIntegrationTests;