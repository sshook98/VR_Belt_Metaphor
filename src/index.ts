import * as Core from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { StackPanel, Slider, TextBlock } from "@babylonjs/gui";
import { Color3, ToLinearSpace, Vector3, Material, StandardMaterial, PickingInfo, _BabylonLoaderRegistered, Mesh, MeshBuilder, WebVRController, StateCondition, CircleEase, ActionManager, ExecuteCodeAction, Camera, Texture } from "@babylonjs/core";
import { colorCorrectionPixelShader } from "@babylonjs/core/Shaders/colorCorrection.fragment";
import { logDepthDeclaration } from "@babylonjs/core/Shaders/ShadersInclude/logDepthDeclaration";
var canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; // Get the canvas element 
var engine = new Core.Engine(canvas, true); // Generate the BABYLON 3D engine

var isStatusMaximized = false;
var messages: string[] = [];
var curMessageIndex = 0;
var totalMessagesCount = 0;
var messagesLimit = 200;

var statusBlock1: GUI.TextBlock;
var textSlider1: GUI.Slider;
var colorPicker1: GUI.ColorPicker;
var isBrushMenuVisible: boolean;
var brushMenuRows: GUI.StackPanel[] = [];

// Texture URLs
var mosaicURL = "./textures/mosaic.jfif";
var marbleURL = "./textures/marble.jpg";
var leafURL = "./textures/Leaf.jpg";
var volcanicURL = "./textures/volcanic.jpg";
var plasterURL = "./textures/plaster.jpg";
var concreteURL = "./textures/concrete.jpg";

// VR additions
var vrHelper;
var activeTool = 1;
var lineKey = 1;
var penKey = 2;
var eraserKey = 3;
var floorFontSize = 32;
var uiMeshes: { setEnabled: (arg0: boolean) => void; }[] = [];

// paint app additions
var leftController: Core.Nullable<Core.AbstractMesh>;
var rightController: Core.Nullable<Core.AbstractMesh>;

var lineToolTip: Core.Mesh;
var eraserToolTip: Core.Mesh;
var straightLineStartingPoint = new Vector3(0, 0, 0);
var curStraightLine: Core.Mesh;
var allStraightLines: Core.Mesh[] = [];

var strokeStartingPoint = new Vector3(0, 0, 0);
var curStroke: Core.Mesh[];
var curStrokePoints: Core.Vector3[] = [];
var allStrokes: Mesh[][] = [];

var state = "Entry";
var ribbonTexture: Core.Texture;
var lastPoint: Vector3 = new Vector3(10000, 10000, 10000);

var openFloorScene = function() {
    scene = floorScene;
    setupVR();
}


/******* Add the Playground Class with a static CreateScene function ******/
class Playground { 
    public static CreateFloorScene(engine: Core.Engine, canvas: HTMLCanvasElement): Core.Scene {
        // Create the scene space
        var scene = new Core.Scene(engine);

        // Add a camera to the scene and attach it to the canvas
        var camera = new Core.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, new Core.Vector3(0, 1, 0), scene);
        camera.attachControl(canvas, true);

        // Add lights to the scene
        var light1 = new Core.HemisphericLight("light1", new Core.Vector3(1, 1, 0), scene);

        var ground = Core.MeshBuilder.CreateGround("ground", {width: 25, height: 25}, scene);
        ground.position = new Vector3(0, -0.01, 0);

        // var uiPlane = MeshBuilder.CreatePlane("uiPlane", {size: 0.5});
        // uiPlane.position = new Vector3(-1, 0, 2);
        // uiPlane.rotate(new Vector3(0, 1, 0), -Math.PI / 2, Core.Space.WORLD);
        // uiMeshes.push(uiPlane);

        var optionsPlane1 = MeshBuilder.CreatePlane("optionsPlane", {size: 0.25});
        optionsPlane1.position = new Vector3(-0.25, 0, 1);
        optionsPlane1.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        optionsPlane1.rotate(new Vector3(0, 0, 1), Math.PI);
        uiMeshes.push(optionsPlane1);

