import React, { useState, useEffect } from 'react';
import { Settings, MousePointer2, Type, Trash2, RotateCcw, Download, ChevronLeft, ChevronRight, Plus, Palette as PaletteIcon } from 'lucide-react';
import './ControlPanel.css';
import CustomColorPicker from './CustomColorPicker';

const COLORS = [
    '#ef4444', // Red
    '#ec4899', // Pink
    '#f97316', // Orange
    '#eab308', // Yellow
    '#15803d', // Dark Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#713f12', // Brown
    '#000000', // Black
    '#64748b', // Grey
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'cross'];

const ControlPanel = ({ 
    config, 
    setConfig, 
    activeTool, 
    setActiveTool, 
    onClear, 
    onDownload,
    isCollapsed,
    setIsCollapsed
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customPalette, setCustomPalette] = useState(() => {
        const saved = localStorage.getItem('custom_guitar_palette');
        return saved ? JSON.parse(saved) : [];
    });

    // Listen for custom palette changes (e.g. from the modal)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('custom_guitar_palette');
            if (saved) setCustomPalette(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        // Also update when modal closes as it might have changed
        if (!showColorPicker) {
            handleStorageChange();
        }
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [showColorPicker]);

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
                            <button
                                className={`color-btn custom-btn ${!COLORS.includes(activeTool.color) && !customPalette.includes(activeTool.color) ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: (!COLORS.includes(activeTool.color) && !customPalette.includes(activeTool.color)) ? activeTool.color : 'transparent'
                                }}
                                onClick={() => setShowColorPicker(true)}
                                title="Custom Color Wheel"
                            >
                                {(!COLORS.includes(activeTool.color) && !customPalette.includes(activeTool.color)) ? null : <Plus size={16} color="var(--text-secondary)" />}
                            </button>
                        </div>

                        {customPalette.length > 0 && (
                            <>
                                <div className="tool-label" style={{ marginTop: '0.75rem' }}>Custom Palette</div>
                                <div className="palette color-palette">
                                    {customPalette.map((color, index) => (
                                        <button
                                            key={`custom-${index}`}
                                            className={`color-btn ${activeTool.color === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setActiveTool({ ...activeTool, color })}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {showColorPicker && (
                        <CustomColorPicker 
                            activeColor={activeTool.color}
                            onSelectColor={(color) => setActiveTool({ ...activeTool, color })}
                            onClose={() => setShowColorPicker(false)}
                        />
                    )}

                    <div className="panel-footer">
                        <button className="reset-btn" onClick={onClear}>
                            <Trash2 size={20} />
                            Clear Board
                        </button>
                        <button className="reset-btn primary download-full-btn" onClick={onDownload}>
                            <Download size={20} />
                            Save as Image
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
