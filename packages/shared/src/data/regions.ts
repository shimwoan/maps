// 대한민국 행정구역 데이터 (통계청 코드 기준)
// 데이터 출처: https://github.com/southkorea/southkorea-maps (2018년 기준)

import regionsData from './regions-kostat-compact.json';

export interface Region {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface SiGunGu {
  code: string;
  name: string;
  sido: string;
  lat: number;
  lng: number;
}

export interface Dong {
  code: string;
  name: string;
  sigungu: string;
  lat: number;
  lng: number;
}

// 시/도 목록 (통계청 코드)
export const SIDO_LIST: Region[] = [
  { name: '서울특별시', code: '11', lat: 37.5665, lng: 126.978 },
  { name: '부산광역시', code: '21', lat: 35.1796, lng: 129.0756 },
  { name: '대구광역시', code: '22', lat: 35.8714, lng: 128.6014 },
  { name: '인천광역시', code: '23', lat: 37.4563, lng: 126.7052 },
  { name: '광주광역시', code: '24', lat: 35.1595, lng: 126.8526 },
  { name: '대전광역시', code: '25', lat: 36.3504, lng: 127.3845 },
  { name: '울산광역시', code: '26', lat: 35.5384, lng: 129.3114 },
  { name: '세종특별자치시', code: '29', lat: 36.4801, lng: 127.2892 },
  { name: '경기도', code: '31', lat: 37.4138, lng: 127.5183 },
  { name: '강원특별자치도', code: '32', lat: 37.8228, lng: 128.1555 },
  { name: '충청북도', code: '33', lat: 36.6357, lng: 127.4912 },
  { name: '충청남도', code: '34', lat: 36.5184, lng: 126.8 },
  { name: '전북특별자치도', code: '35', lat: 35.8203, lng: 127.1088 },
  { name: '전라남도', code: '36', lat: 34.8161, lng: 126.4629 },
  { name: '경상북도', code: '37', lat: 36.4919, lng: 128.8889 },
  { name: '경상남도', code: '38', lat: 35.4606, lng: 128.2132 },
  { name: '제주특별자치도', code: '39', lat: 33.4996, lng: 126.5312 },
];

// JSON에서 시군구 목록 로드
export const SIGUNGU_LIST: SiGunGu[] = regionsData.sigungu;

// JSON에서 읍면동 목록 로드
export const DONG_LIST: Dong[] = regionsData.dong;

// 시/도 코드로 시/군/구 목록 가져오기
export function getSigunguBySido(sidoCode: string): SiGunGu[] {
  return SIGUNGU_LIST.filter((item) => item.sido === sidoCode);
}

// 시/군/구 코드로 읍/면/동 목록 가져오기
export function getDongBySigungu(sigunguCode: string): Dong[] {
  return DONG_LIST.filter((item) => item.sigungu === sigunguCode);
}

// 시/도 이름으로 시/군/구 목록 가져오기
export function getSigunguBySidoName(sidoName: string): SiGunGu[] {
  const sido = SIDO_LIST.find((item) => item.name === sidoName);
  if (!sido) return [];
  return getSigunguBySido(sido.code);
}
