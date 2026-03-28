import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { uploadImage } from '@/services/uploads.service';

export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ message: 'Arquivo é obrigatório' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ message: 'Arquivo deve ter no máximo 5MB' }, { status: 400 });
  }

  const url = await uploadImage(file);
  return NextResponse.json({ data: { url } });
});
