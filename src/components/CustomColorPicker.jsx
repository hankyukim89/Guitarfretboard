import React, { useState, useEffect } from 'react';
import { RgbaColorPicker } from 'react-colorful';
import { Plus, X, Trash2, Save, Palette } from 'lucide-react';
import './CustomColorPicker.css';

const CustomColorPicker = ({ onSelectColor, activeColor, onClose }) => {
    const [color, setColor] = useState(() => {
        // Simple parser for common formats
        if (activeColor?.startsWith('rgba')) {
            const matches = activeColor.match(/[\d.]+/g);
            if (matches) return { r: parseInt(matches[0]), g: parseInt(matches[1]), b: parseInt(matches[2]), a: parseFloat(matches[3] || 1) };
        }
        if (activeColor?.startsWith('#')) {
            const hex = activeColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return { r, g, b, a: 1 };
        }
        // Default color (Blue)
        return { r: 59, g: 130, b: 246, a: 1 };
    });

    const [customPalette, setCustomPalette] = useState(() => {
        const saved = localStorage.getItem('custom_guitar_palette');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('custom_guitar_palette', JSON.stringify(customPalette));
    }, [customPalette]);

    const rgbaString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

     const addToPalette = () => {
        if (!customPalette.includes(rgbaString)) {
            setCustomPalette([...customPalette, rgbaString]);
            onSelectColor(rgbaString);
        }
    };

    const removeFromPalette = (colorToRemove) => {
        setCustomPalette(customPalette.filter(c => c !== colorToRemove));
    };

    return (
        <div className="custom-color-picker-overlay" onClick={onClose}>
            <div className="custom-color-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <Palette size={20} />
                        <h3>Custom Color Palette</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="picker-section">
                         <RgbaColorPicker 
                            color={color} 
                            onChange={setColor} 
                        />
                        <div className="color-preview-container">
                            <div 
                                className="color-preview" 
                                style={{ backgroundColor: rgbaString }}
                            />
                            <div className="color-details">
                                <span className="rgba-text">{rgbaString}</span>
                                <button 
                                    className="add-to-palette-btn"
                                    onClick={addToPalette}
                                >
                                    <Plus size={16} />
                                    Add to Palette
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="palette-section">
                        <h4>Your Custom Colors</h4>
                        <div className="custom-palette-grid">
                            {customPalette.length === 0 && (
                                <p className="empty-msg">No custom colors saved yet.</p>
                            )}
                            {customPalette.map((c, index) => (
                                <div key={index} className="palette-item">
                                    <button
                                        className="palette-color-btn"
                                        style={{ backgroundColor: c }}
                                        onClick={() => onSelectColor(c)}
                                        title={c}
                                    />
                                    <button
                                        className="remove-color-btn"
                                        onClick={() => removeFromPalette(c)}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomColorPicker;
