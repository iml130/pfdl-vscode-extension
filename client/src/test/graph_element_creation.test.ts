// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// 3rd party packages
import * as matchers from 'jest-extended';
const fs = require('fs');

// local sources
import { Container } from '../types/container';
import { Node } from '../types/node';
import { Edge } from '../types/edge';
import { elementCreationExportsForTesting } from '../code_visualization/element_creation';

// setup 'jest' to extend the matchers
expect.extend(matchers);

// local methods that are only exported to be tested
const {
  splitDotfile,
  buildTreeStructure,
  parseElementsFromDotFileString,
  addEdgeControlPoints,
  getFinalGraphElements,
  TransformEdgeIntoCytoscapeExpression,
  TransformNodeIntoCytoscapeExpression
} = elementCreationExportsForTesting;

let dotfileString;
let treeStructure;

describe('Should create all graph elements from a concrete dotfile.', () => {
  beforeAll(async () => {
    const dotFilePath =
      __dirname + '/../../src/test/dot_files/simple_task_test.dot';
    const dotfileContent = fs.readFileSync(dotFilePath, 'utf8');
    [dotfileString, treeStructure] = splitDotfile(dotfileContent);
  });

  test('Dotfile parsing should work correctly.', async () => {
    await checkDotfileSplitting(dotfileString, treeStructure);
  });

  test('Container creation should work correctly.', () => {
    checkContainerCreation(dotfileString, treeStructure);
  });

  test('Node / Edge creation should work correctly.', () => {
    checkElementCreation(dotfileString);
  });
});

describe('addEdgeControlPoints', () => {
  it('should handle slope being 0', () => {
    checkControlPointsWhenSlopeIs0();
  });

  it('should handle slope being infinity', () => {
    checkControlPointsWhenSlopeIsInfinity();
  });

  it('should calculate control point distances and weights correctly', () => {
    checkControlPointsWhenSlopeIsValid();
  });
});

describe('getFinalGraphElements', () => {
  it('should return an empty array if no nodes, edges, or containers are provided', () => {
    checkGetFinalGraphElementsWithEmptyInputs();
  });

  it('should convert nodes, edges, and containers into cytoscape expressions', () => {
    checkGetFinalGraphElementsWithNormalInputs();
  });
});

describe('TransformEdgeIntoCytoscapeExpression', () => {
  it('should transform an edge into a cytoscape expression', () => {
    checkTransformEdgeIntoCytoscapeExpression();
  });
});

describe('TransformNodeIntoCytoscapeExpression', () => {
  it('should transform a node into a cytoscape expression', () => {
    checkTransformNodeIntoCytoscapeExpressionForNormalNode();
  });

  it('should transform a node with token into a cytoscape expression', () => {
    checkTransformNodeIntoCytoscapeExpressionForTokenNode();
  });
});

function checkDotfileSplitting(dotfileString, treeStructure) {
  expect(typeof dotfileString).toBe('string');
  expect(dotfileString).toContain('node_0');
  expect(dotfileString).toContain('node_1');
  expect(dotfileString).toContain('node_2');
  expect(dotfileString).toContain('node_3');
  expect(dotfileString).toContain('node_4');
  expect(dotfileString).toContain('node_5');
  expect(dotfileString).toContain('node_6');
  expect(dotfileString).toContain('node_7');
  expect(dotfileString).not.toContain('node_8');

  expect(dotfileString).toContain('digraph');
  expect(dotfileString).toContain('subgraph');
  expect(dotfileString).not.toContain('call_tree');

  expect(typeof treeStructure).toBe('object');
  expect(treeStructure.children).toBeArrayOfSize(1);
  expect(treeStructure.name).toBe('productionTask');

  const paintingTask = treeStructure.children[0];
  expect(paintingTask.children).toBeArrayOfSize(1);
  expect(paintingTask.name).toBe('painting');

  const painting = paintingTask.children[0];
  expect(painting.children).toBeArrayOfSize(0);
  expect(painting.name).toBe('Painting');
}

function checkContainerCreation(dotfileString, treeStructure) {
  const containers = buildTreeStructure(treeStructure, dotfileString, true);

  expect(containers).toBeArrayOfSize(3);

  const productionTask = containers.find(
    (container) => container.label == 'productionTask'
  );
  expect(productionTask).toBeDefined();
  expect(productionTask.level).toBe(0);
  expect(productionTask.parentId).toBeNull();
  expect(productionTask.fillColor).toBe('#000'); // predefined Task color
  const productionTaskId = productionTask.id;

  const paintingTask = containers.find(
    (container) => container.label == 'painting'
  );
  expect(paintingTask).toBeDefined();
  expect(paintingTask.level).toBe(1);
  expect(paintingTask.parentId).toBe(productionTaskId);
  expect(paintingTask.fillColor).toBe('#000'); // predefined Task color
  const paintingTaskId = paintingTask.id;

  const paintingService = containers.find(
    (container) => container.label == 'Painting'
  );
  expect(paintingService).toBeDefined();
  expect(paintingService.level).toBe(2);
  expect(paintingService.fillColor).toBe('#111'); // predefined Service color
  expect(paintingService.parentId).toBe(paintingTaskId);
}

