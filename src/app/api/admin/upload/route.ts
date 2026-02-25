import { NextRequest, NextResponse } from "next/server";
import { uploadFileToStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tipo de arquivo nao permitido. Use JPG, PNG, WebP, GIF ou SVG." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Arquivo muito grande. Maximo 5MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";

    const url = await uploadFileToStorage(file, ext);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Storage nao configurado. Configure BLOB_READ_WRITE_TOKEN na Vercel." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
