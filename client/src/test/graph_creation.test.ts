// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// 3rd party packages
import { promises as fs } from 'fs';

// local sources
import { createGraph } from '../code_visualization/graph_creation';
import { eventHandlerExportsForTesting } from '../code_visualization/event_handler';
import { setupCytoscapeInstance } from '../code_visualization/setup_cytoscape';

// local methods that are only exported to be tested
const { makePopper, showTooltip, hideTooltip } = eventHandlerExportsForTesting;

document.body.innerHTML =
  "<div id='cy'></div> <div id='graphElementsDiv'></div>";

const cy = setupCytoscapeInstance(undefined);

describe('createGraph', () => {
  it('should return false if elements is null', () => {
    // Call the createGraph function
    const result = createGraph(cy);

    // Expect the result to be false since there are no elements
    expect(result).toBe(false);
  });

  it('should add elements to cytoscape', async () => {
    const data = await fs.readFile(
      __dirname + '/../../src/test/dot_files/two_nodes_test.dot',
      'utf-8'
    );

    document.getElementById('graphElementsDiv').innerText = data;
    const graphCreationSuccessful = createGraph(cy);
    expect(graphCreationSuccessful).toBe(true);
    // Expect one container, 2 nodes ad one edge to be added to cytoscape
    expect(cy.elements().length).toBe(4);
  });
});

describe('showTooltip', () => {
  it('should show tooltip on mouseover', () => {
    // Create a mock node
    const node = cy.add({ data: { id: 'node1', tippyContent: 'Node 1' } });

    makePopper(node);
    // Call the showTooltip function
    showTooltip(node);

    // Expect the tooltip to be shown
    expect(node.isFocussed).toBe(true);

    hideTooltip(node);
    expect(node.isFocussed).toBe(false);
  });
});
