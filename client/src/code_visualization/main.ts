// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { setupCytoscapeInstance } from './setup_cytoscape';
import { setupEventHandlers } from './event_handler';
import { createGraph } from './graph_creation';
import { rotateNodes } from './context_menu';

const cy = setupCytoscapeInstance(document.getElementById('cy'));
setupEventHandlers(cy);

// create the graph
createGraph(cy);

// global function used to update the dashboard in the standalone browser version
(window as any).createCodeVisualization = function (refreshData = true) {
  if (refreshData) {
    cy.elements().remove();
    const successfullyCreated = createGraph(cy);
    if (!successfullyCreated) {
      // no elements drawn
      return;
    }
  }

  // create and display image of the code visualization if the <img> element 'codeVisuImg' exists
  const imgElement = document.getElementById('codeVisuImg');
  if (imgElement) {
    // only exists in standalone browser version (without vscode)
    // create img of rotated graph
    rotateNodes(cy.nodes(), cy.nodes('.container'), false);
    const pngToDownload = cy.png({ full: true });
    rotateNodes(cy.nodes(), cy.nodes('.container'), true);
    imgElement.setAttribute('src', pngToDownload);
  }
};
