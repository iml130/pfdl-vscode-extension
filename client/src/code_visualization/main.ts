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
createGraph(cy, null);

// global function used to update the dashboard in the standalone browser version
(window as any).createCodeVisualization = async function (
  refreshData = true,
  parsedDotfile = null
) {
  if (refreshData) {
    cy.elements().remove();
    const successfullyCreated = createGraph(cy, parsedDotfile);
    if (!successfullyCreated) {
      // no elements drawn
      return;
    }
  }

  // create and display image of the code visualization if the <img> element 'codeVisuImg' exists
  const imgElement = document.getElementById('codeVisuImg');
  if (imgElement) {
    // only exists in standalone browser version (without vscode) to create img of the rotated graph

    // rotate nodes for img
    rotateNodes(cy.nodes(), cy.nodes('.container'), false);

    // create jpg
    const graphBlob = cy.jpg({
      full: true,
      output: 'blob-promise'
    });

    // rotate nodes back
    rotateNodes(cy.nodes(), cy.nodes('.container'), true);

    return graphBlob;
  }
};
