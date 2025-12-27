// src/services/audioService.ts
// Back to MediaRecorder (simpler and more reliable)

export const getMicrophoneStream = async (): Promise<MediaStream> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Media Devices API not supported in this browser.");
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
    video: false,
  });
};

export const createMediaRecorder = (
  stream: MediaStream,
  onDataAvailable: (blob: Blob) => void
): MediaRecorder => {
  // Check supported mime types
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  console.log(`MediaRecorder using mimeType: ${mimeType}`);

  const recorder = new MediaRecorder(stream, { mimeType });

  recorder.addEventListener('dataavailable', (e: BlobEvent) => {
    if (e.data && e.data.size > 0) {
      onDataAvailable(e.data);
    }
  });

  recorder.addEventListener('error', (event) => {
    console.error("MediaRecorder error:", event);
  });

  return recorder;
};
