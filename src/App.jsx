import React, { useEffect, useState, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Guitar, LogOut, Cloud } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Fretboard from './components/Fretboard';
import AuthDialog from './components/AuthDialog';
import {
  createEmailAccount,
  deleteUserDiagram,
  getUserDiagrams,
  isFirebaseConfigured,
  observeAuth,
  prepareFirebaseAuth,
  saveUserDiagram,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
} from './firebase';
import './index.css';

const MAX_ROWS_HORIZONTAL = 6;
const MAX_ROWS_VERTICAL = 24;
const getMaxRows = (orientation) => orientation === 'vertical' ? MAX_ROWS_VERTICAL : MAX_ROWS_HORIZONTAL;
const DIAGRAM_STORAGE_KEY = 'guitar-diagrams';
const makeEmptyDiagram = () => ({ id: Date.now() + Math.random(), name: '', marks: [], ghostMarks: [] });

const readLocalDiagrams = () => {
  try {
    const saved = localStorage.getItem(DIAGRAM_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Ignoring invalid saved diagram data', error);
    return [];
  }
};

const writeLocalDiagrams = (items) => {
  localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(items));
};

const toCloudDiagram = (diagram) => {
  const cloudDiagram = { ...diagram };
  delete cloudDiagram._pendingCloudSync;
  delete cloudDiagram._cloudSynced;
  return cloudDiagram;
};

const mergeSavedDiagrams = (...collections) => {
  const byId = new Map();
  collections.flat().forEach((diagram) => {
    if (!diagram?.id) return;
    const id = String(diagram.id);
    const existing = byId.get(id);
    const incomingTime = Date.parse(diagram.timestamp || 0) || 0;
    const existingTime = Date.parse(existing?.timestamp || 0) || 0;
    if (!existing || incomingTime >= existingTime) byId.set(id, { ...diagram, id });
  });
  return [...byId.values()].sort((a, b) =>
    (Date.parse(b.timestamp || 0) || 0) - (Date.parse(a.timestamp || 0) || 0)
  );
};

// Reject after `ms` so a stalled Firestore call can't hang the UI forever
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud request timed out')), ms)),
]);

