import { useState, useEffect } from 'react';
import { MessageCircle, Send, Image as ImageIcon, X, Edit2, Trash2, Reply } from 'lucide-react';
import { Card } from './ui';
import { ConfirmModal } from './ui/ConfirmModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface Comment {
  id: number;
  model_id: number;
  user_id: number;
  parent_id: number | null;
  comment_text: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  full_name: string;
  role: string;
  replies: Comment[];
}

interface ModelCommentsProps {
  modelId: number;
}

export const ModelComments = ({ modelId }: ModelCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: number | null }>({
    isOpen: false,
    commentId: null
  });

  useEffect(() => {
    loadComments();
    // Get current user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Failed to parse user:', error);
      }
    }
  }, [modelId]);

  const loadComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/model-comments/${modelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Sort comments by date - newest first
        const sortedComments = (data.data || []).sort((a: Comment, b: Comment) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setComments(sortedComments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (parentId: number | null = null) => {
    const text = parentId === replyTo ? newComment : newComment;
    if (!text.trim() && !imageFile) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('comment_text', text.trim());
      if (parentId) {
        formData.append('parent_id', parentId.toString());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch(`${API_BASE_URL}/model-comments/${modelId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setNewComment('');
        setReplyTo(null);
        clearImage();
        await loadComments();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!editText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/model-comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment_text: editText.trim() })
      });

      if (response.ok) {
        setEditingComment(null);
        setEditText('');
        await loadComments();
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteClick = (commentId: number) => {
    setDeleteConfirm({ isOpen: true, commentId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.commentId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/model-comments/${deleteConfirm.commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadComments();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeleteConfirm({ isOpen: false, commentId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, commentId: null });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'buyer': 'bg-purple-100 text-purple-700',
      'designer': 'bg-blue-100 text-blue-700',
      'constructor': 'bg-green-100 text-green-700',
      'china_office': 'bg-red-100 text-red-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'buyer': 'Байер',
      'designer': 'Дизайнер',
      'constructor': 'Конструктор',
      'china_office': 'China Office'
    };
    return labels[role] || role;
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingComment === comment.id;
    const isOwner = currentUserId === comment.user_id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-12 mt-4' : 'mt-4'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">
                {comment.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{comment.full_name}</span>
              <span className="text-sm text-gray-500">@{comment.username}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.role)}`}>
                {getRoleLabel(comment.role)}
              </span>
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-gray-400">(изменено)</span>
              )}
            </div>

            {/* Comment Text */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(comment.id);
                    }}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingComment(null);
                      setEditText('');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">{comment.comment_text}</p>

                {/* Image */}
                {comment.image_url && (
                  <div className="mt-2">
                    <img
                      src={`${API_BASE_URL.replace('/api', '')}${comment.image_url}`}
                      alt="Comment attachment"
                      className="max-w-md rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyTo(comment.id);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Reply className="w-4 h-4" />
                    Ответить
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingComment(comment.id);
                          setEditText(comment.comment_text);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Изменить
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(comment.id);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </>
                  )}
                </div>

                {/* Reply Form */}
                {replyTo === comment.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишите ответ..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={2}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmit(comment.id);
                        }}
                        disabled={isLoading || !newComment.trim()}
                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ответить
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(null);
                          setNewComment('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Удалить комментарий?"
        message="Вы уверены, что хотите удалить этот комментарий?"
        note="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Комментарии ({comments.length})
          </h2>
        </div>

      {/* New Comment Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Напишите комментарий..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          rows={3}
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg border border-gray-200" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSubmit(null);
            }}
            disabled={isLoading || (!newComment.trim() && !imageFile)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Отправить
          </button>

          <label className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Фото
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Пока нет комментариев</p>
            <p className="text-sm mt-1">Будьте первым, кто оставит комментарий!</p>
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </Card>
    </>
  );
};
