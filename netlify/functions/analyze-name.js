// netlify/functions/analyze-name.js
const fetch = require('node-fetch');
const { google } = require('googleapis');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = '작명 결과';

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { name, hanja = '' } = JSON.parse(event.body);

    if (!name || name.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이름을 입력해주세요.',
        }),
      };
    }

    console.log('=== 분석 시작 ===');
    console.log('이름:', name);
    console.log('한자:', hanja);

    // 먼저 로컬 알고리즘으로 기본 점수 계산 (전통 성명학 기반)
    const localResult = calculateTraditionalScore(name, hanja);
    console.log('로컬 계산 결과:', JSON.stringify(localResult));

    // Gemini API 호출 시도
    let finalResult = localResult;

    if (GEMINI_API_KEY) {
      try {
        const prompt = `한국의 전통적인 작명 이론을 바탕으로 다음 이름을 분석해주세요.

이름: ${name}
한자: ${hanja || '없음'}

반드시 다음 형식으로만 답변해주세요:

점수: 85
등급: 우수
성향제목: 리더십이 강한 성향
성향설명: 타고난 지도력과 추진력을 가지고 있습니다.
추천물건1: 황금 반지
추천물건2: 붉은 보석
추천물건3: 나무 목걸이
피할물건1: 검은 옷
피할물건2: 차가운 금속
피할물건3: 깨지는 그릇

위 형식을 정확히 따라 ${name} 이름을 분석해주세요.`;

        console.log('Gemini API 호출 시작');
        const response = await callGeminiAPI(prompt);
        console.log('Gemini 원본 응답:', response);

        const geminiResult = parseGeminiResponse(response);
        console.log('Gemini 파싱 결과:', JSON.stringify(geminiResult));

        // Gemini 결과가 유효하면 사용, 아니면 로컬 결과 사용
        if (
          geminiResult.score &&
          geminiResult.score !== 75 &&
          geminiResult.score >= 1 &&
          geminiResult.score <= 100
        ) {
          finalResult = geminiResult;
        }
      } catch (apiError) {
        console.error('Gemini API 오류, 로컬 결과 사용:', apiError);
      }
    } else {
      console.log('Gemini API 키가 없어서 로컬 결과 사용');
    }

    console.log('최종 사용 결과:', JSON.stringify(finalResult));

    // Google Sheets에 결과 저장
    try {
      await saveToGoogleSheets(name, hanja, finalResult, event);
      console.log('✓ Google Sheets 저장 완료');
    } catch (sheetError) {
      console.error('Google Sheets 저장 오류:', sheetError);
      // 저장 실패해도 분석 결과는 반환
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: finalResult,
      }),
    };
  } catch (error) {
    console.error('전체 분석 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
      }),
    };
  }
};

// Google Sheets에 데이터 저장
async function saveToGoogleSheets(name, hanja, result, event) {
  if (!GOOGLE_SHEETS_CREDENTIALS || !SPREADSHEET_ID) {
    console.log('Google Sheets 설정이 없습니다. 저장을 건너뜁니다.');
    return;
  }

  try {
    // 서비스 계정 인증
    const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 현재 시간 및 사용자 정보
    const timestamp = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    });

    // 사용자 IP 추출 (Netlify에서 제공하는 헤더들 확인)
    const userIP =
      event.headers['x-forwarded-for'] ||
      event.headers['x-nf-client-connection-ip'] ||
      'Unknown';

    // 저장할 데이터 행
    const values = [
      [
        timestamp, // A: 날짜시간
        name, // B: 이름
        hanja || '', // C: 한자
        result.score || '', // D: 점수
        result.grade || '', // E: 등급
        result.personalityTitle || '', // F: 성향제목
        result.personalityDesc || '', // G: 성향설명
        result.recommended1 || '', // H: 추천물건1
        result.recommended2 || '', // I: 추천물건2
        result.recommended3 || '', // J: 추천물건3
        result.avoid1 || '', // K: 피할물건1
        result.avoid2 || '', // L: 피할물건2
        result.avoid3 || '', // M: 피할물건3
        userIP, // N: 사용자IP
      ],
    ];

    // 시트에 데이터 추가
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      resource: { values },
    });

    console.log('Google Sheets 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('Google Sheets 저장 상세 오류:', error);
    throw error;
  }
}

