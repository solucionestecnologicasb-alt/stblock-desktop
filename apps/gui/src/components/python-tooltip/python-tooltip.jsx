import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './python-tooltip.css';
import { getTooltip } from '../../lib/python/block-tooltips';

/**
 * Componente de tooltip que muestra la equivalencia Python de un bloque
 */
const PythonTooltip = ({ blockType, position, visible, onClose }) => {
    const tooltipRef = useRef(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
    const tooltip = getTooltip(blockType);

    // Ajustar posición para que no se salga de la pantalla
    useEffect(() => {
        if (visible && tooltipRef.current && position) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            // Ajustar horizontalmente
            if (newX + rect.width > viewportWidth - 20) {
                newX = viewportWidth - rect.width - 20;
            }
            if (newX < 20) {
                newX = 20;
            }

            // Ajustar verticalmente
            if (newY + rect.height > viewportHeight - 20) {
                newY = position.y - rect.height - 10;
            }
            if (newY < 20) {
                newY = 20;
            }

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [visible, position]);

    if (!visible || !tooltip) {
        return null;
    }

    const categoryColors = {
        movimiento: '#4C97FF',
        apariencia: '#9966FF',
        sonido: '#CF63CF',
        eventos: '#FFBF00',
        control: '#FFAB19',
        sensores: '#5CB1D6',
        operadores: '#59C059',
        variables: '#FF8C1A'
    };

    const categoryColor = categoryColors[tooltip.category] || '#00b359';

    return (
        <div
            ref={tooltipRef}
            className={styles.tooltipContainer}
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
                '--category-color': categoryColor
            }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <span
                        className={styles.categoryBadge}
                        style={{ background: categoryColor }}
                    >
                        {tooltip.category}
                    </span>
                    <span className={styles.title}>{tooltip.title}</span>
                </div>
                <button className={styles.closeButton} onClick={onClose}>×</button>
            </div>

            {/* Código Python */}
            <div className={styles.pythonCode}>
                <span className={styles.pythonLabel}>Python:</span>
                <code className={styles.code}>{tooltip.python}</code>
            </div>

            {/* Descripción */}
            <p className={styles.description}>{tooltip.description}</p>

            {/* Parámetros */}
            {tooltip.params && tooltip.params.length > 0 && (
                <div className={styles.params}>
                    <span className={styles.paramsLabel}>Parámetros:</span>
                    <ul className={styles.paramsList}>
                        {tooltip.params.map((param, index) => (
                            <li key={index} className={styles.paramItem}>
                                <code className={styles.paramName}>{param.name}</code>
                                <span className={styles.paramType}>({param.type})</span>
                                <span className={styles.paramDesc}>{param.desc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Ejemplo */}
            <div className={styles.example}>
                <span className={styles.exampleLabel}>Ejemplo:</span>
                <pre className={styles.exampleCode}>
                    <code>{tooltip.example}</code>
                </pre>
            </div>

            {/* Flecha decorativa */}
            <div className={styles.arrow} style={{ borderBottomColor: categoryColor }} />
        </div>
    );
};

PythonTooltip.propTypes = {
    blockType: PropTypes.string,
    position: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
    }),
    visible: PropTypes.bool,
    onClose: PropTypes.func
};

PythonTooltip.defaultProps = {
    blockType: '',
    position: { x: 0, y: 0 },
    visible: false,
    onClose: () => {}
};

export default PythonTooltip;
