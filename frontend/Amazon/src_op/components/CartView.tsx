import React from 'react';
import { CartItem, Product } from '../types';
import { ShoppingCart, Heart, RefreshCcw, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  allProducts: Product[];
  onChangeQuantity: (id: number, color: string, size: string, newQty: number) => void;
  onRemoveItem: (id: number, color: string, size: string) => void;
  onOpenDetail: (id: number) => void;
  onAddToCart: (product: Product, size: string, color: string) => void;
  onGoHome: () => void;
}

export default function CartView({
  cart,
  allProducts,
  onChangeQuantity,
  onRemoveItem,
  onOpenDetail,
  onAddToCart,
  onGoHome
}: CartViewProps) {
  const [checkoutStatus, setCheckoutStatus] = React.useState<string>('');

  // Empty cart recommendations
  const recommendedForEmpty = allProducts.slice(0, 3);
  
  // Carousel styling items based on cart trends
  const stylingIdeas = allProducts.slice(0, 4);

  // Calculations
  const totalAmountUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmountKRW = Math.floor(totalAmountUSD * 1300);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    setCheckoutStatus('Thank you for shopping on AImazon! We have simulated secure payment routing.');
  };

  // 1. Render empty cart view
  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" id="empty-cart-page">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Empty box (Column 9) */}
          <div className="lg:col-span-9 space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-sm border border-[#D5D9D9] flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
              <div className="w-[180px] md:w-[220px] shrink-0 opacity-80">
                <img 
                  src="https://m.media-amazon.com/images/G/01/cart/empty/kettle-desaturated._CB424694253_.svg" 
                  alt="Empty Cart Logo" 
                  className="w-full grayscale"
                />
              </div>
              <div className="space-y-4 text-center md:text-left flex-1 text-[#0F1111]">
                <h2 className="text-xl md:text-2xl font-bold leading-snug">
                  Your AImazon Shopping Cart is empty.
                </h2>
                <button
                  onClick={onGoHome}
                  className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer flex items-center justify-center md:justify-start gap-1 w-full md:w-auto"
                >
                  <RefreshCcw size={12} /> Shop today's hot deal event
                </button>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  The cart is a temporary place to store items you wish to purchase, indicating our real-time stock and prices.continue browsing to find tailored essentials!
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                  <button 
                    onClick={onGoHome}
                    className="bg-[#FFD814] hover:bg-[#F7CA00] text-black font-semibold text-xs py-2 px-6 rounded-full border border-[#FCD200] shadow-sm transition-all cursor-pointer select-none"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed font-sans mt-2">
              The price and availability of items are subject to change. The Cart is a tentative checklist showing each item's most recent price. <span className="text-[#007185] hover:underline cursor-pointer">Learn more</span>
              <br />
              Do you have gift code coupons? Simply check off standard items and enter codes at final payment step!
            </p>
          </div>

          {/* Right: History Recommended goods (Column 3) */}
          <aside className="lg:col-span-3 bg-white p-5 rounded-sm border border-[#D5D9D9] space-y-4 shadow-sm" id="empty-cart-sidebar">
            <h3 className="text-xs font-bold text-[#0F1111]">
              Trending Deals For You
            </h3>
            
            <div className="space-y-4">
              {recommendedForEmpty.map(p => (
                <div key={p.id} className="flex gap-3 items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <img 
                    src={p.img} 
                    alt={p.name} 
                    onClick={() => onOpenDetail(p.id)}
                    className="w-16 h-16 object-contain bg-[#f7f7f7] border border-gray-200 p-1 rounded-sm shrink-0 cursor-pointer hover:border-[#FFA41C] transition-all"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 
                      onClick={() => onOpenDetail(p.id)}
                      className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline line-clamp-2 leading-tight cursor-pointer"
                    >
                      {p.name}
                    </h4>
                    <div className="text-[11px] text-[#FFA41C] font-semibold">★ {p.rating}</div>
                    <div className="text-xs font-bold text-[#B12704] font-mono">
                      ₩{Math.floor(p.price * 1300).toLocaleString()}
                    </div>
                    <button
                      onClick={() => onAddToCart(p, 'Standard', 'Standard')}
                      className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 text-[10px] py-1 px-3 rounded-sm mt-1 transition-all shadow-xs cursor-pointer select-none"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

        </div>
      </div>
    );
  }

  // 2. Render filled cart view
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" id="shopping-cart-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Shopping Cart list card (Column 9) */}
        <div className="lg:col-span-9 bg-white p-6 md:p-8 rounded-sm border border-[#D5D9D9] shadow-sm text-[#0F1111]" id="cart-list-wrapper">
          <div className="border-b border-[#D5D9D9] pb-4 mb-4 flex justify-between items-baseline">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ShoppingCart size={22} className="text-[#0F1111]" /> Shopping Cart
            </h2>
            <span className="text-xs text-gray-500 font-semibold uppercase">Price</span>
          </div>

          <div className="divide-y divide-gray-200">
            {cart.map((item, index) => {
              const itemTotalKRW = Math.floor(item.price * item.quantity * 1300);
              return (
                <div 
                  key={`${item.id}-${item.selectedColor}-${item.selectedSize}-${index}`} 
                  className="py-5 flex flex-col sm:flex-row gap-5 items-start"
                >
                  {/* Cart Item product photo */}
                  <div 
                    onClick={() => onOpenDetail(item.id)}
                    className="w-28 h-28 md:w-32 md:h-32 shrink-0 bg-[#f7f7f7] border border-gray-200 p-2 rounded-sm flex items-center justify-center cursor-pointer hover:border-[#FFA41C] transition-all"
                  >
                    <img 
                      src={item.img} 
                      alt={item.name} 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Cart Item Detail metadata */}
                  <div className="flex-1 space-y-1.5 text-left">
                    <h3 
                      onClick={() => onOpenDetail(item.id)}
                      className="text-base font-bold text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer leading-snug line-clamp-2"
                    >
                      {item.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-600 font-semibold uppercase">
                      <span className="bg-gray-100 px-2.5 py-0.5 rounded-[3px] border border-gray-200">
                        Size: {item.selectedSize}
                      </span>
                      <span className="bg-gray-100 px-2.5 py-0.5 rounded-[3px] border border-gray-200">
                        Color: {item.selectedColor}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-pulse" /> In Stock & ready to ship
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold">Genuine Australian Premium Brand</p>

                    {/* Quantity selectors & action row */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                      {/* Qty Dropdown select size */}
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 px-2.5 py-0.5 rounded-md">
                        <span className="text-[11px] text-gray-500 uppercase">Qty</span>
                        <select
                          value={item.quantity}
                          onChange={(e) => onChangeQuantity(item.id, item.selectedColor, item.selectedSize, parseInt(e.target.value))}
                          className="bg-transparent border-0 text-xs font-bold text-[#0F1111] cursor-pointer focus:outline-none rounded py-0.5"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <option key={n} value={n} className="bg-white text-black">{n}</option>
                          ))}
                        </select>
                      </div>

                      {/* Delete buttons inline */}
                      <button
                        onClick={() => onRemoveItem(item.id, item.selectedColor, item.selectedSize)}
                        className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 size={12} /> Delete
                      </button>

                      <button
                        className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <Heart size={11} /> Save for later
                      </button>
                    </div>
                  </div>

                  {/* Pricing specs for individual item */}
                  <div className="text-right sm:self-start shrink-0">
                    <div className="text-base font-bold font-mono text-[#0F1111]">
                      ₩{itemTotalKRW.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      (${ (item.price * item.quantity).toFixed(2) })
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtotal summing Footer */}
          <div className="border-t border-gray-200 pt-5 mt-4 text-right space-y-1" id="cart-subtotal-footer">
            <span className="text-xs md:text-sm text-gray-500 uppercase font-semibold block">
              Subtotal ({totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}):
            </span>
            <div className="inline-flex flex-col items-end shrink-0">
              <span className="text-xl md:text-2xl font-bold font-mono text-[#B12704] leading-none">
                ₩{totalAmountKRW.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 font-mono mt-1">
                (${totalAmountUSD.toFixed(2)} USD)
              </span>
            </div>
          </div>
        </div>

        {/* Right order summary side checkouts sidebar (Column 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Checkout controls Box */}
          <div className="bg-white p-5 border border-[#D5D9D9] rounded-sm shadow-sm space-y-4 text-[#0F1111]" id="checkout-sidebar-card">
            {/* Delivery Eligibility statement */}
            <div className="text-xs text-emerald-800 bg-[#067D62]/10 p-3.5 rounded-sm border border-[#067D62]/20 leading-relaxed flex gap-1.5 items-start">
              <span>✦</span>
              <span>Qualifies for <b>FREE Delivery</b> to South Korea. Rapid import logistics scheduled.</span>
            </div>

            {/* Price recap */}
            <div className="space-y-1 text-left">
              <span className="text-xs text-gray-500 block">Subtotal Info</span>
              <div>
                <span className="text-2xl font-bold font-mono text-[#B12704] block">
                  ₩{totalAmountKRW.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 font-mono block">
                  (${totalAmountUSD.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Gift options */}
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="rounded accent-[#FFA41C] border-gray-300 walk focus:ring-0 cursor-pointer"
              />
              <span>This order contains a gift</span>
            </label>

            {/* Checkout notification message inline if clicked */}
            {checkoutStatus && (
              <div className="flex gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-md border border-emerald-200 tracking-tight leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
                <span>{checkoutStatus}</span>
              </div>
            )}

            {/* Proceed to checkout trigger */}
            <button
              onClick={handleCheckout}
              className="w-full bg-[#FFD814] hover:bg-[#F7CA00] active:bg-[#f5b300] text-black text-xs font-bold py-2.5 px-4 rounded-full border border-[#FCD200] shadow-sm transition-all cursor-pointer select-none text-center"
              id="proceed-checkout-btn"
            >
              Proceed to checkout
            </button>
          </div>

          {/* Styling recommendations */}
          <div className="bg-white p-5 border border-[#D5D9D9] rounded-sm shadow-sm space-y-4 text-[#0F1111]" id="styling-ideas-sidebar">
            <h4 className="text-xs font-bold text-[#0F1111]">
              Recommended for purchase
            </h4>
            
            <div className="space-y-4">
              {stylingIdeas.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <img 
                    src={item.img} 
                    alt={item.name} 
                    onClick={() => onOpenDetail(item.id)}
                    className="w-14 h-14 object-contain bg-gray-50 border border-gray-200 p-1 rounded-sm cursor-pointer hover:border-[#FFA41C] transition-all shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 space-y-1 text-left">
                    <p 
                      onClick={() => onOpenDetail(item.id)}
                      className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline line-clamp-2 leading-tight cursor-pointer"
                    >
                      {item.name}
                    </p>
                    <div className="text-xs font-bold text-[#B12704] font-mono">
                      ₩{Math.floor(item.price * 1300).toLocaleString()}
                    </div>
                    <button
                      onClick={() => onAddToCart(item, 'Standard', 'Standard')}
                      className="text-[11px] bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300 font-semibold text-gray-800 px-2.5 py-0.5 rounded-sm cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
