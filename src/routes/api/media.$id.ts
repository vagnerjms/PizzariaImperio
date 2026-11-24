import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { getMediaImageFromDb } = await import("@/lib/media.server");
          const media = await getMediaImageFromDb(params.id);
          if (!media) {
            return new Response("Imagem não encontrada", { status: 404 });
          }

          return new Response(new Uint8Array(media.bytes), {
            status: 200,
            headers: {
              "Content-Type": media.mimeType,
              "Cache-Control": "public, max-age=31536000, immutable",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch (err) {
          console.error("Erro ao servir imagem /api/media:", err);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});
