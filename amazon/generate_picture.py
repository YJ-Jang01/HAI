import json
import os

def update_product_images():
    base_path = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_path, 'products.json')

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except FileNotFoundError:
        print("products.json 파일을 찾을 수 없습니다.")
        return

    print(f"총 {len(products)}개의 상품 이미지 업데이트를 시작합니다...")

    for p in products:
        keyword = p['keyword']
        category = p['category']

        # 새로운 Unsplash URL 방식 (https://images.unsplash.com/photo-...)
        # 소스 이미지 서비스 대신 검색 키워드 기반의 고정 파라미터를 사용합니다.
        
        # 1. 메인 이미지
        p['img'] = f"https://source.unsplash.com/600x600/?{keyword.replace(' ', '')}"
        # 만약 위 URL도 안 된다면 아래의 더 안정적인 방식을 권장합니다:
        p['img'] = f"https://loremflickr.com/600/600/{keyword.replace(' ', '')}"


        # 2. 상세 이미지
        p['descImages'] = [
            f"https://loremflickr.com/600/800/{keyword.replace(' ', '')},feature",
            f"https://loremflickr.com/600/800/{keyword.replace(' ', '')},detail",
        ]

        # 3. 브랜드 이미지
        p['brandImages'] = [
            f"https://loremflickr.com/1200/400/{keyword.replace(' ', '')},feature",
            f"https://loremflickr.com/1200/400/{keyword.replace(' ', '')},detail",
        ]

    # 업데이트된 내용 저장
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    
    print("이미지 업데이트 완료!")

if __name__ == "__main__":
    update_product_images()