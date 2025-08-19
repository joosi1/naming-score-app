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
성향설명: 타고난 지도력과 추진력을 가지고 있습니다. 주변 사람들에게 신뢰를 받으며 자연스럽게 리더 역할을 맡게 됩니다. 어려운 상황에서도 침착함을 유지하며 현명한 판단력으로 문제를 해결해 나갑니다. 창의적인 아이디어와 실행력을 겸비하여 목표 달성에 탁월한 능력을 보입니다.
추천물건1: 황금 반지
추천물건2: 붉은 보석
추천물건3: 나무 목걸이
피할물건1: 검은 옷
피할물건2: 차가운 금속
피할물건3: 깨지는 그릇

위 형식을 정확히 따라 ${name} 이름을 분석해주세요. 성향설명은 반드시 3줄 이상으로 자세하게 작성해주세요.`;

        console.log('Gemini API 호출 시작');
        const response = await callGeminiAPI(prompt);
        console.log('Gemini 원본 응답:', response);

        const geminiResult = parseGeminiResponse(response);
        console.log('Gemini 파싱 결과:', JSON.stringify(geminiResult));

        // Gemini 결과가 유효하면 사용, 아니면 로컬 결과 사용
        if (
          geminiResult.score &&
          geminiResult.score !== 75 &&
          geminiResult.score >= 70 &&
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
  wood: ['ㄱ', 'ㄲ', 'ㅋ'],
  fire: ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ'],
  earth: ['ㅇ'],
  metal: ['ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ'],
  water: ['ㅁ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅎ'],
};

// 음양 분류 (모음 기준)
const YIN_YANG = {
  yang: ['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ'],
  yin: ['ㅓ', 'ㅕ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'],
};

// ===== 새로 추가된 5격 수리 관련 =====

// 81수리학 길흉표 (더 정확하게 분류)
const STROKE_FORTUNE = {
  // 대길수 (90-95점)
  great_fortune: [
    1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 31, 32, 33, 35,
    37, 39, 41, 45, 47, 48, 52, 61, 63, 65, 67, 68,
  ],

  // 길수 (80-85점)
  fortune: [29, 38, 49, 57, 73, 75, 77, 78, 81],

  // 흉수 (50-60점)
  misfortune: [
    2, 4, 9, 10, 12, 14, 19, 20, 22, 26, 27, 28, 34, 36, 40, 42, 43, 44, 46, 50,
    53, 54, 55, 56, 58, 59, 60, 62, 64, 66, 69, 70, 71, 72, 74, 76, 79, 80,
  ],

  // 보통 (70-75점)
  normal: [], // 위에 없는 모든 수
};

// 한자 의미 분석용 데이터베이스 (일부 예시)
const HANJA_MEANINGS = {
  // 긍정적 의미 한자들
  positive: {
    智: { meaning: '지혜', category: 'wisdom', score: 90 },
    賢: { meaning: '현명함', category: 'wisdom', score: 90 },
    仁: { meaning: '어짊', category: 'virtue', score: 85 },
    義: { meaning: '의로움', category: 'virtue', score: 85 },
    勇: { meaning: '용기', category: 'strength', score: 80 },
    健: { meaning: '건강함', category: 'health', score: 85 },
    美: { meaning: '아름다움', category: 'beauty', score: 80 },
    光: { meaning: '빛', category: 'brightness', score: 85 },
    明: { meaning: '밝음', category: 'brightness', score: 85 },
    善: { meaning: '선함', category: 'virtue', score: 85 },
    正: { meaning: '바름', category: 'virtue', score: 80 },
    純: { meaning: '순수함', category: 'purity', score: 80 },
    清: { meaning: '맑음', category: 'purity', score: 80 },
    安: { meaning: '평안함', category: 'peace', score: 80 },
    和: { meaning: '화목함', category: 'harmony', score: 80 },
    福: { meaning: '복', category: 'fortune', score: 90 },
    祥: { meaning: '상서로움', category: 'fortune', score: 85 },
    瑞: { meaning: '상서로운 조짐', category: 'fortune', score: 85 },
    吉: { meaning: '길함', category: 'fortune', score: 80 },
    慶: { meaning: '경사', category: 'celebration', score: 80 },
    喜: { meaning: '기쁨', category: 'joy', score: 80 },
    樂: { meaning: '즐거움', category: 'joy', score: 80 },
    愛: { meaning: '사랑', category: 'love', score: 85 },
    恩: { meaning: '은혜', category: 'grace', score: 80 },
    德: { meaning: '덕', category: 'virtue', score: 90 },
    誠: { meaning: '성실함', category: 'sincerity', score: 85 },
    信: { meaning: '믿음', category: 'trust', score: 80 },
    忠: { meaning: '충성', category: 'loyalty', score: 80 },
    孝: { meaning: '효도', category: 'filial_piety', score: 85 },
  },

  // 부정적 의미 한자들
  negative: {
    凶: { meaning: '흉함', category: 'evil', score: 20 },
    殺: { meaning: '죽임', category: 'death', score: 10 },
    病: { meaning: '병', category: 'disease', score: 30 },
    死: { meaning: '죽음', category: 'death', score: 10 },
    鬼: { meaning: '귀신', category: 'ghost', score: 20 },
    魔: { meaning: '마귀', category: 'demon', score: 20 },
    毒: { meaning: '독', category: 'poison', score: 25 },
    惡: { meaning: '악함', category: 'evil', score: 20 },
    怒: { meaning: '분노', category: 'anger', score: 40 },
    恨: { meaning: '원한', category: 'hatred', score: 30 },
    憂: { meaning: '근심', category: 'worry', score: 40 },
    悲: { meaning: '슬픔', category: 'sadness', score: 40 },
    苦: { meaning: '고통', category: 'pain', score: 35 },
    貧: { meaning: '가난', category: 'poverty', score: 30 },
    困: { meaning: '곤란', category: 'difficulty', score: 35 },
    破: { meaning: '깨뜨림', category: 'destruction', score: 30 },
    敗: { meaning: '패배', category: 'defeat', score: 30 },
    失: { meaning: '잃음', category: 'loss', score: 35 },
    絕: { meaning: '끊어짐', category: 'severance', score: 30 },
    暗: { meaning: '어둠', category: 'darkness', score: 40 },
  },
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

// ===== 새로 추가된 5격 수리 계산 =====
function calculateFiveGrids(name) {
  console.log('=== 5격 수리 계산 시작 ===');

  const chars = Array.from(name);
  const strokes = chars.map((char) => getCharacterStrokes(char));

  console.log('각 글자 획수:', strokes);

  let grids = {};

  if (chars.length === 2) {
    // 성 1글자 + 이름 1글자
    grids = {
      천격: strokes[0] + 1, // 성 + 1
      인격: strokes[0] + strokes[1], // 성 + 이름
      지격: strokes[1] + 1, // 이름 + 1
      외격: 2, // 1 + 1
      총격: strokes[0] + strokes[1], // 전체
    };
  } else if (chars.length === 3) {
    // 성 1글자 + 이름 2글자 (가장 일반적)
    grids = {
      천격: strokes[0] + 1, // 성 + 1
      인격: strokes[0] + strokes[1], // 성 + 이름첫글자
      지격: strokes[1] + strokes[2], // 이름 두글자
      외격: 1 + strokes[2], // 1 + 이름끝글자
      총격: strokes[0] + strokes[1] + strokes[2], // 전체
    };
  } else if (chars.length === 4) {
    // 성 2글자 + 이름 2글자 또는 성 1글자 + 이름 3글자
    if (isCommonSurname(chars[0] + chars[1])) {
      // 성 2글자 + 이름 2글자
      grids = {
        천격: strokes[0] + strokes[1], // 성 두글자
        인격: strokes[1] + strokes[2], // 성끝글자 + 이름첫글자
        지격: strokes[2] + strokes[3], // 이름 두글자
        외격: strokes[0] + strokes[3], // 성첫글자 + 이름끝글자
        총격: strokes[0] + strokes[1] + strokes[2] + strokes[3], // 전체
      };
    } else {
      // 성 1글자 + 이름 3글자
      grids = {
        천격: strokes[0] + 1, // 성 + 1
        인격: strokes[0] + strokes[1], // 성 + 이름첫글자
        지격: strokes[1] + strokes[2] + strokes[3], // 이름 세글자
        외격: 1 + strokes[2] + strokes[3], // 1 + 이름 중간글자 + 끝글자
        총격: strokes[0] + strokes[1] + strokes[2] + strokes[3], // 전체
      };
    }
  } else {
    // 기타 경우 기본 계산
    grids = {
      천격: strokes[0] + 1,
      인격: strokes[0] + (strokes[1] || 0),
      지격: strokes.slice(1).reduce((a, b) => a + b, 0) || 1,
      외격: strokes[0] + (strokes[strokes.length - 1] || 0),
      총격: strokes.reduce((a, b) => a + b, 0),
    };
  }

  // 각 격의 길흉 판정
  const gridScores = {};
  for (let [gridName, strokeCount] of Object.entries(grids)) {
    const remainder = strokeCount % 81;
    gridScores[gridName] = evaluateStrokeScore(remainder);
  }

  console.log('5격:', grids);
  console.log('5격 점수:', gridScores);

  return { grids, gridScores };
}

// 획수 길흉 평가
function evaluateStrokeScore(remainder) {
  if (STROKE_FORTUNE.great_fortune.includes(remainder)) {
    return 90;
  } else if (STROKE_FORTUNE.fortune.includes(remainder)) {
    return 80;
  } else if (STROKE_FORTUNE.misfortune.includes(remainder)) {
    return 50;
  } else {
    return 70; // 보통
  }
}

// 일반적인 성씨 판별 (간단한 버전)
function isCommonSurname(surname) {
  const twoCharSurnames = [
    '남궁',
    '독고',
    '황보',
    '제갈',
    '사공',
    '선우',
    '동방',
    '망절',
  ];
  return twoCharSurnames.includes(surname);
}

// ===== 새로 추가된 한자 의미 분석 =====
function analyzeHanjaMeaning(hanja) {
  console.log('=== 한자 의미 분석 시작 ===');

  if (!hanja || hanja.trim().length === 0) {
    console.log('한자가 없어 의미 분석 불가');
    return {
      hasHanja: false,
      meanings: [],
      overallScore: 70,
      categories: [],
      issues: [],
    };
  }

  const hanjaChars = Array.from(hanja.trim());
  const meanings = [];
  const categories = [];
  const issues = [];
  let totalScore = 0;

  console.log('분석할 한자:', hanjaChars);

  for (let char of hanjaChars) {
    let meaning = null;
    let score = 70; // 기본 점수

    if (HANJA_MEANINGS.positive[char]) {
      meaning = HANJA_MEANINGS.positive[char];
      score = meaning.score;
      categories.push(meaning.category);
    } else if (HANJA_MEANINGS.negative[char]) {
      meaning = HANJA_MEANINGS.negative[char];
      score = meaning.score;
      categories.push(meaning.category);
      issues.push(`'${char}(${meaning.meaning})'는 부정적 의미를 가집니다.`);
    } else {
      // 데이터베이스에 없는 한자는 중립적으로 처리
      meaning = { meaning: '알 수 없음', category: 'unknown', score: 70 };
    }

    meanings.push({
      char: char,
      meaning: meaning.meaning,
      category: meaning.category,
      score: score,
    });

    totalScore += score;
  }

  const averageScore = Math.round(totalScore / hanjaChars.length);

  // 조합 분석 (간단한 버전)
  if (hanjaChars.length >= 2) {
    const combinationIssues = checkHanjaCombination(hanjaChars);
    issues.push(...combinationIssues);
  }

  const result = {
    hasHanja: true,
    meanings: meanings,
    overallScore: Math.max(30, Math.min(100, averageScore)), // 30-100 범위로 제한
    categories: [...new Set(categories)], // 중복 제거
    issues: issues,
  };

  console.log('한자 의미 분석 결과:', result);
  return result;
}

// 한자 조합 분석
function checkHanjaCombination(hanjaChars) {
  const issues = [];

  // 같은 의미의 한자가 반복되는지 확인
  const meanings = hanjaChars.map((char) => {
    if (HANJA_MEANINGS.positive[char])
      return HANJA_MEANINGS.positive[char].category;
    if (HANJA_MEANINGS.negative[char])
      return HANJA_MEANINGS.negative[char].category;
    return 'unknown';
  });

  const duplicateCategories = meanings.filter(
    (item, index) => meanings.indexOf(item) !== index
  );
  if (duplicateCategories.length > 0) {
    issues.push('유사한 의미의 한자가 반복되어 단조로울 수 있습니다.');
  }

  // 상반된 의미의 조합 확인
  const hasPositive = hanjaChars.some((char) => HANJA_MEANINGS.positive[char]);
  const hasNegative = hanjaChars.some((char) => HANJA_MEANINGS.negative[char]);
  if (hasPositive && hasNegative) {
    issues.push('긍정적 의미와 부정적 의미가 혼재되어 모순적입니다.');
  }

  return issues;
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

  const harmony = calculateElementHarmony(elements);
  return { elements, harmony };
}

// 오행 조화도 계산
function calculateElementHarmony(elements) {
  if (elements.length < 2) return 50;

  const generationCycle = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  };

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
      harmonyScore += 15;
    } else if (destructionCycle[current] === next) {
      harmonyScore -= 10;
    } else if (current === next) {
      harmonyScore += 5;
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

  const total = yangCount + yinCount;
  if (total === 0) return 50;

  const ratio = Math.min(yangCount, yinCount) / total;
  return Math.round(ratio * 100);
}

// 발음 및 어감 분석
function analyzePronunciation(name) {
  let score = 70;

  const chars = Array.from(name);
  for (let i = 0; i < chars.length - 1; i++) {
    const current = decomposeHangul(chars[i]);
    const next = decomposeHangul(chars[i + 1]);

    if (current && next) {
      if (current.initial === next.initial) score -= 5;
      if (current.vowel === next.vowel) score -= 3;
    }
  }

  const difficultCombinations = ['ㅂㅁ', 'ㅊㅈ', 'ㅋㄱ', 'ㅌㄷ', 'ㅆㅅ'];
  for (let combination of difficultCombinations) {
    if (name.includes(combination)) score -= 10;
  }

  const softSounds = ['ㄴ', 'ㅅ', 'ㄹ', 'ㅇ'];
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

// 개선된 로컬 점수 계산 함수 (5격 수리 + 한자 의미 분석 포함)
function calculateLocalScore(name, hanja = '') {
  console.log('=== 전문적인 작명 분석 시작 ===');
  console.log('분석할 이름:', name);

  const nameLength = name.length;

  // 1. 기본 구조 점수 (이름 길이) - 15%
  let structureScore = 0;
  switch (nameLength) {
    case 2:
      structureScore = 75;
      break;
    case 3:
      structureScore = 85;
      break;
    case 4:
      structureScore = 80;
      break;
    default:
      structureScore = 70;
      break;
  }
  console.log('구조 점수:', structureScore);

  // 2. 5격 수리 분석 - 30% (가장 중요)
  const fiveGridsAnalysis = calculateFiveGrids(name);
  const fiveGridsScore = calculateAverageFiveGridsScore(
    fiveGridsAnalysis.gridScores
  );
  console.log('5격 수리 점수:', fiveGridsScore);

  // 3. 한자 의미 분석 - 25% (매우 중요)
  const hanjaMeaningAnalysis = analyzeHanjaMeaning(hanja);
  const hanjaMeaningScore = hanjaMeaningAnalysis.overallScore;
  console.log('한자 의미 점수:', hanjaMeaningScore);

  // 4. 오행 조화 분석 - 15%
  const elementAnalysis = analyzeFiveElements(name);
  const elementScore = elementAnalysis.harmony;
  console.log('오행 조화 점수:', elementScore);

  // 5. 음양 조화 분석 - 10%
  const yinYangScore = analyzeYinYang(name);
  console.log('음양 조화 점수:', yinYangScore);

  // 6. 발음 및 어감 분석 - 5%
  const pronunciationScore = analyzePronunciation(name);
  console.log('발음 점수:', pronunciationScore);

  // 안전한 점수들로 변환
  const safeStructureScore = structureScore || 75;
  const safeFiveGridsScore = fiveGridsScore || 75;
  const safeHanjaMeaningScore = hanjaMeaningScore || 70;
  const safeElementScore = elementScore || 75;
  const safeYinYangScore = yinYangScore || 75;
  const safePronunciationScore = pronunciationScore || 75;

  console.log('안전한 점수들:', {
    structure: safeStructureScore,
    fiveGrids: safeFiveGridsScore,
    hanjaMeaning: safeHanjaMeaningScore,
    element: safeElementScore,
    yinyang: safeYinYangScore,
    pronunciation: safePronunciationScore,
  });

  // 최종 점수 계산 (새로운 가중치)
  const weightedScore =
    safeStructureScore * 0.15 + // 구조 15%
    safeFiveGridsScore * 0.3 + // 5격 수리 30% (가장 중요)
    safeHanjaMeaningScore * 0.25 + // 한자 의미 25%
    safeElementScore * 0.15 + // 오행 15%
    safeYinYangScore * 0.1 + // 음양 10%
    safePronunciationScore * 0.05; // 발음 5%

  const finalScore = Math.round(weightedScore);

  console.log('가중 점수:', weightedScore);
  console.log('최종 점수:', finalScore);

  // 성향 및 추천사항 결정 (한자 의미도 고려)
  const personality = determinePersonality(
    name,
    elementAnalysis,
    safeYinYangScore,
    finalScore,
    hanjaMeaningAnalysis
  );

  // 상세한 분석 결과 포함
  const result = {
    score: Math.max(65, Math.min(100, finalScore)), // 최소 점수 65점
    grade: finalScore >= 85 ? '우수' : finalScore >= 75 ? '보통' : '개선필요',
    personalityTitle: personality.title,
    personalityDesc: personality.desc,
    recommended1: personality.recommended[0],
    recommended2: personality.recommended[1],
    recommended3: personality.recommended[2],
    avoid1: personality.avoid[0],
    avoid2: personality.avoid[1],
    avoid3: personality.avoid[2],

    // 추가된 상세 분석 정보
    detailedAnalysis: {
      fiveGrids: fiveGridsAnalysis,
      hanjaMeaning: hanjaMeaningAnalysis,
      elementAnalysis: elementAnalysis,
      scores: {
        structure: safeStructureScore,
        fiveGrids: safeFiveGridsScore,
        hanjaMeaning: safeHanjaMeaningScore,
        element: safeElementScore,
        yinyang: safeYinYangScore,
        pronunciation: safePronunciationScore,
      },
    },
  };

  console.log('최종 결과:', result);
  return result;
}

// 5격 수리 평균 점수 계산
function calculateAverageFiveGridsScore(gridScores) {
  const scores = Object.values(gridScores);
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / scores.length);
}

// 성향 결정 함수 (한자 의미 분석 추가 고려)
function determinePersonality(
  name,
  elementAnalysis,
  yinYangScore,
  totalScore,
  hanjaMeaningAnalysis
) {
  const dominantElement = getMostCommonElement(elementAnalysis.elements);
  const isYangDominant = yinYangScore > 60;

  // 한자 의미에서 주요 카테고리 추출
  const hanjaCategories = hanjaMeaningAnalysis.hasHanja
    ? hanjaMeaningAnalysis.categories
    : [];
  const hasWisdomHanja = hanjaCategories.includes('wisdom');
  const hasVirtueHanja = hanjaCategories.includes('virtue');
  const hasFortuneHanja = hanjaCategories.includes('fortune');
  const hasStrengthHanja = hanjaCategories.includes('strength');

  const personalityTypes = [
    {
      condition: hasWisdomHanja && dominantElement === 'water',
      title: '지혜롭고 깊이 있는 사색가적 성향',
      desc: '탁월한 지적 능력과 깊은 사색력을 바탕으로 복잡한 문제들을 해결해나가는 능력이 뛰어납니다. 책을 좋아하고 학문에 대한 열정이 높으며, 다른 사람들에게 좋은 조언자 역할을 하는 경우가 많습니다. 신중하고 차분한 성격으로 감정적이기보다는 이성적인 판단을 중시하며, 장기적인 관점에서 계획을 세우고 실행하는 능력이 뛰어납니다. 때로는 너무 완벽을 추구하여 결정을 내리는데 시간이 걸리기도 하지만, 한번 결정한 일은 끝까지 책임지고 완수하는 성실함을 보입니다.',
      recommended: ['푸른 보석', '책상용 수정', '차분한 색상의 문구류'],
      avoid: ['화려한 액세서리', '시끄러운 환경', '성급한 결정'],
    },
    {
      condition: hasVirtueHanja && dominantElement === 'earth',
      title: '덕망 있고 신뢰받는 리더적 성향',
      desc: '높은 도덕성과 올바른 가치관을 바탕으로 주변 사람들에게 존경받는 인격을 소유하고 있습니다. 정직하고 성실한 태도로 일을 처리하며, 어려운 상황에서도 원칙을 지키려는 강한 의지를 가지고 있습니다. 타인을 배려하는 마음이 깊고 봉사정신이 투철하여 자연스럽게 리더의 역할을 맡게 되는 경우가 많습니다. 겸손한 자세로 지속적으로 자기 계발에 힘쓰며, 가족과 공동체를 위해 희생할 줄 아는 따뜻한 인품을 지니고 있어 많은 사람들에게 사랑받습니다.',
      recommended: ['황색 보석', '나무 소재 장식품', '전통적인 디자인'],
      avoid: ['부정적인 환경', '이기적인 행동', '원칙을 벗어나는 일'],
    },
    {
      condition: hasFortuneHanja && isYangDominant,
      title: '운이 좋고 번영을 이끄는 성향',
      desc: '타고난 복운과 긍정적인 에너지를 가지고 있어 어떤 일을 하든 좋은 결과를 얻는 경우가 많습니다. 낙천적이고 밝은 성격으로 주변 사람들에게 희망과 용기를 주는 존재이며, 새로운 도전을 두려워하지 않는 진취적인 기상을 보입니다. 사업이나 투자에 대한 감각이 뛰어나고 기회를 포착하는 능력이 탁월하여 경제적 성공을 이루는 경우가 많습니다. 관대하고 너그러운 마음으로 다른 사람들과 이익을 나누며, 그로 인해 더욱 큰 복을 받는 선순환의 삶을 살아갑니다.',
      recommended: ['금색 액세서리', '밝은 보석', '원형 모양 장식'],
      avoid: ['어두운 색상', '부정적인 생각', '과도한 욕심'],
    },
    {
      condition: hasStrengthHanja && dominantElement === 'fire',
      title: '용기 있고 추진력이 강한 개척자적 성향',
      desc: '강한 의지력과 불굴의 정신력을 바탕으로 어려운 일도 포기하지 않고 끝까지 해내는 성격입니다. 도전 정신이 투철하고 새로운 분야를 개척하는 것을 좋아하며, 위기 상황에서 오히려 더욱 빛나는 능력을 발휘합니다. 정의감이 강하고 약자를 보호하려는 마음이 크며, 불의를 보면 참지 못하는 정열적인 면을 가지고 있습니다. 때로는 성급하게 행동하여 실수를 하기도 하지만, 빠른 판단력과 실행력으로 문제를 신속하게 해결하는 능력이 뛰어나며, 주변 사람들에게 강한 추진력과 에너지를 전달합니다.',
      recommended: ['붉은 보석', '역동적인 디자인', '스포츠 용품'],
      avoid: ['소극적인 태도', '차가운 색상', '정적인 환경'],
    },
    {
      condition: dominantElement === 'wood' && yinYangScore < 60,
      title: '창의적이고 성장 지향적인 성향',
      desc: '끊임없이 발전하고 성장하려는 의지가 강하며, 새로운 것에 대한 호기심이 많습니다. 예술적 감각이 뛰어나고 독창적인 아이디어를 잘 발휘하는 창조적 인재의 면모를 갖추고 있습니다. 자연을 사랑하고 환경을 중시하는 성향이 있으며, 꾸준한 노력으로 자신의 꿈을 실현해 나가는 끈기있는 모습을 보입니다. 협조적이고 포용력이 넓어 팀워크를 중시하며, 다른 사람들과 함께 성장하고 발전하는 것을 추구합니다.',
      recommended: ['녹색 보석', '나무 장식구', '자연 소재 용품'],
      avoid: ['금속 장식구', '인공적인 소재', '날카로운 모양'],
    },
    {
      condition: dominantElement === 'metal' && isYangDominant,
      title: '정의롭고 원칙을 중시하는 성향',
      desc: '명확한 기준과 원칙을 가지고 있으며, 공정함과 정의를 추구하는 성격입니다. 논리적이고 체계적인 사고력을 바탕으로 문제를 해결하는 능력이 뛰어나며, 책임감이 강하고 맡은 일을 끝까지 완수하는 성실한 모습을 보입니다. 옳고 그름을 명확히 구분하며, 진실을 추구하는 올바른 가치관을 가지고 있습니다. 때로는 융통성이 부족해 보일 수 있지만, 신뢰할 수 있는 성격으로 많은 사람들에게 의지가 되는 존재입니다.',
      recommended: ['은 액세서리', '흰색 보석', '기하학적 디자인'],
      avoid: ['불규칙한 모양', '혼합된 색상', '부드러운 재질'],
    },
    {
      condition: true, // 기본값
      title: '균형잡힌 조화로운 성향',
      desc: '안정적이고 조화로운 성격을 가지고 있으며, 다양한 상황에 잘 적응합니다. 타인과의 관계에서 중재자 역할을 잘 수행하며, 평화를 추구하는 성향이 있습니다. 겸손하고 배려심이 깊어 많은 사람들에게 사랑받는 인격을 소유하고 있으며, 꾸준한 노력으로 자신의 목표를 차근차근 이루어 나가는 성실한 모습을 보입니다. 감정의 기복이 적고 안정된 심리상태를 유지하여 주변 사람들에게 편안함을 주는 존재입니다.',
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

// Gemini API 호출
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

  console.log('Gemini API 응답:', JSON.stringify(data));

  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  } else {
    console.error('Gemini API 오류:', data);
    throw new Error('Gemini API 응답 오류: ' + JSON.stringify(data));
  }
}

// Gemini 응답 파싱
function parseGeminiResponse(response) {
  try {
    console.log('=== 파싱 시작 ===');
    console.log('원본 응답 길이:', response.length);
    console.log('원본 응답 내용:', response);

    if (!response || response.trim().length === 0) {
      console.log('응답이 비어있음');
      return { score: null };
    }

    const lines = response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    console.log('파싱할 라인 수:', lines.length);

    const result = {};

    lines.forEach((line, index) => {
      console.log(`라인 ${index}: "${line}"`);

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

    if (result.score && result.score >= 70 && result.score <= 100) {
      console.log('✓ 유효한 Gemini 응답으로 판단');
      return result;
    } else {
      console.log('✗ 무효한 응답, 로컬 계산 사용 권장');
      return { score: null };
    }
  } catch (error) {
    console.error('파싱 중 오류:', error);
    return { score: null };
  }
}
