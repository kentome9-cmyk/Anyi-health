'use client';

import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const [isPortrait, setIsPortrait] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = video;
      if (videoWidth && videoHeight) {
        setIsPortrait(videoHeight > videoWidth);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [url]);

  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div
        className={`flex items-center justify-center ${
          isPortrait === null ? 'w-full' : isPortrait ? 'w-full max-h-[90vh]' : 'w-full'
        }`}
      >
        <div
          className={`w-full ${
            isPortrait === null ? 'aspect-video' : isPortrait ? 'aspect-[9/16]' : 'aspect-video'
          }`}
          style={isPortrait ? { maxWidth: 'min(90vw, calc(90vh * 9/16))' } : {}}
        >
          <ReactPlayer
            src={url}
            controls
            width="100%"
            height="100%"
            playing={false}
            playsInline
            onReady={() => {
              const internal = document.querySelector('.react-player video') as HTMLVideoElement | null;
              if (internal) {
                videoRef.current = internal;
                const { videoWidth, videoHeight } = internal;
                if (videoWidth && videoHeight) {
                  setIsPortrait(videoHeight > videoWidth);
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}