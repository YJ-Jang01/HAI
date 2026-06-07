import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCategories,
  getColorGroupLabel,
  getProductReviews,
  getRelatedProducts,
  loadCatalog,
  loadProductDetail,
  searchCatalogProducts,
  loadCatalogFacets,
  runAiQuery,
  compareAiProducts,
  loadAiEvidence,
  loadAiStressTest,
  refineAiQuery,
  logInteraction,
  mapColorToCss,
  formatKrw,
  formatUsd,
  parsePrice,
  parseReviewCount,
  productMatchesQuery,
} from "./data.js";

const buttonBase = "cursor-pointer border-0 text-sm transition disabled:cursor-not-allowed disabled:opacity-60";
const pillButton = `${buttonBase} rounded-full px-5 py-2`;
const LANGUAGE_STORAGE_KEY = "aimazon.language";
const PRODUCT_GRID_PAGE_SIZE = 24;

const UI_COPY = {
  en: {
    all: "All",
    allProducts: "All Products",
    searchCategory: "Search category",
    searchPlaceholder: "Search AImazon",
    search: "Search",
    enableAi: "Enable AI comparison lens",
    disableAi: "Disable AI comparison lens",
    aiOn: "AI ON",
    aiOff: "AI OFF",
    languageToggle: "KO",
    languageToggleAria: "Switch language to Korean",
    accountGreeting: "Hello, sign in",
    accountLists: "Account & Lists",
    cart: "Cart",
    navDepartments: "Departments",
    navWomen: "Women",
    navMen: "Men",
    navDeals: "Under $50",
    navTopRated: "Top Rated",
    navAiLens: "AI Lens",
    navDealsTitle: "Style under $50",
    navTopRatedTitle: "Top-rated fashion picks",
    navCustomerService: "Customer Service",
    navRegistry: "Registry",
    navGiftCards: "Gift Cards",
    navSell: "Sell",
    shopCategory: (category) => `Shop ${category}`,
    shopNow: "Shop now",
    homeHeroKicker: "Amazon Fashion",
    homeHeroTitle: "Refresh your closet with everyday finds",
    homeHeroSubtitle: "Warm layers, bags, shoes, and everyday essentials pulled from the fashion catalog.",
    homeHeroPrimary: "Shop departments",
    homeHeroSecondary: "Today's fashion picks",
    homeDepartments: "Shop by department",
    homeFeaturedDeals: "Deals and picks from the catalog",
    homePopular: "Top-rated fashion picks",
    homeUnderBudget: "Style under $50",
    homeCuratedTitle: "Explore fashion departments",
    homeSeeMore: "See more",
    homeDealBadge: "Limited-time find",
    homeRatingBadge: "Top rated",
    homeBudgetBadge: "Under $50",
    homeReviews: (count) => `${count} reviews`,
    searchResults: (query) => `Search results for "${query}"`,
    resultsFor: (category) => `Results for "${category}"`,
    itemsFound: (count) => `${count} items found`,
    findingGroundedMatches: "Finding grounded matches...",
    updatingResults: "Updating results...",
    filterUpdateFailed: "Could not update filters.",
    aiFiltersHint: "Filters narrow the current AI result grid instantly.",
    department: "Department",
    allCategory: (category) => `All ${category}`,
    price: "Price",
    minPrice: "Minimum price",
    maxPrice: "Maximum price",
    upTo: (price) => `Up to ${price}`,
    customerReview: "Customer Review",
    ratingUp: "& Up",
    clearRating: "Clear rating",
    color: "Color",
    allColors: "All colors",
    brand: "Brand",
    genderTarget: "Gender",
    style: "Style",
    occasion: "Use case",
    season: "Season",
    material: "Material",
    sleeveLength: "Sleeve length",
    warmthLevel: "Warmth",
    comfortLevel: "Comfort",
    durabilityLevel: "Durability",
    careEaseLevel: "Easy care",
    waterproof: "Water resistance",
    clearFilter: "Any",
    yes: "Yes",
    no: "No",
    levelUp: (level) => `${level}+`,
    freeDelivery: "FREE delivery",
    decisionEvidence: "Decision evidence",
    risk: "Risk",
    evidence: "Evidence",
    snippets: "snippets",
    select: "select",
    selected: "selected",
    addCompare: "+ Compare",
    removeCompare: "Remove",
    aiCriteriaLens: "AI Criteria Lens",
    parsedCriteria: "Parsed criteria",
    decompositionQuality: "Filter decomposition",
    llmSourceGemini: "LLM",
    llmSourceRule: "Rule fallback",
    fallbackInUse: "fallback in use",
    correctionsApplied: (count) => `${count} backend correction${count === 1 ? "" : "s"}`,
    clarification: "Clarify",
    chooseOne: "Choose one",
    openCriteria: "Open",
    activeCriteria: "Active criteria",
    criteriaRows: "Matrix rows",
    criteriaRowsHelp: "These buttons show or hide rows in the comparison matrix.",
    criteriaRowEnabled: (label) => `${label} is shown in the comparison matrix`,
    criteriaRowDisabled: (label) => `${label} is hidden from the comparison matrix`,
    showMoreCriteriaRows: (count) => `Show ${count} more matrix rows`,
    hideCriteriaRows: "Collapse matrix rows",
    preferenceStressTest: "Preference Stress-Test",
    stressHelp: "Adjust preference weights to see how selected or top-ranked items move.",
    stressUpdating: "Recomputing preference ranking...",
    stressInsight: "Preference ranking",
    stressLow: "Low",
    stressHigh: "High",
    stressPrice: "Price sensitivity",
    stressRating: "Rating",
    stressReviewConfidence: "Review confidence",
    stressMaterial: "Material",
    stressComfort: "Comfort",
    stressDurability: "Durability",
    stressCareEase: "Easy care",
    estimatedResults: (count) => `${count} results`,
    matrixHint: "Add 2-4 products from the grid to compare them here.",
    matrixUpdating: "Updating comparison...",
    selectedForCompare: (count) => `${count}/4 selected`,
    criteriaUpdated: "Results updated from edited criteria.",
    initialResults: "Initial results",
    previousCriteria: "Previous criteria",
    reapplyCriteria: "Reapply",
    currentCriteria: "Current",
    criteriaHistory: "Criteria history",
    draftCriteria: "Draft criteria from your query",
    aiInterpreting: "AI Criteria Lens is interpreting your request...",
    aiValidated: "AI output was validated against backend-owned taxonomy, attributes, and evidence before querying Supabase.",
    dimensions: "Dimensions",
    noResults: "No results match your filters.",
    nextActions: "Next actions",
    nextActionsHelp: "Select 2-4 products to compare, or refine the current lens.",
    compareSelected: "Compare selected",
    sourceSnippets: "Source snippets",
    supportingEvidence: "Recommendation evidence",
    skepticalEvidence: "Caution evidence",
    missingEvidence: "Evidence gaps",
    missingSupportingEvidence: "No positive review evidence was found for this criterion.",
    missingSkepticalEvidence: "No cautionary review evidence was found for this criterion.",
    closeSnippets: "Close snippets",
    loadingEvidence: "Loading evidence...",
    noEvidenceInfo: "No review evidence available.",
    reviewEvidenceLabel: "Review evidence",
    metadataEvidenceLabel: "Metadata evidence",
    issue: "Issue",
    comparisonMatrix: "Comparison matrix",
    matrixSort: "Sort products",
    sortOriginal: "Original",
    sortPrice: "Lowest price",
    sortRating: "Top rated",
    sortReviews: "Most reviews",
    commonGround: "Common ground",
    keyDifferences: "Key differences",
    sharedBySome: "Shared by some",
    noSharedTraits: "No clear shared traits in the active rows.",
    noDifferences: "Active rows look the same across the selected products.",
    allSelectedShare: "All selected products share",
    productsShare: "share",
    noPartialSharedTraits: "No partial overlap among the selected products.",
    expandCompareMatrix: "Expand comparison matrix",
    collapseCompareMatrix: "Collapse comparison matrix",
    compareDockHint: "Add products from the grid, then expand this panel to compare them.",
    previousPage: "Previous",
    nextPage: "Next",
    gridPageStatus: (page, total) => `Page ${page} of ${total}`,
    gridPageRange: (start, end, total) => `${start}-${end} of ${total} products`,
    item: "Item",
    orderSummary: "Order Summary",
    quantityShort: "Qty",
    items: "Items",
    proceedToCheckout: "Proceed to Checkout",
    closeDetail: "Close detail",
    boughtTogether: "Bought together",
    fromBrand: "From the brand",
    relatedProducts: "Related products",
    customerReviews: "Customer reviews",
    outOfFive: (rating) => `${rating} out of 5`,
    ratings: (count) => `${count} ratings`,
    priceLabel: "Price:",
    size: "Size",
    aboutItem: "About this item",
    deliveryDate: "Tuesday, May 12",
    inStock: "In Stock",
    quantity: "Qty",
    addToCart: "Add to Cart",
    buyNow: "Buy Now",
    boughtTogetherTitle: "Products customers bought together",
    brandFallback: "Explore more products from this brand.",
    relatedTitle: "Products related to this item",
    customersSay: "Customers say",
    aiGeneratedSummary: "AI-generated summary",
    noReviews: "No reviews yet.",
    starLabel: (ratingValue) => `${ratingValue} star`,
    cartEmptyVisual: "Empty cart",
    cartEmptyTitle: "Your AImazon Cart is empty",
    shopDeals: "Shop today's deals",
    signIn: "Sign in to your account",
    signUp: "Sign up now",
    shoppingCart: "Shopping Cart",
    notSelected: "Not selected",
    delete: "Delete",
    saveForLater: "Save for later",
    compareSimilar: "Compare with similar items",
    subtotal: (count) => `Subtotal (${count} item${count > 1 ? "s" : ""}):`,
    freeShippingNotice: "Your order qualifies for FREE Shipping. Choose this option at checkout.",
    giftOrder: "This order contains a gift",
    recommendationTitle: "Customers Who Bought Items in Your Recent History Also Bought",
    addToCartLower: "Add to cart",
    detailLoadError: "Could not load product detail.",
    addedToCart: "Added to cart.",
    compareLoadError: "Could not load comparison data.",
    aiRequestFailed: "AI request failed.",
    evidenceRequestFailed: "Evidence request failed.",
    refineRequestFailed: "Refine request failed.",
  },
  ko: {
    all: "전체",
    allProducts: "전체 상품",
    searchCategory: "검색 카테고리",
    searchPlaceholder: "AImazon에서 검색",
    search: "검색",
    enableAi: "AI 비교 렌즈 켜기",
    disableAi: "AI 비교 렌즈 끄기",
    aiOn: "AI 켬",
    aiOff: "AI 끔",
    languageToggle: "EN",
    languageToggleAria: "영어로 전환",
    accountGreeting: "안녕하세요, 로그인",
    accountLists: "계정 및 목록",
    cart: "장바구니",
    navDepartments: "카테고리",
    navWomen: "여성",
    navMen: "남성",
    navDeals: "$50 이하",
    navTopRated: "평점 높은 상품",
    navAiLens: "AI 렌즈",
    navDealsTitle: "$50 이하 스타일",
    navTopRatedTitle: "평점 높은 패션 상품",
    navCustomerService: "고객센터",
    navRegistry: "레지스트리",
    navGiftCards: "기프트카드",
    navSell: "판매하기",
    shopCategory: (category) => `${category} 쇼핑하기`,
    shopNow: "지금 쇼핑하기",
    homeHeroKicker: "아마존 패션",
    homeHeroTitle: "매일 입기 좋은 패션 상품을 바로 둘러보세요",
    homeHeroSubtitle: "아우터, 가방, 신발, 데일리 아이템을 한 화면에서 바로 둘러보세요.",
    homeHeroPrimary: "카테고리 쇼핑",
    homeHeroSecondary: "오늘의 패션 추천",
    homeDepartments: "카테고리별 쇼핑",
    homeFeaturedDeals: "카탈로그 추천 상품",
    homePopular: "평점 높은 패션 상품",
    homeUnderBudget: "$50 이하 스타일",
    homeCuratedTitle: "패션 카테고리 탐색",
    homeSeeMore: "더 보기",
    homeDealBadge: "오늘의 추천",
    homeRatingBadge: "평점 우수",
    homeBudgetBadge: "$50 이하",
    homeReviews: (count) => `${count}개 리뷰`,
    searchResults: (query) => `"${query}" 검색 결과`,
    resultsFor: (category) => `"${category}" 결과`,
    itemsFound: (count) => `${count}개 상품`,
    findingGroundedMatches: "근거가 있는 후보를 찾는 중...",
    updatingResults: "결과 업데이트 중...",
    filterUpdateFailed: "필터 결과를 업데이트할 수 없습니다.",
    aiFiltersHint: "필터는 현재 AI 결과 그리드에 즉시 적용됩니다.",
    department: "카테고리",
    allCategory: (category) => `${category} 전체`,
    price: "가격",
    minPrice: "최소 가격",
    maxPrice: "최대 가격",
    upTo: (price) => `${price} 이하`,
    customerReview: "고객 리뷰",
    ratingUp: "이상",
    clearRating: "평점 조건 해제",
    color: "색상",
    allColors: "전체 색상",
    brand: "브랜드",
    genderTarget: "대상",
    style: "스타일",
    occasion: "용도",
    season: "계절",
    material: "소재",
    sleeveLength: "소매 길이",
    warmthLevel: "보온성",
    comfortLevel: "편안함",
    durabilityLevel: "내구성",
    careEaseLevel: "관리 편의",
    waterproof: "방수",
    clearFilter: "전체",
    yes: "예",
    no: "아니오",
    levelUp: (level) => `${level} 이상`,
    freeDelivery: "무료 배송",
    decisionEvidence: "선택 근거",
    risk: "리스크",
    evidence: "근거",
    snippets: "근거 보기",
    select: "선택",
    selected: "선택됨",
    addCompare: "+ 비교",
    removeCompare: "제거",
    aiCriteriaLens: "AI 기준 렌즈",
    parsedCriteria: "분해된 조건",
    decompositionQuality: "필터 분해",
    llmSourceGemini: "LLM",
    llmSourceRule: "규칙 fallback",
    fallbackInUse: "fallback 사용 중",
    correctionsApplied: (count) => `백엔드 보정 ${count}개`,
    clarification: "조건 조정",
    chooseOne: "선택 필요",
    openCriteria: "열림",
    activeCriteria: "활성 기준",
    criteriaRows: "비교표 행",
    criteriaRowsHelp: "이 버튼은 비교표에 표시할 기준 행을 켜고 끕니다.",
    criteriaRowEnabled: (label) => `${label} 기준이 비교표에 표시됩니다`,
    criteriaRowDisabled: (label) => `${label} 기준이 비교표에서 숨겨집니다`,
    showMoreCriteriaRows: (count) => `추가 비교 기준 ${count}개 보기`,
    hideCriteriaRows: "비교 기준 접기",
    preferenceStressTest: "선호 스트레스 테스트",
    stressHelp: "선호 가중치를 조절하면 선택 상품 또는 상위 상품의 순위 변화가 계산됩니다.",
    stressUpdating: "선호 순위를 다시 계산하는 중...",
    stressInsight: "선호 순위",
    stressLow: "낮음",
    stressHigh: "높음",
    stressPrice: "가격 민감도",
    stressRating: "평점",
    stressReviewConfidence: "리뷰 신뢰도",
    stressMaterial: "소재",
    stressComfort: "착용감",
    stressDurability: "내구성",
    stressCareEase: "관리 편의",
    estimatedResults: (count) => `${count}개 결과`,
    matrixHint: "그리드에서 2~4개 상품을 추가하면 여기서 비교할 수 있습니다.",
    matrixUpdating: "비교표 업데이트 중...",
    selectedForCompare: (count) => `${count}/4개 선택됨`,
    criteriaUpdated: "수정한 조건으로 결과를 업데이트했습니다.",
    initialResults: "초기 결과",
    previousCriteria: "이전 조건",
    reapplyCriteria: "다시 적용",
    currentCriteria: "현재 조건",
    criteriaHistory: "조건 히스토리",
    draftCriteria: "입력 기반 임시 기준",
    aiInterpreting: "AI 기준 렌즈가 요청을 해석하고 있습니다...",
    aiValidated: "AI 출력은 Supabase 조회 전에 백엔드의 taxonomy, attribute, evidence 기준으로 검증되었습니다.",
    dimensions: "비교 기준",
    noResults: "조건에 맞는 상품이 없습니다.",
    nextActions: "다음 작업",
    nextActionsHelp: "비교할 상품 2~4개를 선택하거나 현재 기준을 조정하세요.",
    compareSelected: "선택 상품 비교",
    sourceSnippets: "근거 스니펫",
    supportingEvidence: "추천 근거",
    skepticalEvidence: "주의 근거",
    missingEvidence: "근거 부족",
    missingSupportingEvidence: "이 기준에 대한 긍정 리뷰 근거가 없습니다.",
    missingSkepticalEvidence: "이 기준에 대한 주의 리뷰 근거가 없습니다.",
    closeSnippets: "스니펫 닫기",
    loadingEvidence: "근거를 불러오는 중...",
    noEvidenceInfo: "정보 없음",
    reviewEvidenceLabel: "리뷰 근거",
    metadataEvidenceLabel: "리뷰 근거 없음",
    issue: "이슈",
    comparisonMatrix: "비교표",
    matrixSort: "상품 정렬",
    sortOriginal: "기본순",
    sortPrice: "낮은 가격순",
    sortRating: "평점순",
    sortReviews: "리뷰 많은순",
    commonGround: "공통점",
    keyDifferences: "차이점",
    sharedBySome: "일부 공통",
    noSharedTraits: "활성 기준 안에서 뚜렷한 공통점이 없습니다.",
    noDifferences: "활성 기준에서는 선택 상품들이 거의 같습니다.",
    allSelectedShare: "선택 상품 전체 공통",
    productsShare: "공유",
    noPartialSharedTraits: "일부 상품끼리만 공유하는 기준은 없습니다.",
    expandCompareMatrix: "비교표 펼치기",
    collapseCompareMatrix: "비교표 접기",
    compareDockHint: "그리드에서 상품을 추가한 뒤 이 패널을 펼쳐 비교하세요.",
    previousPage: "이전",
    nextPage: "다음",
    gridPageStatus: (page, total) => `${page} / ${total} 페이지`,
    gridPageRange: (start, end, total) => `전체 ${total}개 중 ${start}-${end}개`,
    item: "상품",
    orderSummary: "주문 요약",
    quantityShort: "수량",
    items: "상품",
    proceedToCheckout: "결제 진행",
    closeDetail: "상품 상세 닫기",
    boughtTogether: "함께 구매",
    fromBrand: "브랜드 소개",
    relatedProducts: "관련 상품",
    customerReviews: "고객 리뷰",
    outOfFive: (rating) => `5점 만점에 ${rating}`,
    ratings: (count) => `${count}개 평점`,
    priceLabel: "가격:",
    size: "사이즈",
    aboutItem: "상품 정보",
    deliveryDate: "5월 12일 화요일",
    inStock: "재고 있음",
    quantity: "수량",
    addToCart: "장바구니 담기",
    buyNow: "바로 구매",
    boughtTogetherTitle: "고객이 함께 구매한 상품",
    brandFallback: "이 브랜드의 다른 상품도 확인해 보세요.",
    relatedTitle: "이 상품과 관련된 상품",
    customersSay: "고객 의견 요약",
    aiGeneratedSummary: "AI 생성 요약",
    noReviews: "아직 리뷰가 없습니다.",
    starLabel: (ratingValue) => `${ratingValue}점`,
    cartEmptyVisual: "빈 장바구니",
    cartEmptyTitle: "AImazon 장바구니가 비어 있습니다",
    shopDeals: "오늘의 딜 보기",
    signIn: "계정 로그인",
    signUp: "지금 가입",
    shoppingCart: "장바구니",
    notSelected: "선택 안 됨",
    delete: "삭제",
    saveForLater: "나중에 저장",
    compareSimilar: "유사 상품 비교",
    subtotal: (count) => `소계 (${count}개 상품):`,
    freeShippingNotice: "이 주문은 무료 배송 대상입니다. 결제 시 무료 배송 옵션을 선택하세요.",
    giftOrder: "선물 주문입니다",
    recommendationTitle: "최근 본 상품을 구매한 고객이 함께 구매한 상품",
    addToCartLower: "장바구니 담기",
    detailLoadError: "상품 상세 정보를 불러올 수 없습니다.",
    addedToCart: "장바구니에 추가되었습니다.",
    compareLoadError: "비교 정보를 불러올 수 없습니다.",
    aiRequestFailed: "AI 요청에 실패했습니다.",
    evidenceRequestFailed: "근거 정보를 불러올 수 없습니다.",
    refineRequestFailed: "AI 기준 조정에 실패했습니다.",
  },
};

const CATALOG_LABELS_KO = {
  "Amazon Fashion": "아마존 패션",
  Men: "남성",
  Women: "여성",
  Boys: "남아",
  Girls: "여아",
  Baby: "베이비",
  Unisex: "공용",
  Accessories: "액세서리",
  Bags: "가방",
  Bottoms: "하의",
  Clothing: "의류",
  Dresses: "원피스",
  Footwear: "신발",
  Outerwear: "아우터",
  Shoes: "신발",
  Tops: "상의",
  "Athletic Shoes": "운동화",
  Backpacks: "백팩",
  Belts: "벨트",
  Blazers: "블레이저",
  Blouses: "블라우스",
  Boots: "부츠",
  "Clogs & Mules": "클로그/뮬",
  Coats: "코트",
  "Crossbody Bags": "크로스백",
  Duffels: "더플백",
  Flats: "플랫슈즈",
  Gloves: "장갑",
  "Hats & Caps": "모자/캡",
  Hats: "모자",
  Heels: "힐",
  Hoodies: "후드",
  Jackets: "자켓",
  Jeans: "청바지",
  "Knit Tops": "니트 상의",
  Loafers: "로퍼",
  "Midi Dresses": "미디 원피스",
  Oxfords: "옥스퍼드화",
  Paddings: "패딩",
  Pants: "팬츠",
  Pumps: "펌프스",
  "Rain Jackets": "레인 자켓",
  Sandals: "샌들",
  Scarves: "스카프",
  Shirts: "셔츠",
  "Shirt Dresses": "셔츠 원피스",
  "Shoulder Bags": "숄더백",
  Shorts: "쇼츠",
  Skirts: "스커트",
  Slacks: "슬랙스",
  "Slip Dresses": "슬립 원피스",
  Slippers: "슬리퍼",
  Sneakers: "스니커즈",
  Socks: "양말",
  Sunglasses: "선글라스",
  Sweaters: "스웨터",
  "Sweater Dresses": "스웨터 원피스",
  Tees: "티셔츠",
  Totes: "토트백",
  "Trail Shoes": "트레일화",
  Trousers: "트라우저",
  Vests: "조끼",
  Wallets: "지갑",
  Windbreakers: "바람막이",
  "Wrap Dresses": "랩 원피스",
};

