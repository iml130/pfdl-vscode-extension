// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { setupCytoscapeInstance } from '../code_visualization/setup_cytoscape';
import {
  createTooltips,
  eventHandlerExportsForTesting,
  toggleNodeCollapsing
} from '../code_visualization/event_handler';

// local methods that are only exported to be tested
const {
  makePopper,
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
} = eventHandlerExportsForTesting;

const getTestElements = () => {
  const container1 = {
    group: 'nodes',
    data: {
      id: 'container_1',
      label: 'Container1',
      tippyContent: 'Container1',
      parent: null,
      level: 1,
      yShift: 10
    },
    classes: ['container'],
    position: {} // defined by the child nodes
  };
  const container2 = {
    group: 'nodes',
    data: {
      id: 'container_2',
      label: 'Container2',
      tippyContent: 'Container2',
      parent: null,
      level: 1,
      yShift: 0
    },
    classes: ['container'],
    position: {} // defined by the child nodes
  };
  const container3 = {
    group: 'nodes',
    data: {
      id: 'container_3',
      label: 'Container3',
      tippyContent: 'Container3',
      parent: 'container_2',
      level: 2,
      yShift: 0
    },
    classes: ['container'],
    position: {} // defined by the child nodes
  };

  const node1 = {
    group: 'nodes',
    data: {
      id: 'node_1',
      label: '',
      tippyContent: 'Node1',
      parent: 'container_1'
    },
    classes: ['single_node', 'upper_round_node'],
    position: { x: 0, y: 0 }
  };
  const node2 = {
    group: 'nodes',
    data: {
      id: 'node_2',
      label: '',
      tippyContent: 'Node2',
      parent: 'container_3'
    },
    classes: ['single_node', 'upper_round_node'],
    position: { x: 0, y: 0 }
  };
  const node3 = {
    group: 'nodes',
    data: {
      id: 'node_3',
      label: '',
      tippyContent: 'Node3',
      parent: 'container_3'
    },
    classes: ['single_node', 'upper_round_node'],
    position: { x: 30, y: 70 }
  };

  return [container1, container2, container3, node1, node2, node3];
};

const getCyNodes = () => {
  const nodes = cy.nodes();
  let cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3;
  for (const node of nodes) {
    switch (node.data('id')) {
      case 'node_1':
        cyNode1 = node;
        break;
      case 'node_2':
        cyNode2 = node;
        break;
      case 'node_3':
        cyNode3 = node;
        break;
      case 'container_1':
        cyContainer1 = node;
        break;
      case 'container_2':
        cyContainer2 = node;
        break;
      case 'container_3':
        cyContainer3 = node;
        break;
      default:
        throw Error('element not found');
    }
  }

  return [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3];
};

const createEdgesBetweenTestObjects = () => {
  cy.add([
    {
      group: 'edges',
      data: { source: 'node_1', target: 'node_2' },
      classes: ['straight']
    },
    {
      group: 'edges',
      data: { source: 'node_2', target: 'node_3' },
      classes: ['straight']
    }
  ]);
};
let cyNode1,
  cyNode2,
  cyNode3,
  cyNode4,
  cyContainer1,
  cyContainer2,
  cyContainer3,
  cyContainer4;
let container1, container2, container3, container4, node1, node2, node3, node4;
const cy = setupCytoscapeInstance(undefined);

describe('makePopper', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should correctly create the tippy content for a given node', () => {
    const cyNodes = getCyNodes();
    cyNodes.forEach((node) => {
      makePopper(node);
      expect(node.tippy).not.toBe(undefined);
    });
    expect(cyNode1.tippy.reference.innerHTML).toEqual('Node1');
    expect(cyNode2.tippy.reference.innerHTML).toEqual('Node2');
    expect(cyNode3.tippy.reference.innerHTML).toEqual('Node3');
    expect(cyContainer1.tippy.reference.innerHTML).toEqual('Container1');
    expect(cyContainer2.tippy.reference.innerHTML).toEqual('Container2');
    expect(cyContainer3.tippy.reference.innerHTML).toEqual('Container3');
  });
});

