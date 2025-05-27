module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Disable the rule for unused variables specifically for the 'router' variable
    '@typescript-eslint/no-unused-vars': ['warn', { 'varsIgnorePattern': '^router$' }],
  },
}; 