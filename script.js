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
Kakao.init('8eaabe73acdda5adb1d4bdc62a26cd84');
if (Kakao.isInitialized()) {
    console.log('카카오 SDK 초기화 성공!');
} else {
    console.error('카카오 SDK 초기화 실패! JavaScript 키를 확인해주세요.');
}

// 3. API 기본 주소 (Render 배포 주소)
const API_BASE_URL = 'https://lotto-helper.onrender.com/api';

// 4. 번호 생성 및 백엔드 연동 함수
async function fetchLottoNumbersFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-lotto`);
        const data = await response.json();

        if (data.success) {
            return data.numbers;
        } else {
            console.error('백엔드에서 로또 번호 가져오기 실패:', data.message);
            showStatusMessage(`로또 번호 가져오기 실패: ${data.message} 😭`, true);
            return [];
        }
    } catch (error) {
        console.error('로또 번호 API 호출 중 오류 발생:', error);
        showStatusMessage('로또 번호 서버 호출 중 오류 발생. 서버가 실행 중인지 확인해주세요! 🚨', true);
        return [];
    }
}

async function fetchPensionNumbersFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-pension`);
        const data = await response.json();

        if (data.success) {
            return data.numbers[0];
        } else {
            console.error('백엔드에서 연금복권 번호 가져오기 실패:', data.message);
            showStatusMessage(`연금복권 번호 가져오기 실패: ${data.message} 😭`, true);
            return '';
        }
    } catch (error) {
        console.error('연금복권 번호 API 호출 중 오류 발생:', error);
        showStatusMessage('연금복권 번호 서버 호출 중 오류 발생. 서버가 실행 중인지 확인해주세요! 🚨', true);
        return '';
    }
}

// 5. 번호 표시 및 관리 함수
function displaySingleSet(setElement, numbers, setIndex) {
    setElement.innerHTML = '';

    const setTitle = document.createElement('div');
    setTitle.className = 'set-title';
    setTitle.textContent = `${setIndex}번째 세트: `;
    setElement.appendChild(setTitle);

    if (numbers.length === 0) {
        setElement.innerHTML += '<span class="placeholder">생성 실패 🥲</span>';
        return;
    }

    numbers.forEach(num => {
        const span = document.createElement('span');
        span.textContent = num;
        setElement.appendChild(span);
    });
}

function displayMultipleSets(containerElement, allSets, type) {
    containerElement.innerHTML = '';

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
    statusMessageDisplay.style.color = isError ? 'red' : '#666';
    setTimeout(() => {
        statusMessageDisplay.textContent = '';
    }, 5000);
}

// 7. 플레이스홀더 메시지 정의
const LOTTO_PLACEHOLDER_MESSAGE = '로또 번호 뽑기! 버튼을 클릭하세요';
const PENSION_PLACEHOLDER_MESSAGE = '연금복권 번호 뽑기! 버튼을 클릭하세요';

// 8. 이벤트 리스너

// 🍀 로또 번호 생성 버튼 클릭
generateLottoBtn.addEventListener('click', async () => {
    showStatusMessage('로또 번호를 가져오는 중... 잠시만 기다려주세요! ⏳');
    const numSets = parseInt(lottoNumSetsSelect.value);
    const allLottoSets = [];

    for (let i = 0; i < numSets; i++) {
        const numbers = await fetchLottoNumbersFromBackend();
        if (numbers.length > 0) {
            allLottoSets.push(numbers);
        } else {
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
generatePensionBtn.addEventListener('click', async () => {
    showStatusMessage('연금복권 번호를 가져오는 중... 잠시만 기다려주세요! ⏳');
    const numSets = parseInt(pensionNumSetsSelect.value);
    const allPensionSets = [];

    for (let i = 0; i < numSets; i++) {
        const number = await fetchPensionNumbersFromBackend();
        if (number) {
            allPensionSets.push([number]);
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

    if (!phoneNumber) {
        showStatusMessage('휴대폰 번호를 입력해주세요! 🚨', true);
        return;
    }
    if (phoneNumber.length < 10 || phoneNumber.length > 11 || !/^\d+$/.test(phoneNumber)) {
        showStatusMessage('유효한 휴대폰 번호를 입력해주세요! (숫자 10-11자리) 🚫', true);
        return;
    }

    showStatusMessage(`${phoneNumber} (으)로 번호를 전송 중... (실제 발송은 백엔드 연동 후 가능)`);

    console.log("SMS 전송 시뮬레이션 데이터:");
    console.log("받는 사람:", phoneNumber);
    console.log("로또 번호 세트:", allLottoSets);
    console.log("연금복권 번호 세트:", allPensionSets);

    /*
    fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            showStatusMessage(`번호 전송 실패: ${data.message} 😭`, true);
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

    let messageText = `💖 다은이와 다솜이가 추천하는 행운 번호! 💖\n`;

    if (allLottoSets.length > 0) {
        messageText += `\n🍀 로또 번호 (${allLottoSets.length}세트):\n`;
        allLottoSets.forEach((set, index) => {
            messageText += `  ${index + 1}세트: ${set.join(', ')}\n`;
        });
    }

    if (allPensionSets.length > 0) {
        messageText += `\n💰 연금복권 번호 (${allPensionSets.length}세트):\n`;
        allPensionSets.forEach((set, index) => {
            messageText += `  ${index + 1}세트: ${set.join(', ')}\n`;
        });
    }

    messageText += "\n오늘의 행운을 잡으세요! 😉";

    if (Kakao.isInitialized()) {
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

// 9. 초기 메시지 표시
showStatusMessage('안녕하세요! 행운 번호를 뽑아보세요! 😊');
