import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";
import { SalesRecord, AdvisoryOutput, RiskLevel, Language } from "../types";

export const analyzeSalesData = async (data: SalesRecord[], prompt: string, language: Language): Promise<AdvisoryOutput[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = data.slice(0, 100).map(r => ({
    r: r.revenue,
    p: r.product,
    c: r.customerName,
    d: r.discount,
    reg: r.region,
    o: r.outstandingAmount
  }));

  const langConstraint = language === Language.AUTO 
    ? "Automatically detect the user's language and respond in kind. Use the appropriate script (LTR/RTL)."
    : `The user's preferred language is ${language}. Respond in ${language}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `
      Analyze this sales data summary: ${JSON.stringify(summary)}.
      Task: ${prompt}
      
      CRITICAL REQUIREMENT: 
      ${langConstraint}
      All text values in the JSON output MUST be written in the target language.
      
      Maintain a professional business advisory tone.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            keyInsight: { type: Type.STRING },
            rootCause: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            recommendedAction: { type: Type.STRING },
            expectedImpact: { type: Type.STRING }
          },
          required: ["keyInsight", "rootCause", "riskLevel", "recommendedAction", "expectedImpact"]
        }
      }
    }
  });

  try {
    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

const dashboardFunctions: FunctionDeclaration[] = [
  {
    name: 'update_dashboard_filters',
    description: 'Filter the sales dashboard by region, product, distributor, or customer to focus the analysis.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        region: { type: Type.STRING, description: 'The geographic region (e.g., North, South, East, West)' },
        product: { type: Type.STRING, description: 'Specific product name' },
        distributor: { type: Type.STRING, description: 'Specific distributor name' },
        customer: { type: Type.STRING, description: 'Specific customer name' },
      }
    }
  },
  {
    name: 'highlight_metric',
    description: 'Direct attention to a specific KPI on the dashboard.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        metric: { 
          type: Type.STRING, 
          enum: ['revenue', 'profit', 'outstanding', 'discount'],
          description: 'The KPI metric to highlight' 
        }
      },
      required: ['metric']
    }
  },
  {
    name: 'reset_dashboard',
    description: 'Clear all filters and highlights.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'navigate_to_tab',
    description: 'Switch between different views of the application.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tab: { 
          type: Type.STRING, 
          enum: ['home', 'dashboard', 'reports', 'distributors'],
          description: 'The tab to navigate to' 
        }
      },
      required: ['tab']
    }
  }
];

export const getVoiceSession = async (
  language: string,
  dataContext: string,
  callbacks: any
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langConstraint = language === Language.AUTO 
    ? "Detect and match the user's language. Speak naturally in that language. Use RTL for Urdu/Arabic."
    : `Speak exclusively in ${language}.`;

  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      tools: [{ functionDeclarations: dashboardFunctions }],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: `
        You are a world-class Business Strategy Advisor. 
        Context: ${dataContext}.
        
        ${langConstraint}
        
        DASHBOARD CONTROL:
        Proactively call 'update_dashboard_filters' or 'highlight_metric' when discussing specific data points.
        If a user asks "Show me the North region", call the tool AND explain the strategy verbally.
        
        Keep responses concise, insight-rich, and decision-focused.
      `,
    },
  });
};