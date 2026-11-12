import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { parse } from "acorn";
import preserveToolboxCategory from "../scratch-gui/src/lib/preserve-toolbox-category.js";

async function blocklyMethod(file, name) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const tree = parse(source, { ecmaVersion: "latest" });
  const assignment = tree.body.find(node =>
    node.type === "ExpressionStatement" &&
    node.expression.type === "AssignmentExpression" &&
    node.expression.left.property?.name === name);
  assert.ok(assignment, name);
  const fn = assignment.expression.right;
  return vm.runInNewContext("(" + source.slice(fn.start, fn.end) + ")");
}

const refreshSelection = await blocklyMethod(
  "../scratch-gui/node_modules/scratch-blocks/core/toolbox.js", "refreshSelection");
const selectByScroll = await blocklyMethod(
  "../scratch-gui/node_modules/scratch-blocks/core/flyout_base.js", "selectCategoryByScrollPosition");

function palette() {
  const motion = { id_: "motion" };
  const control = { id_: "control" };
  const toolbox = {
    selectedItem_: control,
    workspace_: { toolboxRefreshEnabled_: true },
    refreshSelection,
    getSelectedItem() { return this.selectedItem_; },
    getCategoryScrollOffset() { return 25; },
    getCategoryPositionById() { return 0; },
    setFlyoutScrollPos(value) { this.scroll = value; },
    selectCategoryById(id) { this.selectedItem_ = id === "control" ? control : motion; },
    setSelectedCategoryById(id) {
      this.selectCategoryById(id);
      flyout.categoryScrollPositions = [{ categoryId: id, position: 0 }];
    },
    showAll_() {
      this.showAllCount = (this.showAllCount || 0) + 1;
      flyout.categoryScrollPositions = [
        { categoryId: "motion", position: 0 },
        { categoryId: "control", position: 200 },
      ];
    },
  };
  const flyout = {
    workspace_: { scale: 1 },
    parentToolbox_: toolbox,
    categoryScrollPositions: [{ categoryId: "control", position: 0 }],
    selectCategoryByScrollPosition(pos) {
      if (this.categoryScrollPositions.length <= 1 || !toolbox.selectedItem_) return;
      selectByScroll.call(this, pos);
    },
  };
  return { toolbox, flyout };
}

test("reproduces Blockly refresh switching Control back to Motion", () => {
  const { toolbox, flyout } = palette();
  toolbox.refreshSelection();
  flyout.selectCategoryByScrollPosition(0);
  assert.equal(toolbox.selectedItem_.id_, "motion");
});

test("preserves Control and scroll offset during a dynamic refresh", () => {
  const { toolbox, flyout } = palette();
  preserveToolboxCategory(toolbox, () => false);
  toolbox.refreshSelection();
  flyout.selectCategoryByScrollPosition(0);
  assert.equal(toolbox.selectedItem_.id_, "control");
  assert.equal(toolbox.scroll, 25);
  assert.equal(toolbox.showAllCount, undefined);
  assert.equal(toolbox.workspace_.toolboxRefreshEnabled_, true);
});

test("preserves the all-category view and toolbox population", () => {
  const { toolbox } = palette();
  let updating = true;
  preserveToolboxCategory(toolbox, () => updating);
  toolbox.refreshSelection();
  assert.equal(toolbox.showAllCount, 1);
  updating = false;
  toolbox.selectedItem_ = null;
  toolbox.refreshSelection();
  assert.equal(toolbox.showAllCount, 2);
});

test("restores refresh state after rendering fails", () => {
  const { toolbox } = palette();
  toolbox.setSelectedCategoryById = () => { throw new Error("render failed"); };
  preserveToolboxCategory(toolbox, () => false);
  assert.throws(() => toolbox.refreshSelection(), /render failed/);
  assert.equal(toolbox.workspace_.toolboxRefreshEnabled_, true);
  assert.throws(() => toolbox.refreshSelection(), /render failed/);
});
