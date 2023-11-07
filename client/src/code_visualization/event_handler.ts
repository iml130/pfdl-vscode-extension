// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// 3rd party packages
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

// local sources
import { applyContainerShift } from './node_rearrangement';
import {
  getContextMenuOptions,
  disableInvalidContextMenuEntrys
} from './context_menu';

export const setupEventHandlers = (cy) => {
  // add the contextmenu to cytoscape
  const contextMenu = cy.contextMenus(getContextMenuOptions(cy));

  // show tooltip on mouseover
  cy.on('mouseover', 'node', function (event) {
    showTooltip(event.target);
  });

  // hide tooltip when cursor leaves the element
  cy.on('mouseout', 'node', function (event) {
    hideTooltip(event.target);
  });

  // collapse all children of a chosen node
  cy.on('tap', 'node', function (event) {
    toggleNodeCollapsing(event.target, cy);
  });

  // set invalid context menu entries as unselectable
  cy.on('cxttap', function () {
    disableInvalidContextMenuEntrys(contextMenu, cy);
  });

  // download the graph as png when the corresponding button in vscode is clicked
  window.addEventListener('message', (event) => {
    reactOnMessageReceived(event.data, cy);
  });
};

/**
 * create tooltips for each node
 * @param cy the cytoscape instance
 */
export const createTooltips = (cy) => {
  cy.elements().forEach(function (node) {
    if (node.data('tippyContent') != '') {
      makePopper(node);
    }
  });
};
/**
 * create tooltip for a specified node
 * @param node the node to create the tooltip for
 */
const makePopper = (node) => {
  const ref = node.popperRef(); // used only for positioning
  const contentDiv = document.createElement('div');

  node.tippy = tippy(contentDiv, {
    getReferenceClientRect: ref.getBoundingClientRect, // place tippy at the elements position
    content: () => {
      contentDiv.innerHTML = node.data('tippyContent');
      return contentDiv;
    },
    trigger: 'manual'
  });
};

/**
 * Method that is called when hovering over a node. Show the tooltip of the node.
 * @param node the node to display the tooltip for
 */
const showTooltip = (node) => {
  if (node.data('tippyContent')) {
    node.isFocussed = true;
    clearTimeout(400);
    // set delay of 400ms before tippy is shown
    setTimeout(function () {
      if (node.isFocussed) {
        node.tippy.show();
      }
    }, 400);
  }
};

/**
 * Hide the tooltip of a node that was displayed before
 * @param node the node of which the tooltip was shown before
 */
const hideTooltip = (node) => {
  if (node.data('tippyContent')) {
    node.isFocussed = false;
    node.tippy.hide();
  }
};

/**
 * collapse or expand the clicked node, depending on the nodes state
 * @param clickedNode the node to interact with
 * @param cy the cytoscape instance
 */
export const toggleNodeCollapsing = (clickedNode, cy) => {
  if (clickedNode.isChildless() || clickedNode.hasClass('token_label')) {
    // clicked on a leaf node or container that only contains another container
    return;
  }

  const [containerNode, parentIsSingleContainer] =
    getContainerToToggle(clickedNode);
  // check if the node has already been collapsed
  if (containerNode.scratch().childNodes == null) {
    // not collapsed yet
    // Save children data and remove
    collapseContainer(containerNode, cy, parentIsSingleContainer);
  } else {
    // the container was collapsed before
    expandContainer(containerNode, cy, parentIsSingleContainer);
  }
};

/**
 * Search for the root container starting from the clicked node from where the
 * collapsing / expanding should be started. This might be the actually clicked container
 * or a container of the next higher level if the clicked node only contains another container.
 * @param clickedNode the container that was initially clicked
 * @returns a tuple containing the correct container to toggle as well as a boolean indicating
 * wether the parent container only contains another container
 */
const getContainerToToggle = (clickedNode) => {
  let parentIsSingleContainer = false;
  if (
    clickedNode.children('.upper_round_node').length == 0 &&
    clickedNode.children('.transition_node').length == 0
  ) {
    // container only contains another container
    clickedNode = clickedNode.children('.container').first();
    parentIsSingleContainer = true;
  } else if (
    clickedNode.parent().length && // check if a parent exists
    clickedNode.parent().children('.upper_round_node').length == 0 &&
    clickedNode.parent().children('.transition_node').length == 0
  ) {
    // parent only contains another container
    parentIsSingleContainer = true;
  }
  return [clickedNode, parentIsSingleContainer];
};

/**
 * Collapse a passed container by removing all children except one "representation node"
 * @param container the container to collapse
 * @param cy the cytoscape instance
 * @param parentIsSingleContainer boolean indicating wether the parent container only contains another container
 */
