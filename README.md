# 꽃마중

실제 꽃을 폰으로 찍어 전국 지도와 도감을 채우고, 그 사진의 색으로 꽃을 키우는 웹 게임입니다.

- `index.html`: 게임 화면
- `config.js`: 공개되어도 되는 Supabase 주소와 publishable key
- `supabase/schema.sql`: 데이터베이스 구조
- `supabase/functions/identify/index.ts`: 사진 감정 서버 함수
- `sw.js`, `manifest.webmanifest`: 홈 화면 앱 설정

지역 경계는 통계청 센서스용 행정구역경계(2018)를 [southkorea-maps](https://github.com/southkorea/southkorea-maps)에서 받아 간략화했습니다.
