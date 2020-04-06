# Assignment 3: A 3D Paint Program

This is an INDIVIDUAL assignment.
 
## Due: Monday March 23th, 11:59pm

Originally was going to have this due before spring break, but since some students will be here during the break and will prefer to use the break to do work, I'm making it due after to give you more flexibility.

## Name and GT user-id

Name: Spencer Shook
User ID: 903113309

## Rubric

Graded out of 20.
- line creation (tool rendered near tip, correct end points, ribbon creation, color and texturing).  6
- stroke creation (tool rendered near tip, correct end points, ribbon creation, optimization, color and texturing).  10
- eraser implementation (tool rendered near tip, remove strokes touched). 4

## Objective

In this homework assignment, you will use one of the 3D UI's you created in A2 as the basis for a simple drawing program.  (You may make changes to your A2, you do not have to use one of the exact UI's you implemented.)

You will implement something akin to one of the many paint programs out there.  You should look at videos of applications like [Tilt Brush](https://www.youtube.com/watch?v=MaTxlwSTXYk) (or, if try it out if you have access), or web-based implementations like [A-Painter](https://www.youtube.com/watch?v=l2nqVdqnc2o) (I cannot find a working version of A-Painter right now, unfrotunately).  There is also an example for threejs, the [threejs webxr paint example](https://threejs.org/examples/?q=vr#webxr_vr_paint), which you'll see uses a simple [TubePainter utility library](https://github.com/mrdoob/three.js/blob/master/examples/jsm/misc/TubePainter.js) that might provide some hints regarding math and coordinates (even though it's implemented in three.js, not Babylon).

## Description

During the three non-project assignments this semester, we will be creating an interactive 3D drawing program. Each homework assignment will build on the previous one, focusing on different aspects of the 3D interface. 

In this final homework, we'll take the 3D immersive interface created in A2, using existing Babylon GUI components, and implement a simple paint program using it. You'll gain experience creating an application data structure that maps to a set of graphical components.

The program should be have as follows.  For each of the 3 modes, a visual "tool tip" should be drawn just past the end of the controller to show where the effect of the action will happen.

1. In stroke mode, the tool is a straight line, perpendicular to the direction of the controller (i.e., lying in the X axis of the controller coordinate system).  A button press starts a paint stroke.  The stroke continues being created until the button is released.  The stroke is a ribbon corresponding to the size of the tool line.  See below for details on color, texture and line segments.
2. In Line mode, a similar tool appears at the tip of the controller.  A button press starts a line, and a single straight stroke is create when the button is released.  The line is a ribbon as well, as with the stroke (the ribbon may be twisted, depending on the orientation of the controller at the start and the end.)
3. In Erase mode, the tool is a small sphere.  Any stroke or line touched by the sphere is completely removed.
4. The color and texture of the ribbons are defined by the selected texture and color.

## Stroke Details

When the user draws a stroke, you should store all of the intermediate positions along the stroke that are received between a button down and button up.  But you should not use all of those intermediate values, since they will not all add to the visual fidelity of the stroke, and will impose unnecessary rendering burden.

There are two things that you need to manage that are not immediately obvious from the description of stroke creation: texturing, and managing the number of segments on the stroke.

### Stroke Segments

A stroke will be represented by a flat mesh.  You can see examples of how to create them in Babylon [here](https://doc.babylonjs.com/how_to/ribbon_tutorial).  Your program should skip recorded points for a stoke that aren't "visually necessary".  

At a minimum, you should look at the angle between two segments, as well as the length of the segments, to try and use the simplest stroke without compromising visual fidelity of the original stroke too much. The simplest approach is to combine short segments if the resulting segment is still shorter than some threshold, and if the two segments are close to co-linear (the angle between them is close to 180 degrees).  The stroke length threshold could be reasonably long;  test different values.

Consider the stroke in this diagram: 

![Sample Stroke](/images/stroke-diagram.png)

Starting at (1), we would add (1-2) and (2-3) because the angle (A) between them is far from 180 degrees. Similarly, even though (3-4) is short, angle (B) far enough from 180 degrees that you should add (3-4). (4-5) is almost co-linear with (3-4), so combine (3-4) and (4-5) into (3-5).  Similarly, lets assume adding (5-6) would keep (3-6) within your length threshold, so combine (3-5) and (5-6) into (3-6). Perhaps (6-7) would make the line too long, or perhaps angle (F) is deemed far enough from 180 degrees that you don't want to combine this segment, so add (6-7).  Similarly, you end up combining (7-9), but will not combine with (9-10) because of the angle (C).   

You will need to continually recreate and extend the stroke as you draw it.

### Texturing

There are a few approaches you could take to mapping how textures work, and they depend on the textures and what you are trying to achieve.  For example, consider the two different sorts of textures below (downloaded from https://svgsilh.com):

![Splat Texture](/images/42890.png)
![Stroke Textures](/images/1237742.png)

You may decide that for the "splatter" texture (or similar images) you want to keep the sample relative shape and repeat the texture over and over.  To do this, you would set texture coordinates such that they repeat outside of the 0..1 range along the length of the stroke, have the texture coordinates set at 0..1 across the width of the stroke, and have the texture set to repeat. 

On the other hand, you may decide that for the more "brush stroke" like textures, you want to stretch the image so that the texture coordinates go from [0..1] over the full length of the stroke, and [0..1] along with width.  Alternatively, you could go from 0 to a small value like 0.25 at the start, 0.75 to 1 near the end, and then stretch 0.25 to 0.75 across the middle.  Or use some sort of smooth curve based on a simple sin/cos function to stretch the texture more evenly.  The choice is yours.

Each of these approaches are reasonable, depending on the images you are using.  You do not need to do more than one style for the basic assignment, but the textures you choose should make sense for the version you implement.

## Extra Credit

There are a variety of ways you can earn extra credit on this assignment, by improving the interaction in various ways. Each extra create will be worth up to 10% extra, depending on the quality of the implementation, and you may receive at most 20% bonus:
- When you save, save the highest detail version of the scene, instead of the reduced version.
- When you touch a stroke with the eraser, cause it to split the stroke instead of erasing the entire stroke. You should remove the set of segments of the stroke that correspond to the part the eraser touched. You would still keep the original stroke data (you'll need it for undoing) but create and keep track of the multiple visual strokes corresponding to the part of the stroke that is not "removed".  You should be careful not change the appearance of the texture on the line.   
- Map two of the controller buttons to the "next" and "previous" menu items, which should be changed to "undo" and "redo".  Keep track of the order of operations of your drawing, and be able to undo and redo them.
- Save will use Babylon's GLTF exporter (https://doc.babylonjs.com/extensions/gltfexporter) to export a glTF file of your current scene.
- Support different stroke widths.  You can use a UI (if you built one) for setting the stroke width, or you can use one of the thumb-sticks to adjust the width (adjusting the width will set the length of the tool line show at the controller tip, and the resulting ribbon width and erase sphere size.)
- have a mix of textures that require different ways of applying the textures (e.g. both the "splat" and "stroke" texture styles described above) and implement the appropriate style of texturing for each texture.
- instead of just doing a single ribbon for the strokes and lines, add a second style of painting that is more appropriate for "splat" textures.  In this style, you would choose a set of positions along the stroke path, and create a separate textured rectangle for each point, textured with the splat texture.  This would allow the splats to overlap and not be regularly joined.  You should slightly vary the size and orientation of the splat polygons along the length of the stroke.

## Submission

You will check out the project from github classroom, and submit it there.  The skeleton project is similar to A0, but you do not need to use any of it;  it is just provided as a starting point.  

The project folder should contain just the additions to the sample project that are needed to implement the project.  Do not add extra files or media you are not using, and do not remove the .gitignore file (we do not want the "node_modules" directory in your repository.)

**Do Not Change the names** of the main existing files (e.g., index.html and src/index.ts).  The TAs need to be able to test your program as follows:

1. cd into the directory and run ```npm install```
2. start a local web server and compile by running ```npm run start``` and pointing the browser at your ```index.html```

Please test that your submission meets these requirements.  For example, after you check in your final version of the assignment to github, check it out again to a new directory and make sure everything builds and runs correctly.
 
## Development Environment

The sample has been set up with a similar project for Typescript development as A0.

## Running 

You set up the initial project by pulling the dependencies from npm with 
```
npm install
```

After that, you can compile and run a server with:
```
npm run start
```

You do not have to run ```tsc``` to build the .js files from the .ts files;  ```npx``` builds them on the fly as part of running webpack.

You can run the sample by pointing your web browser at ```https://localhost:8080/index.html```

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">Material for 3D User Interfaces Spring 2020</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://github.blairmacintyre.me/cs3451-f19" property="cc:attributionName" rel="cc:attributionURL">Blair MacIntyre</a> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.

The intent of choosing (CC BY-NC-SA 4.0) is to allow individuals and instructors at non-profit entities to use this content.  This includes not-for-profit schools (K-12 and post-secondary). For-profit entities (or people creating courses for those sites) may not use this content without permission (this includes, but is not limited to, for-profit schools and universities and commercial education sites such as Corsera, Udacity, LinkedIn Learning, and other similar sites).