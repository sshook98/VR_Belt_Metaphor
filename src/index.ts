import * as Core from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { Color3, Vector3, StandardMaterial, _BabylonLoaderRegistered, Mesh, MeshBuilder, Texture, WebVRController, Sound, CubeTexture, Axis, Space, WebXRCamera } from "@babylonjs/core";
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
var groundTexture = "./Textures/ground.jpg";
var skyTexture = "./Textures/sky";

// Sound URLs
var grabURL = "./textures/grab.wav";
var releaseURL = "./textures/release.TODO";

// Sounds
var grabSound: Core.Sound;
var releaseSound;

// VR additions
var vrHelper: Core.VRExperienceHelper;

var belt: Belt;
var belt_height = 0.1;
// var beltObjects: GrabbableObject[];
var shrinkingObjects: GrabbableObject[] = [];
var growingObjects: GrabbableObject[] = [];
var outsideObjects: GrabbableObject[] = [];
// var extraBeltObjects: GrabbableObject[];

var leftGrabbedMesh: Core.Nullable<Core.AbstractMesh>;
var rightGrabbedMesh: Core.Nullable<Core.AbstractMesh>;
var isLeftTriggerDown = false;
var isRightTriggerDown = false;

var grabbableTag = "Grabbable";
var grabDistance = 0.1;

var openScene = function() {
    setupVR();
}

class GrabbableObject {
    mesh: Core.AbstractMesh;
    initialBoundingMaxLength: number;
    attachedToBelt: boolean;
    constructor(mesh:Core.AbstractMesh, ) {
        this.mesh = mesh;
        this.initialBoundingMaxLength = Math.max(mesh._boundingInfo?.maximum.x!, mesh._boundingInfo?.maximum.y!, mesh._boundingInfo?.maximum.z!);
        this.attachedToBelt = false;
    }
}

class Belt {
    belt_mesh: Core.AbstractMesh;
    belt_pushedIndex: number[]; //if ball attached to position 2, belt_index: [2], beltObjects: [ball] -> ball at index 0 of beltObjects
    belt_vertices: Vector3[];
    beltObjects: GrabbableObject[];
    extraBeltObjects: GrabbableObject[];
    constructor(belt_mesh: Core.AbstractMesh, numSides: number, belt_radius: number) {
        this.belt_mesh = belt_mesh;
        this.belt_pushedIndex = [];
        this.belt_vertices = [];
        this.beltObjects = [];
        this.extraBeltObjects = [];

        for (var i = 0; i < numSides; i++) {
            var angle = i * Math.PI * 2 / numSides;
            var x = belt_mesh.position.x + belt_radius * Math.sin(angle);
            var y = belt_mesh.position.y;
            var z = belt_mesh.position.z + belt_radius * Math.cos(angle);
            this.belt_vertices.push(new Vector3(x, y, z));
        }
    }
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

        var ground = Core.MeshBuilder.CreateGround("ground", {width: 30, height: 30}, scene);
        var ground_mat = new StandardMaterial("ground_mat", scene);
        ground_mat.diffuseTexture = new Texture(groundTexture, scene);
        ground.material = ground_mat;
        ground.position = new Vector3(0, -1.5, 0);

        var skybox = MeshBuilder.CreateBox("skyBox", {size:500.0}, scene);
        skybox.position.y += (250 - 1 + ground.position.y);
        var skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture(skyTexture, scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

        var debugPlane = MeshBuilder.CreatePlane("debugPlane", {size: 1.5});
        debugPlane.position = new Vector3(-1.5, ground.position.y + 0.5, 2);
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
                var sphere_object = new GrabbableObject(sphere);
                outsideObjects.push(sphere_object);
            }
        }

        grabSound = new Sound("grabSound", grabURL, scene, null, {autoplay: false, loop: false});
        releaseSound = new Sound("releaseSound", releaseURL, scene, null, {autoplay: false, loop: false});
        
        //Belt
        var belt_mat = new StandardMaterial("belt_mat", scene);
        belt_mat.diffuseColor = new Color3(134/255.0, 69/255.0, 0);
 
        var path = [];
        
        var segLength = belt_height;
        var numSides = 8;
        var belt_radius = 0.2;
        
        for(var i = 0; i < 2; i++) {
            var x = i * segLength;
            var y = 0;
            var z = 0;
            path.push(new Vector3(x, y, z));
            
        }
        var belt_mesh = MeshBuilder.CreateTube("belt", {path: path, radius: belt_radius, sideOrientation: Mesh.DOUBLESIDE, updatable: true, tessellation: numSides}, scene);
        belt_mesh.material = belt_mat;
        belt_mesh.rotate(Axis.Z, Math.PI / 2, Space.WORLD);
        belt = new Belt(belt_mesh, numSides, belt_radius);

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
    
    console.log(message);
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

    scene.onBeforeRenderObservable.add(()=>{
        if (belt != null && vrHelper.webVRCamera) {
            belt.belt_mesh.position = vrHelper.webVRCamera.devicePosition;
            belt.belt_mesh.position.y -= 0.7;
            // belt.position.z -= 0.2;
        }
    });
    
    vrHelper.onControllerMeshLoaded.add((webVRController) => {
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
        webVRController.onTriggerStateChangedObservable.add((stateObject: { value: number; }) => {
            if (webVRController.hand == 'left') {
                if (isLeftTriggerDown && stateObject.value < 0.9) {
                    handleTriggerReleased(webVRController);
                } else if (!isLeftTriggerDown && stateObject.value >= 0.9) {
                    handleTriggerPressed(webVRController);
                }
            } else {
                if (isRightTriggerDown && stateObject.value < 0.9) {
                    handleTriggerReleased(webVRController);
                } else if (!isRightTriggerDown && stateObject.value >= 0.9) {
                    handleTriggerPressed(webVRController);
                }
            }
        });
        
    });

}

