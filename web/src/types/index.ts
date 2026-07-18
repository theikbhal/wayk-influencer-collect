export type AccountSource = 'manual' | 'follower' | 'suggested' | 'seed' | 'extension'
export type FollowStatus = 'pending_review' | 'approved' | 'followed' | 'skipped' | 'unfollowed'

export interface IGAccount {
  id: string
  username: string
  display_name?: string
  followers: number
  following: number
  posts_count: number
  bio?: string
  profile_url?: string
  notes?: string
  tags: string[]
  source: AccountSource
  collected_at: string
  target_id?: string
  follow_status: FollowStatus
  reviewed_at?: string
  followed_at?: string
}

export interface TargetAccount {
  id: string
  username: string
  display_name?: string
  followers_count: number
  following_count: number
  posts_count: number
  bio?: string
  profile_pic_url?: string
  full_name?: string
  is_verified?: boolean
  is_private?: boolean
  notes?: string
  scrape_status?: string
  last_scraped_at?: string
  created_at: string
  updated_at: string
}
