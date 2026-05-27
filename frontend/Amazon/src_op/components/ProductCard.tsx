import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (id: number) => void;
  key?: React.Key | number | string;
}

export default function ProductCard({ product, onOpenDetail }: ProductCardProps) {
  const wonPrice = Math.floor(product.price * 1300);

  // Compute full and empty stars
  const fullStars = Math.floor(product.rating);
  const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    <div
      onClick={() => onOpenDetail(product.id)}
      className="bg-white border border-[#D5D9D9] rounded-md p-4 cursor-pointer hover:shadow-md hover:border-[#FFA41C] transition-all flex flex-col justify-between h-full group"
      id={`product-card-${product.id}`}
    >
      <div>
        {/* Product Image Stage */}
        <div className="relative aspect-square w-full bg-[#f7f7f7] rounded-sm overflow-hidden flex items-center justify-center p-3 mb-4">
          <img
            src={product.img}
            alt={product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          {product.origin && (
            <span 
              className="absolute top-2 left-2 bg-[#232f3e] text-[10px] text-white font-semibold py-0.5 px-2 rounded-sm border border-gray-600 shadow"
              title={`Imported from ${product.origin}`}
            >
              🇩🇪 {product.origin}
            </span>
          )}
        </div>

        {/* Product Metadata & Title */}
        <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">
          {product.subCategory || product.category}
        </p>
        <h3 className="text-sm font-medium text-[#0F1111] line-clamp-2 leading-tight mb-2 group-hover:text-[#C7511F] transition-colors h-[2.5rem] overflow-hidden">
          {product.name}
        </h3>

        {/* Gold Stars & Reviews count */}
        <div className="flex items-center gap-1.5 mb-3" id={`product-rating-${product.id}`}>
          <div className="flex items-center text-[#FFA41C] text-sm" aria-label={`Rating: ${product.rating} stars`}>
            {'★'.repeat(fullStars)}
            {halfStar ? '½' : ''}
            {'☆'.repeat(emptyStars)}
          </div>
          <span className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline">
            {product.reviewCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Pricing & Shipment indicator Footer */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-baseline gap-1" id={`product-price-container-${product.id}`}>
          <span className="text-xs font-bold text-[#B12704] font-mono">₩</span>
          <span className="text-xl font-bold font-mono text-[#0F1111]">
            {wonPrice.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 font-mono ml-1">
            (${product.price.toFixed(2)})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
          <span className="bg-[#067D62]/10 text-[#067D62] font-mono font-bold px-1.5 py-0.5 rounded-[3px] text-[10px] border border-[#067D62]/20 uppercase tracking-wider">
            FREE Delivery
          </span>
          <span>to South Korea</span>
        </div>
      </div>
    </div>
  );
}
