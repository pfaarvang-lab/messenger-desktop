const { app, BrowserWindow, session, shell, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isQuitting = false;

// ---------- Kun én kørende instans ----------
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}
app.on('second-instance', () => showWindow());

// ---------- Hjælpere ----------
const MESSENGER_HOSTS = ['messenger.com', 'www.messenger.com'];
// Værter der må vises inde i appen (login går via facebook.com)
const IN_APP_HOSTS = [...MESSENGER_HOSTS, 'facebook.com', 'www.facebook.com', 'm.facebook.com'];

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function showWindow() {
  if (!mainWindow) { createWindow(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// User-agent der matcher den faktiske Chromium-version (undgår "forældet browser")
const chromeMajor = process.versions.chrome.split('.')[0];
app.userAgentFallback =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  `(KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;

// ---------- Husk vinduets størrelse/placering ----------
const stateFile = path.join(app.getPath('userData'), 'window-state.json');
function loadBounds() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return {}; }
}
function saveBounds() {
  if (!mainWindow || mainWindow.isMinimized() || mainWindow.isFullScreen()) return;
  try { fs.writeFileSync(stateFile, JSON.stringify(mainWindow.getBounds())); } catch {}
}

// ---------- Vindue ----------
function createWindow() {
  const bounds = loadBounds();
  mainWindow = new BrowserWindow({
    width: bounds.width || 1100,
    height: bounds.height || 780,
    x: bounds.x,
    y: bounds.y,
    minWidth: 400,
    minHeight: 600,
    title: 'Messenger',
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      partition: 'persist:messenger',
      // Skjult vindue skal stadig opdatere badge/notifikationer hurtigt
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadURL('https://www.messenger.com');

  // Nye vinduer: kun messenger.com (fx opkald) i appen – alt andet i standardbrowser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (MESSENGER_HOSTS.includes(hostOf(url))) return { action: 'allow' };
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Navigation i hovedvinduet: bliv på messenger/facebook, ellers åbn i browser
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!IN_APP_HOSTS.includes(hostOf(url))) {
      e.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    }
  });

  // ---------- Dock-badge (uændret logik fra v4) ----------
  let badgeClearTimer = null;
  mainWindow.webContents.on('page-title-updated', (e, title) => {
    e.preventDefault();
    const match = title.match(/^\((\d+)\)/);
    if (match) {
      clearTimeout(badgeClearTimer);
      badgeClearTimer = null;
      const count = parseInt(match[1], 10);
      app.dock?.setBadge(count > 0 ? String(count) : '');
      mainWindow.setTitle(`Messenger (${count})`);
    } else if (mainWindow.isFocused()) {
      clearTimeout(badgeClearTimer);
      badgeClearTimer = null;
      app.dock?.setBadge('');
      mainWindow.setTitle('Messenger');
    } else if (!badgeClearTimer) {
      badgeClearTimer = setTimeout(() => {
        badgeClearTimer = null;
        app.dock?.setBadge('');
        mainWindow?.setTitle('Messenger');
      }, 10000);
    }
  });

  mainWindow.on('focus', () => {
    if (!/^\(\d+\)/.test(mainWindow.webContents.getTitle())) app.dock?.setBadge('');
  });

  // Gem størrelse/placering
  let saveTimer = null;
  const queueSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveBounds, 500); };
  mainWindow.on('resize', queueSave);
  mainWindow.on('move', queueSave);

  // Luk-knap skjuler vinduet i stedet for at lukke Messenger ned,
  // så notifikationer og badge fortsat virker (som den gamle app)
  mainWindow.on('close', (e) => {
    saveBounds();
    if (!isQuitting && process.platform === 'darwin') {
      e.preventDefault();
      if (mainWindow.isFullScreen()) {
        mainWindow.once('leave-full-screen', () => mainWindow.hide());
        mainWindow.setFullScreen(false);
      } else {
        mainWindow.hide();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------- Opdateringstjek (GitHub Releases) ----------
const UPDATE_REPO = 'pfaarvang-lab/messenger-desktop';
let notifiedVersion = null;

function isNewer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates() {
  try {
    const res = await net.fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return;
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/, '');
    if (!latest || latest === notifiedVersion || !isNewer(latest, app.getVersion())) return;
    notifiedVersion = latest;
    const dmg = (rel.assets || []).find((a) => a.name.endsWith('.dmg'));
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Hent opdatering', 'Senere'],
      defaultId: 0,
      cancelId: 1,
      message: `Ny version af Messenger: ${latest}`,
      detail:
        `Du har version ${app.getVersion()}. Den nye version indeholder sikkerhedsopdateringer.\n\n` +
        'Klik "Hent opdatering", åbn den hentede .dmg-fil og træk Messenger over i Programmer (vælg Erstat).',
    });
    if (response === 0) shell.openExternal(dmg ? dmg.browser_download_url : rel.html_url);
  } catch {
    // Ingen forbindelse e.l. – prøv igen senere
  }
}

// ---------- App-livscyklus ----------
app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(() => {
  // Tilladelser kun for messenger.com – ingen automatisk lokation
  const allowed = ['notifications', 'media', 'mediaKeySystem', 'fullscreen', 'clipboard-sanitized-write'];
  session.fromPartition('persist:messenger').setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const host = hostOf(details?.requestingUrl || webContents.getURL());
      callback(MESSENGER_HOSTS.includes(host) && allowed.includes(permission));
    }
  );
  createWindow();

  // Tjek for ny version 15 sek. efter start og derefter hver 6. time
  setTimeout(checkForUpdates, 15000);
  setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
});

app.on('activate', () => showWindow());

// Klik på notifikation / Cmd+Tab til appen → vis vinduet hvis det er skjult
app.on('did-become-active', () => {
  if (mainWindow && !mainWindow.isVisible()) showWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
