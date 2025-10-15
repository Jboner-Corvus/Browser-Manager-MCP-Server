const fs = require('fs');
const path = require('path');

console.log('📦 Packing extension...');

const distPath = path.resolve('../dist/extension');
const manifestPath = path.resolve('./manifest.json');
const iconsPath = path.resolve('./build/icons');
const htmlPath = path.resolve('./src/ui');

// Copy manifest
fs.copyFileSync(manifestPath, path.join(distPath, 'manifest.json'));
console.log('✅ Manifest copied');

// Create icons directory and copy icons
if (!fs.existsSync(path.join(distPath, 'icons'))) {
  fs.mkdirSync(path.join(distPath, 'icons'), { recursive: true });
}

if (fs.existsSync(iconsPath)) {
  fs.readdirSync(iconsPath).forEach(file => {
    if (file.endsWith('.png')) {
      fs.copyFileSync(path.join(iconsPath, file), path.join(distPath, 'icons', file));
    }
  });
  console.log('✅ Icons copied');
}

// Copy CSP-compliant HTML files instead of original ones
const cspFiles = [
  { src: './status-csp.html', dest: path.join(distPath, 'status.html') },
  { src: './connect-csp.html', dest: path.join(distPath, 'connect.html') }
];

cspFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(path.resolve(src))) {
    fs.copyFileSync(path.resolve(src), dest);
    console.log(`✅ ${path.basename(src)} copied as ${path.basename(dest)}`);
  }
});
console.log('✅ CSP-compliant HTML files copied');

// Copy CSP loader files
const loaderFiles = [
  { src: './connect-loader.js', dest: path.join(distPath, 'connect-loader.js') },
  { src: './status-loader.js', dest: path.join(distPath, 'status-loader.js') }
];

loaderFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(path.resolve(src))) {
    fs.copyFileSync(path.resolve(src), dest);
    console.log(`✅ ${path.basename(src)} copied`);
  }
});

console.log('✅ Extension packed successfully!');