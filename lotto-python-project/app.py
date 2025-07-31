# app.py (로또 번호 API 서버) - 확률 기반 추천 로직 & CORS 임시 해결 & NameError 수정 버전 (최종!)

from flask import Flask, jsonify
from flask_cors import CORS # CORS 라이브러리
import requests
from bs4 import BeautifulSoup
import time
import random
import math 

app = Flask(__name__)

# ✨✨ CORS 설정: 모든 출처(*)에서 오는 요청 허용 (임시, 배포 시 보안 취약) ✨✨
# 이 설정으로 CORS 에러가 해결되는지 먼저 확인하세요.
# 이후에는 'origins'를 "https://ruseper.github.io" 등으로 정확히 명시하는 것이 보안에 좋습니다.
CORS(app, resources={r"/api/*": {"origins": "*"}})


# --- 데이터 크롤링 및 로드 함수들 ---

def get_latest_drw_no():
    """
    동행복권 웹사이트에서 현재 가장 최신 로또 회차 번호를 가져옵니다.
    """
    url = "https://www.dhlottery.co.kr/common.do?method=main"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        latest_drw_no_tag = soup.find(id="lottoDrwNo")
        if latest_drw_no_tag:
            return int(latest_drw_no_tag.text)
        else:
            return None
    except requests.exceptions.RequestException:
        return None

