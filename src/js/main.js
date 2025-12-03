// jsonbin.io API 설정
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/692fdbd6d0ea881f400f6834';
const JSONBIN_API_KEY = '$2a$10$QTezt6R0qQj.tIq4ApxysODsU3erM8vZWnNzVcv8LQ91ZVkwVSHia'; // 여기에 실제 API 키를 입력하세요

// 기록자 정보와 색상 정의
const recorders = {
  recorder1: { name: '기록자 1', color: '#FF6B6B' }, // 붉은색
  recorder2: { name: '기록자 2', color: '#4ECDC4' }, // 청록색
  recorder3: { name: '기록자 3', color: '#45B7D1' }, // 파란색
  recorder4: { name: '기록자 4', color: '#FFBE0B' }  // 노란색
};

// 현재 선택된 기록자 (기본값: all)
let currentRecorder = 'all';

// 스티커 수집 상태를 저장하는 객체
let stickerCollection = {};

// DOM이 로드되었을 때 실행될 함수
document.addEventListener('DOMContentLoaded', async () => {
  // jsonbin에서 데이터 가져오기 시도
  const loadedFromJsonBin = await loadFromJsonBin();
  
  // 데이터 로드 성공 여부에 따라 처리
  if (loadedFromJsonBin) {
    console.log('JSON 데이터 로드 성공. 현재 스티커 컬렉션:', stickerCollection);
    // recorders 데이터도 업데이트
    if (loadedFromJsonBin.recorders) {
      Object.keys(loadedFromJsonBin.recorders).forEach(key => {
        if (recorders[key]) {
          recorders[key].name = loadedFromJsonBin.recorders[key].name;
        }
      });
    }
  } else {
    console.log('JSON 데이터 로드 실패. 빈 컬렉션 사용:', stickerCollection);
  }
  
  // 드롭다운 메뉴 설정
  setupRecorderDropdown();
  
  // 스티커 클릭 이벤트 설정
  setupStickerClickEvents();
  
  // UI 업데이트
  updateUI('initialLoad');
});


