import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MeasurementUnitsService } from '../services/measurement-units.service';

@Controller('inventory/units')
@UseGuards(AuthGuard('jwt'))
export class MeasurementUnitsController {
    constructor(private readonly service: MeasurementUnitsService) { }

    @Get()
    findAll() {
        return this.service.findAll();
    }
}