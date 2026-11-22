/**
 * Keep the selected category when Blockly refreshes variables or procedures.
 * Its default refresh shows all categories and lets scroll select Motion.
 * @param {object} toolbox Blockly toolbox with the single-category override.
 * @param {Function} isUpdatingToolbox Whether the complete toolbox is being rebuilt.
 */
export default function preserveToolboxCategory (toolbox, isUpdatingToolbox) {
    const originalRefresh = toolbox.refreshSelection;
    let refreshing = false;
    toolbox.refreshSelection = function (...args) {
        const selected = this.getSelectedItem();
        if (!selected || isUpdatingToolbox()) {
            return originalRefresh.apply(this, args);
        }
        if (refreshing) return;

        const workspace = this.workspace_;
        const refreshEnabled = workspace.toolboxRefreshEnabled_;
        const offset = this.getCategoryScrollOffset();
        refreshing = true;
        workspace.toolboxRefreshEnabled_ = false;
        try {
            this.setSelectedCategoryById(selected.id_);
            const position = this.getCategoryPositionById(selected.id_);
            if (Number.isFinite(position) && Number.isFinite(offset)) {
                this.setFlyoutScrollPos(position + offset);
            }
        } finally {
            workspace.toolboxRefreshEnabled_ = refreshEnabled;
            refreshing = false;
        }
    };
}
