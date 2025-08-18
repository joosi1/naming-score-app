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

// 로컬 점수 계산 함수
function calculateLocalScore(name, hanja = '') {
  const nameLength = name.length;
  const hasHanja = hanja && hanja.trim().length > 0;

  // 이름 길이에 따른 기본 점수
  let baseScore = 70;
  if (nameLength === 2) baseScore = 75;
  else if (nameLength === 3) baseScore = 85;
  else if (nameLength === 4) baseScore = 80;

  // 한자가 있으면 보너스
  if (hasHanja) baseScore += 5;

  // 이름의 글자별 특성 분석 (간단한 알고리즘)
  let consonantBonus = 0;

  for (let char of name) {
    // 각 글자의 초성 분석 (간단한 방식)
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      const consonantIndex = Math.floor(code / 588);
      consonantBonus += consonantIndex % 3; // 0-2 보너스
    }
  }

  const finalScore = Math.min(
    100,
    Math.max(
      60,
      baseScore + consonantBonus + Math.floor(Math.random() * 10) - 5
    )
  );

  const personalities = [
    {
      title: '리더십이 강한 성향',
      desc: '타고난 지도력과 카리스마를 가지고 있으며, 사람들을 이끄는 능력이 뛰어납니다.',
      recommended: ['황금 액세서리', '붉은 보석', '목재 장식품'],
      avoid: ['검은 의류', '날카로운 도구', '차가운 금속'],
    },
    {
      title: '창의적이고 예술적인 성향',
      desc: '뛰어난 상상력과 창의성을 가지고 있으며, 예술적 감각이 발달되어 있습니다.',
      recommended: ['색상 있는 보석', '나비 모양 장식', '꽃무늬 소품'],
      avoid: ['무채색 옷', '각진 가구', '인공적인 소재'],
    },
    {
      title: '안정적이고 신중한 성향',
      desc: '차분하고 신중한 성격으로 주변 사람들에게 안정감을 주는 든든한 존재입니다.',
      recommended: ['자연석 팔찌', '초록색 식물', '둥근 모양 소품'],
      avoid: ['너무 밝은 색', '번쩍이는 장식', '소음이 나는 물건'],
    },
    {
      title: '활동적이고 에너지 넘치는 성향',
      desc: '왕성한 활동력과 긍정적인 에너지로 주변을 활기차게 만드는 성격입니다.',
      recommended: ['스포츠 용품', '밝은 색 액세서리', '움직이는 장식'],
      avoid: ['어두운 공간', '무거운 장신구', '정적인 환경'],
    },
  ];

  const selectedPersonality = personalities[finalScore % personalities.length];

  return {
    score: finalScore,
    grade: finalScore >= 85 ? '우수' : finalScore >= 70 ? '보통' : '개선필요',
    personalityTitle: selectedPersonality.title,
    personalityDesc: selectedPersonality.desc,
    recommended1: selectedPersonality.recommended[0],
    recommended2: selectedPersonality.recommended[1],
    recommended3: selectedPersonality.recommended[2],
    avoid1: selectedPersonality.avoid[0],
    avoid2: selectedPersonality.avoid[1],
    avoid3: selectedPersonality.avoid[2],
  };
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