describe('createTooltips', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should correctly create the tippy content for each node', () => {
    createTooltips(cy);
    expect(cyNode1.tippy.reference.innerHTML).toEqual('Node1');
    expect(cyNode2.tippy.reference.innerHTML).toEqual('Node2');
    expect(cyNode3.tippy.reference.innerHTML).toEqual('Node3');
    expect(cyContainer1.tippy.reference.innerHTML).toEqual('Container1');
    expect(cyContainer2.tippy.reference.innerHTML).toEqual('Container2');
    expect(cyContainer3.tippy.reference.innerHTML).toEqual('Container3');
  });
});

describe('toggleNodeCollapsing', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should collapse an uncollapsed container', () => {
    toggleNodeCollapsing(cyContainer1, cy);
    expect(cyContainer1.hasClass('collapsed')).toBe(true);

    // collapse containers 2 and 3
    toggleNodeCollapsing(cyContainer2, cy);
    expect(cyContainer2.hasClass('collapsed')).toBe(true);
    expect(cyContainer3.hasClass('collapsed')).toBe(true);
    expect(cyContainer3.children().nodes()).toHaveLength(1); // node 3 was deleted
    expect(cyContainer3.children().nodes()).toContain(cyNode2);
  });

  it('should expand an collapsed container', () => {
    //collapse container 1
    const currentPositionC1 = cyContainer1.boundingBox({
      includeLabels: false
    });
    cyContainer1.scratch({
      childNodes: cyContainer1.children("node[id != 'node_1']").remove(),
      currentPosition: [currentPositionC1.x1, currentPositionC1.y1],
      currentlyRotated: false
    });
    cyContainer1.addClass('collapsed');

    //collapse container 2 & 3
    const currentPositionC3 = cyContainer3.boundingBox({
      includeLabels: false
    });
    cyContainer3.scratch({
      childNodes: cyContainer3.children("node[id != 'node_2']").remove(),
      currentPosition: [currentPositionC3.x1, currentPositionC3.y1],
      currentlyRotated: false
    });
    cyContainer3.addClass('collapsed');
    cyContainer2.addClass('collapsed');

    toggleNodeCollapsing(cyContainer1, cy);
    expect(cyContainer1.hasClass('collapsed')).toBe(false);

    toggleNodeCollapsing(cyContainer2, cy);
    expect(cyContainer2.hasClass('collapsed')).toBe(false);
    expect(cyContainer3.hasClass('collapsed')).toBe(false);
    expect(cyContainer3.children().nodes()).toHaveLength(2); // node 3 was restored
    expect(cyContainer3.children().nodes()).toContain(cyNode3);
  });
});

describe('getContainerToToggle', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return the clicked container and "false" if it contains single nodes and has no parent', () => {
    const [container, parentIsSingleContainer] =
      getContainerToToggle(cyContainer1);
    expect(container).toEqual(cyContainer1);
    expect(parentIsSingleContainer).toBe(false);
  });

  it('should return the child of the clicked container and "true" if it only contains another container', () => {
    const [container, parentIsSingleContainer] =
      getContainerToToggle(cyContainer2);
    expect(container).toEqual(cyContainer3);
    expect(parentIsSingleContainer).toBe(true);
  });

  it('should return the clicked container and "true" if the parent only contains another container', () => {
    const [container, parentIsSingleContainer] =
      getContainerToToggle(cyContainer3);
    expect(container).toEqual(cyContainer3);
    expect(parentIsSingleContainer).toBe(true);
  });
});

