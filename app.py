import streamlit as st
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai

# 웹사이트 기본 설정 (전체 화면 넓게 쓰기, 제목 설정)
st.set_page_config(page_title="AI 맞춤형 시험지 생성기", page_icon="📝", layout="wide")

st.title("📝 AI 맞춤형 시험지 생성기 (v2.0)")
st.write("시험 범위 텍스트나 참고할 웹사이트 링크를 분석하여, 원하는 유형의 문제를 완벽한 한국어로 자동 출제합니다.")

# 사이드바: AI를 사용하기 위한 API 키 입력란
with st.sidebar:
    st.header("⚙️ 기본 설정")
    st.write("문제를 생성하려면 Google Gemini API 키가 필요합니다.")
    api_key = st.text_input("API 키를 입력하세요", type="password")
    st.markdown("[무료 API 키 발급받기](https://aistudio.google.com/)")

st.markdown("---")

# 1. 프롬프트 입력창 (어떤 문제를 원하는지 상세히 적는 곳)
st.subheader("1. 출제 지시사항 (프롬프트)")
prompt = st.text_area(
    "어떤 과목, 어떤 유형의 문제를 만들고 싶으신가요?", 
    placeholder="예: 공통수학1 다항식의 연산 개념을 묻는 객관식 3문제와 서술형 1문제를 만들어줘. 혹은, 아래 링크의 국어 문학 지문을 분석해서 수능형 문제 2개를 출제해 줘.",
    height=100
)

# 2. 링크 입력창
st.subheader("2. 참고 자료 링크 (선택사항)")
url = st.text_input(
    "문제를 출제할 때 참고할 웹사이트 주소가 있다면 입력하세요 (위키백과, 뉴스 기사, 블로그 등)", 
    placeholder="https://..."
)

# 3. 문제 생성 버튼 및 실행 로직
if st.button("🚀 시험지 생성 시작 (클릭)"):
    # 필수 입력값 확인
    if not api_key:
        st.error("👈 왼쪽 사이드바에서 API 키를 먼저 입력해 주세요!")
    elif not prompt:
        st.warning("어떤 문제를 출제할지 지시사항(프롬프트)을 입력해 주세요.")
    else:
        # 진행 중 애니메이션 표시
        with st.spinner("AI가 자료를 분석하고 완벽한 한글 시험지를 출제하고 있습니다... 잠시만 기다려주세요 ⏳"):
            try:
                # API 키 설정
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-pro') # 최신 고성능 모델 사용

                context_text = ""
                # URL이 입력되었다면 해당 사이트의 텍스트를 읽어옴
                if url:
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    response = requests.get(url, headers=headers)
                    soup = BeautifulSoup(response.text, 'html.parser')
                    # 쓸데없는 태그를 제외하고 본문 텍스트만 추출 (최대 5000자 제한)
                    context_text = soup.get_text(separator=' ', strip=True)[:5000] 

                # AI에게 전달할 최종 명령서 작성
                full_prompt = f"당신은 최고의 시험 출제 위원입니다. 다음 지시사항에 따라 문제를 출제해 주세요.\n\n[지시사항]\n{prompt}\n"
                
                if context_text:
                    full_prompt += f"\n[참고 자료 텍스트]\n{context_text}\n"
                
                full_prompt += "\n[조건]\n1. 반드시 자연스럽고 완벽한 한국어로 작성할 것.\n2. 문제, 정답, 그리고 상세한 해설을 명확하게 구분해서 출력할 ��.\n3. 보기 좋게 마크다운(Markdown) 형식을 사용하여 정리할 것."

                # AI에게 질문 던지고 답변 받기
                response = model.generate_content(full_prompt)
                
                # 결과 출력
                st.success("✅ 맞춤형 시험지 생성이 완료되었습니다!")
                st.markdown("---")
                
                # 생성된 문제를 화면에 깔끔하게 표시
                st.markdown(response.text)
                
            except Exception as e:
                # 에러 발생 시 처리
                st.error(f"문제를 생성하는 도중 오류가 발생했습니다. 링크나 API 키를 다시 확인해 주세요.\n\n상세 오류: {e}")
