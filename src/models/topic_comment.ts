// types.ts
export interface TopicComment {
    id: number;
    comment: string;
    author: string;
    created_at: string; // or Date
    topics_id: number;
  }
  