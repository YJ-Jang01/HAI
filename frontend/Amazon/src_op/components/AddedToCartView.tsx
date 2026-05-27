import React from 'react';
import { Product, CartItem } from '../types';
import { CheckCircle, ShieldCheck } from 'lucide-react';

interface AddedToCartViewProps {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  cart: CartItem[];
  allProducts: Product[];
  onGoCart: () => void;
  onOpenDetail: (id: number) => void;
}

export default function AddedToCartView({
  product,
  selectedSize,
  selectedColor,
  cart,
  allProducts,
  onGoCart,
  onOpenDetail
}: AddedToCartViewProps) {
  const [checkoutStatus, setCheckoutStatus] = React.useState<string>('');

  // Aggregate calculations
  const totalAmountUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmountKRW = Math.floor(totalAmountUSD * 1300);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Recommendations: Other items excluding current one
  const recommendations = allProducts.filter(item => item.id !== product.id).slice(0, 6);

  const handleCheckout = () => {
    setCheckoutStatus('Thank you for shopping on AImazon! Simulated checkout payment routing authorized.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fadeIn text-[#0F1111]" id="added-to-cart-wrapper">
      {/* Dynamic Success Announcement Banner */}
      <div 
        className="bg-white p-6 border border-[#D5D9D9] rounded-sm shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        id="added-to-cart-success-banner"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          {/* Green check mark */}
          <CheckCircle size={32} className="text-[#067D62] shrink-0" />
          
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#067D62] uppercase tracking-wider">
              Success: Added to Cart
            </h2>
            <div className="flex items-center gap-3">
              <img 
                src={product.img} 
                alt={product.name} 
                className="w-12 h-12 object-contain bg-white p-1 rounded-sm border border-gray-200"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold text-[#0F1111] truncate max-w-[240px] sm:max-w-xs md:max-w-sm hover:text-[#C7511F] hover:underline cursor-pointer" onClick={() => onOpenDetail(product.id)}>
                  {product.name}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                  Size: {selectedSize} | Color: {selectedColor}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action summaries widgets */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 shrink-0">
          <div className="text-center sm:text-right space-y-1">
            <span className="text-xs text-gray-500 block">
              Cart subtotal ({totalItemsCount} item{totalItemsCount > 1 ? 's' : ''})
            </span>
            <div className="text-lg md:text-xl font-bold font-mono text-[#0F1111] flex items-center justify-center sm:justify-end gap-1 leading-none">
              <span className="text-xs text-gray-400 font-bold">₩</span>
              <span className="text-[#B12704]">{totalAmountKRW.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex gap-2.5">
              <button
                onClick={onGoCart}
                className="flex-1 sm:flex-initial bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold py-2.5 px-5 rounded-full transition-all cursor-pointer select-none"
              >
                Go to Cart
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 sm:flex-initial bg-[#FFD814] hover:bg-[#F7CA00] text-black text-xs font-bold py-2.5 px-5 rounded-full border border-[#FCD200] shadow-sm transition-all cursor-pointer select-none"
              >
                Checkout
              </button>
            </div>
            {checkoutStatus && (
              <div className="flex gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-md border border-emerald-200 leading-normal max-w-[250px]">
                <ShieldCheck size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                <span>{checkoutStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended catalog related items slider */}
      <div className="bg-white p-6 border border-[#D5D9D9] rounded-sm shadow-sm text-[#0F1111]" id="added-to-cart-recommendations">
        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4 flex items-center gap-1.5">
          <span>✦</span> Products Related To Discover
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {recommendations.map(item => (
            <div
              key={item.id}
              onClick={() => onOpenDetail(item.id)}
              className="bg-white rounded-md border border-[#D5D9D9] p-3 h-full hover:border-[#FFA41C] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square bg-gray-50 rounded-sm p-1.5 flex items-center justify-center h-[90px] mb-2.5">
                  <img 
                    src={item.img} 
                    alt={item.name} 
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline line-clamp-2 leading-tight">
                  {item.name}
                </h4>
              </div>

              <div className="text-left mt-2.5 pt-1.5 border-t border-gray-100 flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-[#B12704] font-mono">₩</span>
                <span className="text-sm font-bold font-mono text-gray-900">
                  {Math.floor(item.price * 1300).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
