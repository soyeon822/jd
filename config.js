// =====================================================================
// TalentPulse 설정 파일
// ---------------------------------------------------------------------
// 아래 두 값을 본인 Supabase 프로젝트 값으로 바꾸면 "실시간 저장 모드"가 켜집니다.
//   Supabase 대시보드 > Project Settings > Data API (또는 API) 에서 확인:
//     - Project URL      → SUPABASE_URL
//     - anon public key  → SUPABASE_ANON_KEY   (공개돼도 안전한 키입니다)
//
// 비워두면(placeholder 그대로면) 자동으로 "데모 모드"로 동작합니다.
// anon key 는 공개용이라 GitHub 에 올려도 되지만, service_role 키는 절대 넣지 마세요.
// =====================================================================
window.TP_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",          // 예: https://abcdefgh.supabase.co
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY" // 예: eyJhbGciOi...
};
