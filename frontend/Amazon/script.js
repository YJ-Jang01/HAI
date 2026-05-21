let allProducts = [];
let allReviews = []; 
let cart = [];

// 색상 그룹과 매핑 정보를 정의
const COLOR_GROUPS = {
    black: { label: 'Black', css: '#000000' },
    white: { label: 'White', css: '#ffffff' },
    gray: { label: 'Gray', css: '#808080' },
    brown: { label: 'Brown', css: '#8B4513' },
    tan: { label: 'Tan', css: '#C19A6B' },
    green: { label: 'Green', css: '#4A7C59' },
    blue: { label: 'Blue', css: '#2F5BA8' },
    red: { label: 'Red', css: '#D62828' },
    yellow: { label: 'Yellow', css: '#E7B928' },
    pink: { label: 'Pink', css: '#E49DB0' },
    purple: { label: 'Purple', css: '#7D4E9C' },
    orange: { label: 'Orange', css: '#E07A41' }
};

const COLOR_NAME_TO_GROUP = {
    camel: 'tan', khaki: 'tan', beige: 'tan', caramel: 'tan', sand: 'tan', taupe: 'tan', biscuit: 'tan', 'light brown': 'tan', tan: 'tan', 'camel': 'tan',
    charcoal: 'gray', ash: 'gray', slate: 'gray', stone: 'gray', pewter: 'gray', graphite: 'gray', silver: 'gray', 'light gray': 'gray', 'dark gray': 'gray',
    olive: 'green', moss: 'green', sage: 'green', forest: 'green', emerald: 'green', pine: 'green', mint: 'green', lime: 'green', jade: 'green',
    navy: 'blue', cobalt: 'blue', aqua: 'blue', teal: 'blue', sky: 'blue', denim: 'blue', royal: 'blue', 'light blue': 'blue',
    maroon: 'red', wine: 'red', cranberry: 'red', berry: 'red', ruby: 'red', cherry: 'red', coral: 'orange',
    gold: 'yellow', mustard: 'yellow', lemon: 'yellow', butter: 'yellow', amber: 'orange', pumpkin: 'orange', peach: 'orange', copper: 'orange',
    lavender: 'purple', violet: 'purple', plum: 'purple', lilac: 'purple', eggplant: 'purple', mauve: 'purple',
    rose: 'pink', blush: 'pink', fuchsia: 'pink', magenta: 'pink',
    chocolate: 'brown', mocha: 'brown', espresso: 'brown', coffee: 'brown'
};

function normalizeColorLabel(val) {
    if (!val && val !== 0) return '';
    return String(val).toLowerCase().trim();
}

function getColorGroupKey(colorName) {
    const key = normalizeColorLabel(colorName);
    if (!key) return '';
    if (COLOR_GROUPS[key]) return key;
    if (COLOR_NAME_TO_GROUP[key]) return COLOR_NAME_TO_GROUP[key];

    if (key.includes('black')) return 'black';
    if (key.includes('white') || key.includes('cream') || key.includes('ivory')) return 'white';
    if (key.includes('gray') || key.includes('grey') || key.includes('ash') || key.includes('charcoal') || key.includes('slate') || key.includes('stone')) return 'gray';
    if (key.includes('tan') || key.includes('beige') || key.includes('camel') || key.includes('khaki') || key.includes('sand') || key.includes('taupe')) return 'tan';
    if (key.includes('brown') || key.includes('chocolate') || key.includes('mocha') || key.includes('coffee')) return 'brown';
    if (key.includes('green') || key.includes('olive') || key.includes('sage') || key.includes('moss') || key.includes('forest') || key.includes('jade') || key.includes('mint')) return 'green';
    if (key.includes('blue') || key.includes('navy') || key.includes('aqua') || key.includes('teal') || key.includes('denim') || key.includes('sky') || key.includes('royal')) return 'blue';
    if (key.includes('red') || key.includes('maroon') || key.includes('wine') || key.includes('ruby') || key.includes('cherry') || key.includes('berry')) return 'red';
    if (key.includes('yellow') || key.includes('gold') || key.includes('mustard') || key.includes('lemon') || key.includes('butter')) return 'yellow';
    if (key.includes('pink') || key.includes('rose') || key.includes('blush') || key.includes('magenta') || key.includes('fuchsia')) return 'pink';
    if (key.includes('purple') || key.includes('violet') || key.includes('plum') || key.includes('lilac') || key.includes('mauve') || key.includes('eggplant')) return 'purple';
    if (key.includes('orange') || key.includes('coral') || key.includes('amber') || key.includes('pumpkin') || key.includes('peach') || key.includes('copper')) return 'orange';

    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', colorName)) return colorName;
    return 'gray';
}

function getColorGroupLabel(colorName) {
    const groupKey = getColorGroupKey(colorName);
    return COLOR_GROUPS[groupKey] ? COLOR_GROUPS[groupKey].label : String(colorName);
}

function mapColorToCss(colorName) {
    if (!colorName && colorName !== 0) return '#ccc';
    const key = getColorGroupKey(colorName);
    if (COLOR_GROUPS[key]) return COLOR_GROUPS[key].css;
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', colorName)) return colorName;
    return '#ccc';
}

/*
const filterConfig = {
    "Electronics": [
        { label: "Storage", key: "storage" },
        { label: "Brand", key: "brand" }
    ],
    "Clothing": [
        { label: "Size", key: "size" },
        { label: "Material", key: "material" }
    ],
    "Home": [
        { label: "Room", key: "room" },
        { label: "Style", key: "style" }
    ]
};
*/

