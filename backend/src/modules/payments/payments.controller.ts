import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.paymentsService.initiatePayment(
      dto.orderId,
      dto.method,
      user,
      dto.cardToken,
    );
  }

  @Get('order/:orderId')
  getPaymentByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }
}
