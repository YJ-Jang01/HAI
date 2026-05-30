import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCategories,
  getCategoryColorFilters,
  getColorGroupLabel,
  getProductReviews,
  getRelatedProducts,
  loadCatalog,
  getSubCategories,
  mapColorToCss,
  formatKrw,
  formatUsd,
} from "./data.js";

const buttonBase = "cursor-pointer border-0 text-sm transition disabled:cursor-not-allowed disabled:opacity-60";
const pillButton = `${buttonBase} rounded-full px-5 py-2`;

function stars(rating, size = "text-sm") {
  const full = Math.max(0, Math.min(5, Math.floor(Number(rating) || 0)));
  return <span className={`${size} tracking-normal text-[#ffa41c]`}>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>;
}

function ImageBox({ src, alt, className = "", imgClassName = "object-contain" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-[#f7f7f7] ${className}`}>
      {(!src || failed || !loaded) ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#eef0f2] px-4 text-center text-xs font-semibold leading-snug text-[#565959]">
          {alt || "Image unavailable"}
        </div>
      ) : null}
      {src && !failed ? (
        <img
          className={`relative h-full w-full transition-opacity ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

function Header({ categories, searchText, searchCategory, cartCount, onSearchTextChange, onSearchCategoryChange, onSearch, onHome, onCart }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="flex min-h-[64px] items-center gap-4 bg-[#131921] px-4 py-2 text-white max-[760px]:flex-wrap">
        <button className="cursor-pointer border border-transparent px-2 py-1 text-2xl font-bold tracking-normal hover:border-white" type="button" onClick={onHome}>
          AImazon
        </button>

        <form className="flex min-h-[42px] flex-1 overflow-hidden rounded bg-white max-[760px]:order-3 max-[760px]:basis-full" onSubmit={onSearch}>
          <select
            className="w-[124px] border-0 border-r border-r-[#cdcdcd] bg-[#f3f3f3] px-2 text-sm text-[#333] outline-none max-[520px]:w-[92px]"
            value={searchCategory}
            onChange={(event) => onSearchCategoryChange(event.target.value)}
            aria-label="Search category"
          >
            <option value="All">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            className="min-w-0 flex-1 border-0 px-4 text-[15px] text-[#111827] outline-none"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search AImazon"
            aria-label="Search AImazon"
          />
          <button className="flex w-[54px] cursor-pointer items-center justify-center border-0 bg-[#febd69] text-xl hover:bg-[#f3a847]" type="submit" aria-label="Search">
            🔍
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <button className="hidden cursor-pointer border border-transparent px-2 py-1 text-left text-xs hover:border-white sm:block" type="button">
            <span className="block text-[11px] leading-3">Hello, sign in</span>
            <b className="text-sm leading-4">Account & Lists</b>
          </button>
          <button className="cursor-pointer border border-transparent px-2 py-1 text-left hover:border-white" type="button" onClick={onCart}>
            <span className="text-sm font-bold">Cart</span>
            <span className="ml-1 text-base font-bold text-[#ffa41c]">{cartCount}</span>
          </button>
        </div>
      </div>

      <nav className="bg-[#232f3e] px-4 py-1 text-white" aria-label="Secondary navigation">
        <ul className="flex items-center gap-5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <button className="whitespace-nowrap border border-transparent px-1 py-1 hover:border-white" type="button" onClick={onHome}>
              ☰ All
            </button>
          </li>
          <li className="whitespace-nowrap px-1 py-1">Today's Deals</li>
          <li className="whitespace-nowrap px-1 py-1">Customer Service</li>
          <li className="whitespace-nowrap px-1 py-1">Registry</li>
          <li className="whitespace-nowrap px-1 py-1">Gift Cards</li>
          <li className="whitespace-nowrap px-1 py-1">Sell</li>
        </ul>
      </nav>
    </header>
  );
}

function Home({ categories, products, onCategorySelect }) {
  return (
    <main className="mx-auto grid max-w-[1500px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 p-5">
      {categories.map((category) => {
        const representative = products.find((product) => product.category === category);
        return (
          <button
            key={category}
            className="group min-h-[390px] cursor-pointer bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            type="button"
            onClick={() => onCategorySelect(category)}
          >
            <h2 className="mb-3 text-[21px] font-bold tracking-normal text-[#0f1111]">Shop {category}</h2>
            <ImageBox className="h-[300px] w-full" imgClassName="object-cover" src={representative?.img} alt={category} />
            <div className="mt-4 text-sm text-[#007185] group-hover:text-[#c7511f] group-hover:underline">Shop now</div>
          </button>
        );
      })}
    </main>
  );
}

function ProductCard({ product, onOpen }) {
  return (
    <button className="group cursor-pointer bg-white p-2 text-left" type="button" onClick={() => onOpen(product)} aria-label={product.name}>
      <ImageBox className="aspect-square rounded" src={product.img} alt={product.name} />
      <div className="mt-2 grid gap-1">
        <h3 className="line-clamp-2 min-h-[38px] text-sm leading-[1.35] text-[#0f1111] group-hover:text-[#c7511f] group-hover:underline">{product.name}</h3>
        <div className="flex items-center gap-1">
          {stars(product.rating)}
          <span className="text-xs text-[#007185]">{product.reviewCount}</span>
        </div>
        <div className="text-xl font-bold text-[#0f1111]">{formatUsd(product.price)}</div>
        <div className="text-xs text-[#565959]">FREE delivery</div>
      </div>
    </button>
  );
}

function FilterSidebar({ category, products, filters, onFilterChange }) {
  const subCategories = useMemo(() => getSubCategories(products, category), [category, products]);
  const colorFilters = useMemo(() => getCategoryColorFilters(products, category), [category, products]);
  const maxPrice = useMemo(() => {
    const prices = products.filter((product) => product.category === category).map((product) => product.priceNumber);
    return Math.max(...prices, 500);
  }, [category, products]);

  return (
    <aside className="w-[220px] shrink-0 bg-white px-5 py-4 max-[900px]:w-full max-[900px]:border-b max-[900px]:border-b-[#ddd]">
      <div className="grid gap-5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
        <section>
          <h3 className="mb-2 text-sm font-bold">Department</h3>
          <div className="grid gap-1 text-sm">
            <button className={`text-left hover:text-[#c7511f] hover:underline ${filters.subCategory === "All" ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("subCategory", "All")}>
              All {category}
            </button>
            {subCategories.map((subCategory) => (
              <button
                key={subCategory}
                className={`text-left hover:text-[#c7511f] hover:underline ${filters.subCategory === subCategory ? "font-bold" : ""}`}
                type="button"
                onClick={() => onFilterChange("subCategory", subCategory)}
              >
                {subCategory}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">Price</h3>
          <input
            className="w-full accent-[#c7511f]"
            type="range"
            min="0"
            max={Math.ceil(maxPrice)}
            value={Math.min(filters.maxPrice, Math.ceil(maxPrice))}
            onChange={(event) => onFilterChange("maxPrice", Number(event.target.value))}
            aria-label="Maximum price"
          />
          <div className="mt-1 text-xs text-[#565959]">Up to {formatUsd(filters.maxPrice)}</div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">Customer Review</h3>
          <div className="grid gap-1 text-sm">
            {[4, 3].map((rating) => (
              <button key={rating} className="text-left hover:text-[#c7511f] hover:underline" type="button" onClick={() => onFilterChange("minRating", rating)}>
                {stars(rating)} <span className={filters.minRating === rating ? "font-bold" : ""}>& Up</span>
              </button>
            ))}
            <button className="text-left text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={() => onFilterChange("minRating", 0)}>
              Clear rating
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">Color</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] ${filters.color === "All" ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#ccc]"}`}
              type="button"
              onClick={() => onFilterChange("color", "All")}
              aria-label="All colors"
            >
              All
            </button>
            {colorFilters.map((color) => (
              <button
                key={color.label}
                className={`h-8 w-8 rounded-full border ${filters.color === color.label ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#ccc]"}`}
                type="button"
                style={{ background: color.css }}
                onClick={() => onFilterChange("color", color.label)}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function CartSummary({ cart, onCart }) {
  if (cart.length === 0) return null;
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceNumber * 1300 * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="w-[300px] shrink-0 max-[1180px]:hidden">
      <div className="sticky top-[120px] rounded-lg border border-[#ddd] bg-white p-4">
        <h3 className="mb-3 text-base font-bold">Order Summary</h3>
        <div className="mb-4 max-h-[260px] overflow-y-auto pr-1">
          {cart.map((item) => (
            <div key={item.key} className="mb-2 flex gap-2 rounded border border-[#f0f0f0] bg-[#fdfdfd] p-2">
              <ImageBox className="h-[58px] w-[58px] shrink-0 rounded" src={item.product.img} alt={item.product.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{item.product.name}</div>
                <div className="mt-1 text-xs text-[#565959]">Qty {item.quantity}</div>
                <div className="text-sm font-bold text-[#b12704]">{formatKrw(item.product.priceNumber * item.quantity)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span>Items: <b>{itemCount}</b></span>
          <span className="font-bold text-[#b12704]">₩ {subtotal.toLocaleString("ko-KR")}</span>
        </div>
        <button className={`${pillButton} w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button" onClick={onCart}>
          Proceed to Checkout
        </button>
      </div>
    </aside>
  );
}

function ProductListing({ listing, products, filters, cart, onFilterChange, onOpenProduct, onCart }) {
  const filteredProducts = useMemo(() => {
    const query = listing.query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = !listing.category || product.category === listing.category;
      const queryMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.subCategory?.toLowerCase().includes(query) ||
        product.keyword?.toLowerCase().includes(query);
      const subCategoryMatch = !listing.category || filters.subCategory === "All" || product.subCategory === filters.subCategory;
      const priceMatch = !listing.category || product.priceNumber <= filters.maxPrice;
      const ratingMatch = !listing.category || product.rating >= filters.minRating;
      const colorMatch = !listing.category || filters.color === "All" || product.colors.some((color) => filters.color === getColorGroupLabel(color));
      return categoryMatch && queryMatch && subCategoryMatch && priceMatch && ratingMatch && colorMatch;
    });
  }, [filters, listing, products]);

  const title = listing.query
    ? `Search results for "${listing.query}"`
    : listing.category
      ? `Results for "${listing.category}"`
      : "All Products";

  return (
    <main className="bg-white">
      <div className="border-b border-b-[#ddd] bg-white px-5 py-3 shadow-sm">
        <h2 className="text-2xl font-normal tracking-normal">{title}</h2>
        <p className="text-sm text-[#565959]">{filteredProducts.length} items found</p>
      </div>

      <div className="flex items-start gap-5 max-[900px]:block">
        {listing.category ? <FilterSidebar category={listing.category} products={products} filters={filters} onFilterChange={onFilterChange} /> : null}
        <section className="min-w-0 flex-1 p-5">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={onOpenProduct} />
              ))}
            </div>
          ) : (
            <div className="rounded border border-[#ddd] bg-[#f7fafa] p-6 text-sm text-[#565959]">No results match your filters.</div>
          )}
        </section>
        <CartSummary cart={cart} onCart={onCart} />
      </div>
    </main>
  );
}

function SmallProductCard({ product, onOpen }) {
  return (
    <button className="min-w-[160px] max-w-[170px] cursor-pointer p-2 text-left" type="button" onClick={() => onOpen(product)}>
      <ImageBox className="h-[150px] w-full rounded" src={product.img} alt={product.name} />
      <p className="line-clamp-2 mt-2 min-h-[36px] text-sm leading-[1.35] text-[#007185] hover:text-[#c7511f] hover:underline">{product.name}</p>
      <p className="mt-1 text-sm font-bold text-[#b12704]">{formatUsd(product.price)}</p>
    </button>
  );
}

function RatingBars({ product }) {
  return (
    <div className="grid gap-2">
      {[5, 4, 3, 2, 1].map((ratingValue) => {
        const percentage = Number(product.ratingDetail?.[ratingValue] ?? 0);
        return (
          <div key={ratingValue} className="grid grid-cols-[46px_minmax(0,1fr)_40px] items-center gap-2 text-sm text-[#007185]">
            <span>{ratingValue} star</span>
            <div className="h-5 overflow-hidden rounded border border-[#c7c7c7] bg-[#f0f2f2]">
              <div className="h-full bg-[#ffa41c]" style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-right">{percentage}%</span>
          </div>
        );
      })}
    </div>
  );
}

function DetailModal({ product, reviews, relatedProducts, onClose, onAddToCart, onOpenProduct }) {
  const allImages = useMemo(() => [product.img, ...product.descImages, ...product.brandImages].filter(Boolean), [product]);
  const [mainImage, setMainImage] = useState(allImages[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setMainImage(allImages[0]);
    setSelectedSize(product.sizes[0] ?? "");
    setSelectedColor(product.colors[0] ?? "");
    setQuantity(1);
  }, [allImages, product]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleAdd = () => {
    onAddToCart(product, { selectedSize, selectedColor, quantity });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={onClose}>
      <div className="relative h-[95vh] w-[min(96vw,1420px)] overflow-y-auto rounded-lg bg-white p-6 shadow-xl scroll-smooth" onMouseDown={(event) => event.stopPropagation()}>
        <button className="absolute right-5 top-3 z-20 cursor-pointer text-4xl leading-none text-[#555] hover:text-black" type="button" onClick={onClose} aria-label="Close detail">
          ×
        </button>

        <nav className="sticky top-[-24px] z-10 -mx-6 -mt-6 mb-6 border-b border-b-[#ddd] bg-white px-6 py-3">
          <ul className="flex gap-6 overflow-x-auto pr-12 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-bought-together">Bought together</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-from-brand">From the brand</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-related">Related products</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-reviews">Customer reviews</a></li>
          </ul>
        </nav>

        <div className="grid grid-cols-[minmax(280px,1fr)_minmax(340px,1.2fr)_300px] gap-7 max-[1120px]:grid-cols-[1fr_1fr] max-[760px]:grid-cols-1">
          <section className="flex gap-3">
            <div className="flex w-[54px] shrink-0 flex-col gap-2">
              {allImages.slice(0, 7).map((image, index) => (
                <button key={`${image}-${index}`} className={`h-[54px] w-[54px] rounded border ${mainImage === image ? "border-[#ffa41c] shadow-[0_0_3px_#ffa41c]" : "border-[#d5d9d9]"}`} type="button" onClick={() => setMainImage(image)}>
                  <ImageBox className="h-full w-full rounded" src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
            <ImageBox className="min-h-[420px] flex-1 rounded bg-white max-[760px]:min-h-[300px]" src={mainImage} alt={product.name} />
          </section>

          <section>
            <h1 id="detail-title" className="mb-2 text-2xl font-medium tracking-normal text-[#0f1111]">{product.name}</h1>
            <div className="relative mb-3 flex w-fit items-center gap-2">
              {stars(product.rating, "text-lg")}
              <span className="text-sm text-[#565959]">{product.rating} out of 5</span>
              <a className="text-sm text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-reviews">{product.reviewCount} ratings</a>
            </div>
            <hr className="my-4 border-[#e7e7e7]" />
            <div className="mb-4">
              <span className="mr-2 text-sm text-[#565959]">Price:</span>
              <span className="text-3xl text-[#b12704]">{formatUsd(product.price)}</span>
            </div>

            {product.sizes.length ? (
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold">Size</div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button key={size} className={`min-h-[36px] rounded border px-3 text-sm ${selectedSize === size ? "border-[#c7511f] bg-[#fff7ed]" : "border-[#d5d9d9] bg-white"}`} type="button" onClick={() => setSelectedSize(size)}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.colors.length ? (
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold">Color <span className="font-normal text-[#565959]">{selectedColor}</span></div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={`h-9 w-9 rounded-full border ${selectedColor === color ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#d5d9d9]"}`}
                      style={{ background: mapColorToCss(color) }}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      aria-label={color}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <h3 className="mb-2 text-lg font-bold">About this item</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#0f1111]">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="max-[1120px]:col-span-2 max-[760px]:col-span-1">
            <div className="sticky top-12 rounded-lg border border-[#d5d9d9] bg-white p-5">
              <p className="mb-3 text-3xl text-[#b12704]">{formatUsd(product.price)}</p>
              <p className="mb-3 text-sm">FREE delivery <b>Tuesday, May 12</b></p>
              <p className="mb-4 text-lg font-bold text-[#007600]">In Stock</p>
              <label className="mb-4 flex items-center gap-2 text-sm">
                Qty
                <select className="rounded border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button className={`${pillButton} mb-3 w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button" onClick={handleAdd}>Add to Cart</button>
              <button className={`${pillButton} w-full bg-[#ffa41c] hover:bg-[#fa8900]`} type="button">Buy Now</button>
            </div>
          </aside>
        </div>

        <section id="section-bought-together" className="mt-10 border-t border-t-[#eee] pt-6">
          <h3 className="mb-3 text-xl font-bold tracking-normal">Products customers bought together</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {relatedProducts.slice(0, 5).map((item) => <SmallProductCard key={item.id} product={item} onOpen={onOpenProduct} />)}
          </div>
        </section>

        <section id="section-from-brand" className="mt-10 rounded-lg border border-[#ddd] bg-white p-5">
          <h3 className="mb-2 text-xl font-bold tracking-normal">From the brand</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-[#565959]">{product.brandStory || "Explore more products from this brand."}</p>
        </section>

        <section id="section-related" className="mt-10 border-t border-t-[#eee] pt-6">
          <h3 className="mb-3 text-xl font-bold tracking-normal">Products related to this item</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {relatedProducts.map((item) => <SmallProductCard key={item.id} product={item} onOpen={onOpenProduct} />)}
          </div>
        </section>

        <section id="section-reviews" className="mt-10 grid grid-cols-[300px_minmax(0,1fr)] gap-10 border-t border-t-[#eee] pt-6 max-[820px]:grid-cols-1">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-normal">Customer reviews</h2>
            <div className="mb-4 flex items-center gap-2">{stars(product.rating, "text-lg")} <span>{product.rating} out of 5</span></div>
            <RatingBars product={product} />
          </div>

          <div className="rounded-lg border border-[#d5d9d9] bg-[#f7fafa] p-5">
            <h3 className="mb-1 text-lg font-bold">Customers say</h3>
            <p className="mb-3 text-sm font-bold text-[#007185]">AI-generated summary</p>
            <p className="mb-5 text-sm leading-relaxed">{product.desc}</p>

            <div className="border-t border-t-[#e7e7e7] pt-5">
              <h3 className="mb-3 text-lg font-bold">Customer reviews</h3>
              {reviews.length ? (
                <div className="grid gap-4">
                  {reviews.map((review) => (
                    <article key={review.id} className="border-b border-b-[#eee] pb-4">
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <img className="h-7 w-7 rounded-full" src="https://m.media-amazon.com/images/S/amazon-avatars-global/default._CR0,0,1024,1024_SX48_.png" alt="" />
                        <span>{review.userName}</span>
                      </div>
                      <div className="mb-1 text-sm">
                        {stars(review.rating)} <b className="ml-1">{review.title}</b>
                      </div>
                      <div className="mb-2 text-xs text-[#565959]">{review.date}</div>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{review.comment}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#565959]">No reviews yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CartPage({ cart, products, onHome, onOpenProduct, onAddSimple, onQuantityChange, onRemove }) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceNumber * 1300 * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const recommended = products.slice(0, cart.length ? 4 : 3);

  if (cart.length === 0) {
    return (
      <main className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 max-[900px]:grid-cols-1">
        <section className="flex items-center gap-8 bg-white p-10 max-[720px]:block">
          <div className="flex h-[210px] w-[260px] shrink-0 items-center justify-center bg-[#f3f3f3] text-center text-sm font-semibold text-[#565959] max-[720px]:mb-6 max-[720px]:w-full">Empty cart</div>
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-normal">Your AImazon Cart is empty</h2>
            <button className="mb-5 text-sm text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={onHome}>Shop today's deals</button>
            <div className="flex flex-wrap gap-3">
              <button className={`${pillButton} bg-[#ffd814] hover:bg-[#f7ca00]`} type="button">Sign in to your account</button>
              <button className={`${pillButton} border border-[#d5d9d9] bg-white hover:bg-[#f7fafa]`} type="button">Sign up now</button>
            </div>
          </div>
        </section>
        <RecommendationPanel products={recommended} onOpenProduct={onOpenProduct} onAddSimple={onAddSimple} />
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 max-[980px]:grid-cols-1">
      <section className="bg-white p-5">
        <h2 className="text-3xl font-normal tracking-normal">Shopping Cart</h2>
        <div className="border-b border-b-[#ddd] pb-1 text-right text-sm text-[#565959]">Price</div>
        {cart.map((item) => (
          <article key={item.key} className="grid grid-cols-[180px_minmax(0,1fr)_120px] gap-5 border-b border-b-[#ddd] py-5 max-[760px]:grid-cols-[110px_minmax(0,1fr)]">
            <ImageBox className="h-[180px] w-[180px] max-[760px]:h-[110px] max-[760px]:w-[110px]" src={item.product.img} alt={item.product.name} />
            <div>
              <h3 className="mb-1 text-lg text-[#0f1111]">{item.product.name}</h3>
              <p className="mb-1 text-xs text-[#565959]"><b>Size:</b> {item.selectedSize || "Not selected"} | <b>Color:</b> {item.selectedColor || "Not selected"}</p>
              <p className="mb-2 text-xs text-[#007600]">In Stock</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#007185]">
                <select className="rounded border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-xs" value={item.quantity} onChange={(event) => onQuantityChange(item.key, Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                </select>
                <button className="hover:text-[#c7511f] hover:underline" type="button" onClick={() => onRemove(item.key)}>Delete</button>
                <span>Save for later</span>
                <span>Compare with similar items</span>
              </div>
            </div>
            <div className="text-right text-lg font-bold max-[760px]:col-span-2 max-[760px]:text-left">{formatKrw(item.product.priceNumber * item.quantity)}</div>
          </article>
        ))}
        <div className="mt-4 text-right text-lg">
          Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""}): <b>₩ {subtotal.toLocaleString("ko-KR")}</b>
        </div>
      </section>

      <aside className="grid gap-5">
        <section className="bg-white p-5">
          <p className="mb-3 text-xs text-[#067d62]">Your order qualifies for <b>FREE Shipping</b>. Choose this option at checkout.</p>
          <div className="mb-4 text-lg">Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""}): <b>₩ {subtotal.toLocaleString("ko-KR")}</b></div>
          <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" /> This order contains a gift</label>
          <button className={`${pillButton} w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button">Proceed to checkout</button>
        </section>
        <RecommendationPanel products={recommended} onOpenProduct={onOpenProduct} onAddSimple={onAddSimple} />
      </aside>
    </main>
  );
}

function RecommendationPanel({ products, onOpenProduct, onAddSimple }) {
  return (
    <section className="bg-white p-5">
      <h3 className="mb-4 text-sm font-bold leading-snug">Customers Who Bought Items in Your Recent History Also Bought</h3>
      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="flex gap-3">
            <button type="button" onClick={() => onOpenProduct(product)}>
              <ImageBox className="h-20 w-20 shrink-0" src={product.img} alt={product.name} />
            </button>
            <div className="min-w-0 flex-1">
              <button className="line-clamp-2 text-left text-sm leading-snug text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={() => onOpenProduct(product)}>{product.name}</button>
              <div className="mt-1 text-sm font-bold text-[#b12704]">{formatUsd(product.price)}</div>
              <button className="mt-2 rounded-full bg-[#ffd814] px-3 py-1 text-xs hover:bg-[#f7ca00]" type="button" onClick={() => onAddSimple(product)}>Add to cart</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-8 left-1/2 z-[80] min-w-[250px] -translate-x-1/2 rounded-lg bg-[#0f1111] px-5 py-4 text-center text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

function createCartKey(product, selectedSize, selectedColor) {
  return `${product.id}:${selectedSize || "-"}:${selectedColor || "-"}`;
}

function createInitialFilters(products, category) {
  const prices = products.filter((product) => product.category === category).map((product) => product.priceNumber);
  return {
    subCategory: "All",
    maxPrice: Math.ceil(Math.max(...prices, 500)),
    minRating: 0,
    color: "All",
  };
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");
  const categories = useMemo(() => getCategories(products), [products]);
  const [view, setView] = useState("home");
  const [listing, setListing] = useState({ category: null, query: "" });
  const [filters, setFilters] = useState(() => createInitialFilters([], ""));
  const [searchText, setSearchText] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedReviews = selectedProduct ? getProductReviews(reviews, selectedProduct.id) : [];
  const relatedProducts = selectedProduct ? getRelatedProducts(selectedProduct, products) : [];

  useEffect(() => {
    let isMounted = true;

    loadCatalog()
      .then((catalog) => {
        if (!isMounted) return;
        setProducts(catalog.products);
        setReviews(catalog.reviews);
        setFilters(createInitialFilters(catalog.products, catalog.products[0]?.category ?? ""));
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) return;
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const handleHome = useCallback(() => {
    setView("home");
    setListing({ category: null, query: "" });
    setSearchText("");
    setSearchCategory("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCategorySelect = useCallback((category) => {
    setView("listing");
    setListing({ category, query: "" });
    setFilters(createInitialFilters(products, category));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [products]);

  const handleSearch = useCallback(
    (event) => {
      event.preventDefault();
      const category = searchCategory === "All" ? null : searchCategory;
      setView("listing");
      setListing({ category, query: searchText.trim() });
      if (category) {
        setFilters(createInitialFilters(products, category));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [products, searchCategory, searchText],
  );

  const handleFilterChange = useCallback((type, value) => {
    setFilters((current) => ({ ...current, [type]: value }));
  }, []);

  const handleOpenProduct = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  const handleCloseProduct = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleAddToCart = useCallback(
    (product, { selectedSize = "", selectedColor = "", quantity = 1 } = {}) => {
      const key = createCartKey(product, selectedSize, selectedColor);
      setCart((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) {
          return current.map((item) => (item.key === key ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item));
        }
        return [...current, { key, product, selectedSize, selectedColor, quantity }];
      });
      showToast("장바구니에 추가되었습니다.");
    },
    [showToast],
  );

  const handleQuantityChange = useCallback((key, quantity) => {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity } : item)));
  }, []);

  const handleRemove = useCallback((key) => {
    setCart((current) => current.filter((item) => item.key !== key));
  }, []);

  return (
    <div className="min-h-screen bg-[#e3e6e6] font-sans text-[#0f1111]">
      <Header
        categories={categories}
        searchText={searchText}
        searchCategory={searchCategory}
        cartCount={cartCount}
        onSearchTextChange={setSearchText}
        onSearchCategoryChange={setSearchCategory}
        onSearch={handleSearch}
        onHome={handleHome}
        onCart={() => setView("cart")}
      />

      {status === "loading" ? <main className="p-8 text-sm text-[#565959]">Loading...</main> : null}
      {status === "error" ? <main className="p-8 text-sm text-[#b12704]">데이터를 불러올 수 없습니다.</main> : null}
      {status === "ready" && view === "home" ? <Home categories={categories} products={products} onCategorySelect={handleCategorySelect} /> : null}
      {status === "ready" && view === "listing" ? (
        <ProductListing listing={listing} products={products} filters={filters} cart={cart} onFilterChange={handleFilterChange} onOpenProduct={handleOpenProduct} onCart={() => setView("cart")} />
      ) : null}
      {status === "ready" && view === "cart" ? (
        <CartPage
          cart={cart}
          products={products}
          onHome={handleHome}
          onOpenProduct={handleOpenProduct}
          onAddSimple={(product) => handleAddToCart(product)}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
        />
      ) : null}

      {selectedProduct ? (
        <DetailModal product={selectedProduct} reviews={selectedReviews} relatedProducts={relatedProducts} onClose={handleCloseProduct} onAddToCart={handleAddToCart} onOpenProduct={setSelectedProduct} />
      ) : null}
      <Toast message={toast} />
    </div>
  );
}
