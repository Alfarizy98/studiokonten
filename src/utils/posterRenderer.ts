import {
  BrandKit,
  MasterTemplate,
  PLATFORM_PRESETS,
  PosterState,
} from '../types';

const imageCache = new Map<string, HTMLImageElement>();

export function clearImageCache(): void {
  imageCache.clear();
}

export function resolveCorsSafeImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  const safeUrl = resolveCorsSafeImageUrl(url);
  if (imageCache.has(safeUrl)) {
    return Promise.resolve(imageCache.get(safeUrl)!);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (imageCache.size >= 30) {
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) imageCache.delete(oldestKey);
      }
      imageCache.set(safeUrl, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = safeUrl;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    drawY = y - (drawH - h) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawGraphPaperGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number
) {
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, y, w, h);
  const step = Math.max(24, Math.round(44 * scale));
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  for (let gx = x; gx <= x + w; gx += step) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (let gy = y; gy <= y + h; gy += step) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawKemendesaTopLogos(
  ctx: CanvasRenderingContext2D,
  W: number,
  padX: number,
  scale: number,
  villageLogoImg: HTMLImageElement | null,
  regencyLogoImg: HTMLImageElement | null,
  accent: string,
  hashtagLabel: string
) {
  const logoSize = Math.round(68 * scale);
  const topY = Math.round(32 * scale);

  if (villageLogoImg) {
    drawContainLogo(ctx, villageLogoImg, padX, topY, logoSize);
  } else {
    drawDefaultEmblemLogo(ctx, padX, topY, logoSize, 'village', accent);
  }

  if (regencyLogoImg) {
    drawContainLogo(ctx, regencyLogoImg, padX + logoSize + Math.round(14 * scale), topY, logoSize);
  } else {
    drawDefaultEmblemLogo(ctx, padX + logoSize + Math.round(14 * scale), topY, logoSize, 'regency', accent);
  }

  // Right-side campaign hashtag badge (#BANGUN TOBADAK, BANGUN INDONESIA)
  ctx.save();
  const tagText = hashtagLabel.toUpperCase();
  ctx.font = `800 ${Math.round(19 * scale)}px "Plus Jakarta Sans", sans-serif`;
  const tw = ctx.measureText(tagText).width + Math.round(32 * scale);
  const th = Math.round(42 * scale);
  const tx = W - padX - tw;
  const ty = topY + Math.round(12 * scale);
  ctx.fillStyle = 'rgba(27, 42, 120, 0.88)';
  drawRoundedRect(ctx, tx, ty, tw, th, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tx + tw / 2, ty + th / 2 + 1);
  ctx.restore();
}

function drawKemendesaFooterBar(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  padX: number,
  scale: number,
  primary: string,
  secondary: string,
  accent: string,
  brandKit: BrandKit,
  font: string
) {
  const footerH = Math.round(92 * scale);
  const footerY = H - footerH;
  ctx.save();
  const grad = ctx.createLinearGradient(0, footerY, W, footerY);
  grad.addColorStop(0, primary);
  grad.addColorStop(1, secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, footerY, W, footerH);

  // Left brand identity
  const shortVillage = (brandKit.villageName || 'Pemerintah Desa Tobadak').toUpperCase();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(22 * scale)}px "${font}", sans-serif`;
  ctx.fillText(shortVillage, padX, footerY + footerH * 0.38);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `500 ${Math.round(15 * scale)}px "${font}", sans-serif`;
  ctx.fillText(
    `${brandKit.districtName} • ${brandKit.regencyName}`,
    padX,
    footerY + footerH * 0.68
  );

  // Right website & social handle
  const website = brandKit.websiteUrl || 'www.tobadak.desa.id';
  const social = brandKit.socialHandle || 'Pemdes Tobadak';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(20 * scale)}px "${font}", sans-serif`;
  ctx.fillText(website, W - padX, footerY + footerH * 0.38);

  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(16 * scale)}px "${font}", sans-serif`;
  ctx.fillText(`@${social.replace(/^@/, '')}`, W - padX, footerY + footerH * 0.68);
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#1b2a78').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function drawContainLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  boxSize: number
) {
  const ratio = img.width / img.height;
  let drawW = boxSize;
  let drawH = boxSize;
  let drawX = x;
  let drawY = y;
  if (ratio > 1) {
    drawH = boxSize / ratio;
    drawY = y + (boxSize - drawH) / 2;
  } else {
    drawW = boxSize * ratio;
    drawX = x + (boxSize - drawW) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawDefaultEmblemLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: 'regency' | 'village',
  accentColor: string
) {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.46;

  // Outer shield/circle with subtle border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = variant === 'regency' ? '#0f172a' : '#1b2a78';
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = variant === 'regency' ? accentColor : '#ffffff';
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.stroke();

  // Center emblem typography
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(size * 0.22)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(variant === 'regency' ? 'MT' : 'DT', cx, cy - size * 0.04);

  ctx.fillStyle = accentColor;
  ctx.font = `700 ${Math.round(size * 0.11)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(variant === 'regency' ? 'MAMUJU TENGAH' : 'TOBADAK', cx, cy + size * 0.18);
  ctx.restore();
}

function drawJournalisticBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  primary: string,
  secondary: string
) {
  const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  grad.addColorStop(0, primary);
  grad.addColorStop(0.5, '#0b3b21');
  grad.addColorStop(1, secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial editorial glow
  const rad = ctx.createRadialGradient(W * 0.72, H * 0.34, 40, W * 0.72, H * 0.34, W * 0.75);
  rad.addColorStop(0, 'rgba(34, 197, 94, 0.22)');
  rad.addColorStop(0.6, 'rgba(16, 185, 129, 0.05)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, W, H);

  // Subtle newsroom grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = Math.round(W / 12);
  for (let gx = step; gx < W; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = step; gy < H; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPemdesMinimalIcons(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxRightX: number,
  scale: number,
  websiteUrl: string,
  socialHandle: string,
  font: string,
  accent: string,
  iconBgTextColor = '#0f1847'
) {
  ctx.save();
  const r = Math.round(13 * scale);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1.8, 2.2 * scale);
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(24 * scale)}px "${font}", sans-serif`;

  let cursorX = x;

  if (websiteUrl) {
    // Globe icon
    const cx = cursorX + r;
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, y, r * 0.45, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, y);
    ctx.lineTo(cx + r, y);
    ctx.stroke();

    cursorX += r * 2 + Math.round(10 * scale);
    ctx.fillText(websiteUrl, cursorX, y);
    cursorX += ctx.measureText(websiteUrl).width + Math.round(26 * scale);
  }

  if (socialHandle) {
    const iconSize = Math.round(26 * scale);
    // FB circle badge
    ctx.beginPath();
    ctx.arc(cursorX + iconSize * 0.5, y, iconSize * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = iconBgTextColor;
    ctx.font = `800 ${Math.round(17 * scale)}px "${font}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('f', cursorX + iconSize * 0.5, y + 1);
    ctx.textAlign = 'left';
    cursorX += iconSize + Math.round(8 * scale);

    // IG rounded square
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(cursorX, y - iconSize * 0.44, iconSize * 0.88, iconSize * 0.88, 5 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cursorX + iconSize * 0.44, y, iconSize * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    cursorX += iconSize + Math.round(12 * scale);

    // Handle text
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = `600 ${Math.round(24 * scale)}px "${font}", sans-serif`;
    ctx.fillText(socialHandle, cursorX, y);
  }

  // Right-side editorial rubric tag
  const rubric = 'PORTAL INFORMASI RESMI';
  ctx.font = `700 ${Math.round(18 * scale)}px "${font}", sans-serif`;
  const rw = ctx.measureText(rubric).width;
  if (maxRightX - rw > cursorX + Math.round(160 * scale)) {
    ctx.fillStyle = accent;
    ctx.textAlign = 'right';
    ctx.fillText(rubric, maxRightX, y);
  }

  ctx.restore();
}

export async function renderPosterToCanvas(
  canvas: HTMLCanvasElement,
  poster: PosterState,
  brandKit: BrandKit,
  template?: MasterTemplate
): Promise<void> {
  const preset = PLATFORM_PRESETS[poster.platform] || PLATFORM_PRESETS.ig_feed;
  const W = preset.width;
  const H = preset.height;

  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const primary = poster.primaryColor || brandKit.colors.primary;
  const secondary = brandKit.colors.secondary || '#0f1847';
  const accent = poster.accentColor || brandKit.colors.accent;
  const font = poster.fontFamily || brandKit.fontFamily || 'Plus Jakarta Sans';
  const layout = template?.layout || 'pemdes-overlay';
  const isLandscape = W > H;
  const scale = Math.min(W, H) / 1080;

  // Load images concurrently
  const [photoImg, villageLogoImg, regencyLogoImg] = await Promise.all([
    loadImage(poster.photoUrl),
    loadImage(brandKit.villageLogo),
    loadImage(brandKit.regencyLogo),
  ]);

  // ============================================================================
  // SPECIAL LAYOUT: PEMDES OVERLAY (Top Journalistic Newsroom + Desa Tobadak Style)
  // ============================================================================
  if (layout === 'pemdes-overlay') {
    if (photoImg) {
      drawCoverImage(ctx, photoImg, 0, 0, W, H);
    } else {
      drawJournalisticBackdrop(ctx, W, H, primary, secondary);
    }

    const rgb = hexToRgb(primary);
    const secRgb = hexToRgb(secondary);
    const alpha = Math.max(0.35, Math.min(0.95, poster.overlayOpacity));

    // 1. Smooth atmospheric top forest-green gradient (frames masthead & logos)
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.44);
    topGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(0.95, alpha + 0.14)})`);
    topGrad.addColorStop(0.48, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.55})`);
    topGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.44);

    // 2. Editorial lower-third gradient (anchors journalistic headline cleanly at bottom)
    const botGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
    botGrad.addColorStop(0, `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0)`);
    botGrad.addColorStop(0.38, `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, ${alpha * 0.65})`);
    botGrad.addColorStop(0.72, `rgba(4, 22, 12, ${Math.min(0.94, alpha + 0.14)})`);
    botGrad.addColorStop(1, `rgba(3, 15, 8, 0.98)`);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H * 0.38, W, H * 0.62);

    const padX = Math.round(52 * scale);
    const topY = Math.round(44 * scale);

    // 3. Floating Top Masthead: Left Emblems + Right Vertical Gold Rule & PEMERINTAH / DESA TOBADAK
    if (poster.showHeader) {
      const logoSize = Math.round(74 * scale);
      let lx = padX;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 10 * scale;
      if (regencyLogoImg) {
        drawContainLogo(ctx, regencyLogoImg, lx, topY, logoSize);
      } else {
        drawDefaultEmblemLogo(ctx, lx, topY, logoSize, 'regency', accent);
      }
      lx += logoSize + Math.round(16 * scale);

      if (villageLogoImg) {
        drawContainLogo(ctx, villageLogoImg, lx, topY, logoSize);
      } else {
        drawDefaultEmblemLogo(ctx, lx, topY, logoSize, 'village', accent);
      }
      ctx.restore();

      // Top-Right: Gold vertical bar + stacked "PEMERINTAH" / "DESA TOBADAK" / "KAB. MAMUJU TENGAH"
      const rawName = (brandKit.villageName || 'PEMERINTAH DESA TOBADAK').trim().toUpperCase();
      const hasPem = rawName.startsWith('PEMERINTAH ');
      const line1 = 'PEMERINTAH';
      const line2 = hasPem ? rawName.replace(/^PEMERINTAH\s+/, '') : rawName;
      const line3 = (brandKit.regencyName || 'KABUPATEN MAMUJU TENGAH').toUpperCase();

      ctx.font = `800 ${Math.round(32 * scale)}px "${font}", sans-serif`;
      const w1 = ctx.measureText(line1).width;
      ctx.font = `700 ${Math.round(25 * scale)}px "${font}", sans-serif`;
      const w2 = ctx.measureText(line2).width;
      ctx.font = `700 ${Math.round(16 * scale)}px "${font}", sans-serif`;
      const w3 = ctx.measureText(line3).width;

      const textBlockW = Math.max(w1, w2, w3);
      const barX = W - padX - textBlockW - Math.round(20 * scale);
      const barH = Math.round(78 * scale);

      ctx.fillStyle = accent;
      ctx.fillRect(barX, topY + Math.round(3 * scale), Math.round(5 * scale), barH);

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.font = `800 ${Math.round(32 * scale)}px "${font}", sans-serif`;
      ctx.fillText(line1, barX + Math.round(16 * scale), topY + Math.round(1 * scale));

      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 ${Math.round(25 * scale)}px "${font}", sans-serif`;
      ctx.fillText(line2, barX + Math.round(16 * scale), topY + Math.round(35 * scale));

      ctx.fillStyle = accent;
      ctx.font = `700 ${Math.round(16 * scale)}px "${font}", sans-serif`;
      ctx.fillText(line3, barX + Math.round(16 * scale), topY + Math.round(64 * scale));
    }

    // 4. Journalistic Lower-Third News Block (Kicker + Dateline, Vertical Gold Rule + Headline, Deck)
    const footerAreaH = poster.showFooter ? Math.round(104 * scale) : Math.round(44 * scale);
    const ruleGap = Math.round(26 * scale);
    const textX = padX + ruleGap;
    const contentW = W - padX * 2 - ruleGap;

    const titleFontSize = Math.round((isLandscape ? 48 : 62) * scale);
    const subFontSize = Math.round((isLandscape ? 25 : 31) * scale);

    ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
    const titleLines = wrapText(ctx, poster.title || 'Informasi Resmi Pemerintah Desa Tobadak', contentW).slice(0, 4);

    ctx.font = `500 ${subFontSize}px "${font}", sans-serif`;
    const subLines = wrapText(ctx, poster.subtitle || '', contentW).slice(0, 3);

    const titleLineH = Math.round(titleFontSize * 1.15);
    const subLineH = Math.round(subFontSize * 1.38);
    const badgeH = Math.round(44 * scale);

    const headlineH = titleLines.length * titleLineH;
    const deckH = subLines.length > 0 ? Math.round(22 * scale) + subLines.length * subLineH : 0;
    const totalNewsBlockH = badgeH + Math.round(20 * scale) + headlineH + deckH;

    let cursorY = H - footerAreaH - totalNewsBlockH - Math.round(28 * scale);
    if (cursorY < Math.round(145 * scale)) cursorY = Math.round(145 * scale);

    // Kicker Pill + Journalistic Dateline (e.g., [INFO DESA]  DESA TOBADAK • 22 Nov 2026)
    const kickerText = (poster.badgeText || 'KABAR TOBADAK').toUpperCase();
    ctx.font = `800 ${Math.round(21 * scale)}px "${font}", sans-serif`;
    const bw = ctx.measureText(kickerText).width + Math.round(32 * scale);
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, padX, cursorY, bw, badgeH, 7 * scale);
    ctx.fill();

    ctx.fillStyle = secondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(kickerText, padX + Math.round(16 * scale), cursorY + badgeH / 2 + 1);

    const dateline = poster.dateLabel
      ? `DESA TOBADAK  •  ${poster.dateLabel.toUpperCase()}`
      : 'DESA TOBADAK  •  MAMUJU TENGAH';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `700 ${Math.round(19 * scale)}px "${font}", sans-serif`;
    ctx.fillText(dateline, padX + bw + Math.round(18 * scale), cursorY + badgeH / 2 + 1);

    cursorY += badgeH + Math.round(18 * scale);

    // Editorial Vertical Gold Bar alongside Headline
    if (titleLines.length > 0) {
      ctx.fillStyle = accent;
      drawRoundedRect(
        ctx,
        padX,
        cursorY + Math.round(4 * scale),
        Math.round(6 * scale),
        headlineH - Math.round(10 * scale),
        3 * scale
      );
      ctx.fill();

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 14 * scale;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
      for (const line of titleLines) {
        ctx.fillText(line, textX, cursorY);
        cursorY += titleLineH;
      }
      ctx.restore();
    }

    // Lead / Deck paragraph
    if (subLines.length > 0) {
      cursorY += Math.round(14 * scale);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
      ctx.textBaseline = 'top';
      ctx.font = `500 ${subFontSize}px "${font}", sans-serif`;
      for (const line of subLines) {
        ctx.fillText(line, textX, cursorY);
        cursorY += subLineH;
      }
    }

    // Watermark
    if (poster.showWatermark && brandKit.watermarkText) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(0.6, brandKit.watermarkOpacity || 0.18));
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.round(18 * scale)}px "${font}", sans-serif`;
      ctx.textBaseline = 'middle';
      const wmW = ctx.measureText(brandKit.watermarkText).width;
      ctx.fillText(brandKit.watermarkText, W - wmW - padX, H - footerAreaH - Math.round(14 * scale));
      ctx.restore();
    }

    // 5. Journalistic Footer Bar with Top Hairline Divider
    if (poster.showFooter) {
      const dividerY = H - Math.round(82 * scale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(padX, dividerY, W - padX * 2, Math.max(1, Math.round(1.5 * scale)));

      drawPemdesMinimalIcons(
        ctx,
        padX,
        H - Math.round(42 * scale),
        W - padX,
        scale,
        brandKit.websiteUrl || 'www.tobadak.desa.id',
        brandKit.socialHandle || 'Pemdes Tobadak',
        font,
        accent,
        secondary
      );
    }
    return;
  }

  // ============================================================================
  // SPECIAL LAYOUTS: KEMENDESA PDTT STYLE (Siaran Pers, Kutipan Tokoh, Info Program)
  // ============================================================================
  if (
    layout === 'kemendesa-siaran' ||
    layout === 'kemendesa-quote' ||
    layout === 'kemendesa-info'
  ) {
    const padX = Math.round(52 * scale);
    const footerH = poster.showFooter ? Math.round(92 * scale) : 0;

    if (layout === 'kemendesa-siaran') {
      // 1. White graph-paper grid base
      drawGraphPaperGrid(ctx, 0, 0, W, H, scale);

      // 2. Upper photo area (~64% height) with soft white fade into grid
      const photoH = Math.round(H * 0.66);
      if (photoImg) {
        drawCoverImage(ctx, photoImg, 0, 0, W, photoH);
      } else {
        drawJournalisticBackdrop(ctx, W, photoH, primary, secondary);
      }

      const topFade = ctx.createLinearGradient(0, 0, 0, Math.round(140 * scale));
      topFade.addColorStop(0, 'rgba(15, 24, 71, 0.48)');
      topFade.addColorStop(1, 'rgba(15, 24, 71, 0)');
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, W, Math.round(140 * scale));

      const bottomFade = ctx.createLinearGradient(0, photoH * 0.56, 0, photoH);
      bottomFade.addColorStop(0, 'rgba(248, 250, 252, 0)');
      bottomFade.addColorStop(0.75, 'rgba(248, 250, 252, 0.85)');
      bottomFade.addColorStop(1, '#f8fafc');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, photoH * 0.56, W, photoH * 0.44);

      if (poster.showHeader) {
        drawKemendesaTopLogos(
          ctx,
          W,
          padX,
          scale,
          villageLogoImg,
          regencyLogoImg,
          accent,
          '#BANGUN TOBADAK, BANGUN INDONESIA'
        );
      }

      // 3. Two-tone pill badge (e.g., SIARAN | PERS or KABAR | DESA)
      const badgeRaw = (poster.badgeText || 'SIARAN PERS').toUpperCase().trim();
      const parts = badgeRaw.split(/\s+/);
      const leftWord = parts[0] || 'SIARAN';
      const rightWord = parts.slice(1).join(' ') || 'DESA';

      ctx.font = `800 ${Math.round(23 * scale)}px "${font}", sans-serif`;
      const lw = ctx.measureText(leftWord).width + Math.round(42 * scale);
      const rw = ctx.measureText(rightWord).width + Math.round(42 * scale);
      const pillW = lw + rw;
      const pillH = Math.round(48 * scale);
      const pillX = (W - pillW) / 2;
      const pillY = Math.round(H * 0.54);

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 4 * scale;

      ctx.fillStyle = primary;
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(pillX + lw, pillY + 2, rw - 2, pillH - 4, [0, pillH / 2, pillH / 2, 0]);
      ctx.fill();
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(leftWord, pillX + lw / 2, pillY + pillH / 2 + 1);
      ctx.fillStyle = primary;
      ctx.fillText(rightWord, pillX + lw + rw / 2, pillY + pillH / 2 + 1);

      // 4. Bold uppercase navy headline on crisp white pill strips
      const titleFontSize = Math.round((isLandscape ? 36 : 44) * scale);
      ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
      const titleLines = wrapText(ctx, (poster.title || 'Judul Berita').toUpperCase(), W - padX * 2.3).slice(0, 3);
      let lineY = pillY + pillH + Math.round(26 * scale);
      const stripH = Math.round(titleFontSize * 1.36);

      for (const line of titleLines) {
        const lineW = ctx.measureText(line).width + Math.round(44 * scale);
        const sx = (W - lineW) / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 4 * scale;
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, sx, lineY, lineW, stripH, 10 * scale);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = primary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line, W / 2, lineY + stripH / 2 + 1);
        lineY += stripH + Math.round(12 * scale);
      }
    } else if (layout === 'kemendesa-quote') {
      // 1. Clean white graph-paper grid background
      drawGraphPaperGrid(ctx, 0, 0, W, H, scale);

      if (poster.showHeader) {
        drawKemendesaTopLogos(
          ctx,
          W,
          padX,
          scale,
          villageLogoImg,
          regencyLogoImg,
          accent,
          '#DESA TOBADAK'
        );
      }

      // 2. Centered circular/rounded portrait of Kepala Desa / Tokoh
      const portraitSize = Math.round((isLandscape ? 220 : 320) * scale);
      const px = (W - portraitSize) / 2;
      const py = Math.round((isLandscape ? 110 : 145) * scale);

      ctx.save();
      ctx.shadowColor = 'rgba(27, 42, 120, 0.22)';
      ctx.shadowBlur = 24 * scale;
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(px + portraitSize / 2, py + portraitSize / 2, portraitSize / 2 + 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(px + portraitSize / 2, py + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (photoImg) {
        drawCoverImage(ctx, photoImg, px, py, portraitSize, portraitSize);
      } else {
        drawJournalisticBackdrop(ctx, portraitSize, portraitSize, primary, secondary);
      }
      ctx.restore();

      // 3. Oversized decorative quote mark
      const quoteTop = py + portraitSize + Math.round(36 * scale);
      ctx.fillStyle = accent;
      ctx.font = `800 ${Math.round(88 * scale)}px "Merriweather", serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('“', padX, quoteTop - Math.round(18 * scale));

      // 4. Bold navy quote headline + subtitle
      const quoteFontSize = Math.round((isLandscape ? 32 : 40) * scale);
      ctx.font = `800 ${quoteFontSize}px "${font}", sans-serif`;
      const qLines = wrapText(ctx, poster.title || 'Kutipan Resmi', W - padX * 2.4).slice(0, 4);
      let qy = quoteTop + Math.round(28 * scale);
      ctx.fillStyle = primary;
      ctx.textAlign = 'center';
      for (const line of qLines) {
        ctx.fillText(line, W / 2, qy);
        qy += Math.round(quoteFontSize * 1.28);
      }

      if (poster.subtitle) {
        ctx.font = `600 ${Math.round(22 * scale)}px "${font}", sans-serif`;
        ctx.fillStyle = '#475569';
        const sLines = wrapText(ctx, poster.subtitle, W - padX * 2.5).slice(0, 2);
        qy += Math.round(12 * scale);
        for (const sl of sLines) {
          ctx.fillText(sl, W / 2, qy);
          qy += Math.round(30 * scale);
        }
      }
    } else {
      // kemendesa-info: Navy top header + white grid body with framed photo & info card
      drawGraphPaperGrid(ctx, 0, 0, W, H, scale);

      const topBarH = Math.round(132 * scale);
      const topGrad = ctx.createLinearGradient(0, 0, W, 0);
      topGrad.addColorStop(0, primary);
      topGrad.addColorStop(1, secondary);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, topBarH);

      if (poster.showHeader) {
        drawKemendesaTopLogos(
          ctx,
          W,
          padX,
          scale,
          villageLogoImg,
          regencyLogoImg,
          accent,
          poster.badgeText || 'INFO DESA'
        );
      }

      // Photo card in upper-middle
      const cardY = topBarH + Math.round(28 * scale);
      const cardW = W - padX * 2;
      const cardH = Math.round((H - topBarH - footerH) * 0.48);

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
      ctx.shadowBlur = 20 * scale;
      ctx.beginPath();
      ctx.roundRect(padX, cardY, cardW, cardH, 20 * scale);
      ctx.clip();
      if (photoImg) {
        drawCoverImage(ctx, photoImg, padX, cardY, cardW, cardH);
      } else {
        drawJournalisticBackdrop(ctx, cardW, cardH, primary, secondary);
      }
      ctx.restore();

      // Info block below photo
      let textY = cardY + cardH + Math.round(30 * scale);
      const titleFontSize = Math.round((isLandscape ? 32 : 40) * scale);
      ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
      ctx.fillStyle = primary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const tLines = wrapText(ctx, poster.title || 'Informasi Program Desa', cardW).slice(0, 3);
      for (const line of tLines) {
        ctx.fillText(line, padX, textY);
        textY += Math.round(titleFontSize * 1.24);
      }

      if (poster.subtitle) {
        textY += Math.round(12 * scale);
        ctx.fillStyle = accent;
        drawRoundedRect(ctx, padX, textY, Math.round(6 * scale), Math.round(64 * scale), 3 * scale);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.font = `500 ${Math.round(23 * scale)}px "${font}", sans-serif`;
        const sLines = wrapText(ctx, poster.subtitle, cardW - Math.round(24 * scale)).slice(0, 3);
        for (const sl of sLines) {
          ctx.fillText(sl, padX + Math.round(22 * scale), textY);
          textY += Math.round(31 * scale);
        }
      }
    }

    if (poster.showFooter) {
      drawKemendesaFooterBar(ctx, W, H, padX, scale, primary, secondary, accent, brandKit, font);
    }
    return;
  }

  // 1. Background
  ctx.fillStyle = layout === 'editorial-card' ? brandKit.colors.background : '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Header & Footer heights
  const headerH = poster.showHeader ? Math.round(128 * scale) : 0;
  const footerH = poster.showFooter ? Math.round(86 * scale) : 0;
  const contentTop = headerH;
  const contentH = H - headerH - footerH;

  // 2. Photo / Main Visual Area by layout
  if (layout === 'full-bleed' || layout === 'banner-official') {
    if (photoImg) {
      drawCoverImage(ctx, photoImg, 0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Dark gradient overlay for readability
    const alpha = Math.max(0.25, Math.min(0.95, poster.overlayOpacity));
    const grad = ctx.createLinearGradient(0, H * 0.25, 0, H);
    grad.addColorStop(0, `rgba(15, 23, 42, ${alpha * 0.25})`);
    grad.addColorStop(0.55, `rgba(15, 23, 42, ${alpha * 0.72})`);
    grad.addColorStop(1, `rgba(15, 23, 42, ${Math.min(0.96, alpha + 0.12)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (layout === 'split-frame') {
    ctx.fillStyle = primary;
    ctx.fillRect(0, contentTop, W, contentH);

    const pad = Math.round(48 * scale);
    if (isLandscape) {
      const photoW = Math.round(W * 0.46);
      if (photoImg) {
        ctx.save();
        drawRoundedRect(ctx, pad, contentTop + pad * 0.6, photoW - pad, contentH - pad * 1.2, 24 * scale);
        ctx.clip();
        drawCoverImage(ctx, photoImg, pad, contentTop + pad * 0.6, photoW - pad, contentH - pad * 1.2);
        ctx.restore();
      }
    } else {
      const photoH = Math.round(contentH * 0.54);
      if (photoImg) {
        ctx.save();
        drawRoundedRect(ctx, pad, contentTop + pad * 0.6, W - pad * 2, photoH, 28 * scale);
        ctx.clip();
        drawCoverImage(ctx, photoImg, pad, contentTop + pad * 0.6, W - pad * 2, photoH);
        ctx.restore();
      } else {
        ctx.fillStyle = secondary;
        drawRoundedRect(ctx, pad, contentTop + pad * 0.6, W - pad * 2, photoH, 28 * scale);
        ctx.fill();
      }
    }
  } else if (layout === 'editorial-card') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, contentTop, W, contentH);
    const pad = Math.round(52 * scale);
    const photoH = isLandscape ? contentH - pad : Math.round(contentH * 0.48);
    const photoW = isLandscape ? Math.round(W * 0.44) : W - pad * 2;

    if (photoImg) {
      ctx.save();
      drawRoundedRect(ctx, pad, contentTop + pad * 0.5, photoW, photoH, 24 * scale);
      ctx.clip();
      drawCoverImage(ctx, photoImg, pad, contentTop + pad * 0.5, photoW, photoH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#e2e8f0';
      drawRoundedRect(ctx, pad, contentTop + pad * 0.5, photoW, photoH, 24 * scale);
      ctx.fill();
    }
  } else {
    // Default: photo-top
    const photoH = isLandscape ? contentH : Math.round(contentH * 0.6);
    if (photoImg) {
      drawCoverImage(ctx, photoImg, 0, contentTop, W, photoH);
    } else {
      const grad = ctx.createLinearGradient(0, contentTop, W, contentTop + photoH);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, contentTop, W, photoH);
    }

    const grad = ctx.createLinearGradient(0, contentTop + photoH * 0.45, 0, contentTop + contentH);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    grad.addColorStop(0.55, `rgba(15, 23, 42, ${poster.overlayOpacity})`);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, contentTop, W, contentH);
  }

  // 3. Header Branding Bar
  if (poster.showHeader) {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, W, headerH);

    // Accent bottom border of header
    ctx.fillStyle = accent;
    ctx.fillRect(0, headerH - Math.round(6 * scale), W, Math.round(6 * scale));

    const logoSize = Math.round(78 * scale);
    const padX = Math.round(44 * scale);
    const logoY = Math.round((headerH - logoSize) / 2);

    let textStartX = padX;
    if (regencyLogoImg) {
      drawContainLogo(ctx, regencyLogoImg, padX, logoY, logoSize);
    } else {
      drawDefaultEmblemLogo(ctx, padX, logoY, logoSize, 'regency', accent);
    }
    textStartX += logoSize + Math.round(16 * scale);

    if (villageLogoImg) {
      drawContainLogo(ctx, villageLogoImg, textStartX, logoY, logoSize);
    } else {
      drawDefaultEmblemLogo(ctx, textStartX, logoY, logoSize, 'village', accent);
    }
    textStartX += logoSize + Math.round(20 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(32 * scale)}px "${font}", sans-serif`;
    ctx.fillText(brandKit.villageName.toUpperCase(), textStartX, headerH * 0.36);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `600 ${Math.round(22 * scale)}px "${font}", sans-serif`;
    const subHeader = [brandKit.districtName, brandKit.regencyName].filter(Boolean).join(' • ');
    ctx.fillText(subHeader || brandKit.headerText, textStartX, headerH * 0.7);
  }

  // 4. Text Block (Badge, Title, Subtitle, Date)
  const padX = Math.round(54 * scale);
  let textAreaX = padX;
  let textAreaW = W - padX * 2;
  let textAnchorBottom = H - footerH - Math.round(48 * scale);

  if ((layout === 'editorial-card' || layout === 'split-frame') && isLandscape) {
    textAreaX = Math.round(W * 0.49);
    textAreaW = W - textAreaX - padX;
  }

  const isLightBg = layout === 'editorial-card';
  const titleColor = isLightBg ? brandKit.colors.textDark : '#ffffff';
  const subColor = isLightBg ? '#334155' : 'rgba(241, 245, 249, 0.94)';

  const titleFontSize = Math.round((isLandscape ? 48 : 60) * scale);
  const subFontSize = Math.round((isLandscape ? 26 : 31) * scale);

  ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
  const titleLines = wrapText(ctx, poster.title || 'Judul Konten Desa', textAreaW).slice(0, 4);

  ctx.font = `500 ${subFontSize}px "${font}", sans-serif`;
  const subLines = wrapText(ctx, poster.subtitle || '', textAreaW).slice(0, 3);

  const titleLineH = Math.round(titleFontSize * 1.18);
  const subLineH = Math.round(subFontSize * 1.35);
  const badgeH = Math.round(44 * scale);
  const totalBlockH =
    badgeH +
    Math.round(22 * scale) +
    titleLines.length * titleLineH +
    Math.round(16 * scale) +
    subLines.length * subLineH;

  let cursorY = textAnchorBottom - totalBlockH;
  if (cursorY < contentTop + Math.round(32 * scale)) {
    cursorY = contentTop + Math.round(32 * scale);
  }

  // Badge + Date
  if (poster.badgeText) {
    ctx.font = `800 ${Math.round(23 * scale)}px "${font}", sans-serif`;
    const badgeW = ctx.measureText(poster.badgeText.toUpperCase()).width + Math.round(40 * scale);
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, textAreaX, cursorY, badgeW, badgeH, 10 * scale);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      poster.badgeText.toUpperCase(),
      textAreaX + Math.round(20 * scale),
      cursorY + badgeH / 2
    );

    if (poster.dateLabel) {
      ctx.fillStyle = isLightBg ? '#475569' : 'rgba(255,255,255,0.9)';
      ctx.font = `600 ${Math.round(22 * scale)}px "${font}", sans-serif`;
      ctx.fillText(
        poster.dateLabel,
        textAreaX + badgeW + Math.round(20 * scale),
        cursorY + badgeH / 2
      );
    }
    cursorY += badgeH + Math.round(24 * scale);
  }

  // Title
  ctx.fillStyle = titleColor;
  ctx.textBaseline = 'top';
  ctx.font = `800 ${titleFontSize}px "${font}", sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, textAreaX, cursorY);
    cursorY += titleLineH;
  }

  cursorY += Math.round(14 * scale);

  // Subtitle
  ctx.fillStyle = subColor;
  ctx.font = `500 ${subFontSize}px "${font}", sans-serif`;
  for (const line of subLines) {
    ctx.fillText(line, textAreaX, cursorY);
    cursorY += subLineH;
  }

  // 5. Watermark
  if (poster.showWatermark && brandKit.watermarkText) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(0.6, brandKit.watermarkOpacity || 0.18));
    ctx.fillStyle = isLightBg ? '#0f172a' : '#ffffff';
    ctx.font = `700 ${Math.round(22 * scale)}px "${font}", sans-serif`;
    ctx.textBaseline = 'middle';

    const wmText = brandKit.watermarkText;
    const wmWidth = ctx.measureText(wmText).width;
    const margin = Math.round(32 * scale);

    if (brandKit.watermarkPosition === 'center') {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-Math.PI / 10);
      ctx.textAlign = 'center';
      ctx.fillText(wmText, 0, 0);
    } else if (brandKit.watermarkPosition === 'bottom-left') {
      ctx.fillText(wmText, margin, H - footerH - margin);
    } else if (brandKit.watermarkPosition === 'top-right') {
      ctx.fillText(wmText, W - wmWidth - margin, headerH + margin);
    } else {
      ctx.fillText(wmText, W - wmWidth - margin, H - footerH - margin);
    }
    ctx.restore();
  }

  // 6. Footer Branding Bar (Seragam untuk semua template master)
  if (poster.showFooter) {
    const footerY = H - footerH;
    ctx.fillStyle = secondary;
    ctx.fillRect(0, footerY, W, footerH);

    const padFooterX = Math.round(44 * scale);
    drawPemdesMinimalIcons(
      ctx,
      padFooterX,
      footerY + footerH / 2,
      W - padFooterX,
      scale,
      brandKit.websiteUrl || 'www.tobadak.desa.id',
      brandKit.socialHandle || 'Pemdes Tobadak',
      font,
      accent,
      secondary
    );
  }
}
