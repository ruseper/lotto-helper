// script.js - lotto-helper 루트 폴더용 최종 완성본 (문법 오류 수정 완료)

// 1. DOM 요소 가져오기
const lottoNumbersContainer = document.getElementById('lottoNumbersContainer');
const pensionNumbersContainer = document.getElementById('pensionNumbersContainer');
const generateLottoBtn = document.getElementById('generateLottoBtn');
const generatePensionBtn = document.getElementById('generatePensionBtn');
const lottoNumSetsSelect = document.getElementById('lottoNumSets');
const pensionNumSetsSelect = document.getElementById('pensionNumSets');
const phoneNumberInput = document.getElementById('phoneNumber');
const sendSmsBtn = document.getElementById('sendSmsBtn');
const sendKakaoBtn = document.getElementById('sendKakaoBtn');
const statusMessageDisplay = document.getElementById('statusMessage');

// 2. Kakao SDK 초기화
// ✨✨ 네 카카오 JavaScript 키가 적용된 상태입니다! ✨✨
Kakao.init('2765155fedb41c320bd545d028532658');
if (Kakao.isInitialized()) {
    console.log('카카오 SDK 초기화 성공!');
} else {
    console.error('카카오 SDK 초기화 실패! JavaScript 키를 확인해주세요.');
}

// 3. API 기본 주소 (Render 배포 주소)
// ✨✨ Render에 배포된 백엔드 서버 URL로 설정되었습니다! ✨✨
const API_BASE_URL = 'https://lotto-helper.onrender.com/api'; // 나중에 서버에 배포하면 실제 서버 IP나 도메인으로 바꿔줘야 해!


// 4. 번호 생성 및 백엔드 연동 함수
/**
 * 백엔드에서 로또 번호를 요청합니다.
 * @returns {Promise<Array<number>>} 로또 번호 배열을 포함하는 Promise
 */
async function fetchLottoNumbersFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-lotto`); // 로또 API 호출!
        const data = await response.json(); // JSON 데이터 파싱

        if (data.success) {
            return data.numbers; // 성공 시 번호 반환
        } else {
            console.error('백엔드에서 로또 번호 가져오기 실패:', data.message);
            showStatusMessage(`로또 번호 가져오기 실패: ${data.message} 😭`, true); // <--- 여기 수정!
            return [];
        }
    } catch (error) {
        console.error('로또 번호 API 호출 중 오류 발생:', error);
        showStatusMessage('로또 번호 서버 호출 중 오류 발생. 서버가 실행 중인지 확인해주세요! 🚨', true);
        return [];
    }
}

/**
 * 백엔드에서 연금복권 번호를 요청합니다.
 * @returns {Promise<string>} 연금복권 번호 문자열을 포함하는 Promise
 */
async function fetchPensionNumbersFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-pension`); // 연금복권 API 호출!
        const data = await response.json(); // JSON 데이터 파싱

        if (data.success) {
            return data.numbers[0]; // 연금복권은 배열로 오므로 첫 번째 요소 (문자열) 반환
        } else {
            console.error('백엔드에서 연금복권 번호 가져오기 실패:', data.message);
            showStatusMessage(`연금복권 번호 가져오기 실패: ${data.message} 😭`, true); // <--- 여기 수정!
            return '';
        }
    } catch (error) {
        console.error('연금복권 번호 API 호출 중 오류 발생:', error);
        showStatusMessage('연금복권 번호 서버 호출 중 오류 발생. 서버가 실행 중인지 확인해주세요! 🚨', true);
        return '';
    }
}


// 5. 번호 표시 및 관리 함수
/**
 * 개별 번호 세트를 HTML 요소에 표시합니다.
 * @param {HTMLElement} setElement 번호가 표시될 단일 세트 HTML 요소
 * @param {Array<number|string>} numbers 표시할 번호 배열
 * @param {number} setIndex 세트 번호 (예: 1번째 세트, 2번째 세트)
 */
function displaySingleSet(setElement, numbers, setIndex) {
    setElement.innerHTML = ''; // 기존 내용 초기화

    // 세트 번호 추가 (ex: 1번째 세트: )
    const setTitle = document.createElement('div');
    setTitle.className = 'set-title';
    setTitle.textContent = `${setIndex}번째 세트: `; // <--- 여기 수정!
    setElement.appendChild(setTitle);

    if (numbers.length === 0) {
        setElement.innerHTML += '<span class="placeholder">생성 실패 🥲</span>';
        return;
    }

    // 각 번호를 span 태그로 만들어서 추가
    numbers.forEach(num => {
        const span = document.createElement('span');
        span.textContent = num;
        setElement.appendChild(span);
    });
}

/**
 * 여러 개의 번호 세트들을 컨테이너에 표시합니다.
 * @param {HTMLElement} containerElement 모든 세트가 담길 부모 HTML 요소
 * @param {Array<Array<number|string>>} allSets 모든 번호 세트 배열 (예: [[로또1],[로또2]])
 */