        var optionsPlane2 = MeshBuilder.CreatePlane("optionsPlane", {size: 0.25});
        optionsPlane2.position = new Vector3(0, 0, 1);
        optionsPlane2.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        optionsPlane2.rotate(new Vector3(0, 0, 1), Math.PI);
        uiMeshes.push(optionsPlane2);

        var optionsPlane3 = MeshBuilder.CreatePlane("optionsPlane", {size: 0.25});
        optionsPlane3.position = new Vector3(0.25, 0, 1);
        optionsPlane3.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        optionsPlane3.rotate(new Vector3(0, 0, 1), Math.PI);
        uiMeshes.push(optionsPlane3);

        var toolsPlane = MeshBuilder.CreatePlane("toolsPlane", {size: 1});
        toolsPlane.position = new Vector3(0, 0, 3);
        toolsPlane.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        uiMeshes.push(toolsPlane);

        var debugPlane = MeshBuilder.CreatePlane("debugPlane", {size: 1.5});
        debugPlane.position = new Vector3(-1.5, 0, 2);
        debugPlane.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        debugPlane.rotate(new Vector3(0, 1, 0), Math.PI * 3 / 2, Core.Space.WORLD);

        var optionsTexture1 = GUI.AdvancedDynamicTexture.CreateForMesh(optionsPlane1);
        optionsTexture1.background = "black";

        var optionsTexture2 = GUI.AdvancedDynamicTexture.CreateForMesh(optionsPlane2);
        optionsTexture2.background = "black";

        var optionsTexture3 = GUI.AdvancedDynamicTexture.CreateForMesh(optionsPlane3);
        optionsTexture3.background = "black";

        var toolsTexture = GUI.AdvancedDynamicTexture.CreateForMesh(toolsPlane);
        toolsTexture.background = "black";

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

        var menuHeight = "200px";
        var menuWidth = "800px";
        var menuTop = "20px";
        var menuFontSize = 64;

        var fileMenu = new Menu(optionsTexture1, menuHeight, menuWidth, "File", menuFontSize);
        fileMenu.button.onPointerClickObservable.add(fileButtonCallback);
        fileMenu.top = menuTop;
        fileMenu.left = "0";
        fileMenu.container.width = 1;
        fileMenu.button.width = menuWidth;
        fileMenu.addOption("New", newButtonCallback); 
        fileMenu.addOption("Load", loadButtonCallback);
        fileMenu.addOption("Save", saveButtonCallback);
        fileMenu.addOption("Quit", quitButtonCallback);

        var editMenu = new Menu(optionsTexture2, menuHeight, menuWidth, "Edit", menuFontSize);        
        editMenu.button.onPointerClickObservable.add(editButtonCallback);
        editMenu.top = menuTop;
        editMenu.container.width = 1;
        editMenu.container.left = "0px";
        editMenu.button.width = menuWidth;

        var viewMenu = new Menu(optionsTexture3, menuHeight, menuWidth, "View", menuFontSize)
        viewMenu.button.onPointerClickObservable.add(viewButtonCallback);
        viewMenu.top = menuTop;
        viewMenu.container.width = 1;
        viewMenu.container.left = "0";
        viewMenu.button.width = menuWidth;
        viewMenu.addOption("Next", nextButtonCallback);
        viewMenu.addOption("Previous", previousButtonCallback);

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

        var toolPallete = new GUI.StackPanel();
        toolPallete.width = 1;
        toolPallete.height = 0.9;
        toolPallete.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        toolPallete.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        toolPallete.zIndex = -110;
        toolPallete.alpha = 0.9;
        toolPallete.background = "yellow";
        toolsTexture.addControl(toolPallete);

        var radioButtonSize = "120px";
        var radioButtonLabelWidth = "320px";
        var radioButtonLeft = "10px";
        var labelLeft = "140px";
        var colorPickerSize = "600px";
        var colorPickerLeft = "360px";
        var colorpickerTop = "200px";
        var brushMenuLeft = "360px";
        var brushMenuHeight = "300px";
        var brushMenuWidth = "600px";
        