const collapseContainer = (container, cy, parentIsSingleContainer: boolean) => {
  let representationNode = null;
  let newEdges = null;

  // determine the node that should still be displayed when the container is collapsed
  const numberOfSingleNodeChildren =
    container.children('.upper_round_node').length;

  if (numberOfSingleNodeChildren > 0) {
    [representationNode, newEdges] = collapseContainerWithSingleNodes(
      container,
      numberOfSingleNodeChildren,
      cy
    );
  } else if (container.children('.transition_node').length > 0) {
    [representationNode, newEdges] = collapseContainerWithoutSingleNodes(
      container,
      cy
    );
  } else {
    throw Error(
      'Collapsing is not possible because the chosen container contains no nodes (except other containers)'
    );
  }
  // save information that would be deleted after collapsing
  storeRelevantInformationForExpansion(
    container,
    representationNode.id(),
    newEdges
  );

  // indicate the container as collapsed
  container.addClass('collapsed');
  if (parentIsSingleContainer) {
    // indicate the container's parent as collapsed since it does not contain other (uncollapsed) nodes
    container.parent().addClass('collapsed');
  }
};

/**
 * Collapse a container that contains single nodes (circles / steps in the PFDL program)
 * @param container an expanded container that contains at least one single node
 * @param numberOfSingleNodeChildren the number of single nodes in the container (>=1)
 * @param cy the cytoscape instance
 * @returns a tuple containing the representative node for the container and an array of new edges after collapsing
 */
const collapseContainerWithSingleNodes = (
  container,
  numberOfSingleNodeChildren,
  cy
) => {
  let firstSingleNode = null;
  let newSuccessorId: string = null;

  // find the representative node
  firstSingleNode = getFirstSingleNodeInContainer(container);

  if (numberOfSingleNodeChildren > 1) {
    // the new successor is not equal to the node's original successor
    const finalChild = getLastSingleNodeInContainer(container);
    newSuccessorId = finalChild.successors().targets().first().id();
  }

  // find possible new predecessor / successor of the representative node
  let predecessorId = null;
  let successorId = null;
  if (isFirstNodeInContainerTransition(firstSingleNode)) {
    // the first node in the container is a transition node
    // choose one incomer (is always a transition node)
    const nearestTransitionNode = firstSingleNode.incomers().nodes().first();
    // find a valid predecessor and successor for the the representative node of the collapsed container
    [predecessorId, successorId] = findNearestTransitionNodesFromOutside(
      nearestTransitionNode
    );

    if (firstSingleNode.outgoers().nodes().first().id() == successorId) {
      // the representative node is directly connected to the successor outside of the container
      successorId = null;
    }
  } else {
    // the representativ node is a single node so the predecessor does not change
    predecessorId = null;
    if (newSuccessorId) {
      successorId = newSuccessorId;
    }
  }
  const newEdges = createNewEdgesForCollapsing(
    firstSingleNode.id(),
    predecessorId,
    successorId,
    cy
  );

  if (firstSingleNode.parent().hasClass('token_label')) {
    // reassign the token node as the children to avoid its deletion
    firstSingleNode = firstSingleNode.parent();
  }

  return [firstSingleNode, newEdges];
};

/**
 * find the first single node of the passed container
 * @param container a container that contains at least one single node
 * @returns the first single node in the container
 */
const getFirstSingleNodeInContainer = (container) => {
  let firstChild;
  firstChild = container.children('.upper_round_node').first();
  if (!firstChild.length) {
    throw 'the container does not contain any single nodes';
  }

  if (firstChild.hasClass('token_label')) {
    // parent node that only contains the token label, assign the child node for the connections
    firstChild = firstChild.children().first();
  }
  return firstChild;
};

/**
 * find the last single node of the passed container
 * @param container a container that contains at least one single node
 * @returns the last single node in the container
 */
const getLastSingleNodeInContainer = (container) => {
  let finalChild;
  finalChild = container.children('.upper_round_node').last();
  if (!finalChild.length) {
    throw 'the container does not contain any single nodes';
  }

  if (finalChild.hasClass('token_label')) {
    finalChild = finalChild.children().first();
  }
  return finalChild;
};

/**
 * Determine wether the first node in the container is a trasition node
 * @param firstSingleNode the first single node of a container
 * @returns a boolean indicating wether the first node in the container is a transition node
 */
const isFirstNodeInContainerTransition = (firstSingleNode) => {
  let firstNodeIsTransition = firstSingleNode.incomers().length > 0;
  // sometimes the first stored incomer is not the actual predecessor, so check all incomers
  const firstChildParentId = firstSingleNode.parent().id();
  for (const node of firstSingleNode.incomers().nodes()) {
    if (node.parent().id() != firstChildParentId) {
      // there is a direct edge from outside to the single node, so this is the first node in the container
      firstNodeIsTransition = false;
      break;
    }
  }
  return firstNodeIsTransition;
};

