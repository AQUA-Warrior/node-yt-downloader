document.addEventListener('DOMContentLoaded', () => {
  const ui = initializeUI();
  setupEventListeners(ui);
});

function initializeUI() {
  return {
      urlInput: document.getElementById('videoUrl'),
      searchBtn: document.getElementById('fetchBtn'),
      loadingIndicator: document.querySelector('.loading'),
      videoDetails: document.querySelector('.video-info'),
      thumbnail: document.getElementById('videoThumb'),
      titleElement: document.getElementById('videoTitle'),
      durationElement: document.getElementById('videoDuration'),
      qualityOptions: document.getElementById('resContainer'),
      downloadPanel: document.querySelector('.download-status'),
      statusMessage: document.getElementById('downloadMsg')
  };
}

function setupEventListeners(ui) {
  ui.searchBtn.addEventListener('click', () => handleVideoSearch(ui));
}

async function handleVideoSearch(ui) {
  const videoUrl = ui.urlInput.value.trim();
  if (!videoUrl) {
      alert('Please enter a valid YouTube URL');
      return;
  }

  showLoading(ui);
  
  try {
      const videoInfo = await fetchVideoInfo(videoUrl);
      displayVideoDetails(videoInfo, videoUrl, ui);
  } catch (err) {
      alert(err.message);
  } finally {
      hideLoading(ui);
  }
}

function showLoading(ui) {
  ui.loadingIndicator.style.display = 'block';
  ui.videoDetails.style.display = 'none';
  ui.downloadPanel.style.display = 'none';
}

function hideLoading(ui) {
  ui.loadingIndicator.style.display = 'none';
}

async function fetchVideoInfo(videoUrl) {
  const response = await fetch('/api/video-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: videoUrl })
  });

  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error);
  }

  return response.json();
}

function displayVideoDetails(videoInfo, videoUrl, ui) {
  ui.thumbnail.src = videoInfo.thumbnail;
  ui.titleElement.textContent = videoInfo.title;
  ui.durationElement.textContent = `Duration: ${formatTime(videoInfo.duration)}`;

  ui.qualityOptions.innerHTML = '';
  videoInfo.resolutions.forEach(res => {
      const btn = document.createElement('button');
      btn.className = 'res-btn';
      btn.textContent = `${res}p`;
      btn.onclick = () => startDownload(videoUrl, res, ui);
      ui.qualityOptions.appendChild(btn);
  });

  ui.videoDetails.style.display = 'block';
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

async function startDownload(videoUrl, quality, ui) {
  ui.downloadPanel.style.display = 'block';
  ui.statusMessage.textContent = 'Starting download...';

  try {
      const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl, res: quality })
      });

      if (!response.ok) throw new Error('Download failed');
      
      const { downloadUrl, filename } = await response.json();
      triggerDownload(downloadUrl, filename);
      
      // Cleanup after 1 minute
      setTimeout(() => {
          fetch(`/api/delete/${filename}`, { method: 'DELETE' })
              .catch(console.error);
      }, 60000);
  } catch (err) {
      ui.statusMessage.textContent = `Error: ${err.message}`;
  }
}

function triggerDownload(downloadUrl, filename) {
  const downloadLink = document.createElement('a');
  downloadLink.style.display = 'none';
  downloadLink.href = downloadUrl;
  downloadLink.download = filename; // Forces download instead of navigation
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
