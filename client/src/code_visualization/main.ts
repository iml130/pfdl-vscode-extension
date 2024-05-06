// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { setupCytoscapeInstance } from './setup_cytoscape';
import { setupEventHandlers } from './event_handler';
import { createGraph } from './graph_creation';
import { rotateNodes } from './context_menu';

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
  (window as any).createCodeVisualization = async function (
    parsedDotfile = null
  ) {
    cy.elements().remove();
    createGraph(cy, parsedDotfile);
    const imgElement = document.getElementById('codeVisuImg');
    if (imgElement) {
      // graph should be displayed as an image, rotate it
      rotateNodes(cy.nodes(), cy.nodes('.container'), false);
    }
  };
}
