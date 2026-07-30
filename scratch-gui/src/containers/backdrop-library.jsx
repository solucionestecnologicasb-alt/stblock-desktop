import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import VM from 'scratch-vm';

import backdropLibraryContent from '../lib/libraries/backdrops.json';
import backdropTags from '../lib/libraries/backdrop-tags';
import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Backdrop',
        description: 'Heading for the backdrop library',
        id: 'gui.costumeLibrary.chooseABackdrop'
    }
});


class BackdropLibrary extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    handleItemSelect (item) {
        console.log('[STBlock DEBUG] BackdropLibrary.handleItemSelect called');
        console.log('[STBlock DEBUG] Item received:', item);
        if (!item) {
            console.error('[STBlock DEBUG] ERROR: item is null/undefined!');
            return;
        }
        console.log('[STBlock DEBUG] Item name:', item.name);
        console.log('[STBlock DEBUG] Item md5ext:', item.md5ext);

        const vmBackdrop = {
            name: item.name,
            rotationCenterX: item.rotationCenterX,
            rotationCenterY: item.rotationCenterY,
            bitmapResolution: item.bitmapResolution,
            skinId: null
        };
        console.log('[STBlock DEBUG] vmBackdrop created:', vmBackdrop);
        console.log('[STBlock DEBUG] VM exists:', !!this.props.vm);
        console.log('[STBlock DEBUG] Calling vm.addBackdrop with md5ext:', item.md5ext);

        // Do not switch to stage, just add the backdrop
        this.props.vm.addBackdrop(item.md5ext, vmBackdrop)
            .then(() => {
                console.log('[STBlock DEBUG] vm.addBackdrop SUCCESS!');
            })
            .catch(error => {
                console.error('[STBlock DEBUG] vm.addBackdrop FAILED!');
                console.error('[STBlock] No se pudo agregar el fondo:', error);
            });
    }
    render () {
        return (
            <LibraryComponent
                data={backdropLibraryContent}
                id="backdropLibrary"
                tags={backdropTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

BackdropLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(BackdropLibrary);
