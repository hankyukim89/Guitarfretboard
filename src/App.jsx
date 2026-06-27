import React, { useEffect, useState, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Fretboard from './components/Fretboard';
import {
  deleteUserDiagram,
  getUserDiagrams,
  isFirebaseConfigured,
  observeAuth,
  saveUserDiagram,
  signInWithGoogle,
  signOutUser,
} from './firebase';
import './index.css';

const MAX_DIAGRAMS = 48;
const makeEmptyDiagram = () => ({ id: Date.now() + Math.random(), name: '', marks: [], ghostMarks: [] });
const KEY_OPTIONS = [
  { value: 'Cb', name: 'Cb', label: 'Cb (bbbbbbb)', pitchClass: 11, accidental: 'flats' },
  { value: 'Gb', name: 'Gb', label: 'Gb (bbbbbb)', pitchClass: 6, accidental: 'flats' },
  { value: 'Db', name: 'Db', label: 'Db (bbbbb)', pitchClass: 1, accidental: 'flats' },
  { value: 'Ab', name: 'Ab', label: 'Ab (bbbb)', pitchClass: 8, accidental: 'flats' },
  { value: 'Eb', name: 'Eb', label: 'Eb (bbb)', pitchClass: 3, accidental: 'flats' },
  { value: 'Bb', name: 'Bb', label: 'Bb (bb)', pitchClass: 10, accidental: 'flats' },
  { value: 'F', name: 'F', label: 'F (b)', pitchClass: 5, accidental: 'flats' },
  { value: 'C', name: 'C', label: 'C', pitchClass: 0, accidental: 'flats' },
  { value: 'G', name: 'G', label: 'G (#)', pitchClass: 7, accidental: 'sharps' },
  { value: 'D', name: 'D', label: 'D (##)', pitchClass: 2, accidental: 'sharps' },
  { value: 'A', name: 'A', label: 'A (###)', pitchClass: 9, accidental: 'sharps' },
  { value: 'E', name: 'E', label: 'E (####)', pitchClass: 4, accidental: 'sharps' },
  { value: 'B', name: 'B', label: 'B (#####)', pitchClass: 11, accidental: 'sharps' },
  { value: 'F#', name: 'F#', label: 'F# (######)', pitchClass: 6, accidental: 'sharps' },
  { value: 'C#', name: 'C#', label: 'C# (#######)', pitchClass: 1, accidental: 'sharps' },
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
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');

  const [zoomMode, setZoomMode] = useState('fit');
  const [skipMarkAnimation, setSkipMarkAnimation] = useState(false); // 'fit' | 'scroll'
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  useEffect(() => observeAuth(async (nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
    setCloudMessage('');

    if (!nextUser) {
      const local = localStorage.getItem('guitar-diagrams');
      setSavedDiagrams(local ? JSON.parse(local) : []);
      return;
    }

    setCloudBusy(true);
    try {
      let cloudDiagrams = await getUserDiagrams(nextUser.uid);
      const local = localStorage.getItem('guitar-diagrams');
      const localDiagrams = local ? JSON.parse(local) : [];

      if (cloudDiagrams.length === 0 && localDiagrams.length > 0) {
        const migratedDiagrams = localDiagrams.map(diagram => ({ ...diagram, id: String(diagram.id) }));
        await Promise.all(migratedDiagrams.map(diagram => saveUserDiagram(nextUser.uid, diagram)));
        cloudDiagrams = migratedDiagrams;
        setCloudMessage(`Moved ${migratedDiagrams.length} saved diagram${migratedDiagrams.length === 1 ? '' : 's'} to your account.`);
      }

      setSavedDiagrams(cloudDiagrams);
    } catch (error) {
      console.error('Failed to load cloud diagrams', error);
      setCloudMessage('Could not load your cloud diagrams. Check Firestore setup.');
    } finally {
      setCloudBusy(false);
    }
  }), []);

  // ── Root / display labels ────────────────────────────────────────────────
  const [rootKey, setRootKey] = useState('C');
  const [keyMode, setKeyMode] = useState('major');
  const [showScaleDegrees, setShowScaleDegrees] = useState(false);
  const [showNoteLabels, setShowNoteLabels] = useState(false);

  const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const selectedRootKey = KEY_OPTIONS.find(key => key.value === rootKey) || KEY_OPTIONS[7];

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

  const getAudioCtx = () => {
    return audioCtxRef.current ?? (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
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
    gain.connect(ctx.destination);
    src.start(scheduleAt);
  };

  const playNote = (stringIndex, fretIndex) => {
    if (!soundEnabled) return;
    unlockAudio(); // must happen synchronously before scheduling
    playNoteAt(stringIndex, fretIndex, 0);
  };

  const playHarmonic = () => {
    const allMarks = diagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    unlockAudio();
    allMarks.forEach(m => playNoteAt(m.stringIndex, m.fretIndex, 0));
  };

  const playMelodic = () => {
    const allMarks = diagrams.flatMap(d => d.marks);
    if (!allMarks.length) return;
    unlockAudio();
    // Sort low E (high stringIndex) first, then by fret — simulates a strum low → high
    const sorted = [...allMarks].sort((a, b) => b.stringIndex - a.stringIndex || a.fretIndex - b.fretIndex);
    sorted.forEach((m, i) => playNoteAt(m.stringIndex, m.fretIndex, i * 0.1));
  };

  const [isLoadSidebarOpen, setIsLoadSidebarOpen] = useState(false);
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);

  // ── Num diagrams (rows) ──────────────────────────────────────────────────
  const handleNumDiagramsChange = (newNum) => {
    const n = Math.max(1, Math.min(MAX_DIAGRAMS, isNaN(newNum) ? 1 : newNum));
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
      setDiagrams(prev => prev.map(d => ({ ...d, marks: [], ghostMarks: [] })));
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
  const handleSaveDiagram = async () => {
    const firstDiagramName = diagrams.find(d => d.name)?.name;
    let name = chordName || firstDiagramName || prompt('Enter a name for this diagram:');
    if (!name) return;

    const existingIndex = savedDiagrams.findIndex(d => d.name === name);
    const newDiagram = {
      id: existingIndex >= 0 ? savedDiagrams[existingIndex].id : crypto.randomUUID(),
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

    setCloudBusy(true);
    setCloudMessage('');
    try {
      if (user) {
        await saveUserDiagram(user.uid, newDiagram);
        setCloudMessage('Saved to your account.');
      } else {
        localStorage.setItem('guitar-diagrams', JSON.stringify(updated));
        setCloudMessage('Saved on this device. Sign in to save across devices.');
      }
      setSavedDiagrams(updated);
      setChordName(name);
    } catch (error) {
      console.error('Failed to save diagram', error);
      setCloudMessage('Save failed. Check your Firebase setup and try again.');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleLoadDiagram = (diagram) => {
    setConfig(diagram.config);
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

  const handleDeleteDiagram = async (id) => {
    if (window.confirm('Delete this saved diagram?')) {
      const updated = savedDiagrams.filter(d => d.id !== id);
      setCloudBusy(true);
      setCloudMessage('');
      try {
        if (user) await deleteUserDiagram(user.uid, id);
        else localStorage.setItem('guitar-diagrams', JSON.stringify(updated));
        setSavedDiagrams(updated);
      } catch (error) {
        console.error('Failed to delete diagram', error);
        setCloudMessage('Delete failed. Please try again.');
      } finally {
        setCloudBusy(false);
      }
    }
  };

  const handleSignIn = async () => {
    setCloudMessage('');
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      setCloudMessage(error.code === 'auth/unauthorized-domain'
        ? 'This domain must be added to Firebase Authorized domains.'
        : 'Google sign-in failed. Please try again.');
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
        firebaseConfigured={isFirebaseConfigured}
        user={user}
        authReady={authReady}
        cloudBusy={cloudBusy}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
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

      <div className="main-content-area">
        <div className="instruments-area">
          <Fretboard
            config={config}
            diagrams={diagrams}
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
            isMainModalOpen={isMainModalOpen}
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
