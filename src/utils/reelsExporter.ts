import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { BrandKit, ReelsState } from '../types';
import { loadImage, resolveCorsSafeImageUrl } from './posterRenderer';

const REELS_W = 1080;
const REELS_H = 1920;
const FPS = 30;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCoverWithZoom(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number,
  zoom: number
) {
  const ratio = srcW / srcH;
  const targetRatio = REELS_W / REELS_H;
  let drawW = REELS_W;
  let drawH = REELS_H;

  if (ratio > targetRatio) {
    drawH = REELS_H * zoom;
    drawW = drawH * ratio;
  } else {
    drawW = REELS_W * zoom;
    drawH = drawW / ratio;
  }

  const x = (REELS_W - drawW) / 2;
  const y = (REELS_H - drawH) / 2;
  ctx.drawImage(source, x, y, drawW, drawH);
}

export function drawReelsBrandingOverlay(
  ctx: CanvasRenderingContext2D,
  brandKit: BrandKit,
  villageLogo: HTMLImageElement | null,
  regencyLogo: HTMLImageElement | null
) {
  const font = brandKit.fontFamily || 'Plus Jakarta Sans';
  const accent = brandKit.colors.accent || '#eab308';
  const padX = 48;
  const topY = 64;

  // Left: Regency + Village logos floating cleanly
  let lx = padX;
  if (regencyLogo) {
    ctx.drawImage(regencyLogo, lx, topY, 68, 68);
    lx += 82;
  }
  if (villageLogo) {
    ctx.drawImage(villageLogo, lx, topY, 68, 68);
  }

  // Right: Gold vertical bar + stacked PEMERINTAH / DESA ...
  const rawName = (brandKit.villageName || 'PEMERINTAH DESA').trim().toUpperCase();
  const hasPem = rawName.startsWith('PEMERINTAH ');
  const line1 = hasPem ? 'PEMERINTAH' : 'PEMERINTAH';
  const line2 = hasPem ? rawName.replace(/^PEMERINTAH\s+/, '') : rawName;

  ctx.font = `800 32px "${font}", sans-serif`;
  const w1 = ctx.measureText(line1).width;
  ctx.font = `700 24px "${font}", sans-serif`;
  const w2 = ctx.measureText(line2).width;
  const blockW = Math.max(w1, w2);
  const barX = REELS_W - padX - blockW - 18;

  ctx.fillStyle = accent;
  ctx.fillRect(barX, topY + 4, 5, 62);

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.font = `800 32px "${font}", sans-serif`;
  ctx.fillText(line1, barX + 16, topY + 2);

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `700 24px "${font}", sans-serif`;
  ctx.fillText(line2, barX + 16, topY + 38);
}

