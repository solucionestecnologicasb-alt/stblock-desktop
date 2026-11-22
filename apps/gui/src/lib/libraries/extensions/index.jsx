import React from 'react';
import {FormattedMessage} from 'react-intl';

import musicIconURL from './music/music.png';
import musicInsetIconURL from './music/music-small.svg';

import penIconURL from './pen/pen.png';
import penInsetIconURL from './pen/pen-small.svg';

import videoSensingIconURL from './videoSensing/video-sensing.png';
import videoSensingInsetIconURL from './videoSensing/video-sensing-small.svg';

import text2speechIconURL from './text2speech/text2speech.png';
import text2speechInsetIconURL from './text2speech/text2speech-small.svg';

import translateIconURL from './translate/translate.png';
import translateInsetIconURL from './translate/translate-small.png';

import makeymakeyIconURL from './makeymakey/makeymakey.png';
import makeymakeyInsetIconURL from './makeymakey/makeymakey-small.svg';

import microbitIconURL from './microbit/microbit.png';
import microbitInsetIconURL from './microbit/microbit-small.svg';
import microbitConnectionIconURL from './microbit/microbit-illustration.svg';
import microbitConnectionSmallIconURL from './microbit/microbit-small.svg';

import ev3IconURL from './ev3/ev3.png';
import ev3InsetIconURL from './ev3/ev3-small.svg';
import ev3ConnectionIconURL from './ev3/ev3-hub-illustration.svg';
import ev3ConnectionSmallIconURL from './ev3/ev3-small.svg';

import wedo2IconURL from './wedo2/wedo.png'; // TODO: Rename file names to match variable/prop names?
import wedo2InsetIconURL from './wedo2/wedo-small.svg';
import wedo2ConnectionIconURL from './wedo2/wedo-illustration.svg';
import wedo2ConnectionSmallIconURL from './wedo2/wedo-small.svg';
import wedo2ConnectionTipIconURL from './wedo2/wedo-button-illustration.svg';

import boostIconURL from './boost/boost.png';
import boostInsetIconURL from './boost/boost-small.svg';
import boostConnectionIconURL from './boost/boost-illustration.svg';
import boostConnectionSmallIconURL from './boost/boost-small.svg';
import boostConnectionTipIconURL from './boost/boost-button-illustration.svg';

import gdxforIconURL from './gdxfor/gdxfor.png';
import gdxforInsetIconURL from './gdxfor/gdxfor-small.svg';
import gdxforConnectionIconURL from './gdxfor/gdxfor-illustration.svg';
import gdxforConnectionSmallIconURL from './gdxfor/gdxfor-small.svg';

// Arduino device icons
import arduinoUnoIconURL from '../devices/arduinoUno/arduinoUno.png';
import arduinoUnoConnectionIconURL from '../devices/arduinoUno/arduinoUno-illustration.svg';
import arduinoUnoConnectionSmallIconURL from '../devices/arduinoUno/arduinoUno-small.svg';
import arduinoNanoIconURL from '../devices/arduinoNano/arduinoNano.png';
import arduinoNanoConnectionIconURL from '../devices/arduinoNano/arduinoNano-illustration.svg';
import arduinoNanoConnectionSmallIconURL from '../devices/arduinoNano/arduinoNano-small.svg';
import arduinoMega2560IconURL from '../devices/arduinoMega2560/arduinoMega2560.png';
import arduinoMega2560ConnectionIconURL from '../devices/arduinoMega2560/arduinoMega2560-illustration.svg';
import arduinoMega2560ConnectionSmallIconURL from '../devices/arduinoMega2560/arduinoMega2560-small.svg';
import arduinoLeonardoIconURL from '../devices/arduinoLeonardo/arduinoLeonardo.png';
import arduinoLeonardoConnectionIconURL from '../devices/arduinoLeonardo/arduinoLeonardo-illustration.svg';
import arduinoLeonardoConnectionSmallIconURL from '../devices/arduinoLeonardo/arduinoLeonardo-small.svg';

