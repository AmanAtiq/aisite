import { Router } from "express";
import JSZip from "jszip";
import { generateSite } from "./generator.js";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  recordVersion,
  rollbackVersion,
  redoVersion,
  restoreVersion,
} from "./projectStore.js";

export const router = Router();

function formatProjectResponse(project) {
  return {
    projectId: project.id,
    name: project.name,
    files: project.files,
    history: project.history,
    currentVersion: project.currentVersionIndex + 1,
    totalVersions: project.versions?.length || 0,
    activePrompt: project.versions?.[project.currentVersionIndex]?.prompt || "",
    activeSummary: project.versions?.[project.currentVersionIndex]?.summary || "",
    versions: (project.versions || []).map((v) => ({
      version: v.version,
      prompt: v.prompt,
      summary: v.summary,
      createdAt: v.createdAt,
    })),
  };
}

// List all projects (most recent first)
router.get("/projects", (req, res) => {
  res.json({ projects: listProjects() });
});

// Fetch one project's full state (files + chat history + versions)
router.get("/projects/:id", (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json({ project: formatProjectResponse(project) });
});

router.delete("/projects/:id", (req, res) => {
  const ok = deleteProject(req.params.id);
  if (!ok) return res.status(404).json({ error: "Project not found." });
  res.status(204).end();
});

// Generate a new site, or apply an edit to an existing one.
// Body: { projectId?: string, prompt: string }
// If projectId is omitted, a new project is created.
router.post("/generate", async (req, res) => {
  const { projectId, prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "\"prompt\" is required." });
  }

  let project = projectId ? getProject(projectId) : null;
  const isNew = !project;
  if (!project) {
    project = createProject(prompt.slice(0, 60));
  }

  try {
    const { summary, files } = await generateSite({
      prompt,
      history: project.history,
      currentFiles: isNew ? null : project.files,
    });

    recordVersion(project.id, { files, prompt, summary });

    res.json({
      ...formatProjectResponse(project),
      summary,
    });
  } catch (err) {
    console.error("generateSite failed:", err);
    // Roll back a freshly created project on total failure so we don't leave empty stubs around.
    if (isNew) deleteProject(project.id);
    res.status(502).json({ error: err.message || "Generation failed." });
  }
});

// Undo to previous version
router.post("/projects/:id/rollback", (req, res) => {
  const project = rollbackVersion(req.params.id);
  if (!project) {
    return res.status(400).json({ error: "Cannot undo further or project not found." });
  }
  res.json(formatProjectResponse(project));
});

// Redo to next version
router.post("/projects/:id/redo", (req, res) => {
  const project = redoVersion(req.params.id);
  if (!project) {
    return res.status(400).json({ error: "Cannot redo further or project not found." });
  }
  res.json(formatProjectResponse(project));
});

// Restore a specific version
router.post("/projects/:id/restore", (req, res) => {
  const { version } = req.body || {};
  if (typeof version !== "number") {
    return res.status(400).json({ error: "\"version\" number is required." });
  }
  const project = restoreVersion(req.params.id, version);
  if (!project) {
    return res.status(404).json({ error: "Specified version not found." });
  }
  res.json(formatProjectResponse(project));
});

// Download the current project files as a runnable Vite .zip
router.get("/projects/:id/export", async (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  if (!project.files || Object.keys(project.files).length === 0) {
    return res.status(400).json({ error: "This project has no generated files yet." });
  }

  const safeName = (project.name || "site").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  const zip = new JSZip();

  // Add all generated files
  for (const [path, content] of Object.entries(project.files)) {
    zip.file(path.replace(/^\//, ""), content);
  }

  // Add scaffold files for turnkey local running with Vite if missing
  if (!project.files["/package.json"]) {
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: safeName,
          private: true,
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "lucide-react": "^0.344.0",
          },
          devDependencies: {
            "@vitejs/plugin-react": "^4.3.1",
            vite: "^5.4.2",
          },
        },
        null,
        2
      )
    );
  }

  if (!project.files["/index.html"]) {
    zip.file(
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name || "AI Website"}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      body { font-family: 'Inter', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`
    );
  }

  if (!project.files["/index.jsx"] && !project.files["/index.js"]) {
    zip.file(
      "index.jsx",
      `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
    );
  }

  if (!project.files["/vite.config.js"]) {
    zip.file(
      "vite.config.js",
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});`
    );
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);
  res.send(buffer);
});

