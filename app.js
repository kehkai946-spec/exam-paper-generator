// ==========================================
// 1. 초기화 및 기본 UI 설정
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) document.getElementById('sysApiKey').value = savedKey;
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeSelector = document.getElementById('themeSelector');
    if(themeSelector) themeSelector.value = savedTheme;
    
    renderOMR();
    setupDragAndDrop('conceptDropZone', 'conceptFile');
    setupDragAndDrop('gradeDropZone', 'gradeQuestFile');
    dragElement(document.getElementById("floatingTimer"));
    renderStreak(); // 잔디 심기 로드
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
        'dashboard': '<i class="fa-solid fa-network-wired"></i> 단원별 지식 맵',
        'archive': '<i class="fa-solid fa-box-archive"></i> 내 기록 보관함',
        'training': '<i class="fa-solid fa-dumbbell"></i> 실전 멘탈 훈련소',
        'unified': '<i class="fa-solid fa-layer-group"></i> 단권화 & 모의고사 생성'
    };
    document.getElementById('pageTitleText').innerHTML = titles[pageId] || '';

    // 메뉴 이동 시 필요한 데이터 동적 로드
    if(pageId === 'dashboard') { renderKnowledgeTree(); renderStreak(); }
    if(pageId === 'archive') { loadHistory(); }
    if(pageId === 'training') { loadTrainingSelection(); }
    if(pageId === 'unified') { loadUnifiedSelection(); }
}

// ==========================================
// 2. 아이패드 완벽 지원 위젯 드래그
// ==========================================
function dragElement(elmnt) {
    if(!elmnt) return;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var handle = elmnt.querySelector(".widget-drag-handle") || elmnt;
    
    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragTouchStart;

    function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
    function dragTouchStart(e) { e = e || window.event; pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; document.ontouchend = closeDragElement; document.ontouchmove = elementTouchDrag; }
    
    function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; }
    function elementTouchDrag(e) { e = e || window.event; pos1 = pos3 - e.touches[0].clientX; pos2 = pos4 - e.touches[0].clientY; pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; document.ontouchend = null; document.ontouchmove = null; }
}

// ==========================================
// 3. 오디오 및 타이머 (iOS 차단 우회)
// ==========================================
let timerInterval; let timeLeft = 25 * 60; let isTimerRunning = false;
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').innerText = `${m}:${s}`;
}
function startTimer() { if(!isTimerRunning) { isTimerRunning = true; timerInterval = setInterval(() => { if(timeLeft > 0) { timeLeft--; updateTimerDisplay(); } else { pauseTimer(); alert("학습 세션 완료!"); } }, 1000); } }
function pauseTimer() { clearInterval(timerInterval); isTimerRunning = false; }
function resetTimer() { pauseTimer(); timeLeft = 25 * 60; updateTimerDisplay(); }

