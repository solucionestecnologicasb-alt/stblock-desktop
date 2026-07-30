import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './python-reference-panel.css';
import { PYTHON_REFERENCE, CATEGORIES } from './python-reference.js';

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const BackIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
);

const ChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M9 18l6-6-6-6"/>
    </svg>
);

const PythonReferencePanel = ({ onClose }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedBlock, setSelectedBlock] = useState(null);

    const handleCategoryClick = (categoryKey) => {
        setSelectedCategory(categoryKey);
        setSelectedBlock(null);
    };

    const handleBlockClick = (block) => {
        setSelectedBlock(block);
    };

    const handleBack = () => {
        if (selectedBlock) {
            setSelectedBlock(null);
        } else if (selectedCategory) {
            setSelectedCategory(null);
        }
    };

    // Vista de detalle de un bloque
    if (selectedBlock) {
        const category = PYTHON_REFERENCE[selectedCategory];
        return (
            <div className={styles.referencePanel}>
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={handleBack}>
                        <BackIcon />
                    </button>
                    <span className={styles.headerTitle}>
                        <span className={styles.categoryIcon}>{category.icon}</span>
                        {selectedBlock.name}
                    </span>
                    <button className={styles.closeButton} onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <div className={styles.blockDetail}>
                    <div className={styles.syntaxSection}>
                        <h3>Sintaxis Python</h3>
                        <code className={styles.syntaxCode}>{selectedBlock.python}</code>
                    </div>

                    <div className={styles.descriptionSection}>
                        <h3>Descripcion</h3>
                        <p>{selectedBlock.description}</p>
                    </div>

                    {selectedBlock.params && selectedBlock.params.length > 0 && (
                        <div className={styles.paramsSection}>
                            <h3>Parametros</h3>
                            <ul className={styles.paramsList}>
                                {selectedBlock.params.map((param, idx) => (
                                    <li key={idx}>
                                        <span className={styles.paramName}>{param.name}</span>
                                        <span className={styles.paramType}>({param.type})</span>
                                        <span className={styles.paramDesc}>{param.desc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className={styles.exampleSection}>
                        <h3>Ejemplo</h3>
                        <pre className={styles.exampleCode}>{selectedBlock.example}</pre>
                    </div>

                    <button
                        className={styles.copyButton}
                        onClick={() => {
                            navigator.clipboard.writeText(selectedBlock.example);
                        }}
                    >
                        Copiar ejemplo
                    </button>
                </div>
            </div>
        );
    }

    // Vista de bloques de una categoría
    if (selectedCategory) {
        const category = PYTHON_REFERENCE[selectedCategory];
        return (
            <div className={styles.referencePanel}>
                <div className={styles.header} style={{ borderColor: category.color }}>
                    <button className={styles.backButton} onClick={handleBack}>
                        <BackIcon />
                    </button>
                    <span className={styles.headerTitle}>
                        <span className={styles.categoryIcon}>{category.icon}</span>
                        {category.name}
                    </span>
                    <button className={styles.closeButton} onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <p className={styles.categoryDescription}>{category.description}</p>
                <div className={styles.blocksList}>
                    {category.blocks.map((block, idx) => (
                        <div
                            key={idx}
                            className={styles.blockItem}
                            onClick={() => handleBlockClick(block)}
                        >
                            <div className={styles.blockInfo}>
                                <span className={styles.blockName}>{block.name}</span>
                                <code className={styles.blockSyntax}>{block.python}</code>
                            </div>
                            <ChevronRight />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Vista de categorías (principal)
    return (
        <div className={styles.referencePanel}>
            <div className={styles.header}>
                <span className={styles.headerTitle}>
                    Referencia Python
                </span>
                <button className={styles.closeButton} onClick={onClose}>
                    <CloseIcon />
                </button>
            </div>
            <p className={styles.intro}>
                Selecciona una categoria para ver los bloques disponibles y como escribirlos en Python.
            </p>
            <div className={styles.categoriesGrid}>
                {CATEGORIES.map((key) => {
                    const category = PYTHON_REFERENCE[key];
                    return (
                        <div
                            key={key}
                            className={styles.categoryCard}
                            style={{ borderColor: category.color }}
                            onClick={() => handleCategoryClick(key)}
                        >
                            <span className={styles.categoryCardIcon}>{category.icon}</span>
                            <span className={styles.categoryCardName}>{category.name}</span>
                            <span className={styles.categoryCardCount}>
                                {category.blocks.length} bloques
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

PythonReferencePanel.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default PythonReferencePanel;
