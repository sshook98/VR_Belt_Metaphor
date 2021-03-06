import * as Core from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { Color3, Vector3, StandardMaterial, _BabylonLoaderRegistered, Mesh, MeshBuilder, Texture, WebVRController, Sound, CubeTexture, Axis, Space, WebXRCamera, AbstractMesh, Matrix, SceneLoader, Quaternion, Vector4, Material } from "@babylonjs/core";
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
var woodenStaffURL = "./textures/WoodenStaff.png";
var tomNookURL = "./textures/tom.png";
var soccerBallURL = "./textures/soccerball.jpg";

// Sound URLs
var grabURL = "./audio/grab.wav";
var releaseURL = "./audio/release.wav";
var beltinURL = "./audio/beltin.wav";
var beltoutURL = "./audio/beltout.wav";
var turnUrl = "./audio/turn.wav";

// Sounds
var grabSound: Core.Sound;
var releaseSound: Core.Sound;
var beltinSound: Core.Sound;
var beltoutSound: Core.Sound;
var turnSound: Core.Sound;

// VR additions
var vrHelper: Core.VRExperienceHelper;

var belt: Belt;
var belt_height = 0.1;
var belt_offset_y = 0.6;
var leftReleaseObject: GrabbedObject | null;
var rightReleaseObject: GrabbedObject | null;

var leftGrabbedMesh: Core.Nullable<Core.AbstractMesh>;
var rightGrabbedMesh: Core.Nullable<Core.AbstractMesh>;
var isLeftTriggerDown = false;
var isRightTriggerDown = false;

var grabbableTag = "Grabbable";
var beltTag = "belt";
var grabDistance = 0.1;
var belt_radius = 0.2
var beltOffsetFactor = 5;

var openScene = function() {
    setupVR();
}

class GrabbedObject {
    mesh: Core.AbstractMesh;
    initialBoundingMaxLength: number;
    scaleFactor: number;
    attachedToBelt: boolean;
    constructor(mesh:Core.AbstractMesh, ) {
        this.mesh = mesh;
        this.initialBoundingMaxLength = Math.max(mesh._boundingInfo?.maximum.x!, mesh._boundingInfo?.maximum.y!, mesh._boundingInfo?.maximum.z!);
        this.scaleFactor = 1.0;
        this.attachedToBelt = true;
    }
}

class Belt {
    belt_mesh: Core.AbstractMesh;
    belt_pushedIndex: number[]; //if ball attached to position 2, belt_index: [2], beltObjects: [ball] -> ball at index 0 of beltObjects
    belt_vertices: Vector3[];
    beltObjects: GrabbedObject[];
    extraBeltObjects: GrabbedObject[];
    belt_origin: Vector3;
    constructor(belt_mesh: Core.AbstractMesh, numSides: number, belt_radius: number) {
        this.belt_mesh = belt_mesh;
        this.belt_pushedIndex = [];
        this.belt_vertices = [];
        this.beltObjects = [];
        this.extraBeltObjects = [];
        this.belt_origin = new Vector3(belt_mesh.position.x, belt_mesh.position.y, belt_mesh.position.z);

        for (var i = 0; i < numSides; i++) {
            var angle = i * Math.PI * 2 / numSides;
            var x = belt_radius * Math.sin(angle);
            var y = 0;
            var z = belt_radius * Math.cos(angle);
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
        var rows = 3;
        var columns = 3;
        var x = 0.7;
        var y = 0.5;
        var z = 1.5;
        var spacing = 0.4;
        var scale = 0.35;

        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
                var diam = Math.random() * scale + scale / 4
                var sphere = MeshBuilder.CreateSphere(grabbableTag + " Sphere " + i + " " + j, {diameter: diam}, scene);
                sphere.position = new Vector3(x, y + i * spacing, z + j * spacing);
                var mat = new StandardMaterial("sphereMat", scene);
                mat.diffuseColor = Color3.Random();
                sphere.material = mat;
            }
        }

