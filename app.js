// ==========================================
// 1. 초기화 및 기본 UI 설정
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // API 키 및 테마 불러오기
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) document.getElementById('sysApiKey').value = savedKey;
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeSelector = document.getElementById('themeSelector');
    if(themeSelector) themeSelector.value = savedTheme;
    
    // UI 컴포넌트 초기화
    renderOMR();
    setupDragAndDrop('conceptDropZone', 'conceptFile');
    dragElement(document.getElementById("floatingTimer"));
});

function saveApiKey() { localStorage.setItem('geminiApiKey', document.getElementById('sysApiKey').value); }
function changeTheme(themeValue) { document.documentElement.setAttribute('data-theme', themeValue); localStorage.setItem('theme', themeValue); }
function toggleZenMode() { document.body.classList.toggle('zen-mode'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebarOutside() { if(window.innerWidth <= 1024) document.getElementById('sidebar').classList.remove('open'); }

function navTo(pageId) {
    if(window.speechSynthesis.speaking) window.speechSynthesis.cancel(); 
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    closeSidebarOutside();
    document.body.classList.remove('zen-mode'); 
    
    const titles = {
        'concept': '<i class="fa-solid fa-file-pdf"></i> PDF 개념 요약',
        'grading': '<i class="fa-solid fa-marker"></i> OMR & 오답 해설',
        'dashboard': '<i class="fa-solid fa-chart-pie"></i> 단원별 지식 맵',
        'training': '<i class="fa-solid fa-dumbbell"></i> 오답 선지 OX 훈련',
        'unified': '<i class="fa-solid fa-layer-group"></i> 단권화 & 모의고사 생성'
    };
    document.getElementById('pageTitleText').innerHTML = titles[pageId] || '';
}

// ==========================================
// 2. 아이패드 완벽 지원 위젯 드래그 (터치 이벤트 추가)
// ==========================================
function dragElement(elmnt) {
    if(!elmnt) return;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var handle = elmnt.querySelector(".widget-drag-handle") || elmnt;
    
    // PC 마우스
    handle.onmousedown = dragMouseDown;
    // iPad/모바일 터치
    handle.ontouchstart = dragTouchStart;

    function dragMouseDown(e) { 
        e = e || window.event; e.preventDefault(); 
        pos3 = e.clientX; pos4 = e.clientY; 
        document.onmouseup = closeDragElement; document.onmousemove = elementDrag; 
    }
    function dragTouchStart(e) { 
        e = e || window.event; 
        pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; 
        document.ontouchend = closeDragElement; document.ontouchmove = elementTouchDrag; 
    }
    
    function elementDrag(e) { 
        e = e || window.event; e.preventDefault(); 
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; 
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; 
        elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; 
    }
    function elementTouchDrag(e) { 
        e = e || window.event; 
        pos1 = pos3 - e.touches[0].clientX; pos2 = pos4 - e.touches[0].clientY; pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; 
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; 
        elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; 
    }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; document.ontouchend = null; document.ontouchmove = null; }
}

// ==========================================
// 3. 오디오 및 타이머 기능 (Safari 정책 우회)
// ==========================================
let timerInterval; let timeLeft = 25 * 60; let isTimerRunning = false;
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').innerText = `${m}:${s}`;
}
function startTimer() { if(!isTimerRunning) { isTimerRunning = true; timerInterval = setInterval(() => { if(timeLeft > 0) { timeLeft--; updateTimerDisplay(); } else { pauseTimer(); alert("뽀모도로 완료!"); } }, 1000); } }
function pauseTimer() { clearInterval(timerInterval); isTimerRunning = false; }
function resetTimer() { pauseTimer(); timeLeft = 25 * 60; updateTimerDisplay(); }

let bgmAudio = null; 
let isBgmPlaying = false;
function toggleBGM() {
    const btn = document.getElementById('bgmBtn');
    if(!bgmAudio) {
        // 사용자 클릭 시 동적으로 Audio 생성 (iOS 정책 통과)
        bgmAudio = new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3");
        bgmAudio.loop = true;
    }
    if(isBgmPlaying) { bgmAudio.pause(); isBgmPlaying = false; btn.classList.remove('playing'); } 
    else { bgmAudio.play().catch(e=>console.log("오디오 재생 실패", e)); isBgmPlaying = true; btn.classList.add('playing'); }
}

