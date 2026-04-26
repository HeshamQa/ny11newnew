import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function getAiHealthAdvice(userPrompt: string, history: any[] = []) {
  try {
    // Fetch manual training data from Admin
    const kbSnap = await getDocs(collection(db, "knowledge_base"));
    const kbData = kbSnap.docs.map(d => `السؤال: ${d.data().question}\nالجواب: ${d.data().answer}`).join("\n\n");

    const systemInstruction = `أنت "المساعد الصحي الذكي" لتطبيق NY11. 
    مهمتك هي تقديم نصائح صحية ودقيقة بناءً على أحدث الأبحاث العلمية. 
    تحدث بلهجة ودودة واحترافية باللغة العربية. 
    
    استخدم المعلومات التالية كمرجع إضافي عند الرد:
    ${kbData}

    إذا سُئلت عن وجبات، اقترح وجبات صحية مشابهة لمحتويات تطبيق NY11 (سلطات، دجاج مشوي، شوفان، أرز بني).
    لا تقدم نصائح طبية حرجة، وجه المستخدم دائماً لاستشارة الطبيب المختص عند الحاجة.`;

    // Convert history from Gemini format to OpenAI/Groq format
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(msg => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.parts[0].text
      })),
      { role: "user", content: userPrompt }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "عذراً، أواجه مشكلة في الاتصال حالياً. حاول مرة أخرى لاحقاً.";
  }
}

