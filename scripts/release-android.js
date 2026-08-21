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

// 5. Copy APK & update release metadata
console.log('\n📊 Step 5: Updating release artifacts & metadata...');
const builtApkPath = path.resolve('android/app/build/outputs/apk/release/app-release-unsigned.apk');
const targetPublicApk = path.resolve('frontend/public/downloads/zenemoo-latest.apk');
const targetDistApk = path.resolve('frontend/dist/downloads/zenemoo-latest.apk');

if (!fs.existsSync(builtApkPath)) {
  console.error('❌ Error: Built APK not found at ' + builtApkPath);
  process.exit(1);
}

fs.copyFileSync(builtApkPath, targetPublicApk);
if (fs.existsSync(path.resolve('frontend/dist/downloads'))) {
  fs.copyFileSync(builtApkPath, targetDistApk);
}

const apkBuffer = fs.readFileSync(targetPublicApk);
const sha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');
const sizeBytes = fs.statSync(targetPublicApk).size;
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);

// Read android/app/build.gradle to extract version
const gradleContent = fs.readFileSync(path.resolve('android/app/build.gradle'), 'utf8');
const vNameMatch = gradleContent.match(/versionName\s+["']([^"']+)["']/);
const vCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
const versionName = vNameMatch ? vNameMatch[1] : '2.0.5';
const versionCode = vCodeMatch ? parseInt(vCodeMatch[1], 10) : 5;
const releaseDate = new Date().toISOString().split('T')[0];

const releaseMetadata = {
  platform: 'android',
  appName: 'Zenemoo',
  packageName: 'in.zenemoo.app',
  version: versionName,
  versionCode: versionCode,
  apkUrl: '/downloads/zenemoo-latest.apk',
  apkFileName: `zenemoo-v${versionName}.apk`,
  apkSize: `${sizeMB} MB`,
  apkSizeBytes: sizeBytes,
  releaseDate: releaseDate,
  minimumAndroid: 'Android 8.0 (API 26) or later',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  architecture: 'Universal (ARM64, ARMv7, x86_64)',
  sha256: sha256,
  releaseType: 'stable',
  isOfficial: true,
  forceUpdate: false,
  releaseNotes: [
    '🔔 Official Android runtime POST_NOTIFICATIONS permission prompt flow.',
    '🎙️ On-demand microphone permission verification with seamless speech recognition.',
    '⚡ Enhanced R8/ProGuard byte-code optimization producing compact 8.3 MB APK footprint.',
    '📱 Improved mobile layout clearance and smooth scroll interactions.',
    '🛡️ Hardened security standards, updated telemetry safeguards, and high-DPI graphics.',
  ],
};

fs.writeFileSync(
  path.resolve('frontend/public/app/android-release.json'),
  JSON.stringify(releaseMetadata, null, 2),
  'utf8'
);

if (fs.existsSync(path.resolve('frontend/dist/app'))) {
  fs.writeFileSync(
    path.resolve('frontend/dist/app/android-release.json'),
    JSON.stringify(releaseMetadata, null, 2),
    'utf8'
  );
}

console.log(`✓ Release artifacts & metadata synchronized (v${versionName} - ${sizeMB} MB)`);

// 6. Automatic Release Notification Dispatch
console.log('\n🔔 Step 6: Checking and dispatching automatic release notification...');
try {
  const { checkAndNotifyAppRelease } = await import('../backend/src/services/appReleaseNotifier.js');
  const result = await checkAndNotifyAppRelease();
  if (result.triggered && result.success) {
    console.log(`🎉 Success: Automatic release notification dispatched for v${versionName}`);
  } else if (!result.triggered) {
    console.log(`ℹ️ Info: Release notification status: ${result.reason || 'already notified'}`);
  } else {
    console.warn(`⚠️ Warning: Notification dispatch result: ${result.reason || result.error}`);
  }
} catch (notifErr) {
  console.warn(`[Release Notification Warning]:`, notifErr.message);
}

console.log(`\n=====================================================`);
console.log(`✅ Zenemoo Production Release v${versionName} Ready!`);
console.log(`📍 Output APK: ${targetPublicApk}`);
console.log(`📊 Size: ${sizeBytes} bytes (${sizeMB} MB)`);
console.log(`🔐 SHA-256: ${sha256}`);
console.log(`=====================================================\n`);
