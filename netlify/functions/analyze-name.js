// netlify/functions/analyze-name.js
const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    // 먼저 로컬 알고리즘으로 기본 점수 계산
    const localResult = calculateLocalScore(name, hanja);
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

// 한글 자음 획수 테이블 (강희자전 기준)
const CONSONANT_STROKES = {
  ㄱ: 2,
  ㄲ: 4,
  ㄴ: 2,
  ㄷ: 3,
  ㄸ: 6,
  ㄹ: 5,
  ㅁ: 4,
  ㅂ: 4,
  ㅃ: 8,
  ㅅ: 2,
  ㅆ: 4,
  ㅇ: 1,
  ㅈ: 3,
  ㅉ: 6,
  ㅊ: 4,
  ㅋ: 3,
  ㅌ: 4,
  ㅍ: 4,
  ㅎ: 3,
};

// 한글 모음 획수 테이블
const VOWEL_STROKES = {
  ㅏ: 2,
  ㅐ: 3,
  ㅑ: 3,
  ㅒ: 4,
  ㅓ: 2,
  ㅔ: 3,
  ㅕ: 3,
  ㅖ: 4,
  ㅗ: 2,
  ㅘ: 4,
  ㅙ: 5,
  ㅚ: 3,
  ㅛ: 3,
  ㅜ: 2,
  ㅝ: 4,
  ㅞ: 5,
  ㅟ: 3,
  ㅠ: 3,
  ㅡ: 1,
  ㅢ: 2,
  ㅣ: 1,
};

// 오행 분류 (자음 기준)
const FIVE_ELEMENTS = {
  wood: ['ㄱ', 'ㄲ', 'ㅋ'], // 목(木) - 각음
  fire: ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ'], // 화(火) - 설음
  earth: ['ㅇ'], // 토(土) - 후음
  metal: ['ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ'], // 금(金) - 치음
  water: ['ㅁ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅎ'], // 수(水) - 순음
};

// 음양 분류 (모음 기준)
const YIN_YANG = {
  yang: ['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ'], // 양성 모음
  yin: ['ㅓ', 'ㅕ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'], // 음성 모음
};

// 한글 분해 함수
function decomposeHangul(char) {
  const code = char.charCodeAt(0) - 44032;
  if (code < 0 || code > 11171) return null;

  const consonantIndex = Math.floor(code / 588);
  const vowelIndex = Math.floor((code % 588) / 28);
  const finalConsonantIndex = code % 28;

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
  const vowels = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    'ㅘ',
    'ㅙ',
    'ㅚ',
    'ㅛ',
    'ㅜ',
    'ㅝ',
    'ㅞ',
    'ㅟ',
    'ㅠ',
    'ㅡ',
    'ㅢ',
    'ㅣ',
  ];
  const finalConsonants = [
    '',
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ];

  return {
    initial: consonants[consonantIndex],
    vowel: vowels[vowelIndex],
    final: finalConsonants[finalConsonantIndex],
  };
}

// 글자별 획수 계산
function getCharacterStrokes(char) {
  const decomposed = decomposeHangul(char);
  if (!decomposed) return 0;

  let strokes = 0;
  strokes += CONSONANT_STROKES[decomposed.initial] || 0;
  strokes += VOWEL_STROKES[decomposed.vowel] || 0;
  if (decomposed.final) {
    strokes += CONSONANT_STROKES[decomposed.final] || 0;
  }

  return strokes;
}

// 오행 조화 분석
function analyzeFiveElements(name) {
  const elements = [];

  for (let char of name) {
    const decomposed = decomposeHangul(char);
    if (decomposed) {
      for (let [element, consonants] of Object.entries(FIVE_ELEMENTS)) {
        if (consonants.includes(decomposed.initial)) {
          elements.push(element);
          break;
        }
      }
    }
  }

  // 오행 조화도 계산 (상생/상극 관계)
  const harmony = calculateElementHarmony(elements);
  return { elements, harmony };
}

// 오행 조화도 계산
function calculateElementHarmony(elements) {
  if (elements.length < 2) return 50;

  // 상생 관계: 목→화→토→금→수→목
  const generationCycle = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  };

  // 상극 관계: 목→토, 화→금, 토→수, 금→목, 수→화
  const destructionCycle = {
    wood: 'earth',
    fire: 'metal',
    earth: 'water',
    metal: 'wood',
    water: 'fire',
  };

  let harmonyScore = 50;

  for (let i = 0; i < elements.length - 1; i++) {
    const current = elements[i];
    const next = elements[i + 1];

    if (generationCycle[current] === next) {
      harmonyScore += 15; // 상생 관계
    } else if (destructionCycle[current] === next) {
      harmonyScore -= 10; // 상극 관계
    } else if (current === next) {
      harmonyScore += 5; // 같은 오행
    }
  }

  return Math.max(0, Math.min(100, harmonyScore));
}