        var lineButton =  new GUI.RadioButton();
        lineButton.onPointerUpObservable.add(lineButtonCallback);
        lineButton.width = radioButtonSize;
        lineButton.height = radioButtonSize;
        lineButton.color = "green";
        lineButton.background = "white";
        lineButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        lineButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        lineButton.left = radioButtonLeft;
        lineButton.top = "20px";
        lineButton.isChecked = true;
        toolsTexture.addControl(lineButton);

        var lineTextBlock = new GUI.TextBlock();
        lineTextBlock.text = "Line";
        lineTextBlock.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        lineTextBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        lineTextBlock.textHorizontalAlignment = GUI.Container.HORIZONTAL_ALIGNMENT_LEFT;
        lineTextBlock.width = radioButtonLabelWidth;
        lineTextBlock.height = radioButtonSize;
        lineTextBlock.color = "green";
        lineTextBlock.left = labelLeft;
        lineTextBlock.top = "20px";
        lineTextBlock.fontSize = floorFontSize;
        toolsTexture.addControl(lineTextBlock);

        var penButton = new GUI.RadioButton();
        penButton.onPointerUpObservable.add(penButtonCallback);
        penButton.width = radioButtonSize;
        penButton.height = radioButtonSize;
        penButton.color = "blue";
        penButton.background = "white";
        penButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        penButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        penButton.left = radioButtonLeft;
        penButton.top = "160px";
        toolsTexture.addControl(penButton);

        var penTextBlock = new GUI.TextBlock();
        penTextBlock.text = "Pen";
        penTextBlock.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        penTextBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        penTextBlock.textHorizontalAlignment = GUI.Container.HORIZONTAL_ALIGNMENT_LEFT;
        penTextBlock.width = radioButtonLabelWidth;
        penTextBlock.height = radioButtonSize;
        penTextBlock.color = "blue";
        penTextBlock.left = labelLeft;
        penTextBlock.top = "160px";
        penTextBlock.fontSize = floorFontSize;
        toolsTexture.addControl(penTextBlock);

        var eraserButton = new GUI.RadioButton();
        eraserButton.onPointerUpObservable.add(eraserButtonCallback);
        eraserButton.width = radioButtonSize;
        eraserButton.height = radioButtonSize;
        eraserButton.color = "red";
        eraserButton.background = "white";
        eraserButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        eraserButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        eraserButton.left = radioButtonLeft;
        eraserButton.top = "300px";
        toolsTexture.addControl(eraserButton);

        var eraserTextBlock = new GUI.TextBlock();
        eraserTextBlock.text = "Eraser";
        eraserTextBlock.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        eraserTextBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        eraserTextBlock.textHorizontalAlignment = GUI.Container.HORIZONTAL_ALIGNMENT_LEFT;
        eraserTextBlock.width = radioButtonLabelWidth;
        eraserTextBlock.height = radioButtonSize;
        eraserTextBlock.color = "red";
        eraserTextBlock.left = labelLeft;
        eraserTextBlock.top = "300px";
        eraserTextBlock.fontSize = floorFontSize;
        toolsTexture.addControl(eraserTextBlock);

        var cPickerButton = new GUI.Button();
        cPickerButton.width = radioButtonSize;
        cPickerButton.height = radioButtonSize;
        cPickerButton.color = "blue";
        cPickerButton.background = "white";
        cPickerButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        cPickerButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        cPickerButton.left = radioButtonLeft;
        cPickerButton.top = "440px";
        cPickerButton.onPointerClickObservable.add(cPickerButtonCallback);
        toolsTexture.addControl(cPickerButton);

        var colorPickerTextBlock = new GUI.TextBlock();
        colorPickerTextBlock.text = "Color";
        colorPickerTextBlock.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        colorPickerTextBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        colorPickerTextBlock.textHorizontalAlignment = GUI.Container.HORIZONTAL_ALIGNMENT_LEFT;
        colorPickerTextBlock.width = radioButtonLabelWidth;
        colorPickerTextBlock.height = radioButtonSize;
        colorPickerTextBlock.color = "blue";
        colorPickerTextBlock.left = labelLeft;
        colorPickerTextBlock.top = "440px";
        colorPickerTextBlock.fontSize = floorFontSize;
        toolsTexture.addControl(colorPickerTextBlock);

