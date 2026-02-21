import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: UserPayload) {
    return this.ordersService.create(dto, user);
  }

  @Get('buyer')
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  findByBuyer(@CurrentUser() user: UserPayload) {
    return this.ordersService.findByBuyer(user);
  }

  @Get('seller')
  @UseGuards(RolesGuard)
  @Roles('SELLER')
  findBySeller(@CurrentUser() user: UserPayload) {
    return this.ordersService.findBySeller(user);
  }

  @Get('seller/metrics')
  @UseGuards(RolesGuard)
  @Roles('SELLER')
  getSellerMetrics(@CurrentUser() user: UserPayload) {
    return this.ordersService.getSellerMetrics(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.ordersService.updateStatus(id, status, user);
  }
}