// 전통 성명학 기반 점수 계산 함수
function calculateTraditionalScore(name, hanja = '') {
  console.log('=== 전통 성명학 분석 시작 ===');
  console.log('이름:', name, '한자:', hanja);

  // 1. 획수 계산 (한자가 있으면 한자 기준, 없으면 한글 기준)
  const strokes = calculateStrokes(name, hanja);
  console.log('획수:', strokes);

  // 2. 수리격 계산
  const grids = calculateGrids(strokes);
  console.log('수리격:', grids);

  // 3. 각 격의 81수리 길흉 판단
  const gridScores = evaluateGrids(grids);
  console.log('격별 점수:', gridScores);

  // 4. 오행 상생 관계 평가
  const fiveElementScore = evaluateFiveElements(grids);
  console.log('오행 점수:', fiveElementScore);

  // 5. 음양 조화 평가
  const yinYangScore = evaluateYinYang(strokes);
  console.log('음양 점수:', yinYangScore);

  // 6. 발음 오행 평가
  const pronunciationScore = evaluatePronunciation(name);
  console.log('발음 점수:', pronunciationScore);

  // 7. 최종 점수 계산
  const finalScore = calculateFinalScore(
    gridScores,
    fiveElementScore,
    yinYangScore,
    pronunciationScore
  );

  // 8. 성향 분석
  const personality = analyzePersonality(grids, finalScore);

  return {
    score: finalScore,
    grade: getGrade(finalScore),
    personalityTitle: personality.title,
    personalityDesc: personality.desc,
    recommended1: personality.recommended[0],
    recommended2: personality.recommended[1],
    recommended3: personality.recommended[2],
    avoid1: personality.avoid[0],
    avoid2: personality.avoid[1],
    avoid3: personality.avoid[2],
    details: {
      strokes: strokes,
      grids: grids,
      gridScores: gridScores,
      fiveElementScore: fiveElementScore,
      yinYangScore: yinYangScore,
      pronunciationScore: pronunciationScore,
    },
  };
}

// 획수 계산
function calculateStrokes(name, hanja = '') {
  const strokes = [];

  if (hanja && hanja.trim()) {
    // 한자가 있으면 한자 획수 사용
    const hanjaStrokes = getHanjaStrokes(hanja);
    strokes.push(...hanjaStrokes);
  } else {
    // 한글 획수 계산
    for (let char of name) {
      strokes.push(getHangulStrokes(char));
    }
  }

  return strokes;
}

// 한글 획수 계산 (초성+중성+종성)
function getHangulStrokes(char) {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return 3; // 기본값

  const index = code - 0xac00;
  const consonant = Math.floor(index / 588); // 초성
  const vowel = Math.floor((index % 588) / 28); // 중성
  const finalConsonant = index % 28; // 종성

  const consonantStrokes = [
    2, 4, 4, 2, 3, 4, 2, 4, 1, 3, 4, 4, 4, 3, 2, 4, 2, 2, 1,
  ]; // 초성 획수
  const vowelStrokes = [
    2, 3, 2, 4, 2, 3, 3, 2, 2, 4, 4, 3, 4, 4, 3, 2, 2, 2, 3, 2, 2,
  ]; // 중성 획수
  const finalConsonantStrokes = [
    0, 1, 2, 2, 1, 2, 3, 1, 2, 2, 2, 3, 4, 3, 3, 2, 2, 3, 2, 4, 3, 4, 3, 3, 4,
    2, 4, 4,
  ]; // 종성 획수

  return (
    (consonantStrokes[consonant] || 2) +
    (vowelStrokes[vowel] || 2) +
    (finalConsonantStrokes[finalConsonant] || 0)
  );
}

