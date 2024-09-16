const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route for downloading and converting YouTube video
app.get('/download', async (req, res) => {
  const videoURL = req.query.url;
  
  // Send an initial response to the client indicating the process has started
  res.write(`<p>Starting the conversion process...</p>`);

  if (!videoURL || !ytdl.validateURL(videoURL)) {
    res.write('<p>Error: Invalid or no URL provided. Please check the URL and try again.</p>');
    res.end();
    return;
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, '');
    const outputFilePath = path.join(__dirname, 'downloads', `${videoTitle}.mp3`);

    // Inform the user that download has started
    res.write('<p>Downloading video...</p>');

    const stream = ytdl(videoURL, { filter: 'audioonly' });

    ffmpeg(stream)
      .audioBitrate(128)
      .toFormat('mp3')
      .on('start', () => {
        // Inform the user that conversion has started
        res.write('<p>Converting video to MP3...</p>');
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err.message);
        res.write(`<p>Error during conversion: ${err.message}</p>`);
        res.end();
      })
      .on('end', () => {
        // Inform the user that conversion is complete
        res.write('<p>Conversion complete! Your file is ready.</p>');
        res.end();

        // Provide the file for download
        res.download(outputFilePath, `${videoTitle}.mp3`, (err) => {
          if (err) {
            console.error('Error sending file to client:', err.message);
          }
        });
      })
      .save(outputFilePath);
  } catch (error) {
    // Handle errors (e.g., issues with fetching video info or stream errors)
    console.error('Error during conversion:', error.message);
    res.write(`<p>An error occurred while converting the video: ${error.message}</p>`);
    res.end();
  }
});

// Listen on the defined port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
