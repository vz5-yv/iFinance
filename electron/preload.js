const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (page) => ipcRenderer.invoke('navigate', page),

    getApiUrl: () => 'http://localhost:3000/api',

    platform: process.platform,

    version: process.versions.electron,

    selectDirectory: () => ipcRenderer.invoke('select-directory')
});
