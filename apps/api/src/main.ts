import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Activamos CORS para que tu celular pueda pedir datos
  app.enableCors({
    origin: '*', // Permitir acceso desde cualquier IP (solo para desarrollo)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 2. IMPORTANTE: Agregamos '0.0.0.0' para escuchar en la red, no solo local
  await app.listen(3000, '0.0.0.0'); 
  
  console.log(`🚀 Server corriendo en: ${await app.getUrl()}`);
}
bootstrap();