async function init() {
    try {
        const [prodRes, reviewRes] = await Promise.all([
            fetch('products.json'),
            fetch('review.json')
        ]);
        
        allProducts = await prodRes.json();
        allReviews = await reviewRes.json();
        
        // 제품 데이터 정리: color를 배열로 통일하고 기본 색상값 설정
        allProducts = allProducts.map(p => {
            const copy = Object.assign({}, p);
            // colors 또는 color 필드가 있으면 color 배열로 통일
            const rawColors = copy.colors || copy.color || [];
            if (Array.isArray(rawColors)) {
                copy.color = rawColors;
            } else if (typeof rawColors === 'string') {
                copy.color = [rawColors];
            } else {
                copy.color = [];
            }
            // sizes 유사 필드 통합
            if (!copy.sizes) {
                if (copy.availableSizes) copy.sizes = copy.availableSizes;
                else if (copy.size) copy.sizes = Array.isArray(copy.size) ? copy.size : [copy.size];
            }
            copy.sizes = copy.sizes || [];
            return copy;
        });

        populateSearchCategories();
        
        renderHome(); 
    } catch (err) {
        console.error("데이터를 불러오는데 실패했습니다.", err);
    }
}

// 홈 화면
function renderHome() {
    const homeView = document.getElementById('home-view');
    const productView = document.getElementById('product-view');
    const cartView = document.getElementById('cart-view');
    
    homeView.classList.remove('hidden');
    productView.classList.add('hidden');
    cartView.classList.add('hidden');

    const categories = [...new Set(allProducts.map(p => p.category))];
    homeView.innerHTML = categories.map(cat => {
        const p = allProducts.find(item => item.category === cat);
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        return `
            <div class="category-card" onclick="showCategory('${cat}')">
                <h2>Shop ${catName}</h2>
                <img src="${p.img}" alt="${cat}">
                <div class="shop-now">Shop now</div>
            </div>
        `;
    }).join('');

}

function showHome() {
    document.getElementById('search-input').value = '';
    document.querySelector('.search-select').value = 'All';
    document.getElementById('cart-view').classList.add('hidden');
    document.getElementById('product-view').classList.add('hidden');
    document.getElementById('side-cart-view').classList.add('hidden');

    renderHome();
    window.scrollTo(0, 0);
}

// 현재 적용된 필터 상태를 저장
let currentFilters = {
    mainCategory: '',
    subCategory: 'All',
    minPrice: 0,
    maxPrice: Infinity,
    minRating: 0,
    color: 'All'
};

