// Ad-hoc-signerer den færdige app: node build/adhoc-sign.js <sti/til/Messenger.app>
// Uden signatur siger macOS at appen er "beskadiget" hos modtageren.
// Med ad-hoc-signatur kan modtageren i stedet vælge "Åbn alligevel".
const { execSync } = require('child_process');
const appPath = process.argv[2];
if (!appPath) { console.error('Brug: node build/adhoc-sign.js <Messenger.app>'); process.exit(1); }
console.log(`🔏 Ad-hoc-signerer ${appPath}`);
execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
console.log('✅ Signatur OK');