const DIMENSION_LABELS_KO = {
  productTaxonomy: "상품 범주",
  productType: "상품 유형",
  category: "카테고리",
  subCategory: "세부 카테고리",
  priceMin: "최소 가격",
  priceMax: "가격",
  rating: "평점",
  reviewCount: "리뷰 수",
  price: "가격",
  reviewStrengths: "리뷰 장점",
  reviewRisks: "리뷰 리스크",
  fit: "핏",
  material: "소재",
  sleeveLength: "소매 길이",
  brand: "브랜드",
  colorFamily: "색상",
  season: "계절",
  occasion: "용도",
  style: "스타일",
  genderTarget: "대상 성별",
  warmthLevel: "보온성",
  comfortLevel: "편안함",
  durabilityLevel: "내구성",
  waterproof: "방수",
  weightGrams: "무게",
  breathabilityLevel: "통기성",
  stretchLevel: "신축성",
  softnessLevel: "부드러움",
  machineWashable: "세탁 편의",
  shoulderStructure: "어깨 구조",
  waistRise: "허리 밑위",
  toeBoxFit: "발볼/앞코",
  capacityLiters: "수납 용량",
  archSupportLevel: "아치 지지",
  soleGripLevel: "밑창 접지",
  strapComfortLevel: "스트랩 편안함",
  pocketUtilityLevel: "주머니 활용도",
  opacityLevel: "비침 정도",
  careComplexityLevel: "관리 난이도",
  careEaseLevel: "관리 편의",
  lengthFit: "기장감",
  warmthIntent: "보온 기준",
  comfortIntent: "편안함 기준",
  occasionIntent: "용도 기준",
  styleIntent: "스타일 기준",
  Price: "가격",
  Size: "사이즈",
  Subcategory: "세부 카테고리",
  "Review Strengths": "리뷰 장점",
  "Review Risks": "리뷰 리스크",
  "Overall Review Signal": "종합 리뷰 신호",
  "Review Count": "리뷰 수",
  Category: "카테고리",
  "Product Type": "상품 유형",
  Fit: "핏",
  Material: "소재",
  "Sleeve Length": "소매 길이",
  Brand: "브랜드",
  "Color Family": "색상",
  "Gender Target": "대상 성별",
  "Product type": "상품 유형",
  "Party intent": "파티 기준",
  Season: "계절",
};

const ACTION_LABELS_KO = {
  "prioritize material quality": "소재 품질 우선",
  "hide thin-evidence products": "근거가 부족한 상품 숨기기",
  compare_selected: "선택 상품 비교",
  undo_last_refine: "되돌리기",
  "Prioritize material quality": "소재 품질 우선",
  "Hide thin-evidence products": "근거가 부족한 상품 숨기기",
  "Compare selected products": "선택 상품 비교",
  Undo: "되돌리기",
};

const SENTIMENT_LABELS_KO = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
  mixed: "혼합",
};

const CRITERION_VALUE_LABELS_KO = {
  Accessories: "액세서리",
  Bags: "가방",
  Bag: "가방",
  Backpacks: "백팩",
  Footwear: "신발",
  Outerwear: "아우터",
  Tops: "상의",
  Bottoms: "하의",
  Dresses: "원피스",
  Commute: "출퇴근",
  Office: "오피스",
  Travel: "여행",
  Outdoor: "아웃도어",
  Casual: "캐주얼",
  Minimal: "미니멀",
  Classic: "클래식",
  Sporty: "스포티",
  Street: "스트리트",
  Feminine: "페미닌",
  Formal: "포멀",
  Winter: "겨울",
  Spring: "봄",
  Summer: "여름",
  Fall: "가을",
  "All Season": "사계절",
  Black: "블랙",
  Brown: "브라운",
  Beige: "베이지",
  Navy: "네이비",
  Gray: "그레이",
  White: "화이트",
  Cream: "크림",
  Green: "그린",
  Blue: "블루",
  "Sky Blue": "스카이 블루",
  Red: "레드",
  Pink: "핑크",
  Yes: "예",
  No: "아니오",
  all_season: "사계절",
  sky_blue: "스카이 블루",
  wool_blend: "울 블렌드",
  cotton_poplin: "코튼 포플린",
  recycled_nylon: "리사이클 나일론",
  mesh_knit: "메쉬 니트",
  stretch_twill: "스트레치 트윌",
  linen_blend: "리넨 블렌드",
  cotton_jersey: "코튼 저지",
  rib_knit: "립 니트",
  ponte_knit: "폰테 니트",
  technical_shell: "테크니컬 쉘",
  synthetic_blend: "합성 블렌드",
  silk_blend: "실크 블렌드",
  "Wool Blend": "울 블렌드",
  "Cotton Poplin": "코튼 포플린",
  "Recycled Nylon": "리사이클 나일론",
  "Mesh Knit": "메쉬 니트",
  "Stretch Twill": "스트레치 트윌",
  "Technical Shell": "테크니컬 쉘",
  Softshell: "소프트쉘",
  Leather: "가죽",
  Canvas: "캔버스",
  Regular: "정핏",
  Relaxed: "여유핏",
  Oversized: "오버핏",
  Slim: "슬림",
  Adjustable: "조절형",
  Wide: "넓음",
  Female: "여성",
  Male: "남성",
  Unisex: "유니섹스",
  Men: "남성",
  Women: "여성",
  Boys: "남아",
  Girls: "여아",
  Baby: "베이비",
  "One Size": "원사이즈",
  "One size": "원사이즈",
  "Unisex-adult": "공용 성인",
  "Unisex Adult": "공용 성인",
  Small: "스몰",
  Medium: "미디엄",
  Large: "라지",
  "X-Large": "엑스라지",
  "XX-Large": "투엑스라지",
  "Extra Small": "엑스트라 스몰",
  "Extra Large": "엑스트라 라지",
  women: "여성",
  men: "남성",
  girls: "여아",
  boys: "남아",
  baby: "유아",
  female: "여성",
  male: "남성",
  unisex: "유니섹스",
  cotton: "면",
  wool: "울",
  leather: "가죽",
  polyester: "폴리에스터",
  nylon: "나일론",
  denim: "데님",
  fleece: "플리스",
  linen: "리넨",
  synthetic: "합성 소재",
  short_sleeve: "반팔",
  long_sleeve: "긴팔",
  sleeveless: "민소매",
  commute: "출퇴근",
  office: "오피스",
  school: "통학",
  travel: "여행",
  daily: "데일리",
  outdoor: "아웃도어",
  formal: "포멀",
  party: "파티",
  workout: "운동",
  minimal: "미니멀",
  classic: "클래식",
  technical: "테크니컬",
  sporty: "스포티",
  casual: "캐주얼",
  cute: "귀여운",
  spring: "봄",
  summer: "여름",
  fall: "가을",
  winter: "겨울",
  black: "블랙",
  navy: "네이비",
  ivory: "아이보리",
  olive: "올리브",
  stone: "스톤",
  charcoal: "차콜",
  gray: "그레이",
  beige: "베이지",
  brown: "브라운",
  burgundy: "버건디",
  cream: "크림",
  forest: "포레스트",
  regular: "정핏",
  relaxed: "여유핏",
  oversized: "오버핏",
  slim: "슬림",
  adjustable: "조절형",
  soft: "부드러운 구조",
  natural: "자연스러운 구조",
  structured: "구조적인 형태",
  dropped: "드롭 숄더",
  high: "하이",
  mid: "미드",
  low: "로우",
  wide: "넓음",
  narrow: "좁음",
  long: "김",
  short: "짧음",
  varies_by_height: "키에 따라 다름",
  not_applicable: "해당 없음",
  "Needs clarification": "선택 필요",
  "Review-backed warmth": "리뷰 기반 보온성",
  "Winter/insulated items": "겨울/보온 상품",
  "Wool/fleece-like materials": "울/플리스 계열 소재",
  "Review-backed comfort": "리뷰 기반 편안함",
  "Soft casual wear": "부드러운 캐주얼",
  "Supportive shoes": "지지감 있는 신발",
  "Cute/playful": "귀엽고 발랄한",
  "Classic/polished": "클래식하고 단정한",
  "Minimal/clean": "미니멀하고 깔끔한",
  "Casual/everyday": "캐주얼 데일리",
  "Cute and playful": "귀엽고 발랄한",
  "Classic and polished": "클래식하고 단정한",
  "Minimal and clean": "미니멀하고 깔끔한",
  "Casual and everyday": "캐주얼 데일리",
  "Office/work": "오피스/업무",
  "Daily use": "데일리",
  "Casual party": "캐주얼 파티",
  "Formal event": "격식 있는 행사",
  "Statement/playful style": "화려한 스타일",
  "Polished shirt": "단정한 셔츠",
  casual_party: "캐주얼 파티",
  formal_event: "격식 있는 행사",
  statement_style: "화려한 스타일",
  polished_shirt: "단정한 셔츠",
};

const ISSUE_LABELS_KO = {
  "review complaint": "리뷰 불만",
  "scratchy material": "소재가 까슬함",
  "insufficient storage": "수납 부족",
  "limited storage": "수납 제한",
  "weak strap comfort": "스트랩 착용감 불편",
  "strap discomfort": "스트랩 불편",
  "color fading": "색 빠짐",
  "thin fabric": "원단이 얇음",
  "too thin": "두께 부족",
  "not warm enough": "보온성 부족",
  "not waterproof enough": "방수 성능 부족",
  "runs small": "작게 맞음",
  "runs large": "크게 맞음",
  "fit runs small": "핏이 작게 맞음",
  "fit runs large": "핏이 크게 맞음",
  "boxy fit": "박시한 핏",
  "wide shoulder look": "어깨가 넓어 보임",
  "poor zipper": "지퍼 품질 아쉬움",
  "weak zipper": "지퍼 내구성 부족",
  "sole grip issue": "밑창 접지력 아쉬움",
  "toe box tight": "앞코/발볼이 좁음",
  "arch support weak": "아치 지지 부족",
  "high care effort": "관리 난이도 높음",
  "wrinkles easily": "주름이 잘 생김",
  "heavy": "무거움",
  "expensive": "가격 부담",
  "low value": "가격 대비 만족도 낮음",
};

function getInitialLanguage() {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "ko") return stored;
  return window.navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function getCopy(language) {
  return UI_COPY[language] ?? UI_COPY.en;
}

function inferLanguageFromQuery(query, currentLanguage) {
  if (/\p{Script=Hangul}/u.test(query)) return "ko";
  if (/[a-z]/i.test(query)) return "en";
  return currentLanguage;
}

function normalizeDraftText(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function draftTextIncludesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function createDraftCriterion(key, label, displayValue) {
  return {
    key,
    label,
    value: displayValue,
    displayValue,
    status: "draft",
    source: "local_draft",
  };
}

function parseDraftPriceLimit(query) {
  const patterns = [
    /(?:under|below|less than|not over|up to|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd)?\s*(?:or less|and under|or under|below|max)/i,
    /(\d+(?:\.\d+)?)\s*\$\s*(?:이하|아래|안쪽|미만|까지)/i,
    /(\d+(?:\.\d+)?)\s*(?:달러|불)?\s*(?:이하|아래|안쪽|미만|까지)/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }
  return undefined;
}

function buildDraftAiLens(query, category, language, copy) {
  const text = normalizeDraftText(query);
  const criteria = [];
  const addCriterion = (key, label, displayValue) => {
    if (criteria.some((criterion) => criterion.key === key && criterion.displayValue === displayValue)) return;
    criteria.push(createDraftCriterion(key, label, displayValue));
  };

  const priceLimit = parseDraftPriceLimit(query);
  if (Number.isFinite(priceLimit)) {
    addCriterion("priceMax", "Price", `Under $${Math.round(priceLimit)}`);
  }

  if (category) {
    addCriterion("category", "Category", category);
  } else if (draftTextIncludesAny(text, ["가방", "bag", "bags", "tote", "crossbody", "backpack", "토트", "크로스백", "백팩", "숄더백"])) {
    addCriterion("category", "Category", "Bags");
  } else if (draftTextIncludesAny(text, ["코트", "자켓", "재킷", "바람막이", "아우터", "coat", "jacket", "windbreaker", "outerwear", "raincoat"])) {
    addCriterion("category", "Category", "Outerwear");
  } else if (draftTextIncludesAny(text, ["신발", "스니커즈", "운동화", "로퍼", "부츠", "sneaker", "shoe", "loafer", "boot"])) {
    addCriterion("category", "Category", "Footwear");
  } else if (draftTextIncludesAny(text, ["원피스", "드레스", "dress"])) {
    addCriterion("category", "Category", "Dresses");
  } else if (draftTextIncludesAny(text, ["바지", "슬랙스", "청바지", "pants", "trousers", "jeans", "slacks"])) {
    addCriterion("category", "Category", "Bottoms");
  } else if (draftTextIncludesAny(text, ["셔츠", "블라우스", "니트", "상의", "top", "shirt", "blouse", "sweater", "cardigan"])) {
    addCriterion("category", "Category", "Tops");
  }

  const productTypeRules = [
    ["subCategory", "Product type", "Crossbody Bags", ["크로스백", "crossbody"]],
    ["subCategory", "Product type", "Totes", ["토트", "tote", "shopper"]],
    ["subCategory", "Product type", "Backpacks", ["백팩", "backpack", "daypack"]],
    ["subCategory", "Product type", "Windbreakers", ["바람막이", "windbreaker"]],
    ["subCategory", "Product type", "Rain Jackets", ["방수자켓", "레인 자켓", "rain jacket", "raincoat"]],
    ["subCategory", "Product type", "Coats", ["코트", "coat"]],
    ["subCategory", "Product type", "Sneakers", ["스니커즈", "운동화", "sneaker"]],
    ["subCategory", "Product type", "Loafers", ["로퍼", "loafer"]],
    ["subCategory", "Product type", "Trousers", ["트라우저", "슬랙스", "trouser", "slacks"]],
    ["subCategory", "Product type", "Blouses", ["블라우스", "blouse"]],
    ["subCategory", "Product type", "Shirts", ["셔츠", "shirt", "shirts"]],
    ["subCategory", "Product type", "Tees", ["티셔츠", "반팔티", "tee", "tees", "t-shirt", "tshirt"]],
  ];
  for (const [key, label, displayValue, terms] of productTypeRules) {
    if (draftTextIncludesAny(text, terms)) {
      addCriterion(key, label, displayValue);
      break;
    }
  }

  if (draftTextIncludesAny(text, ["출근", "출퇴근", "통근", "commute", "commuting"])) addCriterion("occasion", "Occasion", "Commute");
  else if (draftTextIncludesAny(text, ["회사", "오피스", "직장", "office", "workwear", "for work"])) addCriterion("occasion", "Occasion", "Office");
  else if (draftTextIncludesAny(text, ["여행", "출장", "travel", "airport", "trip"])) addCriterion("occasion", "Occasion", "Travel");
  else if (draftTextIncludesAny(text, ["데일리", "일상", "매일", "daily", "everyday"])) addCriterion("occasion", "Occasion", "Casual");

  if (draftTextIncludesAny(text, ["겨울", "따뜻", "보온", "winter", "warm", "cold"])) addCriterion("season", "Season", "Winter");
  else if (draftTextIncludesAny(text, ["여름", "시원", "통기", "summer", "breathable", "hot weather"])) addCriterion("season", "Season", "Summer");
  else if (draftTextIncludesAny(text, ["간절기", "봄", "가을", "spring", "fall", "transitional"])) addCriterion("season", "Season", "Spring");

  if (draftTextIncludesAny(text, ["비", "방수", "장마", "rain", "rainy", "waterproof", "wet weather"])) addCriterion("waterproof", "Waterproof", "Yes");
  if (draftTextIncludesAny(text, ["반팔", "short sleeve", "short-sleeve"])) addCriterion("sleeveLength", "Sleeve Length", "short_sleeve");
  else if (draftTextIncludesAny(text, ["긴팔", "long sleeve", "long-sleeve"])) addCriterion("sleeveLength", "Sleeve Length", "long_sleeve");
  if (draftTextIncludesAny(text, ["가벼", "경량", "lightweight", "not heavy"])) addCriterion("weightGrams", "Weight", language === "ko" ? "가벼운 편" : "Lightweight");
  if (draftTextIncludesAny(text, ["수납", "포켓", "주머니", "pocket", "storage", "capacity", "laptop", "노트북"])) addCriterion("pocketUtilityLevel", "Pocket Utility", language === "ko" ? "수납/포켓" : "Storage/pockets");
  if (draftTextIncludesAny(text, ["발볼", "wide toe", "toe box"])) addCriterion("toeBoxFit", "Toe Box Fit", "Wide");
  if (draftTextIncludesAny(text, ["조절", "adjustable"])) addCriterion("fit", "Fit", "Adjustable");
  else if (draftTextIncludesAny(text, ["오버핏", "oversized"])) addCriterion("fit", "Fit", "Oversized");
  else if (draftTextIncludesAny(text, ["여유", "relaxed"])) addCriterion("fit", "Fit", "Relaxed");

  const colorRules = [
    ["Black", ["블랙", "black"]],
    ["Navy", ["네이비", "navy"]],
    ["Beige", ["베이지", "beige"]],
    ["Sky Blue", ["스카이 블루", "sky blue", "sky-blue"]],
    ["Brown", ["브라운", "brown"]],
    ["Cream", ["크림", "cream"]],
  ];
  for (const [displayValue, terms] of colorRules) {
    if (draftTextIncludesAny(text, terms)) {
      addCriterion("colorFamily", "Color Family", displayValue);
      break;
    }
  }

  const materialRules = [
    ["Wool Blend", ["울", "wool"]],
    ["Leather", ["가죽", "leather"]],
    ["Canvas", ["캔버스", "canvas"]],
    ["Technical Shell", ["테크니컬", "technical shell"]],
    ["Recycled Nylon", ["나일론", "nylon"]],
    ["Cotton Poplin", ["코튼", "면", "cotton"]],
  ];
  for (const [displayValue, terms] of materialRules) {
    if (draftTextIncludesAny(text, terms)) {
      addCriterion("material", "Material", displayValue);
      break;
    }
  }

  const draftDimensions = [
    { key: "price", label: "Price" },
    { key: "reviewStrengths", label: "Review Strengths" },
    { key: "reviewRisks", label: "Review Risks" },
    ...criteria.map((criterion) => ({ key: criterion.key, label: criterion.label })),
  ];

  return {
    ...createEmptyAiLens("planning"),
    interpretation: {
      summary: copy.draftCriteria,
      warning: "",
    },
    parsedCriteria: criteria.slice(0, 8),
    dimensions: normalizeAiDimensions(draftDimensions, criteria),
  };
}

function localizeCatalogLabel(value, language) {
  if (language !== "ko") return value;
  return CATALOG_LABELS_KO[value] ?? value;
}

function localizeDimensionLabel(dimension, language) {
  const keyOrLabel = typeof dimension === "string" ? dimension : dimension?.key;
  const fallback = typeof dimension === "string" ? dimension : dimension?.label;
  if (language !== "ko") return fallback ?? keyOrLabel;
  return DIMENSION_LABELS_KO[keyOrLabel] ?? DIMENSION_LABELS_KO[fallback] ?? fallback ?? keyOrLabel;
}

function localizeCriterionValue(value, language, copy) {
  if (value === "Choose one") return copy.chooseOne;
  if (value === "Open") return copy.openCriteria;
  if (language !== "ko") return value;
  const text = String(value ?? "");
  const underDollars = text.match(/^Under\s+\$?(\d+(?:\.\d+)?)$/i);
  if (underDollars) return `$${underDollars[1]} 이하`;
  const atLeastStars = text.match(/^At least\s+(\d+(?:\.\d+)?)\s+stars?$/i);
  if (atLeastStars) return `${atLeastStars[1]}점 이상`;
  return CRITERION_VALUE_LABELS_KO[text] ?? localizeCatalogLabel(text, language);
}

const AI_CRITERIA_GROUPS = [
  {
    key: "productTaxonomy",
    label: "Product category",
    keys: ["category", "subCategory", "productType"],
  },
];

const AI_CRITERIA_GROUP_BY_KEY = new Map(
  AI_CRITERIA_GROUPS.flatMap((group) => group.keys.map((key) => [key, group])),
);

function getAiCriteriaGroup(key) {
  return AI_CRITERIA_GROUP_BY_KEY.get(key);
}

function mergedCriterionStatus(criteria) {
  if (criteria.some((criterion) => criterion.status === "ambiguous")) return "ambiguous";
  if (criteria.some((criterion) => criterion.status === "draft")) return "draft";
  return criteria[0]?.status ?? "applied";
}

function groupAiCriteria(criteria = []) {
  const grouped = new Map();
  const result = [];
  for (const criterion of criteria) {
    const group = getAiCriteriaGroup(criterion.key);
    if (!group) {
      result.push({ type: "criterion", key: `${criterion.key}-${criterion.displayValue}`, criterion, status: criterion.status });
      continue;
    }

    let entry = grouped.get(group.key);
    if (!entry) {
      entry = {
        type: "group",
        key: group.key,
        label: group.label,
        keys: group.keys,
        criteria: [],
      };
      grouped.set(group.key, entry);
      result.push(entry);
    }
    entry.criteria.push(criterion);
  }

  return result.map((item) => (
    item.type === "group"
      ? { ...item, status: mergedCriterionStatus(item.criteria) }
      : item
  ));
}

function localizeAiCriteriaGroupLabel(group, language) {
  if (language !== "ko") return group.label;
  return DIMENSION_LABELS_KO[group.key] ?? group.label;
}

function formatGroupedCriterionValue(group, language, copy) {
  const values = [];
  const seen = new Set();
  for (const key of group.keys) {
    const matchingCriteria = group.criteria.filter((criterion) => criterion.key === key);
    for (const criterion of matchingCriteria) {
      const localized = localizeCriterionValue(criterion.displayValue ?? criterion.value, language, copy);
      const normalized = String(localized ?? "").trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      values.push(localized);
    }
  }
  return values.length ? values.join(" / ") : copy.openCriteria;
}

function groupAiDimensionControls(dimensions = []) {
  const grouped = new Map();
  const result = [];
  for (const dimension of dimensions) {
    const group = getAiCriteriaGroup(dimension.key);
    if (!group) {
      result.push({ ...dimension, dimensionKeys: [dimension.key], grouped: false });
      continue;
    }

    let entry = grouped.get(group.key);
    if (!entry) {
      entry = {
        key: group.key,
        label: group.label,
        dimensionKeys: [],
        grouped: true,
        active: false,
      };
      grouped.set(group.key, entry);
      result.push(entry);
    }
    entry.dimensionKeys.push(dimension.key);
    entry.active = entry.active || Boolean(dimension.active);
  }
  return result;
}

function isAiDimensionControlRelevant(control, criteriaKeys) {
  return Boolean(control.active) || (control.dimensionKeys ?? [control.key]).some((key) => DEFAULT_AI_DIMENSIONS.has(key) || criteriaKeys.has(key));
}

function localizeActionLabel(action, language) {
  if (language !== "ko") return action.label;
  return ACTION_LABELS_KO[action.command] ?? ACTION_LABELS_KO[action.label] ?? action.label;
}

function localizeSentiment(value, language) {
  if (language !== "ko") return value;
  return SENTIMENT_LABELS_KO[value] ?? value;
}

function localizeIssue(value, language) {
  const readable = String(value ?? "").replaceAll("_", " ").trim();
  if (language !== "ko") return readable;
  if (!readable || readable === "N/A") return "없음";
  return readable
    .split(/\s*,\s*/)
    .map((part) => ISSUE_LABELS_KO[part.toLowerCase()] ?? (LATIN_WORD_PATTERN.test(part) ? "리뷰 이슈" : part))
    .join(", ");
}

function localizeMatrixValue(key, value, language, copy) {
  if (value == null || value === "") return language === "ko" ? "없음" : "N/A";
  if (language === "ko" && key === "brand") {
    const text = String(value ?? "").trim();
    if (!text || text === "N/A") return "없음";
    return "등록 브랜드";
  }
  if (language === "ko" && key === "reviewRisks") {
    const localizedIssue = localizeIssue(value, language);
    return localizedIssue === String(value) ? "리뷰 리스크 근거 있음" : localizedIssue;
  }
  if (key === "reviewStrengths" && language === "ko") {
    const localized = String(value)
      .replace(/^Material:\s*/i, "소재: ")
      .replace(/^Fit:\s*/i, "핏: ")
      .replace(/^Comfort:\s*/i, "편안함: ")
      .replace(/^Durability:\s*/i, "내구성: ");
    return localized === String(value) ? "긍정 리뷰 근거 있음" : localized;
  }
  return localizeCriterionValue(String(value), language, copy);
}

function localizeAttributeValue(attribute, language, copy) {
  return localizeMatrixValue(attribute?.key, attribute?.displayValue ?? attribute?.value, language, copy);
}

function localizeAiEvidenceText(value, language) {
  if (language !== "ko") return value;
  if (value === "strong") return "강함";
  if (value === "medium") return "보통";
  if (value === "limited") return "제한적";
  if (value === "High warmth") return "보온성이 높음";
  if (value === "Stronger durability signal") return "내구성 근거가 강함";
  if (value === "Candidate from the validated product set") return "검증된 상품 후보";
  if (value === "Matched backend-owned filters") return "백엔드 필터 기준과 일치";
  if (value === "Limited review coverage") return "리뷰 근거가 제한적";
  return value;
}

const LATIN_WORD_PATTERN = /[A-Za-z]{2,}/;

const KO_PRODUCT_TYPE_RULES = [
  { pattern: /\b(pin|pins|brooch|badge)\b/i, label: "패션 핀" },
  { pattern: /\b(cap|caps|hat|hats|beanie)\b/i, label: "모자" },
  { pattern: /\b(backpack|daypack)\b/i, label: "백팩" },
  { pattern: /\b(crossbody)\b/i, label: "크로스백" },
  { pattern: /\b(tote|shopper)\b/i, label: "토트백" },
  { pattern: /\b(shoulder bag|satchel|messenger|duffel|purse|handbag|bag|bags)\b/i, label: "가방" },
  { pattern: /\b(raincoat|rain jacket|windbreaker)\b/i, label: "자켓" },
  { pattern: /\b(coat|parka)\b/i, label: "코트" },
  { pattern: /\b(jacket|blazer)\b/i, label: "자켓" },
  { pattern: /\b(hoodie|hooded sweatshirt)\b/i, label: "후드" },
  { pattern: /\b(sweatshirt)\b/i, label: "스웨트셔츠" },
  { pattern: /\b(sweater|cardigan)\b/i, label: "스웨터" },
  { pattern: /\b(vest)\b/i, label: "조끼" },
  { pattern: /\b(shirt dress)\b/i, label: "셔츠 원피스" },
  { pattern: /\b(dress|dresses)\b/i, label: "원피스" },
  { pattern: /\b(skirt)\b/i, label: "스커트" },
  { pattern: /\b(jeans|denim pants)\b/i, label: "청바지" },
  { pattern: /\b(pants|trouser|trousers|slacks|leggings)\b/i, label: "팬츠" },
  { pattern: /\b(shorts)\b/i, label: "쇼츠" },
  { pattern: /\b(blouse)\b/i, label: "블라우스" },
  { pattern: /\b(t[- ]?shirt|tee|tees)\b/i, label: "티셔츠" },
  { pattern: /\b(button[- ]?down|shirt|shirts)\b/i, label: "셔츠" },
  { pattern: /\b(tank|cami|camisole|top|tops)\b/i, label: "상의" },
  { pattern: /\b(sneaker|sneakers|running shoe|athletic shoe)\b/i, label: "스니커즈" },
  { pattern: /\b(boot|boots)\b/i, label: "부츠" },
  { pattern: /\b(sandal|sandals)\b/i, label: "샌들" },
  { pattern: /\b(loafer|loafers)\b/i, label: "로퍼" },
  { pattern: /\b(slipper|slippers)\b/i, label: "슬리퍼" },
  { pattern: /\b(heel|heels|pump|pumps)\b/i, label: "힐" },
  { pattern: /\b(flat|flats)\b/i, label: "플랫슈즈" },
  { pattern: /\b(oxford|oxfords)\b/i, label: "옥스퍼드화" },
  { pattern: /\b(shoe|shoes)\b/i, label: "신발" },
  { pattern: /\b(sock|socks)\b/i, label: "양말" },
  { pattern: /\b(scarf|scarves)\b/i, label: "스카프" },
  { pattern: /\b(glove|gloves)\b/i, label: "장갑" },
  { pattern: /\b(belt|wallet|sunglasses|watch)\b/i, label: "액세서리" },
];

function isKoreanDisplayText(value) {
  const text = String(value ?? "").trim();
  return Boolean(text) && !LATIN_WORD_PATTERN.test(text);
}

function safeKoreanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return isKoreanDisplayText(text) ? text : fallback;
}

