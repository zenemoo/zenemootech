import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Upload, Database, Cloud, CheckCircle, ShieldAlert, Sparkles, Image, RefreshCw, Save, Key } from 'lucide-react';
import { TeamMember } from '../lib/teamStore';
import { uploadImageToCloudinary, getSupabaseClient } from '../lib/adminStore';

interface TeamAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  onSaveMembers: (updated: TeamMember[]) => void;
  onResetDefaults: () => void;
}

export const TeamAdminModal: React.FC<TeamAdminModalProps> = ({
  isOpen,
  onClose,
  members,
  onSaveMembers,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'config'>('list');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');

  if (!isOpen) return null;

  const handleCreateNew = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      position: members.length + 1,
      name: '',
      designation: 'Data Annotation Specialist',
      role: 'Data Annotation Specialist',
      image: '',
      image_url: '',
      fallback: '/assets/executive.png',
      bio: '',
      skills: ['Annotation', 'Transcription', 'Quality Focus'],
      badge: 'Specialist',
      email: 'zenemootech@gmail.com',
      status: 'active',
      category: 'Engineering',
    };
    setEditingMember(newMember);
    setSkillsInput(newMember.skills.join(', '));
    setActiveTab('edit');
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember({ ...member });
    setSkillsInput(member.skills ? member.skills.join(', ') : '');
    setActiveTab('edit');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this team member?')) {
      const updated = members.filter((m) => m.id !== id);
      onSaveMembers(updated);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    setIsUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setEditingMember({ ...editingMember, image: url });
    } catch (err) {
      alert('Failed to upload image. Please try entering an image URL.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updatedMember = {
      ...editingMember,
      skills: parsedSkills.length > 0 ? parsedSkills : ['Specialist'],
    };

    const exists = members.some((m) => m.id === updatedMember.id);
    let newMembersList: TeamMember[];
    if (exists) {
      newMembersList = members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    } else {
      newMembersList = [updatedMember, ...members];
    }

    onSaveMembers(newMembersList);
    setEditingMember(null);
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/20 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px]">
              <div className="w-full h-full bg-[#0a0b12] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white">Zenemoo Data Team Admin Panel</h3>
              <p className="text-xs font-mono text-cyan-400">Manage Specialists, Supabase Database &amp; Cloudinary CDN</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'list'
                  ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Team Directory ({members.length})
            </button>
            <button
              onClick={handleCreateNew}
              className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                activeTab === 'edit'
                  ? 'bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
              activeTab === 'config'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Database &amp; Storage
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-slate-200">
          {/* TAB 1: TEAM LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-slate-400">
                  Current active team members displayed in website directory.
                </p>
                <button
                  onClick={onResetDefaults}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-mono transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset 12 Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        <img
                          src={member.image || member.fallback || '/assets/executive.png'}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = member.fallback || '/assets/executive.png';
                          }}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{member.name}</div>
                        <div className="text-xs font-mono text-purple-400">{member.role}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-cyan-300">
                          {member.badge}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all"
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 transition-all"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT / ADD FORM */}
          {activeTab === 'edit' && editingMember && (
            <form onSubmit={handleFormSubmit} className="space-y-6 max-w-2xl mx-auto">
              <h4 className="text-lg font-bold font-display text-white">
                {members.some((m) => m.id === editingMember.id) ? 'Edit Team Member' : 'Add New Team Member'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Chandan Biswal"
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Audio Transcription Specialist"
                    value={editingMember.role}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">Badge Title</label>
                  <select
                    value={editingMember.badge}
                    onChange={(e) => setEditingMember({ ...editingMember, badge: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                  >
                    <option>Founder</option>
                    <option>Senior Annotator</option>
                    <option>Specialist</option>
                    <option>Annotator</option>
                    <option>QC Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Transcription, Data Annotation, Quality Focus"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Photo Upload via Cloudinary / URL */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <label className="block text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                  <Image className="w-4 h-4" /> Team Photo (Cloudinary Upload / Image URL)
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                    {editingMember.image ? (
                      <img src={editingMember.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">No Image</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="https://res.cloudinary.com/.../photo.jpg"
                      value={editingMember.image}
                      onChange={(e) => setEditingMember({ ...editingMember, image: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono cursor-pointer hover:bg-purple-500/30 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? 'Uploading to Cloudinary...' : 'Upload Local Image File'}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Bio / Contribution Summary</label>
                <textarea
                  rows={3}
                  placeholder="Works on transcription, data annotation, and file processing tasks..."
                  value={editingMember.bio}
                  onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="specialist@zenemoo.com"
                    value={editingMember.email || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={editingMember.linkedin || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, linkedin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={editingMember.github || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, github: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold text-xs hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Team Member
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SUPABASE & CLOUDINARY CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-6 max-w-2xl mx-auto font-mono text-xs">
              <h4 className="text-lg font-bold font-display text-white font-sans">
                Supabase &amp; Cloudinary Database Settings
              </h4>

              {/* Status Box */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Database className="w-4 h-4" /> Supabase Database
                  </span>
                  {getSupabaseClient() ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Connected
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" /> LocalStorage Mode Active
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-purple-400 font-bold">
                    <Cloud className="w-4 h-4" /> Cloudinary CDN Upload
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Enabled (Auto Data-URL &amp; CDN Fallback)
                  </span>
                </div>
              </div>

              {/* Environment Variable Setup Instructions */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3 leading-relaxed">
                <div className="text-slate-300 font-bold">// Add these variables to your .env or Vercel Environment Variables:</div>
                <pre className="text-cyan-300">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-slate-300">
                💡 <strong className="text-white font-sans">Zero Friction Guarantee:</strong> Any team member added or modified in this Admin Panel is saved instantly in your browser and automatically synchronized with Supabase whenever credentials are supplied!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