// iOS 음성 읽기 묵음 버그 해결 (Chunking)
let isTTSPlaying = false;
function toggleTTS(elementId, btnId) {
    const btn = document.getElementById(btnId);
    if(isTTSPlaying || window.speechSynthesis.speaking) { 
        window.speechSynthesis.cancel(); isTTSPlaying = false; btn.classList.remove('active'); 
        btn.innerHTML = '<i class="fa-solid fa-headphones"></i> 읽기'; return; 
    }
    
    const text = document.getElementById(elementId).innerText;
    if(!text) return;
    
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    let currentIndex = 0;
    isTTSPlaying = true;
    btn.classList.add('active');
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> 중지';

    function speakNext() {
        if(currentIndex >= sentences.length || !isTTSPlaying) {
            isTTSPlaying = false; btn.classList.remove('active'); btn.innerHTML = '<i class="fa-solid fa-headphones"></i> 읽기'; return;
        }
        let utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
        utterance.lang = 'ko-KR'; utterance.rate = 1.1;
        utterance.onend = () => { currentIndex++; speakNext(); };
        utterance.onerror = () => { isTTSPlaying = false; btn.classList.remove('active'); };
        window.speechSynthesis.speak(utterance);
    }
    speakNext();
}

// ==========================================
// 4. 아이패드/굿노트 완벽 연동 PDF 추출 엔진 (Hidden Canvas)
// ==========================================
async function exportPDF(elementId, fileName) {
    const originalElement = document.getElementById(elementId);
    const loaderId = elementId.replace('Result', 'Loader');
    const loader = document.getElementById(loaderId);
    
    if(loader) { loader.style.display = 'block'; loader.innerHTML = '<div class="spinner"></div>안전하게 PDF를 렌더링 중입니다...'; }

    // 프린트 방해 요소 숨김
    const noPrints = originalElement.querySelectorAll('.no-print, .toolbar-chips');
    noPrints.forEach(el => el.style.display = 'none');

    // 짤림 방지용 보이지 않는 794px(A4) 캔버스 세팅
    const container = document.createElement('div');
    container.appendChild(originalElement.cloneNode(true));
    container.style.position = 'absolute'; container.style.top = '-9999px'; container.style.left = '0';
    container.style.width = '794px'; container.style.padding = '30px';
    container.style.background = '#ffffff'; container.style.color = '#000000';
    
    // 표 짤림 방지 강제 제어
    container.querySelectorAll('table').forEach(t => { t.style.width = '100%'; t.style.tableLayout = 'fixed'; t.style.wordBreak = 'break-all'; });
    
    document.body.appendChild(container);

    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, windowWidth: 794 }, // iOS 메모리 방어 배율(1.5)
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        // 1. PDF를 파일 객체(Blob)로 메모리상에 생성
        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
        
        // 2. iOS(아이패드) '공유하기' 기능으로 굿노트로 직행 유도
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: fileName,
                text: '단권화 다이어리에서 내보낸 노트입니다.'
            });
        } else {
            // 공유하기를 지원하지 않는 PC 환경에서는 일반 다운로드
            await html2pdf().set(opt).from(container).save();
        }
    } catch (error) {
        console.error(error);
        alert("PDF 추출 중 오류가 발생했습니다. (파일이 너무 길 경우 끊어서 시도해주세요)");
    } finally {
        document.body.removeChild(container);
        noPrints.forEach(el => el.style.display = '');
        if(loader) loader.style.display = 'none';
    }
}