        var grabVolume = 1;
        var releaseVolume = 1;
        var beltinVolume = 6;
        var beltoutVolume = 4;
        var turnVolume = 1;
        grabSound = new Sound("grabSound", grabURL, scene, null, {autoplay: false, loop: false, volume: grabVolume});
        releaseSound = new Sound("releaseSound", releaseURL, scene, null, {autoplay: true, loop: false, volume: releaseVolume});
        beltinSound = new Sound("beltinSound", beltinURL, scene, null, {autoplay: false, loop: false, volume: beltinVolume});
        beltoutSound = new Sound("beltoutSound", beltoutURL, scene, null, {autoplay: false, loop: false, volume: beltoutVolume});
        turnSound = new Sound("turnSound", turnUrl, scene, null, {autoplay: false, loop: false, volume: turnVolume});

        
        //Belt
        var belt_mat = new StandardMaterial("belt_mat", scene);
        belt_mat.diffuseColor = new Color3(134/255.0, 69/255.0, 0);
 
        var path = [];
        
        var segLength = belt_height;
        var numSides = 8;
        var belt_radius = 0.2;
        
        for(var i = 0; i < 2; i++) {
            var x = 0;
            var y = i * segLength;
            var z = 0;
            path.push(new Vector3(x, y, z));
            
        }
        var belt_mesh = MeshBuilder.CreateTube("belt", {path: path, radius: belt_radius, sideOrientation: Mesh.DOUBLESIDE, updatable: true, tessellation: numSides}, scene);
        belt_mesh.material = belt_mat;
        // belt_mesh.rotate(Axis.Z, Math.PI / 2, Space.WORLD);
        belt = new Belt(belt_mesh, numSides, belt_radius);

        // Player body 
        var body_mat = new StandardMaterial("body_mat", scene);
        body_mat.diffuseColor = new Color3(0.40, 0.8, 1.0);
        var body = MeshBuilder.CreateSphere("body", {diameter: 1.8 * belt_radius}, scene);
        body.material = body_mat;
        belt_mesh.addChild(body);
        body.position = Vector3.Zero();
        body.scaling = new Vector3(1, 2.1, 1)

        // Non-grabbable objects
        var tomNook = makeBox("tomNook", tomNookURL);
        tomNook.position = new Vector3(-1.5, 1, 5);
        tomNook.scaling = new Vector3(0.5, 0.5, 0.5);

        // Other Objects
        var staffLength = 1.5
        var weightLength = 0.3;

        var staffHandle = MeshBuilder.CreateCylinder(grabbableTag + "staffHandle",  {diameter: 0.07, tessellation: 16, height: staffLength / 4}, scene)
        staffHandle.position = new Vector3(0, 0.7, 2.6);
        staffHandle.rotate(new Vector3(0, 0, 1), Math.PI / 2, Space.WORLD);
        var handleMaterial = new StandardMaterial("handleMat", scene);
        handleMaterial.diffuseTexture = new Texture(woodenStaffURL, scene);
        staffHandle.material = handleMaterial;

        var staff = MeshBuilder.CreateCylinder("staff", {diameter: 0.065, tessellation: 16, height: staffLength})
        staffHandle.addChild(staff);
        staff.position = Vector3.Zero();
        staff.rotate(new Vector3(0, 0, 1), Math.PI / 2, Space.WORLD);
        var staffMaterial = new StandardMaterial("staffMat", scene);
        staffMaterial.diffuseTexture = new Texture(woodenStaffURL, scene);
        staff.material = staffMaterial;

        var soccerBall = MeshBuilder.CreateSphere(grabbableTag + " soccerBall ", {diameter: 0.3}, scene);
        soccerBall.position = new Vector3(0, 0.3, 2.4);
        var soccerBall_mat = new StandardMaterial("soccerBall_mat", scene);
        soccerBall_mat.diffuseTexture = new Texture(soccerBallURL, scene);
        soccerBall.material = soccerBall_mat;