        colorPicker1 = new GUI.ColorPicker();
        colorPicker1.value = new Color3(1, 1, 1);
        colorPicker1.height = colorPickerSize;
        colorPicker1.width = colorPickerSize;
        colorPicker1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        colorPicker1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        colorPicker1.top = colorpickerTop;
        colorPicker1.left = colorPickerLeft;
        colorPicker1.isVisible = false;
        colorPicker1.onValueChangedObservable.add(colorPickerCallback1);
        toolsTexture.addControl(colorPicker1);

        var brushButton = new GUI.Button();
        brushButton.width = radioButtonSize;
        brushButton.height = radioButtonSize;
        brushButton.color = "green";
        brushButton.background = "white";
        brushButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        brushButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        brushButton.left = radioButtonLeft;
        brushButton.top = "580px";
        brushButton.onPointerClickObservable.add(brushButtonCallback);
        toolsTexture.addControl(brushButton);

        var brushMenuTextBlock = new GUI.TextBlock();
        brushMenuTextBlock.text = "Brush";
        brushMenuTextBlock.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        brushMenuTextBlock.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        brushMenuTextBlock.textHorizontalAlignment = GUI.Container.HORIZONTAL_ALIGNMENT_LEFT;
        brushMenuTextBlock.width = radioButtonLabelWidth;
        brushMenuTextBlock.height = radioButtonSize;
        brushMenuTextBlock.color = "green";
        brushMenuTextBlock.left = labelLeft;
        brushMenuTextBlock.top = "580px";
        brushMenuTextBlock.fontSize = floorFontSize;
        toolsTexture.addControl(brushMenuTextBlock);

        var brushMenuRow1 = new GUI.StackPanel();
        brushMenuRow1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        brushMenuRow1.verticalAlignment = GUI.Container.VERTICAL_ALIGNMENT_TOP;
        brushMenuRow1.width = brushMenuWidth;
        brushMenuRow1.height = brushMenuHeight;
        brushMenuRow1.top = "10px"
        brushMenuRow1.left = brushMenuLeft;
        brushMenuRow1.alpha = 0.6;
        brushMenuRow1.background = "gray";
        toolsTexture.addControl(brushMenuRow1);
        brushMenuRows.push(brushMenuRow1);

        var textureButton1 = GUI.Button.CreateImageOnlyButton("textureButton1", mosaicURL);
        textureButton1.width = 0.5;
        textureButton1.height = 1;
        textureButton1.top = "100000px";
        textureButton1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textureButton1.onPointerClickObservable.add(textureButtonCallback1);
        brushMenuRow1.addControl(textureButton1);

        var textureButton2 = GUI.Button.CreateImageOnlyButton("textureButton2", marbleURL);
        textureButton2.width = 0.5;
        textureButton2.height = 1;
        textureButton2.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        textureButton2.onPointerClickObservable.add(textureButtonCallback3);
        brushMenuRow1.addControl(textureButton2);


        var brushMenuRow2 = new GUI.StackPanel();
        brushMenuRow2.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        brushMenuRow2.verticalAlignment = GUI.Container.VERTICAL_ALIGNMENT_TOP;
        brushMenuRow2.width = brushMenuWidth;
        brushMenuRow2.height = brushMenuHeight;
        brushMenuRow2.top = "310px"
        brushMenuRow2.left = brushMenuLeft;
        brushMenuRow2.alpha = 0.6;
        brushMenuRow2.background = "gray";
        toolsTexture.addControl(brushMenuRow2);
        brushMenuRows.push(brushMenuRow2);

        var textureButton3 = GUI.Button.CreateImageOnlyButton("textureButton3", leafURL);
        textureButton3.width = 0.5;
        textureButton3.height = 1;
        textureButton3.top = "100000px";
        textureButton3.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textureButton3.onPointerClickObservable.add(textureButtonCallback2);
        brushMenuRow2.addControl(textureButton3);

