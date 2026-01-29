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

  return (
    <div className="app-container">
      <ControlPanel
        config={config}
        setConfig={setConfig}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onClear={handleClear}
        onDownload={handleDownload}
      />
      <Fretboard
        config={config}
        marks={marks}
        onToggleMark={handleToggleMark}
        onUpdateMarkText={handleUpdateMarkText}
        chordName={chordName}
        setChordName={setChordName}
      />
    </div>
  );
}

export default App;
