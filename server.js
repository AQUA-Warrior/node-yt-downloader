const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ytdl = new YTDlpWrap();

const app = express();
const PORT = 3000;
const dl_dir = path.join(__dirname, 'downloads');

if (!fs.existsSync(dl_dir)) {
  fs.mkdirSync(dl_dir);
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));

app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url required' });
    }

    const info = await ytdl.getVideoInfo(url);
    
    const format = info.formats || [];
    const res_list = new Set();
    
    format.forEach(f => {
      const height = f.height;
      if (height && parseInt(height) >= 144) {
        res_list.add(height);
      }
    });
    
    const sort_res = Array.from(res_list).sort((a, b) => b - a);
    
    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      resolutions: sort_res
    });
  } catch (error) {
    console.error('error:', error);
    res.status(500).json({ error: 'fetch failed' });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, res: resolution } = req.body;
    
    if (!url || !resolution) {
      return res.status(400).json({ error: 'url and res required' });
    }
    
    const info = await ytdl.getVideoInfo(url);
    const format = info.formats || [];
    
    const sel_format = format.find(f => f.height === parseInt(resolution));
    
    if (!sel_format) {
      return res.status(404).json({ error: 'format not found' });
    }
    
    const id = sel_format.format_id;
    const height = sel_format.height;
    
    const aud_format = format.find(f => f.acodec !== 'none');
    const aud_id = aud_format ? aud_format.format_id : 'bestaudio';
    
    const safe_title = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safe_title}_${height}p.mp4`;
    const output_path = path.join(dl_dir, filename);
    
    const opts = [
      '-f', `${id}+${aud_id}`,
      '-o', output_path,
      '--merge-output-format', 'mp4',
      url
    ];
    
    await ytdl.execPromise(opts);
    
    res.json({
      message: 'download started',
      filename: filename,
      downloadUrl: `/downloads/${filename}`
    });
    
    console.log(`download done ${filename}`);
    
  } catch (error) {
    console.error('error:', error);
    res.status(500).json({ error: 'download failed' });
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});