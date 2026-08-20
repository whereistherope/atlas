from pathlib import Path
import re

ROOT = Path(__file__).parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def require(text, needle, label):
    assert needle in text, f"missing {label}: {needle}"


def cache_name_for_build(build):
    match = re.fullmatch(r'(\d)(\d{2})(\d)r(\d+)', build)
    assert match, f'unrecognised Atlas build format: {build}'
    return f'{int(match.group(1))}.{int(match.group(2))}.{int(match.group(3))}-r{match.group(4)}'


def main():
    db = read('js/db.js')
    bootstrap = read('js/bootstrap.js')
    sw = read('sw.js')
    rich_capture = read('js/rich-note-capture.js')
    capture = read('js/capture-framework-r7.js')
    polish = read('js/capture-polish-r8.js')
    visual = read('js/visual-note-editor.js')
    doc_r3 = read('js/atlas-document-r3.js')
    doc_r4 = read('js/atlas-document-r4-ui.js')
    table_width = read('js/table-width-resize.js')
    project = read('js/project-workspace.js')
    command = read('js/command-palette.js')
    interaction = read('js/interaction-alignment.js')
    workspace = read('js/workspace-actions.js')
    interaction_contract = read('docs/ATLAS_INTERACTION_CONTRACT.md')

    for contract in [
        "DB_NAME='atlas_personal_os'", "DB_STORE='state'", "BACKUP_STORE='backups'",
        "AUTH_STORE='auth'", "AUTH_KEY='atlas-lock'", "DB_KEY='atlas-v1'",
        "FALLBACK_KEY='atlas_v1_fallback'", "DB_VERSION=3", "DATA_VERSION=8",
    ]:
        require(db, contract, 'persisted storage contract')
    require(db, "{id:'me'", 'Me profile id')
    require(db, "{id:'alyssa'", 'Alyssa profile id')
    require(db, "{id:'us'", 'Us profile id')

    all_js = '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT / 'js').glob('*.js'))
    assert 'indexedDB.deleteDatabase' not in all_js, 'destructive IndexedDB delete introduced'

    build = re.search(r"const BUILD='([^']+)'", bootstrap)
    cache = re.search(r"CACHE_NAME = 'atlas-shell-([^']+)'", sw)
    assert build and cache, 'build/cache identifiers missing'
    expected_cache = cache_name_for_build(build.group(1))
    assert cache.group(1) == expected_cache, f"bootstrap BUILD {build.group(1)} and SW cache {cache.group(1)} disagree"

    dynamic_assets = re.findall(r"(?:loadScript|loadStyle)\('([^']+)'", bootstrap)
    for asset in dynamic_assets:
        require(sw, f"'{asset}'", f'offline shell asset {asset}')
        assert (ROOT / asset.lstrip('./')).exists(), f"loaded asset does not exist: {asset}"

    require(capture, "target.closest?.('#captureBtn')", 'universal Capture handler')
    require(capture, 'openLauncher()', 'Capture launcher open')
    assert "target.closest('#captureBtn')" not in rich_capture, 'rich-note module hijacks main Capture'
    require(rich_capture, 'atlas:new-note-draft', 'fresh note identity event')
    require(rich_capture, 'pendingDraft', 'unsaved draft isolation')
    require(capture, 'freshDraftActive', 'fresh draft restore guard')

    for kind in ['note', 'meeting', 'idea', 'reference', 'project', 'task', 'daily', 'area', 'topic']:
        require(capture, f"'{kind}'", f'Capture choice {kind}')
    for kind in ['Note', 'Meeting', 'Idea', 'Reference']:
        require(polish, kind, f'visual note Type option {kind}')

    require(visual, 'atlasVisualNoteEditor', 'visual editor overlay')
    require(visual, 'data-vrich="table"', 'visual table insertion')
    require(doc_r3, 'installResizeHandles', 'column resize handles')
    require(doc_r4, 'Merge with cell right', 'remembered-cell merge action')
    require(doc_r4, 'Merge with cell below', 'vertical merge action')
    require(doc_r4, 'Unmerge cell', 'unmerge action')
    require(doc_r4, 'Indent →', 'indent action')
    require(table_width, 'atlas-table-width-resize', 'overall table width handle')
    assert not re.search(r'\bnew\s+MutationObserver\s*\(', doc_r3 + doc_r4 + table_width), 'observer-based document runtime reintroduced'

    require(project, 'AtlasProjectWorkspace', 'Project Workspace export')
    require(project, 'enhancedProjectEditor', 'Project Workspace editor function')
    require(project, 'epObjectiveRich', 'rich Objective editor')
    require(project, 'epNextRich', 'rich Next Move editor')
    require(project, 'Milestones', 'milestone section')
    require(project, 'Tasks', 'task section')

    require(bootstrap, "./js/command-palette.js", 'command palette runtime load')
    require(bootstrap, "./styles/command-palette.css", 'command palette style load')
    require(command, "e.metaKey||e.ctrlKey", 'Cmd/Ctrl shortcut')
    require(command, "e.key.toLowerCase()==='k'", 'K shortcut')
    require(command, "target.closest?.('#searchBtn')", 'legacy Search replacement')
    require(command, "root.AtlasMarkdown?.openNote?.(n.id)", 'note direct-open route')
    require(command, "openProject?.(p.id)", 'project direct-open route')
    require(command, "openCalendarEvent?.(e.id)", 'calendar direct-open route')
    require(command, "kind:Number(a.level)>=4?'TOPIC':'AREA'", 'Area/Topic result routing')
    for kind in ['PROJECT', 'TASK', 'MILESTONE', 'DAILY', 'EVENT']:
        require(command, f"kind:'{kind}'", f'command palette result kind {kind}')
    for label in ['Capture', 'New Note', 'New Meeting', 'New Idea', 'New Reference', 'New Project', 'New Task', 'New Daily Entry', 'Home', 'Nodes', 'Predict', 'Inbox', 'Daily', 'Calendar', 'Edit Atlas']:
        require(command, f"['{label}'", f'command {label}')
    require(command, "AtlasCommandPalette", 'command palette export')

    require(bootstrap, "./js/interaction-alignment.js", 'interaction alignment runtime load')
    require(bootstrap, "./styles/interaction-alignment.css", 'interaction alignment style load')
    require(interaction, 'AtlasActions', 'shared Atlas action layer')
    for action in ['home:goHome', 'tab:goTab', 'area:openArea', 'project:openProjectAction', 'note:openNoteAction', 'event:openEventAction', 'capture:alignedCapture']:
        require(interaction, action, f'Atlas action {action}')
    require(interaction, "state?.settings?.selectedArea", 'selected Area context inheritance')
    require(interaction, "areaId||currentContextAreaId()", 'Capture context fallback')
    require(interaction, "data-atlas-aligned-capture", 'aligned universal Capture choices')
    require(interaction, "openTaskCreate", 'explicit task creation route')
    require(interaction, "id=\"atlasDirectProject\"", 'explicit task Project selector')
    require(interaction, "active.length===1?active[0].id:''", 'safe single-project suggestion only')
    require(interaction, "openStructureCreate", 'direct Area/Topic creation route')
    require(interaction, "data-atlas-open-project", 'actionable project widget rows')
    require(interaction, "data-atlas-open-note", 'actionable note widget rows')
    require(interaction_contract, 'Atlas should feel inevitable', 'interaction contract principle')
    require(interaction_contract, 'create → find → open → edit → relate → return → act → recover', 'core journey audit')

    # v0.15.2: the object visible in a workspace must be creatable/relatable there.
    require(bootstrap, "./js/workspace-actions.js", 'workspace action runtime load')
    require(bootstrap, "./styles/workspace-actions.css", 'workspace action style load')
    require(workspace, 'AtlasWorkspaceActions', 'workspace action export')
    for kind in ['project', 'next', 'milestone', 'note', 'topic']:
        require(workspace, f"panelAction(panel,'{kind}'", f'Area overview {kind} panel action')
    require(workspace, 'atlas-empty-action', 'clickable empty state')
    require(workspace, "root.AtlasActions?.capture?.(kind,id)", 'Project/Note shared contextual Capture')
    require(workspace, "id=\"awaProject\"", 'Project selection for Next Move/Milestone')
    require(workspace, "p.next=text", 'direct Next Move update')
    require(workspace, "p.milestones.push", 'direct Milestone creation')
    require(workspace, "data-awa-note", 'existing Note attachment picker')
    require(workspace, "n.topicId=item.id", 'Note-to-Topic relationship attachment')
    require(workspace, "parentId:area.id", 'Topic inherits current Area parent')

    print('Atlas current smoke contracts: PASS')


if __name__ == '__main__':
    main()
