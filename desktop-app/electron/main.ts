import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let workerProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

/**
 * Start local worker process
 */
function startWorker() {
  console.log('🚀 Starting worker process...');

  const workerScript = isDev
    ? path.join(__dirname, '../../worker/api-server.ts')
    : path.join(__dirname, '../worker/api-server.js');

  const command = isDev ? 'ts-node' : 'node';

  workerProcess = spawn(command, [workerScript], {
    cwd: path.join(__dirname, '../..'),
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  });

  workerProcess.stdout?.on('data', (data) => {
    console.log(`[Worker] ${data.toString().trim()}`);
  });

  workerProcess.stderr?.on('data', (data) => {
    console.error(`[Worker Error] ${data.toString().trim()}`);
  });

  workerProcess.on('exit', (code) => {
    console.log(`[Worker] Process exited with code ${code}`);
  });
}

/**
 * Create Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  // Load React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3002'); // Vite dev server port
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle
 */
app.whenReady().then(() => {
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Start worker
  startWorker();

  // Wait for worker to start, then create window
  setTimeout(createWindow, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('🛑 Shutting down...');

  // Kill worker process
  if (workerProcess) {
    workerProcess.kill();
    workerProcess = null;
  }
});

/**
 * IPC Handlers (if needed)
 */
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});
