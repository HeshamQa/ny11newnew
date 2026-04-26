import { UserProfile } from "../types";

export const formatPrice = (amount: any, user: UserProfile | null) => {
    const numAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
    if (!user || user.currency === "JOD" || !user.currency) {
      return `${numAmount.toFixed(2)} د.أ`;
    }
    return `$${(numAmount / 0.71).toFixed(2)}`;
};