const getUntitledDiagramName = (items) => {
  const names = new Set(items.map(item => item.name?.trim().toLowerCase()).filter(Boolean));
  let number = 1;
  while (names.has(`untitled diagram ${number}`)) number += 1;
  return `Untitled Diagram ${number}`;
};
// Ordered C first, then sharp keys (1♯–7♯), then flat keys (1♭–7♭).
// `display` is shown in the dropdown menu; `label` is the tooltip.
const KEY_OPTIONS = [
  { value: 'C',  name: 'C',  display: 'C',        label: 'C — no sharps or flats', pitchClass: 0,  accidental: 'flats' },
  { value: 'G',  name: 'G',  display: 'G · 1♯',   label: 'G — 1 sharp',  pitchClass: 7,  accidental: 'sharps' },
  { value: 'D',  name: 'D',  display: 'D · 2♯',   label: 'D — 2 sharps', pitchClass: 2,  accidental: 'sharps' },
  { value: 'A',  name: 'A',  display: 'A · 3♯',   label: 'A — 3 sharps', pitchClass: 9,  accidental: 'sharps' },
  { value: 'E',  name: 'E',  display: 'E · 4♯',   label: 'E — 4 sharps', pitchClass: 4,  accidental: 'sharps' },
  { value: 'B',  name: 'B',  display: 'B · 5♯',   label: 'B — 5 sharps', pitchClass: 11, accidental: 'sharps' },
  { value: 'F#', name: 'F#', display: 'F♯ · 6♯',  label: 'F# — 6 sharps', pitchClass: 6, accidental: 'sharps' },
  { value: 'C#', name: 'C#', display: 'C♯ · 7♯',  label: 'C# — 7 sharps', pitchClass: 1, accidental: 'sharps' },
  { value: 'F',  name: 'F',  display: 'F · 1♭',   label: 'F — 1 flat',   pitchClass: 5,  accidental: 'flats' },
  { value: 'Bb', name: 'Bb', display: 'B♭ · 2♭',  label: 'Bb — 2 flats', pitchClass: 10, accidental: 'flats' },
  { value: 'Eb', name: 'Eb', display: 'E♭ · 3♭',  label: 'Eb — 3 flats', pitchClass: 3,  accidental: 'flats' },
  { value: 'Ab', name: 'Ab', display: 'A♭ · 4♭',  label: 'Ab — 4 flats', pitchClass: 8,  accidental: 'flats' },
  { value: 'Db', name: 'Db', display: 'D♭ · 5♭',  label: 'Db — 5 flats', pitchClass: 1,  accidental: 'flats' },
  { value: 'Gb', name: 'Gb', display: 'G♭ · 6♭',  label: 'Gb — 6 flats', pitchClass: 6,  accidental: 'flats' },
  { value: 'Cb', name: 'Cb', display: 'C♭ · 7♭',  label: 'Cb — 7 flats', pitchClass: 11, accidental: 'flats' },
];

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
    showRowLabels: false,
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

  const [savedDiagrams, setSavedDiagrams] = useState(readLocalDiagrams);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');

  const [zoomMode, setZoomMode] = useState('fit');
  const [skipMarkAnimation, setSkipMarkAnimation] = useState(false); // 'fit' | 'scroll'
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    prepareFirebaseAuth().catch(error => console.error('Failed to prepare Firebase Auth', error));
    return observeAuth(async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setCloudMessage('');

      if (nextUser) {
        setIsAuthDialogOpen(false);
        setAuthMessage('');
      }

      if (!nextUser) {
        setSavedDiagrams(readLocalDiagrams());
        return;
      }

      setCloudBusy(true);
      try {
        const cloudDiagrams = await withTimeout(getUserDiagrams(nextUser.uid), 12000);
        const localDiagrams = readLocalDiagrams();
        const cloudBackups = cloudDiagrams.map(diagram => ({ ...diagram, _cloudSynced: true }));
        const localDiagramsToKeep = localDiagrams.filter(diagram =>
          diagram._pendingCloudSync || (!diagram._cloudSynced && cloudDiagrams.length === 0)
        );
        const mergedDiagrams = mergeSavedDiagrams(cloudBackups, localDiagramsToKeep);
        const diagramsToSync = mergedDiagrams.filter(diagram => diagram._pendingCloudSync);

        writeLocalDiagrams(mergedDiagrams);
        setSavedDiagrams(mergedDiagrams);

        if (diagramsToSync.length > 0) {
          Promise.all(diagramsToSync.map(diagram => saveUserDiagram(nextUser.uid, toCloudDiagram(diagram))))
            .then(() => {
              const syncedVersions = new Map(diagramsToSync.map(diagram => [String(diagram.id), diagram.timestamp]));
              setSavedDiagrams((current) => {
                const synced = current.map((diagram) =>
                  syncedVersions.get(String(diagram.id)) === diagram.timestamp
                    ? { ...diagram, _pendingCloudSync: false, _cloudSynced: true }
                    : diagram
                );
                writeLocalDiagrams(synced);
                return synced;
              });
              setCloudMessage(`Synced ${diagramsToSync.length} saved diagram${diagramsToSync.length === 1 ? '' : 's'} to your account.`);
            })
            .catch((error) => {
              console.error('Failed to sync local diagrams', error);
              setCloudMessage('Your diagrams are safe on this device, but cloud sync is unavailable.');
            });
        }
      } catch (error) {
        console.error('Failed to load cloud diagrams', error);
        setSavedDiagrams(readLocalDiagrams());
        setCloudMessage('Cloud library is unavailable. Device saves still work.');
      } finally {
        setCloudBusy(false);
      }
    });
  }, []);

  // ── Root / display labels ────────────────────────────────────────────────
  const [rootKey, setRootKey] = useState('C');
  const [keyMode, setKeyMode] = useState('major');
  const [showScaleDegrees, setShowScaleDegrees] = useState(false);
  const [showNoteLabels, setShowNoteLabels] = useState(false);

  const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const selectedRootKey = KEY_OPTIONS.find(key => key.value === rootKey) || KEY_OPTIONS[0];

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

  const NOTE_NAMES          = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const SCALE_DEGREES_MAJOR = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
  const SCALE_DEGREES_MINOR = ['1','b2','2','3','#3','4','b5','5','6','#6','7','#7'];

  const getMidi = (stringIndex, fretIndex) => {
    const openMidi = getOpenStringMidi(stringIndex, config.strings);
    const semitones = fretIndex === -1 ? 0 : config.startFret + fretIndex;
    return openMidi + semitones;
  };

  const getScaleDegree = (noteMidi) => {
    const interval = ((noteMidi - selectedRootKey.pitchClass) % 12 + 12) % 12;
    return keyMode === 'minor' ? SCALE_DEGREES_MINOR[interval] : SCALE_DEGREES_MAJOR[interval];
  };

  const getNoteName = (noteMidi) => {
    const noteIdx = ((noteMidi % 12) + 12) % 12;
    if (noteIdx === selectedRootKey.pitchClass) return selectedRootKey.name;
    return selectedRootKey.accidental === 'sharps' ? NOTE_NAMES_SHARP[noteIdx] : NOTE_NAMES_FLAT[noteIdx];
  };

  const getMarkDisplayText = (mark) => {
    const midi = getMidi(mark.stringIndex, mark.fretIndex);
    if (showNoteLabels) return getNoteName(midi);
    if (showScaleDegrees) return getScaleDegree(midi);
    return mark.text || '';
  };

  const reverbRef = useRef(null);

  const getAudioCtx = () => {
    return audioCtxRef.current ?? (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
  };

  // Shared subtle reverb: generated impulse response + low wet mix
  const getReverb = (ctx) => {
    if (reverbRef.current) return reverbRef.current;
    const duration = 1.4;
    const decay = 3.5;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const impulse = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.12; // a tiny bit of reverb
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);
    reverbRef.current = convolver;
    return convolver;
  };

  // Safari requires AudioContext creation and resume to happen synchronously
  // inside a user-gesture call stack — any async/await after them loses the
  // gesture context and audio is silently blocked.  Call this at the top of
  // every click handler that might play audio.
  const unlockAudio = () => {
    const ctx = getAudioCtx();
    if (ctx.state === 'running') return;
    ctx.resume(); // fire-and-forget — must be called synchronously in the gesture
    // Play a 1-sample silent buffer: the classic Safari "audio unlock" trick
    // that forces the audio timeline to actually start.
    try {
      const silentBuf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const silentSrc = ctx.createBufferSource();
      silentSrc.buffer = silentBuf;
      silentSrc.connect(ctx.destination);
      silentSrc.start(0);
    } catch { /* ignore if ctx isn't ready yet */ }
  };

  const playNoteAt = (stringIndex, fretIndex, startTime = 0) => {
    const ctx = getAudioCtx();
    const openMidi = getOpenStringMidi(stringIndex, config.strings);
    const semitones = fretIndex === -1 ? 0 : config.startFret + fretIndex;
    const freq = 440 * Math.pow(2, (openMidi + semitones - 69) / 12);

    // Karplus-Strong plucked string synthesis
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const noteDuration = 1.5;
    const numSamples = Math.floor(sr * noteDuration);
    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
    const out = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const p = i % N;
      out[i] = delay[p];
      delay[p] = 0.992 * 0.5 * (delay[p] + delay[(i + 1) % N]);
    }
    const buf = ctx.createBuffer(1, numSamples, sr);
    buf.getChannelData(0).set(out);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    // Capture currentTime after the Karplus-Strong computation.
    // If the context just started (currentTime ~0), notes scheduled at 0 play
    // immediately once the timeline begins — the spec guarantees past-start
    // sources fire right away.
    const scheduleAt = ctx.currentTime + startTime;
    gain.gain.setValueAtTime(0.6, scheduleAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, scheduleAt + noteDuration);
    src.connect(gain);
    gain.connect(ctx.destination);      // dry signal
    gain.connect(getReverb(ctx));       // + subtle reverb
    src.start(scheduleAt);
  };

  const playNote = (stringIndex, fretIndex) => {
    if (!soundEnabled) return;
    unlockAudio(); // must happen synchronously before scheduling
    playNoteAt(stringIndex, fretIndex, 0);
  };

  const playHarmonic = () => {
    const allMarks = visibleDiagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    unlockAudio();
    allMarks.forEach(m => playNoteAt(m.stringIndex, m.fretIndex, 0));
  };

  const playMelodic = () => {
    const allMarks = visibleDiagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    unlockAudio();
    // Sort low E (high stringIndex) first, then by fret — simulates a strum low → high
    const sorted = [...allMarks].sort((a, b) => b.stringIndex - a.stringIndex || a.fretIndex - b.fretIndex);
    sorted.forEach((m, i) => playNoteAt(m.stringIndex, m.fretIndex, i * 0.1));
  };

  const [isLoadSidebarOpen, setIsLoadSidebarOpen] = useState(false);
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);

  // ── Num diagrams (rows) ──────────────────────────────────────────────────
  // Rows beyond numDiagrams are hidden, never deleted — their marks are kept
  // so they reappear when the row count is increased again.
  const visibleDiagrams = diagrams.slice(0, config.numDiagrams || 1);

  const handleNumDiagramsChange = (newNum) => {
    if (isNaN(newNum)) return; // ignore incomplete input
    const n = Math.max(1, Math.min(getMaxRows(config.orientation), newNum));
    setConfig(prev => ({ ...prev, numDiagrams: n }));
    setDiagrams(prev => {
      if (n > prev.length) {
        const extras = Array.from({ length: n - prev.length }, makeEmptyDiagram);
        return [...prev, ...extras];
      }
      return prev; // keep hidden rows — do NOT slice
    });
  };

  // Clamp row count when switching orientation (vertical allows more rows)
  useEffect(() => {
    const max = getMaxRows(config.orientation);
    if ((config.numDiagrams || 1) > max) {
      setConfig(prev => ({ ...prev, numDiagrams: max }));
    }
  }, [config.orientation, config.numDiagrams]);

  // ── Transpose ────────────────────────────────────────────────────────────
  const handleTransposeChange = (newValue) => {
    if (isNaN(newValue)) return; // ignore incomplete input like "" or "-"
    const val = Math.max(-24, Math.min(24, newValue));
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
    const existingMark = diagrams[diagramIndex].marks.find(
      m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
    );
    if (!existingMark) playNote(stringIndex, fretIndex);

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
          text: '',
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

  const handleUpdateDiagramName = (diagramIndex, name) => {
    setDiagrams(prev => prev.map((diagram, index) =>
      index === diagramIndex ? { ...diagram, name } : diagram
    ));
    if (diagramIndex === 0) setChordName(name);
  };

  // ── Ghost mark toggling ──────────────────────────────────────────────────
  const handleToggleGhostMark = (diagramIndex, stringIndex, fretIndex) => {
    const isNew = !(diagrams[diagramIndex].ghostMarks || []).find(
      m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
    );
    if (isNew) playNote(stringIndex, fretIndex);

    setDiagrams(prev => {
      const newDiagrams = [...prev];
      const d = newDiagrams[diagramIndex];
      const ghostMarks = d.ghostMarks || [];
      const existingIdx = ghostMarks.findIndex(
        m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
      );
      newDiagrams[diagramIndex] = {
        ...d,
        ghostMarks: existingIdx >= 0
          ? ghostMarks.filter((_, i) => i !== existingIdx)
          : [...ghostMarks, { id: `gm-${Date.now()}-${Math.random()}`, stringIndex, fretIndex, text: '' }]
      };
      return newDiagrams;
    });
  };

  const handleUpdateGhostMarkText = (diagramIndex, stringIndex, fretIndex, text) => {
    setDiagrams(prev => {
      const newDiagrams = [...prev];
      const d = newDiagrams[diagramIndex];
      newDiagrams[diagramIndex] = {
        ...d,
        ghostMarks: (d.ghostMarks || []).map(m =>
          m.stringIndex === stringIndex && m.fretIndex === fretIndex ? { ...m, text } : m
        )
      };
      return newDiagrams;
    });
  };

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all marks?')) {
      // Only clear visible rows — hidden rows keep their marks
      const n = config.numDiagrams || 1;
      setDiagrams(prev => prev.map((d, i) => i < n ? { ...d, marks: [], ghostMarks: [] } : d));
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
    const titleInputs = [...node.querySelectorAll('input[placeholder]')];
    const placeholders = titleInputs.map(input => input.getAttribute('placeholder'));
    try {
      titleInputs.forEach(input => input.setAttribute('placeholder', ''));
      const blob = await toBlob(node, { backgroundColor: '#ffffff' });
      if (!blob) throw new Error('Failed to generate image blob');

      const diagramNames = diagrams.map(d => d.name).filter(Boolean).join('-');
      const fileName = `${chordName || diagramNames || 'guitar-diagram'}.png`;

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
      titleInputs.forEach((input, index) => input.setAttribute('placeholder', placeholders[index] || ''));
      if (wasScroll) setZoomMode('scroll');
    }
  };

  // ── Save / Load ──────────────────────────────────────────────────────────
  const handleSaveDiagram = () => {
    const firstDiagramName = diagrams.find(d => d.name)?.name;
    const enteredName = (chordName || firstDiagramName || '').trim();
    const name = enteredName || getUntitledDiagramName(savedDiagrams);

    const existingIndex = savedDiagrams.findIndex(d => d.name?.trim().toLowerCase() === name.toLowerCase());
    const newDiagram = JSON.parse(JSON.stringify({
      id: existingIndex >= 0 ? savedDiagrams[existingIndex].id : crypto.randomUUID(),
      name,
      config: { ...config },
      chordName: name,
      diagrams: [...diagrams],
      timestamp: new Date().toISOString()
    }));

    const localDiagram = { ...newDiagram, _pendingCloudSync: true, _cloudSynced: false };
    const updated = mergeSavedDiagrams([localDiagram], savedDiagrams);

    try {
      writeLocalDiagrams(updated);
      setSavedDiagrams(updated);
      setChordName(name);
      setCloudMessage('Saved ✓');
    } catch (error) {
      console.error('Failed to save diagram on this device', error);
      setCloudMessage('Save failed. Browser storage may be full or unavailable.');
      return;
    }

    if (user) {
      withTimeout(saveUserDiagram(user.uid, newDiagram), 10000)
        .then(() => {
          setSavedDiagrams((current) => {
            const synced = current.map((diagram) =>
              String(diagram.id) === String(newDiagram.id) && diagram.timestamp === newDiagram.timestamp
                ? { ...diagram, _pendingCloudSync: false, _cloudSynced: true }
                : diagram
            );
            writeLocalDiagrams(synced);
            return synced;
          });
          setCloudMessage('Saved ✓ (synced to your account)');
        })
        .catch((error) => {
          console.error('Failed to sync saved diagram', error);
          setCloudMessage('Saved on this device. Cloud sync will retry next time you sign in.');
        });
    }
  };

  const handleLoadDiagram = (diagram) => {
    const loadedConfig = { ...diagram.config };
    const maxRows = getMaxRows(loadedConfig.orientation);
    loadedConfig.numDiagrams = Math.max(1, Math.min(maxRows, loadedConfig.numDiagrams || 1));
    setConfig(loadedConfig);
    setChordName(diagram.chordName || diagram.name || '');
    // Support both new (diagrams array) and old (marks array) saved format
    if (diagram.diagrams) {
      setDiagrams(diagram.diagrams.map((d, i) => ({
        ...d,
        name: d.name || (i === 0 ? (diagram.chordName || diagram.name || '') : ''),
        ghostMarks: d.ghostMarks || []
      })));
    } else {
      setDiagrams([{ id: Date.now(), name: diagram.chordName || diagram.name || '', marks: diagram.marks || [], ghostMarks: [] }]);
    }
  };

  const handleDeleteDiagram = (id) => {
    if (!window.confirm('Delete this saved diagram?')) return;
    // Optimistic: remove locally right away, delete the cloud copy in the background.
    const updated = savedDiagrams.filter(d => d.id !== id);
    setCloudMessage('');
    try {
      writeLocalDiagrams(updated);
      setSavedDiagrams(updated);
    } catch (error) {
      console.error('Failed to delete diagram', error);
      setCloudMessage('Delete failed. Please try again.');
      return;
    }
    if (user) {
      withTimeout(deleteUserDiagram(user.uid, id), 10000).catch((error) => {
        console.error('Failed to delete cloud copy', error);
        setCloudMessage('Removed on this device, but the cloud copy could not be deleted.');
      });
    }
  };

  const getAuthErrorMessage = (error) => {
    const messages = {
      'auth/email-already-in-use': 'An account already exists for that email.',
      'auth/invalid-credential': 'That email or password is incorrect.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/unauthorized-domain': 'This domain must be added to Firebase Authorized domains.',
      'auth/weak-password': 'Use a password with at least 6 characters.',
    };
    return messages[error.code] || 'Could not sign in. Please try again.';
  };

  const runAuthAction = async (action) => {
    setAuthMessage('');
    setAuthBusy(true);
    try {
      await action();
    } catch (error) {
      console.error('Sign-in failed', error);
      setAuthMessage(getAuthErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setCloudMessage('');
    try {
      await signOutUser();
    } catch (error) {
      console.error('Sign-out failed', error);
      setCloudMessage('Sign-out failed. Please try again.');
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
        user={user}
        onModalToggle={setIsMainModalOpen}
        isLoadSidebarOpen={isLoadSidebarOpen}
        setIsLoadSidebarOpen={setIsLoadSidebarOpen}
        soundEnabled={soundEnabled}
        onSoundToggle={() => {
          const newEnabled = !soundEnabled;
          setSoundEnabled(newEnabled);
          // Prime the AudioContext on this user gesture so it's ready to play immediately.
          if (newEnabled) {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
          }
        }}
        onPlayHarmonic={playHarmonic}
        onPlayMelodic={playMelodic}
        rootKeyOptions={KEY_OPTIONS}
        rootKeyValue={rootKey}
        onRootKeyChange={setRootKey}
        keyMode={keyMode}
        onKeyModeChange={setKeyMode}
        showScaleDegrees={showScaleDegrees}
        onScaleDegreeToggle={() => {
          setShowScaleDegrees(value => {
            const next = !value;
            if (next) setShowNoteLabels(false);
            return next;
          });
        }}
        showNoteLabels={showNoteLabels}
        onNoteLabelToggle={() => {
          setShowNoteLabels(value => {
            const next = !value;
            if (next) setShowScaleDegrees(false);
            return next;
          });
        }}
      />

      <div className="workspace-identity" aria-label="FretDiagram account">
        <div className="workspace-brand">
          <Guitar size={19} aria-hidden="true" />
          <span>FretDiagram</span>
        </div>

        <div className="workspace-account">
          {!isFirebaseConfigured ? (
            <button className="workspace-account-btn" disabled title="Add Firebase values to .env.local">
              <Cloud size={15} /> Setup needed
            </button>
          ) : !authReady ? (
            <button className="workspace-account-btn" disabled>Connecting…</button>
          ) : user ? (
            <>
              <div className="workspace-user" title={user.email || user.displayName}>
                {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="workspace-user-dot" />}
                <span><strong>Signed in</strong> · {user.displayName || user.email || 'Account'}</span>
              </div>
              <button className="workspace-signout-btn" onClick={handleSignOut} title="Sign out">
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <button className="workspace-account-btn" onClick={() => {
              setAuthMessage('');
              setIsAuthDialogOpen(true);
            }}>
              Sign in
            </button>
          )}
        </div>

        {cloudMessage && <div className="workspace-cloud-message" role="status">{cloudMessage}</div>}
      </div>

      {isAuthDialogOpen && (
        <AuthDialog
          busy={authBusy}
          message={authMessage}
          onClose={() => !authBusy && setIsAuthDialogOpen(false)}
          onGoogle={() => runAuthAction(signInWithGoogle)}
          onEmailSignIn={(email, password) => runAuthAction(() => signInWithEmail(email, password))}
          onCreateAccount={(email, password) => runAuthAction(() => createEmailAccount(email, password))}
        />
      )}

      <div className="main-content-area">
        <div className="instruments-area">
          <Fretboard
            config={config}
            diagrams={visibleDiagrams}
            onToggleMark={handleToggleMark}
            onUpdateMarkText={handleUpdateMarkText}
            onUpdateDiagramName={handleUpdateDiagramName}
            chordName={chordName}
            setChordName={setChordName}
            zoomMode={zoomMode}
            skipMarkAnimation={skipMarkAnimation}
            isGhostMode={activeTool.color === 'transparent'}
            onToggleGhostMark={handleToggleGhostMark}
            onUpdateGhostMarkText={handleUpdateGhostMarkText}
            getMarkDisplayText={getMarkDisplayText}
            isLoadSidebarOpen={isLoadSidebarOpen}
            isMainModalOpen={isMainModalOpen || isAuthDialogOpen}
          />
        </div>

        <AnimatePresence>
          {isLoadSidebarOpen && (
            <Motion.div
              className="load-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="sidebar-header">
                <div>
                  <h3>Saved Diagrams</h3>
                  <div className="sidebar-storage-label">{user ? 'Cloud library' : 'This device'}</div>
                </div>
                <button className="close-sidebar-btn" onClick={() => setIsLoadSidebarOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="sidebar-body">
                {cloudMessage && <div className="cloud-message">{cloudMessage}</div>}
                <div className="saved-diagrams-list-v2">
                  {cloudBusy ? (
                    <div className="empty-state">Loading…</div>
                  ) : savedDiagrams.length === 0 ? (
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
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
