// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

export const setupCytoscapeInstance = (
  divContainer: HTMLElement | undefined
) => {
  // include all libaries that are necessary
  // 3rd party packages
  const cytoscape = require('cytoscape');
  const popper = require('cytoscape-popper');
  const noOverlap = require('cytoscape-no-overlap');
  const contextMenus = require('cytoscape-context-menus');

  // register extensions
  cytoscape.use(popper);
  cytoscape.use(noOverlap);
  contextMenus(cytoscape);

  // disable cytoscape warnings (since the style of the elements is changed at runtime, many warnings would pop up)
  cytoscape.warnings(false);

  // set up cytoscape and style classes
  const cy = cytoscape({
    container: divContainer, // container to render in
    style: [
      // the general stylesheet for the graph
      {
        selector: 'node',
        style: {
          'background-color': '#aaa',
          'border-width': 2,
          'border-color': '#000',
          label: 'data(label)'
        }
      },
      {
        selector: '.container', // container boxes general
        style: {
          'background-opacity': 1,
          'line-opacity': 0.5,
          'border-width': 3,
          'text-valign': 'top',
          'text-halign': 'right',
          'text-background-color': 'white',
          'text-background-opacity': 1,
          'text-rotation': Math.PI / 2,
          shape: 'round-rectangle'
        }
      },
      {
        selector: '.container.rotated', // don't rotate the text if the box is rotated
        style: {
          'text-valign': 'top',
          'text-halign': 'center',
          'text-rotation': 0
        }
      },
      {
        selector: '.container.collapsed',
        style: {
          'border-style': 'dashed'
        }
      },
      {
        selector: '.container.invisibleLabel',
        style: {
          label: ''
        }
      },
      {
        selector: '.transition_node',
        style: {
          shape: 'rectangle',
          width: 70,
          height: 7,
          'background-color': '#000000'
        }
      },
      {
        selector: '.single_node',
        style: {
          shape: 'ellipse',
          width: 35,
          height: 35
        }
      },
      {
        selector: '.token_label', // additional node that only contains the actual label of the node
        style: {
          'background-opacity': 0,
          'border-width': 0,
          padding: 0
        }
      },
      {
        selector: '.token_node', // actual, visible node that contains a token as its label, centered
        style: {
          'text-valign': 'center',
          'text-halign': 'center',
          'text-margin-y': 1.7,
          'font-size': 30
        }
      },
      {
        selector: 'upper_round_node', // includes single_node and token_label, important for collapsing
        style: {}
      },
      {
        selector: 'edge',
        style: {
          width: 1,
          'line-color': '#000',
          'target-arrow-color': '#000',
          'target-arrow-shape': 'triangle',
          'edge-distance': 'intersection'
        }
      },
      {
        selector: 'edge.bezier', // curved edge
        style: {
          'curve-style': 'unbundled-bezier'
        }
      },
      {
        selector: 'edge.straight',
        style: {
          'curve-style': 'straight'
        }
      },
      {
        selector: 'edge.invisible', // edge that is only visible if the graph is rotated
        style: { opacity: 0 }
      }
    ],
    wheelSensitivity: 0.5
  });

  return cy;
};