describe('collapseContainer', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    createEdgesBetweenTestObjects();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should throw if there are no single / transition nodes', () => {
    expect(() => {
      collapseContainer(cyContainer2, cy, true);
    }).toThrow();
  });

  it('should correctly collapse a container with single nodes', () => {
    collapseContainer(cyContainer1, cy, false);
    expect(cyContainer1.hasClass('collapsed')).toBe(true);
    expect(cyContainer1.scratch().childNodes).toHaveLength(0);
    expect(cyContainer1.scratch().additionalEdges).toBe(null);
    expect(cyContainer1.scratch().currentlyRotated).toBe(false);
    expect(cyContainer1.children()).toHaveLength(1);

    collapseContainer(cyContainer3, cy, true);
    expect(cyContainer3.hasClass('collapsed')).toBe(true);
    expect(cyContainer3.scratch().childNodes).toHaveLength(2); // node 3 + its edge
    expect(cyContainer3.scratch().childNodes).toContain(cyNode3);
    expect(cyContainer3.scratch().additionalEdges).toBe(null);
    expect(cyContainer3.scratch().currentlyRotated).toBe(false);
    expect(cyContainer3.children()).toHaveLength(1);
    expect(cyContainer2.hasClass('collapsed')).toBe(true);
  });

  it('should correctly collapse a container without single nodes', () => {
    cyNode4 = cy.add([
      {
        group: 'nodes',
        data: {
          id: 'node_4',
          parent: 'container_2'
        },
        classes: ['transition_node'],
        position: { x: 0, y: 0 }
      }
    ])[0];

    cy.add([
      {
        group: 'edges',
        data: { source: 'node_3', target: 'node_4' },
        classes: ['straight']
      }
    ]);

    // transform node 1 to transition node
    cyNode1.removeClass('upper_round_node');
    cyNode1.removeClass('single_node');
    cyNode1.addClass('transition_node');

    // transform node 2 to transition node
    cyNode2.removeClass('upper_round_node');
    cyNode2.removeClass('single_node');
    cyNode2.addClass('transition_node');

    // transform node 3 to transition node
    cyNode3.removeClass('upper_round_node');
    cyNode3.removeClass('single_node');
    cyNode3.addClass('transition_node');

    collapseContainer(cyContainer1, cy, false);
    expect(cyContainer1.hasClass('collapsed')).toBe(true);
    expect(cyContainer1.scratch().childNodes).toHaveLength(0);
    expect(cyContainer1.scratch().additionalEdges).toBe(null);
    expect(cyContainer1.scratch().currentlyRotated).toBe(false);
    expect(cyContainer1.children()).toHaveLength(1);

    collapseContainer(cyContainer3, cy, false);
    expect(cyContainer3.hasClass('collapsed')).toBe(true);
    expect(cyContainer3.scratch().childNodes).toHaveLength(3); // node 3 + its 2 edges
    expect(cyContainer3.scratch().childNodes).toContain(cyNode3);
    expect(cyContainer3.scratch().additionalEdges).toHaveLength(1);
    expect(cyNode2.outgoers().nodes().first()).toEqual(cyNode4);
    expect(cyNode4.incomers().nodes().first()).toEqual(cyNode2);
    expect(cyContainer3.scratch().currentlyRotated).toBe(false);
    expect(cyContainer3.children()).toHaveLength(1);
    expect(cyContainer2.hasClass('collapsed')).toBe(false);
  });
});

describe('collapseContainerWithSingleNodes', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    createEdgesBetweenTestObjects();
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    container4 = {
      group: 'nodes',
      data: {
        id: 'container_4',
        parent: null,
        level: 1
      },
      classes: ['container']
    };

    node4 = {
      group: 'nodes',
      data: {
        id: 'node_4',
        parent: 'container_4'
      },
      classes: ['single_node', 'upper_round_node'],
      position: { x: 0, y: 0 }
    };
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return the only single node of a container and no new edges', () => {
    const [firstSingleNode, newEdges] = collapseContainerWithSingleNodes(
      cyContainer1,
      1,
      cy
    );
    expect(firstSingleNode).toEqual(cyNode1);
    expect(newEdges).toBe(null);
  });

  it('should return the first single node of a container and no new edge', () => {
    const [firstSingleNode, newEdges] = collapseContainerWithSingleNodes(
      cyContainer3,
      2,
      cy
    );
    expect(firstSingleNode).toEqual(cyNode2);
    expect(newEdges).toBe(null);
  });
  it('should return the first single node of a container and create a new successor edge', () => {
    // create a successor of node 3
    cyContainer4 = cy.add([container4])[0];
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_3', target: 'node_4' },
        classes: ['straight']
      }
    ]);
    const [firstSingleNode, newEdges] = collapseContainerWithSingleNodes(
      cyContainer3,
      2,
      cy
    );
    expect(firstSingleNode).toEqual(cyNode2);
    expect(newEdges).not.toBe(null);
    expect(newEdges).toHaveLength(1);

    // node 3 is not deleted yet, check wether node 4 is added to node 2's direct successors
    expect(cyNode2.outgoers().nodes()).toHaveLength(2);
    expect(cyNode2.outgoers().nodes().first()).toEqual(cyNode3);
    expect(cyNode2.outgoers().nodes().last()).toEqual(cyNode4);
    expect(cyNode4.incomers().nodes()).toHaveLength(2);
    expect(cyNode4.incomers().nodes().first()).toEqual(cyNode3);
    expect(cyNode4.incomers().nodes().last()).toEqual(cyNode2);
  });

  it('should return the first single node of a container and create a new predecessor edge', () => {
    // transform node 2 to transition node
    cyNode2.removeClass('upper_round_node');
    cyNode2.removeClass('single_node');
    cyNode2.addClass('transition_node');

    // create node 4 as a transition node of the next lower container
    node4.data.parent = 'container_2';
    node4.classes = ['transition_node'];
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      }
    ]);
    const [firstSingleNode, newEdges] = collapseContainerWithSingleNodes(
      cyContainer3,
      1,
      cy
    );
    expect(firstSingleNode).toEqual(cyNode3);
    expect(newEdges).not.toBe(null);
    expect(newEdges).toHaveLength(1);

    // node 2 is not deleted yet, check wether node 4 is added to node 3's direct predecessors
    expect(cyNode3.incomers().nodes()).toHaveLength(2);
    expect(cyNode3.incomers().nodes()).toContain(cyNode2);
    expect(cyNode3.incomers().nodes()).toContain(cyNode4);
    expect(cyNode4.outgoers().nodes()).toHaveLength(2);
    expect(cyNode4.outgoers().nodes()).toContain(cyNode2);
    expect(cyNode4.outgoers().nodes()).toContain(cyNode3);
  });
});

