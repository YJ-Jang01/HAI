import { Product } from '../types';

interface HomeViewProps {
  products: Product[];
  onSelectCategory: (category: string) => void;
}

export default function HomeView({ products, onSelectCategory }: HomeViewProps) {
  // Extract distinct categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Fallback category thumb cover photo map matching our fashion products
  const categoryCovers: { [key: string]: string } = {
    Outerwear: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
    Footwears: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d60?w=600&q=80",
    Accessories: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    Tops: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80",
    Bottoms: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80"
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn" id="home-view-container">
      {/* Brand Hero Banner Section (Classic Amazon-like banner but modern) */}
      <div 
        className="relative rounded-lg overflow-hidden h-[300px] mb-8 shadow flex flex-col justify-end p-8 text-white bg-cover bg-center border border-gray-300"
        style={{
          backgroundImage: "linear-gradient(to top, rgba(19, 25, 33, 0.9) 0%, rgba(19, 25, 33, 0.3) 60%, rgba(19, 25, 33, 0.1) 100%), url('https://images-na.ssl-images-amazon.com/images/G/01/AmazonExports/Fuji/2020/May/Hero/Fuji_TallHero_Computers_1x._CB432469755_.jpg')"
        }}
        id="home-hero-banner"
      >
        <span className="text-[11px] tracking-widest font-mono uppercase bg-[#FFA41C] text-black font-bold py-1 px-3.5 rounded-sm w-max mb-3">
          ✦ AImazon Premium Fashion Event ✦
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl mb-3 text-white">
          Explore Curated K-Fashion Masterpieces
        </h1>
        <p className="text-sm md:text-base text-gray-200 max-w-xl mb-0 leading-relaxed">
          Discover cashmere coats from Australia, handcrafted boots from Italy, precision timekeepers, and more. Free shipping directly to South Korea!
        </p>
      </div>

      {/* Categories Bento Grid Section */}
      <div className="mb-6 flex flex-col" id="home-category-title-container">
        <h2 className="text-2xl font-bold text-[#0F1111] flex items-center gap-2" id="home-category-title">
          Shop by Department Collections
        </h2>
        <span className="text-xs text-gray-500 mt-1">Select a category to view tailored fashion items</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6" id="home-categories-grid">
        {categories.map(cat => {
          // Find first product of this category as fallback photo
          const matchingProduct = products.find(p => p.category === cat);
          const coverImg = categoryCovers[cat] || (matchingProduct ? matchingProduct.img : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80");
          const prettyCatName = cat;

          return (
            <div
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className="group bg-white border border-[#D5D9D9] rounded-md overflow-hidden shadow-sm hover:shadow active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-col justify-between"
              id={`category-card-${cat}`}
            >
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-base font-bold text-[#0F1111] group-hover:text-[#C7511F] transition-colors leading-snug">
                  {prettyCatName}
                </h3>
              </div>
              
              <div className="relative h-[200px] bg-[#f7f7f7] flex items-center justify-center overflow-hidden">
                <img
                  src={coverImg}
                  alt={prettyCatName}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-3.5 bg-white border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#007185] group-hover:text-[#C7511F] group-hover:underline transition-all">
                  Shop now
                </span>
                <span className="text-sm font-bold text-[#007185] group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