        var weight = MeshBuilder.CreateCylinder(grabbableTag + "weight", { diameter: 0.07, tessellation: 16, height: weightLength}, scene);
        weight.position = new Vector3(-0.5, 1.2, 2.5);
        var weightMat = new StandardMaterial("weightMat", scene);
        weightMat.diffuseColor = new Color3(0.4, 0.4, 0.5);
        weight.material = weightMat;
        weight.rotate(new Vector3(0, 0, 1), Math.PI / 2, Space.WORLD)

        var weightEndMat = new StandardMaterial("weightEndMat", scene);
        weightEndMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
        var weightEnd1 = MeshBuilder.CreateCylinder("weightEnd", { diameter: 0.2, height: 0.05, tessellation: 16}, scene)
        weightEnd1.rotate(new Vector3(0, 0, 1), Math.PI / 2, Space.WORLD)
        weight.addChild(weightEnd1);
        weightEnd1.position = new Vector3(0, weightLength/2, 0);
        weightEnd1.material = weightEndMat;

        var weightEnd2 = MeshBuilder.CreateCylinder("weightEnd", { diameter: 0.2, height: 0.05, tessellation: 16}, scene)
        weightEnd2.rotate(new Vector3(0, 0, 1), Math.PI / 2, Space.WORLD)
        weight.addChild(weightEnd2);
        weightEnd2.position = new Vector3(0,-weightLength/2, 0);
        weightEnd2.material = weightEndMat;
        weight.rotate(new Vector3(0, 1, 0), Math.PI / 6);

        var mosaicDonut = MeshBuilder.CreateTorus(grabbableTag + "donut", {diameter: 0.25, thickness: 0.1}, scene);
        mosaicDonut.position = new Vector3(-0.7, 0.6, 1.5);
        var donutMat = new StandardMaterial("donutMat", scene);
        donutMat.diffuseTexture = new Texture(mosaicURL, scene);
        mosaicDonut.material = donutMat;

        var concreteDonut = MeshBuilder.CreateTorus(grabbableTag + "donut", {diameter: 0.25, thickness: 0.1}, scene);
        concreteDonut.position = new Vector3(-0.7, 0.8, 1.5);
        var donutMat2 = new StandardMaterial("donutMat", scene);
        donutMat2.diffuseTexture = new Texture(leafURL, scene);
        concreteDonut.material = donutMat2

