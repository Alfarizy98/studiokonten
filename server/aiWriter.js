function buildPromptPayload(input) {
  const {
    title = '',
    content = '',
    date = '',
    villageName = 'Pemerintah Desa',
    regencyName = '',
    tone = 'informatif-ramah',
    contentType = 'berita',
    leaderName = '',
  } = input;

  const isGreeting = contentType === 'ucapan-hari-besar';
  const roleInstruction = isGreeting
    ? `Anda adalah asisten kreatif humas untuk ${villageName}${regencyName ? ` (${regencyName})` : ''}.
Buatlah konten UCAPAN RESMI PERINGATAN HARI BESAR / HARI RAYA yang akan dipasangkan dengan FOTO UTAMA ${leaderName || 'Kepala Desa'} pada poster dan media sosial desa.
Gunakan gaya bahasa Indonesia yang ${tone}, hangat, penuh hormat, dan menginspirasi warga desa.`
    : `Anda adalah asisten kreatif media sosial dan humas untuk ${villageName}${regencyName ? ` (${regencyName})` : ''}.
Buatlah paket konten siap posting dari materi berikut dengan gaya bahasa Indonesia yang ${tone}, jelas, dan menarik untuk warga desa.`;

  const extraFields = isGreeting
    ? `\nTokoh / Foto Utama: ${leaderName || `Kepala Desa (${villageName})`}\nPeringatan / Hari Besar: ${title}`
    : `\nJudul Sumber: ${title}`;

  return `${roleInstruction}

Jenis Konten: ${contentType}${extraFields}
Tanggal: ${date}
${isGreeting ? 'Pesan / Tema Khusus:' : 'Isi Materi:'}
${content}

Kembalikan HANYA JSON valid (tanpa markdown code fence) dengan struktur persis berikut:
{
  "posterTitle": "${isGreeting ? 'Judul ucapan singkat maksimal 8 kata (misal: Selamat Hari Guru Nasional 2026)' : 'Judul poster singkat maksimal 9 kata, huruf jelas dan menarik'}",
  "posterSubtitle": "${isGreeting ? 'Pesan/doa singkat 1 kalimat maksimal 14 kata atas nama Kepala Desa & Pemerintah Desa' : 'Subjudul singkat 1 kalimat maksimal 14 kata'}",
  "newsSummary": "${isGreeting ? 'Paragraf ucapan resmi 2-3 kalimat hangat dari Kepala Desa dan jajaran Pemerintah Desa' : 'Ringkasan berita 2-3 kalimat padat dan informatif'}",
  "captionInstagram": "Caption Instagram lengkap dengan hook pembuka, poin penting, ajakan interaksi/CTA, dan spasi rapi",
  "captionFacebook": "Caption Facebook yang lebih informatif dan komunikatif untuk warga desa",
  "hashtags": "#DesaMaju #InfoDesa ... (6-10 hashtag relevan)",
  "photoCaption": "Keterangan foto singkat untuk dokumentasi / alt text",
  "reelsConcept": {
    "hook": "Kalimat pembuka 3 detik pertama untuk Reels",
    "durationSec": 15,
    "slides": [
      { "headline": "Teks utama slide 1", "subtitle": "Subtitle singkat slide 1", "durationSec": 4 },
      { "headline": "Teks utama slide 2", "subtitle": "Subtitle singkat slide 2", "durationSec": 4 },
      { "headline": "Teks utama slide 3", "subtitle": "Subtitle singkat slide 3", "durationSec": 4 }
    ],
    "outroCta": "Ajakan penutup (misal: Bagikan info ini ke warga sekitar!)"
  }
}`;
}

async function generateWithGemini(apiKey, input) {
  const prompt = buildPromptPayload(input);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Respons Gemini kosong.');
  return JSON.parse(rawText);
}

async function generateWithOpenAI(apiKey, input) {
  const prompt = buildPromptPayload(input);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Anda menghasilkan JSON valid untuk konten media sosial pemerintah desa.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Respons OpenAI kosong.');
  return JSON.parse(rawText);
}

