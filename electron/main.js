const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../frontend/assets/icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../frontend/pages/login.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackendServer() {
  const serverPath = path.join(__dirname, '../backend/server.js');
  serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });
}

app.whenReady().then(() => {
  startBackendServer();
  
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

ipcMain.handle('navigate', (event, page) => {
  const pagePath = path.join(__dirname, '../frontend/pages', `${page}.html`);
  mainWindow.loadFile(pagePath);
});
