import { PartialType } from '@nestjs/mapped-types'; // O @nestjs/swagger
import { CreateCheckDto } from './create-check.dto';

export class UpdateCheckDto extends PartialType(CreateCheckDto) {}