import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Fretboard from './components/Fretboard';
import './index.css'; // Ensure global styles are applied

function App() {
  const [config, setConfig] = useState({
    strings: 6,
    frets: 5,
    startFret: 1
  });

  const [chordName, setChordName] = useState('');

  const [activeTool, setActiveTool] = useState({
    shape: 'circle',
    color: '#ef4444', // Red default
    color2: null // null = solid, set to string for split-half coloring
  });

  const [marks, setMarks] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
        
        // Exception for 'X' shape: Always delete it on click, don't swap it
        if (existingMark.shape === 'cross') {
            const newMarks = [...prevMarks];
            newMarks.splice(existingIndex, 1);
            return newMarks;
        }

        // If the color OR shape is different, REPLACE it instead of deleting
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

        // Only delete if it's the EXACT same color and shape
        const newMarks = [...prevMarks];
        newMarks.splice(existingIndex, 1);
        return newMarks;
      } else {
        // Add new
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
    if (window.confirm("Are you sure you want to clear all marks?")) {
      setMarks([]);
      setChordName('');
    }
  };

  const handleDownload = async () => {
    // Find the container for the diagram (including title)
    const node = document.querySelector('.fretboard-download-area');
    if (!node) return;

    try {
      const dataUrl = await toPng(node, { backgroundColor: '#ffffff' }); // White background for download
      const link = document.createElement('a');
      link.download = `${chordName || 'guitar-diagram'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to download image');
    }
  };

  const handleSaveDiagram = () => {
    let name = chordName || prompt("Enter a name for this diagram:");
    if (!name) return;

    const existingIndex = savedDiagrams.findIndex(d => d.name === name);
    
    const newDiagram = {
      id: existingIndex >= 0 ? savedDiagrams[existingIndex].id : Date.now(),
      name: name,
      config: { ...config },
      chordName: name,
      marks: [...marks],
      timestamp: new Date().toISOString()
    };

    let updated;
    if (existingIndex >= 0) {
      if (!window.confirm(`A diagram named "${name}" already exists. Overwrite it?`)) {
        return;
      }
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
    setIsLoadSidebarOpen(false); // Close on load
  };

  const handleDeleteDiagram = (id) => {
    if (window.confirm("Delete this saved diagram?")) {
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
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onModalToggle={setIsMainModalOpen}
      />
      
      <Fretboard
        config={config}
        marks={marks}
        onToggleMark={handleToggleMark}
        onUpdateMarkText={handleUpdateMarkText}
        chordName={chordName}
        setChordName={setChordName}
        onSave={handleSaveDiagram}
        onLoad={handleLoadDiagram}
        onDelete={handleDeleteDiagram}
        savedDiagrams={savedDiagrams}
        isCollapsed={isCollapsed}
        isLoadSidebarOpen={isLoadSidebarOpen}
        setIsLoadSidebarOpen={setIsLoadSidebarOpen}
        isMainModalOpen={isMainModalOpen}
      />

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
              <button 
                className="close-sidebar-btn" 
                onClick={() => setIsLoadSidebarOpen(false)}
              >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDiagram(diagram.id);
                          }}
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
  );
}

export default App;
