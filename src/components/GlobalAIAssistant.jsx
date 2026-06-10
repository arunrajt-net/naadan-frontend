import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CreditCard, Leaf, MessageSquare, Mic, MicOff, Plus, Send, ShoppingBag, Truck, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { productsAPI } from '../api';
import { useLocation } from 'react-router-dom';

const SYSTEM_PROMPT = `Act as a friendly, simple, voice-enabled assistant for users of the Naadan platform.

Main tasks:
1. Help farmers add products (voice syntax: 10kg tomatoes price 30 rupees)
2. Help buyers find nearby produce
3. Explain delivery, pickup, payments, panchayat deployment

Style:
- Friendly, simple Malayalam/English mixed.
- Short sentences.
- Ask confirmation before saving database.

Example: "തക്കാളി ചേർക്കാൻ ഞാൻ സഹായിക്കാം"`;

export default function GlobalAIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'നമസ്കാരം! ഞാൻ നാടൻ സഹായിയാണ്. എന്താണ് ചെയ്യേണ്ടത്? (Hello! I am your Naadan helper. What can I do for you today?)',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [pendingProduct, setPendingProduct] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);



  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ml-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const speak = (text) => {
    if (!isTtsEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```json[\s\S]*?```/g, '').replace(/\(Presentation Mode\)/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ml-IN';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition start failed:", e);
        setIsListening(false);
      }
    }
  };

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    let usingSimulated = false;

    const runSimulation = () => {
      usingSimulated = true;
      setTimeout(() => {
          const t = text.toLowerCase();
          let fakeResponse = "";
          let includeJson = false;
          let product = "ഉൽപ്പന്നം";
          let qty = "10";
          let price = 30;

          if (t.includes('hello') || t.includes('ഹലോ') || t.includes('നമസ്കാരം')) {
            fakeResponse = "നമസ്കാരം! നിങ്ങളുടെ കാർഷിക ഉൽപ്പന്നങ്ങൾ ചേർക്കാനും ഓർഡറുകൾ പരിശോധിക്കാനും ഞാൻ സഹായിക്കാം. എന്താണ് ചെയ്യേണ്ടത്?";
          } else if (t.includes('order') || t.includes('ഓർഡർ') || t.includes('ചോദിക്കുക')) {
            fakeResponse = "നിങ്ങൾക്ക് പുതിയ ഓർഡറുകൾ വന്നിട്ടുണ്ട്. ഓർഡറുകൾ കാണാൻ ഡാഷ്‌ബോർഡിൽ പോയി Accept അല്ലെങ്കിൽ Reject ചെയ്യാം.";
          } else if (t.includes('price') || t.includes('വില') || t.includes('റേറ്റ്')) {
            fakeResponse = "തക്കാളിക്ക് വിപണിയിൽ കിലോയ്ക്ക് &#8377;25 മുതൽ &#8377;32 രൂപ വരെയാണ് ഇന്നത്തെ ശരാശരി നിരക്ക്.";
          } else if (t.includes('delivery') || t.includes('ഡെലിവറി') || t.includes('എത്തിക്കുക')) {
            fakeResponse = "രണ്ട് രീതിയിൽ സാധനങ്ങൾ എത്തിക്കാം: 1. കസ്റ്റമർ നിങ്ങളുടെ ഫാമിൽ വന്നു വാങ്ങുക, 2. നിങ്ങൾ നേരിട്ട് എത്തിച്ചു നൽകുക.";
          } else if (t.includes('payment') || t.includes('പണം') || t.includes('പൈസ')) {
            fakeResponse = "ഗൂഗിൾ പേ വഴിയോ അല്ലെങ്കിൽ ക്യാഷ് ആയി നേരിട്ടോ പേയ്‌മെന്റുകൾ സ്വീകരിക്കാവുന്നതാണ്.";
          } else if (t.includes('ചേർക്കുക') || t.includes('add product') || t.includes('തക്കാളി') || t.includes('banana') || t.includes('തേങ്ങ') || /\d+/.test(t)) {
             qty = text.match(/\d+/) ? text.match(/\d+/)[0] : "10";
             let matchedPrice = text.match(/(?:വില|രൂപ|price)[^\d]*(\d+)/) || text.match(/(\d+)\s*(?:രൂപ|rupees)/);
             price = matchedPrice ? parseInt(matchedPrice[1]) : 40;

             if(t.includes('തക്കാളി') || t.includes('tomato')) product = 'തക്കാളി';
             else if(t.includes('ഏത്തപ്പഴം') || t.includes('banana') || t.includes('പഴം')) product = 'ഏത്തപ്പഴം';
             else if(t.includes('തേങ്ങ') || t.includes('coconut')) product = 'തേങ്ങ';
             else if(t.includes('വെണ്ടയ്ക്ക') || t.includes('okra')) product = 'വെണ്ടയ്ക്ക';
             else if(t.includes('മാങ്ങ') || t.includes('mango')) product = 'മാങ്ങ';
             else product = 'പച്ചക്കറി';

             fakeResponse = `ഞാൻ ${qty} കിലോ ${product} &#8377;${price} നിരക്കിൽ ചേർക്കട്ടെ? ചേർക്കാൻ 'അതെ' എന്ന് പറയുക.`;
             includeJson = true;
             setPendingProduct({ name: product, price: price, quantity: qty + ' kg', category: 'Produce' });
          } else if (t.includes('അതെ') || t.includes('ശരി') || t.includes('yes') || t.includes('ok') || t.includes('തീർച്ചയായും')) {
             fakeResponse = "വിജയകരമായി നിങ്ങളുടെ ഉൽപ്പന്നം ഇൻവെന്ററിയിലേക്ക് ചേർത്തിട്ടുണ്ട്. ഡാഷ്‌ബോർഡിൽ കാണാം.";
             if (pendingProduct) {
                productsAPI.add(pendingProduct).catch(e => console.warn('Mock DB sync error bypassed:', e));
                setPendingProduct(null);
             }
          } else {
             fakeResponse = "ക്ഷമിക്കണം, എനിക്ക് അത് വ്യക്തമായില്ല. '10 കിലോ തക്കാളി വില 30' എന്നിങ്ങനെ വീണ്ടും പറയുകയോ ടൈപ്പ് ചെയ്യുകയോ ചെയ്യാമോ?";
          }

          if(includeJson) {
             fakeResponse += `\n\n(Presentation Mode)\n\`\`\`json\n{"product_name": "${product}", "quantity": "${qty}kg", "price": ${price}}\n\`\`\``;
          } else {
             fakeResponse += `\n\n(Presentation Mode)`;
          }

          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: fakeResponse,
            sender: 'assistant',
            timestamp: new Date()
          }]);
          setIsTyping(false);
          speak(fakeResponse.split('\n')[0]);
        }, 1200);
    };

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

      if (!apiKey || apiKey.trim() === "" || apiKey === "dummy_key" || apiKey === "MY_GEMINI_API_KEY") {
        runSimulation();
        return;
      }

      // Genuine Mode
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: { systemInstruction: SYSTEM_PROMPT },
      });

      const response = await chat.sendMessage({ message: text });
      const aiText = response.text || "ക്ഷമിക്കണം, എനിക്ക് വ്യക്തമായില്ല.";

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      speak(aiText);

      // Auto-Sync to Database
      const jsonMatch = aiText.match(/```json\s+id="farmer_ai_json"([\s\S]*?)```/);
      if (jsonMatch) {
         try {
             const payload = JSON.parse(jsonMatch[1].trim());
             const addData = {
                name: payload.product_name,
                price: parseFloat(payload.price) || 0,
                quantity: payload.quantity || '1 kg',
                category: 'Produce'
             };
             productsAPI.add(addData).catch(e => console.warn('AI DB sync error bypassed:', e));
         } catch(e) {
             console.error(e);
         }
      }
    } catch (error) {
      console.warn("Gemini API Error - falling back to simulated response:", error);
      runSimulation();
    } finally {
      if (!usingSimulated) {
        setIsTyping(false);
      }
    }
  };

  const quickActions = [
    { label: 'തക്കാളി ചേർക്കുക', text: '10 കിലോ തക്കാളി വില 30 രൂപ ചേർക്കുക' },
    { label: 'ഓർഡറുകൾ?', text: 'എനിക്ക് പുതിയ ഓർഡർ ഉണ്ടോ?' },
    { label: 'ഡെലിവറി?', text: 'ഡെലിവറി എങ്ങനെയാണ് ചെയ്യേണ്ടത്?' },
  ];

  if (location.pathname === '/farmer/ai-assistant') {
    return null;
  }

  return (
    <div className="fixed right-5 z-[9999] font-sans" style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 16px)" }}>
      <style>{`
        @keyframes float-breath {
          0%, 100% { transform: translateY(0px) scale(1); box-shadow: 0 8px 30px rgba(34, 197, 94, 0.4); }
          50% { transform: translateY(-8px) scale(1.05); box-shadow: 0 15px 35px rgba(251, 143, 0, 0.5); }
        }
        .ai-floating-btn {
          animation: float-breath 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* FLOATING ACTION BUBBLE */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-floating-btn w-16 h-16 bg-gradient-to-tr from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-full flex items-center justify-center border-none shadow-2xl cursor-pointer"
        >
          <MessageSquare size={28} className="animate-pulse" />
        </button>
      )}

      {/* CHAT POPUP WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 100 }}
            className="w-[360px] sm:w-[400px] h-[500px] bg-white rounded-[2.5rem] border border-gray-150 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#1b5e20] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/10 p-2 rounded-full">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">നാടൻ സഹായി</h3>
                  <span className="text-[10px] font-black text-green-300 uppercase tracking-wider">AI Voice Assistant</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                  className="p-2 hover:bg-white/10 rounded-full border-none bg-transparent cursor-pointer text-white"
                  title="Toggle Speech"
                >
                  {isTtsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full border-none bg-transparent cursor-pointer text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 shadow-sm text-sm font-medium ${m.sender === 'user' ? 'bg-green-700 text-white rounded-2xl rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'}`}>
                    <p className="leading-relaxed">{m.text.split('```json')[0]}</p>
                    {m.sender === 'assistant' && m.text.includes('```json') && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[11px] font-mono border border-gray-100">
                        <p className="font-bold text-green-700 mb-0.5">ഉൽപ്പന്ന വിവരങ്ങൾ:</p>
                        <pre className="overflow-x-auto">{m.text.match(/```json([\s\S]*?)```/)?.[1]}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-green-700 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-green-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-green-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Scroll */}
            <div className="px-4 py-2 bg-white border-t border-gray-50 overflow-x-auto flex gap-2 shrink-0">
              {quickActions.map((act, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(act.text)}
                  className="flex-shrink-0 bg-gray-50 hover:bg-green-50 text-green-750 px-3.5 py-1.5 rounded-full border border-gray-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  {act.label}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2.5 shrink-0">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-full border-none cursor-pointer transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-green-750 hover:bg-green-700 hover:text-white'}`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="പറയുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക..."
                  className="w-full bg-gray-50 border-none rounded-full py-3.5 pl-5 pr-10 focus:ring-1 focus:ring-green-600 outline-none text-xs text-gray-800 font-semibold"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-1.5 text-green-750 disabled:opacity-30 border-none bg-transparent cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