// 한자 획수 (간단한 예시 - 실제로는 한자 획수 DB 필요)
function getHanjaStrokes(hanja) {
  const hanjaStrokeMap = {
    金: 8,
    木: 4,
    水: 4,
    火: 4,
    土: 3,
    一: 1,
    二: 2,
    三: 3,
    四: 5,
    五: 4,
    六: 4,
    七: 2,
    八: 2,
    九: 2,
    十: 2,
    大: 3,
    小: 3,
    中: 4,
    正: 5,
    明: 8,
    英: 8,
    美: 9,
    智: 12,
    勇: 9,
    善: 12,
    희: 7,
    준: 10,
    민: 5,
    수: 4,
    지: 7,
    성: 6,
    김: 8,
    이: 7,
    박: 10,
    최: 11,
    정: 9,
    강: 11,
    조: 10,
    윤: 7,
    장: 11,
    임: 6,
    한: 14,
    오: 5,
    서: 6,
    신: 7,
    권: 18,
    황: 12,
    안: 6,
    송: 9,
    류: 15,
    전: 9,
    홍: 9,
    고: 10,
    문: 4,
    손: 10,
    양: 13,
    배: 11,
    조: 17,
    백: 11,
    허: 11,
    유: 6,
    남: 9,
    심: 13,
    노: 10,
    정: 14,
    하: 5,
    곽: 15,
    성: 11,
    차: 10,
    주: 6,
    우: 7,
    구: 8,
    신: 10,
    임: 13,
    나: 10,
    전: 14,
    민: 11,
    유: 21,
    진: 10,
    지: 12,
    엄: 19,
    원: 13,
    천: 4,
    방: 4,
    공: 4,
    강: 13,
    현: 16,
    함: 9,
    변: 19,
    염: 20,
    양: 17,
    변: 9,
    여: 7,
    추: 11,
    노: 19,
    도: 15,
    소: 10,
    신: 13,
    석: 5,
    선: 13,
    설: 14,
    마: 10,
    길: 6,
    주: 9,
    연: 10,
    방: 10,
    위: 9,
    표: 8,
    명: 14,
    기: 7,
    반: 4,
    왕: 4,
    금: 8,
    옥: 5,
    육: 6,
    인: 4,
    맹: 8,
    제: 8,
    모: 5,
    장: 7,
    남: 13,
    탁: 8,
    국: 11,
    여: 8,
    진: 11,
    어: 6,
    경: 12,
    석: 14,
    호: 11,
    범: 11,
    애: 13,
    채: 10,
    태: 8,
    풍: 9,
    피: 11,
    미: 9,
    형: 11,
    배: 10,
    원: 10,
    온: 8,
  };

  return hanja.split('').map((char) => hanjaStrokeMap[char] || 10);
}

// 수리격 계산
function calculateGrids(strokes) {
  if (strokes.length === 2) {
    // 성 1자 + 이름 1자
    return {
      heaven: strokes[0], // 천격
      person: strokes[0] + strokes[1], // 인격
      earth: strokes[1], // 지격
      outer: strokes[1], // 외격
      total: strokes[0] + strokes[1], // 총격
    };
  } else if (strokes.length === 3) {
    // 성 1자 + 이름 2자
    return {
      heaven: strokes[0],
      person: strokes[0] + strokes[1],
      earth: strokes[1] + strokes[2],
      outer: strokes[0] + strokes[2],
      total: strokes[0] + strokes[1] + strokes[2],
    };
  } else if (strokes.length === 4) {
    // 성 2자 + 이름 2자
    return {
      heaven: strokes[0] + strokes[1],
      person: strokes[1] + strokes[2],
      earth: strokes[2] + strokes[3],
      outer: strokes[0] + strokes[3],
      total: strokes[0] + strokes[1] + strokes[2] + strokes[3],
    };
  }

  // 기본값 (3자 기준)
  return {
    heaven: strokes[0] || 10,
    person: (strokes[0] || 10) + (strokes[1] || 10),
    earth: (strokes[1] || 10) + (strokes[2] || 10),
    outer: (strokes[0] || 10) + (strokes[2] || 10),
    total: strokes.reduce((sum, stroke) => sum + (stroke || 10), 0),
  };
}