function checkElementCreation(dotfileString) {
  const parse = require('dotparser');

  const parsedContent = parse(dotfileString)[0];
  const [nodes, edges] = parseElementsFromDotFileString(parsedContent, true);

  expect(nodes).toBeArrayOfSize(8);
  expect(edges).toBeArrayOfSize(7);

  const rectangles = [];
  const ellipses = [];

  nodes.forEach((node) =>
    node.label == '' ? rectangles.push(node) : ellipses.push(node)
  );

  expect(rectangles).toBeArrayOfSize(3);
  expect(ellipses).toBeArrayOfSize(5);

  rectangles.forEach((node) => expect(node.shape).toBe('rectangle'));

  const nodeLabels = [
    'Painting started',
    'Painting finished',
    'Painting done',
    'productionTask_started',
    'productionTask_finished'
  ];
  ellipses.forEach((node) => {
    expect(node.shape).toBe('ellipse');
    expect(nodeLabels).toContain(node.label);
    nodeLabels.splice(nodeLabels.indexOf(node.label), 1);
  });
  expect(nodeLabels).toBeEmpty();
}

function checkControlPointsWhenSlopeIs0() {
  const edgePoints = [
    { x: 1, y: 2 }, // first point is always on first position
    { x: 5, y: 6 }, // last point is always on second position
    { x: 3, y: 4 } //... additional points
  ];
  const edgeStart = { x: 1, y: 2 };
  const edgeStop = { x: 5, y: 6 };
  const edge: Edge = {
    fromNodeId: 'id_0',
    toNodeId: 'id_1',
    controlPointDistances: [],
    controlPointWeights: []
  };
  const slope = 0;
  const intercept = 1;

  addEdgeControlPoints(edgePoints, edgeStart, edgeStop, edge, slope, intercept);

  // Assert that control point distances and weights remain empty
  expect(edge.controlPointDistances).toHaveLength(0);
  expect(edge.controlPointWeights).toHaveLength(0);
}

function checkControlPointsWhenSlopeIsInfinity() {
  const edgePoints = [
    { x: 1, y: 2 }, // first point is always on first position
    { x: 5, y: 6 }, // last point is always on second position
    { x: 3, y: 4 } //... additional points
  ];
  const edgeStart = { x: 1, y: 2 };
  const edgeStop = { x: 5, y: 6 };
  const edge: Edge = {
    fromNodeId: 'id_0',
    toNodeId: 'id_1',
    controlPointDistances: [],
    controlPointWeights: []
  };
  const slope = Infinity;
  const intercept = 1;

  addEdgeControlPoints(edgePoints, edgeStart, edgeStop, edge, slope, intercept);

  // Assert that control point distances and weights remain empty
  expect(edge.controlPointDistances).toHaveLength(0);
  expect(edge.controlPointWeights).toHaveLength(0);
}

function checkControlPointsWhenSlopeIsValid() {
  const edgePoints = [
    { x: 1, y: 0 }, // first point is always on first position
    { x: 3, y: 2 }, // last point is always on second position
    { x: 2, y: 100 } //... additional points
  ];
  const edgeStart = { x: 1, y: 2 };
  const edgeStop = { x: 5, y: 6 };
  const edge: Edge = {
    fromNodeId: 'id_0',
    toNodeId: 'id_1',
    controlPointDistances: [],
    controlPointWeights: []
  };
  const slope = 1;
  const intercept = 0;

  addEdgeControlPoints(edgePoints, edgeStart, edgeStop, edge, slope, intercept);

  // Assert that control point distances and weights are calculated correctly
  expect(edge.controlPointDistances).toHaveLength(1);
  expect(edge.controlPointDistances[0]).toBeLessThan(0);

  expect(edge.controlPointWeights).toHaveLength(1);
  expect(edge.controlPointWeights[0]).toBeGreaterThan(0);
}

const checkGetFinalGraphElementsWithEmptyInputs = () => {
  const nodes = [];
  const edges = [];
  const containers = [];

  const result = getFinalGraphElements(nodes, edges, containers);

  expect(result).toHaveLength(0);
};