describe('getFirstSingleNodeInContainer', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should throw if there are no single nodes', () => {
    expect(() => {
      getFirstSingleNodeInContainer(cyContainer2);
    }).toThrow();
  });

  it("should return the container's only single node", () => {
    const firstChild = getFirstSingleNodeInContainer(cyContainer1);
    expect(firstChild).toEqual(cyNode1);
  });

  it("should return the container's first single node", () => {
    const firstChild = getFirstSingleNodeInContainer(cyContainer3);
    expect(firstChild).toEqual(cyNode2);
  });
});

describe('getLastSingleNodeInContainer', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should throw if there are no single nodes', () => {
    expect(() => {
      getLastSingleNodeInContainer(cyContainer2);
    }).toThrow();
  });

  it("should return the container's only single node", () => {
    const finalChild = getLastSingleNodeInContainer(cyContainer1);
    expect(finalChild).toEqual(cyNode1);
  });

  it("should return the container's first single node", () => {
    const finalChild = getLastSingleNodeInContainer(cyContainer3);
    expect(finalChild).toEqual(cyNode3);
  });
});

describe('isFirstNodeInContainerTransition', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    createEdgesBetweenTestObjects();
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return false if there are no transition nodes', () => {
    expect(isFirstNodeInContainerTransition(cyNode1)).toBe(false);
    expect(isFirstNodeInContainerTransition(cyNode2)).toBe(false);
  });

  it('should return false if there is a single node before the first transition node', () => {
    // transform node 3 to transition node
    cyNode3.removeClass('upper_round_node');
    cyNode3.removeClass('single_node');
    cyNode3.addClass('transition_node');
    cy.add([container1, container2, container3, node1, node2, node3]);
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();

    expect(isFirstNodeInContainerTransition(cyNode1)).toBe(false);
    expect(isFirstNodeInContainerTransition(cyNode2)).toBe(false);
  });

  it('should return true if there is a transition node before the first single node', () => {
    // transform node 2 to transition node
    cyNode2.removeClass('upper_round_node');
    cyNode2.removeClass('single_node');
    cyNode2.addClass('transition_node');
    cy.add([container1, container2, container3, node1, node2, node3]);
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();

    expect(isFirstNodeInContainerTransition(cyNode1)).toBe(false);
    expect(isFirstNodeInContainerTransition(cyNode3)).toBe(true);
  });
});

