import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Camera, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (imageUrl: string) => void;
  onRemove?: () => void;
  className?: string;
}

type UploadState = 'idle' | 'dragging' | 'uploading';

export default function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  onRemove,
  className = '',
}: ImageUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const hasImage = currentImageUrl && currentImageUrl.length > 0 && !imgError;

  const handleFile = useCallback(async (file: File) => {
    setState('uploading');
    setProgress(0);

    try {
      const result = await uploadToCloudinary({
        file,
        onProgress: setProgress,
      });
      setState('idle');
      setImgError(false);
      onUploadComplete(result.url);
      toast.success('Photo uploaded!');
    } catch (err) {
      setState('idle');
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setState('idle');

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setState('dragging');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setState('idle');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = () => {
    if (state !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
      setImgError(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {state === 'uploading' ? (
        /* ── Uploading state ── */
        <div className="w-full h-full bg-hover-bg flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <div className="w-48">
            <div className="bg-border-default rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-text-muted text-sm text-center mt-1">
              Uploading... {progress}%
            </p>
          </div>
        </div>
      ) : hasImage ? (
        /* ── Has image state ── */
        <div className="relative w-full h-full group cursor-pointer" onClick={handleClick}>
          <img
            src={currentImageUrl!}
            alt="Recipe"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
              <Camera className="w-8 h-8 text-white" />
              <span className="text-white text-sm font-medium">Change photo</span>
            </div>
          </div>

          {/* Remove button */}
          {onRemove && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Drag overlay */}
          {state === 'dragging' && (
            <div className="absolute inset-0 bg-accent/20 border-2 border-dashed border-accent flex items-center justify-center">
              <span className="text-accent font-semibold bg-surface/90 px-3 py-1 rounded-lg">
                Drop to replace
              </span>
            </div>
          )}
        </div>
      ) : (
        /* ── No image / empty state ── */
        <div
          onClick={handleClick}
          className={`w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
            ${state === 'dragging'
              ? 'bg-accent/10 border-2 border-dashed border-accent'
              : 'bg-hover-bg border-2 border-dashed border-border-default hover:border-accent hover:bg-accent/5'
            }`}
        >
          <ImagePlus className={`w-10 h-10 ${state === 'dragging' ? 'text-accent' : 'text-text-muted'}`} />
          <p className={`text-sm ${state === 'dragging' ? 'text-accent font-medium' : 'text-text-muted'}`}>
            {state === 'dragging' ? 'Drop to upload' : 'Drop photo here or click to upload'}
          </p>
          <p className="text-xs text-text-muted">JPG, PNG, WebP · Max 10MB</p>
        </div>
      )}
    </div>
  );
}