def get_lotto_details(drw_no):
    """
    특정 회차(drw_no)의 로또 당첨 번호 및 보너스 번호, 추첨일을 JSON API를 통해 가져옵니다.
    """
    api_url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={drw_no}"
    try:
        response = requests.get(api_url, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('returnValue') == 'fail':
            return None

        winning_numbers = [data[f"drwtNo{i}"] for i in range(1, 7)]
        bonus_number = data['bnusNo']
        draw_date = data['drwNoDate']

        return {
            "drwNo": drw_no,
            "drwNoDate": draw_date,
            "winningNumbers": sorted(winning_numbers),
            "bonusNumber": bonus_number
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None

# ✨✨ get_cached_lotto_history 함수보다 먼저 정의되어야 함! (NameError 해결) ✨✨
def get_lotto_history(num_draws_to_fetch=100):
    """
    최신 회차부터 지정된 개수만큼의 과거 로또 당첨 내역을 가져옵니다.
    """
    latest_drw_no = get_latest_drw_no()
    if not latest_drw_no:
        print("❌ 최신 회차 정보를 가져올 수 없어 로또 내역을 불러올 수 없습니다.")
        return []

    lotto_history = []
    # 충분히 많은 회차를 요청해서 원하는 개수를 확보하도록 (실패하는 회차 대비)
    for drw_no in range(latest_drw_no, max(0, latest_drw_no - num_draws_to_fetch - 10), -1): 
        time.sleep(0.05) # 서버에 부담을 주지 않기 위해 대기 시간 (0.05초)
        
        details = get_lotto_details(drw_no)
        if details:
            lotto_history.append(details)
        else:
            # 일정 회차 이상 데이터가 비면 중단 (더 이상 유효한 회차가 없을 수 있음)
            if len(lotto_history) > 5 and (latest_drw_no - drw_no) > num_draws_to_fetch + 20: 
                print(f"⚠️ {drw_no}회차 이하 데이터 불확실. 과거 데이터 수집 중단.")
                break
    
    # 원하는 개수만큼만 슬라이싱하여 반환
    lotto_history = lotto_history[:num_draws_to_fetch]

    print(f"✅ {len(lotto_history)}개의 과거 로또 당첨 내역을 성공적으로 가져왔습니다.")
    return lotto_history


# --- 확률 기반 추천 로직 핵심 함수들 ---

# 캐시 변수 (과거 데이터는 자주 바뀌지 않으니 저장해두고 재사용)
CACHED_HISTORY = []
LAST_FETCH_TIME = 0
CACHE_EXPIRATION = 3600 # 1시간 (초 단위)

def get_cached_lotto_history(num_draws_to_fetch=200):
    global CACHED_HISTORY, LAST_FETCH_TIME
    if not CACHED_HISTORY or (time.time() - LAST_FETCH_TIME) > CACHE_EXPIRATION:
        print("🔍 과거 로또 데이터 캐시 업데이트 중...")
        CACHED_HISTORY = get_lotto_history(num_draws_to_fetch) # get_lotto_history 호출
        LAST_FETCH_TIME = time.time()
    else:
        print("✅ 과거 로또 데이터 캐시 사용 중...")
    return CACHED_HISTORY

def analyze_lotto_data(past_data):
    """
    과거 로또 당첨 데이터를 분석하여 통계적 패턴을 추출합니다.
    """
    if not past_data:
        print("⚠️ 분석할 과거 데이터가 없습니다.")
        return None

    # 1. 번호별 출현 빈도
    number_counts = {i: 0 for i in range(1, 46)}
    for draw in past_data:
        for num in draw.get('winningNumbers', []): # winningNumbers 키 없을 경우 [] 반환
            number_counts[num] += 1
    
    # 2. 합계 통계 (로또 6개 번호의 합)
    sums = [sum(draw['winningNumbers']) for draw in past_data if 'winningNumbers' in draw and draw['winningNumbers'] is not None and len(draw['winningNumbers']) == 6]
    if not sums:
        print("⚠️ 유효한 당첨 번호 합계 데이터를 찾을 수 없습니다.")
        # 이 경우 합계 범위를 넓게 설정하여 기본값 반환
        return {
            "number_counts": number_counts,
            "sum_range": {"avg": 0, "min": 0, "max": 0, "25th": 90, "75th": 160}, # 합계 범위 기본값
            "most_common_odd_even": (3,3),
            "most_common_high_low": (3,3)
        }
    
    avg_sum = sum(sums) / len(sums)
    sum_min = min(sums)
    sum_max = max(sums)
    
    # 사분위수 계산을 위해 정렬
    sorted_sums = sorted(sums)
    sum_25th = sorted_sums[int(len(sums) * 0.25)] if len(sums) > 0 else 0
    sum_75th = sorted_sums[int(len(sums) * 0.75)] if len(sums) > 0 else 0

    # 3. 홀수/짝수 및 낮은 번호/높은 번호 비율
    odd_even_ratios = {} # (홀수개수, 짝수개수) -> 빈도
    high_low_ratios = {} # (낮은번호개수, 높은번호개수) -> 빈도 (낮은번호 1-22, 높은번호 23-45)
    
    for draw in past_data:
        if 'winningNumbers' in draw and draw['winningNumbers'] is not None and len(draw['winningNumbers']) == 6:
            odd_count = sum(1 for n in draw['winningNumbers'] if n % 2 != 0)
            even_count = 6 - odd_count
            low_count = sum(1 for n in draw['winningNumbers'] if n <= 22)
            high_count = 6 - low_count
            
            odd_even_ratios[(odd_count, even_count)] = odd_even_ratios.get((odd_count, even_count), 0) + 1
            high_low_ratios[(low_count, high_count)] = high_low_ratios.get((low_count, high_count), 0) + 1

    most_common_odd_even = max(odd_even_ratios, key=odd_even_ratios.get) if odd_even_ratios else (3,3) # 기본값 (3홀 3짝)
    most_common_high_low = max(high_low_ratios, key=high_low_ratios.get) if high_low_ratios else (3,3) # 기본값 (3낮 3높)
    
    return {
        "number_counts": number_counts,
        "sum_range": {"avg": avg_sum, "min": sum_min, "max": sum_max, "25th": sum_25th, "75th": sum_75th},
        "most_common_odd_even": most_common_odd_even,
        "most_common_high_low": most_common_high_low
    }

def is_good_combination(numbers, analysis_data):
    """
    생성된 6개 번호 조합이 과거 당첨 패턴과 유사한지 평가합니다.
    """
    if not analysis_data or 'sum_range' not in analysis_data or 'most_common_odd_even' not in analysis_data or 'most_common_high_low' not in analysis_data:
        # 분석 데이터가 없거나 불완전하면 무조건 True (pass)
        # 이 경우는 generate_recommended_lotto_numbers에서 무작위 반환될 것
        return True 

    # 1. 합계 확인
    current_sum = sum(numbers)
    sum_25th = analysis_data['sum_range'].get('25th')
    sum_75th = analysis_data['sum_range'].get('75th')

    # 합계 범위가 유효할 때만 적용
    if sum_25th is not None and sum_75th is not None and sum_25th <= sum_75th: 
        if not (sum_25th <= current_sum <= sum_75th):
            return False 

    # 2. 홀수/짝수 비율 확인
    odd_count = sum(1 for n in numbers if n % 2 != 0)
    even_count = 6 - odd_count
    most_common_odd_even = analysis_data['most_common_odd_even']
    if most_common_odd_even: 
        if not (abs(odd_count - most_common_odd_even[0]) <= 1 and \
                abs(even_count - most_common_odd_even[1]) <= 1):
            return False

    # 3. 낮은 번호(1-22)/높은 번호(23-45) 비율 확인
    low_count = sum(1 for n in numbers if n <= 22)
    high_count = 6 - low_count
    most_common_high_low = analysis_data['most_common_high_low']
    if most_common_high_low: 
        if not (abs(low_count - most_common_high_low[0]) <= 1 and \
                abs(high_count - most_common_high_low[1]) <= 1):
            return False
            
    return True # 모든 조건을 만족하면 좋은 조합!


# --- 메인 추천 함수들 ---

def generate_recommended_lotto_numbers():
    """
    과거 데이터를 분석하여 확률 기반 로또 번호를 추천합니다.
    """
    past_lotto_data = get_cached_lotto_history(num_draws_to_fetch=200) # 200회차 데이터 사용

    if not past_lotto_data:
        print("❌ 과거 로또 데이터를 가져올 수 없습니다. 완전 무작위 번호를 반환합니다.")
        return sorted(random.sample(range(1, 46), 6))

    analysis_data = analyze_lotto_data(past_lotto_data)
    if not analysis_data or 'sum_range' not in analysis_data: # sum_range가 없으면 분석 실패
        print("❌ 로또 데이터 분석에 실패했습니다. 완전 무작위 번호를 반환합니다.")
        return sorted(random.sample(range(1, 46), 6))
        
    recommended_numbers = []
    attempts = 0
    max_attempts = 1000 # 최대 1000번 시도

    # ✨ 번호 추천 전략 ✨
    # 1. 자주 나온 번호 리스트 (예: 빈도 상위 10개)
    sorted_freq_nums = sorted(analysis_data['number_counts'].items(), key=lambda item: item[1], reverse=True)
    hot_numbers = [num for num, count in sorted_freq_nums[:10]]
    
    # 2. 덜 나온 번호 리스트 (예: 빈도 하위 10개)
    cold_numbers = [num for num, count in sorted_freq_nums[-10:]]
    
    # 디버깅용 로그
    print(f"✨ 추천 분석 기준: 합계 범위({analysis_data['sum_range'].get('25th')}~{analysis_data['sum_range'].get('75th')}), 홀짝 {analysis_data['most_common_odd_even']}, 높낮이 {analysis_data['most_common_high_low']}")


    while attempts < max_attempts:
        candidate_set = set()
        
        # 2. 빈도 높은 번호에서 몇 개 선택 (예: 2-3개)
        num_hot = random.randint(2,3)
        candidate_set.update(random.sample(hot_numbers, min(num_hot, len(hot_numbers))))

        # 3. 빈도 낮은 번호에서 몇 개 선택 (예: 1개)
        num_cold = 1
        available_cold_numbers = list(set(cold_numbers) - candidate_set)
        if available_cold_numbers:
            candidate_set.update(random.sample(available_cold_numbers, min(num_cold, len(available_cold_numbers))))
        else: # cold_numbers가 부족하면 1-45 범위에서 랜덤하게 채움
            candidate_set.update(random.sample(list(set(range(1,46)) - candidate_set), min(num_cold, 6-len(candidate_set))))

        # 4. 나머지 번호는 1-45 범위에서 무작위로 채움
        while len(candidate_set) < 6:
            candidate_set.add(random.randint(1, 45))
        
        current_combination = sorted(list(candidate_set))

        # 5. 생성된 조합이 조건에 맞는지 평가
        if is_good_combination(current_combination, analysis_data):
            recommended_numbers = current_combination
            print(f"✅ 조건에 맞는 로또 번호 조합 발견 (시도 횟수: {attempts + 1})")
            break
        attempts += 1

    if not recommended_numbers:
        print(f"⚠️ {max_attempts}번 시도 후에도 적합한 조합을 찾지 못했습니다. 무작위 번호를 반환합니다.")
        return sorted(random.sample(range(1, 46), 6))
        
    return recommended_numbers

def generate_recommended_pension_numbers():
    """
    연금복권 번호를 무작위로 생성합니다 (1조 ~ 5조, 6자리 숫자).
    """
    group = random.randint(1, 5) 
    serial = str(random.randint(0, 999999)).zfill(6) 
    return f"{group}조 {serial}"


# --- Flask 웹 API 라우트 정의 ---

@app.route('/api/generate-lotto', methods=['GET'])
def api_generate_lotto():
    recommended_numbers = generate_recommended_lotto_numbers()
    if recommended_numbers:
        return jsonify({"success": True, "numbers": recommended_numbers, "message": "로또 추천 번호를 생성했습니다."})
    else:
        return jsonify({"success": False, "message": "로또 번호 생성에 실패했습니다. 잠시 후 다시 시도해주세요."}), 500

@app.route('/api/generate-pension', methods=['GET'])
def api_generate_pension():
    recommended_numbers = generate_recommended_pension_numbers()
    return jsonify({"success": True, "numbers": [recommended_numbers], "message": "연금복권 번호를 생성했습니다."})

# --- Flask 앱 실행 부분 ---

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)