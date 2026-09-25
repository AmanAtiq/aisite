import { useRef, useState, useEffect } from "react";

const STARTER_PROMPTS = [
  {
    icon: "☕",
    title: "Artisanal Coffee Roaster",
    prompt: "A warm, modern landing page for an artisanal coffee roastery with a hero section, popular roasts with prices, brewing tips, and a visit us section.",
  },
  {
    icon: "🎨",
    title: "UI/UX Designer Portfolio",
    prompt: "A minimalist personal portfolio for a product designer with a hero headline, selected project case studies, skill tags, and contact links.",
  },
  {
    icon: "⚡",
    title: "Developer Tools SaaS",
    prompt: "A sleek developer tools landing page with a dark aesthetic, interactive code snippet preview, feature highlights, and pricing tiers.",
  },
  {
    icon: "🍕",
    title: "Artisan Pizza & Trattoria",
    prompt: "A vibrant website for an authentic Italian pizzeria featuring today's specials, wood-fired pizza menu, reservation section, and hours.",
  },
];

const FOLLOWUP_PROMPTS = [
  "✨ Add customer testimonials",
  "🌓 Add dark mode styling",
  "📋 Add pricing with 3 tiers",
  "✉️ Add a contact form",
  "📱 Add newsletter signup",
];

const GENERATION_STEPS = [
  { icon: "🧠", text: "Analyzing prompt & page layout..." },
  { icon: "🎨", text: "Composing Tailwind layout & components..." },
  { icon: "🧩", text: "Adding Lucide icons & verified photography..." },
  { icon: "⚡", text: "Bundling live preview & checking build..." },
];

export default function ChatPanel({
  messages,
  busy,
  onSend,
  hasProject,
  currentVersion = 0,
  totalVersions = 0,
  onRestore,
}) {
  const [input, setInput] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const listRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!busy) {
      setStepIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, busy, stepIndex]);

  function submit(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    onSend(text);
    setInput("");
  }

  function handleChipClick(promptText) {
    setInput(promptText);
    textareaRef.current?.focus();
  }

  return (
    <section className="chat-panel">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty__title">Describe the site you want built</p>
            <p className="chat-empty__hint">
              Type your own idea below or click a starter template to get started:
            </p>

            <div className="starter-prompts">
              {STARTER_PROMPTS.map((item, i) => (
                <button
                  key={i}
                  className="starter-chip"
                  onClick={() => handleChipClick(item.prompt)}
                  type="button"
                >
                  <span className="starter-chip__icon">{item.icon}</span>
                  <div className="starter-chip__text">
                    <span className="starter-chip__title">{item.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble--${m.role}`}>
            <div className="bubble__header">
              <span className="bubble__label">{m.role === "user" ? "You" : "Builder"}</span>
              {m.role === "assistant" && (
                <span className="bubble__tag">v{Math.floor(i / 2) + 1}</span>
              )}
            </div>
            <p>{m.content}</p>
          </div>
        ))}

        {busy && (
          <div className="bubble bubble--assistant bubble--pending generation-bubble">
            <div className="bubble__header">
              <span className="bubble__label">Builder</span>
              <span className="generation-status-pulse">Working…</span>
            </div>
            <div className="generation-steps">
              {GENERATION_STEPS.map((step, idx) => {
                const isDone = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div
                    key={idx}
                    className={`step-item ${isDone ? "step-item--done" : isCurrent ? "step-item--current" : "step-item--pending"}`}
                  >
                    <span className="step-item__icon">
                      {isDone ? "✓" : step.icon}
                    </span>
                    <span className="step-item__text">{step.text}</span>
                    {isCurrent && <span className="step-item__spinner" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasProject && !busy && totalVersions > 1 && currentVersion < totalVersions && (
        <div className="version-notice">
          <span>
            Viewing <strong>v{currentVersion}</strong> of {totalVersions}. Next change will branch from this version.
          </span>
          {onRestore && (
            <button
              className="version-jump-btn"
              type="button"
              onClick={() => onRestore(totalVersions)}
            >
              Jump to latest (v{totalVersions}) →
            </button>
          )}
        </div>
      )}

      {hasProject && !busy && (
        <div className="followup-bar">
          <div className="followup-bar__label">Quick changes:</div>
          <div className="followup-chips">
            {FOLLOWUP_PROMPTS.map((item, i) => (
              <button
                key={i}
                className="followup-chip"
                onClick={() => handleChipClick(item.slice(2).trim())}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input" onSubmit={submit}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={hasProject ? "Ask for a change (e.g. 'Make the hero title larger')…" : "Describe the site you want…"}
          rows={3}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {hasProject ? "Update" : "Build"}
        </button>
      </form>
    </section>
  );
}