let bgmAudio = null; let isBgmPlaying = false;
function toggleBGM() {
    const btn = document.getElementById('bgmBtn');
    if(!bgmAudio) { bgmAudio = new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3"); bgmAudio.loop = true; }
    if(isBgmPlaying) { bgmAudio.pause(); isBgmPlaying = false; btn.classList.remove('playing'); btn.innerHTML = '<i class="fa-solid fa-cloud-rain"></i> 집중 빗소리'; } 
    else { bgmAudio.play().catch(e=>console.log("재생 실패", e)); isBgmPlaying = true; btn.classList.add('playing'); btn.innerHTML = '<i class="fa-solid fa-pause"></i> 재생 중지'; }
}

let isTTSPlaying = false;
function toggleTTS(elementId, btnId) {
    const btn = document.getElementById(btnId);
    if(isTTSPlaying || window.speechSynthesis.speaking) { 
        window.speechSynthesis.cancel(); isTTSPlaying = false; btn.classList.remove('active'); 
        btn.innerHTML = '<i class="fa-solid fa-headphones"></i> 소리내어 읽기'; return; 
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
            isTTSPlaying = false; btn.classList.remove('active'); btn.innerHTML = '<i class="fa-solid fa-headphones"></i> 소리내어 읽기'; return;
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
// 4. 유틸리티 (암기모드, 복사, 드래그앤드롭, OMR)
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
    const preview = document.getElementById(previewId);
    if (file) {
        preview.style.display = 'block';
        preview.style.background = 'var(--accent-blue)';
        preview.innerHTML = `[첨부됨] ${file.name}`;
    }
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
        btn.dataset.cloze = 'true'; btn.classList.add('active'); btn.innerHTML = '<i class="fa-solid fa-eye"></i> 빈칸 끄기';
    } else {
        strongTags.forEach(el => { el.style.background = ''; el.style.color = ''; el.onclick = null; });
        btn.dataset.cloze = 'false'; btn.classList.remove('active'); btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> 빈칸 암기';
    }
}

let currentRawMarkdown = ""; 
function copyNotionMarkdown(elementId) {
    if(!currentRawMarkdown) return alert("복사할 내용이 없습니다.");
    navigator.clipboard.writeText(currentRawMarkdown).then(() => alert("텍스트가 클립보드에 복사되었습니다."));
}

let userAnswers = {}; 
function renderOMR() {
    const container = document.getElementById('visualOMR'); if(!container) return;
    let html = '';
    for(let i=1; i<=20; i++) {
        html += `<div class="omr-row"><div style="font-weight:bold; width:25px;">${i}.</div><div style="display:flex; gap:10px;">`;
        for(let j=1; j<=5; j++) html += `<div class="omr-bubble" onclick="selectOMR(${i}, ${j})" id="omr-q${i}-c${j}">${j}</div>`;
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
function clearOMR() { userAnswers = {}; for(let i=1; i<=20; i++) for(let j=1; j<=5; j++) { let b=document.getElementById(`omr-q${i}-c${j}`); b.style.background='transparent'; b.style.color='var(--text-sub)'; b.style.borderColor='var(--border-soft)'; } document.getElementById('omrAnswers').value = ''; }

// ==========================================
// 5. Gemini AI 코어 엔진
// ==========================================
const formattingRules = `
[마크다운 필수 규칙]
1. 하이픈(-) 절대 금지. 리스트는 별표(*)나 숫자 사용.
2. 수식은 무조건 $$수식$$ 형태만 사용. 단일 $ 사용 금지.
3. 표(Table) 작성 시 가독성을 위해 내용이 길어지지 않게 쪼갤 것. 중요어 앞 2글자 **볼드체** 처리.`;

async function callGeminiAPI(apiKey, prompt, files = [], loaderId = null) {
    let requestParts = [{ text: prompt }];
    files.forEach(f => requestParts.push({ inlineData: { data: f.data, mimeType: f.mimeType } }));
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { temperature: 0.7 } }) };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, options);
        if (!response.ok) throw new Error("구글 AI 서버 통신 에러 (API Key 확인 필요)");
        const data = await response.json(); 
        if(data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (e) { throw e; }
}

let currentContext = ""; 