        var textureButton4 = GUI.Button.CreateImageOnlyButton("textureButton4", volcanicURL);
        textureButton4.width = 0.5;
        textureButton4.height = 1;
        textureButton4.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        textureButton4.onPointerClickObservable.add(textureButtonCallback5);
        brushMenuRow2.addControl(textureButton4);

        var brushMenuRow3 = new GUI.StackPanel();
        brushMenuRow3.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        brushMenuRow3.verticalAlignment = GUI.Container.VERTICAL_ALIGNMENT_TOP;
        brushMenuRow3.width = brushMenuWidth;
        brushMenuRow3.height = brushMenuHeight;
        brushMenuRow3.top = "610px"
        brushMenuRow3.left = brushMenuLeft;
        brushMenuRow3.alpha = 0.6;
        brushMenuRow3.background = "gray";
        toolsTexture.addControl(brushMenuRow3);
        brushMenuRows.push(brushMenuRow3);

        var textureButton5 = GUI.Button.CreateImageOnlyButton("textureButton5", plasterURL);
        textureButton5.width = 0.5;
        textureButton5.height = 1;
        textureButton5.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        textureButton5.onPointerClickObservable.add(textureButtonCallback4);
        brushMenuRow3.addControl(textureButton5);

        var textureButton6 = GUI.Button.CreateImageOnlyButton("textureButton6", concreteURL);
        textureButton6.width = 0.5;
        textureButton6.height = 1;
        textureButton6.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textureButton6.onPointerClickObservable.add(textureButtonCallback6);
        brushMenuRow3.addControl(textureButton6);

        brushMenuRow1.isVisible = false;
        brushMenuRow2.isVisible = false;
        brushMenuRow3.isVisible = false;

        // paint app additions
        var toolTipSize = 0.1;
        var path = [new Vector3(-toolTipSize / 2, 0, 0), new Vector3(toolTipSize / 2, 0, 0)];
        lineToolTip = MeshBuilder.CreateLines("lineToolTip", {points: path}, scene)
        eraserToolTip = MeshBuilder.CreateSphere("eraserToolTip", {diameter: 0.1}, scene);
        eraserToolTip.isVisible = false;

        ribbonTexture = new Texture(mosaicURL, scene);

        return scene;
        
    }
}

class Menu {
    height: string;
    width: string;
    color: string;
    background: string;
    advancedtexture: GUI.AdvancedDynamicTexture;
    container: any;
    button: GUI.Button;
    options: any;
    fontSize: number;

    constructor(advancedTexture: GUI.AdvancedDynamicTexture, height: string, width: string, buttonName: string, fontSize: number) {
        this.height = height;
        this.width = width;
        this.color = "black";
        this.background = "white";
        this.fontSize = fontSize;

        this.advancedtexture = advancedTexture;

        // Container
        this.container = new GUI.Container();
        this.container.width = this.width;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.horizontalAlignmengt = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.isHitTestVisible = false;

        // Primary button
        this.button = GUI.Button.CreateSimpleButton("", buttonName);
        this.button.fontSize = fontSize;
        this.button.height = this.height;
        this.button.background = this.background;
        this.button.color = this.color;
        this.button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

        // Options Panel
        this.options = new GUI.StackPanel();
        this.options.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.options.top = this.height;
        this.options.width = width;
        this.options.isVisible = false;
        this.options.isVertical = true;

        var _this = this;
        this.button.onPointerUpObservable.add(function() {
            _this.options.isVisible = !_this.options.isVisible;
        });

        // Make dropdown visible
        this.container.onPointerEnterObservable.add(function() {
            _this.container.zIndex = 1000;
        })

        this.container.onPointerEnterObservable.add(function() {
            _this.container.zIndex = 0;
        });

        // add controls
        this.advancedtexture.addControl(this.container);
        this.container.addControl(this.button);
        this.container.addControl(this.options);
    }

    get top() {
        return this.container.top;
    }

    set top(_top) {
        this.container.top = _top;
    }

    get left() {
        return this.container.left;
    }

    set left(_left) {
        this.container.left = _left;
    }

