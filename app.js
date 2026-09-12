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
    renderStreak(); // 잔디 심기 렌더링
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

    // 탭 이동 시 필요한 데이터 자동 로드
    if(pageId === 'dashboard') { loadHistory(); renderKnowledgeTree(); }
    if(pageId === 'training') loadTrainingSelection();
    if(pageId === 'unified') loadUnifiedSelection();
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
// 3. 오디오 및 타이머 기능
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

let bgmAudio = null; let isBgmPlaying = false;
function toggleBGM() {
    const btn = document.getElementById('bgmBtn');
    if(!bgmAudio) { bgmAudio = new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3"); bgmAudio.loop = true; }
    if(isBgmPlaying) { bgmAudio.pause(); isBgmPlaying = false; btn.classList.remove('playing'); } 
    else { bgmAudio.play().catch(e=>console.log("재생 실패", e)); isBgmPlaying = true; btn.classList.add('playing'); }
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
// 4. 아이패드/굿노트 완벽 연동 PDF 추출 엔진
// ==========================================
async function exportPDF(elementId, fileName) {
    const originalElement = document.getElementById(elementId);
    const loaderId = elementId.replace('Result', 'Loader');
    const loader = document.getElementById(loaderId);
    
    if(loader) { loader.style.display = 'block'; loader.innerHTML = '<div class="spinner"></div>안전하게 PDF를 렌더링 중입니다...'; }

    const noPrints = originalElement.querySelectorAll('.no-print, .toolbar-chips');
    noPrints.forEach(el => el.style.display = 'none');

    const container = document.createElement('div');
    container.appendChild(originalElement.cloneNode(true));
    container.style.position = 'absolute'; container.style.top = '-9999px'; container.style.left = '0';
    container.style.width = '794px'; container.style.padding = '30px';
    container.style.background = '#ffffff'; container.style.color = '#000000';
    
    container.querySelectorAll('table').forEach(t => { t.style.width = '100%'; t.style.tableLayout = 'fixed'; t.style.wordBreak = 'break-all'; });
    document.body.appendChild(container);

    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, windowWidth: 794, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
        } else {
            await html2pdf().set(opt).from(container).save();
        }
    } catch (error) {
        console.error(error); alert("PDF 추출 중 오류가 발생했습니다.");
    } finally {
        document.body.removeChild(container);
        noPrints.forEach(el => el.style.display = '');
        if(loader) loader.style.display = 'none';
    }
}

// ==========================================
// 5. 유틸리티 (암기모드, 파일처리, 노션복사, OMR)
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
        btn.dataset.cloze = 'true'; btn.classList.add('active'); btn.innerHTML = '<i class="fa-solid fa-eye"></i> 빈칸 끄기';
    } else {
        strongTags.forEach(el => { el.style.background = ''; el.style.color = ''; el.onclick = null; });
        btn.dataset.cloze = 'false'; btn.classList.remove('active'); btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> 빈칸 암기';
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
function clearOMR() { userAnswers = {}; for(let i=1; i<=20; i++) for(let j=1; j<=5; j++) { let b=document.getElementById(`omr-q${i}-c${j}`); b.style.background='transparent'; b.style.color='var(--text-sub)'; b.style.borderColor='var(--border-soft)'; } document.getElementById('omrAnswers').value = ''; }

// ==========================================
// 6. Gemini AI 코어 엔진 및 주요 기능
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
        if (!response.ok) throw new Error("구글 AI 서버 연결 실패. API Key를 확인해주세요.");
        const data = await response.json(); 
        if(data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (e) { throw e; }
}

let currentContext = ""; 

async function executeAI(mode, subMode) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("좌측 하단 메뉴에서 Gemini API Key를 입력하세요.");

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
                prompt = `이 시험지에서 가장 틀리기 쉬운 핵심 개념 3가지만 추출하여 초압축 노트를 작성하세요.\n${formattingRules}`;
                title = `[약점 대비] 초압축 노트`;
            }
            tags = rawTags.split(',').map(t=>t.trim()).filter(t=>t);
        }

        const aiText = await callGeminiAPI(apiKey, prompt, filesToProcess, loaderId);
        currentContext = aiText; currentRawMarkdown = aiText; 
        
        resultBox.innerHTML = marked.parse(aiText);
        
        resultBox.querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            wrapper.style.width = '100%'; wrapper.style.overflowX = 'auto'; wrapper.style.WebkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });

        resultWrapper.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([resultBox]);
        
        saveHistory(title, tags, aiText);
        markStreak();

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
    chatBox.innerHTML += `<div class="chat-msg msg-ai" id="${loadingId}" style="background:var(--bg-surface); padding:10px; border-radius:12px; align-self:flex-start; border:1px solid var(--border-soft);">답변 작성 중...</div>`;
    
    const prompt = `[학습 자료]:\n${currentContext}\n\n[학생 질문]: ${question}\n위 자료 맥락 안에서 답변하세요.\n${formattingRules}`;

    try {
        const answerText = await callGeminiAPI(apiKey, prompt, []);
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="chat-msg msg-ai" style="background:var(--bg-surface); padding:10px; border-radius:12px; align-self:flex-start; border:1px solid var(--border-soft);">${marked.parse(answerText)}</div>`;
        if (window.MathJax) MathJax.typesetPromise([chatBox]);
    } catch (error) { document.getElementById(loadingId).remove(); chatBox.innerHTML += `<div style="color:red;">에러 발생</div>`; }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================================
// 7. 대시보드 (보관함, 잔디심기, 마인드맵)
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
        let bg = streaks[dateStr] ? 'var(--accent-mint)' : 'transparent';
        let border = streaks[dateStr] ? 'var(--accent-mint)' : 'var(--border-soft)';
        html += `<div style="width:18px; height:18px; border-radius:4px; background:${bg}; border:1px solid ${border};" title="${dateStr}"></div>`;
    }
    grid.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(18px, 1fr)); gap:4px;">${html}</div>`;
}

