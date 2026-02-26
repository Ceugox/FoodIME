import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

const BUCKET = 'foodime-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 5MB');
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPEG, PNG, WebP ou GIF');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      throw new InternalServerErrorException('Falha ao fazer upload da imagem');
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(filename);

    return { data: { url: data.publicUrl } };
  }
}
