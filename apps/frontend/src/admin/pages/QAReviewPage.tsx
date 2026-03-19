import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, CheckCircle2, AlertCircle, Clock, Circle,
  ChevronDown, ChevronUp, MessageSquare, Upload, ExternalLink, Image as ImageIcon,
  CheckCheck, X
} from 'lucide-react';
import { qaApi, uploadQaScreenshot } from '@/api-client/qa.api-client';
import { useAuth } from '@/auth';

export default function QAReviewPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Fail form state
  const [failingItemId, setFailingItemId] = useState<string | null>(null);
  const [failComment, setFailComment] = useState('');
  const [failPageUrl, setFailPageUrl] = useState('');
  const [failScreenshotUrl, setFailScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (assignmentId) loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      const data = await qaApi.getAssignment(assignmentId!);
      setAssignment(data);
      // Auto-expand first incomplete section
      for (const section of data.sections) {
        const hasIncomplete = section.items.some((i: any) => !i.response || i.response.status === 'not_started');
        if (hasIncomplete) {
          setExpandedSections({ [section.id]: true });
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (itemId: string, status: string, comment?: string, pageUrl?: string, screenshotUrl?: string) => {
    setSubmitting(itemId);
    try {
      await qaApi.submitResponse(assignmentId!, itemId, {
        status,
        comment: comment || undefined,
        pageUrl: pageUrl || undefined,
        screenshotUrl: screenshotUrl || undefined,
      });
      await loadAssignment();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(null);
    }
  };

  const handlePass = (itemId: string) => handleSubmitResponse(itemId, 'pass');
  const handleSkip = (itemId: string) => handleSubmitResponse(itemId, 'skip');

  const handleFailSubmit = async () => {
    if (!failingItemId || !failComment.trim()) return;
    await handleSubmitResponse(failingItemId, 'fail', failComment, failPageUrl, failScreenshotUrl);
    setFailingItemId(null);
    setFailComment('');
    setFailPageUrl('');
    setFailScreenshotUrl('');
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadQaScreenshot(file);
      setFailScreenshotUrl(url);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (!assignment) return null;

  const pct = assignment.counts.total > 0
    ? Math.round(((assignment.counts.pass + assignment.counts.fail + assignment.counts.skip) / assignment.counts.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-1">
            <ClipboardCheck className="h-7 w-7 text-orange-500" />
            {assignment.round.title} (v{assignment.round.versionNumber})
          </h1>
          <p className="text-slate-400 text-sm">
            Reviewing as <span className="text-white font-medium">{assignment.assignee.firstName} {assignment.assignee.lastName}</span>
          </p>
        </div>

        {/* Progress */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Your Progress</h2>
            <span className="text-2xl font-bold text-orange-500">{pct}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm">
            <div><span className="text-white font-bold">{assignment.counts.total}</span> <span className="text-slate-400 text-xs">total</span></div>
            <div><span className="text-green-500 font-bold">{assignment.counts.pass}</span> <span className="text-slate-400 text-xs">pass</span></div>
            <div><span className="text-red-500 font-bold">{assignment.counts.fail}</span> <span className="text-slate-400 text-xs">fail</span></div>
            <div><span className="text-yellow-500 font-bold">{assignment.counts.skip}</span> <span className="text-slate-400 text-xs">skip</span></div>
            <div><span className="text-slate-400 font-bold">{assignment.counts.not_started}</span> <span className="text-slate-400 text-xs">remaining</span></div>
          </div>
        </div>

        {/* Sections */}
        {assignment.sections.map((section: any) => {
          const isExpanded = expandedSections[section.id];
          const sectionItems = section.items;
          const sectionPass = sectionItems.filter((i: any) => i.response?.status === 'pass').length;
          const sectionFail = sectionItems.filter((i: any) => i.response?.status === 'fail').length;
          const sectionDone = sectionItems.filter((i: any) => i.response && i.response.status !== 'not_started').length;

          return (
            <div key={section.id} className="bg-slate-800 rounded-xl border border-slate-700 mb-4 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {sectionDone === sectionItems.length && sectionFail === 0 ? (
                    <CheckCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : sectionFail > 0 ? (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : sectionDone > 0 ? (
                    <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  )}
                  <div className="text-left min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{section.title}</h3>
                    <p className="text-slate-400 text-xs truncate">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-slate-400 text-sm">{sectionPass}/{sectionItems.length}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700">
                  {sectionItems.map((item: any) => {
                    const response = item.response;
                    const status = response?.status || 'not_started';
                    const isSubmitting = submitting === item.id;

                    return (
                      <div key={item.id} className="border-b border-slate-700/50 last:border-b-0 p-4">
                        {/* Item Header */}
                        <div className="flex items-start gap-3 mb-3">
                          {status === 'pass' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                          {status === 'fail' && <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                          {status === 'skip' && <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />}
                          {status === 'not_started' && <Circle className="h-5 w-5 text-slate-500 flex-shrink-0" />}
                          <h4 className="text-white font-medium text-sm">{item.title}</h4>
                        </div>

                        {/* Steps */}
                        <div className="ml-8 mb-3">
                          <p className="text-slate-400 text-xs font-medium uppercase mb-2">Steps:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            {item.steps.map((step: string, i: number) => (
                              <li key={i} className="text-slate-300 text-sm">{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Expected */}
                        <div className="ml-8 mb-3 bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-400 uppercase mb-1">Expected Result:</p>
                          <p className="text-slate-300 text-sm">{item.expectedResult}</p>
                        </div>

                        {/* Actions */}
                        <div className="ml-8 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handlePass(item.id)}
                            disabled={isSubmitting}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              status === 'pass'
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-green-600/20 hover:text-green-400'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Pass
                          </button>
                          <button
                            onClick={() => {
                              setFailingItemId(item.id);
                              setFailComment(response?.comment || '');
                              setFailPageUrl(response?.pageUrl || '');
                              setFailScreenshotUrl(response?.screenshotUrl || '');
                            }}
                            disabled={isSubmitting}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              status === 'fail'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-red-600/20 hover:text-red-400'
                            }`}
                          >
                            <AlertCircle className="h-4 w-4" /> Fail
                          </button>
                          <button
                            onClick={() => handleSkip(item.id)}
                            disabled={isSubmitting}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              status === 'skip'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-yellow-600/20 hover:text-yellow-400'
                            }`}
                          >
                            <Clock className="h-4 w-4" /> Skip
                          </button>
                          {isSubmitting && <span className="text-slate-400 text-xs">Saving...</span>}
                        </div>

                        {/* Show existing fail details */}
                        {status === 'fail' && response?.comment && (
                          <div className="ml-8 mt-3 bg-red-900/10 border border-red-800/20 rounded-lg p-3">
                            <p className="text-red-300 text-sm">{response.comment}</p>
                            <div className="flex gap-3 mt-2">
                              {response.pageUrl && (
                                <a href={response.pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-xs hover:underline">
                                  <ExternalLink className="h-3 w-3" /> Page Link
                                </a>
                              )}
                              {response.screenshotUrl && (
                                <a href={response.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-400 text-xs hover:underline">
                                  <ImageIcon className="h-3 w-3" /> Screenshot
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {response?.respondedAt && (
                          <div className="ml-8 mt-2 text-xs text-slate-500">
                            Last updated {new Date(response.respondedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Completion Banner */}
        {assignment.counts.not_started === 0 && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center mt-6">
            <CheckCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Review Complete!</h3>
            <p className="text-slate-400 mb-4">
              You've tested all {assignment.counts.total} items.
              {assignment.counts.fail > 0 && ` ${assignment.counts.fail} item(s) need attention.`}
            </p>
            <button
              onClick={() => navigate(`/admin/qa-checklist/rounds/${assignment.round.id}`)}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
            >
              View Round Summary
            </button>
          </div>
        )}

        {/* Fail Modal */}
        {failingItemId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" /> Report Issue
                </h3>
                <button onClick={() => setFailingItemId(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">
                    What's wrong? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={failComment}
                    onChange={(e) => setFailComment(e.target.value)}
                    placeholder="Describe the issue you found..."
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-y"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">
                    Page URL (optional)
                  </label>
                  <input
                    type="url"
                    value={failPageUrl}
                    onChange={(e) => setFailPageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">
                    Screenshot (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload Screenshot'}
                    </button>
                    {failScreenshotUrl && (
                      <a href={failScreenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-400 text-xs hover:underline">
                        <ImageIcon className="h-3 w-3" /> View
                      </a>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setFailingItemId(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleFailSubmit}
                  disabled={!failComment.trim() || submitting === failingItemId}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Mark as Failed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
