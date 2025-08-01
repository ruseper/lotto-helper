from flask import Flask, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import time
import random

app = Flask(__name__)

# 모든 /api/* 경로에 대해 프론트엔드 도메인만 허용 (배포 시 권장)
# CORS(app, resources={r"/api/*": {"origins": "*"}})
CORS(app)  # 모든 출처에 대해 전역 허용 (개발 중일 때만 사용)

# 개발/테스트 시 임시로 모든 출처 허용하려면 아래처럼 설정 가능
# CORS(app, resources={r"/api/*": {"origins": "*"}}
# --- 데이터 크롤링 및 로드 함수들 ---

def get_latest_drw_no():
    url = "https://www.dhlottery.co.kr/common.do?method=main"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        latest_drw_no_tag = soup.find(id="lottoDrwNo")
        if latest_drw_no_tag:
            return int(latest_drw_no_tag.text)
        return None
    except requests.exceptions.RequestException:
        return None

def get_lotto_details(drw_no):
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

def get_lotto_history(num_draws_to_fetch=100):
    latest_drw_no = get_latest_drw_no()
    if not latest_drw_no:
        print("최신 회차 정보를 가져올 수 없습니다.")
        return []
    lotto_history = []
    for drw_no in range(latest_drw_no, max(0, latest_drw_no - num_draws_to_fetch - 10), -1):
        time.sleep(0.05)
        details = get_lotto_details(drw_no)
        if details:
            lotto_history.append(details)
        else:
            if len(lotto_history) > 5 and (latest_drw_no - drw_no) > num_draws_to_fetch + 20:
                break
    return lotto_history[:num_draws_to_fetch]

# 캐시 변수
CACHED_HISTORY = []
LAST_FETCH_TIME = 0
CACHE_EXPIRATION = 3600  # 1시간

def get_cached_lotto_history(num_draws_to_fetch=200):
    global CACHED_HISTORY, LAST_FETCH_TIME
    if not CACHED_HISTORY or (time.time() - LAST_FETCH_TIME) > CACHE_EXPIRATION:
        CACHED_HISTORY = get_lotto_history(num_draws_to_fetch)
        LAST_FETCH_TIME = time.time()
    return CACHED_HISTORY

def analyze_lotto_data(past_data):
    if not past_data:
        return None
    number_counts = {i: 0 for i in range(1, 46)}
    for draw in past_data:
        for num in draw.get('winningNumbers', []):
            number_counts[num] += 1
    sums = [sum(draw['winningNumbers']) for draw in past_data if 'winningNumbers' in draw and draw['winningNumbers'] and len(draw['winningNumbers']) == 6]
    if not sums:
        return {
            "number_counts": number_counts,
            "sum_range": {"25th": 90, "75th": 160},
            "most_common_odd_even": (3, 3),
            "most_common_high_low": (3, 3)
        }
    sorted_sums = sorted(sums)
    sum_25th = sorted_sums[int(len(sums) * 0.25)]
    sum_75th = sorted_sums[int(len(sums) * 0.75)]
    odd_even_ratios = {}
    high_low_ratios = {}
    for draw in past_data:
        if 'winningNumbers' in draw and draw['winningNumbers'] and len(draw['winningNumbers']) == 6:
            odd_count = sum(1 for n in draw['winningNumbers'] if n % 2 != 0)
            even_count = 6 - odd_count
            low_count = sum(1 for n in draw['winningNumbers'] if n <= 22)
            high_count = 6 - low_count
            odd_even_ratios[(odd_count, even_count)] = odd_even_ratios.get((odd_count, even_count), 0) + 1
            high_low_ratios[(low_count, high_count)] = high_low_ratios.get((low_count, high_count), 0) + 1
    most_common_odd_even = max(odd_even_ratios, key=odd_even_ratios.get)
    most_common_high_low = max(high_low_ratios, key=high_low_ratios.get)
    return {
        "number_counts": number_counts,
        "sum_range": {"25th": sum_25th, "75th": sum_75th},
        "most_common_odd_even": most_common_odd_even,
        "most_common_high_low": most_common_high_low
    }

def is_good_combination(numbers, analysis_data):
    if not analysis_data:
        return True
    current_sum = sum(numbers)
    if not (analysis_data['sum_range']['25th'] <= current_sum <= analysis_data['sum_range']['75th']):
        return False
    odd_count = sum(1 for n in numbers if n % 2 != 0)
    even_count = 6 - odd_count
    if not (abs(odd_count - analysis_data['most_common_odd_even'][0]) <= 1 and abs(even_count - analysis_data['most_common_odd_even'][1]) <= 1):
        return False
    low_count = sum(1 for n in numbers if n <= 22)
    high_count = 6 - low_count
    if not (abs(low_count - analysis_data['most_common_high_low'][0]) <= 1 and abs(high_count - analysis_data['most_common_high_low'][1]) <= 1):
        return False
    return True

def generate_recommended_lotto_numbers():
    past_lotto_data = get_cached_lotto_history(num_draws_to_fetch=200)
    if not past_lotto_data:
        return sorted(random.sample(range(1, 46), 6))
    analysis_data = analyze_lotto_data(past_lotto_data)
    if not analysis_data:
        return sorted(random.sample(range(1, 46), 6))
    recommended_numbers = []
    attempts = 0
    max_attempts = 1000
    sorted_freq_nums = sorted(analysis_data['number_counts'].items(), key=lambda item: item[1], reverse=True)
    hot_numbers = [num for num, count in sorted_freq_nums[:10]]
    cold_numbers = [num for num, count in sorted_freq_nums[-10:]]
    while attempts < max_attempts:
        candidate_set = set()
        num_hot = random.randint(2, 3)
        candidate_set.update(random.sample(hot_numbers, min(num_hot, len(hot_numbers))))
        num_cold = 1
        available_cold_numbers = list(set(cold_numbers) - candidate_set)
        if available_cold_numbers:
            candidate_set.update(random.sample(available_cold_numbers, min(num_cold, len(available_cold_numbers))))
        else:
            candidate_set.update(random.sample(list(set(range(1, 46)) - candidate_set), min(num_cold, 6 - len(candidate_set))))
        while len(candidate_set) < 6:
            candidate_set.add(random.randint(1, 45))
        current_combination = sorted(list(candidate_set))
        if is_good_combination(current_combination, analysis_data):
            recommended_numbers = current_combination
            break
        attempts += 1
    if not recommended_numbers:
        return sorted(random.sample(range(1, 46), 6))
    return recommended_numbers

def generate_recommended_pension_numbers():
    group = random.randint(1, 5)
    serial = str(random.randint(0, 999999)).zfill(6)
    return f"{group}조 {serial}"

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)