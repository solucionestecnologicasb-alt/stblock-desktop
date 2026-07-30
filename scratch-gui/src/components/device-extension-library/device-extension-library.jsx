import React, {useState, useCallback, useMemo} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './device-extension-library.css';

import {
    deviceExtensions,
    EXTENSION_CATEGORIES,
    getExtensionsByCategory,
    searchExtensions
} from '../../lib/libraries/device-extensions';

const CategoryIcons = {
    sensors: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
    ),
    actuators: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3v6h8l-8 12v-6H5l8-12z"/>
        </svg>
    ),
    display: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
        </svg>
    ),
    communication: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
    ),
    other: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
        </svg>
    )
};

const PuzzleIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.extensionIconSvg}>
        <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
    </svg>
);

const ExtensionCard = ({extension, onSelect, isLoaded}) => {
    const handleClick = useCallback(() => {
        onSelect(extension);
    }, [extension, onSelect]);

    return (
        <div
            className={classNames(styles.extensionCard, {
                [styles.loaded]: isLoaded,
                [styles.featured]: extension.featured
            })}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            <div className={styles.cardIconArea}>
                {extension.iconURL ? (
                    <img
                        src={extension.iconURL}
                        alt={extension.name}
                        className={styles.extensionIconSvg}
                    />
                ) : (
                    <PuzzleIcon />
                )}
            </div>
            <div className={styles.cardBody}>
                <h3 className={styles.extensionName}>{extension.name}</h3>
                <p className={styles.extensionDescription}>{extension.description}</p>
                {extension.library && (
                    <span className={styles.libraryTag}>Librería: {extension.library}</span>
                )}
                {isLoaded && (
                    <span className={styles.loadedBadge}>Cargada</span>
                )}
            </div>
        </div>
    );
};

ExtensionCard.propTypes = {
    extension: PropTypes.shape({
        extensionId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        iconURL: PropTypes.string,
        featured: PropTypes.bool,
        library: PropTypes.string
    }).isRequired,
    onSelect: PropTypes.func.isRequired,
    isLoaded: PropTypes.bool
};

ExtensionCard.defaultProps = {
    isLoaded: false
};

const DeviceExtensionLibrary = ({
    visible,
    loadedExtensions,
    onSelectExtension,
    onClose
}) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredExtensions = useMemo(() => {
        let extensions = selectedCategory === 'all'
            ? deviceExtensions
            : getExtensionsByCategory(selectedCategory);

        if (searchQuery) {
            extensions = searchExtensions(searchQuery).filter(ext =>
                selectedCategory === 'all' || ext.category === selectedCategory
            );
        }

        return extensions;
    }, [selectedCategory, searchQuery]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleSelectExtension = useCallback((extension) => {
        onSelectExtension(extension);
    }, [onSelectExtension]);

    const isExtensionLoaded = useCallback((extensionId) => {
        return loadedExtensions.includes(extensionId);
    }, [loadedExtensions]);

    if (!visible) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header verde */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.titleIcon}>
                            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
                        </svg>
                        Extensiones
                    </h2>
                    <button className={styles.closeButton} onClick={onClose} title="Cerrar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Barra de búsqueda + categorías */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.searchIcon}>
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={styles.searchInput}
                        />
                    </div>
                    <div className={styles.categoryPills}>
                        <button
                            className={classNames(styles.categoryPill, {[styles.active]: selectedCategory === 'all'})}
                            onClick={() => setSelectedCategory('all')}
                        >
                            Todas
                        </button>
                        {Object.entries(EXTENSION_CATEGORIES).map(([key, label]) => (
                            <button
                                key={key}
                                className={classNames(styles.categoryPill, {[styles.active]: selectedCategory === key})}
                                onClick={() => setSelectedCategory(key)}
                            >
                                <span className={styles.categoryPillIcon}>
                                    {CategoryIcons[key]}
                                </span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid de tarjetas */}
                <div className={styles.extensionsGrid}>
                    {filteredExtensions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.emptyIcon}>
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            <p>No se encontraron extensiones</p>
                        </div>
                    ) : (
                        filteredExtensions.map(extension => (
                            <ExtensionCard
                                key={extension.extensionId}
                                extension={extension}
                                onSelect={handleSelectExtension}
                                isLoaded={isExtensionLoaded(extension.extensionId)}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.extensionCount}>
                        {filteredExtensions.length} extensiones
                    </span>
                </div>
            </div>
        </div>
    );
};

DeviceExtensionLibrary.propTypes = {
    visible: PropTypes.bool.isRequired,
    loadedExtensions: PropTypes.arrayOf(PropTypes.string),
    onSelectExtension: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

DeviceExtensionLibrary.defaultProps = {
    loadedExtensions: []
};

export default DeviceExtensionLibrary;