/**
 * Create edges from a given predecessor to the represetative node and from the repr. node to a given successor. Add them to cytoscape
 * @param representativeNodeId the ode where new edges should be created for
 * @param predecessorId the id of the new predecessor of the representation node, null if no new edge is wanted here
 * @param successorId the id of the new successor of the representation node, null if no new edge is wanted here
 * @param cy the cytoscape instance
 * @returns the new edgdes as cytoscape objects
 */
const createNewEdgesForCollapsing = (
  representativeNodeId,
  predecessorId,
  successorId,
  cy
) => {
  const newEdgeObjects = [];
  if (predecessorId) {
    newEdgeObjects.push({
      group: 'edges',
      classes: ['straight'],
      data: {
        source: predecessorId,
        target: representativeNodeId
      }
    });
  }
  if (successorId) {
    newEdgeObjects.push({
      group: 'edges',
      classes: ['straight'],
      data: {
        source: representativeNodeId,
        target: successorId
      }
    });
  }

  if (!newEdgeObjects.length) {
    return null;
  }
  return cy.add(newEdgeObjects);
};

/**
 * Collapse a container that contains no single nodes but transition nodes (rectangles)
 * @param container an expanded container that contains at least one transition node
 * @param cy the cytoscape instance
 * @returns a tuple containing the representative node for the container and an array of new edges after collapsing
 */
const collapseContainerWithoutSingleNodes = (container, cy) => {
  let firstTransitionNode = null;
  // container that only contains other containers and transition nodes
  firstTransitionNode = container.children('.transition_node').first();

  const [predecessorId, successorId] =
    findNearestTransitionNodesFromOutside(firstTransitionNode);

  const newEdges = createNewEdgesForCollapsing(
    firstTransitionNode.id(),
    predecessorId,
    successorId,
    cy
  );
  return [firstTransitionNode, newEdges];
};

/**
 * Store information that are visually deleted after collapsig the container to reuse them when expending the container again.
 * Remove the children nodes, except the respresentative node
 * @param container the node that contains information that are deleted
 * @param representationNodeId the only node in the container that should not be deleted
 * @param newEdges the new edges after collapsing
 */
const storeRelevantInformationForExpansion = (
  container,
  representationNodeId,
  newEdges
) => {
  // store all information about the containers children and remove them
  container.scratch({
    childNodes: container
      .children("node[id != '" + representationNodeId + "']")
      .remove(),
    additionalEdges: newEdges,
    currentlyRotated: container.hasClass('rotated')
  });

  // information to shift collapsed nodes when the container is moved
  const currentPosition = container.boundingBox({
    includeLabels: false
  });
  container.scratch({
    currentPosition: [currentPosition.x1, currentPosition.y1]
  });
};

/**
 * Expand a collapsed container by restorig all previously deleted children
 * @param container the container to be expanded
 * @param cy the cytoscape instance
 * @param parentIsSingleContainer boolean indicating wether the parent container only contains another container
 */
const expandContainer = (container, cy, parentIsSingleContainer) => {
  restoreCollapsedNodes(container, cy);
  if (parentIsSingleContainer) {
    // indicate the container's parent as uncollapsed since it does not contain other (collapsed) nodes
    container.parent().removeClass('collapsed');
  }
};

/**
 * expand the clicked node and display all of its hidden children
 * @param container the node to interact with
 * @param cy the cytoscape instance
 */
const restoreCollapsedNodes = (container, cy) => {
  // Restore the removed nodes from saved data

  // check for container movement since collapsing
  const [xShift, yShift] = getContainerShiftSinceCollapsing(container);
  // restore the nodes
  container.scratch().childNodes.restore();
  // shift them accordingly to the container
  shiftRestoredNodesFromContainer(container, xShift, yShift);

  // remove the edges that were additionally created for the collapsed node
  if (container.scratch().additionalEdges) {
    cy.remove(container.scratch().additionalEdges);
  }
  container.scratch({
    childNodes: null,
    additionalEdges: null,
    currentPosition: null,
    currentlyRotated: null
  });
  container.removeClass('collapsed');
};

/**
 * Determine the container's movement since it was collapsed
 * @param container the container of interest
 * @returns a tuple containing the containers x-movement and y-movement since collapsing
 */
