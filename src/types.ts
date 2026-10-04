export type Genre = {
  id: number;
  slug: string;
  name?: string;
  name_dv: string;
};

export type Book = {
  author_id: number;
  author_name: string | null;
  can_listen: boolean;
  can_preview: boolean;
  can_print: boolean;
  classification: string | null;
  collection: null | string;
  collection_id: null | number;
  collection_name: null | string;
  created_at: string;
  excerpt: string | null;
  excerpt_dv: string | null;
  genres?: Genre[];
  has_audio: boolean;
  id: number;
  is_printable: boolean;
  isbn: string | null;
  language: string;
  name: string;
  name_dv: string;
  pages_count: number | null;
  preview_link: string;
  price: string;
  published_at: string | null;
  published_month_name: string | null;
  purchase_id: string | null;
  slug: string;
  status: string;
  thumb: string;
  type: string;
  updated_at: string;
  uuid: string;
};

export type Slide = {
  id: number;
  name: string;
  url: string | null;
  slide_image_url: string;
};

export type Author = {
  id: number;
  slug: string;
  name: string;
  name_en?: string;
  avatar: string;
  bio?: string | null;
  preview_link?: string;
  socials?: Record<string, string | null> | null;
};

export type Magazine = {
  id: number;
  slug: string;
  name_dv: string;
  books: Book[];
};

export type Paginated<T> = {
  data: T[];
  next_page_url: string | null;
  current_page?: number;
  last_page?: number;
  total?: number;
};

export type Customer = {
  id: number;
  name?: string;
  name_dv?: string;
  email?: string;
  avatar?: string;
};

export type Chapter = {
  id: number;
  uuid: string;
  book_uuid: string;
  name_dv: string;
  name_en?: string;
  title_dv?: string;
  title_en?: string;
  artist_dv?: string;
  artist_en?: string;
  cover: string;
  duration: number;
  can_listen: boolean;
};

export type CmsPage = {
  title: string;
  slug: string;
  content_blocks?: { type: string; data: any }[];
};
