import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Scene3DProps {
  className?: string;
}

export default function Scene3D({ className = "" }: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // 1. Accessibility & Reduced Motion Check
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      return;
    }

    // 2. WebGL Detection
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setHasWebGL(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // 3. Three.js Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060908, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio < 2, // antialias only on lower dpi to maintain 60fps
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);

    // 4. Subtle ambient & warm directional lights
    const ambientLight = new THREE.AmbientLight(0x0a1410, 1.2);
    scene.add(ambientLight);

    const topGlow = new THREE.PointLight(0xf59e0b, 1.8, 30);
    topGlow.position.set(0, 5, 5);
    scene.add(topGlow);

    // 5. Procedural Starry Night Dust (Particles)
    const starCount = 380;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 35 - 5;
      starScales[i] = Math.random() * 1.5 + 0.5;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("scale", new THREE.BufferAttribute(starScales, 1));

    // Simple procedural circular point texture
    const starCanvas = document.createElement("canvas");
    starCanvas.width = 32;
    starCanvas.height = 32;
    const ctx = starCanvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, "rgba(251, 191, 36, 0.7)");
      gradient.addColorStop(0.8, "rgba(52, 211, 153, 0.2)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const starMaterial = new THREE.PointsMaterial({
      size: 0.35,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xfde68a,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 6. Floating Golden Lanterns
    // Procedural hexagonal lantern meshes with warm golden inner core
    const lanternGroup = new THREE.Group();
    scene.add(lanternGroup);

    interface LanternData {
      mesh: THREE.Group;
      baseX: number;
      speedY: number;
      swayFreq: number;
      swayAmp: number;
      phase: number;
      rotSpeed: number;
    }

    const lanterns: LanternData[] = [];
    const lanternCount = 14; // Lightweight, high performance

    // Reusable lantern parts
    const lanternFrameGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.2, 6, 1, true);
    const lanternCapGeo = new THREE.ConeGeometry(0.65, 0.45, 6);
    const lanternCoreGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.9, 6);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.35,
      metalness: 0.85,
      wireframe: false,
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.9,
    });

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < lanternCount; i++) {
      const singleLantern = new THREE.Group();

      // Outer frame
      const frameMesh = new THREE.Mesh(lanternFrameGeo, frameMat);
      singleLantern.add(frameMesh);

      // Top roof / cap
      const topCap = new THREE.Mesh(lanternCapGeo, capMat);
      topCap.position.y = 0.75;
      singleLantern.add(topCap);

      // Bottom cap
      const bottomCap = new THREE.Mesh(lanternCapGeo, capMat);
      bottomCap.position.y = -0.75;
      bottomCap.rotation.z = Math.PI;
      singleLantern.add(bottomCap);

      // Inner glowing core
      const coreMesh = new THREE.Mesh(lanternCoreGeo, coreMat);
      singleLantern.add(coreMesh);

      // Initial placement at various depths and heights
      const depthZ = (Math.random() - 0.5) * 16 - 2; // depth from -10 to +6
      const scale = THREE.MathUtils.lerp(0.5, 1.25, (depthZ + 10) / 16);
      singleLantern.scale.set(scale, scale, scale);

      const x = (Math.random() - 0.5) * 22;
      const y = (Math.random() - 0.5) * 22;

      singleLantern.position.set(x, y, depthZ);
      lanternGroup.add(singleLantern);

      lanterns.push({
        mesh: singleLantern,
        baseX: x,
        speedY: 0.008 + Math.random() * 0.009,
        swayFreq: 0.6 + Math.random() * 0.8,
        swayAmp: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.006,
      });
    }

    // 7. Mouse Parallax Sway
    let targetCameraX = 0;
    let targetCameraY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCameraX = nx * 1.5;
      targetCameraY = ny * 1.0;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // 8. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Camera gentle smooth lerp towards mouse target
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Stars slow rotation
      starPoints.rotation.y = elapsedTime * 0.015;
      starPoints.rotation.x = Math.sin(elapsedTime * 0.01) * 0.05;

      // Update Lanterns
      for (let i = 0; i < lanterns.length; i++) {
        const item = lanterns[i];
        // Float upward
        item.mesh.position.y += item.speedY;

        // Reset to bottom once exited top
        if (item.mesh.position.y > 14) {
          item.mesh.position.y = -14;
        }

        // Horizontal sway
        item.mesh.position.x =
          item.baseX + Math.sin(elapsedTime * item.swayFreq + item.phase) * item.swayAmp;

        // Gentle axial tilt/rotation
        item.mesh.rotation.y += item.rotSpeed;
        item.mesh.rotation.z = Math.sin(elapsedTime * 0.8 + item.phase) * 0.06;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 10. Clean Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(animId);

      // Dispose Three.js objects
      starGeometry.dispose();
      starMaterial.dispose();
      starTexture.dispose();
      lanternFrameGeo.dispose();
      lanternCapGeo.dispose();
      lanternCoreGeo.dispose();
      frameMat.dispose();
      capMat.dispose();
      coreMat.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [reducedMotion]);

  // Fallback 2D if WebGL is unavailable or user requested reduced motion
  if (!hasWebGL || reducedMotion) {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-400/5 rounded-full blur-2xl" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
