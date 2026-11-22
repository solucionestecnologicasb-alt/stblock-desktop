// A palette is a preview, not the program workspace. Recreate its blocks when
// displaying new XML: Blockly's type-only recycling loses shadows/mutations and
// can reuse partially disposed SVGs after category/search updates.
export default function installSafeFlyout (flyout) {
    if (!flyout || flyout.stblockSafeShow) return;
    const show = flyout.show;
    flyout.stblockSafeShow = true;
    flyout.show = function (xml) {
        const recycling = this.recyclingEnabled_;
        this.setRecyclingEnabled(false);
        if (this.emptyRecycleBlocks_) this.emptyRecycleBlocks_();
        try {
            return show.call(this, Array.isArray(xml) ? xml.slice() : xml);
        } finally {
            this.setRecyclingEnabled(recycling);
            this.getWorkspace().setResizesEnabled(true);
        }
    };
}
