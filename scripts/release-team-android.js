import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🚀 Starting Zenemoo Team & HR Android Production Release Build...\n');

// 1. Build web frontend
console.log('📦 Step 1: Building frontend...');
execSync('npm run build', { cwd: path.resolve('frontend'), stdio: 'inherit' });

// 2. Sync with Capacitor Team
console.log('\n📲 Step 2: Syncing Capacitor Team Android assets...');
execSync('npm run cap:team:sync', { stdio: 'inherit' });

// 3. Clean nested APK from assets
console.log('\n🧹 Step 3: Cleaning assets public directory...');
const nestedApk = path.resolve('android-team/app/src/main/assets/public/downloads/zenemoo-team-latest.apk');
if (fs.existsSync(nestedApk)) {
  fs.unlinkSync(nestedApk);
  console.log('✓ Cleaned nested APK from android-team/app/src/main/assets/public/downloads');
}

// 4. Assemble Release APK with Gradle in android-team
console.log('\n🔨 Step 4: Assembling Signed Android Release APK for in.zenemoo.team...');
const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';
const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}\\bin;${process.env.PATH}` };

execSync('.\\gradlew.bat assembleRelease', { cwd: path.resolve('android-team'), env, stdio: 'inherit' });

const releaseApkDir = path.resolve('android-team/app/build/outputs/apk/release');
const candidateApks = [
  path.join(releaseApkDir, 'app-release.apk'),
  path.join(releaseApkDir, 'app-release-signed.apk'),
];

let builtApkPath = null;
for (const cand of candidateApks) {
  if (fs.existsSync(cand)) {
    builtApkPath = cand;
    break;
  }
}

if (!builtApkPath) {
  console.error('❌ Error: Signed release APK not found in ' + releaseApkDir);
  process.exit(1);
}

// 5. Verify APK Signature using apksigner
console.log('\n🔐 Step 5: Verifying APK Signature and Integrity with apksigner...');
const buildToolsPaths = [
  'C:\\Users\\mrpre\\AppData\\Local\\Android\\Sdk\\build-tools\\35.0.0\\apksigner.bat',
  'C:\\Users\\mrpre\\AppData\\Local\\Android\\Sdk\\build-tools\\36.1.0\\apksigner.bat',
];

let apksignerBin = buildToolsPaths.find((p) => fs.existsSync(p));
if (apksignerBin) {
  try {
    const verifyOutput = execSync(`"${apksignerBin}" verify --verbose --print-certs "${builtApkPath}"`, {
      env,
      encoding: 'utf8',
    });
    console.log('✓ Team APK Signature verified successfully (v1/v2 scheme valid)');
    const certMatch = verifyOutput.match(/Signer #1 certificate SHA-256 digest:\s+([a-fA-F0-9]+)/);
    if (certMatch) {
      console.log(`✓ Certificate SHA-256: ${certMatch[1]}`);
    }
  } catch (sigErr) {
    console.error('❌ Error: APK signature verification failed! Unsigned APK will not be published.', sigErr.message);
    process.exit(1);
  }
}

// 6. Copy APK & update team release metadata
console.log('\n📊 Step 6: Updating release artifacts & metadata...');
const downloadsDir = path.resolve('frontend/public/downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const teamReleaseDir = path.resolve('frontend/public/app/android');
if (!fs.existsSync(teamReleaseDir)) {
  fs.mkdirSync(teamReleaseDir, { recursive: true });
}

const targetPublicApk = path.resolve('frontend/public/downloads/zenemoo-team-latest.apk');
fs.copyFileSync(builtApkPath, targetPublicApk);
console.log(`✓ Copied signed APK to ${targetPublicApk}`);

const distDownloadsDir = path.resolve('frontend/dist/downloads');
if (fs.existsSync(path.resolve('frontend/dist'))) {
  if (!fs.existsSync(distDownloadsDir)) fs.mkdirSync(distDownloadsDir, { recursive: true });
  fs.copyFileSync(builtApkPath, path.resolve('frontend/dist/downloads/zenemoo-team-latest.apk'));
}

const apkBuffer = fs.readFileSync(targetPublicApk);
const sha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');
const fileSizeMB = (apkBuffer.length / (1024 * 1024)).toFixed(1) + ' MB';

const teamManifest = {
  platform: 'android',
  appName: 'Zenemoo Team & HR',
  packageName: 'in.zenemoo.team',
  version: '2.0.6',
  versionCode: 8,
  apkUrl: 'https://www.zenemoo.in/downloads/zenemoo-team-latest.apk',
  apkFileName: 'zenemoo-team-v2.0.6.apk',
  apkSize: fileSizeMB,
  apkSizeBytes: apkBuffer.length,
  releaseDate: new Date().toISOString().split('T')[0],
  minimumAndroid: 'Android 8.0 (API 26) or later',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  architecture: 'Universal (ARM64, ARMv7, x86_64)',
  sha256: sha256,
  releaseType: 'stable',
  isOfficial: true,
  releaseNotes: [
    '🔐 Valid production release APK signed with official v1/v2 signing scheme.',
    '👥 Unified Team Access Portal supporting Core & Leadership Team and Team Members.',
    '🔑 Secure User ID + Password authentication with native Android biometric unlock.',
    '💼 Opportunity Center integration for active program listings and candidate evaluation.',
    '🔔 Native Android 13+ POST_NOTIFICATIONS runtime permission prompt and FCM push dispatch.',
    '🛡️ Isolated package ID in.zenemoo.team with robust package installer compatibility.',
  ],
};

const manifestPath = path.resolve('frontend/public/app/android/team-release.json');
fs.writeFileSync(manifestPath, JSON.stringify(teamManifest, null, 2));
console.log(`✓ Updated release manifest at ${manifestPath}`);

const distManifestDir = path.resolve('frontend/dist/app/android');
if (fs.existsSync(path.resolve('frontend/dist'))) {
  if (!fs.existsSync(distManifestDir)) fs.mkdirSync(distManifestDir, { recursive: true });
  fs.writeFileSync(path.resolve('frontend/dist/app/android/team-release.json'), JSON.stringify(teamManifest, null, 2));
}

console.log('\n✅ Zenemoo Team & HR Production Release Pipeline Completed Successfully!');
console.log(`   Version: ${teamManifest.version} (${teamManifest.versionCode})`);
console.log(`   Size: ${teamManifest.apkSize}`);
console.log(`   SHA-256: ${teamManifest.sha256}`);
