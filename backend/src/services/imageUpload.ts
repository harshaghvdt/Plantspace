import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import { supabase } from '../config/supabase';
import sharp from 'sharp';

// File type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

// File size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB for avatars

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'));
  }
};

// Multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Avatar upload middleware (smaller size limit)
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1
  }
});

// Image processing and optimization
export class ImageProcessor {
  // Optimize image for posts
  static async optimizePostImage(buffer: Buffer, filename: string): Promise<Buffer> {
    try {
      const optimized = await sharp(buffer)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();
      
      return optimized;
    } catch (error) {
      console.error('Image optimization error:', error);
      throw new Error('Failed to optimize image');
    }
  }

  // Optimize avatar images
  static async optimizeAvatar(buffer: Buffer, filename: string): Promise<Buffer> {
    try {
      const optimized = await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ 
          quality: 90,
          progressive: true 
        })
        .toBuffer();
      
      return optimized;
    } catch (error) {
      console.error('Avatar optimization error:', error);
      throw new Error('Failed to optimize avatar');
    }
  }

  // Create thumbnail
  static async createThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      const thumbnail = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ 
          quality: 80 
        })
        .toBuffer();
      
      return thumbnail;
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      throw new Error('Failed to create thumbnail');
    }
  }

  // Get image metadata
  static async getImageInfo(buffer: Buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size
      };
    } catch (error) {
      console.error('Image metadata error:', error);
      throw new Error('Failed to get image information');
    }
  }
}

// Upload service for Supabase Storage
export class UploadService {
  // Upload post image
  static async uploadPostImage(
    file: Express.Multer.File, 
    userId: string
  ): Promise<{ url: string; thumbnail?: string }> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `posts/${userId}/${timestamp}${extension}`;
      const thumbnailFilename = `posts/${userId}/${timestamp}_thumb${extension}`;

      // Optimize image
      const optimizedBuffer = await ImageProcessor.optimizePostImage(file.buffer, file.originalname);
      
      // Create thumbnail
      const thumbnailBuffer = await ImageProcessor.createThumbnail(file.buffer);

      // Upload main image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filename, optimizedBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('images')
        .upload(thumbnailFilename, thumbnailBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      // Get public URLs
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filename);

      const { data: thumbUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(thumbnailFilename);

      return {
        url: urlData.publicUrl,
        thumbnail: thumbError ? undefined : thumbUrlData.publicUrl
      };
    } catch (error) {
      console.error('Post image upload error:', error);
      throw new Error('Failed to upload post image');
    }
  }

  // Upload avatar image
  static async uploadAvatar(
    file: Express.Multer.File, 
    userId: string
  ): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `avatars/${userId}/${timestamp}${extension}`;

      // Optimize avatar
      const optimizedBuffer = await ImageProcessor.optimizeAvatar(file.buffer, file.originalname);

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filename, optimizedBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Avatar upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  // Upload cover image
  static async uploadCoverImage(
    file: Express.Multer.File, 
    userId: string
  ): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `covers/${userId}/${timestamp}${extension}`;

      // Optimize for cover (wider aspect ratio)
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1200, 400, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filename, optimizedBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Cover upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Cover upload error:', error);
      throw new Error('Failed to upload cover image');
    }
  }

  // Upload verification images (proof of work, selfie)
  static async uploadVerificationImage(
    file: Express.Multer.File, 
    userId: string,
    type: 'proof' | 'selfie'
  ): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `verification/${userId}/${type}_${timestamp}${extension}`;

      // Optimize image (keep higher quality for verification)
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 95,
          progressive: true 
        })
        .toBuffer();

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification')
        .upload(filename, optimizedBuffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Verification upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Verification upload error:', error);
      throw new Error('Failed to upload verification image');
    }
  }

  // Delete image from storage
  static async deleteImage(url: string, bucket: string = 'images'): Promise<boolean> {
    try {
      // Extract filename from URL
      const urlParts = url.split('/');
      const filename = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filename]);

      if (error) {
        console.error('Delete image error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  }

  // Get signed URL for private images
  static async getSignedUrl(filename: string, bucket: string = 'images', expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filename, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL error:', error);
      throw new Error('Failed to create signed URL');
    }
  }
}

// Validation helpers
export const validateImageFile = (file: Express.Multer.File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Error handling middleware
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        code: 'TOO_MANY_FILES'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: error.message,
      code: 'INVALID_FILE_TYPE',
      allowedTypes: allowedMimeTypes
    });
  }

  console.error('Upload error:', error);
  res.status(500).json({
    error: 'Upload failed',
    code: 'UPLOAD_ERROR'
  });
};