var handleTriggerPressed = function(webVRController: Core.WebVRController) {
    var pos = webVRController.devicePosition;
    if (webVRController.hand == 'left') {
        isLeftTriggerDown = true;
        // check if there is a grabbable mesh nearby
        var meshes = scene.meshes;
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            if (isMeshGrabbable(mesh)) {
                var otherPos = mesh.position;
                var dist = Vector3.Distance(pos, otherPos);
                if (dist < grabDistance) {
                    if (leftGrabbedMesh != null) {
                        if (webVRController != null && webVRController.mesh != null) {
                            if (webVRController.mesh.getChildMeshes().includes(leftGrabbedMesh)) {
                                webVRController.mesh.removeChild(leftGrabbedMesh);
    
                            }
                        } else {
                            logMessage("Error: leftController was null");
                        }
                        leftGrabbedMesh = null;
                    }
    
                    leftGrabbedMesh = mesh;
                    if (webVRController != null && webVRController.mesh != null) {
                        webVRController.mesh.addChild(leftGrabbedMesh);
                        grabSound.play();
                    } else {
                        logMessage("Error: leftController was null");
                    }
                    logMessage("Got a mesh that is " + dist + " away");
                    return;
                }
            }
        }
    } else {
        isRightTriggerDown = true;
        var meshes = scene.meshes;
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            if (isMeshGrabbable(mesh)) {
                var otherPos = mesh.position;
                var dist = Vector3.Distance(pos, otherPos);
                if (dist < grabDistance) {
                    if (rightGrabbedMesh != null) {
                        if (webVRController != null && webVRController.mesh != null) {
                            if (webVRController.mesh.getChildMeshes().includes(rightGrabbedMesh)) {
                                webVRController.mesh.removeChild(rightGrabbedMesh);
                            }
                        } else {
                            logMessage("Error: rightController was null");
                        }
                        rightGrabbedMesh = null;
                    }
    
                    rightGrabbedMesh = mesh;
                    if (webVRController != null && webVRController.mesh != null) {
                        webVRController.mesh.addChild(rightGrabbedMesh)
                    } else {
                        logMessage("Error: rightController was null");
                    }
                }
            }
            
        }
    }
}

var pushToBelt = function(grabbedMesh: Core.AbstractMesh) {
    var minIndex = -1;
    var minDistance = 999999;
    for (var i = 0; i < belt.belt_vertices.length; i++) {
        if (belt.belt_pushedIndex.indexOf(i) == -1) {
            var curr = Math.pow(belt.belt_vertices[i].x - grabbedMesh.position.x, 2) + 
                Math.pow(belt.belt_vertices[i].y - grabbedMesh.position.y, 2) +
                Math.pow(belt.belt_vertices[i].z - grabbedMesh.position.z, 2);
            if (curr < minDistance) 
            {
                minDistance = curr;
                minIndex = i;
            }
        }
    }
    if (minIndex != -1 && minDistance < 0.01) {
        grabbedMesh.position = belt.belt_vertices[minIndex];
        shrinkingObjects.push(new GrabbableObject(grabbedMesh));
    }
}

var handleTriggerReleased = function(webVRController: Core.WebVRController) {
    if (webVRController.hand == 'left') {
        isLeftTriggerDown = false;
        if (webVRController != null) {
            if (leftGrabbedMesh != null && webVRController.mesh != null) {
                pushToBelt(leftGrabbedMesh);
                webVRController.mesh.removeChild(leftGrabbedMesh);
                leftGrabbedMesh = null;
            }
        } else {
            logMessage("Error: leftController was null");
        }
    } else {
        isRightTriggerDown = false;
        if (webVRController != null) {
            if (rightGrabbedMesh != null && webVRController.mesh != null) {
                pushToBelt(rightGrabbedMesh);
                webVRController.mesh.removeChild(rightGrabbedMesh);
                rightGrabbedMesh = null;
            }
        } else {
            logMessage("Error: rightController was null");
        }
    }
}

var isMeshGrabbable = function(mesh: Core.AbstractMesh) {
    if (mesh == null) {
        return false;
    }
    if (mesh == leftGrabbedMesh || mesh == rightGrabbedMesh) {
        return false;
    }
    return mesh.name.indexOf(grabbableTag) != -1;
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