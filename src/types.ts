export type PlatformId = 'ig_feed' | 'ig_square' | 'ig_story' | 'fb_post';

export interface PlatformPreset {
  id: PlatformId;
  label: string;
  width: number;
  height: number;
  aspectLabel: string;
}

export const PLATFORM_PRESETS: Record<PlatformId, PlatformPreset> = {
  ig_feed: {
    id: 'ig_feed',
    label: 'Instagram Feed (4:5)',
    width: 1080,
    height: 1350,
    aspectLabel: '1080 × 1350 px',
  },
  ig_square: {
    id: 'ig_square',
    label: 'Instagram Square (1:1)',
    width: 1080,
    height: 1080,
    aspectLabel: '1080 × 1080 px',
  },
  ig_story: {
    id: 'ig_story',
    label: 'Reels / Story Cover (9:16)',
    width: 1080,
    height: 1920,
    aspectLabel: '1080 × 1920 px',
  },
  fb_post: {
    id: 'fb_post',
    label: 'Facebook Post (Landscape)',
    width: 1200,
    height: 630,
    aspectLabel: '1200 × 630 px',
  },
};

export interface BrandKit {
  villageName: string;
  districtName: string;
  regencyName: string;
  villageLogo: string;
  regencyLogo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    textLight: string;
    textDark: string;
  };
  fontFamily: string;
  headerText: string;
  footerText: string;
  websiteUrl?: string;
  socialHandle?: string;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'center';
  defaultTemplateId: string;
}

export interface AppSettings {
  operatorName: string;
  operatorRole: string;
  aiProvider: 'auto' | 'gemini' | 'openai';
  geminiApiKey: string;
  openaiApiKey: string;
  defaultPlatform: PlatformId;
  sessionTtlMinutes: number;
}

export interface MasterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  layout: 'pemdes-overlay' | 'photo-top' | 'banner-official' | 'full-bleed' | 'split-frame' | 'editorial-card';
  showHeader: boolean;
  showFooter: boolean;
  showWatermark: boolean;
  overlayStyle: 'gradient-bottom' | 'solid-card' | 'accent-frame' | 'clean-light';
  badgeText: string;
}

export interface CrawledArticle {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  excerpt: string;
  content: string;
  sourceUrl: string;
}

export interface ReelsSlideConcept {
  headline: string;
  subtitle: string;
  durationSec: number;
}

export interface AiGeneratedContent {
  provider?: string;
  posterTitle: string;
  posterSubtitle: string;
  newsSummary: string;
  captionInstagram: string;
  captionFacebook: string;
  hashtags: string;
  photoCaption: string;
  reelsConcept: {
    hook: string;
    durationSec: number;
    slides: ReelsSlideConcept[];
    outroCta: string;
  };
}

export interface PosterState {
  platform: PlatformId;
  templateId: string;
  badgeText: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  photoUrl: string;
  fontFamily: string;
  primaryColor: string;
  accentColor: string;
  overlayOpacity: number;
  showHeader: boolean;
  showFooter: boolean;
  showWatermark: boolean;
}

export interface ReelsMediaSlide {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  headline: string;
  subtitle: string;
  durationSec: number;
}

export interface ReelsState {
  templateStyle: 'berita-cepat' | 'sorotan-kegiatan' | 'pengumuman-singkat';
  showIntro: boolean;
  showOutro: boolean;
  introHook: string;
  outroCta: string;
  slides: ReelsMediaSlide[];
}

export type StudioStep = 'source' | 'design' | 'reels' | 'export';
export type ContentGoal = 'poster' | 'reels' | 'paket';