async function executeAI(mode, subMode) {
    if(window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("좌측 하단 설정에서 API Key를 입력하세요.");

    const loaderId = mode + 'Loader'; const resultWrapper = document.getElementById(mode + 'ResultWrapper'); const resultBox = document.getElementById(mode + 'Result');
    document.getElementById(loaderId).style.display = 'block'; resultWrapper.style.display = 'none';

    let prompt = ""; let filesToProcess = []; let title = ""; let tags = [];

    try {
        if (mode === 'concept') {
            const inputPrompt = document.getElementById('conceptPrompt').value;
            const file = document.getElementById('conceptFile').files[0];
            const formatChoice = document.getElementById('conceptFormat').value; 
            const rawTags = document.getElementById('conceptTags').value;
            if (!inputPrompt && !file) throw new Error("분석할 텍스트나 파일이 필요합니다.");
            if (file) filesToProcess.push(await fileToBase64(file));
            
            let styleIns = formatChoice === "cornell" ? "2열 표(Table) 형식" : formatChoice === "bullet" ? "개조식" : "AI 자동 판단";
            prompt = `[자료]: ${inputPrompt}\n[레이아웃]: ${styleIns}\n자료를 깊이 있게 분석하여 요약 노트를 작성하세요. [🚨 출제자 오답 패턴 경고] 포함.\n${formattingRules}`;
            title = `[개념 요약] ${rawTags || '노트'}`;
            tags = rawTags.split(',').map(t=>t.trim()).filter(t=>t);
        }
        else if (mode === 'grading') {
            const qFile = document.getElementById('gradeQuestFile').files[0];
            const omrInput = document.getElementById('omrAnswers').value;
            const rawTags = document.getElementById('gradeTags').value;
            if (!qFile) throw new Error("문제지 파일을 첨부해주세요.");
            filesToProcess.push(await fileToBase64(qFile));
            
            if (subMode === 'score') {
                if (!omrInput) throw new Error("OMR 마킹을 입력해주세요.");
                prompt = `[학생 답안]: ${omrInput}\n채점 결과와 오답 상세 해설을 제공하세요.\n${formattingRules}`;
                title = `[오답 해설] 모의고사`;
            } else {
                prompt = `이 시험지에서 틀릴 확률이 가장 높은 핵심 개념 3개만 추출하여 초압축 노트를 작성하세요.\n${formattingRules}`;
                title = `[초압축 노트] 약점 대비`;
            }
            tags = rawTags.split(',').map(t=>t.trim()).filter(t=>t);
        }

        const aiText = await callGeminiAPI(apiKey, prompt, filesToProcess, loaderId);
        currentContext = aiText; currentRawMarkdown = aiText; 
        
        resultBox.innerHTML = marked.parse(aiText);
        resultBox.querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });

        resultWrapper.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([resultBox]);
        
        saveHistory(title, tags, aiText);
        markStreak();

    } catch (error) { 
        resultBox.innerHTML = `<div style="color:var(--accent-danger); font-weight:bold; padding:20px;">🚨 에러: ${error.message}</div>`; 
        resultWrapper.style.display = 'block'; 
    } 
    finally { document.getElementById(loaderId).style.display = 'none'; }
}

async function askTutor(mode) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("API Key를 입력해주세요!");
    const inputField = document.getElementById('chatInput' + (mode === 'concept' ? 'Concept' : 'Grade'));
    const chatBox = document.getElementById('chatBox' + (mode === 'concept' ? 'Concept' : 'Grade'));
    const question = inputField.value.trim();
    if (!question) return;

    chatBox.innerHTML += `<div class="chat-msg msg-user">${question}</div>`; inputField.value = ""; chatBox.scrollTop = chatBox.scrollHeight;
    const loadingId = "load-" + Date.now(); 
    chatBox.innerHTML += `<div class="chat-msg msg-ai" id="${loadingId}">답변 작성 중...</div>`;
    
    const prompt = `[학습 자료]:\n${currentContext}\n\n[학생 질문]: ${question}\n위 자료 맥락 안에서 답변하세요.\n${formattingRules}`;

    try {
        const answerText = await callGeminiAPI(apiKey, prompt, []);
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="chat-msg msg-ai">${marked.parse(answerText)}</div>`;
        if (window.MathJax) MathJax.typesetPromise([chatBox]);
    } catch (error) { document.getElementById(loadingId).remove(); chatBox.innerHTML += `<div style="color:var(--accent-danger);">에러 발생</div>`; }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================================
// 6. 기록 보관함, 잔디 심기, 마인드맵
// ==========================================
function markStreak() {
    let streaks = JSON.parse(localStorage.getItem('studyStreak') || '{}');
    const today = new Date().toISOString().split('T')[0];
    streaks[today] = true;
    localStorage.setItem('studyStreak', JSON.stringify(streaks));
    renderStreak();
}

function renderStreak() {
    let streaks = JSON.parse(localStorage.getItem('studyStreak') || '{}');
    const grid = document.getElementById('streakGrid');
    if(!grid) return;
    let html = '';
    for(let i=29; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate() - i);
        let dateStr = d.toISOString().split('T')[0];
        let bgClass = streaks[dateStr] ? 'streak-box active' : 'streak-box';
        html += `<div class="${bgClass}" title="${dateStr}"></div>`;
    }
    grid.innerHTML = html;
}

function saveHistory(title, tags, content) {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    history.unshift({ id: Date.now(), title: title, tags: tags, content: content });
    if (history.length > 50) history.pop(); // 최근 50개 유지
    localStorage.setItem('cozyArchive', JSON.stringify(history));
}

function loadHistory() {
    const list = document.getElementById('historyList');
    if(!list) return;
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    if (history.length === 0) { list.innerHTML = "<div style='color:var(--text-sub);'>저장된 기록이 없습니다.</div>"; return; }
    
    list.innerHTML = history.map(item => {
        let tagsHtml = (item.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join('');
        return `
        <div class="archive-item" onclick="viewHistory(${item.id})">
            <div>
                <div class="archive-title">${item.title}</div>
                <div>${tagsHtml}</div>
            </div>
            <button style="background:transparent; border:none; color:var(--accent-danger); cursor:pointer; padding:5px;" onclick="deleteHistory(${item.id}, event)"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');
}

