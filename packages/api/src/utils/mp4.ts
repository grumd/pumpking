import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import concat from 'concat-stream';

export const getFirstFrameFromMp4 = (
  filePath: string,
  callback: (buffer: null | Buffer, err?: Error) => void
) => {
  if (!ffmpegStatic) {
    throw new Error('ffmpeg not installed');
  }

  const ffmpegParams = [
    '-i',
    filePath,
    '-ss',
    '00:00:00.000',
    '-vframes',
    '1',
    '-q:v',
    '10',
    '-f',
    'image2pipe',
    '-',
  ];

  const ffmpegProc = spawn(ffmpegStatic, ffmpegParams);
  const concatStream = concat((buffer) => {
    console.log('Screenshot buffer length:', buffer.length);
    callback(buffer);
  });

  ffmpegProc.stdout.pipe(concatStream);
  ffmpegProc.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });
  ffmpegProc.on('error', (err) => {
    callback(null, err);
  });
};