function displayMultipleSets(containerElement, allSets, type) {
    containerElement.innerHTML = ''; // 컨테이너 초기화 (기존 플레이스홀더 및 모든 세트 삭제)

    if (allSets.length === 0) {
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'number-set-item numbers-display';

        let message = '';
        if (type === 'lotto') {
            message = LOTTO_PLACEHOLDER_MESSAGE;
        } else if (type === 'pension') {
            message = PENSION_PLACEHOLDER_MESSAGE;
        }

        placeholderDiv.innerHTML = `<span class="placeholder">${message}</span>`;
        containerElement.appendChild(placeholderDiv);
        return;
    }

    allSets.forEach((numbers, index) => {
        const setDiv = document.createElement('div');
        setDiv.className = 'number-set-item numbers-display';
        displaySingleSet(setDiv, numbers, index + 1);
        containerElement.appendChild(setDiv);
    });
}

// 6. 상태 메시지 표시 함수
function showStatusMessage(message, isError = false) {
    statusMessageDisplay.textContent = message;
    if (isError) {
        statusMessageDisplay.style.color = 'red';
    } else {
        statusMessageDisplay.style.color = '#666';
    }
    setTimeout(() => {
        statusMessageDisplay.textContent = '';
    }, 5000);
}

// 7. 플레이스홀더 메시지 정의
const LOTTO_PLACEHOLDER_MESSAGE = '로또 번호 뽑기! 버튼을 클릭하세요';
const PENSION_PLACEHOLDER_MESSAGE = '연금복권 번호 뽑기! 버튼을 클릭하세요';


// 8. 이벤트 리스너 (버튼 클릭 시 실행될 동작 정의)

// 🍀 로또 번호 생성 버튼 클릭
generateLottoBtn.addEventListener('click', async () => { // async 키워드 추가
    showStatusMessage('로또 번호를 가져오는 중... 잠시만 기다려주세요! ⏳');
    const numSets = parseInt(lottoNumSetsSelect.value);
    const allLottoSets = [];

    for (let i = 0; i < numSets; i++) {
        const numbers = await fetchLottoNumbersFromBackend(); // 백엔드 API 호출!
        if (numbers.length > 0) {
            allLottoSets.push(numbers);
        } else {
            // 하나라도 실패하면 나머지 생성 중단 또는 에러 메시지 처리
            showStatusMessage('일부 로또 번호를 가져오는 데 실패했습니다. 😭', true);
            break; 
        }
    }
    displayMultipleSets(lottoNumbersContainer, allLottoSets, 'lotto');
    if (allLottoSets.length > 0) {
        showStatusMessage(`로또 번호 ${allLottoSets.length}세트가 생성되었어요! 행운을 빌어요! 😄`);
    } else {
        showStatusMessage('로또 번호 생성을 완료하지 못했습니다. 😥', true);
    }
});

// 💰 연금복권 번호 생성 버튼 클릭
generatePensionBtn.addEventListener('click', async () => { // async 키워드 추가
    showStatusMessage('연금복권 번호를 가져오는 중... 잠시만 기다려주세요! ⏳');
    const numSets = parseInt(pensionNumSetsSelect.value);
    const allPensionSets = [];

    for (let i = 0; i < numSets; i++) {
        const number = await fetchPensionNumbersFromBackend(); // 백엔드 API 호출!
        if (number) { // 연금복권 번호가 제대로 왔다면
            allPensionSets.push([number]); // 배열로 감싸서 추가
        } else {
            showStatusMessage('일부 연금복권 번호를 가져오는 데 실패했습니다. 😭', true);
            break;
        }
    }
    displayMultipleSets(pensionNumbersContainer, allPensionSets, 'pension');
    if (allPensionSets.length > 0) {
        showStatusMessage(`연금복권 번호 ${allPensionSets.length}세트가 생성되었어요! 부자되세요~! 💰`);
    } else {
        showStatusMessage('연금복권 번호 생성을 완료하지 못했습니다. 😥', true);
    }
});