function displayAttributeValue(attribute) {
  if (!attribute) return "";
  if (attribute.valueText !== undefined && attribute.valueText !== null && String(attribute.valueText).trim()) return attribute.valueText;
  if (attribute.value !== undefined && attribute.value !== null && String(attribute.value).trim()) return attribute.value;
  if (attribute.valueNumber !== undefined && attribute.valueNumber !== null) return attribute.valueNumber;
  if (attribute.valueBoolean !== undefined && attribute.valueBoolean !== null) return attribute.valueBoolean;
  if (attribute.displayValue !== undefined && attribute.displayValue !== null && attribute.displayValue !== "Any") return attribute.displayValue;
  return "";
}

function productSignalCandidates(product, key) {
  return [...(product?.semanticAttributes ?? []), ...(product?.attributes ?? [])]
    .filter((attribute) => attribute?.key === key)
    .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0) || Number(b.score ?? 0) - Number(a.score ?? 0));
}

function getProductSignalValue(product, key) {
  return displayAttributeValue(productSignalCandidates(product, key)[0]);
}

function getProductSignalValues(product, key, limit = 2) {
  const seen = new Set();
  const values = [];
  for (const attribute of productSignalCandidates(product, key)) {
    const value = displayAttributeValue(attribute);
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

function localizeSignalValue(key, value, language, copy, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  const localized = localizeMatrixValue(key, value, language, copy);
  if (language !== "ko") return localized;
  return safeKoreanText(localized, fallback);
}

function inferGenderFromCategory(product) {
  const text = [product?.category, ...(product?.categoryPath ?? [])].join(" ").toLowerCase();
  if (/\bwomen\b/.test(text)) return "women";
  if (/\bmen\b/.test(text) && !/\bwomen\b/.test(text)) return "men";
  if (/\bgirls\b/.test(text)) return "girls";
  if (/\bboys\b/.test(text)) return "boys";
  if (/\bbaby\b/.test(text)) return "baby";
  if (/\bunisex\b/.test(text)) return "unisex";
  return "";
}

function inferKoreanProductType(product) {
  const text = [product?.name, product?.productType, product?.subCategory, product?.normalizedParentCategory, product?.category, ...(product?.categoryPath ?? [])].join(" ");
  for (const rule of KO_PRODUCT_TYPE_RULES) {
    if (rule.pattern.test(text)) return rule.label;
  }
  const productType = safeKoreanText(localizeCatalogLabel(product?.productType, "ko"), "");
  if (productType) return productType;
  const subCategory = safeKoreanText(localizeCatalogLabel(product?.subCategory, "ko"), "");
  if (subCategory) return subCategory;
  const category = safeKoreanText(localizeCatalogLabel(product?.category, "ko"), "");
  return category || "패션 상품";
}

function uniqueDisplayParts(parts) {
  const seen = new Set();
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .filter((part) => {
      if (seen.has(part)) return false;
      seen.add(part);
      return true;
    });
}

function hasHangulText(value) {
  return /\p{Script=Hangul}/u.test(String(value ?? ""));
}

function buildDisplayProductName(product, language, copy) {
  if (language !== "ko") return String(product?.name ?? "");
  if (hasHangulText(product?.name)) return String(product.name);

  const genderValue = getProductSignalValue(product, "genderTarget") || inferGenderFromCategory(product);
  const gender = localizeSignalValue("genderTarget", genderValue, language, copy);
  const season = localizeSignalValue("season", getProductSignalValue(product, "season"), language, copy);
  const sleeve = localizeSignalValue("sleeveLength", getProductSignalValue(product, "sleeveLength"), language, copy);
  const material = localizeSignalValue("material", getProductSignalValue(product, "material"), language, copy);
  const style = localizeSignalValue("style", getProductSignalValue(product, "style"), language, copy);
  const productType = inferKoreanProductType(product);
  const footwearTypes = new Set(["신발", "스니커즈", "부츠", "샌들", "로퍼", "슬리퍼", "힐", "플랫슈즈", "옥스퍼드화"]);
  const parts = uniqueDisplayParts([
    gender,
    season,
    sleeve,
    material && !footwearTypes.has(productType) ? material : "",
    productType,
  ]);
  if (parts.length >= 2) return parts.join(" ");
  return uniqueDisplayParts([gender, style, productType]).join(" ") || "패션 상품";
}

function buildDisplayFeatures(product, language, copy) {
  if (language !== "ko") {
    return (product?.features ?? []).filter(Boolean);
  }
  const localizedFeatures = (product?.features ?? []).filter((feature) => hasHangulText(feature));
  if (localizedFeatures.length) return localizedFeatures;
  const name = buildDisplayProductName(product, language, copy);
  const category = safeKoreanText(localizeCatalogLabel(product?.category, language), "");
  const subCategory = inferKoreanProductType(product);
  const criteria = [
    ...getProductSignalValues(product, "occasion", 1).map((value) => localizeSignalValue("occasion", value, language, copy)),
    ...getProductSignalValues(product, "style", 1).map((value) => localizeSignalValue("style", value, language, copy)),
    ...getProductSignalValues(product, "material", 2).map((value) => localizeSignalValue("material", value, language, copy)),
  ].filter(Boolean);
  const facts = [
    `${name}은 ${category ? `${category} 카테고리의 ` : ""}${subCategory} 상품입니다.`,
    criteria.length ? `주요 기준: ${uniqueDisplayParts(criteria).join(", ")}.` : "카테고리와 리뷰 근거를 기준으로 비교할 수 있습니다.",
    `평점 ${product?.rating ?? 0}점, 리뷰 ${parseReviewCount(product?.reviewCount)}개를 함께 확인할 수 있습니다.`,
  ];
  if ((product?.colors ?? []).length) {
    const colors = uniqueDisplayParts((product.colors ?? []).slice(0, 4).map((color) => safeKoreanText(localizeCriterionValue(color, language, copy), "")));
    if (colors.length) facts.push(`색상 옵션: ${colors.join(", ")}.`);
  }
  if ((product?.sizes ?? []).length) {
    facts.push("사이즈 옵션을 선택할 수 있습니다.");
  }
  return facts;
}

function buildDisplayProductSummary(product, language, copy) {
  if (language !== "ko") return product?.desc || "";
  if (hasHangulText(product?.desc)) return product.desc;
  const name = buildDisplayProductName(product, language, copy);
  const occasion = localizeSignalValue("occasion", getProductSignalValue(product, "occasion"), language, copy);
  const season = localizeSignalValue("season", getProductSignalValue(product, "season"), language, copy);
  const summaryParts = uniqueDisplayParts([occasion, season]);
  return `${name}입니다. ${summaryParts.length ? `${summaryParts.join(", ")} 기준으로 ` : ""}가격, 평점, 속성, 리뷰 근거를 한 화면에서 비교할 수 있습니다.`;
}

function buildDisplayBrandStory(product, language, copy) {
  if (language !== "ko") return product?.brandStory || copy.brandFallback;
  const productType = inferKoreanProductType(product);
  return `이 ${productType} 상품은 카탈로그 속성과 리뷰 근거를 함께 확인하며 비교할 수 있습니다.`;
}

function localizeOptionValue(value, language, copy) {
  if (language !== "ko") return value;
  const localized = localizeCriterionValue(value, language, copy);
  return safeKoreanText(localized, "옵션");
}

function localizeSafeCriterionValue(value, language, copy, fallback = "옵션") {
  const localized = localizeCriterionValue(value, language, copy);
  if (language !== "ko") return localized;
  return safeKoreanText(localized, fallback);
}

function buildReviewUserName(review, language) {
  if (language !== "ko") return review?.userName ?? "Amazon reviewer";
  return "아마존 구매자";
}

function buildReviewDate(review, language) {
  if (language !== "ko") return review?.date ?? "";
  const timestamp = review?.reviewTimestamp;
  if (!timestamp) return "등록 리뷰";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "등록 리뷰";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function buildReviewTitle(review, index, language) {
  if (language !== "ko") return review?.title || "Customer review";
  if (hasHangulText(review?.title)) return review.title;
  const evidence = review?.evidence ?? [];
  if (evidence.some((item) => item.sentiment === "negative")) return "주의할 점이 있는 리뷰";
  if (evidence.some((item) => item.sentiment === "positive")) return "만족 의견 리뷰";
  return `고객 리뷰 ${index + 1}`;
}

function buildReviewComment(review, product, language, copy) {
  if (language !== "ko") return review?.comment ?? "";
  if (hasHangulText(review?.comment)) return review.comment;
  const evidence = (review?.evidence ?? []).slice(0, 2).map((item) => formatEvidenceText(item, language)).filter(Boolean);
  if (evidence.length) return evidence.join(" ");
  const rating = review?.rating ?? product?.rating ?? 0;
  const name = buildDisplayProductName(product, language, copy);
  return `${name}에 대한 평점 ${rating}점 리뷰입니다. 착용감, 품질, 활용도를 확인하는 참고 의견입니다.`;
}

function truncateUiText(value, maxLength = 82) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatEvidenceTopic(snippet, language) {
  if (snippet?.issueType && snippet.issueType !== "none") {
    return localizeIssue(snippet.issueType, language);
  }
  if (snippet?.attributeKey || snippet?.attributeLabel) {
    const topic = localizeDimensionLabel({ key: snippet.attributeKey, label: snippet.attributeLabel }, language);
    return language === "ko" ? safeKoreanText(topic, "리뷰") : topic;
  }
  return language === "ko" ? "리뷰" : "Review";
}

function formatEvidenceText(snippet, language) {
  if (language !== "ko") {
    return snippet.reviewBody || snippet.reviewComment || snippet.evidenceText || snippet.text || "No review text available.";
  }
  const localizedSnippet = snippet.reviewBody || snippet.reviewComment || snippet.evidenceText || snippet.text;
  if (hasHangulText(localizedSnippet)) return localizedSnippet;
  const topic = formatEvidenceTopic(snippet, language);
  const sentiment = localizeSentiment(snippet.sentiment ?? "neutral", language);
  const rating = Number.isFinite(Number(snippet.rating)) ? ` 평점 ${Number(snippet.rating)}점.` : "";
  return `${topic} 관련 ${sentiment} 리뷰 근거입니다.${rating}`;
}

function formatEvidenceTitle(snippet, language, copy) {
  if (language !== "ko") return snippet.reviewTitle || snippet.attributeLabel || copy.reviewEvidenceLabel;
  if (snippet.sourceType === "review" || snippet.reviewId) return copy.reviewEvidenceLabel;
  return copy.metadataEvidenceLabel;
}

function formatEvidenceMeta(snippet, language) {
  const parts = [];
  if (Number.isFinite(Number(snippet.rating))) {
    parts.push(language === "ko" ? `평점 ${Number(snippet.rating)}점` : `${Number(snippet.rating)} stars`);
  }
  if (snippet.date) {
    const date = new Date(snippet.date);
    if (!Number.isNaN(date.getTime())) {
      parts.push(new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(date));
    }
  }
  return parts.join(" · ");
}

function buildSelectedReviewEvidence(product, language, copy) {
  const decisionEvidence = product.ai ?? product.decisionEvidence ?? {};
  const snippets = Array.isArray(decisionEvidence.snippetsPreview) ? decisionEvidence.snippetsPreview : [];
  const positiveSnippets = snippets.filter((snippet) => snippet.sentiment === "positive").slice(0, 2);
  const negativeSnippets = snippets.filter((snippet) => snippet.sentiment === "negative").slice(0, 2);

  const strengths = positiveSnippets.length
    ? positiveSnippets.map((snippet) => `${formatEvidenceTopic(snippet, language)}: ${truncateUiText(formatEvidenceText(snippet, language))}`)
    : (decisionEvidence.strengths ?? []).slice(0, 2).map((value) => localizeAiEvidenceText(localizeMatrixValue("reviewStrengths", value, language, copy), language));

  const risks = negativeSnippets.length
    ? negativeSnippets.map((snippet) => `${formatEvidenceTopic(snippet, language)}: ${truncateUiText(formatEvidenceText(snippet, language))}`)
    : (decisionEvidence.tradeoffs ?? []).slice(0, 2).map((value) => localizeAiEvidenceText(localizeMatrixValue("reviewRisks", value, language, copy), language));

  return {
    strengths: strengths.filter(Boolean),
    risks: risks.filter(Boolean),
  };
}

function localizeInterpretationSummary(value, language) {
  if (!value || language !== "ko") return value;
  if (value === "Validated Amazon catalog search") return "검증된 Amazon 카탈로그 검색";
  const text = String(value);
  const foundMatch = text.match(/^Found\s+(\d+)\s+Amazon Fashion candidates\.?$/i);
  if (foundMatch) return `Amazon Fashion 후보 ${Number(foundMatch[1]).toLocaleString("ko-KR")}개를 찾았습니다.`;
  const preparedMatch = text.match(/^Amazon Fashion criteria prepared against\s+(\d+)\s+matching products\.?$/i);
  if (preparedMatch) return `일치 상품 ${Number(preparedMatch[1]).toLocaleString("ko-KR")}개를 기준으로 AI 조건을 준비했습니다.`;
  return text
    .split(" / ")
    .map((part) => localizeCatalogLabel(part, language))
    .join(" / ");
}

function localizeAiMessage(value, language, copy) {
  if (!value || language !== "ko") return value;
  if (value.includes("AI output was validated against backend-owned taxonomy")) {
    return copy.aiValidated;
  }
  if (value.includes("Gemini decomposed")) {
    return "Gemini가 자연어 검색어를 상품 카탈로그 조건으로 분해했습니다.";
  }
  if (value.includes("Relaxed price cap")) {
    return "정확한 가격 조건에서 결과가 없어 가격 상한을 완화했습니다.";
  }
  if (value.includes("Relaxed attribute filters")) {
    return "정확한 속성 조건에서 결과가 없어 일부 속성 필터를 완화했습니다.";
  }
  if (value.includes("Returned taxonomy-level candidates")) {
    return "엄격한 AI 필터에서 결과가 없어 카테고리 수준 후보를 반환했습니다.";
  }
  if (value.includes("Broadened from subcategory to category")) {
    return "정확한 세부 카테고리에서 비교 후보가 부족해 상위 카테고리 후보까지 넓혀 보여줍니다.";
  }
  if (value.includes("NL agent was unavailable")) {
    return "NL agent를 사용할 수 없어 백엔드의 deterministic parser로 처리했습니다.";
  }
  if (value.includes("Display agent was unavailable")) {
    return "Display agent를 사용할 수 없어 백엔드 검증 결과를 직접 반환했습니다.";
  }
  return value;
}

function stars(rating, size = "text-sm") {
  const full = Math.max(0, Math.min(5, Math.floor(Number(rating) || 0)));
  return <span className={`${size} tracking-normal text-[#ffa41c]`}>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>;
}

function ImageBox({ src, alt, className = "", imgClassName = "object-contain" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fallbackLabel = String(alt || "Product image").trim();
  const fallbackInitial = Array.from(fallbackLabel)[0]?.toUpperCase() ?? "P";

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-[#f7f7f7] ${className}`}>
      {(!src || failed || !loaded) ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#eef0f2] px-4 text-center text-xs font-semibold leading-snug text-[#565959]">
          {!src || failed ? (
            <div className="grid max-w-full justify-items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d5d9d9] bg-white text-lg font-bold text-[#374151] shadow-sm">
                {fallbackInitial}
              </div>
              <div className="line-clamp-2 max-w-full text-[#374151]">{fallbackLabel}</div>
            </div>
          ) : ""}
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

function Header({
  categories,
  searchText,
  searchCategory,
  cartCount,
  language,
  copy,
  aiEnabled,
  aiStatus,
  onLanguageChange,
  onToggleAi,
  onSearchTextChange,
  onSearchCategoryChange,
  onSearch,
  onHome,
  onNavAction,
  onCategorySelect,
  onCart,
}) {
  const aiTitle = aiEnabled ? copy.disableAi : copy.enableAi;
  const womenCategory = categories.find((category) => normalizeHomeText(categoryLabel(category)) === "women");
  const menCategory = categories.find((category) => normalizeHomeText(categoryLabel(category)) === "men");
  const navItems = [
    { key: "departments", label: copy.navDepartments, onClick: () => onNavAction("departments") },
    womenCategory ? { key: "women", label: copy.navWomen, onClick: () => onCategorySelect(womenCategory) } : null,
    menCategory ? { key: "men", label: copy.navMen, onClick: () => onCategorySelect(menCategory) } : null,
    { key: "deals", label: copy.navDeals, onClick: () => onNavAction("deals") },
    { key: "top-rated", label: copy.navTopRated, onClick: () => onNavAction("topRated") },
    { key: "ai-lens", label: copy.navAiLens, onClick: () => onNavAction("aiLens") },
  ].filter(Boolean);

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
            aria-label={copy.searchCategory}
          >
            <option value="All">{copy.all}</option>
            {categories.map((category) => (
              <option key={categoryKey(category)} value={categoryKey(category)}>
                {localizeCatalogLabel(categoryLabel(category), language)}
              </option>
            ))}
          </select>
          <input
            id="amazon-search-input"
            className="min-w-0 flex-1 border-0 px-4 text-[15px] text-[#111827] outline-none"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
          />
          <button
            className={`relative flex w-[44px] cursor-pointer items-center justify-center border-0 border-l border-l-[#d5d9d9] transition max-[520px]:w-[40px] ${
              aiEnabled
                ? "bg-[#f5f3ff] text-[#5b21b6] ring-1 ring-inset ring-[#7c3aed]"
                : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
            }`}
            type="button"
            aria-label={aiTitle}
            title={aiTitle}
            aria-pressed={aiEnabled ? "true" : "false"}
            onClick={onToggleAi}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${aiEnabled ? "border-[#7c3aed] bg-white" : "border-[#9ca3af] bg-white"}`} aria-hidden="true">
              <span className={`h-2.5 w-2.5 rounded-full ${["planning", "loading"].includes(aiStatus) ? "bg-[#f59e0b]" : aiEnabled ? "bg-[#7c3aed]" : "bg-[#9ca3af]"}`} />
            </span>
          </button>
          <button className="flex w-[54px] cursor-pointer items-center justify-center border-0 bg-[#febd69] text-xl hover:bg-[#f3a847]" type="submit" aria-label={copy.search}>
            🔍
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <button
            className="cursor-pointer rounded border border-[#879596] px-2 py-1 text-xs font-bold hover:border-white"
            type="button"
            aria-label={copy.languageToggleAria}
            title={copy.languageToggleAria}
            onClick={() => onLanguageChange(language === "ko" ? "en" : "ko")}
          >
            {copy.languageToggle}
          </button>
          <button className="hidden cursor-pointer border border-transparent px-2 py-1 text-left text-xs hover:border-white sm:block" type="button">
            <span className="block text-[11px] leading-3">{copy.accountGreeting}</span>
            <b className="text-sm leading-4">{copy.accountLists}</b>
          </button>
          <button className="cursor-pointer border border-transparent px-2 py-1 text-left hover:border-white" type="button" onClick={onCart}>
            <span className="text-sm font-bold">{copy.cart}</span>
            <span className="ml-1 text-base font-bold text-[#ffa41c]">{cartCount}</span>
          </button>
        </div>
      </div>

      <nav className="bg-[#232f3e] px-4 py-1 text-white" aria-label="Secondary navigation">
        <ul className="flex items-center gap-5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <button className="whitespace-nowrap border border-transparent px-1 py-1 hover:border-white" type="button" onClick={onHome}>
              ☰ {copy.all}
            </button>
          </li>
          {navItems.map((item) => (
            <li key={item.key}>
              <button className="whitespace-nowrap border border-transparent px-1 py-1 hover:border-white" type="button" onClick={item.onClick}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function normalizeHomeText(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function homeCategoryMatchesProduct(category, product) {
  const label = categoryLabel(category);
  const slug = categoryFilterSlug(category);
  const categoryTokens = [label, slug, categoryKey(category)].map(normalizeHomeText).filter(Boolean);
  const productTokens = [product.category, product.categorySlug, product.subCategory, product.subCategorySlug].map(normalizeHomeText).filter(Boolean);
  return categoryTokens.some((categoryToken) => productTokens.some((productToken) => productToken === categoryToken || productToken.includes(categoryToken) || categoryToken.includes(productToken)));
}

function homeCategoryRank(category) {
  const key = normalizeHomeText(`${categoryLabel(category)} ${categoryKey(category)}`);
  if (key.includes("women")) return 0;
  if (key.includes("men") && !key.includes("women")) return 1;
  if (key.includes("girls")) return 2;
  if (key.includes("boys")) return 3;
  if (key.includes("unisex")) return 4;
  if (key.includes("baby")) return 5;
  return 10;
}

function uniqueProducts(productList) {
  const seen = new Set();
  return productList.filter((product) => {
    if (!product?.id || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

const HOMEPAGE_APPAREL_TERMS = /\b(t[- ]?shirt|shirt|sweatshirt|hoodie|jacket|coat|dress|pants|jeans|leggings|shorts|sweater|cardigan|vest|tank|cami|top|blouse|skirt|shoe|shoes|sneaker|sneakers|boot|boots|sandal|sandals|loafer|loafers|slipper|slippers)\b/i;
const HOMEPAGE_SUPPORT_TERMS = /\b(backpack|bag|bags|tote|satchel|messenger|duffel|purse|cap|hat|beanie|sock|socks|scarf|glove|gloves)\b/i;
const HOMEPAGE_CATEGORY_TERMS = /\b(clothing|tops|shirts|hoodies|sweatshirts|coats|jackets|pants|dresses|shoes|sneakers|boots|sandals|bags)\b/i;
const HOMEPAGE_EXCLUDED_TERMS = /\b(pin|pins|brooch|bracelet|earring|earrings|ring|rings|necklace|keychain|lanyard|charm|charms|watch|watches|wallet|sunglasses|jewelry|jewellery|piercing|retainer|badge|tunnel|buckle|strap|costume|halloween|toy|display|doll|foam|ornament|patch|sticker|plush|dog training)\b/i;
const HOMEPAGE_SOCK_TERMS = /\b(sock|socks)\b/i;

function homepageProductKind(product) {
  const text = [product?.name, product?.category, product?.subCategory].join(" ");
  if (HOMEPAGE_SOCK_TERMS.test(text)) return "socks";
  if (/\b(jacket|coat|hoodie|sweatshirt|sweater|cardigan|vest|outerwear)\b/i.test(text)) return "outerwear";
  if (/\b(t[- ]?shirt|shirt|top|blouse|tank|cami)\b/i.test(text)) return "tops";
  if (/\b(pants|jeans|leggings|shorts|skirt|trouser|trousers)\b/i.test(text)) return "bottoms";
  if (/\b(dress|dresses)\b/i.test(text)) return "dresses";
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|sandal|sandals|loafer|loafers|slipper|slippers)\b/i.test(text)) return "footwear";
  if (/\b(backpack|bag|bags|tote|satchel|messenger|duffel|purse)\b/i.test(text)) return "bags";
  if (/\b(cap|hat|beanie|scarf|glove|gloves)\b/i.test(text)) return "accessories";
  return "other";
}

function homepageProductScore(product) {
  if (!product?.img) return -1000;
  const title = String(product.name ?? "");
  const taxonomyText = [product.category, product.subCategory, product.categorySlug, product.subCategorySlug].join(" ");
  const allText = [title, taxonomyText].join(" ");
  const categoryText = normalizeHomeText(product.category);
  const isSockProduct = HOMEPAGE_SOCK_TERMS.test(title);
  let score = 0;

  if (HOMEPAGE_EXCLUDED_TERMS.test(title)) score -= 90;
  if (HOMEPAGE_APPAREL_TERMS.test(title) && !isSockProduct) score += 80;
  if (HOMEPAGE_SUPPORT_TERMS.test(title) && !isSockProduct) score += 38;
  if (isSockProduct) score += 18;
  if (HOMEPAGE_CATEGORY_TERMS.test(taxonomyText)) score += 28;
  if (/\b(women|men|girls|boys|unisex)\b/i.test(allText)) score += 10;
  if (categoryText === "women" || categoryText === "men") score += 16;
  if (categoryText === "baby") score -= 18;
  if (categoryText === "boys" || categoryText === "girls") score -= 8;
  if (Number(product.rating ?? 0) >= 4.2) score += 8;
  if (parseReviewCount(product.reviewCount) >= 20) score += 8;
  if (product.priceNumber > 0 && product.priceNumber <= 120) score += 8;
  if (isSockProduct) score -= 28;
  if (/\bdog\b/i.test(title)) score -= 20;
  if (title.length > 120) score -= 8;

  return score;
}

function diversifyHomepageProducts(productList) {
  const countsByKind = new Map();
  const selected = [];
  const deferred = [];

  for (const product of productList) {
    const kind = homepageProductKind(product);
    const limit = kind === "socks" ? 2 : kind === "accessories" ? 3 : kind === "other" ? 2 : 6;
    const count = countsByKind.get(kind) ?? 0;
    if (count < limit) {
      selected.push(product);
      countsByKind.set(kind, count + 1);
    } else {
      deferred.push(product);
    }
  }

  return [...selected, ...deferred];
}

function sortHomepageProducts(productList) {
  const sortedProducts = uniqueProducts(productList)
    .map((product, index) => ({ product, index, score: homepageProductScore(product) }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score || Number(b.product.rating ?? 0) - Number(a.product.rating ?? 0) || parseReviewCount(b.product.reviewCount) - parseReviewCount(a.product.reviewCount) || a.index - b.index)
    .map(({ product }) => product);
  return diversifyHomepageProducts(sortedProducts);
}

function HomeProductTile({ product, language, copy, onOpenProduct, wide = false }) {
  const displayName = buildDisplayProductName(product, language, copy);
  return (
    <button className={`${wide ? "min-w-[210px]" : "min-w-[160px]"} group cursor-pointer p-2 text-left`} type="button" onClick={() => onOpenProduct(product)}>
      <ImageBox className={`${wide ? "h-[190px]" : "h-[150px]"} w-full bg-[#f7f7f7]`} src={product.img} alt={displayName} />
      <p className="line-clamp-2 mt-2 min-h-[38px] text-sm leading-[1.35] text-[#007185] group-hover:text-[#c7511f] group-hover:underline">{displayName}</p>
      <div className="mt-1 flex items-center gap-1">
        {stars(product.rating, "text-xs")}
        <span className="text-[11px] text-[#565959]">{copy.homeReviews(product.reviewCountNumber ?? product.reviewCount ?? 0)}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-[#0f1111]">{formatUsd(product.price)}</p>
    </button>
  );
}

function HomeProductShelf({ id, title, badge, products, language, copy, onOpenProduct, wide = false }) {
  if (!products.length) return null;
  return (
    <section id={id} className="mx-auto box-border w-full max-w-[1500px] bg-white px-5 py-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[21px] font-bold tracking-normal text-[#0f1111]">{title}</h2>
          {badge ? <span className="rounded-sm bg-[#cc0c39] px-2 py-1 text-xs font-bold text-white">{badge}</span> : null}
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {products.map((product) => (
          <HomeProductTile key={product.id} product={product} language={language} copy={copy} onOpenProduct={onOpenProduct} wide={wide} />
        ))}
      </div>
    </section>
  );
}

function HomeDepartmentStrip({ id, categories, language, copy, onCategorySelect }) {
  if (!categories.length) return null;
  return (
    <section id={id} className="mx-auto box-border w-full max-w-[1500px] bg-white px-5 py-4">
      <h2 className="mb-3 text-[21px] font-bold tracking-normal text-[#0f1111]">{copy.homeDepartments}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const label = localizeCatalogLabel(categoryLabel(category), language);
          return (
            <button
              key={categoryKey(category)}
              className="min-w-[150px] cursor-pointer rounded-sm border border-[#d5d9d9] bg-[#f7fafa] px-4 py-3 text-left text-sm font-bold text-[#0f1111] hover:border-[#007185] hover:bg-white"
              type="button"
              onClick={() => onCategorySelect(category)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HomeCategoryModule({ category, products, fallbackProducts, language, copy, onCategorySelect, offset = 0 }) {
  const label = localizeCatalogLabel(categoryLabel(category), language);
  const categoryProducts = uniqueProducts(products.filter((product) => homeCategoryMatchesProduct(category, product) && product.img));
  const curatedCategoryProducts = sortHomepageProducts(categoryProducts);
  const tileProducts = (curatedCategoryProducts.length ? curatedCategoryProducts : categoryProducts.length ? categoryProducts : fallbackProducts).slice(offset, offset + 4);
  const representativeImage = category?.representativeImageUrl ?? tileProducts[0]?.img;

  return (
    <article className="bg-white p-5 shadow-sm">
      <h2 className="mb-3 min-h-[54px] text-[21px] font-bold leading-tight tracking-normal text-[#0f1111]">{copy.shopCategory(label)}</h2>
      <div className="grid grid-cols-2 gap-3">
        {(tileProducts.length ? tileProducts : [{ id: `${categoryKey(category)}-fallback`, name: label, img: representativeImage }]).slice(0, 4).map((product) => (
          <button key={product.id} className="group cursor-pointer text-left" type="button" onClick={() => onCategorySelect(category)}>
            <ImageBox className="aspect-square w-full" imgClassName="object-cover" src={product.img} alt={buildDisplayProductName(product, language, copy)} />
            <p className="mt-1 line-clamp-1 text-xs text-[#0f1111] group-hover:text-[#c7511f]">
              {product.subCategory
                ? language === "ko"
                  ? safeKoreanText(localizeCatalogLabel(product.subCategory, language), inferKoreanProductType(product))
                  : product.subCategory
                : buildDisplayProductName(product, language, copy)}
            </p>
          </button>
        ))}
      </div>
      <button className="mt-4 text-sm text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={() => onCategorySelect(category)}>
        {copy.homeSeeMore}
      </button>
    </article>
  );
}

function Home({ categories, products, language, copy, onCategorySelect, onOpenProduct }) {
  const catalogProducts = useMemo(() => uniqueProducts(products.filter((product) => product?.id && product.name)), [products]);
  const imageProducts = useMemo(() => catalogProducts.filter((product) => product.img), [catalogProducts]);
  const homeCategories = useMemo(() => [...categories].sort((a, b) => homeCategoryRank(a) - homeCategoryRank(b) || categoryLabel(a).localeCompare(categoryLabel(b))), [categories]);
  const displayProducts = useMemo(() => {
    const curated = sortHomepageProducts(imageProducts);
    return curated.length >= 12 ? curated : uniqueProducts([...curated, ...imageProducts]);
  }, [imageProducts]);
  const heroProducts = displayProducts.slice(0, 5);
  const departments = homeCategories.slice(0, 12);
  const moduleCategories = homeCategories.slice(0, 8);
  const featuredProducts = displayProducts.slice(0, 14);
  const topRatedProducts = useMemo(
    () => [...displayProducts].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0) || parseReviewCount(b.reviewCount) - parseReviewCount(a.reviewCount)).slice(0, 14),
    [displayProducts],
  );
  const budgetProducts = useMemo(
    () => displayProducts.filter((product) => product.priceNumber > 0 && product.priceNumber <= 50).sort((a, b) => a.priceNumber - b.priceNumber).slice(0, 14),
    [displayProducts],
  );
  const heroCategory = homeCategories[0];
  const secondaryCategory = homeCategories[1] ?? homeCategories[0];

  return (
    <main className="overflow-x-hidden bg-[#e3e6e6] pb-8">
      <section className="bg-[#d7f0f2]">
        <div className="mx-auto box-border grid min-h-[330px] w-full max-w-[1500px] grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] items-center gap-6 px-5 py-7 max-[900px]:grid-cols-1 max-[900px]:pb-14">
          <div className="min-w-0 max-w-[560px]">
            <p className="mb-2 text-sm font-bold uppercase tracking-normal text-[#007185]">{copy.homeHeroKicker}</p>
            <h1 className="text-[40px] font-extrabold leading-tight tracking-normal text-[#0f1111] max-[640px]:text-[30px]">{copy.homeHeroTitle}</h1>
            <p className="mt-3 max-w-full break-words text-base leading-relaxed text-[#374151] max-[640px]:max-w-[330px] max-[640px]:text-sm max-[420px]:max-w-[310px]">{copy.homeHeroSubtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {heroCategory ? (
                <button className={`${pillButton} bg-[#ffd814] font-bold hover:bg-[#f7ca00]`} type="button" onClick={() => onCategorySelect(heroCategory)}>
                  {copy.homeHeroPrimary}
                </button>
              ) : null}
              {secondaryCategory ? (
                <button className={`${pillButton} border border-[#888c8c] bg-white font-bold hover:bg-[#f7fafa]`} type="button" onClick={() => onCategorySelect(secondaryCategory)}>
                  {copy.homeHeroSecondary}
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-[1.15fr_0.85fr] gap-4 max-[640px]:grid-cols-2">
            {heroProducts.slice(0, 1).map((product) => (
              <button key={product.id} className="group row-span-2 min-w-0 cursor-pointer bg-white p-4 text-left shadow-md" type="button" onClick={() => onOpenProduct(product)}>
                <ImageBox className="h-[240px] w-full max-[640px]:h-[180px]" imgClassName="object-contain" src={product.img} alt={buildDisplayProductName(product, language, copy)} />
                <p className="mt-3 line-clamp-2 text-sm font-bold text-[#007185] group-hover:text-[#c7511f] group-hover:underline">{buildDisplayProductName(product, language, copy)}</p>
                <p className="mt-1 text-xl font-bold text-[#b12704]">{formatUsd(product.price)}</p>
              </button>
            ))}
            {heroProducts.slice(1, 5).map((product) => (
              <button key={product.id} className="group min-w-0 cursor-pointer bg-white p-3 text-left shadow-sm" type="button" onClick={() => onOpenProduct(product)}>
                <ImageBox className="h-[96px] w-full" imgClassName="object-contain" src={product.img} alt={buildDisplayProductName(product, language, copy)} />
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-[#007185] group-hover:text-[#c7511f] group-hover:underline">{buildDisplayProductName(product, language, copy)}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-5 box-border grid w-full max-w-[1500px] grid-cols-[repeat(4,minmax(0,1fr))] gap-5 px-5 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
        {moduleCategories.slice(0, 4).map((category, index) => (
          <HomeCategoryModule
            key={categoryKey(category)}
            category={category}
            products={catalogProducts}
            fallbackProducts={displayProducts}
            language={language}
            copy={copy}
            onCategorySelect={onCategorySelect}
            offset={index}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5">
        <HomeDepartmentStrip id="home-departments" categories={departments} language={language} copy={copy} onCategorySelect={onCategorySelect} />
        <HomeProductShelf id="home-featured-deals" title={copy.homeFeaturedDeals} badge={copy.homeDealBadge} products={featuredProducts} language={language} copy={copy} onOpenProduct={onOpenProduct} wide />
        <div className="mx-auto box-border grid w-full max-w-[1500px] grid-cols-[repeat(4,minmax(0,1fr))] gap-5 px-5 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
          {moduleCategories.slice(4, 8).map((category, index) => (
            <HomeCategoryModule
              key={categoryKey(category)}
              category={category}
              products={catalogProducts}
              fallbackProducts={displayProducts}
              language={language}
              copy={copy}
              onCategorySelect={onCategorySelect}
              offset={index + 4}
            />
          ))}
        </div>
        <HomeProductShelf id="home-top-rated" title={copy.homePopular} badge={copy.homeRatingBadge} products={topRatedProducts} language={language} copy={copy} onOpenProduct={onOpenProduct} />
        <HomeProductShelf id="home-under-budget" title={copy.homeUnderBudget} badge={copy.homeBudgetBadge} products={budgetProducts.length ? budgetProducts : featuredProducts} language={language} copy={copy} onOpenProduct={onOpenProduct} />
      </div>
    </main>
  );
}

function ProductCard({ product, language, copy, onOpen, aiActive = false, selected = false, onToggleSelect }) {
  const matchTags = [...(product.semanticAttributes ?? []), ...(product.attributes ?? [])]
    .filter((attribute) => ["style", "season", "occasion", "material", "sleeveLength", "fit", "warmthLevel", "comfortLevel"].includes(attribute.key))
    .slice(0, 3);
  const selectedEvidence = buildSelectedReviewEvidence(product, language, copy);
  const displayName = buildDisplayProductName(product, language, copy);
  return (
    <article className={`group relative bg-white p-2 text-left transition ${selected ? "ring-2 ring-[#7c3aed]" : "hover:shadow-sm"}`}>
      {aiActive && product.visibleNumber ? (
        <div className="absolute left-3 top-3 z-10 rounded border border-[#999] bg-white px-2 py-0.5 text-xs font-bold">{product.visibleNumber}</div>
      ) : null}
      {aiActive ? (
        <div className="absolute right-3 top-3 z-10 rounded-full border border-[#ddd6fe] bg-[#faf5ff] px-2 py-0.5 text-[11px] font-bold text-[#6d28d9]">
          AI
        </div>
      ) : null}
      <button className="block w-full cursor-pointer text-left" type="button" onClick={() => onOpen(product)} aria-label={displayName}>
        <ImageBox className="aspect-square rounded" src={product.img} alt={displayName} />
      </button>
      <div className="mt-2 grid gap-1">
        <button className="line-clamp-2 min-h-[38px] cursor-pointer text-left text-sm leading-[1.35] text-[#0f1111] group-hover:text-[#c7511f] group-hover:underline" type="button" onClick={() => onOpen(product)}>
          {displayName}
        </button>
        <div className="flex items-center gap-1">
          {stars(product.rating)}
          <span className="text-xs text-[#007185]">{product.reviewCount}</span>
        </div>
        <div className="text-xl font-bold text-[#0f1111]">{formatUsd(product.price)}</div>
        <div className="text-xs text-[#565959]">{copy.freeDelivery}</div>
      </div>
      {aiActive ? (
        <div className="mt-3 grid gap-2">
          {selected && matchTags.length ? (
            <div className="flex min-h-6 flex-wrap gap-1">
              {matchTags.map((attribute) => (
                <span key={attribute.key} className="rounded-full border border-[#ddd6fe] bg-[#faf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#6d28d9]">
                  {localizeDimensionLabel(attribute, language)}: {localizeAttributeValue(attribute, language, copy)}
                </span>
              ))}
            </div>
          ) : null}
          {selected && (selectedEvidence.strengths.length || selectedEvidence.risks.length) ? (
            <div className="grid gap-1 border-t border-[#eee] pt-2 text-[11px] leading-snug text-[#565959]">
              {selectedEvidence.strengths.length ? (
                <div>
                  <span className="font-bold text-[#166534]">{localizeDimensionLabel({ key: "reviewStrengths", label: "Review Strengths" }, language)}: </span>
                  {selectedEvidence.strengths.join(" / ")}
                </div>
              ) : null}
              {selectedEvidence.risks.length ? (
                <div>
                  <span className="font-bold text-[#b12704]">{localizeDimensionLabel({ key: "reviewRisks", label: "Review Risks" }, language)}: </span>
                  {selectedEvidence.risks.join(" / ")}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            className={`w-full rounded border px-3 py-1.5 text-xs font-bold ${
              selected ? "border-[#7c3aed] bg-[#f3e8ff] text-[#5b21b6]" : "border-[#d5d9d9] bg-white text-[#111827] hover:border-[#7c3aed] hover:text-[#6d28d9]"
            }`}
            type="button"
            onClick={() => onToggleSelect(product)}
          >
            {selected ? copy.removeCompare : copy.addCompare}
          </button>
        </div>
      ) : null}
    </article>
  );
}

const SEMANTIC_FILTER_GROUPS = [
  { key: "genderTarget", limit: 8 },
  { key: "style", limit: 8 },
  { key: "occasion", limit: 8 },
  { key: "season", limit: 6 },
  { key: "material", limit: 10 },
  { key: "sleeveLength", limit: 6 },
];

const LEVEL_FILTER_GROUPS = [
  { key: "warmthLevel", filterKey: "warmthLevelMin" },
  { key: "comfortLevel", filterKey: "comfortLevelMin" },
  { key: "durabilityLevel", filterKey: "durabilityLevelMin" },
  { key: "careEaseLevel", filterKey: "careEaseLevelMin" },
];

function countSemanticOptions(products, key, limit = 8) {
  const counts = new Map();
  for (const product of products) {
    for (const value of getProductSignalValues(product, key, 5)) {
      const normalized = String(value ?? "").trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function levelThresholdOptions(sourceRows, products, key) {
  const thresholds = [5, 4, 3];
  const sourceCounts = new Map();
  for (const row of sourceRows ?? []) {
    const value = Number(row.value);
    if (Number.isFinite(value)) sourceCounts.set(value, (sourceCounts.get(value) ?? 0) + Number(row.count ?? 0));
  }
  const counts = sourceCounts.size
    ? thresholds.map((threshold) => ({ value: threshold, count: [...sourceCounts.entries()].reduce((sum, [level, count]) => sum + (level >= threshold ? count : 0), 0) }))
    : thresholds.map((threshold) => ({
      value: threshold,
      count: products.filter((product) => Number(getProductSignalValue(product, key)) >= threshold).length,
    }));
  return counts.filter((item) => item.count > 0).map((item) => ({ ...item, label: String(item.value) }));
}

function booleanOptions(sourceRows, products, key) {
  if (sourceRows?.length) {
    return sourceRows.map((row) => ({ value: row.value, label: row.value ? "Yes" : "No", count: row.count }));
  }
  const positive = products.filter((product) => String(getProductSignalValue(product, key)).toLowerCase() === "true").length;
  const negative = products.filter((product) => String(getProductSignalValue(product, key)).toLowerCase() === "false").length;
  return [
    positive ? { value: true, label: "Yes", count: positive } : null,
    negative ? { value: false, label: "No", count: negative } : null,
  ].filter(Boolean);
}

function FilterSidebar({ category, products, filters, facets, language, copy, isAiMode = false, onFilterChange }) {
  const categoryName = category ? categoryLabel(category) : "";
  const scopedProducts = useMemo(
    () => (categoryName ? products.filter((product) => product.category === categoryName) : products),
    [categoryName, products],
  );
  const subCategories = useMemo(() => {
    const serverOptions = facets?.subCategories ?? [];
    if (serverOptions.length) {
      return serverOptions.map((item) => ({ value: item.value ?? item.slug ?? item.label, label: item.label ?? item.name ?? item.value, count: item.count }));
    }
    return [...new Set(scopedProducts.map((product) => product.subCategory).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value, count: null }));
  }, [facets?.subCategories, scopedProducts]);
  const colorFilters = useMemo(() => {
    const serverOptions = facets?.colors ?? [];
    if (serverOptions.length) {
      return serverOptions.map((item) => ({ label: item.label ?? item.value, value: item.value ?? item.label, css: mapColorToCss(item.label ?? item.value), count: item.count }));
    }
    const colorMap = new Map();
    for (const product of scopedProducts) {
      for (const color of product.colors ?? []) {
        const label = getColorGroupLabel(color);
        if (!colorMap.has(label)) {
          colorMap.set(label, mapColorToCss(color));
        }
      }
    }
    return [...colorMap.entries()].map(([label, css]) => ({ label, value: label, css, count: null }));
  }, [facets?.colors, scopedProducts]);
  const maxPrice = useMemo(() => {
    const facetMaxPrice = Number(facets?.ranges?.price?.max);
    if (Number.isFinite(facetMaxPrice) && facetMaxPrice > 0) {
      return facetMaxPrice;
    }
    const prices = scopedProducts.map((product) => product.priceNumber);
    return Math.max(...prices, 500);
  }, [facets?.ranges?.price?.max, scopedProducts]);
  const brandOptions = useMemo(() => {
    const serverOptions = facets?.brands ?? [];
    if (serverOptions.length) {
      return serverOptions.map((item) => ({ value: item.value ?? item.label, label: item.label ?? item.value, count: item.count })).slice(0, 12);
    }
    const counts = new Map();
    for (const product of scopedProducts) {
      const value = String(product.brand ?? product.store ?? "").trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, label: value, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 12);
  }, [facets?.brands, scopedProducts]);
  const semanticOptions = useMemo(() => {
    const result = {};
    for (const group of SEMANTIC_FILTER_GROUPS) {
      const serverOptions = facets?.semantic?.[group.key] ?? [];
      result[group.key] = serverOptions.length
        ? serverOptions.map((item) => ({ value: item.value ?? item.label, label: item.label ?? item.value, count: item.count })).slice(0, group.limit)
        : countSemanticOptions(scopedProducts, group.key, group.limit);
    }
    return result;
  }, [facets?.semantic, scopedProducts]);
  const levelOptions = useMemo(() => {
    const result = {};
    for (const group of LEVEL_FILTER_GROUPS) {
      result[group.key] = levelThresholdOptions(facets?.levels?.[group.key] ?? [], scopedProducts, group.key);
    }
    return result;
  }, [facets?.levels, scopedProducts]);
  const waterproofOptions = useMemo(() => booleanOptions(facets?.booleans?.waterproof ?? [], scopedProducts, "waterproof"), [facets?.booleans?.waterproof, scopedProducts]);

  return (
    <aside className="w-[220px] shrink-0 bg-white px-5 py-4 max-[900px]:w-full max-[900px]:border-b max-[900px]:border-b-[#ddd]">
      {isAiMode ? (
        <div className="mb-4 rounded border border-[#ddd6fe] bg-[#fbf7ff] p-3 text-xs font-semibold leading-snug text-[#6d28d9]">
          {copy.aiFiltersHint}
        </div>
      ) : null}
      <div className="grid gap-5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.department}</h3>
          <div className="grid gap-1 text-sm">
            <button className={`text-left hover:text-[#c7511f] hover:underline ${filters.subCategory === "All" ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("subCategory", "All")}>
              {categoryName ? copy.allCategory(localizeCatalogLabel(categoryName, language)) : copy.allProducts}
            </button>
            {subCategories.map((subCategory) => (
              <button
                key={subCategory.value}
                className={`text-left hover:text-[#c7511f] hover:underline ${filters.subCategory === subCategory.value ? "font-bold" : ""}`}
                type="button"
                onClick={() => onFilterChange("subCategory", subCategory.value)}
              >
                {localizeCatalogLabel(subCategory.label, language)}
                {subCategory.count ? <span className="ml-1 text-xs text-[#565959]">({subCategory.count})</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.price}</h3>
          <label className="mb-2 grid gap-1 text-xs text-[#565959]">
            <span>{copy.minPrice}</span>
            <input
              className="w-full rounded border border-[#bbb] px-2 py-1 text-sm text-[#111827]"
              type="number"
              min="0"
              max={Math.ceil(maxPrice)}
              value={filters.minPrice}
              onChange={(event) => onFilterChange("minPrice", Math.max(0, Number(event.target.value) || 0))}
              aria-label={copy.minPrice}
            />
          </label>
          <input
            className="w-full accent-[#c7511f]"
            type="range"
            min="0"
            max={Math.ceil(maxPrice)}
            value={Math.min(filters.maxPrice, Math.ceil(maxPrice))}
            onChange={(event) => onFilterChange("maxPrice", Number(event.target.value))}
            aria-label={copy.maxPrice}
          />
          <div className="mt-1 text-xs text-[#565959]">{copy.upTo(formatUsd(filters.maxPrice))}</div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.brand}</h3>
          <div className="grid max-h-44 gap-1 overflow-auto pr-1 text-sm">
            <button className={`text-left hover:text-[#c7511f] hover:underline ${filters.brand === "All" ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("brand", "All")}>
              {copy.clearFilter}
            </button>
            {brandOptions.map((brand) => (
              <button key={brand.value} className={`text-left hover:text-[#c7511f] hover:underline ${filters.brand === brand.value ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("brand", brand.value)}>
                {brand.label}
                {brand.count ? <span className="ml-1 text-xs text-[#565959]">({brand.count})</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.customerReview}</h3>
          <div className="grid gap-1 text-sm">
            {[4, 3].map((rating) => (
              <button key={rating} className="text-left hover:text-[#c7511f] hover:underline" type="button" onClick={() => onFilterChange("minRating", rating)}>
                {stars(rating)} <span className={filters.minRating === rating ? "font-bold" : ""}>{copy.ratingUp}</span>
              </button>
            ))}
            <button className="text-left text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={() => onFilterChange("minRating", 0)}>
              {copy.clearRating}
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.color}</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] ${filters.color === "All" ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#ccc]"}`}
              type="button"
              onClick={() => onFilterChange("color", "All")}
              aria-label={copy.allColors}
            >
              {copy.all}
            </button>
            {colorFilters.map((color) => (
              <button
                key={color.value ?? color.label}
                className={`h-8 w-8 rounded-full border ${filters.color === (color.value ?? color.label) ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#ccc]"}`}
                type="button"
                style={{ background: color.css }}
                onClick={() => onFilterChange("color", color.value ?? color.label)}
                aria-label={localizeSafeCriterionValue(color.label, language, copy, "색상 옵션")}
                title={color.count ? `${localizeSafeCriterionValue(color.label, language, copy, "색상 옵션")} (${color.count})` : localizeSafeCriterionValue(color.label, language, copy, "색상 옵션")}
              />
            ))}
          </div>
        </section>

        {SEMANTIC_FILTER_GROUPS.map((group) => {
          const options = semanticOptions[group.key] ?? [];
          return (
            <section key={group.key}>
              <h3 className="mb-2 text-sm font-bold">{copy[group.key] ?? localizeDimensionLabel(group.key, language)}</h3>
              <div className="grid gap-1 text-sm">
                <button className={`text-left hover:text-[#c7511f] hover:underline ${filters[group.key] === "All" ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange(group.key, "All")}>
                  {copy.clearFilter}
                </button>
                {options.map((option) => (
                  <button key={option.value} className={`text-left hover:text-[#c7511f] hover:underline ${filters[group.key] === option.value ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange(group.key, option.value)}>
                    {localizeSafeCriterionValue(option.label, language, copy, option.label)}
                    {option.count ? <span className="ml-1 text-xs text-[#565959]">({option.count})</span> : null}
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {LEVEL_FILTER_GROUPS.map((group) => {
          const options = levelOptions[group.key] ?? [];
          return (
            <section key={group.key}>
              <h3 className="mb-2 text-sm font-bold">{copy[group.key] ?? localizeDimensionLabel(group.key, language)}</h3>
              <div className="grid gap-1 text-sm">
                <button className={`text-left hover:text-[#c7511f] hover:underline ${Number(filters[group.filterKey] ?? 0) === 0 ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange(group.filterKey, 0)}>
                  {copy.clearFilter}
                </button>
                {options.map((option) => (
                  <button key={option.value} className={`text-left hover:text-[#c7511f] hover:underline ${Number(filters[group.filterKey] ?? 0) === Number(option.value) ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange(group.filterKey, Number(option.value))}>
                    {copy.levelUp(option.value)}
                    {option.count ? <span className="ml-1 text-xs text-[#565959]">({option.count})</span> : null}
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <section>
          <h3 className="mb-2 text-sm font-bold">{copy.waterproof}</h3>
          <div className="grid gap-1 text-sm">
            <button className={`text-left hover:text-[#c7511f] hover:underline ${filters.waterproof === "All" ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("waterproof", "All")}>
              {copy.clearFilter}
            </button>
            {waterproofOptions.map((option) => (
              <button key={String(option.value)} className={`text-left hover:text-[#c7511f] hover:underline ${String(filters.waterproof) === String(option.value) ? "font-bold" : ""}`} type="button" onClick={() => onFilterChange("waterproof", option.value)}>
                {option.value ? copy.yes : copy.no}
                {option.count ? <span className="ml-1 text-xs text-[#565959]">({option.count})</span> : null}
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function CartSummary({ cart, language, copy, onCart }) {
  if (cart.length === 0) return null;
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceNumber * 1300 * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="w-[300px] shrink-0 max-[1180px]:hidden">
      <div className="sticky top-[120px] rounded-lg border border-[#ddd] bg-white p-4">
        <h3 className="mb-3 text-base font-bold">{copy.orderSummary}</h3>
        <div className="mb-4 max-h-[260px] overflow-y-auto pr-1">
          {cart.map((item) => (
            <div key={item.key} className="mb-2 flex gap-2 rounded border border-[#f0f0f0] bg-[#fdfdfd] p-2">
              <ImageBox className="h-[58px] w-[58px] shrink-0 rounded" src={item.product.img} alt={buildDisplayProductName(item.product, language, copy)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{buildDisplayProductName(item.product, language, copy)}</div>
                <div className="mt-1 text-xs text-[#565959]">{copy.quantityShort} {item.quantity}</div>
                <div className="text-sm font-bold text-[#b12704]">{formatKrw(item.product.priceNumber * item.quantity)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span>{copy.items}: <b>{itemCount}</b></span>
          <span className="font-bold text-[#b12704]">₩ {subtotal.toLocaleString("ko-KR")}</span>
        </div>
        <button className={`${pillButton} w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button" onClick={onCart}>
          {copy.proceedToCheckout}
        </button>
      </div>
    </aside>
  );
}

function CriteriaLensStrip({
  aiLens,
  language,
  copy,
  stressWeights = DEFAULT_STRESS_WEIGHTS,
  stressResult,
  stressUpdating = false,
  onStressWeightChange,
  onToggleDimension,
  onClarifyCriteria,
  onRestoreHistory,
}) {
  const [showAllDimensions, setShowAllDimensions] = useState(false);

  useEffect(() => {
    setShowAllDimensions(false);
  }, [aiLens.queryId]);

  if (!["planning", "loading", "applied"].includes(aiLens.status)) return null;
  const criteria = aiLens.parsedCriteria ?? [];
  const clarifications = aiLens.clarifications ?? [];
  const criteriaKeys = new Set(criteria.map((criterion) => criterion.key).filter(Boolean));
  const groupedCriteria = groupAiCriteria(criteria);
  const dimensionControls = groupAiDimensionControls(aiLens.dimensions ?? []);
  const collapsedDimensions = dimensionControls
    .filter((dimension) => isAiDimensionControlRelevant(dimension, criteriaKeys))
    .slice(0, MAX_ACTIVE_AI_DIMENSIONS);
  const visibleDimensions = showAllDimensions ? dimensionControls : collapsedDimensions;
  const hiddenDimensionCount = Math.max(0, dimensionControls.length - collapsedDimensions.length);
  const history = aiLens.history ?? [];
  const historyIndex = aiLens.historyIndex ?? history.length - 1;
  const decomposition = aiLens.decomposition;
  const decompositionSource = decomposition?.source === "gemini" ? copy.llmSourceGemini : copy.llmSourceRule;
  const decompositionConfidence = Number.isFinite(decomposition?.confidence) ? Math.round(decomposition.confidence * 100) : null;
  const correctionCount = decomposition?.corrections?.length ?? 0;
  const stressTop = stressResult?.items?.[0];
  const warningText = localizeAiMessage(aiLens.interpretation?.warning, language, copy);
  const showWarning = warningText && !String(aiLens.interpretation?.warning ?? "").includes("AI query used the currently selected parsed criteria") && !String(aiLens.interpretation?.warning ?? "").includes("AI output was validated against backend-owned taxonomy");
  return (
    <section className="mb-5 rounded border border-[#d8b4fe] bg-[#fbf7ff] p-4 text-sm text-[#3b0764]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold">{copy.aiCriteriaLens}</div>
          <div className="text-xs text-[#4c1d95]">{copy.parsedCriteria}: {localizeInterpretationSummary(aiLens.interpretation?.summary, language)}</div>
          {decomposition ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-[#6d28d9]">
              <span>{copy.decompositionQuality}: {decompositionSource}{decompositionConfidence !== null ? ` ${decompositionConfidence}%` : ""}</span>
              {decomposition.fallbackUsed ? <span>{copy.fallbackInUse}</span> : null}
              {correctionCount ? <span>{copy.correctionsApplied(correctionCount)}</span> : null}
            </div>
          ) : null}
        </div>
        {aiLens.updating ? <span className="text-xs font-semibold text-[#6d28d9]">{copy.matrixUpdating}</span> : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {groupedCriteria.map((item) => {
          const status = item.status;
          const label = item.type === "group" ? localizeAiCriteriaGroupLabel(item, language) : localizeDimensionLabel(item.criterion, language);
          const value = item.type === "group" ? formatGroupedCriterionValue(item, language, copy) : localizeCriterionValue(item.criterion.displayValue, language, copy);
          return (
            <span
              key={item.key}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                status === "ambiguous"
                  ? "border-[#a855f7] bg-white text-[#6d28d9]"
                  : status === "draft"
                    ? "border-dashed border-[#c4b5fd] bg-white text-[#6d28d9]"
                    : "border-[#ddd6fe] bg-[#f5f3ff] text-[#4c1d95]"
              }`}
            >
              {label}: {value}
            </span>
          );
        })}
      </div>

      {clarifications.length ? (
        <div className="mb-3 grid gap-2">
          {clarifications.map((clarification) => (
            <div key={clarification.key} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#4c1d95]">{copy.clarification}: {language === "ko" ? localizeDimensionLabel(clarification, language) : clarification.question}</span>
              {clarification.options.map((option) => {
                const selected = option.value === clarification.selectedValue;
                return (
                  <button
                    key={`${clarification.key}-${String(option.value)}`}
                    className={`rounded-full border px-3 py-1 font-semibold ${
                      selected ? "border-[#7c3aed] bg-[#ede9fe] text-[#5b21b6]" : "border-[#ddd6fe] bg-white text-[#6d28d9] hover:border-[#7c3aed]"
                    }`}
                    type="button"
                    onClick={() => onClarifyCriteria(clarification, option)}
                  >
                    {localizeCriterionValue(option.label, language, copy)}
                    {Number.isFinite(option.estimatedCount) ? <span className="ml-1 text-[#6b7280]">({copy.estimatedResults(option.estimatedCount)})</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      {history.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-[#ede9fe] pt-3 text-xs">
          <span className="font-bold text-[#4c1d95]">{copy.criteriaHistory}</span>
          <button
            className={`rounded-full border px-3 py-1 font-semibold ${historyIndex === 0 ? "border-[#7c3aed] bg-[#ede9fe] text-[#5b21b6]" : "border-[#ddd6fe] bg-white text-[#6d28d9] hover:border-[#7c3aed]"}`}
            type="button"
            disabled={historyIndex === 0}
            onClick={() => onRestoreHistory(0)}
          >
            {copy.initialResults}
          </button>
          <button
            className="rounded-full border border-[#ddd6fe] bg-white px-3 py-1 font-semibold text-[#6d28d9] hover:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={historyIndex <= 0}
            onClick={() => onRestoreHistory(Math.max(0, historyIndex - 1))}
          >
            {copy.previousCriteria}
          </button>
          <button
            className="rounded-full border border-[#ddd6fe] bg-white px-3 py-1 font-semibold text-[#6d28d9] hover:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={() => onRestoreHistory(history.length - 1)}
          >
            {historyIndex >= history.length - 1 ? copy.currentCriteria : copy.reapplyCriteria}
          </button>
        </div>
      ) : null}

      {aiLens.status === "applied" ? (
        <div className="mb-3 border-t border-[#ede9fe] pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[#4c1d95]">{copy.preferenceStressTest}</div>
              <div className="text-[11px] leading-snug text-[#6d28d9]">
                {stressUpdating ? copy.stressUpdating : stressResult?.insight ?? copy.stressHelp}
              </div>
            </div>
            {stressTop ? (
              <span className="rounded-full border border-[#ddd6fe] bg-white px-3 py-1 text-[11px] font-bold text-[#6d28d9]">
                {copy.stressInsight}: #{stressTop.rank}
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 min-[760px]:grid-cols-2 min-[1220px]:grid-cols-4">
            {STRESS_CONTROLS.map((control) => {
              const value = Number(stressWeights?.[control.key] ?? DEFAULT_STRESS_WEIGHTS[control.key]);
              return (
                <label key={control.key} className="grid gap-1 text-[11px] font-semibold text-[#4c1d95]">
                  <span>{copy[control.copyKey]}</span>
                  <input
                    className="h-2 w-full accent-[#7c3aed]"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={value}
                    onChange={(event) => onStressWeightChange?.(control.key, Number(event.target.value))}
                  />
                  <span className="flex justify-between text-[10px] text-[#6d28d9]">
                    <span>{copy.stressLow}</span>
                    <span>{Math.round(value * 100)}%</span>
                    <span>{copy.stressHigh}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#ede9fe] pt-3">
        <div className="min-w-[150px]">
          <span className="block text-xs font-bold text-[#4c1d95]">{copy.criteriaRows}</span>
          <span className="block text-[11px] leading-snug text-[#6d28d9]">{copy.criteriaRowsHelp}</span>
        </div>
        {visibleDimensions.map((dimension) => {
          const label = dimension.grouped ? localizeAiCriteriaGroupLabel(dimension, language) : localizeDimensionLabel(dimension, language);
          return (
            <button
              key={dimension.key}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                dimension.active
                  ? "border-[#7c3aed] bg-[#7c3aed] text-white shadow-sm"
                  : "border-[#ddd6fe] bg-white text-[#6b7280] hover:border-[#8b5cf6] hover:text-[#6d28d9]"
              }`}
              type="button"
              aria-pressed={dimension.active ? "true" : "false"}
              title={dimension.active ? copy.criteriaRowEnabled(label) : copy.criteriaRowDisabled(label)}
              onClick={() => onToggleDimension(dimension.dimensionKeys ?? [dimension.key])}
            >
              {label}
            </button>
          );
        })}
        {hiddenDimensionCount ? (
          <button
            className="rounded-full border border-[#c4b5fd] bg-white px-3 py-1 text-xs font-bold text-[#6d28d9] transition hover:border-[#7c3aed] hover:bg-[#f5f3ff]"
            type="button"
            aria-expanded={showAllDimensions ? "true" : "false"}
            onClick={() => setShowAllDimensions((current) => !current)}
          >
            {showAllDimensions ? copy.hideCriteriaRows : copy.showMoreCriteriaRows(hiddenDimensionCount)}
          </button>
        ) : null}
      </div>
      {showWarning ? <div className="mt-2 text-xs text-[#6b21a8]">{warningText}</div> : null}
    </section>
  );
}

const EVIDENCE_DIMENSIONS = new Set([
  "archSupportLevel",
  "breathabilityLevel",
  "capacityLiters",
  "careComplexityLevel",
  "comfortLevel",
  "durabilityLevel",
  "fit",
  "lengthFit",
  "machineWashable",
  "material",
  "occasion",
  "opacityLevel",
  "pocketUtilityLevel",
  "reviewRisks",
  "reviewStrengths",
  "season",
  "shoulderStructure",
  "softnessLevel",
  "soleGripLevel",
  "strapComfortLevel",
  "stretchLevel",
  "style",
  "toeBoxFit",
  "waistRise",
  "warmthLevel",
  "waterproof",
  "weightGrams",
]);

function hasComparisonEvidence(row, key) {
  if (!EVIDENCE_DIMENSIONS.has(key)) return false;
  if (row?.evidenceAvailable && Object.prototype.hasOwnProperty.call(row.evidenceAvailable, key)) {
    return Boolean(row.evidenceAvailable[key]);
  }
  return false;
}

function EvidenceSnippetCard({ item, index, language, copy }) {
  return (
    <article key={item.id ?? `${item.reviewId ?? "review"}-${index}`} className="rounded border border-[#ede9fe] bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#6d28d9]">
        <span className="rounded-full bg-[#f3e8ff] px-2 py-0.5">{formatEvidenceTitle(item, language, copy)}</span>
        <span>{formatEvidenceTopic(item, language)}</span>
        {item.sentiment ? <span className="rounded-full bg-[#f3e8ff] px-2 py-0.5">{localizeSentiment(item.sentiment, language)}</span> : null}
      </div>
      {formatEvidenceMeta(item, language) ? <p className="mb-1 text-[11px] font-semibold text-[#6b7280]">{formatEvidenceMeta(item, language)}</p> : null}
      <p className="text-xs leading-relaxed text-[#111827]">{formatEvidenceText(item, language)}</p>
      {item.evidenceText && language !== "ko" && item.evidenceText !== item.reviewBody ? (
        <p className="mt-2 rounded bg-[#f8fafc] px-2 py-1 text-[11px] leading-snug text-[#475569]">{item.evidenceText}</p>
      ) : null}
    </article>
  );
}

const COMPARISON_DIMENSION_ORDER = [
  "price",
  "brand",
  "rating",
  "reviewCount",
  "category",
  "productType",
  "subCategory",
  "size",
  "colorFamily",
  "material",
  "sleeveLength",
  "season",
  "occasion",
  "style",
  "genderTarget",
  "fit",
  "warmthLevel",
  "comfortLevel",
  "breathabilityLevel",
  "durabilityLevel",
  "waterproof",
  "careEaseLevel",
  "weightGrams",
  "reviewStrengths",
  "reviewRisks",
];

const COMPARISON_SORT_OPTIONS = [
  { key: "original", copyKey: "sortOriginal" },
  { key: "price", copyKey: "sortPrice" },
  { key: "rating", copyKey: "sortRating" },
  { key: "reviews", copyKey: "sortReviews" },
];

function sortComparisonKeys(keys) {
  const order = new Map(COMPARISON_DIMENSION_ORDER.map((key, index) => [key, index]));
  return [...keys].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b));
}

function normalizeComparisonText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isMeaningfulComparisonText(value, language) {
  const normalized = normalizeComparisonText(value).toLowerCase();
  const emptyKo = language === "ko" && normalized === "없음";
  return Boolean(normalized) && normalized !== "n/a" && normalized !== "none" && !emptyKo;
}

function buildComparisonInsights(comparison, cellKeys, labelsByKey, language, copy) {
  const rows = comparison?.rows ?? [];
  const common = [];
  const differences = [];
  const partial = [];
  if (rows.length < 2) {
    return { common, differences, partial };
  }

  for (const key of cellKeys) {
    const label = localizeDimensionLabel({ key, label: labelsByKey.get(key) ?? key }, language);
    const values = rows.map((row) => {
      const text = normalizeComparisonText(localizeMatrixValue(key, row.cells?.[key], language, copy));
      return {
        product: `#${row.visibleNumber}`,
        text,
        normalized: text.toLowerCase(),
      };
    });
    if (!values.every((value) => isMeaningfulComparisonText(value.text, language))) {
      continue;
    }

    const groups = new Map();
    for (const value of values) {
      if (!groups.has(value.normalized)) {
        groups.set(value.normalized, { value: value.text, products: [] });
      }
      groups.get(value.normalized).products.push(value.product);
    }

    if (groups.size === 1) {
      common.push({ key, label, value: truncateUiText(values[0].text, 64) });
      continue;
    }

    differences.push({
      key,
      label,
      values: values.map((value) => ({ product: value.product, value: truncateUiText(value.text, 56) })),
    });

    if (rows.length > 2) {
      for (const group of groups.values()) {
        if (group.products.length > 1 && group.products.length < rows.length) {
          partial.push({
            key,
            label,
            value: truncateUiText(group.value, 56),
            products: group.products.join(", "),
          });
        }
      }
    }
  }

  return {
    common: common.slice(0, 5),
    differences: differences.slice(0, 5),
    partial: partial.slice(0, 4),
  };
}

function ComparisonInsights({ comparison, cellKeys, labelsByKey, language, copy }) {
  const insights = useMemo(() => buildComparisonInsights(comparison, cellKeys, labelsByKey, language, copy), [cellKeys, comparison, copy, labelsByKey, language]);
  const selectedCount = comparison?.rows?.length ?? 0;

  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      <section className="rounded border border-[#e9d5ff] bg-[#fbf7ff] p-3">
        <h4 className="mb-2 text-xs font-extrabold uppercase tracking-normal text-[#4c1d95]">{copy.commonGround}</h4>
        {insights.common.length ? (
          <div className="grid gap-1.5 text-xs text-[#111827]">
            {insights.common.map((item) => (
              <div key={item.key} className="rounded border border-[#ede9fe] bg-white px-2 py-1.5">
                <span className="font-bold text-[#4c1d95]">{item.label}</span>
                <span className="mx-1 text-[#6b7280]">:</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-snug text-[#6b7280]">{copy.noSharedTraits}</p>
        )}
      </section>

      <section className="rounded border border-[#e9d5ff] bg-white p-3">
        <h4 className="mb-2 text-xs font-extrabold uppercase tracking-normal text-[#4c1d95]">{copy.keyDifferences}</h4>
        {insights.differences.length ? (
          <div className="grid gap-2 text-xs">
            {insights.differences.map((item) => (
              <div key={item.key}>
                <div className="mb-1 font-bold text-[#4c1d95]">{item.label}</div>
                <div className="flex flex-wrap gap-1">
                  {item.values.map((value) => (
                    <span key={`${item.key}-${value.product}`} className="rounded-full border border-[#dbeafe] bg-[#eff6ff] px-2 py-0.5 text-[#1d4ed8]">
                      {value.product}: {value.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-snug text-[#6b7280]">{copy.noDifferences}</p>
        )}
      </section>

      {selectedCount > 2 ? (
        <section className="rounded border border-[#e9d5ff] bg-[#fff7ed] p-3">
          <h4 className="mb-2 text-xs font-extrabold uppercase tracking-normal text-[#7c2d12]">{copy.sharedBySome}</h4>
          {insights.partial.length ? (
            <div className="grid gap-1.5 text-xs text-[#111827]">
              {insights.partial.map((item) => (
                <div key={`${item.key}-${item.products}-${item.value}`} className="rounded border border-[#fed7aa] bg-white px-2 py-1.5">
                  <span className="font-bold text-[#7c2d12]">{item.products}</span>
                  <span className="mx-1 text-[#9a3412]">{copy.productsShare}</span>
                  <span>{item.label}: {item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-snug text-[#9a3412]">{copy.noPartialSharedTraits}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ComparisonMatrix({ comparison, selectedProducts, language, copy, updating, onRemoveProduct, queryId, embedded = false }) {
  const selectedCount = selectedProducts.length;
  const [evidencePanel, setEvidencePanel] = useState({
    loading: false,
    error: "",
    productId: null,
    productName: "",
    dimension: "",
    evidence: [],
    overlay: null,
  });
  const [sortMode, setSortMode] = useState("original");
  const emptyClassName = embedded ? "bg-white text-sm text-[#565959]" : "rounded border border-[#d8b4fe] bg-white p-4 text-sm text-[#565959]";
  const matrixClassName = embedded ? "bg-white" : "rounded border border-[#d8b4fe] bg-white p-4 shadow-lg";
  const productNamesById = useMemo(
    () => new Map(selectedProducts.map((product) => [product.id, buildDisplayProductName(product, language, copy)])),
    [copy, language, selectedProducts],
  );
  const displayRowName = useCallback(
    (row) => productNamesById.get(row.productId) ?? (row?.name || (language === "ko" ? "선택 상품" : "Selected item")),
    [language, productNamesById],
  );

  useEffect(() => {
    setEvidencePanel({
      loading: false,
      error: "",
      productId: null,
      productName: "",
      dimension: "",
      evidence: [],
      overlay: null,
    });
  }, [comparison, queryId]);

  const handleLoadEvidence = useCallback((row, dimension) => {
    if (!queryId || !row?.productId) return;
    setEvidencePanel({
      loading: true,
      error: "",
      productId: row.productId,
      productName: displayRowName(row),
      dimension,
      evidence: [],
      overlay: null,
    });
    loadAiEvidence({ queryId, productId: row.productId, dimension, locale: language })
      .then((response) => {
        setEvidencePanel({
          loading: false,
          error: "",
          productId: row.productId,
          productName: displayRowName(row),
          dimension,
          evidence: response.evidence ?? [],
          overlay: response.overlay ?? null,
        });
        logInteraction("evidence_opened", { queryId, productId: row.productId, dimension });
      })
      .catch((error) => {
        setEvidencePanel({
          loading: false,
          error: error instanceof Error ? error.message : copy.evidenceRequestFailed,
          productId: row.productId,
          productName: displayRowName(row),
          dimension,
          evidence: [],
          overlay: null,
        });
      });
  }, [copy.evidenceRequestFailed, displayRowName, language, queryId]);

  const rawCellKeys = useMemo(() => Object.keys(comparison?.rows?.[0]?.cells ?? {}), [comparison]);
  const dimensionLabels = comparison?.dimensions ?? rawCellKeys;
  const labelsByKey = useMemo(
    () => new Map(rawCellKeys.map((key, index) => [key, dimensionLabels[index] ?? key])),
    [dimensionLabels, rawCellKeys],
  );
  const cellKeys = useMemo(() => sortComparisonKeys(rawCellKeys), [rawCellKeys]);
  const sortedRows = useMemo(() => {
    const rows = comparison?.rows ?? [];
    const indexedRows = rows.map((row, index) => ({ row, index }));
    if (sortMode === "price") {
      indexedRows.sort((a, b) => parsePrice(a.row.cells?.price) - parsePrice(b.row.cells?.price) || a.index - b.index);
    } else if (sortMode === "rating") {
      indexedRows.sort((a, b) => Number(b.row.cells?.rating ?? 0) - Number(a.row.cells?.rating ?? 0) || a.index - b.index);
    } else if (sortMode === "reviews") {
      indexedRows.sort((a, b) => parseReviewCount(b.row.cells?.reviewCount) - parseReviewCount(a.row.cells?.reviewCount) || a.index - b.index);
    }
    return indexedRows.map(({ row }) => row);
  }, [comparison, sortMode]);
  const sortedComparison = useMemo(() => (comparison ? { ...comparison, rows: sortedRows } : null), [comparison, sortedRows]);

  if (selectedCount < 2) {
    return (
      <section className={emptyClassName}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#3b0764]">{copy.comparisonMatrix}</h3>
          <span className="text-xs font-semibold text-[#6d28d9]">{copy.selectedForCompare(selectedCount)}</span>
        </div>
        <p>{copy.matrixHint}</p>
      </section>
    );
  }
  if (!comparison) {
    return (
      <section className={emptyClassName}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#3b0764]">{copy.comparisonMatrix}</h3>
          <span className="text-xs font-semibold text-[#6d28d9]">{copy.selectedForCompare(selectedCount)}</span>
        </div>
        <p>{updating ? copy.matrixUpdating : copy.matrixHint}</p>
      </section>
    );
  }
  const productColumnWidth = sortedRows.length >= 4 ? 220 : sortedRows.length === 3 ? 250 : 300;
  return (
    <section className={matrixClassName}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold tracking-normal text-[#3b0764]">{copy.comparisonMatrix}</h3>
          <span className="text-xs font-semibold text-[#6d28d9]">{updating ? copy.matrixUpdating : copy.selectedForCompare(selectedCount)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-[#4c1d95]">{copy.matrixSort}</span>
          {COMPARISON_SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`rounded-full border px-3 py-1 font-semibold ${
                sortMode === option.key ? "border-[#7c3aed] bg-[#7c3aed] text-white" : "border-[#ddd6fe] bg-white text-[#6d28d9] hover:border-[#7c3aed]"
              }`}
              type="button"
              aria-pressed={sortMode === option.key ? "true" : "false"}
              onClick={() => setSortMode(option.key)}
            >
              {copy[option.copyKey]}
            </button>
          ))}
        </div>
      </div>
      <ComparisonInsights comparison={sortedComparison} cellKeys={cellKeys} labelsByKey={labelsByKey} language={language} copy={copy} />
      <div className="overflow-x-auto">
        <table className="table-fixed text-left text-sm" style={{ minWidth: `${180 + sortedRows.length * productColumnWidth}px`, width: "100%" }}>
          <colgroup>
            <col style={{ width: "180px" }} />
            {sortedRows.map((row) => (
              <col key={row.productId} style={{ width: `${productColumnWidth}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[#e9d5ff]">
              <th className="py-2 pr-4 text-[#4c1d95]">{copy.criteriaRows}</th>
              {sortedRows.map((row) => (
                <th key={row.productId} className="py-2 pr-4 align-top">
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2">#{row.visibleNumber} {displayRowName(row)}</span>
                    <button className="shrink-0 rounded border border-[#ddd6fe] px-2 py-0.5 text-[11px] text-[#6d28d9]" type="button" onClick={() => onRemoveProduct(row.productId)}>
                      {copy.removeCompare}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cellKeys.map((key) => (
              <tr key={key} className="border-b border-[#f3e8ff] last:border-0">
                <td className="py-2 pr-4 align-top font-semibold text-[#4c1d95]">{localizeDimensionLabel({ key, label: labelsByKey.get(key) ?? key }, language)}</td>
                {sortedRows.map((row) => (
                  <td key={`${row.productId}-${key}`} className="py-2 pr-4 align-top text-[#111827]">
                    {hasComparisonEvidence(row, key) ? (
                      <button
                        className="grid w-full cursor-pointer gap-1 rounded border border-[#ede9fe] bg-[#fbf7ff] px-2 py-1.5 text-left text-xs leading-snug text-[#4c1d95] hover:border-[#8b5cf6] hover:bg-white"
                        type="button"
                        onClick={() => handleLoadEvidence(row, key)}
                      >
                        <span className="line-clamp-2">{localizeMatrixValue(key, row.cells?.[key], language, copy)}</span>
                        <span className="font-bold text-[#6d28d9]">{copy.sourceSnippets}</span>
                      </button>
                    ) : EVIDENCE_DIMENSIONS.has(key) ? (
                      <span className="block rounded border border-[#e5e7eb] bg-[#f8fafc] px-2 py-1.5 text-xs font-semibold text-[#6b7280]">
                        {copy.noEvidenceInfo}
                      </span>
                    ) : (
                      localizeMatrixValue(key, row.cells?.[key], language, copy)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {evidencePanel.productId ? (
        <section className="mt-4 rounded border border-[#e9d5ff] bg-[#fbf7ff] p-3 text-sm">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-bold tracking-normal text-[#3b0764]">{copy.sourceSnippets}</h4>
              <p className="text-xs text-[#6d28d9]">
                {evidencePanel.productName} · {localizeDimensionLabel({ key: evidencePanel.dimension }, language)}
              </p>
            </div>
            <button
              className="rounded border border-[#ddd6fe] bg-white px-2 py-1 text-xs font-bold text-[#6d28d9]"
              type="button"
              onClick={() => setEvidencePanel({ loading: false, error: "", productId: null, productName: "", dimension: "", evidence: [], overlay: null })}
            >
              {copy.closeSnippets}
            </button>
          </div>
          {evidencePanel.loading ? <p className="text-xs font-semibold text-[#6d28d9]">{copy.loadingEvidence}</p> : null}
          {evidencePanel.error ? <p className="text-xs font-semibold text-[#b12704]">{evidencePanel.error}</p> : null}
          {!evidencePanel.loading && !evidencePanel.error ? (
            evidencePanel.overlay ? (
              <div className="grid gap-3">
                {[
                  { key: "supporting", title: copy.supportingEvidence, items: evidencePanel.overlay.supporting ?? [] },
                  { key: "skeptical", title: copy.skepticalEvidence, items: evidencePanel.overlay.skeptical ?? [] },
                ].map((group) => (
                  <section key={group.key} className="grid gap-2">
                    <h5 className="text-xs font-bold text-[#4c1d95]">{group.title}</h5>
                    {group.items.length ? (
                      group.items.slice(0, 4).map((item, index) => (
                        <EvidenceSnippetCard key={item.id ?? `${group.key}-${item.reviewId ?? index}`} item={item} index={index} language={language} copy={copy} />
                      ))
                    ) : (
                      <p className="rounded border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#565959]">{copy.noEvidenceInfo}</p>
                    )}
                  </section>
                ))}
                {evidencePanel.overlay.missing?.length ? (
                  <section className="grid gap-2">
                    <h5 className="text-xs font-bold text-[#4c1d95]">{copy.missingEvidence}</h5>
                    <div className="grid gap-1">
                      {evidencePanel.overlay.missing.map((item) => {
                        const text = item.key === "supporting"
                          ? copy.missingSupportingEvidence
                          : item.key === "skeptical"
                            ? copy.missingSkepticalEvidence
                            : item.label;
                        return <p key={item.key} className="rounded border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#565959]">{text}</p>;
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : evidencePanel.evidence.length ? (
              <div className="grid gap-2">
                {evidencePanel.evidence.slice(0, 6).map((item, index) => (
                  <EvidenceSnippetCard key={item.id ?? `${item.reviewId ?? "review"}-${index}`} item={item} index={index} language={language} copy={copy} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#565959]">{copy.noEvidenceInfo}</p>
            )
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function ComparisonMatrixDock({ comparison, selectedProducts, language, copy, updating, isOpen, onToggle, onRemoveProduct, queryId }) {
  const selectedCount = selectedProducts.length;
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[1180px] overflow-hidden rounded-t-lg border border-[#d8b4fe] bg-white shadow-2xl">
        <button
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 bg-[#fbf7ff] px-4 py-2 text-left"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? copy.collapseCompareMatrix : copy.expandCompareMatrix}
          title={isOpen ? copy.collapseCompareMatrix : copy.expandCompareMatrix}
          onClick={onToggle}
        >
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-normal text-[#3b0764]">{copy.comparisonMatrix}</div>
            <div className="truncate text-xs text-[#6d28d9]">{selectedCount ? copy.selectedForCompare(selectedCount) : copy.compareDockHint}</div>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#c4b5fd] bg-white text-base font-bold text-[#6d28d9]">
            {isOpen ? "v" : "^"}
          </span>
        </button>
        {isOpen ? (
          <div className="max-h-[62vh] overflow-auto border-t border-[#e9d5ff] bg-white p-4">
            <ComparisonMatrix
              comparison={comparison}
              selectedProducts={selectedProducts}
              language={language}
              copy={copy}
              updating={updating}
              onRemoveProduct={onRemoveProduct}
              queryId={queryId}
              embedded
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function PaginationControls({ page, totalPages, totalItems, pageSize, copy, onPageChange }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const windowStart = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - 4)));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index).filter((value) => value <= totalPages);

  return (
    <nav className="my-4 flex flex-wrap items-center justify-between gap-3 border-y border-[#e3e6e6] bg-white py-3 text-sm" aria-label="Product grid pagination">
      <div className="text-xs font-semibold text-[#565959]">
        {copy.gridPageStatus(page, totalPages)} · {copy.gridPageRange(start, end, totalItems)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded border border-[#d5d9d9] px-3 py-1.5 text-xs font-bold disabled:opacity-40" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {copy.previousPage}
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            className={`h-8 min-w-8 rounded border px-2 text-xs font-bold ${pageNumber === page ? "border-[#7c3aed] bg-[#f3e8ff] text-[#5b21b6]" : "border-[#d5d9d9] bg-white text-[#111827]"}`}
            type="button"
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button className="rounded border border-[#d5d9d9] px-3 py-1.5 text-xs font-bold disabled:opacity-40" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {copy.nextPage}
        </button>
      </div>
    </nav>
  );
}

function ProductListing({
  listing,
  products,
  filters,
  facets,
  cart,
  aiLens,
  isUpdating,
  stressWeights,
  stressResult,
  stressUpdating,
  selectedComparisonIds,
  language,
  copy,
  onFilterChange,
  onOpenProduct,
  onCart,
  onToggleDimension,
  onStressWeightChange,
  onClarifyCriteria,
  onRestoreCriteriaHistory,
  onToggleCompareProduct,
  onRefine,
}) {
  const [gridPage, setGridPage] = useState(1);
  const [isComparisonDockOpen, setIsComparisonDockOpen] = useState(false);
  const gridTopRef = useRef(null);

  const filteredProducts = useMemo(() => {
    if (["planning", "loading"].includes(aiLens.status)) {
      return aiLens.items;
    }
    if (aiLens.status === "applied") {
      return aiLens.items.filter((product) => productMatchesUiFilters(product, filters));
    }
    const baseProducts = Array.isArray(listing.productIds)
      ? products.filter((product) => listing.productIds.includes(product.id))
      : products;
    const query = listing.query.trim();
    return baseProducts.filter((product) => {
      const serverFiltered = Array.isArray(listing.productIds);
      const categoryMatch = !listing.category || product.category === listing.category;
      const queryMatch = serverFiltered ? true : productMatchesQuery(product, query);
      const filterMatch = serverFiltered || !listing.category || productMatchesUiFilters(product, filters);
      return categoryMatch && queryMatch && filterMatch;
    });
  }, [aiLens.items, aiLens.status, filters, listing, products]);

  const totalGridPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_GRID_PAGE_SIZE));
  const currentGridPage = Math.min(gridPage, totalGridPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentGridPage - 1) * PRODUCT_GRID_PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCT_GRID_PAGE_SIZE);
  }, [currentGridPage, filteredProducts]);

  useEffect(() => {
    setGridPage(1);
  }, [aiLens.historyIndex, aiLens.queryId, aiLens.status, filters.color, filters.maxPrice, filters.minRating, filters.subCategory, listing.category, listing.mode, listing.query]);

  useEffect(() => {
    if (gridPage > totalGridPages) {
      setGridPage(totalGridPages);
    }
  }, [gridPage, totalGridPages]);

  useEffect(() => {
    if (!selectedComparisonIds.length) {
      setIsComparisonDockOpen(false);
    }
  }, [selectedComparisonIds.length]);

  const handleGridPageChange = useCallback((nextPage) => {
    const clampedPage = Math.min(Math.max(1, nextPage), totalGridPages);
    setGridPage(clampedPage);
    window.requestAnimationFrame(() => {
      gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [totalGridPages]);

  const selectedProducts = useMemo(
    () => selectedComparisonIds
      .map((id) => aiLens.items.find((product) => product.id === id) ?? products.find((product) => product.id === id))
      .filter(Boolean),
    [aiLens.items, products, selectedComparisonIds],
  );

  const title = listing.title
    ? listing.title
    : listing.query
    ? copy.searchResults(listing.query)
    : listing.category
      ? copy.resultsFor(localizeCatalogLabel(listing.category, language))
      : copy.allProducts;
  const showFilterSidebar = !["planning", "loading"].includes(aiLens.status);
  const filterSidebarProducts = aiLens.status === "applied" ? aiLens.items : products;
  const filterSidebarFacets = aiLens.status === "applied" ? null : facets;

  return (
    <main className="bg-white pb-20">
      <div className="border-b border-b-[#ddd] bg-white px-5 py-3 shadow-sm">
        <h2 className="text-2xl font-normal tracking-normal">{title}</h2>
        <p className="text-sm text-[#565959]">{["planning", "loading"].includes(aiLens.status) ? copy.findingGroundedMatches : copy.itemsFound(filteredProducts.length)}</p>
      </div>

      <div className="flex items-start gap-5 max-[900px]:block">
        {showFilterSidebar ? <FilterSidebar category={listing.category} products={filterSidebarProducts} filters={filters} facets={filterSidebarFacets} language={language} copy={copy} isAiMode={aiLens.status === "applied"} onFilterChange={onFilterChange} /> : null}
        <section className="min-w-0 flex-1 p-5">
          <CriteriaLensStrip
            aiLens={aiLens}
            language={language}
            copy={copy}
            stressWeights={stressWeights}
            stressResult={stressResult}
            stressUpdating={stressUpdating}
            onStressWeightChange={onStressWeightChange}
            onToggleDimension={onToggleDimension}
            onClarifyCriteria={onClarifyCriteria}
            onRestoreHistory={onRestoreCriteriaHistory}
          />
          {["planning", "loading"].includes(aiLens.status) ? <div className="mb-5 rounded border border-[#d8b4fe] bg-[#faf5ff] p-4 text-sm text-[#6d28d9]">{copy.aiInterpreting}</div> : null}
          {aiLens.status === "error" ? <div className="mb-5 rounded border border-[#f5c2c7] bg-[#fff5f5] p-4 text-sm text-[#b12704]">{aiLens.error}</div> : null}
          <div ref={gridTopRef} />
          {["planning", "loading"].includes(aiLens.status) ? null : (
            <div className="relative min-h-[280px]" aria-busy={isUpdating ? "true" : "false"}>
              {isUpdating ? (
                <div className="absolute inset-x-0 top-0 z-10 rounded border border-[#d5d9d9] bg-white/90 px-4 py-3 text-sm font-semibold text-[#565959] shadow-sm" aria-live="polite">
                  {copy.updatingResults}
                </div>
              ) : null}
              <div className={isUpdating ? "opacity-60 transition-opacity" : "transition-opacity"}>
                {filteredProducts.length > 0 ? (
                  <>
              <PaginationControls
                page={currentGridPage}
                totalPages={totalGridPages}
                totalItems={filteredProducts.length}
                pageSize={PRODUCT_GRID_PAGE_SIZE}
                copy={copy}
                onPageChange={handleGridPageChange}
              />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    language={language}
                    copy={copy}
                    aiActive={aiLens.status === "applied"}
                    selected={selectedComparisonIds.includes(product.id)}
                    onOpen={onOpenProduct}
                    onToggleSelect={onToggleCompareProduct}
                  />
                ))}
              </div>
              <PaginationControls
                page={currentGridPage}
                totalPages={totalGridPages}
                totalItems={filteredProducts.length}
                pageSize={PRODUCT_GRID_PAGE_SIZE}
                copy={copy}
                onPageChange={handleGridPageChange}
              />
                  </>
                ) : (
                  <div className="rounded border border-[#ddd] bg-[#f7fafa] p-6 text-sm text-[#565959]">{copy.noResults}</div>
                )}
              </div>
            </div>
          )}
          {aiLens.status === "applied" ? (
            <section className="mt-5 grid gap-3 rounded border border-[#d8b4fe] bg-[#fbf7ff] p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#3b0764]">{copy.nextActions}</h3>
                  <p className="text-xs text-[#6d28d9]">{copy.nextActionsHelp}</p>
                </div>
                <span className="rounded-full border border-[#ddd6fe] bg-white px-3 py-1 text-xs font-bold text-[#6d28d9]">{copy.selectedForCompare(selectedComparisonIds.length)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiLens.actions.map((action) => (
                  <button key={action.command ?? action.label} className="rounded-full border border-[#bbf7d0] bg-white px-4 py-2 text-xs font-semibold text-[#166534]" type="button" onClick={() => onRefine(action.command ?? action.label)}>
                    {localizeActionLabel(action, language)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </section>
        <CartSummary cart={cart} language={language} copy={copy} onCart={onCart} />
      </div>
      {aiLens.status === "applied" ? (
        <ComparisonMatrixDock
          comparison={aiLens.comparison}
          selectedProducts={selectedProducts}
          language={language}
          copy={copy}
          updating={aiLens.comparisonUpdating}
          isOpen={isComparisonDockOpen}
          onToggle={() => setIsComparisonDockOpen((current) => !current)}
          onRemoveProduct={(productId) => onToggleCompareProduct({ id: productId })}
          queryId={aiLens.queryId}
        />
      ) : null}
    </main>
  );
}

function SmallProductCard({ product, language, copy, onOpen }) {
  const displayName = buildDisplayProductName(product, language, copy);
  return (
    <button className="min-w-[160px] max-w-[170px] cursor-pointer p-2 text-left" type="button" onClick={() => onOpen(product)}>
      <ImageBox className="h-[150px] w-full rounded" src={product.img} alt={displayName} />
      <p className="line-clamp-2 mt-2 min-h-[36px] text-sm leading-[1.35] text-[#007185] hover:text-[#c7511f] hover:underline">{displayName}</p>
      <p className="mt-1 text-sm font-bold text-[#b12704]">{formatUsd(product.price)}</p>
    </button>
  );
}

function RatingBars({ product, copy }) {
  return (
    <div className="grid gap-2">
      {[5, 4, 3, 2, 1].map((ratingValue) => {
        const percentage = Number(product.ratingDetail?.[ratingValue] ?? 0);
        return (
          <div key={ratingValue} className="grid grid-cols-[46px_minmax(0,1fr)_40px] items-center gap-2 text-sm text-[#007185]">
            <span>{copy.starLabel(ratingValue)}</span>
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

function DetailModal({ product, reviews, relatedProducts, language, copy, onClose, onAddToCart, onOpenProduct }) {
  const allImages = useMemo(() => [product.img, ...product.descImages, ...product.brandImages].filter(Boolean), [product]);
  const [mainImage, setMainImage] = useState(allImages[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const displayName = buildDisplayProductName(product, language, copy);
  const displayFeatures = buildDisplayFeatures(product, language, copy);
  const displaySummary = buildDisplayProductSummary(product, language, copy);
  const displayBrandStory = buildDisplayBrandStory(product, language, copy);

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
        <button className="absolute right-5 top-3 z-20 cursor-pointer text-4xl leading-none text-[#555] hover:text-black" type="button" onClick={onClose} aria-label={copy.closeDetail}>
          ×
        </button>

        <nav className="sticky top-[-24px] z-10 -mx-6 -mt-6 mb-6 border-b border-b-[#ddd] bg-white px-6 py-3">
          <ul className="flex gap-6 overflow-x-auto pr-12 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-bought-together">{copy.boughtTogether}</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-from-brand">{copy.fromBrand}</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-related">{copy.relatedProducts}</a></li>
            <li><a className="whitespace-nowrap text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-reviews">{copy.customerReviews}</a></li>
          </ul>
        </nav>

        <div className="grid grid-cols-[minmax(280px,1fr)_minmax(340px,1.2fr)_300px] gap-7 max-[1120px]:grid-cols-[1fr_1fr] max-[760px]:grid-cols-1">
          <section className="flex gap-3">
            <div className="flex w-[54px] shrink-0 flex-col gap-2">
              {allImages.slice(0, 7).map((image, index) => (
                <button key={`${image}-${index}`} className={`h-[54px] w-[54px] rounded border ${mainImage === image ? "border-[#ffa41c] shadow-[0_0_3px_#ffa41c]" : "border-[#d5d9d9]"}`} type="button" onClick={() => setMainImage(image)}>
                  <ImageBox className="h-full w-full rounded" src={image} alt={`${displayName} ${index + 1}`} />
                </button>
              ))}
            </div>
            <ImageBox className="min-h-[420px] flex-1 rounded bg-white max-[760px]:min-h-[300px]" src={mainImage} alt={displayName} />
          </section>

          <section>
            <h1 id="detail-title" className="mb-2 text-2xl font-medium tracking-normal text-[#0f1111]">{displayName}</h1>
            <div className="relative mb-3 flex w-fit items-center gap-2">
              {stars(product.rating, "text-lg")}
              <span className="text-sm text-[#565959]">{copy.outOfFive(product.rating)}</span>
              <a className="text-sm text-[#007185] hover:text-[#c7511f] hover:underline" href="#section-reviews">{copy.ratings(product.reviewCount)}</a>
            </div>
            <hr className="my-4 border-[#e7e7e7]" />
            <div className="mb-4">
              <span className="mr-2 text-sm text-[#565959]">{copy.priceLabel}</span>
              <span className="text-3xl text-[#b12704]">{formatUsd(product.price)}</span>
            </div>

            {product.sizes.length ? (
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold">{copy.size}</div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button key={size} className={`min-h-[36px] rounded border px-3 text-sm ${selectedSize === size ? "border-[#c7511f] bg-[#fff7ed]" : "border-[#d5d9d9] bg-white"}`} type="button" onClick={() => setSelectedSize(size)}>
                      {localizeOptionValue(size, language, copy)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.colors.length ? (
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold">{copy.color} <span className="font-normal text-[#565959]">{localizeSafeCriterionValue(selectedColor, language, copy, "색상 옵션")}</span></div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={`h-9 w-9 rounded-full border ${selectedColor === color ? "border-[#c7511f] ring-2 ring-[#c7511f]/30" : "border-[#d5d9d9]"}`}
                      style={{ background: mapColorToCss(color) }}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      aria-label={localizeSafeCriterionValue(color, language, copy, "색상 옵션")}
                      title={localizeSafeCriterionValue(color, language, copy, "색상 옵션")}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <h3 className="mb-2 text-lg font-bold">{copy.aboutItem}</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#0f1111]">
                {displayFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="max-[1120px]:col-span-2 max-[760px]:col-span-1">
            <div className="sticky top-12 rounded-lg border border-[#d5d9d9] bg-white p-5">
              <p className="mb-3 text-3xl text-[#b12704]">{formatUsd(product.price)}</p>
              <p className="mb-3 text-sm">{copy.freeDelivery} <b>{copy.deliveryDate}</b></p>
              <p className="mb-4 text-lg font-bold text-[#007600]">{copy.inStock}</p>
              <label className="mb-4 flex items-center gap-2 text-sm">
                {copy.quantity}
                <select className="rounded border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button className={`${pillButton} mb-3 w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button" onClick={handleAdd}>{copy.addToCart}</button>
              <button className={`${pillButton} w-full bg-[#ffa41c] hover:bg-[#fa8900]`} type="button">{copy.buyNow}</button>
            </div>
          </aside>
        </div>

        <section id="section-bought-together" className="mt-10 border-t border-t-[#eee] pt-6">
          <h3 className="mb-3 text-xl font-bold tracking-normal">{copy.boughtTogetherTitle}</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {relatedProducts.slice(0, 5).map((item) => <SmallProductCard key={item.id} product={item} language={language} copy={copy} onOpen={onOpenProduct} />)}
          </div>
        </section>

        <section id="section-from-brand" className="mt-10 rounded-lg border border-[#ddd] bg-white p-5">
          <h3 className="mb-2 text-xl font-bold tracking-normal">{copy.fromBrand}</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-[#565959]">{displayBrandStory}</p>
        </section>

        <section id="section-related" className="mt-10 border-t border-t-[#eee] pt-6">
          <h3 className="mb-3 text-xl font-bold tracking-normal">{copy.relatedTitle}</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {relatedProducts.map((item) => <SmallProductCard key={item.id} product={item} language={language} copy={copy} onOpen={onOpenProduct} />)}
          </div>
        </section>

        <section id="section-reviews" className="mt-10 grid grid-cols-[300px_minmax(0,1fr)] gap-10 border-t border-t-[#eee] pt-6 max-[820px]:grid-cols-1">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-normal">{copy.customerReviews}</h2>
            <div className="mb-4 flex items-center gap-2">{stars(product.rating, "text-lg")} <span>{copy.outOfFive(product.rating)}</span></div>
            <RatingBars product={product} copy={copy} />
          </div>

          <div className="rounded-lg border border-[#d5d9d9] bg-[#f7fafa] p-5">
            <h3 className="mb-1 text-lg font-bold">{copy.customersSay}</h3>
            <p className="mb-3 text-sm font-bold text-[#007185]">{copy.aiGeneratedSummary}</p>
            <p className="mb-5 text-sm leading-relaxed">{displaySummary}</p>

            <div className="border-t border-t-[#e7e7e7] pt-5">
              <h3 className="mb-3 text-lg font-bold">{copy.customerReviews}</h3>
              {reviews.length ? (
                <div className="grid gap-4">
                  {reviews.map((review, index) => (
                    <article key={review.id} className="border-b border-b-[#eee] pb-4">
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <img className="h-7 w-7 rounded-full" src="https://m.media-amazon.com/images/S/amazon-avatars-global/default._CR0,0,1024,1024_SX48_.png" alt="" />
                        <span>{buildReviewUserName(review, language)}</span>
                      </div>
                      <div className="mb-1 text-sm">
                        {stars(review.rating)} <b className="ml-1">{buildReviewTitle(review, index, language)}</b>
                      </div>
                      <div className="mb-2 text-xs text-[#565959]">{buildReviewDate(review, language)}</div>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{buildReviewComment(review, product, language, copy)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#565959]">{copy.noReviews}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CartPage({ cart, products, language, copy, onHome, onOpenProduct, onAddSimple, onQuantityChange, onRemove }) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceNumber * 1300 * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const recommended = products.slice(0, cart.length ? 4 : 3);

  if (cart.length === 0) {
    return (
      <main className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 max-[900px]:grid-cols-1">
        <section className="flex items-center gap-8 bg-white p-10 max-[720px]:block">
          <div className="flex h-[210px] w-[260px] shrink-0 items-center justify-center bg-[#f3f3f3] text-center text-sm font-semibold text-[#565959] max-[720px]:mb-6 max-[720px]:w-full">{copy.cartEmptyVisual}</div>
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-normal">{copy.cartEmptyTitle}</h2>
            <button className="mb-5 text-sm text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={onHome}>{copy.shopDeals}</button>
            <div className="flex flex-wrap gap-3">
              <button className={`${pillButton} bg-[#ffd814] hover:bg-[#f7ca00]`} type="button">{copy.signIn}</button>
              <button className={`${pillButton} border border-[#d5d9d9] bg-white hover:bg-[#f7fafa]`} type="button">{copy.signUp}</button>
            </div>
          </div>
        </section>
        <RecommendationPanel products={recommended} language={language} copy={copy} onOpenProduct={onOpenProduct} onAddSimple={onAddSimple} />
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_300px] gap-5 p-5 max-[980px]:grid-cols-1">
      <section className="bg-white p-5">
        <h2 className="text-3xl font-normal tracking-normal">{copy.shoppingCart}</h2>
        <div className="border-b border-b-[#ddd] pb-1 text-right text-sm text-[#565959]">{copy.price}</div>
        {cart.map((item) => (
          <article key={item.key} className="grid grid-cols-[180px_minmax(0,1fr)_120px] gap-5 border-b border-b-[#ddd] py-5 max-[760px]:grid-cols-[110px_minmax(0,1fr)]">
            <ImageBox className="h-[180px] w-[180px] max-[760px]:h-[110px] max-[760px]:w-[110px]" src={item.product.img} alt={buildDisplayProductName(item.product, language, copy)} />
            <div>
              <h3 className="mb-1 text-lg text-[#0f1111]">{buildDisplayProductName(item.product, language, copy)}</h3>
              <p className="mb-1 text-xs text-[#565959]"><b>{copy.size}:</b> {item.selectedSize ? localizeOptionValue(item.selectedSize, language, copy) : copy.notSelected} | <b>{copy.color}:</b> {item.selectedColor ? localizeSafeCriterionValue(item.selectedColor, language, copy, "색상 옵션") : copy.notSelected}</p>
              <p className="mb-2 text-xs text-[#007600]">{copy.inStock}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#007185]">
                <select className="rounded border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-xs" value={item.quantity} onChange={(event) => onQuantityChange(item.key, Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                </select>
                <button className="hover:text-[#c7511f] hover:underline" type="button" onClick={() => onRemove(item.key)}>{copy.delete}</button>
                <span>{copy.saveForLater}</span>
                <span>{copy.compareSimilar}</span>
              </div>
            </div>
            <div className="text-right text-lg font-bold max-[760px]:col-span-2 max-[760px]:text-left">{formatKrw(item.product.priceNumber * item.quantity)}</div>
          </article>
        ))}
        <div className="mt-4 text-right text-lg">
          {copy.subtotal(itemCount)} <b>₩ {subtotal.toLocaleString("ko-KR")}</b>
        </div>
      </section>

      <aside className="grid gap-5">
        <section className="bg-white p-5">
          <p className="mb-3 text-xs text-[#067d62]">{copy.freeShippingNotice}</p>
          <div className="mb-4 text-lg">{copy.subtotal(itemCount)} <b>₩ {subtotal.toLocaleString("ko-KR")}</b></div>
          <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" /> {copy.giftOrder}</label>
          <button className={`${pillButton} w-full bg-[#ffd814] hover:bg-[#f7ca00]`} type="button">{copy.proceedToCheckout}</button>
        </section>
        <RecommendationPanel products={recommended} language={language} copy={copy} onOpenProduct={onOpenProduct} onAddSimple={onAddSimple} />
      </aside>
    </main>
  );
}

function RecommendationPanel({ products, language, copy, onOpenProduct, onAddSimple }) {
  return (
    <section className="bg-white p-5">
      <h3 className="mb-4 text-sm font-bold leading-snug">{copy.recommendationTitle}</h3>
      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="flex gap-3">
            <button type="button" onClick={() => onOpenProduct(product)}>
              <ImageBox className="h-20 w-20 shrink-0" src={product.img} alt={buildDisplayProductName(product, language, copy)} />
            </button>
            <div className="min-w-0 flex-1">
              <button className="line-clamp-2 text-left text-sm leading-snug text-[#007185] hover:text-[#c7511f] hover:underline" type="button" onClick={() => onOpenProduct(product)}>{buildDisplayProductName(product, language, copy)}</button>
              <div className="mt-1 text-sm font-bold text-[#b12704]">{formatUsd(product.price)}</div>
              <button className="mt-2 rounded-full bg-[#ffd814] px-3 py-1 text-xs hover:bg-[#f7ca00]" type="button" onClick={() => onAddSimple(product)}>{copy.addToCartLower}</button>
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

function categoryKey(category) {
  return typeof category === "string" ? category : category?.key ?? category?.slug ?? category?.filterSlug ?? category?.displayName ?? category?.name ?? "";
}

function categoryLabel(category) {
  return typeof category === "string" ? category : category?.displayName ?? category?.name ?? category?.label ?? categoryKey(category);
}

function categoryFilterSlug(category) {
  return typeof category === "string" ? category : category?.filterSlug ?? category?.slug ?? category?.sourcePath ?? categoryLabel(category);
}

function findCategoryByKey(categories, key) {
  return categories.find((category) => categoryKey(category) === key || categoryFilterSlug(category) === key || categoryLabel(category) === key) ?? null;
}

function normalizeFacetOptions(facets) {
  return {
    total: facets?.total ?? 0,
    ranges: facets?.ranges ?? {},
    brands: facets?.brands ?? [],
    subCategories: facets?.subCategories ?? [],
    colors: facets?.colors ?? [],
    semantic: facets?.semantic ?? {},
    levels: facets?.levels ?? {},
    booleans: facets?.booleans ?? {},
  };
}

function createInitialFilters(products, category, facets = null) {
  const categoryName = category ? categoryLabel(category) : "";
  const scopedProducts = categoryName ? products.filter((product) => product.category === categoryName) : products;
  const prices = scopedProducts.map((product) => product.priceNumber);
  const facetMaxPrice = Number(facets?.ranges?.price?.max);
  return {
    subCategory: "All",
    minPrice: 0,
    maxPrice: Math.ceil(Number.isFinite(facetMaxPrice) ? facetMaxPrice : Math.max(...prices, 500)),
    minRating: 0,
    color: "All",
    brand: "All",
    genderTarget: "All",
    occasion: "All",
    season: "All",
    material: "All",
    style: "All",
    sleeveLength: "All",
    warmthLevelMin: 0,
    comfortLevelMin: 0,
    durabilityLevelMin: 0,
    careEaseLevelMin: 0,
    waterproof: "All",
  };
}

function mergeProducts(currentProducts, incomingProducts) {
  const byId = new Map(currentProducts.map((product) => [product.id, product]));
  for (const product of incomingProducts) {
    byId.set(product.id, { ...(byId.get(product.id) ?? {}), ...product });
  }
  return [...byId.values()];
}

function productMatchesUiFilters(product, filters) {
  const subCategoryMatch = filters.subCategory === "All" || product.subCategory === filters.subCategory || product.subCategorySlug === filters.subCategory;
  const minPriceMatch = product.priceNumber >= Number(filters.minPrice ?? 0);
  const priceMatch = product.priceNumber <= filters.maxPrice;
  const ratingMatch = Number(product.rating ?? 0) >= filters.minRating;
  const colorMatch = filters.color === "All" || (product.colors ?? []).some((color) => filters.color === color || filters.color === getColorGroupLabel(color));
  const brandMatch = filters.brand === "All" || [product.brand, product.store].some((value) => String(value ?? "").toLowerCase() === String(filters.brand).toLowerCase());
  const semanticTextMatch = SEMANTIC_FILTER_GROUPS.every((group) => filters[group.key] === "All" || getProductSignalValues(product, group.key, 8).some((value) => String(value).toLowerCase() === String(filters[group.key]).toLowerCase()));
  const levelMatch = LEVEL_FILTER_GROUPS.every((group) => Number(filters[group.filterKey] ?? 0) <= 0 || Number(getProductSignalValue(product, group.key) ?? 0) >= Number(filters[group.filterKey]));
  const waterproofMatch = filters.waterproof === "All" || String(getProductSignalValue(product, "waterproof")).toLowerCase() === String(filters.waterproof).toLowerCase();
  return subCategoryMatch && minPriceMatch && priceMatch && ratingMatch && colorMatch && brandMatch && semanticTextMatch && levelMatch && waterproofMatch;
}

function catalogRequestFilters(filters) {
  return {
    subCategory: filters.subCategory === "All" ? "" : filters.subCategory,
    color: filters.color === "All" ? "" : filters.color,
    brand: filters.brand === "All" ? "" : filters.brand,
    priceMin: Number(filters.minPrice ?? 0) > 0 ? Number(filters.minPrice) : undefined,
    priceMax: filters.maxPrice,
    ratingMin: filters.minRating,
    genderTarget: filters.genderTarget === "All" ? "" : filters.genderTarget,
    occasion: filters.occasion === "All" ? "" : filters.occasion,
    season: filters.season === "All" ? "" : filters.season,
    material: filters.material === "All" ? "" : filters.material,
    style: filters.style === "All" ? "" : filters.style,
    sleeveLength: filters.sleeveLength === "All" ? "" : filters.sleeveLength,
    warmthLevelMin: Number(filters.warmthLevelMin ?? 0) > 0 ? Number(filters.warmthLevelMin) : undefined,
    comfortLevelMin: Number(filters.comfortLevelMin ?? 0) > 0 ? Number(filters.comfortLevelMin) : undefined,
    durabilityLevelMin: Number(filters.durabilityLevelMin ?? 0) > 0 ? Number(filters.durabilityLevelMin) : undefined,
    careEaseLevelMin: Number(filters.careEaseLevelMin ?? 0) > 0 ? Number(filters.careEaseLevelMin) : undefined,
    waterproof: filters.waterproof === "All" ? undefined : filters.waterproof,
  };
}

const DEFAULT_AI_DIMENSIONS = new Set(["price", "brand", "rating", "reviewCount", "category", "productType", "material", "fit", "season", "style", "sleeveLength", "reviewStrengths", "reviewRisks"]);
const MAX_ACTIVE_AI_DIMENSIONS = 14;
const DEFAULT_STRESS_WEIGHTS = {
  price: 0.55,
  rating: 0.5,
  reviewConfidence: 0.6,
  material: 0.45,
  comfort: 0.7,
  durability: 0.55,
  careEase: 0.45,
};
const STRESS_CONTROLS = [
  { key: "price", copyKey: "stressPrice" },
  { key: "rating", copyKey: "stressRating" },
  { key: "reviewConfidence", copyKey: "stressReviewConfidence" },
  { key: "material", copyKey: "stressMaterial" },
  { key: "comfort", copyKey: "stressComfort" },
  { key: "durability", copyKey: "stressDurability" },
  { key: "careEase", copyKey: "stressCareEase" },
];

function createEmptyAiLens(status = "idle") {
  return {
    status,
    queryId: null,
    interpretation: null,
    decomposition: null,
    parsedCriteria: [],
    clarifications: [],
    dimensions: [],
    items: [],
    actions: [],
    comparison: null,
    updating: false,
    comparisonUpdating: false,
    error: "",
    history: [],
    historyIndex: -1,
  };
}

function createAiLensSnapshot(lens, label, queryId = lens.queryId) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    queryId,
    interpretation: lens.interpretation,
    decomposition: lens.decomposition ?? null,
    parsedCriteria: lens.parsedCriteria ?? [],
    clarifications: lens.clarifications ?? [],
    dimensions: lens.dimensions ?? [],
    items: lens.items ?? [],
    actions: lens.actions ?? [],
  };
}

function applyAiLensSnapshot(current, snapshot, index) {
  return {
    ...current,
    status: "applied",
    queryId: snapshot.queryId ?? current.queryId,
    interpretation: snapshot.interpretation ?? current.interpretation,
    decomposition: snapshot.decomposition ?? current.decomposition ?? null,
    parsedCriteria: snapshot.parsedCriteria ?? [],
    clarifications: snapshot.clarifications ?? [],
    dimensions: snapshot.dimensions ?? current.dimensions,
    items: snapshot.items ?? [],
    actions: snapshot.actions ?? current.actions,
    comparison: null,
    updating: false,
    comparisonUpdating: false,
    error: "",
    historyIndex: index,
  };
}

function normalizeAiDimensions(dimensions = [], parsedCriteria = []) {
  const criteriaKeys = new Set(parsedCriteria.map((criterion) => criterion.key).filter(Boolean));
  let activeCount = 0;
  return dimensions.map((dimension) => {
    const shouldBeActive = Boolean(dimension.active) || DEFAULT_AI_DIMENSIONS.has(dimension.key) || criteriaKeys.has(dimension.key);
    const active = shouldBeActive && activeCount < MAX_ACTIVE_AI_DIMENSIONS;
    if (active) activeCount += 1;
    return { ...dimension, active };
  });
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const categories = useMemo(
    () => (catalogCategories.length ? catalogCategories : getCategories(products).map((name) => ({ key: name, displayName: name, filterSlug: name, name }))),
    [catalogCategories, products],
  );
  const [view, setView] = useState("home");
  const [listing, setListing] = useState({ category: null, query: "", mode: "regular" });
  const [listingFacets, setListingFacets] = useState(() => normalizeFacetOptions(null));
  const [listingUpdating, setListingUpdating] = useState(false);
  const [filters, setFilters] = useState(() => createInitialFilters([], ""));
  const [searchText, setSearchText] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLens, setAiLens] = useState({
    ...createEmptyAiLens(),
  });
  const [selectedComparisonIds, setSelectedComparisonIds] = useState([]);
  const [stressWeights, setStressWeights] = useState(DEFAULT_STRESS_WEIGHTS);
  const [stressTest, setStressTest] = useState({ status: "idle", result: null, error: "" });
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");
  const aiRequestVersionRef = useRef(0);
  const listingRequestVersionRef = useRef(0);
  const catalogLoadedRef = useRef(false);
  const userNavigationStartedRef = useRef(false);

  const copy = getCopy(language);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedReviews = selectedProduct ? selectedProduct.reviews ?? getProductReviews(reviews, selectedProduct.id, products) : [];
  const relatedProducts = selectedProduct ? getRelatedProducts(selectedProduct, products) : [];

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (!products.length) return;
    const productsById = new Map(products.map((product) => [product.id, product]));
    setCart((current) => {
      let changed = false;
      const next = current.map((item) => {
        const freshProduct = productsById.get(item.product?.id);
        if (!freshProduct || freshProduct === item.product) return item;
        changed = true;
        return { ...item, product: { ...item.product, ...freshProduct } };
      });
      return changed ? next : current;
    });
  }, [products]);

  useEffect(() => {
    if (!selectedProduct?.id) return;
    let cancelled = false;
    loadProductDetail(selectedProduct.id, { locale: language })
      .then((detail) => {
        if (cancelled) return;
        setSelectedProduct(detail);
        setProducts((current) => mergeProducts(current, [detail]));
      })
      .catch((error) => {
        if (!cancelled) console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [language, selectedProduct?.id]);

  useEffect(() => {
    let isMounted = true;
    const isInitialCatalogLoad = !catalogLoadedRef.current;

    setStatus("loading");
    if (isInitialCatalogLoad && !userNavigationStartedRef.current) {
      setSelectedProduct(null);
      setSelectedComparisonIds([]);
      setAiLens(createEmptyAiLens());
      setListingUpdating(false);
    }

    loadCatalog({ locale: language })
      .then((catalog) => {
        if (!isMounted) return;
        catalogLoadedRef.current = true;
        setCatalogCategories(catalog.categories);
        setProducts((current) => (isInitialCatalogLoad ? catalog.products : mergeProducts(current, catalog.products)));
        setReviews(catalog.reviews);
        setListingFacets(normalizeFacetOptions(null));
        if (isInitialCatalogLoad && !userNavigationStartedRef.current) {
          setFilters(createInitialFilters(catalog.products, catalog.products[0]?.category ?? ""));
          setView("home");
          setListing({ category: null, query: "", mode: "regular" });
          setSearchCategory("All");
        }
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
  }, [language]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const clearAiLens = useCallback(() => {
    aiRequestVersionRef.current += 1;
    setAiLens(createEmptyAiLens());
    setSelectedComparisonIds([]);
    setStressTest({ status: "idle", result: null, error: "" });
  }, []);

  const handleHome = useCallback(() => {
    userNavigationStartedRef.current = true;
    setView("home");
    setListing({ category: null, query: "", mode: "regular" });
    setSearchText("");
    setSearchCategory("All");
    setListingFacets(normalizeFacetOptions(null));
    setListingUpdating(false);
    clearAiLens();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearAiLens]);

  const handleCategorySelect = useCallback(async (category) => {
    userNavigationStartedRef.current = true;
    const selectedCategory = typeof category === "string" ? findCategoryByKey(catalogCategories, category) ?? { displayName: category, filterSlug: category, key: category } : category;
    const selectedCategoryLabel = categoryLabel(selectedCategory);
    const selectedCategorySlug = categoryFilterSlug(selectedCategory);
    setView("listing");
    setListing({ category: selectedCategoryLabel, categorySlug: selectedCategorySlug, query: "", mode: "regular", productIds: [] });
    setListingUpdating(false);
    clearAiLens();
    setStatus("loading");
    try {
      const [loadedProducts, facets] = await Promise.all([
        searchCatalogProducts({ category: selectedCategorySlug, limit: 200, locale: language }),
        loadCatalogFacets({ category: selectedCategorySlug, locale: language }),
      ]);
      const normalizedFacets = normalizeFacetOptions(facets);
      setProducts((current) => mergeProducts(current, loadedProducts));
      setListing({ category: selectedCategoryLabel, categorySlug: selectedCategorySlug, query: "", mode: "regular", productIds: loadedProducts.map((product) => product.id) });
      setListingFacets(normalizedFacets);
      setFilters(createInitialFilters(loadedProducts, selectedCategoryLabel, normalizedFacets));
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [catalogCategories, clearAiLens, language]);

  const handleNavAction = useCallback(async (action) => {
    userNavigationStartedRef.current = true;

    if (action === "departments") {
      setView("home");
      setListing({ category: null, query: "", mode: "regular" });
      setListingFacets(normalizeFacetOptions(null));
      setListingUpdating(false);
      setSearchCategory("All");
      clearAiLens();
      window.requestAnimationFrame(() => {
        document.getElementById("home-departments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (action === "aiLens") {
      setView("home");
      setListing({ category: null, query: "", mode: "regular" });
      setListingFacets(normalizeFacetOptions(null));
      setListingUpdating(false);
      setSearchCategory("All");
      if (!aiEnabled) {
        setAiEnabled(true);
        logInteraction("ai_icon_toggled", { enabled: true, mode: "ai" });
      }
      clearAiLens();
      window.requestAnimationFrame(() => {
        document.getElementById("amazon-search-input")?.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return;
    }

    const config = action === "topRated"
      ? { title: copy.navTopRatedTitle, ratingMin: 4.5 }
      : { title: copy.navDealsTitle, priceMax: 50 };
    const requestVersion = listingRequestVersionRef.current + 1;
    listingRequestVersionRef.current = requestVersion;

    clearAiLens();
    setView("listing");
    setListing({ category: null, categorySlug: "", query: "", title: config.title, mode: "regular", productIds: [] });
    setSearchText("");
    setSearchCategory("All");
    setListingUpdating(false);
    setStatus("loading");

    try {
      const [loadedProducts, facets] = await Promise.all([
        searchCatalogProducts({ priceMax: config.priceMax, ratingMin: config.ratingMin, limit: 200, locale: language }),
        loadCatalogFacets({ priceMax: config.priceMax, ratingMin: config.ratingMin, locale: language }),
      ]);
      if (listingRequestVersionRef.current !== requestVersion) return;
      const normalizedFacets = normalizeFacetOptions(facets);
      setProducts((current) => mergeProducts(current, loadedProducts));
      setListing({ category: null, categorySlug: "", query: "", title: config.title, mode: "regular", productIds: loadedProducts.map((product) => product.id) });
      setListingFacets(normalizedFacets);
      setFilters(createInitialFilters(loadedProducts, "", normalizedFacets));
      setStatus("ready");
    } catch (error) {
      if (listingRequestVersionRef.current !== requestVersion) return;
      console.error(error);
      setStatus("error");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [aiEnabled, clearAiLens, copy.navDealsTitle, copy.navTopRatedTitle, language]);

  const handleToggleAi = useCallback(() => {
    const nextEnabled = !aiEnabled;
    setAiEnabled(nextEnabled);
    logInteraction("ai_icon_toggled", { enabled: nextEnabled, mode: nextEnabled ? "ai" : "regular" });
    if (!nextEnabled) {
      clearAiLens();
    }
  }, [aiEnabled, clearAiLens]);

  const handleSearch = useCallback(
    async (event) => {
      event.preventDefault();
      userNavigationStartedRef.current = true;
      const selectedCategory = searchCategory === "All" ? null : findCategoryByKey(catalogCategories, searchCategory);
      const category = selectedCategory ? categoryLabel(selectedCategory) : null;
      const categorySlug = selectedCategory ? categoryFilterSlug(selectedCategory) : "";
      const query = searchText.trim();
      const requestLanguage = inferLanguageFromQuery(query, language);
      const shouldUseAi = aiEnabled && query.length > 0;
      setSelectedComparisonIds([]);
      logInteraction("query_submitted", { query, category, aiParsing: shouldUseAi, locale: requestLanguage });
      if (shouldUseAi) {
        const requestVersion = aiRequestVersionRef.current + 1;
        aiRequestVersionRef.current = requestVersion;
        setView("listing");
        setListing({ category, categorySlug, query, mode: "ai", productIds: undefined });
        setListingFacets(normalizeFacetOptions(null));
        setListingUpdating(false);
        setFilters(createInitialFilters(products, category));
        setAiLens(buildDraftAiLens(query, category, requestLanguage, getCopy(requestLanguage)));
        try {
          const payload = {
            query,
            demo: "amazon",
            visibleContext: {
              page: "products",
              locale: requestLanguage,
              currentFilters: category ? { category } : {},
              visibleProductIds: [],
              selectedProductIds: [],
              sort: "relevance",
            },
            session: { sessionId: "local-amazon-session", locale: requestLanguage },
          };
          const response = await runAiQuery(payload);
          if (aiRequestVersionRef.current !== requestVersion) return;
          const responseItems = response.items ?? [];
          const nextLens = {
            status: "applied",
            queryId: response.queryId,
            interpretation: response.interpretation,
            decomposition: response.decomposition ?? null,
            parsedCriteria: response.parsedCriteria ?? [],
            clarifications: response.clarifications ?? [],
            dimensions: normalizeAiDimensions(response.comparisonDimensions ?? [], response.parsedCriteria ?? []),
            items: responseItems,
            actions: response.actions ?? [],
            comparison: null,
            updating: false,
            comparisonUpdating: false,
            error: "",
            history: [],
            historyIndex: 0,
          };
          nextLens.history = [createAiLensSnapshot(nextLens, getCopy(requestLanguage).initialResults, response.queryId)];
          setAiLens(nextLens);
          setProducts((current) => mergeProducts(current, responseItems));
          setFilters(createInitialFilters(responseItems, category));
          if (requestLanguage !== language) {
            setLanguage(requestLanguage);
          }
          logInteraction("ai_lens_applied", { queryId: response.queryId, itemCount: responseItems.length });
        } catch (error) {
          setAiLens((current) => ({ ...current, status: "error", updating: false, comparisonUpdating: false, error: error instanceof Error ? error.message : copy.aiRequestFailed }));
        }
      } else {
        clearAiLens();
        setView("listing");
        setListing({ category, categorySlug, query, mode: "regular", productIds: [] });
        setListingUpdating(false);
        setStatus("loading");
        try {
          const [loadedProducts, facets] = await Promise.all([
            searchCatalogProducts({ query, category: categorySlug, limit: 200, locale: requestLanguage }),
            loadCatalogFacets({ query, category: categorySlug, locale: requestLanguage }),
          ]);
          const normalizedFacets = normalizeFacetOptions(facets);
          setProducts((current) => mergeProducts(current, loadedProducts));
          setListing({ category, categorySlug, query, mode: "regular", productIds: loadedProducts.map((product) => product.id) });
          setListingFacets(normalizedFacets);
          setFilters(createInitialFilters(loadedProducts, category, normalizedFacets));
          if (query && requestLanguage !== language) {
            setLanguage(requestLanguage);
          }
          setStatus("ready");
        } catch (error) {
          console.error(error);
          setStatus("error");
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [aiEnabled, catalogCategories, clearAiLens, copy.aiRequestFailed, language, products, searchCategory, searchText],
  );

  const handleFilterChange = useCallback((type, value) => {
    const nextFilters = { ...filters, [type]: value };
    setFilters(nextFilters);
    if (listing.mode !== "regular") {
      return;
    }

    const requestVersion = listingRequestVersionRef.current + 1;
    listingRequestVersionRef.current = requestVersion;
    const requestFilters = catalogRequestFilters(nextFilters);
    setListingUpdating(true);
    Promise.all([
      searchCatalogProducts({
        query: listing.query,
        category: listing.categorySlug,
        ...requestFilters,
        limit: 200,
        locale: language,
      }),
      loadCatalogFacets({
        query: listing.query,
        category: listing.categorySlug,
        ...requestFilters,
        locale: language,
      }),
    ])
      .then(([loadedProducts, facets]) => {
        if (listingRequestVersionRef.current !== requestVersion) return;
        const normalizedFacets = normalizeFacetOptions(facets);
        setProducts((current) => mergeProducts(current, loadedProducts));
        setListing((current) => ({ ...current, productIds: loadedProducts.map((product) => product.id) }));
        setListingFacets(normalizedFacets);
        setListingUpdating(false);
      })
      .catch((error) => {
        if (listingRequestVersionRef.current !== requestVersion) return;
        console.error(error);
        setListingUpdating(false);
        showToast(copy.filterUpdateFailed);
      });
  }, [copy.filterUpdateFailed, filters, language, listing.categorySlug, listing.mode, listing.query, showToast]);

  const handleOpenProduct = useCallback(async (product) => {
    setSelectedProduct(product);
    try {
      const detail = await loadProductDetail(product.id, { locale: language });
      setSelectedProduct(detail);
      setProducts((current) => current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)));
    } catch (error) {
      console.error(error);
      showToast(copy.detailLoadError);
    }
  }, [copy.detailLoadError, language, showToast]);

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
      showToast(copy.addedToCart);
    },
    [copy.addedToCart, showToast],
  );

  const handleQuantityChange = useCallback((key, quantity) => {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity } : item)));
  }, []);

  const handleRemove = useCallback((key) => {
    setCart((current) => current.filter((item) => item.key !== key));
  }, []);

  const handleToggleDimension = useCallback((dimensionKeyOrKeys) => {
    const dimensionKeys = Array.isArray(dimensionKeyOrKeys) ? dimensionKeyOrKeys : [dimensionKeyOrKeys];
    setAiLens((current) => {
      const keySet = new Set(dimensionKeys);
      const currentlyActive = current.dimensions.some((dimension) => keySet.has(dimension.key) && dimension.active);
      return {
        ...current,
        dimensions: current.dimensions.map((dimension) => (keySet.has(dimension.key) ? { ...dimension, active: !currentlyActive } : dimension)),
      };
    });
    logInteraction("dimension_toggled", { dimensionKeys });
  }, []);

  const handleStressWeightChange = useCallback((key, value) => {
    setStressWeights((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }, []);

  const handleToggleCompareProduct = useCallback((product) => {
    setSelectedComparisonIds((current) => {
      if (current.includes(product.id)) {
        return current.filter((id) => id !== product.id);
      }
      return [...current, product.id].slice(0, 4);
    });
    logInteraction("product_selected", { productId: product.id });
  }, []);

  const handleClarifyCriteria = useCallback(async (clarification, option) => {
    if (!aiLens.queryId || !listing.query) return;
    const key = clarification?.key;
    const value = option?.value;
    const criteriaOverrides = Array.isArray(option?.criteriaOverrides) && option.criteriaOverrides.length
      ? option.criteriaOverrides
      : [{ key, value }];
    const requestVersion = aiRequestVersionRef.current + 1;
    aiRequestVersionRef.current = requestVersion;
    setAiLens((current) => ({ ...current, updating: true, comparison: null, error: "" }));
    logInteraction("criteria_clarified", { queryId: aiLens.queryId, key, value, criteriaOverrides });
    try {
      const response = await runAiQuery({
        queryId: aiLens.queryId,
        query: listing.query,
        criteriaOverrides,
        visibleContext: { page: "products", locale: language, selectedProductIds: selectedComparisonIds, sort: "relevance" },
        session: { sessionId: "local-amazon-session", locale: language },
      });
      if (aiRequestVersionRef.current !== requestVersion) return;
      setAiLens((current) => ({
        ...(() => {
          const currentHistory = current.history?.length
            ? current.history.slice(0, (current.historyIndex ?? current.history.length - 1) + 1)
            : [createAiLensSnapshot(current, copy.initialResults, aiLens.queryId)];
          const nextLens = {
            ...current,
            status: "applied",
            queryId: response.queryId,
            interpretation: response.interpretation,
            decomposition: response.decomposition ?? current.decomposition ?? null,
            parsedCriteria: response.parsedCriteria ?? current.parsedCriteria,
            clarifications: response.clarifications ?? current.clarifications,
            dimensions: normalizeAiDimensions(response.comparisonDimensions ?? current.dimensions, response.parsedCriteria ?? current.parsedCriteria),
            items: response.items ?? current.items,
            actions: response.actions ?? current.actions,
            comparison: null,
            updating: false,
            error: "",
          };
          const label = `${localizeDimensionLabel({ key, label: clarification?.label }, language)}: ${localizeCriterionValue(option?.label ?? value, language, copy)}`;
          const history = [...currentHistory, createAiLensSnapshot(nextLens, label, response.queryId)];
          return {
            ...nextLens,
            history,
            historyIndex: history.length - 1,
          };
        })(),
      }));
      showToast(copy.criteriaUpdated);
    } catch (error) {
      setAiLens((current) => ({ ...current, updating: false, error: error instanceof Error ? error.message : copy.refineRequestFailed }));
    }
  }, [aiLens.queryId, copy, copy.criteriaUpdated, copy.refineRequestFailed, language, listing.query, selectedComparisonIds, showToast]);

  const handleRestoreCriteriaHistory = useCallback((targetIndex) => {
    const snapshot = (aiLens.history ?? [])[targetIndex];
    if (!snapshot) return;
    const nextIds = new Set((snapshot.items ?? []).map((item) => item.id));
    setAiLens((current) => applyAiLensSnapshot(current, snapshot, targetIndex));
    setSelectedComparisonIds((ids) => ids.filter((id) => nextIds.has(id)));
    logInteraction("criteria_history_restored", { queryId: snapshot.queryId ?? aiLens.queryId, targetIndex, label: snapshot.label });
  }, [aiLens.history, aiLens.queryId]);

  const handleRefine = useCallback(async (command) => {
    if (!aiLens.queryId || !command) return;
    const requestVersion = aiRequestVersionRef.current + 1;
    aiRequestVersionRef.current = requestVersion;
    setAiLens((current) => ({ ...current, updating: true, error: "" }));
    logInteraction("refine_command", { queryId: aiLens.queryId, command });
    try {
      const activeDimensions = aiLens.dimensions.filter((dimension) => dimension.active).map((dimension) => dimension.key);
      const response = await refineAiQuery({
        queryId: aiLens.queryId,
        command,
        currentSelectedProductIds: selectedComparisonIds,
        activeDimensions,
        locale: language,
      });
      if (aiRequestVersionRef.current !== requestVersion) return;
      setAiLens((current) => ({
        ...current,
        status: "applied",
        items: response.items ?? current.items,
        decomposition: response.decomposition ?? current.decomposition ?? null,
        parsedCriteria: response.parsedCriteria ?? current.parsedCriteria,
        clarifications: response.clarifications ?? current.clarifications,
        dimensions: normalizeAiDimensions(response.comparisonDimensions ?? current.dimensions, response.parsedCriteria ?? current.parsedCriteria),
        actions: response.actions ?? current.actions,
        comparison: null,
        updating: false,
        error: "",
      }));
      setSelectedComparisonIds((current) => current.filter((id) => (response.items ?? []).some((item) => item.id === id)));
      logInteraction("selection_replaced", { queryId: aiLens.queryId, command, addedItems: response.addedItems, removedItems: response.removedItems });
    } catch (error) {
      setAiLens((current) => ({ ...current, updating: false, error: error instanceof Error ? error.message : copy.refineRequestFailed }));
    }
  }, [aiLens.dimensions, aiLens.queryId, copy.refineRequestFailed, language, selectedComparisonIds]);

  useEffect(() => {
    if (aiLens.status !== "applied" || !aiLens.queryId) {
      setStressTest((current) => (current.status === "idle" && !current.result ? current : { status: "idle", result: null, error: "" }));
      return undefined;
    }
    const productIds = selectedComparisonIds.length >= 2
      ? selectedComparisonIds.slice(0, 4)
      : aiLens.items.slice(0, 4).map((product) => product.id).filter(Boolean);
    if (productIds.length < 2) {
      setStressTest((current) => (current.status === "idle" && !current.result ? current : { status: "idle", result: null, error: "" }));
      return undefined;
    }

    let cancelled = false;
    setStressTest((current) => ({ status: "loading", result: current.result, error: "" }));
    loadAiStressTest({
      queryId: aiLens.queryId,
      selectedProductIds: productIds,
      weights: stressWeights,
      locale: language,
    })
      .then((response) => {
        if (cancelled) return;
        setStressTest({ status: "ready", result: response.stressTest ?? null, error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        setStressTest({ status: "error", result: null, error: error instanceof Error ? error.message : copy.aiRequestFailed });
      });

    return () => {
      cancelled = true;
    };
  }, [aiLens.items, aiLens.queryId, aiLens.status, copy.aiRequestFailed, language, selectedComparisonIds, stressWeights]);

  useEffect(() => {
    if (aiLens.status !== "applied" || !aiLens.queryId || selectedComparisonIds.length < 2) {
      setAiLens((current) => (current.comparison || current.comparisonUpdating ? { ...current, comparison: null, comparisonUpdating: false } : current));
      return undefined;
    }

    let cancelled = false;
    setAiLens((current) => ({ ...current, comparisonUpdating: true }));
    const activeDimensions = aiLens.dimensions.filter((dimension) => dimension.active).map((dimension) => dimension.key);
    compareAiProducts({ queryId: aiLens.queryId, selectedProductIds: selectedComparisonIds, activeDimensions, locale: language })
      .then((response) => {
        if (cancelled) return;
        setAiLens((current) => ({ ...current, comparison: response.comparison, comparisonUpdating: false }));
        logInteraction("comparison_opened", { queryId: aiLens.queryId, selectedProductIds: selectedComparisonIds });
      })
      .catch((error) => {
        if (cancelled) return;
        setAiLens((current) => ({ ...current, comparisonUpdating: false }));
        showToast(error instanceof Error ? error.message : copy.compareLoadError);
      });

    return () => {
      cancelled = true;
    };
  }, [aiLens.dimensions, aiLens.queryId, aiLens.status, copy.compareLoadError, language, selectedComparisonIds, showToast]);

  return (
    <div className="min-h-screen bg-[#e3e6e6] font-sans text-[#0f1111]" lang={language}>
      <Header
        categories={categories}
        searchText={searchText}
        searchCategory={searchCategory}
        cartCount={cartCount}
        language={language}
        copy={copy}
        aiEnabled={aiEnabled}
        aiStatus={aiLens.status}
        onLanguageChange={setLanguage}
        onToggleAi={handleToggleAi}
        onSearchTextChange={setSearchText}
        onSearchCategoryChange={setSearchCategory}
        onSearch={handleSearch}
        onHome={handleHome}
        onNavAction={handleNavAction}
        onCategorySelect={handleCategorySelect}
        onCart={() => setView("cart")}
      />

      {status === "loading" ? <main className="p-8 text-sm text-[#565959]">{language === "ko" ? "불러오는 중..." : "Loading..."}</main> : null}
      {status === "error" ? <main className="p-8 text-sm text-[#b12704]">{language === "ko" ? "데이터를 불러올 수 없습니다." : "Could not load data."}</main> : null}
      {status === "ready" && view === "home" ? <Home categories={categories} products={products} language={language} copy={copy} onCategorySelect={handleCategorySelect} onOpenProduct={handleOpenProduct} /> : null}
      {status === "ready" && view === "listing" ? (
        <ProductListing
          listing={listing}
          products={products}
          filters={filters}
          facets={listingFacets}
          cart={cart}
          aiLens={aiLens}
          isUpdating={listingUpdating}
          stressWeights={stressWeights}
          stressResult={stressTest.result}
          stressUpdating={stressTest.status === "loading"}
          selectedComparisonIds={selectedComparisonIds}
          language={language}
          copy={copy}
          onFilterChange={handleFilterChange}
          onOpenProduct={handleOpenProduct}
          onCart={() => setView("cart")}
          onToggleDimension={handleToggleDimension}
          onStressWeightChange={handleStressWeightChange}
          onClarifyCriteria={handleClarifyCriteria}
          onRestoreCriteriaHistory={handleRestoreCriteriaHistory}
          onToggleCompareProduct={handleToggleCompareProduct}
          onRefine={handleRefine}
        />
      ) : null}
      {status === "ready" && view === "cart" ? (
        <CartPage
          cart={cart}
          products={products}
          language={language}
          copy={copy}
          onHome={handleHome}
          onOpenProduct={handleOpenProduct}
          onAddSimple={(product) => handleAddToCart(product)}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
        />
      ) : null}

      {selectedProduct ? (
        <DetailModal product={selectedProduct} reviews={selectedReviews} relatedProducts={relatedProducts} language={language} copy={copy} onClose={handleCloseProduct} onAddToCart={handleAddToCart} onOpenProduct={handleOpenProduct} />
      ) : null}
      <Toast message={toast} />
    </div>
  );
}
