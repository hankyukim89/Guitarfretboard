import React, { useState } from 'react';
import { toPng } from 'html-to-image';
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
    color: '#ef4444' // Red default
  });

  const [marks, setMarks] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [savedDiagrams, setSavedDiagrams] = useState(() => {
    const saved = localStorage.getItem('guitar-diagrams');
    return saved ? JSON.parse(saved) : [];
  });

  const handleToggleMark = (stringIndex, fretIndex) => {
    setMarks(prevMarks => {
      const existingIndex = prevMarks.findIndex(
        m => m.stringIndex === stringIndex && m.fretIndex === fretIndex
      );

      if (existingIndex >= 0) {
        // Remove
        const newMarks = [...prevMarks];
        newMarks.splice(existingIndex, 1);
        return newMarks;
      } else {
        // Add
        return [...prevMarks, {
          stringIndex,
          fretIndex,
          shape: activeTool.shape,
          color: activeTool.color,
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
      />
    </div>
  );
}

export default App;
