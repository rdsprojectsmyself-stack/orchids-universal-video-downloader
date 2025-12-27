const path = require('path');
const fs = require('fs');
const isWin = process.platform === 'win32';
const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpExec = require('yt-dlp-exec').create(path.join(__dirname, `../${binaryName}`));
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const { getDB } = require('../config/db');

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
          const db = getDB();
          db.prepare(`
            INSERT INTO downloads (userId, videoTitle, videoUrl, format, quality)
            VALUES (?, ?, ?, ?, ?)
          `).run(userId, `Download_${tempId}`, url, outputExt, itag);
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
  let cookiesPath = null;

  try {
    const { url, itag, format } = req.body;

    if (!url || !itag) {
      return res.status(400).json({ error: 'URL and format are required' });
    }

    // Validate format restrictions for guests - max 720p
    const quality = itag.toString();
    
    // Extract numeric quality from format string
    const qualityMatch = quality.match(/(\d+)p/);
    const numericQuality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
    
    // Guests limited to 720p maximum
    if (numericQuality > 720) {
      return res.status(403).json({
        error: 'QUALITY_LIMIT',
        message: 'This quality requires sign in. Guests can download up to 720p.',
        requiresAuth: true
      });
    }

    // No trim functionality for guests
    if (req.body.trimStart !== undefined || req.body.trimEnd !== undefined) {
      return res.status(403).json({
        error: 'TRIM_PREMIUM',
        message: 'Video trimming requires sign in',
        requiresAuth: true
      });
    }

    const tempId = Date.now();
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputExt = format === 'mp3' ? 'mp3' : 'mp4';
    outputPath = path.join(tempDir, `guest_download_${tempId}.${outputExt}`);

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

// Trim video using FFmpeg (authentication required)
exports.trimVideo = async (req, res) => {
  let outputPath = null;
  let inputPath = null;
  let cookiesPath = null;

  try {
    const { url, itag, format, trimStart, trimEnd } = req.body;
    const userId = req.user?.id;

    if (!url || !itag || trimStart === undefined || trimEnd === undefined) {
      return res.status(400).json({ error: 'URL, format, and trim times are required' });
    }

    if (trimStart >= trimEnd) {
      return res.status(400).json({ error: 'Start time must be less than end time' });
    }

    const tempId = Date.now();
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // First download the full video
    const inputExt = format === 'mp3' ? 'mp3' : 'mp4';
    inputPath = path.join(tempDir, `trim_input_${tempId}.${inputExt}`);

    cookiesPath = getCookiesPath();

    const ytDlpOptions = {
      format: itag,
      output: inputPath,
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

    // Download the full video first
    await ytDlpExec(url, ytDlpOptions);

    if (!fs.existsSync(inputPath)) {
      throw new Error('Input file not found after download');
    }

    // Now trim using FFmpeg
    const outputExt = format === 'mp3' ? 'mp3' : 'mp4';
    outputPath = path.join(tempDir, `trimmed_${tempId}.${outputExt}`);

    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegCommand = ffmpeg(inputPath)
      .setStartTime(trimStart)
      .setDuration(trimEnd - trimStart)
      .output(outputPath)
      .audioCodec(format === 'mp3' ? 'libmp3lame' : 'aac')
      .videoCodec(format === 'mp3' ? undefined : 'libx264');

    await new Promise((resolve, reject) => {
      ffmpegCommand.on('end', resolve).on('error', reject).run();
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('Trimmed file not found after processing');
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('Trimmed file is empty');
    }

    const title = `Trimmed_${tempId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${outputExt}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', stats.size);

    const fileStream = fs.createReadStream(outputPath);

    fileStream.on('end', async () => {
      try {
        await unlinkAsync(outputPath);
        await unlinkAsync(inputPath);
      } catch (e) {
        console.error('Failed to delete temp files:', e);
      }
    });

    fileStream.on('error', async (err) => {
      console.error('Stream error:', err);
      try {
        if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
        if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
      } catch (e) { }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Trim failed during streaming' });
      }
    });

    fileStream.pipe(res);

    // Log the trim operation
    if (userId) {
      try {
        const db = getDB();
        db.prepare(`
          INSERT INTO downloads (userId, videoTitle, videoUrl, format, quality)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, `Trimmed_${tempId}`, url, outputExt, `${itag}_trimmed`);
      } catch (e) {
        console.error('Failed to log trim:', e);
      }
    }
  } catch (error) {
    console.error('Trim error:', error);

    if (outputPath && fs.existsSync(outputPath)) {
      try {
        await unlinkAsync(outputPath);
      } catch (e) { }
    }

    if (inputPath && fs.existsSync(inputPath)) {
      try {
        await unlinkAsync(inputPath);
      } catch (e) { }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Trim failed' });
    }
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      try { fs.unlinkSync(cookiesPath); } catch (e) { }
    }
  }
};
