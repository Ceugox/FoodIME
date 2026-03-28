import { supabaseAdmin } from '@/lib/supabase-admin';
import { AppError } from '@/lib/api/errors';
import { randomUUID } from 'crypto';

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${randomUUID()}.${ext}`;
  const path = `uploads/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from('images')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new AppError(500, `Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(path);

  return urlData.publicUrl;
}
