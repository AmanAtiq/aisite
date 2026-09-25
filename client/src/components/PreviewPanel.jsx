import { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  useSandpack,
  useSandpackNavigation,
  useActiveCode,
} from "@codesandbox/sandpack-react";

const EMPTY_FILES = {
  "/App.js": `import React from "react";
import { Sparkles } from "lucide-react";

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-6">
      <div className="max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
          Your AI site will appear here
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Describe the website you want on the left. Foundry will generate modern, responsive React + Tailwind code live.
        </p>
      </div>
    </main>
  );
}`,
};

function SandpackFilesSync({ files }) {
  const { sandpack } = useSandpack();
  const prevFilesJsonRef = useRef(null);

  useEffect(() => {
    if (!files || Object.keys(files).length === 0) return;
    const currentJson = JSON.stringify(files);
    if (prevFilesJsonRef.current === currentJson) return;
    prevFilesJsonRef.current = currentJson;

    // Delete any project files that do not exist in the target version set
    if (sandpack.files) {
      for (const existingPath of Object.keys(sandpack.files)) {
        if (
          !files[existingPath] &&
          existingPath !== "/index.js" &&
          existingPath !== "/package.json"
        ) {
          try {
            sandpack.deleteFile(existingPath);
          } catch (e) {
            console.warn("Could not delete file during sync:", existingPath, e);
          }
        }
      }
    }

    // Update files in Sandpack's virtual file system
    for (const [path, content] of Object.entries(files)) {
      sandpack.updateFile(path, content, false);
    }
    // Recompile entry point to refresh preview
    if (files["/App.js"]) {
      sandpack.updateFile("/App.js", files["/App.js"], true);
    }
  }, [files, sandpack]);

  return null;
}

