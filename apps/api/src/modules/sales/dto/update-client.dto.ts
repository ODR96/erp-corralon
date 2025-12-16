import { PartialType } from '@nestjs/mapped-types'; // O @nestjs/swagger
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}