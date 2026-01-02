import React from 'react';
import { Settings, MousePointer2, Type, Trash2, RotateCcw, Download } from 'lucide-react';
import './ControlPanel.css';

const COLORS = [
    '#ef4444', // Red
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#eab308', // Yellow/Gold
    '#a855f7', // Purple
    '#ffffff', // White
    '#000000', // Black
];

const SHAPES = ['circle', 'square', 'triangle'];

const ControlPanel = ({ config, setConfig, activeTool, setActiveTool, onReset, onDownload }) => {

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: parseInt(value, 10) || 0
        }));
    };

    return (
        <div className="control-panel">
            <div className="panel-header">
                <h2>Diagram</h2>
            </div>

            <div className="control-group">
                <label>
                    <span>Number of Strings</span>
                    <input
                        type="number"
                        name="strings"
                        value={config.strings}
                        onChange={handleChange}
                        min="1"
                        max="12"
                    />
                </label>
                <label>
                    <span>Number of Frets</span>
                    <input
                        type="number"
                        name="frets"
                        value={config.frets}
                        onChange={handleChange}
                        min="1"
                        max="24"
                    />
                </label>
                <label>
                    <span>Starting Fret</span>
                    <input
                        type="number"
                        name="startFret"
                        value={config.startFret}
                        onChange={handleChange}
                        min="1"
                        max="24"
                    />
                </label>
            </div>

            <div className="panel-divider" />

            <div className="panel-header">
                <h2>Mark Tools</h2>
            </div>

            <div className="control-group">
                <div className="tool-label">Shape</div>
                <div className="palette shape-palette">
                    {SHAPES.map(shape => (
                        <button
                            key={shape}
                            className={`shape-btn ${activeTool.shape === shape ? 'active' : ''}`}
                            onClick={() => setActiveTool({ ...activeTool, shape })}
                            title={shape}
                        >
                            <div className={`preview-shape ${shape}`} style={{ backgroundColor: activeTool.color }} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="control-group">
                <div className="tool-label">Color</div>
                <div className="palette color-palette">
                    {COLORS.map(color => (
                        <button
                            key={color}
                            className={`color-btn ${activeTool.color === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setActiveTool({ ...activeTool, color })}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            <div className="panel-footer">
                <button className="reset-btn" onClick={onReset} style={{ marginBottom: '0.5rem' }}>
                    <RotateCcw size={16} />
                    Reset Diagram
                </button>
                <button className="reset-btn" onClick={onDownload} style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                    <Download size={16} />
                    Download PNG
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
