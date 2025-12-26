const path = require('path');
const fs = require('fs');
const isWin = process.platform === 'win32';
const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpExec = require('yt-dlp-exec').create(path.join(__dirname, `../${binaryName}`));
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const User = require('../models/User');

const getCookiesPath = () => {
  const cookiesContent = process.env.COOKIES_TXT_CONTENT;
  if (!cookiesContent) return null;

  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const cookiesPath = path.join(tempDir, `cookies_${Date.now()}.txt`);
  fs.writeFileSync(cookiesPath, cookiesContent);
  return cookiesPath;
};

exports.validateUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Supported platforms regex patterns
    const supportedPatterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,           // YouTube
      /^(https?:\/\/)?(www\.)?(instagram\.com)\/.+$/,                   // Instagram
      /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+$/,          // Facebook
      /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+$/,      // TikTok
      /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/,              // Twitter/X
      /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+$/,                       // Vimeo
      /^(https?:\/\/)?(www\.)?(dailymotion\.com|dai\.ly)\/.+$/,         // Dailymotion
      /^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)\/.+$/,           // Pinterest
      /^(https?:\/\/)?(www\.)?(reddit\.com)\/.+$/,                      // Reddit
      /^(https?:\/\/)?(www\.)?(twitch\.tv|clips\.twitch\.tv)\/.+$/,     // Twitch
      /^(https?:\/\/)?(www\.)?(soundcloud\.com)\/.+$/,                  // SoundCloud
    ];

    const isValid = supportedPatterns.some(pattern => pattern.test(url));

    if (!isValid) {
      return res.status(400).json({ error: 'Unsupported platform. Try YouTube, Instagram, Facebook, TikTok, Twitter, Vimeo, or Pinterest.' });
    }

    res.json({ valid: true, message: 'Valid URL' });
  } catch (error) {
    console.error('Validate error:', error);
    res.status(500).json({ error: 'Failed to validate URL' });
  }
};

exports.getMetadata = async (req, res) => {
  let cookiesPath = null;
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const binaryPath = path.join(__dirname, `../${binaryName}`);
    if (!fs.existsSync(binaryPath)) {
      console.error(`Binary not found at: ${binaryPath}`);
      return res.status(500).json({ error: `Internal Server Error: yt-dlp binary not found on server.` });
    }

    cookiesPath = getCookiesPath();
    const options = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    };

    if (cookiesPath) {
      options.cookies = cookiesPath;
    }

    const info = await ytDlpExec(url, options);

    const videoFormats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.height)
      .map(f => ({
        quality: f.format_note || (f.height ? `${f.height}p` : 'Unknown'),
        format: f.ext || 'mp4',
        fileSize: f.filesize || 0,
        fileSizeMB: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(2) : '~',
        itag: f.format_id,
      }))
      .filter((f, i, arr) => arr.findIndex(x => x.quality === f.quality) === i)
      .sort((a, b) => {
        const aHeight = parseInt(a.quality) || 0;
        const bHeight = parseInt(b.quality) || 0;
        return bHeight - aHeight;
      })
      .slice(0, 6);

    const audioFormats = (info.formats || [])
      .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
      .map(f => ({
        quality: f.abr ? `${Math.round(f.abr)}kbps` : 'Audio',
        format: 'mp3',
        fileSize: f.filesize || 0,
        fileSizeMB: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(2) : '~',
        itag: f.format_id,
      }))
      .slice(0, 3);

    res.json({
      title: info.title || 'Unknown',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || '',
      formats: [...videoFormats, ...audioFormats],
    });
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: `Failed to fetch video metadata: ${error.message}` });
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      try { fs.unlinkSync(cookiesPath); } catch (e) { }
    }
  }
};

