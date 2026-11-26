import JSZip from 'jszip';
import { AiGeneratedContent, BrandKit, PosterState } from '../types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg'
): Promise<Blob> {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal mengonversi canvas ke gambar.'));
      },
      mime,
      0.95
    );
  });
}

export function buildCaptionTxt(
  ai: AiGeneratedContent | null,
  poster: PosterState,
  brandKit: BrandKit
): string {
  const lines = [
    `=== PAKET KONTEN SIAP POSTING ===`,
    `Desa: ${brandKit.villageName}`,
    `Tanggal: ${poster.dateLabel || new Date().toLocaleDateString('id-ID')}`,
    ``,
    `--- JUDUL POSTER ---`,
    ai?.posterTitle || poster.title,
    ``,
    `--- RINGKASAN BERITA ---`,
    ai?.newsSummary || poster.subtitle,
    ``,
    `--- CAPTION INSTAGRAM ---`,
    ai?.captionInstagram || `${poster.title}\n\n${poster.subtitle}`,
    ``,
    `--- CAPTION FACEBOOK ---`,
    ai?.captionFacebook || `${poster.title}\n\n${poster.subtitle}`,
    ``,
    `--- KETERANGAN FOTO ---`,
    ai?.photoCaption || `Dokumentasi ${brandKit.villageName}`,
    ``,
    `--- HASHTAG ---`,
    ai?.hashtags || '#InfoDesa #DesaMaju',
  ];

  if (ai?.reelsConcept) {
    lines.push(
      ``,
      `--- KONSEP REELS ---`,
      `Hook: ${ai.reelsConcept.hook}`,
      ...ai.reelsConcept.slides.map(
        (s, i) => `Slide ${i + 1} (${s.durationSec}s): ${s.headline} — ${s.subtitle}`
      ),
      `Outro CTA: ${ai.reelsConcept.outroCta}`
    );
  }

  return lines.join('\n');
}

export async function downloadZipPackage(params: {
  posterCanvas: HTMLCanvasElement | null;
  reelsBlob: Blob | null;
  reelsExt?: 'mp4' | 'webm';
  aiContent: AiGeneratedContent | null;
  posterState: PosterState;
  brandKit: BrandKit;
  baseFilename: string;
}) {
  const {
    posterCanvas,
    reelsBlob,
    reelsExt = 'mp4',
    aiContent,
    posterState,
    brandKit,
    baseFilename,
  } = params;

  const zip = new JSZip();
  const safeBase = baseFilename.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'konten-desa-tobadak';

  if (posterCanvas) {
    const pngBlob = await canvasToBlob(posterCanvas, 'png');
    const jpgBlob = await canvasToBlob(posterCanvas, 'jpg');
    zip.file(`${safeBase}-poster.png`, pngBlob);
    zip.file(`${safeBase}-poster.jpg`, jpgBlob);
  }

  if (reelsBlob) {
    zip.file(`${safeBase}-reels.${reelsExt}`, reelsBlob);
  }

  const txt = buildCaptionTxt(aiContent, posterState, brandKit);
  zip.file(`${safeBase}-caption.txt`, txt);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${safeBase}-paket-konten.zip`);
}
