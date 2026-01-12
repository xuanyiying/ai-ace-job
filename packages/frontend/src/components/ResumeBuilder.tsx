import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  Download,
  Eye,
  Edit3,
  Copy,
  RotateCcw,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  Tablet,
  FileJson,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Types ---

interface ResumeSection {
  id: string;
  type:
    | 'personal'
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'custom';
  title: string;
  content: string;
}

interface ResumeTheme {
  id: string;
  name: string;
  primary: string;
  background: string;
  text: string;
  accent: string;
  fontFamily: string;
}

// --- Constants ---

const THEMES: ResumeTheme[] = [
  {
    id: 'modern',
    name: 'Modern Dark',
    primary: '#ffffff',
    background: '#050505',
    text: '#ffffff',
    accent: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'minimal',
    name: 'Minimal Light',
    primary: '#000000',
    background: '#ffffff',
    text: '#000000',
    accent: '#6b7280',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'emerald',
    name: 'Emerald Professional',
    primary: '#10b981',
    background: '#064e3b',
    text: '#ecfdf5',
    accent: '#34d399',
    fontFamily: 'system-ui, sans-serif',
  },
  {
    id: 'royal',
    name: 'Royal Serif',
    primary: '#d4af37',
    background: '#1c1917',
    text: '#fafaf9',
    accent: '#a8a29e',
    fontFamily: 'Playfair Display, serif',
  },
];

const DEFAULT_SECTIONS: ResumeSection[] = [
  {
    id: 'personal-1',
    type: 'personal',
    title: 'Personal Information',
    content:
      '# John Doe\n\nFull Stack Developer | AI Enthusiast\n\n📧 john@example.com | 📱 +1 (555) 000-0000 | 📍 San Francisco, CA\n\n[LinkedIn](https://linkedin.com) | [GitHub](https://github.com)',
  },
  {
    id: 'experience-1',
    type: 'experience',
    title: 'Experience',
    content:
      '## Senior Developer @ TechCorp\n*2021 - Present*\n\n- Led development of a high-performance AI platform\n- Improved system throughput by 40% using optimized vector search\n- Managed a team of 5 developers',
  },
  {
    id: 'skills-1',
    type: 'skills',
    title: 'Skills',
    content:
      '## Technical Skills\n\n- **Languages:** TypeScript, Python, Rust, Go\n- **Frontend:** React, Next.js, Framer Motion, Tailwind CSS\n- **Backend:** Node.js, NestJS, PostgreSQL, Redis\n- **AI/ML:** LangChain, PyTorch, Vector Databases',
  },
];

// --- Styles ---

const GLASS_CARD =
  'bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl transition-all duration-500 hover:border-white/20';
const INPUT_BASE =
  'w-full bg-transparent border-b border-white/10 py-3 focus:border-white/40 focus:outline-none transition-all text-white placeholder-white/20 font-medium';
const BUTTON_PRIMARY =
  'group relative flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden';
const BUTTON_SECONDARY =
  'flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider';

// --- Components ---

