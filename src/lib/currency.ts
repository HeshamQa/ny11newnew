import { t } from "./translations";

export const formatPrice = (amount: any, user: UserProfile | null, itemCurrency?: "USD" | "JOD") => {
    // Handle localized amount if it's an object
    const rawAmount = typeof amount === 'object' ? t(amount) : amount;
    const numAmount = Number(rawAmount) || 0;
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
