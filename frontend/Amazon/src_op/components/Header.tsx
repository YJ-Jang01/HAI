import React from 'react';
import { ShoppingCart, Search, Menu, Sparkles } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onSearch: (query: string, category: string) => void;
  onGoHome: () => void;
  onGoCart: () => void;
  categories: string[];
  onOpenAiAgent: () => void;
}

export default function Header({
  cartCount,
  onSearch,
  onGoHome,
  onGoCart,
  categories,
  onOpenAiAgent
}: HeaderProps) {
  const [query, setQuery] = React.useState('');
  const [selectedCat, setSelectedCat] = React.useState('All');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedCat);
  };

  const resetAndGoHome = () => {
    setQuery('');
    setSelectedCat('All');
    onGoHome();
  };

  return (
    <div className="flex flex-col" id="aimazon-header-container">
      {/* Primary Top Navbar */}
      <header className="bg-[#131921] h-[60px] text-white px-5 flex items-center justify-between gap-4 z-40 select-none">
        
        {/* Brand Logo */}
        <div 
          onClick={resetAndGoHome} 
          className="flex items-center gap-1 cursor-pointer p-1.5 border border-transparent hover:border-white rounded-sm transition-all"
          id="header-logo-container"
        >
          <span className="text-2xl font-bold text-white tracking-tight" id="header-logo-text">
            AImazon
          </span>
          <span className="text-[#febd69] font-bold text-xs pt-1.5 font-mono">.co.kr</span>
        </div>

        {/* Deliver directly to info */}
        <div className="hidden md:flex flex-col text-left p-1 border border-transparent hover:border-white rounded-sm cursor-pointer">
          <span className="text-[11px] text-gray-300 leading-tight">Deliver to</span>
          <span className="text-sm font-bold leading-tight">South Korea 🇰🇷</span>
        </div>

        {/* Search Bar Form */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="flex-1 flex h-[40px] rounded-[4px] overflow-hidden bg-white max-w-[800px] border-[2px] border-transparent focus-within:border-[#FFA41C]"
          id="header-search-form"
        >
          {/* Category Dropdown Selection */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-[#f3f3f3] hover:bg-[#e3e3e3] text-[#555] text-xs px-3.5 h-full cursor-pointer focus:outline-none border-r border-gray-300 font-sans"
            id="header-search-category-select"
          >
            <option value="All">All Departments</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Search Input text */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AImazon collections..."
            className="flex-1 text-[#111] placeholder-gray-500 text-sm px-4 focus:outline-none bg-transparent"
            id="header-search-input"
          />

          {/* Submit Icon Button */}
          <button
            type="submit"
            className="w-[45px] bg-[#febd69] hover:bg-[#f3a847] text-[#111] flex items-center justify-center transition-colors cursor-pointer"
            id="header-search-submit"
          >
            <Search size={18} className="stroke-[2.5]" />
          </button>
        </form>

        {/* Right side options */}
        <div className="flex items-center gap-3 md:gap-4 text-xs font-sans" id="header-right-actions">
          
          {/* AI Agent Trigger Button */}
          <button
            onClick={onOpenAiAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-[#C7511F] hover:from-amber-600 hover:to-orange-700 text-white font-bold transition-all border border-amber-400/20 hover:scale-[1.03] active:scale-95 cursor-pointer shadow-md select-none text-[11px] xs:text-xs"
            id="header-ai-agent-btn"
            type="button"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
            </span>
            <Sparkles size={12} className="stroke-[2.5]" />
            <span>AI Agent</span>
          </button>

          {/* Accounts & Lists */}
          <div className="hidden sm:flex flex-col text-left p-1.5 border border-transparent hover:border-white rounded-sm cursor-pointer">
            <span className="text-[11px] text-gray-300">Hello, sign in</span>
            <span className="text-sm font-bold">Account & Lists</span>
          </div>

          {/* Orders */}
          <div className="hidden sm:flex flex-col text-left p-1.5 border border-transparent hover:border-white rounded-sm cursor-pointer">
            <span className="text-[11px] text-gray-300">Returns</span>
            <span className="text-sm font-bold">& Orders</span>
          </div>

          {/* Cart Trigger */}
          <div 
            onClick={onGoCart}
            className="flex items-center gap-1.5 cursor-pointer text-white p-1.5 border border-transparent hover:border-white rounded-sm select-none relative"
            id="header-cart-btn"
          >
            <div className="relative">
              <ShoppingCart size={24} className="text-white" />
              <span 
                className="absolute -top-1 -right-1 bg-[#131921] text-[#FFA41C] font-mono font-bold text-sm h-5 w-5 rounded-full flex items-center justify-center"
                id="header-cart-badge"
              >
                {cartCount}
              </span>
            </div>
            <span className="text-sm font-bold hidden xs:inline-block">Cart</span>
          </div>
        </div>
      </header>

      {/* Sub-navigation bar */}
      <nav className="bg-[#232f3e] text-white px-5 py-1.5 text-sm select-none">
        <ul className="flex items-center gap-5 list-none p-0 m-0">
          <li 
            onClick={resetAndGoHome}
            className="flex items-center gap-1 cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm transition-all"
            id="sub-nav-all"
          >
            <Menu size={16} />
            <span className="font-bold">All</span>
          </li>
          <li className="cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm">Today's Deals</li>
          <li className="cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm">Customer Service</li>
          <li className="cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm">Registry</li>
          <li className="cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm">Gift Cards</li>
          <li className="cursor-pointer px-2 py-0.5 border border-transparent hover:border-white rounded-sm">Sell</li>
        </ul>
      </nav>
    </div>
  );
}