// ==========================================
// 5. 유틸리티 (드래그앤드롭, 암기모드, 파일처리, 노션복사)
// ==========================================
function setupDragAndDrop(zoneId, inputId) {
    const zone = document.getElementById(zoneId); const input = document.getElementById(inputId);
    if(!zone || !input) return;
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.background = 'rgba(0,0,0,0.05)'; });
    zone.addEventListener('dragleave', (e) => { e.preventDefault(); zone.style.background = ''; });
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.style.background = ''; if(e.dataTransfer.files.length) { input.files = e.dataTransfer.files; handleFile(inputId, inputId.replace('File', 'Preview')); } });
}

function handleFile(inputId, previewId) {
    const file = document.getElementById(inputId).files[0];
    if (file) document.getElementById(previewId).innerHTML = `[첨부됨] ${file.name}`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => resolve({ data: reader.result.split(',')[1], mimeType: file.type });
        reader.onerror = error => reject(error);
    });
}

function toggleCloze(btn) {
    const container = btn.closest('.document-wrapper').querySelector('.document-view');
    const strongTags = container.querySelectorAll('strong');
    let isCloze = btn.dataset.cloze === 'true';
    if (!isCloze) {
        strongTags.forEach(el => { el.style.background = 'var(--text-main)'; el.style.color = 'var(--text-main)'; el.style.borderRadius = '4px'; el.style.cursor = 'pointer'; el.onclick = function(){ this.style.background=''; this.style.color=''; }; });
        btn.dataset.cloze = 'true'; btn.classList.add('active');
    } else {
        strongTags.forEach(el => { el.style.background = ''; el.style.color = ''; el.onclick = null; });
        btn.dataset.cloze = 'false'; btn.classList.remove('active');
    }
}

let currentRawMarkdown = ""; 
function copyNotionMarkdown(elementId) {
    if(!currentRawMarkdown) return alert("복사할 내용이 없습니다.");
    navigator.clipboard.writeText(currentRawMarkdown).then(() => alert("텍스트가 클립보드에 복사되었습니다. 노션에 붙여넣기 하세요."));
}

let userAnswers = {}; 
function renderOMR() {
    const container = document.getElementById('visualOMR'); if(!container) return;
    let html = '';
    for(let i=1; i<=20; i++) {
        html += `<div class="omr-row"><div class="omr-qnum">${i}.</div><div style="display:flex; gap:10px;">`;
        for(let j=1; j<=5; j++) html += `<div class="omr-bubble" onclick="selectOMR(${i}, ${j})" id="omr-q${i}-c${j}" style="width:30px; height:30px; border-radius:50%; border:1px solid var(--border-soft); display:flex; align-items:center; justify-content:center; cursor:pointer;">${j}</div>`;
        html += `</div></div>`;
    }
    container.innerHTML = html;
}
function selectOMR(q, c) {
    userAnswers[q] = c;
    for(let j=1; j<=5; j++) {
        let bubble = document.getElementById(`omr-q${q}-c${j}`);
        bubble.style.background = 'transparent'; bubble.style.color = 'var(--text-sub)'; bubble.style.borderColor = 'var(--border-soft)';
    }
    let target = document.getElementById(`omr-q${q}-c${c}`);
    target.style.background = 'var(--accent-primary)'; target.style.color = 'white'; target.style.borderColor = 'var(--accent-primary)';
    let ansArr = []; for(let i=1; i<=20; i++) if(userAnswers[i]) ansArr.push(`${i}:${userAnswers[i]}`);
    document.getElementById('omrAnswers').value = ansArr.join(',');
}

// ==========================================
// 6. Gemini AI 코어 엔진 통신 로직
// ==========================================
const formattingRules = `
[마크다운 필수 규칙]
1. 하이픈(-) 절대 금지. 리스트는 별표(*)나 숫자 사용.
2. 수식은 무조건 $$수식$$ 형태만 사용. 단일 $ 사용 금지.
3. 표(Table) 가독성을 위해 내용이 길어지지 않게 쪼갤 것. 중요어 앞 2글자 **볼드체** 처리.`;

async function callGeminiAPI(apiKey, prompt, files = [], loaderId = null) {
    let requestParts = [{ text: prompt }];
    files.forEach(f => requestParts.push({ inlineData: { data: f.data, mimeType: f.mimeType } }));
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { temperature: 0.7 } }) };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, options);
        if (!response.ok) throw new Error("구글 AI 서버 연결 실패. API Key나 할당량을 확인해주세요.");
        const data = await response.json(); 
        if(data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        throw e;
    }
}

