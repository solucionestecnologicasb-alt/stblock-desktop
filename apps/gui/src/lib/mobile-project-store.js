const DATABASE_NAME = 'stblock-mobile-projects';
const DATABASE_VERSION = 1;
const STORE_NAME = 'projects';

const openDatabase = () => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        reject(new Error('El almacenamiento local no está disponible en este navegador.'));
        return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, {keyPath: 'id'});
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento local.'));
    request.onblocked = () => reject(new Error('Cierra otra pestaña de STBlock para actualizar el almacenamiento.'));
});

const withStore = async (mode, action) => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let result;
        try {
            result = action(store);
        } catch (error) {
            database.close();
            reject(error);
            return;
        }
        transaction.oncomplete = () => {
            database.close();
            resolve(result && result.result);
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error('No se pudo completar el guardado local.'));
        };
        transaction.onabort = () => {
            database.close();
            reject(transaction.error || new Error('El guardado local fue cancelado.'));
        };
    });
};

const listProjects = async () => {
    const records = await withStore('readonly', store => store.getAll());
    return (records || []).map(({id, name, createdAt, updatedAt}) => ({
        id,
        name,
        createdAt,
        updatedAt
    })).sort((a, b) => b.updatedAt - a.updatedAt);
};

const getProject = id => withStore('readonly', store => store.get(id));

const saveProject = (project) => {
    if (!project || !project.id || !project.blob || !project.name) {
        return Promise.reject(new Error('El proyecto no tiene nombre o contenido para guardar.'));
    }
    return withStore('readwrite', store => {
        const existingRequest = store.get(project.id);
        existingRequest.onsuccess = () => {
            store.put({
                ...project,
                createdAt: existingRequest.result ? existingRequest.result.createdAt : (project.createdAt || Date.now()),
                updatedAt: Date.now()
            });
        };
        return existingRequest;
    });
};

const requestPersistentStorage = async () => {
    if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') return false;
    try {
        return await navigator.storage.persist();
    } catch (error) {
        return false;
    }
};

export {
    getProject,
    listProjects,
    requestPersistentStorage,
    saveProject
};
