import { GoogleGenAI } from "@google/genai";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getAiHealthAdvice(userPrompt: string, history: any[] = []) {
  try {
    // Fetch manual training data from Admin
    const kbSnap = await getDocs(collection(db, "knowledge_base"));
    const kbData = kbSnap.docs.map(d => `السؤال: ${d.data().question}\nالجواب: ${d.data().answer}`).join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: `أنت "المساعد الصحي الذكي" لتطبيق NY11. 
        مهمتك هي تقديم نصائح صحية ودقيقة بناءً على أحدث الأبحاث العلمية. 
        تحدث بلهجة ودودة واحترافية باللغة العربية. 
        
        استخدم المعلومات التالية كمرجع إضافي عند الرد:
        ${kbData}

        إذا سُئلت عن وجبات، اقترح وجبات صحية مشابهة لمحتويات تطبيق NY11 (سلطات، دجاج مشوي، شوفان، أرز بني).
        لا تقدم نصائح طبية حرجة، وجه المستخدم دائماً لاستشارة الطبيب المختص عند الحاجة.`,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("AI Error:", error);
    
    // Handle quota exhaustion (429) specifically
    const isQuotaError = 
      error?.status === "RESOURCE_EXHAUSTED" || 
      error?.code === 429 || 
      error?.error?.code === 429 ||
      (typeof error === 'string' && error.includes("429")) ||
      (error?.message && error.message.includes("quota"));

    if (isQuotaError) {
      return "عذراً، لقد تم استهلاك كامل الحصة اليومية للمساعد الذكي. يرجى المحاولة مرة أخرى غداً.";
    }

    return "عذراً، أواجه مشكلة في الاتصال حالياً. حاول مرة أخرى لاحقاً.";
  }
}
