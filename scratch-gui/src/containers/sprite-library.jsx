import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape, defineMessages} from 'react-intl';
import VM from 'scratch-vm';

import spriteLibraryContent from '../lib/libraries/sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    handleItemSelect (item) {
        console.log('[STBlock DEBUG] SpriteLibrary.handleItemSelect called');
        console.log('[STBlock DEBUG] Item received:', item);
        if (!item) {
            console.error('[STBlock DEBUG] ERROR: item is null/undefined!');
            return;
        }
        console.log('[STBlock DEBUG] Item name:', item.name);
        console.log('[STBlock DEBUG] Item costumes:', item.costumes ? item.costumes.length : 'none');

        // Randomize position of library sprite
        randomizeSpritePosition(item);
        console.log('[STBlock DEBUG] Position randomized, x:', item.x, 'y:', item.y);

        console.log('[STBlock DEBUG] VM exists:', !!this.props.vm);
        console.log('[STBlock DEBUG] VM runtime exists:', !!this.props.vm?.runtime);
        console.log('[STBlock DEBUG] VM storage exists:', !!this.props.vm?.runtime?.storage);

        console.error('[STBlock] Personajes antes:', this.props.vm.runtime.targets.map(target => target.getName()));

        const spriteJSON = JSON.stringify(item);
        console.log('[STBlock DEBUG] Sprite JSON length:', spriteJSON.length);
        console.log('[STBlock DEBUG] Calling vm.addSprite...');

        this.props.vm.addSprite(spriteJSON)
            .then(() => {
                console.log('[STBlock DEBUG] vm.addSprite SUCCESS!');
                console.error('[STBlock] Personajes despues:', this.props.vm.runtime.targets.map(target => target.getName()));
                this.props.onActivateBlocksTab();
            })
            .catch(error => {
                console.error('[STBlock DEBUG] vm.addSprite FAILED!');
                console.error('[STBlock] No se pudo agregar el personaje:', error);
            });
    }
    render () {
        return (
            <LibraryComponent
                data={spriteLibraryContent}
                id="spriteLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SpriteLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(SpriteLibrary);
