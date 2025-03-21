function fetchFormats() {
  const url = document.getElementById('videoUrl').value;
  const status = document.getElementById('status');
  const formatSelect = document.getElementById('formatSelect');
  const thumbnailImg = document.getElementById('thumbnail');
  const thumbnailPlaceholder = document.getElementById('thumbnail-placeholder');

  if (!url) {
    status.textContent = 'Lütfen bir URL girin!';
    thumbnailImg.src = '';
    thumbnailImg.classList.add('opacity-0');
    thumbnailPlaceholder.classList.remove('hidden');
    return;
  }

  status.textContent = 'Formatlar yükleniyor...';
  formatSelect.disabled = true;
  thumbnailPlaceholder.classList.remove('hidden');
  thumbnailImg.classList.add('opacity-0');

  window.electronAPI.fetchThumbnail(url)
    .then(thumbnailUrl => {
      thumbnailImg.src = thumbnailUrl;
      thumbnailImg.classList.remove('opacity-0');
      thumbnailPlaceholder.classList.add('hidden');
    })
    .catch((error) => {
      thumbnailImg.src = '';
      thumbnailImg.classList.add('opacity-0');
      thumbnailPlaceholder.classList.remove('hidden');
      console.error('Thumbnail hatası:', error);
    });

  window.electronAPI.fetchFormats(url)
    .then(stdout => {
      console.log('yt-dlp çıktısı:', stdout);
      const lines = stdout.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && /^\d+/.test(trimmed) && (line.includes('mp4') || line.includes('webm') || line.includes('m4a'));
      });
      formatSelect.innerHTML = '<option value="">Bir format seçin</option>';

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const id = parts[0];
        const ext = parts[1];
        const isAudioOnly = line.includes('audio only');

        if (isAudioOnly) {
          const abrIndex = parts.findIndex(part => part.match(/^\d+k$/) && !part.includes('MiB'));
          const abr = abrIndex !== -1 ? parts[abrIndex] : 'Bilinmiyor';
          const friendlyName = `${ext.toUpperCase()} Ses - ${abr}`;
          const option = document.createElement('option');
          option.value = id;
          option.textContent = friendlyName;
          formatSelect.appendChild(option);
        }
      });

      const mp3Option = document.createElement('option');
      mp3Option.value = 'mp3';
      mp3Option.textContent = 'MP3 Ses - 128k (Dönüştürülmüş)';
      formatSelect.appendChild(mp3Option);

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const id = parts[0];
        const ext = parts[1];
        const isAudioOnly = line.includes('audio only');

        if (!isAudioOnly) {
          const resolutionIndex = parts.findIndex(part => /\d+x\d+/.test(part));
          let resolution = resolutionIndex !== -1 ? parts[resolutionIndex] : 'Bilinmiyor';
          let simpleResolution = 'Bilinmiyor';
          if (resolution !== 'Bilinmiyor') {
            const [width, height] = resolution.split('x').map(Number);
            simpleResolution = `${height}p`;
          }

          const fpsIndex = parts.findIndex(part => part.match(/^\d+$/) && parseInt(part) <= 60);
          const fps = fpsIndex !== -1 ? parts[fpsIndex] : 'Bilinmiyor';

          const vcodecIndex = parts.findIndex(part => /avc1|vp9|vp09|h264/.test(part));
          const vcodec = vcodecIndex !== -1 ? parts[vcodecIndex].split('.')[0] : 'Bilinmiyor';

          if (id && ext && simpleResolution !== 'Bilinmiyor') {
            const friendlyName = `${simpleResolution} ${ext.toUpperCase()} - ${fps} FPS - ${vcodec}`;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = friendlyName;
            formatSelect.appendChild(option);
          }
        }
      });

      if (lines.length === 0) {
        status.textContent = 'Uygun format bulunamadı.';
      } else {
        formatSelect.disabled = false;
        status.textContent = 'Formatlar yüklendi, birini seçin.';
      }
    })
    .catch(error => {
      status.textContent = `Hata: ${error.message || 'Bilinmeyen bir hata oluştu!'}`;
      formatSelect.innerHTML = '<option value="">Hata oluştu</option>';
      thumbnailImg.src = '';
      thumbnailImg.classList.add('opacity-0');
      thumbnailPlaceholder.classList.remove('hidden');
      console.error('Fetch formats hatası:', error);
    });
}

// Varsayılan indirme klasörünü uygulama açıldığında yükle
document.addEventListener('DOMContentLoaded', async () => {
  const downloadDirInput = document.getElementById('downloadDir');
  const savedDir = await window.electronAPI.getDefaultDownloadDir();
  downloadDirInput.value = savedDir; // Saklanan veya varsayılan konumu göster
});

async function selectDownloadFolder() {
  const downloadDirInput = document.getElementById('downloadDir');
  const newDir = await window.electronAPI.selectDownloadFolder();
  if (newDir) {
    downloadDirInput.value = newDir; // Yeni konumu arayüzde güncelle
  }
}

async function downloadVideo() {
  const url = document.getElementById('videoUrl').value;
  const format = document.getElementById('formatSelect').value;
  const status = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const downloadDir = document.getElementById('downloadDir').value;

  if (!url || !format) {
    status.textContent = 'Lütfen URL ve format seçin!';
    return;
  }

  if (!downloadDir.trim()) {
    status.textContent = 'Lütfen bir indirme klasörü seçin!';
    return;
  }

  status.textContent = 'İndirme başlatılıyor...';
  progressBar.style.display = 'block';
  progressFill.style.width = '0%';

  window.electronAPI.downloadVideo(url, format, downloadDir);

  window.electronAPI.onDownloadProgress((data) => {
    const progressMatch = data.match(/(\d+\.\d+)%/);
    if (progressMatch) {
      const percentage = progressMatch[1];
      progressFill.style.width = `${percentage}%`;
      progressFill.setAttribute('aria-valuenow', percentage);
      status.textContent = `İndiriliyor: ${percentage}%`;
    }
  });

  window.electronAPI.onDownloadError((data) => {
    status.textContent = `İndirme hatası: ${data}`;
    console.error(`Hata detayları: ${data}`);
  });

  window.electronAPI.onDownloadComplete((message) => {
    status.textContent = message;
    if (message === 'İndirme tamamlandı!') {
      progressFill.style.width = '100%';
    }
    setTimeout(() => progressBar.style.display = 'none', 2000);
  });
}