// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import {
  contextMenuExportsForTesting,
  rotateNodes,
  getContextMenuOptions
} from '../code_visualization/context_menu';
import { setupCytoscapeInstance } from '../code_visualization/setup_cytoscape';

// local methods that are only exported to be tested
const {
  restoreNodesRecursively,
  expandNodesWithMaxLevel,
  collapseNodesWithMinLevel,
  getExpandedContainers,
  sortExpandedContainersByLevelDesc,
  getCollapsedContainers,
  sortCollapsedContainersByLevelAsc
} = contextMenuExportsForTesting;

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
      tippyContent: 'Node1',
      parent: 'container_1'
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
    classes: ['transition_node'],
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

const stringifyCyObject = (cyObject) => {
  const stringObject = JSON.stringify([
    cyObject.position(),
    cyObject.classes(),
    cyObject.data()
  ]);

  return stringObject;
};

const collapseTestContainers = () => {
  const [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] =
    getCyNodes();
  // manually collapse container 1
  cyContainer1.scratch({
    childNodes: cyNode2.remove(),
    currentlyRotated: false
  });
  const currentPositionC1 = cyContainer1.boundingBox({
    includeLabels: false
  });
  cyContainer1.scratch({
    currentPosition: [currentPositionC1.x1, currentPositionC1.y1]
  });
  cyContainer1.addClass('collapsed');

  //manually collapse container 3
  cyContainer3.scratch({
    currentlyRotated: false
  });
  const currentPositionC3 = cyContainer3.boundingBox({
    includeLabels: false
  });
  cyContainer3.scratch({
    currentPosition: [currentPositionC3.x1, currentPositionC3.y1]
  });
  cyContainer3.addClass('collapsed');

  // manually collapse container 2
  cyContainer2.scratch({
    childNodes: cyContainer3,
    currentlyRotated: false
  });
  const currentPositionC2 = cyContainer2.boundingBox({
    includeLabels: false
  });
  cyContainer2.scratch({
    currentPosition: [currentPositionC2.x1, currentPositionC2.y1]
  });
  cyContainer2.addClass('collapsed');
};

const cy = setupCytoscapeInstance(undefined);