function showCategory(category) {
    currentFilters.mainCategory = category;
    currentFilters.subCategory = 'All';
    
    const homeView = document.getElementById('home-view');
    const productView = document.getElementById('product-view');
    const sideCartView = document.getElementById('side-cart-view');

    homeView.classList.add('hidden');
    productView.classList.remove('hidden');
    
    // 장바구니에 상품이 있을 때만 사이드바 노출 여부 결정
    if (cart && cart.length > 0) {
        sideCartView.classList.remove('hidden');
    } else {
        sideCartView.classList.add('hidden');
    }

    const categoryProducts = allProducts.filter(p => p.category === category);
    const subCategories = [...new Set(categoryProducts.map(p => p.subCategory).filter(Boolean))];
    const maxProductPrice = categoryProducts.length > 0 ? Math.max(...categoryProducts.map(p => {
        const price = typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9.]/g, '')) : p.price;
        return price || 500;
    })) : 500;
    
    // 해당 카테고리에서 사용된 색상 그룹 목록을 수집
    const colorGroupMap = new Map();
    categoryProducts.forEach(prod => {
        const cols = prod.color || [];
        cols.forEach(c => {
            if (!c) return;
            const groupLabel = getColorGroupLabel(c);
            if (!colorGroupMap.has(groupLabel)) {
                colorGroupMap.set(groupLabel, mapColorToCss(c));
            }
        });
    });
    const colorArray = Array.from(colorGroupMap.entries());
    const colorFilterHTML = `
                <h3>Color</h3>
                <ul class="filter-list color-filter-list">
                    <li class="color-dot" onclick="updateFilter(this, 'color', 'All')" style="background: transparent; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #555;">All</li>
                    ${colorArray.map(([label, bg]) => {
                        const safe = String(label).replace(/'/g, "\\'" ).replace(/\"/g, '\\\"');
                        return `<li class="color-dot" onclick="updateFilter(this, 'color', '${safe}')" title="${safe}" style="background: ${bg};"></li>`;
                    }).join('')}
                </ul>
    `;
    
    // 1. 레이아웃 전체를 productView에 렌더링
    // 사이드바(filter) - 상품목록(list) - 장바구니(side-cart) 3단 구성
    productView.innerHTML = `
        <div class="category-page-layout" style="display: flex; gap: 20px; padding: 20px;">
            <aside class="sidebar-filter" style="width: 200px; flex-shrink: 0;">
                <h3>Department</h3>
                <ul class="filter-list filter-list-vertical">
                    <li onclick="updateFilter(this, 'subCategory', 'All')">All ${category}</li>
                    ${subCategories.map(sub => `<li onclick="updateFilter(this, 'subCategory', '${sub}')">${sub}</li>`).join('')}
                </ul>
                <h3>Price</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="range" min="0" max="${maxProductPrice}" value="${maxProductPrice}" oninput="handlePriceSlider(this.value)" style="width: 100%;">
                    <span id="max-price-label">Up to $${maxProductPrice}</span>
                </div>
                <h3>Customer Review</h3>
                <ul class="filter-list">
                    <li onclick="updateFilter(this, 'minRating', 4)"><span class="stars-gold">★★★★☆</span> & Up</li>
                    <li onclick="updateFilter(this, 'minRating', 3)"><span class="stars-gold">★★★☆☆</span> & Up</li>
                </ul>
                ${colorFilterHTML}
            </aside>

            <div class="product-list-area" style="flex-grow: 1;">
                <div class="results-header">
                    <h2>Results for "${category}"</h2>
                    <p id="current-category-count"></p>
                </div>
                <div id="product-list" class="product-grid"></div>
            </div>

            <aside id="side-cart-container" style="width: 300px; flex-shrink: 0; ${cart && cart.length > 0 ? '' : 'display:none;'}">
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd; position: sticky; top: 20px;">
                    <h3 style="margin-top:0;">Order Summary</h3>
                    <div style="max-height: 220px; overflow-y: auto; margin-bottom: 15px; padding-right: 5px;">
                        ${cart.map(item => `
                            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: #fdfdfd; padding: 8px; border-radius: 4px; border: 1px solid #f0f0f0;">
                                <img src="${item.img}" style="width: 60px; height: 60px; object-fit: contain; background: #fff; border-radius:4px;">
                                <div style="flex:1; min-width:0;">
                                    <div style="font-size: 13px; font-weight: 600; color:#0F1111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>
                                    <div style="color: #B12704; font-weight: bold; margin-top:6px;">₩ ${(item.price * 1300).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <div style="font-size:13px; color:#565959;">Items: <strong style="color:#0F1111;">${cart.length}</strong></div>
                        <div style="font-size:13px; color:#565959;">Subtotal: <strong style="color:#B12704;">₩ ${cart.reduce((s,i)=>s+( (typeof i.price==='string'?parseFloat(i.price.replace(/[^0-9.]/g,'')):i.price) *1300),0).toLocaleString()}</strong></div>
                    </div>
                    <button onclick="showCart()" style="width: 100%; background: #FFD814; border: none; padding: 10px; border-radius: 20px; cursor: pointer; font-weight: bold;">
                        Proceed to Checkout
                    </button>
                </div>
            </aside>
        </div>
    `;
    applyFilters();
    window.scrollTo(0, 0);
}

function handlePriceSlider(value) {
    currentFilters.maxPrice = parseFloat(value);
    document.getElementById('max-price-label').innerText = `Up to $${value}`;
    applyFilters();
}

// 중복된 applyFilters 함수들을 모두 지우고 이 코드로 하나만 넣으세요!
function applyFilters() {
    const listContainer = document.getElementById('product-list');
    const countLabel = document.getElementById('current-category-count');
    if (!listContainer) return;

    const filtered = allProducts.filter(p => {
        const matchCategory = p.category === currentFilters.mainCategory;
        const matchSub = currentFilters.subCategory === 'All' || p.subCategory === currentFilters.subCategory;
        
        // ✨ 핵심 원인 해결: 달러($)나 쉼표가 섞인 문자열이라도 숫자로 정상 변환
        const priceNum = typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9.]/g, '')) : parseFloat(p.price);
        const matchPrice = priceNum <= currentFilters.maxPrice;
        
        const matchRating = p.rating >= currentFilters.minRating;
        const prodColors = p.color || [];
        const matchColor = currentFilters.color === 'All' || prodColors.some(pc => getColorGroupLabel(pc) === currentFilters.color);

        return matchCategory && matchSub && matchPrice && matchRating && matchColor;
    });

    if (countLabel) {
        countLabel.innerText = `${filtered.length} items found`;
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="padding: 20px;">No results match your filters.</p>`;
    } else {
        // [object Object] 대신 HTML 요소로 직접 매핑해서 출력
        listContainer.innerHTML = filtered.map(p => `
            <div class="product-card" onclick="openDetail(${p.id})">
                <img src="${p.img}" alt="${p.name}">
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-rating">
                        <span class="stars-gold">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}</span>
                        <span style="font-size:12px; color:#007185; margin-left:5px;">${p.reviewCount}</span>
                    </div>
                    <div class="product-price">${p.price}</div>
                    <div style="font-size: 12px; color: #565959;">FREE delivery</div>
                </div>
            </div>
        `).join('');
    }
}

// 모든 필터 선택 시 호출되는 통합 함수
function updateFilter(element, type, value) {
    // UI 선택 효과 (색상 점 제외하고 나머지만 클래스 토글)
    if (!element.classList.contains('color-dot')) {
        element.parentElement.querySelectorAll('.filter-item').forEach(li => li.classList.remove('active'));
        element.classList.add('active');
    } else {
        document.querySelectorAll('.color-dot').forEach(dot => dot.style.border = '1px solid #ccc');
        element.style.border = '2px solid #C7511F';
    }

    // 필터 상태 업데이트
    currentFilters[type] = (type === 'maxPrice' || type === 'minRating') ? parseFloat(value) : value;
    
    applyFilters();
}

function generateProductHTML(products) {
    if (products.length === 0) return `<p>No products found in this category.</p>`;
    
    return products.map(p => `
        <div class="product-card" onclick="openDetail(${p.id})">
            <img src="${p.img}" alt="${p.name}">
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <div class="product-rating">
                    <span class="stars-gold">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}</span>
                    <span class="count">${p.reviewCount}</span>
                </div>
                <div class="product-price">$${p.price}</div>
            </div>
        </div>
    `).join('');
}

// 검색 기능
function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const selectedCategory = document.querySelector('.search-select').value;

    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('product-view').classList.remove('hidden');
    
    let filtered = allProducts;

    if (selectedCategory !== "All") {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (query) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
        document.getElementById('category-title').innerText = `Search results for "${query}"`;
    } else {
        document.getElementById('category-title').innerText = selectedCategory === "All" ? "All Products" : `Results for "${selectedCategory}"`;
    }
    
    if(filtered.length === 0) {
        document.getElementById('product-list').innerHTML = `<p style="padding: 20px;">No results found.</p>`;
    } else {
        renderCategoryProducts(filtered);
    }
}

// 검색창 카테고리
function populateSearchCategories() {
    const select = document.querySelector('.search-select');
    const categories = [...new Set(allProducts.map(p => p.category))];
    
    let optionsHTML = '<option value="All">All</option>';
    categories.forEach(cat => {
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        optionsHTML += `<option value="${cat}">${catName}</option>`;
    });
    select.innerHTML = optionsHTML;
}


