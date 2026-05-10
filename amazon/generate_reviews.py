import json
import random
import time
import os
from datetime import datetime, timedelta
import google.generativeai as genai
from google.api_core import exceptions

GENAI_API_KEY = ""
genai.configure(api_key=GENAI_API_KEY)

print("사용 가능한 모델 확인 중...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"발견된 모델: {m.name}")

model = genai.GenerativeModel('models/gemini-2.5-flash')

def get_random_date():
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    random_date = start_date + timedelta(days=random.randint(0, 730))
    return random_date.strftime("%Y-%m-%d")

def generate_ai_reviews():
    base_path = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_path, 'products.json')
    output_path = os.path.join(base_path, 'review.json')

    all_reviews = []
    done_product_ids = set()

    if os.path.exists(output_path):
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                all_reviews = json.load(f)
                done_product_ids = set(rev['productId'] for rev in all_reviews)
                print(f"    기존 리뷰 {len(all_reviews)}개를 로드했습니다. 이어서 생성합니다.")
        except Exception as e:
            print(f"    기존 리뷰 파일을 읽는 중 오류 발생 (새로 시작합니다): {e}")

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except Exception as e:
        print(f"    파일 로드 실패: {e}")
        return

    all_reviews = []
    review_id_counter = max([rev['id'] for rev in all_reviews], default=0) + 1

    for product in products:
        if product['id'] in done_product_ids:
            print(f"⏩ '{product['name']}'는 이미 리뷰가 있어 건너뜁니다.")
            continue

        print(f"🚀 리뷰 생성 중: {product['name']}...")
        
        prompt = f"""
        상품명 '{product['name']}'에 대한 사실적인 한국어 구매 리뷰 3개를 작성해.
        형식은 반드시 JSON 배열이어야 해. 다른 말은 절대 하지마.
        [
          {{"userName": "사용자명", "rating": 5, "title": "제목", "comment": "내용"}},
          ...
        ]
        """

        time.sleep(20)

        success = False
        retries = 0
        while not success and retries < 3:
            try:
                response = model.generate_content(prompt)
                clean_text = response.text.replace('```json', '').replace('```', '').strip()
                reviews_data = json.loads(clean_text)

                for rd in reviews_data:
                    all_reviews.append({
                        "id": review_id_counter,
                        "productId": product['id'],
                        "userName": rd.get('userName', '익명 구매자'),
                        "rating": rd.get('rating', 5),
                        "date": get_random_date(),
                        "title": rd.get('title', '만족스러운 구매'),
                        "comment": rd.get('comment', '잘 사용하고 있습니다.'),
                        "isVerified": random.choice([True, True, False])
                    })
                    review_id_counter += 1
                
                print(f"   ㄴ 완료! (현재까지 {review_id_counter-1}개 생성됨)")
                success = True
                

            except exceptions.ResourceExhausted as e:
                retries += 1
                wait_time = 10 * retries
                print(f"    할당량 초과! {wait_time}초 후 재시도합니다... ({retries}/3)")
                time.sleep(wait_time)
            except Exception as e:
                print(f"   오류 발생: {e}")
                break

    output_path = os.path.join(base_path, 'review.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_reviews, f, ensure_ascii=False, indent=2)

    print(f"\n모든 작업 완료! 총 {len(all_reviews)}개의 리뷰가 저장되었습니다.")

if __name__ == "__main__":
    generate_ai_reviews()