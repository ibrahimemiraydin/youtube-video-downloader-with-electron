const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
  fetchFormats: (url) => ipcRenderer.invoke('fetch-formats', url),
  fetchThumbnail: (url) => ipcRenderer.invoke('fetch-thumbnail', url), // Yeni
  downloadVideo: (url, format, downloadDir) =>
    ipcRenderer.send('download-video', { url, format, downloadDir }),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
  onDownloadError: (callback) => ipcRenderer.on('download-error', (event, data) => callback(data)),
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', (event, code) => callback(code)),
  getDefaultDownloadDir: () => ipcRenderer.invoke('get-default-download-dir')
});