// jsonbin에서 데이터 가져오기
async function loadFromJsonBin(retries = 3) {
  try {
    const response = await fetch(JSONBIN_URL, {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Meta': 'false'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('JSONBin에서 데이터 로드 성공:', data);
      // JSONBin은 데이터를 record 필드에 담아서 반환합니다
      // record가 존재하고 stickerCollection이 있는 경우에만 할당
      if (data.record && data.record.stickerCollection) {
        stickerCollection = data.record.stickerCollection;
      } else if (data.stickerCollection) {
        // 새로운 데이터 구조: record 없이 직접 stickerCollection이 있는 경우
        stickerCollection = data.stickerCollection;
      } else {
        // 데이터가 없는 경우 초기화
        stickerCollection = {};
      }
      console.log('스티커 컬렉션 동기화 완료:', stickerCollection);
      return data.record || data;
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('jsonbin에서 데이터 가져오기 중 오류 발생:', error);
    
    // 재시도 횟수가 남아있고 네트워크 오류인 경우 재시도
    if (retries > 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
      console.log(`재시도 중... (${retries}회 남음)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      return loadFromJsonBin(retries - 1);
    }
    
    // 네트워크 오류 시에도 로컬 데이터를 사용하지 않고 오류 메시지만 표시
    alert('데이터를 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
  }
  
  return false;
}

// jsonbin에 데이터 저장하기
async function saveToJsonBin() {
  try {
    const dataToSave = {
      stickerCollection: stickerCollection,
      recorders: recorders
    };
    
    const response = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(dataToSave)
    });
    
    if (response.ok) {
      console.log('JSONBin에 데이터 저장 성공');
      return true;
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('jsonbin에 데이터 저장 중 오류 발생:', error);
    alert('데이터 저장 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
  }
  
  return false;
}

// 드롭다운 메뉴 설정
function setupRecorderDropdown() {
  const dropdown = document.getElementById('recorder-select');
  
  // 드롭다운 옵션 업데이트
  dropdown.innerHTML = '';
  
  // 전체보기 옵션 추가
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '전체보기';
  dropdown.appendChild(allOption);
  
  Object.keys(recorders).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = recorders[key].name;
    dropdown.appendChild(option);
  });
  
  // 현재 선택된 기록자로 드롭다운 값 설정
  dropdown.value = currentRecorder;
  
  // 드롭다운 변경 이벤트 리스너 추가
  dropdown.addEventListener('change', async (event) => {
    currentRecorder = event.target.value;
    updateUI('dropdownChange');
    
    // jsonbin에 저장 시도
    await saveToJsonBin();
  });
  
  // 수정 버튼 이벤트 리스너 추가
  const editButton = document.getElementById('edit-recorder-btn');
  editButton.addEventListener('click', showEditModal);
}

// 스티커 클릭 이벤트 설정
function setupStickerClickEvents() {
  const stickers = document.querySelectorAll('.sticker-container');
  stickers.forEach((sticker, index) => {
    sticker.addEventListener('click', () => {
      // 전체보기 모드에서는 클릭 이벤트를 무시
      if (currentRecorder !== 'all') {
        toggleSticker(index);
      }
    });
  });
}

// 스티커 토글 함수
async function toggleSticker(stickerIndex) {
  // 스티커 ID 생성 (0 기반 인덱스이므로 1을 더함)
  const stickerId = `sticker_${String(stickerIndex + 1).padStart(3, '0')}`;
  
  // 현재 기록자가 이 스티커를 이미 수집했는지 확인
  if (stickerCollection[stickerId] && stickerCollection[stickerId][currentRecorder]) {
    // 이미 수집했다면 삭제
    delete stickerCollection[stickerId][currentRecorder];
    // 해당 스티커에 더 이상 기록자가 없으면 전체 항목 삭제
    if (Object.keys(stickerCollection[stickerId]).length === 0) {
      delete stickerCollection[stickerId];
    }
  } else {
    // 아직 수집하지 않았다면 추가
    if (!stickerCollection[stickerId]) {
      stickerCollection[stickerId] = {};
    }
    stickerCollection[stickerId][currentRecorder] = true;
  }
  
  // UI 업데이트
  updateUI('DOMContentLoaded');
  
  // jsonbin에 저장 시도
  await saveToJsonBin();
}

// UI 업데이트 함수
function updateUI(source = 'unknown') {
  console.log('UI 업데이트 중. 호출 경로:', source, '현재 기록자:', currentRecorder, '스티커 컬렉션:', stickerCollection);
  // 드롭다운 메뉴 업데이트
  const dropdown = document.getElementById('recorder-select');
  dropdown.value = currentRecorder;
  
  // 모든 스티커 컨테이너 가져오기
  const stickers = document.querySelectorAll('.sticker-container');
  
  // 전체보기 모드인지 확인
  const isAllView = currentRecorder === 'all';
  
  // 수정 버튼 활성화/비활성화 처리
  const editButton = document.getElementById('edit-recorder-btn');
  if (isAllView) {
    editButton.disabled = true;
    editButton.title = '전체보기 모드에서는 이름 수정이 불가능합니다';
  } else {
    editButton.disabled = false;
    editButton.title = '';
  }
  
  // 각 스티커에 대해 UI 업데이트
  stickers.forEach((sticker, index) => {
    const stickerId = `sticker_${String(index + 1).padStart(3, '0')}`;
    const overlay = sticker.querySelector('.overlay');
    
    // 기존의 모든 기록자 관련 클래스 제거
    Object.keys(recorders).forEach(recorderId => {
      sticker.classList.remove(`collected-${recorderId}`);
    });
    
    // 수집 상태에 따라 UI 업데이트
    if (stickerCollection[stickerId]) {
      // 어떤 기록자든 이 스티커를 수집했는지 확인
      const collectedByAny = Object.keys(stickerCollection[stickerId]).length > 0;
      
      if (collectedByAny) {
        // 수집된 스티커에 collected 클래스 추가
        sticker.classList.add('collected');
        
        // 현재 기록자가 이 스티커를 수집했는지 확인
        if (currentRecorder === 'all') {
          // 전체보기 모드에서는 모든 체크표시를 회색으로 표시하고 약간 흐리게 처리
          overlay.style.backgroundColor = 'rgba(128, 128, 128, 0.6)';
          overlay.style.opacity = '0.7';
        } else if (stickerCollection[stickerId][currentRecorder]) {
          // 현재 기록자가 수집했다면 해당 색상으로 오버레이 표시
          overlay.style.backgroundColor = recorders[currentRecorder].color;
          overlay.style.opacity = '1';
        } else {
          // 다른 기록자가 수집했다면 흐린 회색으로 표시
          overlay.style.backgroundColor = 'rgba(128, 128, 128, 0.8)';
          overlay.style.opacity = '1';
        }
         
        // 각 기록자별로 수집 여부에 따라 클래스 추가
        Object.keys(stickerCollection[stickerId]).forEach(recorderId => {
          if (stickerCollection[stickerId][recorderId]) {
            sticker.classList.add(`collected-${recorderId}`);
          }
        });
      } else {
        // 아무도 수집하지 않았다면 기본 상태로 복구
        sticker.classList.remove('collected');
      }
    } else {
      // 수집 데이터가 없으면 기본 상태로 복구
      sticker.classList.remove('collected');
    }
    
    // 전체보기 모드일 때 스티커에 특별한 클래스 추가
    if (isAllView) {
      sticker.classList.add('all-view');
    } else {
      sticker.classList.remove('all-view');
    }
  });
}
// 수정 모달 표시 함수
function showEditModal() {
  // 모달 요소 생성
  const modal = document.createElement('div');
  modal.id = 'edit-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  // 모달 내용 생성
  modal.innerHTML = `
    <div style="background-color: white; padding: 20px; border-radius: 8px; width: 300px;">
      <h3>기록자 이름 수정</h3>
      ${Object.keys(recorders).map(key => `
        <div style="margin-bottom: 10px;">
          <label>${key.replace('recorder', '기록자 ')}:</label>
          <input type="text" id="edit-${key}" value="${recorders[key].name}" style="width: 100%; padding: 5px; margin-top: 3px;">
        </div>
      `).join('')}
      <div style="text-align: right; margin-top: 20px;">
        <button id="cancel-edit" style="padding: 8px 16px; margin-right: 10px;">취소</button>
        <button id="save-edit" style="padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px;">저장</button>
      </div>
    </div>
  `;
  
  // 모달을 body에 추가
  document.body.appendChild(modal);
  
  // 이벤트 리스너 추가
  document.getElementById('cancel-edit').addEventListener('click', hideEditModal);
  document.getElementById('save-edit').addEventListener('click', saveRecorderNames);
}

// 모달 숨기기 함수
function hideEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.remove();
  }
}

// 기록자 이름 저장 함수
async function saveRecorderNames() {
  // 입력값 가져오기
  Object.keys(recorders).forEach(key => {
    const input = document.getElementById(`edit-${key}`);
    if (input) {
      recorders[key].name = input.value;
    }
  });
  
  // 드롭다운 메뉴 업데이트
  setupRecorderDropdown();
  
  // 모달 숨기기
  hideEditModal();
  
  // jsonbin에 저장 시도
  await saveToJsonBin();
}