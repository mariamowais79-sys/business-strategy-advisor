import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getVoiceSession } from '../services/gemini';
import { Mic, MicOff, X, MessageCircle } from 'lucide-react';
import { LiveServerMessage, Blob as GenAIBlob } from '@google/genai';
import { Language, DashboardState } from '../types';

interface VoiceAssistantProps {
  language: string;
  dataContext: string;
  onUpdateDashboard: React.Dispatch<React.SetStateAction<DashboardState>>;
  externalActive?: boolean;
  onExternalClose?: () => void;
}

const VOICE_UI: Record<string, any> = {
  [Language.ENGLISH]: { title: "Voice Advisor", help: "Ask about regions or metrics", listening: "Listening", standby: "Standby" },
  [Language.URDU]: { title: "وائس مشیر", help: "علاقوں یا میٹرکس کے بارے میں پوچھیں", listening: "سن رہا ہے", standby: "تیار ہے" },
  [Language.ARABIC]: { title: "مستشار صوتي", help: "اسأل عن المناطق أو المقاييس", listening: "جاري الاستماع", standby: "في الانتظار" },
  [Language.AUTO]: { title: "AI Advisor", help: "Talk in any language", listening: "Listening...", standby: "Standby" },
};

const CaptionOverlay = React.memo(({ speech, thought, isRtl }: { speech: string, thought: string, isRtl: boolean }) => {
  if (!speech && !thought) return null;
  return (
    <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 md:p-6 rounded-2xl shadow-2xl border border-white/20 text-center animate-in fade-in slide-in-from-bottom-6">
        <p className={`text-lg md:text-xl font-medium ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {speech || thought}
        </p>
        <div className="mt-2 text-[10px] uppercase font-black text-indigo-400 tracking-widest">
          {speech ? 'Detecting Voice...' : 'Advisor Speaking'}
        </div>
      </div>
    </div>
  );
});

const TranscriptList = React.memo(({ transcript, helpText, currentUserSpeech, currentThought }: {
  transcript: { text: string, type: 'user' | 'model' }[],
  helpText: string,
  currentUserSpeech: string,
  currentThought: string
}) => {
  return (
    <div className="flex-1 min-h-[300px] max-h-[450px] p-4 overflow-y-auto space-y-4 bg-slate-50">
      {transcript.length === 0 && !currentUserSpeech && !currentThought && (
        <div className="text-center py-12">
          <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-xs text-slate-400">{helpText}</p>
        </div>
      )}
      {transcript.map((item, i) => (
        <div key={i} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm border ${item.type === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'}`}>
            {item.text}
          </div>
        </div>
      ))}
      {(currentUserSpeech || currentThought) && (
        <div className={`flex ${currentUserSpeech ? 'justify-end' : 'justify-start'}`}>
          <div className="max-w-[85%] p-3 rounded-2xl text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 italic animate-pulse">
            {currentUserSpeech || currentThought}
          </div>
        </div>
      )}
    </div>
  );
});

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  language,
  dataContext,
  onUpdateDashboard,
  externalActive,
  onExternalClose
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [transcript, setTranscript] = useState<{ text: string, type: 'user' | 'model' }[]>([]);
  const [currentThought, setCurrentThought] = useState("");
  const [currentUserSpeech, setCurrentUserSpeech] = useState("");

  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTime = useRef(0);
  const sessionPromise = useRef<Promise<any> | null>(null);
  const workletNode = useRef<AudioWorkletNode | null>(null);

  const t = VOICE_UI[language] || VOICE_UI[Language.AUTO];
  const isRtl = language === Language.ARABIC || language === Language.URDU;

  // Optimized base64 decode
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  // Optimized base64 encode for performance
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    const chunk = 8192;
    for (let i = 0; i < len; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const stopSession = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);
    if (onExternalClose) onExternalClose();

    if (workletNode.current) {
      workletNode.current.disconnect();
      workletNode.current = null;
    }

    if (inputAudioContext.current) {
      try { inputAudioContext.current.close(); } catch (e) { }
      inputAudioContext.current = null;
    }
    if (outputAudioContext.current) {
      try { outputAudioContext.current.close(); } catch (e) { }
      outputAudioContext.current = null;
    }
    sources.current.forEach(s => { try { s.stop(); } catch (e) { } });
    sources.current.clear();
    setCurrentThought("");
    setCurrentUserSpeech("");
    sessionPromise.current = null;
  }, [onExternalClose]);

  const startSession = useCallback(async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputAudioContext.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContext.current = new AudioContext({ sampleRate: 24000 });

      // Load AudioWorklet for low-latency capture
      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input && input[0]) {
              this.port.postMessage(input[0]);
            }
            return true;
          }
        }
        registerProcessor('recorder-processor', RecorderProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await inputAudioContext.current.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const outputNode = outputAudioContext.current.createGain();
      outputNode.connect(outputAudioContext.current.destination);

      sessionPromise.current = getVoiceSession(language, dataContext, {
        onopen: () => {
          setIsActive(true);
          setIsConnecting(false);

          const source = inputAudioContext.current!.createMediaStreamSource(stream);
          workletNode.current = new AudioWorkletNode(inputAudioContext.current!, 'recorder-processor');

          workletNode.current.port.onmessage = (e) => {
            if (!sessionPromise.current) return;
            const inputData = e.data; // Float32Array

            // Efficient PCM conversion
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
            }

            const pcmBlob: GenAIBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000'
            };

            sessionPromise.current.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(workletNode.current);
          workletNode.current.connect(inputAudioContext.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          // 1. Tool Calls
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'update_dashboard_filters') {
                onUpdateDashboard(prev => ({
                  ...prev,
                  filter: { ...prev.filter, ...fc.args }
                }));
              } else if (fc.name === 'highlight_metric') {
                onUpdateDashboard(prev => ({ ...prev, highlightedMetric: fc.args.metric as any }));
                setTimeout(() => onUpdateDashboard(prev => ({ ...prev, highlightedMetric: undefined })), 5000);
              } else if (fc.name === 'reset_dashboard') {
                onUpdateDashboard({ filter: {}, highlightedMetric: undefined, activeTab: 'home' });
              } else if (fc.name === 'navigate_to_tab') {
                onUpdateDashboard(prev => ({ ...prev, activeTab: fc.args.tab as any }));
              }
              sessionPromise.current?.then(s => s.sendToolResponse({
                functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Dashboard updated" } }]
              }));
            }
          }

          // 2. Transcriptions
          if (message.serverContent?.outputTranscription) {
            setCurrentThought(prev => prev + message.serverContent!.outputTranscription!.text);
          } else if (message.serverContent?.inputTranscription) {
            setCurrentUserSpeech(prev => prev + message.serverContent!.inputTranscription!.text);
          }

          if (message.serverContent?.turnComplete) {
            setTranscript(prev => {
              const newItems = [];
              if (currentUserSpeech) newItems.push({ text: currentUserSpeech, type: 'user' as const });
              if (currentThought) newItems.push({ text: currentThought, type: 'model' as const });
              return [...prev.slice(-10), ...newItems];
            });
            setCurrentUserSpeech("");
            setCurrentThought("");
          }

          // 3. Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContext.current) {
            if (outputAudioContext.current.state === 'suspended') await outputAudioContext.current.resume();

            const buffer = await decodeAudioData(decode(base64Audio), outputAudioContext.current, 24000, 1);
            const source = outputAudioContext.current.createBufferSource();
            source.buffer = buffer;
            source.connect(outputNode);

            // Precise scheduling to avoid gaps
            const now = outputAudioContext.current.currentTime;
            if (nextStartTime.current < now) {
              nextStartTime.current = now + 0.05; // Small buffer for first chunk
            }

            source.start(nextStartTime.current);
            nextStartTime.current += buffer.duration;
            sources.current.add(source);
            source.onended = () => sources.current.delete(source);
          }

          // 4. Interruption
          if (message.serverContent?.interrupted) {
            sources.current.forEach(s => { try { s.stop(); } catch (e) { } });
            sources.current.clear();
            nextStartTime.current = 0;
            setCurrentThought("");
            setCurrentUserSpeech("");
          }
        },
        onerror: () => {
          console.error("Voice session error");
          stopSession();
        },
        onclose: () => {
          console.log("Voice session closed");
          stopSession();
        },
      });
    } catch (err) {
      console.error("Voice initiation failed", err);
      stopSession();
    }
  }, [language, dataContext, onUpdateDashboard, encode, decode, decodeAudioData, isActive, isConnecting, currentUserSpeech, currentThought, stopSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (isActive) stopSession(); };
  }, [isActive, stopSession]);

  // Sync with external activation
  useEffect(() => {
    if (externalActive && !isActive && !isConnecting) {
      setIsMinimized(false);
      startSession();
    }
  }, [externalActive, isActive, isConnecting, startSession]);

  const toggleAssistant = useCallback(() => {
    if (isActive || isConnecting) {
      stopSession();
    } else {
      setIsMinimized(false);
      startSession();
    }
  }, [isActive, isConnecting, stopSession, startSession]);

  return (
    <>
      {isActive && <CaptionOverlay speech={currentUserSpeech} thought={currentThought} isRtl={isRtl} />}

      <button
        onClick={toggleAssistant}
        disabled={isConnecting && !isActive}
        className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto ${isRtl ? 'md:left-8' : 'md:right-8'} md:translate-x-0 w-16 h-16 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center transition-all z-40 ${isActive ? 'bg-rose-500 animate-pulse' : isConnecting ? 'bg-amber-500 animate-spin' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {isActive ? <MicOff className="w-8 h-8 md:w-10 md:h-10 text-white" /> : <Mic className="w-8 h-8 md:w-10 md:h-10 text-white" />}
      </button>

      {!isMinimized && (
        <div className={`fixed bottom-20 md:bottom-28 left-0 right-0 md:left-auto md:right-8 mx-4 md:mx-0 md:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-40 flex flex-col ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-bold text-sm">{isActive ? t.title : isConnecting ? 'Connecting...' : t.title}</span>
            </div>
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-indigo-500 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <TranscriptList
            transcript={transcript}
            helpText={t.help}
            currentUserSpeech={currentUserSpeech}
            currentThought={currentThought}
          />
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;