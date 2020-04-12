import * as Core from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { Color3, Vector3, StandardMaterial, _BabylonLoaderRegistered, Mesh, MeshBuilder, Texture } from "@babylonjs/core";
import { volumetricLightScatteringPixelShader } from "@babylonjs/core/Shaders/volumetricLightScattering.fragment";
var canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; // Get the canvas element 
var engine = new Core.Engine(canvas, true); // Generate the BABYLON 3D engine

var isStatusMaximized = false;
var messages: string[] = [];
var curMessageIndex = 0;
var totalMessagesCount = 0;
var messagesLimit = 200;

var statusBlock1: GUI.TextBlock;
var textSlider1: GUI.Slider;

// Texture URLs
var mosaicURL = "./textures/mosaic.jfif";
var marbleURL = "./textures/marble.jpg";
var leafURL = "./textures/Leaf.jpg";
var volcanicURL = "./textures/volcanic.jpg";
var plasterURL = "./textures/plaster.jpg";
var concreteURL = "./textures/concrete.jpg";

// VR additions
var vrHelper;
var leftController: Core.Nullable<Core.AbstractMesh>;
var rightController: Core.Nullable<Core.AbstractMesh>

var grabbedMesh: Core.Nullable<Core.AbstractMesh>;
var grabbableTag = "Grabbable";

var openScene = function() {
    setupVR();
}


/******* Add the Playground Class with a static CreateScene function ******/
class Playground { 
    public static CreateScene(engine: Core.Engine, canvas: HTMLCanvasElement): Core.Scene {
        // Create the scene space
        var scene = new Core.Scene(engine);

        // Add a camera to the scene and attach it to the canvas
        var camera = new Core.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, new Core.Vector3(0, 1, 0), scene);
        camera.attachControl(canvas, true);

        // Add lights to the scene
        var light1 = new Core.HemisphericLight("light1", new Core.Vector3(1, 1, 0), scene);

        var ground = Core.MeshBuilder.CreateGround("ground", {width: 10, height: 10}, scene);
        ground.position = new Vector3(0, -0.01, 0);

        var debugPlane = MeshBuilder.CreatePlane("debugPlane", {size: 1.5});
        debugPlane.position = new Vector3(-1.5, 0, 2);
        debugPlane.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        debugPlane.rotate(new Vector3(0, 1, 0), Math.PI * 3 / 2, Core.Space.WORLD);


        var debugTexture = GUI.AdvancedDynamicTexture.CreateForMesh(debugPlane);
        // debugTexture.background = "black";

        var menuBar = new GUI.StackPanel();
        menuBar.width = 1;
        menuBar.height = 0.1;
        menuBar.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        menuBar.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        menuBar.background = "black";
        menuBar.alpha = 0.6;
        menuBar.zIndex = -100;
        // debugTexture.addControl(menuBar);

        var statusBar = new GUI.StackPanel();
        statusBar.width = 1;
        statusBar.height = "80px";
        statusBar.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        statusBar.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        statusBar.background = "black";
        statusBar.alpha = 1;
        statusBar.zIndex = -100;
        debugTexture.addControl(statusBar);

        statusBlock1 = new GUI.TextBlock();
        statusBlock1.width = 0.9;
        statusBlock1.height = "80px";
        statusBlock1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        statusBlock1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        statusBlock1.textWrapping = GUI.TextWrapping.WordWrap
        statusBlock1.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        statusBlock1.zIndex = 0;
        statusBlock1.color = "white";
        debugTexture.addControl(statusBlock1);

        var statusButton = new GUI.Button("statusTitleButton");
        statusButton.width = 1;
        statusButton.height = "80px";
        statusButton.horizontalAlignment =  GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        statusButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        statusButton.top = "-90px";
        statusButton.background = "white";
        statusButton.color = "black";
        statusButton.alpha = 1;
        statusButton.onPointerClickObservable.add(
            function() {
                if (isStatusMaximized) {
                    isStatusMaximized = false;
                    statusButton.height = "80px"
                    statusButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
                    statusButton.top = "-90px";
                    statusButton.zIndex = 0;

                    statusBlock1.height = 0.1;
                    statusBlock1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
                    statusBlock1.top = "0px";

                    statusBar.height = "80px";
                    statusBar.alpha = 0.6;
                    statusBar.zIndex = -100;

                    textSlider1.height = "60px";
                    textSlider1.top = "-10px";
                    textSlider1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
                } else {
                    isStatusMaximized = true;
                    statusButton.height = 0.2
                    statusButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
                    statusButton.top = "0px";
                    statusButton.zIndex = 10;

                    statusBlock1.height = 0.9;
                    statusBlock1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
                    if (statusButton.textBlock) {
                        statusButton.textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                        statusButton.textBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
                    }
                    statusBlock1.top = "-0px";
                    statusBlock1.zIndex = 10;

                    statusBar.height = 0.9;
                    statusBar.zIndex = 5;
                    statusBar.alpha = 1;

                    textSlider1.height = 0.8;
                    textSlider1.top = "100px";
                    textSlider1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
                    textSlider1.zIndex = 10;
                }
            }
        )
        statusButton.onPointerClickObservable.add(statusButtonCallback);
        debugTexture.addControl(statusButton);