    addOption(text: string, callback: (eventData: GUI.Vector2WithInfo, eventState: Core.EventState) => void) {
        var button = GUI.Button.CreateSimpleButton(text, text);
        button.height = this.height;
        button.paddingTop = "-1px";
        button.background = this.background;
        button.color = this.color;
        button.alpha = 1.0;
        button.fontSize = this.fontSize;
        button.onPointerUpObservable.add(() => {
            this.options.isVisible = false;
        });
        button.onPointerClickObservable.add(callback);
        this.options.addControl(button);
    }
}

/******* End of the create scene function ******/    
// code to use the Class above

var createFloorScene = function() {
    return Playground.CreateFloorScene(engine, engine.getRenderingCanvas() as HTMLCanvasElement);
}

//#region Callbacks
var fileButtonCallback = function() {
    logMessage("Clicked File");
}

var newButtonCallback = function() {
    logMessage("Clicked New");
}

var loadButtonCallback = function() {
    logMessage("Clicked Load");
}

var saveButtonCallback = function() {
    logMessage("Clicked Save");
}

var quitButtonCallback = function() {
    logMessage("Clicked Quit");
}

var editButtonCallback = function() {
    logMessage("Clicked Edit");    
}

var viewButtonCallback = function() {
    logMessage("Clicked View");
}

var nextButtonCallback = function() {
    logMessage("Clicked Next");
}

var previousButtonCallback = function() {
    logMessage("Clicked Previous");
}

var lineButtonCallback = function() {
    logMessage("Clicked Line Tool")
    activeTool = lineKey;
    lineToolTip.isVisible = true;
    eraserToolTip.isVisible = false;
}

var penButtonCallback = function() {
    logMessage("Clicked Pen Tool");
    activeTool = penKey;
    lineToolTip.isVisible = true;
    eraserToolTip.isVisible = false;
}

var eraserButtonCallback = function() {
    logMessage("Clicked Eraser Tool");
    activeTool = eraserKey;
    lineToolTip.isVisible = false;
    eraserToolTip.isVisible = true;
}

var statusButtonCallback = function() {
    logMessage("Clicked Status Title Bar");
}

var cPickerButtonCallback = function() {
    if (colorPicker1.isVisible) {
        colorPicker1.isVisible = false;
    } else {
        colorPicker1.isVisible = true;     
    }
    
    isBrushMenuVisible = false;
    for (var i = 0; i < brushMenuRows.length; i++) {
        brushMenuRows[i].isVisible = isBrushMenuVisible;
    }
    
}

var brushButtonCallback = function() {
    if (isBrushMenuVisible) {
        isBrushMenuVisible = false;
        logMessage("Hide Brush Menu");
    } else {
        isBrushMenuVisible = true;
        logMessage("Show Brush Menu");
    }

    for (var i = 0; i < brushMenuRows.length; i++) {
        brushMenuRows[i].isVisible = isBrushMenuVisible;
    }
    colorPicker1.isVisible = false;
}

