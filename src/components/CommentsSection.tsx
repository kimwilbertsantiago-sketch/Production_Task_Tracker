import { useState, useRef, useEffect } from 'react';
import { Comment, TeamMember } from '@/lib/types';
import { Avatar, Badge } from '@/components/ui/Avatar';
import { Send } from 'lucide-react';

interface CommentsSectionProps {
  episodeId: string;
  comments: Comment[];
  teamMembers: TeamMember[];
  currentMemberId: string | null;
  canComment: boolean;
  onAddComment: (episodeId: string, authorId: string | null, body: string) => Promise<Comment | null>;
  onMention: (mentionedMember: TeamMember, episodeId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function renderBody(body: string): React.ReactNode {
  // Highlight @mentions
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={i} className="text-blue-500 font-medium bg-blue-500/10 rounded px-1">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CommentsSection({
  episodeId,
  comments,
  teamMembers,
  currentMemberId,
  canComment,
  onAddComment,
  onMention,
}: CommentsSectionProps) {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const episodeComments = comments
    .filter((c) => c.episode_id === episodeId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setText(val);

    // Detect @mention
    const beforeCursor = val.slice(0, cursor);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStart(beforeCursor.length - atMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionStart(-1);
    }
  };

  const insertMention = (member: TeamMember) => {
    const before = text.slice(0, mentionStart);
    const after = text.slice(mentionStart + mentionQuery.length + 1);
    const mention = `@${member.name.replace(/\s/g, '')}`;
    const newText = `${before}${mention} ${after}`;
    setText(newText);
    setShowMentions(false);
    setMentionStart(-1);
    onMention(member, episodeId);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAddComment(episodeId, currentMemberId, text.trim());
      setText('');
    } catch {
      // keep text on failure
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">
        Comments {episodeComments.length > 0 && `(${episodeComments.length})`}
      </h3>

      {/* Comment list */}
      <div ref={listRef} className="space-y-3 mb-3 max-h-[240px] overflow-y-auto">
        {episodeComments.length === 0 && (
          <p className="text-xs tf-muted text-center py-4">No comments yet. Start the conversation.</p>
        )}
        {episodeComments.map((c) => {
          const author = c.author ?? teamMembers.find((m) => m.id === c.author_id);
          return (
            <div key={c.id} className="flex gap-2.5">
              <Avatar
                name={author?.name ?? '?'}
                color={author?.avatar_color ?? '#64748B'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium tf-text">{author?.name ?? 'Unknown'}</span>
                  {author && <Badge color={author.avatar_color}>{author.role}</Badge>}
                  <span className="text-[10px] tf-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs tf-text leading-relaxed break-words">
                  {renderBody(c.body)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment input */}
      {canComment && (
        <div className="relative">
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 tf-card border tf-border rounded-lg shadow-lg overflow-hidden z-10 max-h-40 overflow-y-auto">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => insertMention(m)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-subtle)] transition-colors text-left"
                >
                  <Avatar name={m.name} color={m.avatar_color} size="sm" />
                  <div>
                    <div className="text-xs tf-text">{m.name}</div>
                    <div className="text-[10px] tf-muted">{m.role}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment... use @ to tag someone"
              rows={2}
              className="tf-input flex-1 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || busy}
              className="tf-btn tf-btn-primary disabled:opacity-40 self-end"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
