import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateBranchDto } from './dto/create-branch.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('branches')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) { }

    @Get()
    @RequirePermissions('branches.manage')
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
    @RequirePermissions('branches.manage')
    create(@Body() createBranchDto: CreateBranchDto, @Request() req: any) {
        return this.branchesService.create(createBranchDto, req.user.tenantId);
    }

    @Patch(':id')
    @RequirePermissions('branches.manage')
    update(@Param('id') id: string, @Body() body: any) {
        return this.branchesService.update(id, body);
    }

    @Delete(':id')
    @RequirePermissions('branches.manage')
    remove(@Param('id') id: string, @Query('hard') hard: string) {
        return this.branchesService.remove(id, hard === 'true');
    }

    @Patch(':id/restore')
    @RequirePermissions('branches.manage')
    restore(@Param('id') id: string) {
        return this.branchesService.restore(id);
    }
}