describe('rotateNodes', () => {
  beforeEach(() => {
    const [container1, cotainer2, _c3, node1, node2, node3] = getTestElements();
    node2.data.parent = 'container_2';
    node3.data.parent = 'container_1';
    cy.add([container1, cotainer2, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should correctly rotate all nodes if the graph is not rotated', () => {
    const [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, _] =
      getCyNodes();
    cyContainer2.shift('x', 100); // set position of node_2 to (100, 0)

    rotateNodes(cy.nodes(), cy.nodes('.container'), false);

    // apply yShift of 10
    expect(cyNode1.position()).toEqual({ x: 0, y: 10 });

    // x --> y, y --> -x
    expect(cyNode2.position()).toEqual({ x: 0, y: -100 });

    // x--> y, y --> -x. Then apply yShift of 10
    expect(cyNode3.position()).toEqual({ x: 70, y: -20 });

    expect(cyContainer1.hasClass('rotated')).toBe(true);
    expect(cyContainer2.hasClass('rotated')).toBe(true);
  });

  it('should correctly rotate all nodes if the graph is rotated', () => {
    const [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, _] =
      getCyNodes();

    // manually rotate the container
    cyContainer2.shift('y', -100); // set position of node_2 to (0, -100)
    cyNode3.position('x', 70);
    cyNode3.position('y', -30);
    cyContainer1.shift('y', 10); // node_1 : (0, 10), node_3 : (70, -20)
    cyContainer1.addClass('rotated');
    cyContainer2.addClass('rotated');

    rotateNodes(cy.nodes(), cy.nodes('.container'), true);

    expect(cyNode1.position()).toEqual({ x: -0, y: 0 });

    expect(cyNode2.position()).toEqual({ x: 100, y: 0 });

    expect(cyNode3.position()).toEqual({ x: 30, y: 70 });

    expect(cyContainer1.hasClass('rotated')).toBe(false);
    expect(cyContainer2.hasClass('rotated')).toBe(false);
  });

  it('should be unchanged if the graph is rotated twice', () => {
    const [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, _] =
      getCyNodes();

    cyContainer2.shift('x', 100); // set position of node_2 to (100, 0)
    // rotate the container twice
    rotateNodes(cy.nodes(), cy.nodes('.container'), false);
    rotateNodes(cy.nodes(), cy.nodes('.container'), true);

    // apply yShift of 10
    expect(cyNode1.position()).toEqual({ x: -0, y: 0 });
    // x --> y, y --> -x
    expect(cyNode2.position()).toEqual({ x: 100, y: 0 });

    // x--> y, y --> -x. Then apply yShift of 10
    expect(cyNode3.position()).toEqual({ x: 30, y: 70 });

    expect(cyContainer1.hasClass('rotated')).toBe(false);
    expect(cyContainer2.hasClass('rotated')).toBe(false);
  });
});

describe('restoreNodesRecursively', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();

    // put node 2 into container 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should not change the data if no node is collapsed', () => {
    let cyNodes = getCyNodes();
    const beforeRestoringElements = [];
    cyNodes.forEach((node) => {
      beforeRestoringElements.push(stringifyCyObject(node));
    });
    const visibleNodes = cy.nodes('.container');
    for (const node of visibleNodes) {
      restoreNodesRecursively(node, cy);
    }

    cyNodes = getCyNodes();

    //check equality of nodes before and after restoring
    for (let i = 0; i < beforeRestoringElements.length; i++) {
      expect(stringifyCyObject(cyNodes[i])).toEqual(beforeRestoringElements[i]);
    }
  });

  it('should restore a collapsed node', () => {
    let cyNodes = getCyNodes();
    const beforeRestoringElements = [];
    cyNodes.forEach((node) => {
      beforeRestoringElements.push(stringifyCyObject(node));
    });

    const cyContainer1 = cyNodes[3];
    const cyNode2 = cyNodes[1];

    // manually collapse container 1 --> one of the nodes is deleted
    cyContainer1.scratch({
      childNodes: cyNode2.remove(),
      currentlyRotated: false
    });
    const currentPosition = cyContainer1.boundingBox({ includeLabels: false });
    cyContainer1.scratch({
      currentPosition: [currentPosition.x1, currentPosition.y1]
    });
    cyContainer1.addClass('collapsed');

    expect(getCyNodes()[1]).toBe(undefined); // cyNode2 is deleted
    const visibleNodes = cy.nodes('.container');
    for (const node of visibleNodes) {
      restoreNodesRecursively(node, cy);
    }

    cyNodes = getCyNodes();
    for (let i = 0; i < beforeRestoringElements.length; i++) {
      expect(stringifyCyObject(cyNodes[i])).toEqual(beforeRestoringElements[i]);
    }
  });

  it('should restore all collapsed nodes recursively', () => {
    let cyNodes = getCyNodes();
    const beforeRestoringElements = [];
    cyNodes.forEach((node) => {
      beforeRestoringElements.push(stringifyCyObject(node));
    });

    collapseTestContainers();

    const [_1, cyNode2, _2, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    expect(cyNode2).toBe(undefined); // cyNode2 is deleted
    // expect(getCyNodes()[0].classes()).toContain(undefined); // cyNode2 is deleted
    expect(cyContainer1.classes()).toContain('collapsed');
    expect(cyContainer2.classes()).toContain('collapsed');
    expect(cyContainer3.classes()).toContain('collapsed');
    const visibleNodes = cy.nodes('.container');
    for (const node of visibleNodes) {
      restoreNodesRecursively(node, cy);
    }

    cyNodes = getCyNodes();
    for (let i = 0; i < beforeRestoringElements.length; i++) {
      expect(stringifyCyObject(cyNodes[i])).toEqual(beforeRestoringElements[i]);
    }
  });
});

describe('expandNodesWithMaxLevel', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should not change the data if no node is collapsed', () => {
    let cyNodes = getCyNodes();
    const beforeRestoringElements = [];
    cyNodes.forEach((node) => {
      beforeRestoringElements.push(stringifyCyObject(node));
    });
    const visibleNodes = cy.nodes('.container');
    for (const node of visibleNodes) {
      expandNodesWithMaxLevel(2, cy);
    }

    cyNodes = getCyNodes();

    //check equality of nodes before and after restoring
    for (let i = 0; i < beforeRestoringElements.length; i++) {
      expect(stringifyCyObject(cyNodes[i])).toEqual(beforeRestoringElements[i]);
    }
  });

  it('Should expand the only collapsed node', () => {
    const cyNodes = getCyNodes();

    let [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      cyNodes;

    // manually collapse container 1
    cyContainer1.scratch({
      childNodes: cyNode2.remove(),
      currentlyRotated: false
    });
    const currentPosition = cyContainer1.boundingBox({ includeLabels: false });
    cyContainer1.scratch({
      currentPosition: [currentPosition.x1, currentPosition.y1]
    });
    cyContainer1.addClass('collapsed');

    expandNodesWithMaxLevel(1, cy);

    [cyNode1, cyNode2, cyNode3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    expect(cyNode2).not.toBe(undefined);
    expect(cyContainer1.classes()).not.toContain('collapsed');
  });

  it('Should expand only the collapsed nodes on level 0', () => {
    collapseTestContainers();

    expandNodesWithMaxLevel(1, cy);

    const [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    expect(cyNode2).not.toBe(undefined);
    expect(cyContainer1.classes()).not.toContain('collapsed');
    expect(cyContainer2.classes()).toContain('collapsed'); // should still be collapsed as it only contains a single container on a lower level
    expect(cyContainer3.classes()).toContain('collapsed'); // should still be collapsed as it's level is too low
  });
});

describe('collapseNodesWithMinLevel', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it('should not change the data if all nodes are collapsed', () => {
    collapseTestContainers();
    let cyNodes = getCyNodes();
    cyNodes.splice(1, 1); // remove Node 2 (deleted)
    const beforeRestoringElements = [];
    cyNodes.forEach((node) => {
      beforeRestoringElements.push(stringifyCyObject(node));
    });
    collapseNodesWithMinLevel(1, cy);

    cyNodes = getCyNodes();
    expect(cyNodes[1]).toBe(undefined);
    cyNodes.splice(1, 1); // remove Node 2 (deleted)

    //check equality of nodes before and after restoring
    for (let i = 0; i < beforeRestoringElements.length; i++) {
      expect(stringifyCyObject(cyNodes[i])).toEqual(beforeRestoringElements[i]);
    }
  });

  it('Should only collapse the lowest nodes', () => {
    collapseNodesWithMinLevel(2, cy);
    let [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    expect(cyNode2).not.toBe(undefined);
    expect(cyContainer1.classes()).not.toContain('collapsed');
    expect(cyContainer2.classes()).toContain('collapsed');
    expect(cyContainer3.classes()).toContain('collapsed');

    collapseNodesWithMinLevel(1, cy);
    [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(cyNode2).toBe(undefined);
    expect(cyContainer1.classes()).toContain('collapsed');
    expect(cyContainer2.classes()).toContain('collapsed');
    expect(cyContainer3.classes()).toContain('collapsed');
  });
});

describe('getExpandedContainers', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });
  it("should return visible nodes without 'collapsed' class", () => {
    let result = getExpandedContainers(cy);

    const [_1, _2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result.length).toBe(3);
    expect(result).toContain(cyContainer1);
    expect(result).toContain(cyContainer2);
    expect(result).toContain(cyContainer3);

    collapseTestContainers();
    result = getExpandedContainers(cy);
    expect(result.length).toBe(0);
  });
});

