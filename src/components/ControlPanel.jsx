import React, { useState, useEffect } from 'react';
import { Settings, MousePointer2, Type, Trash2, RotateCcw, Download, ChevronLeft, ChevronRight, Plus, HelpCircle, Palette as PaletteIcon, MousePointer2 as ClickIcon, Info } from 'lucide-react';
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
    setIsCollapsed,
    onModalToggle
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (onModalToggle) onModalToggle(showColorPicker || showHelp);
    }, [showColorPicker, showHelp, onModalToggle]);
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
        <div className={`control-panel-wrapper ${isCollapsed ? 'collapsed' : ''} ${showColorPicker || showHelp ? 'modal-open' : ''}`}>
            <button
                className="sidebar-toggle-popout"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand" : "Collapse"}
            >
                {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
            </button>

            {!isCollapsed && (
                <div className="control-panel-content">
                    <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>Diagram Settings</h2>
                        <button 
                            className="help-toggle-btn" 
                            onClick={() => setShowHelp(true)}
                            title="How to use"
                        >
                            <HelpCircle size={18} />
                        </button>
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
                                    <div
                                        className={`preview-shape ${shape}`}
                                        style={activeTool.color2
                                            ? { background: `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)` }
                                            : { backgroundColor: activeTool.color }
                                        }
                                    />
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
                                className="color-btn custom-btn"
                                onClick={() => setShowColorPicker(true)}
                                title="Custom Color Wheel"
                            >
                                <Plus size={16} color="var(--text-secondary)" />
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

                        {/* Split Color Toggle */}
                        <div className="split-color-toggle-row">
                            <label className="split-color-label">
                                <span>Split Color</span>
                                <div
                                    className={`split-toggle-switch ${activeTool.color2 ? 'on' : 'off'}`}
                                    onClick={() => setActiveTool({
                                        ...activeTool,
                                        color2: activeTool.color2 ? null : COLORS[5] // Toggle on with blue default
                                    })}
                                    title="Toggle split half-color mode"
                                >
                                    <div className="split-toggle-knob" />
                                </div>
                            </label>
                        </div>

                        {/* Color 2 Row */}
                        {activeTool.color2 && (
                            <>
                                <div className="tool-label split-color-label-2">
                                    <span className="split-color-swatch" style={{ background: `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)` }} />
                                    Right Half Color
                                </div>
                                <div className="palette color-palette">
                                    {COLORS.map(color => (
                                        <button
                                            key={`c2-${color}`}
                                            className={`color-btn ${activeTool.color2 === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setActiveTool({ ...activeTool, color2: color })}
                                            title={color}
                                        />
                                    ))}
                                    <button
                                        className="color-btn custom-btn"
                                        onClick={() => setShowColorPicker('color2')}
                                        title="Custom Color 2"
                                    >
                                        <Plus size={16} color="var(--text-secondary)" />
                                    </button>
                                </div>
                                {customPalette.length > 0 && (
                                    <>
                                        <div className="tool-label" style={{ marginTop: '0.75rem' }}>Custom Palette</div>
                                        <div className="palette color-palette">
                                            {customPalette.map((color, index) => (
                                                <button
                                                    key={`c2-custom-${index}`}
                                                    className={`color-btn ${activeTool.color2 === color ? 'active' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => setActiveTool({ ...activeTool, color2: color })}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {showColorPicker && (
                        <CustomColorPicker 
                            activeColor={showColorPicker === 'color2' ? (activeTool.color2 || activeTool.color) : activeTool.color}
                            onSelectColor={(color) => {
                                if (showColorPicker === 'color2') {
                                    setActiveTool({ ...activeTool, color2: color });
                                } else {
                                    setActiveTool({ ...activeTool, color });
                                }
                            }}
                            onClose={() => setShowColorPicker(false)}
                        />
                    )}

                    {showHelp && (
                        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
                            <div className="help-modal-content" onClick={e => e.stopPropagation()}>
                                <div className="help-header">
                                    <div className="header-title">
                                        <Info size={20} />
                                        <h3>Controls & Shortcuts</h3>
                                    </div>
                                    <button className="close-help-btn" onClick={() => setShowHelp(false)}>
                                        <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                                    </button>
                                </div>
                                <div className="help-body">
                                    <div className="help-section">
                                        <h4>Basics</h4>
                                        <ul>
                                            <li><span>Left Click</span> to place a dot or remove it.</li>
                                            <li><span>Right Click</span> on a dot to label/name it.</li>
                                            <li><span>Right Click</span> on empty fret to place an <b>'X'</b>.</li>
                                        </ul>
                                    </div>
                                    <div className="help-section">
                                        <h4>Advanced</h4>
                                        <ul>
                                            <li><span>Smart Swap</span> (Change color/shape and click an existing dot to replace its style).</li>
                                            <li><span>Auto-Save</span> (Labels save automatically when you click away).</li>
                                            <li><span>Custom Palette</span> (Use the '+' button to build your own colors).</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="help-footer">
                                    <button className="help-close-action-btn" onClick={() => setShowHelp(false)}>Got it!</button>
                                </div>
                            </div>
                        </div>
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
