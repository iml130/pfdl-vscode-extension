// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Split a given string to enable line breaks when printing messages with the canvas
 * @param ctx the canvas contex
 * @param message the message to be displayed in the canvas
 * @param startOfLineX the x position where the first line starts
 * @param StartOfLineY the y position where the first line starts
 * @param maxLineWidth the maximum width of a string that is displayed in one line
 * @param lineHeight the height after a linebreak
 * @returns an array with the passed message, splitted into lines to fit the passed maxLineWidth
 */
const splitMessageByLines = (
  ctx: CanvasRenderingContext2D,
  message: string,
  startOfLineX: number,
  StartOfLineY: number,
  maxLineWidth: number,
  lineHeight: number
) => {
  const words: string[] = message.split(' ');
  let currentLineContent = '';
  const wordsPerLine = [];

  for (const word of words) {
    currentLineContent += word;
    const lineWidth = ctx.measureText(currentLineContent).width;

    if (lineWidth > maxLineWidth && currentLineContent.length > word.length) {
      // word does not fit into the current line, so do a linebreak
      wordsPerLine.push([
        currentLineContent.slice(0, -word.length),
        startOfLineX,
        StartOfLineY
      ]);

      // start a new line
      currentLineContent = word + ' ';
      StartOfLineY += lineHeight;
    }
    currentLineContent += ' ';
  }
  // add the final words
  wordsPerLine.push([currentLineContent, startOfLineX, StartOfLineY]);

  return wordsPerLine;
};

/**
 * Draws a red circle on top of the canvas, containing a white x
 * @param ctx the canvas contex
 * @param circleWidth the width of the error symbol circle to draw
 * @param circleHeight the height of the error symbol circle to draw
 * @param circleRadius the radius of the error symbol circle to draw
 * @param whiteXWidth the line width of the white X to draw
 * @param whiteXBorderWidth the border line width of the white X to draw
 */
