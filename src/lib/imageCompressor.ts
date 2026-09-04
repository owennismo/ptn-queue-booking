/**
 * Client-side Image Compression Utility for PTN Queue Booking
 * Converts large smartphone photos (5-10 MB) into lightweight WebP/JPEG (~150-250 KB)
 */

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('ไม่สามารถสร้าง canvas สำหรับบีบอัดรูปภาพได้'));
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output MIME type: prefer WebP, fallback to JPEG
        let mimeType = 'image/webp';
        let extension = 'webp';

        // Check if browser supports WebP canvas export
        try {
          const testData = canvas.toDataURL('image/webp');
          if (!testData.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            extension = 'jpg';
          }
        } catch (e) {
          mimeType = 'image/jpeg';
          extension = 'jpg';
        }

        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('บีบอัดรูปภาพล้มเหลว'));
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanFileName}.${extension}`, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              width,
              height,
            });
          },
          mimeType,
          quality
        );
      };

      img.onerror = (err) => {
        reject(new Error('ไม่สามารถเปิดอ่านไฟล์รูปภาพได้'));
      };
    };

    reader.onerror = (err) => {
      reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    };
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