const getContainerShiftSinceCollapsing = (container) => {
  // get the currentPosition
  const currentPosition = container.boundingBox({
    includeLabels: false
  });
  let xShift, yShift;

  // compare the current position to when the collapsing happened
  if (container.scratch().currentlyRotated != container.hasClass('rotated')) {
    // rotation since the node collapsed
    if (container.hasClass('rotated')) {
      xShift = currentPosition.x1 - container.scratch().currentPosition[1];
      yShift = currentPosition.y2 + container.scratch().currentPosition[0];
    } else {
      xShift = currentPosition.x2 + container.scratch().currentPosition[1];
      yShift = currentPosition.y1 - container.scratch().currentPosition[0];
    }
  } else {
    xShift = currentPosition.x1 - container.scratch().currentPosition[0];
    yShift = currentPosition.y1 - container.scratch().currentPosition[1];
  }

  return [xShift, yShift];
};

/**
 * Shift the nodes that are restored by the movement that was applied to their container after the deletion
 * @param container the moved container
 */
const shiftRestoredNodesFromContainer = (container, xShift, yShift) => {
  for (const node of container.scratch().childNodes) {
    if (node.hasClass('single_node') || node.hasClass('transition_node')) {
      node.shift('x', xShift);
      node.shift('y', yShift);
    }
    // shift containers that overlap only when they are rotated
    else if (
      node.hasClass('container') &&
      container.scratch().currentlyRotated != container.hasClass('rotated')
    ) {
      if (container.hasClass('rotated')) {
        applyContainerShift(node, 'y', true);
      } else {
        applyContainerShift(node, 'x', false);
      }
    }
  }
};

/**
 * Get all parent ids for a specific node, ordered by the distance to the node (ascending)
 * @param node the node to get the parent ids from
 * @returns
 */
const getParentIdsForNode = (node) => {
  const parentIds = [];
  while (node.parent().length > 0) {
    parentIds.push(node.parent().id());
    node = node.parent();
  }
  return parentIds;
};

/**
 * Returns (if available) a predecessor and a successor of a passed transition node that is not in the same or a higher level container
 * @param transitionNodeToStartFrom the node from where the search is initialised
 * @returns a predecessor and a successor. If parts of that are not available, null is returned instead of that part
 */
const findNearestTransitionNodesFromOutside = (transitionNodeToStartFrom) => {
  const parentIds = getParentIdsForNode(transitionNodeToStartFrom).slice(1); // remove the own parent id since we are looking for nodes that are not in the same container
  const predecessors =
    transitionNodeToStartFrom.predecessors('.transition_node');
  const successors = transitionNodeToStartFrom.successors('.transition_node');

  let predecessorId = null;
  let successorId = null;
  for (const predecessor of predecessors) {
    // check if there is a predecessor transition node that lies in a parent container of the node's container
    if (parentIds.includes(predecessor.parent().id())) {
      predecessorId = predecessor.id();
      break;
    }
  }
  for (const successor of successors) {
    // check if there is a successor transition node that lies in a parent container of the node's container
    if (parentIds.includes(successor.parent().id())) {
      successorId = successor.id();
      break;
    }
  }
  return [predecessorId, successorId];
};

/**
 * swap the label visibility of all containers
 * @param containerNodes all cytoscape containers
 */
export const changeLabelVisibility = (containerNodes) => {
  if (containerNodes[0].hasClass('invisibleLabel')) {
    for (const container of containerNodes) {
      container.removeClass('invisibleLabel');
    }
  } else {
    for (const container of containerNodes) {
      container.addClass('invisibleLabel');
    }
  }
};

/**
 * Evet handler for received messages
 * @param message the event message
 * @param cy the cytoscape instance
 */
export const reactOnMessageReceived = (message, cy) => {
  switch (message.command) {
    case 'downloadPng':
      savePng(cy);
      break;
    default:
      break;
  }
};

/**
 * create and download a png file of the currently cytoscape graph
 * @param cy the cytoscape instance
 */
export const savePng = (cy) => {
  const downloadElement = document.createElement('a');
  downloadElement.setAttribute('download', 'code_visualization.png');
  const pngtoDownload = cy.png({
    output: 'blob',
    full: true
  });
  downloadElement.href = window.URL.createObjectURL(pngtoDownload);
  downloadElement.click();
};

/**
 * export all methods that are only used here and in tests
 */
export const eventHandlerExportsForTesting = {
  makePopper,
  showTooltip,
  hideTooltip,
  getContainerToToggle,
  collapseContainer,
  collapseContainerWithSingleNodes,
  getFirstSingleNodeInContainer,
  getLastSingleNodeInContainer,
  isFirstNodeInContainerTransition,
  createNewEdgesForCollapsing,
  collapseContainerWithoutSingleNodes,
  storeRelevantInformationForExpansion,
  expandContainer,
  restoreCollapsedNodes,
  shiftRestoredNodesFromContainer,
  getContainerShiftSinceCollapsing,
  getParentIdsForNode,
  findNearestTransitionNodesFromOutside
};
