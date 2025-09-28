#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix paths that have incorrect depth
const depthMappings = [
  // Three levels back to two levels back for domains that are directly in domains/
  { from: /\.\.\/\.\.\/\.\.\/shared\//g, to: '../../shared/' },
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    depthMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        const before = content;
        content = content.replace(mapping.from, mapping.to);
        if (content !== before) {
          modified = true;
          console.log(`✅ Fixed depth path in: ${filePath}`);
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
console.log('🔧 Fixing path depth issues...\n');

walkDirectory(backendSrc);

console.log('\n✅ Path depth fixes complete!');