# 📝 자동 시험지 생성기 (Automatic Exam Paper Generator)

시험 범위 텍스트나 참고할 링크를 입력하면 AI가 자동으로 시험 문제를 생성해주는 웹 애플리케이션입니다.

## ✨ 주요 기능

- 🌐 **웹사이트 내용 자동 추출** - URL을 입력하면 웹페이지의 내용을 자동으로 가져옵니다
- 🤖 **AI 문제 생��** - ChatGPT, Claude 등의 AI 모델을 사용하여 문제를 자동 생성
- 📋 **다양한 문제 유형** - 객관식, 서술형, 단답형, 참/거짓 문제 지원
- 🎯 **난이도 조절** - 쉬움, 중간, 어려움 등 난이도 설정 가능
- 💾 **결과 저장** - 생성된 시험지를 PDF로 다운로드 가능 (준비 중)

## 🚀 설치 및 실행

### 사전 요구사항
- Python 3.8 이상
- pip (Python 패키지 관리자)

### 설치 방법

1. 저장소 클론
```bash
git clone https://github.com/kehkai946-spec/exam-paper-generator.git
cd exam-paper-generator
```

2. 가상 환경 생성 (선택사항)
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 또는
venv\Scripts\activate  # Windows
```

3. 패키지 설치
```bash
pip install -r requirements.txt
```

4. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 열어서 API 키 입력
```

5. 실행
```bash
streamlit run app.py
```

브라우저에서 `http://localhost:8501`로 접속하면 애플리케이션을 사용할 수 있습니다.

## 📖 사용 방법

1. **프롬프트 입력** - 어떤 문제를 만들고 싶은지 입력 (예: "객관식 3문제, 서술형 1문제")
2. **URL 입력** (선택) - 참고할 웹사���트 링크 입력
3. **옵션 설정** - 문제 개수, 난이도, 문제 유형 선택
4. **생성** - "시험지 생성하기" 버튼 클릭
5. **확인** - 생성된 시험 문제 확인 및 다운로드

## 🔧 기술 스택

- **프론트엔드**: Streamlit
- **백엔드**: Python
- **웹 크롤링**: BeautifulSoup, Requests
- **AI 모델**: OpenAI GPT-4, Claude (Anthropic)
- **배포**: Streamlit Cloud / Heroku / Docker

## 📋 프로젝트 구조

```
exam-paper-generator/
├── app.py              # 메인 Streamlit 애플리케이션
├── requirements.txt    # Python 패키지 의존성
├── .env.example        # 환경 변수 예제
├── .gitignore          # Git 무시 파일
└── README.md          # 이 파일
```

## 🌟 향후 계획

- ✅ OpenAI GPT-4 통합
- ✅ Claude API 통합
- 🔄 PDF 다운로드 기능
- 🔄 Word 문서 내보내기
- 🔄 이미지 기반 문제 생성
- 🔄 다국어 지원 (영어, 중국어, 일본어 등)
- 🔄 문제 저장 및 관리 기능
- 🔄 답안지 자동 생성
- 🔄 사용자 계정 및 로그인 기능
- 🔄 모바일 앱 버전

## 🤝 기여

이슈 보고나 풀 리퀘스트는 언제든 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.

## 📧 문의

질문이나 제안사항은 GitHub Issues를 통해 남겨주세요.

---

**Made with ❤️ by kehkai946-spec**
