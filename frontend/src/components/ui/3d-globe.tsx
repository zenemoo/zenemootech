import React, { useEffect, useRef, useState } from 'react';

export interface GlobeMarker {
  latitude: number;
  longitude: number;
  label?: string;
  sublabel?: string;
  tag?: string;
  color?: string;
  size?: number;
}

export interface Globe3DProps {
  textureUrl?: string;
  atmosphereColor?: string;
  atmosphereIntensity?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableRotate?: boolean;
  markers?: GlobeMarker[];
  className?: string;
  style?: React.CSSProperties;
  showCallout?: boolean;
}

/**
 * Globe3D — High-Resolution Cinematic 3D Earth with India/Odisha Geographic Focus
 * 
 * Features:
 * - Highly detailed, realistic Earth with crisp landmasses, mountain terrain, deep blue oceans, and cloud definitions
 * - India and Asia prominently visible in prime center-stage view
 * - High-precision geographic anchor for Odisha, India (Lat: 20.9517° N, Lon: 85.0985° E)
 * - Dual-layer atmospheric Fresnel rim lighting (Cyan / Royal Blue halo with electric violet aura)
 * - Responsive Brand Badge:
 *   - Mobile (< 768px): Round logo ONLY
 *   - Tablet / Desktop (>= 768px): Round logo + "ZENEMOO" text
 * - Thin, elegant glowing cyan connector line anchored to Odisha
 * - Smooth geometric occlusion culling (smoothly hides on the far side, reveals on the front)
 */
