import React from 'react';
import { Product, FilterState, CartItem } from '../types';
import ProductCard from './ProductCard';
import { getOriginIcon } from '../utils/originUtils';
import { getColorGroupLabel, mapColorToCss } from '../utils/colorUtils';
import { SlidersHorizontal, RefreshCw, Check, Sparkles } from 'lucide-react';

interface ProductListAreaProps {
  products: Product[];
  filterState: FilterState;
  onFilterChange: (updater: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onOpenDetail: (id: number) => void;
  cart: CartItem[];
  onGoCart: () => void;
  searchTitle: string;
  onOpenAiAgent: () => void;
}

export default function ProductListArea({
  products,
  filterState,
  onFilterChange,
  onResetFilters,
  onOpenDetail,
  cart,
  onGoCart,
  searchTitle,
  onOpenAiAgent
}: ProductListAreaProps) {
  // 1. Gather all filters possibilities from current product selection
  const subCategories = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    return Array.from(new Set(pool.map(p => p.subCategory).filter(Boolean))) as string[];
  }, [products, filterState.mainCategory]);

  const maxPriceOfCurrent = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    if (pool.length === 0) return 500;
    return Math.ceil(Math.max(...pool.map(p => p.price)));
  }, [products, filterState.mainCategory]);

  const origins = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    return Array.from(new Set(pool.map(p => p.origin).filter(Boolean))) as string[];
  }, [products, filterState.mainCategory]);

  const materials = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    return Array.from(new Set(pool.map(p => p.material).filter(Boolean))) as string[];
  }, [products, filterState.mainCategory]);

  const { sizes, textSizes, numericSizes } = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    const allUniqueSizes = Array.from(new Set(pool.flatMap(p => p.sizes || []).filter(Boolean))) as string[];
    
    const group1: string[] = []; // Text/Alpha-based standard sizes
    const group2: string[] = []; // Numeric/measurement sizes
    
    allUniqueSizes.forEach(s => {
      if (/\d/.test(s)) {
        group2.push(s);
      } else {
        group1.push(s);
      }
    });

    const standardSizeMap: Record<string, number> = {
      'xs': 1,
      's': 2,
      'm': 3,
      'l': 4,
      'xl': 5,
      'xxl': 6,
      'xxxl': 7,
      'small': 11,
      'medium': 12,
      'large': 13,
      'mini': 20,
      'compact': 21,
      'standard': 22,
      'free': 30,
      'free size': 31,
      'one size': 32,
    };

    const getStandardSizeScore = (val: string): number => {
      const norm = val.trim().toLowerCase();
      if (standardSizeMap[norm] !== undefined) return standardSizeMap[norm];
      for (const key of Object.keys(standardSizeMap)) {
        if (norm.includes(key)) return standardSizeMap[key] + 0.5;
      }
      return 999;
    };

    const sortedText = [...group1].sort((a, b) => {
      const scoreA = getStandardSizeScore(a);
      const scoreB = getStandardSizeScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.localeCompare(b);
    });

    const getNumericValue = (val: string): number => {
      const match = val.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const sortedNumeric = [...group2].sort((a, b) => {
      const numA = getNumericValue(a);
      const numB = getNumericValue(b);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    return {
      sizes: [...sortedText, ...sortedNumeric],
      textSizes: sortedText,
      numericSizes: sortedNumeric
    };
  }, [products, filterState.mainCategory]);

  // Aggregate color groups used across current products catalog
  const availableColorGroups = React.useMemo(() => {
    const pool = filterState.mainCategory 
      ? products.filter(p => p.category === filterState.mainCategory)
      : products;
    const colorGroupMap = new Map<string, string>();
    pool.forEach(p => {
      const colors = p.color || [];
      colors.forEach(col => {
        if (!col) return;
        const groupLabel = getColorGroupLabel(col);
        if (!colorGroupMap.has(groupLabel)) {
          colorGroupMap.set(groupLabel, mapColorToCss(col));
        }
      });
    });
    return Array.from(colorGroupMap.entries());
  }, [products, filterState.mainCategory]);

  // 2. Perform Filtering logic inside Component to ensure immediate feedback
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      // Main category matching
      if (filterState.mainCategory && p.category !== filterState.mainCategory) return false;
      
      // Sub category matching 
      if (filterState.subCategory !== 'All' && p.subCategory !== filterState.subCategory) return false;

      // Price limit checking
      if (p.price > filterState.maxPrice) return false;

      // Rating limits 
      if (p.rating < filterState.minRating) return false;

      // Color selection matching
      if (filterState.color !== 'All') {
        const prodColorsGroupLabels = p.color.map(col => getColorGroupLabel(col));
        if (!prodColorsGroupLabels.includes(filterState.color)) return false;
      }

      // Size matching
      if (filterState.size !== 'All' && p.sizes && !p.sizes.includes(filterState.size)) return false;

      // Origin checking
      if (filterState.origin !== 'All' && p.origin !== filterState.origin) return false;

      // Material checking
      if (filterState.material !== 'All' && p.material !== filterState.material) return false;

      return true;
    });
  }, [products, filterState]);

  // Calculate Order sum for sticky mini-cart on right sidebar
  const cartSubtotalUSD = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const cartSubtotalKRW = Math.floor(cartSubtotalUSD * 1300);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 animate-fadeIn" id="product-list-page-container">
      <div className="flex flex-col lg:flex-row gap-6 relative items-start">
        
        {/* Left Side: Filter Sidebar Panel (Clean Amazon style) */}
        <aside className="w-full lg:w-[230px] shrink-0 bg-white border border-[#D5D9D9] p-5 rounded-md shadow-sm" id="filters-panel">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-200">
            <span className="text-sm font-bold text-[#0F1111] flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-[#0F1111]" /> Filters
            </span>
            <button
              onClick={onResetFilters}
              className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={9} /> Reset
            </button>
          </div>

          {/* Main Category (Department) Selection */}
          <div className="mb-6 filter-section">
            <h4 className="text-xs font-bold text-[#0F1111] mb-2">Departments</h4>
            <ul className="space-y-1 text-xs text-[#0F1111]">
              <li
                onClick={() => onFilterChange({ mainCategory: '', subCategory: 'All' })}
                className={`py-1 px-2.5 rounded-sm cursor-pointer hover:bg-gray-100 transition-all ${!filterState.mainCategory ? 'font-bold text-[#C7511F]' : 'text-[#0F1111]'}`}
              >
                All Departments
              </li>
              {['Outerwear', 'Tops', 'Bottoms', 'Footwears', 'Accessories'].map(cat => (
                <li
                  key={cat}
                  onClick={() => onFilterChange({ mainCategory: cat, subCategory: 'All' })}
                  className={`py-1 px-2.5 rounded-sm cursor-pointer hover:bg-gray-100 transition-all ${filterState.mainCategory === cat ? 'font-bold text-[#C7511F]' : ''}`}
                >
                  {cat === 'Footwears' ? 'Footwear' : cat}
                </li>
              ))}
            </ul>
          </div>

          {/* Subcategory (Sub-department) Selection */}
          {filterState.mainCategory && subCategories.length > 0 && (
            <div className="mb-6 filter-section">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">
                {filterState.mainCategory === 'Footwears' ? 'Footwear' : filterState.mainCategory} Styles
              </h4>
              <ul className="space-y-1 text-xs text-gray-700">
                <li
                  onClick={() => onFilterChange({ subCategory: 'All' })}
                  className={`py-1 px-2.5 rounded-sm cursor-pointer hover:bg-gray-100 transition-all ${filterState.subCategory === 'All' ? 'font-bold text-[#C7511F]' : ''}`}
                >
                  All {filterState.mainCategory === 'Footwears' ? 'Footwear' : filterState.mainCategory}
                </li>
                {subCategories.map(sub => (
                  <li
                    key={sub}
                    onClick={() => onFilterChange({ subCategory: sub })}
                    className={`py-1 px-2.5 rounded-sm cursor-pointer hover:bg-gray-100 transition-all ${filterState.subCategory === sub ? 'font-bold text-[#C7511F]' : ''}`}
                  >
                    {sub}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing Slider Filter */}
          <div className="mb-6 filter-section">
            <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price Range</h4>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={maxPriceOfCurrent}
                value={filterState.maxPrice === Infinity ? maxPriceOfCurrent : filterState.maxPrice}
                onChange={(e) => onFilterChange({ maxPrice: parseFloat(e.target.value) })}
                className="w-full accent-[#C7511F] h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                id="price-slider"
              />
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>$0</span>
                <span className="font-bold text-[#0F1111]">
                  Up to ${filterState.maxPrice === Infinity ? maxPriceOfCurrent : filterState.maxPrice}
                </span>
              </div>
            </div>
          </div>

          {/* Sizes filter list */}
          {sizes.length > 0 && filterState.mainCategory !== 'Accessories' && (
            <div className="mb-6 filter-section">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Sizes</h4>
              
              {/* Row 1: Traditional alphabetic/text sizes (plus default All button) */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => onFilterChange({ size: 'All' })}
                  className={`px-2.5 py-1.5 text-xs rounded-sm border cursor-pointer select-none transition-all ${filterState.size === 'All' ? 'bg-[#FFE1D6] border-[#C7511F] text-[#C7511F] font-bold' : 'bg-white border-[#D5D9D9] text-[#0F1111] hover:border-[#C7511F]'}`}
                >
                  All
                </button>
                {textSizes.map(s => (
                  <button
                    key={s}
                    onClick={() => onFilterChange({ size: s })}
                    className={`px-2.5 py-1.5 text-xs rounded-sm border cursor-pointer select-none transition-all ${filterState.size === s ? 'bg-[#FFE1D6] border-[#C7511F] text-[#C7511F] font-bold' : 'bg-white border-[#D5D9D9] text-[#0F1111] hover:border-[#C7511F]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Row 2: Numeric sizes like 90, 110, 230 etc. */}
              {numericSizes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-dashed border-gray-100 pt-2.5 mt-2">
                  {numericSizes.map(s => (
                    <button
                      key={s}
                      onClick={() => onFilterChange({ size: s })}
                      className={`px-2.5 py-1.5 text-xs rounded-sm border cursor-pointer select-none transition-all ${filterState.size === s ? 'bg-[#FFE1D6] border-[#C7511F] text-[#C7511F] font-bold' : 'bg-white border-[#D5D9D9] text-[#0F1111] hover:border-[#C7511F]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Score Reviews limits */}
          <div className="mb-6 filter-section">
            <h4 className="text-xs font-bold text-[#0F1111] mb-2">Customer Reviews</h4>
            <ul className="space-y-2 text-xs">
              <li
                onClick={() => onFilterChange({ minRating: 4 })}
                className={`flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-sm hover:bg-gray-100 transition-colors ${filterState.minRating === 4 ? 'font-bold text-[#C7511F]' : 'text-gray-700'}`}
              >
                <span className="text-[#FFA41C] text-xs">★★★★☆</span>
                <span className="text-[11px]">& Up</span>
              </li>
              <li
                onClick={() => onFilterChange({ minRating: 3 })}
                className={`flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-sm hover:bg-gray-100 transition-colors ${filterState.minRating === 3 ? 'font-bold text-[#C7511F]' : 'text-gray-700'}`}
              >
                <span className="text-[#FFA41C] text-xs">★★★☆☆</span>
                <span className="text-[11px]">& Up</span>
              </li>
              <li
                onClick={() => onFilterChange({ minRating: 0 })}
                className={`flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-sm hover:bg-gray-100 transition-colors ${filterState.minRating === 0 ? 'font-bold text-[#C7511F]' : 'text-gray-700'}`}
              >
                <span className="text-gray-400 text-xs">☆☆☆☆☆</span>
                <span className="text-[11px]">All Ratings</span>
              </li>
            </ul>
          </div>

          {/* Colors palette filters */}
          {availableColorGroups.length > 0 && (
            <div className="mb-6 filter-section">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Colors</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onFilterChange({ color: 'All' })}
                  className={`w-7 h-7 rounded-full border text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all ${filterState.color === 'All' ? 'border-[#C7511F] bg-[#FFE1D6] text-[#C7511F]' : 'border-[#D5D9D9] bg-white text-gray-700 hover:border-gray-500'}`}
                  title="Clear color filter"
                >
                  All
                </button>
                {availableColorGroups.map(([label, bg]) => (
                  <button
                    key={label}
                    onClick={() => onFilterChange({ color: label })}
                    style={{ backgroundColor: bg }}
                    className={`w-7 h-7 rounded-full border border-gray-300 shadow-sm cursor-pointer transition-all relative ${filterState.color === label ? 'ring-2 ring-[#C7511F] ring-offset-1 scale-105' : 'hover:scale-105'}`}
                    title={label}
                  >
                    {filterState.color === label && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check size={12} className={label.toLowerCase() === 'white' ? 'text-black' : 'text-white'} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Material Options */}
          {materials.length > 0 && (
            <div className="mb-6 filter-section">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Materials</h4>
              <ul className="space-y-1 text-xs">
                <li
                  onClick={() => onFilterChange({ material: 'All' })}
                  className={`py-1.5 px-2 rounded-sm cursor-pointer hover:bg-gray-100 transition-colors ${filterState.material === 'All' ? 'font-bold text-[#C7511F]' : 'text-gray-700'}`}
                >
                  All Materials
                </li>
                {materials.map(mat => (
                  <li
                    key={mat}
                    onClick={() => onFilterChange({ material: mat })}
                    className={`py-1.5 px-2 rounded-sm cursor-pointer hover:bg-gray-100 transition-all ${filterState.material === mat ? 'font-bold text-[#C7511F]' : 'text-gray-700'}`}
                  >
                    {mat}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Genuine Region Origin */}
          {origins.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Origin</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => onFilterChange({ origin: 'All' })}
                  className={`w-8 h-8 rounded-full border text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all ${filterState.origin === 'All' ? 'border-[#C7511F] bg-[#FFE1D6] text-[#C7511F] ring-2 ring-[#C7511F] ring-offset-1 font-bold' : 'border-[#D5D9D9] bg-white text-gray-700 hover:border-gray-500'}`}
                  title="All Origins"
                >
                  🌏
                </button>
                {origins.map(ori => (
                  <button
                    key={ori}
                    onClick={() => onFilterChange({ origin: ori })}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-base cursor-pointer transition-all relative ${filterState.origin === ori ? 'border-[#C7511F] bg-[#FFE1D6] ring-2 ring-[#C7511F] ring-offset-1 scale-105' : 'border-[#D5D9D9] bg-white hover:border-gray-500 hover:scale-105'}`}
                    title={ori}
                  >
                    <span className="select-none leading-none">{getOriginIcon(ori)}</span>
                    {filterState.origin === ori && (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-[#C7511F] text-white rounded-full p-0.5 border border-white">
                        <Check size={8} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Central Component: Grid Product list */}
        <div className="flex-1 min-w-0" id="products-catalog-screen">
          <div className="mb-5 pb-3 border-b border-gray-300">
            <h2 className="text-xl font-bold text-[#0F1111] tracking-tight">
              {searchTitle === "All Collections" ? "All Fashion Collection" : searchTitle}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Showing {filteredProducts.length} premium fashion items
            </p>
          </div>

          {/* AI Advisor Prompt Block when searching is active */}
          {(searchTitle.includes("Search Results") || searchTitle !== "All Collections") && (
            <div 
              onClick={onOpenAiAgent}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-300 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all relative overflow-hidden group select-none"
              id="search-ai-prompt-banner"
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-200/25 rounded-full blur-xl group-hover:bg-amber-200/35 transition-all pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-inner text-xl leading-none shrink-0 animate-bounce">
                    🤖
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-orange-850 flex items-center gap-1.5 leading-none">
                      AI 쇼핑 메이트 <Sparkles size={11} className="text-[#C7511F] fill-[#FFE1D6]" />
                    </h4>
                    <p className="text-xs text-gray-700 font-medium mt-1.5 leading-relaxed">
                      검색 조건에 맞는 스타일, 어울리는 소재, 다른 사이즈가 더 있는지 궁금하신가요?{' '}
                      <span className="text-[#C7511F] font-bold underline hover:text-orange-700 transition-colors">
                        AI에게 물어보세요!
                      </span>
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); onOpenAiAgent(); }}
                  className="self-end sm:self-auto px-4 py-1.5 bg-[#C7511F] hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>AI 상담 열기</span>
                  <Sparkles size={10} />
                </button>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#D5D9D9] p-8 rounded-md shadow-sm" id="no-products-fallback">
              <span className="text-4xl inline-block mb-3">🔍</span>
              <h3 className="text-lg font-bold text-[#0F1111]">No matching items found</h3>
              <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                No items in our inventory match your current search queries or filters. Try adjusting your selections inside the filters panel.
              </p>
              <button
                onClick={onResetFilters}
                className="mt-6 px-5 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#111] border border-[#FCD200] rounded-full text-xs font-semibold tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" id="products-grid-inner">
              {filteredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Order Summary sticky container (shows only when cart has items) */}
        {cart.length > 0 && (
          <aside 
            className="w-full lg:w-[250px] shrink-0 lg:sticky lg:top-[95px] bg-white border border-[#D5D9D9] p-5 rounded-md shadow-md"
            id="product-list-order-summary-sidebar"
          >
            <h3 className="text-sm font-bold text-[#0F1111] tracking-wide mb-3 border-b border-gray-100 pb-2">
              Order Summary
            </h3>
            
            <div className="max-h-[220px] overflow-y-auto mb-4 space-y-3 pr-1 scrollbar-thin">
              {cart.slice(-4).reverse().map((item, index) => (
                <div 
                  key={`${item.id}-${item.selectedColor}-${item.selectedSize}-${index}`} 
                  className="flex gap-2.5 items-center p-2 bg-gray-50 rounded-sm border border-gray-100 hover:border-gray-300 transition-colors shadow-sm"
                >
                  <img 
                    src={item.img} 
                    alt={item.name}
                    className="w-10 h-10 object-contain bg-white p-1 rounded-sm border border-gray-200 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#0F1111] truncate mb-0.5 font-sans">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-mono">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-xs font-bold text-[#B12704] font-mono">
                        ₩{Math.floor(item.price * 1300 * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3.5 space-y-2 mb-4">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Total Items</span>
                <span className="font-bold text-gray-800">{cart.reduce((s,i)=>s+i.quantity, 0)} items</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-gray-100 pt-2.5">
                <span className="text-sm font-bold text-gray-700">Subtotal</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#B12704] font-mono leading-none mb-1">
                    ₩{cartSubtotalKRW.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    (${cartSubtotalUSD.toFixed(2)})
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onGoCart}
              className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#111] text-xs font-bold py-2.5 px-4 rounded-full border border-[#FCD200] shadow-sm transition-colors cursor-pointer select-none text-center"
            >
              Proceed to Cart
            </button>
          </aside>
        )}

      </div>
    </div>
  );
}
