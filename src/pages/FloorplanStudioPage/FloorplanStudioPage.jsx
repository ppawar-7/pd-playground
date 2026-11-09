/**
 * FloorplanStudioPage.jsx
 * =======================
 * Dedicated, deep interactive engineering studio for Floorplanning Kingdom 3.0.
 * Accessible at `/studio/floorplanning` and `/explore/studio/floorplanning`.
 *
 * Full ASIC CAD environment with:
 * - 4-panel professional layout + 8-tab bottom analytics dock
 * - Interactive multi-layer canvas (pan, zoom, drag-and-drop, grid snapping, distance ruler)
 * - Complete design hierarchy explorer (Macros, Pins, PDN, Blockages, Nets, Masters)
 * - Context-aware properties inspector for all physical entities
 * - Automated EDA Design Assistants (Macro Legalizer, Pin Legalizer, PDN Grid Generator)
 * - Candidate snapshot comparison & Pareto trade-off explorer
 * - Live DRC, connectivity, missing-via, IR drop, and routability analytical engines
 * - Undo/Redo history stack
 * - Export/Import JSON artifacts & ASCII Handoff Reports
 * - 6 Benchmark Presets (Scenario A through F)
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StudioToolbar from './components/StudioToolbar.jsx';
import DesignExplorer from './components/DesignExplorer.jsx';
import StudioCanvas from './components/StudioCanvas.jsx';
import PropertiesInspector from './components/PropertiesInspector.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import CandidateCompareModal from './components/CandidateCompareModal.jsx';
import { getAssignmentScenario } from '../../activities/floorplanning/expanded/guidedAssignmentService.js';

import {
  createDefaultProject,
  serializeProject,
  deserializeProject,
  migrateProject,
  EXAMPLE_SMALL_CONTROLLER,
  EXAMPLE_DUAL_SRAM_CONTROLLER,
  EXAMPLE_SMALL_SOC_SUBSYSTEM,
  SCENARIO_SIMPLE_CONTROL,
  SCENARIO_DUAL_SRAM,
  SCENARIO_FOUR_MACRO,
  SCENARIO_SMALL_SOC,
  SCENARIO_BROKEN_PDN,
  SCENARIO_CONGESTION_STRESS,
  SCENARIO_SOC_CAPSTONE,
} from '../../engine/floorplanProjectModel.js';

import {
  transformMacroOrientation,
  assistedMacroLegalization,
  assistedPinLegalization,
} from '../../engine/floorplanGeometry.js';
import { addVia, removeVia, generatePDNGrid } from '../../engine/floorplanPDN.js';
import { evaluateFloorplanSignoff } from '../../engine/floorplanSignoff.js';
import { createCandidateSnapshot } from '../../engine/floorplanCandidates.js';
import { generateLEF, generateDEF, generateSignoffReportText } from '../../engine/floorplanExport.js';

import './FloorplanStudioPage.css';

export const STORAGE_KEY = 'pdplayground_floorplan_v1';
export const EXPLORE_STORAGE_KEY = 'pdplayground_floorplan_explore_v1';

function readStoredProject(isExplore) {
  try {
    const saved = isExplore
      ? window.sessionStorage.getItem(EXPLORE_STORAGE_KEY)
      : window.localStorage.getItem(STORAGE_KEY);
    return saved ? deserializeProject(saved) : null;
  } catch (e) {
    console.warn('Failed to load saved floorplan project, using default:', e);
    return null;
  }
}

export default function FloorplanStudioPage({ isExploreMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isExplore = Boolean(isExploreMode || location.pathname.startsWith('/explore'));

  // Initialize project state from localStorage or default
  const assignmentParam = new URLSearchParams(location.search).get('assignment');
  const [project, setProject] = useState(() => {
    const stored = readStoredProject(isExplore);
    if (assignmentParam) {
      if (stored && stored.assignmentId === assignmentParam) return stored;
      return getAssignmentScenario(assignmentParam) || stored || createDefaultProject('My ASIC Floorplan', 'beginner');
    }
    return stored || createDefaultProject('My ASIC Floorplan', 'beginner');
  });

  useEffect(() => {
    if (assignmentParam && project.assignmentId !== assignmentParam) {
      const stored = readStoredProject(isExplore);
      if (stored && stored.assignmentId === assignmentParam) {
        setProject(stored);
      } else {
        const scenario = getAssignmentScenario(assignmentParam);
        if (scenario) {
          setProject(scenario);
          if (isExplore) {
            window.sessionStorage.setItem(EXPLORE_STORAGE_KEY, serializeProject(scenario));
          } else {
            window.localStorage.setItem(STORAGE_KEY, serializeProject(scenario));
          }
        }
      }
    }
  }, [assignmentParam, isExplore]);

  const projectRef = useRef(project);
  projectRef.current = project;

  // Fit studio to viewport
  const studioRef = useRef(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = studioRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--fp-studio-top', `${Math.max(0, Math.round(top))}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Selection
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // View & Tool options
  const [zoom, setZoom] = useState(1);
  const [fitToken, setFitToken] = useState(0);
  const requestFit = useCallback(() => {
    setZoom(1);
    setFitToken((t) => t + 1);
  }, []);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(5);
  const [showPowerNetwork, setShowPowerNetwork] = useState(true);
  const [showCongestion, setShowCongestion] = useState(false);
  const [showBlockages, setShowBlockages] = useState(true);
  const [showFlylines, setShowFlylines] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);

  // Candidate comparison
  const [candidates, setCandidates] = useState(() => (Array.isArray(project?.candidates) ? project.candidates : []));
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  // Update project helper with history recording
  const updateProject = useCallback((updater) => {
    setHistory((h) => [...h.slice(-25), JSON.parse(JSON.stringify(project))]);
    setRedoStack([]);
    setProject(updater);
  }, [project]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, JSON.parse(JSON.stringify(project))]);
    setProject(prev);
  }, [history, project]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, JSON.parse(JSON.stringify(project))]);
    setProject(next);
  }, [redoStack, project]);

  // Save
  const handleSave = useCallback(() => {
    try {
      const projectToSave = {
        ...project,
        candidates: candidates.length > 0 ? candidates : (project.candidates || []),
      };
      if (isExplore) {
        window.sessionStorage.setItem(EXPLORE_STORAGE_KEY, serializeProject(projectToSave));
        alert('Saved to this Explore session only. Your Normal Game floorplan is unchanged.');
      } else {
        window.localStorage.setItem(STORAGE_KEY, serializeProject(projectToSave));
        alert('Floorplan project saved.');
      }
    } catch (e) {
      alert('Failed to save project: ' + e.message);
    }
  }, [project, candidates, isExplore]);

  // Multi-format EDA Exporter (LEF, DEF, JSON, Text Signoff Report)
  const handleExport = useCallback((format = 'json') => {
    let dataStr = '';
    let ext = 'json';

    if (format === 'lef') {
      const lefText = generateLEF(project);
      dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lefText);
      ext = 'lef';
    } else if (format === 'def') {
      const defText = generateDEF(project);
      dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(defText);
      ext = 'def';
    } else if (format === 'report') {
      const repText = generateSignoffReportText(project);
      dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(repText);
      ext = 'txt';
    } else {
      dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(serializeProject(project));
      ext = 'json';
    }

    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_floorplan.${ext}`);
    dlAnchor.click();
  }, [project]);

  // Import JSON
  const handleImport = useCallback((jsonStr) => {
    try {
      const parsed = deserializeProject(jsonStr);
      setCandidates(parsed.candidates || []);
      updateProject(parsed);
      setSelectedId(null);
      setSelectedType(null);
      requestFit();
      alert('Floorplan loaded successfully!');
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
  }, [updateProject, requestFit]);

  // New Project
  const handleNewProject = useCallback(() => {
    if (window.confirm('Create a new blank floorplan project? Any unsaved edits will be lost.')) {
      const fresh = createDefaultProject('New Design', 'empty');
      if (assignmentParam) fresh.assignmentId = assignmentParam;
      setCandidates([]);
      updateProject(fresh);
      setSelectedId(null);
      setSelectedType(null);
      requestFit();
    }
  }, [updateProject, requestFit, assignmentParam]);

  // Load Preset / Scenario
  const handleLoadPreset = useCallback((presetKey) => {
    let preset = null;
    if (presetKey === 'scenario-a') preset = SCENARIO_SIMPLE_CONTROL;
    else if (presetKey === 'small-controller') preset = EXAMPLE_SMALL_CONTROLLER;
    else if (presetKey === 'scenario-b') preset = SCENARIO_DUAL_SRAM;
    else if (presetKey === 'dual-sram') preset = EXAMPLE_DUAL_SRAM_CONTROLLER;
    else if (presetKey === 'scenario-c') preset = SCENARIO_FOUR_MACRO;
    else if (presetKey === 'scenario-d') preset = SCENARIO_SMALL_SOC;
    else if (presetKey === 'small-soc') preset = EXAMPLE_SMALL_SOC_SUBSYSTEM;
    else if (presetKey === 'scenario-e') preset = SCENARIO_BROKEN_PDN;
    else if (presetKey === 'scenario-f') preset = SCENARIO_CONGESTION_STRESS;
    else if (presetKey === 'scenario-capstone' || presetKey === 'capstone-soc') preset = SCENARIO_SOC_CAPSTONE;

    if (preset) {
      const migrated = migrateProject(JSON.parse(JSON.stringify(preset)));
      if (assignmentParam) migrated.assignmentId = assignmentParam;
      setCandidates(migrated.candidates || []);
      updateProject(migrated);
      setSelectedId(null);
      setSelectedType(null);
      requestFit();
    }
  }, [updateProject, requestFit, assignmentParam]);

  // Update Macro Position (during drag)
  const handleUpdateMacroPosition = useCallback((macroId, x, y) => {
    setProject((prev) => ({
      ...prev,
      macros: prev.macros.map((m) => (m.id === macroId ? { ...m, x, y } : m)),
    }));
  }, []);

  // Commit drag as one undo step
  const handleCommitMacroDrag = useCallback((macroId, from) => {
    const current = projectRef.current;
    const before = {
      ...current,
      macros: current.macros.map((m) => (m.id === macroId ? { ...m, x: from.x, y: from.y } : m)),
    };
    setHistory((h) => [...h.slice(-25), JSON.parse(JSON.stringify(before))]);
    setRedoStack([]);
  }, []);

  // Update Macro
  const handleUpdateMacro = useCallback((macroId, patch) => {
    updateProject((prev) => ({
      ...prev,
      macros: prev.macros.map((m) => {
        if (m.id !== macroId) return m;
        const base = patch.orientation && patch.orientation !== (m.orientation || 'R0')
          ? transformMacroOrientation(m, patch.orientation)
          : m;
        const { orientation, ...rest } = patch;
        return { ...base, ...rest, orientation: orientation || base.orientation };
      }),
    }));
  }, [updateProject]);

  // Add Macro
  const handleAddMacro = useCallback((newMacro) => {
    updateProject((prev) => ({
      ...prev,
      macros: [...prev.macros, newMacro],
    }));
    setSelectedType('macro');
    setSelectedId(newMacro.id);
  }, [updateProject]);

  // Duplicate Macro
  const handleDuplicateMacro = useCallback((macroId) => {
    const m = project.macros.find((x) => x.id === macroId);
    if (!m) return;
    const dup = {
      ...JSON.parse(JSON.stringify(m)),
      id: `${m.id}_copy_${Date.now() % 1000}`,
      name: `${m.name || m.id}_copy`,
      x: m.x + 20,
      y: m.y + 20,
      fixed: false,
    };
    updateProject((prev) => ({
      ...prev,
      macros: [...prev.macros, dup],
    }));
    setSelectedType('macro');
    setSelectedId(dup.id);
  }, [project, updateProject]);

  // Update Pin
  const handleUpdatePin = useCallback((pinId, patch) => {
    updateProject((prev) => ({
      ...prev,
      pins: prev.pins.map((p) => (p.id === pinId ? { ...p, ...patch } : p)),
    }));
  }, [updateProject]);

  // Add Pin
  const handleAddPin = useCallback((newPin) => {
    updateProject((prev) => ({
      ...prev,
      pins: [...(prev.pins || []), newPin],
    }));
    setSelectedType('pin');
    setSelectedId(newPin.id);
  }, [updateProject]);

  // Blockages
  const handleAddBlockage = useCallback((newBlk) => {
    updateProject((prev) => ({
      ...prev,
      blockages: [...(prev.blockages || []), newBlk],
    }));
    setSelectedType('blockage');
    setSelectedId(newBlk.id);
  }, [updateProject]);

  const handleUpdateBlockage = useCallback((blkId, patch) => {
    updateProject((prev) => ({
      ...prev,
      blockages: (prev.blockages || []).map((b) => (b.id === blkId ? { ...b, ...patch } : b)),
    }));
  }, [updateProject]);

  // Straps
  const handleAddStrap = useCallback((newStrap) => {
    updateProject((prev) => ({
      ...prev,
      powerNetwork: {
        ...prev.powerNetwork,
        straps: [...(prev.powerNetwork?.straps || []), newStrap],
      },
    }));
    setSelectedType('strap');
    setSelectedId(newStrap.id);
  }, [updateProject]);

  const handleUpdateStrap = useCallback((strapId, patch) => {
    updateProject((prev) => ({
      ...prev,
      powerNetwork: {
        ...prev.powerNetwork,
        straps: (prev.powerNetwork?.straps || []).map((s) => (s.id === strapId ? { ...s, ...patch } : s)),
      },
    }));
  }, [updateProject]);

  // Vias
  const handleAddVia = useCallback((via) => {
    updateProject((prev) => ({
      ...prev,
      powerNetwork: addVia(prev.powerNetwork, via),
    }));
  }, [updateProject]);

  // Boundaries
  const handleUpdateDie = useCallback((patch) => {
    updateProject((prev) => ({
      ...prev,
      die: { ...prev.die, ...patch },
    }));
  }, [updateProject]);

  const handleUpdateCore = useCallback((patch) => {
    updateProject((prev) => ({
      ...prev,
      core: { ...prev.core, ...patch },
    }));
  }, [updateProject]);

  // Delete Entity
  const handleDeleteSelected = useCallback((type, id) => {
    if (type === 'macro') {
      updateProject((prev) => ({
        ...prev,
        macros: prev.macros.filter((m) => m.id !== id),
      }));
    } else if (type === 'pin') {
      updateProject((prev) => ({
        ...prev,
        pins: (prev.pins || []).filter((p) => p.id !== id),
      }));
    } else if (type === 'blockage') {
      updateProject((prev) => ({
        ...prev,
        blockages: (prev.blockages || []).filter((b) => b.id !== id),
      }));
    } else if (type === 'strap') {
      updateProject((prev) => ({
        ...prev,
        powerNetwork: {
          ...prev.powerNetwork,
          straps: (prev.powerNetwork?.straps || []).filter((s) => s.id !== id),
        },
      }));
    } else if (type === 'via') {
      updateProject((prev) => ({
        ...prev,
        powerNetwork: removeVia(prev.powerNetwork, id),
      }));
    }
    setSelectedId(null);
    setSelectedType(null);
  }, [updateProject]);

  // Automated Design Assistants
  const handleLegalizeMacros = useCallback(() => {
    const legalized = assistedMacroLegalization(project);
    const newMacros = legalized.modifiedMacros || legalized.macros || project.macros;
    updateProject((prev) => ({
      ...prev,
      macros: newMacros,
    }));
    alert(legalized.message || `Assisted Macro Legalizer: Realigned macros into legal sites.`);
  }, [project, updateProject]);

  const handleLegalizePins = useCallback(() => {
    const legalized = assistedPinLegalization(project);
    const newPins = legalized.modifiedPins || legalized.pins || project.pins;
    updateProject((prev) => ({
      ...prev,
      pins: newPins,
    }));
    alert(legalized.message || `Assisted Pin Legalizer: Adjusted pins to satisfy pitch.`);
  }, [project, updateProject]);

  const handleGeneratePDNGrid = useCallback(() => {
    const core = project.core || { x: 40, y: 40, width: 320, height: 240 };
    const generated = generatePDNGrid(core);
    updateProject((prev) => ({
      ...prev,
      powerNetwork: {
        ...(prev.powerNetwork || {}),
        rings: generated.rings || prev.powerNetwork?.rings || [],
        straps: generated.straps,
        vias: generated.vias,
        sources: generated.sources || prev.powerNetwork?.sources || [],
        loads: generated.loads || prev.powerNetwork?.loads || [],
      },
    }));
    alert(`PDN Grid Assistant: ${generated.message}`);
  }, [project, updateProject]);

  // Candidate snapshots
  const handleSnapshotCandidate = useCallback(() => {
    const promptRes = window.prompt ? window.prompt('Enter a label for this design candidate snapshot:', `Candidate ${candidates.length + 1} (${project.name})`) : null;
    const name = (promptRes && promptRes.trim()) ? promptRes.trim() : `Candidate ${candidates.length + 1}`;
    const snap = createCandidateSnapshot(project, name);
    const next = [...candidates, snap];
    setCandidates(next);
    updateProject((prev) => ({
      ...prev,
      candidates: next,
    }));
    if (window.alert) window.alert(`Snapshot "${name}" saved! View side-by-side in Candidate tab or modal.`);
  }, [project, candidates, updateProject]);

  const handleLoadCandidate = useCallback((candProject) => {
    updateProject(JSON.parse(JSON.stringify(candProject)));
    setSelectedId(null);
    setSelectedType(null);
    requestFit();
  }, [updateProject, requestFit]);

  const handleDeleteCandidate = useCallback((index) => {
    const next = candidates.filter((_, idx) => idx !== index);
    setCandidates(next);
    updateProject((prev) => ({
      ...prev,
      candidates: next,
    }));
  }, [candidates, updateProject]);

  // ─── LIVE EDA ANALYSIS ─────
  const signoff = useMemo(() => evaluateFloorplanSignoff(project), [project]);
  const utilization = signoff.analysis.utilization;
  const hpwl = signoff.analysis.hpwl;
  const pdnAnalysis = signoff.analysis.pdn;
  const congestionMap = signoff.analysis.congestion;
  const violations = signoff.violations;

  // Select Violation handler
  const handleSelectViolation = useCallback((v) => {
    if (v.targetId && v.targetType) {
      setSelectedId(v.targetId);
      setSelectedType(v.targetType);
    }
  }, []);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedType(null);
        setMeasureMode(false);
      } else if (selectedType === 'macro' && selectedId) {
        const delta = snapToGrid ? gridSize : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleUpdateMacro(selectedId, { x: (project.macros.find((m) => m.id === selectedId)?.x || 0) - delta });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleUpdateMacro(selectedId, { x: (project.macros.find((m) => m.id === selectedId)?.x || 0) + delta });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleUpdateMacro(selectedId, { y: (project.macros.find((m) => m.id === selectedId)?.y || 0) - delta });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleUpdateMacro(selectedId, { y: (project.macros.find((m) => m.id === selectedId)?.y || 0) + delta });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedType, selectedId, snapToGrid, gridSize, project, handleUndo, handleRedo, handleUpdateMacro]);

  const handleReturnToKingdom = useCallback(() => {
    navigate(isExplore ? '/explore/kingdom/floorplanning' : '/kingdom/floorplanning');
  }, [isExplore, navigate]);

  const handleReturnToHome = useCallback(() => {
    navigate(isExplore ? '/explore' : '/world-map');
  }, [isExplore, navigate]);

  const activeAssignmentId = assignmentParam || project?.assignmentId;
  const handleReturnToLesson = useCallback(() => {
    if (!activeAssignmentId) {
      handleReturnToKingdom();
      return;
    }
    navigate(isExplore ? `/explore/kingdom/floorplanning/level/${activeAssignmentId}` : `/kingdom/floorplanning/level/${activeAssignmentId}`);
  }, [activeAssignmentId, isExplore, navigate, handleReturnToKingdom]);

  return (
    <div className="fp-studio" data-testid="fp-studio" ref={studioRef}>
      {/* 1. TOP TOOLBAR */}
      <StudioToolbar
        project={project}
        onNewProject={handleNewProject}
        onLoadPreset={handleLoadPreset}
        onSaveProject={handleSave}
        onExport={handleExport}
        onExportJson={() => handleExport("json")}
        onImportJson={handleImport}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(6, Number((z * 1.2).toFixed(3))))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, Number((z / 1.2).toFixed(3))))}
        onFitView={requestFit}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        gridSize={gridSize}
        onChangeGridSize={setGridSize}
        showCongestion={showCongestion}
        onToggleCongestion={() => setShowCongestion(!showCongestion)}
        showPowerNetwork={showPowerNetwork}
        onTogglePowerNetwork={() => setShowPowerNetwork(!showPowerNetwork)}
        showBlockages={showBlockages}
        onToggleBlockages={() => setShowBlockages(!showBlockages)}
        isExploreMode={isExplore}
        onReturnToHome={handleReturnToHome}
        onReturnToKingdom={handleReturnToKingdom}
        onAddMacro={handleAddMacro}
        onAddPin={handleAddPin}
        onAddBlockage={handleAddBlockage}
        onAddStrap={handleAddStrap}
        onAddVia={handleAddVia}
        onLegalizeMacros={handleLegalizeMacros}
        onLegalizePins={handleLegalizePins}
        onGeneratePDNGrid={handleGeneratePDNGrid}
        measureMode={measureMode}
        onToggleMeasure={() => setMeasureMode((m) => !m)}
        onOpenCandidateCompare={() => setIsCandidateModalOpen(true)}
        onSnapshotCandidate={handleSnapshotCandidate}
      />

      {/* Guided Lesson Banner */}
      {activeAssignmentId && (
        <div
          className="fp-studio__guided-banner"
          data-testid="guided-lesson-banner"
          style={{
            background: '#0f172a',
            borderBottom: '2px solid #f59e0b',
            padding: '0.45rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#f8fafc',
            flexWrap: 'wrap',
            gap: '0.5rem',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem' }}>🎯</span>
            <span>
              <strong>Guided Lesson Mode:</strong> Currently editing assignment for <strong>Lesson {activeAssignmentId.toUpperCase()}</strong>.
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              (All modifications are saved to persistent project storage)
            </span>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            data-testid="btn-return-lesson"
            onClick={handleReturnToLesson}
            style={{
              padding: '0.3rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Return to Lesson {activeAssignmentId.toUpperCase()}
          </button>
        </div>
      )}

      {/* 2. BODY (3-COLUMN LAYOUT) */}
      <div className="fp-studio__body">
        {/* Left: Design Explorer & Violations */}
        <DesignExplorer
          project={project}
          selectedId={selectedId}
          selectedType={selectedType}
          onSelect={(type, id) => {
            setSelectedType(type);
            setSelectedId(id);
          }}
          violations={violations}
          onSelectViolation={handleSelectViolation}
          onAddVia={handleAddVia}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateMacro={handleDuplicateMacro}
        />

        {/* Center: Interactive SVG Canvas */}
        <div className="fp-studio__canvas-area">
          <StudioCanvas
            project={project}
            selectedId={selectedId}
            selectedType={selectedType}
            onSelect={(type, id) => {
              setSelectedType(type);
              setSelectedId(id);
            }}
            onUpdateMacroPosition={handleUpdateMacroPosition}
            onCommitMacroDrag={handleCommitMacroDrag}
            fitToken={fitToken}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
            showPowerNetwork={showPowerNetwork}
            showCongestion={showCongestion}
            congestionMap={congestionMap}
            showBlockages={showBlockages}
            showFlylines={showFlylines}
            measureMode={measureMode}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>

        {/* Right: Properties Inspector & Diagnostics */}
        <PropertiesInspector
          project={project}
          selectedId={selectedId}
          selectedType={selectedType}
          onUpdateMacro={handleUpdateMacro}
          onUpdatePin={handleUpdatePin}
          onUpdateBlockage={handleUpdateBlockage}
          onUpdateStrap={handleUpdateStrap}
          onUpdateDie={handleUpdateDie}
          onUpdateCore={handleUpdateCore}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateMacro={handleDuplicateMacro}
          violations={violations}
          onSelectViolation={handleSelectViolation}
          onAddVia={handleAddVia}
        />
      </div>

      {/* 3. BOTTOM PANEL: PROFESSIONAL 8-TAB DOCK */}
      <AnalysisPanel
        project={project}
        utilization={utilization}
        maxUtilization={project.constraints?.maxUtilization}
        hpwl={hpwl}
        pdnAnalysis={pdnAnalysis}
        congestionMap={congestionMap}
        signoff={signoff}
        candidates={candidates}
        onSnapshotCandidate={handleSnapshotCandidate}
        onLoadCandidate={handleLoadCandidate}
        onDeleteCandidate={handleDeleteCandidate}
        onSelectViolation={handleSelectViolation}
        onAddVia={handleAddVia}
      />

      {/* Candidate Comparison Modal */}
      <CandidateCompareModal
        isOpen={isCandidateModalOpen}
        onClose={() => setIsCandidateModalOpen(false)}
        candidates={candidates}
        onSnapshotCurrent={handleSnapshotCandidate}
        onLoadCandidate={handleLoadCandidate}
        onDeleteCandidate={handleDeleteCandidate}
      />
    </div>
  );
}