export const Globe3D: React.FC<Globe3DProps> = ({
  textureUrl = '/assets/earth-realistic.jpg',
  atmosphereColor = '#00d9ff',
  atmosphereIntensity = 0.45,
  autoRotate = true,
  autoRotateSpeed = 0.0009,
  enableRotate = true,
  markers = [
    {
      latitude: 20.9517,
      longitude: 85.0985,
      label: 'ZENEMOO',
      color: '#00d9ff',
      size: 1.8,
    },
  ],
  className = '',
  style = {},
  showCallout = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Screen-space 2D coordinates for the Odisha pin & floating popup
  const [pinCoords, setPinCoords] = useState<{
    x: number;
    y: number;
    visible: boolean;
    opacity: number;
    isFrontFacing: boolean;
  }>({
    x: 0,
    y: 0,
    visible: false,
    opacity: 0,
    isFrontFacing: true,
  });

  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const activeMarker = markers[0] || {
    latitude: 20.9517,
    longitude: 85.0985,
    label: 'ZENEMOO',
  };

  useEffect(() => {
    const handleWindowResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let isCancelled = false;
    let animationFrameId: number;
    let cleanupFn: (() => void) | null = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('three').then((THREE) => {
      if (isCancelled || !mountRef.current) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const isSmallMobile = w < 480;
      const isMobile = w < 768;
      const isTablet = w >= 768 && w < 1024;
      const isLaptop = w >= 1024 && w < 1440;
      const isLargeDesktop = w >= 1920;

      // ── 1. Scene, Camera, Renderer ─────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      
      const cameraDistance = isSmallMobile ? 42 : isMobile ? 44 : isTablet ? 45 : isLaptop ? 46 : isLargeDesktop ? 48 : 46;
      camera.position.set(0, 0, cameraDistance);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
      });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      mount.appendChild(renderer.domElement);

      // ── 2. Earth Globe Group & Geometry (Elevated Composition) ────────────
      const globeRadius = isSmallMobile
        ? 6.6
        : isMobile
        ? 7.2
        : isTablet
        ? 8.0
        : isLaptop
        ? 8.8
        : isLargeDesktop
        ? 10.2
        : 9.4;

      const globeGroup = new THREE.Group();

      // Earth Axial Tilt (23.4°)
      globeGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
      // Initial rotation aligned so India / Odisha starts facing the viewer directly
      globeGroup.rotation.y = -2.85;

      const posY = isSmallMobile
        ? -0.3
        : isMobile
        ? -0.6
        : isTablet
        ? -1.4
        : isLaptop
        ? -2.0
        : isLargeDesktop
        ? -2.4
        : -2.2;

      globeGroup.position.set(0, posY, -4);
      scene.add(globeGroup);

      // ── 3. Texture Loader & Realistic Earth Material ────────────────────────
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(textureUrl, () => {
        earthTexture.wrapS = THREE.RepeatWrapping;
        earthTexture.wrapT = THREE.ClampToEdgeWrapping;
        earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        renderer.render(scene, camera);
      });

      const earthGeo = new THREE.SphereGeometry(
        globeRadius,
        isMobile ? 54 : 72,
        isMobile ? 54 : 72
      );

      const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        color: new THREE.Color(0xf0f6fc),
        emissive: new THREE.Color(0x061120),
        specular: new THREE.Color(0x38bdf8),
        shininess: 35,
        transparent: true,
        opacity: isMobile ? 0.94 : 0.98,
      });

      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      globeGroup.add(earthMesh);

      // ── 4. Coordinate Conversion Helper ────────────────────────────────────
      const latLonToVector3 = (lat: number, lon: number, radius: number) => {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon + 180);
        return new THREE.Vector3(
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
      };

      // ── 5. Atmospheric Fresnel Rim Glow Shaders ────────────────────────────
      // Inner Atmospheric Halo
      const innerAtmosGeo = new THREE.SphereGeometry(globeRadius * 1.015, 48, 48);
      const innerAtmosMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform vec3 uColor;
          uniform float uIntensity;
          void main() {
            vec3 viewDir = normalize(-vPosition);
            float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
            float alpha = pow(rim, 3.2) * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        uniforms: {
          uColor: { value: new THREE.Color(atmosphereColor) },
          uIntensity: { value: atmosphereIntensity },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const innerAtmosMesh = new THREE.Mesh(innerAtmosGeo, innerAtmosMat);
      globeGroup.add(innerAtmosMesh);

      // Outer Deep Blue/Ethereal Aura
      const outerAtmosGeo = new THREE.SphereGeometry(globeRadius * 1.065, 48, 48);
      const outerAtmosMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform vec3 uColor;
          void main() {
            vec3 viewDir = normalize(-vPosition);
            float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
            float alpha = pow(rim, 4.6) * 0.25;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        uniforms: {
          uColor: { value: new THREE.Color('#38bdf8') },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const outerAtmosMesh = new THREE.Mesh(outerAtmosGeo, outerAtmosMat);
      globeGroup.add(outerAtmosMesh);

      // ── 6. Background Starfield & Subtle Cosmic Data Particles ────────────
      const starCount = isMobile ? 140 : 280;
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      const colorPalette = [
        new THREE.Color('#00d9ff'),
        new THREE.Color('#38bdf8'),
        new THREE.Color('#818cf8'),
        new THREE.Color('#ffffff'),
      ];

      for (let i = 0; i < starCount; i++) {
        const radius = 35 + Math.random() * 45;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = radius * Math.cos(phi);

        const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        starColors[i * 3] = col.r;
        starColors[i * 3 + 1] = col.g;
        starColors[i * 3 + 2] = col.b;
      }

      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

      const createStarTexture = () => {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext('2d');
        if (ctx) {
          const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
          grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 32, 32);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      };

      const starTexture = createStarTexture();
      const starMat = new THREE.PointsMaterial({
        size: isMobile ? 0.70 : 0.85,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const starPoints = new THREE.Points(starGeo, starMat);
      scene.add(starPoints);

      // ── 7. Geographic Beacon at Odisha, India ─────────────────────────────
      const odishaLat = activeMarker.latitude;
      const odishaLon = activeMarker.longitude;
      const odishaSurfacePos = latLonToVector3(odishaLat, odishaLon, globeRadius * 1.002);
      const odishaStemTopPos = latLonToVector3(odishaLat, odishaLon, globeRadius * 1.025);

      const markerGroup = new THREE.Group();
      globeGroup.add(markerGroup);

      // Surface Glowing Dot
      const beaconGeo = new THREE.BufferGeometry().setFromPoints([odishaSurfacePos]);
      const beaconMat = new THREE.PointsMaterial({
        size: isMobile ? 1.4 : 1.8,
        map: starTexture,
        color: new THREE.Color('#00d9ff'),
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beaconMesh = new THREE.Points(beaconGeo, beaconMat);
      markerGroup.add(beaconMesh);

      // Pin Stem Line
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        odishaSurfacePos,
        odishaStemTopPos,
      ]);
      const stemMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#00d9ff'),
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const stemMesh = new THREE.Line(stemGeo, stemMat);
      markerGroup.add(stemMesh);

      // Pin Head Point
      const pinHeadGeo = new THREE.BufferGeometry().setFromPoints([odishaStemTopPos]);
      const pinHeadMat = new THREE.PointsMaterial({
        size: isMobile ? 1.1 : 1.4,
        map: starTexture,
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pinHeadMesh = new THREE.Points(pinHeadGeo, pinHeadMat);
      markerGroup.add(pinHeadMesh);

      // ── 8. Cinematic Balanced Lighting Setup ───────────────────────────────
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
      sunLight.position.set(40, 22, 48);
      scene.add(sunLight);

      const cyanRimLight = new THREE.PointLight(0x00d9ff, 1.25, 130);
      cyanRimLight.position.set(-36, -16, 28);
      scene.add(cyanRimLight);

      const purpleAccentLight = new THREE.PointLight(0xa855f7, 0.80, 110);
      purpleAccentLight.position.set(32, -26, 20);
      scene.add(purpleAccentLight);

      // ── 9. Mouse Parallax & Window Events ──────────────────────────────────
      let mouseX = 0;
      let mouseY = 0;
      let targetCameraX = 0;
      let targetCameraY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        if (!enableRotate) return;
        mouseX = (e.clientX - window.innerWidth / 2) * 0.0008;
        mouseY = -(e.clientY - window.innerHeight / 2) * 0.0008;
      };

      if (!isMobile && !prefersReducedMotion) {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
      }

      let isTabActive = true;
      const handleVisibilityChange = () => {
        isTabActive = !document.hidden;
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const handleResize = () => {
        const curW = window.innerWidth;
        const curH = window.innerHeight;
        camera.aspect = curW / curH;
        camera.updateProjectionMatrix();
        renderer.setSize(curW, curH);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, curW < 768 ? 1.25 : 1.75));
      };
      window.addEventListener('resize', handleResize);

      // ── 10. Animation Loop & Screen Projection ─────────────────────────────
      let clock = 0;
      const odishaNormal = odishaSurfacePos.clone().normalize();
      const worldNormal = new THREE.Vector3();
      const worldPos = new THREE.Vector3();
      const camPosVec = new THREE.Vector3();
      const projectedScreenVec = new THREE.Vector3();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (!isTabActive) return;

        clock += 0.016;

        if (!prefersReducedMotion && autoRotate) {
          globeGroup.rotation.y += autoRotateSpeed;
        }

        starPoints.rotation.y = clock * 0.0002;

        // Occlusion Calculation
        camPosVec.copy(camera.position).normalize();
        worldNormal.copy(odishaNormal).applyQuaternion(globeGroup.quaternion);
        const dot = worldNormal.dot(camPosVec);

        let visibilityFactor = 0;
        const isFacing = dot > 0.05;

        if (dot > 0.05) {
          visibilityFactor = Math.min(Math.max((dot - 0.05) / 0.20, 0.0), 1.0);
        }

        beaconMat.opacity = visibilityFactor * (0.85 + Math.sin(clock * 4.0) * 0.15);
        stemMat.opacity = visibilityFactor * 0.75;
        pinHeadMat.opacity = visibilityFactor;

        // 3D world pos of the pinhead projected to 2D screen coordinates
        worldPos.copy(odishaStemTopPos).applyMatrix4(globeGroup.matrixWorld);
        projectedScreenVec.copy(worldPos).project(camera);

        const currentW = window.innerWidth;
        const currentH = window.innerHeight;

        const screenX = (projectedScreenVec.x * 0.5 + 0.5) * currentW;
        const screenY = (-(projectedScreenVec.y * 0.5) + 0.5) * currentH;

        setPinCoords({
          x: screenX,
          y: screenY,
          visible: visibilityFactor > 0.02,
          opacity: visibilityFactor,
          isFrontFacing: isFacing,
        });

        // Smooth Camera Parallax Lerp
        if (!isMobile && !prefersReducedMotion) {
          targetCameraX += (mouseX - targetCameraX) * 0.035;
          targetCameraY += (mouseY - targetCameraY) * 0.035;
          camera.position.x = targetCameraX;
          camera.position.y = targetCameraY;
          camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);
      };

      animate();

      // ── 11. Cleanup & Disposal on Unmount ──────────────────────────────────
      cleanupFn = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);

        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }

        starTexture.dispose();
        earthTexture.dispose();
        starGeo.dispose();
        starMat.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        innerAtmosGeo.dispose();
        innerAtmosMat.dispose();
        outerAtmosGeo.dispose();
        outerAtmosMat.dispose();
        beaconGeo.dispose();
        beaconMat.dispose();
        stemGeo.dispose();
        stemMat.dispose();
        pinHeadGeo.dispose();
        pinHeadMat.dispose();

        renderer.dispose();
      };
    });

    return () => {
      isCancelled = true;
      if (cleanupFn) cleanupFn();
    };
  }, [
    textureUrl,
    atmosphereColor,
    atmosphereIntensity,
    autoRotate,
    autoRotateSpeed,
    enableRotate,
    activeMarker.latitude,
    activeMarker.longitude,
  ]);

  // Compute responsive badge sizing (Mobile: round icon only, Desktop: icon + text)
  const isMobile = windowDimensions.width < 768;
  const isSmallMobile = windowDimensions.width < 420;

  // On mobile (< 768px), badge is a compact round circle. On desktop (>= 768px), it's the full pill.
  const popupWidth = isMobile ? 36 : 148;
  const popupHeight = isMobile ? 36 : 38;

  // Floating offset: positioned above & slightly to the right of the pin point
  const offsetX = isMobile ? 12 : 24;
  const offsetY = isMobile ? -48 : -60;

  // Clamping within screen viewport with safety margins
  const targetCardX = Math.min(
    Math.max(pinCoords.x + offsetX, 10),
    windowDimensions.width - popupWidth - 10
  );
  const targetCardY = Math.min(
    Math.max(pinCoords.y + offsetY, 10),
    windowDimensions.height - popupHeight - 10
  );

  // Subtle connector line endpoints
  const pinX = pinCoords.x;
  const pinY = pinCoords.y;
  
  // Anchor cleanly to the bottom-center of the mobile circle or bottom-left of desktop pill
  const cardAnchorX = isMobile
    ? targetCardX + popupWidth / 2
    : targetCardX + (targetCardX > pinX ? 22 : popupWidth - 22);
  const cardAnchorY = targetCardY + popupHeight;

  // Smooth slight curve midpoint for connector line
  const midX = pinX + (cardAnchorX - pinX) * 0.35;
  const midY = cardAnchorY + 4;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={style}
    >
      {/* 3D WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Screen-Space HUD Overlay: Minimal Zenemoo Popup & Subtle Connector */}
      {showCallout && pinCoords.visible && (
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ease-out"
          style={{ opacity: pinCoords.opacity }}
        >
          {/* Subtle Thin Glowing SVG Connector Line */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0, 217, 255, 0.45))' }}
          >
            <defs>
              <linearGradient id="connectorGlowSubtle" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Thin subtle angled connector line */}
            <path
              d={`M ${pinX} ${pinY} Q ${midX} ${midY} ${cardAnchorX} ${cardAnchorY}`}
              fill="none"
              stroke="url(#connectorGlowSubtle)"
              strokeWidth={isMobile ? "1.2" : "1.5"}
              strokeDasharray="3 2"
              className="opacity-80"
            />

            {/* Odisha Location Dot on Globe Surface */}
            <circle
              cx={pinX}
              cy={pinY}
              r={isMobile ? "2.5" : "3.5"}
              fill="#00d9ff"
              stroke="#ffffff"
              strokeWidth="1.2"
            />

            {/* Anchor point at bottom of badge */}
            <circle
              cx={cardAnchorX}
              cy={cardAnchorY}
              r={isMobile ? "1.8" : "2.2"}
              fill="#00d9ff"
            />
          </svg>

          {/* Responsive Zenemoo Brand Badge: Round Logo ONLY on mobile, Full Badge with ZENEMOO on desktop */}
          <div
            className="absolute pointer-events-auto transition-all duration-300 ease-out"
            style={{
              transform: `translate3d(${targetCardX}px, ${targetCardY}px, 0)`,
            }}
          >
            <div className="inline-flex items-center gap-2 sm:gap-2.5 p-1.5 md:px-3.5 md:py-2 rounded-full bg-[#080d1a]/92 backdrop-blur-xl border border-cyan-500/35 shadow-lg shadow-cyan-500/20 whitespace-nowrap hover:border-cyan-400/60 hover:shadow-cyan-500/30 transition-all duration-200">
              {/* Always Round Zenemoo Official Logo */}
              <div className="w-5 h-5 sm:w-5 sm:h-5 rounded-full bg-[#050914] p-0.5 shadow-sm flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                <img
                  src="/assets/logo.png"
                  alt="Zenemoo"
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Crisp Bold ZENEMOO Brand Text — Hidden on mobile (< 768px), Visible on tablet, laptop, desktop & 4K */}
              <span className="hidden md:inline-block font-extrabold font-display text-white text-xs sm:text-sm tracking-wider leading-none pr-1">
                {activeMarker.label || 'ZENEMOO'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