export const ResumeBuilder: React.FC = () => {
  const [sections, setSections] = useState<ResumeSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    sections[0]?.id || null
  );
  const [currentTheme, setCurrentTheme] = useState<ResumeTheme>(THEMES[0]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [previewMode, setPreviewMode] = useState<
    'desktop' | 'tablet' | 'mobile'
  >('desktop');
  const [isEditView, setIsEditView] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Theme Management ---
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--resume-primary', currentTheme.primary);
    root.style.setProperty('--resume-bg', currentTheme.background);
    root.style.setProperty('--resume-text', currentTheme.text);
    root.style.setProperty('--resume-accent', currentTheme.accent);
    root.style.setProperty('--resume-font', currentTheme.fontFamily);
  }, [currentTheme]);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  // --- Accessibility: Focus management ---
  const sectionTitleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (activeSectionId && isEditView) {
      sectionTitleRef.current?.focus();
    }
  }, [activeSectionId, isEditView]);

  // --- Handlers ---

  const handleUpdateSection = (id: string, updates: Partial<ResumeSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleAddSection = () => {
    const newSection: ResumeSection = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      title: 'New Section',
      content: '## New Section Content\n\nStart writing here...',
    };
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newSection.id);
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (activeSectionId === id) {
      setActiveSectionId(sections.find((s) => s.id !== id)?.id || null);
    }
  };

  const handleDuplicateSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      const duplicated: ResumeSection = {
        ...section,
        id: `${section.id}-copy-${Date.now()}`,
        title: `${section.title} (Copy)`,
      };
      const index = sections.findIndex((s) => s.id === id);
      const newSections = [...sections];
      newSections.splice(index + 1, 0, duplicated);
      setSections(newSections);
      setActiveSectionId(duplicated.id);
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all changes? This cannot be undone.'
      )
    ) {
      setSections(DEFAULT_SECTIONS);
      setActiveSectionId(DEFAULT_SECTIONS[0].id);
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(sections, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      // For now, we'll simulate a PDF export by creating a markdown file download
      // In a real production app, this would hit an API or use a library like jspdf/html2canvas
      const content = sections
        .map((s) => `# ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume-export.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export. Please try again.');
      console.error(err);
    }
  };

  // --- Keyboard Shortcuts ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Simulation of saving
        console.log('Saved locally');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsEditView((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = sections.findIndex(
          (s) => s.id === activeSectionId
        );
        if (currentIndex < sections.length - 1) {
          setActiveSectionId(sections[currentIndex + 1].id);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = sections.findIndex(
          (s) => s.id === activeSectionId
        );
        if (currentIndex > 0) {
          setActiveSectionId(sections[currentIndex - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Render Helpers ---

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-4xl';
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'}`}
      role="main"
      aria-label="Resume Builder Application"
    >
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 px-8 py-6 border-b border-white/5 bg-black/60 backdrop-blur-2xl"
        role="navigation"
        aria-label="Main Toolbar"
      >
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black tracking-tighter italic font-display leading-none">
              AI.RESUME
            </h1>
            <div className="h-6 w-[1px] bg-white/10 mx-2" />
            <div
              className="flex items-center gap-1 bg-white/5 rounded-2xl p-1.5 border border-white/5"
              role="tablist"
              aria-label="View Mode"
            >
              <button
                role="tab"
                aria-selected={isEditView}
                onClick={() => setIsEditView(true)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isEditView ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5 text-white/40'}`}
              >
                Build
              </button>
              <button
                role="tab"
                aria-selected={!isEditView}
                onClick={() => setIsEditView(false)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isEditView ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5 text-white/40'}`}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4 bg-white/5 p-1 rounded-xl border border-white/5">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setCurrentTheme(theme)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    currentTheme.id === theme.id
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent hover:border-white/20'
                  }`}
                  style={{ backgroundColor: theme.primary }}
                  title={theme.name}
                />
              ))}
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={BUTTON_SECONDARY}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleResetToDefault}
              className={BUTTON_SECONDARY}
              title="Reset to default"
            >
              <RotateCcw size={18} />
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-2" />
            <button onClick={handleExportJSON} className={BUTTON_SECONDARY}>
              <FileJson size={18} />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button onClick={handleExportPDF} className={BUTTON_PRIMARY}>
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar: Section List */}
          <div
            className={`lg:col-span-4 space-y-8 ${!isEditView ? 'hidden lg:block opacity-50 pointer-events-none' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
                  Resume Sections
                </h2>
                <button
                  onClick={handleAddSection}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                >
                  <Plus size={20} />
                </button>
              </div>

              <Reorder.Group
                axis="y"
                values={sections}
                onReorder={setSections}
                className="space-y-3"
              >
                {sections.map((section) => (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className={`group flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      activeSectionId === section.id
                        ? 'bg-white/10 border-white/20'
                        : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <GripVertical
                      size={16}
                      className="text-white/20 group-hover:text-white/40"
                    />
                    <span className="flex-1 font-medium text-sm truncate">
                      {section.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSection(section.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-white/40 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-red-400/60 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </div>

          {/* Main Content: Editor or Preview */}
          <div
            className={`lg:col-span-8 ${isEditView ? '' : 'lg:col-span-12'}`}
          >
            <AnimatePresence mode="wait">
              {isEditView ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={GLASS_CARD}
                >
                  {activeSection ? (
                    <div className="space-y-12">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                          Section Title
                        </label>
                        <input
                          ref={sectionTitleRef}
                          value={activeSection.title}
                          onChange={(e) =>
                            handleUpdateSection(activeSection.id, {
                              title: e.target.value,
                            })
                          }
                          className="text-6xl font-black tracking-tighter bg-transparent border-none focus:outline-none w-full font-display placeholder-white/5 selection:bg-white/20"
                          placeholder="Section Title"
                          aria-label="Section Title"
                        />
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                            Content Editor
                          </label>
                          <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                            Markdown v4.0
                          </span>
                        </div>
                        <textarea
                          value={activeSection.content}
                          onChange={(e) =>
                            handleUpdateSection(activeSection.id, {
                              content: e.target.value,
                            })
                          }
                          className="w-full h-[600px] bg-white/[0.03] border border-white/5 rounded-[2rem] p-10 font-mono text-sm leading-[1.8] focus:border-white/10 focus:bg-white/[0.04] focus:outline-none transition-all resize-none shadow-inner selection:bg-white/20"
                          placeholder="# Start building your story..."
                          aria-label="Section Content in Markdown"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center text-white/20 space-y-4">
                      <Edit3 size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">
                        Select a section to start editing
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center space-y-8"
                >
                  {/* Preview Toolbar */}
                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 p-1.5 rounded-full">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded-full transition-all ${previewMode === 'desktop' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      <Monitor size={18} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`p-2 rounded-full transition-all ${previewMode === 'tablet' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      <Tablet size={18} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded-full transition-all ${previewMode === 'mobile' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      <Smartphone size={18} />
                    </button>
                  </div>

                  {/* Actual Resume Sheet */}
                  <div
                    className={`w-full transition-all duration-700 ease-in-out ${getPreviewWidth()}`}
                  >
                    <div
                      className="rounded-[3rem] p-16 shadow-[0_40px_100px_rgba(0,0,0,0.4)] min-h-[1100px] prose prose-lg max-w-none selection:bg-blue-100"
                      style={{
                        backgroundColor: 'var(--resume-bg)',
                        color: 'var(--resume-text)',
                        fontFamily: 'var(--resume-font)',
                      }}
                    >
                      <style>{`
                        .prose h1 { font-family: var(--resume-font); font-weight: 800; letter-spacing: -0.04em; margin-bottom: 2rem; border-bottom: 4px solid var(--resume-primary); padding-bottom: 1rem; color: var(--resume-text); }
                        .prose h2 { font-family: var(--resume-font); font-weight: 700; letter-spacing: -0.02em; margin-top: 3rem; color: var(--resume-accent); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.2em; }
                        .prose p { line-height: 1.8; color: var(--resume-text); opacity: 0.9; }
                        .prose li { margin-bottom: 0.5rem; color: var(--resume-text); opacity: 0.8; }
                        .prose strong { color: var(--resume-primary); font-weight: 600; }
                      `}</style>
                      {sections.map((section) => (
                        <div key={section.id} className="mb-16 last:mb-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {section.content}
                          </ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-3 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
        <div className="flex items-center gap-6">
          <span>Sections: {sections.length}</span>
          <span>Last Saved: Just now</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />{' '}
            System Ready
          </span>
          <span>v1.0.0</span>
        </div>
      </footer>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[100]"
          >
            <span className="text-sm font-bold">{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <Plus size={16} className="rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeBuilder;
