import { UserProfile } from "../types";

export const formatPrice = (amount: any, user: UserProfile | null, itemCurrency?: "USD" | "JOD") => {
    const numAmount = Number(amount) || 0;
    const itemCur = itemCurrency || "JOD";
    const userCur = user?.currency || "JOD";
  
    let finalAmount = numAmount;
  
    if (itemCur !== userCur) {
      if (itemCur === "USD" && userCur === "JOD") {
        finalAmount = numAmount * 0.71;
      } else if (itemCur === "JOD" && userCur === "USD") {
        finalAmount = numAmount / 0.71;
      }
    }
  
    return userCur === "JOD" 
      ? `${finalAmount.toFixed(2)} د.أ` 
      : `$${finalAmount.toFixed(2)}`;
};
