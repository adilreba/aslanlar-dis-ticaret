export type IconName = "home" | "energy" | "car" | "ship" | "plane" | "chip";

export interface GalleryImage {
  id: string;
  image: string;
  caption: string;
  order: number;
}

export interface Sector {
  id: string;
  title: string;
  summary: string;
  body: string;
  icon: IconName;
  image: string;
  highlight: boolean;
  visible: boolean;
  order: number;
  gallery: GalleryImage[];
}

export interface Feature {
  id: string;
  title: string;
  text: string;
  order: number;
}

export interface Shot {
  id: string;
  image: string;
  caption: string;
  visible: boolean;
  order: number;
}

export interface CheckItem {
  id: string;
  label: string;
  order: number;
}

export interface Article {
  id: string;
  title: string;
  body: string;
  image: string;
  visible: boolean;
  order: number;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

export interface SiteContent {
  hero: {
    eyebrow: string;
    title: string;
    text: string;
    image: string;
  };
  sectors: Sector[];
  quality: {
    kicker: string;
    title: string;
    text: string;
    image: string;
    features: Feature[];
  };
  portfolio: Shot[];
  expertise: {
    title: string;
    text: string;
    image: string;
    items: CheckItem[];
  };
  about: {
    eyebrow: string;
    title: string;
    lead: string;
    image: string;
    heading: string;
    body: string;
    goalsTitle: string;
    visionTitle: string;
    vision: string;
    missionTitle: string;
    mission: string;
  };
  articles: Article[];
  contact: {
    eyebrow: string;
    title: string;
    text: string;
    image: string;
    email: string;
    address: string;
    formTitle: string;
    formText: string;
  };
  footer: {
    blurb: string;
    vision: string;
    mission: string;
    reach: string;
  };
  legal: {
    cookies: string;
    privacy: string;
  };
}