var textureButtonCallback1 = function() {
    ribbonTexture = new Texture(mosaicURL, scene);
    logMessage("Clicked on a texture option");
}
var textureButtonCallback2 = function() {
    ribbonTexture = new Texture(leafURL, scene);
    logMessage("Clicked on a texture option");
}
var textureButtonCallback3 = function() {
    ribbonTexture = new Texture(marbleURL, scene);
    logMessage("Clicked on a texture option");
}
var textureButtonCallback4 = function() {
    ribbonTexture = new Texture(plasterURL, scene);
    logMessage("Clicked on a texture option");
}
var textureButtonCallback5 = function() {
    ribbonTexture = new Texture(volcanicURL, scene);
    logMessage("Clicked on a texture option");
}
var textureButtonCallback6 = function() {
    ribbonTexture = new Texture(concreteURL, scene);
    logMessage("Clicked on a texture option");
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

var colorPickerCallback1 = function() {
    logMessage("Changed Color");
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

    vrHelper.onControllerMeshLoaded.add((webVRController) => {
        if (webVRController.hand == 'left') {
            leftController = webVRController.mesh;
        } else {
            rightController = webVRController.mesh;
            lineToolTip.parent = rightController;
            lineToolTip.position = new Vector3(0, 0, -0.1);
            eraserToolTip.parent = rightController;
            eraserToolTip.position = new Vector3(0, 0, -0.1);
        }

        // left: Y and right: B
        webVRController.onSecondaryButtonStateChangedObservable.add((stateObject) => {
            if (webVRController.hand === 'left') {
                if (stateObject.pressed === true) {
                    //toggleMenuVisible();
                    logMessage("Pressed Y button on left controller");
                }
            } else {
                if (stateObject.pressed === true) {
                    // logMessage("Pressed B button on right controller");
                    if (state === "Entry") {
                        if (activeTool === lineKey) {
                            logMessage("Start Straight Line");
                            startStraightLine(getDrawPosition()); // local or world position?
                        } else if (activeTool === penKey) {
                            if (stateObject.pressed === true) {
                                startStroke(getDrawPosition());
                            }
                        } else if (activeTool === eraserKey) {
                            // if (stateObject.pressed === true) {
                            //     handleErase();
                            // }
                            // moved to render loop to be continuous
                        }
                    }
                } else if (stateObject.pressed === false) {
                    // logMessage("Released B button");
                    if (state === "DrawingLine") {
                        if (activeTool === lineKey) {
                            confirmStraightLine(getDrawPosition());
                        } 
                    } else if (state === "DrawingStroke") {
                        if (activeTool === penKey) {
                            confirmStroke();
                        } 
                    }
                }

            }
        });

        // A button
        // left: X and right: A
        webVRController.onMainButtonStateChangedObservable.add((stateObject) => {
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
        webVRController.onTriggerStateChangedObservable.add((stateObject) => {
            if (webVRController.hand == 'left') {
                if (leftLastTriggerValue && leftLastTriggerValue < 0.9 && stateObject.value >= 0.9) {
                    logMessage("Pressed Left Primary Trigger at " + webVRController.position.toString());
                    // handleTriggerPressed(webVRController.devicePosition.clone());
                    // handleTriggerPressed(webVRController.devicePosition); this did not work properly
                }
                leftLastTriggerValue = stateObject.value;
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

var CreateLine = function(start: Vector3, end: Vector3) {
    var dir = end.subtract(start);
    var steps = 120;
    var path = [start];
    var scale = 0.001;
    for (var i = 0; i < steps; i++) {
        var v = 2.0 * Math.PI * i / 20;
        var point = start.add(dir.scale(i / steps));
		path.push(point.add(new Vector3(6 * Math.cos(v) * scale, 0, 6 * Math.sin(v) * scale)));
    }
    path.push(end);

    var ribbon = MeshBuilder.CreateRibbon("lines", {pathArray: [path], offset: 10, closePath: true}, scene);
    var mat = new StandardMaterial("mat", scene);
    if (isBrushMenuVisible) {
        mat.diffuseTexture = ribbonTexture;
    } else  {
        var color = colorPicker1.value;
        mat.diffuseColor = new Color3(color.r, color.g, color.b);
        colorPicker1.value;
    }
    ribbon.material = mat;
    return ribbon;
}

var CreateRibbon = function(path: Vector3[]) {
    var ribbons = [];
    for (var i = 0; i < path.length - 1; i++) {
        var line = RibbonHelper(path[i], path[i+1]);
        ribbons.push(line);
    }
    return ribbons;
}

var RibbonHelper = function(start: Vector3, end: Vector3) {
    var dir = end.subtract(start);
    var steps = 4;
    var path = [start];
    var scale = 0.002;
    for (var i = 0; i < steps; i++) {
        var v = 2.0 * Math.PI * i / 20;
        var point = start.add(dir.scale(i / steps));
		path.push(point.add(new Vector3(6 * Math.cos(v) * scale, i/4 * scale, 6 * Math.sin(v) * scale)));
    }
    path.push(end);
    var toAdd = [];
    var offset = new Vector3(0.01, 0.01, 0.01);
    for (var i = 0; i < path.length; i++) {
        var p = path[path.length - 1 - i];
        toAdd.push(p.add(offset));
    }
    for (var i = 0; i < toAdd.length; i++) {
        path.push(toAdd[i]);
    }

    var ribbon = MeshBuilder.CreateRibbon("lines", {pathArray: [path], offset: 10, closePath: true}, scene);
    var mat = new StandardMaterial("mat", scene);
    if (isBrushMenuVisible) {
        mat.diffuseTexture = ribbonTexture;
    } else  {
        var color = colorPicker1.value;
        mat.diffuseColor = new Color3(color.r, color.g, color.b);
        colorPicker1.value;
    }
    ribbon.material = mat;
    return ribbon;
}

var startStraightLine = function(startPoint: Vector3) {
    state = "DrawingLine";
    straightLineStartingPoint = startPoint;
}

var showStraightLine = function(endPoint: Vector3) {
    if (curStraightLine) {
        curStraightLine.dispose();
    }
    curStraightLine = CreateLine(straightLineStartingPoint, endPoint);
    // logMessage("Showing Straight Line");
}

var confirmStraightLine = function(endPoint: Vector3) {
    if (curStraightLine) {
        allStraightLines.push(curStraightLine);
        logMessage("Placed a line starting at " + straightLineStartingPoint.toString() + " and ending at " + endPoint.toString());
    } else {
        logMessage("Error: tried to confirm new straight line but it was null");
    }
    state = "Entry";
    curStraightLine = CreateLine(new Vector3(10000, 10000, 10000), new Vector3(10001, 10000, 10000))
}

var startStroke = function(startPoint: Vector3) {
    state = "DrawingStroke";
    strokeStartingPoint = startPoint;
    logMessage("Starting Stroke");
    curStrokePoints = [startPoint];
}

var showStroke = function(nextPoint: Vector3) {
    if (curStroke) {
        for (var i = 0; i < curStroke.length; i++) {
            curStroke[i].dispose();
        }
        curStroke = [];
    }
    var dir = (lastPoint.subtract(nextPoint));
    var dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (dist > 0.05) {
        lastPoint = nextPoint;
        curStrokePoints.push(nextPoint);
    }
    curStroke = CreateRibbon(curStrokePoints)
}

var confirmStroke = function() {
    if (curStroke) {
        allStrokes.push(curStroke);
        logMessage("Placed a stroke starting at " + strokeStartingPoint.toString() + " and ending at " + curStrokePoints[curStrokePoints.length - 1].toString());
    } else {
        logMessage("Error: tried to confirm new stroke but it was null");
    }
    state = "Entry";
    curStroke = CreateRibbon([new Vector3(100000, 100000, 0)])
}

var handleErase = function() {
    for (var i = 0; i < allStraightLines.length; i++) {
        if (eraserToolTip.intersectsMesh(allStraightLines[i], false)) {
            var erasedObject = allStraightLines[i];
            allStraightLines.splice(i, 1);
            erasedObject.dispose();
            logMessage("Erased an Object");
            return;
        }
    }

    for (var i = 0; i < allStrokes.length; i++) {
        for (var j = 0; j < allStrokes[i].length; j++) {
            if (eraserToolTip.intersectsMesh(allStrokes[i][j], false)) {
                for (var k = 0; k < allStrokes[i].length; k++) {
                    var erasedObject = allStrokes[i][k];
                    erasedObject.dispose();
                }
                allStrokes.splice(i, 1);
                return;
            }
        }
    }

}

var getDrawPosition = function() {
    if (rightController) {
        // var m1 = rightController.getWorldMatrix();
        // var m2 = lineToolTip.getWorldMatrix();
        // var x = m1.multiply(m2);
        // x.getTranslation();
        return rightController.position.add(lineToolTip.position.negate());
    } else {
        return new Vector3(0, 0, 0);
    }
}

var floorScene = createFloorScene();
var scene = floorScene;
openFloorScene();

// var point = new Vector3(1, 2, 1);
// startStroke(point);
// showStroke(new Vector3(1, 2, 2));
// showStroke(new Vector3(1, 3, 1));
// confirmStroke();

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    if (state === "DrawingLine") {
        showStraightLine(getDrawPosition());  
    } else if (state === "DrawingStroke") {
        showStroke(getDrawPosition());
    }

    if (activeTool === eraserKey) {
        handleErase();
    }
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () { 
    engine.resize();
});