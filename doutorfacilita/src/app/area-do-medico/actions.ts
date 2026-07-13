"use server";

import { getAuthUser } from "@/lib/auth/getAuthUser";
import { createAdminClient } from "@/lib/supabase/admin";

// Upload da foto de perfil do médico.
//
// Estratégia sem DDL: arquivo vai pro bucket PÚBLICO `avatars` (criado sob
// demanda) via service role — assim não precisamos de policies de RLS em
// storage.objects. A URL pública é gravada no user_metadata do Auth, então
// `getAuthUser()` a devolve em todo lugar (cockpit, área do médico) e a foto
// "acompanha a conta" do médico automaticamente.

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];

type Resultado = { url: string } | { error: string };

export async function uploadAvatarFoto(formData: FormData): Promise<Resultado> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nenhum arquivo recebido." };
  }
  if (!TIPOS_OK.includes(file.type)) {
    return { error: "Formato inválido. Use JPG, PNG ou WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Imagem muito grande (máx. 5 MB)." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Upload indisponível (configuração ausente)." };
  }

  // A foto acompanha a conta do MÉDICO — confirma o papel.
  const { data: doctor } = await admin
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doctor) return { error: "Apenas médicos podem enviar foto de perfil." };

  // Garante o bucket público (idempotente — ignora "já existe").
  const { error: bucketErr } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: TIPOS_OK,
  });
  if (bucketErr && !/exist/i.test(bucketErr.message)) {
    return { error: `Falha ao preparar armazenamento: ${bucketErr.message}` };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Nome único por upload → evita cache de imagem antiga na mesma URL.
  const path = `${user.id}/perfil-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return { error: `Falha no upload: ${upErr.message}` };

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // Persiste na metadata do usuário → acompanha a conta em todas as telas.
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: url },
  });
  if (metaErr) return { error: `Falha ao salvar foto: ${metaErr.message}` };

  return { url };
}
