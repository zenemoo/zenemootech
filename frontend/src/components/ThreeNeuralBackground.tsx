import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeNeuralBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 40;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Particle geometry
    const particleCount = 110;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      // Smooth slow-motion velocities
      velocities.push({
        x: (Math.random() - 0.5) * 0.008,
        y: (Math.random() - 0.5) * 0.008,
        z: (Math.random() - 0.5) * 0.008,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.4, 'rgba(59, 130, 246, 0.85)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 1.3,
      map: texture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Static buffer for lines to avoid garbage collection on every frame
    const maxLineConnections = 350;
    const maxLineFloats = maxLineConnections * 2 * 3; // 2 vertices per line, 3 coords per vertex
    const linePositionsBuffer = new Float32Array(maxLineFloats);
    const lineGeometry = new THREE.BufferGeometry();
    const linePositionAttribute = new THREE.BufferAttribute(linePositionsBuffer, 3);
    linePositionAttribute.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute('position', linePositionAttribute);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // Central 3D Geometric Ring
    const torusGeometry = new THREE.TorusKnotGeometry(12, 2.5, 80, 12);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torus);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let isTabVisible = true;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.004;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.004;
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Smooth Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isTabVisible) return;

      targetX += (mouseX - targetX) * 0.025;
      targetY += (mouseY - targetY) * 0.025;

      particles.rotation.y += 0.0003 + targetX * 0.001;
      particles.rotation.x += 0.0002 + targetY * 0.001;
      torus.rotation.x += 0.0006;
      torus.rotation.y += 0.0008;

      // Update particle positions
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      let lineVertexCount = 0;

      for (let i = 0; i < particleCount; i++) {
        let x = posArray[i * 3];
        let y = posArray[i * 3 + 1];
        let z = posArray[i * 3 + 2];

        x += velocities[i].x;
        y += velocities[i].y;
        z += velocities[i].z;

        if (Math.abs(x) > 40) velocities[i].x *= -1;
        if (Math.abs(y) > 40) velocities[i].y *= -1;
        if (Math.abs(z) > 40) velocities[i].z *= -1;

        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;

        // Neighbor connection check
        if (lineVertexCount < maxLineFloats - 6) {
          for (let j = i + 1; j < particleCount; j++) {
            const dx = x - posArray[j * 3];
            const dy = y - posArray[j * 3 + 1];
            const dz = z - posArray[j * 3 + 2];
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < 130) {
              linePositionsBuffer[lineVertexCount++] = x;
              linePositionsBuffer[lineVertexCount++] = y;
              linePositionsBuffer[lineVertexCount++] = z;
              linePositionsBuffer[lineVertexCount++] = posArray[j * 3];
              linePositionsBuffer[lineVertexCount++] = posArray[j * 3 + 1];
              linePositionsBuffer[lineVertexCount++] = posArray[j * 3 + 2];

              if (lineVertexCount >= maxLineFloats - 6) break;
            }
          }
        }
      }

      posAttr.needsUpdate = true;
      linePositionAttribute.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineVertexCount / 3);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      torusGeometry.dispose();
      torusMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-85 will-change-transform"
      style={{ transform: 'translateZ(0)' }}
    />
  );
};