describe('createNewEdgesForCollapsing', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return null if no predecessor or successor is passed', () => {
    const newEdges = createNewEdgesForCollapsing('node_1', null, null, cy);
    expect(newEdges).toBe(null);
  });

  it('should create one edge if only a predecessor is passed', () => {
    expect(cyNode1.predecessors('.upper_round_node')).toHaveLength(0);

    const newEdges = createNewEdgesForCollapsing('node_1', 'node_2', null, cy);
    expect(newEdges).toHaveLength(1);
    expect(cyNode1.predecessors('.upper_round_node')).toHaveLength(1);
    expect(cyNode1.predecessors('.upper_round_node').first()).toEqual(cyNode2);
    expect(cyNode2.successors('.upper_round_node')).toHaveLength(1);
    expect(cyNode2.successors('.upper_round_node').first()).toEqual(cyNode1);
  });

  it('should create one edge if only a successor is passed', () => {
    const newEdges = createNewEdgesForCollapsing('node_1', null, 'node_3', cy);
    expect(newEdges).toHaveLength(1);
    expect(cyNode1.successors('.upper_round_node')).toHaveLength(1);
    expect(cyNode1.successors('.upper_round_node').first()).toEqual(cyNode3);
    expect(cyNode3.predecessors('.upper_round_node')).toHaveLength(1);
    expect(cyNode3.predecessors('.upper_round_node').first()).toEqual(cyNode1);
  });

  it('should create two edges if predecessor and successor are passed', () => {
    const newEdges = createNewEdgesForCollapsing(
      'node_1',
      'node_2',
      'node_3',
      cy
    );
    expect(newEdges).toHaveLength(2);
    expect(cyNode1.predecessors('.upper_round_node')).toHaveLength(1);
    expect(cyNode1.predecessors('.upper_round_node').first()).toEqual(cyNode2);
    expect(cyNode1.successors('.upper_round_node')).toHaveLength(1);
    expect(cyNode1.successors('.upper_round_node').first()).toEqual(cyNode3);
    expect(cyNode2.successors('.upper_round_node')).toHaveLength(2);
    expect(cyNode2.successors('.upper_round_node').first()).toEqual(cyNode1);
    expect(cyNode2.successors('.upper_round_node').last()).toEqual(cyNode3);
    expect(cyNode3.predecessors('.upper_round_node')).toHaveLength(2);
    expect(cyNode3.predecessors('.upper_round_node').first()).toEqual(cyNode1);
    expect(cyNode3.predecessors('.upper_round_node').last()).toEqual(cyNode2);
  });
});

describe('collapseContainerWithoutSingleNodes', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    // transform node 2 to become a transition node
    cyNode2.removeClass('upper_round_node');
    cyNode2.removeClass('single_node');
    cyNode2.addClass('transition_node');

    // transform node 3 to become a transition node
    cyNode3.removeClass('upper_round_node');
    cyNode3.removeClass('single_node');
    cyNode3.addClass('transition_node');

    // create another node
    node4 = {
      group: 'nodes',
      data: {
        id: 'node_4',
        parent: 'container_2'
      },
      classes: ['transition_node'],
      position: { x: 0, y: 0 }
    };

    container4 = {
      group: 'nodes',
      data: {
        id: 'container_4',
        parent: null,
        level: 1
      },
      classes: ['container']
    };
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should find the nearest transition node', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      }
    ]);
    const [firstTransitionNode, newEdges] = collapseContainerWithoutSingleNodes(
      cyContainer3,
      cy
    );

    expect(firstTransitionNode).toEqual(cyNode2);
    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].target()).toEqual(cyNode2);
    expect(newEdges[0].source()).toEqual(cyNode4);
  });
});

describe('storeRelevantInformationForExpansion', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should store all relevant information', () => {
    const additionalEdges = cy.add([
      {
        group: 'edges',
        data: { source: 'node_2', target: 'node_1' },
        classes: ['straight']
      }
    ]);
    storeRelevantInformationForExpansion(
      cyContainer3,
      'node_2',
      additionalEdges
    );
    const currentPosition = cyContainer3.boundingBox({
      includeLabels: false
    });
    expect(cyContainer3.scratch().childNodes).toHaveLength(1);
    expect(cyContainer3.scratch().childNodes).toContain(cyNode3);
    expect(cyContainer3.scratch().additionalEdges).toContain(
      additionalEdges[0]
    );
    expect(cyContainer3.scratch().currentPosition).toEqual([
      currentPosition.x1,
      currentPosition.y1
    ]);
    expect(cyContainer3.scratch().currentlyRotated).toBe(false);
  });
});

