import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('users')
  getUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(role, search, status);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, dto.reason);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('sellers/:id')
  getSellerDashboard(@Param('id') id: string) {
    return this.adminService.getSellerDashboard(id);
  }

  @Get('buyers/:id')
  getBuyerHistory(@Param('id') id: string) {
    return this.adminService.getBuyerHistory(id);
  }

  @Patch('stores/:id/commission')
  updateStoreCommission(
    @Param('id') id: string,
    @Body() data: { commissionRate: number },
  ) {
    return this.adminService.updateStoreCommission(id, data.commissionRate);
  }

  @Get('transactions')
  getTransactions(
    @Query('method') method?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getTransactions(method, status);
  }

  @Get('payouts')
  getPayoutOverview() {
    return this.adminService.getPayoutOverview();
  }

  @Post('payouts')
  createPayout(
    @Body() body: { storeId: string; amount: number; note?: string },
  ) {
    return this.adminService.createPayout(body.storeId, body.amount, body.note);
  }

  @Get('payouts/:storeId')
  getStorePayouts(@Param('storeId') storeId: string) {
    return this.adminService.getStorePayouts(storeId);
  }
}
