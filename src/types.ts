export type UserRole = "ADMIN" | "USER" | "TRAINER" | "LAB_MANAGER";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  profilePic?: string;
  createdAt: number;
  age?: number;
  goal?: "LOSE_WEIGHT" | "GAIN_WEIGHT" | "MAINTAIN" | "MUSCLE";
  currentWeight?: number;
  height?: number;
  aiInsights?: string;
  currency?: "USD" | "JOD";
  serviceCurrency?: "USD" | "JOD";
  rating?: number;
  price?: number;
  bio?: string;
  online?: boolean;
}

export interface KnowledgeBaseItem {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: "USD" | "JOD";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  category: string;
  image: string;
}

export interface LabTest {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: "USD" | "JOD";
  category: string;
  image?: string;
}

export interface Expert {
  id: string;
  name: string;
  role: "TRAINER" | "LAB_MANAGER";
  rating: number;
  price: number;
  currency?: "USD" | "JOD";
  image: string;
  bio: string;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: "TEXT" | "QUOTE";
  quoteAmount?: number;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: number;
  type: "EXPERT" | "AI";
  expertId?: string;
}
