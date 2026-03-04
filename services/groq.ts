import Groq from "groq-sdk";
import { SalesRecord, AdvisoryOutput, RiskLevel, Language } from "../types";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const analyzeSalesDataWithGroq = async (
  data: SalesRecord[],
  prompt: string,
  language: Language
): Promise<AdvisoryOutput[]> => {
  const summary = data.slice(0, 100).map((r) => ({
    r: r.revenue,
    p: r.product,
    c: r.customerName,
    d: r.discount,
    reg: r.region,
    o: r.outstandingAmount,
  }));

  const langConstraint =
    language === Language.AUTO
      ? "Automatically detect the user's language and respond in kind."
      : `The user's preferred language is ${language}. Respond in ${language}.`;

  const chatCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
          You are a world-class Business Strategy Advisor.
          
          CRITICAL REQUIREMENT: 
          ${langConstraint}
          All text values in the JSON output MUST be written in the target language.
          
          Maintain a professional business advisory tone.
          
          Respond with a JSON array of advisory outputs with the following schema:
          {
            "keyInsight": string,
            "rootCause": string,
            "riskLevel": "Low" | "Medium" | "High",
            "recommendedAction": string,
            "expectedImpact": string
          }
        `,
      },
      {
        role: "user",
        content: `Analyze this sales data summary: ${JSON.stringify(summary)}. Task: ${prompt}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  try {
    const text = chatCompletion.choices[0]?.message?.content?.trim() || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const getGroqChatCompletion = async (
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  model: string = "llama-3.3-70b-versatile"
) => {
  return groq.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
  });
};
