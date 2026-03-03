/**
 * Cloudinary unsigned upload utility.
 *
 * Uploads images directly from the browser to Cloudinary's API.
 * No backend involvement — uses an unsigned upload preset.
 *
 * Required env vars (in packages/frontend/.env):
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 *
 * Uses XMLHttpRequest instead of fetch() to support upload progress tracking.
 */

export interface CloudinaryUploadResult {
  url: string;       // Secure HTTPS URL for the uploaded image
  publicId: string;  // Cloudinary public ID (for potential future deletion)
}

export interface UploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function uploadToCloudinary({ file, onProgress }: UploadOptions): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return Promise.reject(new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env'));
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please upload an image file (JPG, PNG, WebP, etc.)'));
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('Image must be under 10MB'));
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'mealplan-recipes');

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
          });
        } catch {
          reject(new Error('Invalid response from Cloudinary'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error?.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed. Check your connection and try again.'));
    };

    xhr.open('POST', url);
    xhr.send(formData);
  });
}