// 81수리 길흉표
const EIGHTY_ONE_TABLE = {
  1: { luck: '대길', score: 100 },
  2: { luck: '흉', score: 50 },
  3: { luck: '대길', score: 95 },
  4: { luck: '흉', score: 40 },
  5: { luck: '길', score: 85 },
  6: { luck: '길', score: 80 },
  7: { luck: '길', score: 90 },
  8: { luck: '길', score: 85 },
  9: { luck: '흉', score: 45 },
  10: { luck: '흉', score: 35 },
  11: { luck: '대길', score: 95 },
  12: { luck: '흉', score: 40 },
  13: { luck: '대길', score: 90 },
  14: { luck: '흉', score: 30 },
  15: { luck: '대길', score: 95 },
  16: { luck: '대길', score: 90 },
  17: { luck: '길', score: 80 },
  18: { luck: '길', score: 85 },
  19: { luck: '흉', score: 40 },
  20: { luck: '흉', score: 35 },
  21: { luck: '대길', score: 95 },
  22: { luck: '흉', score: 45 },
  23: { luck: '대길', score: 90 },
  24: { luck: '대길', score: 95 },
  25: { luck: '길', score: 80 },
  26: { luck: '흉', score: 50 },
  27: { luck: '흉', score: 45 },
  28: { luck: '흉', score: 40 },
  29: { luck: '길', score: 75 },
  30: { luck: '길', score: 70 },
  31: { luck: '대길', score: 95 },
  32: { luck: '길', score: 85 },
  33: { luck: '대길', score: 90 },
  34: { luck: '흉', score: 35 },
  35: { luck: '길', score: 80 },
  36: { luck: '흉', score: 50 },
  37: { luck: '길', score: 85 },
  38: { luck: '길', score: 75 },
  39: { luck: '길', score: 80 },
  40: { luck: '흉', score: 45 },
  41: { luck: '대길', score: 95 },
  42: { luck: '흉', score: 50 },
  43: { luck: '흉', score: 40 },
  44: { luck: '흉', score: 30 },
  45: { luck: '길', score: 80 },
  46: { luck: '흉', score: 45 },
  47: { luck: '길', score: 85 },
  48: { luck: '길', score: 80 },
  49: { luck: '흉', score: 50 },
  50: { luck: '흉', score: 45 },
  51: { luck: '길', score: 75 },
  52: { luck: '길', score: 80 },
  53: { luck: '흉', score: 55 },
  54: { luck: '흉', score: 40 },
  55: { luck: '길', score: 75 },
  56: { luck: '흉', score: 45 },
  57: { luck: '길', score: 80 },
  58: { luck: '길', score: 85 },
  59: { luck: '흉', score: 40 },
  60: { luck: '흉', score: 35 },
  61: { luck: '길', score: 85 },
  62: { luck: '흉', score: 45 },
  63: { luck: '길', score: 80 },
  64: { luck: '흉', score: 40 },
  65: { luck: '길', score: 85 },
  66: { luck: '흉', score: 50 },
  67: { luck: '길', score: 80 },
  68: { luck: '길', score: 85 },
  69: { luck: '흉', score: 45 },
  70: { luck: '흉', score: 40 },
  71: { luck: '길', score: 75 },
  72: { luck: '흉', score: 50 },
  73: { luck: '길', score: 80 },
  74: { luck: '흉', score: 45 },
  75: { luck: '길', score: 75 },
  76: { luck: '흉', score: 50 },
  77: { luck: '길', score: 70 },
  78: { luck: '길', score: 75 },
  79: { luck: '흉', score: 45 },
  80: { luck: '흉', score: 40 },
  81: { luck: '길', score: 80 },
};

// 수리격별 점수 평가
function evaluateGrids(grids) {
  const scores = {};

  Object.keys(grids).forEach((key) => {
    const value = grids[key];
    const remainder = value > 81 ? (value % 81 === 0 ? 81 : value % 81) : value;
    const tableEntry = EIGHTY_ONE_TABLE[remainder] || {
      luck: '보통',
      score: 60,
    };
    scores[key] = tableEntry.score;
  });

  return scores;
}

