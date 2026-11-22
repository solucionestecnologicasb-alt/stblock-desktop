const ProgramModeType = Object.freeze({
    REALTIME: 'realtime',
    UPLOAD: 'upload'
});

const isProgramMode = value =>
    value === ProgramModeType.REALTIME || value === ProgramModeType.UPLOAD;

module.exports = {
    ProgramModeType,
    isProgramMode
};
