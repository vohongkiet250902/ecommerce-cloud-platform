import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = 'admin@gmail.com';

  const exists = await usersService.findByEmail(email);
  if (exists) {
    console.log('Admin đã tồn tại');
    process.exit();
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  await usersService.create({
    fullName: 'System Admin',
    email,
    password: passwordHash,
    role: 'admin',
    isActive: true,
  });

  console.log('✅ Admin đã được tạo:');
  console.log('Email: admin@gmail.com');
  console.log('Password: admin123');

  process.exit();
}

bootstrap();