function renderCategoryProducts(category) {
    const productView = document.getElementById('product-view');
    const homeView = document.getElementById('home-view');
    const sideCartView = document.getElementById('side-cart-view');

    // 1. 화면 전환
    homeView.classList.add('hidden');
    productView.classList.remove('hidden');

    if (sideCartView) {
        if (cart && cart.length > 0) {
            sideCartView.classList.remove('hidden');
        } else {
            sideCartView.classList.add('hidden');
        }
    }

    window.scrollTo(0, 0);

    // 2. 해당 카테고리 상품 필터링
    const products = allProducts.filter(p => p.category === category);
    const subtotal = cart && cart.length > 0 ? cart.reduce((sum, item) => sum + (item.price * 1300), 0) : 0;

    // 3. HTML 렌더링 (오타 수정 완료)
    productView.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px; max-width: 1500px; margin: 0 auto; padding: 20px; align-items: start;">
            
            <div>
                <h2 style="margin-bottom: 20px; font-size: 24px;">${category}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
                    ${products.map(p => `
                        <div class="product-card" onclick="showDetail(${p.id})" style="background: white; padding: 15px; border-radius: 8px; cursor: pointer; border: 1px solid #ddd; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                <img src="${p.img}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                            </div>
                            <div>
                                <h3 style="font-size: 15px; margin: 10px 0; color: #0F1111; line-height: 1.3; height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.name}</h3>
                                <p style="color: #B12704; font-weight: bold; font-size: 18px;">₩ ${(p.price * 1300).toLocaleString()}</p>
                                <p style="font-size: 12px; color: #565959;">FREE delivery</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="position: sticky; top: 20px;">
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h3 style="font-size: 18px; margin: 0 0 15px 0;">Your Order Summary</h3>
                    
                    ${cart && cart.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 14px;">Subtotal (${cart.length} items):</span>
                            <div style="font-size: 20px; font-weight: bold; color: #B12704; margin-top: 5px;">
                                ₩ ${subtotal.toLocaleString()}
                            </div>
                        </div>
                        <button onclick="showCart()" style="width: 100%; background: #FFD814; border: none; padding: 10px; border-radius: 20px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                            Proceed to checkout
                        </button>
                        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <p style="font-size: 12px; font-weight: bold; color: #565959; margin-bottom: 10px;">Recently added</p>
                            ${cart.slice(-3).reverse().map(item => `
                                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                                    <img src="${item.img}" style="width: 40px; height: 40px; object-fit: contain;">
                                    <span style="font-size: 11px; color: #007185; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p style="color: #565959; font-size: 14px;">Your cart is empty.</p>
                        <button onclick="showHome()" style="width: 100%; background: #f0f2f2; border: 1px solid #D5D9D9; padding: 8px; border-radius: 20px; cursor: pointer; font-size: 13px; margin-top: 10px;">
                            Continue Shopping
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    if (cart.length > 0) {
        const subtotal = cart.reduce((sum, item) => {
            const price = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price;
            return sum + (price * 1300);
        }, 0);

        container.innerHTML = `
            <div class="home-container" style="display: flex; gap: 20px; align-items: flex-start;">
                <div class="home-main-content" style="flex: 1;">
                    <div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        ${productView.innerHTML}
                    </div>
                </div>
                <aside class="home-right-sidebar" style="width: 250px; background: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                    <h3 style="font-size: 16px; margin-bottom: 15px; color: #0F1111;">장바구니 요약</h3>
                    <div class="sidebar-items-list">
                        ${cart && cart.length > 0 ? cart.slice(-5).reverse().map(item => `
                            <div class="sidebar-mini-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                                <img src="${item.img}" style="width: 40px; height: 40px; object-fit: contain;">
                                <div style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${item.name}
                                </div>
                            </div>
                        `).join('') : `<p style="color: #565959; font-size: 14px;">장바구니에 상품이 없습니다.</p>`}
                    </div>
                    <p style="font-weight: bold; margin-top: 15px; font-size: 14px;">소계: ₩ ${subtotal.toLocaleString()}</p>
                    <button class="btn-sidebar-cart" onclick="showCart()" style="width: 100%; background: #FFD814; border: 1px solid #FCD200; border-radius: 8px; padding: 8px; cursor: pointer; font-size: 13px;">장바구니 이동</button>
                </aside>
            </div>
        `;

    } else {
        // 장바구니가 비었을 때는 상품만 꽉 차게 표시
        container.innerHTML = `
            <div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
                ${productView.innerHTML}
            </div>
        `;
    }
}

// 상세 페이지
function openDetail(id) {
    const p = allProducts.find(item => Number(item.id) === Number(id));
    if (!p) return;

    const modalContent = document.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;
    if (modalContent) {
    modalContent.onclick = (e) => {
        e.stopPropagation();
    };
}
    const wonPrice = `₩ ${(p.price * 1300).toLocaleString()}`;

    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('main-image').src = p.img;
    document.getElementById('detail-price').innerText = wonPrice;
    
    const sidePrice = document.getElementById('side-price');
    if (sidePrice) sidePrice.innerText = wonPrice;

    const topCount = document.getElementById('top-count');
    if (topCount) {
        topCount.innerText = `${p.reviewCount} ratings`;
        topCount.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            const reviewSection = document.getElementById('section-reviews');
            if (reviewSection) {
                reviewSection.scrollIntoView({ behavior: 'smooth' });
            }
        };
        topCount.style.cursor = "pointer";
    }

    // 사이즈 버튼 출력
    (function renderSizeOptions(){
        const sizeContainer = document.getElementById('size-options');
        const sizes = p.sizes || p.availableSizes || p.sizeOptions || (p.size ? (Array.isArray(p.size) ? p.size : [p.size]) : []);
        if (!sizeContainer) return;

        if (!sizes || sizes.length === 0) {
            sizeContainer.innerHTML = `<span style="color:#565959; font-size:13px;">Size information unavailable</span>`;
            return;
        }

        sizeContainer.innerHTML = sizes.map(s => ` <button class="size-btn" data-size="${s}" style="margin:4px;padding:6px 10px;border:1px solid #ddd;border-radius:4px;cursor:pointer;background:#fff;">${s}</button>`).join('');

        // 초기 선택 상태 표시
        if (p.selectedSize) {
            const matched = sizeContainer.querySelector(`[data-size="${p.selectedSize}"]`);
            if (matched) matched.style.border = '2px solid #C7511F';
        }

        sizeContainer.querySelectorAll('.size-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                sizeContainer.querySelectorAll('.size-btn').forEach(b => b.style.border = '1px solid #ddd');
                btn.style.border = '2px solid #C7511F';
                p.selectedSize = btn.dataset.size;
            };
        });
    })();

    // 색상 버튼 출력
    (function renderColorOptions(){
        const colorContainer = document.getElementById('color-options');
        const colors = p.colors || (p.availableColors) || (p.color ? (Array.isArray(p.color) ? p.color : [p.color]) : []);
        if (!colorContainer) return;

        if (!colors || colors.length === 0) {
            colorContainer.innerHTML = `<span style="color:#565959; font-size:13px;">Color information unavailable</span>`;
            return;
        }

        colorContainer.innerHTML = colors.map(c => {
            const bg = mapColorToCss(c);
            return `<div class="color-dot" data-color="${c}" title="${c}" style="width:28px;height:28px;border:1px solid #ccc;border-radius:50%;background:${bg};display:inline-block;margin:4px;cursor:pointer;box-sizing:border-box;"></div>`;
        }).join('');

        const selectedLabel = document.getElementById('selected-color-label');
        const updateSelectedLabel = (colorValue) => {
            if (!selectedLabel) return;
            const labelText = colorValue ? `Selected color: ${getColorGroupLabel(colorValue)}` : 'Select a color';
            selectedLabel.innerText = labelText;
        };

        // 초기 선택 표시
        if (p.selectedColor) {
            const init = colorContainer.querySelector(`[data-color="${p.selectedColor}"]`);
            if (init) init.style.boxShadow = '0 0 0 2px rgba(199,81,31,0.35)';
            updateSelectedLabel(p.selectedColor);
        } else {
            updateSelectedLabel('');
        }

        colorContainer.querySelectorAll('.color-dot').forEach(dot => {
            dot.onclick = (e) => {
                e.stopPropagation();
                colorContainer.querySelectorAll('.color-dot').forEach(d => d.style.boxShadow = 'none');
                dot.style.boxShadow = '0 0 0 2px rgba(199,81,31,0.35)';
                p.selectedColor = dot.dataset.color;
                updateSelectedLabel(dot.dataset.color);
            };
        });
    })();

    const seeAllLink = document.querySelector('.link-text.center');
    if (seeAllLink) {
        seeAllLink.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation();

            const reviewSection = document.getElementById('section-reviews');
            if (reviewSection) {
                reviewSection.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }

    document.getElementById('detail-features').innerHTML = (p.features || []).map(f => `<li>${f}</li>`).join('');
    
    const aiSummaryText = document.getElementById('ai-summary-text');
    if (aiSummaryText) aiSummaryText.innerText = p.desc;

    // 이미지 썸네일
    const thumbContainer = document.getElementById('thumb-images');
    const allImages = [p.img, ...(p.descImages || [])];
    if (thumbContainer) {
        thumbContainer.innerHTML = allImages.map(img => `
            <img src="${img}" onclick="document.getElementById('main-image').src='${img}'">
        `).join('');
    }
    
    // 장바구니 버튼
    const btnCart = document.querySelector('.btn-cart');
    btnCart.onclick = () => {
        addToCart(p);
    };

    // 별점 바
    const createRatingBars = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return; 
        container.innerHTML = [5,4,3,2,1].map(num => `
            <div class="bar-row">
                <span style="width:45px;">${num} star</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width:${p.ratingDetail[num]}%"></div>
                </div>
                <span style="width:35px; text-align:right;">${p.ratingDetail[num]}%</span>
            </div>
        `).join('');
    };

    createRatingBars('popover-bars');
    createRatingBars('rating-bars-container');

    const barsContainer = document.getElementById('rating-bars-container');
    if (barsContainer) {
        barsContainer.onclick = (e) => {
            e.stopPropagation();
        };
    }

    const productReviews = allReviews.filter(rev => Number(rev.productId) === Number(id));
    renderReviews(productReviews);

    document.getElementById('avg-score').innerText = `${p.rating} out of 5`;

    // 유사 상품 추천
    const currentKeywords = p.name.toLowerCase().split(/\s+/);
    const recommendedProducts = allProducts
        .filter(item => item.id !== p.id) 
        .map(item => {
            let score = 0;

            if (item.category === p.category) {
                score += 10;
            }
            
            const itemKeywords = item.name.toLowerCase().split(/\s+/);
            const matchedWords = itemKeywords.filter(word => currentKeywords.includes(word));
            score += matchedWords.length * 2;
            
            return { product: item, score: score };
        })
        .filter(obj => obj.score > 0)
        .sort((a, b) => b.score - a.score) 
        .map(obj => obj.product) 
        .slice(0, 5);

    const renderSmallCard = (product) => `
        <div class="small-card" onclick="openDetail(${product.id})" style="cursor:pointer; min-width: 140px;">
            <img src="${product.img}" style="width: 100%; height: 120px; object-fit: contain;">
            <p class="title" style="font-size: 13px; margin: 8px 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.name}</p>
            <p class="price" style="font-size: 14px; font-weight: bold;">₩ ${(product.price * 1300).toLocaleString()}</p>
        </div>
    `;

    const relatedList = document.getElementById('related-list');
    if (relatedList) {
        if (recommendedProducts.length > 0) {
            relatedList.innerHTML = recommendedProducts.map(renderSmallCard).join('');
        } else {
            relatedList.innerHTML = `<p style="color: #565959; font-size: 13px;">추천할 유사 상품이 없습니다.</p>`;
        }
    }

    document.getElementById('detail-modal').classList.remove('hidden');
    if (!window.history.state || !window.history.state.modalOpen) {
        window.history.pushState({ modalOpen: true }, '');
    }

    // From the Brand 섹션
    const brandContent = document.getElementById('brand-content');
    if (brandContent && p.brandImages && p.brandImages.length > 0) {
        brandContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 10px;">
                ${p.brandImages.map(imgUrl => `
                    <img src="${imgUrl}" alt="Brand Story" style="width: 100%; border-radius: 4px; border: 1px solid #eee;">
                `).join('')}
            </div>
        `;
    } else if (brandContent) {
        brandContent.innerHTML = `<p style="color: #565959;">Explore more from this brand.</p>`;
    }

    // Product information 섹션
    const brandInfo = document.getElementById('brand-information');
    if (brandInfo && p.productInfo) {
        const info = p.productInfo;
        brandInfo.innerHTML = `
            <ul style="list-style: disc; padding-left: 20px; margin-top: 10px; color: #565959;">
                <li><strong>Weight:</strong> ${info.Weight}</li>
                <li><strong>Dimensions:</strong> ${info.dimensions}</li>
                <li><strong>Connectivity:</strong> ${info.connectivity}</li>
                <li><strong>Battery Life:</strong> ${info.batteryLife}</li>
                <li><strong>Warranty:</strong> ${info.warranty}</li>
            </ul>
        `;
    } else if (brandInfo) {
        brandInfo.innerHTML = `<p style="color: #565959;">Detailed product information will be available soon.</p>`;
    }

}

// 장바구니 숫자 업데이트
function updateCartCount() {
    const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.getElementById('cart-count').innerText = totalQty;
}

function addToCart(p) {
    const sizes = p.sizes || p.availableSizes || p.sizeOptions || (p.size ? (Array.isArray(p.size) ? p.size : [p.size]) : []);
    const colors = p.colors || p.availableColors || (p.color ? (Array.isArray(p.color) ? p.color : [p.color]) : []);
    const missing = [];

    if (sizes.length && !p.selectedSize) missing.push('size');
    if (colors.length && !p.selectedColor) missing.push('color');

    if (missing.length) {
        alert(`Please select ${missing.join(' and ')} before adding this item to the cart.`);
        return false;
    }

    closeDetail();
    const addedItem = {
        ...p,
        selectedSize: p.selectedSize || 'N/A',
        selectedColor: p.selectedColor || 'N/A',
        quantity: p.quantity || 1
    };
    cart.push(addedItem);
    updateCartCount();
    window.scrollTo(0, 0);
    showAddedToCartView(addedItem);
    return true;
}

function renderSidebarCart() {
    const sideCartView = document.getElementById('side-cart-view');
    if (cart.length > 0) {
        sideCartView.classList.remove('hidden');
        const subtotal = cart.reduce((sum, item) => sum + ((item.price * 1300) * (item.quantity || 1)), 0);
        const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

        sideCartView.innerHTML = `
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Cart Summary</h3>
                <div style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;">
                    ${cart.map((item, index) => `
                        <div style="display: flex; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px;">
                            <img src="${item.img}" style="width: 50px; height: 50px; object-fit: contain;">
                            <div style="flex: 1;">
                                <div style="font-size: 12px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.name}</div>
                                <div style="font-size: 11px; color: #565959; margin-top: 2px;">${item.selectedSize || 'Not selected'} / ${item.selectedColor || 'Not selected'}</div>
                                <div style="color: #B12704; font-weight: bold; margin-top: 5px; font-size: 13px;">₩${((item.price * 1300) * (item.quantity || 1)).toLocaleString()}</div>
                                <div style="font-size: 11px; color: #565959; margin-top: 2px;">Qty: ${item.quantity || 1}</div>
                                <button onclick="removeFromSidebar(${index})" style="background: none; border: none; color: #007185; cursor: pointer; padding: 0; font-size: 11px; margin-top: 3px;">삭제</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="font-size: 15px; font-weight: bold; padding-top: 10px; border-top: 1px solid #eee;">
                    Subtotal (${totalQty} item${totalQty > 1 ? 's' : ''}): <br><span style="color: #B12704; font-size: 18px;">₩${subtotal.toLocaleString()}</span>
                </div>
                <button style="width: 100%; background: #F7CA00; border: 1px solid #F2C200; border-radius: 8px; padding: 10px; margin-top: 15px; cursor: pointer; font-weight: bold; font-size: 14px;">Proceed to checkout</button>
            </div>
        `;
    } else {
        sideCartView.classList.add('hidden');
    }
}


// 사이드바 전용 개별 삭제 기능
function removeFromSidebar(index) {
    cart.splice(index, 1);
    updateCartCount();
    renderSidebarCart(); // 삭제 후 사이드바 다시 그리기
}

function showSidebarCart() {
    const sideCartView = document.getElementById('side-cart-view');
    sideCartView.classList.remove('hidden'); // 항상 보이게 처리
    renderSidebarCart();
}

function showAddedToCartView(p) {
    const cartView = document.getElementById('cart-view');
    const homeView = document.getElementById('home-view');
    const productView = document.getElementById('product-view');
    const sideCartView = document.getElementById('side-cart-view');

    [homeView, productView, sideCartView].forEach(v => v.classList.add('hidden'));
    cartView.classList.remove('hidden');

    const subtotal = cart.reduce((sum, item) => sum + ((item.price * 1300) * (item.quantity || 1)), 0);
    const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const recommended = allProducts.filter(item => item.id !== p.id).slice(0, 6);

    cartView.innerHTML = `
        <div style="max-width: 1200px; margin: 20px auto; padding: 0 20px;">
            <div style="background: white; padding: 20px; display: flex; align-items: center; justify-content: space-between; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="${p.img}" style="width: 80px; height: 80px; object-fit: contain;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; color: #067D62; font-weight: bold; font-size: 18px;">
                            <span style="border: 2px solid #067D62; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">✓</span>
                            Added to cart
                        </div>
                        <p style="margin: 5px 0 0 0; font-size: 14px;"><b>Size:</b> ${p.selectedSize || 'Not selected'}, <b>Color:</b> ${p.selectedColor || 'Not selected'}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px; border-left: 1px solid #DDD; padding-left: 30px;">
                    <div style="text-align: right;">
                        <span style="font-size: 17px;">Cart subtotal: <b style="color: #B12704;">₩ ${subtotal.toLocaleString()}</b></span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="showCart()" style="background: white; border: 1px solid #D5D9D9; padding: 8px 20px; border-radius: 20px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">Go to Cart</button>
                        <button style="background: #FFD814; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Proceed to checkout (${totalCartItems} item${totalCartItems > 1 ? 's' : ''})</button>
                    </div>
                </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3 style="font-size: 18px; margin-bottom: 15px;">Products related to this item</h3>
                <div style="display: flex; gap: 20px; overflow-x: auto; padding-bottom: 10px;">
                    ${recommended.map(item => `
                        <div style="min-width: 150px; cursor: pointer;" onclick="openDetail(${item.id})">
                            <img src="${item.img}" style="width: 100%; height: 150px; object-fit: contain; background: #F7F7F7; border-radius: 4px;">
                            <p style="font-size: 13px; color: #007185; margin: 8px 0; height: 34px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.name}</p>
                            <p style="color: #B12704; font-weight: bold;">₩ ${(item.price * 1300).toLocaleString()}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function changeQuantity(id, color, size, newQty) {
    const qty = parseInt(newQty);
    const idx = cart.findIndex(item => item.id === id && item.selectedColor === color && item.selectedSize === size);
    
    if (idx !== -1) {
        if (qty <= 0) {
            cart.splice(idx, 1); // 0개 이하로 선택 시 삭제 처리
        } else {
            cart[idx].quantity = qty;
        }
        updateCartCount();
        showCart(); // 화면 리렌더링
    }
}

function showCart() {
    const cartView = document.getElementById('cart-view');
    const homeView = document.getElementById('home-view');
    const productView = document.getElementById('product-view');
    const sideCartView = document.getElementById('side-cart-view');

    [homeView, productView, sideCartView].forEach(v => v.classList.add('hidden'));
    cartView.classList.remove('hidden');

    // 장바구니가 비어있을 때의 화면
    if (cart.length === 0) {
        const recommendedProducts = allProducts.slice(0, 3);

        cartView.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: flex-start; max-width: 1400px; margin: 0 auto; padding: 20px;">
                
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: white; padding: 40px; display: flex; align-items: center; gap: 30px;">
                        <img src="https://m.media-amazon.com/images/G/01/cart/empty/kettle-desaturated._CB424694253_.svg" alt="Empty Cart" style="width: 350px;">
                        <div>
                            <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Your Amazon Cart is empty</h2>
                            <a href="#" onclick="showHome(); return false;" style="color: #007185; text-decoration: none; font-size: 14px; display: block; margin-bottom: 20px;">Shop today's deals</a>
                            <div style="display: flex; gap: 10px;">
                                <button style="background: #FFD814; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-size: 13px;">Sign in to your account</button>
                                <button style="background: white; border: 1px solid #D5D9D9; padding: 6px 15px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 13px;">Sign up now</button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: white; height: 100px;"></div>
                    
                    <p style="font-size: 11px; color: #565959; line-height: 1.5; margin: 0;">
                        The price and availability of items at Amazon.com are subject to change. The Cart is a temporary place to store a list of your items and reflects each item's most recent price. <a href="#" style="color: #007185; text-decoration: none;">Learn more</a><br>
                        Do you have a gift card or promotional code? We'll ask you to enter your claim code when it's time to pay.
                    </p>
                </div>

                <div style="width: 300px; background: white; padding: 20px; border-radius: 4px;">
                    <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 15px; line-height: 1.4;">Customers Who Bought Items in Your Recent History Also Bought</h3>
                    ${recommendedProducts.map(p => `
                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <img src="${p.img}" style="width: 80px; height: 80px; object-fit: contain; cursor: pointer;" onclick="openDetail(${p.id})">
                            <div style="flex: 1;">
                                <h4 style="font-size: 13px; color: #007185; margin: 0 0 5px 0; cursor: pointer; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" onclick="openDetail(${p.id})">${p.name}</h4>
                                <div style="color: #FFA41C; font-size: 12px; margin-bottom: 2px;">★★★★☆ <span style="color: #007185; font-size: 11px;">${p.reviewCount}</span></div>
                                <div style="color: #B12704; font-size: 14px;">₩${(p.price * 1300).toLocaleString()}</div>
                                <button style="background: #FFD814; border: none; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin-top: 5px; cursor: pointer;" onclick="const item = allProducts.find(x => x.id === ${p.id}); cart.push(item); updateCartCount(); showToast();">Add to cart</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + ((item.price * 1300) * (item.quantity || 1)), 0);
    const recommended = allProducts.slice(0, 4); // 추천 상품

    cartView.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start;">
            
            <div style="background: white; padding: 20px; border-radius: 4px;">
                <h2 style="font-size: 28px; margin-bottom: 5px;">Shopping Cart</h2>
                <div style="text-align: right; font-size: 14px; color: #565959; border-bottom: 1px solid #DDD; padding-bottom: 5px;">Price</div>
                
                ${cart.map((item, index) => {
                    const qty = item.quantity || 1;
                    const itemTotal = ((item.price * 1300) * qty).toLocaleString();
                    return `
                    <div style="display: flex; gap: 20px; padding: 20px 0; border-bottom: 1px solid #DDD;">
                        <img src="${item.img}" style="width: 180px; height: 180px; object-fit: contain;">
                        <div style="flex: 1;">
                            <h3 style="font-size: 18px; color: #0F1111; margin: 0 0 5px 0;">${item.name}</h3>
                            <p style="font-size: 12px; color: #565959; margin: 0 4px 6px 0;"><b>Size:</b> ${item.selectedSize || 'Not selected'} | <b>Color:</b> ${item.selectedColor || 'Not selected'}</p>
                            <p style="font-size: 12px; color: #007600; margin-bottom: 5px;">In Stock</p>
                            <p style="font-size: 12px; color: #565959;">Gift options not available. <a href="#" style="color: #007185; text-decoration: none;">Learn more</a></p>
                            <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px; font-size: 13px; color: #007185;">
                                <select onchange="changeQuantity(${item.id}, '${item.selectedColor}', '${item.selectedSize}', this.value)" style="padding: 3px 6px; border-radius: 4px; border: 1px solid #D5D9D9; background: #F0F2F2; cursor: pointer; font-size:12px;">
                                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${qty === n ? 'selected' : ''}>${n}</option>`).join('')}
                                    </select>
                                <span style="cursor:pointer" onclick="cart.splice(${index}, 1); updateCartCount(); showCart();">Delete</span>
                                <span style="cursor:pointer">Save for later</span>
                                <span style="cursor:pointer">Compare with similar items</span>
                            </div>
                        </div>
                        <div style="font-size: 18px; font-weight: bold;">₩ ${itemTotal}</div>
                    </div>
                `}).join('')}
                
                <div style="text-align: right; font-size: 18px; margin-top: 15px;">
                    Subtotal (${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} item${cart.reduce((sum, item) => sum + (item.quantity || 1), 0) > 1 ? 's' : ''}): <b>₩ ${subtotal.toLocaleString()}</b>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="background: white; padding: 20px; border-radius: 4px;">
                    <div style="color: #067D62; font-size: 12px; margin-bottom: 10px;">
                        Your order qualifies for <b>FREE Shipping</b>. Choose this option at checkout.
                    </div>
                    <div style="font-size: 18px; margin-bottom: 15px;">
                        Subtotal (${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} item${cart.reduce((sum, item) => sum + (item.quantity || 1), 0) > 1 ? 's' : ''}): <b>₩ ${subtotal.toLocaleString()}</b>
                    </div>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 15px;">
                        <input type="checkbox"> This order contains a gift
                    </label>
                    <button style="width: 100%; background: #FFD814; border: none; padding: 10px; border-radius: 20px; cursor: pointer; font-size: 14px;">Proceed to checkout</button>
                </div>

                <div style="background: white; padding: 20px; border-radius: 4px;">
                    <h4 style="font-size: 14px; margin-bottom: 15px;">Styling ideas based on your cart</h4>
                    ${recommended.map(item => `
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <img src="${item.img}" style="width: 60px; height: 60px; object-fit: contain;">
                            <div style="flex: 1;">
                                <p style="font-size: 12px; color: #007185; margin: 0; line-height: 1.2; height: 2.4em; overflow: hidden;">${item.name}</p>
                                <div style="color: #B12704; font-size: 13px; font-weight: bold; margin: 4px 0;">₩ ${(item.price * 1300).toLocaleString()}</div>
                                <button onclick="addToCart(allProducts.find(x => x.id === ${item.id}))" style="background: #FFD814; border: none; padding: 2px 10px; border-radius: 10px; font-size: 11px; cursor: pointer;">Add to cart</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 리뷰
function renderReviews(reviews) {
    const aiSummaryBox = document.querySelector('.ai-summary-box');
    if (!aiSummaryBox) return;

    const existingWrapper = document.querySelector('.review-list-wrapper');
    if (existingWrapper) existingWrapper.remove();

    const reviewListHTML = `
        <div class="review-list-wrapper" style="margin-top: 25px; border-top: 1px solid #e7e7e7; padding-top: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #0F1111;">Customer reviews</h3>
            ${reviews.length === 0 
                ? "<p style='color: #565959; font-size: 13px;'>No reviews yet.</p>" 
                : reviews.map(rev => `
                <div class="review-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                    <div class="review-user" style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 5px;">
                        <img src="https://m.media-amazon.com/images/S/amazon-avatars-global/default._CR0,0,1024,1024_SX48_.png" style="width:28px; border-radius:50%;">
                        <span>${rev.userName}</span>
                    </div>
                    <div class="review-rating" style="font-size: 12px; margin-bottom: 4px;">
                        <span style="color: #ffa41c;">${'★'.repeat(rev.rating)}${'☆'.repeat(5-rev.rating)}</span>
                        <b style="margin-left: 5px;">${rev.title}</b>
                    </div>
                    <div class="review-comment" style="font-size: 13px; line-height: 1.5; color: #0F1111;">
                        ${rev.comment}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    aiSummaryBox.insertAdjacentHTML('beforeend', reviewListHTML);
}


// 모달 닫기
function closeDetail() {
    const modal = document.getElementById('detail-modal');
    modal.classList.add('hidden');
    if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
    }
}

document.querySelector('.close-btn').onclick = closeDetail;
window.onclick = (event) => {
    if (event.target == document.getElementById('detail-modal')) closeDetail();
};
window.onpopstate = () => document.getElementById('detail-modal').classList.add('hidden');

init();