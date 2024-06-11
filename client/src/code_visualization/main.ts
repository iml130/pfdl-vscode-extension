// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { setupCytoscapeInstance } from './setup_cytoscape';
import { setupEventHandlers } from './event_handler';
import { createGraph } from './graph_creation';
import { rotateNodes } from './context_menu';
import { parseElementsFromDotFileString } from './element_creation';

const cytoscapeDiv = document.getElementById('cy');
if (cytoscapeDiv) {
  const cy = setupCytoscapeInstance(document.getElementById('cy'));
  setupEventHandlers(cy);

  // create the graph
  createGraph(cy, null);

  // global function to enable the dashboard in the standalone browser version to access the cytoscape instance
  (window as any).getCy = function () {
    return cy;
  };

  // global function used to update the dashboard in the standalone browser version
  (window as any).createCodeVisualization = function (parsedDotfile = null) {
    cy.elements().remove();
    createGraph(cy, parsedDotfile);
    const imgElement = document.getElementById('codeVisuImg');
    if (imgElement) {
      // graph should be displayed as an image, rotate it
      rotateNodes(cy.nodes(), cy.nodes('.container'), false);
    }
  };

  // global function for the dashboard in the standalone browser version to enable the comparison of two dotfiles
  (window as any).getElementsFromDotfile = function (dotfile) {
    return parseElementsFromDotFileString(dotfile);
  };

  (window as any).flipTokensForNodeIds = function (nodeIds) {
    nodeIds.forEach((id) => {
      const node = cy.getElementById(id);
      const tokenNode = cy.getElementById(id + '_token');
      if (tokenNode.length && tokenNode.inside()) {
        // node had a token before, remove it
        const newParentId = tokenNode.data('parent');
        node.data('label', '');
        node.move({ parent: newParentId });
        node.classes(['single_node', 'upper_round_node']);
        tokenNode.remove();
      } else {
        if (tokenNode.removed()) {
          tokenNode.restore();
        } else {
          // create a new token node for the object
          const newTokenNode = {
            group: 'nodes',
            classes: ['upper_round_node', 'token_label'],
            data: {
              id: id + '_token',
              label: '',
              tippyContent: node.label,
              parent: node.parentId
            }
          };
          cy.add(newTokenNode);
        }
        node.data('label', '•');
        node.move({ parent: node.id + '_token' });
        node.classes(['single_node', 'token_node']);
      }
    });
  };
}
