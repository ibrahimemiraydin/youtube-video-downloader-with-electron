const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const configPath = path.join(app.getPath('userData'), 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('Config dosyası okunamadı, varsayılan ayarlar kullanılıyor:', e);
    config = {};
  }
}

const saveConfig = () => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Config dosyası kaydedilemedi:', e);
  }
};

const getYtDlpPath = () => {
  const basePath = app.isPackaged ? process.resourcesPath : __dirname;
  const ytDlpPath = path.join(basePath, 'bin', 'yt-dlp.exe');
  console.log('yt-dlp yolu:', ytDlpPath);
  if (!fs.existsSync(ytDlpPath)) {
    console.error('Hata: yt-dlp.exe bulunamadı:', ytDlpPath);
    throw new Error(`yt-dlp.exe bulunamadı: ${ytDlpPath}`);
  }
  return ytDlpPath;
};

const getFmpegPath = () => {
  const basePath = app.isPackaged ? process.resourcesPath : __dirname;
  const ffmpegPath = path.join(basePath, 'ffmpeg', 'bin', 'ffmpeg.exe');
  console.log('ffmpeg yolu:', ffmpegPath);
  if (!fs.existsSync(ffmpegPath)) {
    console.error('Hata: ffmpeg.exe bulunamadı:', ffmpegPath);
    throw new Error(`ffmpeg.exe bulunamadı: ${ffmpegPath}`);
  }
  return ffmpegPath;
};

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 900,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'desktop-icon.ico')
  });
  win.loadFile('index.html');
  win.setMenu(null);
}

app.whenReady().then(createWindow);

ipcMain.handle('select-download-folder', async () => {
  const defaultDownloadDir = config.downloadDir || path.join(require('os').homedir(), 'Downloads');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: defaultDownloadDir,
    title: 'İndirme Klasörünü Seçin'
  });
  if (!result.canceled && result.filePaths[0]) {
    config.downloadDir = result.filePaths[0];
    saveConfig();
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-default-download-dir', () => {
  return config.downloadDir || path.join(require('os').homedir(), 'Downloads');
});

ipcMain.handle('fetch-formats', async (event, url) => {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const ffmpegPath = getFmpegPath();
    const command = `"${ytDlpPath}" -F "${url}" --ffmpeg-location "${ffmpegPath}"`;
    console.log('Çalıştırılan komut:', command);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Exec hatası:', error);
        return reject(new Error(`Exec error: ${error.message}`));
      }
      if (stderr && stderr.includes('ERROR')) {
        console.error('yt-dlp stderr:', stderr);
        return reject(new Error(`yt-dlp error: ${stderr}`));
      }
      resolve(stdout);
    });
  });
});

ipcMain.handle('fetch-thumbnail', async (event, url) => {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const ffmpegPath = getFmpegPath();
    const command = `"${ytDlpPath}" --get-thumbnail "${url}" --ffmpeg-location "${ffmpegPath}"`;
    console.log('Çalıştırılan komut:', command);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Exec hatası:', error);
        return reject(new Error(`Exec error: ${error.message}`));
      }
      if (stderr && stderr.includes('ERROR')) {
        console.error('yt-dlp stderr:', stderr);
        return reject(new Error(`yt-dlp error: ${stderr}`));
      }
      resolve(stdout.trim());
    });
  });
});

ipcMain.on('download-video', (event, { url, format, downloadDir }) => {
  const outputPath = path.join(downloadDir, '%(title)s.%(ext)s');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const ytDlpPath = getYtDlpPath();
  const ffmpegPath = getFmpegPath();
  let args = [url];
  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '-o', outputPath, '--progress', '--no-playlist', '--ffmpeg-location', ffmpegPath, '--force-overwrite');
  } else {
    args.push('-f', `${format}+bestaudio`, '--merge-output-format', 'mp4', '-o', outputPath, '--progress', '--no-playlist', '--ffmpeg-location', ffmpegPath, '--force-overwrite');
  }

  console.log('İndirme komutu:', `"${ytDlpPath}" ${args.join(' ')}`);
  const ytDlp = spawn(ytDlpPath, args); // shell: true kaldırıldı, argümanlar ayrı ayrı gönderiliyor

  ytDlp.stdout.on('data', (data) => {
    console.log('İndirme ilerlemesi:', data.toString());
    event.sender.send('download-progress', data.toString());
  });

  ytDlp.stderr.on('data', (data) => {
    console.error('İndirme hatası:', data.toString());
    event.sender.send('download-error', data.toString());
  });

  ytDlp.on('close', (code) => {
    console.log('İndirme tamamlandı, çıkış kodu:', code);
    if (code === 0) {
      event.sender.send('download-complete', 'İndirme tamamlandı!');
    } else {
      event.sender.send('download-complete', `İndirme başarısız oldu, çıkış kodu: ${code}`);
    }
  });
});