import { create } from "zustand";

export interface UserPost {
  id: string;
  type: "news" | "event" | "listing" | "restaurant";
  author: string;
  avatar: string;
  time: string;
  title: string;
  content: string;
  image: string;
  likes: number;
  comments: number;
  tags: string[];
  verified: boolean;
  createdAt: number;
}

interface PostsState {
  userPosts: UserPost[];
  addPost: (post: Omit<UserPost, "id" | "createdAt" | "likes" | "comments">) => void;
}

export const usePostsStore = create<PostsState>((set) => ({
  userPosts: [],
  addPost: (post) =>
    set((state) => ({
      userPosts: [
        {
          ...post,
          id: `user-post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          likes: 0,
          comments: 0,
          createdAt: Date.now(),
        },
        ...state.userPosts,
      ],
    })),
}));
