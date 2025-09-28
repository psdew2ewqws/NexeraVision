#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import path mappings for the new enterprise structure
const pathMappings = [
  // Common/shared path updates
  { from: /\.\.\/\.\.\/common\//g, to: '../../shared/common/' },
  { from: /\.\.\/common\//g, to: '../shared/common/' },
  { from: /\.\.\/config\//g, to: '../shared/config/' },
  { from: /\.\.\/\.\.\/config\//g, to: '../../shared/config/' },
  
  // Database path updates
  { from: /\.\.\/database\//g, to: '../shared/database/' },
  { from: /\.\.\/\.\.\/database\//g, to: '../../shared/database/' },
  { from: /\.\.\/modules\/database\//g, to: '../shared/database/' },
  { from: /\.\.\/\.\.\/modules\/database\//g, to: '../../shared/database/' },
  
  // Domain-specific imports
  { from: /\.\.\/\.\.\/modules\/auth\//g, to: '../../domains/auth/' },
  { from: /\.\.\/\.\.\/modules\/companies\//g, to: '../../domains/companies/' },
  { from: /\.\.\/\.\.\/modules\/branches\//g, to: '../../domains/branches/' },
  { from: /\.\.\/\.\.\/modules\/users\//g, to: '../../domains/users/' },
  { from: /\.\.\/\.\.\/modules\/menu\//g, to: '../../domains/menu/' },
  { from: /\.\.\/\.\.\/modules\/orders\//g, to: '../../domains/orders/' },
  { from: /\.\.\/\.\.\/modules\/delivery\//g, to: '../../domains/delivery/' },
  { from: /\.\.\/\.\.\/modules\/analytics\//g, to: '../../domains/analytics/' },
  { from: /\.\.\/\.\.\/modules\/licenses\//g, to: '../../domains/licenses/' },
  { from: /\.\.\/\.\.\/modules\/modifiers\//g, to: '../../domains/modifiers/' },
  { from: /\.\.\/\.\.\/modules\/availability\//g, to: '../../domains/availability/' },
  { from: /\.\.\/\.\.\/modules\/promotions\//g, to: '../../domains/promotions/' },
  { from: /\.\.\/\.\.\/modules\/printing\//g, to: '../../domains/printing/' },
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    pathMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in: ${filePath}`);
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

// Process all domains and shared modules
const backendSrc = '/home/admin/restaurant-platform-remote-v2/backend/src';
console.log('🔧 Fixing import paths in enterprise structure...\n');

// Fix domains
walkDirectory(path.join(backendSrc, 'domains'));

// Fix shared modules  
walkDirectory(path.join(backendSrc, 'shared'));

// Fix main files
const mainFiles = ['app.module.ts', 'app.controller.ts', 'main.ts'];
mainFiles.forEach(file => {
  const filePath = path.join(backendSrc, file);
  if (fs.existsSync(filePath)) {
    fixImportsInFile(filePath);
  }
});

console.log('\n✅ Import path fixing complete!');
console.log('📝 All TypeScript files have been updated for the new enterprise structure.');