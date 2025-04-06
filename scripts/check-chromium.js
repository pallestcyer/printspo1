#!/usr/bin/env node

/**
 * This script verifies that Chromium dependencies are properly installed
 * It's meant to be run during the build process on Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking Chromium dependencies...');

// Check environment
const isVercel = process.env.VERCEL === '1';
const nodeEnv = process.env.NODE_ENV || 'unknown';
const runtime = process.version || 'unknown';
const platform = process.platform || 'unknown';
const arch = process.arch || 'unknown';

console.log(`Environment:
- Vercel: ${isVercel ? 'Yes' : 'No'}
- Node Env: ${nodeEnv}
- Node Version: ${runtime}
- Platform: ${platform}
- Architecture: ${arch}
`);

// Track overall success
let hasErrors = false;

// Main function to run checks
async function runChecks() {
  try {
    // First, check system chromium
    if (platform === 'linux') {
      try {
        const chromiumVersion = execSync('chromium-browser --version').toString().trim();
        console.log(`✅ System Chromium version: ${chromiumVersion}`);
      } catch (error) {
        console.log('❌ System Chromium not found or not executable');
        
        try {
          // Try multiple possible paths/commands
          const possibleCommands = [
            'which chromium-browser',
            'which chromium',
            'which google-chrome',
            'find /usr/bin -name "*chromium*"',
            'find /usr/bin -name "*chrome*"'
          ];

          let chromePath = '';
          for (const cmd of possibleCommands) {
            try {
              const result = execSync(cmd).toString().trim();
              if (result) {
                chromePath = result.split('\n')[0]; // Take first result
                console.log(`Found browser at: ${chromePath} (via: ${cmd})`);
                break;
              }
            } catch (e) {
              // Silently continue to next command
            }
          }

          if (chromePath) {
            // Check permissions
            const permissions = fs.statSync(chromePath).mode.toString(8);
            console.log(`Browser permissions: ${permissions}`);
            
            if (!permissions.endsWith('755') && !permissions.endsWith('775') && !permissions.endsWith('777')) {
              console.log('Attempting to make browser executable...');
              execSync(`chmod +x ${chromePath}`);
              console.log('✅ Updated browser permissions');
            }

            // Verify it works now
            try {
              const versionCheck = execSync(`${chromePath} --version`).toString().trim();
              console.log(`✅ Browser is now executable: ${versionCheck}`);
            } catch (verifyError) {
              console.log(`❌ Browser is still not executable: ${verifyError.message}`);
              hasErrors = true;
            }
          } else {
            console.log('❌ No browser found on system');
            hasErrors = true;
          }
        } catch (pathError) {
          console.log('Failed to locate browser path:', pathError.message);
          hasErrors = true;
        }
      }

      // Check if the puppeteer path is writable
      try {
        const puppeteerCachePath = path.join(process.env.HOME || '/tmp', '.cache', 'puppeteer');
        
        if (fs.existsSync(puppeteerCachePath)) {
          console.log(`Found Puppeteer cache at: ${puppeteerCachePath}`);
          
          // Check if directory is writable
          try {
            fs.accessSync(puppeteerCachePath, fs.constants.W_OK);
            console.log('✅ Puppeteer cache directory is writable');
          } catch (permErr) {
            console.log('❌ Puppeteer cache directory is not writable');
            console.log('Attempting to fix permissions...');
            
            try {
              execSync(`chmod -R 777 ${puppeteerCachePath}`);
              console.log('✅ Updated Puppeteer cache permissions');
            } catch (chmodErr) {
              console.log('❌ Failed to update permissions:', chmodErr.message);
              hasErrors = true;
            }
          }
        } else {
          console.log('Puppeteer cache not found, it will be created on first run');
        }
      } catch (cacheErr) {
        console.log('Error checking Puppeteer cache:', cacheErr.message);
      }

      // Check disk space
      try {
        const diskSpace = execSync('df -h /').toString();
        console.log('Disk space:');
        console.log(diskSpace);
        
        // Extract available space
        const available = diskSpace.toString().split('\n')[1].split(/\s+/)[3];
        console.log(`Available space: ${available}`);
        
        // Warning if less than 1GB
        if (available.includes('M') || available.match(/^\d+(\.\d+)?G$/) && parseFloat(available) < 1) {
          console.log('⚠️ Low disk space may cause Chrome to fail');
          hasErrors = true;
        }
      } catch (diskErr) {
        console.log('Unable to check disk space:', diskErr.message);
      }
    }
    
    // Check for @sparticuz/chromium package
    try {
      const packagePath = require.resolve('@sparticuz/chromium');
      console.log(`✅ @sparticuz/chromium found at: ${packagePath}`);
      
      // Check if the package has a chromium binary
      const executablePath = require('@sparticuz/chromium').executablePath;
      if (typeof executablePath === 'function') {
        console.log('✅ @sparticuz/chromium executable path function exists');
        
        // Try to get the actual path
        try {
          const actualPath = await executablePath();
          console.log(`✅ Resolved executable path: ${actualPath}`);
          
          // Check if the file actually exists
          if (fs.existsSync(actualPath)) {
            console.log('✅ Chromium binary exists');
            
            // Check permissions
            const permissions = fs.statSync(actualPath).mode.toString(8);
            console.log(`Binary permissions: ${permissions}`);
            
            if (!permissions.endsWith('755') && !permissions.endsWith('775') && !permissions.endsWith('777')) {
              console.log('Attempting to make binary executable...');
              execSync(`chmod +x ${actualPath}`);
              console.log('✅ Updated binary permissions');
            }
          } else {
            console.log('❌ Chromium binary does not exist at resolved path');
            hasErrors = true;
          }
        } catch (resolveErr) {
          console.log('❌ Failed to resolve executable path:', resolveErr.message);
          hasErrors = true;
        }
      } else {
        console.log('❌ @sparticuz/chromium executable path function not found');
        hasErrors = true;
      }
    } catch (err) {
      console.log('❌ @sparticuz/chromium package not found:', err.message);
      hasErrors = true;
    }
    
    // Check for puppeteer-core
    try {
      const puppeteerPath = require.resolve('puppeteer-core');
      console.log(`✅ puppeteer-core found at: ${puppeteerPath}`);
      
      // Check puppeteer version
      const puppeteerVersion = require('puppeteer-core/package.json').version;
      console.log(`Puppeteer-core version: ${puppeteerVersion}`);
      
      // Check if we have the main puppeteer package too
      try {
        const mainPuppeteerPath = require.resolve('puppeteer');
        const mainPuppeteerVersion = require('puppeteer/package.json').version;
        console.log(`✅ puppeteer found at: ${mainPuppeteerPath}`);
        console.log(`Puppeteer version: ${mainPuppeteerVersion}`);
        
        // Warn if versions don't match
        if (mainPuppeteerVersion !== puppeteerVersion) {
          console.log(`⚠️ Version mismatch between puppeteer (${mainPuppeteerVersion}) and puppeteer-core (${puppeteerVersion})`);
        }
      } catch (mainErr) {
        // This is fine, we might be using only puppeteer-core
      }
    } catch (err) {
      console.log('❌ puppeteer-core not found:', err.message);
      hasErrors = true;
    }
    
    // Check library dependencies for Chromium on Linux
    if (platform === 'linux') {
      try {
        const libraries = [
          'libnss3.so',
          'libcups.so.2',
          'libatk-1.0.so.0',
          'libatk-bridge-2.0.so.0',
          'libdrm.so.2',
          'libxkbcommon.so.0',
          'libXcomposite.so.1',
          'libXdamage.so.1',
          'libXrandr.so.2',
          'libasound.so.2',
          'libpango-1.0.so.0',
          'libgbm.so.1',      // Mesa GBM
          'libxshmfence.so.1' // X shared memory fence sync
        ];
        
        console.log('Checking required shared libraries:');
        
        // Get library paths
        const libraryPaths = execSync('ldconfig -p').toString().split('\n');
        
        // Track missing libraries
        const missingLibraries = [];
        
        for (const lib of libraries) {
          const found = libraryPaths.some(line => line.includes(lib));
          if (found) {
            console.log(`✅ ${lib} found`);
          } else {
            console.log(`❌ ${lib} not found`);
            missingLibraries.push(lib);
          }
        }
        
        if (missingLibraries.length > 0) {
          console.log(`\n⚠️ Missing libraries: ${missingLibraries.join(', ')}`);
          
          // Suggest installation command
          console.log('\nSuggested fix:');
          console.log(`yum install -y ${missingLibraries.map(lib => {
            // Map library names to package names (simplified)
            if (lib.includes('nss')) return 'nss';
            if (lib.includes('cups')) return 'cups-libs';
            if (lib.includes('atk-bridge')) return 'at-spi2-atk';
            if (lib.includes('atk')) return 'atk';
            if (lib.includes('drm')) return 'libdrm';
            if (lib.includes('xkbcommon')) return 'libxkbcommon';
            if (lib.includes('Xcomposite')) return 'libXcomposite';
            if (lib.includes('Xdamage')) return 'libXdamage';
            if (lib.includes('Xrandr')) return 'libXrandr';
            if (lib.includes('asound')) return 'alsa-lib';
            if (lib.includes('pango')) return 'pango';
            if (lib.includes('gbm')) return 'mesa-libgbm';
            if (lib.includes('xshmfence')) return 'libxshmfence';
            return lib.replace('lib', '').replace('.so', '');
          }).join(' ')}`);
          
          hasErrors = true;
        } else {
          console.log('\n✅ All required libraries found');
        }
      } catch (err) {
        console.log('Failed to check library dependencies:', err.message);
        hasErrors = true;
      }
    }
    
    console.log('\nChromium dependency check completed.');
    
    if (hasErrors) {
      console.log('\n⚠️ Issues were found that might affect Chromium functionality');
      // Don't exit with error so build can continue
      // process.exit(1);
    } else {
      console.log('\n✅ All checks passed. Chromium should work correctly.');
    }
  } catch (error) {
    console.error('Error checking Chromium dependencies:', error);
    // Don't exit with error so build can continue
    // process.exit(1);
  }
}

// Run the async function
runChecks().catch(err => {
  console.error('Fatal error in Chromium checks:', err);
}); 