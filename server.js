const express = require('express');
const path = require('path');
const ytdl = require('ytdl-core');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = 3000;

// Middleware to serve static files (HTML, CSS, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Endpoint for handling YouTube link conversion
app.post('/convert', async (req, res) => {
    const videoURL = req.body.url;
    let attempts = 0;
    const maxAttempts = 3;

    const downloadMP3 = async () => {
        attempts++;
        try {
            // Validate if the link is a valid YouTube URL
            const isValidURL = ytdl.validateURL(videoURL);
            if (!isValidURL) {
                return res.status(400).json({ error: 'Invalid YouTube URL' });
            }

            const videoInfo = await ytdl.getInfo(videoURL);
            const videoTitle = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters
            const outputPath = path.join(__dirname, 'downloads', `${videoTitle}.mp3`);

            // Check if file already exists
            if (fs.existsSync(outputPath)) {
                return res.json({ message: 'MP3 already exists', file: `/downloads/${videoTitle}.mp3` });
            }

            // Download and convert to MP3
            const stream = ytdl(videoURL, { filter: 'audioonly' });

            ffmpeg(stream)
                .audioBitrate(128)
                .save(outputPath)
                .on('end', () => {
                    console.log('Conversion successful:', outputPath);
                    res.json({ message: 'Conversion successful', file: `/downloads/${videoTitle}.mp3` });
                })
                .on('error', (err) => {
                    console.error('Error during conversion:', err.message);
                    if (attempts < maxAttempts) {
                        console.log(`Retrying... Attempt ${attempts}`);
                        downloadMP3(); // Retry on error
                    } else {
                        res.status(500).json({ error: 'Failed after 3 attempts' });
                    }
                });
        } catch (error) {
            console.error('Error during conversion:', error.message);
            if (attempts < maxAttempts) {
                console.log(`Retrying... Attempt ${attempts}`);
                downloadMP3(); // Retry on error
            } else {
                res.status(500).json({ error: 'Failed after 3 attempts' });
            }
        }
    };

    downloadMP3();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
