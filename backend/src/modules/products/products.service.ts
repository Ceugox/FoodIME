import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, user: UserPayload) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
    });

    if (!store) {
      throw new NotFoundException(
        'Você ainda não possui uma loja cadastrada. Configure sua loja antes de criar produtos.',
      );
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        price: dto.price,
        stockQty: dto.stockQty,
        imageUrl: dto.imageUrl,
        storeId: store.id,
      },
    });

    return { data: product };
  }

  async findByStore(storeId: string) {
    const products = await this.prisma.product.findMany({
      where: { storeId, isAvailable: true },
    });

    return { data: products };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { store: { select: { id: true, name: true } } },
    });

    return { data: product };
  }

  async update(id: string, dto: UpdateProductDto, user: UserPayload) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    if (product.store.ownerId !== user.id) {
      throw new ForbiddenException('Você não é o dono deste produto');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  async remove(id: string, user: UserPayload) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    if (product.store.ownerId !== user.id) {
      throw new ForbiddenException('Você não é o dono deste produto');
    }

    await this.prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    });

    return { message: 'Produto removido com sucesso' };
  }

  async updateStock(id: string, stockQty: number, user: UserPayload) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    if (product.store.ownerId !== user.id) {
      throw new ForbiddenException('Você não é o dono deste produto');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stockQty },
    });

    return { data: updated };
  }
}
