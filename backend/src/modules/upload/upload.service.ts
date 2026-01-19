import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary: any) {}

  uploadImage(file: Express.Multer.File, folder = 'products'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
