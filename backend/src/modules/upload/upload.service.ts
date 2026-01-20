import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  async uploadImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<{ url: string; publicId: string }> {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            console.log('CLOUDINARY ERROR:', error);
            console.log('CLOUDINARY RESULT:', result);

            if (error || !result) {
              return reject(error);
            }

            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });
    } catch (error) {
      throw new InternalServerErrorException('Upload image failed');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new InternalServerErrorException('Delete image failed');
    }
  }
}
