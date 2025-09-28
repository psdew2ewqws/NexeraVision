#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Additional path mappings for remaining issues
const additionalMappings = [
  // Shared paths from domains (need to go up two levels)
  { from: /\.\.\/shared\//g, to: '../../shared/' },
  
  // App controller import
  { from: /\.\/common\//g, to: './shared/common/' },
  
  // Some specific files that might have different paths
  { from: /\.\.\/infrastructure\//g, to: '../../domains/' },
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    additionalMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        const before = content;
        content = content.replace(mapping.from, mapping.to);
        if (content !== before) {
          modified = true;
          console.log(`✅ Fixed additional paths in: ${filePath}`);
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fixImportsInFile(filePath);
    }
  });
}

// Process all backend source files
const backendSrc = '/home/admin/restaurant-platform-remote-v2/backend/src';
console.log('🔧 Fixing remaining import path issues...\n');

walkDirectory(backendSrc);

console.log('\n✅ Additional import path fixes complete!');