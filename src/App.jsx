import React, { useState } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Fretboard from './components/Fretboard';
import './index.css';

function App() {
  const [config, setConfig] = useState({
    strings: 6,
    frets: 5,
    startFret: 1,
    orientation: 'horizontal'
  });

  const [chordName, setChordName] = useState('');

  const [activeTool, setActiveTool] = useState({
    shape: 'circle',
    color: '#ef4444',
    color2: null
  });

  const [marks, setMarks] = useState([]);

  const [savedDiagrams, setSavedDiagrams] = useState(() => {
    const saved = localStorage.getItem('guitar-diagrams');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoadSidebarOpen, setIsLoadSidebarOpen] = useState(false);
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);

  const handleToggleMark = (stringIndex, fretIndex, shapeOverride = null) => {
    setMarks(prevMarks => {
      const existingIndex = prevMarks.findIndex(
        m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
      );

      const targetShape = shapeOverride || activeTool.shape;
      const targetColor = activeTool.color;

      if (existingIndex >= 0) {
        const existingMark = prevMarks[existingIndex];

        if (existingMark.shape === 'cross') {
          const newMarks = [...prevMarks];
          newMarks.splice(existingIndex, 1);
          return newMarks;
        }

        const targetColor2 = activeTool.color2 || null;
        if (existingMark.color !== targetColor || existingMark.shape !== targetShape || existingMark.color2 !== targetColor2) {
          const newMarks = [...prevMarks];
          newMarks[existingIndex] = {
            ...existingMark,
            color: targetColor,
            color2: targetColor2,
            shape: targetShape
          };
          return newMarks;
        }

        const newMarks = [...prevMarks];
        newMarks.splice(existingIndex, 1);
        return newMarks;
      } else {
        return [...prevMarks, {
          stringIndex,
          fretIndex,
          shape: targetShape,
          color: targetColor,
          color2: activeTool.color2 || null,
          text: ''
        }];
      }
    });
  };

  const handleUpdateMarkText = (stringIndex, fretIndex, text) => {
    setMarks(prevMarks =>
      prevMarks.map(m =>
        (m.stringIndex === stringIndex && m.fretIndex === fretIndex)
          ? { ...m, text }
          : m
      )
    );
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all marks?')) {
      setMarks([]);
      setChordName('');
    }
  };

  const handleDownload = async () => {
    const node = document.querySelector('.actual-download-target');
    if (!node) return;
    try {
      const blob = await toBlob(node, { backgroundColor: '#ffffff' });
      if (!blob) {
        throw new Error('Failed to generate image blob');
      }

      const fileName = `${chordName || 'guitar-diagram'}.png`;

      // 1. Try modern File System Access API first (Safari 16.4+, Chrome, Edge)
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return; // Successfully saved
        } catch (err) {
          // If user cancelled the picker, abort silently
          if (err.name === 'AbortError') return;
          console.error('File picker failed, falling back...', err);
        }
      }

      // 2. Fallback to anchor tag download
      // Wrap blob in a File object to help Safari understand the intended filename
      const file = new File([blob], fileName, { type: 'image/png' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      
      // Must append to body for Safari to respect the click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Delay revocation to ensure Safari has time to start the download
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to download image');
    }
  };

  const handleSaveDiagram = () => {
    let name = chordName || prompt('Enter a name for this diagram:');
    if (!name) return;

    const existingIndex = savedDiagrams.findIndex(d => d.name === name);

    const newDiagram = {
      id: existingIndex >= 0 ? savedDiagrams[existingIndex].id : Date.now(),
      name,
      config: { ...config },
      chordName: name,
      marks: [...marks],
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
    setMarks(diagram.marks || []);
    setChordName(diagram.chordName || diagram.name || '');
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
        onClear={handleClear}
        onDownload={handleDownload}
        onSave={handleSaveDiagram}
        onModalToggle={setIsMainModalOpen}
        isLoadSidebarOpen={isLoadSidebarOpen}
        setIsLoadSidebarOpen={setIsLoadSidebarOpen}
      />

      <div className="main-content-area">
        <div className="instruments-area">
          <Fretboard
            config={config}
            marks={marks}
            onToggleMark={handleToggleMark}
            onUpdateMarkText={handleUpdateMarkText}
            chordName={chordName}
            setChordName={setChordName}
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
