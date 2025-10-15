/**
 * Professional Build Script for Browser Manager MCP Extension
 * Optimized build process with error handling, logging, and performance monitoring
 */

import { build } from 'vite';
import { resolve } from 'path';

interface BuildConfig {
  mode: 'development' | 'production';
  minify: boolean;
  sourcemap: boolean;
  outDir: string;
}

class ProfessionalBuilder {
  private startTime: Date;
  private config: BuildConfig;

  constructor(config: Partial<BuildConfig> = {}) {
    this.startTime = new Date();
    this.config = {
      mode: 'production',
      minify: true,
      sourcemap: false,
      outDir: '../../dist/extension/lib',
      ...config
    };
  }

  async buildExtension(): Promise<void> {
    console.log('🚀 Starting Professional Build Process...');
    console.log(`⚙️  Build Configuration:`, this.config);

    try {
      // Build background script
      await this.buildBackgroundScript();

      // Build UI components
      await this.buildUIComponents();

      // Copy HTML files
      await this.copyHTMLFiles();

      // Copy icons
      await this.copyIcons();

      // Copy manifest
      await this.copyManifest();

      // Generate build report
      this.generateBuildReport();

      console.log('✅ Professional Build Completed Successfully!');

    } catch (error) {
      console.error('❌ Build Failed:', error);
      process.exit(1);
    }
  }

  private async buildBackgroundScript(): Promise<void> {
    console.log('📦 Building Background Script...');

    const backgroundConfig = {
      configFile: resolve('vite.background.config.ts'),
      mode: this.config.mode,
      build: {
        outDir: this.config.outDir,
        lib: {
          entry: resolve('professionalBackground.ts'),
          name: 'background',
          fileName: 'background.mjs',
          formats: ['es']
        },
        minify: this.config.minify,
        sourcemap: this.config.sourcemap,
        rollupOptions: {
          external: ['chrome'],
          output: {
            banner: [
              '/**',
              ' * Professional Browser Manager MCP Extension Background Script',
              ' * Built with enterprise-grade architecture and error handling',
              ' * Generated: ' + new Date().toISOString(),
              ' */'
            ].join('\n')
          }
        }
      }
    };

    await build(backgroundConfig);
    console.log('✅ Background script built successfully');
  }

  private async buildUIComponents(): Promise<void> {
    console.log('🎨 Building UI Components...');

    // Build Connect page
    const connectConfig = {
      configFile: resolve('vite.ui.config.ts'),
      mode: this.config.mode,
      build: {
        outDir: `${this.config.outDir}/ui`,
        lib: {
          entry: resolve('ui/ProfessionalConnect.tsx'),
          name: 'Connect',
          fileName: 'connect.js',
          formats: ['es']
        },
        minify: this.config.minify,
        sourcemap: this.config.sourcemap,
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM'
            }
          }
        }
      }
    };

    // Build Status page
    const statusConfig = {
      configFile: resolve('vite.ui.config.ts'),
      mode: this.config.mode,
      build: {
        outDir: `${this.config.outDir}/ui`,
        lib: {
          entry: resolve('ui/ProfessionalStatus.tsx'),
          name: 'Status',
          fileName: 'status.js',
          formats: ['es']
        },
        minify: this.config.minify,
        sourcemap: this.config.sourcemap,
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM'
            }
          }
        }
      }
    };

    await Promise.all([
      build(connectConfig),
      build(statusConfig)
    ]);

    console.log('✅ UI components built successfully');
  }

  private async copyHTMLFiles(): Promise<void> {
    console.log('📄 Copying HTML files...');

    const fs = await import('fs/promises');
    const path = await import('path');

    const htmlFiles = [
      { src: 'ui/connect.html', dest: `${this.config.outDir}/ui/connect.html` },
      { src: 'ui/status.html', dest: `${this.config.outDir}/ui/status.html` }
    ];

    for (const file of htmlFiles) {
      try {
        await fs.copyFile(resolve(file.src), resolve(file.dest));
        console.log(`✅ Copied ${file.src}`);
      } catch (error) {
        console.error(`❌ Failed to copy ${file.src}:`, error);
        throw error;
      }
    }
  }

  private async copyIcons(): Promise<void> {
    console.log('🎭 Copying icons...');

    const fs = await import('fs/promises');
    const path = await import('path');

    const iconsDir = resolve('../icons');
    const destDir = resolve(`${this.config.outDir}/../icons`);

    try {
      // Ensure destination directory exists
      await fs.mkdir(destDir, { recursive: true });

      // Copy all icon files
      const iconFiles = await fs.readdir(iconsDir);

      for (const iconFile of iconFiles) {
        const srcPath = path.join(iconsDir, iconFile);
        const destPath = path.join(destDir, iconFile);

        const stat = await fs.stat(srcPath);
        if (stat.isFile()) {
          await fs.copyFile(srcPath, destPath);
        }
      }

      console.log('✅ Icons copied successfully');
    } catch (error) {
      console.warn('⚠️  Failed to copy icons:', error);
    }
  }

  private async copyManifest(): Promise<void> {
    console.log('📋 Copying manifest...');

    const fs = await import('fs/promises');

    try {
      // Read and update manifest for professional version
      const manifestContent = await fs.readFile(resolve('../manifest.json'), 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Update version to professional
      manifest.version = '2.0.0';
      manifest.description = 'Browser Manager MCP Extension - Professional Edition';
      manifest.name = 'Browser Manager MCP Professional';

      // Write professional manifest
      await fs.writeFile(
        resolve(`${this.config.outDir}/../manifest.json`),
        JSON.stringify(manifest, null, 2)
      );

      console.log('✅ Manifest updated and copied successfully');
    } catch (error) {
      console.error('❌ Failed to copy manifest:', error);
      throw error;
    }
  }

  private generateBuildReport(): void {
    const endTime = new Date();
    const buildTime = endTime.getTime() - this.startTime.getTime();

    console.log('\n📊 Build Report:');
    console.log('='.repeat(50));
    console.log(`⏱️  Build Time: ${buildTime}ms`);
    console.log(`📦 Mode: ${this.config.mode}`);
    console.log(`🗜️  Minified: ${this.config.minify}`);
    console.log(`📍 Output Directory: ${this.config.outDir}`);
    console.log(`🕐 Completed: ${endTime.toISOString()}`);
    console.log('='.repeat(50));
    console.log('🎉 Browser Manager MCP Professional Extension is ready!');
  }

  async clean(): Promise<void> {
    console.log('🧹 Cleaning previous build...');

    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const outDir = resolve(this.config.outDir);
      await fs.rm(outDir, { recursive: true, force: true });
      console.log('✅ Previous build cleaned successfully');
    } catch (error) {
      console.warn('⚠️  No previous build to clean');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  const builder = new ProfessionalBuilder({
    mode: args.includes('--dev') ? 'development' : 'production',
    minify: !args.includes('--dev'),
    sourcemap: args.includes('--sourcemap')
  });

  try {
    switch (command) {
      case 'clean':
        await builder.clean();
        break;
      case 'build':
        if (!args.includes('--no-clean')) {
          await builder.clean();
        }
        await builder.buildExtension();
        break;
      case 'dev':
        await builder.clean();
        await builder.buildExtension();
        break;
      default:
        console.error('❌ Unknown command:', command);
        console.log('Available commands: build, dev, clean');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Build process failed:', error);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ProfessionalBuilder };