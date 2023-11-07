// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { handleContainerOverlapping } from './node_rearrangement';
import { rotateNodes } from './context_menu';
import { createTooltips } from './event_handler';

/**
 * Create the graph elements and add them to cytoscape.
 * Do further adjustments before displaying the graph.
 * @returns true if a graph has been created, false otherwise
 */
const getGraphElements = require('./element_creation').getGraphElements;

export function createGraph(cy) {
  // add all graph nodes to cytoscape
  const elements = getGraphElements();
  if (elements == null) {
    return false;
  }
  cy.add(elements);

  // ensure that container nodes don't overlap accidentally
  const containerNodes = cy.nodes('.container');
  handleContainerOverlapping(containerNodes, false);

  // avoid overlapping for rotated containers as well
  rotateNodes(cy.nodes(), containerNodes, false);
  handleContainerOverlapping(containerNodes, true);
  rotateNodes(cy.nodes(), containerNodes, true);

  // ensure there are no single nodes that overlap with containers
  let nodesWithoutContainers = cy.nodes();
  nodesWithoutContainers = nodesWithoutContainers.filter(
    (node) => !containerNodes.includes(node)
  );
  // center and zoom in according to the window size
  cy.fit();

  // avoid node overlapping while moving the nodes
  cy.nodes().noOverlap({ padding: 1 });

  // register event listeners
  // initially create (hidden) tooltips for each node
  cy.ready(createTooltips(cy));
  return true;
}
