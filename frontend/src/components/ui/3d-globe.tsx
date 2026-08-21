import React, { useEffect, useRef } from 'react';

export interface GlobeMarker {
  latitude: number;
  longitude: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface Globe3DProps {
  textureUrl?: string;
  bumpScale?: number;
  atmosphereColor?: string;
  atmosphereIntensity?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  markers?: GlobeMarker[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Globe3D — Clean Minimal Aceternity UI 3D Globe Component (Enterprise Visual Scale)
 * Features:
 * - Real Earth texture (NASA Blue Marble / Natural Earth) with enhanced clarity & deep blue oceans
 * - Large-screen scale: 44-48vw on large desktop, 42-45vw on standard desktop, 65-75vw on mobile
 * - Single Zenemoo / Odisha location pin with "zenemoo.in" badge & back-side occlusion culling
 * - Clean natural blue atmospheric Fresnel rim glow
 * - Smooth continuous rotation & subtle mouse parallax
 * - Full memory/GPU disposal on unmount
 */
export const Globe3D: React.FC<Globe3DProps> = ({
  textureUrl = '/assets/earth-realistic.jpg',
  atmosphereColor = '#38bdf8',
  atmosphereIntensity = 0.30,
  autoRotate = true,
  autoRotateSpeed = 0.0008,
  enableRotate = true,
  markers = [
    {
      latitude: 20.2961,
      longitude: 85.8245,
      label: 'zenemoo.in',
      color: '#00d9ff',
      size: 1.6,
    },
  ],
  className = '',
  style = {},
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isCancelled = false;
    let animationFrameId: number;
    let cleanupFn: (() => void) | null = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('three').then((THREE) => {
      if (isCancelled || !mountRef.current) return;

      const w = window.innerWidth;
      const isMobile = w < 768;
      const isTablet = w >= 768 && w < 1024;
      const isLargeDesktop = w >= 1680;

      // ── 1. Scene, Camera, Renderer ─────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 48);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
      container.appendChild(renderer.domElement);

      // ── 2. Sprite Texture Generators ───────────────────────────────────────
      const createCircleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
          gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
          gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 64, 64);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
      };

      const circleTexture = createCircleTexture();

      // 4K Ultra-High-DPI Marker Label Generator (Vector-Crisp on Retina/4K displays)
      const createLabelTexture = (labelText: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Background Dark Capsule
          ctx.fillStyle = 'rgba(3, 7, 18, 0.90)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.lineWidth = 7;

          const x = 12;
          const y = 12;
          const w = canvas.width - 24;
          const h = canvas.height - 24;
          const r = 56;

          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing Cyan Point Indicator
          ctx.fillStyle = '#00d9ff';
          ctx.beginPath();
          ctx.arc(105, 112, 28, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(105, 112, 38, 0, Math.PI * 2);
          ctx.stroke();

          // Crisp Vector Typography
          ctx.font = 'bold 94px "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, 175, 114);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
      };

      // ── 3. Real Earth Equirectangular Texture Loader ───────────────────────
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(textureUrl, () => {
        earthTexture.wrapS = THREE.RepeatWrapping;
        earthTexture.wrapT = THREE.ClampToEdgeWrapping;
        renderer.render(scene, camera);
      });

      // ── 4. Build 3D Earth Globe (Substantial Large-Screen Scale) ───────────
      // Sizing: ~46vw on 1920px+, ~42vw on 1440px, ~52vw on tablet, ~72-76vw on mobile
      const globeRadius = isMobile ? 7.4 : isTablet ? 8.0 : isLargeDesktop ? 9.8 : 9.0;
      const globeGroup = new THREE.Group();

      // Earth Axial Tilt (18 deg) + Initial view facing India & Indian Ocean
      globeGroup.rotation.z = THREE.MathUtils.degToRad(18);
      globeGroup.rotation.y = -2.85; // Starts facing India / Asia

      // Vertically centered behind hero content on mobile, lower on desktop
      const posY = isMobile ? -1.0 : isTablet ? -2.8 : isLargeDesktop ? -3.6 : -3.8;
      globeGroup.position.set(0, posY, -6);
      scene.add(globeGroup);

      const earthGeo = new THREE.SphereGeometry(
        globeRadius,
        isMobile ? 36 : 64,
        isMobile ? 36 : 64
      );
      const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        color: new THREE.Color(0xf0f4f8), // Natural bright Earth clarity
        emissive: new THREE.Color(0x0c1a32), // Rich deep navy ambient lighting
        specular: new THREE.Color(0x60a5fa), // Crisp cyan/blue ocean specular sheen
        shininess: 32,
        transparent: true,
        opacity: isMobile ? 0.85 : 0.92,
      });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      globeGroup.add(earthMesh);

      // Helper: Convert (lat, lon, r) to 3D Cartesian coordinates
      const latLonToVector3 = (lat: number, lon: number, r: number) => {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon + 180);
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
      };

      // ── 5. Atmospheric Fresnel Rim Glow Sphere ─────────────────────────────
      const atmosColorThree = new THREE.Color(atmosphereColor);
      const atmosphereGeo = new THREE.SphereGeometry(globeRadius * 1.018, 48, 48);
      const atmosphereMat = new THREE.ShaderMaterial({
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
            float intensity = pow(rim, 2.8) * uIntensity;
            gl_FragColor = vec4(uColor, intensity);
          }
        `,
        uniforms: {
          uColor: { value: atmosColorThree },
          uIntensity: { value: atmosphereIntensity },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
      globeGroup.add(atmosphereMesh);

      // ── 6. Single Zenemoo / Odisha Location Pin with Occlusion Culling ─────
      const markerMeshes: {
        group: any;
        beaconMat: any;
        pinMat: any;
        labelMat: any;
        normalVec: any;
      }[] = [];

      const labelTextures: any[] = [];

      markers.forEach((m) => {
        const markerGroup = new THREE.Group();
        globeGroup.add(markerGroup);

        const surfacePos = latLonToVector3(m.latitude, m.longitude, globeRadius * 1.004);
        const stemTopPos = latLonToVector3(m.latitude, m.longitude, globeRadius * 1.028);
        const labelPos = latLonToVector3(m.latitude, m.longitude, globeRadius * 1.045);

        // Surface Beacon Node
        const beaconGeo = new THREE.BufferGeometry().setFromPoints([surfacePos]);
        const beaconMat = new THREE.PointsMaterial({
          size: isMobile ? 1.4 : isLargeDesktop ? 1.9 : 1.7,
          map: circleTexture,
          color: new THREE.Color(m.color || '#00d9ff'),
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const beaconMesh = new THREE.Points(beaconGeo, beaconMat);
        markerGroup.add(beaconMesh);

        // Subtle Pin Stem
        const stemGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, stemTopPos]);
        const stemMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(m.color || '#00d9ff'),
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        });
        const stemMesh = new THREE.Line(stemGeo, stemMat);
        markerGroup.add(stemMesh);

        // Pin Head Point
        const pinHeadGeo = new THREE.BufferGeometry().setFromPoints([stemTopPos]);
        const pinHeadMat = new THREE.PointsMaterial({
          size: isMobile ? 1.0 : 1.3,
          map: circleTexture,
          color: new THREE.Color('#00d9ff'),
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pinHeadMesh = new THREE.Points(pinHeadGeo, pinHeadMat);
        markerGroup.add(pinHeadMesh);

        // Compact High-DPI Label Sprite
        let labelMat: any = null;
        if (m.label) {
          const lTex = createLabelTexture(m.label);
          labelTextures.push(lTex);
          labelMat = new THREE.SpriteMaterial({
            map: lTex,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
          });
          const labelSprite = new THREE.Sprite(labelMat);
          labelSprite.position.copy(labelPos);

          const scaleW = isMobile ? 2.8 : isLargeDesktop ? 3.8 : 3.4;
          const scaleH = scaleW * (224 / 1024);
          labelSprite.scale.set(scaleW, scaleH, 1.0);
          markerGroup.add(labelSprite);
        }

        markerMeshes.push({
          group: markerGroup,
          beaconMat,
          pinMat: stemMat,
          labelMat,
          normalVec: surfacePos.clone().normalize(),
        });
      });

      // ── 7. Lighting System (Enhanced Natural Brightness) ────────────────────
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.10);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.45);
      dirLight.position.set(40, 25, 45);
      scene.add(dirLight);

      const rimLight = new THREE.PointLight(0x38bdf8, 0.85, 120);
      rimLight.position.set(-35, -20, 25);
      scene.add(rimLight);

      // ── 8. Smooth Parallax ─────────────────────────────────────────────────
      let mouseX = 0;
      let mouseY = 0;
      let targetCameraX = 0;
      let targetCameraY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        if (!enableRotate) return;
        mouseX = (e.clientX - window.innerWidth / 2) * 0.0012;
        mouseY = -(e.clientY - window.innerHeight / 2) * 0.0012;
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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, curW < 768 ? 1.0 : 1.5));
      };
      window.addEventListener('resize', handleResize);

      // ── 9. Main Render Loop with Back-Side Occlusion Culling ───────────────
      let clock = 0;
      const tempVec = new THREE.Vector3();
      const camPosVec = new THREE.Vector3();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (!isTabActive) return;

        if (!prefersReducedMotion && autoRotate) {
          clock += 0.008;

          // 1. Slow, continuous realistic Earth rotation
          globeGroup.rotation.y += autoRotateSpeed;

          // 2. Marker Occlusion Culling
          camPosVec.copy(camera.position).normalize();

          markerMeshes.forEach((mm) => {
            tempVec.copy(mm.normalVec).applyQuaternion(globeGroup.quaternion);
            const dot = tempVec.dot(camPosVec);

            let visibilityFactor = 0;
            if (dot > 0.15) {
              visibilityFactor = Math.min((dot - 0.15) / 0.25, 1.0);
            }

            const pulse = (0.85 + Math.sin(clock * 3.0) * 0.15) * visibilityFactor;
            mm.beaconMat.opacity = pulse;
            mm.pinMat.opacity = 0.75 * visibilityFactor;
            if (mm.labelMat) {
              mm.labelMat.opacity = 0.92 * visibilityFactor;
            }
          });

          // 3. Smooth Camera Parallax Lerp
          targetCameraX += (mouseX - targetCameraX) * 0.035;
          targetCameraY += (mouseY - targetCameraY) * 0.035;
          camera.position.x = targetCameraX;
          camera.position.y = targetCameraY;
          camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);
      };

      animate();

      // ── 10. GPU & Memory Disposal on Unmount ──────────────────────────────
      cleanupFn = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);

        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }

        circleTexture.dispose();
        labelTextures.forEach((t) => t.dispose());
        earthTexture.dispose();

        earthGeo.dispose();
        earthMat.dispose();
        atmosphereGeo.dispose();
        atmosphereMat.dispose();

        markerMeshes.forEach((mm) => {
          mm.group.children.forEach((c: any) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
        });

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
    markers,
  ]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};
