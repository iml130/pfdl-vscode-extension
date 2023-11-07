// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// 3rd party packages
import 'cytoscape-context-menus/cytoscape-context-menus.css';

// local sources
import {
  changeLabelVisibility,
  toggleNodeCollapsing,
  savePng
} from './event_handler';
import { applyContainerShift } from './node_rearrangement';

export const contextMenuExportsForTesting = {
  restoreNodesRecursively,
  expandNodesWithMaxLevel,
  collapseNodesWithMinLevel,
  getExpandedContainers,
  sortExpandedContainersByLevelDesc,
  getCollapsedContainers,
  sortCollapsedContainersByLevelAsc
};

/**
 * Specify all possible functionalities that the contextmenu (rightclick into the graph) should provide
 * @param cy cytoscape instance
 * @returns the configuration for the context menu to be used for the code visualization view
 */
export function getContextMenuOptions(cy) {
  const options = {
    evtType: 'cxttap',
    menuItems: [
      {
        // rotation by 90 degrees
        id: 'rotate',
        content: 'Rotate View',
        tooltipText: 'Rotate View',
        selector: '',
        onClickFunction: function () {
          // determine wether the graph is currently rotated to eventually apply additional container shifts
          const isGraphRotated = cy
            .nodes('.container')
            .first()
            .hasClass('rotated');
          rotateNodes(cy.nodes(), cy.nodes('.container'), isGraphRotated);
          // readjust viewport to fit the rotated graph
          cy.fit();
        },
        coreAsWell: true, // enable rotate command when right-clicking the background
        hasTrailingDivider: true
      },
      {
        // all collapsed nodes are expanded
        id: 'expandAll',
        content: 'Expand all Nodes',
        selector: '',
        onClickFunction: function () {
          const visibleNodes = cy.nodes('.container');
          for (const node of visibleNodes) {
            restoreNodesRecursively(node, cy);
          }
          cy.fit();
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // only the collapsed nodes on the currently highest level are expanded
        id: 'expandHighestLevel',
        content: 'Expand Nodes at lowest level',
        selector: '',
        onClickFunction: function () {
          const sortedNodes = sortCollapsedContainersByLevelAsc(cy);
          if (sortedNodes) {
            const lowestLevel = sortedNodes[0].data('level');
            expandNodesWithMaxLevel(lowestLevel, cy);
          }
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // all nodes are collapsed
        id: 'collapseAll',
        content: 'Collapse all Nodes',
        selector: '',
        onClickFunction: function () {
          collapseNodesWithMinLevel(0, cy);
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // only the uncollapsed nodes on the lowest level are collapsed
        id: 'collapseHighestLevel',
        content: 'Collapse Nodes at highest level',
        selector: '',
        onClickFunction: function () {
          const sortedNodes = sortExpandedContainersByLevelDesc(cy);
          if (sortedNodes) {
            const highestLevel = sortedNodes[0].data('level');
            collapseNodesWithMinLevel(highestLevel, cy);
          }
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // fit the size of the code visualization to the screen size
        id: 'rescaleView',
        content: 'Rescale the view',
        selector: '',
        onClickFunction: function () {
          cy.fit();
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // download a copy of the displayed graph as PNG
        id: 'downloadPng',
        content: 'Download graph as PNG',
        selector: '',
        onClickFunction: function () {
          savePng(cy);
        },
        coreAsWell: true,
        hasTrailingDivider: true
      },
      {
        // show / hide the labels of the boxes
        id: 'changeLabelVisibility',
        content: 'Show / Hide Box Labels',
        selector: '',
        onClickFunction: function () {
          changeLabelVisibility(cy.nodes('.container'));
        },
        coreAsWell: true,
        hasTrailingDivider: true
      }
    ]
  };

  return options;
}
/**
 * method that takes a list of nodes and edges and rotates them by 90 degrees
 * @param nodes cytoscape nodes (containers and single nodes) to rotate
 * @param edges cytoscape edges to rotate
 * @param containers cytoscape containers to rotate
 * @param shiftContainersBeforeRotation should be set to true if the graph is rotated before calling the method
 */
export function rotateNodes(
  nodes,
  containers,
  shiftContainersBeforeRotation: boolean
) {
  if (shiftContainersBeforeRotation) {
    for (const container of containers) {
      applyContainerShift(container, 'y', false);
    }
  }
  for (const node of nodes) {
    if (node.hasClass('container')) {
      // containers are automatically readjusted, only change text rotation
      if (node.hasClass('rotated')) {
        node.removeClass('rotated');
      } else {
        node.addClass('rotated');
      }
    } else if (
      node.hasClass('single_node') ||
      node.hasClass('transition_node')
    ) {
      // token_label node is a parent node that is automatically moved
      // swap x and y coordinates of the nodes
      const nodeXPosition = node.position('x');
      const nodeYPosition = node.position('y');
      if (shiftContainersBeforeRotation) {
        // graph is currently rotated
        node.position('x', -1 * nodeYPosition);
        node.position('y', nodeXPosition);
      } else {
        node.position('x', nodeYPosition);
        node.position('y', -1 * nodeXPosition);
      }
      if (node.hasClass('transition_node')) {
        // rotate the transition nodes
        const nodeWidth = node.numericStyle('width');
        const nodeHeight = node.numericStyle('height');
        node.style('width', nodeHeight);
        node.style('height', nodeWidth);
      }
    }
    if (node.scratch().childNodes) {
      const hiddenNodes = node.scratch().childNodes.nodes();
      const hiddenContainers = node.scratch().childNodes.nodes('.container');

      // ensure that the temporary collapsed nodes and their edges are rotated as well
      rotateNodes(hiddenNodes, hiddenContainers, shiftContainersBeforeRotation);
    }
  }
  if (!shiftContainersBeforeRotation) {
    for (const container of containers) {
      applyContainerShift(container, 'y', true);
    }
  }
}
/**
 * restore the node and its children
 * @param node node to expand
 * @param cy instance of cytoscape
 */
function restoreNodesRecursively(node, cy) {
  if (node.scratch().childNodes) {
    // node has children that were collapsed
    const restoredNodes = node.scratch().childNodes;
    toggleNodeCollapsing(node, cy);

    for (const childNode of restoredNodes) {
      restoreNodesRecursively(childNode, cy);
    }
  }
}

/**
 * collapse all nodes with a level >= minLevel
 * @param minLevel the minimum level a node must have to be collapsed
 * @param cy instance of cytoscape
 */
function collapseNodesWithMinLevel(minLevel, cy) {
  const sortedNodes = sortExpandedContainersByLevelDesc(cy);
  if (sortedNodes) {
    for (const node of sortedNodes) {
      if (node.data('level') < minLevel) {
        // all nodes with the passed minimum level have been collapsed
        break;
      } else if (!node.hasClass('collapsed')) {
        toggleNodeCollapsing(node, cy);
      }
    }
  }
}

/**
 * expand all nodes with a level <= maxLevel
 * @param maxLevel the maximum level a node can have to be expanded
 * @param cy instance of cytoscape
 */
function expandNodesWithMaxLevel(maxLevel, cy) {
  const sortedNodes = sortCollapsedContainersByLevelAsc(cy);
  if (sortedNodes) {
    let expandedNodes = false;
    for (const node of sortedNodes) {
      if (node.data('level') > maxLevel) {
        // all nodes with the passed minimum level have been collapsed
        break;
      } else if (
        node.hasClass('collapsed') &&
        (node.children('.upper_round_node').length > 0 ||
          node.children('.transition_node').length > 0)
      ) {
        // expands collapsed nodes
        expandedNodes = true;
        toggleNodeCollapsing(node, cy);
      }
    }
    if (!expandedNodes) {
      // try to expand parents
      for (const node of sortedNodes) {
        if (node.data('level') > maxLevel) {
          // all nodes with the passed minimum level have been collapsed
          break;
        } else if (node.hasClass('collapsed')) {
          // expands collapsed nodes
          toggleNodeCollapsing(node, cy);
        }
      }
    }
  }
}

function getExpandedContainers(cy) {
  let visibleNodes = cy.nodes('.container');
  visibleNodes = visibleNodes.filter((node) => !node.hasClass('collapsed'));
  return visibleNodes;
}

function sortExpandedContainersByLevelDesc(cy) {
  const visibleNodes = getExpandedContainers(cy);

  const sortedNodes = visibleNodes.sort((nodeA, nodeB) => {
    return nodeB.data('level') - nodeA.data('level');
  });
  return sortedNodes;
}

function getCollapsedContainers(cy) {
  let collapsedNodes = cy.nodes('.container');
  collapsedNodes = collapsedNodes.filter((node) => node.hasClass('collapsed'));
  return collapsedNodes;
}

function sortCollapsedContainersByLevelAsc(cy) {
  const hiddenNodes = getCollapsedContainers(cy);

  const sortedNodes = hiddenNodes.sort((nodeA, nodeB) => {
    return nodeA.data('level') - nodeB.data('level');
  });
  return sortedNodes;
}

/**
 * Disable all context menu options that currently would have no effect
 * @param contextMenu instance of contex menu
 * @param cy instance of cytoscape
 */
export function disableInvalidContextMenuEntrys(contextMenu, cy) {
  const expandItems = ['expandHighestLevel', 'expandAll'];
  const collapseItems = ['collapseHighestLevel', 'collapseAll'];
  const enableItems = [];
  const disableItems = [];
  if (getExpandedContainers(cy).length == 0) {
    disableItems.push(...collapseItems);
    enableItems.push(...expandItems);
  } else {
    enableItems.push(...collapseItems);
    if (cy.nodes('.collapsed').length > 0) {
      // there is at least one collapsed container
      enableItems.push(...expandItems);
    } else {
      disableItems.push(...expandItems);
    }
  }

  for (const item of enableItems) {
    contextMenu.enableMenuItem(item);
  }
  for (const item of disableItems) {
    contextMenu.disableMenuItem(item);
  }
}
