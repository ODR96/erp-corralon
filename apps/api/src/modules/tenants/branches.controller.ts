import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) { }

    @Get()
    findAll(
        @Request() req: any,
        @Query('withDeleted') withDeleted: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search: string,
    ) {
        const offset = (page - 1) * limit;
        return this.branchesService.findAll(req.user.tenantId, limit, offset, search, withDeleted === 'true');
    }

    // ... create, update, remove, restore (igual que antes) ...
    @Post()
    @Roles('Super Admin', 'Admin')
    create(@Body() createBranchDto: CreateBranchDto, @Request() req: any) {
        return this.branchesService.create(createBranchDto, req.user.tenantId);
    }

    @Patch(':id')
    @Roles('Super Admin', 'Admin')
    update(@Param('id') id: string, @Body() body: any) {
        return this.branchesService.update(id, body);
    }

    @Delete(':id')
    @Roles('Super Admin', 'Admin')
    remove(@Param('id') id: string, @Query('hard') hard: string) {
        return this.branchesService.remove(id, hard === 'true');
    }

    @Patch(':id/restore')
    @Roles('Super Admin', 'Admin')
    restore(@Param('id') id: string) {
        return this.branchesService.restore(id);
    }
}