function generateGreetingFallback(input) {
  const occasion = (input.title || 'Hari Besar Nasional').trim();
  const rawMessage = (input.content || '').replace(/\s+/g, ' ').trim();
  const villageName = (input.villageName || 'Pemerintah Desa').trim();
  const shortVillage = villageName.replace(/^Pemerintah\s+/i, '');
  const villageTag = shortVillage.replace(/[^a-zA-Z0-9]/g, '');
  const leaderName = (input.leaderName || `Kepala ${shortVillage}`).trim();
  const occasionTag = occasion
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  const hasSelamat = /^selamat\b/i.test(occasion);
  const posterTitle = hasSelamat ? occasion : `Selamat ${occasion}`;
  const defaultWish = `Semoga momentum ${occasion} membawa kedamaian, kebersamaan, dan semangat membangun ${shortVillage}.`;
  const customOrWish = rawMessage || defaultWish;

  const posterSubtitle =
    customOrWish.length <= 105
      ? customOrWish
      : `${leaderName} beserta seluruh jajaran ${villageName} mengucapkan ${posterTitle}.`;

  const newsSummary = `${leaderName} beserta seluruh perangkat dan keluarga besar ${villageName} mengucapkan ${posterTitle}. ${customOrWish}`;

  const hashtags = [
    `#${occasionTag || 'HariBesar'}`,
    `#${villageTag || 'DesaMaju'}`,
    '#PemdesTobadak',
    '#UcapanResmi',
    '#SalamDesa',
    '#DesaDamai',
    '#DesaMaju',
  ].join(' ');

  const captionInstagram = [
    `✨ ${posterTitle.toUpperCase()} ✨`,
    '',
    `${leaderName} beserta seluruh jajaran ${villageName} mengucapkan ${posterTitle}.`,
    '',
    customOrWish,
    '',
    `Mari terus menjaga persatuan, toleransi, dan semangat gotong royong di ${shortVillage}.`,
    '',
    hashtags,
  ].join('\n');

  const captionFacebook = [
    `${posterTitle} — ${villageName}`,
    '',
    `Atas nama ${leaderName} dan seluruh perangkat ${villageName}, kami mengucapkan ${posterTitle} kepada seluruh masyarakat.`,
    '',
    customOrWish,
    '',
    'Semoga kebersamaan dan keharmonisan selalu terjaga di tengah warga desa kita.',
    '',
    hashtags,
  ].join('\n');

  const photoCaption = `${posterTitle} — ${leaderName} (${villageName}).`;

  const reelsConcept = {
    hook: `${posterTitle} dari ${villageName}!`,
    durationSec: 15,
    slides: [
      {
        headline: posterTitle,
        subtitle: `${leaderName} • ${villageName}`,
        durationSec: 4,
      },
      {
        headline: 'Pesan & Harapan',
        subtitle: customOrWish.slice(0, 95),
        durationSec: 5,
      },
      {
        headline: `Salam Hangat ${shortVillage}`,
        subtitle: 'Mari terus jaga kebersamaan & gotong royong warga desa.',
        durationSec: 4,
      },
    ],
    outroCta: `Bagikan ucapan ini kepada keluarga & warga ${shortVillage}!`,
  };

  return {
    posterTitle,
    posterSubtitle,
    newsSummary,
    captionInstagram,
    captionFacebook,
    hashtags,
    photoCaption,
    reelsConcept,
  };
}

function generateSmartLocalFallback(input) {
  if (input.contentType === 'ucapan-hari-besar') {
    return generateGreetingFallback(input);
  }
  const title = (input.title || 'Informasi Kegiatan Desa').trim();
  const rawContent = (input.content || title).replace(/\s+/g, ' ').trim();
  const villageName = (input.villageName || 'Pemerintah Desa').trim();
  const shortVillage = villageName.replace(/^Pemerintah\s+/i, '');
  const villageTag = shortVillage.replace(/[^a-zA-Z0-9]/g, '');

  const sentences = rawContent
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const summarySentences = sentences.slice(0, 3);
  const newsSummary =
    summarySentences.length > 0
      ? summarySentences.join(' ')
      : `${title}. Informasi resmi dari ${villageName} untuk seluruh warga masyarakat.`;

  const words = title.split(/\s+/);
  const posterTitle =
    words.length > 9 ? `${words.slice(0, 9).join(' ')}...` : title;

  const posterSubtitle =
    sentences[0] && sentences[0].length <= 95
      ? sentences[0]
      : `Informasi resmi ${shortVillage} untuk seluruh warga masyarakat.`;

  const hashtags = [
    `#${villageTag || 'DesaMaju'}`,
    '#InfoDesa',
    '#KabarDesa',
    '#PemerintahDesa',
    '#WargaDesa',
    '#DesaDigital',
    '#LayananPublik',
  ].join(' ');

  const captionInstagram = [
    `📢 ${title.toUpperCase()}`,
    '',
    newsSummary,
    '',
    `Mari bersama-sama mendukung dan menyebarkan informasi resmi dari ${villageName}.`,
    '',
    '💬 Ada pertanyaan? Tulis di kolom komentar atau kunjungi kantor desa pada jam kerja.',
    '',
    hashtags,
  ].join('\n');

  const captionFacebook = [
    `[INFO ${shortVillage.toUpperCase()}] ${title}`,
    '',
    newsSummary,
    sentences[3] ? `\n${sentences[3]}` : '',
    '',
    `Demikian informasi ini disampaikan oleh ${villageName}. Silakan bagikan postingan ini agar semakin banyak warga yang mengetahui.`,
    '',
    hashtags,
  ]
    .filter(Boolean)
    .join('\n');

  const photoCaption = `Dokumentasi: ${title} — ${villageName}.`;

  const reelsConcept = {
    hook: `Warga ${shortVillage}, sudah tahu info terbaru ini?`,
    durationSec: 15,
    slides: [
      {
        headline: posterTitle,
        subtitle: `Update resmi dari ${shortVillage}`,
        durationSec: 4,
      },
      {
        headline: 'Ringkasan Informasi',
        subtitle: (sentences[0] || newsSummary).slice(0, 90),
        durationSec: 5,
      },
      {
        headline: 'Catat & Bagikan!',
        subtitle: (sentences[1] || `Info lengkap hubungi ${shortVillage}`).slice(0, 90),
        durationSec: 4,
      },
    ],
    outroCta: `Ikuti terus info resmi ${shortVillage}!`,
  };

  return {
    posterTitle,
    posterSubtitle,
    newsSummary,
    captionInstagram,
    captionFacebook,
    hashtags,
    photoCaption,
    reelsConcept,
  };
}

export async function generateAiContent(input, settings = {}) {
  const geminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const openaiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || '';
  const provider = settings.aiProvider || 'auto';

  if ((provider === 'gemini' || provider === 'auto') && geminiKey) {
    const result = await generateWithGemini(geminiKey, input);
    return { provider: 'Gemini AI', ...result };
  }

  if ((provider === 'openai' || provider === 'auto') && openaiKey) {
    const result = await generateWithOpenAI(openaiKey, input);
    return { provider: 'OpenAI', ...result };
  }

  const fallback = generateSmartLocalFallback(input);
  return { provider: 'Smart Local Generator (Offline)', ...fallback };
}
