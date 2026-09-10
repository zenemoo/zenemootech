import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Heart,
  Layers,
  Users,
  TrendingUp,
  Lightbulb,
  Briefcase,
  UserPlus,
  Share2,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Mail,
  Globe,
  Info,
  X,
  ArrowRight,
  ArrowDown,
  Check,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SeoMeta } from '../seo/components/SeoMeta';
import { SeoOpenGraph } from '../seo/components/SeoOpenGraph';
import { SupportContributionSection, PurposeId } from './SupportContributionSection';
import { PaymentResultView } from './PaymentResultView';

/**
 * SupportHeroGlobe — Dedicated container-fitted 3D Realistic Earth Globe
 * Specifically sized and illuminated for the Support Zenemoo hero section circle.
 */
const SupportHeroGlobe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let isCancelled = false;
    let animationFrameId: number;

    import('three').then((THREE) => {
      if (isCancelled || !mountRef.current) return;

      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 400;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
      camera.position.set(0, 0, 15);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;

      while (mount.firstChild) {
        mount.removeChild(mount.firstChild);
      }
      mount.appendChild(renderer.domElement);

      const globeGroup = new THREE.Group();
      globeGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
      globeGroup.rotation.y = -2.7;
      scene.add(globeGroup);

      const globeRadius = 5.4;
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load('/assets/earth-realistic.jpg', () => {
        earthTexture.wrapS = THREE.RepeatWrapping;
        earthTexture.wrapT = THREE.ClampToEdgeWrapping;
        renderer.render(scene, camera);
      });

      const earthGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        color: new THREE.Color(0xffffff),
        emissive: new THREE.Color(0x06152b),
        emissiveIntensity: 0.4,
        specular: new THREE.Color(0x38bdf8),
        shininess: 30,
      });

      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      globeGroup.add(earthMesh);

      // Atmospheric Rim Glow
      const atmosGeo = new THREE.SphereGeometry(globeRadius * 1.025, 48, 48);
      const atmosMat = new THREE.ShaderMaterial({
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
          void main() {
            vec3 viewDir = normalize(-vPosition);
            float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
            float alpha = pow(rim, 2.8) * 0.85;
            gl_FragColor = vec4(0.0, 0.85, 1.0, alpha);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
      globeGroup.add(atmosMesh);

      // Odisha / Zenemoo Location Beacon
      const lat = 20.9517;
      const lon = 85.0985;
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon + 180);
      const markerPos = new THREE.Vector3(
        -globeRadius * Math.sin(phi) * Math.cos(theta),
        globeRadius * Math.cos(phi),
        globeRadius * Math.sin(phi) * Math.sin(theta)
      );

      const markerGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.copy(markerPos);
      globeGroup.add(markerMesh);

      const ringGeo = new THREE.RingGeometry(0.24, 0.36, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(markerPos.clone().multiplyScalar(1.01));
      ringMesh.lookAt(markerPos.clone().multiplyScalar(2));
      globeGroup.add(ringMesh);

      // Realistic Ambient & Directional Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      sunLight.position.set(12, 10, 15);
      scene.add(sunLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
      rimLight.position.set(-10, -8, -10);
      scene.add(rimLight);

      // Render loop
      let clock = new THREE.Clock();
      const animate = () => {
        if (isCancelled) return;
        animationFrameId = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        globeGroup.rotation.y += delta * 0.14;

        const time = clock.getElapsedTime();
        const pulse = 1 + Math.sin(time * 3.5) * 0.3;
        ringMesh.scale.set(pulse, pulse, 1);

        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current) return;
        const newW = mountRef.current.clientWidth || 400;
        const newH = mountRef.current.clientHeight || 400;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        renderer.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        earthTexture.dispose();
        atmosGeo.dispose();
        atmosMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
      };
    });

    return () => {
      isCancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

interface SupportZenemooPageProps {
  onBackToHome?: () => void;
  onOpenAiDrawer?: () => void;
  inTalentHubShell?: boolean;
}

export const SupportZenemooPage: React.FC<SupportZenemooPageProps> = ({
  onBackToHome,
  onOpenAiDrawer,
  inTalentHubShell = false,
}) => {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<PurposeId>('build');
  const [payLinkId, setPayLinkId] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const [activeResultOrderId, setActiveResultOrderId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('order_id') || params.get('cf_order_id') || null;
    }
    return null;
  });

  const handleOpenSupportModal = (purpose: PurposeId = 'build') => {
    setSelectedPurpose(purpose);
    setIsSupportModalOpen(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('action', 'support');
      url.searchParams.set('purpose', purpose);
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  };

  const handleCloseSupportModal = () => {
    setIsSupportModalOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      url.searchParams.delete('support');
      url.searchParams.delete('purpose');
      url.searchParams.delete('contribute');
      url.searchParams.delete('donate');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch (_) {}
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Check if directly loaded with URL query params or /pay/:linkId route
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/\/$/, '');
      const hash = window.location.hash;
      const isPayRoute = pathname.startsWith('/pay/') || hash.startsWith('#pay/') || hash.startsWith('#/pay/');
      const resolvedLink = pathname.startsWith('/pay/')
        ? pathname.replace('/pay/', '').replace(/^\//, '')
        : hash.startsWith('#pay/')
        ? hash.replace('#pay/', '').replace(/^\//, '')
        : hash.startsWith('#/pay/')
        ? hash.replace('#/pay/', '').replace(/^\//, '')
        : null;

      const params = new URLSearchParams(window.location.search);
      const linkIdParam = params.get('link_id') || resolvedLink;
      if (linkIdParam) {
        setPayLinkId(linkIdParam);
      }

      const hasSupport = params.get('support') || params.get('action') || params.get('contribute') || params.get('donate') || linkIdParam || isPayRoute;
      const purposeParam = params.get('purpose') as PurposeId | null;
      const orderIdParam = params.get('order_id') || params.get('cf_order_id');

      if (orderIdParam) {
        setActiveResultOrderId(orderIdParam);
        return;
      }

      if (hasSupport || purposeParam || isPayRoute) {
        const validPurpose: PurposeId =
          purposeParam && ['build', 'empower', 'expand', 'innovate', 'general'].includes(purposeParam)
            ? purposeParam
            : 'build';

        setSelectedPurpose(validPurpose);
        setIsSupportModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSupportModalOpen) {
        handleCloseSupportModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSupportModalOpen]);

  const handleShareClick = () => {
    const shareUrl = 'https://www.zenemoo.in/support-zenemooindia';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyEmail && notifyEmail.includes('@')) {
      setNotifySubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-900 font-sans selection:bg-cyan-500/30 selection:text-cyan-900 relative overflow-x-hidden">
      {/* SEO Metadata */}
      <SeoMeta
        title="Support Zenemoo | Build Opportunities Together"
        description="Support Zenemoo’s growth as we build technology, AI data, speech and contributor-focused solutions that create more opportunities. A Bright Tomorrow, Together."
        canonicalUrl="https://www.zenemoo.in/support-zenemooindia"
        robots="index, follow, max-image-preview:large"
      />
      <SeoOpenGraph
        title="Support Zenemoo | Build Opportunities Together"
        description="Support Zenemoo’s growth as we build technology, AI data, speech and contributor-focused solutions that create more opportunities. Technology should create opportunities for everyone."
        url="https://www.zenemoo.in/support-zenemooindia"
        imageUrl="https://www.zenemoo.in/assets/founder-story-poster.png"
        imageAlt="Prem Prasad Pradhan, Founder & COO of Zenemoo — A Bright Tomorrow, Together"
      />

      {/* Google SEO JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": "https://www.zenemoo.in/support-zenemooindia/#webpage",
                "url": "https://www.zenemoo.in/support-zenemooindia",
                "name": "Support Zenemoo | Build Opportunities Together",
                "description": "Support Zenemoo’s growth as we build technology, AI data, speech and contributor-focused solutions that create more opportunities.",
                "isPartOf": {
                  "@type": "WebSite",
                  "@id": "https://www.zenemoo.in/#website",
                  "name": "Zenemoo",
                  "url": "https://www.zenemoo.in/"
                },
                "primaryImageOfPage": {
                  "@type": "ImageObject",
                  "url": "https://www.zenemoo.in/assets/founder-story-poster.png",
                  "caption": "Prem Prasad Pradhan, Founder & COO of Zenemoo — A Bright Tomorrow, Together. Technology should create opportunities for everyone."
                }
              },
              {
                "@type": "Organization",
                "@id": "https://www.zenemoo.in/#organization",
                "name": "Zenemoo Data Solutions",
                "url": "https://www.zenemoo.in/",
                "logo": "https://www.zenemoo.in/assets/logo.png",
                "slogan": "A Bright Tomorrow, Together. Technology should create opportunities for everyone.",
                "founder": {
                  "@type": "Person",
                  "name": "Prem Prasad Pradhan",
                  "jobTitle": "Founder & COO",
                  "worksFor": {
                    "@id": "https://www.zenemoo.in/#organization"
                  },
                  "image": [
                    "https://www.zenemoo.in/assets/founder-prem.jpg",
                    "https://www.zenemoo.in/assets/founder-story-poster.png"
                  ]
                }
              }
            ]
          })
        }}
      />

      {/* ========================================================= */}
      {/* 1. REUSED EXISTING MAIN WEBSITE NAVBAR (Skip in Talent Hub)*/}
      {/* ========================================================= */}
      {!inTalentHubShell && <Navbar onOpenAiDrawer={onOpenAiDrawer} />}

      {/* Main Support Page Content */}
      <main className="relative min-w-0 max-w-full overflow-hidden">
        {/* ========================================================= */}
        {/* 2. HERO SECTION (DARK LUXURY COSMIC / TECH LIGHTING)      */}
        {/* ========================================================= */}
        <section className={`relative bg-[#050811] text-white ${inTalentHubShell ? 'pt-4 sm:pt-8' : 'pt-24 sm:pt-28 lg:pt-36'} pb-20 sm:pb-28 overflow-hidden border-b border-white/10`}>
          {/* Subtle Starry Mesh & Glowing Ambient Nebula */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-1/4 -left-20 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[130px]" />
            <div className="absolute top-10 right-0 w-[650px] h-[650px] bg-blue-600/15 rounded-full blur-[150px]" />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/5 blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Heading & Value Proposition */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SUPPORT ZENEMOO</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black font-display text-white tracking-tight leading-[1.12]">
                  We’re Building <br />
                  More Than a Platform. <br />
                  <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                    We’re Building Opportunities.
                  </span>
                </h1>

                {/* Supporting Text */}
                <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
                  Zenemoo connects people with opportunities in AI, data, speech and technology — while helping businesses access the human expertise they need.
                </p>

                {/* Clean 2-Button Hero Action Group */}
                <div className="pt-3 space-y-4 max-w-xl">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
                    {/* Button 1: Support Us */}
                    <button
                      type="button"
                      onClick={() => handleOpenSupportModal('build')}
                      className="flex-1 py-4 px-7 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 group"
                    >
                      <Heart className="w-4 h-4 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                      <span>Support Us</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Button 2: More Ways to Help */}
                    <button
                      type="button"
                      onClick={() => {
                        const target = document.getElementById('more-ways-to-support');
                        if (target) {
                          target.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="flex-1 py-4 px-7 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 hover:border-cyan-400/50 text-white hover:text-cyan-300 font-semibold text-sm sm:text-base backdrop-blur-md flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 group"
                    >
                      <span>More Ways to Help</span>
                      <ArrowDown className="w-4 h-4 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Micro Subtitle */}
                  <p className="text-xs text-slate-400 font-normal pt-1">
                    Your support helps us grow, create more opportunities and build a stronger future.
                  </p>
                </div>
              </div>

              {/* Right Column: Globe & 100+ Impact Callout */}
              <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
                {/* Script Calligraphy Tag */}
                <div className="w-full text-right pr-4 mb-2">
                  <span className="font-serif italic text-cyan-200/90 text-sm sm:text-base tracking-wide drop-shadow-md">
                    People • Opportunities • A Brighter Tomorrow
                  </span>
                </div>

                {/* Globe & Network Visual Container */}
                <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
                  {/* Outer Glowing Atmosphere Ring */}
                  <div className="absolute inset-4 rounded-full border border-cyan-400/20 bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-transparent blur-md animate-pulse" />

                  {/* Globe 3D Earth Representation (From Main Website Background) */}
                  <div className="relative w-full h-full rounded-full overflow-hidden border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.35)] flex items-center justify-center bg-[#020817]">
                    {/* 3D Earth Canvas */}
                    <div className="absolute inset-0 z-0">
                      <SupportHeroGlobe />
                    </div>

                    {/* Subtle Gradient & Radial Vignette Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050811]/85 via-[#050811]/25 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,8,17,0.25)_0%,rgba(5,8,17,0.55)_85%)] pointer-events-none z-10" />

                    {/* Central 1000+ Impact Stat Overlay */}
                    <div className="relative z-20 flex flex-col items-center justify-center text-center p-6 space-y-1 pointer-events-none">
                      <div className="text-5xl sm:text-6xl font-black font-display text-white tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                        1000<span className="text-cyan-400">+</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-100 drop-shadow-md">
                        PEOPLE REACHED
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider drop-shadow-md">
                        THROUGH WORK OPPORTUNITIES
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Tracker Line */}
                <div className="w-full flex items-center justify-end gap-3 pt-6 text-[10px] sm:text-xs font-mono tracking-widest text-slate-400 uppercase">
                  <span className="w-12 h-[1px] bg-slate-700" />
                  <span>PEOPLE • TECHNOLOGY • IMPACT</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. STORY SECTION (LIGHT/CLEAN BACKGROUND CONTRAST)        */}
        {/* ========================================================= */}
        <section id="our-story" className="py-20 sm:py-28 bg-[#f8fafc] text-slate-900 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* Left Column: Complete Canva Founder Story Visual Artwork */}
              <div className="lg:col-span-6 relative">
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-950/25 border border-slate-200/80 bg-[#060e20] aspect-[16/10] group transition-all duration-300">
                  <img
                    src="/assets/founder-story-poster.png"
                    alt="Prem Prasad Pradhan, Founder & COO of Zenemoo — A Bright Tomorrow, Together. Technology should create opportunities for everyone."
                    title="Prem Prasad Pradhan — Founder & COO of Zenemoo"
                    className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-[1.015]"
                    loading="lazy"
                    width={1200}
                    height={750}
                  />
                </div>
              </div>

              {/* Right Column: Story Copy */}
              <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-left">
                <div className="text-xs font-mono font-bold tracking-widest text-cyan-700 uppercase">
                  OUR STORY
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight leading-snug">
                  It started with a simple belief.
                </h2>

                <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  <p className="text-base sm:text-lg font-semibold text-slate-900">
                    People shouldn't have to pay just to get an opportunity.
                  </p>
                  <p>
                    Zenemoo works with companies and organizations on AI data, speech, annotation, multilingual data and technology-driven projects.
                  </p>
                  <p>
                    Our clients pay us for the work we deliver.
                  </p>
                  <p>
                    We use that model to build a platform where people can discover opportunities, contribute their skills and grow with us.
                  </p>
                  <p className="text-slate-900 font-bold text-base sm:text-lg pt-1">
                    Now, we’re asking our community to help us build further.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. WHERE YOUR SUPPORT CAN HELP (4 ELEGANT PILLARS)        */}
        {/* ========================================================= */}
        <section className="py-20 sm:py-28 bg-[#f1f5f9] text-slate-900 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
            
            {/* Section Header */}
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="text-xs font-mono font-bold tracking-widest text-cyan-700 uppercase">
                WHERE YOUR SUPPORT CAN HELP
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                A Stronger Zenemoo Creates a Brighter Tomorrow
              </h2>
            </div>

            {/* 4 Distinct Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: BUILD */}
              <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between space-y-5 text-left">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black font-display tracking-wider text-slate-900 uppercase">
                      BUILD
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Better technology, compute and platform infrastructure.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSupportModal('build')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <span>Help Us Build</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Card 2: EMPOWER */}
              <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between space-y-5 text-left">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black font-display tracking-wider text-slate-900 uppercase">
                      EMPOWER
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Better tools, training and fair resources for contributors.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSupportModal('empower')}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-50 hover:bg-cyan-600 hover:text-white border border-cyan-200 hover:border-cyan-600 text-cyan-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <span>Help Us Empower</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Card 3: EXPAND */}
              <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between space-y-5 text-left">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black font-display tracking-wider text-slate-900 uppercase">
                      EXPAND
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      More languages, regions and remote work opportunities.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSupportModal('expand')}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 text-purple-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <span>Help Us Expand</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Card 4: INNOVATE */}
              <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between space-y-5 text-left">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black font-display tracking-wider text-slate-900 uppercase">
                      INNOVATE
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      New AI, speech and community data benchmark solutions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSupportModal('innovate')}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 text-amber-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <span>Help Us Innovate</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. MORE WAYS TO SUPPORT (NON-FINANCIAL INVOLVEMENT)       */}
        {/* ========================================================= */}
        <section id="more-ways-to-support" className="py-20 sm:py-28 bg-[#f8fafc] text-slate-900 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: 4 Pathways Grid */}
              <div className="lg:col-span-7 space-y-8 text-left">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold tracking-widest text-cyan-700 uppercase">
                    MORE WAYS TO SUPPORT
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight leading-tight">
                    You don’t have to give money <br className="hidden sm:inline" />
                    to support Zenemoo.
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600">
                    There are many ways you can help us grow and create more opportunities.
                  </p>
                </div>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  
                  {/* Way 1: Join a project */}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                      <Heart className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Join a project</h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Participate and contribute your skills.
                    </p>
                  </div>

                  {/* Way 2: Refer someone */}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Refer someone</h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Help others find opportunities.
                    </p>
                  </div>

                  {/* Way 3: Bring us a business opportunity */}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Bring us a business opportunity</h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Connect us with companies or projects.
                    </p>
                  </div>

                  {/* Way 4: Spread the word */}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Spread the word</h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Share Zenemoo with your network.
                    </p>
                  </div>

                </div>

                <div className="pt-2">
                  <div className="text-sm font-bold text-slate-900">
                    Every form of support helps.
                  </div>
                </div>
              </div>

              {/* Right Column: Sprout / Sunlight Card with Quote */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/50 border border-slate-200 aspect-square sm:aspect-[4/3] lg:aspect-[4/4]">
                  <img
                    src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"
                    alt="Green Sprout Growing on Stone in Sunlight"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={800}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white text-left">
                    <p className="text-sm sm:text-base font-medium italic text-slate-100 leading-relaxed">
                      “Small actions can create big momentum. Whether by sharing our story, joining a project, or supporting our work, you are helping build a brighter tomorrow.”
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. SUPPORT CONTRIBUTIONS (HIGH-IMPACT MISSION ACTION BANNER) */}
        {/* ========================================================= */}
        <section id="support-zenemoo-section" className="py-20 sm:py-28 bg-[#030712] text-white relative overflow-hidden border-t border-white/10">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[140px]" />
            <div className="absolute bottom-0 right-10 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>SUPPORT ZENEMOO</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
                Help Us Build More Opportunities.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Your support helps us build technology, resources, and a stronger future for contributors across India.
              </p>
            </div>

            {/* 4 Category Quick-Action Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => handleOpenSupportModal('build')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-center transition-all cursor-pointer group active:scale-95 shadow-lg"
              >
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center justify-center gap-1">
                  <span className="text-cyan-400">✦</span>
                  <span>BUILD</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">Technology</div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenSupportModal('empower')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-center transition-all cursor-pointer group active:scale-95 shadow-lg"
              >
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center justify-center gap-1">
                  <span className="text-cyan-400">✦</span>
                  <span>EMPOWER</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">Contributors</div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenSupportModal('expand')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-400 text-center transition-all cursor-pointer group active:scale-95 shadow-lg"
              >
                <div className="text-xs font-bold text-white group-hover:text-purple-300 flex items-center justify-center gap-1">
                  <span className="text-purple-400">✦</span>
                  <span>EXPAND</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">Regions</div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenSupportModal('innovate')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-center transition-all cursor-pointer group active:scale-95 shadow-lg"
              >
                <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center justify-center gap-1">
                  <span className="text-amber-400">✦</span>
                  <span>INNOVATE</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">AI & Speech</div>
              </button>
            </div>

            {/* Main Modal Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOpenSupportModal('build')}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-cyan-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Heart className="w-5 h-5 fill-slate-950 text-slate-950" />
                <span>Support Zenemoo Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. TRANSPARENCY & COMMUNITY (HONEST OPERATING MODEL)       */}
        {/* ========================================================= */}
        <section className="py-20 sm:py-28 bg-[#f8fafc] text-slate-900 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="text-xs font-mono font-bold tracking-widest text-cyan-700 uppercase">
                TRANSPARENCY & TRUST
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                How Zenemoo Operates
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Registered MSME / Udyam Enterprise
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Zenemoo Data Solutions is an official micro-enterprise registered with the Ministry of Micro, Small and Medium Enterprises, Government of India.
                </p>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-800">
                  UDYAM‑OD‑11‑0124893
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Direct Impact & Accountability
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Community contributions are allocated towards infrastructure costs, technical servers, contributor payout tooling, and dialect expansion across Indian languages.
                </p>
                <div className="pt-2">
                  <a
                    href="mailto:contact@zenemoo.com"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800 transition-colors"
                  >
                    <span>Get in Touch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 8. SUPPORT MODAL (LIVE CASHFREE CHECKOUT)                  */}
      {/* ========================================================= */}
      {isSupportModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseSupportModal();
          }}
        >
          <div
            className="w-full max-w-4xl lg:max-w-5xl bg-[#060a14] text-white border border-cyan-500/35 rounded-3xl sm:rounded-[2rem] shadow-[0_0_80px_rgba(6,182,212,0.25)] relative my-auto max-h-[94vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <SupportContributionSection
              initialPurpose={selectedPurpose}
              directLinkId={payLinkId}
              onClose={handleCloseSupportModal}
              onSuccess={(receipt) => {
                setIsSupportModalOpen(false);
                if (receipt?.orderId) {
                  setActiveResultOrderId(receipt.orderId);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.5 PAYMENT RESULT & RECEIPT MODAL                         */}
      {/* ========================================================= */}
      {activeResultOrderId && (
        <div
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl relative my-auto">
            <PaymentResultView
              orderId={activeResultOrderId}
              onClose={() => {
                setActiveResultOrderId(null);
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('order_id');
                  url.searchParams.delete('cf_order_id');
                  url.searchParams.delete('link_id');
                  window.history.replaceState({}, '', url.toString());
                } catch {
                  // ignore
                }
              }}
              onRetry={() => {
                setActiveResultOrderId(null);
                setIsSupportModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. REUSED EXISTING MAIN WEBSITE FOOTER (Skip in Talent Hub)*/}
      {/* ========================================================= */}
      {!inTalentHubShell && <Footer />}
    </div>
  );
};