describe('expandContainer', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();

    //collapse container 1
    const currentPositionC1 = cyContainer1.boundingBox({
      includeLabels: false
    });
    cyContainer1.scratch({
      childNodes: cyContainer1.children("node[id != 'node_1']").remove(),
      currentPosition: [currentPositionC1.x1, currentPositionC1.y1],
      currentlyRotated: false
    });
    cyContainer1.addClass('collapsed');

    //collapse container 2 & 3
    const currentPositionC3 = cyContainer3.boundingBox({
      includeLabels: false
    });
    cyContainer3.scratch({
      childNodes: cyContainer3.children("node[id != 'node_2']").remove(),
      currentPosition: [currentPositionC3.x1, currentPositionC3.y1],
      currentlyRotated: false
    });
    cyContainer3.addClass('collapsed');
    cyContainer2.addClass('collapsed');
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should restore the nodes correctly when container was not moved', () => {
    const positionN1 = cyNode1.position();
    expandContainer(cyContainer1, cy, false);
    expect(cyContainer1.hasClass('collapsed')).toBe(false);
    expect(cyNode1.position()).toEqual(positionN1); // node was not collapsed, no changes
    const positionN3 = cyNode3.position();
    expandContainer(cyContainer3, cy, true);

    expect(cyContainer3.hasClass('collapsed')).toBe(false);
    expect(cyNode3.position()).toEqual(positionN3); // container was not moved, no changes
    expect(cyContainer2.hasClass('collapsed')).toBe(false); // container 2 should be uncollapsed
  });

  it('should restore the nodes correctly when container was moved', () => {
    cyContainer1.shift('x', 30);
    cyContainer1.shift('y', 30);
    const positionN1X = cyNode1.position('x');
    const positionN1Y = cyNode1.position('y');
    expandContainer(cyContainer1, cy, false);
    expect(cyContainer1.hasClass('collapsed')).toBe(false);
    expect(cyNode1.position()).toEqual({
      x: positionN1X,
      y: positionN1Y
    }); // node was not collapsed, no changes

    expect(cyContainer3.children()).toHaveLength(1);
    cyContainer3.shift('x', 30);
    cyContainer3.shift('y', 30);
    const positionN3X = cyNode3.position('x');
    const positionN3Y = cyNode3.position('y');
    expandContainer(cyContainer3, cy, true);

    expect(cyContainer3.hasClass('collapsed')).toBe(false);
    expect(cyNode3.position()).toEqual({
      x: positionN3X + 30,
      y: positionN3Y + 30
    }); // container was moved, restored node should haven been shifted
    expect(cyContainer2.hasClass('collapsed')).toBe(false); // container 2 should be uncollapsed
  });
});

describe('restoreCollapsedNodes', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();

    //collapse container 1
    const currentPositionC1 = cyContainer1.boundingBox({
      includeLabels: false
    });
    cyContainer1.scratch({
      childNodes: cyContainer1.children("node[id != 'node_1']").remove(),
      currentPosition: [currentPositionC1.x1, currentPositionC1.y1],
      currentlyRotated: false
    });
    cyContainer1.addClass('collapsed');

    //collapse container 2 & 3
    const currentPositionC3 = cyContainer3.boundingBox({
      includeLabels: false
    });
    cyContainer3.scratch({
      childNodes: cyContainer3.children("node[id != 'node_2']").remove(),
      currentPosition: [currentPositionC3.x1, currentPositionC3.y1],
      currentlyRotated: false
    });
    cyContainer3.addClass('collapsed');
    cyContainer2.addClass('collapsed');
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should restore the nodes correctly when container was not moved', () => {
    const positionN1 = cyNode1.position();
    restoreCollapsedNodes(cyContainer1, cy);
    expect(cyContainer1.hasClass('collapsed')).toBe(false);
    expect(cyNode1.position()).toEqual(positionN1); // node was not collapsed, no changes

    const positionN3 = cyNode3.position();
    restoreCollapsedNodes(cyContainer3, cy);
    expect(cyContainer3.hasClass('collapsed')).toBe(false);
    expect(cyNode3.position()).toEqual(positionN3); // container was not moved, no changes
  });

  it('should restore the nodes correctly when container was moved', () => {
    cyContainer1.shift('x', 30);
    cyContainer1.shift('y', 30);
    const positionN1X = cyNode1.position('x');
    const positionN1Y = cyNode1.position('y');
    restoreCollapsedNodes(cyContainer1, cy);
    expect(cyContainer1.hasClass('collapsed')).toBe(false);
    expect(cyNode1.position()).toEqual({
      x: positionN1X,
      y: positionN1Y
    }); // node was not collapsed, no changes

    expect(cyContainer3.children()).toHaveLength(1);
    cyContainer3.shift('x', 30);
    cyContainer3.shift('y', 30);
    const positionN3X = cyNode3.position('x');
    const positionN3Y = cyNode3.position('y');
    restoreCollapsedNodes(cyContainer3, cy);

    expect(cyContainer3.hasClass('collapsed')).toBe(false);
    expect(cyNode3.position()).toEqual({
      x: positionN3X + 30,
      y: positionN3Y + 30
    }); // container was moved, restored node should haven been shifted
  });
});