function saveHistory(title, tags, content) {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    history.unshift({ id: Date.now(), title: title, tags: tags, content: content });
    if (history.length > 50) history.pop();
    localStorage.setItem('cozyArchive', JSON.stringify(history));
}

function loadHistory() {
    const list = document.getElementById('historyList');
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    if (history.length === 0) return list.innerHTML = "<div style='color:var(--text-sub);'>저장된 기록이 없습니다.</div>";
    
    list.innerHTML = history.map(item => {
        let tagsHtml = (item.tags || []).map(t => `<span style="background:var(--bg-body); padding:3px 8px; border-radius:4px; font-size:0.75rem; margin-right:5px; border:1px solid var(--border-soft); color:var(--text-sub);">${t}</span>`).join('');
        return `
        <div style="padding:15px; border:1px solid var(--border-soft); border-radius:10px; margin-bottom:10px; background:var(--bg-surface); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="viewHistory(${item.id})">
            <div>
                <div style="font-weight:700; margin-bottom:4px;">${item.title}</div>
                <div>${tagsHtml}</div>
            </div>
            <button style="background:transparent; border:none; color:#EF4444; padding:5px; cursor:pointer;" onclick="deleteHistory(${item.id}, event)"><i class="fa-solid fa-trash"></i></button>
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

function viewHistory(id) {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    const item = history.find(h => h.id === id);
    if (item) {
        navTo('concept');
        document.getElementById('conceptResult').innerHTML = marked.parse(item.content);
        document.getElementById('conceptResult').querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            wrapper.style.width = '100%'; wrapper.style.overflowX = 'auto'; wrapper.style.WebkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });
        document.getElementById('conceptResultWrapper').style.display = 'block';
        currentContext = item.content; currentRawMarkdown = item.content;
        if (window.MathJax) MathJax.typesetPromise([document.getElementById('conceptResult')]);
        window.scrollTo({ top: 0 });
    }
}

function filterHistory() {
    const query = document.getElementById('archiveSearch').value.toLowerCase();
    const items = document.getElementById('historyList').children;
    Array.from(items).forEach(item => { item.style.display = item.innerText.toLowerCase().includes(query) ? 'flex' : 'none'; });
}

function renderKnowledgeTree() {
    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    let treeContainer = document.getElementById('mermaidTree');
    if (history.length === 0) return treeContainer.innerHTML = "<div style='color:var(--text-sub);'>데이터가 없습니다.</div>";
    let graphDef = "graph TD\n Root((지식 코어))";
    history.forEach((item, index) => { graphDef += `\n Root --> node_${index}("${item.title.substring(0,15)}")`; });
    treeContainer.innerHTML = `<div class="mermaid">${graphDef}</div>`;
    mermaid.init(undefined, document.querySelectorAll('.mermaid'));
}

// ==========================================
// 8. 훈련소 및 단권화 모듈
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
function loadTrainingSelection() { loadSelectionList('trainingSelectionList', true); }
function loadUnifiedSelection() { loadSelectionList('unifiedSelectionList', false); }

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
        prompt = `단권화 병합 노트 작성\n${mergedContent}\n${formattingRules}`; 
        coverHtml = `<div style="text-align:center; padding:100px 20px; background:var(--table-head); border-radius:16px; margin-bottom:30px;"><h1 style="font-size:2rem; font-weight:900;">단권화 노트</h1></div>`; 
    } else { 
        prompt = `실전 모의고사 출제 (정답/해설은 하단에 배치)\n${mergedContent}\n${formattingRules}`; 
        coverHtml = `<div style="text-align:center; font-size:1.8rem; font-weight:900; margin:30px 0; border-bottom:3px solid var(--text-main); padding-bottom:15px;">실전 모의고사</div>`; 
    }

    try {
        const aiText = await callGeminiAPI(apiKey, prompt, [], loaderId);
        resultBox.innerHTML = coverHtml + `<div>` + marked.parse(aiText) + `</div>`;
        
        resultBox.querySelectorAll('table').forEach(table => {
            if (table.parentElement.classList.contains('table-responsive')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
            wrapper.style.width = '100%'; wrapper.style.overflowX = 'auto'; wrapper.style.WebkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
        });

        resultWrapper.style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise([resultBox]);
        saveHistory(`[저장] ${type === 'book' ? '단권화' : '모의고사'}`, [], aiText);
    } catch (error) { 
        resultBox.innerHTML = `<div style="color:red; font-weight:bold;">🚨 에러 발생: ${error.message}</div>`; 
        resultWrapper.style.display = 'block'; 
    } 
    finally { document.getElementById(loaderId).style.display = 'none'; }
}

let oxAnswerCache = "";
async function startTraining(type) {
    const apiKey = document.getElementById('sysApiKey').value;
    if (!apiKey) return alert("API Key를 입력해주세요!");
    
    const selected = document.querySelector('.trainingSelectionList-checkbox:checked');
    if (!selected) return alert("훈련할 노트를 체크해주세요.");

    let history = JSON.parse(localStorage.getItem('cozyArchive') || '[]');
    const item = history.find(h => h.id == selected.value);
    if (!item) return;

    document.getElementById('oxModal').style.display = 'flex';
    document.getElementById('oxPlayArea').style.display = 'none';
    document.getElementById('oxAnswerArea').style.display = 'none';
    document.getElementById('oxLoader').style.display = 'block';

    const prompt = `[오답 선지 OX 훈련] 문제 5개 출제.\n${item.content}\n\n[조건] 중간에 '====ANSWER====' 넣고 그 위엔 문제만, 아래엔 정답/해설 작성.\n${formattingRules}`;
    try {
        const aiText = await callGeminiAPI(apiKey, prompt, []);
        const parts = aiText.split('====ANSWER====');
        document.getElementById('oxLoader').style.display = 'none';
        document.getElementById('oxPlayArea').style.display = 'block';
        document.getElementById('oxQuestionContent').innerHTML = marked.parse(parts[0] ? parts[0].trim() : "출제 오류");
        oxAnswerCache = parts[1] ? parts[1].trim() : "해설 데이터 없음";
    } catch(error) { 
        document.getElementById('oxLoader').style.display = 'none'; 
        document.getElementById('oxPlayArea').style.display = 'block'; 
        document.getElementById('oxQuestionContent').innerHTML = `<div style="color:red; font-weight:bold;">🚨 에러 발생: ${error.message}</div>`; 
    }
}

function revealOXAnswer() {
    document.getElementById('oxAnswerArea').style.display = 'block';
    document.getElementById('oxAnswerContent').innerHTML = marked.parse(oxAnswerCache);
    document.querySelector('#oxPlayArea .btn-primary').style.display = 'none';
    markStreak(); // 훈련 완료 시 잔디 심기
}

function closeOXModal() { 
    document.getElementById('oxModal').style.display = 'none'; 
    const btn = document.querySelector('#oxPlayArea .btn-primary');
    if(btn) btn.style.display = 'block'; 
}