        textSlider1 = new GUI.Slider();
        textSlider1.minimum = 0;
        textSlider1.maximum = 0;
        textSlider1.value = 0;
        textSlider1.height = "60px";
        textSlider1.width = "15px";
        textSlider1.left = "-10px";
        textSlider1.top = "-10px";
        textSlider1.isVertical = true;
        textSlider1.step = 1;
        textSlider1.background = "white";
        textSlider1.color = "blue";
        textSlider1.zIndex = 1;
        textSlider1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        textSlider1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        textSlider1.onValueChangedObservable.add(textSliderCallback1);
        debugTexture.addControl(textSlider1);

        // add test spheres
        var rows = 5;
        var columns = 5;
        var x = 0.5;
        var y = 0.5;
        var z = 1.5;
        var scale = 0.2;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
                var sphere = MeshBuilder.CreateSphere(grabbableTag + " Sphere", {diameter: 0.1}, scene);
                sphere.position = new Vector3(x, y + i * scale, z + j * scale);
            }
        }
        
        return scene;
        
    }
}


/******* End of the create scene function ******/    
// code to use the Class above

var createScene = function() {
    return Playground.CreateScene(engine, engine.getRenderingCanvas() as HTMLCanvasElement);
}

//#region Callbacks

var statusButtonCallback = function() {
    logMessage("Clicked Status Title Bar");
}

var logMessage = function(message: string) {
    totalMessagesCount++;
    messages.push(totalMessagesCount + ". " + message);
    if (messages.length >= messagesLimit) {
        messages.shift();
    }
    curMessageIndex = messages.length - 1;

    updateStatusBlock1();

    textSlider1.maximum = message.length - 1;
    textSlider1.value = curMessageIndex;
}

var textSliderCallback1 = function() {
    textSlider1.maximum = messages.length - 1;
    curMessageIndex = textSlider1.value - textSlider1.value % 1;
    updateStatusBlock1();
}


//#endregion

var updateStatusBlock1 = function() {
    var newText = "";
    if (isStatusMaximized) {
        for (var i = 0; i < 20 && curMessageIndex - i >= 0; i++) {
            newText += messages[curMessageIndex - i] + "\n";
        }
    } else {
        newText = messages[curMessageIndex];
    }
    statusBlock1.text = newText;
}

var setupVR = function() {
    vrHelper = scene.createDefaultVRExperience();

    vrHelper.enableInteractions();

    vrHelper.onNewMeshPicked.add((pickingInfo) => {
        // new mesh pick callback
        // handle selection?
    });

    vrHelper.onNewMeshSelected.add(function(mesh) {
        if (mesh.name.indexOf(grabbableTag) != -1) {
            grabbedMesh = mesh;
        }
    });

    vrHelper.onSelectedMeshUnselected.add(function() {
        grabbedMesh = null;
    });

    vrHelper.onControllerMeshLoaded.add((webVRController) => {
        if (webVRController.hand == 'left') {
            leftController = webVRController.mesh;
        } else {
            rightController = webVRController.mesh;
        }

        // left: Y and right: B
        webVRController.onSecondaryButtonStateChangedObservable.add((stateObject: { pressed: boolean; }) => {
            if (webVRController.hand === 'left') {
                if (stateObject.pressed === true) {
                    //toggleMenuVisible();
                    logMessage("Pressed Y button on left controller");
                }
            } else {
                if (stateObject.pressed === true) {
                    logMessage("Pressed B button on right controller");
                } else if (stateObject.pressed === false) {

                }

            }
        });

        // A button
        // left: X and right: A
        webVRController.onMainButtonStateChangedObservable.add((stateObject: { pressed: boolean; }) => {
            if (webVRController.hand == 'left') {
                if (stateObject.pressed == true) {
                    logMessage("Pressed X on left controller");
                } 
            } else {
                if (stateObject.pressed === true) {
                    logMessage("Pressed A on right controller");
                }
            }
        });

        // Triggers
        var leftLastTriggerValue: number;
        var rightLastTriggerValue: number;
        webVRController.onTriggerStateChangedObservable.add((stateObject: { value: number; }) => {
            if (webVRController.hand == "left") {
                if (grabbedMesh != null) {
                    logMessage("Grabbed: " + grabbedMesh.name);
                    var m = webVRController.mesh;
                    if (m != null) {
                        m.addChild(grabbedMesh);
                    } else {
                        logMessage("WebVR controller didn't have a mesh.");
                    }
                }
            } else {
                if (rightLastTriggerValue && rightLastTriggerValue < 0.9 && stateObject.value >= 0.9) {
                    logMessage("Pressed Right Primary Trigger");
                    // handleTriggerPressed(webVRController.devicePosition.clone());
                }
                rightLastTriggerValue = stateObject.value;
            }
        });
        
    });

}

var scene = createScene();
openScene();

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () { 
    engine.resize();
});