export type Platform = 'instagram' | 'tiktok'
export type PostType = 'reel' | 'image' | 'carousel' | 'tiktok_video' | 'story'

export interface Project {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Account {
  id: string
  project_id: string
  platform: Platform
  platform_user_id: string
  username: string
  avatar_url?: string
  access_token: string
  token_expires_at?: string
  refresh_token?: string
  followers_count: number
  last_synced_at?: string
  created_at: string
  // Joined
  project?: Project
}

export interface Post {
  id: string
  account_id: string
  platform_post_id: string
  platform: Platform
  post_type: PostType
  caption?: string
  thumbnail_url?: string
  permalink?: string
  published_at?: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  saves_count: number
  reach_count: number
  impressions_count: number
  tags: string[]
  notes?: string
  last_synced_at?: string
  created_at: string
  // Joined
  account?: Account
}

export interface MetricsSnapshot {
  id: string
  post_id: string
  snapshot_at: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  saves_count: number
  reach_count: number
}

export interface TriggerWord {
  id: string
  project_id: string
  word: string
  color: string
  created_at: string
}

// Instagram API types
export interface IGMediaInsight {
  id: string
  name: string
  period: string
  values: { value: number; end_time: string }[]
  title: string
  description: string
}

export interface IGMedia {
  id: string
  caption?: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

// TikTok API types
export interface TikTokVideo {
  id: string
  title: string
  video_description: string
  cover_image_url: string
  share_url: string
  create_time: number
  duration: number
  like_count: number
  comment_count: number
  share_count: number
  view_count: number
}

export interface SyncResult {
  account_id: string
  username: string
  platform: Platform
  posts_synced: number
  errors: string[]
}
