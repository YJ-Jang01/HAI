import React from 'react';
import { Product, FilterState, CartItem } from './types';
import { mockProducts } from './data/products';
import { mockReviews } from './data/reviews';
import Header from './components/Header';
import HomeView from './components/HomeView';
import ProductListArea from './components/ProductListArea';
import ProductDetailModal from './components/ProductDetailModal';
import CartView from './components/CartView';
import AddedToCartView from './components/AddedToCartView';

// Default filters state config
const INITIAL_FILTERS: FilterState = {
  mainCategory: '',
  subCategory: 'All',
  minPrice: 0,
  maxPrice: Infinity,
  minRating: 0,
  size: 'All',
  color: 'All',
  origin: 'All',
  material: 'All'
};

export default function App() {
  // Navigation states
  const [view, setView] = React.useState<'home' | 'products' | 'cart' | 'added-to-cart'>('home');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  
  // Filtering & Catalog setups
  const [filterState, setFilterState] = React.useState<FilterState>(INITIAL_FILTERS);

  // Cart subsystem persistent state with local storage
  const [cart, setCart] = React.useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('auramarket_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active detail modal ID
  const [activeProductId, setActiveProductId] = React.useState<number | null>(null);

  // Last added product metadata to present in Success Added view
  const [addedProductPayload, setAddedProductPayload] = React.useState<{
    product: Product;
    size: string;
    color: string;
  } | null>(null);

  // Synchronise cart modifications to local storage
  React.useEffect(() => {
    localStorage.setItem('auramarket_cart_v1', JSON.stringify(cart));
  }, [cart]);

  // Aggregate static department category lists
  const availableCategories = React.useMemo(() => {
    return Array.from(new Set(mockProducts.map(p => p.category)));
  }, []);

  // Track popstate for intuitive history backing on modal closure
  React.useEffect(() => {
    const handleBack = () => {
      if (activeProductId !== null) {
        setActiveProductId(null);
      }
    };
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [activeProductId]);

  // 1. Core Functions / Event Handlers

  // Handle header catalog query searching
  const handleSearch = (query: string, category: string) => {
    // Reset filters for dynamic fresh start
    setFilterState({
      ...INITIAL_FILTERS,
      mainCategory: category === 'All' ? '' : category
    });
    setSearchQuery(query);
    setView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Home navigation resets
  const handleGoHome = () => {
    setSearchQuery('');
    setFilterState(INITIAL_FILTERS);
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Transition to explicit categories
  const handleSelectCategory = (category: string) => {
    setSearchQuery('');
    setFilterState({
      ...INITIAL_FILTERS,
      mainCategory: category
    });
    setView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Set-up modal activation with state routing
  const handleOpenDetailModal = (id: number) => {
    setActiveProductId(id);
    window.history.pushState({ modalOpen: true }, '');
  };

  // Handle addition to Cart workflow
  const handleAddToCart = (product: Product, size: string, color: string) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        item => item.id === product.id && 
                item.selectedSize === size && 
                item.selectedColor === color
      );

      if (existingIndex > -1) {
        // Increment quantity multiplier if present in cart
        const copy = [...prevCart];
        copy[existingIndex].quantity += 1;
        return copy;
      } else {
        // Construct brand new item
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          img: product.img,
          selectedSize: size,
          selectedColor: color,
          quantity: 1,
          category: product.category
        };
        return [...prevCart, newItem];
      }
    });

    // Close modal if open
    setActiveProductId(null);

    // Save added details payload
    setAddedProductPayload({ product, size, color });
    setView('added-to-cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Change individual select volume sizes
  const handleChangeQuantity = (id: number, color: string, size: string, newQty: number) => {
    setCart(prevCart => {
      if (newQty <= 0) {
        return prevCart.filter(item => !(item.id === id && item.selectedColor === color && item.selectedSize === size));
      }
      return prevCart.map(item => {
        if (item.id === id && item.selectedColor === color && item.selectedSize === size) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (id: number, color: string, size: string) => {
    setCart(prevCart => prevCart.filter(
      item => !(item.id === id && item.selectedColor === color && item.selectedSize === size)
    ));
  };

  const handleFilterUpdate = (updater: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...updater }));
  };

  const handleResetFilters = () => {
    setFilterState({
      ...INITIAL_FILTERS,
      mainCategory: filterState.mainCategory // Preserve main category layer
    });
  };

  // Compute products matching search query before passes down
  const searchedProducts = React.useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    if (!rawQuery) return mockProducts;

    return mockProducts.filter(p => {
      const searchTarget = [
        p.name,
        p.category,
        p.subCategory,
        p.origin,
        p.material,
        ...(p.features || []),
        p.desc
      ].filter(Boolean).join(' ').toLowerCase();

      return searchTarget.includes(rawQuery);
    });
  }, [searchQuery]);

  // Derive dynamic catalog/search page result headers title
  const activeSearchTitle = React.useMemo(() => {
    if (searchQuery) {
      return `Search Results for "${searchQuery}"`;
    }
    if (filterState.mainCategory) {
      return `${filterState.mainCategory}`;
    }
    return "All Collections";
  }, [searchQuery, filterState.mainCategory]);

  return (
    <div className="min-h-screen bg-[#e3e6e6] flex flex-col font-sans text-[#0F1111]" id="applet-viewport">
      {/* Universal header navigation search controls */}
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onSearch={handleSearch}
        onGoHome={handleGoHome}
        onGoCart={() => { setView('cart'); window.scrollTo(0,0); }}
        categories={availableCategories}
      />

      {/* Main Responsive Canvas Views switching stage */}
      <main className="flex-1 pb-16">
        {view === 'home' && (
          <HomeView
            products={mockProducts}
            onSelectCategory={handleSelectCategory}
          />
        )}

        {view === 'products' && (
          <ProductListArea
            products={searchedProducts}
            filterState={filterState}
            onFilterChange={handleFilterUpdate}
            onResetFilters={handleResetFilters}
            onOpenDetail={handleOpenDetailModal}
            cart={cart}
            onGoCart={() => { setView('cart'); window.scrollTo(0,0); }}
            searchTitle={activeSearchTitle}
          />
        )}

        {view === 'added-to-cart' && addedProductPayload && (
          <AddedToCartView
            product={addedProductPayload.product}
            selectedColor={addedProductPayload.color}
            selectedSize={addedProductPayload.size}
            cart={cart}
            allProducts={mockProducts}
            onGoCart={() => { setView('cart'); window.scrollTo(0,0); }}
            onOpenDetail={handleOpenDetailModal}
          />
        )}

        {view === 'cart' && (
          <CartView
            cart={cart}
            allProducts={mockProducts}
            onChangeQuantity={handleChangeQuantity}
            onRemoveItem={handleRemoveItem}
            onOpenDetail={handleOpenDetailModal}
            onAddToCart={handleAddToCart}
            onGoHome={handleGoHome}
          />
        )}
      </main>

      {/* Portal Modal Details Overlay */}
      {activeProductId !== null && (
        (() => {
          const matched = mockProducts.find(x => x.id === activeProductId);
          if (!matched) return null;
          return (
            <ProductDetailModal
              product={matched}
              allProducts={mockProducts}
              reviews={mockReviews}
              onClose={() => {
                setActiveProductId(null);
                if (window.history.state && window.history.state.modalOpen) {
                  window.history.back();
                }
              }}
              onAddToCart={handleAddToCart}
              onSelectProduct={(id) => handleOpenDetailModal(id)}
            />
          );
        })()
      )}

      {/* Site-wide minimalist bottom info footer */}
      <footer className="bg-[#232f3e] text-gray-300 py-10 px-6 border-t border-[#131921] text-center text-xs">
        <div className="max-w-xl mx-auto space-y-2">
          <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
            ✦ AImazon Premium Gallery ✦
          </p>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest leading-relaxed">
            Engineered using modular React 18+ architecture & standard Amazon Web design patterns.
          </p>
          <p className="text-[10px] text-gray-500">© 2026 AImazon.co.kr. All rights reserved. Backed by express delivery networks.</p>
        </div>
      </footer>
    </div>
  );
}
