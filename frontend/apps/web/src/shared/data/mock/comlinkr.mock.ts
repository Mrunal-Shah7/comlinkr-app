import { NewsPost, EventPost } from "../../types/post";
import { Restaurant } from "../../types/restaurant";
import { ChatMessage, ChatThread } from "../../types/chat";
import { User } from "../../types/user";
import { CommunityQuestion } from "../../../features/community/community.types";
import { FavoriteItem } from "../../../features/favorites/favorites.types";
import { InterestedEvent } from "../../../features/interested/interested.types";

const users: User[] = [
  {
    id: "u1",
    name: "Ava Benson",
    handle: "ava_b",
    city: "New York",
    avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "u2",
    name: "Daniel Wu",
    handle: "danielwu",
    city: "New York",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "u3",
    name: "Mira Patel",
    handle: "mirapatel",
    city: "New York",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
  },
];

export const newsItems: NewsPost[] = [
  {
    id: "n1",
    title: "City launches new commuter discounts",
    summary: "Save on metro rides this week with new partner programs.",
    image: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80",
    category: "news",
    location: { city: "New York", area: "Midtown" },
    author: users[0],
    time: "2h ago",
  },
  {
    id: "n2",
    title: "Weekend night market opens",
    summary: "Street food, indie music, and local creators under one roof.",
    image: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=800&q=80",
    category: "news",
    location: { city: "New York", area: "SoHo" },
    author: users[1],
    time: "5h ago",
  },
];

export const eventItems: EventPost[] = [
  {
    id: "e1",
    title: "Rooftop Sunset Mixer",
    description: "Meet new friends with skyline views and chill vibes.",
    image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    date: "Sat, Feb 10",
    time: "6:30 PM",
    location: { city: "New York", area: "Chelsea", address: "204 10th Ave" },
    host: users[2],
    attendees: users,
    category: "events",
  },
  {
    id: "e2",
    title: "Basketball at Riverside",
    description: "Casual 3v3, all skill levels welcome.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    date: "Sun, Feb 11",
    time: "3:00 PM",
    location: { city: "New York", area: "Upper West" },
    host: users[1],
    attendees: [users[1], users[0]],
    category: "events",
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "Green Fork",
    cuisine: "Healthy Bowls",
    rating: 4.7,
    distance: "0.6 mi",
    image: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=800&q=80",
    location: { city: "New York", area: "NoMad" },
    price: "$$",
    saved: true,
  },
  {
    id: "r2",
    name: "Little Napoli",
    cuisine: "Italian",
    rating: 4.5,
    distance: "1.1 mi",
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80",
    location: { city: "New York", area: "East Village" },
    price: "$$",
  },
  {
    id: "r3",
    name: "Seoul Spice",
    cuisine: "Korean",
    rating: 4.8,
    distance: "2.0 mi",
    image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80",
    location: { city: "New York", area: "Koreatown" },
    price: "$$$",
  },
];

export const communityQuestions: CommunityQuestion[] = [
  {
    id: "q1",
    title: "Best coworking spaces in Midtown?",
    excerpt: "Looking for quiet spaces with day passes and good coffee.",
    tags: ["work", "coffee", "midtown"],
    votes: 32,
    answers: 8,
    author: "Jules",
    time: "1d ago",
  },
  {
    id: "q2",
    title: "Anyone down for a weekend hike?",
    excerpt: "Planning a day trip upstate. Suggest trails + rides.",
    tags: ["weekend", "outdoors"],
    votes: 21,
    answers: 4,
    author: "Marco",
    time: "3d ago",
  },
];

export const chatThreads: ChatThread[] = [
  {
    id: "t1",
    title: "Rooftop Mixer Chat",
    preview: "Can someone share the playlist?",
    participants: users,
    lastMessageTime: "2m",
    unread: 2,
  },
  {
    id: "t2",
    title: "Foodies NYC",
    preview: "Try the new ramen spot in SoHo!",
    participants: [users[1], users[2]],
    lastMessageTime: "1h",
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: "m1",
    text: "Anyone already there?",
    sender: users[1],
    createdAt: "6:42 PM",
  },
  {
    id: "m2",
    text: "On my way, 10 minutes out!",
    sender: users[0],
    createdAt: "6:44 PM",
    isMe: true,
  },
  {
    id: "m3",
    text: "Grab a seat near the terrace.",
    sender: users[2],
    createdAt: "6:45 PM",
  },
];

export const favoriteItems: FavoriteItem[] = [
  {
    id: "f1",
    type: "food",
    title: "Green Fork",
    subtitle: "Healthy Bowls",
    image: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=800&q=80",
    meta: "Healthy • 0.6 mi",
  },
  {
    id: "f2",
    type: "event",
    title: "Rooftop Sunset Mixer",
    subtitle: "Chelsea",
    image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    meta: "Sat, Feb 10 • Chelsea",
  },
  {
    id: "f3",
    type: "housing",
    title: "SoHo Studio Loft",
    subtitle: "1 bed",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    meta: "$2,100 • 1 bed",
  },
];

export const interestedEvents: InterestedEvent[] = [
  {
    id: "ie1",
    title: "Basketball at Riverside",
    date: "Sun, Feb 11",
    time: "3:00 PM",
    location: "Upper West",
    host: "Daniel Wu",
    attendees: ["Daniel Wu", "Ava Benson"],
  },
  {
    id: "ie2",
    title: "Rooftop Sunset Mixer",
    date: "Sat, Feb 10",
    time: "6:30 PM",
    location: "Chelsea",
    host: "Mira Patel",
    attendees: ["Mira Patel", "Daniel Wu", "Ava Benson"],
  },
];
