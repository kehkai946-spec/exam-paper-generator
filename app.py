import streamlit as st
import requests
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Page config
st.set_page_config(
    page_title="Exam Paper Generator",
    page_icon="📝",
    layout="wide"
)

# 1. 웹사이트 제목 설정
st.title("📝 나만의 자동 시험지 생성기 (v1.0)")
st.write("시험 범위 텍스트나 참고할 링크를 입력하면 문제를 만들어줍니다.")

# Sidebar for API configuration
with st.sidebar:
    st.header("⚙️ 설정")
    api_provider = st.selectbox(
        "AI 모델 선택",
        ["OpenAI (GPT-4)", "Claude (Anthropic)", "로컬 테스트 모드"]
    )
    
    if api_provider != "로컬 테스트 모드":
        api_key = st.text_input("API Key 입력", type="password")

# 2. 프롬프트(텍스트) 입력창 만들기
st.subheader("1. 시험 범위 및 프롬프트 입력")
user_prompt = st.text_area(
    "어떤 문제를 만들고 싶나요?", 
    placeholder="예: 아래 링크의 내용에서 객관식 3문제, 서술형 1문제를 출제해 줘.",
    height=150
)

# 3. 링크(URL) 입력창 만들기
st.subheader("2. 참고할 웹사이트 링크 입력")
user_link = st.text_input(
    "URL을 입력하세요", 
    placeholder="https://example.com"
)

# 4. 추가 옵션
st.subheader("3. 문제 생성 옵션")
col1, col2, col3 = st.columns(3)
with col1:
    num_questions = st.number_input("총 문제 개수", min_value=1, max_value=20, value=5)
with col2:
    difficulty = st.selectbox("난이도", ["쉬움", "중간", "어려움"])
with col3:
    question_type = st.multiselect(
        "문제 유형",
        ["객관식", "서술형", "단답형", "참/거짓"],
        default=["객관식", "서술형"]
    )

# 5. 실행 버튼 만들기
if st.button("🚀 시험지 생성하기", use_container_width=True):
    # 버튼을 눌렀을 때 실행될 동작
    if user_prompt or user_link:
        st.success("입력 정보가 성공적으로 전달되었습니다!")
        
        # 입력받은 내용 화면에 보여주기
        st.write("### 📌 입력된 데이터 확인")
        st.write(f"- **프롬프트:** {user_prompt}")
        if user_link:
            st.markdown(f"- **링크:** [{user_link}]({user_link})")
        st.write(f"- **문제 개수:** {num_questions}")
        st.write(f"- **난이도:** {difficulty}")
        st.write(f"- **문제 유형:** {', '.join(question_type)}")
        
        # 웹사이트 내용 추출 시도
        if user_link:
            try:
                st.info("🔄 웹사이트에서 내용을 가져오는 중...")
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(user_link, headers=headers, timeout=10)
                response.encoding = 'utf-8'
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    text = soup.get_text()
                    lines = (line.strip() for line in text.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = ' '.join(chunk for chunk in chunks if chunk)
                    
                    with st.expander("📄 추출된 웹사이트 내용"):
                        st.text(text[:1000] + "..." if len(text) > 1000 else text)
                else:
                    st.error(f"웹사이트 접근 실패 (상태 코드: {response.status_code})")
            except Exception as e:
                st.error(f"❌ 웹사이트 접근 오류: {str(e)}")
        
        # AI 처리 시뮬레이션
        st.subheader("🤖 생성된 시험지")
        
        if api_provider == "로컬 테스트 모드":
            # 테스트 모드: 샘플 문제 생성
            st.info("테스트 모드로 샘플 문제를 생성합니다.")
            
            sample_questions = [
                {
                    "number": 1,
                    "type": "객관식",
                    "question": "이 문제는 테스트 문제입니다. 실제 AI 모델을 연동하면 자동으로 생성됩니다.",
                    "options": ["선택지 1", "선택지 2", "선택지 3", "선택지 4"],
                    "answer": "선택지 1"
                },
                {
                    "number": 2,
                    "type": "서술형",
                    "question": "다음을 설명하시오.",
                    "answer": "(모델 연동 후 자동 생성됨)"
                }
            ]
            
            for q in sample_questions[:num_questions]:
                with st.container(border=True):
                    st.write(f"**문제 {q['number']} [{q['type']}]**")
                    st.write(q['question'])
                    
                    if q['type'] == "객관식":
                        for i, option in enumerate(q['options'], 1):
                            st.write(f"  {i}. {option}")
                    elif q['type'] == "서술형":
                        st.write(f"*답:* {q['answer']}")
        else:
            st.warning("🔑 API Key를 입력하고 다시 시도해주세요.")
            st.info("현재는 로컬 테스트 모드만 지원합니다. 곧 OpenAI와 Claude 연동이 추가될 예정입니다.")
    else:
        st.warning("⚠️ 프롬프트나 링크를 하나 이상 입력해 주세요.")

# 6. Footer
st.divider()
st.caption("📚 나만의 자동 시험지 생성기 v1.0 | OpenAI & Claude 연동 예정")
