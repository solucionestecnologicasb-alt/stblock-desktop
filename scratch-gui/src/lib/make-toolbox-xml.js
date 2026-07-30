import ScratchBlocks from 'scratch-blocks';
import {defaultColors} from './themes';
import {eventBlock} from './libraries/devices/devices.jsx';
const categorySeparator = '<sep gap="36"/>';
const categorySeparatorLarge = '<sep gap="48"/>';
const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px
/* eslint-disable no-unused-vars */
const motion = function (isInitialSetup, isStage, targetId, colors) {
    const stageSelected = ScratchBlocks.ScratchMsgs.translate(
        'MOTION_STAGE_SELECTED',
        'Stage selected: no motion blocks'
    );
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category name="%{BKY_CATEGORY_MOTION}" id="motion" colour="${colors.primary}" secondaryColour="${colors.tertiary}">
        ${isStage ? `
        <label text="${stageSelected}"></label>
        ` : `
        <block type="motion_movesteps">
            <value name="STEPS">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="motion_turnright">
            <value name="DEGREES">
                <shadow type="math_number">
                    <field name="NUM">15</field>
                </shadow>
            </value>
        </block>
        <block type="motion_turnleft">
            <value name="DEGREES">
                <shadow type="math_number">
                    <field name="NUM">15</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="motion_goto">
            <value name="TO">
                <shadow type="motion_goto_menu">
                </shadow>
            </value>
        </block>
        <block type="motion_gotoxy">
            <value name="X">
                <shadow id="movex" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
            <value name="Y">
                <shadow id="movey" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
        <block type="motion_glideto" id="motion_glideto">
            <value name="SECS">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="TO">
                <shadow type="motion_glideto_menu">
                </shadow>
            </value>
        </block>
        <block type="motion_glidesecstoxy">
            <value name="SECS">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="X">
                <shadow id="glidex" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
            <value name="Y">
                <shadow id="glidey" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="motion_pointindirection">
            <value name="DIRECTION">
                <shadow type="math_angle">
                    <field name="NUM">90</field>
                </shadow>
            </value>
        </block>
        <block type="motion_pointtowards">
            <value name="TOWARDS">
                <shadow type="motion_pointtowards_menu">
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="motion_changexby">
            <value name="DX">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="motion_setx">
            <value name="X">
                <shadow id="setx" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
        <block type="motion_changeyby">
            <value name="DY">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="motion_sety">
            <value name="Y">
                <shadow id="sety" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="motion_ifonedgebounce"/>
        ${blockSeparator}
        <block type="motion_setrotationstyle"/>
        ${blockSeparator}
        <block id="${targetId}_xposition" type="motion_xposition"/>
        <block id="${targetId}_yposition" type="motion_yposition"/>
        <block id="${targetId}_direction" type="motion_direction"/>`}
        ${categorySeparator}
    </category>
    `;
};
const xmlEscape = function (unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        }
    });
};
const looks = function (isInitialSetup, isStage, targetId, costumeName, backdropName, colors) {
    const hello = ScratchBlocks.ScratchMsgs.translate('LOOKS_HELLO', 'Hello!');
    const hmm = ScratchBlocks.ScratchMsgs.translate('LOOKS_HMM', 'Hmm...');
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category name="%{BKY_CATEGORY_LOOKS}" id="looks" colour="${colors.primary}" secondaryColour="${colors.tertiary}">
        ${isStage ? '' : `
        <block type="looks_sayforsecs">
            <value name="MESSAGE">
                <shadow type="text">
                    <field name="TEXT">${hello}</field>
                </shadow>
            </value>
            <value name="SECS">
                <shadow type="math_number">
                    <field name="NUM">2</field>
                </shadow>
            </value>
        </block>
        <block type="looks_say">
            <value name="MESSAGE">
                <shadow type="text">
                    <field name="TEXT">${hello}</field>
                </shadow>
            </value>
        </block>
        <block type="looks_thinkforsecs">
            <value name="MESSAGE">
                <shadow type="text">
                    <field name="TEXT">${hmm}</field>
                </shadow>
            </value>
            <value name="SECS">
                <shadow type="math_number">
                    <field name="NUM">2</field>
                </shadow>
            </value>
        </block>
        <block type="looks_think">
            <value name="MESSAGE">
                <shadow type="text">
                    <field name="TEXT">${hmm}</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        `}
        ${isStage ? `
            <block type="looks_switchbackdropto">
                <value name="BACKDROP">
                    <shadow type="looks_backdrops">
                        <field name="BACKDROP">${backdropName}</field>
                    </shadow>
                </value>
            </block>
            <block type="looks_switchbackdroptoandwait">
                <value name="BACKDROP">
                    <shadow type="looks_backdrops">
                        <field name="BACKDROP">${backdropName}</field>
                    </shadow>
                </value>
            </block>
            <block type="looks_nextbackdrop"/>
        ` : `
            <block id="${targetId}_switchcostumeto" type="looks_switchcostumeto">
                <value name="COSTUME">
                    <shadow type="looks_costume">
                        <field name="COSTUME">${costumeName}</field>
                    </shadow>
                </value>
            </block>
            <block type="looks_nextcostume"/>
            <block type="looks_switchbackdropto">
                <value name="BACKDROP">
                    <shadow type="looks_backdrops">
                        <field name="BACKDROP">${backdropName}</field>
                    </shadow>
                </value>
            </block>
            <block type="looks_nextbackdrop"/>
            ${blockSeparator}
            <block type="looks_changesizeby">
                <value name="CHANGE">
                    <shadow type="math_number">
                        <field name="NUM">10</field>
                    </shadow>
                </value>
            </block>
            <block type="looks_setsizeto">
                <value name="SIZE">
                    <shadow type="math_number">
                        <field name="NUM">100</field>
                    </shadow>
                </value>
            </block>
        `}
        ${blockSeparator}
        <block type="looks_changeeffectby">
            <value name="CHANGE">
                <shadow type="math_number">
                    <field name="NUM">25</field>
                </shadow>
            </value>
        </block>
        <block type="looks_seteffectto">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
        <block type="looks_cleargraphiceffects"/>
        ${blockSeparator}
        ${isStage ? '' : `
            <block type="looks_show"/>
            <block type="looks_hide"/>
        ${blockSeparator}
            <block type="looks_gotofrontback"/>
            <block type="looks_goforwardbackwardlayers">
                <value name="NUM">
                    <shadow type="math_integer">
                        <field name="NUM">1</field>
                    </shadow>
                </value>
            </block>
        `}
        ${isStage ? `
            <block id="backdropnumbername" type="looks_backdropnumbername"/>
        ` : `
            <block id="${targetId}_costumenumbername" type="looks_costumenumbername"/>
            <block id="backdropnumbername" type="looks_backdropnumbername"/>
            <block id="${targetId}_size" type="looks_size"/>
        `}
        ${categorySeparator}
    </category>
    `;
};
const sound = function (isInitialSetup, isStage, targetId, soundName, colors) {
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category name="%{BKY_CATEGORY_SOUND}" id="sound" colour="${colors.primary}" secondaryColour="${colors.tertiary}">
        <block id="${targetId}_sound_playuntildone" type="sound_playuntildone">
            <value name="SOUND_MENU">
                <shadow type="sound_sounds_menu">
                    <field name="SOUND_MENU">${soundName}</field>
                </shadow>
            </value>
        </block>
        <block id="${targetId}_sound_play" type="sound_play">
            <value name="SOUND_MENU">
                <shadow type="sound_sounds_menu">
                    <field name="SOUND_MENU">${soundName}</field>
                </shadow>
            </value>
        </block>
        <block type="sound_stopallsounds"/>
        ${blockSeparator}
        <block type="sound_changeeffectby">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="sound_seteffectto">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM">100</field>
                </shadow>
            </value>
        </block>
        <block type="sound_cleareffects"/>
        ${blockSeparator}
        <block type="sound_changevolumeby">
            <value name="VOLUME">
                <shadow type="math_number">
                    <field name="NUM">-10</field>
                </shadow>
            </value>
        </block>
        <block type="sound_setvolumeto">
            <value name="VOLUME">
                <shadow type="math_number">
                    <field name="NUM">100</field>
                </shadow>
            </value>
        </block>
        <block id="${targetId}_volume" type="sound_volume"/>
        ${categorySeparator}
    </category>
    `;
};
const events = function (isInitialSetup, isStage, targetId, colors) {
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category name="%{BKY_CATEGORY_EVENTS}" id="events" colour="${colors.primary}" secondaryColour="${colors.tertiary}">
        <block type="event_whenflagclicked"/>
        <block type="event_whenkeypressed">
        </block>
        ${isStage ? `
            <block type="event_whenstageclicked"/>
        ` : `
            <block type="event_whenthisspriteclicked"/>
        `}
        <block type="event_whenbackdropswitchesto">
        </block>
        ${blockSeparator}
        <block type="event_whengreaterthan">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="event_whenbroadcastreceived">
        </block>
        <block type="event_broadcast">
            <value name="BROADCAST_INPUT">
                <shadow type="event_broadcast_menu"></shadow>
            </value>
        </block>
        <block type="event_broadcastandwait">
            <value name="BROADCAST_INPUT">
              <shadow type="event_broadcast_menu"></shadow>
            </value>
        </block>
        ${categorySeparator}
    </category>
    `;
};
const control = function (isInitialSetup, isStage, targetId, colors) {
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category
        name="%{BKY_CATEGORY_CONTROL}"
        id="control"
        colour="${colors.primary}"
        secondaryColour="${colors.tertiary}">
        <block type="control_wait">
            <value name="DURATION">
                <shadow type="math_positive_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="control_repeat">
            <value name="TIMES">
                <shadow type="math_whole_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block id="forever" type="control_forever"/>
        ${blockSeparator}
        <block type="control_if"/>
        <block type="control_if_else"/>
        <block id="wait_until" type="control_wait_until"/>
        <block id="repeat_until" type="control_repeat_until"/>
        ${blockSeparator}
        <block type="control_stop"/>
        ${blockSeparator}
        ${isStage ? `
            <block type="control_create_clone_of">
                <value name="CLONE_OPTION">
                    <shadow type="control_create_clone_of_menu"/>
                </value>
            </block>
        ` : `
            <block type="control_start_as_clone"/>
            <block type="control_create_clone_of">
                <value name="CLONE_OPTION">
                    <shadow type="control_create_clone_of_menu"/>
                </value>
            </block>
            <block type="control_delete_this_clone"/>
        `}
        ${categorySeparator}
    </category>
    `;
};
const sensing = function (isInitialSetup, isStage, targetId, colors) {
    const name = ScratchBlocks.ScratchMsgs.translate('SENSING_ASK_TEXT', 'What\'s your name?');
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category
        name="%{BKY_CATEGORY_SENSING}"
        id="sensing"
        colour="${colors.primary}"
        secondaryColour="${colors.tertiary}">
        ${isStage ? '' : `
            <block type="sensing_touchingobject">
                <value name="TOUCHINGOBJECTMENU">
                    <shadow type="sensing_touchingobjectmenu"/>
                </value>
            </block>
            <block type="sensing_touchingcolor">
                <value name="COLOR">
                    <shadow type="colour_picker"/>
                </value>
            </block>
            <block type="sensing_coloristouchingcolor">
                <value name="COLOR">
                    <shadow type="colour_picker"/>
                </value>
                <value name="COLOR2">
                    <shadow type="colour_picker"/>
                </value>
            </block>
            <block type="sensing_distanceto">
                <value name="DISTANCETOMENU">
                    <shadow type="sensing_distancetomenu"/>
                </value>
            </block>
            ${blockSeparator}
        `}
        ${isInitialSetup ? '' : `
            <block id="askandwait" type="sensing_askandwait">
                <value name="QUESTION">
                    <shadow type="text">
                        <field name="TEXT">${name}</field>
                    </shadow>
                </value>
            </block>
        `}
        <block id="answer" type="sensing_answer"/>
        ${blockSeparator}
        <block type="sensing_keypressed">
            <value name="KEY_OPTION">
                <shadow type="sensing_keyoptions"/>
            </value>
        </block>
        <block type="sensing_mousedown"/>
        <block type="sensing_mousex"/>
        <block type="sensing_mousey"/>
        ${isStage ? '' : `
            ${blockSeparator}
            '<block type="sensing_setdragmode" id="sensing_setdragmode"></block>'+
            ${blockSeparator}
        `}
        ${blockSeparator}
        <block id="loudness" type="sensing_loudness"/>
        ${blockSeparator}
        <block id="timer" type="sensing_timer"/>
        <block type="sensing_resettimer"/>
        ${blockSeparator}
        <block id="of" type="sensing_of">
            <value name="OBJECT">
                <shadow id="sensing_of_object_menu" type="sensing_of_object_menu"/>
            </value>
        </block>
        ${blockSeparator}
        <block id="current" type="sensing_current"/>
        <block type="sensing_dayssince2000"/>
        ${blockSeparator}
        <block type="sensing_username"/>
        ${categorySeparator}
    </category>
    `;
};
const operators = function (isInitialSetup, isStage, targetId, colors) {
    const apple = ScratchBlocks.ScratchMsgs.translate('OPERATORS_JOIN_APPLE', 'apple');
    const banana = ScratchBlocks.ScratchMsgs.translate('OPERATORS_JOIN_BANANA', 'banana');
    const letter = ScratchBlocks.ScratchMsgs.translate('OPERATORS_LETTEROF_APPLE', 'a');
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category
        name="%{BKY_CATEGORY_OPERATORS}"
        id="operators"
        colour="${colors.primary}"
        secondaryColour="${colors.tertiary}">
        <block type="operator_add">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_subtract">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_multiply">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_divide">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_random">
            <value name="FROM">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="TO">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_gt">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        <block type="operator_lt">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        <block type="operator_equals">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_and"/>
        <block type="operator_or"/>
        <block type="operator_not"/>
        ${blockSeparator}
        ${isInitialSetup ? '' : `
            <block type="operator_join">
                <value name="STRING1">
                    <shadow type="text">
                        <field name="TEXT">${apple} </field>
                    </shadow>
                </value>
                <value name="STRING2">
                    <shadow type="text">
                        <field name="TEXT">${banana}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_letter_of">
                <value name="LETTER">
                    <shadow type="math_whole_number">
                        <field name="NUM">1</field>
                    </shadow>
                </value>
                <value name="STRING">
                    <shadow type="text">
                        <field name="TEXT">${apple}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_length">
                <value name="STRING">
                    <shadow type="text">
                        <field name="TEXT">${apple}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_contains" id="operator_contains">
              <value name="STRING1">
                <shadow type="text">
                  <field name="TEXT">${apple}</field>
                </shadow>
              </value>
              <value name="STRING2">
                <shadow type="text">
                  <field name="TEXT">${letter}</field>
                </shadow>
              </value>
            </block>
        `}
        ${blockSeparator}
        <block type="operator_mod">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_round">
            <value name="NUM">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_mathop">
            <value name="NUM">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${categorySeparator}
    </category>
    `;
};
const variables = function (isInitialSetup, isStage, targetId, colors) {
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category
        name="%{BKY_CATEGORY_VARIABLES}"
        id="variables"
        colour="${colors.primary}"
        secondaryColour="${colors.tertiary}"
        custom="VARIABLE">
    </category>
    `;
};
const myBlocks = function (isInitialSetup, isStage, targetId, colors) {
    // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
    return `
    <category
        name="%{BKY_CATEGORY_MYBLOCKS}"
        id="myBlocks"
        colour="${colors.primary}"
        secondaryColour="${colors.tertiary}"
        custom="PROCEDURE">
    </category>
    `;
};
/* eslint-enable no-unused-vars */
const xmlOpen = '<xml style="display: none">';
const xmlClose = '</xml>';
/**
 * Device-mode categories: Eventos, Control, Sensores, Operadores, Variables, Mis Bloques.
 * Copied from openblock-desktop's device-mode toolbox, using only blocks
 * that exist in standard scratch-blocks and are Arduino-compilable.
 * Motion, Looks, Sound are excluded (no Arduino equivalent).
 */
const deviceEvents = function () {
    return `
    <category name="%{BKY_CATEGORY_EVENTS}" id="events" colour="#FFD500" secondaryColour="#CC9900">
        <block type="event_whenbroadcastreceived">
        </block>
        <block type="event_broadcast">
            <value name="BROADCAST_INPUT">
                <shadow type="event_broadcast_menu"></shadow>
            </value>
        </block>
        <block type="event_broadcastandwait">
            <value name="BROADCAST_INPUT">
              <shadow type="event_broadcast_menu"></shadow>
            </value>
        </block>
        ${categorySeparator}
    </category>
    `;
};
const deviceControl = function () {
    return `
    <category name="%{BKY_CATEGORY_CONTROL}" id="control" colour="#FFAB19" secondaryColour="#CF8B17">
        <block type="control_wait">
            <value name="DURATION">
                <shadow type="math_positive_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="control_repeat">
            <value name="TIMES">
                <shadow type="math_whole_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block id="forever" type="control_forever"/>
        ${blockSeparator}
        <block type="control_if"/>
        <block type="control_if_else"/>
        <block type="control_if_elseif_else"/>
        <block id="wait_until" type="control_wait_until"/>
        <block id="repeat_until" type="control_repeat_until"/>
        <block type="control_while"/>
        <block type="control_for_each">
            <value name="VALUE">
                <shadow type="math_whole_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="control_for_range">
            <value name="START">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="END">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
            <value name="STEP">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        <block type="control_for_each_list"/>
        <block type="control_infinite_loop"/>
        <block type="control_break"/>
        <block type="control_continue"/>
        <block type="control_switch_case_default"/>
        ${blockSeparator}
        <block type="control_stop"/>
        ${categorySeparator}
    </category>
    `;
};
const deviceSensing = function () {
    return `
    <category name="%{BKY_CATEGORY_SENSING}" id="sensing" colour="#4CBFE6" secondaryColour="#2E8EB8">
        <block id="timer" type="sensing_timer"/>
        <block type="sensing_resettimer"/>
        ${blockSeparator}
        <block id="of" type="sensing_of">
            <value name="OBJECT">
                <shadow id="sensing_of_object_menu" type="sensing_of_object_menu"/>
            </value>
        </block>
        ${blockSeparator}
        <block id="current" type="sensing_current"/>
        <block type="sensing_dayssince2000"/>
        ${categorySeparator}
    </category>
    `;
};
const deviceOperators = function () {
    return `
    <category name="%{BKY_CATEGORY_OPERATORS}" id="operators" colour="#40BF4A" secondaryColour="#389438">
        <block type="operator_add">
            <value name="NUM1"><shadow type="math_number"><field name="NUM"/></shadow></value>
            <value name="NUM2"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        <block type="operator_subtract">
            <value name="NUM1"><shadow type="math_number"><field name="NUM"/></shadow></value>
            <value name="NUM2"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        <block type="operator_multiply">
            <value name="NUM1"><shadow type="math_number"><field name="NUM"/></shadow></value>
            <value name="NUM2"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        <block type="operator_divide">
            <value name="NUM1"><shadow type="math_number"><field name="NUM"/></shadow></value>
            <value name="NUM2"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        ${blockSeparator}
        <block type="operator_random">
            <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
        ${blockSeparator}
        <block type="operator_gt">
            <value name="OPERAND1"><shadow type="text"><field name="TEXT"/></shadow></value>
            <value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value>
        </block>
        <block type="operator_lt">
            <value name="OPERAND1"><shadow type="text"><field name="TEXT"/></shadow></value>
            <value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value>
        </block>
        <block type="operator_equals">
            <value name="OPERAND1"><shadow type="text"><field name="TEXT"/></shadow></value>
            <value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value>
        </block>
        ${blockSeparator}
        <block type="operator_and"/>
        <block type="operator_or"/>
        <block type="operator_not"/>
        <block type="operator_boolean_true"/>
        <block type="operator_boolean_false"/>
        ${blockSeparator}
        <block type="operator_join">
            <value name="STRING1"><shadow type="text"><field name="TEXT">apple</field></shadow></value>
            <value name="STRING2"><shadow type="text"><field name="TEXT">banana</field></shadow></value>
        </block>
        <block type="operator_letter_of">
            <value name="LETTER"><shadow type="math_whole_number"><field name="NUM">1</field></shadow></value>
            <value name="STRING"><shadow type="text"><field name="TEXT">apple</field></shadow></value>
        </block>
        <block type="operator_length">
            <value name="STRING"><shadow type="text"><field name="TEXT">apple</field></shadow></value>
        </block>
        <block type="operator_contains" id="operator_contains">
            <value name="STRING1"><shadow type="text"><field name="TEXT">apple</field></shadow></value>
            <value name="STRING2"><shadow type="text"><field name="TEXT">a</field></shadow></value>
        </block>
        ${blockSeparator}
        <block type="operator_mod">
            <value name="NUM1"><shadow type="math_number"><field name="NUM"/></shadow></value>
            <value name="NUM2"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        <block type="operator_round">
            <value name="NUM"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        ${blockSeparator}
        <block type="operator_mathop">
            <value name="NUM"><shadow type="math_number"><field name="NUM"/></shadow></value>
        </block>
        ${categorySeparator}
    </category>
    `;
};
const deviceVariables = function () {
    return `
    <category
        name="%{BKY_CATEGORY_VARIABLES}"
        id="variables"
        colour="#FF8C1A"
        secondaryColour="#DB6E00"
        custom="VARIABLE">
    </category>
    `;
};
const deviceMyBlocks = function () {
    return `
    <category
        name="%{BKY_CATEGORY_MYBLOCKS}"
        id="myBlocks"
        colour="#FF6680"
        secondaryColour="#FF4D6A"
        custom="PROCEDURE">
    </category>
    <category
        name="${'\u00a0\u00a0'}Salir / Devolver"
        id="myBlocksFunctions"
        colour="#FF6680"
        secondaryColour="#FF4D6A">
        <block type="procedures_exit"/>
        <block type="procedures_return_value">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
    </category>
    `;
};
/**
 * Generate device-mode toolbox XML with Arduino-appropriate categories FIRST,
 * then device-specific extension categories after a separator.
 * Motion, Looks, Sound are excluded (no Arduino equivalent).
 * Uses hardcoded colors (matching openblock-desktop) to avoid theme issues.
 * @param {object} device - Selected device object
 * @param {Array} categoriesXML - Extension category XML array
 * @returns {string}
 */