function deleteHistory(id, event) {
    event.stopPropagation();
    if(!confirm("이 노트를 삭제하시겠습니까?")) return;
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    history = history.filter(h => h.id !== id);
    localStorage.setItem('cozyArchive', JSON.stringify(history));
    loadHistory(); renderKnowledgeTree(); loadUnifiedSelection(); loadTrainingSelection();
}

function filterHistory() {
    const query = document.getElementById('archiveSearch').value.toLowerCase();
    const items = document.querySelectorAll('#historyList .archive-item');
    items.forEach(item => { item.style.display = item.innerText.toLowerCase().includes(query) ? 'flex' : 'none'; });
}

function viewHistory(id) {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    const item = history.find(h => h.id === id);
    if (item) {
        navTo('concept'); // 뷰어로 이동
        document.getElementById('conceptResult').innerHTML = marked.parse(item.content);
        document.getElementById('conceptResult').querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });
        document.getElementById('conceptResultWrapper').style.display = 'block';
        currentContext = item.content; currentRawMarkdown = item.content;
        if (window.MathJax) MathJax.typesetPromise([document.getElementById('conceptResult')]);
        window.scrollTo({ top: 0 });
    }
}

function renderKnowledgeTree() {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    let treeContainer = document.getElementById('mermaidTree');
    if(!treeContainer) return;
    if (history.length === 0) return treeContainer.innerHTML = "<div style='color:var(--text-sub);'>지식 맵을 구성할 데이터가 없습니다.</div>";
    let graphDef = "graph TD\n Root((지식 코어))";
    history.forEach((item, index) => { 
        let safeTitle = item.title.replace(/["()]/g, '').substring(0,15);
        graphDef += `\n Root --> node_${index}("${safeTitle}")`; 
    });
    treeContainer.innerHTML = `<div class="mermaid">${graphDef}</div>`;
    mermaid.init(undefined, document.querySelectorAll('.mermaid'));
}

// ==========================================
// 7. 단권화 및 모의고사 병합 모듈
// ==========================================
function loadSelectionList(containerId, isRadio = false) {
    const list = document.getElementById(containerId);
    if(!list) return;
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    if (history.length === 0) return list.innerHTML = "<div style='padding:10px; color:var(--text-sub);'>선택할 노트가 없습니다.</div>";
    const inputType = isRadio ? 'radio' : 'checkbox';
    const nameAttr = isRadio ? 'name="trainingSel"' : '';
    list.innerHTML = history.map(item => `
        <label style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--border-soft); cursor:pointer;">
            <input type="${inputType}" ${nameAttr} class="${containerId}-checkbox" value="${item.id}" style="width:18px; height:18px;">
            <span style="font-weight:600;">${item.title}</span>
        </label>`).join('');
}
function loadUnifiedSelection() { loadSelectionList('unifiedSelectionList', false); }
function loadTrainingSelection() { loadSelectionList('trainingSelectionList', true); }

async function executeUnifiedNote(type) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("API Key를 입력해주세요!");
    
    const checkboxes = document.querySelectorAll('.unifiedSelectionList-checkbox:checked');
    if (checkboxes.length === 0) return alert("병합할 노트를 1개 이상 체크해주세요.");

    const loaderId = 'unifiedLoader'; const resultWrapper = document.getElementById('unifiedResultWrapper'); const resultBox = document.getElementById('unifiedResult');
    document.getElementById(loaderId).style.display = 'block'; resultWrapper.style.display = 'none';

    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    let mergedContent = ""; 
    checkboxes.forEach(cb => { const item = history.find(h => h.id == cb.value); if(item) mergedContent += `\n\n[자료]: ${item.content}`; });

    let prompt = "", coverHtml = "";
    if (type === 'book') { 
        prompt = `여러 노트 내용을 유기적으로 연결하여 하나의 '단권화 마스터 노트'로 병합 작성하세요.\n${mergedContent}\n${formattingRules}`; 
        coverHtml = `<div class="book-cover"><h1 style="font-size:2rem; font-weight:900;">단권화 병합 노트</h1></div>`; 
    } else if (type === 'exam') { 
        prompt = `제공된 자료들을 바탕으로 '실전 모의고사'를 출제하세요. (정답과 해설은 반드시 맨 아래에 배치)\n${mergedContent}\n${formattingRules}`; 
        coverHtml = `<div class="mock-exam-title">실전 모의고사</div>`; 
    } else {
        prompt = `제공된 여러 자료의 개념들을 교묘하게 엮어서 수능형 '다단원 융합 고난도 킬러 문항' 1문제를 출제하고 상세히 해설하세요.\n${mergedContent}\n${formattingRules}`; 
        coverHtml = `<div class="book-cover" style="background:var(--bg-body);"><h1 style="font-size:1.8rem; font-weight:900; color:var(--accent-danger);">융합 고난도 킬러 문항</h1></div>`;
    }

    try {
        const aiText = await callGeminiAPI(apiKey, prompt, [], loaderId);
        resultBox.innerHTML = coverHtml + `<div>` + marked.parse(aiText) + `</div>`;
        
        resultBox.querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });

        resultWrapper.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([resultBox]);
        saveHistory(`[저장] ${type === 'book' ? '단권화' : type === 'exam' ? '모의고사' : '고난도 융합'}`, [], aiText);
    } catch (error) { 
        resultBox.innerHTML = `<div style="color:var(--accent-danger); font-weight:bold;">🚨 에러 발생: ${error.message}</div>`; 
        resultWrapper.style.display = 'block'; 
    } 
    finally { document.getElementById(loaderId).style.display = 'none'; }
}

