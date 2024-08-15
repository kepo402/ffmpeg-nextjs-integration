import multiparty from 'multiparty';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import videoshow from 'videoshow';

const uploadDir = path.join('C:/Users/MOJISOLA EMMANUEL/Desktop/my-video-app/uploads');
const tempDir = path.join('C:/Users/MOJISOLA EMMANUEL/Desktop/my-video-app/temp');
const imageVideoPath = path.join(tempDir, 'image-video.mp4');
const concatListPath = path.join(tempDir, 'concat-list.txt');
const finalVideoPath = path.join(tempDir, 'final-video.mp4');

ffmpeg.setFfmpegPath('C:/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(500).send('Error parsing file upload');
      }

      console.log('Received fields:', fields);
      console.log('Received files:', files);

      const videoFile = files.video[0];
      console.log('Uploaded video file:', videoFile);

      const tempFilePath = videoFile.path;
      const finalFilePath = path.join(uploadDir, videoFile.originalFilename);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Uploads directory created:', uploadDir);
      }

      fs.rename(tempFilePath, finalFilePath, (err) => {
        if (err) {
          console.error('Error moving file:', err);
          return res.status(500).send('Error moving file');
        }

        console.log('File successfully moved to:', finalFilePath);
        processVideo(finalFilePath, res);
      });
    });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

async function processVideo(uploadedVideoPath, res) {
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create the static image video
    await new Promise((resolve, reject) => {
      videoshow(['public/Screenshot (232).png'], { loop: 5 })
        .save(imageVideoPath)
        .on('end', resolve)
        .on('error', (err) => {
          console.error('Error creating image video:', err);
          reject(err);
        });
    });

    // Create the concat list
    const concatListContent = `
file '${path.relative(tempDir, uploadedVideoPath).replace(/\\/g, '/')}' 
file '${path.relative(tempDir, imageVideoPath).replace(/\\/g, '/')}'`;
    fs.writeFileSync(concatListPath, concatListContent.trim(), 'utf8');

    console.log('Checking concat-list.txt content:');
    console.log(fs.readFileSync(concatListPath, 'utf8'));

    // Verify concat list file exists and is readable
    if (!fs.existsSync(concatListPath)) {
      console.error('concat-list.txt does not exist at path:', concatListPath);
      return res.status(500).send('concat-list.txt does not exist');
    }

    fs.access(concatListPath, fs.constants.R_OK, (err) => {
      if (err) {
        console.error('No read access to concat-list.txt');
        return res.status(500).send('No read access to concat-list.txt');
      }
    });

    // Concatenate videos using FFmpeg
    ffmpeg()
      .input(concatListPath)
      .inputFormat('concat')
      .outputOptions('-c', 'copy')
      .inputOptions('-safe', '0')
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error during concatenation:', err.message);
        res.status(500).send(`Error during concatenation: ${err.message}`);
      })
      .on('end', () => {
        console.log('Processing finished');

        // Clean up temporary files
        fs.unlinkSync(imageVideoPath);
        fs.unlinkSync(concatListPath);

        // Stream the final video
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename=finalVideo.mp4');
        fs.createReadStream(finalVideoPath).pipe(res)
          .on('finish', () => {
            fs.unlinkSync(finalVideoPath); // Clean up
          });
      })
      .save(finalVideoPath);
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).send('Error processing video');
  }
}