// 📱 SMS로 전송 버튼 클릭
sendSmsBtn.addEventListener('click', () => {
    const phoneNumber = phoneNumberInput.value.trim();
    
    // 현재 표시된 모든 로또 번호 세트 가져오기
    const allLottoSets = Array.from(lottoNumbersContainer.querySelectorAll('.number-set-item')).map(setItem => {
        // .set-title은 제외하고 숫자만 추출
        const numbers = Array.from(setItem.querySelectorAll('span:not(.placeholder), div.set-title'));
        return numbers.filter(n => !n.classList.contains('set-title')).map(span => span.textContent);
    }).filter(set => set.length > 0);

    // 현재 표시된 모든 연금복권 번호 세트 가져오기
    const allPensionSets = Array.from(pensionNumbersContainer.querySelectorAll('.number-set-item')).map(setItem => {
        // .set-title은 제외하고 숫자만 추출
        const numbers = Array.from(setItem.querySelectorAll('span:not(.placeholder), div.set-title'));
        return numbers.filter(n => !n.classList.contains('set-title')).map(span => span.textContent);
    }).filter(set => set.length > 0);
    
    // 유효성 검사 (번호가 생성되지 않았으면 전송 불가)
    if (allLottoSets.length === 0 && allPensionSets.length === 0) {
        showStatusMessage('생성된 번호가 없어요! 먼저 번호를 뽑아주세요! 🙏', true);
        return;
    }

    // 휴대폰 번호 유효성 검사
    if (!phoneNumber) {
        showStatusMessage('휴대폰 번호를 입력해주세요! 🚨', true);
        return;
    }
    if (phoneNumber.length < 10 || phoneNumber.length > 11 || !/^\d+$/.test(phoneNumber)) {
        showStatusMessage('유효한 휴대폰 번호를 입력해주세요! (숫자 10-11자리) 🚫', true);
        return;
    }

    showStatusMessage(`${phoneNumber} (으)로 번호를 전송 중... (실제 발송은 백엔드 연동 후 가능)`); // <--- 여기 수정!

    console.log("SMS 전송 시뮬레이션 데이터:");
    console.log("받는 사람:", phoneNumber);
    console.log("로또 번호 세트:", allLottoSets);
    console.log("연금복권 번호 세트:", allPensionSets);

    // 나중에 백엔드 연동 시 아래 fetch 코드를 활성화하면 돼!
    /*
    fetch('/api/send-sms', { // 실제 배포 시에는 백엔드 서버 주소와 포트 변경 필요
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            phoneNumber: phoneNumber,
            lottoSets: allLottoSets,
            pensionSets: allPensionSets
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showStatusMessage('번호 전송 성공! 🎉', false);
        } else {
            showStatusMessage(`번호 전송 실패: ${data.message} 😭`, true); // <--- 여기 수정!
        }
    })
    .catch(error => {
        console.error('SMS 전송 오류:', error);
        showStatusMessage('SMS 전송 중 오류가 발생했어요. 다시 시도해주세요. 🥺', true);
    });
    */
});

// 💬 카카오톡으로 전송 버튼 클릭
sendKakaoBtn.addEventListener('click', () => {
    const allLottoSets = Array.from(lottoNumbersContainer.querySelectorAll('.number-set-item')).map(setItem => {
        const numbers = Array.from(setItem.querySelectorAll('span:not(.placeholder), div.set-title'));
        return numbers.filter(n => !n.classList.contains('set-title')).map(span => span.textContent);
    }).filter(set => set.length > 0);

    const allPensionSets = Array.from(pensionNumbersContainer.querySelectorAll('.number-set-item')).map(setItem => {
        const numbers = Array.from(setItem.querySelectorAll('span:not(.placeholder), div.set-title'));
        return numbers.filter(n => !n.classList.contains('set-title')).map(span => span.textContent);
    }).filter(set => set.length > 0);

    if (allLottoSets.length === 0 && allPensionSets.length === 0) {
        showStatusMessage('생성된 번호가 없어요! 먼저 번호를 뽑아주세요! 🙏', true);
        return;
    }

    let messageText = `💖 다은이와 다솜이가 추천하는 행운 번호! 💖\n`; // <--- 여기 수정!

    if (allLottoSets.length > 0) {
        messageText += `\n🍀 로또 번호 (${allLottoSets.length}세트):\n`; // <--- 여기 수정!
        allLottoSets.forEach((set, index) => {
            messageText += `  ${index + 1}세트: ${set.join(', ')}\n`; // <--- 여기 수정!
        });
    }

    if (allPensionSets.length > 0) {
        messageText += `\n💰 연금복권 번호 (${allPensionSets.length}세트):\n`; // <--- 여기 수정!
        allPensionSets.forEach((set, index) => {
            messageText += `  ${index + 1}세트: ${set.join(', ')}\n`; // <--- 여기 수정!
        });
    }
    
    messageText += "\n오늘의 행운을 잡으세요! 😉";

    if (Kakao.isInitialized()) { // <--- if 문 괄호 추가!
        // Kakao.Share.sendDefault()를 사용해서 카카오톡 공유 팝업을 띄울 거야
        Kakao.Share.sendDefault({
            objectType: 'text',
            text: messageText + '\n\n👉 전체 번호 보기: https://ruseper.github.io/lotto-helper/',
            link: {
                mobileWebUrl: 'https://ruseper.github.io/lotto-helper/',
                webUrl: 'https://ruseper.github.io/lotto-helper/'
            },
            buttonTitle: "웹사이트에서 더 보기"
        });

        showStatusMessage('카카오톡 공유 창이 열렸어요! 친구에게 행운을 나눠주세요! 📱');
    } else {
        showStatusMessage('카카오 SDK 초기화가 안 되어있어요. JavaScript 키를 확인해주세요! 😭', true);
    }
});


// ----------------------------------------------------
// 9. 초기 메시지 표시 (페이지 로드 시)
// ----------------------------------------------------
showStatusMessage('안녕하세요! 행운 번호를 뽑아보세요! 😊');