export default [
    {
        name: (
            <FormattedMessage
                defaultMessage="Music"
                description="Name for the 'Music' extension"
                id="gui.extension.music.name"
            />
        ),
        extensionId: 'music',
        iconURL: musicIconURL,
        insetIconURL: musicInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Play instruments and drums."
                description="Description for the 'Music' extension"
                id="gui.extension.music.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Pen"
                description="Name for the 'Pen' extension"
                id="gui.extension.pen.name"
            />
        ),
        extensionId: 'pen',
        iconURL: penIconURL,
        insetIconURL: penInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Draw with your sprites."
                description="Description for the 'Pen' extension"
                id="gui.extension.pen.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Video Sensing"
                description="Name for the 'Video Sensing' extension"
                id="gui.extension.videosensing.name"
            />
        ),
        extensionId: 'videoSensing',
        iconURL: videoSensingIconURL,
        insetIconURL: videoSensingInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Sense motion with the camera."
                description="Description for the 'Video Sensing' extension"
                id="gui.extension.videosensing.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Text to Speech"
                description="Name for the Text to Speech extension"
                id="gui.extension.text2speech.name"
            />
        ),
        extensionId: 'text2speech',
        collaborator: 'Amazon Web Services',
        iconURL: text2speechIconURL,
        insetIconURL: text2speechInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make your projects talk."
                description="Description for the Text to speech extension"
                id="gui.extension.text2speech.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Translate"
                description="Name for the Translate extension"
                id="gui.extension.translate.name"
            />
        ),
        extensionId: 'translate',
        collaborator: 'Google',
        iconURL: translateIconURL,
        insetIconURL: translateInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Translate text into many languages."
                description="Description for the Translate extension"
                id="gui.extension.translate.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: 'Makey Makey',
        extensionId: 'makeymakey',
        collaborator: 'JoyLabz',
        iconURL: makeymakeyIconURL,
        insetIconURL: makeymakeyInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make anything into a key."
                description="Description for the 'Makey Makey' extension"
                id="gui.extension.makeymakey.description"
            />
        ),
        featured: true
    },
    {
        name: 'micro:bit',
        extensionId: 'microbit',
        collaborator: 'micro:bit',
        iconURL: microbitIconURL,
        insetIconURL: microbitInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Connect your projects with the world."
                description="Description for the 'micro:bit' extension"
                id="gui.extension.microbit.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: microbitConnectionIconURL,
        connectionSmallIconURL: microbitConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their micro:bit."
                id="gui.extension.microbit.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/microbit'
    },
    {
        name: 'LEGO MINDSTORMS EV3',
        extensionId: 'ev3',
        collaborator: 'LEGO',
        iconURL: ev3IconURL,
        insetIconURL: ev3InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Build interactive robots and more."
                description="Description for the 'LEGO MINDSTORMS EV3' extension"
                id="gui.extension.ev3.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: ev3ConnectionIconURL,
        connectionSmallIconURL: ev3ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting. Make sure the pin on your EV3 is set to 1234."
                description="Message to help people connect to their EV3. Must note the PIN should be 1234."
                id="gui.extension.ev3.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/ev3'
    },
    {
        name: 'LEGO BOOST',
        extensionId: 'boost',
        collaborator: 'LEGO',
        iconURL: boostIconURL,
        insetIconURL: boostInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Bring robotic creations to life."
                description="Description for the 'LEGO BOOST' extension"
                id="gui.extension.boost.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: true,
        connectionIconURL: boostConnectionIconURL,
        connectionSmallIconURL: boostConnectionSmallIconURL,
        connectionTipIconURL: boostConnectionTipIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their BOOST."
                id="gui.extension.boost.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/boost'
    },
    {
        name: 'LEGO Education WeDo 2.0',
        extensionId: 'wedo2',
        collaborator: 'LEGO',
        iconURL: wedo2IconURL,
        insetIconURL: wedo2InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Build with motors and sensors."
                description="Description for the 'LEGO WeDo 2.0' extension"
                id="gui.extension.wedo2.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: true,
        connectionIconURL: wedo2ConnectionIconURL,
        connectionSmallIconURL: wedo2ConnectionSmallIconURL,
        connectionTipIconURL: wedo2ConnectionTipIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their WeDo."
                id="gui.extension.wedo2.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/wedo'
    },
    {
        name: 'Go Direct Force & Acceleration',
        extensionId: 'gdxfor',
        collaborator: 'Vernier',
        iconURL: gdxforIconURL,
        insetIconURL: gdxforInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Sense push, pull, motion, and spin."
                description="Description for the Vernier Go Direct Force and Acceleration sensor extension"
                id="gui.extension.gdxfor.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: gdxforConnectionIconURL,
        connectionSmallIconURL: gdxforConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their force and acceleration sensor."
                id="gui.extension.gdxfor.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/vernier'
    },
    // Arduino main extension (used for connection modal)
    {
        name: 'Arduino',
        extensionId: 'arduino',
        collaborator: 'Arduino',
        iconURL: arduinoUnoIconURL,
        insetIconURL: arduinoUnoConnectionSmallIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Program Arduino boards with Scratch blocks."
                description="Description for the Arduino extension"
                id="gui.extension.arduino.description"
            />
        ),
        featured: false,
        disabled: false,
        serialportRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoUnoConnectionIconURL,
        connectionSmallIconURL: arduinoUnoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting to Arduino..."
                description="Message while connecting to Arduino."
                id="gui.extension.arduino.connectingMessage"
            />
        ),
        helpLink: 'https://www.arduino.cc/'
    },
    // Arduino devices for device mode
    {
        name: 'Arduino Uno',
        extensionId: 'arduinoUno',
        collaborator: 'Arduino',
        iconURL: arduinoUnoIconURL,
        insetIconURL: arduinoUnoConnectionSmallIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A great board to get started with electronics and coding."
                description="Description for the Arduino Uno extension"
                id="gui.extension.arduinoUno.description"
            />
        ),
        featured: false,
        disabled: false,
        serialportRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoUnoConnectionIconURL,
        connectionSmallIconURL: arduinoUnoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting to Arduino..."
                description="Message while connecting to Arduino Uno."
                id="gui.extension.arduinoUno.connectingMessage"
            />
        ),
        helpLink: 'https://www.arduino.cc/en/Guide/ArduinoUno'
    },
    {
        name: 'Arduino Nano',
        extensionId: 'arduinoNano',
        collaborator: 'Arduino',
        iconURL: arduinoNanoIconURL,
        insetIconURL: arduinoNanoConnectionSmallIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Classic small board for your projects."
                description="Description for the Arduino Nano extension"
                id="gui.extension.arduinoNano.description"
            />
        ),
        featured: false,
        disabled: false,
        serialportRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoNanoConnectionIconURL,
        connectionSmallIconURL: arduinoNanoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting to Arduino..."
                description="Message while connecting to Arduino Nano."
                id="gui.extension.arduinoNano.connectingMessage"
            />
        ),
        helpLink: 'https://www.arduino.cc/en/Guide/ArduinoNano'
    },
    {
        name: 'Arduino Mega 2560',
        extensionId: 'arduinoMega2560',
        collaborator: 'Arduino',
        iconURL: arduinoMega2560IconURL,
        insetIconURL: arduinoMega2560ConnectionSmallIconURL,
        description: (
            <FormattedMessage
                defaultMessage="54 digital pins, 16 analog inputs, 4 serial ports."
                description="Description for the Arduino Mega 2560 extension"
                id="gui.extension.arduinoMega2560.description"
            />
        ),
        featured: false,
        disabled: false,
        serialportRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoMega2560ConnectionIconURL,
        connectionSmallIconURL: arduinoMega2560ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting to Arduino..."
                description="Message while connecting to Arduino Mega 2560."
                id="gui.extension.arduinoMega2560.connectingMessage"
            />
        ),
        helpLink: 'https://www.arduino.cc/en/Guide/ArduinoMega2560'
    },
    {
        name: 'Arduino Leonardo',
        extensionId: 'arduinoLeonardo',
        collaborator: 'Arduino',
        iconURL: arduinoLeonardoIconURL,
        insetIconURL: arduinoLeonardoConnectionSmallIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Can act as a mouse or keyboard."
                description="Description for the Arduino Leonardo extension"
                id="gui.extension.arduinoLeonardo.description"
            />
        ),
        featured: false,
        disabled: false,
        serialportRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoLeonardoConnectionIconURL,
        connectionSmallIconURL: arduinoLeonardoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting to Arduino..."
                description="Message while connecting to Arduino Leonardo."
                id="gui.extension.arduinoLeonardo.connectingMessage"
            />
        ),
        helpLink: 'https://www.arduino.cc/en/Guide/ArduinoLeonardo'
    }
];