        var volcanisDonut = MeshBuilder.CreateTorus(grabbableTag + "donut", {diameter: 0.25, thickness: 0.1}, scene);
        volcanisDonut.position = new Vector3(-0.7, 1, 1.5);
        var donutMat3 = new StandardMaterial("donutMat", scene);
        donutMat3.diffuseTexture = new Texture(volcanicURL, scene);
        concreteDonut.material = donutMat3
        volcanisDonut


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

var makeBox = function(name: string, fileLocation: string) {
    var columns = 6;  // 6 columns
        var rows = 1;  // 1 row
            //alien sprite
        var faceUV = new Array(6);

        //set all faces to same
        for (var i = 0; i < 6; i++) {
            faceUV[i] = new Vector4(i / columns, 0, (i + 1) / columns, 1 / rows);
        }
        //wrap set
        var options = {
            faceUV: faceUV,
            wrap: true
        };

        var box = MeshBuilder.CreateBox(name, options, scene);
        var mat = new StandardMaterial(name, scene);
        var texture = new Texture(fileLocation, scene);
        mat.diffuseTexture = texture;
        box.material = mat;
        return box;
}

var setupVR = function() {
    vrHelper = scene.createDefaultVRExperience();

    vrHelper.enableInteractions();

    scene.onBeforeRenderObservable.add(()=>{
        if (belt != null && vrHelper.webVRCamera) {
            belt.belt_mesh.position = vrHelper.webVRCamera.devicePosition.clone();
            belt.belt_mesh.position.y -= belt_offset_y;
            var qx_factor = 0.42;
            if (vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().x < Math.PI * qx_factor) {
                belt.belt_mesh.position.x -= (1 - vrHelper.webVRCamera.devicePosition.clone().y) * Math.tan(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().x) * Math.sin(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().y) / beltOffsetFactor;
                belt.belt_mesh.position.z -= (1 - vrHelper.webVRCamera.devicePosition.clone().y) * Math.tan(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().x) * Math.cos(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().y) / beltOffsetFactor;
            } else {
                belt.belt_mesh.position.x -= (1 - vrHelper.webVRCamera.devicePosition.clone().y) * Math.tan(Math.PI * qx_factor) * Math.sin(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().y) / beltOffsetFactor;
                belt.belt_mesh.position.z -= (1 - vrHelper.webVRCamera.devicePosition.clone().y) * Math.tan(Math.PI * qx_factor) * Math.cos(vrHelper.webVRCamera.deviceRotationQuaternion.toEulerAngles().y) / beltOffsetFactor;
            }
            
            belt.beltObjects.forEach((object, index) => {
                object.mesh.position = vrHelper.webVRCamera.devicePosition.clone();
                object.mesh.position.x += belt.belt_vertices[belt.belt_pushedIndex[index]].x;
                object.mesh.position.y -= belt_offset_y;
                object.mesh.position.z += belt.belt_vertices[belt.belt_pushedIndex[index]].z;
                
                if (object.initialBoundingMaxLength * object.scaleFactor > belt_height * 0.5) {
                    object.scaleFactor -= 0.05;
                    object.mesh.scaling.x = object.scaleFactor;
                    object.mesh.scaling.y = object.scaleFactor;
                    object.mesh.scaling.z = object.scaleFactor;
                    // object.mesh.computeWorldMatrix();
                    // object.mesh.refreshBoundingInfo();
                }
                
            });
        }
        if (leftReleaseObject != null) {
            if (leftReleaseObject.mesh.scaling.x < 1) {
                leftReleaseObject.mesh.scaling.x += 0.05;
                leftReleaseObject.mesh.scaling.y += 0.05;
                leftReleaseObject.mesh.scaling.z += 0.05;
            }
            else {
                leftReleaseObject = null;
            }
        } 
        if (rightReleaseObject != null) {
            if (rightReleaseObject.mesh.scaling.x < 1) {
                rightReleaseObject.mesh.scaling.x += 0.05;
                rightReleaseObject.mesh.scaling.y += 0.05;
                rightReleaseObject.mesh.scaling.z += 0.05;
            }
            else {
                rightReleaseObject = null;
            }
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
                    var temp1 = belt.belt_vertices.shift()!;
                    var temp2 = belt.belt_vertices.shift()!;
                    belt.belt_vertices.push(temp1);
                    belt.belt_vertices.push(temp2);
                    turnSound.play();
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
        belt.beltObjects.forEach(element => {
            meshes.push(element.mesh);
        });
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            if (isMeshGrabbable(mesh)) {
                if (webVRController.mesh) {
                    if (mesh.getBoundingInfo().intersects(webVRController.mesh.getBoundingInfo(), true)) {
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
                            var gotReleasedFromBelt = -1;
                            if (isMeshFromBelt(mesh)) {
                                gotReleasedFromBelt = releaseFromBelt(mesh, "left");
                            }
                            webVRController.mesh.addChild(leftGrabbedMesh)
                            if (gotReleasedFromBelt == 1) {
                                beltoutSound.play();
                            } else {
                                grabSound.play();
                            }
                        } else {
                            logMessage("Error: leftController was null");
                        }
                    }

                }
            }
        }
    } else {
        isRightTriggerDown = true;
        var meshes = scene.meshes;
        belt.beltObjects.forEach(element => {
            meshes.push(element.mesh);
        });
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            if (isMeshGrabbable(mesh)) {
                if (webVRController.mesh) {
                    if (mesh.getBoundingInfo().intersects(webVRController.mesh.getBoundingInfo(), true)) {
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
                            var gotReleasedFromBelt = -1;
                            if (isMeshFromBelt(mesh)) {
                                gotReleasedFromBelt = releaseFromBelt(mesh, "right");
                            }
                            webVRController.mesh.addChild(rightGrabbedMesh)
                            if (gotReleasedFromBelt == 1) {
                                beltoutSound.play();
                            } else {
                                grabSound.play();
                            }
                            
                        } else {
                            logMessage("Error: rightController was null");
                        }
                    }

                }
                
            }
            
        }
    }
}

