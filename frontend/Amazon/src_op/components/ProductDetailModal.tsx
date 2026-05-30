import React from 'react';
import { Product, Review } from '../types';
import { getOriginIcon } from '../utils/originUtils';
import { getColorGroupLabel, mapColorToCss } from '../utils/colorUtils';
import { X, ThumbsUp, ShoppingBag, ShieldCheck, AlertCircle } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  allProducts: Product[];
  reviews: Review[];
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string) => void;
  onSelectProduct: (id: number) => void;
}

export default function ProductDetailModal({
  product,
  allProducts,
  reviews,
  onClose,
  onAddToCart,
  onSelectProduct
}: ProductDetailModalProps) {
  const [selectedSize, setSelectedSize] = React.useState<string>('');
  const [selectedColor, setSelectedColor] = React.useState<string>('');
  const [activeThumb, setActiveThumb] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string>('');

  const modalRef = React.useRef<HTMLDivElement>(null);
  const reviewSectionRef = React.useRef<HTMLDivElement>(null);

  // Sync state with product shifts
  React.useEffect(() => {
    setSelectedSize('');
    setSelectedColor('');
    setErrorMsg('');
    setActiveThumb(product.img);
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [product]);

  // Won-Currency conversion
  const wonPrice = Math.floor(product.price * 1300);

  // Filter reviews specifically matching this product
  const productReviews = React.useMemo(() => {
    return reviews.filter(rev => Number(rev.productId) === Number(product.id));
  }, [reviews, product]);

  // Smooth sliding scrolling to customer reviews
  const scrollToReviews = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reviewSectionRef.current) {
      reviewSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Logic: Similarity score calculator
  const recommendedProducts = React.useMemo(() => {
    const currentKeywords = product.name.toLowerCase().split(/\s+/);
    
    return allProducts
      .filter(item => item.id !== product.id)
      .map(item => {
        let score = 0;
        if (item.category === product.category) {
          score += 10;
        }
        const itemKeywords = item.name.toLowerCase().split(/\s+/);
        const matchedWords = itemKeywords.filter(word => currentKeywords.includes(word));
        score += matchedWords.length * 2;
        return { item, score };
      })
      .filter(obj => obj.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(obj => obj.item)
      .slice(0, 5);
  }, [allProducts, product]);

  // Trigger add validation
  const handleAddSubmit = () => {
    const requiresSize = product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'Standard';
    const requiresColor = product.color && product.color.length > 0;

    const missing: string[] = [];
    if (requiresSize && !selectedSize) missing.push('Size');
    if (requiresColor && !selectedColor) missing.push('Color');

    if (missing.length > 0) {
      setErrorMsg(`Please select a ${missing.join(' and ')}.`);
      return;
    }

    setErrorMsg('');
    onAddToCart(product, selectedSize || 'Standard', selectedColor || 'Standard');
  };

  const fullStars = Math.floor(product.rating);
  const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="product-detail-overlay"
      onClick={onClose}
    >
      {/* Modal Card Layout (Clean Light Amazon Theme) */}
      <div 
        ref={modalRef}
        className="bg-white text-[#0F1111] rounded-md w-full max-w-5xl h-[88vh] overflow-y-auto shadow-2xl relative flex flex-col pt-0 scrollbar-thin border border-[#D5D9D9]"
        id="product-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header (Close Button) */}
        <div className="sticky top-0 bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between z-10">
          <span className="text-xs font-bold text-[#565959] uppercase tracking-wider flex items-center gap-1">
            <span>✦</span> Product Details Spec Board
          </span>
          <button 
            onClick={onClose}
            className="p-1 px-3 border border-gray-300 rounded-md text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none font-sans"
            id="detail-close-btn"
          >
            <X size={14} className="inline mr-1" /> Close
          </button>
        </div>

        {/* Modal Main Content Container */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* Top Half Section: Product Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left: Images Showcase (Column 5) */}
            <div className="md:col-span-5 space-y-3">
              {/* Active Image Display Board */}
              <div className="bg-[#f7f7f7] p-5 rounded-md border border-[#D5D9D9] aspect-square flex items-center justify-center h-[340px] relative">
                <img 
                  src={activeThumb || product.img} 
                  alt={product.name} 
                  className="max-h-full max-w-full object-contain transition-all duration-300"
                  referrerPolicy="no-referrer"
                  id="expanded-main-image"
                />
              </div>

              {/* Thumbnails Browser */}
              <div className="flex gap-2 justify-center overflow-x-auto py-1" id="thumb-images-scroller">
                {[product.img, ...(product.descImages || [])].map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt="thumbnail"
                    onClick={() => setActiveThumb(imgUrl)}
                    className={`w-14 h-14 object-contain p-1 border rounded-md cursor-pointer bg-white shrink-0 active:scale-95 transition-all
                      ${(activeThumb === imgUrl || (!activeThumb && imgUrl === product.img)) ? 'border-2 border-[#C7511F] ring-1 ring-[#C7511F]/30' : 'border-gray-300 hover:border-gray-400'}`}
                  />
                ))}
              </div>
            </div>

            {/* Middle: Details Specs Column (Column 4) */}
            <div className="md:col-span-4 space-y-5">
              <div>
                <span className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer uppercase tracking-widest block mb-1">
                  {product.subCategory || product.category}
                </span>
                <h1 className="text-lg md:text-xl font-bold text-[#0F1111] leading-tight" id="detail-name">
                  {product.name}
                </h1>
                
                {/* Visual Stars Rating trigger */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center text-[#FFA41C] text-sm" aria-label={`Rating: ${product.rating} stars`}>
                    {'★'.repeat(fullStars)}
                    {halfStar ? '½' : ''}
                    {'☆'.repeat(emptyStars)}
                  </div>
                  <span 
                    onClick={scrollToReviews}
                    className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer select-none"
                    id="top-ratings-anchor"
                  >
                    {product.reviewCount.toLocaleString()} ratings
                  </span>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Premium Features List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0F1111]">About this item</h4>
                <ul className="text-xs text-gray-700 space-y-2 list-disc pl-4 font-sans" id="detail-features-list">
                  {(product.features || []).map((feat, index) => (
                    <li key={index} className="leading-relaxed">
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Assistant Summary Box */}
              <div className="bg-gray-50 p-4 border border-[#e3e6e6] rounded-md space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#C7511F] bg-[#FFE1D6] border border-[#ffcfc1] px-2 py-0.5 rounded-sm w-max flex items-center gap-1 leading-none">
                  ✦ Authentic Story Summary
                </span>
                <p className="text-xs text-gray-600 leading-relaxed font-sans" id="ai-summary-text-container">
                  {product.desc}
                </p>
              </div>
            </div>

            {/* Right: Buy Controls Dashboard (Column 3) */}
            <div className="md:col-span-3 bg-white p-5 border border-[#D5D9D9] rounded-md shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Cost Panel */}
                <div>
                  <span className="text-xs text-gray-500 font-sans">Price:</span>
                  <div className="flex items-baseline gap-1 mt-0.5" id="detail-wonprice-container">
                    <span className="text-xs font-bold text-[#B12704] font-mono">₩</span>
                    <span className="text-2xl font-bold font-mono text-[#0F1111]">
                      {wonPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 font-mono ml-0.5">
                      (${product.price})
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block animate-pulse" /> In Stock & Ready to Ship
                  </p>
                </div>

                <hr className="border-gray-200" />

                {/* Size Controls */}
                {product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'Standard' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-gray-700">
                      <span>Size options:</span>
                      {selectedSize && (
                        <span className="font-bold text-[#0F1111]">
                          {selectedSize}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setErrorMsg('');
                          }}
                          className={`px-3 py-1.5 text-xs rounded-sm border cursor-pointer select-none transition-all
                            ${selectedSize === size ? 'border-[#C7511F] bg-[#FFE1D6] text-black font-semibold' : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Selection Palette */}
                {product.color && product.color.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-gray-700">
                      <span>Color options:</span>
                      <span className="font-semibold text-[#0F1111]">
                        {selectedColor ? getColorGroupLabel(selectedColor) : 'Select'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.color.map(col => {
                        const bg = mapColorToCss(col);
                        return (
                          <button
                            key={col}
                            onClick={() => {
                              setSelectedColor(col);
                              setErrorMsg('');
                            }}
                            style={{ backgroundColor: bg }}
                            className={`w-7 h-7 rounded-full border border-gray-300 shadow-inner cursor-pointer active:scale-90 transition-all relative
                              ${selectedColor === col ? 'ring-2 ring-[#C7511F] ring-offset-2 scale-105' : 'hover:scale-105'}`}
                            title={col}
                          >
                            {selectedColor === col && (
                              <span className="absolute inset-x-0 inset-y-0 rounded-full border-2 border-white pointer-events-none" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-gray-200">
                {errorMsg && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  onClick={handleAddSubmit}
                  className="w-full bg-[#FFD814] hover:bg-[#F7CA00] active:bg-[#f5b300] text-black text-xs font-bold py-2.5 px-4 rounded-full border border-[#FCD200] shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 select-none"
                  id="detail-add-cart-btn"
                >
                  <ShoppingBag size={14} /> Add to Cart
                </button>
                
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 justify-center">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  <span>Secure Transactions & Free Return Policy</span>
                </div>
              </div>
            </div>

          </div>

          <hr className="border-gray-200" />

          {/* spec blocks details table */}
          {product.productInfo && (
            <div className="space-y-3" id="additional-specs-section">
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">Product Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(product.productInfo).map(([key, val]) => (
                  <div key={key} className="bg-gray-50 p-3 border border-gray-200 rounded-sm">
                    <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-0.5">
                      {key}
                    </span>
                    <span className="text-xs font-bold text-[#0F1111] block">
                      {val || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Region Origin Story (Elegant & simple) */}
          <div className="space-y-3" id="brand-story-section">
            <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">Product Creation Story</h3>
            {product.brandImages && product.brandImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.brandImages.map((imgUrl, i) => (
                  <div key={i} className="rounded-sm overflow-hidden h-[200px] border border-gray-200 relative group shadow-sm">
                    <img 
                      src={imgUrl} 
                      alt="Brand Story" 
                      className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end text-white">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#FFA41C] mb-0.5">Premium Standards</span>
                      <h4 className="text-xs font-bold">Ethically Sourced & Mindfully Tailored</h4>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 border border-dashed border-gray-300 rounded-sm text-center bg-gray-50 text-xs">
                <p className="font-semibold text-gray-700">Authentic Crafters Network</p>
                <p className="text-gray-500 mt-1">This product adheres to eco-friendly design practices. Handled and selected for global AImazon premium collections.</p>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Similar recommended items */}
          <div className="space-y-3.5" id="detail-recommended-section">
            <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">
              Customers Who Consulted This Also Bought
            </h3>
            
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
              {recommendedProducts.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => onSelectProduct(rec.id)}
                  className="bg-white rounded-md border border-[#D5D9D9] p-3 min-w-[170px] max-w-[170px] select-none cursor-pointer hover:border-[#FFA41C] hover:shadow-sm transition-all text-center flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-square bg-gray-50 rounded-sm p-1.5 flex items-center justify-center h-[90px] mb-2">
                      <img 
                        src={rec.img} 
                        alt={rec.name} 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline line-clamp-2 text-left h-[2.5rem] overflow-hidden leading-tight">
                      {rec.name}
                    </h4>
                  </div>
                  
                  <div className="text-left mt-2.5 pt-1.5 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-[10px] font-bold text-[#B12704] font-mono">₩</span>
                    <span className="text-sm font-bold font-mono text-[#111] leading-none">
                      {Math.floor(rec.price * 1300).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Bottom Review list & Rating charts */}
          <div ref={reviewSectionRef} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2" id="section-reviews">
            
            {/* Left Score distribution panels (Column 4) */}
            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">Customer Star Ratings</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#0F1111]">{product.rating}</span>
                <span className="text-xs text-gray-500">out of 5 stars</span>
              </div>

              {/* Gold Star visual board */}
              <div className="flex items-center text-[#FFA41C] text-lg">
                {'★'.repeat(fullStars)}
                {halfStar ? '½' : ''}
                {'☆'.repeat(emptyStars)}
              </div>

              <span className="text-xs text-gray-500 block pb-2 border-b border-gray-200">
                {product.reviewCount.toLocaleString()} international customer reviews
              </span>

              {/* Progress bars indicators */}
              <div className="space-y-2 mt-4">
                {[5, 4, 3, 2, 1].map(starNum => {
                  const percent = product.ratingDetail[starNum] || 0;
                  return (
                    <div key={starNum} className="flex items-center text-xs text-gray-700 gap-2 font-mono">
                      <span className="w-12 text-right">{starNum} stars</span>
                      <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
                        <div 
                          className="bg-[#FFA41C] h-full rounded-full transition-all duration-300" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-500">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right User reviews list (Column 8) */}
            <div className="md:col-span-8 bg-white p-5 border border-[#D5D9D9] rounded-md">
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider pb-2 border-b border-gray-200 mb-4 flex items-center gap-1.5">
                💬 Top customer reviews from South Korea
              </h3>
              
              {productReviews.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-6">No matching review records found.</p>
              ) : (
                <div className="divide-y divide-gray-100 space-y-4">
                  {productReviews.map((rev) => (
                    <div key={rev.id} className="pt-4 first:pt-0 pb-1 flex flex-col gap-2">
                      {/* Review Header user avatar */}
                      <div className="flex items-center gap-2">
                        <img 
                          src="https://m.media-amazon.com/images/S/amazon-avatars-global/default._CR0,0,1024,1024_SX48_.png" 
                          alt="avatar" 
                          className="w-6 h-6 rounded-full border border-gray-200"
                        />
                        <span className="text-xs font-bold text-gray-700">
                          {rev.userName}
                        </span>
                      </div>

                      {/* Stars & Title */}
                      <div className="flex items-center gap-2">
                        <div className="flex text-[#FFA41C] text-xs">
                          {'★'.repeat(rev.rating)}
                          {'☆'.repeat(5 - rev.rating)}
                        </div>
                        <span className="text-xs font-bold text-[#0F1111]">
                          {rev.title}
                        </span>
                      </div>

                      {/* Review Date */}
                      {rev.date && (
                        <p className="text-[10px] text-gray-400 font-medium">
                          대한민국에서 {rev.date}에 작성된 리뷰
                        </p>
                      )}

                      {/* Comment text */}
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        {rev.comment}
                      </p>

                      {/* Helpful like button */}
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2">
                        <button className="flex items-center gap-1 border border-gray-300 bg-gray-50 py-1 px-3 rounded-md hover:bg-gray-100 text-gray-700 transition cursor-pointer select-none">
                          <ThumbsUp size={10} /> Helpful
                        </button>
                        <span>| Report abuse</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