// 오행 상생 관계 평가
function evaluateFiveElements(grids) {
  // 획수를 오행으로 변환 (1,2:목, 3,4:화, 5,6:토, 7,8:금, 9,0:수)
  const getFiveElement = (num) => {
    const lastDigit = num % 10;
    if (lastDigit === 1 || lastDigit === 2) return '목';
    if (lastDigit === 3 || lastDigit === 4) return '화';
    if (lastDigit === 5 || lastDigit === 6) return '토';
    if (lastDigit === 7 || lastDigit === 8) return '금';
    if (lastDigit === 9 || lastDigit === 0) return '수';
    return '토';
  };

  const elements = {
    heaven: getFiveElement(grids.heaven),
    person: getFiveElement(grids.person),
    earth: getFiveElement(grids.earth),
  };

  // 상생 관계 체크 (목→화→토→금→수→목)
  const isCompatible = (elem1, elem2) => {
    const compatibility = {
      목: '화',
      화: '토',
      토: '금',
      금: '수',
      수: '목',
    };
    return compatibility[elem1] === elem2 || compatibility[elem2] === elem1;
  };

  let compatibilityScore = 60;
  if (isCompatible(elements.heaven, elements.person)) compatibilityScore += 15;
  if (isCompatible(elements.person, elements.earth)) compatibilityScore += 15;
  if (isCompatible(elements.heaven, elements.earth)) compatibilityScore += 10;

  return Math.min(100, compatibilityScore);
}

// 음양 조화 평가
function evaluateYinYang(strokes) {
  const yinCount = strokes.filter((stroke) => stroke % 2 === 0).length;
  const yangCount = strokes.filter((stroke) => stroke % 2 === 1).length;

  // 완전 균형이면 100점, 한쪽 편중되면 점수 감소
  const total = yinCount + yangCount;
  if (total === 0) return 60;

  const balance = Math.abs(yinCount - yangCount) / total;

  return Math.round(100 - balance * 40);
}

