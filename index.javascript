<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>문제 변형 AI</title>
</head>
<body>
    <h1>기출문제 업로드 및 변형</h1>
    
    <!-- 뼈대: 사용자가 이미지를 올리고 버튼을 누르는 곳 -->
    <input type="file" id="imageInput" accept="image/*">
    <button onclick="startVisionAI()">문제 변형하기</button>
    
    <p id="statusMessage">여기에 진행 상황이 표시됩니다.</p>

    <!-- 뇌: 자바스크립트는 보통 <body>가 끝나기 직전에 <script> 태그로 묶어서 넣습니다. -->
    <script>
        // 이 부분이 웹페이지의 '뇌' 역할을 하는 자바스크립트입니다.
        function startVisionAI() {
            // 1. 사용자가 업로드한 파일과 메세지를 띄울 공간을 찾아옵니다.
            const fileInput = document.getElementById('imageInput');
            const statusMessage = document.getElementById('statusMessage');

            // 2. 만약 파일을 안 올리고 버튼을 눌렀다면?
            if (fileInput.files.length === 0) {
                alert("먼저 기출문제나 도표 이미지를 업로드해주세요!");
                return; // 여기서 멈춤
            }

            // 3. 파일이 정상적으로 올라왔다면?
            const uploadedImage = fileInput.files[0];
            
            // 화면에 텍스트를 바꿔줍니다. (뇌가 작동하고 있다는 증거)
            statusMessage.innerText = uploadedImage.name + " 파일을 읽어들이는 중입니다... (AI 연동 대기 중)";
            statusMessage.style.color = "blue";

            // 나중에 이 부분에 진짜 Vision AI(OCR)로 이미지를 전송하고, 변형 문제를 받아오는 코드를 추가할 것입니다.
        }
    </script>
</body>
</html>