// ==========================================
// 🔥 실전 멘탈 훈련소 (베타 3종 완벽 연동 로직)
// ==========================================
let trainingAnswerCache = "";
let currentTrainingContext = "";

async function startTraining(type) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("좌측 하단 설정에서 API Key를 먼저 입력해주세요!");
    
    const selected = document.querySelector('.trainingSelectionList-checkbox:checked');
    if (!selected) return alert("훈련할 노트를 1개 체크해주세요.");

    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    const item = history.find(h => h.id == selected.value);
    if (!item) return;

    currentTrainingContext = item.content; // 훈련 데이터 캐싱
    
    // 모달창 UI 초기화
    const modal = document.getElementById('trainingModal');
    const playArea = document.getElementById('trainingPlayArea');
    const answerArea = document.getElementById('trainingAnswerArea');
    const loader = document.getElementById('trainingLoader');
    const titleEl = document.getElementById('trainingModalTitle');

    modal.style.display = 'flex';
    playArea.style.display = 'none';
    answerArea.style.display = 'none';
    loader.style.display = 'block';

    let prompt = "";

    try {
        if (type === 'ox') {
            titleEl.innerHTML = '<i class="fa-solid fa-gamepad"></i> 오답 선지 OX 훈련';
            prompt = `[자료]\n${item.content}\n\n위 자료에서 핵심 개념을 꼬아놓은 O/X 문제 5개를 출제하세요.\n[조건] 문제만 먼저 작성하고, '====ANSWER====' 라는 구분선을 넣은 뒤, 그 아래에 정답과 해설을 적으세요.\n${formattingRules}`;
            
            const aiText = await callGeminiAPI(apiKey, prompt, []);
            const parts = aiText.split('====ANSWER====');
            playArea.innerHTML = `
                <div style="font-size:1.05rem; line-height:1.8;">${marked.parse(parts[0] ? parts[0].trim() : "출제 오류")}</div>
                <button id="trainingConfirmBtn" class="btn-primary" style="background:var(--accent-special); margin-top:30px;" onclick="revealTrainingAnswer()">정답 및 해설 확인</button>`;
            trainingAnswerCache = parts[1] ? parts[1].trim() : "해설 데이터가 없습니다.";
        } 
        else if (type === 'blank') {
            titleEl.innerHTML = '<i class="fa-solid fa-eraser"></i> 백지 복습 (메타인지)';
            prompt = `[자료]\n${item.content}\n\n위 자료를 바탕으로 흐름이 이어지는 긴 요약 지문을 작성하되, 가장 중요한 핵심어 10개를 골라 '[ 빈칸 ]' 으로 뚫어놓으세요.\n[조건] 지문 작성 후 '====ANSWER====' 구분선을 넣고, 아래에 빈칸에 들어갈 정답 10개를 순서대로 적으세요.\n${formattingRules}`;
            
            const aiText = await callGeminiAPI(apiKey, prompt, []);
            const parts = aiText.split('====ANSWER====');
            playArea.innerHTML = `
                <p style="color:var(--text-sub); margin-bottom:15px;"><i class="fa-solid fa-circle-info"></i> 빈칸에 들어갈 단어를 머릿속으로 떠올려보거나 종이에 적어보세요.</p>
                <div style="font-size:1.05rem; line-height:1.8; background:var(--bg-body); padding:20px; border-radius:12px;">${marked.parse(parts[0] ? parts[0].trim() : "출제 오류")}</div>
                <button id="trainingConfirmBtn" class="btn-primary" style="background:var(--accent-blue); margin-top:30px;" onclick="revealTrainingAnswer()">채점하기 (정답 확인)</button>`;
            trainingAnswerCache = parts[1] ? parts[1].trim() : "정답 데이터가 없습니다.";
        }
        else if (type === 'trap') {
            titleEl.innerHTML = '<i class="fa-solid fa-skull"></i> 함정 출제자 빙의';
            // 함정 훈련은 사용자가 직접 타이핑해야 하므로 AI 호출 없이 바로 화면을 띄웁니다.
            loader.style.display = 'none';
            playArea.style.display = 'block';
            playArea.innerHTML = `
                <p style="margin-bottom:15px; font-weight:600;">선택한 자료의 내용을 바탕으로, 친구들이 완벽하게 속아 넘어갈 만한 '교묘한 오답 선지(함정)'를 직접 하나 만들어보세요.</p>
                <textarea id="trapInput" rows="3" style="width:100%; padding:15px; border-radius:10px; border:1px solid var(--border-soft); margin-bottom:15px; font-family:inherit;" placeholder="여기에 직접 만든 함정 선지를 입력하세요..."></textarea>
                <button id="trainingConfirmBtn" class="btn-primary" style="background:var(--accent-danger);" onclick="evaluateTrap()">AI 출제위원에게 평가받기</button>`;
            return; 
        }
        else if (type === 'chain') {
            titleEl.innerHTML = '<i class="fa-solid fa-link"></i> 개념 짝맞추기 퀴즈';
            prompt = `[자료]\n${item.content}\n\n위 자료에서 핵심 개념 5개와 그에 대한 설명을 추출하세요. 개념어 목록과 설명 목록의 순서를 뒤죽박죽으로 무작위로 섞어서 제시하세요.\n[조건] 사용자가 속으로 짝을 맞춰볼 수 있도록 제시한 후, '====ANSWER====' 구분선 아래에 올바르게 짝지어진 정답을 적어주세요.\n${formattingRules}`;
            
            const aiText = await callGeminiAPI(apiKey, prompt, []);
            const parts = aiText.split('====ANSWER====');
            playArea.innerHTML = `
                <p style="color:var(--text-sub); margin-bottom:15px;"><i class="fa-solid fa-circle-info"></i> 제시된 개념과 올바른 설명을 선으로 연결하듯 짝지어 보세요.</p>
                <div style="font-size:1.05rem; line-height:1.8; background:var(--bg-body); padding:20px; border-radius:12px;">${marked.parse(parts[0] ? parts[0].trim() : "출제 오류")}</div>
                <button id="trainingConfirmBtn" class="btn-primary" style="background:var(--text-main); margin-top:30px;" onclick="revealTrainingAnswer()">올바른 짝 확인하기</button>`;
            trainingAnswerCache = parts[1] ? parts[1].trim() : "정답 데이터가 없습니다.";
        }

        // 공통 마무리 (마크다운 수식 렌더링)
        loader.style.display = 'none';
        playArea.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([playArea]);

    } catch(error) { 
        loader.style.display = 'none'; 
        playArea.style.display = 'block'; 
        playArea.innerHTML = `<div style="color:var(--accent-danger); font-weight:bold;">🚨 에러 발생: ${error.message}</div>`; 
    }
}