// 발음 오행 평가 (초성 기준)
function evaluatePronunciation(name) {
  const pronunciationElements = {
    ㄱ: '목',
    ㄲ: '목',
    ㄴ: '토',
    ㄷ: '화',
    ㄸ: '화',
    ㄹ: '화',
    ㅁ: '수',
    ㅂ: '수',
    ㅃ: '수',
    ㅅ: '금',
    ㅆ: '금',
    ㅇ: '토',
    ㅈ: '목',
    ㅉ: '목',
    ㅊ: '금',
    ㅋ: '목',
    ㅌ: '화',
    ㅍ: '수',
    ㅎ: '수',
  };

  const elements = [];
  for (let char of name) {
    const code = char.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      const consonantIndex = Math.floor(code / 588);
      const consonants = [
        'ㄱ',
        'ㄲ',
        'ㄴ',
        'ㄷ',
        'ㄸ',
        'ㄹ',
        'ㅁ',
        'ㅂ',
        'ㅃ',
        'ㅅ',
        'ㅆ',
        'ㅇ',
        'ㅈ',
        'ㅉ',
        'ㅊ',
        'ㅋ',
        'ㅌ',
        'ㅍ',
        'ㅎ',
      ];
      const consonant = consonants[consonantIndex];
      elements.push(pronunciationElements[consonant] || '토');
    }
  }

  // 발음 오행 상생 체크
  let score = 70;
  for (let i = 0; i < elements.length - 1; i++) {
    const isCompatible = (elem1, elem2) => {
      const compatibility = {
        목: '화',
        화: '토',
        토: '금',
        금: '수',
        수: '목',
      };
      return compatibility[elem1] === elem2;
    };

    if (isCompatible(elements[i], elements[i + 1])) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

// 최종 점수 계산
function calculateFinalScore(
  gridScores,
  fiveElementScore,
  yinYangScore,
  pronunciationScore
) {
  // 가중 평균 계산
  const personScore = gridScores.person || 60; // 인격이 가장 중요
  const totalScore = gridScores.total || 60;
  const earthScore = gridScores.earth || 60;
  const heavenScore = gridScores.heaven || 60;

  const weightedScore =
    personScore * 0.3 + // 인격 30%
    totalScore * 0.25 + // 총격 25%
    earthScore * 0.2 + // 지격 20%
    fiveElementScore * 0.15 + // 오행 15%
    yinYangScore * 0.05 + // 음양 5%
    pronunciationScore * 0.05; // 발음 5%

  return Math.round(Math.min(100, Math.max(60, weightedScore)));
}

// 등급 결정
function getGrade(score) {
  if (score >= 90) return '매우우수';
  if (score >= 85) return '우수';
  if (score >= 75) return '양호';
  if (score >= 65) return '보통';
  return '개선필요';
}

// 성향 분석 (인격 기준 - 결정론적)
function analyzePersonality(grids, finalScore) {
  const personValue = grids.person;
  const remainder =
    personValue > 81
      ? personValue % 81 === 0
        ? 81
        : personValue % 81
      : personValue;

  const personalities = [
    {
      title: '강인한 리더십 기질',
      desc: '타고난 지도력과 추진력을 가지고 있으며, 목표를 향해 꾸준히 나아가는 성격입니다.',
      recommended: ['붉은 보석', '목재 장신구', '금속 액세서리'],
      avoid: ['어두운 색상', '날카로운 물건', '차가운 재질'],
    },
    {
      title: '온화하고 협조적인 성향',
      desc: '주변 사람들과의 조화를 중시하며, 부드럽고 포용력이 있는 성격입니다.',
      recommended: ['자연석 반지', '꽃무늬 소품', '따뜻한 색조'],
      avoid: ['너무 자극적인 색', '각진 모양', '시끄러운 환경'],
    },
    {
      title: '창의적이고 예술적 감각',
      desc: '뛰어난 창의력과 예술적 재능을 가지고 있으며, 독창적인 아이디어가 풍부합니다.',
      recommended: ['다채로운 액세서리', '예술품', '자연 소재'],
      avoid: ['단조로운 환경', '억압적인 분위기', '인공적인 소재'],
    },
    {
      title: '실용적이고 안정 추구',
      desc: '현실적이고 신중한 판단력을 가지고 있으며, 안정적인 삶을 추구합니다.',
      recommended: ['견고한 소재', '전통적 디자인', '차분한 색상'],
      avoid: ['변화가 잦은 환경', '불안정한 구조', '화려한 장식'],
    },
    {
      title: '활동적이고 도전정신 강함',
      desc: '왕성한 활동력과 모험정신을 가지고 있으며, 새로운 도전을 즐깁니다.',
      recommended: ['스포츠 용품', '역동적 디자인', '밝은 색상'],
      avoid: ['정적인 환경', '제약이 많은 공간', '어두운 분위기'],
    },
    {
      title: '지적이고 분석적인 성향',
      desc: '논리적 사고력이 뛰어나며, 깊이 있는 분석과 연구를 좋아합니다.',
      recommended: ['클래식한 디자인', '서적', '심플한 장식'],
      avoid: ['복잡한 패턴', '소음', '산만한 환경'],
    },
    {
      title: '감성적이고 직관적인 기질',
      desc: '뛰어난 직감력과 감수성을 가지고 있으며, 타인의 마음을 잘 읽습니다.',
      recommended: ['부드러운 소재', '달빛 색상', '곡선 디자인'],
      avoid: ['날카로운 각도', '강한 조명', '딱딱한 재질'],
    },
    {
      title: '사교적이고 활발한 성격',
      desc: '뛰어난 대인관계 능력을 가지고 있으며, 사람들과 어울리는 것을 즐깁니다.',
      recommended: ['화려한 액세서리', '밝은 컬러', '트렌디한 아이템'],
      avoid: ['어둡고 무거운 색', '고립된 공간', '보수적인 스타일'],
    },
  ];

  // 인격수를 기반으로 성향 결정 (결정론적)
  const personalityIndex = remainder % personalities.length;
  return personalities[personalityIndex];
}

async function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 20,
      topP: 0.8,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Gemini API 호출 실패: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  console.log('Gemini API 응답:', JSON.stringify(data)); // 디버깅용

  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  } else {
    console.error('Gemini API 오류:', data);
    throw new Error('Gemini API 응답 오류: ' + JSON.stringify(data));
  }
}

