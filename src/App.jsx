import React, { useState, useRef } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Fretboard from './components/Fretboard';
import './index.css';

const makeEmptyDiagram = () => ({ id: Date.now() + Math.random(), marks: [] });

function App() {
  const [config, setConfig] = useState({
    strings: 6,
    frets: 5,
    startFret: 1,
    orientation: 'horizontal',
    showFretNumbers: true,
    showInlays: true,
    showNut: true,
    numDiagrams: 1,
  });

  const [chordName, setChordName] = useState('');
  const [transpose, setTranspose] = useState(0);

  const [activeTool, setActiveTool] = useState({
    shape: 'circle',
    color: '#ef4444',
    color2: null
  });

  // Each diagram has { id, marks }
  const [diagrams, setDiagrams] = useState([makeEmptyDiagram()]);

  const [savedDiagrams, setSavedDiagrams] = useState(() => {
    const saved = localStorage.getItem('guitar-diagrams');
    return saved ? JSON.parse(saved) : [];
  });

  const [zoomMode, setZoomMode] = useState('fit');
  const [skipMarkAnimation, setSkipMarkAnimation] = useState(false); // 'fit' | 'scroll'
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  // ── Sound ────────────────────────────────────────────────────────────────
  // Standard 6-string open-string MIDI notes, top to bottom: E4 B3 G3 D3 A2 E2
  const STANDARD_6 = [64, 59, 55, 50, 45, 40];

  const getOpenStringMidi = (stringIdx, totalStrings) => {
    if (totalStrings <= 6) {
      // Use bottom N strings (slice from the low end)
      const offset = 6 - totalStrings;
      return STANDARD_6[stringIdx + offset];
    }
    // More than 6 strings: add higher strings above
    const extra = totalStrings - 6;
    if (stringIdx < extra) return STANDARD_6[0] + (extra - stringIdx) * 5;
    return STANDARD_6[stringIdx - extra];
  };

  const getAudioCtx = () => {
    const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const playNoteAt = (stringIndex, fretIndex, startTime = 0) => {
    const ctx = getAudioCtx();
    const openMidi = getOpenStringMidi(stringIndex, config.strings);
    const semitones = fretIndex === -1 ? 0 : config.startFret + fretIndex;
    const freq = 440 * Math.pow(2, (openMidi + semitones - 69) / 12);

    // Karplus-Strong plucked string synthesis
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const numSamples = Math.floor(sr * 3);
    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
    const out = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const p = i % N;
      out[i] = delay[p];
      delay[p] = 0.996 * 0.5 * (delay[p] + delay[(i + 1) % N]);
    }
    const buf = ctx.createBuffer(1, numSamples, sr);
    buf.getChannelData(0).set(out);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime + startTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime + startTime);
  };

  const playNote = (stringIndex, fretIndex) => {
    if (!soundEnabled) return;
    playNoteAt(stringIndex, fretIndex, 0);
  };

  const playHarmonic = () => {
    const allMarks = diagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    getAudioCtx();
    allMarks.forEach(m => playNoteAt(m.stringIndex, m.fretIndex, 0));
  };

  const playMelodic = () => {
    const allMarks = diagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    getAudioCtx();
    // Sort low E (high stringIndex) first, then by fret — simulates a strum low → high
    const sorted = [...allMarks].sort((a, b) => b.stringIndex - a.stringIndex || a.fretIndex - b.fretIndex);
    sorted.forEach((m, i) => playNoteAt(m.stringIndex, m.fretIndex, i * 0.1));
  };

  const [isLoadSidebarOpen, setIsLoadSidebarOpen] = useState(false);
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);

  // ── Num diagrams (rows) ──────────────────────────────────────────────────
  const handleNumDiagramsChange = (newNum) => {
    const n = Math.max(1, Math.min(6, isNaN(newNum) ? 1 : newNum));
    setConfig(prev => ({ ...prev, numDiagrams: n }));
    setDiagrams(prev => {
      if (n > prev.length) {
        const extras = Array.from({ length: n - prev.length }, makeEmptyDiagram);
        return [...prev, ...extras];
      }
      return prev.slice(0, n);
    });
  };

  // ── Transpose ────────────────────────────────────────────────────────────
  const handleTransposeChange = (newValue) => {
    const val = isNaN(newValue) ? 0 : newValue;
    const delta = val - transpose;
    setTranspose(val);
    if (delta !== 0) {
      setSkipMarkAnimation(true);
      setDiagrams(prev => prev.map(d => ({
        ...d,
        marks: d.marks.map(m => ({ ...m, fretIndex: m.fretIndex + delta }))
      })));
      setTimeout(() => setSkipMarkAnimation(false), 50);
    }
  };

  // ── Mark toggling ────────────────────────────────────────────────────────
  const handleToggleMark = (diagramIndex, stringIndex, fretIndex, shapeOverride = null) => {
    // Play note when placing a new mark
    const isNew = !diagrams[diagramIndex].marks.find(
      m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
    );
    if (isNew) playNote(stringIndex, fretIndex);

    setDiagrams(prev => {
      const newDiagrams = [...prev];
      const prevMarks = newDiagrams[diagramIndex].marks;

      const existingIndex = prevMarks.findIndex(
        m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
      );

      const targetShape = shapeOverride || activeTool.shape;
      const targetColor = activeTool.color;
      let newMarks;

      if (existingIndex >= 0) {
        const existingMark = prevMarks[existingIndex];
        if (existingMark.shape === 'cross') {
          newMarks = prevMarks.filter((_, i) => i !== existingIndex);
        } else {
          const targetColor2 = activeTool.color2 || null;
          if (
            existingMark.color !== targetColor ||
            existingMark.shape !== targetShape ||
            existingMark.color2 !== targetColor2
          ) {
            newMarks = [...prevMarks];
            newMarks[existingIndex] = { ...existingMark, color: targetColor, color2: targetColor2, shape: targetShape };
          } else {
            newMarks = prevMarks.filter((_, i) => i !== existingIndex);
          }
        }
      } else {
        newMarks = [...prevMarks, {
          id: `m-${Date.now()}-${Math.random()}`,
          stringIndex,
          fretIndex,
          shape: targetShape,
          color: targetColor,
          color2: activeTool.color2 || null,
          text: ''
        }];
      }

      newDiagrams[diagramIndex] = { ...newDiagrams[diagramIndex], marks: newMarks };
      return newDiagrams;
    });
  };

  const handleUpdateMarkText = (diagramIndex, stringIndex, fretIndex, text) => {
    setDiagrams(prev => {
      const newDiagrams = [...prev];
      newDiagrams[diagramIndex] = {
        ...newDiagrams[diagramIndex],
        marks: newDiagrams[diagramIndex].marks.map(m =>
          m.stringIndex === stringIndex && m.fretIndex === fretIndex ? { ...m, text } : m
        )
      };
      return newDiagrams;
    });
  };

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all marks?')) {
      setDiagrams(prev => prev.map(d => ({ ...d, marks: [] })));
      setChordName('');
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    // In scroll mode the download target is off-screen and clipped.
    // Switch to fit mode briefly so the target is in normal flow, then restore.
    const wasScroll = zoomMode === 'scroll';
    if (wasScroll) {
      setZoomMode('fit');
      await new Promise(r => setTimeout(r, 150));
    }

    const node = document.querySelector('.actual-download-target');
    if (!node) { if (wasScroll) setZoomMode('scroll'); return; }
    try {
      const blob = await toBlob(node, { backgroundColor: '#ffffff' });
      if (!blob) throw new Error('Failed to generate image blob');

      const fileName = `${chordName || 'guitar-diagram'}.png`;

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const file = new File([blob], fileName, { type: 'image/png' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to download image');
    } finally {
      if (wasScroll) setZoomMode('scroll');
    }
  };

  // ── Save / Load ──────────────────────────────────────────────────────────
  const handleSaveDiagram = () => {
    let name = chordName || prompt('Enter a name for this diagram:');
    if (!name) return;

    const existingIndex = savedDiagrams.findIndex(d => d.name === name);
    const newDiagram = {
      id: existingIndex >= 0 ? savedDiagrams[existingIndex].id : Date.now(),
      name,
      config: { ...config },
      chordName: name,
      diagrams: [...diagrams],
      timestamp: new Date().toISOString()
    };

    let updated;
    if (existingIndex >= 0) {
      if (!window.confirm(`A diagram named "${name}" already exists. Overwrite it?`)) return;
      updated = [...savedDiagrams];
      updated[existingIndex] = newDiagram;
    } else {
      updated = [...savedDiagrams, newDiagram];
    }

    setSavedDiagrams(updated);
    localStorage.setItem('guitar-diagrams', JSON.stringify(updated));
    setChordName(name);
  };

  const handleLoadDiagram = (diagram) => {
    setConfig(diagram.config);
    setChordName(diagram.chordName || diagram.name || '');
    // Support both new (diagrams array) and old (marks array) saved format
    if (diagram.diagrams) {
      setDiagrams(diagram.diagrams);
    } else {
      setDiagrams([{ id: Date.now(), marks: diagram.marks || [] }]);
    }
  };

  const handleDeleteDiagram = (id) => {
    if (window.confirm('Delete this saved diagram?')) {
      const updated = savedDiagrams.filter(d => d.id !== id);
      setSavedDiagrams(updated);
      localStorage.setItem('guitar-diagrams', JSON.stringify(updated));
    }
  };

  return (
    <div className="app-container">
      <ControlPanel
        config={config}
        setConfig={setConfig}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        transpose={transpose}
        onTransposeChange={handleTransposeChange}
        onNumDiagramsChange={handleNumDiagramsChange}
        zoomMode={zoomMode}
        onZoomModeChange={setZoomMode}
        onClear={handleClear}
        onDownload={handleDownload}
        onSave={handleSaveDiagram}
        onModalToggle={setIsMainModalOpen}
        isLoadSidebarOpen={isLoadSidebarOpen}
        setIsLoadSidebarOpen={setIsLoadSidebarOpen}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(v => !v)}
        onPlayHarmonic={playHarmonic}
        onPlayMelodic={playMelodic}
      />

      <div className="main-content-area">
        <div className="instruments-area">
          <Fretboard
            config={config}
            diagrams={diagrams}
            onToggleMark={handleToggleMark}
            onUpdateMarkText={handleUpdateMarkText}
            chordName={chordName}
            setChordName={setChordName}
            zoomMode={zoomMode}
            skipMarkAnimation={skipMarkAnimation}
            isLoadSidebarOpen={isLoadSidebarOpen}
            isMainModalOpen={isMainModalOpen}
          />
        </div>

        <AnimatePresence>
          {isLoadSidebarOpen && (
            <motion.div
              className="load-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="sidebar-header">
                <h3>Saved Diagrams</h3>
                <button className="close-sidebar-btn" onClick={() => setIsLoadSidebarOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="sidebar-body">
                <div className="saved-diagrams-list-v2">
                  {savedDiagrams.length === 0 ? (
                    <div className="empty-state">No diagrams saved yet.</div>
                  ) : (
                    savedDiagrams.map((diagram) => (
                      <div key={diagram.id} className="diagram-item-v2">
                        <div className="diagram-info" onClick={() => handleLoadDiagram(diagram)}>
                          <span className="diagram-name">{diagram.name}</span>
                          <span className="diagram-date">
                            {new Date(diagram.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="diagram-actions-row">
                          <button
                            className="delete-btn"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDiagram(diagram.id); }}
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
