import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WebcamProps {
  onCapture?: (image: string) => void;
  className?: string;
  overlayClassName?: string;
  cameraFacing?: 'user' | 'environment';
  showControls?: boolean;
  aspectRatio?: 'square' | 'video';
  autoStart?: boolean;
}

export const Webcam = forwardRef<HTMLVideoElement, WebcamProps>(({
  onCapture,
  className,
  overlayClassName,
  cameraFacing = 'user',
  showControls = true,
  aspectRatio = 'video',
  autoStart = true,
}, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(autoStart);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useImperativeHandle(ref, () => localVideoRef.current!, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const timeoutId = setTimeout(() => {
        setError('Camera access timeout. Please check your camera permissions.');
        setIsLoading(false);
      }, 10000);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 } 
        }
      });
      
      clearTimeout(timeoutId);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (localVideoRef.current) {
            localVideoRef.current.onloadedmetadata = () => {
              resolve();
            };
          } else {
            resolve();
          }
        });
      }
      
      setStream(mediaStream);
      setIsLoading(false);
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'AbortError') {
          setError('Camera access timeout. Please try again or use a different browser.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Camera access denied or not available. Please check your permissions.');
      }
      
      setIsLoading(false);
      setIsActive(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, cameraFacing]);

  const handleCapture = () => {
    if (!localVideoRef.current || !canvasRef.current) return;
    
    const video = localVideoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState < 2 || video.paused || video.ended) {
      console.log('Video not ready for capture');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/png');
      
      if (onCapture) {
        onCapture(imageData);
        console.log('Image captured and passed to parent component');
      }
    }
  };

  const toggleCamera = () => {
    setIsActive(prev => !prev);
  };

  return (
    <div className={cn(
      "relative overflow-hidden bg-muted rounded-xl",
      aspectRatio === 'square' ? "aspect-square" : "aspect-video",
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-10 w-10 text-destructive mb-3"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p className="text-destructive font-medium mb-2">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleCamera}
          >
            Try Again
          </Button>
        </div>
      )}
      
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isActive && !isLoading && !error ? "opacity-100" : "opacity-0"
        )}
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      <div className={cn(
        "absolute inset-0 border-4 border-transparent rounded-xl transition-all duration-300",
        overlayClassName
      )} />
      
      {showControls && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {isActive && !error ? (
            <>
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white/80 backdrop-blur-sm hover:bg-white"
                onClick={handleCapture}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white/80 backdrop-blur-sm hover:bg-white text-destructive"
                onClick={toggleCamera}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              onClick={toggleCamera}
              className="bg-white/80 backdrop-blur-sm text-primary hover:bg-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 mr-2"
              >
                <path d="M23 7 16 12 23 17z" />
                <rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
              </svg>
              Start Camera
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

Webcam.displayName = "Webcam";

export default Webcam;