describe('shiftRestoredNodesFromContainer', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    // collapse containers 2&3
    const currentPosition = cyContainer3.boundingBox({ includeLabels: false });
    cyContainer3.scratch({
      childNodes: cyContainer3.children("node[id != 'node_2']").remove(),
      currentPosition: [currentPosition.x1, currentPosition.y1],
      currentlyRotated: false
    });
    cyContainer3.addClass('collapsed');
    cyContainer2.addClass('collapsed');
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should not shift the nodes if the container was not moved', () => {
    shiftRestoredNodesFromContainer(cyContainer3, 0, 0);
    cyContainer3.scratch().childNodes.restore();
    expect(cyNode2.position()).toEqual({ x: 0, y: 0 });
    expect(cyNode3.position()).toEqual({ x: 30, y: 70 });
  });

  it('should shift the restored nodes if the container was moved', () => {
    cyContainer3.shift('x', 10);
    cyContainer3.shift('y', -20);
    expect(cyNode2.position()).toEqual({ x: 10, y: -20 }); // shift directly applied
    expect(cyNode3.position()).toEqual({ x: 30, y: 70 }); // no shift because it is deleted

    shiftRestoredNodesFromContainer(cyContainer3, 10, -20);
    cyContainer3.scratch().childNodes.restore();
    expect(cyNode2.position()).toEqual({ x: 10, y: -20 }); // no more shift
    expect(cyNode3.position()).toEqual({ x: 40, y: 50 }); // the other node should be shifted
  });

  it('should shift the restored nodes if the parent container was moved', () => {
    cyContainer2.shift('x', 10);
    cyContainer2.shift('y', -20);
    expect(cyNode2.position()).toEqual({ x: 10, y: -20 }); // shift directly applied
    expect(cyNode3.position()).toEqual({ x: 30, y: 70 }); // no shift because it is deleted

    shiftRestoredNodesFromContainer(cyContainer3, 10, -20);
    cyContainer3.scratch().childNodes.restore();
    expect(cyNode2.position()).toEqual({ x: 10, y: -20 }); // no more shift
    expect(cyNode3.position()).toEqual({ x: 40, y: 50 }); // the other node should be shifted
  });
});

describe('getContainerShiftSinceCollapsing', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    const currentPosition = cyContainer1.boundingBox({ includeLabels: false });
    cyContainer1.scratch({
      currentPosition: [currentPosition.x1, currentPosition.y1],
      currentlyRotated: false
    });
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should do nothing if the container has not been moved', () => {
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([0, 0]);
  });

  it('should return the correct shift if the container has been moved', () => {
    cyContainer1.shift('x', 30);
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([30, 0]);
    cyContainer1.shift('x', 10);
    cyContainer1.shift('y', -50);
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([40, -50]);
  });

  it('should return the reversed shift if the container has been moved and rotated', () => {
    cyContainer1.shift('x', 30);

    // manually rotate the container
    cyContainer1.addClass('rotated');
    const previousX = cyContainer1.position('x');
    const previousY = cyContainer1.position('y');
    cyContainer1.position('x', previousY); // x = 0
    cyContainer1.position('y', -1 * previousX); // y = -30

    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([0, -30]);
    cyContainer1.shift('x', 10);
    cyContainer1.shift('y', -50);
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([10, -80]);
  });

  it('should return the reversed shift if the container has been moved and rotated back', () => {
    // manually rotate the container
    cyContainer1.addClass('rotated');
    const previousX = cyContainer1.position('x');
    const previousY = cyContainer1.position('y');
    cyContainer1.position('x', previousY); // x = 0
    cyContainer1.position('y', -1 * previousX); // y = 0

    cyContainer1.shift('x', 30);
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([30, 0]);
    cyContainer1.removeClass('rotated');
    const previousXR = cyContainer1.position('x');
    const previousYR = cyContainer1.position('y');
    cyContainer1.position('x', -1 * previousYR); // x = 0
    cyContainer1.position('y', previousXR); // y = 30
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([0, 30]);
    cyContainer1.shift('x', 10);
    cyContainer1.shift('y', -50);
    expect(getContainerShiftSinceCollapsing(cyContainer1)).toEqual([10, -20]);
  });
});