// 음양 조화 분석
function analyzeYinYang(name) {
  let yangCount = 0;
  let yinCount = 0;

  for (let char of name) {
    const decomposed = decomposeHangul(char);
    if (decomposed) {
      if (YIN_YANG.yang.includes(decomposed.vowel)) {
        yangCount++;
      } else if (YIN_YANG.yin.includes(decomposed.vowel)) {
        yinCount++;
      }
    }
  }

  // 균형도 계산 (1:1 비율이 이상적)
  const total = yangCount + yinCount;
  if (total === 0) return 50;

  const ratio = Math.min(yangCount, yinCount) / total;
  return Math.round(ratio * 100);
}

// 개선된 로컬 점수 계산 함수
function calculateLocalScore(name, hanja = '') {
  console.log('=== 전문적인 작명 분석 시작 ===');

  const nameLength = name.length;
  const hasHanja = hanja && hanja.trim().length > 0;

  // 1. 기본 구조 점수 (이름 길이)
  let structureScore = 0;
  switch (nameLength) {
    case 2:
      structureScore = 70;
      break; // 성+이름 1글자
    case 3:
      structureScore = 85;
      break; // 성+이름 2글자 (가장 일반적)
    case 4:
      structureScore = 75;
      break; // 성 2글자+이름 2글자 또는 성+이름 3글자
    default:
      structureScore = 65;
      break; // 기타
  }
  console.log('구조 점수:', structureScore);

  // 2. 획수 분석 (81수리 기준)
  const strokeAnalysis = analyzeStrokes(name);
  console.log('획수 분석:', strokeAnalysis);

  // 3. 오행 조화 분석
  const elementAnalysis = analyzeFiveElements(name);
  console.log('오행 분석:', elementAnalysis);

  // 4. 음양 조화 분석
  const yinYangScore = analyzeYinYang(name);
  console.log('음양 조화 점수:', yinYangScore);

  // 5. 발음 및 어감 분석
  const pronunciationScore = analyzePronunciation(name);
  console.log('발음 점수:', pronunciationScore);

  // 6. 한자 보너스
  const hanjaBonus = hasHanja ? 5 : 0;
  console.log('한자 보너스:', hanjaBonus);

  // 최종 점수 계산 (가중 평균)
  const finalScore = Math.round(
    structureScore * 0.25 + // 구조 25%
      strokeAnalysis.score * 0.25 + // 획수 25%
      elementAnalysis.harmony * 0.2 + // 오행 20%
      yinYangScore * 0.15 + // 음양 15%
      pronunciationScore * 0.1 + // 발음 10%
      hanjaBonus // 한자 보너스 5%
  );

  console.log('최종 점수:', finalScore);

  // 성향 및 추천사항 결정
  const personality = determinePersonality(
    name,
    elementAnalysis,
    yinYangScore,
    finalScore
  );

  return {
    score: Math.max(60, Math.min(100, finalScore)),
    grade: finalScore >= 85 ? '우수' : finalScore >= 70 ? '보통' : '개선필요',
    personalityTitle: personality.title,
    personalityDesc: personality.desc,
    recommended1: personality.recommended[0],
    recommended2: personality.recommended[1],
    recommended3: personality.recommended[2],
    avoid1: personality.avoid[0],
    avoid2: personality.avoid[1],
    avoid3: personality.avoid[2],
  };
}

// 획수 분석 (81수리학 기준)
function analyzeStrokes(name) {
  const chars = Array.from(name);
  const strokes = chars.map((char) => getCharacterStrokes(char));
  const totalStrokes = strokes.reduce((sum, stroke) => sum + stroke, 0);

  console.log('각 글자 획수:', strokes);
  console.log('총 획수:', totalStrokes);

  // 81수리학에 따른 길흉 판단
  const remainder = totalStrokes % 81;
  const luckyNumbers = [
    1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33,
    35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 73, 75, 77, 78, 81,
  ];

  let strokeScore = 50;
  if (luckyNumbers.includes(remainder)) {
    strokeScore = 85;
  } else if (remainder % 2 === 1) {
    // 홀수는 일반적으로 길함
    strokeScore = 70;
  } else {
    strokeScore = 60;
  }

  return {
    totalStrokes,
    remainder,
    score: strokeScore,
  };
}

