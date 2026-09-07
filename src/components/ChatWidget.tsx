'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  PhoneCall,
  Clock,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  matchedBookings?: Array<{
    booking_id: string;
    requested_date: string;
    requested_time: string;
    carrier_name: string;
    client_name: string;
    pallet_count: number;
    license_plate?: string | null;
    status: string;
    admin_reason?: string | null;
  }>;
}

const QUICK_ACTIONS = [
  { label: '🔍 เช็คสถานะคิว', query: 'เช็คสถานะคิวของฉันหน่อยครับ' },
  { label: '🕒 รอบเวลาว่างวันนี้/พรุ่งนี้', query: 'วันนี้และพรุ่งนี้มีรอบว่างกี่คิว' },
  { label: '📞 เบอร์โทร & เวลาทำการ', query: 'ขอเบอร์ติดต่อแผนกรับสินค้าและเวลาทำการคลัง' },
  { label: '💊 ข้อปฏิบัติส่งยาเย็น (Cold Chain)', query: 'ส่งยาควบคุมอุณหภูมิ Cold Chain ต้องเตรียมตัวอย่างไร' },
];

export default function ChatWidget() {
  const pathname = usePathname() || '';
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Do not render on poster/print pages
  if (pathname === '/poster' || pathname === '/preview') {
    return null;
  }

  // Initialize greeting message on first mount
  useEffect(() => {
    const initialGreeting: ChatMessage = {
      id: 'init-1',
      sender: 'bot',
      text: 'สวัสดีค่ะ! น้องฟาร์มา (PTN AI Assistant) ยินดีให้บริการค่ะ 🚚✨\n\nสามารถสอบถามรอบเวลาว่าง, ข้อมูลติดต่อคลัง หรือพิมพ์ **รหัสจอง / เบอร์โทร / ทะเบียนรถ** เพื่อเช็คสถานะคิวได้ทันทีเลยนะคะ',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
  }, []);

  // Auto-scroll to bottom on message updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Build conversation history (excluding initial greeting)
      const history = newMessages
        .slice(-5)
        .filter((m) => m.id !== 'init-1')
        .map((m) => ({
          role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
          text: m.text,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history,
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          matchedBookings: data.matchedBookings,
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อแผนกรับสินค้าได้ที่เบอร์ 099-378-7463 นะคะ 📞',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageText = (content: string) => {
    // Simple markdown renderer for bold, links, and code
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Parse markdown-like bold **text** and code `text`
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-slate-200/80 px-1 py-0.5 rounded text-xs text-emerald-800 font-mono font-bold">$1</code>');
      return (
        <span key={idx} className="block leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </span>
      );
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">🟢 อนุมัติแล้ว</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">🟡 รอตรวจสอบ</span>;
      case 'CheckedIn':
      case 'Receiving':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">🔵 กำลังลงสินค้า</span>;
      case 'Completed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">🟣 เสร็จสิ้น</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">🔴 ไม่อนุมัติ</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 no-print">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-[0_8px_25px_rgba(16,185,129,0.45)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
            aria-label="เปิดหน้าต่างคุยกับ AI Chatbot"
          >
            {/* Ping pulse ring */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-white"></span>
            </span>

            <div className="relative">
              <Sparkles className="w-7 h-7 animate-pulse text-amber-200" />
            </div>

            {/* Tooltip on Desktop hover */}
            <span className="hidden sm:group-hover:flex absolute right-full mr-3 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-lg items-center gap-1.5 backdrop-blur-sm pointer-events-none transition-all">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              สอบถามคิวกับ AI น้องฟาร์มา
            </span>
          </button>
        )}
      </div>

      {/* Chat Window Dialog */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm sm:w-[390px] h-[540px] max-h-[82vh] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="w-6 h-6 text-emerald-100" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-700 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight text-white">น้องฟาร์มา (PTN AI)</h3>
                  <span className="bg-emerald-500/40 text-[10px] text-emerald-200 px-1.5 py-0.2 rounded-md font-semibold border border-emerald-400/30">
                    Gemini Flash
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  ออนไลน์พร้อมช่วยเช็คคิว 24 ชม.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="ปิดหน้าต่างแชท"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl shadow-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {formatMessageText(msg.text)}
                  </div>

                  {/* If Bot returned matched booking cards */}
                  {msg.matchedBookings && msg.matchedBookings.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.matchedBookings.map((b) => (
                        <div
                          key={b.booking_id}
                          className="bg-white rounded-xl p-3 border border-emerald-200 shadow-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-slate-800">{b.booking_id}</span>
                            {getStatusBadge(b.status)}
                          </div>
                          <p className="text-[11px] text-slate-600">
                            📅 {b.requested_date} ({b.requested_time})
                          </p>
                          <p className="text-[11px] text-slate-600">
                            🚚 {b.carrier_name} {b.license_plate ? `• ${b.license_plate}` : ''}
                          </p>
                          <Link
                            href={`/booking/${b.booking_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline pt-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            ดูบัตรคิวดิจิทัล & QR Code
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[10px] text-slate-400 px-1 ${
                      msg.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 items-center text-slate-500 text-xs">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
                </div>
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestions */}
          <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(action.query)}
                disabled={isTyping}
                className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] rounded-lg border border-slate-200/80 transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="พิมพ์คำถาม หรือรหัสคิว / ทะเบียนรถ..."
              className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="ส่งข้อความ"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
