import { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel.jsx";
import PreviewPanel from "./components/PreviewPanel.jsx";
import { generate, exportUrl, rollback, redo, restore } from "./api.js";

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [files, setFiles] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [totalVersions, setTotalVersions] = useState(0);
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  function handleFixError(errMsg) {
    if (busy) return;
    handleSend(`Fix this build/runtime error in the code:\n${errMsg}`);
  }

  async function handleSend(prompt) {
    setError(null);
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    try {
      const result = await generate({ projectId, prompt });
      setProjectId(result.projectId);
      setProjectName(result.name);
      setFiles(result.files);
      setMessages((prev) => [...prev, { role: "assistant", content: result.summary }]);
      setCurrentVersion(result.currentVersion || 1);
      setTotalVersions(result.totalVersions || 1);
      setVersions(result.versions || []);
      setView("preview");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Couldn't do that: ${err.message || "unknown error"}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!projectId || currentVersion <= 1 || busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await rollback(projectId);
      setFiles(result.files);
      setCurrentVersion(result.currentVersion);
      setTotalVersions(result.totalVersions);
      setVersions(result.versions || []);
      setMessages(result.history || []);
    } catch (err) {
      setError(err.message || "Failed to undo to previous version.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRedo() {
    if (!projectId || currentVersion >= totalVersions || busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await redo(projectId);
      setFiles(result.files);
      setCurrentVersion(result.currentVersion);
      setTotalVersions(result.totalVersions);
      setVersions(result.versions || []);
      setMessages(result.history || []);
    } catch (err) {
      setError(err.message || "Failed to redo to next version.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(versionNumber) {
    if (!projectId || versionNumber === currentVersion || busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await restore(projectId, versionNumber);
      setFiles(result.files);
      setCurrentVersion(result.currentVersion);
      setTotalVersions(result.totalVersions);
      setVersions(result.versions || []);
      setMessages(result.history || []);
    } catch (err) {
      setError(err.message || "Failed to restore version.");
    } finally {
      setBusy(false);
    }
  }

  // Keyboard shortcut listener: Cmd/Ctrl+Z for Undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y for Redo
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && !e.altKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          if (projectId && currentVersion > 1 && !busy) {
            handleUndo();
          }
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          if (projectId && currentVersion < totalVersions && !busy) {
            handleRedo();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projectId, currentVersion, totalVersions, busy]);

  function handleNewSite() {
    if (projectId && files && !window.confirm("Start a new site? Your current session will be reset.")) {
      return;
    }
    setProjectId(null);
    setProjectName(null);
    setFiles(null);
    setMessages([]);
    setCurrentVersion(0);
    setTotalVersions(0);
    setVersions([]);
    setError(null);
    setView("preview");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__left">
          <div className="topbar__brand">
            <span className="topbar__mark">⚒</span>
            <span>Foundry</span>
          </div>
          <div className={`topbar__badge ${projectId ? "topbar__badge--active" : ""}`}>
            {projectName ? projectName : "No site yet"}
          </div>
        </div>

        {projectId && totalVersions > 0 && (
          <div className="topbar__center">
            <div className="version-bar">
              <div className="version-btn-group">
                <button
                  className="version-nav-btn"
                  onClick={handleUndo}
                  disabled={currentVersion <= 1 || busy}
                  title={currentVersion > 1 ? `Undo to v${currentVersion - 1} (⌘Z)` : "Already at earliest version (v1)"}
                  type="button"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Undo</span>
                </button>

                <button
                  className="version-nav-btn"
                  onClick={handleRedo}
                  disabled={currentVersion >= totalVersions || busy}
                  title={currentVersion < totalVersions ? `Redo to v${currentVersion + 1} (⌘⇧Z)` : "Already at latest version"}
                  type="button"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  <span>Redo</span>
                </button>
              </div>

              <div className="version-dropdown-container">
                <select
                  className="version-select"
                  value={currentVersion}
                  onChange={(e) => handleRestore(Number(e.target.value))}
                  disabled={busy}
                  title="Jump to a specific version"
                >
                  {versions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version}{v.version === currentVersion ? " (active)" : ""} — {v.prompt ? (v.prompt.length > 25 ? v.prompt.slice(0, 25) + "…" : v.prompt) : `Version ${v.version}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="topbar__actions">
          <button
            className="new-site-button"
            onClick={handleNewSite}
            title="Start a new site"
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Site</span>
          </button>

          <a
            className={`export-button ${!projectId ? "export-button--disabled" : ""}`}
            href={projectId ? exportUrl(projectId) : undefined}
            onClick={(e) => {
              if (!projectId) e.preventDefault();
            }}
            title={projectId ? "Download complete React code as a .zip" : "Build a site first to export"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export .zip</span>
          </a>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            className="error-banner__close"
            onClick={() => setError(null)}
            title="Dismiss"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <main className={`workspace ${isFullscreen ? "workspace--fullscreen" : ""}`}>
        {!isFullscreen && (
          <ChatPanel
            messages={messages}
            busy={busy}
            onSend={handleSend}
            hasProject={Boolean(projectId)}
            currentVersion={currentVersion}
            totalVersions={totalVersions}
            onRestore={handleRestore}
          />
        )}
        <PreviewPanel
          files={files}
          view={view}
          onViewChange={setView}
          projectId={projectId}
          onFixError={handleFixError}
          busy={busy}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        />
      </main>
    </div>
  );
}

