import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoreDto, user: UserPayload) {
    const existing = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
    });

    if (existing) {
      throw new ConflictException('Usuário já possui uma loja');
    }

    const store = await this.prisma.store.create({
      data: {
        ...dto,
        ownerId: user.id,
      },
    });

    return { data: store };
  }

  async findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { isOpen: true };

    const stores = await this.prisma.store.findMany({
      where,
      include: {
        products: {
          where: { isAvailable: true },
          select: { id: true, name: true, price: true, imageUrl: true, stockQty: true, isAvailable: true, storeId: true },
        },
      },
    });

    return { data: stores };
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          where: { isAvailable: true },
          select: { id: true, name: true, price: true, imageUrl: true, stockQty: true, isAvailable: true, storeId: true },
        },
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    return { data: store };
  }

  async findMyStore(user: UserPayload) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
      include: { products: true },
    });

    return { data: store };
  }

  async update(id: string, dto: UpdateStoreDto, user: UserPayload) {
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id } });

    if (store.ownerId !== user.id) {
      throw new ForbiddenException('Você não é o dono desta loja');
    }

    const updated = await this.prisma.store.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  async toggleOpen(id: string, user: UserPayload) {
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id } });

    if (store.ownerId !== user.id) {
      throw new ForbiddenException('Você não é o dono desta loja');
    }

    const updated = await this.prisma.store.update({
      where: { id },
      data: { isOpen: !store.isOpen },
    });

    return { data: updated };
  }
}
