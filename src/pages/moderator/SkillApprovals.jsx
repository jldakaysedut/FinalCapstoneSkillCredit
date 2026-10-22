import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { FileImage } from 'lucide-react';

export default function SkillApprovals() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'unassigned' | 'my_claims' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 🚨 FIX: Explicit relations to avoid Ambiguous Relationship error
      const { data, error } = await supabase
        .from('skills')
        .select(`
          id, title, category, format, credit_cost, cover_image_url, created_at, status, assigned_to,
          instructor:user_profiles!instructor_id(id, full_name),
          assignee:user_profiles!assigned_to(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (err) {
      console.error('Failed to load skill approvals:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingList = skills.filter(s => s.status === 'pending');
    const unassigned = pendingList.filter(s => !s.assigned_to).length;
    const myClaims = pendingList.filter(s => s.assigned_to === currentUserId).length;
    const resolvedCount = skills.filter(s => s.status === 'approved' || s.status === 'rejected').length;

    return {
      pendingCount: pendingList.length,
      unassignedCount: unassigned,
      myClaimsCount: myClaims,
      resolvedCount
    };
  }, [skills, currentUserId]);

  // Tab & Search Filtering
  const filteredSkills = useMemo(() => {
    return skills.filter(item => {
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'unassigned' && (item.status !== 'pending' || item.assigned_to)) return false;
      if (activeTab === 'my_claims' && (item.status !== 'pending' || item.assigned_to !== currentUserId)) return false;
      if (activeTab === 'resolved' && (item.status === 'pending')) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        const instructorMatch = item.instructor?.full_name?.toLowerCase().includes(q);
        const idMatch = item.id.toLowerCase().includes(q);

        return titleMatch || catMatch || instructorMatch || idMatch;
      }

      return true;
    });
  }, [skills, activeTab, searchQuery, currentUserId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Skill Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, claim, and adjudicate new skill listings before they go live on the platform.
          </p>
        </div>

        <button
          onClick={fetchSkills}
          className="self-start sm:self-auto px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-sm"
        >
          Refresh Queue
        </button>
      </div>

      {/* ── METRIC STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action Required</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.pendingCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Pending</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Unassigned</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.unassignedCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Awaiting Claim</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Assigned to You</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.myClaimsCount}</span>
            <span className="text-[11px] text-blue-600 font-medium">In Review</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Resolved</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.resolvedCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Processed</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { id: 'pending', label: 'All Pending', count: metrics.pendingCount },
            { id: 'unassigned', label: 'Unassigned', count: metrics.unassignedCount },
            { id: 'my_claims', label: 'My Claims', count: metrics.myClaimsCount },
            { id: 'resolved', label: 'Resolved History', count: metrics.resolvedCount },
            { id: 'all', label: 'All Listings', count: skills.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings or instructors..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* ── TABLE DATA VIEW ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading approval queue...
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="py-20 text-center p-6">
            <p className="text-sm font-semibold text-slate-700">Queue is clear</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'No skills matched your search filter.'
                : 'There are no listings waiting for approval.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Skill Details</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4 text-center">Format & Cost</th>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSkills.map(item => {
                  const isMine = item.assigned_to === currentUserId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Skill Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex gap-3 items-start">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                            {item.cover_image_url ? (
                              <img src={item.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileImage className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={item.title}>
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-500">{item.category}</p>
                            <p className="text-[9px] text-slate-400 font-mono">#{item.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="space-y-0.5">
                          <p className="text-slate-800 font-medium">
                            {item.instructor?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </td>

                      {/* Cost and Format */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.credit_cost} CR
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                          {item.format}
                        </span>
                      </td>

                      {/* Assignment */}
                      <td className="py-3.5 px-4 align-top">
                        {item.assigned_to ? (
                          isMine ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Assigned to You
                            </span>
                          ) : (
                            <span className="inline-block text-[11px] text-slate-600 font-medium">
                              {item.assignee?.full_name || 'Another Mod'}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          item.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <Link
                          to={`/moderator/review/${item.id}`}
                          className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            item.status === 'pending'
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {item.status === 'pending' ? 'Review Skill' : 'View Record'}
                        </Link>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}