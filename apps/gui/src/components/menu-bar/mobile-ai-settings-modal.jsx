import React, {useState, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';
import styles from './mobile-ai-settings-modal.css';

const PROVIDER_META = {
    pollinations: {
        label: 'Pollinations.ai (Público y Gratis)',
        gratis: true,
        apiModels: null,
        helpUrl: null,
        keyPlaceholder: ''
    },
    groq: {
        label: 'Groq (Ultra Rápido)',
        gratis: true,
        apiModels: 'https://api.groq.com/openai/v1/models',
        helpUrl: 'https://console.groq.com/keys',
        keyPlaceholder: 'gsk_...'
    },
    gemini: {
        label: 'Google Gemini',
        gratis: true,
        apiModels: null,
        helpUrl: 'https://aistudio.google.com/app/apikey',
        keyPlaceholder: 'AIzaSy...'
    },
    openai: {
        label: 'OpenAI (ChatGPT)',
        gratis: false,
        apiModels: 'https://api.openai.com/v1/models',
        helpUrl: 'https://platform.openai.com/api-keys',
        keyPlaceholder: 'sk-proj-...'
    },
    openrouter: {
        label: 'OpenRouter (Claude, Llama, etc.)',
        gratis: false,
        apiModels: 'https://openrouter.ai/api/v1/models',
        helpUrl: 'https://openrouter.ai/keys',
        keyPlaceholder: 'sk-or-v1-...'
    },
    opencodezen: {
        label: 'OpenCode Zen',
        gratis: false,
        apiModels: '/zen/v1/models',
        helpUrl: null,
        keyPlaceholder: 'oc_...'
    }
};

const FALLBACK_MODELS = {
    pollinations: [
        {id: 'openai-fast', label: 'OpenAI Fast (GPT-OSS 20B)'},
        {id: 'openai', label: 'OpenAI (GPT-4o mini)'},
        {id: 'gpt-oss', label: 'GPT-OSS'}
    ],
    groq: [
        {id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recomendado)'},
        {id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Rápido)'},
        {id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B'}
    ],
    gemini: [
        {id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recomendado)'},
        {id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite'},
        {id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash'},
        {id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro'}
    ],
    openai: [
        {id: 'gpt-4o-mini', label: 'GPT-4o Mini (Económico)'},
        {id: 'gpt-4o', label: 'GPT-4o (Avanzado)'},
        {id: 'gpt-4-turbo', label: 'GPT-4 Turbo'}
    ],
    openrouter: [
        {id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini'},
        {id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet'},
        {id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash'},
        {id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B'}
    ],
    opencodezen: [
        {id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash'},
        {id: 'gpt-5.4-mini', label: 'GPT 5.4 Mini'},
        {id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6'},
        {id: 'gemini-3-flash', label: 'Gemini 3 Flash'},
        {id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash Free (gratis)'},
        {id: 'big-pickle', label: 'Big Pickle (gratis)'}
    ]
};

const LS_PROVIDER = 'ai_provider';
const LS_API_KEY = p => `${p}_api_key`;
const LS_MODEL = p => `${p}_model`;
const LS_TRAINING_ENABLED = 'ai_training_enabled';
const LS_MENTOR_MODE = 'ai_mentor_mode';

const MobileAiSettingsModal = ({isOpen, onClose}) => {
    const [provider, setProvider] = useState(() => (
        typeof window !== 'undefined' ? localStorage.getItem(LS_PROVIDER) || 'pollinations' : 'pollinations'
    ));
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [models, setModels] = useState([]);
    const [showKey, setShowKey] = useState(false);
    const [trainingEnabled, setTrainingEnabled] = useState(true);
    const [mentorMode, setMentorMode] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Cargar valores iniciales del proveedor activo
    useEffect(() => {
        if (!isOpen) return;
        const savedProvider = localStorage.getItem(LS_PROVIDER) || 'pollinations';
        setProvider(savedProvider);
        setApiKey(localStorage.getItem(LS_API_KEY(savedProvider)) || '');
        setModel(localStorage.getItem(LS_MODEL(savedProvider)) || '');
        setTrainingEnabled(localStorage.getItem(LS_TRAINING_ENABLED) !== 'false');
        setMentorMode(localStorage.getItem(LS_MENTOR_MODE) === 'true');
    }, [isOpen]);

    // Actualizar lista de modelos cuando cambia el proveedor
    useEffect(() => {
        const fallbacks = FALLBACK_MODELS[provider] || [];
        setModels(fallbacks);

        const savedModel = localStorage.getItem(LS_MODEL(provider));
        if (savedModel && fallbacks.some(m => m.id === savedModel)) {
            setModel(savedModel);
        } else if (fallbacks.length > 0) {
            setModel(fallbacks[0].id);
        } else {
            setModel('');
        }
    }, [provider]);

    const handleProviderChange = (e) => {
        const newProvider = e.target.value;
        setProvider(newProvider);
        setApiKey(localStorage.getItem(LS_API_KEY(newProvider)) || '');
    };

    const handlePasteKey = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    setApiKey(text.trim());
                }
            }
        } catch (err) {
            console.warn('Clipboard read denied:', err);
        }
    };

    const handleSave = () => {
        try {
            localStorage.setItem(LS_PROVIDER, provider);
            localStorage.setItem(LS_API_KEY(provider), apiKey.trim());
            if (model) {
                localStorage.setItem(LS_MODEL(provider), model);
            }
            localStorage.setItem(LS_TRAINING_ENABLED, String(trainingEnabled));
            localStorage.setItem(LS_MENTOR_MODE, String(mentorMode));

            // Notificar a módulos reactivos
            window.dispatchEvent(new CustomEvent('aimentormodechange'));
            window.dispatchEvent(new CustomEvent('aiproviderchange'));
            window.dispatchEvent(new CustomEvent('aisharedmessagechange'));

            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                if (onClose) onClose();
            }, 750);
        } catch (e) {
            console.error('Error saving AI settings:', e);
            if (onClose) onClose();
        }
    };

    if (!isOpen) return null;

    const currentMeta = PROVIDER_META[provider] || PROVIDER_META.pollinations;
    const isFreeNoKey = provider === 'pollinations';

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderInfo}>
                        <div className={styles.modalHeaderIcon}>✨</div>
                        <div>
                            <h3 className={styles.modalTitle}>Ajustes de Inteligencia Artificial</h3>
                            <p className={styles.modalSubtitle}>Proveedor, Claves de API y Modelos</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Proveedor */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="ai-provider-select">
                            <span>Proveedor de IA</span>
                            <span className={styles.fieldLabelHint}>Servicio de LLM</span>
                        </label>
                        <div className={styles.selectWrapper}>
                            <select
                                id="ai-provider-select"
                                className={styles.touchSelect}
                                value={provider}
                                onChange={handleProviderChange}
                            >
                                {Object.keys(PROVIDER_META).map(key => (
                                    <option key={key} value={key}>
                                        {PROVIDER_META[key].label}
                                    </option>
                                ))}
                            </select>
                            <span className={styles.selectCaret}>▼</span>
                        </div>
                    </div>

                    {/* API Key */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="ai-api-key-input">
                            <span>Clave de API (API Key)</span>
                            {isFreeNoKey ? (
                                <span className={styles.fieldLabelHint} style={{color: '#16a34a'}}>No requerida</span>
                            ) : (
                                <span className={styles.fieldLabelHint}>Requerida para {currentMeta.label}</span>
                            )}
                        </label>
                        {isFreeNoKey ? (
                            <div className={styles.infoBannerFree}>
                                <span className={styles.infoBannerIcon}>🟢</span>
                                <div>
                                    <strong>Servicio público gratuito activo.</strong>
                                    <div>No necesitas cuenta ni ingresar ninguna clave API para usar el asistente.</div>
                                </div>
                            </div>
                        ) : (
                            <React.Fragment>
                                <div className={styles.inputWithActions}>
                                    <input
                                        id="ai-api-key-input"
                                        type={showKey ? 'text' : 'password'}
                                        className={styles.touchInput}
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder={currentMeta.keyPlaceholder || 'Ingresa tu API Key...'}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck="false"
                                    />
                                    <div className={styles.inputButtons}>
                                        <button
                                            type="button"
                                            className={styles.inputBtn}
                                            onClick={() => setShowKey(!showKey)}
                                            title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                                        >
                                            {showKey ? '🔒' : '👁️'}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.inputBtn}
                                            onClick={handlePasteKey}
                                            title="Pegar del portapapeles"
                                        >
                                            Pegar
                                        </button>
                                    </div>
                                </div>
                                {currentMeta.helpUrl && (
                                    <a
                                        href={currentMeta.helpUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.providerHelpLink}
                                    >
                                        🔗 Obtener clave gratuita en {currentMeta.label.split(' ')[0]} ↗
                                    </a>
                                )}
                            </React.Fragment>
                        )}
                    </div>

                    {/* Modelo */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="ai-model-select">
                            <span>Modelo de IA</span>
                            <span className={styles.fieldLabelHint}>Motor de razonamiento</span>
                        </label>
                        <div className={styles.selectWrapper}>
                            <select
                                id="ai-model-select"
                                className={styles.touchSelect}
                                value={model}
                                onChange={e => setModel(e.target.value)}
                            >
                                {models.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                            <span className={styles.selectCaret}>▼</span>
                        </div>
                    </div>

                    {/* Switches Adicionales */}
                    <div className={styles.togglesGroup}>
                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleTitle}>Entrenamiento & Memoria</span>
                                <span className={styles.toggleDesc}>
                                    Permite a la IA recordar patrones de tus bloques y proyectos.
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`${styles.toggleSwitch} ${trainingEnabled ? styles.toggleSwitchOn : styles.toggleSwitchOff}`}
                                onClick={() => setTrainingEnabled(!trainingEnabled)}
                                aria-label="Alternar entrenamiento"
                            >
                                <span className={`${styles.toggleThumb} ${trainingEnabled ? styles.toggleThumbOn : styles.toggleThumbOff}`} />
                            </button>
                        </div>

                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleTitle}>Modo Mentor Pedagógico (Beta)</span>
                                <span className={styles.toggleDesc}>
                                    La IA guía y enseña haciendo preguntas en vez de dar la respuesta directa.
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`${styles.toggleSwitch} ${mentorMode ? styles.toggleSwitchOn : styles.toggleSwitchOff}`}
                                onClick={() => setMentorMode(!mentorMode)}
                                aria-label="Alternar modo mentor"
                            >
                                <span className={`${styles.toggleThumb} ${mentorMode ? styles.toggleThumbOn : styles.toggleThumbOff}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={styles.btnSave}
                        onClick={handleSave}
                    >
                        Guardar Ajustes
                    </button>
                </div>
            </div>

            {showToast && (
                <div className={styles.saveToast}>
                    ✓ Ajustes de IA guardados
                </div>
            )}
        </div>
    );
};

MobileAiSettingsModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};

export default MobileAiSettingsModal;