const numShadow = function (name, value) {
    return `<value name="${name}"><shadow type="math_number"><field name="NUM">${value}</field></shadow></value>`;
};
const textShadow = function (name, value) {
    return `<value name="${name}"><shadow type="text"><field name="TEXT">${xmlEscape(value)}</field></shadow></value>`;
};
const gameGravity = function () {
    return `
    <category name="Gravedad" id="gameGravity" colour="#5B7CFA" secondaryColour="#4561C9">
        <block type="game_setGravity">${numShadow('GRAVITY', -1)}</block>
        <block type="game_changeGravity">${numShadow('GRAVITY', -0.2)}</block>
        <block type="game_gravity"/>
        ${blockSeparator}
        <block type="game_setTerminalVelocity">${numShadow('VELOCITY', -18)}</block>
        <block type="game_terminalVelocity"/>
        <block type="game_setGroundY">${numShadow('Y', -160)}</block>
        <block type="game_groundY"/>
        ${blockSeparator}
        <block type="game_applyGravity"/>
        <block type="game_jump">${numShadow('FORCE', 14)}</block>
        <block type="game_isOnGround">${numShadow('TOLERANCE', 3)}</block>
        <block type="game_setAirControl">${numShadow('AMOUNT', 1)}</block>
        <block type="game_resetPhysics"/>
    </category>`;
};
const gamePhysics = function () {
    return `
    <category name="Físicas" id="gamePhysics" colour="#00A8A8" secondaryColour="#0B8585">
        <block type="game_setVelocity">${numShadow('VX', 0)}${numShadow('VY', 0)}</block>
        <block type="game_changeVelocity">${numShadow('VX', 1)}${numShadow('VY', 0)}</block>
        <block type="game_velocityX"/>
        <block type="game_velocityY"/>
        <block type="game_setAcceleration">${numShadow('AX', 0)}${numShadow('AY', 0)}</block>
        <block type="game_applyVelocity"/>
        ${blockSeparator}
        <block type="game_setFriction">${numShadow('FRICTION', 0.08)}</block>
        <block type="game_setBounce">${numShadow('BOUNCE', 0.8)}</block>
        <block type="game_setMass">${numShadow('MASS', 1)}</block>
        <block type="game_applyForce">${numShadow('FORCE', 5)}${numShadow('DIRECTION', 90)}</block>
        ${blockSeparator}
        <block type="game_stopMotion"/>
        <block type="game_clampToStage"/>
        <block type="game_bounceOnStageEdge"/>
        <block type="game_speed"/>
    </category>`;
};
const gameCamera = function () {
    return `
    <category name="Cámara" id="gameCamera" colour="#7B61FF" secondaryColour="#6046CF">
        <block type="game_cameraSetXY">${numShadow('X', 0)}${numShadow('Y', 0)}</block>
        <block type="game_cameraChangeXY">${numShadow('X', 10)}${numShadow('Y', 0)}</block>
        <block type="game_cameraFollowThis">${numShadow('STRENGTH', 0.15)}</block>
        <block type="game_cameraFollowTarget">${textShadow('TARGET', 'Sprite1')}${numShadow('STRENGTH', 0.15)}</block>
        <block type="game_cameraSetZoom">${numShadow('ZOOM', 1)}</block>
        <block type="game_cameraChangeZoom">${numShadow('ZOOM', 0.1)}</block>
        <block type="game_cameraShake">${numShadow('AMOUNT', 8)}</block>
        ${blockSeparator}
        <block type="game_cameraX"/>
        <block type="game_cameraY"/>
        <block type="game_cameraZoom"/>
        <block type="game_worldToScreenX">${numShadow('X', 0)}</block>
        <block type="game_worldToScreenY">${numShadow('Y', 0)}</block>
        <block type="game_screenToWorldX">${numShadow('X', 0)}</block>
        <block type="game_screenToWorldY">${numShadow('Y', 0)}</block>
        <block type="game_placeAtWorldXY">${numShadow('X', 0)}${numShadow('Y', 0)}</block>
    </category>`;
};
const gameAI = function () {
    return `
    <category name="IA" id="gameAI" colour="#2EBD59" secondaryColour="#238F43">
        <block type="game_aiMoveToXY">${numShadow('X', 0)}${numShadow('Y', 0)}${numShadow('SPEED', 3)}</block>
        <block type="game_aiMoveTowardTarget">${textShadow('TARGET', 'Sprite1')}${numShadow('SPEED', 3)}</block>
        <block type="game_aiFleeFromTarget">${textShadow('TARGET', 'Sprite1')}${numShadow('SPEED', 3)}</block>
        <block type="game_aiFaceTarget">${textShadow('TARGET', 'Sprite1')}</block>
        <block type="game_aiDistanceToTarget">${textShadow('TARGET', 'Sprite1')}</block>
        <block type="game_aiTargetInRange">${textShadow('TARGET', 'Sprite1')}${numShadow('RANGE', 120)}</block>
        ${blockSeparator}
        <block type="game_aiPatrolX">${numShadow('X1', -120)}${numShadow('X2', 120)}${numShadow('SPEED', 2)}</block>
        <block type="game_aiChaseIfInRange">${textShadow('TARGET', 'Sprite1')}${numShadow('RANGE', 150)}${numShadow('SPEED', 3)}</block>
        <block type="game_aiKeepDistance">${textShadow('TARGET', 'Sprite1')}${numShadow('MIN', 60)}${numShadow('MAX', 140)}${numShadow('SPEED', 2)}</block>
        <block type="game_aiWander">${numShadow('SPEED', 2)}</block>
        <block type="game_aiStopNearTarget">${textShadow('TARGET', 'Sprite1')}${numShadow('DISTANCE', 20)}</block>
    </category>`;
};
const gameCombat = function () {
    return `
    <category name="Combate y Vida" id="gameCombat" colour="#E04444" secondaryColour="#B83232">
        <block type="game_setMaxHealth">${numShadow('HEALTH', 100)}</block>
        <block type="game_setHealth">${numShadow('HEALTH', 100)}</block>
        <block type="game_changeHealth">${numShadow('HEALTH', -10)}</block>
        <block type="game_health"/>
        <block type="game_maxHealth"/>
        <block type="game_healthPercent"/>
        <block type="game_isAlive"/>
        ${blockSeparator}
        <block type="game_damageSelf">${numShadow('AMOUNT', 10)}</block>
        <block type="game_healSelf">${numShadow('AMOUNT', 10)}</block>
        <block type="game_setAttackDamage">${numShadow('AMOUNT', 10)}</block>
        <block type="game_attackTargetIfTouching">${textShadow('TARGET', 'Sprite1')}</block>
        <block type="game_damageTarget">${numShadow('AMOUNT', 10)}${textShadow('TARGET', 'Sprite1')}</block>
        ${blockSeparator}
        <block type="game_setInvincible">${numShadow('SECS', 1)}</block>
        <block type="game_isInvincible"/>
        <block type="game_knockbackFromTarget">${textShadow('TARGET', 'Sprite1')}${numShadow('FORCE', 8)}</block>
        <block type="game_revive">${numShadow('HEALTH', 100)}</block>
    </category>`;
};
const programmingLogic = function () {
    return `
    <category name="Programación" id="programmingLogic" colour="#48BF53" secondaryColour="#389D42">
        <block type="logic_true"/>
        <block type="logic_false"/>
        <block type="logic_xor"><value name="A"><shadow type="logic_true"/></value><value name="B"><shadow type="logic_false"/></value></block>
        <block type="logic_implies"><value name="A"><shadow type="logic_true"/></value><value name="B"><shadow type="logic_true"/></value></block>
        <block type="logic_equalStrict">${textShadow('A', 'a')}${textShadow('B', 'a')}</block>
        <block type="logic_between">${numShadow('VALUE', 5)}${numShadow('MIN', 0)}${numShadow('MAX', 10)}</block>
        <block type="logic_outside">${numShadow('VALUE', 15)}${numShadow('MIN', 0)}${numShadow('MAX', 10)}</block>
        ${blockSeparator}
        <block type="logic_clamp">${numShadow('VALUE', 120)}${numShadow('MIN', 0)}${numShadow('MAX', 100)}</block>
        <block type="logic_map">${numShadow('VALUE', 512)}${numShadow('IN_MIN', 0)}${numShadow('IN_MAX', 1023)}${numShadow('OUT_MIN', 0)}${numShadow('OUT_MAX', 100)}</block>
        <block type="logic_lerp">${numShadow('A', 0)}${numShadow('B', 100)}${numShadow('T', 0.5)}</block>
        <block type="logic_distance">${numShadow('X1', 0)}${numShadow('Y1', 0)}${numShadow('X2', 100)}${numShadow('Y2', 100)}</block>
        <block type="logic_angleTo">${numShadow('X1', 0)}${numShadow('Y1', 0)}${numShadow('X2', 100)}${numShadow('Y2', 0)}</block>
        <block type="logic_roundDecimals">${numShadow('VALUE', 3.14159)}${numShadow('DECIMALS', 2)}</block>
        <block type="logic_percent">${numShadow('PART', 25)}${numShadow('TOTAL', 100)}</block>
        <block type="logic_sign">${numShadow('VALUE', -10)}</block>
        ${blockSeparator}
        <block type="logic_textContains">${textShadow('TEXT', 'STBlock')}${textShadow('PART', 'Block')}</block>
        <block type="logic_textStarts">${textShadow('TEXT', 'STBlock')}${textShadow('PART', 'ST')}</block>
        <block type="logic_textEnds">${textShadow('TEXT', 'STBlock')}${textShadow('PART', 'Block')}</block>
        <block type="logic_textReplace">${textShadow('FIND', 'a')}${textShadow('REPLACE', 'o')}${textShadow('TEXT', 'casa')}</block>
        <block type="logic_toNumber">${textShadow('VALUE', '123')}</block>
        <block type="logic_toText">${numShadow('VALUE', 123)}</block>
    </category>`;
};
const advancedData = function () {
    return `
    <category name="Datos Avanzados" id="advancedData" colour="#FF8C1A" secondaryColour="#DB6E00">
        <block type="logic_jsonGet">${textShadow('JSON', '{"vida":100}')}${textShadow('KEY', 'vida')}</block>
        <block type="logic_jsonSet">${textShadow('JSON', '{}')}${textShadow('KEY', 'vida')}${numShadow('VALUE', 100)}</block>
        <block type="logic_jsonHas">${textShadow('JSON', '{"vida":100}')}${textShadow('KEY', 'vida')}</block>
        <block type="logic_jsonStringify">${textShadow('VALUE', 'dato')}</block>
        ${blockSeparator}
        <block type="logic_listFromText">${textShadow('TEXT', 'a,b,c')}${textShadow('SEP', ',')}</block>
        <block type="logic_listJoin">${textShadow('LIST', '["a","b","c"]')}${textShadow('SEP', ',')}</block>
        <block type="logic_listLength">${textShadow('LIST', '[1,2,3]')}</block>
        <block type="logic_listItem">${numShadow('INDEX', 1)}${textShadow('LIST', '["a","b","c"]')}</block>
        <block type="logic_listContains">${textShadow('LIST', '["a","b","c"]')}${textShadow('VALUE', 'b')}</block>
    </category>`;
};
const runtimeSensing = function () {
    return `
    <category name="Runtime" id="runtimeSensing" colour="#4CBFE6" secondaryColour="#2E8EB8">
        <block type="sensing_deltaTime"/>
        <block type="sensing_fps"/>
        <block type="sensing_stageWidth"/>
        <block type="sensing_stageHeight"/>
        <block type="sensing_mouseSpeed"/>
        <block type="sensing_mousePreviousX"/>
        <block type="sensing_mousePreviousY"/>
        ${blockSeparator}
        <block type="control_waitUntilTimeout"><value name="CONDITION"><shadow type="logic_true"/></value>${numShadow('SECS', 2)}</block>
        <block type="control_everySeconds">${numShadow('SECS', 1)}</block>
        <block type="control_forSeconds">${numShadow('SECS', 2)}</block>
        <block type="control_countHere">${textShadow('NAME', 'punto')}</block>
    </category>`;
};
const advancedEvents = function () {
    return `
    <category name="Eventos Pro" id="advancedEvents" colour="#FFD500" secondaryColour="#CC9900">
        <block type="event_everyFrame"/>
        <block type="event_everySeconds">${numShadow('SECS', 1)}</block>
        <block type="event_whenCustom">${textShadow('NAME', 'mi evento')}</block>
        <block type="event_emitCustom">${textShadow('NAME', 'mi evento')}</block>
        <block type="event_emitCustomWithData">${textShadow('NAME', 'mi evento')}${textShadow('DATA', 'dato')}</block>
        <block type="event_eventData">${textShadow('NAME', 'mi evento')}</block>
    </category>`;
};
const stateBlocks = function () {
    return `
    <category name="Estado" id="stateBlocks" colour="#9966FF" secondaryColour="#774DCB">
        <block type="state_set">${textShadow('NAME', 'jugando')}</block>
        <block type="state_current"/>
        <block type="state_previous"/>
        <block type="state_is">${textShadow('NAME', 'jugando')}</block>
        <block type="state_back"/>
        <block type="state_reset"/>
    </category>`;
};
const debugBlocks = function () {
    return `
    <category name="Debug" id="debugBlocks" colour="#607D8B" secondaryColour="#455A64">
        <block type="debug_log">${textShadow('VALUE', 'mensaje')}</block>
        <block type="debug_warn">${textShadow('VALUE', 'advertencia')}</block>
        <block type="debug_error">${textShadow('VALUE', 'error')}</block>
        <block type="debug_pauseIf"><value name="CONDITION"><shadow type="logic_false"/></value></block>
        <block type="debug_mark">${textShadow('NAME', 'inicio')}</block>
        <block type="debug_msSinceMark">${textShadow('NAME', 'inicio')}</block>
        <block type="debug_count">${textShadow('NAME', 'ciclo')}</block>
        <block type="debug_counter">${textShadow('NAME', 'ciclo')}</block>
    </category>`;
};
const testBlocks = function () {
    return `
    <category name="Pruebas" id="testBlocks" colour="#FF6680" secondaryColour="#D94D67">
        <block type="test_assertTrue"><value name="CONDITION"><shadow type="logic_true"/></value>${textShadow('NAME', 'condición')}</block>
        <block type="test_assertEqual">${numShadow('VALUE', 10)}${numShadow('EXPECTED', 10)}${textShadow('NAME', 'igualdad')}</block>
        <block type="test_assertBetween">${numShadow('VALUE', 5)}${numShadow('MIN', 0)}${numShadow('MAX', 10)}${textShadow('NAME', 'rango')}</block>
        <block type="test_reset"/>
        <block type="test_passed"/>
        <block type="test_failed"/>
        <block type="test_total"/>
        <block type="test_report"/>
    </category>`;
};
const advancedBlocksToggle = function (showAdvancedBlocks = false) {
    return `
    <category name="${showAdvancedBlocks ? '▴ Ocultar bloques' : '▾ Más bloques'}" id="advancedBlocksToggle" colour="#6B7280" secondaryColour="#4B5563">
    </category>`;
};
const deviceBlocksToggle = function (showDeviceBlocks = false) {
    return `
    <category name="${showDeviceBlocks ? '▴ Ocultar bloques de dispositivo' : '▾ Mostrar bloques de dispositivo'}" id="deviceBlocksToggle" colour="#7A7F87" secondaryColour="#5C626B">
    </category>`;
};
const advancedGameAndProgrammingCategories = function () {
    return [
        gameGravity(),
        gamePhysics(),
        gameCamera(),
        gameAI(),
        gameCombat(),
        programmingLogic(),
        advancedData(),
        runtimeSensing(),
        advancedEvents(),
        stateBlocks(),
        debugBlocks(),
        testBlocks()
    ];
};