// 발음 및 어감 분석
function analyzePronunciation(name) {
  let score = 70;

  // 연속된 같은 자음/모음 체크 (발음의 어려움)
  const chars = Array.from(name);
  for (let i = 0; i < chars.length - 1; i++) {
    const current = decomposeHangul(chars[i]);
    const next = decomposeHangul(chars[i + 1]);

    if (current && next) {
      // 같은 초성이 연속되면 감점
      if (current.initial === next.initial) score -= 5;
      // 같은 모음이 연속되면 감점
      if (current.vowel === next.vowel) score -= 3;
    }
  }

  // 어려운 발음 조합 체크
  const difficultCombinations = ['ㅆㅅ', 'ㅊㅈ', 'ㅋㄱ', 'ㅌㄷ', 'ㅍㅂ'];
  for (let combination of difficultCombinations) {
    if (name.includes(combination)) score -= 10;
  }

  // 부드러운 음성 보너스
  const softSounds = ['ㄴ', 'ㅁ', 'ㄹ', 'ㅇ'];
  let softCount = 0;
  for (let char of name) {
    const decomposed = decomposeHangul(char);
    if (decomposed && softSounds.includes(decomposed.initial)) {
      softCount++;
    }
  }
  score += softCount * 3;

  return Math.max(50, Math.min(100, score));
}

// 성향 결정 함수
function determinePersonality(name, elementAnalysis, yinYangScore, totalScore) {
  const dominantElement = getMostCommonElement(elementAnalysis.elements);
  const isYangDominant = yinYangScore > 60;

  // 오행과 음양 조합으로 성향 결정
  const personalityTypes = [
    {
      condition: dominantElement === 'fire' && isYangDominant,
      title: '열정적이고 리더십이 강한 성향',
      desc: '타고난 카리스마와 추진력을 가지고 있으며, 사람들을 이끌어가는 능력이 뛰어납니다.',
      recommended: ['붉은 보석', '황금 액세서리', '목재 장식품'],
      avoid: ['검은 옷', '차가운 금속', '어두운 색상'],
    },
    {
      condition: dominantElement === 'wood' && yinYangScore < 60,
      title: '창의적이고 성장 지향적인 성향',
      desc: '끊임없이 발전하고 성장하려는 의지가 강하며, 새로운 것에 대한 호기심이 많습니다.',
      recommended: ['녹색 보석', '나무 장신구', '자연 소재 용품'],
      avoid: ['금속 장신구', '인공적인 소재', '날카로운 모양'],
    },
    {
      condition: dominantElement === 'earth',
      title: '안정적이고 신뢰할 수 있는 성향',
      desc: '든든하고 믿음직한 성격으로 주변 사람들에게 안정감을 주는 존재입니다.',
      recommended: ['황색 보석', '도자기 소품', '사각형 모양 장식'],
      avoid: ['불안정한 구조물', '너무 밝은 색', '움직이는 장식'],
    },
    {
      condition: dominantElement === 'metal' && isYangDominant,
      title: '정의롭고 원칙을 중시하는 성향',
      desc: '명확한 기준과 원칙을 가지고 있으며, 공정함과 정의를 추구하는 성격입니다.',
      recommended: ['은 액세서리', '흰색 보석', '기하학적 디자인'],
      avoid: ['불규칙한 모양', '혼합된 색상', '부드러운 재질'],
    },
    {
      condition: dominantElement === 'water',
      title: '유연하고 적응력이 뛰어난 성향',
      desc: '상황에 따라 유연하게 대처하는 능력이 뛰어나며, 포용력이 넓은 성격입니다.',
      recommended: ['푸른 보석', '물결 모양 장식', '투명한 소재'],
      avoid: ['각진 모양', '딱딱한 재질', '고정된 형태'],
    },
    {
      condition: true, // 기본값
      title: '균형잡힌 조화로운 성향',
      desc: '안정적이고 조화로운 성격을 가지고 있으며, 다양한 상황에 잘 적응합니다.',
      recommended: ['다양한 색상 조합', '자연 소재', '균형잡힌 디자인'],
      avoid: ['극단적인 색상', '불균형한 모양', '과도한 장식'],
    },
  ];

  return personalityTypes.find((type) => type.condition);
}

// 가장 많이 나타나는 오행 원소 찾기
function getMostCommonElement(elements) {
  const counts = {};
  elements.forEach((element) => {
    counts[element] = (counts[element] || 0) + 1;
  });

  return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
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
