// Polyfills
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // For Safari 9

// Silence development console warnings and browser extension issues
if (typeof window !== 'undefined') {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === '2d') {
            if (!attrs) attrs = {willReadFrequently: true};
            else if (attrs.willReadFrequently === undefined) {
                attrs = Object.assign({}, attrs, {willReadFrequently: true});
            }
        }
        return origGetContext.call(this, type, attrs);
    };

    const originalWarn = console.warn;
    console.warn = function (...args) {
        const msg = args.map(a => (a && a.toString ? a.toString() : String(a))).join(' ');
        if (msg.includes('componentWillMount') ||
            msg.includes('componentWillReceiveProps') ||
            msg.includes('componentWillUpdate') ||
            msg.includes('willReadFrequently') ||
            msg.includes('getImageData') ||
            msg.includes('AudioContext') ||
            msg.includes('React Intl') ||
            msg.includes('Missing message')) {
            return;
        }
        originalWarn.apply(console, args);
    };

    const originalError = console.error;
    console.error = function (...args) {
        const msg = args.map(a => (a && a.toString ? a.toString() : String(a))).join(' ');
        if (msg.includes('A listener indicated an asynchronous response') ||
            msg.includes('message channel closed before a response was received') ||
            msg.includes('AudioContext was not allowed to start')) {
            return;
        }
        originalError.apply(console, args);
    };
}

import React from 'react';
import ReactDOM from 'react-dom';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import supportedBrowser from '../lib/supported-browser';

import styles from './index.css';

const appTarget = document.createElement('div');
appTarget.className = styles.app;
document.body.appendChild(appTarget);

if (supportedBrowser()) {
    // require needed here to avoid importing unsupported browser-crashing code
    // at the top level
    require('./render-gui.jsx').default(appTarget);

} else {
    BrowserModalComponent.setAppElement(appTarget);
    const WrappedBrowserModalComponent = AppStateHOC(BrowserModalComponent, true /* localesOnly */);
    const handleBack = () => {};
    // eslint-disable-next-line react/jsx-no-bind
    ReactDOM.render(<WrappedBrowserModalComponent onBack={handleBack} />, appTarget);
}