export async function exportReelsToMp4(
  reels: ReelsState,
  brandKit: BrandKit,
  onProgress?: (pct: number, status: string) => void
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const canvas = document.createElement('canvas');
  canvas.width = REELS_W;
  canvas.height = REELS_H;
  const ctx = canvas.getContext('2d')!;

  const [villageLogo, regencyLogo] = await Promise.all([
    loadImage(brandKit.villageLogo),
    loadImage(brandKit.regencyLogo),
  ]);

  // Preload slide media
  const loadedSlides = await Promise.all(
    reels.slides.map(async (slide) => {
      if (slide.mediaType === 'video' && slide.mediaUrl) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.src = resolveCorsSafeImageUrl(slide.mediaUrl);
        await new Promise<void>((res) => {
          video.onloadeddata = () => res();
          video.onerror = () => res();
        });
        return { slide, img: null as HTMLImageElement | null, video };
      }
      const img = await loadImage(slide.mediaUrl);
      return { slide, img, video: null as HTMLVideoElement | null };
    })
  );

  // Build timeline segments
  type Segment =
    | { kind: 'intro'; durationSec: number }
    | { kind: 'slide'; durationSec: number; index: number }
    | { kind: 'outro'; durationSec: number };

  const segments: Segment[] = [];
  if (reels.showIntro) segments.push({ kind: 'intro', durationSec: 2.5 });
  loadedSlides.forEach((s, idx) =>
    segments.push({ kind: 'slide', durationSec: Math.max(2, s.slide.durationSec || 4), index: idx })
  );
  if (reels.showOutro) segments.push({ kind: 'outro', durationSec: 2.5 });

  const totalFrames = Math.max(
    FPS,
    Math.round(segments.reduce((acc, s) => acc + s.durationSec, 0) * FPS)
  );

  const renderFrameAt = async (seg: Segment, localProgress: number) => {
    const primary = brandKit.colors.primary;
    const secondary = brandKit.colors.secondary;
    const accent = brandKit.colors.accent;
    const font = brandKit.fontFamily || 'Plus Jakarta Sans';

    if (seg.kind === 'intro') {
      const grad = ctx.createLinearGradient(0, 0, REELS_W, REELS_H);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, REELS_W, REELS_H);

      let logoY = 580;
      if (regencyLogo || villageLogo) {
        const size = 160;
        const gap = 36;
        const count = (regencyLogo ? 1 : 0) + (villageLogo ? 1 : 0);
        let lx = (REELS_W - (count * size + (count - 1) * gap)) / 2;
        if (regencyLogo) {
          ctx.drawImage(regencyLogo, lx, logoY, size, size);
          lx += size + gap;
        }
        if (villageLogo) {
          ctx.drawImage(villageLogo, lx, logoY, size, size);
        }
        logoY += 220;
      }

      ctx.fillStyle = accent;
      ctx.textAlign = 'center';
      ctx.font = `800 32px "${font}", sans-serif`;
      ctx.fillText(brandKit.villageName.toUpperCase(), REELS_W / 2, logoY);

      ctx.fillStyle = '#ffffff';
      ctx.font = `800 56px "${font}", sans-serif`;
      const hookLines = wrapText(ctx, reels.introHook || 'Info Terbaru Desa', REELS_W - 140);
      hookLines.forEach((line, i) => {
        ctx.fillText(line, REELS_W / 2, logoY + 95 + i * 74);
      });
      ctx.textAlign = 'left';
      return;
    }

    if (seg.kind === 'outro') {
      const grad = ctx.createLinearGradient(0, 0, REELS_W, REELS_H);
      grad.addColorStop(0, secondary);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, REELS_W, REELS_H);

      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.font = `800 34px "${font}", sans-serif`;
      ctx.fillText('TERIMA KASIH', REELS_W / 2, 760);

      ctx.fillStyle = '#ffffff';
      ctx.font = `800 52px "${font}", sans-serif`;
      const ctaLines = wrapText(
        ctx,
        reels.outroCta || `Ikuti terus informasi resmi ${brandKit.villageName}`,
        REELS_W - 140
      );
      ctaLines.forEach((line, i) => {
        ctx.fillText(line, REELS_W / 2, 850 + i * 68);
      });

      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = `600 28px "${font}", sans-serif`;
      ctx.fillText(brandKit.footerText || brandKit.villageName, REELS_W / 2, 1140);
      ctx.textAlign = 'left';
      return;
    }

    // Slide frame
    const item = loadedSlides[seg.index];
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, REELS_W, REELS_H);

    const zoom = 1 + localProgress * 0.08;
    if (item.video && item.video.readyState >= 2) {
      const targetTime = Math.min(
        item.video.duration || 3,
        localProgress * seg.durationSec
      );
      if (Math.abs(item.video.currentTime - targetTime) > 0.04) {
        item.video.currentTime = targetTime;
        await new Promise<void>((r) => {
          item.video!.onseeked = () => r();
          setTimeout(r, 80);
        });
      }
      drawCoverWithZoom(
        ctx,
        item.video,
        item.video.videoWidth || REELS_W,
        item.video.videoHeight || REELS_H,
        1
      );
    } else if (item.img) {
      drawCoverWithZoom(ctx, item.img, item.img.width, item.img.height, zoom);
    } else {
      const grad = ctx.createLinearGradient(0, 0, REELS_W, REELS_H);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, REELS_W, REELS_H);
    }

    // Bottom gradient for subtitle readability
    const grad = ctx.createLinearGradient(0, REELS_H * 0.48, 0, REELS_H);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.78)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, REELS_W, REELS_H);

    drawReelsBrandingOverlay(ctx, brandKit, villageLogo, regencyLogo);

    // Subtitle & Headline card
    const padX = 68;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(padX, 1340, 12, 240, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.font = `800 58px "${font}", sans-serif`;
    const hLines = wrapText(ctx, item.slide.headline || '', REELS_W - padX * 2 - 36).slice(0, 3);
    let ty = 1320;
    for (const line of hLines) {
      ctx.fillText(line, padX + 32, ty);
      ty += 70;
    }

    ty += 16;
    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.font = `500 36px "${font}", sans-serif`;
    const sLines = wrapText(ctx, item.slide.subtitle || '', REELS_W - padX * 2 - 36).slice(0, 3);
    for (const line of sLines) {
      ctx.fillText(line, padX + 32, ty);
      ty += 48;
    }
  };

  // Prefer WebCodecs VideoEncoder + mp4-muxer for real .mp4 output
  if (typeof VideoEncoder !== 'undefined') {
    onProgress?.(5, 'Menyiapkan encoder MP4...');
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width: REELS_W,
        height: REELS_H,
      },
      fastStart: 'in-memory',
    });

    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (err) => console.error('VideoEncoder error:', err),
    });

    encoder.configure({
      codec: 'avc1.420028',
      width: REELS_W,
      height: REELS_H,
      bitrate: 4_500_000,
      framerate: FPS,
    });

    let frameIndex = 0;
    for (const seg of segments) {
      const segFrames = Math.max(1, Math.round(seg.durationSec * FPS));
      for (let f = 0; f < segFrames; f++) {
        await renderFrameAt(seg, f / segFrames);
        const frame = new VideoFrame(canvas, {
          timestamp: Math.round((frameIndex * 1_000_000) / FPS),
          duration: Math.round(1_000_000 / FPS),
        });
        encoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
        frame.close();
        frameIndex++;

        if (frameIndex % 10 === 0) {
          const pct = Math.min(95, Math.round((frameIndex / totalFrames) * 90) + 5);
          onProgress?.(pct, `Merender frame ${frameIndex}/${totalFrames}...`);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }

    onProgress?.(96, 'Menyelesaikan file MP4...');
    await encoder.flush();
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    onProgress?.(100, 'Selesai!');
    return { blob, ext: 'mp4' };
  }

  // Fallback to MediaRecorder if WebCodecs is unavailable
  onProgress?.(10, 'Merekam video...');
  const stream = canvas.captureStream(FPS);
  const mime = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start();
  let frameIndex = 0;
  for (const seg of segments) {
    const segFrames = Math.max(1, Math.round(seg.durationSec * FPS));
    for (let f = 0; f < segFrames; f++) {
      await renderFrameAt(seg, f / segFrames);
      frameIndex++;
      onProgress?.(Math.round((frameIndex / totalFrames) * 95), 'Merekam frame...');
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }
  }
  recorder.stop();
  const blob = await done;
  onProgress?.(100, 'Selesai!');
  return { blob, ext: mime === 'video/mp4' ? 'mp4' : 'webm' };
}
