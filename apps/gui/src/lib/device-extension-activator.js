/**
 * Device Extension Activator
 * Converts device extension metadata to scratch-blocks JSON and toolbox XML definitions,
 * registers them with the VM runtime, and handles activation/deactivation.
 */

import {buildExtensionCategoryInfo, generateBlockJSON, EXTENSION_COLORS} from '@stb/vm/devices/device-extensions';

const activateDeviceExtension = (vm, extension) => {
    if (!vm || !vm.runtime) {
        console.error('[DeviceExtActivator] No VM/runtime available');
        return;
    }

    const runtime = vm.runtime;
    runtime.setDeviceExtensionIds(runtime.getDeviceExtensionIds().concat(extension.extensionId));
    vm.refreshWorkspace();
    return runtime.getDeviceExtensionIds().includes(extension.extensionId);
};

/**
 * Deactivate a device extension by removing its blocks from the VM runtime
 * and refreshing the workspace so the toolbox updates.
 */
const deactivateDeviceExtension = (vm, extension) => {
    if (!vm || !vm.runtime) {
        console.error('[DeviceExtActivator] No VM/runtime available');
        return;
    }

    const runtime = vm.runtime;
    runtime.setDeviceExtensionIds(runtime.getDeviceExtensionIds().filter(id => id !== extension.extensionId));
    vm.refreshWorkspace();
    return true;
};

export {
    activateDeviceExtension,
    deactivateDeviceExtension,
    buildExtensionCategoryInfo,
    generateBlockJSON,
    EXTENSION_COLORS
};
