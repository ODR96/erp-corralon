import { Module } from '@nestjs/common';
import { AfipController } from './controllers/afip.controller';
import { AfipService } from './services/afip.service';

@Module({
    controllers: [AfipController],
    providers: [AfipService],
})
export class IntegrationsModule { }