function PreviewToolbar({
  view,
  onViewChange,
  hasFiles,
  viewport,
  onViewportChange,
  isFullscreen,
  onToggleFullscreen,
}) {
  const { refresh } = useSandpackNavigation();
  const { sandpack } = useSandpack();
  const { code } = useActiveCode();
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleReload() {
    setReloading(true);
    try {
      refresh();
    } catch (e) {
      console.warn("Sandpack refresh call:", e);
    }
    try {
      if (sandpack.files["/App.js"]) {
        sandpack.updateFile("/App.js", sandpack.files["/App.js"].code, true);
      }
    } catch (e) {
      console.warn("Sandpack updateFile recompile:", e);
    }
    setTimeout(() => setReloading(false), 500);
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="preview-toolbar">
      <div className="preview-toolbar__left">
        <div className="preview-tabs">
          <button
            className={`tab ${view === "preview" ? "tab--active" : ""}`}
            onClick={() => onViewChange("preview")}
            type="button"
          >
            Preview
          </button>
          <button
            className={`tab ${view === "code" ? "tab--active" : ""}`}
            onClick={() => onViewChange("code")}
            disabled={!hasFiles}
            type="button"
          >
            Code
          </button>
        </div>
      </div>

      <div className="preview-toolbar__center">
        {view === "preview" && hasFiles && (
          <div className="viewport-switcher">
            <button
              className={`viewport-btn ${viewport === "desktop" ? "viewport-btn--active" : ""}`}
              onClick={() => onViewportChange("desktop")}
              title="Desktop View (100%)"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Desktop</span>
            </button>
            <button
              className={`viewport-btn ${viewport === "tablet" ? "viewport-btn--active" : ""}`}
              onClick={() => onViewportChange("tablet")}
              title="Tablet View (768px)"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Tablet</span>
            </button>
            <button
              className={`viewport-btn ${viewport === "mobile" ? "viewport-btn--active" : ""}`}
              onClick={() => onViewportChange("mobile")}
              title="Mobile View (375px)"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Mobile</span>
            </button>
          </div>
        )}
      </div>

      <div className="preview-toolbar__right">
        {view === "code" && (
          <button
            className="toolbar-btn"
            onClick={handleCopy}
            title="Copy current file code to clipboard"
            type="button"
          >
            {copied ? (
              <>
                <span style={{ color: "var(--ok)", fontWeight: "bold" }}>✓</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Code</span>
              </>
            )}
          </button>
        )}

        <button
          className={`toolbar-btn ${reloading ? "toolbar-btn--reloading" : ""}`}
          onClick={handleReload}
          title="Reload preview"
          type="button"
        >
          <svg
            className={`reload-icon ${reloading ? "reload-icon--spin" : ""}`}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Reload</span>
        </button>

        {hasFiles && onToggleFullscreen && (
          <button
            className={`toolbar-btn ${isFullscreen ? "toolbar-btn--active" : ""}`}
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                <>
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
            <span>{isFullscreen ? "Exit" : "Full"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SandpackErrorBanner({ onFixError, busy }) {
  const { sandpack } = useSandpack();
  const error = sandpack.error;
  if (!error) return null;

  const msg = typeof error === "object" ? error.message : String(error);

  return (
    <div className="preview-error-bar">
      <div className="preview-error-info">
        <span className="preview-error-badge">⚠️ Build Error</span>
        <span className="preview-error-msg" title={msg}>
          {msg}
        </span>
      </div>
      {onFixError && (
        <button
          className="preview-fix-btn"
          type="button"
          onClick={() => onFixError(msg)}
          disabled={busy}
          title="Auto-heal this error with AI"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>Fix with AI</span>
        </button>
      )}
    </div>
  );
}

export default function PreviewPanel({
  files,
  view,
  onViewChange,
  projectId,
  onFixError,
  busy,
  isFullscreen,
  onToggleFullscreen,
}) {
  const hasFiles = files && Object.keys(files).length > 0;
  const activeFiles = hasFiles ? files : EMPTY_FILES;
  const [viewport, setViewport] = useState("desktop");

  return (
    <section className={`preview-panel ${isFullscreen ? "preview-panel--fullscreen" : ""}`}>
      <SandpackProvider
        key={projectId || "empty-project"}
        template="react"
        files={activeFiles}
        theme="dark"
        customSetup={{
          dependencies: {
            "lucide-react": "^0.344.0",
          },
        }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
          ],
          recompileMode: "delayed",
          recompileDelay: 300,
        }}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <PreviewToolbar
          view={view}
          onViewChange={onViewChange}
          hasFiles={hasFiles}
          viewport={viewport}
          onViewportChange={setViewport}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />

        <SandpackFilesSync files={hasFiles ? files : null} />

        <SandpackLayout style={{ flex: 1, minHeight: 0, position: "relative", height: "100%", border: "none" }}>
          {/* Preview Tab View - Kept permanently mounted in DOM to prevent iframe teardown */}
          <div
            className="tab-view-container preview-tab-container"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              visibility: view === "preview" ? "visible" : "hidden",
              pointerEvents: view === "preview" ? "auto" : "none",
              zIndex: view === "preview" ? 2 : 1,
            }}
          >
            <div className={`viewport-stage viewport-stage--${viewport}`}>
              <div className={`viewport-wrapper viewport-wrapper--${viewport}`}>
                <SandpackPreview
                  style={{ height: "100%", width: "100%" }}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  showSandpackErrorOverlay
                />
              </div>
            </div>
          </div>

          {/* Code Tab View - Kept permanently mounted in DOM to preserve file tree and editor state */}
          <div
            className="tab-view-container code-tab-container"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              visibility: view === "code" ? "visible" : "hidden",
              pointerEvents: view === "code" ? "auto" : "none",
              zIndex: view === "code" ? 2 : 1,
            }}
          >
            <SandpackFileExplorer style={{ height: "100%" }} />
            <SandpackCodeEditor style={{ height: "100%", flex: 1 }} showTabs={false} />
          </div>

          <SandpackErrorBanner onFixError={onFixError} busy={busy} />
        </SandpackLayout>
      </SandpackProvider>
    </section>
  );
}
