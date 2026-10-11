"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type Screen = "dashboard" | "instructions" | "exam" | "result";
type DashboardSection = "home" | "simulators" | "performance" | "topics" | "favorites" | "errors" | "settings";
type Filter = "Todos" | "Geral" | "Por tema" | "Blindagem" | "Caderno de erros" | "Favoritos";
type SupportedMode = "REAL" | "BLINDAGEM" | "TOPIC" | "QUICK_REVIEW" | "ERROR_NOTEBOOK" | "FAVORITES" | "SPACED_REVIEW";
type SessionQuestion = { id: string; position: number; topic: { code: string; name: string }; statement: string; options: Array<{ id: string; text: string }>; selectedOptionId?: string | null; flagged?: boolean };
type ActiveSession = { id: string; mode: SupportedMode; startedAt: string; durationMinutes: number; remainingSeconds?: number; questions: SessionQuestion[] };
type ReviewItem = { questionId: string; position: number; selectedOptionId: string | null; correctOptionId: string; isCorrect: boolean; explanation: string; commonTrap: string | null; sources: Array<{ locator: string; officialUrl: string; versionLabel: string }> };
type SubmissionResult = { sessionId: string; score: number; total: number; percentage: number; passed: boolean; review: ReviewItem[] };
type TrainingCard = { eyebrow: string; title: string; description: string; meta: string[]; type: Exclude<Filter, "Todos">; accent: string; mode: SupportedMode; available: boolean };
type SessionHistory = { summary: { completedSessions: number; inProgressSessions: number; averagePercentage: number | null; uniqueQuestions: number }; sessions: Array<{ id: string; mode: SupportedMode; status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED"; startedAt: string; submittedAt: string | null; questionCount: number; answerCount: number; score: number | null }> };
type RevisionItem = { questionId: string; statement: string; topic: { code: string; name: string }; sessionId?: string; occurredAt?: string | null; createdAt?: string };
type TopicMetric = { code: string; name: string; availableQuestions: number; answered: number; correct: number; percentage: number | null };
type RevisionData = { errors: RevisionItem[]; bookmarks: RevisionItem[]; spacedReview: { dueCount: number; nextDueAt: string | null }; examAvailability: { real: boolean; blindagem: boolean; coverage: Array<{ code: string; required: number; availableFamilies: number }> }; topicMetrics: TopicMetric[] };
type UserProfile = { id: string; name: string; email: string; examDate: string | null };

const configurableModes = new Set<SupportedMode>(["TOPIC", "QUICK_REVIEW", "ERROR_NOTEBOOK", "FAVORITES", "SPACED_REVIEW"]);

const cards: TrainingCard[] = [
  { eyebrow: "MATRIZ OFICIAL", title: "Simulado geral", description: "A experiência completa da prova, com a distribuição oficial por tema.", meta: ["80 questões", "2h30", "Banco em expansão"], type: "Geral", accent: "blue", mode: "REAL", available: false },
  { eyebrow: "LOTE VALIDADO", title: "Revisão rápida", description: "Questões conferidas individualmente, com explicações e fontes rastreáveis.", meta: ["5 questões", "10 min", "Persistido"], type: "Por tema", accent: "violet", mode: "QUICK_REVIEW", available: true },
  { eyebrow: "ALTA DIFICULDADE", title: "Simulado blindagem", description: "Mesma matriz oficial, com mais casos avançados e alternativas próximas.", meta: ["80 questões", "2h30", "Banco em expansão"], type: "Blindagem", accent: "amber", mode: "BLINDAGEM", available: false },
  { eyebrow: "TREINO PESSOAL", title: "Treinar meus erros", description: "Nova sessão formada pelas questões que você errou em sessões anteriores.", meta: ["Até 20 questões", "Pessoal", "Persistido"], type: "Caderno de erros", accent: "amber", mode: "ERROR_NOTEBOOK", available: true },
  { eyebrow: "TREINO PESSOAL", title: "Treinar favoritos", description: "Nova sessão formada pelas questões que você marcou para revisar depois.", meta: ["Até 20 questões", "Pessoal", "Persistido"], type: "Favoritos", accent: "violet", mode: "FAVORITES", available: true },
  { eyebrow: "REPETIÇÃO ESPAÇADA", title: "Revisões vencidas", description: "Questões agendadas automaticamente conforme seus acertos e erros anteriores.", meta: ["Até 20 questões", "Agendado", "Adaptativo"], type: "Por tema", accent: "blue", mode: "SPACED_REVIEW", available: true },
];
const nav: Array<{ icon: string; label: string; section: DashboardSection }> = [
  { icon: "home", label: "Início", section: "home" },
  { icon: "file", label: "Simulados", section: "simulators" },
  { icon: "chart", label: "Desempenho", section: "performance" },
  { icon: "layers", label: "Revisão por tema", section: "topics" },
  { icon: "star", label: "Favoritos", section: "favorites" },
  { icon: "book", label: "Caderno de erros", section: "errors" },
  { icon: "settings", label: "Configurações", section: "settings" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = { home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>, file: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>, chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>, layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>, star: <path d="m12 2.5 3 6 6.5.9-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.6 6.5-.9 3-6Z"/>, book: <><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M7 16h11M8 8h6"/></>, settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, arrow: <path d="m9 18 6-6-6-6"/> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function modeLabel(mode: SupportedMode) {
  if (mode === "REAL") return "Simulado geral";
  if (mode === "BLINDAGEM") return "Blindagem";
  if (mode === "ERROR_NOTEBOOK") return "Treino do caderno de erros";
  if (mode === "FAVORITES") return "Treino de favoritos";
  if (mode === "SPACED_REVIEW") return "Repetição espaçada";
  if (mode === "TOPIC") return "Revisão por tema";
  return "Revisão rápida";
}

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [section, setSection] = useState<DashboardSection>("simulators");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("Todos");
  const [selectedCard, setSelectedCard] = useState<TrainingCard>(cards[1]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [history, setHistory] = useState<SessionHistory | null>(null);
  const [revision, setRevision] = useState<RevisionData | null>(null);
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [selectedTopicCode, setSelectedTopicCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const submissionLock = useRef(false);

  const loadHistory = useCallback(async () => {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    if (response.status === 401) { setHistory(null); return; }
    if (response.ok) setHistory(await response.json() as SessionHistory);
  }, []);

  const loadRevision = useCallback(async () => {
    const response = await fetch("/api/revision", { cache: "no-store" });
    if (response.ok) setRevision(await response.json() as RevisionData);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/sessions", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as SessionHistory : null)
      .then((payload) => { if (active && payload) setHistory(payload); })
      .catch(() => undefined);
    fetch("/api/revision", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as RevisionData : null)
      .then((payload) => { if (active && payload) setRevision(payload); })
      .catch(() => undefined);
    fetch("/api/me", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as UserProfile : null)
      .then((payload) => { if (active && payload) setProfile(payload); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const submitExam = useCallback(async () => {
    if (!activeSession || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const payload = Object.fromEntries(activeSession.questions.map((question, index) => [question.id, { selectedOptionId: answers[index] ?? null, flagged: flags.includes(index), elapsedSeconds: 0 }]));
      const response = await fetch(`/api/sessions/${activeSession.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) });
      const responseBody = await response.json() as SubmissionResult | { error?: string };
      if (!response.ok || !("score" in responseBody)) throw new Error("error" in responseBody && responseBody.error ? responseBody.error : "Não foi possível finalizar a sessão.");
      setResult(responseBody);
      setScreen("result");
      void loadHistory();
      void loadRevision();
    } catch (error) {
      submissionLock.current = false;
      setIsSubmitting(false);
      setSubmissionError(error instanceof Error ? error.message : "Não foi possível finalizar a sessão.");
    }
  }, [activeSession, answers, flags, loadHistory, loadRevision]);

  useEffect(() => {
    if (screen !== "exam" || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => { if (value <= 1) { void submitExam(); return 0; } return value - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [screen, seconds, submitExam]);

  async function beginExam(mode: SupportedMode = selectedCard.mode, topicCodeOverride?: string) {
    if (isStarting) return;
    setIsStarting(true);
    setSubmissionError("");
    try {
      const configuration = configurableModes.has(mode)
        ? { questionCount, durationMinutes, ...(mode === "TOPIC" ? { topicCode: topicCodeOverride ?? selectedTopicCode } : {}) }
        : {};
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, ...configuration }) });
      const responseBody = await response.json() as ActiveSession | { error?: string };
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok || !("questions" in responseBody)) throw new Error("error" in responseBody && responseBody.error ? responseBody.error : "Não foi possível iniciar a sessão.");
      submissionLock.current = false;
      setIsSubmitting(false);
      setActiveSession(responseBody);
      setQuestionIndex(0);
      setAnswers({});
      setFlags([]);
      setResult(null);
      setBookmarkedQuestionIds(revision?.bookmarks.map((bookmark) => bookmark.questionId) ?? []);
      setSeconds(responseBody.durationMinutes * 60);
      setScreen("exam");
      void loadHistory();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Não foi possível iniciar a sessão.");
    } finally {
      setIsStarting(false);
    }
  }

  async function resumeSession(sessionId: string) {
    setSubmissionError("");
    const response = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
    if (response.status === 401) { router.push("/login"); return; }
    const responseBody = await response.json() as (ActiveSession & { status: string }) | { error?: string };
    if (!response.ok || !("questions" in responseBody) || responseBody.status !== "IN_PROGRESS") {
      setSubmissionError("error" in responseBody && responseBody.error ? responseBody.error : "Não foi possível retomar a sessão.");
      return;
    }

    const restoredAnswers = Object.fromEntries(responseBody.questions.flatMap((question, index) => question.selectedOptionId ? [[index, question.selectedOptionId]] : []));
    const restoredFlags = responseBody.questions.flatMap((question, index) => question.flagged ? [index] : []);
    submissionLock.current = false;
    setIsSubmitting(false);
    setActiveSession(responseBody);
    setAnswers(restoredAnswers);
    setFlags(restoredFlags);
    setQuestionIndex(0);
    setSeconds(Math.max(1, responseBody.remainingSeconds ?? responseBody.durationMinutes * 60));
    setScreen("exam");
  }

  async function openResult(sessionId: string) {
    setSubmissionError("");
    const response = await fetch(`/api/sessions/${sessionId}/result`, { cache: "no-store" });
    if (response.status === 401) { router.push("/login"); return; }
    const responseBody = await response.json() as { session: ActiveSession; result: SubmissionResult; bookmarkedQuestionIds: string[] } | { error?: string };
    if (!response.ok || !("session" in responseBody)) {
      setSubmissionError("error" in responseBody && responseBody.error ? responseBody.error : "Não foi possível abrir o resultado.");
      return;
    }
    setActiveSession(responseBody.session);
    setResult(responseBody.result);
    setBookmarkedQuestionIds(responseBody.bookmarkedQuestionIds);
    setQuestionCount(responseBody.session.questions.length);
    setDurationMinutes(responseBody.session.durationMinutes);
    setSelectedTopicCode(responseBody.session.mode === "TOPIC" ? responseBody.session.questions[0]?.topic.code ?? null : null);
    setScreen("result");
  }

  async function toggleBookmark(questionId: string) {
    const bookmarked = bookmarkedQuestionIds.includes(questionId)
      || Boolean(revision?.bookmarks.some((bookmark) => bookmark.questionId === questionId));
    const response = await fetch("/api/bookmarks", {
      method: bookmarked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    if (!response.ok) {
      setSubmissionError("Não foi possível atualizar o favorito.");
      return;
    }
    setBookmarkedQuestionIds(bookmarked
      ? bookmarkedQuestionIds.filter((id) => id !== questionId)
      : [...bookmarkedQuestionIds, questionId]);
    void loadRevision();
  }

  function saveDraft(index: number, selectedOptionId: string | null, flagged: boolean) {
    if (!activeSession) return;
    const question = activeSession.questions[index];
    void fetch(`/api/sessions/${activeSession.id}/answers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        selectedOptionId,
        flagged,
        elapsedSeconds: Math.max(0, activeSession.durationMinutes * 60 - seconds),
      }),
    }).then((response) => {
      if (!response.ok) setSubmissionError("Não foi possível salvar automaticamente esta resposta.");
      else void loadHistory();
    }).catch(() => setSubmissionError("Não foi possível salvar automaticamente esta resposta."));
  }

  function configureCard(card: TrainingCard, topicCode: string | null = null) {
    setSelectedCard(card);
    setSelectedTopicCode(topicCode);
    setQuestionCount(card.mode === "TOPIC" ? 1 : 5);
    setDurationMinutes(10);
    setSubmissionError("");
    setScreen("instructions");
  }

  function configurePersonalMode(mode: "ERROR_NOTEBOOK" | "FAVORITES" | "SPACED_REVIEW") {
    const card = cards.find((candidate) => candidate.mode === mode);
    if (card) configureCard(card);
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  if (screen === "instructions") return <Instructions card={selectedCard} error={submissionError} isStarting={isStarting} questionCount={questionCount} durationMinutes={durationMinutes} onQuestionCountChange={setQuestionCount} onDurationChange={setDurationMinutes} onBack={() => { setSubmissionError(""); setScreen("dashboard"); }} onStart={() => void beginExam()}/>;
  if (screen === "result" && result && activeSession) return <Result result={result} questions={activeSession.questions} bookmarkedQuestionIds={bookmarkedQuestionIds} onToggleBookmark={(questionId) => void toggleBookmark(questionId)} onHome={() => { void loadHistory(); void loadRevision(); setScreen("dashboard"); }} onRetry={() => void beginExam(activeSession.mode, activeSession.mode === "TOPIC" ? activeSession.questions[0]?.topic.code : undefined)}/>;

  if (screen === "exam" && activeSession) {
    const question = activeSession.questions[questionIndex];
    return <div className="exam-shell"><header className="exam-topbar"><button className="brand brand-dark" onClick={() => setScreen("dashboard")} aria-label="Voltar ao início"><BrandMark/><span>Clareza<span>AI</span></span></button><div className="exam-title"><span>{modeLabel(activeSession.mode)}</span><small>Sessão pessoal • {activeSession.questions.length} questões</small></div><div className="timer"><Icon name="clock"/><span><small>TEMPO RESTANTE</small>{minutes}:{secs}</span></div><button className="outline-button" disabled={isSubmitting} onClick={() => void submitExam()}>{isSubmitting ? "Enviando…" : "Finalizar"}</button></header><main className="exam-layout"><section className="question-panel">{submissionError && <div className="submission-error" role="alert">{submissionError}</div>}<div className="question-kicker"><span>Questão {questionIndex + 1} de {activeSession.questions.length}</span><span className="topic-pill">TEMA {question.topic.code} · {question.topic.name}</span></div><div className="progress-track"><i style={{ width: `${((questionIndex + 1) / activeSession.questions.length) * 100}%` }}/></div><h1>{question.statement}</h1><div className="options" role="radiogroup">{question.options.map((option, index) => <button key={option.id} role="radio" aria-checked={answers[questionIndex] === option.id} className={`option ${answers[questionIndex] === option.id ? "selected" : ""}`} onClick={() => { setAnswers({ ...answers, [questionIndex]: option.id }); saveDraft(questionIndex, option.id, flags.includes(questionIndex)); }}><span>{String.fromCharCode(65 + index)}</span><p>{option.text}</p></button>)}</div><div className="question-actions"><button className={`flag-button ${flags.includes(questionIndex) ? "active" : ""}`} onClick={() => { const nextFlagged = !flags.includes(questionIndex); setFlags(nextFlagged ? [...flags, questionIndex] : flags.filter((index) => index !== questionIndex)); saveDraft(questionIndex, answers[questionIndex] ?? null, nextFlagged); }}>☆ {flags.includes(questionIndex) ? "Marcada para revisão" : "Marcar para revisão"}</button><div><button className="text-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(questionIndex - 1)}>Anterior</button><button className="primary-button" disabled={isSubmitting} onClick={() => questionIndex === activeSession.questions.length - 1 ? void submitExam() : setQuestionIndex(questionIndex + 1)}>{isSubmitting ? "Enviando…" : questionIndex === activeSession.questions.length - 1 ? "Finalizar sessão" : "Próxima questão"}<Icon name="arrow"/></button></div></div></section><aside className="question-nav"><h2>Navegação</h2><p>Acompanhe seu progresso</p><div className="number-grid">{activeSession.questions.map((_, index) => <button key={index} onClick={() => setQuestionIndex(index)} className={`${index === questionIndex ? "current" : ""} ${answers[index] ? "answered" : ""} ${flags.includes(index) ? "flagged" : ""}`}>{index + 1}</button>)}</div><div className="legend"><span><i className="dot answered"/>Respondida</span><span><i className="dot current"/>Atual</span><span><i className="dot flagged"/>Revisão</span></div><div className="exam-summary"><span><strong>{Object.keys(answers).length}</strong> respondidas</span><span><strong>{activeSession.questions.length - Object.keys(answers).length}</strong> em branco</span></div></aside></main></div>; 
  }

  return <Dashboard
    section={section}
    mobileMenuOpen={mobileMenuOpen}
    filter={filter}
    history={history}
    revision={revision}
    profile={profile}
    error={submissionError}
    onNavigate={(nextSection) => { setSection(nextSection); setMobileMenuOpen(false); setSubmissionError(""); }}
    onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
    onFilterChange={setFilter}
    onConfigureCard={configureCard}
    onConfigurePersonal={configurePersonalMode}
    onConfigureTopic={(topic) => configureCard({
      eyebrow: `TEMA ${topic.code}`,
      title: `Revisão do Tema ${topic.code}`,
      description: topic.name,
      meta: [`Até ${topic.availableQuestions} questões`, "Por tema", "Persistido"],
      type: "Por tema",
      accent: "blue",
      mode: "TOPIC",
      available: topic.availableQuestions > 0,
    }, topic.code)}
    onResume={(sessionId) => void resumeSession(sessionId)}
    onOpenResult={(sessionId) => void openResult(sessionId)}
    onRemoveBookmark={(questionId) => void toggleBookmark(questionId)}
    onProfileSaved={setProfile}
    onSignOut={() => void signOut()}
  />;
}

type DashboardProps = {
  section: DashboardSection;
  mobileMenuOpen: boolean;
  filter: Filter;
  history: SessionHistory | null;
  revision: RevisionData | null;
  profile: UserProfile | null;
  error: string;
  onNavigate: (section: DashboardSection) => void;
  onToggleMobileMenu: () => void;
  onFilterChange: (filter: Filter) => void;
  onConfigureCard: (card: TrainingCard) => void;
  onConfigurePersonal: (mode: "ERROR_NOTEBOOK" | "FAVORITES" | "SPACED_REVIEW") => void;
  onConfigureTopic: (topic: TopicMetric) => void;
  onResume: (sessionId: string) => void;
  onOpenResult: (sessionId: string) => void;
  onRemoveBookmark: (questionId: string) => void;
  onProfileSaved: (profile: UserProfile) => void;
  onSignOut: () => void;
};

const sectionCopy: Record<DashboardSection, { eyebrow: string; title: string; description: string }> = {
  home: { eyebrow: "VISÃO GERAL", title: "Início", description: "Acompanhe sua preparação e continue de onde parou." },
  simulators: { eyebrow: "PREPARAÇÃO ANCORD", title: "Simulados", description: "Treine como na prova. Evolua com clareza." },
  performance: { eyebrow: "EVOLUÇÃO PESSOAL", title: "Desempenho", description: "Entenda seus resultados e priorize os pontos mais fracos." },
  topics: { eyebrow: "MATRIZ ANCORD", title: "Revisão por tema", description: "Escolha um tema com questões ativas e monte uma sessão focada." },
  favorites: { eyebrow: "BIBLIOTECA PESSOAL", title: "Favoritos", description: "Retome as questões que você separou para estudar novamente." },
  errors: { eyebrow: "APRENDIZADO DIRECIONADO", title: "Caderno de erros", description: "Revise os erros acumulados e transforme-os em repertório." },
  settings: { eyebrow: "CONTA E PLANEJAMENTO", title: "Configurações", description: "Atualize seu perfil e a data prevista para a prova." },
};

function Dashboard(props: DashboardProps) {
  const copy = sectionCopy[props.section];
  const recentSessions = props.history?.sessions.slice(0, 5) ?? [];
  const metrics = props.revision?.topicMetrics ?? [];
  const initials = props.profile?.name
    ? props.profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "AI";
  const examDate = props.profile?.examDate ? new Date(`${props.profile.examDate}T12:00:00`) : null;
  const [renderedAt] = useState(() => Date.now());
  const daysUntilExam = examDate ? Math.ceil((examDate.getTime() - renderedAt) / 86_400_000) : null;

  return <div className="app-shell">
    {props.mobileMenuOpen && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={props.onToggleMobileMenu}/>}
    <aside className={`sidebar ${props.mobileMenuOpen ? "mobile-open" : ""}`}>
      <button className="brand sidebar-brand" onClick={() => props.onNavigate("home")}><BrandMark/><span>Clareza<span>AI</span></span></button>
      <nav>{nav.map((item) => <button key={item.section} className={props.section === item.section ? "active" : ""} onClick={() => props.onNavigate(item.section)}><Icon name={item.icon}/><span>{item.label}</span>{item.section === "favorites" && (props.revision?.bookmarks.length ?? 0) > 0 && <b>{props.revision?.bookmarks.length}</b>}{item.section === "errors" && (props.revision?.errors.length ?? 0) > 0 && <b>{props.revision?.errors.length}</b>}</button>)}</nav>
      <button className="sidebar-foot" onClick={() => props.onNavigate("settings")}><span className="avatar">{initials}</span><span><strong>{props.profile?.name || "Sua conta"}</strong><small>{props.profile?.email || "Sessões protegidas"}</small></span><span>•••</span></button>
    </aside>
    <main className="dashboard">
      <header className="mobile-header"><button className="brand brand-dark" onClick={() => props.onNavigate("home")}><BrandMark/><span>Clareza<span>AI</span></span></button><button aria-label="Abrir menu" onClick={props.onToggleMobileMenu}>☰</button></header>
      <section className="hero-row"><div><p className="overline">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div><div className="exam-date"><span><Icon name="clock"/></span><div><small>{examDate ? "DATA DA PROVA" : "PLANEJAMENTO"}</small><strong>{examDate ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(examDate) : "Defina sua prova"}</strong><em>{daysUntilExam === null ? "Configure seu objetivo" : daysUntilExam < 0 ? "Data já passou" : daysUntilExam === 0 ? "É hoje" : `${daysUntilExam} dias restantes`}</em></div></div></section>
      {props.error && <div className="submission-error" role="alert">{props.error}</div>}
      {props.section === "home" && <HomeSection history={props.history} revision={props.revision} sessions={recentSessions} onNavigate={props.onNavigate} onConfigureSpaced={() => props.onConfigurePersonal("SPACED_REVIEW")} onResume={props.onResume} onOpenResult={props.onOpenResult}/>} 
      {props.section === "simulators" && <SimulatorsSection filter={props.filter} sessions={recentSessions} availability={props.revision?.examAvailability ?? null} onFilterChange={props.onFilterChange} onConfigure={props.onConfigureCard} onResume={props.onResume} onOpenResult={props.onOpenResult}/>} 
      {props.section === "performance" && <PerformanceSection history={props.history} metrics={metrics} sessions={recentSessions} onOpenResult={props.onOpenResult}/>} 
      {props.section === "topics" && <TopicsSection metrics={metrics} onConfigure={props.onConfigureTopic}/>} 
      {props.section === "favorites" && <RevisionSection kind="favorites" items={props.revision?.bookmarks ?? []} onConfigure={() => props.onConfigurePersonal("FAVORITES")} onOpenResult={props.onOpenResult} onRemoveBookmark={props.onRemoveBookmark}/>} 
      {props.section === "errors" && <RevisionSection kind="errors" items={props.revision?.errors ?? []} onConfigure={() => props.onConfigurePersonal("ERROR_NOTEBOOK")} onOpenResult={props.onOpenResult} onRemoveBookmark={props.onRemoveBookmark}/>} 
      {props.section === "settings" && <SettingsSection key={`${props.profile?.id ?? "loading"}:${props.profile?.name ?? ""}:${props.profile?.examDate ?? ""}`} profile={props.profile} onSaved={props.onProfileSaved} onSignOut={props.onSignOut}/>} 
      <footer>Plataforma independente de preparação. Não afiliada à ANCORD, FGV ou CVM.</footer>
    </main>
  </div>;
}

function ReadinessCard({ history }: { history: SessionHistory | null }) {
  const average = history?.summary.averagePercentage;
  return <section className="readiness-card"><div className="score-ring" style={{ background: `conic-gradient(#54a0ff 0 ${average ?? 0}%,#294562 ${average ?? 0}%)` }}><span><strong>{average ?? "—"}</strong>{average !== null && average !== undefined ? "/100" : ""}</span></div><div className="readiness-copy"><p className="overline">MÉDIA RECENTE</p><h2>{average === null || average === undefined ? "Complete sua primeira sessão." : "Desempenho calculado com dados reais."}</h2><p>{average === null || average === undefined ? "A média aparecerá quando houver uma sessão finalizada." : "Média das últimas cinco sessões concluídas."}</p><div className="score-bar"><i style={{ width: `${average ?? 0}%` }}/></div><div className="score-labels"><span>Em preparação</span><span>Quase pronto</span><span>Blindado</span></div></div><div className="readiness-stats"><span><small>SESSÕES CONCLUÍDAS</small><strong>{history?.summary.completedSessions ?? 0}</strong><em>{history?.summary.inProgressSessions ?? 0} em andamento</em></span><span><small>QUESTÕES ÚNICAS</small><strong>{history?.summary.uniqueQuestions ?? 0}</strong><em>respondidas e corrigidas</em></span></div></section>;
}

function HomeSection({ history, revision, sessions, onNavigate, onConfigureSpaced, onResume, onOpenResult }: { history: SessionHistory | null; revision: RevisionData | null; sessions: SessionHistory["sessions"]; onNavigate: (section: DashboardSection) => void; onConfigureSpaced: () => void; onResume: (id: string) => void; onOpenResult: (id: string) => void }) {
  return <><ReadinessCard history={history}/><section className="menu-action-grid"><button onClick={() => onNavigate("simulators")}><Icon name="file" size={23}/><span><strong>Iniciar um simulado</strong><small>Escolha e configure seu próximo treino.</small></span><Icon name="arrow"/></button><button onClick={onConfigureSpaced}><Icon name="clock" size={23}/><span><strong>{revision?.spacedReview.dueCount ?? 0} revisões vencidas</strong><small>Pratique no ritmo da repetição espaçada.</small></span><Icon name="arrow"/></button><button onClick={() => onNavigate("errors")}><Icon name="book" size={23}/><span><strong>{revision?.errors.length ?? 0} questões no caderno</strong><small>Volte aos pontos que precisam de atenção.</small></span><Icon name="arrow"/></button></section><HistoryList sessions={sessions} onResume={onResume} onOpenResult={onOpenResult}/></>;
}

function SimulatorsSection({ filter, sessions, availability, onFilterChange, onConfigure, onResume, onOpenResult }: { filter: Filter; sessions: SessionHistory["sessions"]; availability: RevisionData["examAvailability"] | null; onFilterChange: (filter: Filter) => void; onConfigure: (card: TrainingCard) => void; onResume: (id: string) => void; onOpenResult: (id: string) => void }) {
  const liveCards = cards.map((card) => card.mode === "REAL"
    ? { ...card, available: availability?.real ?? false, meta: ["80 questões", "2h30", availability?.real ? "Cobertura completa" : "Banco em expansão"] }
    : card.mode === "BLINDAGEM"
      ? { ...card, available: availability?.blindagem ?? false, meta: ["80 questões", "2h30", availability?.blindagem ? "Cobertura avançada" : "Banco em expansão"] }
      : card.mode === "QUICK_REVIEW"
        ? { ...card, meta: [`${availability?.coverage.reduce((total, topic) => total + topic.availableFamilies, 0) ?? 0} questões`, "10 min", "Persistido"] }
        : card);
  const filtered = filter === "Todos" ? liveCards : liveCards.filter((card) => card.type === filter);
  return <><section className="section-head"><div><h2>Escolha seu treino</h2><p>A matriz oficial define a prova; o banco ativo define o que já pode ser praticado.</p></div><div className="norm-badge"><span>✓</span><p><strong>Fontes verificadas</strong><small>Revisão editorial ativa</small></p></div></section><div className="filter-row">{(["Todos", "Geral", "Por tema", "Blindagem", "Caderno de erros", "Favoritos"] as Filter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => onFilterChange(item)}>{item}</button>)}</div><section className="training-grid">{filtered.map((card) => <article className={`training-card ${card.accent} ${card.available ? "" : "unavailable"}`} key={card.title}><div className="card-icon"><Icon name={card.type === "Geral" ? "file" : card.type === "Blindagem" ? "star" : "chart"} size={22}/></div><p className="overline">{card.eyebrow}</p><h3>{card.title}</h3><p>{card.description}</p><div className="card-meta">{card.meta.map((item) => <span key={item}>{item}</span>)}</div><button onClick={() => onConfigure(card)}>{card.available ? "Configurar sessão" : "Ver cobertura"} <Icon name="arrow"/></button></article>)}</section><HistoryList sessions={sessions} onResume={onResume} onOpenResult={onOpenResult}/></>;
}

function PerformanceSection({ history, metrics, sessions, onOpenResult }: { history: SessionHistory | null; metrics: TopicMetric[]; sessions: SessionHistory["sessions"]; onOpenResult: (id: string) => void }) {
  return <><ReadinessCard history={history}/><section className="section-head"><div><h2>Desempenho por tema</h2><p>Percentuais calculados com todas as respostas corrigidas.</p></div></section><div className="performance-list">{metrics.map((topic) => <article key={topic.code}><div><span>TEMA {topic.code}</span><strong>{topic.name}</strong><small>{topic.answered === 0 ? "Ainda não respondido" : `${topic.correct} acertos em ${topic.answered} respostas`}</small></div><div className="metric-bar"><i style={{ width: `${topic.percentage ?? 0}%` }}/></div><b>{topic.percentage === null ? "—" : `${topic.percentage}%`}</b></article>)}</div><HistoryList sessions={sessions.filter((session) => session.status === "SUBMITTED")} onResume={() => undefined} onOpenResult={onOpenResult}/></>;
}

function TopicsSection({ metrics, onConfigure }: { metrics: TopicMetric[]; onConfigure: (topic: TopicMetric) => void }) {
  return <><section className="section-head"><div><h2>Conteúdo programático</h2><p>Os temas ficam disponíveis assim que recebem questões validadas.</p></div></section><div className="topic-grid">{metrics.map((topic) => <article key={topic.code} className={topic.availableQuestions === 0 ? "unavailable" : ""}><span>TEMA {topic.code}</span><h2>{topic.name}</h2><p>{topic.answered === 0 ? "Sem histórico" : `${topic.percentage}% de acerto em ${topic.answered} respostas`}</p><div><small>{topic.availableQuestions} questões ativas</small><button disabled={topic.availableQuestions === 0} onClick={() => onConfigure(topic)}>{topic.availableQuestions > 0 ? "Configurar revisão" : "Em produção"}<Icon name="arrow"/></button></div></article>)}</div></>;
}

function RevisionSection({ kind, items, onConfigure, onOpenResult, onRemoveBookmark }: { kind: "favorites" | "errors"; items: RevisionItem[]; onConfigure: () => void; onOpenResult: (id: string) => void; onRemoveBookmark: (id: string) => void }) {
  const favorites = kind === "favorites";
  return <><section className="collection-summary"><div className="collection-icon"><Icon name={favorites ? "star" : "book"} size={25}/></div><div><p className="overline">{favorites ? "QUESTÕES SELECIONADAS" : "ERROS ÚNICOS"}</p><h2>{items.length} {items.length === 1 ? "questão" : "questões"}</h2><p>{favorites ? "Sua lista pessoal para revisar depois." : "Cada questão aparece uma vez, priorizando o erro mais recente."}</p></div><button className="primary-button" disabled={items.length === 0} onClick={onConfigure}>Configurar treino <Icon name="arrow"/></button></section>{items.length === 0 ? <div className="empty-state"><Icon name={favorites ? "star" : "book"} size={28}/><h3>{favorites ? "Nenhum favorito" : "Seu caderno está limpo"}</h3><p>{favorites ? "Favorite questões durante a revisão comentada." : "As questões erradas aparecerão aqui automaticamente."}</p></div> : <div className="revision-grid full-width">{items.map((item) => <article key={item.questionId}><span>TEMA {item.topic.code}</span><h3>{item.statement}</h3><p>{item.topic.name}</p>{favorites ? <button onClick={() => onRemoveBookmark(item.questionId)}>Remover favorito</button> : item.sessionId && <button onClick={() => onOpenResult(item.sessionId!)}>Rever correção <Icon name="arrow"/></button>}</article>)}</div>}</>;
}

function HistoryList({ sessions, onResume, onOpenResult }: { sessions: SessionHistory["sessions"]; onResume: (id: string) => void; onOpenResult: (id: string) => void }) {
  if (sessions.length === 0) return null;
  return <section className="history-section"><div className="section-head"><div><h2>Histórico pessoal</h2><p>Suas sessões mais recentes.</p></div></div><div className="history-list">{sessions.map((session) => <article key={session.id}><div><strong>{modeLabel(session.mode)}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(session.startedAt))}</small></div><span>{session.status === "IN_PROGRESS" ? `${session.answerCount}/${session.questionCount} respondidas` : `${session.score}/${session.questionCount} acertos`}</span>{session.status === "IN_PROGRESS" ? <button onClick={() => onResume(session.id)}>Retomar <Icon name="arrow"/></button> : <button onClick={() => onOpenResult(session.id)}>Ver resultado <Icon name="arrow"/></button>}</article>)}</div></section>;
}

function SettingsSection({ profile, onSaved, onSignOut }: { profile: UserProfile | null; onSaved: (profile: UserProfile) => void; onSignOut: () => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [examDate, setExamDate] = useState(profile?.examDate ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, examDate: examDate || null }) });
    const body = await response.json() as UserProfile | { error?: string };
    if (!response.ok || !("id" in body)) setStatus("error" in body && body.error ? body.error : "Não foi possível salvar.");
    else { onSaved(body); setStatus("Configurações salvas."); }
    setSaving(false);
  }

  if (!profile) return <div className="settings-card"><h2>Entre para configurar sua conta</h2><p>O perfil e o planejamento ficam disponíveis após a autenticação.</p></div>;
  return <div className="settings-layout"><form className="settings-card" onSubmit={save}><div><p className="overline">PERFIL</p><h2>Dados pessoais</h2><p>Esses dados aparecem apenas na sua área autenticada.</p></div><label>Nome<input value={name} minLength={2} maxLength={80} onChange={(event) => setName(event.target.value)} required/></label><label>E-mail<input value={profile.email} disabled/></label><label>Data prevista da prova<input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)}/></label>{status && <p className={status === "Configurações salvas." ? "settings-success" : "submission-error"} role="status">{status}</p>}<button className="primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</button></form><aside className="settings-card account-actions"><p className="overline">SESSÃO</p><h2>Segurança da conta</h2><p>Ao sair, suas sessões e resultados continuam salvos.</p><button className="danger-button" onClick={onSignOut}>Sair da conta</button></aside></div>;
}

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>; }

