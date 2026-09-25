import { nanoid } from "nanoid";

/**
 * @typedef {Object} Version
 * @property {number} version
 * @property {string} prompt
 * @property {string} summary
 * @property {Record<string,string>} files
 * @property {number} createdAt
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {Record<string,string>} files
 * @property {Array<{role: "user"|"assistant", content: string}>} history
 * @property {Version[]} versions
 * @property {number} currentVersionIndex
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/** @type {Map<string, Project>} */
const projects = new Map();

function rebuildHistory(versions) {
  const history = [];
  for (const v of versions) {
    if (v.prompt) {
      history.push({ role: "user", content: v.prompt });
    }
    if (v.summary) {
      history.push({ role: "assistant", content: v.summary });
    }
  }
  return history;
}

export function createProject(name = "Untitled site") {
  const id = nanoid(10);
  const project = {
    id,
    name,
    files: {},
    history: [],
    versions: [],
    currentVersionIndex: -1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(id, project);
  return project;
}

export function getProject(id) {
  return projects.get(id) || null;
}

export function listProjects() {
  return [...projects.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, name, updatedAt, createdAt, versions, currentVersionIndex }) => ({
      id,
      name,
      updatedAt,
      createdAt,
      totalVersions: versions?.length || 0,
      currentVersion: (currentVersionIndex ?? -1) + 1,
    }));
}

export function recordVersion(id, { files, prompt, summary }) {
  const project = projects.get(id);
  if (!project) return null;

  // If user rolled back to an earlier version and prompts again,
  // branch forward from that point (truncate future versions)
  if (
    project.currentVersionIndex >= 0 &&
    project.currentVersionIndex < project.versions.length - 1
  ) {
    project.versions = project.versions.slice(0, project.currentVersionIndex + 1);
  }

  const versionNumber = project.versions.length + 1;
  const version = {
    version: versionNumber,
    prompt: prompt || "",
    summary: summary || "",
    files: { ...files },
    createdAt: Date.now(),
  };

  project.versions.push(version);
  project.currentVersionIndex = project.versions.length - 1;
  project.files = { ...files };
  project.history = rebuildHistory(project.versions);
  project.updatedAt = Date.now();
  return project;
}

export function rollbackVersion(id) {
  const project = projects.get(id);
  if (!project || project.versions.length === 0) return null;
  if (project.currentVersionIndex <= 0) {
    return null; // Cannot rollback before version 1
  }

  project.currentVersionIndex -= 1;
  const target = project.versions[project.currentVersionIndex];
  project.files = { ...target.files };
  project.history = rebuildHistory(
    project.versions.slice(0, project.currentVersionIndex + 1)
  );
  project.updatedAt = Date.now();
  return project;
}

export function redoVersion(id) {
  const project = projects.get(id);
  if (!project || project.versions.length === 0) return null;
  if (project.currentVersionIndex >= project.versions.length - 1) {
    return null; // Already at latest version
  }

  project.currentVersionIndex += 1;
  const target = project.versions[project.currentVersionIndex];
  project.files = { ...target.files };
  project.history = rebuildHistory(
    project.versions.slice(0, project.currentVersionIndex + 1)
  );
  project.updatedAt = Date.now();
  return project;
}

export function restoreVersion(id, versionNumber) {
  const project = projects.get(id);
  if (!project || project.versions.length === 0) return null;

  const targetIndex = project.versions.findIndex(
    (v) => v.version === Number(versionNumber)
  );
  if (targetIndex === -1) return null;

  project.currentVersionIndex = targetIndex;
  const target = project.versions[targetIndex];
  project.files = { ...target.files };
  project.history = rebuildHistory(project.versions.slice(0, targetIndex + 1));
  project.updatedAt = Date.now();
  return project;
}

export function updateProject(id, { files, historyTurn }) {
  const project = projects.get(id);
  if (!project) return null;
  if (files) project.files = files;
  if (historyTurn) project.history.push(...historyTurn);
  project.updatedAt = Date.now();
  return project;
}

export function deleteProject(id) {
  return projects.delete(id);
}

