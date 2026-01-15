// 읍면동 데이터 추출 스크립트
// TopoJSON에서 geometry 제외하고 코드/이름만 추출 + 중심 좌표 계산

const SUBMUNI_URL = 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-submunicipalities-2018-geo.json';
const MUNI_URL = 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-geo.json';

// GeoJSON polygon의 중심점 계산
function getCentroid(coordinates) {
  let totalX = 0, totalY = 0, totalPoints = 0;

  function processRing(ring) {
    for (const point of ring) {
      totalX += point[0];
      totalY += point[1];
      totalPoints++;
    }
  }

  function processCoords(coords, type) {
    if (type === 'Polygon') {
      coords.forEach(ring => processRing(ring));
    } else if (type === 'MultiPolygon') {
      coords.forEach(polygon => polygon.forEach(ring => processRing(ring)));
    }
  }

  return { processCoords, getResult: () => totalPoints > 0 ? { lng: totalX / totalPoints, lat: totalY / totalPoints } : null };
}

async function main() {
  console.log('Downloading GeoJSON data...');

  // 시군구 데이터 다운로드 (GeoJSON)
  console.log('Fetching municipalities...');
  const muniResponse = await fetch(MUNI_URL);
  const muniData = await muniResponse.json();
  const muniFeatures = muniData.features;

  console.log(`\n시군구 데이터: ${muniFeatures.length}개`);
  console.log('Sample:', muniFeatures[0].properties);

  // 읍면동 데이터 다운로드 (GeoJSON)
  console.log('Fetching submunicipalities...');
  const submuniResponse = await fetch(SUBMUNI_URL);
  const submuniData = await submuniResponse.json();
  const submuniFeatures = submuniData.features;

  console.log(`\n읍면동 데이터: ${submuniFeatures.length}개`);

  // 시군구 목록 추출 (좌표 포함)
  const sigunguList = muniFeatures.map(feature => {
    const code = feature.properties.code;
    const centroid = getCentroid();
    centroid.processCoords(feature.geometry.coordinates, feature.geometry.type);
    const center = centroid.getResult();

    return {
      code,
      name: feature.properties.name,
      sido: code.substring(0, 2),
      lat: center ? Math.round(center.lat * 10000) / 10000 : 0,
      lng: center ? Math.round(center.lng * 10000) / 10000 : 0,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  // 읍면동 데이터 추출 (좌표 포함)
  const dongList = submuniFeatures.map(feature => {
    const code = feature.properties.code;
    const sigunguCode = code.substring(0, 5);
    const centroid = getCentroid();
    centroid.processCoords(feature.geometry.coordinates, feature.geometry.type);
    const center = centroid.getResult();

    return {
      code,
      name: feature.properties.name,
      sigungu: sigunguCode,
      lat: center ? Math.round(center.lat * 10000) / 10000 : 0,
      lng: center ? Math.round(center.lng * 10000) / 10000 : 0,
    };
  });

  console.log(`\n시군구: ${sigunguList.length}개`);
  console.log(`읍면동: ${dongList.length}개`);

  // JSON 파일로 저장
  const fs = await import('fs');

  // 통합 데이터 구조
  const regions = {
    sigungu: sigunguList,
    dong: dongList,
  };

  const outputPath = './packages/shared/src/data/regions-kostat.json';
  fs.writeFileSync(outputPath, JSON.stringify(regions, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  // 압축 버전
  const compactPath = './packages/shared/src/data/regions-kostat-compact.json';
  fs.writeFileSync(compactPath, JSON.stringify(regions));

  // 파일 크기 출력
  const stats = fs.statSync(outputPath);
  const compactStats = fs.statSync(compactPath);
  console.log(`\nFile sizes:`);
  console.log(`  Pretty: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Compact: ${(compactStats.size / 1024).toFixed(1)} KB`);

  // 시도별 시군구/동 개수 출력
  const sidoCodes = ['11', '26', '27', '28', '29', '30', '31', '36', '41', '42', '43', '44', '45', '46', '47', '48', '50'];
  const sidoNames = {
    '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
    '30': '대전', '31': '울산', '36': '세종', '41': '경기', '42': '강원',
    '43': '충북', '44': '충남', '45': '전북', '46': '전남', '47': '경북',
    '48': '경남', '50': '제주'
  };

  console.log('\n시도별 현황:');
  sidoCodes.forEach(sido => {
    const sCount = sigunguList.filter(s => s.sido === sido).length;
    const dCount = dongList.filter(d => d.sigungu.startsWith(sido)).length;
    console.log(`  ${sidoNames[sido]}: 시군구 ${sCount}개, 동 ${dCount}개`);
  });
}

main().catch(console.error);