const shouldHideGameDeviceCategory = function (categoryInfo) {
    const xml = categoryInfo && categoryInfo.xml ? categoryInfo.xml : '';
    return /<category\b[^>]*\bname=["']Arduino["']/i.test(xml);
};
const makeDeviceToolboxXML = function (device, categoriesXML = []) {
    const gap = [categorySeparator];
    categoriesXML = categoriesXML.slice();
    const moveCategory = categoryId => {
        const index = categoriesXML.findIndex(c => c.id === categoryId);
        if (index >= 0) {
            const [cat] = categoriesXML.splice(index, 1);
            return cat.xml;
        }
    };
    const isStbBoardV2 = device && device.deviceId === 'stbBoardV2';
    // STBoard V2: omit the generic Events category entirely.
    // Its "Inicio" category from the manifest replaces it as the first category.
    let eventsXML = null;
    if (!isStbBoardV2) {
        // Build events: try extension override first, prepend device startup block
        eventsXML = moveCategory('event') || deviceEvents();
        if (device && device.type && eventBlock[device.type]) {
            eventsXML = `
        <category name="%{BKY_CATEGORY_EVENTS}" id="events" colour="#FFD500" secondaryColour="#CC9900">
            ${eventBlock[device.type]}
            ${blockSeparator}
            ${eventsXML.replace(/<category[^>]*>/, '').replace(/<\/category>/, '')}
        </category>
        `;
        }
    }
    // Device-appropriate basic categories (copied from STBlock device mode)
    const controlXML = moveCategory('control') || deviceControl();
    const sensingXML = moveCategory('sensing') || deviceSensing();
    const operatorsXML = moveCategory('operators') || deviceOperators();
    const variablesXML = moveCategory('data') || deviceVariables();
    const myBlocksXML = moveCategory('procedures') || deviceMyBlocks();
    const everything = [xmlOpen];
    // STBoard V2: place the "Inicio" manifest category as the very first category
    if (isStbBoardV2) {
        const inicioIdx = categoriesXML.findIndex(c => c.id === 'arduino_stbv2inicio');
        if (inicioIdx >= 0) {
            const [inicioCat] = categoriesXML.splice(inicioIdx, 1);
            everything.push(inicioCat.xml, gap);
        }
    }
    // Push events (only for non-STBoard-V2 devices)
    if (eventsXML) {
        everything.push(eventsXML, gap);
    }
    const standardCategories = [
        controlXML,
        sensingXML,
        operatorsXML,
        variablesXML,
        myBlocksXML
    ];
    for (const catXML of standardCategories) {
        if (catXML) {
            everything.push(catXML, gap);
        }
    }
    // Visual separator before remaining device-specific categories
    if (categoriesXML.length > 0) {
        everything.push(gap, categorySeparatorLarge + categorySeparatorLarge);
    }
    // Append remaining extension categories (e.g. Arduino pins, serial, etc.)
    for (const ext of categoriesXML) {
        everything.push(gap, ext.xml);
    }
    everything.push(xmlClose);
    return everything.join('\n');
};
/**
 * @param {!boolean} isInitialSetup - Whether the toolbox is for initial setup. If the mode is "initial setup",
 * blocks with localized default parameters (e.g. ask and wait) should not be loaded. (LLK/scratch-gui#5445)
 * @param {?boolean} isStage - Whether the toolbox is for a stage-type target. This is always set to true
 * when isInitialSetup is true.
 * @param {?string} targetId - The current editing target
 * @param {?Array.<object>} categoriesXML - optional array of `{id,xml}` for categories. This can include both core
 * and other extensions: core extensions will be placed in the normal Scratch order; others will go at the bottom.
 * @property {string} id - the extension / category ID.
 * @property {string} xml - the `<category>...</category>` XML for this extension / category.
 * @param {?string} costumeName - The name of the default selected costume dropdown.
 * @param {?string} backdropName - The name of the default selected backdrop dropdown.
 * @param {?string} soundName -  The name of the default selected sound dropdown.
 * @param {?object} colors - The colors for the theme.
 * @returns {string} - a ScratchBlocks-style XML document for the contents of the toolbox.
 */
const makeToolboxXML = function (isInitialSetup, isStage = true, targetId, categoriesXML = [],
    costumeName = '', backdropName = '', soundName = '', colors = defaultColors,
    device = null, isHardwareMode = false, showAdvancedBlocks = false, showDeviceBlocks = false) {
    if (isHardwareMode && device) {
        return makeDeviceToolboxXML(device, categoriesXML);
    }
    isStage = isInitialSetup || isStage;
    const gap = [categorySeparator];
    costumeName = xmlEscape(costumeName);
    backdropName = xmlEscape(backdropName);
    soundName = xmlEscape(soundName);
    categoriesXML = categoriesXML.slice();
    const deviceCategoriesXML = device ? categoriesXML.filter(categoryInfo =>
        !shouldHideGameDeviceCategory(categoryInfo)) : [];
    const coreCategoriesXML = device ? [] : categoriesXML;
    const moveCategory = categoryId => {
        const index = coreCategoriesXML.findIndex(categoryInfo => categoryInfo.id === categoryId);
        if (index >= 0) {
            // remove the category from coreCategoriesXML and return its XML
            const [categoryInfo] = coreCategoriesXML.splice(index, 1);
            return categoryInfo.xml;
        }
        // return `undefined`
    };
    const motionXML = moveCategory('motion') || motion(isInitialSetup, isStage, targetId, colors.motion);
    const looksXML = moveCategory('looks') ||
        looks(isInitialSetup, isStage, targetId, costumeName, backdropName, colors.looks);
    const soundXML = moveCategory('sound') || sound(isInitialSetup, isStage, targetId, soundName, colors.sounds);
    const eventsXML = moveCategory('event') || events(isInitialSetup, isStage, targetId, colors.event);
    const controlXML = moveCategory('control') || control(isInitialSetup, isStage, targetId, colors.control);
    const sensingXML = moveCategory('sensing') || sensing(isInitialSetup, isStage, targetId, colors.sensing);
    const operatorsXML = moveCategory('operators') || operators(isInitialSetup, isStage, targetId, colors.operators);
    const variablesXML = moveCategory('data') || variables(isInitialSetup, isStage, targetId, colors.data);
    const myBlocksXML = moveCategory('procedures') || myBlocks(isInitialSetup, isStage, targetId, colors.more);
    const hasDeviceBlocks = Boolean(device && deviceCategoriesXML.length > 0);
    const everything = [
        xmlOpen,
        motionXML, gap,
        looksXML, gap,
        soundXML, gap,
        eventsXML, gap,
        controlXML, gap,
        sensingXML, gap,
        operatorsXML, gap,
        variablesXML, gap,
        myBlocksXML, gap,
        advancedBlocksToggle(showAdvancedBlocks)
    ];
    if (hasDeviceBlocks) {
        everything.push(gap, deviceBlocksToggle(showDeviceBlocks));
    }
    if (showAdvancedBlocks) {
        for (const advancedCategory of advancedGameAndProgrammingCategories()) {
            everything.push(gap, advancedCategory);
        }
    }
    if (hasDeviceBlocks) {
        if (showDeviceBlocks) {
            for (const extensionCategory of deviceCategoriesXML) {
                everything.push(gap, extensionCategory.xml);
            }
        }
    } else {
        for (const extensionCategory of coreCategoriesXML) {
            everything.push(gap, extensionCategory.xml);
        }
    }
    everything.push(xmlClose);
    return everything.join('\n');
};
export default makeToolboxXML;
