// ============================================
// 3D Buddha Meditation Scene
// Complete Three.js Application
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// =============================================
// CONFIGURATION
// =============================================
const CONFIG = {
    incense: {
        burnDuration: 30 * 60, // 30 minutes in seconds
        stickCount: 3,
        smokeParticleCount: 250,
        ambientSmokeCount: 120,
    },
    dust: {
        count: 120,
        spread: 12,
    },
    camera: {
        fov: 38,
        near: 0.1,
        far: 100,
        position: [0, 2.0, 7.5],
        target: [0, 2.0, 0],
    },
    bloom: {
        strength: 0.6,
        radius: 0.5,
        threshold: 0.7,
    },
};

// =============================================
// TEXTURE GENERATORS
// =============================================
function generateSmokeTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 240, 220, 0.9)');
    gradient.addColorStop(0.2, 'rgba(255, 230, 200, 0.6)');
    gradient.addColorStop(0.5, 'rgba(200, 180, 160, 0.25)');
    gradient.addColorStop(1, 'rgba(180, 160, 140, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

function generateGlowTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

function generateDustTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 230, 180, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 220, 160, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 200, 140, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

// =============================================
// MAIN SCENE CLASS
// =============================================
class MeditationScene {
    constructor() {
        this.clock = new THREE.Clock();
        this.isAudioPlaying = false;
        this.isIncenseBurning = false;
        this.incenseTimeRemaining = CONFIG.incense.burnDuration;
        this.incenseSticks = [];
        this.smokeParticles = [];
        this.ambientSmoke = [];
        this.candleLights = [];
        this.audioContext = null;
        this.audioNodes = {};

        this.init();
    }

    // ---- INITIALIZATION ----
    init() {
        this.initRenderer();
        this.initCamera();
        this.initScene();
        this.initControls();
        this.initLighting();

        // Build scene
        this.createEnvironment();
        this.createAltar();
        this.createBuddha();
        this.createIncenseBurner();
        this.createCandles();
        this.createHalo();
        this.createDustParticles();
        this.createAmbientSmokeSystem();

        // Post-processing
        this.initPostProcessing();

        // UI
        this.setupUI();

        // Hide loading screen
        setTimeout(() => {
            const loading = document.getElementById('loading');
            loading.classList.add('fade-out');
            setTimeout(() => loading.style.display = 'none', 1500);
        }, 2000);

        // Start render loop
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    initRenderer() {
        const canvas = document.getElementById('scene-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    initCamera() {
        const [px, py, pz] = CONFIG.camera.position;
        const [tx, ty, tz] = CONFIG.camera.target;

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
        this.camera.position.set(px, py, pz);
        this.camera.lookAt(tx, ty, tz);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050302);
        this.scene.fog = new THREE.FogExp2(0x0a0604, 0.04);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 14;
        this.controls.minPolarAngle = Math.PI * 0.15;
        this.controls.maxPolarAngle = Math.PI * 0.65;
        this.controls.target.set(...CONFIG.camera.target);
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.15;
    }

    initLighting() {
        // Ambient - warm light
        const ambient = new THREE.AmbientLight(0x2a1a0a, 0.6);
        this.scene.add(ambient);

        // Main key light - warm spotlight from above-front
        const keyLight = new THREE.SpotLight(0xffe8c0, 4.0, 25, Math.PI / 3.5, 0.5, 1.2);
        keyLight.position.set(0, 9, 5);
        keyLight.target.position.set(0, 2.5, 0);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 2;
        keyLight.shadow.camera.far = 20;
        keyLight.shadow.bias = -0.001;
        keyLight.shadow.radius = 4;
        this.scene.add(keyLight);
        this.scene.add(keyLight.target);

        // Face light - direct warm light on Buddha's face
        const faceLight = new THREE.SpotLight(0xffd8a0, 3.5, 14, Math.PI / 5, 0.6, 1.3);
        faceLight.position.set(1, 5, 7);
        faceLight.target.position.set(0, 3.0, 0);
        this.scene.add(faceLight);
        this.scene.add(faceLight.target);

        // Fill light - softer, from left
        const fillLight = new THREE.PointLight(0xffb060, 1.2, 14, 2);
        fillLight.position.set(-4, 5, 3);
        this.scene.add(fillLight);

        // Right fill
        const rightFill = new THREE.PointLight(0xffa050, 0.6, 12, 2);
        rightFill.position.set(3, 4, 2);
        this.scene.add(rightFill);

        // Rim light - behind Buddha for silhouette glow
        const rimLight = new THREE.PointLight(0xff9040, 1.5, 12, 2);
        rimLight.position.set(0, 5, -3);
        this.scene.add(rimLight);

        // Ground reflection light
        const groundLight = new THREE.PointLight(0x4a3020, 0.4, 10, 2);
        groundLight.position.set(0, 0.1, 3);
        this.scene.add(groundLight);
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.bloom.strength,
            CONFIG.bloom.radius,
            CONFIG.bloom.threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }

    // ---- ENVIRONMENT ----
    createEnvironment() {
        // Ground plane
        const groundGeo = new THREE.CircleGeometry(15, 64);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a0604,
            metalness: 0.3,
            roughness: 0.8,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Background walls (subtle curved wall)
        const wallGeo = new THREE.CylinderGeometry(10, 10, 12, 64, 1, true, Math.PI * 0.3, Math.PI * 1.4);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x120a04,
            roughness: 0.95,
            metalness: 0.0,
            side: THREE.BackSide,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 5;
        wall.position.z = -2;
        this.scene.add(wall);
    }

    // ---- ALTAR TABLE ----
    createAltar() {
        const altarGroup = new THREE.Group();

        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x3a1a08,
            roughness: 0.7,
            metalness: 0.1,
        });

        const darkWoodMat = new THREE.MeshStandardMaterial({
            color: 0x2a1206,
            roughness: 0.75,
            metalness: 0.05,
        });

        // Table top (increased depth)
        const topGeo = new THREE.BoxGeometry(3.2, 0.12, 3.2);
        const top = new THREE.Mesh(topGeo, woodMat);
        top.position.y = 0.7;
        top.castShadow = true;
        top.receiveShadow = true;
        altarGroup.add(top);

        // Table top decorative edge
        const edgeGeo = new THREE.BoxGeometry(3.3, 0.04, 3.3);
        const edge = new THREE.Mesh(edgeGeo, darkWoodMat);
        edge.position.y = 0.77;
        altarGroup.add(edge);

        // Table legs (4 legs)
        const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
        const legPositions = [
            [-1.4, 0.35, 1.4],
            [1.4, 0.35, 1.4],
            [-1.4, 0.35, -1.4],
            [1.4, 0.35, -1.4],
        ];
        legPositions.forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(legGeo, darkWoodMat);
            leg.position.set(x, y, z);
            leg.castShadow = true;
            altarGroup.add(leg);
        });

        // Front apron (decorative panel)
        const apronGeo = new THREE.BoxGeometry(2.8, 0.3, 0.05);
        const apron = new THREE.Mesh(apronGeo, darkWoodMat);
        apron.position.set(0, 0.5, 1.57);
        altarGroup.add(apron);

        // Decorative lines on apron
        const lineGeo = new THREE.BoxGeometry(2.6, 0.02, 0.06);
        const goldTrimMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            metalness: 0.7,
            roughness: 0.3,
        });
        [-0.08, 0.08].forEach(yOff => {
            const line = new THREE.Mesh(lineGeo, goldTrimMat);
            line.position.set(0, 0.5 + yOff, 1.58);
            altarGroup.add(line);
        });

        this.scene.add(altarGroup);
    }

    // ---- BUDDHA STATUE ----
    createBuddha() {
        const buddhaGroup = new THREE.Group();

        // Gold material for the statue - rich, reflective
        const goldMat = new THREE.MeshPhysicalMaterial({
            color: 0xd4a030,
            metalness: 0.78,
            roughness: 0.18,
            clearcoat: 0.4,
            clearcoatRoughness: 0.12,
            reflectivity: 0.9,
        });

        const darkGoldMat = new THREE.MeshPhysicalMaterial({
            color: 0xa07c22,
            metalness: 0.72,
            roughness: 0.28,
            clearcoat: 0.25,
        });

        // Skin-tinted gold for face features
        const faceMat = new THREE.MeshPhysicalMaterial({
            color: 0xc89828,
            metalness: 0.6,
            roughness: 0.25,
            clearcoat: 0.3,
        });

        // === BASE PEDESTAL (Simple & Elegant) ===
        const baseGroup = new THREE.Group();

        // Base platform
        const basePlatGeo = new THREE.CylinderGeometry(1.35, 1.4, 0.18, 48);
        const basePlat = new THREE.Mesh(basePlatGeo, darkGoldMat);
        basePlat.castShadow = true;
        baseGroup.add(basePlat);

        // Decorative ring on base
        const baseRingGeo = new THREE.TorusGeometry(1.37, 0.015, 8, 48);
        const baseRing = new THREE.Mesh(baseRingGeo, goldMat);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.09;
        baseGroup.add(baseRing);

        // Center cushion
        const cushionGeo = new THREE.CylinderGeometry(1.0, 1.25, 0.18, 48);
        const cushion = new THREE.Mesh(cushionGeo, goldMat);
        cushion.position.y = 0.18;
        baseGroup.add(cushion);

        baseGroup.position.y = 0.78;
        this.scene.add(baseGroup);

        // === BODY (seated meditation form) - LARGER ===
        const bodyPoints = [];
        // Create profile for LatheGeometry - scaled up 1.3x
        // Bottom of seated form (crossed legs area)
        bodyPoints.push(new THREE.Vector2(0.0, 0.0));
        bodyPoints.push(new THREE.Vector2(0.95, 0.0));
        bodyPoints.push(new THREE.Vector2(1.04, 0.05));
        bodyPoints.push(new THREE.Vector2(1.0, 0.13));
        bodyPoints.push(new THREE.Vector2(0.85, 0.23));
        // Transition legs to torso
        bodyPoints.push(new THREE.Vector2(0.62, 0.36));
        bodyPoints.push(new THREE.Vector2(0.52, 0.52));
        // Torso
        bodyPoints.push(new THREE.Vector2(0.50, 0.7));
        bodyPoints.push(new THREE.Vector2(0.54, 0.88));
        // Chest
        bodyPoints.push(new THREE.Vector2(0.58, 1.02));
        bodyPoints.push(new THREE.Vector2(0.60, 1.1));
        // Shoulders
        bodyPoints.push(new THREE.Vector2(0.62, 1.18));
        bodyPoints.push(new THREE.Vector2(0.60, 1.25));
        bodyPoints.push(new THREE.Vector2(0.54, 1.3));
        // Neck
        bodyPoints.push(new THREE.Vector2(0.26, 1.36));
        bodyPoints.push(new THREE.Vector2(0.21, 1.42));
        bodyPoints.push(new THREE.Vector2(0.20, 1.5));

        const bodyGeo = new THREE.LatheGeometry(bodyPoints, 64);
        const body = new THREE.Mesh(bodyGeo, goldMat);
        body.position.y = 1.14;
        body.castShadow = true;
        buddhaGroup.add(body);

        // === HEAD (larger, more detailed) ===
        const headGeo = new THREE.SphereGeometry(0.42, 64, 48);
        headGeo.scale(1, 1.12, 0.95);
        const head = new THREE.Mesh(headGeo, goldMat);
        head.position.y = 3.05;
        head.castShadow = true;
        buddhaGroup.add(head);

        // === USHNISHA (top knot) - larger ===
        const ushnishaGeo = new THREE.SphereGeometry(0.17, 32, 24);
        const ushnisha = new THREE.Mesh(ushnishaGeo, goldMat);
        ushnisha.position.y = 3.48;
        buddhaGroup.add(ushnisha);

        // Small flame tip on ushnisha
        const flameTipGeo = new THREE.ConeGeometry(0.05, 0.16, 16);
        const flameTipMat = new THREE.MeshPhysicalMaterial({
            color: 0xf0c060,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x805020,
            emissiveIntensity: 0.5,
        });
        const flameTip = new THREE.Mesh(flameTipGeo, flameTipMat);
        flameTip.position.y = 3.67;
        buddhaGroup.add(flameTip);

        // === HAIR CURLS (snail shell pattern) - more dense, covers head ===
        const curlGeo = new THREE.SphereGeometry(0.04, 12, 8);
        const curlMat = new THREE.MeshStandardMaterial({
            color: 0x1a1408,
            roughness: 0.55,
            metalness: 0.35,
        });

        for (let phi = 0.25; phi < Math.PI * 0.72; phi += 0.14) {
            const ringRadius = Math.sin(phi) * 0.44;
            const ringY = Math.cos(phi) * 0.47 + 3.05;
            const circumference = 2 * Math.PI * ringRadius;
            const count = Math.max(8, Math.floor(circumference / 0.09));

            for (let i = 0; i < count; i++) {
                const theta = (i / count) * Math.PI * 2;
                const curl = new THREE.Mesh(curlGeo, curlMat);
                curl.position.set(
                    Math.cos(theta) * ringRadius,
                    ringY,
                    Math.sin(theta) * ringRadius
                );
                buddhaGroup.add(curl);
            }
        }

        // === EARS (elongated, prominent - sign of Buddha) ===
        const earGeo = new THREE.CapsuleGeometry(0.06, 0.32, 12, 16);
        [-1, 1].forEach(side => {
            const ear = new THREE.Mesh(earGeo, goldMat);
            ear.position.set(side * 0.4, 2.92, 0.02);
            ear.rotation.z = side * 0.12;
            buddhaGroup.add(ear);

            // Earlobe detail (elongated, thick)
            const lobeGeo = new THREE.SphereGeometry(0.05, 12, 8);
            lobeGeo.scale(0.8, 1.2, 0.6);
            const lobe = new THREE.Mesh(lobeGeo, goldMat);
            lobe.position.set(side * 0.42, 2.76, 0.02);
            buddhaGroup.add(lobe);
        });

        // === FACE FEATURES (detailed, clear, solemn) ===

        // --- Eyebrows (graceful arches) ---
        [-1, 1].forEach(side => {
            const browCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * 0.04, 3.16, 0.39),
                new THREE.Vector3(side * 0.1, 3.18, 0.4),
                new THREE.Vector3(side * 0.17, 3.17, 0.38),
                new THREE.Vector3(side * 0.22, 3.14, 0.36),
            ]);
            const browGeo = new THREE.TubeGeometry(browCurve, 16, 0.012, 8, false);
            const brow = new THREE.Mesh(browGeo, darkGoldMat);
            buddhaGroup.add(brow);
        });

        // --- Eyes (half-closed, meditative, MUCH larger) ---
        const eyeDetailMat = new THREE.MeshStandardMaterial({
            color: 0x120e04,
            roughness: 0.4,
            metalness: 0.25,
        });

        [-1, 1].forEach(side => {
            // Upper eyelid curve (prominent)
            const upperLidCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * 0.04, 3.08, 0.395),
                new THREE.Vector3(side * 0.09, 3.1, 0.405),
                new THREE.Vector3(side * 0.13, 3.095, 0.4),
                new THREE.Vector3(side * 0.19, 3.08, 0.39),
            ]);
            const upperLidGeo = new THREE.TubeGeometry(upperLidCurve, 20, 0.01, 8, false);
            const upperLid = new THREE.Mesh(upperLidGeo, darkGoldMat);
            buddhaGroup.add(upperLid);

            // Lower eyelid (thinner, subtle)
            const lowerLidCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * 0.05, 3.075, 0.395),
                new THREE.Vector3(side * 0.1, 3.065, 0.4),
                new THREE.Vector3(side * 0.14, 3.07, 0.398),
                new THREE.Vector3(side * 0.18, 3.08, 0.39),
            ]);
            const lowerLidGeo = new THREE.TubeGeometry(lowerLidCurve, 16, 0.006, 8, false);
            const lowerLid = new THREE.Mesh(lowerLidGeo, darkGoldMat);
            buddhaGroup.add(lowerLid);

            // Eye slit (dark line between lids)
            const slitCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * 0.05, 3.078, 0.4),
                new THREE.Vector3(side * 0.1, 3.08, 0.405),
                new THREE.Vector3(side * 0.14, 3.079, 0.4),
                new THREE.Vector3(side * 0.18, 3.078, 0.395),
            ]);
            const slitGeo = new THREE.TubeGeometry(slitCurve, 16, 0.004, 6, false);
            const slit = new THREE.Mesh(slitGeo, eyeDetailMat);
            buddhaGroup.add(slit);
        });

        // --- Nose (elegant, prominent bridge) ---
        const noseBridgeCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 3.12, 0.4),
            new THREE.Vector3(0, 3.06, 0.43),
            new THREE.Vector3(0, 2.98, 0.44),
            new THREE.Vector3(0, 2.94, 0.42),
        ]);
        const noseBridgeGeo = new THREE.TubeGeometry(noseBridgeCurve, 16, 0.018, 8, false);
        const noseBridge = new THREE.Mesh(noseBridgeGeo, faceMat);
        buddhaGroup.add(noseBridge);

        // Nose tip (rounded)
        const noseTipGeo = new THREE.SphereGeometry(0.025, 16, 12);
        noseTipGeo.scale(1.2, 0.8, 1);
        const noseTip = new THREE.Mesh(noseTipGeo, faceMat);
        noseTip.position.set(0, 2.94, 0.44);
        buddhaGroup.add(noseTip);

        // Nostrils (subtle indentations)
        [-1, 1].forEach(side => {
            const nostrilGeo = new THREE.SphereGeometry(0.012, 8, 6);
            const nostril = new THREE.Mesh(nostrilGeo, eyeDetailMat);
            nostril.position.set(side * 0.02, 2.935, 0.435);
            buddhaGroup.add(nostril);
        });

        // --- Mouth (serene, gentle smile) ---
        // Upper lip
        const upperLipCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.08, 2.9, 0.4),
            new THREE.Vector3(-0.04, 2.905, 0.41),
            new THREE.Vector3(0, 2.907, 0.415),
            new THREE.Vector3(0.04, 2.905, 0.41),
            new THREE.Vector3(0.08, 2.9, 0.4),
        ]);
        const upperLipGeo = new THREE.TubeGeometry(upperLipCurve, 20, 0.008, 8, false);
        const upperLip = new THREE.Mesh(upperLipGeo, faceMat);
        buddhaGroup.add(upperLip);

        // Lower lip (fuller)
        const lowerLipCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.07, 2.895, 0.4),
            new THREE.Vector3(-0.03, 2.885, 0.41),
            new THREE.Vector3(0, 2.883, 0.412),
            new THREE.Vector3(0.03, 2.885, 0.41),
            new THREE.Vector3(0.07, 2.895, 0.4),
        ]);
        const lowerLipGeo = new THREE.TubeGeometry(lowerLipCurve, 20, 0.009, 8, false);
        const lowerLip = new THREE.Mesh(lowerLipGeo, faceMat);
        buddhaGroup.add(lowerLip);

        // Lip line (dark seam)
        const lipLineCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.065, 2.897, 0.405),
            new THREE.Vector3(-0.03, 2.899, 0.412),
            new THREE.Vector3(0, 2.9, 0.414),
            new THREE.Vector3(0.03, 2.899, 0.412),
            new THREE.Vector3(0.065, 2.897, 0.405),
        ]);
        const lipLineGeo = new THREE.TubeGeometry(lipLineCurve, 16, 0.003, 6, false);
        const lipLine = new THREE.Mesh(lipLineGeo, eyeDetailMat);
        buddhaGroup.add(lipLine);

        // --- Chin (subtle definition) ---
        const chinGeo = new THREE.SphereGeometry(0.06, 16, 12);
        chinGeo.scale(1.5, 0.6, 0.8);
        const chin = new THREE.Mesh(chinGeo, goldMat);
        chin.position.set(0, 2.84, 0.38);
        buddhaGroup.add(chin);

        // --- Forehead dot (urna - third eye) ---
        const urnaGeo = new THREE.SphereGeometry(0.02, 16, 12);
        const urnaMat = new THREE.MeshStandardMaterial({
            color: 0xf0d060,
            emissive: 0x806020,
            emissiveIntensity: 0.6,
            metalness: 0.8,
            roughness: 0.15,
        });
        const urna = new THREE.Mesh(urnaGeo, urnaMat);
        urna.position.set(0, 3.14, 0.41);
        buddhaGroup.add(urna);

        // --- Neck lines (three lines of wisdom) ---
        for (let i = 0; i < 3; i++) {
            const neckY = 2.72 - i * 0.035;
            const neckCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.15, neckY, 0.18),
                new THREE.Vector3(-0.08, neckY - 0.005, 0.21),
                new THREE.Vector3(0, neckY - 0.008, 0.22),
                new THREE.Vector3(0.08, neckY - 0.005, 0.21),
                new THREE.Vector3(0.15, neckY, 0.18),
            ]);
            const neckLineGeo = new THREE.TubeGeometry(neckCurve, 16, 0.004, 6, false);
            const neckLine = new THREE.Mesh(neckLineGeo, darkGoldMat);
            buddhaGroup.add(neckLine);
        }

        // === HANDS (meditation mudra) ===
        const handGeo = new THREE.SphereGeometry(0.15, 24, 16);
        handGeo.scale(1.4, 0.5, 0.9);

        // Right hand (bottom, palm up)
        const rightHand = new THREE.Mesh(handGeo, goldMat);
        rightHand.position.set(0, 1.5, 0.38);
        rightHand.castShadow = true;
        buddhaGroup.add(rightHand);

        // Left hand (on top, palm up)
        const leftHand = new THREE.Mesh(handGeo.clone(), goldMat);
        leftHand.position.set(0, 1.56, 0.36);
        leftHand.scale.set(0.9, 1, 0.9);
        leftHand.castShadow = true;
        buddhaGroup.add(leftHand);

        // Thumbs touching
        const thumbGeo = new THREE.CapsuleGeometry(0.025, 0.1, 8, 10);
        const thumb = new THREE.Mesh(thumbGeo, goldMat);
        thumb.position.set(0, 1.62, 0.36);
        thumb.rotation.z = Math.PI / 2;
        buddhaGroup.add(thumb);


        buddhaGroup.position.y = -0.09;
        this.buddhaGroup = buddhaGroup;
        this.scene.add(buddhaGroup);
    }

    createLotusPetal(width, height, material) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(width * 0.5, height * 0.8, width, 0);
        shape.quadraticCurveTo(width * 0.5, -height * 0.2, 0, 0);

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.02,
            bevelEnabled: true,
            bevelThickness: 0.005,
            bevelSize: 0.005,
            bevelSegments: 3,
        });

        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    // ---- INCENSE BOWL (Lư Hương Bằng Đồng Cổ) ----
    createIncenseBurner() {
        const burnerGroup = new THREE.Group();

        const bronzeMat = new THREE.MeshPhysicalMaterial({
            color: 0x8a5a2b, // Brighter antique bronze
            metalness: 0.8,
            roughness: 0.5,
            clearcoat: 0.2,
        });

        const darkBronzeMat = new THREE.MeshPhysicalMaterial({
            color: 0x5a3a1c,
            metalness: 0.85,
            roughness: 0.6,
        });

        // Censer body
        const bodyGeo = new THREE.SphereGeometry(0.35, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const body = new THREE.Mesh(bodyGeo, bronzeMat);
        body.position.y = 0.35;
        body.rotation.x = Math.PI;
        body.castShadow = true;
        burnerGroup.add(body);

        // Ash surface
        const ashGeo = new THREE.CircleGeometry(0.33, 32);
        const ashMat = new THREE.MeshStandardMaterial({
            color: 0xd0c8b0,
            roughness: 1.0,
            metalness: 0.0,
        });
        const ash = new THREE.Mesh(ashGeo, ashMat);
        ash.rotation.x = -Math.PI / 2;
        ash.position.y = 0.33;
        burnerGroup.add(ash);

        // Neck & Rim
        const neckGeo = new THREE.CylinderGeometry(0.34, 0.35, 0.08, 32);
        const neck = new THREE.Mesh(neckGeo, darkBronzeMat);
        neck.position.y = 0.38;
        burnerGroup.add(neck);

        const rimGeo = new THREE.TorusGeometry(0.35, 0.02, 16, 48);
        const rim = new THREE.Mesh(rimGeo, bronzeMat);
        rim.position.y = 0.42;
        rim.rotation.x = Math.PI / 2;
        burnerGroup.add(rim);

        // 3 Legs
        const legGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
            const leg = new THREE.Mesh(legGeo, bronzeMat);
            leg.position.set(Math.cos(angle) * 0.22, 0.1, Math.sin(angle) * 0.22);
            leg.rotation.y = -angle;
            leg.rotation.x = 0.3;
            leg.castShadow = true;
            burnerGroup.add(leg);
        }

        // 2 Side handles
        const handleGeo = new THREE.TorusGeometry(0.12, 0.02, 16, 32, Math.PI);
        for (let i = 0; i < 2; i++) {
            const angle = i * Math.PI;
            const handle = new THREE.Mesh(handleGeo, bronzeMat);
            handle.position.set(Math.cos(angle) * 0.4, 0.25, Math.sin(angle) * 0.4);
            handle.rotation.y = -angle + Math.PI/2;
            burnerGroup.add(handle);
        }

        // Position at front edge of expanded altar
        burnerGroup.position.set(0, 0.78, 1.35); // moved further to the front
        burnerGroup.scale.setScalar(1.0);

        this.burnerGroup = burnerGroup;
        this.scene.add(burnerGroup);
    }

    // ---- INCENSE STICKS ----
    createIncenseSticks() {
        const stickGroup = new THREE.Group();

        const stickMat = new THREE.MeshStandardMaterial({
            color: 0x8b2500,
            roughness: 0.8,
            metalness: 0.0,
        });

        const tipMat = new THREE.MeshStandardMaterial({
            color: 0xff4500,
            emissive: 0xff3000,
            emissiveIntensity: 1.5,
            roughness: 0.5,
        });

        this.incenseSticks = [];
        this.incenseTips = [];

        const stickLength = 1.6;

        const stickConfigs = [
            {
                // Left stick (Front-left)
                pos: [-0.12, 0.23, 0.05],
                rot: [0.08, 0, 0.18]
            },
            {
                // Middle stick (Center-back)
                pos: [0.0, 0.23, -0.06],
                rot: [-0.10, 0, 0]
            },
            {
                // Right stick (Front-right)
                pos: [0.12, 0.23, 0.05],
                rot: [0.08, 0, -0.18]
            }
        ];

        stickConfigs.forEach((cfg, i) => {
            // Stick body
            const stickGeo = new THREE.CylinderGeometry(0.016, 0.016, stickLength, 8);
            stickGeo.translate(0, stickLength / 2, 0); // Pivot at bottom
            const stick = new THREE.Mesh(stickGeo, stickMat);
            
            // Position and rotate
            stick.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
            stick.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
            stickGroup.add(stick);
            this.incenseSticks.push(stick);

            // Glowing tip
            const tipGeo = new THREE.SphereGeometry(0.036, 12, 8);
            const tip = new THREE.Mesh(tipGeo, tipMat.clone());
            
            stick.updateMatrix();
            const topLocal = new THREE.Vector3(0, stickLength, 0).applyMatrix4(stick.matrix);
            tip.position.copy(topLocal);
            
            stickGroup.add(tip);
            this.incenseTips.push(tip);
        });

        // Place stick group inside the bowl's position
        stickGroup.position.copy(this.burnerGroup.position);
        stickGroup.scale.copy(this.burnerGroup.scale);

        this.stickGroup = stickGroup;
        this.stickGroup.visible = false;
        this.scene.add(stickGroup);
    }

    // ---- CANDLES ----
    createCandles() {
        this.candleLights = [];

        const candleMat = new THREE.MeshStandardMaterial({
            color: 0xcc3333,
            roughness: 0.6,
            metalness: 0.0,
        });

        const wickMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
        });

        [-1.1, 1.1].forEach((xPos, idx) => {
            const candleGroup = new THREE.Group();

            // Candle body
            const candleGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.35, 16);
            const candle = new THREE.Mesh(candleGeo, candleMat);
            candle.position.y = 0.175;
            candle.castShadow = true;
            candleGroup.add(candle);

            // Wick
            const wickGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6);
            const wick = new THREE.Mesh(wickGeo, wickMat);
            wick.position.y = 0.37;
            candleGroup.add(wick);

            // Flame (glow sprite)
            const flameTex = generateGlowTexture();
            const flameMat = new THREE.SpriteMaterial({
                map: flameTex,
                color: 0xffaa40,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
            });
            const flame = new THREE.Sprite(flameMat);
            flame.position.y = 0.42;
            flame.scale.set(0.15, 0.25, 1);
            candleGroup.add(flame);

            // Candle holder (simple disc)
            const holderGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16);
            const holderMat = new THREE.MeshStandardMaterial({
                color: 0x8b6914,
                metalness: 0.7,
                roughness: 0.3,
            });
            const holder = new THREE.Mesh(holderGeo, holderMat);
            holder.position.y = 0.0;
            candleGroup.add(holder);

            // Point light for candle
            const candleLight = new THREE.PointLight(0xff9940, 0.8, 5, 2);
            candleLight.position.y = 0.45;
            candleLight.castShadow = idx === 0;
            if (candleLight.castShadow) {
                candleLight.shadow.mapSize.set(512, 512);
            }
            candleGroup.add(candleLight);

            candleGroup.position.set(xPos, 0.78, 1.1);
            this.scene.add(candleGroup);

            this.candleLights.push({ light: candleLight, flame, baseIntensity: 0.8 });
        });
    }

    // ---- HALO / MANDALA ----
    createHalo() {
        const haloGroup = new THREE.Group();

        // Outer ring (larger to match bigger statue)
        const outerGeo = new THREE.TorusGeometry(1.2, 0.018, 8, 64);
        const haloMat = new THREE.MeshStandardMaterial({
            color: 0xf0c060,
            emissive: 0x604010,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
        });
        const outer = new THREE.Mesh(outerGeo, haloMat);
        haloGroup.add(outer);

        // Middle ring
        const midGeo = new THREE.TorusGeometry(1.0, 0.012, 8, 56);
        const mid = new THREE.Mesh(midGeo, haloMat);
        haloGroup.add(mid);

        // Inner ring
        const innerGeo = new THREE.TorusGeometry(0.8, 0.01, 8, 48);
        const inner = new THREE.Mesh(innerGeo, haloMat);
        haloGroup.add(inner);

        // Rays (small lines radiating out)
        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const rayGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
            const ray = new THREE.Mesh(rayGeo, haloMat);
            ray.position.set(
                Math.cos(angle) * 1.1,
                Math.sin(angle) * 1.1,
                0
            );
            ray.rotation.z = angle - Math.PI / 2;
            haloGroup.add(ray);
        }

        // Glow sprite behind halo
        const glowTex = generateGlowTexture();
        const glowMat = new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xffc040,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(4, 4, 1);
        glow.position.z = -0.15;
        haloGroup.add(glow);

        haloGroup.position.set(0, 3.05, -0.5);
        this.haloGroup = haloGroup;
        this.scene.add(haloGroup);
    }

    // ---- DUST PARTICLES ----
    createDustParticles() {
        const count = CONFIG.dust.count;
        const spread = CONFIG.dust.spread;

        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        this.dustVelocities = new Float32Array(count * 3);
        this.dustPhases = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * spread;
            positions[i3 + 1] = Math.random() * 6;
            positions[i3 + 2] = (Math.random() - 0.5) * spread;

            sizes[i] = Math.random() * 3 + 1;
            opacities[i] = Math.random() * 0.5 + 0.1;

            this.dustVelocities[i3] = (Math.random() - 0.5) * 0.002;
            this.dustVelocities[i3 + 1] = Math.random() * 0.001 + 0.0005;
            this.dustVelocities[i3 + 2] = (Math.random() - 0.5) * 0.002;

            this.dustPhases[i] = Math.random() * Math.PI * 2;
        }

        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const dustTex = generateDustTexture();
        const dustMat = new THREE.PointsMaterial({
            map: dustTex,
            size: 0.06,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            color: 0xffe8c0,
        });

        this.dustPoints = new THREE.Points(dustGeo, dustMat);
        this.scene.add(this.dustPoints);
    }

    // ---- AMBIENT SMOKE (always present, subtle) ----
    createAmbientSmokeSystem() {
        const count = CONFIG.incense.ambientSmokeCount;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        this.ambientSmokeData = [];

        for (let i = 0; i < count; i++) {
            this.ambientSmokeData.push({
                x: (Math.random() - 0.5) * 4,
                y: Math.random() * 5,
                z: (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 0.003,
                vy: Math.random() * 0.003 + 0.001,
                vz: (Math.random() - 0.5) * 0.003,
                life: Math.random(),
                maxLife: Math.random() * 0.5 + 0.5,
                size: Math.random() * 0.3 + 0.1,
                phase: Math.random() * Math.PI * 2,
            });

            const i3 = i * 3;
            positions[i3] = this.ambientSmokeData[i].x;
            positions[i3 + 1] = this.ambientSmokeData[i].y;
            positions[i3 + 2] = this.ambientSmokeData[i].z;
            sizes[i] = this.ambientSmokeData[i].size;
        }

        const smokeGeo = new THREE.BufferGeometry();
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smokeGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const smokeTex = generateSmokeTexture();
        const smokeMat = new THREE.PointsMaterial({
            map: smokeTex,
            size: 0.3,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            color: 0xffe0c0,
        });

        this.ambientSmokePoints = new THREE.Points(smokeGeo, smokeMat);
        this.scene.add(this.ambientSmokePoints);
    }

    // ---- INCENSE SMOKE SYSTEM ----
    createIncenseSmokeSystem() {
        const count = CONFIG.incense.smokeParticleCount;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        this.incenseSmokeData = [];

        for (let i = 0; i < count; i++) {
            this.incenseSmokeData.push({
                x: 0, y: 0, z: 0,
                vx: 0, vy: 0, vz: 0,
                life: 0,
                maxLife: Math.random() * 4 + 3,
                size: 0,
                active: false,
                tipIndex: i % 3,
                phase: Math.random() * Math.PI * 2,
            });

            const i3 = i * 3;
            positions[i3] = 0;
            positions[i3 + 1] = -10; // hide initially
            positions[i3 + 2] = 0;
            sizes[i] = 0;
        }

        const smokeGeo = new THREE.BufferGeometry();
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smokeGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const smokeTex = generateSmokeTexture();
        const smokeMat = new THREE.PointsMaterial({
            map: smokeTex,
            size: 0.35,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            color: 0xfff0e0,
        });

        this.incenseSmokePoints = new THREE.Points(smokeGeo, smokeMat);
        this.incenseSmokePoints.visible = false;
        this.scene.add(this.incenseSmokePoints);
    }

    // ---- AUDIO SYSTEM ----
    initAudio() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0;
        this.masterGain.connect(this.audioContext.destination);

        // Create reverb
        this.createReverb();

        // Start ambient sounds
        this.createMeditationPad();
        this.startWindChimes();
    }

    createReverb() {
        const ctx = this.audioContext;
        const duration = 4;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }

        this.reverb = ctx.createConvolver();
        this.reverb.buffer = impulse;

        this.reverbGain = ctx.createGain();
        this.reverbGain.gain.value = 0.3;

        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);

        // Dry path
        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 0.7;
        this.dryGain.connect(this.masterGain);
    }

    createMeditationPad() {
        const ctx = this.audioContext;

        // Layered sine pads for ambient meditation sound
        const frequencies = [65.41, 130.81, 196.0, 261.63]; // C2, C3, G3, C4
        this.padOscillators = [];

        frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.value = 0.03 / (idx + 1);

            // Slow tremolo
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.05 + idx * 0.02;

            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.01 / (idx + 1);

            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            osc.connect(gain);
            gain.connect(this.dryGain);
            gain.connect(this.reverb);

            osc.start();
            lfo.start();

            this.padOscillators.push({ osc, gain, lfo });
        });
    }

    startWindChimes() {
        const playChime = () => {
            if (!this.isAudioPlaying) return;

            const ctx = this.audioContext;
            // Pentatonic notes (ethereal temple chimes)
            const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
            const freq = notes[Math.floor(Math.random() * notes.length)];

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Add slight detune for shimmer
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 1.002;

            const gain = ctx.createGain();
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.dryGain);
            gain.connect(this.reverb);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + 4);
            osc2.stop(now + 4);

            // Schedule next chime
            const delay = Math.random() * 8000 + 4000;
            this.chimeTimeout = setTimeout(playChime, delay);
        };

        const delay = Math.random() * 3000 + 1000;
        this.chimeTimeout = setTimeout(playChime, delay);
    }

    // ---- OM CHANTING (for incense) - using real audio file ----
    startOmChanting() {
        // Use the real Om audio file (Download.mp4)
        if (!this.omAudio) {
            this.omAudio = new Audio('Download.mp4');
            this.omAudio.loop = true;
            this.omAudio.volume = 0;
        }

        this.omAudio.currentTime = 0;
        this.omAudio.play().catch(e => console.log('Om audio:', e));

        // Fade in smoothly over 3 seconds
        if (this.omFadeInterval) clearInterval(this.omFadeInterval);
        let vol = 0;
        this.omFadeInterval = setInterval(() => {
            vol += 0.01;
            if (vol >= 0.75) {
                vol = 0.75;
                clearInterval(this.omFadeInterval);
                this.omFadeInterval = null;
            }
            if (this.omAudio) this.omAudio.volume = vol;
        }, 30);
    }

    stopOmChanting() {
        if (this.omFadeInterval) {
            clearInterval(this.omFadeInterval);
            this.omFadeInterval = null;
        }
        if (!this.omAudio) return;

        // Fade out smoothly over 3 seconds
        let vol = this.omAudio.volume;
        const fadeOut = setInterval(() => {
            vol -= 0.01;
            if (vol <= 0) {
                vol = 0;
                this.omAudio.pause();
                this.omAudio.currentTime = 0;
                clearInterval(fadeOut);
            }
            if (this.omAudio) this.omAudio.volume = Math.max(0, vol);
        }, 30);
    }

    toggleAudio() {
        if (!this.audioContext) {
            this.initAudio();
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isAudioPlaying = !this.isAudioPlaying;

        const targetGain = this.isAudioPlaying ? 0.8 : 0;
        this.masterGain.gain.linearRampToValueAtTime(
            targetGain,
            this.audioContext.currentTime + 1
        );

        // Update button
        const icon = document.getElementById('audio-icon');
        const text = document.getElementById('audio-text');
        const btn = document.getElementById('btn-audio');

        if (this.isAudioPlaying) {
            icon.textContent = '🔊';
            text.textContent = 'Tắt Âm Thanh';
            btn.classList.add('active');
            if (!this.chimeTimeout) this.startWindChimes();
        } else {
            icon.textContent = '🔇';
            text.textContent = 'Âm Thanh';
            btn.classList.remove('active');
        }
    }

    // ---- INCENSE INTERACTION ----
    lightIncense() {
        if (this.isIncenseBurning) return;
        this.isIncenseBurning = true;

        // Ensure sticks are created
        if (!this.stickGroup) {
            this.createIncenseSticks();
        }
        if (!this.incenseSmokePoints) {
            this.createIncenseSmokeSystem();
        }

        // Show sticks with animation
        this.stickGroup.visible = true;
        this.stickGroup.scale.setScalar(0);

        // Animate sticks appearing
        this.animateStickAppearance();

        // Show smoke
        this.incenseSmokePoints.visible = true;
        this.incenseSmokePoints.material.opacity = 0.08;

        // Reset smoke data
        this.incenseSmokeData.forEach(p => {
            p.active = false;
            p.life = 0;
        });

        // Reset timer
        this.incenseTimeRemaining = CONFIG.incense.burnDuration;
        this.incenseStartTime = Date.now();

        // UI updates
        const btn = document.getElementById('btn-incense');
        btn.classList.add('burning');
        btn.querySelector('.btn-text').textContent = 'Đang Cháy...';

        const timerDisplay = document.getElementById('timer-display');
        timerDisplay.classList.remove('hidden');

        // Show prayer button and panel
        const btnPrayer = document.getElementById('btn-prayer');
        if (btnPrayer) {
            btnPrayer.classList.remove('hidden');
            btnPrayer.classList.add('active');
        }
        const prayerPanel = document.getElementById('prayer-panel');
        if (prayerPanel) {
            prayerPanel.classList.remove('hidden');
        }

        // Start Om chanting if audio is on
        if (this.isAudioPlaying || !this.audioContext) {
            if (!this.audioContext) this.initAudio();
            if (!this.isAudioPlaying) this.toggleAudio();
            this.playBellSound();
            this.startOmChanting();
        } else if (this.isAudioPlaying) {
            this.playBellSound();
            this.startOmChanting();
        }

        // Start timer interval
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    playBellSound() {
        if (!this.audioContext) return;
        
        const t = this.audioContext.currentTime;
        const duration = 6.0;
        const freq = 220.0; 
        
        const masterGain = this.audioContext.createGain();
        masterGain.connect(this.masterGain);
        
        masterGain.gain.setValueAtTime(0, t);
        masterGain.gain.linearRampToValueAtTime(0.8, t + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        const partials = [
            { f: freq * 1.0, a: 1.0 },
            { f: freq * 2.76, a: 0.5 },
            { f: freq * 5.4, a: 0.2 },
            { f: freq * 8.9, a: 0.1 }
        ];
        
        partials.forEach(p => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(p.f, t);
            
            gain.gain.setValueAtTime(p.a, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + (duration * 0.5));
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            osc.start(t);
            osc.stop(t + duration);
        });
    }

    animateStickAppearance() {
        let progress = 0;
        const animate = () => {
            progress += 0.02;
            if (progress >= 1) {
                this.stickGroup.scale.setScalar(1);
                return;
            }
            const eased = 1 - Math.pow(1 - progress, 3);
            this.stickGroup.scale.setScalar(eased);
            requestAnimationFrame(animate);
        };
        animate();
    }

    updateTimer() {
        const elapsed = (Date.now() - this.incenseStartTime) / 1000;
        this.incenseTimeRemaining = Math.max(0, CONFIG.incense.burnDuration - elapsed);

        const minutes = Math.floor(this.incenseTimeRemaining / 60);
        const seconds = Math.floor(this.incenseTimeRemaining % 60);

        document.getElementById('timer-text').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Update progress ring
        const progress = 1 - (this.incenseTimeRemaining / CONFIG.incense.burnDuration);
        const circumference = 2 * Math.PI * 45; // r=45
        document.getElementById('timer-progress').style.strokeDashoffset =
            circumference * progress;

        if (this.incenseTimeRemaining <= 0) {
            this.extinguishIncense();
        }
    }

    extinguishIncense() {
        this.isIncenseBurning = false;

        // Hide prayer button and panel
        const btnPrayer = document.getElementById('btn-prayer');
        if (btnPrayer) {
            btnPrayer.classList.add('hidden');
            btnPrayer.classList.remove('active');
        }
        const prayerPanel = document.getElementById('prayer-panel');
        if (prayerPanel) {
            prayerPanel.classList.add('hidden');
        }

        // Hide active prayer
        const activePrayer = document.getElementById('active-prayer');
        if (activePrayer) {
            activePrayer.classList.add('hidden');
            setTimeout(() => {
                activePrayer.textContent = '';
            }, 800);
        }

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Fade out sticks
        let fadeProgress = 0;
        const fadeOut = () => {
            fadeProgress += 0.01;
            if (fadeProgress >= 1) {
                this.stickGroup.visible = false;
                this.incenseSmokePoints.visible = false;
                return;
            }
            const alpha = 1 - fadeProgress;
            this.stickGroup.scale.setScalar(alpha);
            this.incenseSmokePoints.material.opacity = 0.15 * alpha;
            requestAnimationFrame(fadeOut);
        };
        fadeOut();

        // Stop Om chanting
        this.stopOmChanting();

        // Reset UI
        const btn = document.getElementById('btn-incense');
        btn.classList.remove('burning');
        btn.querySelector('.btn-text').textContent = 'Thắp Hương';

        setTimeout(() => {
            document.getElementById('timer-display').classList.add('hidden');
        }, 1500);
    }

    // ---- UI SETUP ----
    setupUI() {
        document.getElementById('btn-incense').addEventListener('click', () => {
            this.lightIncense();
        });

        document.getElementById('btn-audio').addEventListener('click', () => {
            this.toggleAudio();
        });

        document.getElementById('btn-hide').addEventListener('click', () => {
            const overlay = document.getElementById('overlay');
            overlay.classList.toggle('ui-hidden');
            const btnHide = document.getElementById('btn-hide');
            if (overlay.classList.contains('ui-hidden')) {
                btnHide.querySelector('#hide-icon').textContent = '👁️‍🗨️';
                btnHide.querySelector('#hide-text').textContent = 'Hiện UI';
            } else {
                btnHide.querySelector('#hide-icon').textContent = '👁️';
                btnHide.querySelector('#hide-text').textContent = 'Ẩn UI';
            }
        });

        // Toggle prayer panel
        const btnPrayer = document.getElementById('btn-prayer');
        const prayerPanel = document.getElementById('prayer-panel');
        if (btnPrayer && prayerPanel) {
            btnPrayer.addEventListener('click', () => {
                prayerPanel.classList.toggle('hidden');
                btnPrayer.classList.toggle('active');
            });
        }

        // Toggle template categories (accordion)
        document.querySelectorAll('.category-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.parentElement;
                // Close other categories
                document.querySelectorAll('.template-category').forEach(cat => {
                    if (cat !== category) {
                        cat.classList.remove('active');
                    }
                });
                // Toggle current
                category.classList.toggle('active');
            });
        });

        // Click template item to insert text
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const text = e.currentTarget.textContent.trim();
                const textarea = document.getElementById('prayer-input');
                if (textarea) {
                    textarea.value = text;
                    textarea.focus();
                }
            });
        });

        // Send prayer
        const btnSend = document.getElementById('btn-send-prayer');
        if (btnSend) {
            btnSend.addEventListener('click', () => {
                const textarea = document.getElementById('prayer-input');
                if (!textarea) return;
                const text = textarea.value.trim();
                if (text.length > 0) {
                    this.showFloatingPrayer(text);

                    // Display active prayer under subtitle
                    const activePrayer = document.getElementById('active-prayer');
                    if (activePrayer) {
                        activePrayer.textContent = `“ ${text} ”`;
                        activePrayer.classList.remove('hidden');
                    }

                    textarea.value = '';
                    // Close panel and reset toggle button active state
                    if (prayerPanel) prayerPanel.classList.add('hidden');
                    if (btnPrayer) btnPrayer.classList.remove('active');
                }
            });
        }
    }

    showFloatingPrayer(text) {
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-prayer-text';
        floatingText.textContent = text;
        document.getElementById('app').appendChild(floatingText);
        setTimeout(() => {
            floatingText.remove();
        }, 9000);
    }

    // ---- ANIMATION LOOP ----
    animate() {
        requestAnimationFrame(() => this.animate());

        const time = this.clock.getElapsedTime();
        const delta = this.clock.getDelta();

        // Update controls
        this.controls.update();

        // Animate dust particles
        this.updateDust(time);

        // Animate ambient smoke
        this.updateAmbientSmoke(time);

        // Animate incense smoke if burning
        if (this.isIncenseBurning) {
            // Calculate progress and update stick lengths
            const progress = this.incenseTimeRemaining / CONFIG.incense.burnDuration;
            this.updateIncenseSticks(progress);

            this.updateIncenseSmoke(time);
        }

        // Animate candle flicker
        this.updateCandleFlicker(time);

        // Animate halo glow
        if (this.haloGroup) {
            this.haloGroup.rotation.z = Math.sin(time * 0.15) * 0.03;
        }

        // Animate incense tips glow
        if (this.isIncenseBurning && this.incenseTips) {
            this.incenseTips.forEach((tip, i) => {
                const mat = tip.material;
                mat.emissiveIntensity = 1.0 + Math.sin(time * 3 + i * 2) * 0.5;
            });
        }

        // Render
        this.composer.render();
    }

    updateDust(time) {
        if (!this.dustPoints) return;
        const positions = this.dustPoints.geometry.attributes.position.array;
        const count = CONFIG.dust.count;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const phase = this.dustPhases[i];

            // Brownian motion with sine-based drift
            positions[i3] += Math.sin(time * 0.3 + phase) * 0.003;
            positions[i3 + 1] += this.dustVelocities[i3 + 1];
            positions[i3 + 2] += Math.cos(time * 0.2 + phase * 1.3) * 0.002;

            // Reset if too high
            if (positions[i3 + 1] > 7) {
                positions[i3 + 1] = -0.5;
                positions[i3] = (Math.random() - 0.5) * CONFIG.dust.spread;
                positions[i3 + 2] = (Math.random() - 0.5) * CONFIG.dust.spread;
            }
        }

        this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    updateAmbientSmoke(time) {
        if (!this.ambientSmokePoints) return;
        const positions = this.ambientSmokePoints.geometry.attributes.position.array;

        this.ambientSmokeData.forEach((p, i) => {
            const i3 = i * 3;

            p.x += Math.sin(time * 0.5 + p.phase) * 0.005;
            p.y += p.vy;
            p.z += Math.cos(time * 0.4 + p.phase * 1.5) * 0.004;

            if (p.y > 6) {
                p.y = 0;
                p.x = (Math.random() - 0.5) * 4;
                p.z = (Math.random() - 0.5) * 4;
            }

            positions[i3] = p.x;
            positions[i3 + 1] = p.y;
            positions[i3 + 2] = p.z;
        });

        this.ambientSmokePoints.geometry.attributes.position.needsUpdate = true;
    }

    updateIncenseSmoke(time) {
        if (!this.incenseSmokePoints || !this.incenseTips) return;

        const positions = this.incenseSmokePoints.geometry.attributes.position.array;
        const sizes = this.incenseSmokePoints.geometry.attributes.size.array;
        const spawnRate = 3; // particles per frame

        let spawned = 0;

        this.incenseSmokeData.forEach((p, i) => {
            const i3 = i * 3;

            if (p.active) {
                // Update active particle
                p.life += 0.016;

                if (p.life >= p.maxLife) {
                    p.active = false;
                    positions[i3 + 1] = -10;
                    sizes[i] = 0;
                    return;
                }

                const lifeRatio = p.life / p.maxLife;

                // Movement: rise with turbulence (slowed down)
                p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.0015;
                p.y += p.vy * (1 + lifeRatio * 0.3);
                p.z += p.vz + Math.cos(time * 1.2 + p.phase * 1.7) * 0.0015;

                // Slight drift
                p.vx += (Math.random() - 0.5) * 0.0001;
                p.vz += (Math.random() - 0.5) * 0.0001;

                // Size grows then shrinks
                const sizeCurve = Math.sin(lifeRatio * Math.PI);
                sizes[i] = p.size * sizeCurve;

                positions[i3] = p.x;
                positions[i3 + 1] = p.y;
                positions[i3 + 2] = p.z;

            } else if (spawned < spawnRate && this.isIncenseBurning) {
                // Spawn new particle
                const tipIndex = p.tipIndex;
                if (tipIndex < this.incenseTips.length) {
                    const tip = this.incenseTips[tipIndex];
                    const worldPos = new THREE.Vector3();
                    tip.getWorldPosition(worldPos);

                    p.active = true;
                    p.life = 0;
                    p.x = worldPos.x + (Math.random() - 0.5) * 0.03;
                    p.y = worldPos.y;
                    p.z = worldPos.z + (Math.random() - 0.5) * 0.03;
                    p.vx = (Math.random() - 0.5) * 0.002;
                    p.vy = 0.004 + Math.random() * 0.002;
                    p.vz = (Math.random() - 0.5) * 0.002;
                    p.size = Math.random() * 0.4 + 0.15;
                    p.phase = Math.random() * Math.PI * 2;

                    positions[i3] = p.x;
                    positions[i3 + 1] = p.y;
                    positions[i3 + 2] = p.z;

                    spawned++;
                }
            }
        });

        this.incenseSmokePoints.geometry.attributes.position.needsUpdate = true;
        this.incenseSmokePoints.geometry.attributes.size.needsUpdate = true;
    }

    updateIncenseSticks(progress) {
        if (!this.incenseSticks || !this.incenseTips) return;
        
        progress = Math.max(0.05, Math.min(1, progress));
        const stickLength = 1.6;
        
        this.incenseSticks.forEach((stick, i) => {
            stick.scale.y = progress;
            stick.updateMatrix();
            const topLocal = new THREE.Vector3(0, stickLength, 0).applyMatrix4(stick.matrix);
            this.incenseTips[i].position.copy(topLocal);
        });
    }

    updateCandleFlicker(time) {
        this.candleLights.forEach(({ light, flame, baseIntensity }, idx) => {
            // Simulate candle flicker
            const flicker = Math.sin(time * 8 + idx * 3) * 0.15 +
                Math.sin(time * 13 + idx * 7) * 0.1 +
                Math.sin(time * 23 + idx * 11) * 0.05;

            light.intensity = baseIntensity + flicker;

            // Flame sprite wobble
            flame.scale.x = 0.15 + Math.sin(time * 6 + idx * 4) * 0.02;
            flame.scale.y = 0.25 + Math.sin(time * 8 + idx * 5) * 0.03;
            flame.position.x = Math.sin(time * 4 + idx * 3) * 0.01;
        });
    }

    // ---- RESIZE ----
    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }
}

// =============================================
// LAUNCH
// =============================================
const app = new MeditationScene();
window.app = app;
