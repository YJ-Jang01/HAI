let allProducts = [];
let allReviews = []; 
let cart = [];

async function init() {
    try {
        const [prodRes, reviewRes] = await Promise.all([
            fetch('products.json'),
            fetch('review.json')
        ]);
        
        allProducts = await prodRes.json();
        allReviews = await reviewRes.json();
        
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
    
    homeView.classList.remove('hidden');
    productView.classList.add('hidden');
    
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
    renderHome();
}

// 카테고리 클릭
/*
function showCategory(category) {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('product-view').classList.remove('hidden');
    
    const catName = category.charAt(0).toUpperCase() + category.slice(1);
    document.getElementById('category-title').innerText = `Results for "${catName}"`;
    
    const filtered = allProducts.filter(p => p.category === category);
    renderList(filtered);
} 
    */

// [수정] 메인 카테고리 클릭 시 좌측 필터 + 우측 전체 상품 표시
function showCategory(mainCategory) {
    const homeView = document.getElementById('home-view');
    const productView = document.getElementById('product-view');
    
    homeView.classList.remove('hidden');
    productView.classList.add('hidden');
    window.scrollTo(0, 0);

    // 해당 카테고리의 모든 상품 가져오기
    const productsInMain = allProducts.filter(p => p.category === mainCategory);
    // 서브 카테고리 목록 추출
    const subCategories = [...new Set(productsInMain.map(p => p.subCategory).filter(Boolean))];

    // 좌우 분할 레이아웃 HTML 생성
    homeView.innerHTML = `
        <div class="category-page-layout">
            <aside class="sidebar-filter">
                <h3>Department</h3>
                <ul id="filter-list">
                    <li class="subcat-link active" onclick="filterBySubCategory(event, '${mainCategory}', 'All')">All ${mainCategory}</li>
                    ${subCategories.map(sub => `
                        <li class="subcat-link" onclick="filterBySubCategory(event, '${mainCategory}', '${sub}')">${sub}</li>
                    `).join('')}
                </ul>
            </aside>

            <main class="product-grid-area">
                <div class="category-header" style="margin-bottom: 20px;">
                    <h2 id="current-category-title">Results for "${mainCategory}"</h2>
                    <p id="current-category-count">${productsInMain.length} items found</p>
                </div>
                <div id="product-grid-container" class="product-grid-container">
                    ${generateProductHTML(productsInMain)}
                </div>
            </main>
        </div>
    `;
}

// [추가] 사이드바에서 서브 카테고리 클릭 시 우측 내용만 변경
function filterBySubCategory(event, mainCategory, subCategory) {
    // 1. 클릭된 메뉴 'active' 스타일 적용
    document.querySelectorAll('.subcat-link').forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');

    // 2. 상품 필터링
    const filteredProducts = subCategory === 'All' 
        ? allProducts.filter(p => p.category === mainCategory)
        : allProducts.filter(p => p.category === mainCategory && p.subCategory === subCategory);
    
    // 3. 우측 화면 업데이트 (타이틀, 개수, 상품 리스트)
    const title = subCategory === 'All' ? mainCategory : subCategory;
    document.getElementById('current-category-title').innerText = `Results for "${title}"`;
    document.getElementById('current-category-count').innerText = `${filteredProducts.length} items found`;
    document.getElementById('product-grid-container').innerHTML = generateProductHTML(filteredProducts);
}

// [공통] 상품 카드 HTML 생성 함수 (중복 코드 분리)
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
        renderList(filtered);
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


// 상품 리스트
function renderList(products) {
    document.getElementById('product-list').innerHTML = products.map(p => `
        <div class="product-card" onclick="openDetail(${p.id})">
            <div style="height:200px; display:flex; align-items:center; justify-content:center; background:#f8f8f8;">
                <img src="${p.img}" style="max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode: multiply;">
            </div>
            <h3 style="font-size:15px; height:40px; overflow:hidden; margin-top:15px; font-weight:normal;">${p.name}</h3>
            <p style="font-size:12px; color:#565959; margin:5px 0;">★★★★☆ ${p.reviewCount}</p>
            <p class="price-tag" style="font-size:22px; margin:5px 0;">₩ ${(p.price * 1300).toLocaleString()}</p>
        </div>
    `).join('');
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
        cart.push(p);
        updateCartCount();
        showToast();
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

}

// 장바구니 숫자 업데이트
function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.length;
}

// Toast 알림 표시
function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
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