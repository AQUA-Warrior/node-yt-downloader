const express = require('express');
const youtubeDl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

// Config
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.join(__dirname, 'public', 'downloads');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/video-info', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const videoInfo = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
        });
        
        const availableResolutions = extractResolutions(videoInfo.formats || []);

        res.json({
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            resolutions: availableResolutions
        });
    } catch (err) {
        console.error(`Failed to fetch video info: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

app.post('/api/download', async (req, res) => {
    const { url, res: videoQuality } = req.body;
    
    if (!url || !videoQuality) {
        return res.status(400).json({ error: 'URL and resolution are required' });
    }

    const videoFileName = `video_${Date.now()}_${videoQuality}p.mp4`;
    const outputPath = path.join(DOWNLOAD_DIR, videoFileName);

    try {
        await youtubeDl(url, {
            format: `bestvideo[height=${videoQuality}]+bestaudio`,
            output: outputPath,
            mergeOutputFormat: 'mp4'
        });

        res.json({ 
            success: true,
            filename: videoFileName,
            downloadUrl: `/downloads/${videoFileName}`
        });
    } catch (err) {
        console.error(`Download failed: ${err.message}`);
        res.status(500).json({ error: 'Video download failed' });
    }
});

app.delete('/api/delete/:filename', (req, res) => {
    const filepath = path.join(DOWNLOAD_DIR, req.params.filename);
    fs.unlink(filepath, (err) => {
        if (err) console.error('Error deleting file:', err);
    });
    res.json({ success: true });
});

// Helper Functions
function extractResolutions(formats) {
    const resSet = new Set();
    formats.forEach(format => {
        const height = format.height;
        if (height && height > 144) resSet.add(height);
    });
    return Array.from(resSet).sort((a, b) => b - a);
}

// Startup
app.listen(PORT, () => {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }
    console.log(`Server running at http://localhost:${PORT}`);
});