const drawErrorSymbol = (
  ctx,
  circleWidth,
  circleHeight,
  circleRadius,
  whiteXWidth,
  whiteXBorderWidth
) => {
  // red error circle
  ctx.beginPath();
  ctx.arc(circleWidth, circleHeight, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    '--error-button-color'
  );
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();

  // white "X"
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = whiteXBorderWidth;

  // draw a black border line from top left to bottom right
  ctx.moveTo(
    Math.sin(Math.PI / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos(Math.PI / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.lineTo(
    Math.sin((5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos((5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.stroke();

  // draw the same line in white
  ctx.strokeStyle = 'white';
  ctx.lineWidth = whiteXWidth;
  ctx.stroke();

  // draw a black border line from top right to bottom left
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = whiteXBorderWidth;
  ctx.moveTo(
    Math.sin(-Math.PI / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos(Math.PI / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.lineTo(
    Math.sin((-5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos((5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.stroke();
  // draw the same line in white
  ctx.strokeStyle = 'white';
  ctx.lineWidth = whiteXWidth;
  ctx.stroke();

  // draw the first line again in white so there are no black borders inside of the X
  ctx.beginPath();
  ctx.strokeStyle = 'white';
  ctx.moveTo(
    Math.sin((-5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos(Math.PI / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.lineTo(
    Math.sin(-Math.PI / 4) * ((5 / 6) * circleRadius) + circleWidth,
    Math.cos((5 * Math.PI) / 4) * ((5 / 6) * circleRadius) + circleHeight
  );
  ctx.lineWidth = whiteXWidth;
  ctx.stroke();
};

/**
 * Create a cavas to display error messages
 */

// set the canvas properties
const errorCanvas = document.getElementById('errorCanvas') as HTMLCanvasElement;
const errorCanvasWidth = window.innerWidth;
errorCanvas.width = errorCanvasWidth;
const errorCanvasHeight = window.innerHeight;
errorCanvas.height = errorCanvasHeight;
const errorCtx = errorCanvas.getContext('2d');

// set some constants that have been found to fit well
//// scale the constants accoring to the display width
const errorCanvasScalingFactor = errorCanvasWidth / 600;
//// properties of the error symbol
const errorCanvasCircleRadius = 60 * errorCanvasScalingFactor;
const errorCanvasCircleWidth = errorCanvasWidth / 2; // the width of the error sign
const errorCanvasCircleHeight = errorCanvasHeight / 5; // the height of the error sign
const errorCanvasWhiteXWidth = 9 * errorCanvasScalingFactor;
const errorCanvasWhiteXBorderWidth = 10 * errorCanvasScalingFactor;
//// properties of the introduction text that there exist errors
const errorIntroductionFontSize = 30 * errorCanvasScalingFactor;
const errorIntroductionLineStartX = errorCanvasWidth / 2;
const errorIntroductionLineStartY =
  errorCanvasCircleHeight + 2 * errorCanvasCircleRadius;
const errorIntroductionLineHeight = 35 * errorCanvasScalingFactor;
//// properties of the displayed error messages
const errorMessagesFontSize = 20 * errorCanvasScalingFactor;
const errorMessagesLineHeight = 25 * errorCanvasScalingFactor;
const errorMessagesLeftBorderX = errorCanvasWidth / 10;
const errorMessagesRightBorderX = errorCanvasWidth * (8 / 10);
const errorCanvasSpaceBeforeFirstError = 200; // space between error symbol and first error message
// determine the height where to display the first error message
const errorMessagesLineStartY =
  errorCanvasCircleHeight +
  2 * errorCanvasCircleRadius +
  errorCanvasSpaceBeforeFirstError * errorCanvasScalingFactor;
errorCtx.font = String(errorMessagesFontSize) + 'px arial';
errorCtx.textAlign = 'left';

// split the error messages to fit the canvas line width
const errorMessagesString =
  document.getElementById('errorMessagesDiv').innerText;
const errorMessages = errorMessagesString.split('\n');
const wrappedMessagesByLine = [];
let maxHeight = errorMessagesLineStartY; // used to detect if the canvas contains more elements than the height can display
for (const errorMessage of errorMessages) {
  const wrappedMessages = splitMessageByLines(
    errorCtx,
    errorMessage,
    errorMessagesLeftBorderX,
    maxHeight,
    errorMessagesRightBorderX,
    errorMessagesLineHeight
  );

  // line break per line
  maxHeight += errorMessagesLineHeight * wrappedMessages.length;
  // additional line break
  maxHeight += 20 * errorCanvasScalingFactor;
  wrappedMessagesByLine.push(wrappedMessages);
}

if (errorCanvasHeight > maxHeight) {
  maxHeight = errorCanvasHeight;
}
// readjust canvas height if too many error messages
errorCanvas.height = maxHeight;

// draw the error symbol
drawErrorSymbol(
  errorCtx,
  errorCanvasCircleWidth,
  errorCanvasCircleHeight,
  errorCanvasCircleRadius,
  errorCanvasWhiteXWidth,
  errorCanvasWhiteXBorderWidth
);

// print introduction text that there exist errors
errorCtx.font = String(errorIntroductionFontSize) + 'px arial';
errorCtx.fillStyle = '#000000';
errorCtx.textAlign = 'center';
errorCtx.fillText(
  'Errors exist in',
  errorIntroductionLineStartX,
  errorIntroductionLineStartY
);
errorCtx.fillText(
  'the selected PFDL program!',
  errorIntroductionLineStartX,
  errorIntroductionLineStartY + errorIntroductionLineHeight
);

// print error messages
errorCtx.font = String(errorMessagesFontSize) + 'px arial';
errorCtx.textAlign = 'left';
for (const message of wrappedMessagesByLine) {
  message.forEach(function (item) {
    errorCtx.fillText(item[0], item[1], item[2]);
  });
}
