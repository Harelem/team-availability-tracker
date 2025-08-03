/**
 * Accessibility Controls Component
 * 
 * Provides user-customizable accessibility features including high contrast mode,
 * font size adjustment, color blind friendly palettes, and reduced motion preferences.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  Type, 
  Palette, 
  MousePointer,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  RotateCcw,
  Check,
  Accessibility
} from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';

// Accessibility preference types
interface AccessibilityPreferences {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
  reducedMotion: boolean;
  soundEnabled: boolean;
  focusIndicators: 'standard' | 'enhanced' | 'high-visibility';
  darkMode: boolean;
}

interface AccessibilityControlsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Default accessibility preferences
const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  fontSize: 'medium',
  colorBlindMode: 'none',
  reducedMotion: false,
  soundEnabled: true,
  focusIndicators: 'standard',
  darkMode: false
};

// Accessibility preferences manager
class AccessibilityManager {
  private static instance: AccessibilityManager;
  private preferences: AccessibilityPreferences = DEFAULT_PREFERENCES;
  private listeners: Set<(prefs: AccessibilityPreferences) => void> = new Set();

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  constructor() {
    this.loadPreferences();
    this.applyPreferences();
  }

  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  updatePreference<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) {
    this.preferences = { ...this.preferences, [key]: value };
    this.savePreferences();
    this.applyPreferences();
    this.notifyListeners();
  }

  resetToDefaults() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
    this.applyPreferences();
    this.notifyListeners();
  }

  subscribe(listener: (prefs: AccessibilityPreferences) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.preferences));
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem('accessibility-preferences');
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }

  private applyPreferences() {
    const root = document.documentElement;
    
    // Apply high contrast
    root.classList.toggle('high-contrast', this.preferences.highContrast);
    
    // Apply font size
    root.setAttribute('data-font-size', this.preferences.fontSize);
    
    // Apply color blind mode
    root.setAttribute('data-colorblind-mode', this.preferences.colorBlindMode);
    
    // Apply reduced motion
    root.classList.toggle('reduce-motion', this.preferences.reducedMotion);
    
    // Apply focus indicators
    root.setAttribute('data-focus-mode', this.preferences.focusIndicators);
    
    // Apply dark mode
    root.classList.toggle('dark', this.preferences.darkMode);

    // Update CSS custom properties
    this.updateCSSProperties();
  }

  private updateCSSProperties() {
    const root = document.documentElement;
    
    // Font size scaling
    const fontScaleMap = {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25'
    };
    root.style.setProperty('--font-scale', fontScaleMap[this.preferences.fontSize]);

    // High contrast colors
    if (this.preferences.highContrast) {
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#000000');
      root.style.setProperty('--background-primary', '#ffffff');
      root.style.setProperty('--background-secondary', '#f0f0f0');
      root.style.setProperty('--border-color', '#000000');
      root.style.setProperty('--focus-color', '#ff0000');
    }

    // Color blind friendly palettes
    if (this.preferences.colorBlindMode !== 'none') {
      this.applyColorBlindPalette();
    }
  }

  private applyColorBlindPalette() {
    const root = document.documentElement;
    
    switch (this.preferences.colorBlindMode) {
      case 'protanopia':
        // Red-blind friendly colors
        root.style.setProperty('--color-red', '#D2691E');
        root.style.setProperty('--color-green', '#228B22');
        root.style.setProperty('--color-blue', '#4169E1');
        break;
      case 'deuteranopia':
        // Green-blind friendly colors
        root.style.setProperty('--color-red', '#DC143C');
        root.style.setProperty('--color-green', '#B8860B');
        root.style.setProperty('--color-blue', '#4169E1');
        break;
      case 'tritanopia':
        // Blue-blind friendly colors
        root.style.setProperty('--color-red', '#DC143C');
        root.style.setProperty('--color-green', '#228B22');
        root.style.setProperty('--color-blue', '#8B008B');
        break;
      case 'monochrome':
        // Monochrome palette
        root.style.setProperty('--color-red', '#666666');
        root.style.setProperty('--color-green', '#999999');
        root.style.setProperty('--color-blue', '#333333');
        break;
    }
  }
}

// Hook for using accessibility preferences
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    AccessibilityManager.getInstance().getPreferences()
  );

  useEffect(() => {
    const manager = AccessibilityManager.getInstance();
    const unsubscribe = manager.subscribe(setPreferences);
    return () => {
      unsubscribe();
    };
  }, []);

  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    AccessibilityManager.getInstance().updatePreference(key, value);
  }, []);

  const resetToDefaults = useCallback(() => {
    AccessibilityManager.getInstance().resetToDefaults();
  }, []);

  return {
    preferences,
    updatePreference,
    resetToDefaults
  };
}

// Main accessibility controls component
const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const { preferences, updatePreference, resetToDefaults } = useAccessibilityPreferences();
  const { getInteractionProps } = useTouchFriendly();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Controls Panel */}
      <div 
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] bg-white rounded-lg shadow-xl z-50 overflow-y-auto ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="accessibility-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Accessibility className="w-6 h-6 text-blue-600" />
            Accessibility Settings
          </h2>
          <button
            {...getInteractionProps(onClose)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label="Close accessibility settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
          
          {/* Vision Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vision
            </h3>
            
            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between py-3">
              <div>
                <label className="text-sm font-medium text-gray-700">High Contrast Mode</label>
                <p className="text-xs text-gray-500">Increases contrast for better readability</p>
              </div>
              <button
                {...getInteractionProps(() => updatePreference('highContrast', !preferences.highContrast))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.highContrast ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={preferences.highContrast}
                aria-labelledby="high-contrast-label"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Font Size */}
            <div className="py-3">
              <label className="text-sm font-medium text-gray-700 block mb-2">Font Size</label>
              <div className="grid grid-cols-2 gap-2">
                {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    {...getInteractionProps(() => updatePreference('fontSize', size))}
                    className={`p-3 text-center rounded-lg border transition-colors ${
                      preferences.fontSize === size
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Type className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs capitalize">{size}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Blind Mode */}
            <div className="py-3">
              <label className="text-sm font-medium text-gray-700 block mb-2">Color Vision</label>
              <select
                value={preferences.colorBlindMode}
                onChange={(e) => updatePreference('colorBlindMode', e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">Standard Colors</option>
                <option value="protanopia">Red-Blind (Protanopia)</option>
                <option value="deuteranopia">Green-Blind (Deuteranopia)</option>
                <option value="tritanopia">Blue-Blind (Tritanopia)</option>
                <option value="monochrome">Monochrome</option>
              </select>
            </div>
          </section>

          {/* Motion Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Motion & Interaction
            </h3>
            
            {/* Reduced Motion */}
            <div className="flex items-center justify-between py-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Reduce Motion</label>
                <p className="text-xs text-gray-500">Minimizes animations and transitions</p>
              </div>
              <button
                {...getInteractionProps(() => updatePreference('reducedMotion', !preferences.reducedMotion))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.reducedMotion ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={preferences.reducedMotion}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Focus Indicators */}
            <div className="py-3">
              <label className="text-sm font-medium text-gray-700 block mb-2">Focus Indicators</label>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { value: 'standard', label: 'Standard' },
                  { value: 'enhanced', label: 'Enhanced' },
                  { value: 'high-visibility', label: 'High Visibility' }
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    {...getInteractionProps(() => updatePreference('focusIndicators', value))}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      preferences.focusIndicators === value
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preferences.focusIndicators === value && (
                      <Check className="w-4 h-4 float-right text-blue-600" />
                    )}
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Audio Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              {preferences.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              Audio
            </h3>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Sound Effects</label>
                <p className="text-xs text-gray-500">Audio feedback for interactions</p>
              </div>
              <button
                {...getInteractionProps(() => updatePreference('soundEnabled', !preferences.soundEnabled))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={preferences.soundEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Theme Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              {preferences.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Theme
            </h3>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Dark Mode</label>
                <p className="text-xs text-gray-500">Easier on the eyes in low light</p>
              </div>
              <button
                {...getInteractionProps(() => updatePreference('darkMode', !preferences.darkMode))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.darkMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={preferences.darkMode}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            {...getInteractionProps(resetToDefaults)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <button
            {...getInteractionProps(onClose)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default AccessibilityControls;