const checkGetFinalGraphElementsWithNormalInputs = () => {
  const nodes: Node[] = [
    {
      id: 'node1',
      label: 'Node 1',
      shape: 'ellipse',
      fillColor: '#ffffff',
      height: 50,
      width: 50,
      isParent: false,
      order: 1,
      numberOfEdges: 1,
      xPosition: 100,
      yPosition: 100,
      tokenLabel: '',
      parentId: 'container1'
    },
    {
      id: 'node2',
      label: 'Node 2',
      shape: 'rectangle',
      fillColor: '#ffffff',
      height: 50,
      width: 50,
      isParent: false,
      order: 1,
      numberOfEdges: 1,
      xPosition: 200,
      yPosition: 200,
      tokenLabel: '',
      parentId: 'container1'
    }
  ];
  const edges: Edge[] = [
    {
      fromNodeId: 'node1',
      toNodeId: 'node2',
      controlPointDistances: [],
      controlPointWeights: []
    }
  ];
  const containers: Container[] = [
    {
      id: 'container1',
      label: 'Container 1',
      parentId: '',
      level: 1,
      fillColor: '#ffffff'
    }
  ];

  const result = getFinalGraphElements(nodes, edges, containers);

  expect(result).toHaveLength(4);

  // Assert container expression
  expect(result[0].group).toEqual('nodes');
  expect(result[0].data).toEqual({
    id: 'container1',
    label: 'Container 1',
    tippyContent: 'Container 1',
    parent: '',
    level: 1,
    yShift: 0
  });
  expect(result[0].classes).toEqual(['container']);
  expect(result[0].style).toEqual({ 'background-color': '#ffffff' });

  // Assert node expression
  expect(result[1].group).toEqual('nodes');
  expect(result[1].data).toEqual({
    id: 'node1',
    parent: 'container1',
    label: '',
    tippyContent: 'Node 1'
  });
  expect(result[1].classes).toEqual(['single_node', 'upper_round_node']);
  expect(result[1].position).toEqual({ x: 100, y: 100 });
  expect(result[1].style).toEqual({ 'background-color': '#ffffff' });

  // Assert node expression
  expect(result[2].group).toEqual('nodes');
  expect(result[2].data).toEqual({
    id: 'node2',
    parent: 'container1',
    label: '',
    tippyContent: 'Node 2'
  });
  expect(result[2].classes).toEqual(['transition_node']);
  expect(result[2].style).toEqual({ 'background-color': '#ffffff' });

  // Assert edge expression
  expect(result[3].group).toEqual('edges');
  expect(result[3].data).toEqual({ source: 'node1', target: 'node2' });
  expect(result[3].classes).toEqual(['straight']);
  expect(result[3].style).toEqual({
    'control-point-distances': [],
    'control-point-weights': []
  });
};

const checkTransformEdgeIntoCytoscapeExpression = () => {
  const edge = {
    fromNodeId: 'node1',
    toNodeId: 'node2',
    controlPointDistances: [1, 2, 3],
    controlPointWeights: [0.25, 0.5, 0.75]
  };
  const classNames = ['bezier'];

  const result = TransformEdgeIntoCytoscapeExpression(edge, classNames);

  expect(result.group).toEqual('edges');
  expect(result.data).toEqual({ source: 'node1', target: 'node2' });
  expect(result.classes).toEqual(['bezier']);
  expect(result.style).toEqual({
    'control-point-distances': [1, 2, 3],
    'control-point-weights': [0.25, 0.5, 0.75]
  });
};

const checkTransformNodeIntoCytoscapeExpressionForNormalNode = () => {
  const node = {
    id: 'node1',
    label: 'Node 1',
    shape: 'ellipse',
    fillColor: '#ffffff',
    height: 50,
    width: 50,
    isParent: false,
    order: 1,
    numberOfEdges: 1,
    xPosition: 100,
    yPosition: 100,
    tokenLabel: '',
    parentId: 'container1'
  };

  const result = TransformNodeIntoCytoscapeExpression(node);

  expect(result).toHaveLength(1);
  expect(result[0].group).toEqual('nodes');
  expect(result[0].data).toEqual({
    id: 'node1',
    label: '',
    tippyContent: 'Node 1',
    parent: 'container1'
  });
  expect(result[0].classes).toEqual(['single_node', 'upper_round_node']);
  expect(result[0].position).toEqual({ x: 100, y: 100 });
  expect(result[0].style).toEqual({ 'background-color': '#ffffff' });
};

const checkTransformNodeIntoCytoscapeExpressionForTokenNode = () => {
  const node = {
    id: 'node2',
    label: 'Node 2',
    shape: 'ellipse',
    fillColor: '#ffffff',
    height: 50,
    width: 50,
    isParent: false,
    order: 1,
    numberOfEdges: 1,
    xPosition: 200,
    yPosition: 200,
    tokenLabel: '&bull;',
    parentId: 'container1'
  };

  const result = TransformNodeIntoCytoscapeExpression(node);

  expect(result).toHaveLength(2);

  // Assert node expression
  expect(result[0].group).toEqual('nodes');
  expect(result[0].data).toEqual({
    id: 'node2',
    parent: 'node2_token',
    label: '&bull;',
    tippyContent: 'Node 2'
  });
  expect(result[0].classes).toEqual(['single_node', 'token_node']);
  expect(result[0].position).toEqual({ x: 200, y: 200 });
  expect(result[0].style).toEqual({ 'background-color': '#ffffff' });

  // Assert token expression
  expect(result[1].group).toEqual('nodes');
  expect(result[1].data).toEqual({
    id: 'node2_token',
    parent: 'container1',
    label: '',
    tippyContent: 'Node 2'
  });
  expect(result[1].classes).toEqual(['upper_round_node', 'token_label']);
  expect(result[1].position).toBeNull;
  expect(result[1].style).toBeNull;
};
