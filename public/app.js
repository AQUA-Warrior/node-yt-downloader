document.addEventListener('DOMContentLoaded', function() {
    const url_input = document.getElementById('videoUrl');
    const fetch_btn = document.getElementById('fetchBtn');
    const loading = document.querySelector('.loading');
    const video_info = document.querySelector('.video-info');
    const thumb = document.getElementById('videoThumb');
    const title = document.getElementById('videoTitle');
    const duration = document.getElementById('videoDuration');
    const res_container = document.getElementById('resContainer');
    const dl_status = document.querySelector('.download-status');
    const dl_msg = document.getElementById('downloadMsg');
    const dl_link = document.getElementById('downloadLink');
    
    function format_time(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    
    fetch_btn.addEventListener('click', async function() {
      const url = url_input.value.trim();
      
      if (!url) {
        alert('enter url');
        return;
      }
      
      loading.style.display = 'block';
      video_info.style.display = 'none';
      dl_status.style.display = 'none';
      
      try {
        const response = await fetch('/api/video-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
          throw new Error('fetch failed');
        }
        
        const data = await response.json();
        
        thumb.src = data.thumbnail;
        title.textContent = data.title;
        duration.textContent = data.duration ? `duration: ${format_time(data.duration)}` : '';
        
        res_container.innerHTML = '';
        data.resolutions.forEach(res => {
          const btn = document.createElement('button');
          btn.className = 'res-btn';
          btn.textContent = `${res}p`;
          btn.addEventListener('click', () => download_video(url, res));
          res_container.appendChild(btn);
        });
        
        video_info.style.display = 'block';
      } catch (error) {
        console.error('error:', error);
        alert('fetch failed try again');
      } finally {
        loading.style.display = 'none';
      }
    });
    
    async function download_video(url, res) {
      dl_status.style.display = 'block';
      dl_msg.textContent = 'download starting';
      dl_link.innerHTML = '';
      
      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url, res })
        });
        
        if (!response.ok) {
          throw new Error('download failed');
        }
        
        const data = await response.json();
        
        dl_msg.textContent = 'download in progress when done use link below';
        
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.className = 'download-btn';
        link.textContent = `download ${res}p mp4`;
        link.download = data.filename;
        dl_link.appendChild(link);
      } catch (error) {
        console.error('error:', error);
        dl_msg.textContent = 'download failed try again';
        dl_msg.style.backgroundColor = '#f2dede';
        dl_msg.style.borderColor = '#ebccd1';
        dl_msg.style.color = '#a94442';
      }
    }
  });