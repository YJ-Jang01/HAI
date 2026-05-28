import React from 'react';
import { X, Send, Sparkles, Bot, MessageSquare, CornerDownLeft, RefreshCw } from 'lucide-react';
import { Product } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestedProducts?: Product[];
}

interface AiAgentWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onOpenProductDetail: (id: number) => void;
  initialSearchQuery?: string;
}

export default function AiAgentWidget({
  isOpen,
  onClose,
  products,
  onOpenProductDetail,
  initialSearchQuery
}: AiAgentWidgetProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Initial welcome message
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: '안녕하세요! AImazon 인공지능 쇼핑 에이전트입니다. 🤖\n\n원하시는 스타일, 카테고리, 혹은 소재나 제조국에 대해 이야기해주시면 어포더블한 컬렉션에서 어울리는 상품을 실시간 매칭해 드립니다.',
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Sync scroll on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle triggered query from outer search bar
  React.useEffect(() => {
    if (initialSearchQuery && isOpen) {
      handleUserQuery(`"${initialSearchQuery}" 컬렉션 추천해 줘`);
    }
  }, [initialSearchQuery, isOpen]);

  // General Q&A / Natural Matching Logic
  const handleUserQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Add user message
    const userMsgId = 'user-' + Date.now();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate subtle AI cognitive response gap
    setTimeout(() => {
      setIsTyping(false);

      const parsedQuery = queryText.toLowerCase();
      let matchedItems: Product[] = [];
      let replyText = '';

      // Match products from database
      if (parsedQuery.includes('코트') || parsedQuery.includes('coat')) {
        matchedItems = products.filter(p => p.name.includes('코트') || p.category === 'Outerwear');
        replyText = '고객님을 위해 고급 소재만을 선별한 가을/겨울 시즌 코트 아이템 컬렉션입니다. 🧥 각 상품을 클릭하시면 색상과 실측 정보를 즉시 확인하실 수 있습니다.';
      } else if (parsedQuery.includes('가방') || parsedQuery.includes('백') || parsedQuery.includes('bag')) {
        matchedItems = products.filter(p => p.name.includes('백') || p.name.includes('가방') || p.category === 'Accessories');
        replyText = '우아하고 실용적인 수납력을 자랑하는 에센셜 백 & 가죽 가방 컬렉션입니다. 👜 통가죽 특유의 질감과 견고한 마감을 자랑합니다.';
      } else if (parsedQuery.includes('자켓') || parsedQuery.includes('재킷') || parsedQuery.includes('jacket')) {
        matchedItems = products.filter(p => p.name.includes('재킷') || p.name.includes('자켓') || p.name.includes('블레이저'));
        replyText = '단정하면서도 세련된 실루엣을 완성해 주는 고품격 자켓 라인업입니다. 🧥 데일리 비즈니스 캐주얼로 강력 추천해 드립니다.';
      } else if (parsedQuery.includes('신발') || parsedQuery.includes('부츠') || parsedQuery.includes('스니커즈') || parsedQuery.includes('shoes')) {
        matchedItems = products.filter(p => p.category === 'Footwears' || p.name.includes('부츠') || p.name.includes('스니커즈') || p.name.includes('구두'));
        replyText = '최상의 착화감과 현대적인 감각을 결합한 풋웨어 컬렉션입니다. 👟 이탈리아 통가죽 수제 부츠부터 기능성 러닝 슈즈까지 마음껏 탐색해보세요.';
      } else if (parsedQuery.includes('벨트') || parsedQuery.includes('belt') || parsedQuery.includes('지갑')) {
        matchedItems = products.filter(p => p.name.includes('벨트') || p.name.includes('지갑'));
        replyText = '엄선된 프리미엄 천연 가죽 소재의 액세서리 소품 컬렉션입니다. 💼 가치 있는 가죽의 품격을 느껴보세요.';
      } else if (parsedQuery.includes('이탈리아') || parsedQuery.includes('italy')) {
        matchedItems = products.filter(p => p.origin === 'Italy');
        replyText = '이탈리아(Italy) 테일러 장인들의 수준 높은 정교함과 전통 있는 웰트 공법으로 제작된 프리미엄 가죽/명품 잡화 라인업입니다. 🇮🇹';
      } else if (parsedQuery.includes('한국') || parsedQuery.includes('korea') || parsedQuery.includes('국산')) {
        matchedItems = products.filter(p => p.origin === 'South Korea');
        replyText = '모던하고 감각적인 실루엣과 완벽한 실측 봉제 마감으로 사랑받는 대한민국 프리미엄 K-트렌디 웨어 셀렉션입니다. 🇰🇷';
      } else if (parsedQuery.includes('프랑스') || parsedQuery.includes('france')) {
        matchedItems = products.filter(p => p.origin === 'France');
        replyText = '예술적인 무드와 세련된 디테일로 유니크한 프렌치 페미닌&컨템포러리 무드를 선사하는 프랑스 원산지 아이템입니다. 🇫🇷';
      } else if (parsedQuery.includes('울') || parsedQuery.includes('wool') || parsedQuery.includes('캐시미어') || parsedQuery.includes('cashmere')) {
        matchedItems = products.filter(p => p.material?.includes('울') || p.material?.includes('캐시미어') || p.material?.includes('Cashmere') || p.material?.includes('Wool'));
        replyText = '피부에 닿는 자극 없이 부드럽고 가벼우면서도, 최상의 체온 보존력을 지닌 천연 메리노 울 및 캐시미어 100% 프리미엄 컬렉션입니다. 🐑';
      } else if (parsedQuery.includes('선물') || parsedQuery.includes('추천') || parsedQuery.includes('best') || parsedQuery.includes('인기')) {
        matchedItems = products.filter(p => p.rating >= 4.8).slice(0, 10);
        replyText = '쇼핑 고객 대다수가 별점 5점 만점으로 적극 만족한 보장된 베스트셀러 스테디 원 데일리 템 리스트입니다. 🎁 소중한 선물을 준비해보세요.';
      } else {
        // Fallback generic search match against database
        const rawKw = parsedQuery.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim();
        matchedItems = products.filter(p => 
          p.name.toLowerCase().includes(rawKw) || 
          p.category.toLowerCase().includes(rawKw) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(rawKw)) ||
          (p.origin && p.origin.toLowerCase().includes(rawKw)) ||
          p.desc.toLowerCase().includes(rawKw)
        );

        if (matchedItems.length > 0) {
          replyText = `입력하신 단어와 관련된 최적의 매칭 패션 컬렉션을 찾았습니다! 총 ${matchedItems.length}개의 엄선 상품을 제안해 드립니다. ✨`;
        } else {
          replyText = `죄송합니다. '${queryText}'(와)과 부합하는 특별 상품을 아직 찾지 못했습니다. 대신 저희 갤러리에서 가장 인기 있는 시그니처 럭셔리 아이템을 소개해 드립니다!`;
          matchedItems = products.filter(p => p.rating >= 4.8).slice(0, 4);
        }
      }

      // Limit suggested products to 5 max to save visual height nicely
      const finalSuggested = matchedItems.sort(() => 0.5 - Math.random()).slice(0, 5);

      const aiMsgId = 'ai-' + Date.now();
      const newAiMsg: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: replyText,
        timestamp: new Date(),
        suggestedProducts: finalSuggested
      };

      setMessages(prev => [...prev, newAiMsg]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUserQuery(inputValue);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: '네! 이전 상담을 초기화하고 새로운 AI 쇼핑 솔루션을 준비했습니다. 궁금하신 점이 있다면 무엇이든 물어보세요! 😊',
        timestamp: new Date()
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-[200] animate-fadeIn transition-opacity"
      id="ai-agent-panel-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative animate-slideLeft border-l border-gray-200"
        id="ai-agent-panel-container"
      >
        
        {/* Dynamic header */}
        <header className="bg-[#131921] text-white px-5 py-4 flex items-center justify-between shadow-md select-none">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="p-2 bg-[#232f3e] rounded-lg border border-amber-400">
                <Bot size={20} className="text-[#febd69] animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#131921]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white">AImazon AI Agent</h3>
                <span className="text-[9px] bg-[#C7511F] text-white font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-gray-300">실시간 맞춤형 꾸띄르 큐레이션</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={resetChat}
              title="대화 초기화"
              className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              id="ai-agent-close-btn"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Banner Indicator */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-100 px-4 py-2 text-center text-[11px] font-medium text-orange-850 flex items-center justify-center gap-1 border-b border-amber-200">
          <Sparkles size={11} className="text-[#C7511F]" />
          <span>원하시는 옷 종류(코트), 소재, 혹은 제조국(이탈리아)을 물어보세요!</span>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col" id="ai-agent-messages-box">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
            >
              
              {/* Message bubble */}
              <div 
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-[#C7511F] text-white rounded-tr-none font-medium' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-xs whitespace-pre-line'
                }`}
              >
                {msg.text}

                {/* Simulated product recommendation cards inside message bubble */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-dashed border-gray-200 space-y-2 select-none" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] font-bold text-[#C7511F] mb-2 uppercase tracking-wider">
                      추천 매칭 갤러리 ✦
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.suggestedProducts.map((p) => (
                        <div 
                          key={p.id}
                          onClick={() => onOpenProductDetail(p.id)}
                          className="flex items-center gap-3 bg-gray-50 hover:bg-[#FFE1D6]/70 border border-gray-200 hover:border-orange-200 rounded-lg p-2 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <img 
                            src={p.img} 
                            alt={p.name} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-cover rounded-md border border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-gray-800 truncate block">
                                {p.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-bold text-[#C7511F]">
                                ₩{Math.floor(p.price * 1300).toLocaleString()}
                              </span>
                              {p.origin && (
                                <span className="text-[9px] px-1 py-0.2 bg-white border text-gray-500 rounded-xs">
                                  {p.origin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <span className="text-[9px] text-gray-400 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="self-start flex flex-col items-start max-w-[80%]">
              <div className="bg-white border border-gray-250 p-3 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#C7511F] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#C7511F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#C7511F] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[9px] text-gray-400 mt-1">AI가 추천 상품을 분석하는 중...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-white border-t border-gray-150 select-none">
          <p className="text-[10px] text-gray-500 font-bold mb-1.5 px-1 uppercase tracking-wider">추천 질문 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              '🧥 겨울 프리미엄 코트',
              '👜 선물용 최고급 가방',
              '🇮🇹 장인이 만든 이탈리아 신발',
              '🐑 캐시미어 100% 소재',
              '🇰🇷 우수한 국산 패션'
            ].map((chip) => {
              const textOnly = chip.substring(3);
              return (
                <button
                  key={chip}
                  onClick={() => handleUserQuery(textOnly + ' 추천해주세요!')}
                  className="text-[10px] py-1 px-2.5 bg-gray-100 hover:bg-[#FFE1D6] hover:text-[#C7511F] text-gray-700 border border-gray-250 hover:border-orange-300 rounded-full transition-all cursor-pointer font-medium active:scale-95"
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Input Bar */}
        <footer className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-250 focus-within:border-orange-400 focus-within:bg-white rounded-xl px-3 py-1.5 transition-all">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="코트, 이탈리아, 캐시미어 등을 검색해 보세요..."
              className="flex-1 text-xs text-gray-800 focus:outline-none bg-transparent"
              id="ai-agent-input-field"
            />
            
            <button
              onClick={() => handleUserQuery(inputValue)}
              disabled={!inputValue.trim()}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                inputValue.trim() 
                  ? 'bg-[#C7511F] text-white hover:bg-orange-700 active:scale-95' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[9px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
            <CornerDownLeft size={8} /> Enter키를 눌러 바로 전송할 수 있습니다.
          </p>
        </footer>

      </div>
    </div>
  );
}
