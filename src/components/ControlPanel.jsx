import React, { useState } from 'react';
import { Settings, MousePointer2, Type, Trash2, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import './ControlPanel.css';

const COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#8b5cf6', // Indigo
    '#a855f7', // Violet
    '#000000', // Black
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'cross'];

const ControlPanel = ({ config, setConfig, activeTool, setActiveTool, onClear, onDownload }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: parseInt(value, 10) || 0
        }));
    };

    return (
        <div className={`control-panel-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
            <button
                className="sidebar-toggle-popout"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand" : "Collapse"}
            >
                {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
            </button>

            {!isCollapsed && (
                <div className="control-panel-content">
                    <div className="panel-header">
                        <h2>Diagram Settings</h2>
                    </div>

                    <div className="control-group">
                        <label>
                            <span>Strings</span>
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
                            <span>Frets</span>
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
                            <span>Start Fret</span>
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
                        <h2>Tools</h2>
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
                        <button className="reset-btn" onClick={onClear}>
                            <Trash2 size={20} />
                            Clear Board
                        </button>
                        <button className="reset-btn primary" onClick={onDownload}>
                            <Download size={20} />
                            Save Image
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
