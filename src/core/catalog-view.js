/**
 * @typedef {import('./knit-store.js').Project} Project
 * @typedef {import('./knit-store.js').FolderItem} FolderItem
 *
 * @typedef {{
 *   projects: Project[],
 *   folders: FolderItem[],
 *   status: 'active' | 'completed',
 *   openedFolder: string | null,
 *   tag: string
 * }} CatalogViewInput
 *
 * @typedef {{
 *   effectiveStatus: 'active' | 'completed',
 *   effectiveOpenedFolder: string | null,
 *   effectiveTag: string,
 *   showStatusTabs: boolean,
 *   availableTags: string[],
 *   folderItems: Array<{ folder: FolderItem, projectCount: number }>,
 *   rootProjects: Project[],
 *   openedFolderSections: { active: Project[], completed: Project[] } | null
 * }} CatalogViewModel
 */

/**
 * Computes the catalog projection for the dashboard:
 * - Folders appear only on the "Active" tab and count all projects inside them.
 * - Inside an opened folder, both active and completed projects are shown in separate sections.
 * - The "Completed" tab is a flat portfolio of all completed projects without folders.
 *
 * @param {CatalogViewInput} input
 * @returns {CatalogViewModel}
 */
export function buildCatalogView({ projects, folders, status, openedFolder, tag }) {
  const hasCompleted = projects.some((p) => p.status === 'completed');
  const effectiveStatus = hasCompleted ? status : 'active';
  const effectiveOpenedFolder =
    openedFolder !== null && folders.some((f) => f.name === openedFolder)
      ? openedFolder
      : null;

  const showStatusTabs = hasCompleted && effectiveOpenedFolder === null;

  const scopeProjects =
    effectiveOpenedFolder !== null
      ? projects.filter((p) => p.folder === effectiveOpenedFolder)
      : projects.filter((p) => p.status === effectiveStatus);

  const availableTags = Array.from(new Set(scopeProjects.flatMap((p) => p.tags)));
  const effectiveTag = tag !== 'all' && availableTags.includes(tag) ? tag : 'all';

  const matchesTag = (/** @type {Project} */ project) =>
    effectiveTag === 'all' || project.tags.includes(effectiveTag);

  const isOpenedFolder = effectiveOpenedFolder !== null;
  const openedFolderSections = isOpenedFolder
    ? {
        active: scopeProjects.filter((p) => p.status === 'active' && matchesTag(p)),
        completed: scopeProjects.filter((p) => p.status === 'completed' && matchesTag(p))
      }
    : null;

  const folderItems =
    !isOpenedFolder && effectiveStatus === 'active' && effectiveTag === 'all'
      ? folders.map((folder) => ({
          folder,
          projectCount: projects.filter((p) => p.folder === folder.name).length
        }))
      : [];

  const rootProjects = isOpenedFolder
    ? []
    : effectiveStatus === 'completed'
      ? scopeProjects.filter(matchesTag)
      : scopeProjects.filter((p) => (effectiveTag !== 'all' ? matchesTag(p) : !p.folder));

  return {
    effectiveStatus,
    effectiveOpenedFolder,
    effectiveTag,
    showStatusTabs,
    availableTags,
    folderItems,
    rootProjects,
    openedFolderSections
  };
}
