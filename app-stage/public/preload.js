const { contextBridge, ipcRenderer } = require('electron');

// Exposer les APIs sécurisées à React
contextBridge.exposeInMainWorld('electronAPI', {
  // Informations sur l'application
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // Base de données
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  dbExecute: (query, params) => ipcRenderer.invoke('db-execute', query, params),
  
  // Système de fichiers
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // Fenêtre
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
}); 