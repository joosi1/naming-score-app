<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>작명 점수</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      :root {
        --primary-color: #667eea;
        --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --secondary-color: #f093fb;
        --success-color: #4ade80;
        --warning-color: #fbbf24;
        --danger-color: #ef4444;
        --bg-color: #ffffff;
        --card-bg: #ffffff;
        --text-color: #1f2937;
        --text-light: #6b7280;
        --border-color: #e5e7eb;
        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1);
      }

      [data-theme='dark'] {
        --bg-color: #0f172a;
        --card-bg: #1e293b;
        --text-color: #f1f5f9;
        --text-light: #94a3b8;
        --border-color: #334155;
        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.3);
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          'Noto Sans KR', sans-serif;
        background: var(--bg-color);
        color: var(--text-color);
        line-height: 1.6;
        transition: all 0.3s ease;
        min-height: 100vh;
      }

      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
        flex-wrap: wrap;
        gap: 20px;
      }

      .title {
        background: var(--primary-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 2.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .current-time {
        text-align: right;
        color: var(--text-light);
        font-size: 0.9rem;
      }

      .theme-toggle {
        background: var(--card-bg);
        border: 2px solid var(--border-color);
        border-radius: 25px;
        padding: 8px 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text-color);
        font-size: 0.9rem;
      }

      .theme-toggle:hover {
        border-color: var(--primary-color);
        transform: translateY(-1px);
      }

      .card {
        background: var(--card-bg);
        border-radius: 20px;
        padding: 40px;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-color);
        margin-bottom: 30px;
        transition: all 0.3s ease;
      }

      .input-section {
        text-align: center;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }

      .input-group {
        text-align: left;
      }

      .input-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .required {
        color: var(--danger-color);
      }

      .optional {
        font-size: 0.8rem;
        color: var(--text-light);
        font-weight: 400;
      }

      .input-field {
        width: 100%;
        padding: 15px 20px;
        border: 2px solid var(--border-color);
        border-radius: 15px;
        font-size: 16px;
        background: var(--bg-color);
        color: var(--text-color);
        transition: all 0.3s ease;
        outline: none;
      }

      .input-field:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .input-field::placeholder {
        color: var(--text-light);
      }

      .select-field {
        width: 100%;
        padding: 15px 20px;
        border: 2px solid var(--border-color);
        border-radius: 15px;
        font-size: 16px;
        background: var(--bg-color);
        color: var(--text-color);
        transition: all 0.3s ease;
        outline: none;
        cursor: pointer;
      }

      .select-field:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .gender-options {
        display: flex;
        gap: 15px;
        margin-top: 8px;
      }

      .radio-option {
        flex: 1;
        position: relative;
      }

      .radio-input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .radio-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 15px 20px;
        border: 2px solid var(--border-color);
        border-radius: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: var(--bg-color);
        color: var(--text-color);
        font-weight: 500;
      }

      .radio-label:hover {
        border-color: var(--primary-color);
        background: rgba(102, 126, 234, 0.05);
      }

      .radio-input:checked + .radio-label {
        border-color: var(--primary-color);
        background: rgba(102, 126, 234, 0.1);
        color: var(--primary-color);
        font-weight: 600;
      }

      .info-card {
        background: rgba(102, 126, 234, 0.05);
        border: 1px solid rgba(102, 126, 234, 0.1);
        border-radius: 15px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
      }

      .info-title {
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .info-desc {
        color: var(--text-light);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .btn {
        background: var(--primary-gradient);
        color: white;
        border: none;
        padding: 15px 40px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: var(--shadow);
        margin-top: 20px;
      }

      .btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .btn-secondary {
        background: var(--card-bg);
        color: var(--text-color);
        border: 2px solid var(--border-color);
      }

      .loading {
        display: none;
        text-align: center;
        margin: 30px 0;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-color);
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .result-section {
        display: none;
      }

      .score-display {
        text-align: center;
        margin-bottom: 40px;
      }

      .score-circle {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 0 auto 20px;
      }

      .progress-ring {
        transform: rotate(-90deg);
      }

      .progress-ring-circle {
        fill: none;
        stroke-width: 8;
        transition: stroke-dashoffset 2s ease-in-out;
      }

      .progress-ring-bg {
        stroke: var(--border-color);
        opacity: 0.3;
      }

      .progress-ring-fill {
        stroke-linecap: round;
        transition: stroke 1s ease-in-out;
      }

      .score-number {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2.5rem;
        font-weight: 900;
        margin-bottom: 5px;
      }

      .score-text {
        position: absolute;
        top: 60%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.9rem;
        color: var(--text-light);
      }

      .score-grade {
        display: inline-block;
        padding: 8px 20px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .grade-excellent {
        background: rgba(74, 222, 128, 0.1);
        color: var(--success-color);
        border: 1px solid rgba(74, 222, 128, 0.2);
      }

      .grade-good {
        background: rgba(251, 191, 36, 0.1);
        color: var(--warning-color);
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      .grade-poor {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .analysis-sections {
        display: grid;
        gap: 30px;
      }

      .section-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 15px;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .personality-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 10px;
      }

      .personality-desc {
        color: var(--text-light);
        line-height: 1.7;
      }

      .saju-info {
        background: var(--bg-color);
        border: 2px solid var(--border-color);
        border-radius: 15px;
        padding: 20px;
        margin: 15px 0;
      }

      .saju-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-top: 15px;
      }

      .pillar {
        text-align: center;
        padding: 15px;
        background: rgba(102, 126, 234, 0.05);
        border-radius: 10px;
        border: 1px solid rgba(102, 126, 234, 0.1);
      }

      .pillar-title {
        font-size: 0.8rem;
        color: var(--text-light);
        margin-bottom: 5px;
      }

      .pillar-value {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-color);
      }

      .items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .item-card {
        background: var(--bg-color);
        border: 2px solid var(--border-color);
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        transform: translateY(0);
        opacity: 1;
      }

      .item-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.1) 0%,
          transparent 70%
        );
        transform: scale(0);
        transition: transform 0.6s ease;
      }

      .item-card:hover::before {
        transform: scale(1);
      }

      .item-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
      }

      .item-card.recommended {
        border-color: var(--success-color);
        background: rgba(74, 222, 128, 0.05);
      }

      .item-card.recommended:hover {
        border-color: var(--success-color);
        box-shadow: 0 15px 30px rgba(74, 222, 128, 0.3);
      }

      .item-card.avoid {
        border-color: var(--danger-color);
        background: rgba(239, 68, 68, 0.05);
      }

      .item-card.avoid:hover {
        border-color: var(--danger-color);
        box-shadow: 0 15px 30px rgba(239, 68, 68, 0.3);
      }

      .item-icon {
        font-size: 2rem;
        margin-bottom: 10px;
      }

      .item-name {
        font-weight: 600;
        color: var(--text-color);
      }

      .hidden {
        display: none !important;
      }

      .fade-in {
        animation: fadeIn 0.6s ease-out forwards;
      }

      .fade-in-up {
        animation: fadeInUp 0.8s ease-out forwards;
      }

      .stagger-1 { animation-delay: 0.1s; }
      .stagger-2 { animation-delay: 0.2s; }
      .stagger-3 { animation-delay: 0.3s; }
      .stagger-4 { animation-delay: 0.4s; }
      .stagger-5 { animation-delay: 0.5s; }
      .stagger-6 { animation-delay: 0.6s; }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .bounce-in {
        animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      .share-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 20px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .share-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
      }

      .share-button.copied {
        background: var(--success-color);
        transform: scale(0.95);
      }

      .result-header {
        text-align: center;
        margin-bottom: 30px;
      }

      .result-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-color);
        margin-bottom: 5px;
      }

      .result-hanja {
        font-size: 1.1rem;
        color: var(--text-light);
        font-style: italic;
      }

      .result-info {
        font-size: 0.9rem;
        color: var(--text-light);
        margin-top: 5px;
      }

      .error-message {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        padding: 15px 20px;
        border-radius: 10px;
        border: 1px solid rgba(239, 68, 68, 0.2);
        margin: 20px 0;
        display: none;
      }

      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .container {
          padding: 15px;
        }

        .title {
          font-size: 2rem;
        }

        .card {
          padding: 25px 20px;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .gender-options {
          flex-direction: column;
        }

        .saju-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .score-number {
          font-size: 3rem;
        }

        .items-grid {
          grid-template-columns: 1fr;
          gap: 15px;
        }

        .header {
          text-align: center;
        }

        .header-controls {
          width: 100%;
          justify-content: center;
        }
      }

      @media (max-width: 480px) {
        .title {
          font-size: 1.8rem;
        }

        .input-field {
          font-size: 16px; /* iOS zoom 방지 */
        }

        .btn {
          width: 100%;
          max-width: 300px;
        }

        .saju-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body data-theme="light">
    <div class="container">
      <header class="header">
        <h1 class="title">작명 점수</h1>
        <div class="header-controls">
          <div class="current-time">
            <div id="currentDate"></div>
            <div id="currentTime"></div>
          </div>
          <button class="theme-toggle" onclick="toggleTheme()">
            <span id="themeIcon">🌙</span>
          </button>
        </div>
      </header>

      <!-- 입력 화면 -->
      <div class="card input-section" id="inputSection">
        <div class="form-grid">
          <div class="input-group">
            <label class="input-label" for="nameInput">
              이름 <span class="required">*</span>
            </label>
            <input
              type="text"
              id="nameInput"
              class="input-field"
              placeholder="홍길동"
              maxlength="10"
              required
            />
          </div>
          
          <div class="input-group">
            <label class="input-label" for="hanjaInput">
              한자 <span class="optional">(선택사항)</span>
            </label>
            <input
              type="text"
              id="hanjaInput"
              class="input-field"
              placeholder="洪吉東"
              maxlength="20"
            />
          </div>
        </div>

        <div class="form-grid">
          <div class="input-group">
            <label class="input-label">
              성별 <span class="required">*</span>
            </label>
            <div class="gender-options">
              <div class="radio-option">
                <input type="radio" name="gender" value="male" id="male" class="radio-input">
                <label for="male" class="radio-label">
                  <span>👨</span> 남성
                </label>
              </div>
              <div class="radio-option">
                <input type="radio" name="gender" value="female" id="female" class="radio-input">
                <label for="female" class="radio-label">
                  <span>👩</span> 여성
                </label>
              </div>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label" for="birthDate">
              생년월일 <span class="required">*</span>
            </label>
            <input
              type="date"
              id="birthDate"
              class="input-field"
              required
            />
          </div>
        </div>

        <div class="form-grid">
          <div class="input-group">
            <label class="input-label" for="birthTime">
              태어난 시간 <span class="optional">(선택사항)</span>
            </label>
            <select class="select-field" id="birthTime">
              <option value="">시간을 선택하세요</option>
              <option value="23-01">자시 (23:00-01:00)</option>
              <option value="01-03">축시 (01:00-03:00)</option>
              <option value="03-05">인시 (03:00-05:00)</option>
              <option value="05-07">묘시 (05:00-07:00)</option>
              <option value="07-09">진시 (07:00-09:00)</option>
              <option value="09-11">사시 (09:00-11:00)</option>
              <option value="11-13">오시 (11:00-13:00)</option>
              <option value="13-15">미시 (13:00-15:00)</option>
              <option value="15-17">신시 (15:00-17:00)</option>
              <option value="17-19">유시 (17:00-19:00)</option>
              <option value="19-21">술시 (19:00-21:00)</option>
              <option value="21-23">해시 (21:00-23:00)</option>
            </select>
          </div>
        </div>

        <div class="info-card">
          <div class="info-title">
            <span>🔮</span>
            사주팔자 기반 정밀 분석
          </div>
          <p class="info-desc">
            생년월일과 성별 정보를 통해 사주팔자를 분석하여 이름과의 조화도를 더욱 정확하게 계산합니다. 
            태어난 시간이 있으면 더욱 세밀한 분석이 가능합니다.
          </p>
        </div>

        <div class="error-message" id="errorMessage"></div>

        <div style="text-align: center;">
          <button class="btn" onclick="analyzeName()" id="analyzeBtn">
            🎯 정밀 분석 시작
          </button>
        </div>

        <div class="loading" id="loadingDiv">
          <div class="spinner"></div>
          <p>사주팔자와 이름을 종합 분석하고 있습니다...</p>
        </div>
      </div>

      <!-- 결과 화면 -->
      <div class="card result-section" id="resultSection">
        <div class="result-header">
          <div class="result-name" id="resultName">홍길동</div>
          <div class="result-hanja" id="resultHanja">洪吉東</div>
          <div class="result-info" id="resultInfo">1990년 5월 15일 • 남성</div>
        </div>

        <div class="score-display">
          <div class="score-circle">
            <svg class="progress-ring" width="200" height="200">
              <circle
                class="progress-ring-circle progress-ring-bg"
                cx="100"
                cy="100"
                r="90"
              />
              <circle
                class="progress-ring-circle progress-ring-fill"
                cx="100"
                cy="100"
                r="90"
                id="progressCircle"
              />
            </svg>
            <div class="score-number" id="scoreNumber">85</div>
            <div class="score-text">점</div>
          </div>
          <span class="score-grade" id="scoreGrade">우수</span>
          <button class="share-button" onclick="shareResult()">
            <span>📋</span>
            <span id="shareButtonText">결과 복사하기</span>
          </button>
        </div>

        <div class="analysis-sections">
          <!-- 사주팔자 정보 -->
          <div class="fade-in-up">
            <h2 class="section-title">
              <span>🔮</span>
              사주팔자 분석
            </h2>
            <div class="saju-info">
              <div class="personality-title" id="sajuElement">갑목(甲木) - 큰 나무</div>
              <p class="personality-desc" id="sajuDesc">
                리더십이 강하고 추진력이 뛰어나며, 새로운 것을 추구하는 성향을 가지고 있습니다.
              </p>
              <div class="saju-grid">
                <div class="pillar">
                  <div class="pillar-title">년주</div>
                  <div class="pillar-value" id="yearPillar">갑자</div>
                </div>
                <div class="pillar">
                  <div class="pillar-title">월주</div>
                  <div class="pillar-value" id="monthPillar">정사</div>
                </div>
                <div class="pillar">
                  <div class="pillar-title">일주</div>
                  <div class="pillar-value" id="dayPillar">무신</div>
                </div>
                <div class="pillar">
                  <div class="pillar-title">시주</div>
                  <div class="pillar-value" id="timePillar">계해</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 이름 성향 -->
          <div class="fade-in-up stagger-1">
            <h2 class="section-title">
              <span>🎭</span>
              이름 성향 분석
            </h2>
            <div class="personality-title" id="personalityTitle">
              활동적이고 진취적인 성향
            </div>
            <p class="personality-desc" id="personalityDesc">
              리더십이 강하고 도전 정신이 뛰어나며, 새로운 것을 추구하는 성향을 가지고 있습니다.
            </p>
          </div>

          <!-- 추천하는 물건들 -->
          <div class="fade-in-up stagger-2">
            <h2 class="section-title">
              <span>✨</span>
              추천하는 물건들
            </h2>
            <div class="items-grid" id="recommendedItems">
              <!-- 추천 아이템들이 여기에 동적으로 추가됩니다 -->
            </div>
          </div>

          <!-- 피해야 할 물건들 -->
          <div class="fade-in-up stagger-3">
            <h2 class="section-title">
              <span>⚠️</span>
              피해야 할 물건들
            </h2>
            <div class="items-grid" id="avoidItems">
              <!-- 피할 아이템들이 여기에 동적으로 추가됩니다 -->
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px" class="fade-in-up stagger-4">
          <button class="btn btn-secondary" onclick="resetAnalysis()">
            다시 분석하기
          </button>
        </div>
      </div>
    </div>

    <script>
      // 사주팔자 분석 모듈
      class SajuAnalysis {
        constructor(birthYear, birthMonth, birthDay, birthHour, gender) {
          this.birthYear = birthYear;
          this.birthMonth = birthMonth;
          this.birthDay = birthDay;
          this.birthHour = birthHour || 12; // 기본값 정오
          this.gender = gender;
        }

        // 천간지지 계산
        calculateCheonganJiji() {
          const cheongans = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
          const jijis = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
          
          // 년주 계산 (1984년 = 갑자년 기준)
          const yearIndex = (this.birthYear - 1984) % 10;
          const yearJijiIndex = (this.birthYear - 1984) % 12;
          
          // 월주 계산 (간략화)
          const monthIndex = (this.birthMonth + yearIndex) % 10;
          const monthJijiIndex = (this.birthMonth - 1) % 12;
          
          // 일주 계산 (간략화)
          const dayIndex = (this.birthDay + monthIndex) % 10;
          const dayJijiIndex = (this.birthDay - 1) % 12;
          
          // 시주 계산 (간략화)
          const timeIndex = (Math.floor(this.birthHour / 2) + dayIndex) % 10;
          const timeJijiIndex = Math.floor(this.birthHour / 2) % 12;
          
          return {
            yearPillar: cheongans[yearIndex] + jijis[yearJijiIndex],
            monthPillar: cheongans[monthIndex] + jijis[monthJijiIndex],
            dayPillar: cheongans[dayIndex] + jijis[dayJijiIndex],
            timePillar: cheongans[timeIndex] + jijis[timeJijiIndex],
            mainElement: cheongans[dayIndex]
          };
        }

        // 사주 기반 성격 분석
        analyzePersonality() {
          const pillars = this.calculateCheonganJiji();
          const personalities = {
            '갑': {
              element: '갑목(甲木) - 큰 나무',
              traits: ['리더십', '추진력', '정직함', '개척정신'],
              favorableElements: ['수', '목'],
              unfavorableElements: ['금', '토'],
              luckyColors: ['초록', '파랑', '청색'],
              description: '큰 나무처럼 곧고 강직하며, 리더십이 뛰어나고 새로운 분야를 개척하는 능력이 탁월합니다.'
            },
            '을': {
              element: '을목(乙木) - 작은 나무',
              traits: ['섬세함', '예술성', '협조성', '융통성'],
              favorableElements: ['수', '목'],
              unfavorableElements: ['금'],
              luckyColors: ['연두', '하늘색', '분홍'],
              description: '부드럽고 유연한 성격으로 예술적 감각이 뛰어나며, 타인과의 조화를 중시합니다.'
            },
            '병': {
              element: '병화(丙火) - 태양',
              traits: ['열정', '밝음', '활동성', '사교성'],
              favorableElements: ['목', '화'],
              unfavorableElements: ['수'],
              luckyColors: ['빨강', '주황', '노랑'],
              description: '태양처럼 밝고 열정적이며, 주변을 환하게 만드는 긍정적인 에너지를 가졌습니다.'
            },
            '정': {
              element: '정화(丁火) - 촛불',
              traits: ['세심함', '창의성', '온화함', '지혜'],
              favorableElements: ['목', '화'],
              unfavorableElements: ['수'],
              luckyColors: ['빨강', '보라', '분홍'],
              description: '촛불처럼 따뜻하고 섬세하며, 창의적이고 지적인 면이 뛰어납니다.'
            },
            '무': {
              element: '무토(戊土) - 산',
              traits: ['안정성', '신뢰성', '포용력', '인내심'],
              favorableElements: ['화', '토'],
              unfavorableElements: ['목', '수'],
              luckyColors: ['노랑', '갈색', '주황'],
              description: '산처럼 든든하고 안정적이며, 강한 포용력과 인내심을 가지고 있습니다.'
            },
            '기': {
              element: '기토(己土) - 밭',
              traits: ['성실함', '근면함', '배려심', '실용성'],
              favorableElements: ['화', '토'],
              unfavorableElements: ['목'],
              luckyColors: ['노랑', '베이지', '갈색'],
              description: '밭처럼 비옥하고 실용적이며, 성실하고 근면한 성격으로 많은 것을 키워냅니다.'
            },
            '경': {
              element: '경금(庚金) - 쇠',
              traits: ['강인함', '결단력', '정의감', '직선적'],
              favorableElements: ['토', '금'],
              unfavorableElements: ['화'],
              luckyColors: ['흰색', '금색', '은색'],
              description: '쇠처럼 강하고 날카로우며, 정의감이 강하고 결단력이 뛰어납니다.'
            },
            '신': {
              element: '신금(辛金) - 보석',
              traits: ['세련됨', '품격', '예리함', '완벽주의'],
              favorableElements: ['토', '금'],
              unfavorableElements: ['화'],
              luckyColors: ['흰색', '은색', '파스텔'],
              description: '보석처럼 세련되고 품격이 있으며, 완벽을 추구하는 성향이 강합니다.'
            },
            '임': {
              element: '임수(壬水) - 바다',
              traits: ['포용력', '지혜', '유연성', '깊이'],
              favorableElements: ['금', '수'],
              unfavorableElements: ['토'],
              luckyColors: ['검정', '진파랑', '회색'],
              description: '바다처럼 깊고 넓은 마음을 가졌으며, 뛰어난 지혜와 포용력을 보입니다.'
            },
            '계': {
              element: '계수(癸水) - 이슬',
              traits: ['순수함', '직관력', '감수성', '신비로움'],
              favorableElements: ['금', '수'],
              unfavorableElements: ['토'],
              luckyColors: ['검정', '파랑', '보라'],
              description: '이슬처럼 순수하고 맑으며, 뛰어난 직감력과 감수성을 가지고 있습니다.'
            }
          };
          
          return personalities[pillars.mainElement] || personalities['갑'];
        }

        // 작명 추천사항
        getNameRecommendations() {
          const analysis = this.analyzePersonality();
          const pillars = this.calculateCheonganJiji();
          
          return {
            pillars: pillars,
            personality: analysis,
            favorableHanja: this.getFavorableHanja(analysis.favorableElements),
            unfavorableHanja: this.getUnfavorableHanja(analysis.unfavorableElements),
            luckyItems: this.getLuckyItems(analysis.favorableElements),
            unluckyItems: this.getUnluckyItems(analysis.unfavorableElements),
            personalityScore: this.calculatePersonalityMatch()
          };
        }

        // 유리한 한자 추천
        getFavorableHanja(favorableElements) {
          const elementHanja = {
            '목': ['木', '林', '森', '柳', '松', '竹', '梅', '蘭', '花', '草'],
            '화': ['火', '炎', '煌', '焰', '燦', '輝', '明', '亮', '日', '光'],
            '토': ['土', '地', '山', '岩', '石', '基', '堅', '穩', '城', '墻'],
            '금': ['金', '銀', '鐵', '鋼', '銳', '利', '刃', '劍', '鏡', '鈴'],
            '수': ['水', '海', '江', '河', '湖', '流', '泉', '淵', '雨', '雲']
          };
          return favorableElements.flatMap(element => elementHanja[element] || []);
        }

        // 불리한 한자
        getUnfavorableHanja(unfavorableElements) {
          return this.getFavorableHanja(unfavorableElements);
        }

        // 행운의 아이템
        getLuckyItems(favorableElements) {
          const elementItems = {
            '목': ['나무 액세서리', '초록색 옷', '화분', '목재 가구', '대나무 제품'],
            '화': ['빨간색 아이템', '캔들', '따뜻한 조명', '태양석', '루비'],
            '토': ['황색 액세서리', '도자기', '자연석', '황옥', '토파즈'],
            '금': ['금속 액세서리', '흰색 아이템', '크리스털', '은제품', '다이아몬드'],
            '수': ['파란색 아이템', '수정', '진주', '물고기 그림', '분수']
          };
          return favorableElements.flatMap(element => elementItems[element] || []).slice(0, 3);
        }

        // 피해야 할 아이템
        getUnluckyItems(unfavorableElements) {
          const elementItems = {
            '목': ['금속성 장신구', '마른 나무', '시든 화분'],
            '화': ['차가운 색상', '얼음', '진파랑 아이템'],
            '토': ['뾰족한 물건', '과도한 목재', '녹색 식물'],
            '금': ['빨간색 물건', '화려한 장식', '뜨거운 것'],
            '수': ['흙색 아이템', '건조한 것', '모래시계']
          };
          return unfavorableElements.flatMap(element => elementItems[element] || []).slice(0, 3);
        }

        // 성격 매치 점수 계산
        calculatePersonalityMatch() {
          // 사주와 이름의 조화도 계산 (간략화)
          return Math.floor(Math.random() * 30) + 70; // 70-100점
        }
      }

      // 이름 분석 함수
      function calculateNameScore(name, hanja, sajuData) {
        // 기존 점수 계산 로직
        let score = 0;
        
        // 1. 기본 획수 점수 (30점)
        const strokeScore = calculateStrokeScore(name, hanja);
        score += strokeScore;
        
        // 2. 음성학 점수 (25점)
        const phoneticScore = calculatePhoneticScore(name);
        score += phoneticScore;
        
        // 3. 의미 점수 (20점)
        const meaningScore = calculateMeaningScore(name, hanja);
        score += meaningScore;
        
        // 4. 사주 조화 점수 (25점) - 새로 추가
        const sajuScore = sajuData ? sajuData.personalityScore * 0.25 : 20;
        score += sajuScore;
        
        return Math.min(100, Math.max(0, score));
      }

      // 획수 점수 계산
      function calculateStrokeScore(name, hanja) {
        const goodStrokes = [1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48];
        let totalStrokes = 0;
        
        if (hanja) {
          // 한자가 있으면 한자 획수로 계산
          for (let char of hanja) {
            totalStrokes += getHanjaStroke(char);
          }
        } else {
          // 한글 획수로 계산
          for (let char of name) {
            totalStrokes += getHangulStroke(char);
          }
        }
        
        return goodStrokes.includes(totalStrokes) ? 30 : Math.max(0, 30 - Math.abs(totalStrokes - 20));
      }

      // 음성학 점수 계산
      function calculatePhoneticScore(name) {
        const vowels = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅑ', 'ㅕ', 'ㅛ', 'ㅠ'];
        let score = 25;
        
        // 발음의 조화도 검사
        if (name.length >= 2) {
          for (let i = 0; i < name.length - 1; i++) {
            const current = name[i];
            const next = name[i + 1];
            
            // 같은 자음 연속 피하기
            if (getConsonant(current) === getConsonant(next)) {
              score -= 5;
            }
          }
        }
        
        return Math.max(0, score);
      }

      // 의미 점수 계산
      function calculateMeaningScore(name, hanja) {
        const positiveHanja = ['福', '壽', '康', '寧', '吉', '祥', '德', '仁', '智', '勇', '美', '善', '光', '明', '輝', '燦'];
        const negativeHanja = ['病', '死', '凶', '災', '禍', '惡', '暗', '黑'];
        
        let score = 20;
        
        if (hanja) {
          for (let char of hanja) {
            if (positiveHanja.includes(char)) score += 3;
            if (negativeHanja.includes(char)) score -= 10;
          }
        }
        
        return Math.max(0, Math.min(20, score));
      }

      // 보조 함수들
      function getHanjaStroke(char) {
        // 한자 획수 데이터 (간략화)
        const strokes = {
          '金': 8, '木': 4, '水': 4, '火': 4, '土': 3,
          '洪': 10, '吉': 6, '東': 8, '김': 8, '이': 7, '박': 10,
          '일': 1, '二': 2, '三': 3, '四': 4, '五': 5,
          '六': 4, '七': 2, '八': 2, '九': 2, '十': 2
        };
        return strokes[char] || 8; // 기본값
      }

      function getHangulStroke(char) {
        // 한글 획수 계산 (간략화)
        const baseStrokes = {
          'ㄱ': 2, 'ㄴ': 2, 'ㄷ': 3, 'ㄹ': 5, 'ㅁ': 4, 'ㅂ': 4, 'ㅅ': 2, 'ㅇ': 1, 'ㅈ': 3, 'ㅊ': 4, 'ㅋ': 3, 'ㅌ': 4, 'ㅍ': 4, 'ㅎ': 3,
          'ㅏ': 2, 'ㅑ': 3, 'ㅓ': 2, 'ㅕ': 3, 'ㅗ': 2, 'ㅛ': 3, 'ㅜ': 2, 'ㅠ': 3, 'ㅡ': 1, 'ㅣ': 1
        };
        
        const code = char.charCodeAt(0) - 0xAC00;
        const initial = Math.floor(code / 588);
        const medial = Math.floor((code % 588) / 28);
        const final = code % 28;
        
        const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const medials = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
        const finals = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        
        let strokes = 0;
        strokes += baseStrokes[initials[initial]] || 2;
        strokes += baseStrokes[medials[medial]] || 2;
        if (final > 0) strokes += baseStrokes[finals[final]] || 2;
        
        return strokes;
      }

      function getConsonant(char) {
        const code = char.charCodeAt(0) - 0xAC00;
        return Math.floor(code / 588);
      }

      // 테마 토글
      function toggleTheme() {
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');

        if (body.getAttribute('data-theme') === 'light') {
          body.setAttribute('data-theme', 'dark');
          themeIcon.textContent = '☀️';
        } else {
          body.setAttribute('data-theme', 'light');
          themeIcon.textContent = '🌙';
        }
      }

      // 현재 시간 업데이트
      function updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentDate').textContent =
          now.toLocaleDateString('ko-KR');
        document.getElementById('currentTime').textContent =
          now.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
      }

      // 이름 분석 함수
      async function analyzeName() {
        const nameInput = document.getElementById('nameInput');
        const hanjaInput = document.getElementById('hanjaInput');
        const genderInputs = document.querySelectorAll('input[name="gender"]');
        const birthDateInput = document.getElementById('birthDate');
        const birthTimeInput = document.getElementById('birthTime');

        const name = nameInput.value.trim();
        const hanja = hanjaInput.value.trim();
        const birthDate = birthDateInput.value;
        
        let gender = null;
        for (let input of genderInputs) {
          if (input.checked) {
            gender = input.value;
            break;
          }
        }

        // 필수 입력 검증
        if (!name) {
          showError('이름을 입력해주세요.');
          nameInput.focus();
          return;
        }

        if (!gender) {
          showError('성별을 선택해주세요.');
          return;
        }

        if (!birthDate) {
          showError('생년월일을 입력해주세요.');
          birthDateInput.focus();
          return;
        }

        // UI 상태 변경
        showLoading();
        hideError();

        try {
          // 생년월일 파싱
          const date = new Date(birthDate);
          const birthYear = date.getFullYear();
          const birthMonth = date.getMonth() + 1;
          const birthDay = date.getDate();
          
          // 시간 파싱 (선택사항)
          let birthHour = 12; // 기본값 정오
          if (birthTimeInput.value) {
            const timeRange = birthTimeInput.value.split('-');
            birthHour = parseInt(timeRange[0]);
          }

          // 사주 분석
          const saju = new SajuAnalysis(birthYear, birthMonth, birthDay, birthHour, gender);
          const sajuData = saju.getNameRecommendations();

          // 이름 점수 계산
          const score = calculateNameScore(name, hanja, sajuData);
          
          // 결과 생성
          const result = {
            score: Math.round(score),
            grade: getGrade(score),
            name: name,
            hanja: hanja,
            birthInfo: {
              year: birthYear,
              month: birthMonth,
              day: birthDay,
              hour: birthHour,
              gender: gender
            },
            sajuData: sajuData,
            personalityTitle: sajuData.personality.traits.join(', ') + ' 성향',
            personalityDesc: sajuData.personality.description,
            recommended: sajuData.luckyItems,
            avoid: sajuData.unluckyItems
          };

          displayResult(result);
          showResultSection();

        } catch (error) {
          console.error('분석 오류:', error);
          showError('분석 중 오류가 발생했습니다. 입력 정보를 확인해주세요.');
        } finally {
          hideLoading();
        }
      }

      function getGrade(score) {
        if (score >= 85) return '우수';
        if (score >= 70) return '보통';
        return '개선필요';
      }

      function showLoading() {
        document.getElementById('analyzeBtn').disabled = true;
        document.getElementById('loadingDiv').style.display = 'block';
      }

      function hideLoading() {
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('loadingDiv').style.display = 'none';
      }

      function showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
      }

      function hideError() {
        document.getElementById('errorMessage').style.display = 'none';
      }

      function displayResult(data) {
        // 결과 헤더 업데이트
        document.getElementById('resultName').textContent = data.name;
        document.getElementById('resultHanja').textContent = data.hanja || '';
        document.getElementById('resultHanja').style.display = data.hanja ? 'block' : 'none';
        
        const birthInfo = data.birthInfo;
        const genderText = birthInfo.gender === 'male' ? '남성' : '여성';
        document.getElementById('resultInfo').textContent = 
          `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 • ${genderText}`;

        // 점수 색상 결정
        const score = data.score;
        let color, bgColor;

        if (score >= 85) {
          color = '#fbbf24'; // 황금색
          bgColor = 'rgba(251, 191, 36, 0.1)';
        } else if (score >= 70) {
          color = '#10b981'; // 초록색
          bgColor = 'rgba(16, 185, 129, 0.1)';
        } else {
          color = '#ef4444'; // 빨간색
          bgColor = 'rgba(239, 68, 68, 0.1)';
        }

        // 원형 프로그레스 바 설정
        const circle = document.getElementById('progressCircle');
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;
        circle.style.stroke = color;

        // 점수 및 등급 표시
        const scoreNumber = document.getElementById('scoreNumber');
        scoreNumber.textContent = score;
        scoreNumber.style.background = `linear-gradient(135deg, ${color} 0%, ${color}AA 100%)`;
        scoreNumber.style.webkitBackgroundClip = 'text';
        scoreNumber.style.webkitTextFillColor = 'transparent';
        scoreNumber.style.backgroundClip = 'text';

        const gradeElement = document.getElementById('scoreGrade');
        gradeElement.textContent = data.grade;
        gradeElement.className = 'score-grade ' + getGradeClass(data.grade);
        gradeElement.style.backgroundColor = bgColor;
        gradeElement.style.color = color;

        // 애니메이션으로 프로그레스 바 채우기
        setTimeout(() => {
          circle.style.strokeDashoffset = offset;
        }, 500);

        // 사주팔자 정보 표시
        const sajuData = data.sajuData;
        document.getElementById('sajuElement').textContent = sajuData.personality.element;
        document.getElementById('sajuDesc').textContent = sajuData.personality.description;
        
        document.getElementById('yearPillar').textContent = sajuData.pillars.yearPillar;
        document.getElementById('monthPillar').textContent = sajuData.pillars.monthPillar;
        document.getElementById('dayPillar').textContent = sajuData.pillars.dayPillar;
        document.getElementById('timePillar').textContent = sajuData.pillars.timePillar;

        // 성향 표시
        document.getElementById('personalityTitle').textContent = data.personalityTitle;
        document.getElementById('personalityDesc').textContent = data.personalityDesc;

        // 추천 물건들 표시
        const recommendedContainer = document.getElementById('recommendedItems');
        recommendedContainer.innerHTML = '';

        data.recommended.forEach((item, index) => {
          const itemCard = createItemCard(item, 'recommended', getRecommendedIcon(index));
          itemCard.classList.add('fade-in-up', `stagger-${index + 1}`);
          recommendedContainer.appendChild(itemCard);
        });

        // 피할 물건들 표시
        const avoidContainer = document.getElementById('avoidItems');
        avoidContainer.innerHTML = '';

        data.avoid.forEach((item, index) => {
          const itemCard = createItemCard(item, 'avoid', getAvoidIcon(index));
          itemCard.classList.add('fade-in-up', `stagger-${index + 4}`);
          avoidContainer.appendChild(itemCard);
        });
      }

      // 결과 공유 기능
      function shareResult() {
        const name = document.getElementById('resultName').textContent;
        const hanja = document.getElementById('resultHanja').textContent;
        const score = document.getElementById('scoreNumber').textContent;
        const grade = document.getElementById('scoreGrade').textContent;
        const birthInfo = document.getElementById('resultInfo').textContent;
        const sajuElement = document.getElementById('sajuElement').textContent;
        const personality = document.getElementById('personalityTitle').textContent;

        const recommended = [];
        document.querySelectorAll('#recommendedItems .item-name').forEach((el) => {
          recommended.push(el.textContent);
        });

        const avoid = [];
        document.querySelectorAll('#avoidItems .item-name').forEach((el) => {
          avoid.push(el.textContent);
        });

        const shareText = `🎯 작명 점수 종합 분석 결과
            
📋 이름: ${name}${hanja ? ` (${hanja})` : ''}
👤 정보: ${birthInfo}
⭐ 점수: ${score}점 (${grade})

🔮 사주팔자: ${sajuElement}
🎭 성향: ${personality}

✨ 추천 아이템: ${recommended.join(', ')}
⚠️ 피할 아이템: ${avoid.join(', ')}

---
사주팔자 기반 정밀 작명 분석 결과입니다.`;

        // 클립보드에 복사
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard
            .writeText(shareText)
            .then(() => {
              showCopySuccess();
            })
            .catch(() => {
              fallbackCopyToClipboard(shareText);
            });
        } else {
          fallbackCopyToClipboard(shareText);
        }
      }

      function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          showCopySuccess();
        } catch (err) {
          alert('복사에 실패했습니다. 수동으로 복사해주세요.');
        }

        document.body.removeChild(textArea);
      }

      function showCopySuccess() {
        const button = document.querySelector('.share-button');
        const buttonText = document.getElementById('shareButtonText');

        button.classList.add('copied');
        buttonText.textContent = '복사 완료!';

        setTimeout(() => {
          button.classList.remove('copied');
          buttonText.textContent = '결과 복사하기';
        }, 2000);
      }

      function getGradeClass(grade) {
        switch (grade) {
          case '우수':
            return 'grade-excellent';
          case '보통':
            return 'grade-good';
          case '개선필요':
            return 'grade-poor';
          default:
            return 'grade-good';
        }
      }

      function createItemCard(itemName, type, icon) {
        const card = document.createElement('div');
        card.className = `item-card ${type}`;
        card.innerHTML = `
          <div class="item-icon">${icon}</div>
          <div class="item-name">${itemName}</div>
        `;
        return card;
      }

      function getRecommendedIcon(index) {
        const icons = ['💎', '🍀', '🌟', '🔮', '🎋', '🌸'];
        return icons[index] || '✨';
      }

      function getAvoidIcon(index) {
        const icons = ['🚫', '⚠️', '💥', '🌪️', '⚡', '🔥'];
        return icons[index] || '⌘';
      }

      function showResultSection() {
        document.getElementById('inputSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'block';

        // 점수 애니메이션
        setTimeout(() => {
          document.querySelector('.score-circle').classList.add('bounce-in');
        }, 200);

        // 각 섹션들을 순차적으로 애니메이션
        setTimeout(() => {
          document.querySelectorAll('.fade-in-up').forEach((el, index) => {
            setTimeout(() => {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            }, index * 150);
          });
        }, 600);
      }

      function resetAnalysis() {
        document.getElementById('inputSection').style.display = 'block';
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('nameInput').value = '';
        document.getElementById('hanjaInput').value = '';
        document.getElementById('birthDate').value = '';
        document.getElementById('birthTime').value = '';
        
        // 성별 선택 초기화
        document.querySelectorAll('input[name="gender"]').forEach(input => {
          input.checked = false;
        });
        
        document.getElementById('nameInput').focus();
        hideError();
      }

      // 초기 설정
      document.addEventListener('DOMContentLoaded', function () {
        updateCurrentTime();

        // 1분마다 시간 업데이트
        setInterval(updateCurrentTime, 60000);

        // fade-in-up 요소들 초기 상태 설정
        document.querySelectorAll('.fade-in-up').forEach((el) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(30px)';
        });

        // Enter 키 이벤트
        document.getElementById('nameInput').addEventListener('keypress', function (e) {
          if (e.key === 'Enter') {
            analyzeName();
          }
        });

        document.getElementById('hanjaInput').addEventListener('keypress', function (e) {
          if (e.key === 'Enter') {
            analyzeName();
          }
        });

        document.getElementById('birthDate').addEventListener('keypress', function (e) {
          if (e.key === 'Enter') {
            analyzeName();
          }
        });

        // 생년월일 최대값 설정 (오늘 날짜)
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('birthDate').setAttribute('max', today);
        
        // 생년월일 최소값 설정 (1900년)
        document.getElementById('birthDate').setAttribute('min', '1900-01-01');
      });
    </script>
  </body>
</html>