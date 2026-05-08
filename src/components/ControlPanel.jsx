import React, { useState, useEffect, useRef } from 'react';
import { Settings, Trash2, Download, Plus, HelpCircle, Palette as PaletteIcon, Info, Guitar, Music, ChevronDown } from 'lucide-react';
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

// A popover section that opens below the toolbar
function ToolbarPopover({ label, icon, children, isOpen, onToggle, badge }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                onToggle(false);
            }
        };
        // Delay so the triggering click doesn't immediately close
        setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, onToggle]);

    return (
        <div className="toolbar-popover-wrapper" ref={ref}>
            <button
                className={`toolbar-btn ${isOpen ? 'active' : ''}`}
                onClick={() => onToggle(!isOpen)}
                title={label}
            >
                {icon}
                <span>{label}</span>
                {badge && <span className="toolbar-btn-badge" style={{ background: badge }} />}
                <ChevronDown size={12} className={`toolbar-chevron ${isOpen ? 'open' : ''}`} />
            </button>
            {isOpen && (
                <div className="toolbar-dropdown">
                    {children}
                </div>
            )}
        </div>
    );
}

const ControlPanel = ({
    config,
    setConfig,
    activeTool,
    setActiveTool,
    onClear,
    onDownload,
    onModalToggle,
    showFretboard,
    setShowFretboard,
    showPiano,
    setShowPiano,
    showWhiteNames,
    setShowWhiteNames,
    showBlackNames,
    setShowBlackNames,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [openPanel, setOpenPanel] = useState(null); // which toolbar popover is open

    const [customPalette, setCustomPalette] = useState(() => {
        const saved = localStorage.getItem('custom_guitar_palette');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (onModalToggle) onModalToggle(showColorPicker || showHelp);
    }, [showColorPicker, showHelp, onModalToggle]);

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('custom_guitar_palette');
            if (saved) setCustomPalette(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        if (!showColorPicker) handleStorageChange();
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [showColorPicker]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: parseInt(value, 10) || 0
        }));
    };

    const togglePanel = (name) => (open) => {
        setOpenPanel(open ? name : null);
    };

    const allColors = [...COLORS, ...customPalette];

    return (
        <div className="top-toolbar">
            {/* ── App Title ── */}
            <div className="toolbar-title">
                <Guitar size={18} />
                <span>FretDiagram</span>
            </div>

            <div className="toolbar-divider-v" />

            {/* ── Instruments ── */}
            <ToolbarPopover
                label="Instruments"
                icon={<Music size={15} />}
                isOpen={openPanel === 'instruments'}
                onToggle={togglePanel('instruments')}
            >
                <div className="dropdown-section">
                    <div className="dropdown-label">Visible Instruments</div>
                    <label className="dropdown-toggle-row">
                        <div className="dropdown-toggle-info">
                            <Guitar size={14} />
                            <span>Fretboard</span>
                        </div>
                        <div
                            className={`split-toggle-switch ${showFretboard ? 'on' : 'off'}`}
                            onClick={() => setShowFretboard(!showFretboard)}
                        >
                            <div className="split-toggle-knob" />
                        </div>
                    </label>
                    <label className="dropdown-toggle-row">
                        <div className="dropdown-toggle-info">
                            <Music size={14} />
                            <span>Piano</span>
                        </div>
                        <div
                            className={`split-toggle-switch ${showPiano ? 'on' : 'off'}`}
                            onClick={() => setShowPiano(!showPiano)}
                        >
                            <div className="split-toggle-knob" />
                        </div>
                    </label>
                </div>
            </ToolbarPopover>

            {/* ── Fretboard Settings ── */}
            {showFretboard && (
                <ToolbarPopover
                    label="Fretboard"
                    icon={<Settings size={15} />}
                    isOpen={openPanel === 'fretboard'}
                    onToggle={togglePanel('fretboard')}
                >
                    <div className="dropdown-section">
                        <div className="dropdown-label">Orientation</div>
                        <div className="orientation-toggle">
                            <button
                                className={`orientation-btn ${config.orientation === 'horizontal' ? 'active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                                title="Horizontal"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="16" rx="2" />
                                    <line x1="3" y1="8" x2="21" y2="8" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="16" x2="21" y2="16" />
                                    <line x1="8" y1="4" x2="8" y2="20" />
                                </svg>
                                Horizontal
                            </button>
                            <button
                                className={`orientation-btn ${config.orientation === 'vertical' ? 'active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'vertical' })}
                                title="Vertical"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="4" y="3" width="16" height="18" rx="2" />
                                    <line x1="8" y1="3" x2="8" y2="21" />
                                    <line x1="12" y1="3" x2="12" y2="21" />
                                    <line x1="16" y1="3" x2="16" y2="21" />
                                    <line x1="4" y1="8" x2="20" y2="8" />
                                </svg>
                                Vertical
                            </button>
                        </div>
                    </div>
                    <div className="dropdown-divider" />
                    <div className="dropdown-section">
                        <div className="dropdown-label">Settings</div>
                        <div className="dropdown-number-row">
                            <label>
                                <span>Strings</span>
                                <input type="number" name="strings" value={config.strings} onChange={handleChange} min="1" max="12" />
                            </label>
                            <label>
                                <span>Frets</span>
                                <input type="number" name="frets" value={config.frets} onChange={handleChange} min="1" max="24" />
                            </label>
                            <label>
                                <span>Start Fret</span>
                                <input type="number" name="startFret" value={config.startFret} onChange={handleChange} min="1" max="24" />
                            </label>
                        </div>
                    </div>
                </ToolbarPopover>
            )}

            {/* ── Piano Settings ── */}
            {showPiano && (
                <ToolbarPopover
                    label="Piano"
                    icon={<Music size={15} />}
                    isOpen={openPanel === 'piano'}
                    onToggle={togglePanel('piano')}
                >
                    <div className="dropdown-section">
                        <div className="dropdown-label">Note Names</div>
                        <label className="dropdown-toggle-row">
                            <span>White Key Names</span>
                            <div
                                className={`split-toggle-switch ${showWhiteNames ? 'on' : 'off'}`}
                                onClick={() => setShowWhiteNames(!showWhiteNames)}
                            >
                                <div className="split-toggle-knob" />
                            </div>
                        </label>
                        <label className="dropdown-toggle-row">
                            <span>Black Key Names</span>
                            <div
                                className={`split-toggle-switch ${showBlackNames ? 'on' : 'off'}`}
                                onClick={() => setShowBlackNames(!showBlackNames)}
                            >
                                <div className="split-toggle-knob" />
                            </div>
                        </label>
                    </div>
                </ToolbarPopover>
            )}

            <div className="toolbar-divider-v" />

            {/* ── Shape Picker ── */}
            {showFretboard && (
                <ToolbarPopover
                    label="Shape"
                    icon={
                        <div className={`preview-shape ${activeTool.shape}`} style={activeTool.color2
                            ? { background: `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)`, width: 16, height: 16 }
                            : { backgroundColor: activeTool.color, width: 16, height: 16 }
                        } />
                    }
                    isOpen={openPanel === 'shape'}
                    onToggle={togglePanel('shape')}
                >
                    <div className="dropdown-section">
                        <div className="dropdown-label">Shape</div>
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
                </ToolbarPopover>
            )}

            {/* ── Color Picker ── */}
            <ToolbarPopover
                label="Color"
                badge={activeTool.color}
                icon={<PaletteIcon size={15} />}
                isOpen={openPanel === 'color'}
                onToggle={togglePanel('color')}
            >
                <div className="dropdown-section">
                    <div className="dropdown-label">Primary Color</div>
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
                            onClick={() => { setShowColorPicker(true); setOpenPanel(null); }}
                            title="Custom Color"
                        >
                            <Plus size={16} color="var(--text-secondary)" />
                        </button>
                    </div>

                    {customPalette.length > 0 && (
                        <>
                            <div className="dropdown-label" style={{ marginTop: '0.75rem' }}>Custom Palette</div>
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

                    <div className="dropdown-divider" style={{ margin: '0.75rem 0' }} />

                    {/* Split Color Toggle */}
                    <label className="dropdown-toggle-row">
                        <span style={{ fontWeight: 600 }}>Split Color</span>
                        <div
                            className={`split-toggle-switch ${activeTool.color2 ? 'on' : 'off'}`}
                            onClick={() => setActiveTool({
                                ...activeTool,
                                color2: activeTool.color2 ? null : COLORS[5]
                            })}
                        >
                            <div className="split-toggle-knob" />
                        </div>
                    </label>

                    {activeTool.color2 && (
                        <>
                            <div className="dropdown-label" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                                    onClick={() => { setShowColorPicker('color2'); setOpenPanel(null); }}
                                    title="Custom Color 2"
                                >
                                    <Plus size={16} color="var(--text-secondary)" />
                                </button>
                            </div>
                            {customPalette.length > 0 && (
                                <>
                                    <div className="dropdown-label" style={{ marginTop: '0.75rem' }}>Custom Palette</div>
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
            </ToolbarPopover>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── Right Side Actions ── */}
            <div className="toolbar-divider-v" />

            <button
                className="toolbar-btn toolbar-action-btn"
                onClick={onClear}
                title="Clear Board"
            >
                <Trash2 size={15} />
                <span>Clear</span>
            </button>

            <button
                className="toolbar-btn toolbar-action-btn primary"
                onClick={onDownload}
                title="Save as Image"
            >
                <Download size={15} />
                <span>Save Image</span>
            </button>

            <div className="toolbar-divider-v" />

            <button
                className="toolbar-btn"
                onClick={() => setShowHelp(true)}
                title="Help"
            >
                <HelpCircle size={15} />
                <span>Help</span>
            </button>

            {/* ── Custom Color Picker Modal ── */}
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

            {/* ── Help Modal ── */}
            {showHelp && (
                <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
                    <div className="help-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="help-header">
                            <div className="header-title">
                                <Info size={20} />
                                <h3>Controls &amp; Shortcuts</h3>
                            </div>
                            <button className="close-help-btn" onClick={() => setShowHelp(false)}>
                                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>
                        <div className="help-body">
                            <div className="help-section">
                                <h4>Fretboard</h4>
                                <ul>
                                    <li><span>Left Click</span> to place a dot or remove it.</li>
                                    <li><span>Right Click</span> on a dot to label/name it.</li>
                                    <li><span>Right Click</span> on empty fret to place an <b>'X'</b>.</li>
                                </ul>
                            </div>
                            <div className="help-section">
                                <h4>Piano</h4>
                                <ul>
                                    <li><span>Click</span> a key to place/remove a colored dot.</li>
                                    <li>Use <span>+/−</span> buttons to add/remove octaves.</li>
                                    <li>Toggle <span>note names</span> in the Piano settings.</li>
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
        </div>
    );
};

export default ControlPanel;
