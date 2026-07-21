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
  SUPABASE_URL: "https://edtppxxktzwxyietihbd.supabase.co", 
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHBweHhrdHp3eHlpZXRpaGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjk5NTUsImV4cCI6MjEwMDIwNTk1NX0.IhQ4l0iZjkhm6eFVCAWFI6qxmg4HUCsa-XQU39jaeH0"
};
