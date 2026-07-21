// =====================================================================
// TalentPulse 데이터 레이어
// - 설정(config.js)이 채워져 있으면 Supabase(실시간 저장) 모드
// - 아니면 localStorage(데모) 모드로 자동 전환
// 프론트 앱(index.html)은 window.TPDB 의 메서드만 호출한다.
// =====================================================================
(function () {
  const cfg = window.TP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.startsWith("YOUR_") &&
    !cfg.SUPABASE_ANON_KEY.startsWith("YOUR_");

  window.TP_LIVE = !!configured;
  const HKEY = "tp_history_v1";

  // ---------- 공통 유틸 ----------
  const localGet = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } };
  const localSet = (arr) => { try { localStorage.setItem(HKEY, JSON.stringify(arr)); } catch {} };

  // ========================================================
  // 데모(localStorage) 구현 — Supabase 미설정 시
  // ========================================================
  const demo = {
    live: false,
    async init() {},
    async listHistory() { return localGet(); },
    async saveAnalysis(entry) {
      const arr = localGet();
      entry.id = "h" + Date.now() + Math.floor(Math.random() * 999);
      entry.time = Date.now();
      arr.unshift(entry);
      localSet(arr.slice(0, 50));
      return entry.id;
    },
    async deleteHistory(id) { localSet(localGet().filter((h) => h.id !== id)); },
    async clearHistory() { localSet([]); },
    async loadAnalysis(id) { return localGet().find((h) => h.id === id) || null; },
    // 데모 모드에서는 실제 분석/업로드를 하지 않음(프론트가 mock 사용)
    async analyzeFiles() { throw new Error("demo"); },
    async marketSummary() { throw new Error("demo"); },
    async ai() { throw new Error("AI 도구는 실시간 모드(Supabase 연결)에서만 동작합니다."); },
    async saveProfile(p) { try { localStorage.setItem("tp_profile", JSON.stringify(p)); } catch {} },
    async loadProfile() { try { return JSON.parse(localStorage.getItem("tp_profile")) || { resume_text: "", portfolio_text: "" }; } catch { return { resume_text: "", portfolio_text: "" }; } },
  };

  // ========================================================
  // 실시간(Supabase) 구현
  // ========================================================
  function makeLive() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const FN = `${cfg.SUPABASE_URL}/functions/v1/analyze`;
    let userId = null;

    async function ensureAuth() {
      if (userId) return userId;
      let { data } = await sb.auth.getUser();
      if (!data?.user) {
        // 익명 로그인(대시보드 Authentication > Providers > Anonymous 활성화 필요)
        const { data: s, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        data = { user: s.user };
      }
      userId = data.user.id;
      return userId;
    }

    async function callFn(payload) {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(FN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || cfg.SUPABASE_ANON_KEY}`,
          "apikey": cfg.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`analyze fn ${res.status}: ${await res.text()}`);
      return res.json();
    }

    return {
      live: true,
      async init() { await ensureAuth(); },

      // 파일들을 Storage 에 업로드 → 경로 반환
      async uploadFile(file) {
        const uid = await ensureAuth();
        const path = `${uid}/${Date.now()}_${file.name}`;
        const { error } = await sb.storage.from("job-postings").upload(path, file, { upsert: false });
        if (error) throw error;
        return path;
      },

      // Edge Function 호출: 이미지 dataUrl 또는 텍스트 → 구조화 추출
      async analyzeFiles(files) {
        const out = await callFn({ mode: "extract", files });
        return out.results || [];
      },

      // 전체 공고 종합 요약/인사이트
      async marketSummary(postings) {
        return callFn({ mode: "summary", postings });
      },

      // 커리어 AI 도구
      async ai(task, context) {
        const out = await callFn({ mode: "ai", task, context });
        return out.result;
      },

      // 마이페이지 프로필 저장/불러오기
      async saveProfile(p) {
        const uid = await ensureAuth();
        const { error } = await sb.from("profiles").upsert({
          user_id: uid, resume_text: p.resume_text || "", portfolio_text: p.portfolio_text || "", updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      },
      async loadProfile() {
        await ensureAuth();
        const { data } = await sb.from("profiles").select("*").maybeSingle();
        return data || { resume_text: "", portfolio_text: "" };
      },

      // 기록 목록
      async listHistory() {
        await ensureAuth();
        const { data, error } = await sb.from("analyses").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return (data || []).map((r) => ({
          id: r.id, time: new Date(r.created_at).getTime(), type: r.type,
          title: r.title, meta: r.meta, seconds: r.seconds, resumeText: r.resume_text,
        }));
      },

      // 분석/이력서 기록 저장 (+ 공고들 함께 저장)
      async saveAnalysis(entry, postings) {
        const uid = await ensureAuth();
        const { data, error } = await sb.from("analyses").insert({
          user_id: uid, type: entry.type, title: entry.title, meta: entry.meta,
          seconds: entry.seconds || 0, resume_text: entry.resumeText || null,
          file_count: entry.fileCount || 0, ok_count: entry.okCount || 0,
          company_count: entry.companyCount || 0, summary: entry.summary || null,
          insights: entry.insights || [], kpi: entry.kpi || {},
        }).select("id").single();
        if (error) throw error;
        const analysisId = data.id;

        if (postings && postings.length) {
          const rows = postings.map((p) => ({
            analysis_id: analysisId, file_name: p.file_name || null, file_path: p.file_path || null,
            ocr_status: p.ocr_status || "ok", ocr_text: p.ocr_text || null, data: p.data || p,
          }));
          const { error: e2 } = await sb.from("postings").insert(rows);
          if (e2) throw e2;
        }
        return analysisId;
      },

      async deleteHistory(id) { await sb.from("analyses").delete().eq("id", id); },
      async clearHistory() { await sb.from("analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000"); },

      async loadAnalysis(id) {
        const { data: a } = await sb.from("analyses").select("*").eq("id", id).single();
        if (!a) return null;
        const { data: ps } = await sb.from("postings").select("*").eq("analysis_id", id);
        return {
          id: a.id, time: new Date(a.created_at).getTime(), type: a.type, title: a.title,
          meta: a.meta, seconds: a.seconds, resumeText: a.resume_text,
          summary: a.summary, insights: a.insights, kpi: a.kpi,
          postings: (ps || []).map((r) => ({ ...r.data, _ocr: r.ocr_text, _status: r.ocr_status, _file: r.file_name })),
        };
      },
    };
  }

  window.TPDB = configured ? makeLive() : demo;
  // 초기화(익명 로그인 등)는 백그라운드로
  Promise.resolve().then(() => window.TPDB.init && window.TPDB.init()).catch((e) => {
    console.warn("TPDB init 실패, 데모로 폴백:", e);
    window.TP_LIVE = false;
    window.TPDB = demo;
  });
})();