describe('getParentIdsForNode', () => {
  beforeEach(() => {
    [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    container2.data.parent = 'container_1';
    cy.add([container1, container2, container3, node1, node2, node3]);
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return null if node has no parent', () => {
    expect(getParentIdsForNode(cyContainer1)).toHaveLength(0);
  });

  it('should return the parent id if node has one parent', () => {
    expect(getParentIdsForNode(cyNode1)).toEqual(['container_1']);
  });

  it('should return all parent ids ordered by level', () => {
    expect(getParentIdsForNode(cyNode3)).toEqual([
      'container_3',
      'container_2',
      'container_1'
    ]);
  });
});

describe('findNearestTransitionNodesFromOutside', () => {
  beforeEach(() => {
    cy.add(getTestElements());
    createEdgesBetweenTestObjects();
    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();

    // transform node 2 to become a transition node
    cyNode2.removeClass('upper_round_node');
    cyNode2.removeClass('single_node');
    cyNode2.addClass('transition_node');

    // create another node
    node4 = {
      group: 'nodes',
      data: {
        id: 'node_4',
        parent: 'container_2'
      },
      classes: ['transition_node'],
      position: { x: 0, y: 0 }
    };

    container4 = {
      group: 'nodes',
      data: {
        id: 'container_4',
        parent: null,
        level: 1
      },
      classes: ['container']
    };
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should return no ids if there are no other transition nodes', () => {
    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe(null);
    expect(successorId).toBe(null);
  });

  it('should return no ids if there are no other transition nodes outside the container', () => {
    // transform node 3 to become a transition node
    cyNode3.removeClass('upper_round_node');
    cyNode3.removeClass('single_node');
    cyNode3.addClass('transition_node');

    const [predecessorIdN2, successorIdN2] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorIdN2).toBe(null);
    expect(successorIdN2).toBe(null);

    const [predecessorIdN3, successorIdN3] =
      findNearestTransitionNodesFromOutside(cyNode3);
    expect(predecessorIdN3).toBe(null);
    expect(successorIdN3).toBe(null);
  });

  it('should return no ids if there are no other transition nodes on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode4);
    expect(predecessorId).toBe(null);
    expect(successorId).toBe(null);
  });

  it('should return the id of the only transition node on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe('node_4');
    expect(successorId).toBe(null);
  });

  it('should return the id of the first predecessor transition node on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe('node_4'); // should not be node 1
    expect(successorId).toBe(null);
  });

  it('should return the id of the first successor transition node on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_3', target: 'node_4' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe(null);
    expect(successorId).toBe('node_4');
  });

  it('should return the id of the first successor transition node on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_3', target: 'node_4' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe(null);
    expect(successorId).toBe('node_4');
  });

  it('should return the id of the first predecessor and successor transition node on lower levels', () => {
    cyNode4 = cy.add([node4])[0];
    const node5 = {
      group: 'nodes',
      data: {
        id: 'node_5',
        parent: 'container_2'
      },
      classes: ['transition_node'],
      position: { x: 0, y: 0 }
    };
    cy.add([node5]);
    cy.add([
      {
        group: 'edges',
        data: { source: 'node_4', target: 'node_2' },
        classes: ['straight']
      },
      {
        group: 'edges',
        data: { source: 'node_3', target: 'node_5' },
        classes: ['straight']
      }
    ]);

    const [predecessorId, successorId] =
      findNearestTransitionNodesFromOutside(cyNode2);
    expect(predecessorId).toBe('node_4');
    expect(successorId).toBe('node_5');
  });
});