let currentContext = ""; 

async function executeAI(mode, subMode) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("좌측 하단 메뉴에서 Gemini API Key를 입력하세요.");

    const loaderId = mode + 'Loader'; const resultWrapper = document.getElementById(mode + 'ResultWrapper'); const resultBox = document.getElementById(mode + 'Result');
    document.getElementById(loaderId).style.display = 'block'; resultWrapper.style.display = 'none';

    let prompt = ""; let filesToProcess = [];

    try {
        if (mode === 'concept') {
            const inputPrompt = document.getElementById('conceptPrompt').value;
            const file = document.getElementById('conceptFile').files[0];
            const formatChoice = document.getElementById('conceptFormat').value; 
            if (!inputPrompt && !file) throw new Error("분석할 텍스트나 파일이 필요합니다.");
            if (file) filesToProcess.push(await fileToBase64(file));
            
            let styleIns = formatChoice === "cornell" ? "2열 표(Table) 형식" : formatChoice === "bullet" ? "개조식" : "AI 자동 판단";
            prompt = `[자료]: ${inputPrompt}\n[레이아웃]: ${styleIns}\n자료를 깊이 있게 분석하여 요약 노트를 작성하세요.\n${formattingRules}`;
        }
        // *참고: grading(OMR), unified(단권화), training(OX) 로직은 Part 3에서 확장하거나 필요시 추가 요건에 맞춰 조립 가능합니다.
        
        const aiText = await callGeminiAPI(apiKey, prompt, filesToProcess, loaderId);
        currentContext = aiText; currentRawMarkdown = aiText; 
        
        resultBox.innerHTML = marked.parse(aiText);
        
        // 렌더링 후 모바일 표 스크롤 적용
        resultBox.querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            wrapper.style.width = '100%'; wrapper.style.overflowX = 'auto'; wrapper.style.WebkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });

        resultWrapper.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([resultBox]);

    } catch (error) { 
        resultBox.innerHTML = `<div style="color:red; font-weight:bold; padding:20px;">🚨 에러: ${error.message}</div>`; 
        resultWrapper.style.display = 'block'; 
    } 
    finally { document.getElementById(loaderId).style.display = 'none'; }
}

async function askTutor(mode) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("API Key를 입력하세요.");
    const inputField = document.getElementById('chatInput' + (mode === 'concept' ? 'Concept' : 'Grade'));
    const chatBox = document.getElementById('chatBox' + (mode === 'concept' ? 'Concept' : 'Grade'));
    const question = inputField.value.trim();
    if (!question) return;

    chatBox.innerHTML += `<div class="chat-msg msg-user" style="background:var(--accent-primary); color:white; padding:10px; border-radius:12px; align-self:flex-end;">${question}</div>`; 
    inputField.value = ""; chatBox.scrollTop = chatBox.scrollHeight;
    
    const loadingId = "load-" + Date.now(); 
    chatBox.innerHTML += `<div class="chat-msg msg-ai" id="${loadingId}" style="background:var(--bg-surface); padding:10px; border-radius:12px; align-self:flex-start;">답변 작성 중...</div>`;
    
    const prompt = `[학습 자료]:\n${currentContext}\n\n[학생 질문]: ${question}\n위 자료 맥락 안에서 답변하세요.\n${formattingRules}`;

    try {
        const answerText = await callGeminiAPI(apiKey, prompt, []);
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="chat-msg msg-ai" style="background:var(--bg-surface); padding:10px; border-radius:12px; align-self:flex-start;">${marked.parse(answerText)}</div>`;
        if (window.MathJax) MathJax.typesetPromise([chatBox]);
    } catch (error) { document.getElementById(loadingId).remove(); chatBox.innerHTML += `<div style="color:red;">에러 발생</div>`; }
    chatBox.scrollTop = chatBox.scrollHeight;
}