var pushToBelt = function(grabbedMesh: Core.AbstractMesh, webVRController: Core.WebVRController) {
    var minIndex = -1;
    var minDistance = 999999;
    for (var i = 0; i < belt.belt_vertices.length; i++) {
        if (belt.belt_pushedIndex.indexOf(i) == -1) {
            var tip_pos = belt.belt_mesh.position.clone().add(belt.belt_vertices[i]);
            var curr = Math.pow(tip_pos.x - webVRController.devicePosition.x, 2) + 
                Math.pow(tip_pos.y - webVRController.devicePosition.y, 2) +
                Math.pow(tip_pos.z - webVRController.devicePosition.z, 2);
            if (curr < minDistance) 
            {
                minDistance = curr;
                minIndex = i;
            }
        }
    }
    if (minIndex != -1 && Math.sqrt(minDistance) < 0.25) {
        grabbedMesh.name = grabbedMesh.name + "belt";
        belt.beltObjects.push(new GrabbedObject(grabbedMesh));
        belt.belt_pushedIndex.push(minIndex);
        // beltinSound.play();
        return 1;
    }
    return 0;
}

var releaseFromBelt = function(grabbedMesh: Core.AbstractMesh, leftOrRight: string) {
    var index = 0;
    while (index < belt.beltObjects.length) {
        if (grabbedMesh.name === belt.beltObjects[index].mesh.name) {
            grabbedMesh.name = grabbedMesh.name.substring(0, grabbedMesh.name.length - beltTag.length);
            if (leftOrRight === "left") {
                leftReleaseObject = belt.beltObjects[index];
            } else if (leftOrRight === "right") {
                rightReleaseObject = belt.beltObjects[index];
            }
            belt.beltObjects.splice(index, 1);
            belt.belt_pushedIndex.splice(index, 1);
            // beltoutSound.play();
            return 1;
            // break;
        }
        index++;
    }
    return 0;
}

var handleTriggerReleased = function(webVRController: Core.WebVRController) {
    if (webVRController.hand == 'left') {
        isLeftTriggerDown = false;
        if (webVRController != null) {
            if (leftGrabbedMesh != null && webVRController.mesh != null) {
                var gotPushedToBelt = pushToBelt(leftGrabbedMesh, webVRController);
                webVRController.mesh.removeChild(leftGrabbedMesh);
                leftGrabbedMesh = null;
                if (gotPushedToBelt == 1) {
                    beltinSound.play();
                } else {
                    releaseSound.play();
                }
            }
        } else {
            logMessage("Error: leftController was null");
        }
    } else {
        isRightTriggerDown = false;
        if (webVRController != null) {
            if (rightGrabbedMesh != null && webVRController.mesh != null) {
                var gotPushedToBelt = pushToBelt(rightGrabbedMesh, webVRController);
                webVRController.mesh.removeChild(rightGrabbedMesh);
                rightGrabbedMesh = null;
                if (gotPushedToBelt == 1) {
                    beltinSound.play();
                } else {
                    releaseSound.play();
                }
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

var isMeshFromBelt = function(mesh: Core.AbstractMesh) {
    return mesh.name.indexOf(beltTag) != -1;
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