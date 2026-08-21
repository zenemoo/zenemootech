import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🚀 Starting Zenemoo Android Production Release Build...\n');

// 1. Build web frontend
console.log('📦 Step 1: Building frontend...');
execSync('npm run build', { cwd: path.resolve('frontend'), stdio: 'inherit' });

// 2. Sync with Capacitor
console.log('\n📲 Step 2: Syncing Capacitor Android assets...');
execSync('npx cap sync android', { stdio: 'inherit' });

// 3. Clean nested APK from assets
console.log('\n🧹 Step 3: Cleaning assets public directory...');
const nestedApk = path.resolve('android/app/src/main/assets/public/downloads/zenemoo-latest.apk');
if (fs.existsSync(nestedApk)) {
  fs.unlinkSync(nestedApk);
  console.log('✓ Cleaned nested APK from android/app/src/main/assets/public/downloads');
}

// 4. Assemble Release APK with Gradle
console.log('\n🔨 Step 4: Assembling Android Release APK with R8 minification...');
const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';
const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}\\bin;${process.env.PATH}` };
execSync('.\\gradlew.bat assembleRelease', { cwd: path.resolve('android'), env, stdio: 'inherit' });

// 5. Copy & compute metadata
const builtApkPath = path.resolve('android/app/build/outputs/apk/release/app-release-unsigned.apk');
const targetPublicApk = path.resolve('frontend/public/downloads/zenemoo-latest.apk');
const targetDistApk = path.resolve('frontend/dist/downloads/zenemoo-latest.apk');

if (fs.existsSync(builtApkPath)) {
  fs.copyFileSync(builtApkPath, targetPublicApk);
  if (fs.existsSync(path.resolve('frontend/dist/downloads'))) {
    fs.copyFileSync(builtApkPath, targetDistApk);
  }

  const apkBuffer = fs.readFileSync(targetPublicApk);
  const sha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');
  const sizeBytes = fs.statSync(targetPublicApk).size;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);

  console.log(`\n✅ Release APK Built Successfully!`);
  console.log(`📍 Output: ${targetPublicApk}`);
  console.log(`📊 Size: ${sizeBytes} bytes (${sizeMB} MB)`);
  console.log(`🔐 SHA-256: ${sha256}\n`);
}
