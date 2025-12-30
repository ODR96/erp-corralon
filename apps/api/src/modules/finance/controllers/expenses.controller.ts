import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from '../services/expenses.service';
import { CreateExpenseDto, CreateExpenseCategoryDto } from '../dto/create-expense.dto';

@Controller('finance/expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get('categories')
    getCategories(@Request() req: any) {
        return this.expensesService.findAllCategories(req.user.tenant.id);
    }

    @Post('categories')
    createCategory(@Request() req: any, @Body() dto: CreateExpenseCategoryDto) {
        return this.expensesService.createCategory(dto, req.user.tenant.id);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.expensesService.findAll(req.user.tenant.id);
    }

    @Post()
    create(@Request() req: any, @Body() dto: CreateExpenseDto) {
        return this.expensesService.create(dto, req.user, req.user.tenant.id);
    }
}