function parseGeminiResponse(response) {
  try {
    console.log('=== 파싱 시작 ===');
    console.log('원본 응답 길이:', response.length);
    console.log('원본 응답 내용:', response);

    if (!response || response.trim().length === 0) {
      console.log('응답이 비어있음');
      return { score: null }; // null을 반환해서 로컬 결과 사용하도록
    }

    const lines = response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    console.log('파싱할 라인 수:', lines.length);

    const result = {};

    lines.forEach((line, index) => {
      console.log(`라인 ${index}: "${line}"`);

      // 더 유연한 패턴 매칭
      if (line.match(/점수\s*[:：]\s*\d+/)) {
        const scoreMatch = line.match(/점수\s*[:：]\s*(\d+)/);
        if (scoreMatch) {
          result.score = parseInt(scoreMatch[1]);
          console.log('✓ 점수 파싱됨:', result.score);
        }
      } else if (line.match(/등급\s*[:：]/)) {
        const gradeMatch = line.match(/등급\s*[:：]\s*(.+)/);
        if (gradeMatch) {
          result.grade = gradeMatch[1].trim();
          console.log('✓ 등급 파싱됨:', result.grade);
        }
      } else if (line.match(/성향제목\s*[:：]/)) {
        const titleMatch = line.match(/성향제목\s*[:：]\s*(.+)/);
        if (titleMatch) {
          result.personalityTitle = titleMatch[1].trim();
          console.log('✓ 성향제목 파싱됨:', result.personalityTitle);
        }
      } else if (line.match(/성향설명\s*[:：]/)) {
        const descMatch = line.match(/성향설명\s*[:：]\s*(.+)/);
        if (descMatch) {
          result.personalityDesc = descMatch[1].trim();
          console.log('✓ 성향설명 파싱됨:', result.personalityDesc);
        }
      } else if (line.match(/추천물건1\s*[:：]/)) {
        const match = line.match(/추천물건1\s*[:：]\s*(.+)/);
        if (match) {
          result.recommended1 = match[1].trim();
          console.log('✓ 추천물건1 파싱됨:', result.recommended1);
        }
      } else if (line.match(/추천물건2\s*[:：]/)) {
        const match = line.match(/추천물건2\s*[:：]\s*(.+)/);
        if (match) result.recommended2 = match[1].trim();
      } else if (line.match(/추천물건3\s*[:：]/)) {
        const match = line.match(/추천물건3\s*[:：]\s*(.+)/);
        if (match) result.recommended3 = match[1].trim();
      } else if (line.match(/피할물건1\s*[:：]/)) {
        const match = line.match(/피할물건1\s*[:：]\s*(.+)/);
        if (match) result.avoid1 = match[1].trim();
      } else if (line.match(/피할물건2\s*[:：]/)) {
        const match = line.match(/피할물건2\s*[:：]\s*(.+)/);
        if (match) result.avoid2 = match[1].trim();
      } else if (line.match(/피할물건3\s*[:：]/)) {
        const match = line.match(/피할물건3\s*[:：]\s*(.+)/);
        if (match) result.avoid3 = match[1].trim();
      }
    });

    console.log('=== 파싱 결과 ===');
    console.log('점수:', result.score);
    console.log('등급:', result.grade);
    console.log('성향제목:', result.personalityTitle);

    // 유효한 결과인지 확인
    if (result.score && result.score >= 1 && result.score <= 100) {
      console.log('✓ 유효한 Gemini 응답으로 판단');
      return result;
    } else {
      console.log('✗ 무효한 응답, 로컬 계산 사용 권장');
      return { score: null }; // 로컬 결과 사용하도록 신호
    }
  } catch (error) {
    console.error('파싱 중 오류:', error);
    return { score: null }; // 로컬 결과 사용하도록 신호
  }
}
