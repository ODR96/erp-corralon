import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderAccountDto } from './create-provider-account.dto';

export class UpdateProviderAccountDto extends PartialType(CreateProviderAccountDto) {}