exports.downloadVideo = async (req, res) => {
  let outputPath = null;
  let cookiesPath = null;

  try {
    const { url, itag, format, trimStart, trimEnd } = req.body;
    const userId = req.user?.id;

    if (!url || !itag) {
      return res.status(400).json({ error: 'URL and format are required' });
    }

    const tempId = Date.now();
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputExt = format === 'mp3' ? 'mp3' : 'mp4';
    outputPath = path.join(tempDir, `download_${tempId}.${outputExt}`);

    cookiesPath = getCookiesPath();

    const ytDlpOptions = {
      format: itag,
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    };

    if (cookiesPath) {
      ytDlpOptions.cookies = cookiesPath;
    }

    if (format === 'mp3') {
      ytDlpOptions.extractAudio = true;
      ytDlpOptions.audioFormat = 'mp3';
      ytDlpOptions.audioQuality = 0;
    }

    if (trimStart !== undefined && trimEnd !== undefined && (trimStart > 0 || trimEnd > 0)) {
      ytDlpOptions.downloadSections = `*${trimStart}-${trimEnd}`;
      ytDlpOptions.downloader = 'ffmpeg';
      ytDlpOptions.forceOverwrites = true;
    }

    await ytDlpExec(url, ytDlpOptions);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file not found after download');
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    const title = `Universal_${tempId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${outputExt}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', stats.size);

    const fileStream = fs.createReadStream(outputPath);

    fileStream.on('end', async () => {
      try {
        await unlinkAsync(outputPath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    });

    fileStream.on('error', async (err) => {
      console.error('Stream error:', err);
      try {
        if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
      } catch (e) { }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed during streaming' });
      }
    });

    fileStream.pipe(res);

    fileStream.on('end', async () => {
      if (userId) {
        try {
          await User.logDownload(userId, {
            title: `Download_${tempId}`,
            url,
            format: outputExt,
            quality: itag
          });
        } catch (e) {
          console.error('Failed to log download:', e);
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);

    if (outputPath && fs.existsSync(outputPath)) {
      try {
        await unlinkAsync(outputPath);
      } catch (e) { }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Download failed' });
    }
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      try { fs.unlinkSync(cookiesPath); } catch (e) { }
    }
  }
};

// Guest download with restrictions (no login required)
exports.downloadVideoGuest = async (req, res) => {
  let outputPath = null;

  try {
    const { url, itag, format } = req.body;

    if (!url || !itag) {
      return res.status(400).json({ error: 'URL and format are required' });
    }

    // If it's a YouTube link, require login for downloads
    const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;
    if (youtubePattern.test(url)) {
      return res.status(401).json({
        error: 'LOGIN_REQUIRED',
        message: 'Please sign in to download YouTube videos'
      });
    }

    // Validate format restrictions for guests
    const allowedFormats = ['360p', '720p', 'mp4'];
    const quality = itag.toString();

    // Check if the requested format is allowed for guests
    if (format === 'mp3' || quality.includes('1080') || quality.includes('1440') || quality.includes('2160')) {
      return res.status(403).json({
        error: 'This quality requires sign in',
        requiresAuth: true
      });
    }

    const tempId = Date.now();
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputExt = 'mp4';
    outputPath = path.join(tempDir, `guest_download_${tempId}.${outputExt}`);

    const ytDlpOptions = {
      format: itag,
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      // NO cookies for guest downloads - only public videos
    };

    await ytDlpExec(url, ytDlpOptions);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file not found after download');
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    const title = `Video_${tempId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${outputExt}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stats.size);

    const fileStream = fs.createReadStream(outputPath);

    fileStream.on('end', async () => {
      try {
        await unlinkAsync(outputPath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    });

    fileStream.on('error', async (err) => {
      console.error('Stream error:', err);
      try {
        if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
      } catch (e) { }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed during streaming' });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Guest download error:', error);

    if (outputPath && fs.existsSync(outputPath)) {
      try {
        await unlinkAsync(outputPath);
      } catch (e) { }
    }

    if (!res.headersSent) {
      // Check if it's a bot detection or private video error
      if (error.message && (error.message.includes('Sign in') || error.message.includes('bot'))) {
        res.status(403).json({
          error: 'This video requires sign in to download',
          requiresAuth: true
        });
      } else {
        res.status(500).json({ error: error.message || 'Download failed' });
      }
    }
  }
};
