import { useState, useEffect } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import type { ApprovalStatus } from '../types';

interface ApprovalCardProps {
  title: string;
  status: ApprovalStatus;
  comment?: string;
  approvedAt?: string;
  canEdit: boolean;
  onUpdate: (status: ApprovalStatus, comment?: string) => Promise<void>;
}

export const ApprovalCard = ({
  title,
  status,
  comment,
  approvedAt,
  canEdit,
  onUpdate
}: ApprovalCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState(comment || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync newComment with comment prop when it changes
  useEffect(() => {
    setNewComment(comment || '');
  }, [comment]);

  const getStatusIcon = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return <Check className="w-6 h-6 text-green-600" />;
      case 'approved_with_comments':
        return <HelpCircle className="w-6 h-6 text-yellow-600" />;
      case 'not_approved':
      default:
        return <X className="w-6 h-6 text-fuchsia-600" />;
    }
  };

  const getStatusLabel = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'Согласовано';
      case 'approved_with_comments':
        return 'Согласовано с комментариями';
      case 'not_approved':
      default:
        return 'Не согласовано';
    }
  };

  const getStatusColor = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'approved_with_comments':
        return 'bg-yellow-50 border-yellow-200';
      case 'not_approved':
      default:
        return 'bg-fuchsia-50 border-fuchsia-200';
    }
  };

  const handleStatusChange = async (newStatus: ApprovalStatus) => {
    setIsSaving(true);
    try {
      await onUpdate(newStatus, newComment || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update approval:', error);
      alert('Не удалось обновить согласование');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommentSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(status, newComment || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update approval:', error);
      alert('Не удалось обновить согласование');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewComment(comment || '');
    setIsEditing(false);
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {getStatusIcon(status)}
      </div>

      {!isEditing ? (
        <>
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">
              Статус: {getStatusLabel(status)}
            </span>
          </div>

          {comment && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Комментарий:</span> {comment}
              </p>
            </div>
          )}

          {approvedAt && status !== 'not_approved' && (
            <div className="mb-3">
              <p className="text-xs text-gray-500">
                {new Date(approvedAt).toLocaleString('ru-RU')}
              </p>
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Изменить статус
            </button>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус согласования
            </label>
            <div className="space-y-2">
              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                status === 'approved' ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="approved"
                  checked={status === 'approved'}
                  onChange={(e) => handleStatusChange(e.target.value as ApprovalStatus)}
                  disabled={isSaving}
                  className="mr-3"
                />
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm">Согласовано</span>
              </label>

              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                status === 'approved_with_comments' ? 'bg-yellow-50 border-yellow-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="approved_with_comments"
                  checked={status === 'approved_with_comments'}
                  onChange={(e) => handleStatusChange(e.target.value as ApprovalStatus)}
                  disabled={isSaving}
                  className="mr-3"
                />
                <HelpCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-sm">Согласовано с комментариями</span>
              </label>

              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                status === 'not_approved' ? 'bg-fuchsia-50 border-fuchsia-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="not_approved"
                  checked={status === 'not_approved'}
                  onChange={(e) => handleStatusChange(e.target.value as ApprovalStatus)}
                  disabled={isSaving}
                  className="mr-3"
                />
                <X className="w-5 h-5 text-fuchsia-600 mr-2" />
                <span className="text-sm">Не согласовано</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Опциональный комментарий..."
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCommentSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить комментарий'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
