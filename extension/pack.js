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
  // Convert JPG icons to PNG using PowerShell and copy to dist
  const { execSync } = require('child_process');

  try {
    // Use PowerShell to convert JPG to PNG and copy to dist
    const psCommand = `
      $iconsPath = "${iconsPath.replace(/\\/g, '\\\\')}"
      $distPath = "${distPath.replace(/\\/g, '\\\\')}"
      $iconDir = Join-Path $distPath "icons"

      if (!(Test-Path $iconDir)) {
        New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
      }

      Add-Type -AssemblyName System.Drawing
      $jpgFiles = Get-ChildItem (Join-Path $iconsPath "*.jpg")

      foreach ($jpg in $jpgFiles) {
        $pngName = $jpg.Name -replace '\.jpg$', '.png'
        $pngPath = Join-Path $iconDir $pngName

        try {
          $image = [System.Drawing.Image]::FromFile($jpg.FullName)
          $image.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
          $image.Dispose()
          Write-Host "✅ Converted and copied: $($jpg.Name) -> $pngName"
        } catch {
          Write-Host "❌ Failed to convert: $($jpg.Name)"
        }
      }
    `;

    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    console.log('✅ Icons converted from JPG to PNG and copied to dist');
  } catch (error) {
    console.warn('⚠️ PowerShell conversion failed, falling back to basic copy');
    // Fallback: just copy existing PNG files
    fs.readdirSync(iconsPath).forEach(file => {
      if (file.endsWith('.png')) {
        fs.copyFileSync(path.join(iconsPath, file), path.join(distPath, 'icons', file));
        console.log(`✅ Icon copied: ${file}`);
      }
    });
  }
} else {
  console.warn('⚠️ Icons directory not found:', iconsPath);
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

// Copy popup.html and related files
const popupFiles = [
  { src: './popup.html', dest: path.join(distPath, 'popup.html') },
  { src: './popup.css', dest: path.join(distPath, 'popup.css') }
];

popupFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(path.resolve(src))) {
    fs.copyFileSync(path.resolve(src), dest);
    console.log(`✅ ${path.basename(src)} copied`);
  }
});

console.log('✅ Extension packed successfully!');