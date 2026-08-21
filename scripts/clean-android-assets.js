import fs from 'fs';
import path from 'path';

const nestedApk = path.resolve('android/app/src/main/assets/public/downloads/zenemoo-latest.apk');
if (fs.existsSync(nestedApk)) {
  fs.unlinkSync(nestedApk);
  console.log('✓ Cleaned nested APK from android/app/src/main/assets/public/downloads');
}
