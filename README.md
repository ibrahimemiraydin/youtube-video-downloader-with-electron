# YouTube Downloader

Bu proje, YouTube videolarını ve seslerini indirmek için geliştirilmiş bir Electron tabanlı masaüstü uygulamasıdır. Kullanıcı dostu bir arayüzle, videoları farklı formatlarda ve çözünürlüklerde indirmenizi sağlar.

## Özellikler
- YouTube videolarını MP4 formatında indirme
- Ses dosyalarını MP3 formatında çıkarma
- İndirme konumu seçme ve kaydetme
- Video küçük resmi (thumbnail) önizlemesi
- İndirme ilerlemesini gösteren ilerleme çubuğu

## Gereksinimler
- [Node.js](https://nodejs.org/) (v16 veya üstü önerilir)
- [npm](https://www.npmjs.com/) (Node.js ile birlikte gelir)
- Windows işletim sistemi (şu an için test edilmiştir)
- ffmpeg 
- yt-dlp

## Kurulum
Projeyi yerel makinenize kurmak için aşağıdaki adımları izleyin:

1. **Depoyu Klonlayın**:
   ```bash
   git clone https://github.com/ibrahimemiraydin/yt-downloader-2.git
   cd yt-downloader-2

2. **Scriptler**
    npm run tailwind-build : output.css dosyasını oluşturmak için.
    npm start: Geliştirici olarak uygulamayı çalıştırabilirsiniz
    npm run build : Electron ile uygulamayı build etmenizi sağlar 
    