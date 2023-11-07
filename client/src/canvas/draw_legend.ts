// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Draw a rectangle in the passed canvas context where the corners are rounded with the specified radius
 * @param ctx the canvas context
 * @param rectLeftX the x coordinate of the top left corner of the new rectangle
 * @param rectTopY the y coordinate of the top left corner of the new rectangle
 * @param rectWidth the width of the new rect
 * @param rectHeight the height of the new rect
 * @param rectRadius the radius of the new rect
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  rectLeftX: number,
  rectTopY: number,
  rectWidth: number,
  rectHeight: number,
  rectRadius: number
) {
  const rectRightX: number = rectLeftX + rectWidth;
  const rectBottomY: number = rectTopY + rectHeight;

  ctx.beginPath();
  // start at top left corner
  ctx.moveTo(rectLeftX + rectRadius, rectTopY);
  ctx.lineTo(rectRightX - rectRadius, rectTopY);
  // rounded corner for top right corner
  ctx.quadraticCurveTo(rectRightX, rectTopY, rectRightX, rectTopY + rectRadius);
  ctx.lineTo(rectRightX, rectBottomY - rectRadius);
  // rounded corner for bottom right corner
  ctx.quadraticCurveTo(
    rectRightX,
    rectBottomY,
    rectRightX - rectRadius,
    rectBottomY
  );
  ctx.lineTo(rectLeftX + rectRadius, rectBottomY);
  // rounded corner for bottom left corner
  ctx.quadraticCurveTo(
    rectLeftX,
    rectBottomY,
    rectLeftX,
    rectBottomY - rectRadius
  );
  ctx.lineTo(rectLeftX, rectTopY + rectRadius);
  // rounded corner for top left corner
  ctx.quadraticCurveTo(rectLeftX, rectTopY, rectLeftX + rectRadius, rectTopY);
  ctx.stroke();
}

/**
 * Create a canvas that cotains the legend for code visualization elements
 */

// set the canvas properties
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const width = window.innerWidth;
canvas.width = width;
const scalingFactor = width / 400; // adjust the legend size according to the screen width
canvas.height = 460 * scalingFactor;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

// style properties for the legend that are found to fit well
//// circles
const circleRadius = 15 * scalingFactor;
const circleX = 30 * scalingFactor;
const orderedCircleColorsAndLabels = [
  ['--component-started-color', 'Component started'],
  ['--component-finished-color', 'Component finished'],
  ['--component-done-color', 'Component done'],
  ['--statement-passed-color', 'Statement passed'],
  ['--statement-failed-color', 'Statement failed'],
  ['--statement-entry-color', 'Loop / Condition entry']
];
//// boxes
const rectX = 17 * scalingFactor;
const rectWidth = 27 * scalingFactor;
const rectBorderRadius = 6 * scalingFactor;
const orderedBoxColorsAndLabels = [
  ['--task-box-color', 'Task'],
  ['--service-box-color', 'Service'],
  ['--condition-box-color', 'Condition'],
  ['--loop-box-color', 'Loop'],
  ['--parallel-box-color', 'Parallel']
];
//// descriptionText
const textX = 80 * scalingFactor;
//// entries
const lineWidth = 2 * scalingFactor;
const lineHeight = 40 * scalingFactor;
const objectsHeightDifferenceCircleAndBox = -10 * scalingFactor; // the boxes are bigger, so make the gap between the circle and box smaller
let objectsLineStartY = 30 * scalingFactor;
const fontSize = 27 * scalingFactor;
const textHeightDifferenceCircleAndBox = 4 * scalingFactor; // same as for the objects
let textLineStartY = 39 * scalingFactor;

// draw the legend symbols as coloured circles and rectangles

// draw the circles
for (const [circleColor, circleLabel] of orderedCircleColorsAndLabels) {
  // draw the colored circle
  ctx.beginPath();
  ctx.arc(circleX, objectsLineStartY, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    circleColor
  );
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // draw the label
  ctx.font = String(fontSize) + 'px arial';
  ctx.fillStyle = '#000000';
  ctx.fillText(circleLabel, textX, textLineStartY);

  // set the start height for the next line
  objectsLineStartY += lineHeight;
  textLineStartY += lineHeight;
}

// adjust the start height for the next line when switching from circle to box
objectsLineStartY += objectsHeightDifferenceCircleAndBox;
textLineStartY += textHeightDifferenceCircleAndBox;

// draw the boxes
for (const [boxColor, boxLabel] of orderedBoxColorsAndLabels) {
  ctx.beginPath();
  drawRoundedRect(
    ctx,
    rectX,
    objectsLineStartY,
    rectWidth,
    rectWidth,
    rectBorderRadius
  );
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    boxColor
  );
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // draw the label
  ctx.font = String(fontSize) + 'px arial';
  ctx.fillStyle = '#000000';
  ctx.fillText(boxLabel, textX, textLineStartY);

  // set the start height for the next line
  objectsLineStartY += lineHeight;
  textLineStartY += lineHeight;
}
