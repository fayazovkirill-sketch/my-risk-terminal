import { GoogleGenerativeAI } from "@google/generative-ai";

// Инициализация AI. Ключ будет браться из настроек Vercel
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export async function getRiskAdvice(data: any) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Проанализируй торговые данные и дай краткий совет по риск-менеджменту: ${JSON.stringify(data)}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Не удалось получить совет от ИИ. Проверьте настройки API ключа в Vercel.";
  }
}