// 🎯 함정 출제 기능의 '평가받기' 전용 로직
async function evaluateTrap() {
    const apiKey = document.getElementById('sysApiKey').value;
    const trapInput = document.getElementById('trapInput').value.trim();
    if(!trapInput) return alert("함정 선지를 입력해주세요!");

    const loader = document.getElementById('trainingLoader');
    const answerArea = document.getElementById('trainingAnswerArea');
    
    loader.style.display = 'block';
    loader.innerHTML = '<div class="spinner"></div>AI 출제위원이 제출하신 함정을 날카롭게 분석 중입니다...';
    document.getElementById('trainingConfirmBtn').style.display = 'none';

    const prompt = `[학습 자료]\n${currentTrainingContext}\n\n[학생이 직접 만든 함정 선지]\n"${trapInput}"\n\n[지시사항]\n학생이 만든 위 선지가 '매력적인 오답'으로서 얼마나 교묘하고 훌륭한지, 혹은 어떤 부분이 뻔하거나 엉성한지 출제위원의 관점에서 날카롭게 평가(팩트폭격) 해주세요.\n${formattingRules}`;

    try {
        const aiText = await callGeminiAPI(apiKey, prompt, []);
        loader.style.display = 'none';
        answerArea.style.display = 'block';
        answerArea.innerHTML = `<h3 style="color:var(--accent-danger); margin-bottom:10px;"><i class="fa-solid fa-magnifying-glass"></i> AI 출제위원의 평가 결과</h3><div style="font-size:1.05rem; line-height:1.8;">${marked.parse(aiText)}</div>`;
        if (window.MathJax) MathJax.typesetPromise([answerArea]);
        markStreak(); // 함정 평가받아도 잔디 심기
    } catch(error) {
        loader.style.display = 'none';
        answerArea.style.display = 'block';
        answerArea.innerHTML = `<div style="color:var(--accent-danger); font-weight:bold;">평가 중 오류 발생: ${error.message}</div>`;
        document.getElementById('trainingConfirmBtn').style.display = 'block';
    }
}

function revealTrainingAnswer() {
    const answerArea = document.getElementById('trainingAnswerArea');
    answerArea.style.display = 'block';
    answerArea.innerHTML = marked.parse(trainingAnswerCache);
    document.getElementById('trainingConfirmBtn').style.display = 'none';
    if (window.MathJax) MathJax.typesetPromise([answerArea]);
    markStreak(); // 정답 확인 시 잔디 심기
}

function closeTrainingModal() { 
    document.getElementById('trainingModal').style.display = 'none'; 
}
