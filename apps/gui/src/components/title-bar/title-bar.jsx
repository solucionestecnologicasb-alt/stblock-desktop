import React, {useCallback, useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {getCurrentWindow} from '@tauri-apps/api/window';
import styles from './title-bar.css';

/**
 * Check if the application is running inside a Tauri runtime environment.
 */
export const isTauriApp = () => {
    if (typeof window === 'undefined') return false;
    return Boolean(
        (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') ||
        (window.__TAURI__ && (window.__TAURI__.core || window.__TAURI__.window))
    );
};

/**
 * Safely retrieve the current Tauri window instance.
 */
const getAppWindow = () => {
    if (!isTauriApp()) return null;
    try {
        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.metadata) {
            return getCurrentWindow();
        }
        if (window.__TAURI__ && window.__TAURI__.window && typeof window.__TAURI__.window.getCurrentWindow === 'function') {
            return window.__TAURI__.window.getCurrentWindow();
        }
    } catch (e) {
        console.warn('[TitleBar] Unable to get Tauri window instance:', e);
    }
    return null;
};

const TitleBar = ({projectTitle, className}) => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const win = getAppWindow();
        if (!win) return;

        document.body.classList.add('has-custom-titlebar');

        let isMounted = true;
        let unlisten = null;

        const checkMaximized = async () => {
            try {
                const max = await win.isMaximized();
                if (isMounted) setIsMaximized(Boolean(max));
            } catch (_) {}
        };

        checkMaximized();

        if (typeof win.onResized === 'function') {
            win.onResized(() => {
                checkMaximized();
            }).then(fn => {
                if (isMounted) {
                    unlisten = fn;
                } else if (typeof fn === 'function') {
                    fn();
                }
            }).catch(() => {});
        }

        return () => {
            isMounted = false;
            document.body.classList.remove('has-custom-titlebar');
            if (typeof unlisten === 'function') {
                unlisten();
            }
        };
    }, []);

    // Pointer down handler for window dragging (handles mouse, touch, stylus)
    const handlePointerDown = useCallback(e => {
        if (e.target.closest('button') || e.target.closest('[data-no-drag]')) {
            return;
        }
        // Only drag with primary button for mouse (left click)
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') {
            return;
        }

        const win = getAppWindow();
        if (win && typeof win.startDragging === 'function') {
            win.startDragging().catch(err => {
                console.warn('[TitleBar] startDragging error:', err);
            });
        }
    }, []);

    // Touch start handler explicitly supporting Linux WebKitGTK touchscreens
    const handleTouchStart = useCallback(e => {
        if (e.target.closest('button') || e.target.closest('[data-no-drag]')) {
            return;
        }
        if (e.touches && e.touches.length === 1) {
            const win = getAppWindow();
            if (win && typeof win.startDragging === 'function') {
                win.startDragging().catch(err => {
                    console.warn('[TitleBar] touch startDragging error:', err);
                });
            }
        }
    }, []);

    // Double-click to toggle maximize / restore
    const handleDoubleClick = useCallback(e => {
        if (e.target.closest('button') || e.target.closest('[data-no-drag]')) {
            return;
        }
        const win = getAppWindow();
        if (win && typeof win.toggleMaximize === 'function') {
            win.toggleMaximize().then(async () => {
                try {
                    const max = await win.isMaximized();
                    setIsMaximized(Boolean(max));
                } catch (_) {}
            }).catch(err => {
                console.warn('[TitleBar] toggleMaximize error:', err);
            });
        }
    }, []);

    const handleMinimize = useCallback(e => {
        e.stopPropagation();
        const win = getAppWindow();
        if (win && typeof win.minimize === 'function') {
            win.minimize().catch(err => {
                console.warn('[TitleBar] minimize error:', err);
            });
        }
    }, []);

    const handleToggleMaximize = useCallback(e => {
        e.stopPropagation();
        const win = getAppWindow();
        if (win && typeof win.toggleMaximize === 'function') {
            win.toggleMaximize().then(async () => {
                try {
                    const max = await win.isMaximized();
                    setIsMaximized(Boolean(max));
                } catch (_) {}
            }).catch(err => {
                console.warn('[TitleBar] toggleMaximize error:', err);
            });
        }
    }, []);

    const handleClose = useCallback(e => {
        e.stopPropagation();
        const win = getAppWindow();
        if (win && typeof win.close === 'function') {
            win.close().catch(err => {
                console.warn('[TitleBar] close error:', err);
            });
        }
    }, []);

    if (!isTauriApp()) {
        return null;
    }

    const displayTitle = projectTitle && projectTitle.trim()
        ? `${projectTitle.trim()} - STBlock`
        : 'STBlock - www.stbacademy.net';

    return (
        <header
            data-tauri-drag-region
            className={classNames(styles.titleBar, className)}
            onPointerDown={handlePointerDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
        >
            <div className={styles.titleBarLeft}>
                <img
                    src="static/favicon.png"
                    className={styles.titleBarIcon}
                    alt=""
                    draggable={false}
                />
                <span className={styles.titleBarBrand}>STBlock</span>
            </div>

            <div className={styles.titleBarCenter} data-tauri-drag-region>
                <span className={styles.titleBarProjectTitle}>{displayTitle}</span>
            </div>

            <div className={styles.titleBarControls} data-no-drag="true">
                <button
                    type="button"
                    className={classNames(styles.titleBarBtn, styles.titleBarBtnMinimize)}
                    onClick={handleMinimize}
                    title="Minimizar"
                    aria-label="Minimizar"
                    data-no-drag="true"
                >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1 5.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    className={classNames(styles.titleBarBtn, styles.titleBarBtnMaximize)}
                    onClick={handleToggleMaximize}
                    title={isMaximized ? 'Restaurar' : 'Maximizar'}
                    aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
                    data-no-drag="true"
                >
                    {isMaximized ? (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path
                                d="M3.5 2.5H9.5V8.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <rect
                                x="1.5"
                                y="3.5"
                                width="6"
                                height="6"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                rx="0.5"
                                fill="#124a2c"
                            />
                        </svg>
                    ) : (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <rect
                                x="1.5"
                                y="1.5"
                                width="8"
                                height="8"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                rx="0.5"
                            />
                        </svg>
                    )}
                </button>
                <button
                    type="button"
                    className={classNames(styles.titleBarBtn, styles.titleBarBtnClose)}
                    onClick={handleClose}
                    title="Cerrar"
                    aria-label="Cerrar"
                    data-no-drag="true"
                >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 2L9 9M9 2L2 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

TitleBar.propTypes = {
    className: PropTypes.string,
    projectTitle: PropTypes.string
};

export default TitleBar;
