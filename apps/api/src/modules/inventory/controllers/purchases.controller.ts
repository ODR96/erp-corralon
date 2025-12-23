import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Query, 
    UseGuards, 
    Request 
} from '@nestjs/common';
import { PurchasesService } from '../services/purchases.service';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { UpdatePurchaseDto } from '../dto/update-purchase.dto'; // 👈 FALTABA ESTO
import { AuthGuard } from '@nestjs/passport';

@Controller('inventory/purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) {}

    @Post()
    create(@Body() createDto: CreatePurchaseDto, @Request() req: any) {
        return this.purchasesService.create(createDto, req.user.tenant.id);
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('providerId') providerId: string,
        @Query('status') status: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('sortBy') sortBy: string,
        @Query('sortOrder') sortOrder: 'ASC' | 'DESC',
        @Request() req: any
    ) {
        // 👇 CORRECCIÓN AQUÍ: El orden de los parámetros debe coincidir con el servicio
        // Servicio espera: (page, limit, filters, tenantId)
        return this.purchasesService.findAll(
            Number(page), 
            Number(limit), 
            {
                provider_id: providerId,
                status,
                startDate,
                endDate,
                sortBy,
                sortOrder
            },
            req.user.tenant.id // tenantId va al final
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.purchasesService.findOne(id, req.user.tenant.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto, @Request() req: any) {
        // 👇 CORRECCIÓN AQUÍ: Es 'this.purchasesService', no 'this.service'
        return this.purchasesService.update(id, dto, req.user.tenant.id);
    }
}