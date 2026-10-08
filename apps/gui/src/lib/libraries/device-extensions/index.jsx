/**
 * Extensiones de Dispositivo para STBlock
 *
 * Estas extensiones agregan bloques específicos para sensores y actuadores
 * cuando se está en modo dispositivo (Arduino, ESP32, etc.)
 */

import extensionCatalog from '@stb/vm/devices/extension-catalog.json';
import isCompatible from '@stb/vm/devices/extension-compatibility';
import {getIconForExtension} from '../../device-extension-icons';

// Definición de categorías de extensiones
const EXTENSION_CATEGORIES = {
    sensors: 'Sensores',
    actuators: 'Actuadores',
    display: 'Pantallas',
    communication: 'Comunicación',
    other: 'Otros'
};

/**
 * Lista de extensiones de dispositivo disponibles
 */
const deviceExtensions = extensionCatalog.map(extension => ({...extension}));

/**
 * Obtener extensiones por categoría
 * @param {string} category - Categoría de extensión
 * @returns {Array} Lista de extensiones filtradas
 */
const getExtensionsByCategory = (category) => {
    if (!category || category === 'all') {
        return deviceExtensions;
    }
    return deviceExtensions.filter(ext => ext.category === category);
};

/**
 * Obtener extensiones destacadas
 * @returns {Array} Lista de extensiones destacadas
 */
const getFeaturedExtensions = () => {
    return deviceExtensions.filter(ext => ext.featured);
};

/**
 * Buscar extensiones por tag o nombre
 * @param {string} query - Término de búsqueda
 * @returns {Array} Lista de extensiones que coinciden
 */
const searchExtensions = (query) => {
    if (!query) return deviceExtensions;
    const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const lowerQuery = normalize(query);
    return deviceExtensions.filter(ext =>
        normalize(ext.name).includes(lowerQuery) ||
        normalize(ext.description).includes(lowerQuery) ||
        ext.tags.some(tag => normalize(tag).includes(lowerQuery))
    );
};

/**
 * Obtener extensión por ID
 * @param {string} extensionId - ID de la extensión
 * @returns {Object|null} Extensión o null si no existe
 */
const getExtensionById = (extensionId) => {
    return deviceExtensions.find(ext => ext.extensionId === extensionId) || null;
};

/**
 * Verificar si una extensión es compatible con un dispositivo
 * @param {string} extensionId - ID de la extensión
 * @param {string} deviceType - Tipo de dispositivo (arduino, esp32, etc.)
 * @returns {boolean}
 */
const isExtensionCompatible = isCompatible;

// Auto-assign icons to all extensions
deviceExtensions.forEach(ext => {
    if (!ext.iconURL) {
        ext.iconURL = getIconForExtension(ext.extensionId);
    }
});

export {
    deviceExtensions as default,
    deviceExtensions,
    EXTENSION_CATEGORIES,
    getExtensionsByCategory,
    getFeaturedExtensions,
    searchExtensions,
    getExtensionById,
    isExtensionCompatible
};
