import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findAll() {
    return this.storesService.findAll();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  findMyStore(@CurrentUser() user: UserPayload) {
    return this.storesService.findMyStore(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: UserPayload) {
    return this.storesService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.storesService.update(id, dto, user);
  }

  @Post(':id/toggle-open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  toggleOpen(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.storesService.toggleOpen(id, user);
  }
}
