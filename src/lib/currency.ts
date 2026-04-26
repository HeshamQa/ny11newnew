import { UserProfile } from "../types";

export const formatPrice = (amount: number, user: UserProfile | null) => {
    if (!user || user.currency === "JOD" || !user.currency) {
      return `${amount.toFixed(2)} د.أ`;
    }
    return `$${(amount / 0.71).toFixed(2)}`;
};