function Instructions({ card, error, isStarting, questionCount, durationMinutes, onQuestionCountChange, onDurationChange, onBack, onStart }: {
  card: TrainingCard;
  error: string;
  isStarting: boolean;
  questionCount: number;
  durationMinutes: number;
  onQuestionCountChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const configurable = configurableModes.has(card.mode);
  return <div className="center-page"><button className="back-link" onClick={onBack}>← Voltar aos simulados</button><div className="instruction-card"><div className="instruction-icon"><Icon name={configurable ? "chart" : "file"} size={28}/></div><p className="overline">{card.eyebrow}</p><h1>{card.title}<br/>Assessor de Investimentos</h1><p className="lead">{card.description}</p><div className="instruction-metrics"><span><strong>{configurable ? questionCount : 80}</strong><small>questões solicitadas</small></span><span><strong>4</strong><small>alternativas</small></span><span><strong>{configurable ? durationMinutes : 150}</strong><small>minutos</small></span><span><strong>70%</strong><small>referência geral</small></span></div>{configurable ? <div className="session-config"><h2>Monte seu treino</h2><p>Escolha o tamanho e o tempo desta sessão.</p><div><label><span>Quantidade de questões</span><input type="number" min="1" max="20" inputMode="numeric" value={questionCount} onChange={(event) => onQuestionCountChange(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}/><small>De 1 a 20</small></label><label><span>Duração da sessão</span><div className="input-suffix"><input type="number" min="1" max="180" inputMode="numeric" value={durationMinutes} onChange={(event) => onDurationChange(Math.min(180, Math.max(1, Number(event.target.value) || 1)))}/><b>min</b></div><small>De 1 a 180 minutos</small></label></div><em>Se o conjunto pessoal tiver menos questões, usaremos todas as disponíveis.</em></div> : <div className="minimums"><h2>Critérios da matriz oficial</h2><p>A sessão completa será liberada quando todos os temas tiverem cobertura ativa suficiente.</p><div><span><b>Tema I</b><small>Atividade do assessor</small><strong>6/12</strong></span><span><b>Tema III</b><small>PLD/FTP</small><strong>2/4</strong></span><span><b>Tema VIII</b><small>Mercado de capitais</small><strong>10/20</strong></span><span><b>Temas XIII/XV</b><small>Matemática e derivativos</small><strong>6/12*</strong></span></div></div>}<div className={`demo-notice ${configurable ? "validated-notice" : ""}`}><span>{configurable ? "✓" : "i"}</span><p><strong>{configurable ? "Configuração salva na sessão" : "Banco editorial em expansão"}</strong>{configurable ? "A quantidade efetiva e a duração escolhida serão preservadas no histórico e na retomada." : "Esta modalidade permanece bloqueada para evitar simulados incompletos ou repetitivos."}</p></div>{error && <div className="submission-error" role="alert">{error}</div>}<button className="start-button" disabled={!card.available || isStarting} onClick={onStart}>{!card.available ? "Aguardando cobertura editorial" : isStarting ? "Criando sessão…" : "Iniciar treino"} {card.available && !isStarting && <Icon name="arrow"/>}</button><small className="fine-print">O gabarito permanece no servidor até a finalização.</small></div></div>;
}
function Result({ result, questions, bookmarkedQuestionIds, onToggleBookmark, onHome, onRetry }: { result: SubmissionResult; questions: SessionQuestion[]; bookmarkedQuestionIds: string[]; onToggleBookmark: (questionId: string) => void; onHome: () => void; onRetry: () => void }) {
  return <div className="result-page"><header><div className="brand brand-dark"><BrandMark/><span>Clareza<span>AI</span></span></div><button className="outline-button" onClick={onHome}>Voltar ao início</button></header><main><p className="overline">RESULTADO DA SESSÃO PESSOAL</p><h1>Bom treino. Agora, transforme erro em repertório.</h1><section className="result-hero"><div className="result-score"><strong>{result.percentage}%</strong><span>{result.score} de {result.total} acertos</span></div><div><h2>{result.passed ? "Desempenho acima da referência" : "Ainda há espaço para evoluir"}</h2><p>A sessão e suas respostas foram salvas no seu histórico pessoal.</p><button className="primary-button" onClick={onRetry}>Iniciar nova sessão</button></div></section><section className="review-list"><div className="section-head"><div><h2>Revisão comentada</h2><p>Confira a regra, a armadilha e a fonte de cada questão.</p></div></div>{questions.map((question) => { const item = result.review.find((reviewItem) => reviewItem.questionId === question.id); if (!item) return null; const correctOption = question.options.find((option) => option.id === item.correctOptionId); const bookmarked = bookmarkedQuestionIds.includes(question.id); return <details key={question.id} open={!item.isCorrect}><summary><span className={item.isCorrect ? "hit" : "miss"}>{item.isCorrect ? "✓" : "×"}</span><p><small>TEMA {question.topic.code} · {question.topic.name}</small><strong>{question.statement}</strong></p><b>{item.isCorrect ? "Acertou" : item.selectedOptionId ? "Errou" : "Em branco"}</b></summary><div className="review-body"><button className={`bookmark-button ${bookmarked ? "active" : ""}`} onClick={() => onToggleBookmark(question.id)}>{bookmarked ? "★ Favoritada" : "☆ Adicionar aos favoritos"}</button><p><strong>Resposta correta</strong>{correctOption?.text}</p><p><strong>Explicação</strong>{item.explanation}</p>{item.commonTrap && <p><strong>Armadilha comum</strong>{item.commonTrap}</p>}{item.sources.map((source) => <p className="source-line" key={`${source.officialUrl}-${source.locator}`}><strong>Base verificada</strong><a href={source.officialUrl} target="_blank" rel="noreferrer">{source.versionLabel}</a> · {source.locator}</p>)}</div></details>; })}</section></main></div>;
}
