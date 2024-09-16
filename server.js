const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');

const app = express();
const PORT = 3000;

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Middleware to serve static files (CSS and HTML)
app.use(express.static('public'));

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST endpoint to handle YouTube link submission
app.post('/convert', async (req, res) => {
  const youtubeUrl = req.body.url;
  
  console.log("Received YouTube link:", youtubeUrl);

  if (!ytdl.validateURL(youtubeUrl)) {
    console.log("Invalid YouTube link format.");
    return res.status(400).send('Invalid YouTube link.');
  }

  const videoId = ytdl.getURLVideoID(youtubeUrl);
  const outputFilePath = path.join(__dirname, 'downloads', `video-${videoId}.mp3`);
  let retries = 0;
  const maxRetries = 3;

  const downloadAndConvert = () => {
    console.log(`Starting conversion for video ID: ${videoId}`);

    try {
      const stream = ytdl(youtubeUrl, { quality: 'highestaudio' });

      ffmpeg(stream)
        .audioBitrate(128)
        .toFormat('mp3')
        .on('error', (err) => {
          console.error('Error during conversion:', err);
          retries += 1;

          if (retries <= maxRetries) {
            console.log(`Retrying... Attempt ${retries}`);
            downloadAndConvert();
          } else {
            console.log("Max retries reached. Conversion failed.");
            res.status(500).send('Failed to download video after multiple attempts.');
          }
        })
        .on('end', () => {
          console.log("Conversion successful.");
          res.download(outputFilePath, `video-${videoId}.mp3`, (err) => {
            if (err) {
              console.error("Error sending file:", err);
              res.status(500).send('Error downloading the file.');
            }
          });
        })
        .save(outputFilePath);

    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).send('An unexpected error occurred.');
    }
  };

  downloadAndConvert();
});

// Error handling for unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