describe('sortExpandedContainersByLevelDesc', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });
  it('should sort the nodes correctly', () => {
    const result = sortExpandedContainersByLevelDesc(cy);
    expect(result.length).toBe(3);
    const [_1, _2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result[0]).toEqual(cyContainer3);
    expect(result).toContain(cyContainer1);
    expect(result).toContain(cyContainer2);
  });
  it('should ignore collapsed nodes', () => {
    let [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    // manually collapse container 1
    cyContainer1.scratch({
      childNodes: cyNode2.remove(),
      currentlyRotated: false
    });
    const currentPositionC1 = cyContainer1.boundingBox({
      includeLabels: false
    });
    cyContainer1.scratch({
      currentPosition: [currentPositionC1.x1, currentPositionC1.y1]
    });
    cyContainer1.addClass('collapsed');

    const result = sortExpandedContainersByLevelDesc(cy);
    expect(result.length).toBe(2);
    [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result[0]).toEqual(cyContainer3);
    expect(result).not.toContain(cyContainer1);
    expect(result[1]).toEqual(cyContainer2);
  });
});

describe('getCollapsedContainers', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });
  it("should return visible nodes with 'collapsed' class", () => {
    let result = getCollapsedContainers(cy);
    expect(result.length).toBe(0);

    collapseTestContainers();
    result = getCollapsedContainers(cy);
    const [_1, _2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result.length).toBe(3);
    expect(result).toContain(cyContainer1);
    expect(result).toContain(cyContainer2);
    expect(result).toContain(cyContainer3);
  });
});

describe('sortCollapsedContainersByLevelAsc', () => {
  beforeEach(() => {
    const [container1, container2, container3, node1, node2, node3] =
      getTestElements();
    // put node 2 into cotainer 1
    node2.data.parent = 'container_1';

    cy.add([container1, container2, container3, node1, node2, node3]);
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });
  it('should sort the nodes correctly', () => {
    collapseTestContainers();
    const result = sortCollapsedContainersByLevelAsc(cy);

    const [_1, _2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result[2]).toEqual(cyContainer3);
    expect(result).toContain(cyContainer1);
    expect(result).toContain(cyContainer2);
  });
  it('should ignore expaded nodes', () => {
    let [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] =
      getCyNodes();
    // manually collapse container 1
    cyContainer1.scratch({
      childNodes: cyNode2.remove(),
      currentlyRotated: false
    });
    const currentPositionC1 = cyContainer1.boundingBox({
      includeLabels: false
    });
    cyContainer1.scratch({
      currentPosition: [currentPositionC1.x1, currentPositionC1.y1]
    });
    cyContainer1.addClass('collapsed');

    const result = sortCollapsedContainersByLevelAsc(cy);
    expect(result.length).toBe(1);
    [_1, cyNode2, _3, cyContainer1, cyContainer2, cyContainer3] = getCyNodes();
    expect(result[0]).toEqual(cyContainer1);
    expect(result).not.toContain(cyContainer2);
    expect(result).not.toContain(cyContainer3);
  });
});

describe('getContextMenuOptions', () => {
  it('should not throw errors setting up the context menu', () => {
    expect(() => {
      getContextMenuOptions(cy);
    }).not.toThrow();
  });
});
